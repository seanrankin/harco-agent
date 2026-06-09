# Implementation Plan: Proactive Attachments

## Overview

Refactor the chat route to use `createUIMessageStream` so we can write a custom `data-sources` part containing RAG document metadata before merging the LLM stream. Create a deduplication utility and a `SourceAttachments` component registered via `makeAssistantDataUI` to render deduplicated source FileCards below assistant responses.

## Tasks

- [x] 1. Create deduplication utility
  - [x] 1.1 Create `src/lib/deduplicate-sources.ts` with `deduplicateSources` function
    - Export a pure function that accepts `sourceDocuments` array and `toolCallDocumentIds` string array
    - Build a `Set` from lowercased tool-call IDs
    - Filter source documents, excluding any whose lowercased `id` is in the set
    - Export the `SourceDocument` interface for reuse
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]\* 1.2 Write property tests for `deduplicateSources` (Property 3)
    - **Property 3: Deduplication against tool calls**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Create `src/lib/deduplicate-sources.test.ts`
    - Use fast-check to generate arbitrary source document arrays and tool-call ID arrays
    - Assert: output contains exactly those docs whose IDs (case-insensitive) are NOT in tool-call set
    - Assert: output length <= input source length
    - Assert: output preserves order of input sources

- [x] 2. Refactor chat route to use `createUIMessageStream`
  - [x] 2.1 Refactor `src/app/api/chat/route.ts` to emit `data-sources` part
    - Replace `result.toUIMessageStreamResponse()` with `createUIMessageStream` + `createUIMessageStreamResponse`
    - Inside `execute`, write a `data-sources` data part when `contextDocs.length > 0`, containing `{ documents: contextDocs.slice(0, 8) }`
    - Call `streamText` and merge via `writer.merge(result.toUIMessageStream())`
    - Preserve all existing behavior (auth, tools, system prompt)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.3_

  - [ ]\* 2.2 Write property tests for annotation building (Properties 1 & 2)
    - **Property 1: Annotation count equals unique document count (capped at 8)**
    - **Property 2: Annotation data integrity**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5**
    - Add tests in `src/app/api/chat/route.test.ts`
    - Use fast-check to generate arrays of context documents (with potential duplicates)
    - Assert: emitted annotation document count == min(unique IDs, 8)
    - Assert: each emitted document retains all four fields unchanged

  - [ ]\* 2.3 Write unit tests for route stream behavior
    - Add example-based tests in `src/app/api/chat/route.test.ts`
    - Test: `data-sources` part is emitted when documents exist
    - Test: no `data-sources` part when RAG returns empty array
    - Test: `fileReference` tool remains in tool definitions
    - _Requirements: 1.1, 1.2, 5.1_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create SourceAttachments component and register data UI
  - [x] 4.1 Create `src/components/tool-ui/source-attachments.tsx`
    - Use `makeAssistantDataUI` to register a renderer for the `data-sources` type
    - Import `useMessage` from `@assistant-ui/react` to access message parts for tool-call deduplication
    - Extract `fileReference` tool-call document IDs from the message parts
    - Call `deduplicateSources` to compute the final list
    - Render a "Sources" label (text-xs, text-muted-foreground) above FileCards when list is non-empty
    - Render a `FileCard` for each remaining source document
    - Return `null` when deduplicated list is empty or data is malformed
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

  - [x] 4.2 Register `SourceAttachmentsDataUI` in `src/app/page.tsx`
    - Import the component from `@/components/tool-ui/source-attachments`
    - Add `<SourceAttachmentsDataUI />` inside `AssistantRuntimeProvider` alongside existing tool UIs
    - _Requirements: 2.1, 5.4_

  - [ ]\* 4.3 Write unit tests for SourceAttachments component
    - Test: renders FileCards with correct props when sources exist
    - Test: renders "Sources" label when sources exist
    - Test: renders nothing when documents array is empty
    - Test: renders nothing when all sources are deduplicated by tool calls
    - Test: handles malformed data gracefully (returns null)
    - _Requirements: 2.1, 2.4, 4.1, 4.2_

  - [ ]\* 4.4 Write property test for conditional label rendering (Property 4)
    - **Property 4: Sources label conditional rendering**
    - **Validates: Requirements 4.1, 4.2**
    - Assert: label present iff deduplicated source list is non-empty

- [x] 5. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The deduplication utility is a pure function, making it straightforward to test with fast-check
- `makeAssistantDataUI` is the assistant-ui pattern for rendering custom data parts (analogous to `makeAssistantToolUI` for tool calls)
- Existing `fileReference` tool behavior is preserved; no changes to the tool definition or its rendering

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4"] }
  ]
}
```
