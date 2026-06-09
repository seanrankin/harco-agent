# UI Redesign — Open TODOs

Snapshot of everything from the redesign that is stubbed, partially wired, or visibly present but not fully functional. Grouped by impact so they can be picked up in any order.

All in-code markers are greppable as `TODO(redesign):`.

---

## 1. Sidebar history list — **stubbed entirely**

**Where:** `src/components/app-shell/sidebar.tsx`

**Current behavior:** The sidebar shows only the brand block, a "New question" button, and a sign-out icon. No history list.

**Why it's stubbed:** Real multi-thread history requires:
1. A Supabase table to persist threads + messages per user
2. A `RemoteThreadListAdapter` implementation that reads/writes that table
3. Swapping `useChatRuntime()` for `useRemoteThreadListRuntime(...)` in `src/app/page.tsx`

The mockup also shows date-bucketed groups ("Today" / "Earlier this week") which the assistant-ui primitive doesn't do natively — we need a thin Compose wrapper around `ThreadListPrimitive.Items` that buckets client-side.

**To do:**
- [ ] Design `threads` and `messages` tables in Supabase (FK to auth.users, RLS by user)
- [ ] Implement a `RemoteThreadListAdapter` against those tables
- [ ] Replace the static sidebar markup with `ThreadListPrimitive.Root` / `New` / `Items` + `ThreadListItemPrimitive.Trigger` / `Title` / `Archive` / `Delete`
- [ ] Add a date-bucket wrapper that splits items into Today / Earlier this week / Earlier
- [ ] Rename `handleNewQuestion` in `page.tsx` to actually create a new thread (currently calls `switchToNewThread()` which works against the single in-memory thread)

---

## 2. "New question" button — works, but degenerate in single-thread mode

**Where:** `src/app/page.tsx` (`handleNewQuestion`)

**Current behavior:** Calls `assistantRuntime.threads.switchToNewThread()`. Because the runtime only knows about one in-memory thread, this effectively resets the conversation.

**Why it's a TODO:** Once the multi-thread runtime is in (see #1), the same call will correctly create a fresh thread, slot it into the sidebar, and switch to it. No code change needed — the line is already correct — but the behavior only becomes complete after #1 lands.

---

## 3. Composer paperclip / attachments — wired but ephemeral

**Where:** `src/app/page.tsx` (`adapters = { attachments: new SimpleImageAttachmentAdapter() }`)

**Current behavior:** The paperclip button in the composer opens a file picker, accepts an image, and shows it as an attachment chip on the user's next message.

**Limit:** `SimpleImageAttachmentAdapter` from assistant-ui holds files in **browser memory only**. Refresh the page → the attachment is gone. Server-side, the attachment payload arrives in the chat route but isn't persisted anywhere.

**To do:**
- [ ] Decide what file types beyond images should be allowed (the mockup mentions drawings, POs, photos — likely PDFs and Office docs too)
- [ ] Add a Supabase Storage bucket for chat attachments (per-user prefix, signed URLs)
- [ ] Replace `SimpleImageAttachmentAdapter` with a custom adapter that uploads to Storage and returns the public/signed URL
- [ ] On the chat route side, pass attachment URLs to the model so it can reference them in responses

---

## 4. Inline `[N]` citations — **frontend-only, works against current data**

**Where:**
- `src/lib/citations/remark-citations.ts` — remark plugin
- `src/components/assistant-ui/markdown-text.tsx` — `a` component override renders the badge
- `src/components/tool-ui/source-attachments.tsx` — emits `id="source-N"` anchors

**Current behavior:** When the model writes `[1]` in prose, the plugin rewrites the text into an anchor that scrolls to the corresponding row in the Sources footer at the bottom of the answer.

**Why it's listed as a TODO anyway:** This is the deliberate frontend-only approach we agreed on. The assistant-ui-canonical approach is for the backend to emit `source` content parts inline alongside text. That's cleaner architecturally and gives free accessibility/dedup, but requires changing `src/app/api/chat/route.ts`. Worth revisiting once the rest of the redesign settles.

**Also:** The model needs to actually emit `[N]` tokens for this to be visible. If the system prompt doesn't instruct it to cite sources inline, the user will only see the Sources footer. Verify the system prompt covers this.

---

## 5. Feedback thumbs (👍 / 👎) — **not built**

**Where:** Not in the codebase. Mentioned in the mockup; explicitly cut from v1 per the plan.

**Why it's cut:** assistant-ui's `FeedbackAdapter` slot needs a backend endpoint to post submissions to. No such endpoint exists.

**To do:**
- [ ] Add a `feedback` table in Supabase (message_id, user_id, vote, free-text reason, created_at)
- [ ] Add a POST route at `src/app/api/feedback/route.ts`
- [ ] Implement a `FeedbackAdapter` that calls that endpoint and register via `RuntimeAdapterProvider`
- [ ] Add `<ThumbsUp />` / `<ThumbsDown />` buttons inside `AssistantActionBar` in `src/components/assistant-ui/thread.tsx`

---

## 6. Document preview pane — **not built**

**Where:** Not in the codebase. Mentioned in the mockup; explicitly cut from v1.

