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
- Proactive email drafting (detects email intent and drafts automatically)
- Send to Outlook: one-click draft creation in Microsoft 365 via Graph API (with file attachments)
- Thread history with sidebar navigation and persistence
- Inline email draft rendering in assistant messages
- Personalized responses (captures user name at signup, injects into system prompt)
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

Optional (enables Send to Outlook):

| Variable                  | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| `MICROSOFT_CLIENT_ID`     | Azure AD app client ID                                                   |
| `MICROSOFT_CLIENT_SECRET` | Azure AD app client secret                                               |
| `MICROSOFT_REDIRECT_URI`  | OAuth callback URL (e.g. `https://your-domain.com/api/outlook/callback`) |

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
│   │   ├── chat/route.ts             # Chat endpoint (streaming, RAG, tools, email intent detection)
│   │   ├── documents/count/route.ts  # Indexed document count for top bar
│   │   ├── download/route.ts         # Signed URL redirect for doc downloads
│   │   ├── outlook/
│   │   │   ├── auth/route.ts         # Microsoft OAuth initiation
│   │   │   ├── callback/route.ts     # OAuth callback (popup postMessage flow)
│   │   │   ├── send-draft/route.ts   # Create draft in Outlook with attachments
│   │   │   └── status/route.ts       # Check Microsoft auth status
│   │   └── threads/route.ts          # Thread CRUD for history sidebar
│   ├── auth/callback/route.ts        # Magic link callback
│   ├── login/page.tsx                # Login page (with name capture on first sign-in)
│   └── page.tsx                      # App shell and chat page
├── components/
│   ├── app-shell/                    # Sidebar, top bar, thread list
│   ├── assistant-ui/                 # Chat thread components (message parts, markdown)
│   ├── brand/                        # Brand marks (diamond, logo)
│   ├── tool-ui/                      # File card, email draft card, Outlook button, spec table
│   └── ui/                           # Shared UI primitives (shadcn)
│   └── chat-client.tsx               # Main chat client component
├── lib/
│   ├── citations/                    # Remark plugin for inline source citations
│   ├── outlook/                      # Graph client, token manager, attachment resolver, config
│   ├── supabase/                     # Supabase client helpers (browser + server)
│   ├── auth.ts                       # requireAuth helper
│   ├── detect-email-intent.ts        # Pre-classifies explicit email drafting intent
│   ├── email-sources.ts              # Extracts document IDs from tool calls for attachments
│   ├── format-context.ts             # Formats RAG docs into system prompt context
│   ├── onboarding.ts                 # Device-local signed-in flag constant
│   ├── parse-inline-email.ts         # Parses inline email blocks from assistant text
│   ├── rag.ts                        # Vector similarity retrieval
│   ├── starter-suggestions.ts        # Rotating starter prompt suggestions
│   ├── system-prompt.ts              # System prompt builder (with user name preamble)
│   ├── thread-adapter.tsx            # Thread runtime adapter for assistant-ui
│   └── thread-utils.ts               # Thread serialization utilities
└── middleware.ts                     # Session refresh middleware

scripts/
└── ingest.js                         # Document ingestion CLI

