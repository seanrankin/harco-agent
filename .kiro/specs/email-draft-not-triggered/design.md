# Email Draft Not Triggered Bugfix Design

## Overview

When a user message triggers both document retrieval (multiple `fileReference` calls) and an explicit email draft request, `gpt-4o-mini` fails to call the `emailDraft` tool. The tools are correctly wired and the system prompt clearly mandates the call. This is a model capability/prompting issue where the smaller model drops the `emailDraft` tool call when juggling multiple `fileReference` calls in the same turn.

The fix will add a pre-classification step before calling `streamText` that detects explicit email intent. When detected, the system will either force the `emailDraft` tool via AI SDK's `toolChoice` option, add a stronger in-context reminder, or use a two-pass approach to guarantee both tool types are called.

## Glossary

- **Bug_Condition (C)**: User message contains both a document/product information request AND an explicit email draft request, causing the model to call `fileReference` but drop `emailDraft`
- **Property (P)**: When explicit email intent is detected, the `emailDraft` tool MUST be called regardless of other tool calls in the same turn
- **Preservation**: All existing behaviors for purely informational queries, email-only queries, and implicit outreach scenarios must remain unchanged
- **streamText**: The AI SDK function in `src/app/api/chat/route.ts` that invokes the model with tools
- **Intent Classification**: The system prompt's three-tier classification (Explicit email request > Implicit outreach > Informational only)
- **toolChoice**: AI SDK parameter that can force or bias tool selection behavior

## Bug Details

### Bug Condition

The bug manifests when a user sends a message containing both product/document information requests AND an explicit email draft request. The model (`gpt-4o-mini`) successfully identifies documents and calls `fileReference` multiple times, but fails to also call `emailDraft` despite the system prompt's explicit mandate.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { userMessage: string, contextDocs: SourceDocument[] }
  OUTPUT: boolean

  RETURN hasExplicitEmailIntent(input.userMessage)
         AND hasDocumentRetrievalNeed(input.userMessage, input.contextDocs)
         AND contextDocs.length > 0
         AND NOT emailDraftToolCalled(modelResponse)
