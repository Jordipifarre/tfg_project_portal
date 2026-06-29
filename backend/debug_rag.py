"""Diagnostic script — run from backend/ directory:
    poetry run python debug_rag.py
"""
import logging
import sys
import io
import json

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout,
                    format="%(levelname)s %(name)s: %(message)s")

from app.core.config import settings

print("\n=== CONFIG CHECK ===")
print(f"DATABASE_URL: {'SET' if settings.DATABASE_URL else 'MISSING'}")
print(f"SUPABASE_STORAGE_BUCKET: {settings.SUPABASE_STORAGE_BUCKET}")

# --- 1. DB connection ---
print("\n=== DB CONNECTION ===")
import psycopg2
try:
    conn = psycopg2.connect(settings.DATABASE_URL)
    with conn.cursor() as cur:
        cur.execute("SELECT version()")
        print("PostgreSQL:", cur.fetchone()[0])
        cur.execute("SELECT COUNT(*) FROM document_chunks")
        print("document_chunks rows:", cur.fetchone()[0])
    conn.close()
    print("DB OK")
except Exception as e:
    print(f"DB ERROR: {e}")
    sys.exit(1)

# --- 2. Storage list ---
print("\n=== STORAGE LIST ===")
from app.services.storage import storage_service
try:
    files = storage_service.list_files()
    pdfs = [f for f in files if isinstance(f, dict) and f.get("name","").lower().endswith(".pdf")]
    print(f"PDFs found: {len(pdfs)}")
    for f in pdfs:
        print(f"  - {f['name']}")
except Exception as e:
    print(f"STORAGE ERROR: {e}")
    sys.exit(1)

if not pdfs:
    print("No PDFs — aborting")
    sys.exit(0)

# --- 3. Download first PDF ---
print("\n=== DOWNLOAD FIRST PDF ===")
first = pdfs[0]["name"]
try:
    raw = storage_service.download(first)
    print(f"Downloaded {first}: {len(raw):,} bytes")
except Exception as e:
    print(f"DOWNLOAD ERROR: {e}")
    sys.exit(1)

# --- 4. Parse PDF ---
print("\n=== PARSE PDF ===")
import pypdf
try:
    reader = pypdf.PdfReader(io.BytesIO(raw))
    pages_with_text = sum(1 for p in reader.pages if (p.extract_text() or "").strip())
    print(f"Pages with text: {pages_with_text}/{len(reader.pages)}")
except Exception as e:
    print(f"PDF PARSE ERROR: {e}")
    sys.exit(1)

# --- 5. Embed a small sample ---
print("\n=== EMBED SAMPLE ===")
from app.utils.embeddings import FastEmbeddings
try:
    emb = FastEmbeddings()
    sample = ["Prova d'embedding petit per verificar que funciona correctament."]
    vec = emb.embed_documents(sample)
    print(f"Embedding dim: {len(vec[0])}")
    print(f"First 5 values: {vec[0][:5]}")
except Exception as e:
    print(f"EMBED ERROR: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

# --- 6. Insert test row ---
print("\n=== INSERT TEST ROW ===")
try:
    conn = psycopg2.connect(settings.DATABASE_URL)
    vec_lit = "[" + ",".join(str(x) for x in vec[0]) + "]"
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO documents (filename, storage_path, status, chunk_count) VALUES (%s,%s,%s,%s) RETURNING id",
            ("__debug_test__", "__debug_test__", "test", 1)
        )
        doc_id = cur.fetchone()[0]
        print(f"Document inserted, id={doc_id}")

        import psycopg2.extras
        psycopg2.extras.execute_values(
            cur,
            "INSERT INTO document_chunks (document_id, content, embedding, metadata) VALUES %s",
            [( str(doc_id), sample[0], vec_lit, json.dumps({}) )],
            template="(%s, %s, %s::vector, %s::jsonb)",
        )
        print("Chunk inserted OK")

        # rollback so we don't leave test data
        conn.rollback()
        print("Rolled back test data (no permanent change)")
    conn.close()
except Exception as e:
    print(f"INSERT ERROR: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

print("\n=== ALL CHECKS PASSED — the pipeline should work ===")
print("Run: POST /storage/rebuild-index  to rebuild for real.")
