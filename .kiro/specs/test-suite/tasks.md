# Implementation Plan: Test Suite

## Overview

Set up Vitest with fast-check for the harco-agent project. Extract `isEmailAllowed` into a testable module, then write property-based tests for email gating and RAG shaping, and example-based tests for API route guards. Tasks are ordered so infrastructure comes first, extraction second, and tests build on both.

## Tasks

- [x] 1. Set up test infrastructure
  - [x] 1.1 Install test dependencies and configure Vitest
    - Run `npm install -D vitest fast-check`
    - Create `vitest.config.ts` at project root with `node` environment, path alias `@` → `./src`, and include pattern `src/**/*.test.ts`, `src/**/*.test.tsx`
    - Add `"test": "vitest run"` script to `package.json`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Extract email utility module
  - [x] 2.1 Extract `isEmailAllowed` into `src/lib/email.ts`
    - Create `src/lib/email.ts` exporting the `isEmailAllowed` function (copy logic from `src/app/login/page.tsx`)
    - Update `src/app/login/page.tsx` to import `isEmailAllowed` from `@/lib/email` and remove the inline definition
    - Verify the login page still compiles correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Write email gating tests
  - [x] 3.1 Write property-based tests for `isEmailAllowed` (`src/lib/email.test.ts`)
    - Mock `process.env.NEXT_PUBLIC_ALLOWED_EMAILS` using `vi.stubEnv()` in setup/teardown
    - Implement property tests using `fc.assert(fc.property(...))` pattern
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x]\* 3.2 Write property test: allowed domain acceptance is case-insensitive
    - **Property 1: Allowed domain acceptance is case-insensitive**
    - Generate emails with arbitrary local parts and any casing of `harcofittings.com` domain
    - Assert `isEmailAllowed` returns `true` for all generated inputs
    - **Validates: Requirements 2.1, 2.4**

  - [x]\* 3.3 Write property test: non-allowed emails are rejected
    - **Property 2: Non-allowed emails are rejected**
    - Generate emails whose lowercased domain is not `harcofittings.com` and not in the allowlist, plus strings without `@`
    - Assert `isEmailAllowed` returns `false` for all generated inputs
    - **Validates: Requirements 2.2, 2.5, 2.6**

  - [x]\* 3.4 Write property test: allowlist override accepts regardless of domain
    - **Property 3: Allowlist override accepts regardless of domain**
    - Set `NEXT_PUBLIC_ALLOWED_EMAILS` to a generated list, then test that any email in that list returns `true`
    - **Validates: Requirements 2.3**

- [x] 4. Checkpoint - Verify email tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Write RAG context retrieval tests
  - [x] 5.1 Write property-based and example tests for `retrieveContext` (`src/lib/rag.test.ts`)
    - Mock `@/lib/supabase/server` (`createServiceClient`) and `ai` (`embed`) at module level
    - Configure mock to return controlled chunk arrays for property tests
    - Include example test for empty/error case returning `{ contextText: "", documents: [] }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x]\* 5.2 Write property test: document deduplication by ID
    - **Property 4: Document deduplication by ID**
    - Generate arrays of chunks with overlapping `document_id` values
    - Assert `documents` output contains exactly one entry per unique `document_id` with values from the first occurrence
    - **Validates: Requirements 3.1**

  - [x]\* 5.3 Write property test: context text concatenation
    - **Property 5: Context text concatenation**
    - Generate non-empty arrays of chunks with arbitrary `content` strings
    - Assert `contextText` equals contents joined by `"\n\n---\n\n"`
    - **Validates: Requirements 3.2**

  - [x]\* 5.4 Write property test: document field mapping correctness
    - **Property 6: Document field mapping correctness**
    - Generate chunks with unique `document_id` values
    - Assert each document in output has `id`, `title`, `file_type`, `file_size_bytes` mapped correctly from the chunk
    - **Validates: Requirements 3.4**

- [x] 6. Checkpoint - Verify RAG tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Write API route guard tests
  - [x] 7.1 Write example-based tests for chat route auth guard (`src/app/api/chat/route.test.ts`)
    - Mock `@/lib/supabase/server` and `ai` (`streamText`) at module level
    - Test: auth error returns 401 "Unauthorized" without invoking streaming
    - Test: null user returns 401 "Unauthorized" without invoking streaming
    - Test: valid user invokes streaming and returns non-401 response
    - Test: unauthorized request does not parse body or call `retrieveContext`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.2 Write example-based tests for download route validation (`src/app/api/download/route.test.ts`)
    - Mock `@/lib/supabase/server` at module level
    - Test: auth error returns 401 "Unauthorized"
    - Test: missing `document_id` returns 400 "Missing document_id parameter"
    - Test: document not found returns 404 "Document not found"
    - Test: successful lookup + signed URL returns 307 redirect
    - Test: signed URL generation failure returns 500 "Failed to generate download URL"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Example-based tests cover specific error paths and edge cases
- All external dependencies (Supabase, OpenAI) are mocked at module boundaries

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "5.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "5.2", "5.3", "5.4"] },
    { "id": 4, "tasks": ["7.1", "7.2"] }
  ]
}
```
