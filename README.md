# Harco Knowledge Base Agent

An internal AI-powered knowledge base for Harco Fittings salespeople. Ask questions about company documents (product catalogs, emails, spec sheets) and get answers grounded in your actual files, with source references and email drafting built in.

## Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- **AI**: OpenAI GPT-4o-mini via Vercel AI SDK + assistant-ui
- **RAG**: pgvector on Supabase (text-embedding-3-small, cosine similarity)
- **Auth**: Supabase magic link OTP, restricted to @harcofittings.com
- **Storage**: Supabase Storage for original document files
- **Hosting**: Vercel (frontend) + Supabase (database, auth, storage)

## Features

- Conversational Q&A grounded in ingested company documents
- RAG retrieval with pgvector (HNSW index, cosine similarity)
- Source document cards with signed download links
- Email draft generation (opens in mail client)
- Magic link auth with domain restriction
- Document ingestion script supporting .docx, .pdf, .eml, and .msg files (with attachment extraction)

## Getting Started

### Prerequisites

- Node.js 22 (see `.nvmrc`)
- A Supabase project with the migrations applied
- OpenAI API key

### Environment Setup

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable                        | Description                                               |
| ------------------------------- | --------------------------------------------------------- |
| `OPENAI_API_KEY`                | OpenAI API key                                            |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key                                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key                                 |
| `ALLOWED_EMAILS`                | Comma-separated emails allowed outside @harcofittings.com |

### Database Migrations

Migrations live in `supabase/migrations/`. Apply them to your remote Supabase project:

```bash
supabase db push --linked
```

### Run Locally

```bash
npm install
npm run dev
```

### Ingest Documents

Place documents in a folder, then run:

```bash
npm run ingest -- ./doc
```

Supported formats: `.docx`, `.doc`, `.pdf`, `.eml`, `.msg`

The script extracts text, chunks it, generates embeddings, uploads originals to Supabase Storage, and stores chunks with vectors in the `document_chunks` table. Already-ingested files (matched by content hash) are skipped.

Email files (`.eml` and `.msg`) are parsed for both body text and attachments. Supported attachments (`.docx`, `.doc`, `.pdf`) are extracted and ingested as separate downloadable documents.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # Chat endpoint (streaming, RAG, tools)
│   │   └── download/route.ts   # Signed URL redirect for doc downloads
│   ├── auth/callback/route.ts  # Magic link callback
│   ├── login/page.tsx          # Login page
│   └── page.tsx                # Main chat UI
├── components/
│   ├── assistant-ui/           # Chat thread components
│   ├── tool-ui/                # File card, email draft card
│   └── ui/                     # Shared UI primitives
├── lib/
│   ├── rag.ts                  # Vector similarity retrieval
│   └── supabase/               # Supabase client helpers
└── middleware.ts               # Session refresh middleware

scripts/
└── ingest.js                   # Document ingestion CLI

supabase/
└── migrations/                 # Database schema (pgvector, RLS, storage)
```

## Deployment

Frontend deploys to Vercel. Database and auth are on hosted Supabase (no local dev containers).

After adding new migrations or edge functions, push them:

```bash
supabase db push --linked
```
