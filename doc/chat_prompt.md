I need help evaluating the right technical approach for a client project before I write a spec.
Don't build anything yet — I want a structured analysis first.

## Project Overview

Internal AI-powered knowledge base chatbot for a pipe and pipe fitting manufacturer (Harco Fittings).
Non-technical staff ask questions in plain English and get grounded answers from company documents. There's less than 20 salespeople in the company, so volume isn't really an issue.

## Core Requirements (these must be satisfied by any approach)

1. **RAG-based chat** — answers grounded in real company documents, not hallucinated
2. **File downloads in responses** — when relevant, responses include downloadable links to source
   files (Word docs, PDFs) with filetype icon, file size, and title displayed
3. **"Send in Outlook" links** — when a response contains an email draft or template, include a
   mailto/EWS-style link that opens Outlook with the content pre-filled; attachments included
   where relevant
4. **Document ingestion** — ~100 Outlook emails (most with .docx attachments); emails need to be
   parsed and indexed, but original Word docs must stay in .docx format and be servable for download
5. **Auth** — restrict access to @harcofittings.com email accounts; options are magic link
   (preferred for simplicity) or full user accounts
6. **Non-technical admin** — staff should never touch the underlying system, I can upload new docs for them as needed, and I will make updates and changes as needed.
7. Dev env: I've built a lot of React/node apps with Supabase on the backend, and hosted on Vercel, I'm confortable with that. We'll use all hosted products if needed, no on-prem.

## The Three Approaches to Evaluate

### Option A: n8n-Centered Automation Stack

n8n (hosted) as the orchestration and chat layer, connected to an LLM (Claude or OpenAI), a database (maybe Supabase) for vector storage and auth, Google Drive or similar for document storage.

### Option B: Custom React + Node App

Full custom web application. React frontend, Node backend, direct LLM API calls,
Supabase for vector DB and auth, file storage TBD.

### Option C: Off-the-Shelf AI Chatbot Product

A purpose-built RAG/knowledge base product (e.g. Notion AI, Guru, Glean, Dust, Inkeep,
or similar) that handles ingestion, chat, and auth out of the box.

## Evaluation Criteria

Score or rank each option on:

1. **Total cost** — estimated monthly run cost including all services (n8n, Supabase, hosting,
   LLM tokens, SaaS seats, etc.)
2. **Complexity / failure points** — how many moving parts, how hard to debug, how hard to hand off
3. **Requirement coverage** — how cleanly does it satisfy all 6 core requirements above,
   especially the file download UI and Outlook link features
4. **Document ingestion realism** — can it actually process .msg/.eml Outlook emails with .docx
   attachments cleanly?
5. **Time to working prototype** — realistic estimate for a solo developer
6. **Maintainability** — how easy is it for me (solo consultant) to support this long-term

## Additional Context

- I'm a frontend-leaning fullstack dev (React, Node, some Rails) comfortable with Supabase
- The client will own and run this long-term — I won't be on retainer
- The Outlook email integration (mailto link or better) is a differentiating feature the client
  will notice — don't gloss over feasibility here
- Word docs must remain as .docx (not converted to markdown or plain text for storage)

## What I Want From You

1. A comparison matrix covering all criteria above
2. A recommended approach with clear rationale
3. Any hybrid approaches worth considering (e.g. off-the-shelf for RAG + custom UI layer)
4. Specific product names for Option C worth researching
5. Any requirement I haven't thought through that could bite me later — especially around
   the Outlook integration, .docx file serving, and email parsing
