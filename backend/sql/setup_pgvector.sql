-- Run this script once in the Supabase SQL editor before starting the backend.

-- 1. Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Parent table: one row per uploaded PDF
CREATE TABLE IF NOT EXISTS documents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  filename     text        NOT NULL,
  storage_path text,
  status       text        DEFAULT 'pending',
  chunk_count  int         DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- 3. Child table: one row per text chunk
CREATE TABLE IF NOT EXISTS document_chunks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid        REFERENCES documents(id) ON DELETE CASCADE,
  content     text        NOT NULL,
  embedding   vector(768),
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- 4. IVFFlat index for approximate cosine-similarity search.
--    Requires at least 3 * lists = 300 vectors to train.
--    Run AFTER inserting your first batch of documents.
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
