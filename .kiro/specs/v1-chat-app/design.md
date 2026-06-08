# Design: Harco Fittings Internal Knowledge Base Chatbot

## Architecture Overview

```
┌───────────────────────────────────────────┐
│  Next.js App (Vercel)                     │
│  ┌─────────────────┐  ┌────────────────┐ │
│  │  React Frontend  │  │  /api/chat     │ │
│  │  (assistant-ui)  │──│  Route Handler │ │
│  └─────────────────┘  └───────┬────────┘ │
└───────────────────────────────┼───────────┘
                                │
                     ┌──────────▼───────────────┐
                     │  Supabase                 │
                     │  - Auth (magic link)      │
                     │  - PostgreSQL + pgvector  │
                     │  - Storage (files)        │
                     └──────────┬───────────────┘
                                │
                     ┌──────────▼───────────────┐
                     │  OpenAI API              │
                     │  - Embeddings            │
                     │  - Chat completions      │
                     └──────────────────────────┘
```

## Technology Choices

| Layer        | Technology                                                               | Rationale                                                                    |
| ------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Frontend     | Next.js (App Router)                                                     | AI SDK + assistant-ui integration, single deploy with API routes             |
| Chat UI      | assistant-ui (@assistant-ui/react + @assistant-ui/react-ai-sdk)          | Streaming, markdown, custom message parts (FileCard, EmailDraftCard), shadcn |
| Styling      | Tailwind CSS                                                             | Rapid UI, shadcn/assistant-ui compatible                                     |
| Hosting      | Vercel                                                                   | Free tier sufficient for 20 users, zero-config deploy for Next.js            |
| Auth         | Supabase Auth                                                            | Magic link built-in, JWT-based sessions                                      |
| Database     | Supabase PostgreSQL + pgvector                                           | Vector search + relational data in one DB                                    |
| File Storage | Supabase Storage                                                         | Signed URLs, integrated with auth                                            |
| API Layer    | Next.js Route Handlers (/app/api/)                                       | Co-located with frontend, no CORS, streams to assistant-ui directly          |
| LLM          | OpenAI API (gpt-4o-mini for chat, text-embedding-3-small for embeddings) | Cost-effective, good quality for RAG                                         |
| AI SDK       | Vercel AI SDK (ai package)                                               | streamText, embeddings, integrates with assistant-ui transport               |
| Doc Parsing  | Node.js script (mammoth, mailparser)                                     | One-time ingestion, not a runtime dependency                                 |

## Database Schema

### Table: `documents`

```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_type text not null,           -- 'docx', 'pdf', 'eml'
  file_size_bytes bigint not null,
  storage_path text not null,         -- path in Supabase Storage
  source_email_subject text,          -- if extracted from email
  created_at timestamptz default now()
);
```

### Table: `document_chunks`

```sql
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,              -- chunk text
  embedding vector(1536) not null,    -- OpenAI text-embedding-3-small dimension
  chunk_index integer not null,
  created_at timestamptz default now()
);

-- HNSW index for fast similarity search
create index on document_chunks using hnsw (embedding vector_cosine_ops);
```

### RLS Policies

```sql
-- Only authenticated users can read
alter table documents enable row level security;
create policy "Authenticated users can read documents"
  on documents for select
  to authenticated
  using (true);

alter table document_chunks enable row level security;
create policy "Authenticated users can read chunks"
  on document_chunks for select
  to authenticated
  using (true);
```

## API Design

### Route Handler: `/app/api/chat/route.ts`

- **Method:** POST
- **Auth:** Supabase JWT validated server-side
- **Uses:** AI SDK `streamText` with assistant-ui `toUIMessageStreamResponse()`
- **Flow:** Receives messages from assistant-ui transport, embeds the user query, retrieves context from pgvector, streams LLM response with tool calls for file references and email drafts

### Route Handler: `/app/api/download/route.ts`

- **Method:** GET
- **Auth:** Supabase JWT validated server-side
- **Query:** `?document_id=uuid`
- **Response:** Redirect to signed URL (60-minute expiry)

### Custom Tool Definitions (AI SDK Tools)

```typescript
// File reference tool - called by LLM when citing a document
fileReference: tool({
  description: "Reference a source document for download",
  parameters: z.object({
    document_id: z.string(),
    title: z.string(),
    file_type: z.string(),
    file_size_bytes: z.number(),
  }),
});

// Email draft tool - called by LLM when generating an email
emailDraft: tool({
  description: "Generate an email draft for the user",
  parameters: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
});
```

assistant-ui renders these tool calls using registered Tool UI components (FileCard, EmailDraftCard).

## RAG Pipeline (Runtime)

1. User sends message
2. Generate embedding of user message via OpenAI API
3. Query `document_chunks` for top-k similar chunks (cosine similarity, k=5)
4. Build prompt with system message + retrieved context + conversation history
5. Stream LLM response back to client
6. Parse response for file references and email drafts, emit structured events

## Document Ingestion Pipeline (Offline Script)

1. Read source files from a local directory
2. For .eml/.msg files: parse email, extract body + attachments
3. For .docx files: extract text via mammoth
4. Upload original files to Supabase Storage
5. Split extracted text into chunks (~500 tokens each, with overlap)
6. Generate embeddings for each chunk via OpenAI API
7. Insert document metadata + chunks into database

## Frontend Components

```
/app
├── layout.tsx                    (root layout, providers)
├── page.tsx                      (chat page - "use client")
├── login/page.tsx                (magic link login)
├── api/
│   ├── chat/route.ts             (streaming chat endpoint)
│   └── download/route.ts         (file download redirect)
├── components/
│   ├── assistant-ui/             (shadcn-installed assistant-ui components)
│   │   ├── thread.tsx
│   │   └── thread-list.tsx
│   ├── tool-ui/
│   │   ├── file-card.tsx         (custom: icon, title, size, download link)
│   │   └── email-draft-card.tsx  (custom: preview + "Open in Outlook" mailto button)
│   └── auth-gate.tsx             (session check, domain validation)
├── lib/
│   ├── supabase/
│   │   ├── client.ts             (browser client)
│   │   └── server.ts             (server client for route handlers)
│   ├── tools.ts                  (AI SDK tool definitions)
│   └── rag.ts                    (embedding + vector search logic)
└── scripts/
    └── ingest.js                 (document ingestion - run locally)
```

## Auth Flow

1. User enters email on login page
2. Frontend calls `supabase.auth.signInWithOtp({ email })`
3. Supabase sends magic link email
4. User clicks link, redirected back to app with session
5. Frontend checks email domain: if not `@harcofittings.com`, sign out and show error
6. Additionally: database trigger validates domain on signup to prevent any data access before frontend check runs

## Key Design Decisions

1. **Next.js Route Handlers for the chat API.** Single deployment, no CORS issues, assistant-ui's transport talks directly to `/api/chat`. Supabase handles only data and auth, not compute.

2. **AI SDK tools for structured content** (file cards, email drafts). The LLM calls tools when it wants to reference a file or generate an email. assistant-ui renders these tool calls using custom Tool UI components. This is cleaner than parsing markdown for special patterns.

3. **gpt-4o-mini over gpt-4o** for cost. With 20 users and a small corpus, quality is sufficient and cost stays under $30/mo for tokens.

4. **text-embedding-3-small (1536 dims)** for embeddings. Good balance of quality and index size for ~100 documents.

5. **Domain validation at both frontend and backend.** Defense in depth. The frontend check provides good UX, the backend trigger prevents any bypass.
