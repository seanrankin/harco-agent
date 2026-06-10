# Implementation Plan: Thread History

## Overview

Persistent multi-thread chat history backed by Supabase, with a sidebar showing past conversations grouped by date. The implementation progresses from database schema, through API routes, to client adapter and UI components, wiring everything together at the end.

## Tasks

- [x] 1. Database schema and utility functions
  - [x] 1.1 Create Supabase migration for threads and messages tables
    - Create `supabase/migrations/20260608181900_create_thread_tables.sql`
    - Define `threads` table with columns: `id` (text PK, default gen_random_uuid()::text), `user_id` (uuid FK to auth.users, NOT NULL), `title` (text, nullable), `archived_at` (timestamptz, nullable), `created_at` (timestamptz, NOT NULL, default now()), `updated_at` (timestamptz, NOT NULL, default now())
    - Define `messages` table with columns: `id` (text PK), `thread_id` (text FK to threads ON DELETE CASCADE, NOT NULL), `parent_id` (text, nullable), `format` (text, NOT NULL), `content` (jsonb, NOT NULL), `created_at` (timestamptz, NOT NULL, default now())
    - Enable RLS on both tables
    - Create RLS policies: threads (SELECT/INSERT/UPDATE/DELETE where user_id = auth.uid()), messages (SELECT/INSERT where thread_id belongs to user)
    - Create indexes: `threads_user_id_idx` on threads(user_id), `messages_thread_id_idx` on messages(thread_id)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.2 Create thread utility functions
    - Create `src/lib/thread-utils.ts` with named exports
    - Implement `classifyDateGroup(updatedAt: Date): "today" | "earlier-this-week" | "earlier"` using local timezone
    - Implement `truncatePreview(text: string, max?: number): string` truncating to 50 chars with ellipsis
    - Implement `validateTitle(title: string): { valid: boolean; error?: string }` enforcing non-empty, max 100 chars after trim
    - _Requirements: 6.2, 6.3, 2.9, 8.2, 8.3_

  - [ ]\* 1.3 Write property tests for classifyDateGroup (Property 8)
    - **Property 8: Date group classification**
    - **Validates: Requirements 6.2**
    - Test file: `src/lib/thread-utils.test.ts`
    - Use fast-check to generate arbitrary Date values and verify correct classification against midnight/Monday boundaries

  - [ ]\* 1.4 Write property tests for truncatePreview (Property 9)
    - **Property 9: Thread item display text truncation**
    - **Validates: Requirements 6.3**
    - Test file: `src/lib/thread-utils.test.ts`
    - Use fast-check to verify strings >50 chars produce exactly 50-char result with ellipsis, and strings ≤50 chars return unchanged

  - [ ]\* 1.5 Write property test for validateTitle (Property 2)
    - **Property 2: Title validation enforces trim and length constraint**
    - **Validates: Requirements 2.3, 2.9, 8.2, 8.3**
    - Test file: `src/lib/thread-utils.test.ts`
    - Use fast-check to generate arbitrary strings and verify trim + length enforcement

- [x] 2. Thread CRUD API routes
  - [x] 2.1 Implement GET/POST /api/threads route
    - Create `src/app/api/threads/route.ts`
    - GET: authenticate via createClient(), query non-archived threads for user ordered by updated_at DESC, return JSON array
    - POST: authenticate, insert new thread with user_id and null title, return created thread with id/created_at/updated_at
    - Return 401 for unauthenticated requests
    - _Requirements: 2.1, 2.2, 2.8_

  - [x] 2.2 Implement GET/PATCH/DELETE /api/threads/[id] route
    - Create `src/app/api/threads/[id]/route.ts`
    - GET: fetch single thread by id, return 404 if not found/not owned
    - PATCH: handle title update (trim, validate ≤100 chars, return 400 if invalid) and archived_at update (set timestamp or null)
    - DELETE: remove thread (cascade deletes messages), return 200 with no body
    - Return 401 for unauthenticated, 404 for non-owner
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]\* 2.3 Write property tests for thread routes (Properties 1, 2, 3)
    - **Property 1: Thread list returns only non-archived threads in descending update order**
    - **Property 3: Ownership authorization returns 404 for non-owners**
    - **Validates: Requirements 2.1, 2.3, 2.7, 2.9, 3.3**
    - Test file: `src/app/api/threads/route.test.ts`
    - Mock Supabase client, use fast-check to generate thread sets and verify filtering/ordering/auth behavior

