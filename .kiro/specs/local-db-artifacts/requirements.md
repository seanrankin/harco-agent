# Requirements Document

## Introduction

Store local copies of all Supabase SQL migrations and edge function source code in the repository. This provides a safety net for reconstructing the hosted database schema from scratch and ensures all infrastructure-as-code is version controlled alongside application code.

## Glossary

- **Migration_File**: A numbered SQL file in `supabase/migrations/` that contains DDL statements to create or alter database objects
- **Edge_Function**: A Deno-based serverless function deployed to Supabase Edge Functions, stored in `supabase/functions/`
- **Repository**: The harco-agent Git repository
- **Schema**: The complete set of database objects (tables, indexes, functions, triggers, policies, extensions) in the hosted Supabase project
- **Rebuild_Script**: A README or documented process explaining how to apply migrations to recreate the schema

## Requirements

### Requirement 1: Store SQL Migrations Locally

**User Story:** As a developer, I want all SQL migrations stored as files in the repository, so that I can recreate the database schema from scratch on any Supabase project.

#### Acceptance Criteria

1. THE Repository SHALL contain a `supabase/migrations/` directory with timestamped SQL migration files
2. WHEN all migration files are applied in order, THE Schema SHALL match the current hosted database state (pgvector extension, documents table, document_chunks table, HNSW index, RLS policies, match_document_chunks function, validate_email_domain trigger, storage bucket configuration)
3. THE Migration_File naming convention SHALL follow the pattern `YYYYMMDDHHMMSS_description.sql`
4. WHEN a new database change is needed, THE developer SHALL create a new Migration_File rather than modifying existing ones

### Requirement 2: Store Edge Functions Locally

**User Story:** As a developer, I want any Supabase Edge Functions stored in the repository, so that I can redeploy them if needed.

#### Acceptance Criteria

1. WHERE edge functions exist, THE Repository SHALL contain their source code in `supabase/functions/<function_name>/index.ts`
2. WHERE no edge functions exist in the current project, THE Repository SHALL contain an empty `supabase/functions/` directory with a README explaining the convention

### Requirement 3: Document the Rebuild Process

**User Story:** As a developer, I want clear documentation on how to rebuild the database from local files, so that I can reconstruct the project without guesswork.

#### Acceptance Criteria

1. THE Repository SHALL contain a `supabase/README.md` file documenting the rebuild process
2. THE Rebuild_Script SHALL document the command to apply all migrations (`supabase db push` or equivalent)
3. THE Rebuild_Script SHALL document any manual steps required (enabling extensions, creating storage buckets, setting environment variables)
4. THE Rebuild_Script SHALL list prerequisites (Supabase CLI version, linked project)

### Requirement 4: Migration Ordering and Completeness

**User Story:** As a developer, I want migrations to be ordered and complete, so that applying them sequentially produces a valid schema.

#### Acceptance Criteria

1. THE Migration_File set SHALL be ordered by timestamp so that dependencies are resolved (extension before tables, tables before indexes, tables before RLS policies)
2. WHEN migrations are applied to an empty Supabase project, THE Schema SHALL be fully functional without manual intervention beyond documented prerequisites
3. IF a migration depends on a previous migration, THEN THE Migration_File timestamp SHALL be later than its dependency

### Requirement 5: Storage Bucket Configuration

**User Story:** As a developer, I want storage bucket setup included in the migrations or documented separately, so that file storage works after a rebuild.

#### Acceptance Criteria

1. THE Repository SHALL include SQL or documentation to recreate the "documents" storage bucket with its policies
2. WHEN the storage bucket migration is applied, THE bucket SHALL have the same access policies as the current hosted configuration