supabase/
└── migrations/                       # Database schema (pgvector, RLS, storage, threads)
```

## Styling & UI conventions

The app uses Tailwind v4 (CSS-config) on top of shadcn/ui primitives and the [`@assistant-ui/react`](https://assistant-ui.com/) library for the chat surface. Follow these rules when adding or changing UI.

### Design tokens

All colors and radii live in `src/app/globals.css` under `:root`. Brand hex values are aliased to shadcn semantic names (`--primary`, `--accent`, `--background`, etc.) so every shadcn/ui component inherits the brand automatically.

- **Never hardcode hex values in components.** Reference tokens through Tailwind utilities: `bg-primary`, `text-accent-foreground`, `border-border`, `bg-card`.
- File-type colors and brand surfaces are exposed as raw tokens too: `bg-pdf`, `bg-docx`, `bg-xlsx`, `text-ring` (spec blue). Use these for tool-UI accents that don't fit a semantic role.
- The dark-mode block in `:root` is intentionally unstyled for v1. Don't theme it without a design pass.

### Fonts

Loaded via `next/font/google` in `src/app/layout.tsx` and exposed as CSS variables consumed by `@theme inline` in `globals.css`:

| Family         | Token        | Use for                                         |
| -------------- | ------------ | ----------------------------------------------- |
| Inter Tight    | `font-sans`  | Default body and UI text                        |
| Source Serif 4 | `font-serif` | Display headings only (empty state, login hero) |
| JetBrains Mono | `font-mono`  | Labels, metadata, file metadata, eyebrows       |

### Assistant-ui primitives first

When restyling chat UI, look for an existing primitive before writing custom markup. The most common ones used here are `ThreadPrimitive`, `MessagePrimitive`, `ComposerPrimitive`, `ActionBarPrimitive`, `BranchPickerPrimitive`, and `SuggestionPrimitive`. Each accepts a `render` prop — swap in a shadcn `<Button>` or `<TooltipIconButton>` and layer Tailwind classes for spacing and color.

The `aui-*` classnames in `src/components/assistant-ui/thread.tsx` are the library's internal style hooks. **Don't remove them** — add Tailwind utilities alongside.

### Tool UIs

Tool renderers live in `src/components/tool-ui/` and are registered at the top of `src/app/page.tsx` via `makeAssistantToolUI({ toolName, render })`. The component receives `args` directly from the backend tool call. Keep render functions pure (no side effects, no fetches).

The shared spec-table aesthetic for tabular data is defined in two places that must stay visually in sync:

- `src/components/tool-ui/spec-table.tsx` — single source of truth for `<SpecTable>` (used by future `lookup_spec` tool).
- `src/components/assistant-ui/markdown-text.tsx` — `table` / `th` / `td` / `tr` component overrides that style LLM-generated markdown tables identically.

### Inline citations

The assistant emits `[1]` / `[2]` style tokens in prose, paired with a `data-sources` event stream that populates the Sources footer at the bottom of each answer. A custom remark plugin at `src/lib/citations/remark-citations.ts` rewrites those tokens into in-page links pointing at `#source-N` anchors rendered by `SourceAttachmentsDataUI`. The `a` component override in `markdown-text.tsx` detects the citation-link sentinel and renders the spec-blue badge. No backend coordination required — just keep the `id="source-N"` convention intact.

### Responsive breakpoints

The mockups target four sizes:

- **≥1181px** desktop — full layout (sidebar + main + future preview pane)
- **861–1180px** tablet landscape — same layout, tighter spacing
- **≤860px** sidebar collapses to a drawer with a floating hamburger
- **≤520px** phone — composer caption hides, message gaps tighten

Use Tailwind's default screen sizes (`sm:`, `md:`, `lg:`) — don't introduce custom breakpoints unless a layout genuinely needs one. The sidebar drawer threshold is `lg:` (1024px), which is close enough to the mockup's 860px for practical purposes.

### Icons

Only `lucide-react`. Don't add a second icon library.

### File organization

```
src/components/
├── app-shell/       # Sidebar, mobile menu — shell pieces around the chat
├── assistant-ui/    # Wrappers around @assistant-ui/react primitives
├── brand/           # Brand marks (diamond, logo)
├── tool-ui/         # Tool renderers (file card, email draft, spec table)
└── ui/              # shadcn primitives (button, dialog, tooltip)
```

### Deferred work

Anything intentionally left for a follow-up PR is flagged with the comment `// TODO(redesign):` — greppable across the codebase. Current TODOs cover thread history persistence, attachment storage, and the indexed-document count.

## Deployment

Frontend deploys to Vercel. Database and auth are on hosted Supabase (no local dev containers).

After adding new migrations or edge functions, push them:

```bash
supabase db push --linked
```
