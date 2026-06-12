create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_type text not null,
  file_size_bytes bigint not null,
  storage_path text not null,
  source_email_subject text,
  content_hash text,
  created_at timestamptz default now()
);

alter table public.documents enable row level security;

create policy "Authenticated users can read documents"
  on public.documents for select
  to authenticated
  using (true);;
