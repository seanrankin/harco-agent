# Bugfix Requirements Document

## Introduction

When a user sends a message that both requests information about products (triggering document retrieval and `fileReference` calls) AND explicitly asks for an email draft (e.g., "can you draft the cover email?"), the assistant fails to call the `emailDraft` tool. The system prompt's Intent Classification rules clearly mandate that explicit email requests MUST trigger the `emailDraft` tool, but the model (gpt-4o-mini) does not follow through when it is already calling `fileReference` multiple times in the same response.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user sends a message containing both a document/product information request AND an explicit email draft request (e.g., "can you draft the cover email?") THEN the system retrieves relevant documents and calls `fileReference` but does NOT call the `emailDraft` tool

1.2 WHEN the user's message matches the "Explicit email request" intent classification AND the model also needs to call `fileReference` for document cards THEN the system only produces `fileReference` tool calls and omits the `emailDraft` tool call entirely

1.3 WHEN the user explicitly asks for an email draft in a message that also triggers multiple file references THEN the system responds with file cards and informational text but no email draft card is rendered

### Expected Behavior (Correct)

2.1 WHEN the user sends a message containing both a document/product information request AND an explicit email draft request THEN the system SHALL call both `fileReference` (for relevant documents) AND `emailDraft` (with an appropriate draft) in the same response

2.2 WHEN the user's message matches the "Explicit email request" intent classification THEN the system SHALL ALWAYS call the `emailDraft` tool regardless of how many other tool calls (e.g., `fileReference`) are also needed in the same turn

2.3 WHEN the user explicitly asks for an email draft in a message that also triggers multiple file references THEN the system SHALL render both file reference cards AND an email draft card in the response

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user asks a purely informational question with no email intent THEN the system SHALL CONTINUE TO respond with information and file references without calling `emailDraft`

3.2 WHEN the user asks for an email draft without also requesting document retrieval THEN the system SHALL CONTINUE TO call `emailDraft` and produce a draft card

3.3 WHEN the user's message has implicit outreach intent but no explicit email mention and no email sources are in context THEN the system SHALL CONTINUE TO present a proactive offer rather than auto-drafting

3.4 WHEN the user asks for information about products and documents are retrieved THEN the system SHALL CONTINUE TO call `fileReference` for relevant documents and display file cards correctly
