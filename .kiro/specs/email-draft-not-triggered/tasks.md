# Implementation Plan

## Overview

Fix the bug where `emailDraft` tool is dropped when `gpt-4o-mini` is also calling `fileReference` multiple times. The fix adds a deterministic email intent detector, injects a mandatory system prompt reminder for dual-intent requests, and implements a two-pass fallback to guarantee `emailDraft` is called.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - emailDraft Dropped When Combined With fileReference Calls
  - **IMPORTANT**: Write this property-based test BEFORE implementing the fix
  - **GOAL**: Surface counterexamples that demonstrate the model drops `emailDraft` when `fileReference` calls are also needed
  - **Scoped PBT Approach**: Generate user messages containing explicit email intent keywords ("draft an email", "write an email", "draft the cover email") combined with document retrieval context (1-3 contextDocs present). For each, assert that the `emailDraft` tool is called in the response alongside any `fileReference` calls.
  - Test file: `src/app/api/chat/route.email-bug.test.ts`
  - Mock `streamText` to simulate model behavior where `fileReference` is called but `emailDraft` is omitted (replicating the observed bug)
  - Use `fast-check` to generate varied dual-intent messages: `fc.tuple(fc.constantFrom("draft an email", "write an email", "draft the cover email", "put together an email"), fc.constantFrom("about ball valves", "for the AquaFuse specs", "about the ControlFlo comparison"))`
  - Assert: for all generated inputs where `hasExplicitEmailIntent` is true AND `contextDocs.length > 0`, the route's response includes an `emailDraft` tool call
  - Run test on UNFIXED code - expect FAILURE (confirms the bug exists: model drops emailDraft under multi-tool pressure)
  - Document counterexamples found (e.g., "draft the cover email + 3 docs in context → only fileReference called")
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Dual-Intent Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code: purely informational queries produce `fileReference` calls but no `emailDraft` call
  - Observe on UNFIXED code: email-only requests (no document retrieval needed) produce `emailDraft` call
  - Observe on UNFIXED code: implicit outreach without email sources present produces proactive offer text, no `emailDraft` call
  - Test file: `src/app/api/chat/route.preservation.test.ts`
  - Write property-based tests with `fast-check`:
    - Property A: For all messages with NO email intent keywords, `detectEmailIntent` returns `{ hasEmailIntent: false }` and no email reminder is injected into the system prompt
    - Property B: For all messages with email intent but empty contextDocs (email-only scenario), the route does NOT inject the mandatory reminder (existing behavior suffices)
    - Property C: For all non-email keywords that contain the substring "email" as a noun (e.g., "what's in the email?", "the email says"), `detectEmailIntent` returns `{ hasEmailIntent: false }`
  - Verify tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix: Pre-classify email intent and enforce emailDraft tool call

  - [x] 3.1 Create `src/lib/detect-email-intent.ts` utility
    - Export `detectEmailIntent(message: string): { hasEmailIntent: boolean }`
    - Pattern match against explicit email intent phrases: "draft an email", "write an email", "compose an email", "put together an email", "draft the email", "draft me an email", "email them", "send them an email", "write me an email", "draft the cover email"
    - Exclude false positives: "email" used as a noun referring to existing emails in context ("the email says", "from the email", "what's in the email", "email source", "email me the document")
    - Use case-insensitive regex matching
    - _Bug_Condition: isBugCondition(input) where hasExplicitEmailIntent(userMessage) AND contextDocs.length > 0 AND emailDraft not called_
    - _Expected_Behavior: detectEmailIntent correctly identifies explicit email creation intent_
    - _Preservation: Must not trigger on informational queries about emails in context_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Add unit tests for `detectEmailIntent`
    - Test file: `src/lib/detect-email-intent.test.ts`
    - Positive cases: "draft an email", "write me an email", "can you draft the cover email", "put together an email for them", "email them about this", "send them an email about the valves"
    - Negative cases: "email me the document", "what's in the email?", "the email says...", "from the email source", "check the email attachment"
    - Edge cases: "draft" without "email", "email" as standalone noun, mixed case
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 3.3 Modify `src/app/api/chat/route.ts` to pre-classify and reinforce
    - Import `detectEmailIntent` from `@/lib/detect-email-intent`
    - After RAG retrieval, call `detectEmailIntent(userQuery)`
    - When `hasEmailIntent` is true AND `contextDocs.length > 0`, append mandatory reminder to system prompt: "MANDATORY: The user has explicitly requested an email draft. You MUST call the emailDraft tool in this response. Do NOT skip it even if you are also calling fileReference. Call fileReference for documents AND emailDraft for the email. Both are required."
    - _Bug_Condition: isBugCondition(input) where hasExplicitEmailIntent AND contextDocs.length > 0_
    - _Expected_Behavior: System injects reminder to increase model compliance on dual-intent requests_
    - _Preservation: No reminder injected for non-email or email-only queries_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.4 Add two-pass fallback in `src/app/api/chat/route.ts`
    - After `streamText` completes, check if `emailDraft` was called in the response
    - If `hasEmailIntent` was true AND `emailDraft` was NOT called, trigger a second focused `streamText` call with only the `emailDraft` tool available and a prompt instructing the model to draft the email based on context
    - Merge the second pass result into the response stream
    - _Bug_Condition: Model still drops emailDraft despite reminder_
    - _Expected_Behavior: Two-pass guarantees emailDraft is called when intent is detected_
    - _Preservation: Second pass only triggers when bug condition is met; no impact on other paths_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - emailDraft Called for Explicit Email Intent with Document Retrieval
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior: when explicit email intent is detected AND documents are in context, `emailDraft` MUST be called
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed by pre-classification + fallback)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Dual-Intent Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions for informational, email-only, and implicit outreach paths)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npm test` to verify all existing tests plus new tests pass
  - Verify no regressions in `route.test.ts` (existing chat route tests)
  - Ensure the intent detector has no false positives on common non-email uses of "email"
  - Ask the user if questions arise


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4"] },
    { "id": 4, "tasks": ["3.5", "3.6"] },
    { "id": 5, "tasks": ["4"] }
  ]
}
```

## Notes

- Test framework: vitest + fast-check (both already in devDependencies)
- The exploration test (task 1) is expected to FAIL on unfixed code. This is correct and confirms the bug exists.
- The preservation tests (task 2) are expected to PASS on unfixed code. This captures the baseline.
- After the fix (tasks 3.1-3.4), the exploration test should PASS and preservation tests should remain PASSING.
- The two-pass fallback (3.4) is a safety net. If the prompt reminder alone is sufficient, the fallback will never trigger in practice, but it guarantees correctness.
