# Fix: file cards labeled "PDF" but downloading as `.eml`

## Problem

The `fileReference` card showed a file type, title, and size that the LLM
(gpt-4o-mini) supplied as tool arguments. The model guessed "PDF" (its tool
description suggested "docx, pdf, etc" and the BLURT docs read like spec sheets),
while `/api/download` streamed the real stored file by `document_id` — an `.eml`.
Label and download came from two different sources and were never forced to agree.
The byte sizes and titles were model guesses too.

The authoritative `file_type` already exists end-to-end: written at ingestion
(`scripts/ingest.js`), stored as `documents.file_type` (NOT NULL), and loaded
into `contextDocs` by `retrieveContext` (`src/lib/rag.ts`). The render path just
ignored it.

## Fix

Stop trusting model-supplied metadata. The model passes only `document_id`;
title/file_type/size are resolved from the same DB rows the download streams.

1. `src/app/api/chat/route.ts` — slim the `fileReference` schema to
   `{ document_id }`. Add an `execute` that resolves metadata from a
   `Map` built from `contextDocs`; return `null` for an id not in context.
   Covers both the first pass and the document-suggestion fallback pass
   (same tool instance).
2. `src/components/chat-client.tsx` — render the card from the tool `result`
   (authoritative) instead of `args`. `document_id` stays from args for the
   existing per-document dedup. Render nothing until the result arrives.
3. `src/app/api/chat/route.file-card-metadata.test.ts` — assert the resolved
   metadata equals the `contextDocs` row (incl. `file_type: "eml"`), and that
   an unknown id resolves to `null`.

## Out of scope

`.eml` cards now honestly read "EML". They stay download cards for now; an
upcoming change will let users preview emails in a modal instead.

## Verification

- `npx vitest run` — 227 passing.
- `npx tsc --noEmit` — clean for changed files (one pre-existing error in
  `outlook-button.test.tsx` is unrelated).
- No new eslint errors (2 pre-existing in `chat-client.tsx` untouched).
