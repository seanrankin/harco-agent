# Implementation Plan: Proactive Email Drafting

## Overview

This feature makes the Harco Agent proactively draft or offer to draft emails when RAG context contains email sources and/or user intent suggests outreach. The implementation is primarily prompt engineering with a small utility extraction and context formatting change in `route.ts`. No new endpoints, DB tables, or UI components.

## Tasks

- [x] 1. Extract email source classification helper
  - [x] 1.1 Create `classifyEmailSources` helper function
    - Extract the `EMAIL_TYPES` set and filtering logic from `src/app/api/chat/route.ts` into a new exported function in `src/lib/email-sources.ts`
    - Function signature: `classifyEmailSources(docs: SourceDocument[]): { emailSources: SourceDocument[]; otherSources: SourceDocument[] }`
    - Import and use `classifyEmailSources` in `route.ts` replacing the inline `attachmentDocs` filter
    - _Requirements: 1.1, 1.3, 1.5_

  - [x]* 1.2 Write property test for `classifyEmailSources` (Property 1)
    - **Property 1: Email source classification partitions correctly by file_type**
    - Generate random arrays of SourceDocuments with mixed file_types using fast-check
    - Assert: `emailSources` contains exactly docs with file_type "eml" or "msg"
    - Assert: `otherSources` contains all remaining docs
    - Assert: `emailSources.length + otherSources.length === input.length` (no loss/duplication)
    - Minimum 100 iterations
    - **Validates: Requirements 1.1, 1.3, 1.4**

- [x] 2. Update context formatting with email source tagging
  - [x] 2.1 Add `[EMAIL SOURCE]` tag to document list formatting
    - In `src/app/api/chat/route.ts`, update the "Available Documents for Reference" section to append `[EMAIL SOURCE]` to documents with file_type "eml" or "msg"
    - Add `## Email Sources Present: YES/NO` line between the document list and retrieved context sections
    - Use `classifyEmailSources` to determine the YES/NO signal
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x]* 2.2 Write property test for context formatting (Property 2)
    - **Property 2: Context formatting includes complete metadata for all email sources**
    - Generate random SourceDocuments, format the document list string
    - Assert: every email source line contains `[EMAIL SOURCE]` tag
    - Assert: non-email document lines do NOT contain `[EMAIL SOURCE]` tag
    - Assert: every email source's id, title, and file_type appear in the output
    - Minimum 100 iterations
    - **Validates: Requirements 1.2, 1.5**

  - [x]* 2.3 Write unit tests for context assembly changes
    - Test that `## Email Sources Present: YES` appears when email sources exist
    - Test that `## Email Sources Present: NO` appears when no email sources exist
    - Test correct output with an empty document list
    - _Requirements: 1.1, 1.4_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update system prompt with intent classification and decision matrix
  - [x] 4.1 Add email source detection instructions to system prompt
    - In `src/lib/system-prompt.ts`, add a section instructing the LLM to recognize `[EMAIL SOURCE]` tags and the `Email Sources Present: YES/NO` signal
    - _Requirements: 1.1, 1.2_

  - [x] 4.2 Add intent classification rules to system prompt
    - Add decision criteria for three categories: explicit email request, implicit outreach, informational only
    - Include examples of each category matching the definitions in requirements 2.1, 2.2, 2.3
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.3 Add proactive email behavior decision matrix to system prompt
    - Add the 2x3 matrix mapping (intent x email source presence) to actions: draft, offer, or neither
    - Include rules for: explicit + any sources -> draft; implicit + email sources -> draft; implicit + no email sources -> offer; informational + email sources -> offer; informational + no email sources -> nothing
    - Include the insufficient-context rule (ask for details when context is too thin)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.4 Add email draft style guide to system prompt
    - Instructions for adapting tone to prospect type (small town, utility, contractor)
    - Default to neutral professional tone when no prospect type specified
    - Use email source structure as template when available
    - Use greeting + 1-2 body paragraphs + CTA when no email sources
    - Include specific products/topics from the query in subject and body
    - Leave "to" empty unless user provides recipient
    - Never include signature lines or placeholder fields
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 4.5 Add proactive offer behavior rules to system prompt
    - Answer the user's question first, then append the offer as a closing sentence
    - Single-sentence offer format
    - No more than one offer per response
    - Do not re-offer on same topic after decline
    - Treat ambiguous responses as decline
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 5. Update emailDraft tool description
  - [x] 5.1 Broaden `emailDraft` tool description in `route.ts`
    - Replace current description ("Use this when the user asks you to write or draft an email") with expanded description covering proactive scenarios
    - New description should specify: explicit requests, implicit outreach with email sources, and accepted proactive offers
    - Include instructions to leave "to" empty and omit signatures
    - _Requirements: 3.1, 3.2, 5.3, 4.6, 4.7_

- [x] 6. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The bulk of this feature is prompt engineering (tasks 4.x), not runtime code
- Property tests cover the only pure-function code changes (classification + formatting)
- Integration testing of LLM behavior (intent classification, offer/draft decisions) should be done manually against the running app with representative queries
- The existing `emailDraft` tool and email card UI require no changes beyond the tool description

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["4.1", "4.2", "5.1"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5"] }
  ]
}
```
