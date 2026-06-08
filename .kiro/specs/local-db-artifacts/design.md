# Design: Local Database Artifacts

## Overview

This feature organizes all Supabase database schema definitions as local SQL migration files in the repository. The goal is purely organizational: a developer should be able to recreate the hosted database schema from scratch by applying the local migration files in order. No runtime code changes are involved.

The project currently uses a hosted Supabase instance with no local dev environment. The `supabase/` directory exists with a `config.toml` but no migrations. This design adds:

1. Timestamped SQL migration files capturing the full current schema
2. A placeholder for edge functions (none currently exist)
3. A README documenting the rebuild process

## Architecture

```
supabase/
├── config.toml                              (existing)
├── README.md                                (new - rebuild documentation)
├── migrations/
│   ├── 20250101000001_enable_extensions.sql
│   ├── 20250101000002_create_documents_table.sql
│   ├── 20250101000003_create_document_chunks_table.sql
│   ├── 20250101000004_create_match_function.sql
│   ├── 20250101000005_create_rls_policies.sql
│   ├── 20250101000006_create_storage_bucket.sql
│   └── 20250101000007_create_auth_trigger.sql
└── functions/
    └── README.md                            (placeholder)
```

Migrations are ordered by dependency:

1. Extensions first (pgvector must exist before vector columns)
2. Tables (documents before document_chunks due to FK)
3. Functions (match_document_chunks depends on both tables)
4. RLS policies (depend on tables)
5. Storage bucket and policies
6. Auth trigger (independent but logically last)

## Components and Interfaces

### Migration Files

Each migration is a standalone SQL file that can be applied with `supabase db push` or directly via `psql`. Files are idempotent where possible (using `IF NOT EXISTS` / `CREATE OR REPLACE`).

#### Migration 1: Enable Extensions

```sql
-- Enable pgvector in the extensions schema
create extension if not exists vector with schema extensions;
```

#### Migration 2: Documents Table

```sql
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_type text not null,
  file_size_bytes bigint not null,
  storage_path text not null,
  source_email_subject text,
  content_hash text,
  created_at timestamptz default now()
);
```

#### Migration 3: Document Chunks Table

```sql
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
```

#### Migration 4: Match Function

```sql
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
```

#### Migration 5: RLS Policies

```sql
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
```

#### Migration 6: Storage Bucket

```sql
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
```

#### Migration 7: Auth Domain Validation Trigger

```sql
create or replace function auth.validate_email_domain()
returns trigger
language plpgsql
security definer
set search_path = auth
as $$
begin
  if new.email is null then
    raise exception 'Email is required';
  end if;

  -- Allow hardcoded exception
  if new.email = 'sean.rankin@gmail.com' then
    return new;
  end if;

  -- Enforce domain restriction
  if new.email not like '%@harcofittings.com' then
    raise exception 'Only @harcofittings.com email addresses are allowed';
  end if;

  return new;
end;
$$;

-- Revoke execute from public-facing roles
revoke execute on function auth.validate_email_domain() from anon;
revoke execute on function auth.validate_email_domain() from authenticated;

-- Create trigger (drop first to make idempotent)
drop trigger if exists validate_email_domain_trigger on auth.users;
create trigger validate_email_domain_trigger
  before insert on auth.users
  for each row
  execute function auth.validate_email_domain();
```

### Edge Functions Directory

Since the project currently has no edge functions (the chat API is a Next.js route handler), this is a placeholder with a README explaining the convention for future use.

### Rebuild Documentation

The `supabase/README.md` documents:

- Prerequisites (Supabase CLI version, linked project, environment variables)
- How to apply all migrations
- Manual steps (if any)
- How the migration ordering works

## Data Models

No new data models are introduced. The migration files codify the existing schema as documented in the requirements:

| Object                         | Type             | Migration |
| ------------------------------ | ---------------- | --------- |
| `vector` extension             | Extension        | 1         |
| `documents`                    | Table            | 2         |
| `document_chunks`              | Table            | 3         |
| HNSW index                     | Index            | 3         |
| `match_document_chunks`        | Function         | 4         |
| RLS policies (documents)       | Policy           | 5         |
| RLS policies (document_chunks) | Policy           | 5         |
| `documents` storage bucket     | Bucket           | 6         |
| Storage policies               | Policy           | 6         |
| `validate_email_domain`        | Trigger function | 7         |

## Error Handling

Not applicable. This feature produces static SQL files and documentation. There is no runtime error handling involved.

If a migration fails during `supabase db push`:

- The CLI reports the error with the failing statement
- The developer fixes the migration file and re-runs
- Migrations are applied transactionally by default

## Testing Strategy

**Property-based testing does not apply to this feature.** This is infrastructure-as-code (static SQL files and documentation). There are no pure functions, no input/output transformations, and no business logic that varies with input.

**Appropriate testing approach:**

1. **Manual verification**: Apply migrations to a fresh Supabase project and confirm the schema matches the hosted database
2. **Schema diff**: Run `supabase db diff` against the hosted project to confirm no drift between local files and remote state
3. **Smoke test**: After applying all migrations, run the existing ingest script and chat API to confirm end-to-end functionality

**Why PBT doesn't apply:**

- SQL DDL files are declarative configuration, not functions with inputs/outputs
- There is no meaningful "for all inputs X, property P(X) holds" statement possible
- The correctness check is binary: the schema either matches the hosted state or it doesn't
- A single `supabase db diff` is more valuable than 100 randomized iterations

## Design Decisions

1. **Separate migrations per logical unit** rather than one giant file. This makes it easier to understand what each migration does, debug failures, and add future migrations without touching existing ones.

2. **Timestamps use a fixed base date (20250101)** for the initial set. All files get the same date prefix with incrementing seconds to establish ordering. Future migrations use actual timestamps via `supabase migration new`.

3. **`IF NOT EXISTS` / `CREATE OR REPLACE` where possible** to make migrations partially idempotent. This helps if a migration is accidentally re-applied, though `supabase db push` tracks applied migrations.

4. **Auth trigger in its own migration** because it touches the `auth` schema (managed by Supabase). It's separated so it can be easily excluded if Supabase's auth schema changes in a future upgrade.

5. **Storage bucket via SQL** using `storage.buckets` and `storage.objects` tables directly. This is the supported approach for migrations and avoids requiring manual Dashboard clicks.

6. **No local Supabase dev** continues as-is. The migrations exist for rebuild/documentation purposes. The `config.toml` is already present for future local dev if needed.
