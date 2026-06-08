# Requirements: Harco Fittings Internal Knowledge Base Chatbot

## Overview

Internal AI-powered chatbot for Harco Fittings (~20 salespeople). Staff ask plain-English questions and receive grounded answers from company documents, with downloadable file links and email draft generation.

## Functional Requirements

### FR-1: RAG-Based Chat

- Users type questions in a chat interface
- Responses are grounded in indexed company documents (not hallucinated)
- Responses stream in real-time
- Citations reference source documents when applicable

### FR-2: File Download Cards

- When a response references a source document, render a download card
- Card displays: file type icon (.docx/.pdf), document title, file size
- Clicking the card downloads the original file (preserved in original format)

### FR-3: Email Draft Links (mailto:)

- When a response contains an email draft or template, render a "Send in Outlook" button
- Button opens a mailto: link with To, Subject, and Body pre-filled
- Body content is URL-encoded from the generated draft
- Phase 1 limitation: no attachments via mailto (documented for client)

### FR-4: Authentication

- Magic link login via email
- Restricted to @harcofittings.com domain only
- Unauthorized domains are rejected at signup/login with a clear error message
- Session persists via Supabase Auth (JWT)

### FR-5: Document Ingestion Pipeline

- Manual Node.js script to process source documents
- Parses .eml/.msg emails, extracts body text and .docx attachments
- Extracts text from .docx files for embedding (using mammoth or similar)
- Stores original .docx/.pdf files in Supabase Storage (unchanged)
- Generates vector embeddings and stores in pgvector
- Stores metadata (title, file type, file size, storage path) alongside embeddings

### FR-6: Chat History

- Current session messages persist in the UI during a conversation
- No cross-session history in v1 (user starts fresh each visit)

## Non-Functional Requirements

### NFR-1: Performance

- Chat responses begin streaming within 2 seconds
- Vector search returns results in under 500ms for the expected corpus size (~100 docs)

### NFR-2: Security

- All API calls authenticated via Supabase JWT
- RLS policies restrict data access to authenticated users
- File storage uses signed URLs (time-limited) for downloads
- No public access to any endpoint or file

### NFR-3: Hosting & Deployment

- Frontend: Vercel (static React + Edge Functions or serverless functions)
- Backend: Supabase (Auth, Database with pgvector, Storage, Edge Functions)
- No on-premises infrastructure

### NFR-4: Maintainability

- Standard React/Node stack (any competent developer can maintain)
- Environment variables for all secrets (LLM API keys, Supabase keys)
- Document ingestion script is idempotent (can re-run safely)

## Out of Scope (Phase 2)

- Microsoft Graph API integration for Outlook drafts with attachments
- Admin UI for document upload/management
- Cross-session chat history
- User analytics or usage tracking
- Multi-tenant support
