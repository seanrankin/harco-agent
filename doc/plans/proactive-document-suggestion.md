# Plan: Make the agent reliably suggest downloadable reference documents

## Context

Salespeople rarely see the 36 PDFs + 3 Word docs (spec sheets, catalogs, install guides) surfaced as downloadable reference cards, even though the knowledge base is full of them.

I investigated the assumption that the docs aren't being retrieved. **They are.** Real retrievals against typical sales queries returned 5–8 downloadable (non-email) docs in the top-8 every time, at healthy similarity (0.40–0.57). The auto "Sources" footer (`data-sources`) also already lists them. So retrieval, ingestion, and UI wiring are all fine.

The actual gap is in the **system prompt**. Every proactive instruction in `src/lib/system-prompt.ts` is about *emails*. Documents get a single, purely reactive rule:

> "When you reference a specific document, ALWAYS use the fileReference tool..."

So gpt-4o-mini only emits a `fileReference` card when it happens to name a document in its prose. When it synthesizes an answer without naming a source — most of the time — it cards nothing. Nothing tells it to proactively recommend the relevant reference docs it was handed.

The user wants cards to render **reliably whenever a document is genuinely germane** to the answer and the request. gpt-4o-mini is an unreliable tool-caller (the email flow already needed a deterministic second-pass fallback for this exact reason), so a prompt change alone won't be reliable enough. We mirror the proven email two-pass pattern.

## Changes

### 1. `src/lib/system-prompt.ts` — reframe documents from reactive to proactive

- Rewrite the reactive rule (line 5) so document suggestion is proactive: after answering, surface the **1–2 most relevant** downloadable reference documents (`pdf`/`doc`/`docx`) from the Available Documents list via `fileReference`, each preceded by one short lead-in sentence (the existing ≤20-word rule, line 7, stays).
- Add a short **"Proactive Document Suggestion"** section parallel to the email sections:
  - Surface downloadable docs only when they directly support the answer the user asked for. Prefer spec sheets, product catalogs, and install guides; prefer attachments over their parent email (existing rule, line 6).
  - Do NOT card documents on small talk, refusals, or "I don't have that information" responses.
  - Cap at 2 cards; the auto Sources footer lists the rest.
- Keep all existing email rules and the "never write markdown download links" rules unchanged.

### 2. `src/app/api/chat/route.ts` — deterministic document-suggestion fallback

Mirror the existing email two-pass fallback (lines 116–130) so cards render reliably when germane.

- After the main pass, read the tool calls (already awaited at line 111) and compute `fileReferenceCalled` (analogous to `emailDraftCalled`).
- After the email fallback block, add a document fallback guarded by:
  `attachmentDocs.length > 0 && !fileReferenceCalled && contextText !== ""`
  (`contextText` non-empty means retrieval actually found grounding — a proxy for a doc-relevant query; small talk that no-ops is handled by the fallback prompt itself.)
- The fallback runs one focused `streamText` pass with **only** the `fileReference` tool, instructed to:
  - call `fileReference` for the 1–2 most relevant downloadable docs that directly support the answer already given, each with a ≤12-word lead-in;
  - call **nothing** and output nothing if no document is genuinely germane (the tool is optional here, unlike the mandatory `emailDraft` fallback);
  - not re-answer the question.
- `writer.merge(...)` the fallback stream and `await` its `toolCalls`, before the existing `data-sources` emit at line 133 (so `deduplicateSources` correctly removes any newly-carded docs from the footer).

Order in `execute`: main pass → email fallback (unchanged) → **new document fallback** → `data-sources` emit.

### 3. Tests

- `src/app/api/chat/route.test.ts` — add cases mirroring the existing mock-based style (the `streamText` mock returns `{ toolCalls, text, toUIMessageStream }`):
  - When non-email docs are in context, `contextText` is non-empty, and the first pass calls no `fileReference` → a second `streamText` (document fallback) pass is invoked.
  - When the first pass already called `fileReference` → no document fallback pass.
  - When `attachmentDocs` is empty → no document fallback pass.
- Reuse the `retrieveContext` and `streamText` mocks already set up in that file; follow the email-fallback assertions in `src/app/api/chat/route.email-bug.test.ts` as the template.

## Out of scope

- No model upgrade (stays on gpt-4o-mini; fallback gives the reliability without the per-message cost).
- No retrieval/threshold/ingestion changes — confirmed healthy.
- No UI changes — `fileReference` card and Sources footer already render correctly.

## Verification

1. `npm test` — new and existing route + system-prompt tests pass.
2. `npm run dev`, sign in, and ask document-shaped queries that previously returned no cards, e.g.:
   - "what mechanical joint fittings do you offer"
   - "gasket material for wastewater"
   - "ductile iron pipe fitting specifications"
   Confirm 1–2 relevant `fileReference` cards now render inline with a lead-in sentence, and the Sources footer lists the remainder without duplicating the carded docs.
3. Confirm small talk ("thanks", "hello") and out-of-scope questions render **no** document cards.
4. Confirm an explicit email request still produces an `emailDraft` card AND, when relevant, document cards (both fallbacks can fire).
