# Harco UI Redesign — Implementation Plan

> **Final destination:** First step of execution will save this plan to `doc/ui-redesign/plan.md`. Plan mode only permits editing this file, so it lives here until ExitPlanMode is approved.

## Context

The Harco Knowledge Base chat app is functional but ships with default shadcn neutral styling. The user produced a high-fidelity HTML/JSX mockup at `/Users/sean/Downloads/Harco Fittings Redesign/` with a companion "assistant-ui mapping" doc that resolves every visual region to a concrete primitive, Tool UI, or app-level shell. The job is to land the mockup's look and structure on top of the existing assistant-ui setup — prefer library primitives, fall back to Tailwind, and stub anything that would require a backend or DB change.

Outcome: brand-correct chat experience at desktop / tablet / mobile breakpoints, with TODOs marking where future work (persistence, feedback, preview) plugs in. No new tools wired, no schema changes, no fake-data dead code.

## Stack & conventions confirmed

- Next.js 16 App Router · React 19 · Tailwind v4 (CSS-config via `@theme` in `globals.css`)
- `@assistant-ui/react` v0.14.15, `@assistant-ui/react-ai-sdk` v1.3.33 — runtime via `useChatRuntime()`
- shadcn/ui + base-ui · CVA · `cn()` for class merge
- `lucide-react` v1.17 already installed — **reuse it**, no new icon library
- Fonts currently Geist via `next/font/google` — will be replaced with Inter Tight / Source Serif 4 / JetBrains Mono

## Scope decisions (consolidated from clarification round)

**IN:**
1. Brand tokens + fonts (whole-app visual change)
2. App shell: sidebar + main only — **no topbar**, **no preview pane**
3. Sidebar contents: brand block, "New question" button, sign-out icon button in footer (no avatar, no email, no history list)
4. Floating hamburger button top-left over the thread on ≤860px (only visible while sidebar drawer is closed)
5. Restyled empty state with Harco diamond, suggestion grid, copy
6. Restyled composer with grounding-note caption and disclaimer
7. Restyled message chrome: user bubble, assistant message, edit composer, branch picker
8. "Searching docs…" running indicator (replaces current `●` pulse)
9. Tool-UI restyles: `FileCard`, `EmailDraftCard` (drop the Edit button), `SourceAttachments`
10. **Wire `SimpleImageAttachmentAdapter`** so the composer paperclip actually attaches images. Files live in browser memory only (no Supabase Storage upload) — acceptable for v1, document the limit.
11. **Inline `[n]` citation badges via a custom remark plugin** that reads the existing `data-sources` event and rewrites `[n]` text tokens into clickable badges. Frontend-only; no API contract change.

