# Implementation Plan: Send to Outlook

## Overview

Implement a "Send to Outlook" feature that adds a button to EmailDraftCard, allowing users to create draft emails in their Microsoft 365 mailbox with file attachments via the Microsoft Graph API. The implementation follows a server-mediated approach: OAuth tokens stored in HTTP-only cookies, attachments resolved server-side from Supabase Storage, and drafts created via Graph API.

## Tasks

- [x] 1. Set up Outlook library modules and shared types
  - [x] 1.1 Create `src/lib/outlook/token-manager.ts` with cookie read/write, AES-256-GCM encryption/decryption, expiry detection, and refresh token exchange
    - Implement `getTokens`, `setTokens`, `clearTokens`, `refreshAccessToken`
    - Use `MICROSOFT_CLIENT_SECRET` as encryption key material
    - Cookie names: `ms_access_token`, `ms_refresh_token`, `ms_token_expiry`
    - _Requirements: 2.4, 2.5, 7.2_

  - [x] 1.2 Create `src/lib/outlook/graph-client.ts` with Microsoft Graph API helpers
    - Implement `createDraftMessage` (POST /me/messages)
    - Implement `attachFile` (POST /me/messages/{id}/attachments for files ≤ 3MB)
    - Implement `createUploadSession` (POST /me/messages/{id}/attachments/createUploadSession for files > 3MB)
    - _Requirements: 3.1, 3.2, 3.6, 3.7_

  - [x] 1.3 Create `src/lib/outlook/attachment-resolver.ts` with document resolution logic
    - Implement `resolveAttachments` to query documents table, generate signed URLs, download and base64-encode files
    - Implement `deduplicateDocumentIds` (pure function)
    - Implement `buildFilename` (pure function)
    - _Requirements: 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Implement OAuth API routes
  - [x] 2.1 Create `src/app/api/outlook/auth/route.ts` (GET)
    - Construct Microsoft OAuth authorization URL with `Mail.ReadWrite` and `offline_access` scopes
    - Accept `returnUrl` query param, encode in `state` parameter
    - Redirect user to Microsoft login
    - _Requirements: 2.1, 2.2, 7.1, 7.3, 7.6_

  - [x] 2.2 Create `src/app/api/outlook/callback/route.ts` (GET)
    - Exchange authorization code for access + refresh tokens
    - Encrypt and store tokens in HTTP-only cookies via `setTokens`
    - Redirect user back to the `returnUrl` from state
    - Handle error cases (denied consent, failed exchange)
    - _Requirements: 2.3, 2.4, 2.7, 2.8_

  - [x] 2.3 Create `src/app/api/outlook/status/route.ts` (GET)
    - Return 200 `{ authenticated: true }` if valid `ms_access_token` cookie exists
    - Return 401 `{ authenticated: false }` if no token
    - _Requirements: 2.1_

- [x] 3. Implement send-draft API route
  - [x] 3.1 Create `src/app/api/outlook/send-draft/route.ts` (POST)
    - Use `requireAuth` for Supabase auth check
    - Validate request body with Zod schema (`to`, `subject`, `body`, `documentIds`)
    - Read Microsoft tokens from cookies, refresh if expired
    - Deduplicate document IDs
    - Resolve attachments from Supabase Storage
    - Create draft via Graph API with attachments
    - Return `{ messageId, attachmentCount, totalRequested, skippedDocumentIds }`
    - Return 400 for validation failures, 401 for missing Microsoft auth, 502 for Graph API errors
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 3.8_

- [x] 4. Checkpoint - Ensure all server-side tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement client components
  - [x] 5.1 Create `src/components/tool-ui/outlook-button.tsx` with state machine
    - Implement `ButtonState` type: idle | loading | success | partial | error
    - On click: check auth status via GET `/api/outlook/status`
    - If unauthenticated: open popup/redirect to `/api/outlook/auth`
    - After auth: POST to `/api/outlook/send-draft`
    - Display loading spinner, success checkmark, partial count, or error message
    - Auto-reset: 3s for success/partial, 5s for error
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.2 Modify `src/components/tool-ui/email-draft-card.tsx` to accept `documentIds` and `outlookEnabled` props
    - Add `documentIds?: string[]` and `outlookEnabled?: boolean` to `EmailDraftCardProps`
    - Conditionally render `OutlookButton` to the left of "Draft an Email" when `outlookEnabled` is true
    - _Requirements: 1.1, 7.4_

  - [x] 5.3 Create server-side config helper to expose `outlookEnabled` flag
    - Create `src/lib/outlook/config.ts` that checks presence of all three env vars
    - Log warning if any Microsoft env var is missing
    - Export `isOutlookEnabled()` for use in server components or API routes
    - _Requirements: 7.4, 7.5, 7.6_

  - [x] 5.4 Wire `outlookEnabled` and `documentIds` into `EmailDraftToolUI` in the chat client
    - Collect document IDs from sibling fileReference tool calls and source data
    - Pass `outlookEnabled` (from server config) and collected `documentIds` to EmailDraftCard
    - _Requirements: 3.3, 3.4_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Property-based and unit tests
  - [x] 7.1 Write property test for attachment deduplication
    - **Property 1: Attachment deduplication produces the unique union**
    - Generate random arrays of UUID-like strings with controlled overlap
    - Assert result contains each unique ID exactly once and equals set union
    - **Validates: Requirements 3.3, 3.4, 3.5**

  - [x] 7.2 Write property test for filename construction
    - **Property 2: Attachment filename construction**
    - Generate random title/fileType pairs including edge cases (spaces, special chars, multi-dot extensions)
    - Assert filename equals `title + "." + fileType`
    - **Validates: Requirements 4.3**

  - [x] 7.3 Write property test for request validation
    - **Property 3: Request validation rejects invalid inputs**
    - Generate invalid payloads via fast-check arbitraries that violate each constraint
    - Assert validation rejects and identifies the failing field
    - **Validates: Requirements 6.3, 6.4**

  - [x] 7.4 Write property test for graceful degradation
    - **Property 4: Graceful degradation on attachment failures**
    - Generate document ID sets with random failure masks
    - Assert successful documents are preserved and failures are reported as skipped
    - **Validates: Requirements 3.8, 4.4, 4.5**

  - [x] 7.5 Write property test for partial success count accuracy
    - **Property 5: Partial success count accuracy**
    - Generate random (attached, total) pairs where attached ≤ total
    - Assert correct ratio display
    - **Validates: Requirements 5.4**

  - [x] 7.6 Write property test for draft payload preservation
    - **Property 6: Draft payload preserves all email fields**
    - Generate valid email drafts with unicode, HTML entities, long strings
    - Assert Graph API payload contains exact to/subject/body values with HTML contentType
    - **Validates: Requirements 3.2**

  - [x] 7.7 Write unit tests for OutlookButton state machine
    - Test all state transitions: idle → loading → success/partial/error → idle
    - Mock fetch responses for each scenario
    - Verify auto-reset timers (3s success, 5s error)
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

  - [x] 7.8 Write unit tests for token-manager encryption round-trip
    - Verify encrypt/decrypt produces original token
    - Verify expiry detection logic
    - **Validates: Requirements 2.4, 2.5**

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- `fast-check` is already in devDependencies, no additional install needed
- Environment variables (`MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI`) must be added to `.env.local` before testing OAuth flow
- After implementation, deploy any edge function or migration changes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "5.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["5.1", "5.2"] },
    { "id": 4, "tasks": ["5.4"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8"] }
  ]
}
```
