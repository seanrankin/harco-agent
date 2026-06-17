# Implementation Plan: User Identity Display

## Overview

Add user identity display to the sidebar footer and auto-append email signatures to drafts. The implementation creates a pure `appendSignature` helper, a `UserIdentity` component, then wires both into the existing Sidebar and Chat API route. All data sourced from Supabase Auth — no new tables or endpoints.

## Tasks

- [x] 1. Create email signature helper
  - [x] 1.1 Create `src/lib/email-signature.ts` with `appendSignature` function
    - Pure function: `(body, displayName, email) => string`
    - Format: `{body}\n\nBest,\n{displayName}\nHarco Fittings`
    - Falls back to email when displayName is null/undefined/empty
    - Export `getInitials(displayName, email)` helper for avatar circle
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 1.2 Write property tests for `appendSignature`
    - **Property 1: Signature append preserves body and produces correct format**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - Use fast-check to generate random body strings and identity pairs
    - Assert output starts with original body, followed by `\n\nBest,\n`, identification line, `\nHarco Fittings`

  - [ ]* 1.3 Write property test for `getInitials`
    - **Property 3: Initials derivation correctness**
    - **Validates: Requirements 1.2, 1.3**
    - Generate random multi-word names: assert first char of first word + first char of last word (uppercased)
    - Generate single-word names: assert first char uppercased
    - Null/empty displayName with email: assert first char of email uppercased

- [x] 2. Create UserIdentity component
  - [x] 2.1 Create `src/components/app-shell/user-identity.tsx`
    - Accept `displayName?: string | null` and `email?: string | null` props
    - Render avatar circle with initials (using `getInitials`)
    - Show displayName on first line (truncated with ellipsis)
    - Show email on second line (smaller, muted, truncated with ellipsis)
    - When displayName absent: email only, single line
    - When neither available: render nothing (empty fragment)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

  - [ ]* 2.2 Write unit tests for UserIdentity component
    - Test renders name + email when both provided
    - Test renders email only when displayName absent
    - Test renders nothing when email absent
    - Test text truncation with overflow styles
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

- [x] 3. Wire identity into Sidebar and AppShell
  - [x] 3.1 Extend Sidebar props and render UserIdentity in footer
    - Add `userDisplayName?: string | null` and `userEmail?: string | null` to SidebarProps
    - Render `<UserIdentity>` to the left of the sign-out button in the footer div
    - Adjust footer layout: flex with items-center, identity takes remaining space
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 3.2 Fetch user in AppShell and pass identity props to Sidebar
    - Add `useEffect` in AppShell that calls `supabase.auth.getUser()` on mount
    - Store user display_name and email in state
    - Pass `userDisplayName` and `userEmail` props to `<Sidebar>`
    - _Requirements: 1.5, 3.4_

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate signature into Chat API route
  - [x] 5.1 Modify `emailDraft` tool in `src/app/api/chat/route.ts` to append signature
    - Import `appendSignature` from `src/lib/email-signature`
    - Add `execute` function to the emailDraft tool definition
    - In execute, call `appendSignature(body, displayName, user.email)` on the tool args body
    - Return the tool result with signature-appended body (flows through stream to all output channels)
    - _Requirements: 2.1, 2.4, 2.5, 3.1, 3.3_

  - [ ]* 5.2 Write unit test for signature in chat API route
    - Mock Supabase auth to return user with display_name and email
    - Trigger emailDraft tool call
    - Assert response body contains signature block
    - _Requirements: 2.1, 2.5_

- [x] 6. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design doc
- Unit tests validate specific examples and edge cases
- The `appendSignature` function is pure and side-effect free, making it trivial to test
- fast-check is already installed as a devDependency

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2"] }
  ]
}
```