- [x] 3. Message persistence API routes
  - [x] 3.1 Implement GET/POST /api/threads/[id]/messages route
    - Create `src/app/api/threads/[id]/messages/route.ts`
    - GET: verify thread ownership, return all messages ordered by created_at ASC
    - POST: validate request body (require id, parent_id, format, content as object), insert message, return 201 with created record
    - Return 401 for unauthenticated, 404 for non-owned thread, 400 for invalid body
    - Store content as-is without internal validation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]\* 3.2 Write property tests for message routes (Properties 4, 5, 6)
    - **Property 4: Messages are returned in chronological order**
    - **Property 5: Message body validation rejects incomplete payloads**
    - **Property 6: Message content round-trip preservation**
    - **Validates: Requirements 3.1, 3.4, 3.6**
    - Test file: `src/app/api/threads/[id]/messages/route.test.ts`
    - Mock Supabase client, use fast-check to generate message arrays and arbitrary JSON content

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Auto-title generation route
  - [x] 5.1 Implement POST /api/threads/[id]/title route
    - Create `src/app/api/threads/[id]/title/route.ts`
    - Authenticate user, verify thread ownership
    - Accept messages array from request body (first user message + first assistant response)
    - Use OpenAI (gpt-4o-mini) to generate a short title (2-60 chars) from the conversation content
    - Update thread title in DB and return `{ title }` response
    - Handle failures gracefully: return 500 without modifying thread title
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [ ]\* 5.2 Write property test for title generation (Property 10)
    - **Property 10: Generated title length constraint**
    - **Validates: Requirements 9.1**
    - Test file: `src/app/api/threads/[id]/title/route.test.ts`
    - Mock OpenAI, use fast-check to verify generated titles are always 2-60 chars

- [x] 6. Client adapter and runtime migration
  - [x] 6.1 Create RemoteThreadListAdapter
    - Create `src/lib/thread-adapter.ts` with named export `threadListAdapter`
    - Implement `list()`: GET /api/threads, map rows to `{ remoteId, title, status }`
    - Implement `initialize()`: POST /api/threads, return `{ remoteId }`
    - Implement `rename(remoteId, title)`: PATCH /api/threads/[id] with `{ title }`
    - Implement `archive(remoteId)`: PATCH with `{ archived_at: new Date().toISOString() }`
    - Implement `unarchive(remoteId)`: PATCH with `{ archived_at: null }`
    - Implement `delete(remoteId)`: DELETE /api/threads/[id]
    - Implement `generateTitle(remoteId, messages)`: POST /api/threads/[id]/title
    - Implement `unstable_Provider` with `ThreadHistoryAdapter.withFormat` for message load/append
    - Throw errors with status code on non-2xx responses
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]\* 6.2 Write property test for adapter error propagation (Property 7)
    - **Property 7: Adapter error propagation**
    - **Validates: Requirements 4.8**
    - Test file: `src/lib/thread-adapter.test.ts`
    - Mock fetch, use fast-check to generate arbitrary HTTP error status codes (400-599) and verify errors are thrown with status

  - [x] 6.3 Migrate ChatClient to useRemoteThreadListRuntime
    - Modify `src/components/chat-client.tsx`
    - Replace `useChatRuntime()` with `useRemoteThreadListRuntime({ runtimeHook: () => useChatRuntime(), adapter: threadListAdapter })`
    - Keep `SimpleImageAttachmentAdapter` registered on the per-thread chat runtime
    - Wrap runtime in error handling for 10-second load timeout with retry
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Sidebar and thread list UI
  - [x] 8.1 Create ThreadItem component
    - Create `src/components/app-shell/thread-item.tsx`
    - Display thread title or truncated first-message preview (50 chars max with ellipsis)
    - Active state highlighting via visually distinct background
    - Icon buttons for rename/archive/delete operations
    - Inline rename editing: pre-fill title, select all, validate on Enter/blur, cancel on Escape
    - Delete confirmation via Dialog component
    - _Requirements: 6.3, 6.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 8.2 Rewrite Sidebar with ThreadListPrimitive
    - Rewrite `src/components/app-shell/sidebar.tsx`
    - Use `ThreadListPrimitive.Root` and `ThreadListPrimitive.Items` from assistant-ui
    - Implement date grouping: "Today", "Earlier this week", "Earlier" using `classifyDateGroup`
    - Sort threads within each group by updated_at descending
    - Display empty state message when no threads exist
    - "New question" button creates thread via runtime, appears at top of "Today" group
    - Close sidebar drawer on mobile (≤860px) when new thread created
    - Handle thread creation errors: show error, stay on current thread, preserve input
    - Wire archive/delete to switch active thread (most recent remaining, or new thread if none)
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.7, 7.1, 7.2, 7.3, 7.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [x] 8.3 Implement auto-title display update
    - When `generateTitle` resolves, update the thread item title in the sidebar within 2 seconds
    - If title generation fails, continue showing first-message preview
    - _Requirements: 9.3, 9.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The migration file should be created locally; user will push it to apply
- All new files use named exports per project conventions
- Functional components only, no default exports except route handlers

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["2.3", "3.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["8.2"] },
    { "id": 8, "tasks": ["8.3"] }
  ]
}
```
