"""RAG pipeline backed by pgvector (Supabase PostgreSQL).

Document ingestion:
  1. Download PDFs from Supabase Storage.
  2. Split into chunks with RecursiveCharacterTextSplitter.
  3. Embed chunks with FastEmbed (nomic-ai/nomic-embed-text-v1.5, 768-dim).
  4. Insert into `documents` + `document_chunks` tables.

Retrieval (hybrid):
  - Semantic: pgvector cosine similarity (embedding <=> query_vector).
  - Keyword: PostgreSQL ILIKE on chunk content.
  - Results are merged and deduplicated before being sent to the LLM.

Prerequisites (run backend/sql/setup_pgvector.sql in Supabase once):
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE TABLE documents ( ... );
  CREATE TABLE document_chunks ( ... );
"""

from __future__ import annotations

import io
import json
import logging
import threading
from typing import Optional

import psycopg2
import psycopg2.extras
import pypdf
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.services.storage import storage_service
from app.utils.embeddings import FastEmbeddings
from app.utils.ollama_client import get_ollama_client

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy embeddings singleton
# ---------------------------------------------------------------------------

_embeddings: Optional[FastEmbeddings] = None
_embed_lock = threading.Lock()


def _get_embeddings() -> FastEmbeddings:
    global _embeddings
    if _embeddings is None:
        with _embed_lock:
            if _embeddings is None:
                _embeddings = FastEmbeddings()
    return _embeddings


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def _get_conn() -> psycopg2.extensions.connection:
    return psycopg2.connect(settings.DATABASE_URL)


def _vec_literal(v: list[float]) -> str:
    """Format a float list as a PostgreSQL vector literal '[x,y,...]'."""
    return "[" + ",".join(str(x) for x in v) + "]"


def _count_chunks() -> int:
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM document_chunks")
            return cur.fetchone()[0]
    finally:
        conn.close()



# ---------------------------------------------------------------------------
# PDF helpers
# ---------------------------------------------------------------------------

def _pdf_bytes_to_docs(pdf_bytes: bytes, filename: str) -> list[Document]:
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        docs: list[Document] = []
        for i, page in enumerate(reader.pages):
            text = (page.extract_text() or "").strip()
            if text:
                docs.append(Document(
                    page_content=text,
                    metadata={"source": filename, "page": i + 1},
                ))
        return docs
    except Exception as e:
        logger.warning("PDF parse error [%s]: %s", filename, e)
        return []


# ---------------------------------------------------------------------------
# Index build / rebuild
# ---------------------------------------------------------------------------

_build_lock = threading.Lock()


def _build_index() -> dict:
    """Download all PDFs, embed them, and insert into pgvector.

    Embedding happens outside the DB transaction so a slow model download
    cannot leave the tables empty. The old index is only deleted once all
    vectors are ready and we open a single atomic transaction.
    """
    try:
        files = storage_service.list_files()
    except Exception as e:
        logger.error("Cannot list storage files: %s", e)
        return {"status": "error", "total_chunks": 0}

    pdf_files = [
        f for f in files
        if isinstance(f, dict) and f.get("name", "").lower().endswith(".pdf")
    ]

    if not pdf_files:
        logger.warning("No PDFs in bucket '%s' — RAG unavailable", settings.SUPABASE_STORAGE_BUCKET)
        return {"status": "empty", "total_chunks": 0}

    logger.info("Building pgvector index from %d PDF(s)…", len(pdf_files))

    # --- Phase 1: download + embed (no DB writes yet) ---
    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
    embeddings = _get_embeddings()

    prepared: list[tuple[str, list[Document], list[list[float]]]] = []
    for file_info in pdf_files:
        name = file_info["name"]
        try:
            raw_bytes = storage_service.download(name)
            raw_docs = _pdf_bytes_to_docs(raw_bytes, name)
            chunks = splitter.split_documents(raw_docs)
            if not chunks:
                logger.warning("  [%s] no text extracted — skipped", name)
                continue
            texts = [c.page_content for c in chunks]
            vectors = embeddings.embed_documents(texts)
            prepared.append((name, chunks, vectors))
            logger.info("  [%s] embedded %d chunks", name, len(chunks))
        except Exception as e:
            logger.error("  [%s] failed during embedding: %s", name, e, exc_info=True)

    if not prepared:
        logger.error("No PDFs could be embedded — old index preserved")
        return {"status": "error", "total_chunks": 0}

    # --- Phase 2: atomic DB swap (clear old + insert new in one transaction) ---
    total = 0
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM document_chunks")
            cur.execute("DELETE FROM documents")
            for name, chunks, vectors in prepared:
                cur.execute(
                    "INSERT INTO documents (filename, storage_path, status, chunk_count)"
                    " VALUES (%s, %s, %s, %s) RETURNING id",
                    (name, name, "indexed", len(chunks)),
                )
                doc_id = cur.fetchone()[0]
                psycopg2.extras.execute_values(
                    cur,
                    "INSERT INTO document_chunks (document_id, content, embedding, metadata)"
                    " VALUES %s",
                    [
                        (str(doc_id), chunk.page_content, _vec_literal(vec), json.dumps(chunk.metadata))
                        for chunk, vec in zip(chunks, vectors)
                    ],
                    template="(%s, %s, %s::vector, %s::jsonb)",
                )
                total += len(chunks)
                logger.info("  [%s] → %d chunks inserted", name, len(chunks))
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error("DB swap failed — old index preserved: %s", e, exc_info=True)
        return {"status": "error", "total_chunks": 0}
    finally:
        conn.close()

    logger.info("pgvector index ready: %d total chunks", total)
    return {"status": "ok", "total_chunks": total}


