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
