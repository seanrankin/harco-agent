# Implementation Plan: Performance Improvements

## Overview

Reduce the Harco Agent chat page bundle from 2.7 MB transferred down to under 1.9 MB through code-splitting, lazy loading, dead code removal, and build configuration. Changes are incremental: each task produces a buildable, runnable app before proceeding to the next.

## Tasks

- [x] 1. Gate DevToolsModal and remove SimpleImageAttachmentAdapter
  - [x] 1.1 Create `src/components/chat-client.tsx` with runtime provider, conditional DevTools, and no SimpleImageAttachmentAdapter
    - Extract all client logic from `src/app/page.tsx` into a new `ChatClient` component
    - Gate DevToolsModal on `process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SHOW_DEVTOOLSMODAL === "true"` using a conditional dynamic import
    - Remove `SimpleImageAttachmentAdapter` usage; call `useChatRuntime()` without an attachments adapter
    - Remove the paperclip/attachment affordance if one renders without a handler
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4_

  - [x] 1.2 Convert `src/app/page.tsx` to a server component
    - Remove `"use client"` directive
    - Remove all imports except `dynamic` from `next/dynamic`
    - Dynamically import `ChatClient` with `ssr: false`
    - Verify the page renders in the browser without errors
    - _Requirements: 2.1_

  - [x] 1.3 Write unit tests for DevToolsModal gating and adapter removal
    - Test that DevToolsModal renders when both env vars are set correctly
    - Test that DevToolsModal returns null when NODE_ENV is production
    - Test that DevToolsModal returns null when SHOW_DEVTOOLSMODAL is unset or not "true"
    - Test that ChatClient mounts without SimpleImageAttachmentAdapter without throwing
    - _Requirements: 1.1, 1.2, 1.3, 4.2, 4.3_

- [x] 2. Code-split Tool UI components
  - [x] 2.1 Dynamically import Tool UI components in `chat-client.tsx`
    - Import `FileCard`, `EmailDraftCard`, and `SourceAttachmentsDataUI` via `next/dynamic` with `ssr: false`
    - Add skeleton loading placeholders for each
    - Wire the dynamic components into `makeAssistantToolUI` calls
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 2.2 Add error boundary handling for Tool UI chunk failures
    - Wrap each dynamic Tool UI in an error boundary or use `next/dynamic`'s error handling
    - Render an inline error indicator on chunk load failure without crashing the thread
    - _Requirements: 2.5_

  - [x] 2.3 Write unit tests for Tool UI loading states
    - Test that skeleton placeholders render while chunks are loading
    - Test that error indicator renders when a chunk fails to load
    - _Requirements: 2.3, 2.5_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Lazy-load Markdown rendering
  - [x] 4.1 Dynamically import `MarkdownText` in `thread.tsx`
    - Replace the static import of `MarkdownText` with `next/dynamic`
    - Add a `MarkdownSkeleton` loading component (animated placeholder)
    - Ensure the cached module is reused for subsequent messages (default dynamic behavior)
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_

  - [x] 4.2 Add retry logic for Markdown chunk load failure
    - Implement a wrapper that retries the dynamic import once on failure
    - Display "Message rendering unavailable" if retry also fails
    - _Requirements: 3.3_

  - [x] 4.3 Write unit tests for Markdown lazy loading
    - Test that MarkdownSkeleton renders during chunk load
    - Test that error message renders after retry failure
    - _Requirements: 3.2, 3.3_

- [x] 5. Optimize Next.js configuration
  - [x] 5.1 Add `optimizePackageImports` to `next.config.ts`
    - Add `experimental.optimizePackageImports` array with `lucide-react`, `@assistant-ui/react`, `radix-ui`, `@base-ui/react`
    - Verify `npm run build` passes without errors
    - _Requirements: 5.1, 5.2_

  - [x] 5.2 Add `@next/bundle-analyzer` integration
    - Install `@next/bundle-analyzer` as a dev dependency
    - Wrap the Next.js config with the analyzer plugin, gated on `ANALYZE=true`
    - Verify standard build still works without `ANALYZE` set
    - Verify `ANALYZE=true npm run build` produces treemap output
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Replace raw `<img>` tags with `next/image`
  - [x] 6.1 Audit and convert public asset images to `next/image`
    - Search all components for `<img>` tags referencing `/public/` assets
    - Replace with `next/image` using explicit `width` and `height`
    - Leave SVGs inlined as React components unchanged (e.g., `diamond.tsx`)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7. Audit and document UI library usage
  - [x] 7.1 Create `doc/ui-library-mapping.md` documenting primitive ownership
    - List every UI primitive in use (Button, Tooltip, Dialog, Avatar, Collapsible, etc.)
    - Map each to the single library that provides it (radix-ui, @base-ui/react, @assistant-ui/react, or shadcn)
    - Identify any overlaps where two libraries provide the same primitive
    - _Requirements: 8.1_

  - [x] 7.2 Consolidate duplicate primitives to a single source
    - For each overlap identified in the mapping, choose one library and update all imports
    - Remove unused library equivalents from consuming files
    - Verify no source file imports the same primitive category from multiple UI libraries
    - _Requirements: 8.2, 8.3, 8.4_

- [x] 8. Build verification and final checkpoint
  - [x] 8.1 Create `scripts/verify-bundle.sh` build verification script
    - Assert `npm run build` exits 0
    - Grep `.next/static/` for `react-devtools` and assert zero matches
    - Record baseline bundle size for future regression checks
    - _Requirements: 1.5, 5.2, 5.3_

  - [x] 8.2 Write integration test verifying no devtools in production build
    - Run build, scan output chunks for `@assistant-ui/react-devtools` references
    - Assert bundle size is at least 30% smaller than the pre-optimization baseline (2.7 MB)
    - _Requirements: 1.4, 1.5, 2.6_

  - [x] 8.3 Final checkpoint
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- No property-based tests for this feature (build/config work, not pure logic)
- Unit tests validate component behavior; build verification validates bundle output
- The bundle analyzer (`ANALYZE=true npm run build`) provides ongoing visibility into chunk composition

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "4.1", "5.1"] },
    { "id": 3, "tasks": ["2.2", "4.2", "5.2", "6.1"] },
    { "id": 4, "tasks": ["2.3", "4.3", "7.1"] },
    { "id": 5, "tasks": ["7.2"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["8.2"] }
  ]
}
```
