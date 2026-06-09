create or replace function public.match_document_chunks(
  query_embedding extensions.vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  similarity float,
  document_title text,
  document_file_type text,
  document_file_size_bytes bigint
)
language plpgsql
set search_path = public, extensions
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity,
    d.title as document_title,
    d.file_type as document_file_type,
    d.file_size_bytes as document_file_size_bytes
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
