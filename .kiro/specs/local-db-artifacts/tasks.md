# Implementation Plan: Local Database Artifacts

## Overview

Create local copies of all SQL migrations and documentation so the Supabase database schema can be rebuilt from scratch. This is a file-organization task with no runtime code changes.

## Tasks

- [x] 1. Create `supabase/migrations/20250101000001_enable_extensions.sql` with `create extension if not exists vector with schema extensions;` (Req 1.1, 4.1)
- [x] 2. Create `supabase/migrations/20250101000002_create_documents_table.sql` with documents table schema including content_hash column (Req 1.1, 1.2)
- [x] 3. Create `supabase/migrations/20250101000003_create_document_chunks_table.sql` with vector(1536) column and HNSW index (Req 1.1, 1.2, 4.1)
- [x] 4. Create `supabase/migrations/20250101000004_create_match_function.sql` with match_document_chunks function using plpgsql, search_path = public, extensions (Req 1.1, 1.2)
- [x] 5. Create `supabase/migrations/20250101000005_create_rls_policies.sql` enabling RLS and adding select policies for authenticated role on both tables (Req 1.1, 1.2)
- [x] 6. Create `supabase/migrations/20250101000006_create_storage_bucket.sql` with documents bucket insert and storage.objects policies (Req 1.1, 5.1, 5.2)
- [x] 7. Create `supabase/migrations/20250101000007_create_auth_trigger.sql` with validate_email_domain trigger function, revoke statements, and trigger creation (Req 1.1, 1.2)
- [x] 8. Create `supabase/functions/README.md` placeholder explaining edge function conventions for future use (Req 2.2)
- [x] 9. Create `supabase/README.md` documenting prerequisites, migration apply command, manual steps, ordering logic, and how to add new migrations (Req 3.1, 3.2, 3.3, 3.4, 1.3, 1.4)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["5"] },
    { "id": 5, "tasks": ["6"] },
    { "id": 6, "tasks": ["7"] },
    { "id": 7, "tasks": ["8", "9"] }
  ]
}
```

Tasks 1-7 must be created in order (migration numbering reflects dependencies). Tasks 8 and 9 are independent of each other but logically come after migrations are written.

## Notes

- SQL content for each migration is fully specified in the design document
- The `supabase/migrations/` directory does not currently exist and needs to be created
- No runtime code is affected by this feature
