# Performance Improvements

Initial observation: chat interface page transfers 2.7MB / 12MB of resources with cache disabled. Plenty of low-hanging fruit. The biggest single thing is that the assistant-ui devtools are shipping to production. After that, code-splitting heavy client-only pieces and a few Next config tweaks will get most of the way.

## Highest-impact, specific to this app

1. **Drop `DevToolsModal` from prod.** `src/app/page.tsx:10,62` imports `@assistant-ui/react-devtools` unconditionally. Gate it on dev:

   ```tsx
   const DevToolsModal = process.env.NODE_ENV === "development"
     ? (await import("@assistant-ui/react-devtools")).DevToolsModal
     : () => null;
   ```

   Or render it only when `process.env.NODE_ENV !== "production"`. Easy several-hundred-KB win.

2. **Make the whole chat page not be one giant client bundle.** `page.tsx` is `"use client"` at the top, which means everything it imports (Sidebar, Thread, tool UIs, markdown, syntax highlighter, etc.) goes into the initial client chunk. Two patterns:

   - Make `page.tsx` a server component, and push `"use client"` down into a small `<ChatClient />` wrapper.
   - `next/dynamic` the heavy bits that aren't needed for first paint:

     ```tsx
     const Thread = dynamic(() => import("@/components/assistant-ui/thread").then(m => m.Thread), { ssr: false });
     const EmailDraftCard = dynamic(...);
     const FileCard = dynamic(...);
     ```

     The tool UIs (`EmailDraftCard`, `FileCard`, `SourceAttachments`) only render mid-conversation — perfect lazy-load candidates.

3. **Lazy-load markdown rendering.** `markdown-text.tsx` pulls in `@assistant-ui/react-markdown`, `remark-gfm`, and likely a syntax highlighter via the CSS. Dynamic-import it from `Thread`:

   ```tsx
   const MarkdownText = dynamic(() => import("./markdown-text").then(m => m.MarkdownText));
   ```

   It's only needed once assistant messages start streaming.

4. **`SimpleImageAttachmentAdapter`** — if image uploads aren't being used yet, drop the adapter. It pulls in image handling code.

## Next.js config wins

5. Add to `next.config.ts`:

   ```ts
   experimental: {
     optimizePackageImports: ["lucide-react", "@assistant-ui/react", "radix-ui", "@base-ui/react"],
   },
   ```

   This tree-shakes barrel imports — big effect on lucide and radix.

6. **Bundle analyzer.** Add `@next/bundle-analyzer` so you can see what's actually in the 2.7MB. Without it you're guessing:

   ```bash
   npm i -D @next/bundle-analyzer
   ANALYZE=true npm run build
   ```

## General hygiene

7. **Fonts** — check `app/layout.tsx` uses `next/font` (self-hosted, no extra request).
8. **Images** — use `next/image` for anything in `public/`, with explicit width/height.
9. **Avatars / `diamond.tsx`** — if SVGs are inlined as React components, that's fine; if imported as files, make sure they're optimized.
10. **Check for duplicate UI libs.** `radix-ui`, `@base-ui/react`, `@assistant-ui/react`, and shadcn may overlap and pull redundant code. Worth auditing.

## Recommended order

1. Gate `DevToolsModal` on dev (5 min, big win).
2. Add `optimizePackageImports` (2 min, free win).
3. Install bundle analyzer and look at the actual treemap — then decide whether the lazy-loading work is worth it. Often after #1 and #2 the numbers drop enough that the rest is optional.
