-- Enable RLS on documents and chunks
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

create policy "Authenticated users can read documents"
  on public.documents for select
  to authenticated
  using (true);

create policy "Authenticated users can read chunks"
  on public.document_chunks for select
  to authenticated
  using (true);

-- Create the documents storage bucket (private)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Authenticated users can download files
create policy "Authenticated users can read storage objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

-- Service role can upload files (used by ingest script)
create policy "Service role can upload storage objects"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'documents');
