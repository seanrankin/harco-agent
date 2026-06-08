# Supabase Database - Rebuild Guide

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- A Supabase project created
- Project linked: `supabase link --project-ref <your-project-ref>`
- Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Applying Migrations

To rebuild the database schema from scratch on a fresh Supabase project:

```bash
supabase db push
```

This applies all migrations in `supabase/migrations/` in timestamp order.

## Migration Order

Migrations are ordered by dependency:

1. **enable_extensions** - pgvector must exist before vector columns
2. **create_documents_table** - base table, no dependencies
3. **create_document_chunks_table** - depends on documents (FK), depends on pgvector (vector column)
4. **create_match_function** - depends on both tables
5. **create_rls_policies** - depends on both tables
6. **create_storage_bucket** - independent, creates the file storage bucket
7. **create_auth_trigger** - independent, restricts signups to @harcofittings.com

## Manual Steps After Migration

After applying migrations, configure these in the Supabase Dashboard:

1. **Authentication > URL Configuration**
   - Add your site URL (e.g., `https://your-app.vercel.app`)
   - Add redirect URL: `https://your-app.vercel.app/auth/callback`
   - For local dev: `http://localhost:3000/auth/callback`

2. **Authentication > Email Templates** (optional)
   - Customize the magic link email if desired

## Adding New Migrations

When you need to change the schema:

1. Create a new file with the current timestamp:

   ```bash
   supabase migration new <description>
   ```

   This creates a new file like `20260608120000_description.sql`

2. Write your SQL in the new file

3. Apply to hosted project:
   ```bash
   supabase db push
   ```

Never modify existing migration files. Always add new ones.

## Checking for Schema Drift

To see if local migrations match the hosted database:

```bash
supabase db diff --linked
```
