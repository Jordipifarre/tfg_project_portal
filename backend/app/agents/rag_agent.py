import io
import logging
import threading
from typing import Optional

import pypdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama, OllamaEmbeddings

from app.core.config import settings
from app.services.storage import storage_service

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory state — FAISS index + full chunk list for keyword fallback
# ---------------------------------------------------------------------------

_store: Optional[FAISS] = None
_all_chunks: list[Document] = []
_store_ready = False
_build_lock = threading.Lock()


def _pdf_bytes_to_docs(pdf_bytes: bytes, filename: str) -> list[Document]:
    """Extract page-level Document objects from raw PDF bytes."""
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        docs = []
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


def _build_index() -> Optional[FAISS]:
    """Download every PDF from storage, chunk it, embed it, and return a FAISS store."""
    global _store_ready, _all_chunks

    try:
        files = storage_service.list_files()
    except Exception as e:
        logger.error("Cannot list storage files: %s", e)
        _store_ready = True
        return None

    pdf_files = [
        f for f in files
        if isinstance(f, dict) and f.get("name", "").lower().endswith(".pdf")
    ]

    if not pdf_files:
        logger.warning("No PDFs found in bucket '%s' — RAG unavailable", storage_service.bucket)
        _store_ready = True
        return None

    logger.info("Building RAG index from %d PDF(s)…", len(pdf_files))

    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
    all_chunks: list[Document] = []

    for file_info in pdf_files:
        name = file_info["name"]
        try:
            raw_bytes = storage_service.download(name)
            raw_docs = _pdf_bytes_to_docs(raw_bytes, name)
            chunks = splitter.split_documents(raw_docs)
            all_chunks.extend(chunks)
            logger.info("  [%s] → %d chunks", name, len(chunks))
        except Exception as e:
            logger.error("  [%s] failed: %s", name, e)

    if not all_chunks:
        logger.warning("No text extracted from any PDF — RAG index empty")
        _store_ready = True
        return None

    _all_chunks = all_chunks  # keep for keyword fallback

    embeddings = OllamaEmbeddings(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_EMBED_MODEL,
    )

    texts = [c.page_content for c in all_chunks]
    metadatas = [c.metadata for c in all_chunks]
    batch_size = 50

    try:
        logger.info("Embedding %d chunks with '%s' (batches of %d)…",
                    len(texts), settings.OLLAMA_EMBED_MODEL, batch_size)
        all_vectors: list = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            all_vectors.extend(embeddings.embed_documents(batch))
            logger.info("  Embedded %d / %d", min(i + batch_size, len(texts)), len(texts))

        store = FAISS.from_embeddings(
            text_embeddings=list(zip(texts, all_vectors)),
            embedding=embeddings,
            metadatas=metadatas,
        )
        logger.info("RAG index ready: %d total chunks", len(texts))
        _store_ready = True
        return store
    except Exception as e:
        logger.error("FAISS build failed: %s", e)
        _store_ready = True
        return None


def _get_store() -> Optional[FAISS]:
    """Return the cached index, building it on the first call (double-checked locking)."""
    global _store, _store_ready
    if _store_ready:
        return _store
    with _build_lock:
        if not _store_ready:
            _store = _build_index()
    return _store


def rebuild_index() -> dict:
    """Force a fresh index rebuild — call this after uploading new PDFs."""
    global _store, _store_ready, _all_chunks
    with _build_lock:
        _store_ready = False
        _all_chunks = []
        _store = _build_index()
    total = _store.index.ntotal if _store else 0
    return {"status": "ok" if _store else "empty", "total_chunks": total}


# ---------------------------------------------------------------------------
# Hybrid retrieval: semantic (FAISS) + keyword fallback
# ---------------------------------------------------------------------------

def _keyword_search(query: str, chunks: list[Document], k: int = 4) -> list[Document]:
    """
    Score chunks by how many distinct query words they contain.
    Catches proper nouns and acronyms that semantic search misses.
    """
    # Keep words longer than 3 chars to skip articles/prepositions
    terms = [w.lower() for w in query.split() if len(w) > 3]
    if not terms:
        return []

    scored: list[tuple[int, Document]] = []
    for chunk in chunks:
        content_lower = chunk.page_content.lower()
        hits = sum(1 for t in terms if t in content_lower)
        if hits > 0:
            scored.append((hits, chunk))

    scored.sort(key=lambda x: -x[0])
    return [doc for _, doc in scored[:k]]


def _hybrid_search(store: FAISS, question: str, k_semantic: int = 8, k_keyword: int = 4) -> list[Document]:
    """
    Merge semantic and keyword results, deduplicating by (source, page).
    Semantic results come first so the LLM sees the most relevant context up front.
    """
    semantic = store.similarity_search(question, k=k_semantic)
    keyword = _keyword_search(question, _all_chunks, k=k_keyword)

    seen: set[tuple] = set()
    merged: list[Document] = []
    for doc in semantic + keyword:
        key = (doc.metadata.get("source"), doc.metadata.get("page"))
        if key not in seen:
            seen.add(key)
            merged.append(doc)

    return merged


# ---------------------------------------------------------------------------
# Answer
# ---------------------------------------------------------------------------

_RAG_SYSTEM = """Ets un assistent especialitzat en documentació oficial catalana sobre seguretat pública.
Respon ÚNICAMENT basant-te en els fragments de context proporcionats.
Si la resposta no es troba al context, respon: "No he trobat aquesta informació als documents disponibles."
Respon sempre en català. Cita el nom del document i la pàgina quan sigui possible."""


def answer_from_documents(question: str) -> str:
    store = _get_store()

    if store is None:
        return (
            "No hi ha documents indexats disponibles. "
            "Comprova que el bucket d'emmagatzematge conté fitxers PDF "
            "o utilitza l'endpoint /storage/rebuild-index per re-indexar."
        )

    try:
        hits = _hybrid_search(store, question)
    except Exception as e:
        logger.error("Hybrid search failed: %s", e)
        return "Error en la cerca als documents. Torna-ho a intentar."

    if not hits:
        return "No he trobat informació rellevant als documents disponibles per a aquesta pregunta."

    logger.info("RAG retrieved %d chunks: %s",
                len(hits),
                [(d.metadata.get("source", "?"), d.metadata.get("page")) for d in hits])


    print("RAG retrieved chunks:")    
    context = "\n\n---\n\n".join(
        f"[{d.metadata.get('source', '?')}, p.{d.metadata.get('page', '?')}]\n{d.page_content}"
        for d in hits
    )

    print("llm entering")
    llm = ChatOllama(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_RAG_MODEL,
        temperature=0.1,
    )

    try:
        print("RAG context for LLM:\n", context)  # Debug log
        msgs = [
            SystemMessage(content=_RAG_SYSTEM),
            HumanMessage(content=f"Context:\n{context}\n\nPregunta: {question}"),
        ]
        print("INVOKING LLM with messages:\n", msgs)  # Debug log
        return llm.invoke(msgs).content.strip()
    except Exception as e:
        logger.error("RAG LLM failed: %s", e)
        return "Ho sento, no he pogut generar una resposta basada en els documents. Torna-ho a intentar."
