# Tasks: Harco Fittings Internal Knowledge Base Chatbot

## Task 1: Project Scaffolding

- [ ] Create Next.js app (App Router, TypeScript, Tailwind CSS)
- [ ] Install assistant-ui: `npx assistant-ui@latest init`
- [ ] Install AI SDK + OpenAI provider: ai, @ai-sdk/openai, @assistant-ui/react-ai-sdk
- [ ] Install Supabase client: @supabase/supabase-js, @supabase/ssr
- [ ] Set up project structure (components, lib, scripts directories)
- [ ] Create .env.local.example with required env vars (OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Initialize Supabase locally: `supabase init` and `supabase link`

## Task 2: Database Setup

- [ ] Create migration: enable pgvector extension
- [ ] Create migration: documents table
- [ ] Create migration: document_chunks table with vector(1536) column + HNSW index
- [ ] Create migration: RLS policies for both tables
- [ ] Create migration: domain validation trigger on auth.users
- [ ] Create Supabase Storage bucket for document files
- [ ] Test migrations locally with supabase db reset

## Task 3: Authentication

- [ ] Create Supabase server client helper (lib/supabase/server.ts)
- [ ] Create Supabase browser client helper (lib/supabase/client.ts)
- [ ] Build login page (/app/login/page.tsx) with email input and magic link flow
- [ ] Implement auth-gate component (redirects unauthenticated users to /login)
- [ ] Add domain check (reject non-@harcofittings.com, sign out + error message)
- [ ] Add sign-out button to chat layout
- [ ] Handle auth callback route for magic link redirect

## Task 3b: Auth UX Cleanup

- [ ] Improve first-time login flow: detect that the user hasn't confirmed yet and show a message explaining they need to check email to confirm registration
- [ ] On second login (already confirmed), magic link logs them in directly
- [ ] Make the distinction clear in the UI so users aren't confused by the first email sending them back to login

## Task 4: Chat UI

- [ ] Install assistant-ui thread component: `npx shadcn@latest add @assistant-ui/thread`
- [ ] Set up AssistantRuntimeProvider with AssistantChatTransport pointing to /api/chat
- [ ] Build custom FileCard tool UI component (icon, title, file size, download link)
- [ ] Build custom EmailDraftCard tool UI component (preview + "Open in Outlook" mailto button)
- [ ] Register tool UI components with assistant-ui (makeAssistantToolUI)
- [ ] Style chat page for responsive layout (phone, tablet, desktop)
- [ ] Add loading state and error handling

## Task 5: Chat API Route Handler

- [ ] Create /app/api/chat/route.ts
- [ ] Validate Supabase auth token from request
- [ ] Generate embedding from latest user message (OpenAI text-embedding-3-small)
- [ ] Query document_chunks for top-5 similar via cosine similarity (lib/rag.ts)
- [ ] Build system prompt with retrieved context
- [ ] Define AI SDK tools: fileReference, emailDraft
- [ ] Stream response using AI SDK streamText + toUIMessageStreamResponse()
- [ ] Handle errors (no auth, LLM failure, no relevant docs)

## Task 6: File Download Route Handler

- [ ] Create /app/api/download/route.ts
- [ ] Validate Supabase auth token
- [ ] Look up document by ID from database
- [ ] Generate signed URL from Supabase Storage (60-min expiry)
- [ ] Return redirect to signed URL

## Task 7: Document Ingestion Script

- [ ] Create scripts/ingest.js (Node.js, runs locally)
- [ ] Parse .eml files (mailparser library)
- [ ] Parse .msg files (msgreader or similar)
- [ ] Extract .docx text (mammoth)
- [ ] Upload original files to Supabase Storage bucket
- [ ] Split text into chunks (~500 tokens, with overlap)
- [ ] Generate embeddings via OpenAI API (batch)
- [ ] Insert document metadata and chunks into database
- [ ] Add idempotency (skip already-ingested files by content hash)
- [ ] Add CLI progress output

## Task 8: System Prompt & RAG Quality

- [ ] Write system prompt for Harco context (pipe fittings industry, sales team audience)
- [ ] Define tool-use instructions (when to call fileReference vs inline citation)
- [ ] Define emailDraft tool behavior (when to generate, format expectations)
- [ ] Test with sample queries and tune retrieval (top-k, similarity threshold)
- [ ] Add "I don't have information about that" behavior when no relevant docs found

## Task 9: Polish & Deploy

- [ ] Responsive design pass (phone, tablet, desktop)
- [ ] Error boundary for graceful failure
- [ ] Loading skeleton for initial auth check
- [ ] Deploy to Vercel (connect GitHub repo)
- [ ] Set environment variables in Vercel dashboard
- [ ] Apply Supabase migrations to production (supabase db push)
- [ ] Run ingestion script against real documents
- [ ] End-to-end smoke test with @harcofittings.com account