def rebuild_index() -> dict:
    """Force a complete index rebuild. Call after uploading new PDFs."""
    with _build_lock:
        return _build_index()


# ---------------------------------------------------------------------------
# Hybrid retrieval
# ---------------------------------------------------------------------------

def _semantic_search(query_vec: list[float], k: int = 8) -> list[Document]:
    """Cosine-similarity search via pgvector (<=> operator)."""
    vec_lit = _vec_literal(query_vec)
    conn = _get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT content, metadata
                FROM document_chunks
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (vec_lit, k),
            )
            rows = cur.fetchall()
        return [Document(page_content=r["content"], metadata=r["metadata"] or {}) for r in rows]
    finally:
        conn.close()


def _keyword_search(query: str, k: int = 4) -> list[Document]:
    """PostgreSQL ILIKE keyword search — catches proper nouns semantic search misses."""
    terms = [w.lower() for w in query.split() if len(w) > 3]
    if not terms:
        return []

    conditions = " OR ".join("content ILIKE %s" for _ in terms)
    params = [f"%{t}%" for t in terms] + [k * 3]

    conn = _get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                f"SELECT content, metadata FROM document_chunks WHERE {conditions} LIMIT %s",
                params,
            )
            rows = cur.fetchall()
        return [Document(page_content=r["content"], metadata=r["metadata"] or {}) for r in rows]
    finally:
        conn.close()


def _hybrid_search(question: str, k_semantic: int = 8, k_keyword: int = 4) -> list[Document]:
    """Merge semantic + keyword results, deduplicating by (source, page)."""
    embeddings = _get_embeddings()
    query_vec = embeddings.embed_query(question)

    semantic = _semantic_search(query_vec, k=k_semantic)
    keyword = _keyword_search(question, k=k_keyword)

    seen: set[tuple] = set()
    merged: list[Document] = []
    for doc in semantic + keyword:
        key = (doc.metadata.get("source"), doc.metadata.get("page"))
        if key not in seen:
            seen.add(key)
            merged.append(doc)
    return merged


# ---------------------------------------------------------------------------
# Answer generation
# ---------------------------------------------------------------------------

_RAG_SYSTEM = """Ets un assistent especialitzat en documentació oficial catalana sobre seguretat pública.
Respon ÚNICAMENT basant-te en els fragments de context proporcionats.
Si la resposta no es troba al context, respon: "No he trobat aquesta informació als documents disponibles."
Respon sempre en català. Cita el nom del document i la pàgina quan sigui possible."""


def answer_from_documents(question: str) -> str:
    logger.info("=== RAG answer_from_documents START | query: %r ===", question)
    try:
        count = _count_chunks()
    except Exception as e:
        logger.error("pgvector count failed: %s", e, exc_info=True)
        return (
            "No s'ha pogut connectar amb la base de dades vectorial. "
            "Comprova que l'extensió pgvector està habilitada a Supabase."
        )

    if count == 0:
        return (
            "No hi ha documents indexats. "
            "Puja PDFs al bucket i crida /storage/rebuild-index per indexar-los."
        )

    logger.info("pgvector chunk count: %d", count)
    try:
        hits = _hybrid_search(question)
    except Exception as e:
        logger.error("Hybrid search failed: %s", e, exc_info=True)
        return "Error en la cerca als documents. Torna-ho a intentar."

    if not hits:
        return "No he trobat informació rellevant als documents disponibles per a aquesta pregunta."

    logger.info(
        "RAG retrieved %d chunks: %s",
        len(hits),
        [(d.metadata.get("source", "?"), d.metadata.get("page")) for d in hits],
    )

    context = "\n\n---\n\n".join(
        f"[{d.metadata.get('source', '?')}, p.{d.metadata.get('page', '?')}]\n{d.page_content}"
        for d in hits
    )

    llm = get_ollama_client("rag")
    try:
        msgs = [
            SystemMessage(content=_RAG_SYSTEM),
            HumanMessage(content=f"Context:\n{context}\n\nPregunta: {question}"),
        ]
        return llm.invoke(msgs).content.strip()
    except Exception as e:
        logger.error("RAG LLM failed: %s", e, exc_info=True)
        return "Ho sento, no he pogut generar una resposta basada en els documents. Torna-ho a intentar."
