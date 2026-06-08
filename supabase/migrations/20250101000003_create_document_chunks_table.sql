create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade,
  content text not null,
  embedding extensions.vector(1536) not null,
  chunk_index integer not null,
  created_at timestamptz default now()
);

-- HNSW index for fast cosine similarity search
create index if not exists document_chunks_embedding_idx
  on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);