END FUNCTION
```

The helper `hasExplicitEmailIntent` returns true when the message contains phrases like "draft an email", "write an email", "put together an email", "can you draft the cover email", etc. This mirrors the system prompt's Intent Classification rules.

### Examples

- User: "Can you find me the AquaFuse ball valve spec sheet and draft the cover email?" -- Model calls `fileReference` for the PDF but never calls `emailDraft`. Expected: both tools called.
- User: "Pull up the ControlFlo 360 comparison and write me an email to send to the prospect" -- Model returns file cards and prose about the product but no email draft card. Expected: file cards + email draft card.
- User: "I need the Cambridge Coupling data sheet, the fusible saddle sheet, and draft an intro email" -- Model calls `fileReference` three times, writes informational text, omits `emailDraft`. Expected: three file cards + one email draft.
- User: "Draft me an email about ball valves" (no file references needed) -- Model correctly calls `emailDraft`. This is NOT a bug condition (single tool type works fine).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Purely informational queries (no email intent) must continue to return information + file references without calling `emailDraft`
- Email-only requests (no document retrieval needed) must continue to call `emailDraft` as they do today
- Implicit outreach with email sources present must continue to trigger `emailDraft`
- Implicit outreach without email sources must continue to present a proactive offer
- Informational queries with email sources present must continue to present a proactive offer
- Mouse/keyboard interactions, UI rendering, and all client-side behavior are unaffected (server-side only change)

**Scope:**
All inputs where the user does NOT have explicit email intent combined with document retrieval should be completely unaffected by this fix. This includes:
- Pure information queries ("What's the pressure rating of the 10-inch ball valve?")
- Email-only requests ("Draft an email about our new product line")
- Implicit outreach scenarios ("I'm meeting with a prospect about HDPE fittings tomorrow")
- Queries where no documents are retrieved from RAG

## Hypothesized Root Cause

Based on the bug description and model behavior patterns, the most likely issues are:

1. **Model token budget / attention limitation**: `gpt-4o-mini` has a smaller capacity than `gpt-4o`. When generating multiple `fileReference` tool calls (each with document_id, title, file_type, file_size_bytes), the model's attention drifts from the email drafting instruction. The cognitive load of selecting documents and formatting their metadata consumes the model's "planning budget."

2. **Tool call ordering bias**: The model processes tool calls somewhat sequentially. When it starts generating `fileReference` calls first (because document info appears earlier in the context), it may "forget" or deprioritize the `emailDraft` call by the time it finishes the file references.

3. **System prompt distance**: The Intent Classification table and "CRITICAL" instruction about always calling `emailDraft` for explicit requests are in the system prompt, which can be far from the actual user message in the token window. The model may not weigh these instructions strongly enough when under multi-tool pressure.

4. **No architectural enforcement**: The current design relies entirely on the model's instruction following. There is no programmatic check that validates whether the model honored the intent classification. The system has no fallback mechanism.

## Correctness Properties

Property 1: Bug Condition - emailDraft Called for Explicit Email Intent with Document Retrieval

_For any_ user message where explicit email intent is detected (hasExplicitEmailIntent returns true) AND document retrieval is also needed (contextDocs are present and relevant), the fixed chat route SHALL ensure the `emailDraft` tool is called in the response, producing an email draft card alongside any file reference cards.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Email and Single-Intent Behavior

_For any_ user message where explicit email intent is NOT combined with document retrieval needs (pure information queries, email-only requests, implicit outreach scenarios), the fixed chat route SHALL produce the same behavior as the original code, preserving existing intent classification, proactive offers, and tool calling patterns.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

The recommended approach is **Option 6: Pre-classify intent** with a lightweight detection step before `streamText`, combined with prompt reinforcement when email intent is detected.

**File**: `src/app/api/chat/route.ts`

**Approach**: Add an intent detection step that runs before the main `streamText` call. When explicit email intent is detected alongside a multi-document context, inject an additional system-level reminder immediately before the conversation to increase the model's compliance. If that alone is insufficient, escalate to a two-pass approach.

**Specific Changes**:

1. **Add intent detection utility** (`src/lib/detect-email-intent.ts`): A deterministic function that scans the user's message for explicit email intent keywords/patterns. This avoids relying on the model to self-classify under load.
   - Pattern match against: "draft an email", "write an email", "compose an email", "put together an email", "draft the email", "draft me an email", "email them", "send them an email", etc.
   - Return `{ hasEmailIntent: boolean, hasDocumentNeed: boolean }`

2. **Add email intent reminder to system prompt** (`src/app/api/chat/route.ts`): When `hasEmailIntent` is true AND `contextDocs.length > 0`, append a strong reminder as the final system message section:
   ```
   MANDATORY: The user has explicitly requested an email draft. You MUST call the emailDraft tool in this response. Do NOT skip it even if you are also calling fileReference. Call fileReference for documents AND emailDraft for the email. Both are required.
   ```

3. **Consider two-pass fallback** (if reminder alone is insufficient): After `streamText` completes, check if `emailDraft` was called. If not and `hasEmailIntent` was true, make a second `streamText` call with only the `emailDraft` tool available and a focused prompt asking for just the draft.

4. **Model upgrade consideration**: If the above changes prove insufficient in testing, upgrade from `gpt-4o-mini` to `gpt-4o` only for requests where `hasEmailIntent && contextDocs.length > 0`. This is a targeted upgrade that limits cost increase to the specific failure scenario.

5. **Add integration test**: Verify that when both intents are present, both tool types appear in the response.

**File**: `src/lib/detect-email-intent.ts` (new file)

**Function**: `detectEmailIntent(message: string): { hasEmailIntent: boolean }`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (confirming the model drops `emailDraft` under multi-tool pressure), then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that `gpt-4o-mini` reliably drops `emailDraft` when multiple `fileReference` calls are needed.

**Test Plan**: Write integration tests that send messages with dual intent (email + documents) to the chat route with mocked RAG context containing multiple documents. Run these against the UNFIXED code to observe the model's failure pattern.

**Test Cases**:
1. **Multi-doc + email test**: Send "Find me the ball valve specs and draft the cover email" with 3 documents in context (will fail on unfixed code -- no emailDraft call)
2. **Single-doc + email test**: Send "Get the AquaFuse sheet and write me an email" with 1 document in context (may or may not fail -- helps identify threshold)
3. **Email-only test**: Send "Draft me an email about ball valves" with documents in context (should pass -- baseline that email-only works)
4. **Multi-doc no email test**: Send "What ball valves do we have?" with 3 documents in context (should pass -- baseline that file references work alone)

**Expected Counterexamples**:
- Test 1 will show `fileReference` called 2-3 times but `emailDraft` never called
- Test 2 may show inconsistent behavior (sometimes works, sometimes doesn't)
- Root cause confirmation: model drops lower-priority tool when cognitive load increases

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := chatRoute_fixed(input)
  ASSERT emailDraftToolCalled(result)
  ASSERT fileReferenceToolCalled(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT chatRoute_original(input).toolsCalled = chatRoute_fixed(input).toolsCalled
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many varied user messages across the input domain (informational, implicit outreach, email-only)
- It catches edge cases where the intent detection might incorrectly classify a message as having email intent
- It provides strong guarantees that the new pre-classification step doesn't introduce false positives

**Test Plan**: Observe behavior on UNFIXED code first for non-bug-condition inputs (pure info queries, email-only, implicit outreach), then write property-based tests verifying that behavior is preserved after the fix.

**Test Cases**:
1. **Informational preservation**: Generate random informational queries (no email keywords) and verify no `emailDraft` call is made and no extra system prompt sections are injected
2. **Email-only preservation**: Generate email-only requests (no document retrieval context) and verify `emailDraft` continues to be called as before
3. **Implicit outreach preservation**: Generate implicit outreach messages and verify proactive offer behavior is unchanged
4. **Intent detection accuracy**: Generate messages with edge-case phrasing and verify the deterministic classifier matches expected behavior

### Unit Tests

- Test `detectEmailIntent` with positive cases: "draft an email", "write me an email", "can you draft the cover email", "put together an email for them", "email them about this"
- Test `detectEmailIntent` with negative cases: "email me the document", "what's in the email?", "the email says...", "from the email source"
- Test `detectEmailIntent` with edge cases: "draft" without "email", "email" as a noun not a verb, questions about emails in context
- Test that the system prompt injection only occurs when both `hasEmailIntent` is true AND `contextDocs.length > 0`

### Property-Based Tests

- Generate random user messages from a grammar that mixes informational queries with/without email keywords, and verify `detectEmailIntent` correctly classifies them (using `fast-check`)
- Generate random document contexts (0 to N documents) and verify the system prompt reminder is only injected under the correct conditions
- Fuzz the intent detector with adversarial strings to ensure no false positives on common non-email uses of the word "email"

### Integration Tests

- End-to-end test with mocked OpenAI responses verifying the two-pass fallback triggers when the model fails to call `emailDraft`
- Test that the response includes both file reference cards and an email draft card when dual intent is present
- Test that the system prompt reminder text is correctly appended to the system message
- Test that the fix does not increase latency for non-email queries (no unnecessary pre-processing)
