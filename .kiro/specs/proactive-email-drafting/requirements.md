# Requirements Document

## Introduction

The Harco Agent chat app currently drafts emails only when explicitly asked via the `emailDraft` tool. This feature adds proactive email drafting behavior: when RAG retrieves source documents that were originally emails (`.eml`/`.msg` files) and/or user intent signals a sales/outreach context, the Agent should either draft a contextually appropriate email or offer to draft one. The goal is to reduce friction for salespeople who frequently need to compose outreach emails similar to those already in the knowledge base.

## Glossary

- **Agent**: The Harco Fittings AI chat assistant that responds to user queries
- **RAG_System**: The retrieval-augmented generation pipeline that finds relevant document chunks via vector similarity search
- **Source_Document**: A document record stored in Supabase with metadata (title, file_type, file_size_bytes, storage_path)
- **Email_Source**: A Source_Document with file_type "eml" or "msg", indicating it was originally an email
- **Intent_Classifier**: The logic within the Agent that determines whether a user message implies a desire for an email draft
- **Email_Draft**: A structured output containing to, subject, and body fields rendered in the email draft card UI component (white background) via the emailDraft tool
- **Outreach_Context**: A user message that references prospects, customers, sales conversations, or communication with external parties
- **Proactive_Offer**: A conversational response from the Agent asking whether the user would like an email drafted

## Requirements

### Requirement 1: Detect Email Source Documents in RAG Results

**User Story:** As a salesperson, I want the Agent to recognize when retrieved context came from email sources, so that it can leverage those emails as templates for drafting new ones.

#### Acceptance Criteria

1. WHEN the RAG_System retrieves chunks and one or more Source_Documents have file_type "eml" or "msg", THE Agent SHALL classify those documents as Email_Sources in its context and make them available for email template reasoning
2. WHEN Email_Sources are present in retrieved context, THE Agent SHALL include the email origin metadata (document title derived from subject line, file_type) in its reasoning about whether to offer to draft an email for the user
3. THE Agent SHALL NOT treat non-email Source_Documents (file_type "docx", "doc", or "pdf") as templates for proactive email drafting
4. IF the RAG_System retrieves chunks but none of the Source_Documents have file_type "eml" or "msg", THEN THE Agent SHALL NOT proactively suggest drafting an email based on the retrieved context
5. WHEN classifying Email_Sources, THE Agent SHALL identify each email Source_Document by its document ID, title, and file_type without requiring additional metadata fields beyond those returned by the RAG_System

### Requirement 2: Classify User Intent for Email Drafting

**User Story:** As a salesperson, I want the Agent to understand when I'm in a sales/outreach context, so that it offers me email drafts without me having to explicitly ask.

#### Acceptance Criteria

1. WHEN a user message contains explicit email request language (e.g., "draft an email", "write an email", "send them something"), THE Intent_Classifier SHALL classify the intent as explicit email request
2. WHEN a user message references an Outreach_Context (mentioning prospects, customers, discussions with external parties, or comparing products for a specific audience), THE Intent_Classifier SHALL classify the intent as implicit outreach
3. WHEN a user message is a pure information query with no outreach signals, THE Intent_Classifier SHALL classify the intent as informational only
4. THE Intent_Classifier SHALL make its classification based on the combination of user message content and the presence of Email_Sources in retrieved context

### Requirement 3: Proactive Email Draft Generation

**User Story:** As a salesperson, I want the Agent to draft emails for me when it's clear I need one, so that I can respond to prospects faster.

#### Acceptance Criteria

1. WHEN the Intent_Classifier classifies intent as explicit email request, THE Agent SHALL provide a brief informational response addressing the user's query context AND generate an Email_Draft rendered in the email draft card (white background) using the emailDraft tool
2. WHEN the Intent_Classifier classifies intent as implicit outreach AND Email_Sources are present in retrieved context, THE Agent SHALL provide a brief informational response addressing the user's query AND generate an Email_Draft rendered in the email draft card (white background) using the emailDraft tool
3. WHEN the Intent_Classifier classifies intent as implicit outreach AND no Email_Sources are present in retrieved context, THE Agent SHALL present a Proactive_Offer asking if the user would like an email drafted
4. WHEN the Intent_Classifier classifies intent as informational only AND Email_Sources are present in retrieved context, THE Agent SHALL present a Proactive_Offer asking if the user would like a similar email drafted
5. WHEN the Intent_Classifier classifies intent as informational only AND no Email_Sources are present, THE Agent SHALL NOT offer or generate an email draft
6. IF the Intent_Classifier classifies intent as explicit email request AND the retrieved context does not contain sufficient product or topic information to generate a relevant Email_Draft body, THEN THE Agent SHALL ask the user to provide additional details (recipient context, product, or topic) before generating the draft

### Requirement 4: Contextual Email Adaptation

**User Story:** As a salesperson, I want drafted emails to be relevant to my specific situation, so that I can send them with minimal editing.

#### Acceptance Criteria

1. WHEN generating an Email_Draft and the user's message mentions a prospect type (e.g., small town, large utility, contractor), THE Agent SHALL adapt the email greeting, vocabulary, and framing to be appropriate for that audience type
2. IF the user's message does not mention a specific prospect type, THEN THE Agent SHALL use a neutral professional tone suitable for any water/wastewater industry recipient
3. WHEN generating an Email_Draft, THE Agent SHALL include by name the specific products or technical topics from the user's query (e.g., PVC vs ductile iron, ARV riser assemblies) in both the subject line and the email body
4. WHEN Email_Sources are present, THE Agent SHALL use the paragraph structure, greeting style, and key selling points from those source emails as a template for the draft
5. IF Email_Sources are not present in retrieved context, THEN THE Agent SHALL generate the Email_Draft using a concise structure of greeting, one to two body paragraphs covering the user's topic, and a closing call-to-action
6. WHEN generating an Email_Draft, THE Agent SHALL leave the "to" field empty (empty string) unless the user provides a specific recipient email address
7. THE Agent SHALL NOT include signature lines, closing names, or placeholder fields (e.g., [Your Name], {Company}, [Phone]) in the Email_Draft body

### Requirement 5: Proactive Offer Behavior

**User Story:** As a salesperson, I want the Agent to ask before drafting when it's not 100% sure I need an email, so that I'm not overwhelmed with unwanted drafts.

#### Acceptance Criteria

1. WHEN presenting a Proactive_Offer, THE Agent SHALL first answer the user's original question with relevant information from retrieved context, then append the offer as a separate closing sentence
2. WHEN presenting a Proactive_Offer, THE Agent SHALL append a single-sentence question asking if the user would like an email drafted (e.g., "Would you like me to draft an email about this for your prospect?")
3. WHEN the user responds to a Proactive_Offer with affirmative language (e.g., "yes", "sure", "go ahead", "draft it"), THE Agent SHALL generate an Email_Draft rendered in the email draft card (white background) using the emailDraft tool with context from the current conversation
4. WHEN the user responds to a Proactive_Offer with negative language (e.g., "no", "no thanks", "I'm good") or ignores the offer by asking an unrelated question, THE Agent SHALL NOT present another Proactive_Offer related to the same product or prospect for the remainder of the current conversation thread
5. THE Agent SHALL NOT present more than one Proactive_Offer per Agent response
6. IF the user's response to a Proactive_Offer is ambiguous (neither clearly affirmative nor negative), THEN THE Agent SHALL interpret the response as a decline and continue the conversation without generating an Email_Draft