**OUT (deferred with no code stubs):**
- Document preview pane (FileCard download covers the workflow; revisit when a preview-content endpoint exists)
- Multi-thread history list (needs `useRemoteThreadListRuntime` + Supabase persistence)
- Feedback thumbs (no backend; would ship a fake affordance)
- User identity in the UI (avatar / email / name — none of it)
- Topbar entirely (brand lives in the sidebar; sign-out lives in the sidebar footer)
- `lookup_spec` / `check_stock` tool UIs (no backend tools to render)
- Dark mode (leave existing `.dark` vars alone, don't theme them)

## Files to change

### Login page (new in this scope)
- **`src/app/login/page.tsx`** — Visual rewrite, preserve all existing logic (supabase `signInWithOtp` call, `isEmailAllowed` check, status state machine, error messaging). Three states all live in one component, swapped by `status`:
  - **Idle / error state** — Brand header (Diamond + "Harco Fittings" serif title + "KNOWLEDGE BASE" mono eyebrow), mono uppercase pre-headline ("HARCO SALES TEAM · SECURE ACCESS"), serif `<h1>` "Sign in to the Assistant", description paragraph, "WORK EMAIL" mono label, email input, lock-icon hint ("Access is limited to @harcofittings.com addresses."), amber primary button "Email me a sign-in link →", footer fine print about expiry + acceptable-use.
  - **Sent state** — Same brand header, light-blue rounded-square mail icon, "LINK SENT" mono uppercase, serif `<h1>` "Check your email", supporting copy, the submitted email rendered in a dashed-border mono pill, expiry copy, outline "Resend link" button (re-submits the OTP), ghost "← Use a different email" link (resets `status` to `idle`).
  - **Error state** — Inline error message under the email field (existing pattern), keep idle layout otherwise.
- **Responsive layout** (driven by the same component, no separate desktop file):
  - **≤520px (phone)** — Plain centered single column, no card chrome, no navy panel. Brand at top, form below.
  - **521–1180px (tablet)** — Single centered card with a navy header band containing the brand block plus "THE SALES TEAM'S ANSWER DESK" eyebrow and a one-line value-prop sentence. White card body holds the form. Mono footer "© Harco Fittings · Lynchburg, VA · For authorized Harco personnel only".
  - **≥1181px (desktop)** — Two-column split-pane (50/50). Left: white panel with the form (same content as the tablet card body). Right: navy panel with the brand block, large serif headline "Every spec, submittal, and stock check — one question away.", supporting paragraph, a small product-card preview (Diamond-marked HSDR-1212-MJ tile), three amber-diamond bullets, and a "Grounded in 112 indexed Harco documents · synced today" status line. Hardcoded for v1 (TODO: read count from DB).
- **`src/app/login/layout.tsx`** (new, if needed) — Removes any top-level chrome inherited from the root layout so the login route can fill the viewport without a topbar leaking through. Likely not needed since root layout is already minimal — verify before creating.
- **Reuses**: `<Diamond>` brand mark (built in step 2), the same Tailwind tokens, `lucide-react` icons (`Lock`, `Mail`, `RefreshCw`, `ArrowLeft`, `ArrowRight`).

> User will share an HTML mockup of the login flow shortly. It uses the same color tokens and fonts already specified — when it arrives, verify spacing/wording against this section before implementation.

### Theming & fonts
- **`src/app/globals.css`** — Replace `:root` OKLch values with Harco hex tokens, mapping to shadcn semantic names so existing components inherit the brand:
  - `--background` ← `#FAFAF7` (paper)
  - `--card` / `--popover` ← `#FFFFFF`
  - `--foreground` ← `#3A4651` (steel)
  - `--primary` ← `#0B3D5C` (navy) · `--primary-foreground` ← `#FFFFFF`
  - `--accent` ← `#E8A630` (amber) · `--accent-foreground` ← navy
  - `--muted-foreground` ← `#8A95A0`
  - `--border` ← `#DCE1E5`
  - `--ring` ← `#1E6F9F` (spec-blue)
  - `--destructive` ← `#B4472F` (pdf red, doubles as error)
  - Add raw tokens for file-type colors: `--color-pdf` `#B4472F`, `--color-docx` `#1E6F9F`, `--color-xlsx` `#3E7D55`, `--color-spec-blue` `#1E6F9F`, `--color-navy-2` `#0a3450`
  - Update `@theme inline` block: `--font-sans` → Inter Tight, `--font-mono` → JetBrains Mono, **add** `--font-serif` → Source Serif 4
- **`src/app/layout.tsx`** — Swap Geist for `Inter_Tight`, `Source_Serif_4`, `JetBrains_Mono` via `next/font/google`; expose `--font-sans`, `--font-serif`, `--font-mono` CSS variables on `<html>`.

### App shell (new)
- **`src/components/brand/diamond.tsx`** — Harco diamond SVG (lifted from `harco-app-aui.jsx` Diamond component). Sized prop, used in empty state, sidebar brand, bot avatar.
- **`src/components/app-shell/sidebar.tsx`** — `<Sidebar>` containing brand block + "New question" button + sign-out icon button (LogOut from lucide) in the footer. No history list. Drawer at ≤860px controlled by `navOpen` state in `page.tsx`. `// TODO(redesign): replace with ThreadListPrimitive + useRemoteThreadListRuntime once persistence exists.`
- **`src/components/app-shell/mobile-menu-button.tsx`** — Floating hamburger top-left, `@media (max-width: 860px)` only, hidden when `navOpen`.

### Page composition
- **`src/app/page.tsx`** — Rewrite as a two-column layout (sidebar fixed-width + main fills). Manage `navOpen` state for drawer. Remove existing inline `SignOutButton` (moves to sidebar footer). Keep `AssistantRuntimeProvider`, the two `*ToolUI` registrations, and `SourceAttachmentsDataUI` exactly as they are. Register `SimpleImageAttachmentAdapter` on the runtime via the `useChatRuntime` adapters config.

### Citations (new remark plugin)
- **`src/lib/citations/remark-citations.ts`** — Remark plugin that walks the mdast tree, finds text nodes containing `[1]` / `[2]` etc., splits them, and emits a custom MDX-style node consumed by a `<Citation>` React component. The plugin needs the source list in scope; pass it via plugin options.
- **`src/components/assistant-ui/citation.tsx`** — `<Citation index={n} />` renders the spec-blue rounded badge from the mockup. Click target: scroll to the corresponding entry in the Sources footer (use anchor + smooth scroll; no new state).
- **`src/components/assistant-ui/markdown-text.tsx`** — Wire the new plugin into the remark plugins list. The plugin needs runtime access to the current message's `data-sources` payload — read it from the assistant-ui message state via a hook, pass into the plugin factory at render time.

### Thread (restyle in place)
- **`src/components/assistant-ui/thread.tsx`** — touch points only, do not restructure primitives:
  - `ThreadWelcome` — replace "Hello there!" with `<Diamond size={72}/>`, serif `<h1>Ask the Harco library.</h1>`, supporting paragraph, 2-col suggestion grid (already uses `SuggestionPrimitive.Trigger send`). Update suggestion text to the four Harco prompts from `harco-app-aui.jsx`.
  - `Composer` — placeholder "Ask about a fitting, spec, stock, or draft an email…"; add grounding-note caption inside the composer footer; add the disclaimer line ("Harco Assistant can be wrong…") under the composer. `ComposerAddAttachment` stays visible — adapter is wired in `page.tsx`.
  - `AssistantMessage` `groupedParts` switch — `case "indicator"` renders a small mono-uppercase "Searching docs…" pill instead of `●`.
  - `AssistantActionBar` — Copy + Reload + More (keep existing Export). **Do NOT add feedback thumbs.**
  - `EditComposer` — restyle to the navy-bordered inline edit box from the mockup (`.edit-box`); keep primitive structure.
  - `BranchPicker` — already structurally correct; restyle text/icon size to mockup.
  - `UserMessage` bubble — change to `bg-primary text-primary-foreground` with the asymmetric `rounded-2xl rounded-br-sm` corner from the mockup.

### Tool UIs (restyle existing)
- **`src/components/tool-ui/file-card.tsx`** — Match `.doc-card`: 42×50 colored corner-fold icon by extension (PDF/DOCX/XLSX colors from new tokens), navy title, mono metadata line, hover border state, "Download" affordance on hover.
- **`src/components/tool-ui/email-draft-card.tsx`** — Match `.email-card`: mono header label with envelope icon, To/Subject field rows with mono labels, pre-wrap body, attached source-file row (mini FileCard-style chip), **two** buttons in the footer: amber primary "Draft an Email" (existing mailto behavior) and ghost "Copy" (copies body to clipboard). **Edit button dropped.**
- **`src/components/tool-ui/source-attachments.tsx`** — Match `.sources`: mono uppercase "Sources · grounded in N documents" header, numbered `[n]` badge per item, navy title, mono metadata. **Preserve dedup logic** against `fileReference` tool calls. Each source row needs an `id={\`source-${n}\`}` anchor so the `<Citation>` badges in the prose can scroll to it.

### Tabular data (spec-table aesthetic)
The mockup defines a single visual language for all tabular data — used in the seeded "spec table" tool result and in the stock/availability table. The LLM will also emit GFM markdown tables in its responses (already wired through `remark-gfm` in `markdown-text.tsx`). All three sources must render the same way.

- **`src/components/assistant-ui/markdown-text.tsx`** — Restyle the existing `table` / `thead` / `th` / `tbody` / `tr` / `td` component overrides (lines ~180–215) to match the mockup `.spec-table` / `.spec-row` pattern:
  - `<table>` — rounded `border border-border rounded-[10px] overflow-hidden bg-card my-2` container; switch from `border-separate` to `border-collapse` so the rounded corners crop cleanly.
  - `<thead> <th>` — muted key-cell look from `.spec-row .k`: `bg-muted/50 text-muted-foreground font-mono text-xs uppercase tracking-wider px-3.5 py-2.5 text-start border-b border-border` (first/last `<th>` get the right border-bottom radius via the parent's overflow-hidden).
  - `<tbody> <td>` — value-cell look from `.spec-row .v`: `text-primary font-mono text-xs font-medium px-3.5 py-2.5 text-start`.
  - `<tr>` — `border-b border-border/60 last:border-b-0`.
  - Drop the per-cell `border-s` `border-e` rules currently there — the rounded outer container handles framing, internal verticals add noise.
- **Stub `SpecTable` component for future structured tool results** — `src/components/tool-ui/spec-table.tsx` exporting a small `<SpecTable rows={[[key, value], ...]} />` component using the same Tailwind classes. **Not wired** to a tool yet (no `lookup_spec` tool exists in `route.ts`). Marked `// TODO(redesign): register as makeAssistantToolUI({ toolName: "lookup_spec" }) once the backend tool exists.` Provides a single source of truth for the styling so when the tool lands, only the wiring changes.
- **Status pills inside tables** (e.g., "IN STOCK" green, "BACKORDER" red from the mockup stock table) — reuse `--color-xlsx` / `--color-pdf` tokens via Tailwind arbitrary-value classes when the SpecTable variant for status data is built. Out of v1 scope but noted so the token naming holds up.

## Reusable utilities already present (don't duplicate)
- `cn()` at `src/lib/utils.ts`
- `TooltipIconButton` at `src/components/assistant-ui/tooltip-icon-button.tsx` — use for all icon-only actions (hamburger, sidebar sign-out)
- `Button` at `src/components/ui/button.tsx` (CVA variants)
- `MarkdownText` at `src/components/assistant-ui/markdown-text.tsx`
- `SourceAttachmentsDataUI` dedup logic at `src/components/tool-ui/source-attachments.tsx` — preserve

## Build order (each step leaves the app runnable)

1. **Tokens + fonts** (`globals.css`, `layout.tsx`) — visual change everywhere, nothing breaks.
2. **Brand mark** (`brand/diamond.tsx`) — new file, no consumers yet.
3. **Thread restyle** (`thread.tsx`) — empty state, composer copy, indicator, edit composer, user bubble.
4. **Tool UI restyles** (three files in `tool-ui/`) + table styling in `markdown-text.tsx` + stub `tool-ui/spec-table.tsx` — visual only.
5. **Citation plugin + component** (`lib/citations/remark-citations.ts`, `assistant-ui/citation.tsx`, wire into `markdown-text.tsx`) — uses existing `data-sources` event, no API change.
6. **Sidebar + mobile menu button** (`app-shell/sidebar.tsx`, `app-shell/mobile-menu-button.tsx`) — new files.
7. **Page composition** (`page.tsx`) — wire sidebar drawer, register `SimpleImageAttachmentAdapter`, remove inline sign-out. Last because it depends on 6.
8. **Login page rewrite** (`src/app/login/page.tsx`) — visual rewrite with all three states (idle / sent / error), three breakpoint layouts (phone / tablet card / desktop split). Logic untouched. Can land in parallel with steps 3–7 since it shares no files.

## Verification

- `npm run dev`, log in, exercise an existing seeded conversation.
- Browser devtools resize at: ≥1181px desktop · 861–1180px tablet landscape · ≤860px (sidebar drawer + floating hamburger) · ≤520px phone.
- Manually confirm at each breakpoint: sidebar shows/drawers correctly · floating hamburger appears/disappears at the right breakpoint and hides when sidebar is open · suggestion grid 2-col → 1-col · composer + disclaimer render · file card + email card + sources footer match mockup spacing within ~4px.
- Citations: send a query, confirm the response renders `[1]` `[2]` as clickable spec-blue badges that scroll to the right source row.
- Tables: prompt the assistant for a comparison table (e.g., "compare HSDR-1212-MJ and HSDR-1010-MJ specs in a table"). Confirm the rendered markdown table has the spec-table look — rounded outer border, muted mono uppercase header row, navy mono body cells, no internal vertical lines.
- Attachments: click the paperclip, attach an image, send a message, confirm it shows in the user message bubble.
- Edit flow: hover a user message, click pencil, edit, send — branch picker appears.
- Login page: visit `/login` at each breakpoint. Confirm idle layout matches mockup. Submit a valid `@harcofittings.com` email → "Check your email" sent state renders. Click "Resend link" — re-submits successfully. Click "← Use a different email" — returns to idle. Submit an invalid domain — error message renders inline.
- Run `npm run lint` and `npm run build` — no new TS or lint errors.
- No automated UI tests exist for the chat view; this is by-hand verification.

### Documentation
- **`README.md`** — Add a "Styling & UI conventions" section after the existing "Project Structure" block. Cover:
  - **Design tokens live in `globals.css`** under `:root` and are aliased to shadcn semantic names (`--primary`, `--accent`, etc.) so all shadcn/ui components inherit brand automatically. Never hardcode hex values in components — reference tokens via Tailwind utilities (`bg-primary`, `text-accent-foreground`).
  - **Fonts**: Inter Tight (sans), Source Serif 4 (serif — used for display headings only), JetBrains Mono (mono — used for labels/metadata only). Loaded via `next/font/google` in `layout.tsx`; reference via `font-sans` / `font-serif` / `font-mono` Tailwind utilities.
  - **Assistant-ui primitives first.** When restyling chat UI, look for an existing primitive (`ThreadPrimitive`, `ComposerPrimitive`, `ActionBarPrimitive`, `BranchPickerPrimitive`, `SuggestionPrimitive`, `MessagePrimitive`) before reaching for custom components. Use the `render` prop to swap in shadcn `<Button>` or `<TooltipIconButton>`; layer Tailwind classes for spacing/colors. The `aui-*` classnames are internal library style hooks — don't remove them, add Tailwind classes alongside.
  - **Tool UIs** are registered in `page.tsx` via `makeAssistantToolUI({ toolName, render })` and live in `src/components/tool-ui/`. The component receives `args` directly from the backend tool call; keep render functions pure with no side effects.
  - **Responsive breakpoints**: ≥1181px desktop · 861–1180px tablet landscape · ≤860px sidebar becomes drawer · ≤520px phone. Use Tailwind's default screen sizes (`md:`, `lg:`) — don't introduce custom breakpoints unless absolutely necessary.
  - **Icons**: only `lucide-react`. Don't add a second icon library.
  - **File organization**: `src/components/app-shell/` for shell pieces (sidebar, mobile menu), `src/components/brand/` for brand marks, `src/components/assistant-ui/` for primitive wrappers, `src/components/tool-ui/` for tool renderers, `src/components/ui/` for shadcn primitives.
  - **Greppable TODOs**: `TODO(redesign):` flags deferred work tied to this redesign (persistence, attachment storage, etc.).

## Explicit TODOs left in code (greppable as `TODO(redesign):`)
- `sidebar.tsx` — replace with `ThreadListPrimitive` + `useRemoteThreadListRuntime` once a thread-persistence backend exists.
- `sidebar.tsx` — "New question" button: wire `useThreadRuntime().switchToNewThread()` once multi-thread runtime is in.
- `page.tsx` — `SimpleImageAttachmentAdapter` stores files in browser memory only; replace with a Supabase Storage adapter for persistence across reloads.

## Risks / things to watch

- **Inter Tight ⇆ Geist swap may shift layout** — both are tight humanist sans but x-height differs. After step 1, eyeball composer/message line heights and bump leading if necessary.
- **shadcn primary token is used by every button variant.** Mapping `--primary` → navy means default buttons go navy-on-white everywhere — matches the design's Send button and sidebar CTA. The amber "Draft an Email" CTA in `EmailDraftCard` must explicitly use `bg-accent text-accent-foreground` (not the default `bg-primary`) or it'll go navy.
- **`aui-*` classnames in `thread.tsx`** are assistant-ui's internal style hooks. Don't remove them — they're targeted by the lib's own optional stylesheet. Restyle by adding Tailwind utility classes alongside, not by replacing.
- **Remark plugin needs the data-sources payload at render time.** The cleanest seam is to factory the plugin per-message inside `MarkdownText` using a hook that reads the current message's data parts. Verify assistant-ui exposes that — if not, fall back to reading from a context the `SourceAttachmentsDataUI` populates.
