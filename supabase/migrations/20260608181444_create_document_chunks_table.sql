create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  content text not null,
  embedding extensions.vector(1536) not null,
  chunk_index integer not null,
  created_at timestamptz default now()
);

create index on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);

alter table public.document_chunks enable row level security;

create policy "Authenticated users can read chunks"
  on public.document_chunks for select
  to authenticated
  using (true);;