**Why it's cut:** No backend endpoint to fetch document preview content (the body of a PDF page, the relevant DOCX paragraphs, etc.). Without that, the pane has nothing meaningful to show beyond what's already on the FileCard.

**To do (if/when prioritized):**
- [ ] Add an API route that returns extracted page/section content for a given `document_id` + page/anchor
- [ ] Build the slide-in pane component (the mockup's `PreviewPane`)
- [ ] Add a `DocumentPreviewContext` so FileCards and source rows can open it
- [ ] Wire the preview pane into `page.tsx` as a third grid column at ≥1181px (overlay below that)

---

## 7. `lookup_spec` / `check_stock` tool UIs — **stubbed component, no backend**

**Where:** `src/components/tool-ui/spec-table.tsx` (component exists, not registered)

**Current behavior:** A `<SpecTable>` component exists and is correctly styled — but it's not wired to any tool because the backend doesn't define `lookup_spec` or `check_stock` tools. The component exists so the styling lives in one place when those tools land.

**To do:**
- [ ] Define `lookup_spec` and `check_stock` tools in `src/app/api/chat/route.ts` with proper Zod schemas
- [ ] Implement the backend logic for each (RAG over spec sheets / inventory data)
- [ ] Register the corresponding `makeAssistantToolUI` blocks in `src/app/page.tsx`, passing tool args into `<SpecTable>` and a stock-status variant
- [ ] Status pills in stock results (e.g. "IN STOCK" green, "BACKORDER" red) — extend `SpecTable` with an optional status column

---

## 8. Starter suggestion prompts — **hardcoded**

**Where:** `src/components/assistant-ui/thread.tsx` (`STARTER_SUGGESTIONS` array)

**Current behavior:** Four prompts are hardcoded at the top of the file.

**Why it's a TODO:** Long-term these should adapt to context (e.g., user's recent activity, role, or top-asked questions). Stub for now is fine — the mockup uses the same hardcoded set.

**To do (low priority):**
- [ ] Move the array out of `thread.tsx` into a config file
- [ ] Optionally: source via `useThreadRuntime` extras so they can be dynamic

---

## 9. "112 indexed Harco documents" status — **hardcoded**

**Where:** `src/app/login/page.tsx` (`FeaturePanel`, look for `TODO(redesign): pull live count`)

**Current behavior:** The number `112` is a string literal in the JSX.

**To do:**
- [ ] Add a public endpoint (or pull at build time / via ISR) that returns the count of indexed documents from the `document_chunks` table (probably `SELECT COUNT(DISTINCT document_id)`)
- [ ] Wire the value into `FeaturePanel`. Consider showing `~110` or rounded form so the number doesn't get stale-feeling
- [ ] The "synced today" suffix — decide whether to keep static, drop, or compute from `MAX(created_at)`

---

## 10. Email draft card — "Edit" button **intentionally dropped**

**Where:** `src/components/tool-ui/email-draft-card.tsx` (used to have three buttons; now two)

**Current behavior:** Two buttons in the footer: amber "Draft an Email" (opens `mailto:` link) and ghost "Copy" (copies body to clipboard). No "Edit" affordance.

**Why it's a TODO:** The mockup showed an Edit button but it was a no-op toast. We dropped it as a fake affordance. If a real inline edit flow is wanted later:

**To do (if/when prioritized):**
- [ ] Add local state for editable subject/body
- [ ] Toggle button → textarea, regenerate the mailto link from the edited values

---

## 11. Dark mode — **not themed**

**Where:** `src/app/globals.css` (`.dark` block)

**Current behavior:** The dark-mode CSS variables are left as neutral OKLch fallbacks — not mapped to a Harco dark palette.

**Why it's a TODO:** Mockup has no dark mode. Out of v1 scope.

**To do (if/when prioritized):**
- [ ] Design dark variants for the Harco palette (navy, amber, paper)
- [ ] Update `.dark` block in `globals.css` accordingly
- [ ] Add a theme toggle somewhere if user preference matters

---

## 12. Document preview anchor on FileCard hover — **says "Download"**

**Where:** `src/components/tool-ui/file-card.tsx`

**Current behavior:** Hovering a FileCard reveals a "Download" affordance that opens the file via `/api/download`.

**Why mentioning:** The mockup showed a "Preview" affordance because it had a preview pane. Since the preview pane is cut (#6), we ship "Download" instead. If the preview pane returns, change the hover label and route the click through a context handler instead of the download URL.

---

## Quick reference — file → TODO

| File | What's stubbed |
|---|---|
| `src/components/app-shell/sidebar.tsx` | History list entirely (#1) |
| `src/app/page.tsx` | New-question full multi-thread behavior (#2), attachment persistence (#3) |
| `src/components/tool-ui/spec-table.tsx` | Component built, not wired to a tool (#7) |
| `src/components/assistant-ui/thread.tsx` | Hardcoded starter suggestions (#8) |
| `src/app/login/page.tsx` | Hardcoded indexed-doc count (#9) |
| `src/app/globals.css` | Dark mode not themed (#11) |
| (not in code) | Feedback thumbs (#5), preview pane (#6), inline-citation backend (#4), email-draft inline edit (#10) |
