# Fix: Outlook drafts lose line spacing

## Context

The email draft preview card shows correct paragraph spacing, but the same email
arrives in the Outlook compose window as one run-on block with no line breaks.

Root cause: the draft body is **plain text with `\n` newlines**. The preview card
renders it with the CSS `whitespace-pre-wrap` ([email-draft-card.tsx:53](src/components/tool-ui/email-draft-card.tsx:53)),
so newlines display correctly. But when sent to Microsoft Graph, the body is sent as
`contentType: "HTML"` with the raw plain text as the content
([graph-client.ts:18-21](src/lib/outlook/graph-client.ts:18)). HTML collapses runs of
whitespace (including newlines) into a single space, so every paragraph runs together.

`graph-client.createDraftMessage` is correct — its parameter is named `bodyHtml` and it
genuinely expects HTML. The defect is in the **caller**: the send-draft route passes
plain text into that HTML field without converting it.

## Fix

Convert the plain-text body to HTML in the send-draft route before handing it to
`createDraftMessage`. Escape HTML special characters, then convert newlines to `<br>`.
A double newline (`\n\n`) becomes `<br><br>`, reproducing the blank line between
paragraphs that the preview shows.

### Files

1. **New: `src/lib/outlook/plain-text-to-html.ts`**
   Small pure helper:
   - Escape `&`, `<`, `>` (order matters — `&` first).
   - Normalize `\r\n` and `\r` to `\n`.
   - Replace each `\n` with `<br>`.

   Example: `"Dear X,\n\nHello.\n\nBest,"` → `"Dear X,<br><br>Hello.<br><br>Best,"`

2. **`src/app/api/outlook/send-draft/route.ts`**
   Import the helper and apply it at the `createDraftMessage` call
   ([route.ts:83](src/app/api/outlook/send-draft/route.ts:83)):
   `bodyHtml: plainTextToHtml(body)`.

`graph-client.ts` is left unchanged — it correctly sends whatever HTML it's given.

### Tests

3. **New: `src/lib/outlook/plain-text-to-html.test.ts`**
   - Single `\n` → `<br>`.
   - `\n\n` → `<br><br>` (blank-line / paragraph case — the actual bug).
   - HTML special chars escaped (`<`, `>`, `&`).
   - `\r\n` normalized to a single `<br>`.
   - Plain text with no newlines is returned unchanged.

4. **`src/app/api/outlook/send-draft/route.test.ts`** (existing)
   Add/extend a case asserting that a body containing `\n\n` is passed to
   `createDraftMessage` as HTML containing `<br><br>` (reproduces the bug at the route
   level, then passes after the fix).

## Verification

- `npm test -- plain-text-to-html` — new helper unit tests pass.
- `npm test -- send-draft` — route test confirms newlines become `<br>` in the Graph payload.
- Manual: trigger an email draft, click **Send to Outlook**, open the draft in Outlook —
  paragraph spacing now matches the preview card.

## Notes

- Scope is limited strictly to the line-spacing bug. The unrelated in-progress work
  (`detect-email-intent`, the `email-draft-not-triggered` spec) is untouched.
