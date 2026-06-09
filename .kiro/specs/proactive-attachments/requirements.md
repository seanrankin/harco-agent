# Requirements Document

## Introduction

The Harco Agent chatbot uses RAG to retrieve relevant document chunks when answering user queries. Currently, source document FileCards are only rendered when the LLM explicitly decides to call the `fileReference` tool. Users often receive answers sourced from documents without seeing which documents were used, requiring them to ask follow-up questions to get source citations.

This feature introduces proactive attachment rendering: when the chatbot responds using information from retrieved documents, the relevant source documents are automatically displayed as downloadable FileCard attachments below the response, without requiring the LLM to explicitly call the tool for each one.

## Glossary

- **Chat_API**: The Next.js API route (`/api/chat`) that handles chat requests, performs RAG retrieval, and streams LLM responses with tool calls
- **RAG_System**: The retrieval-augmented generation pipeline that embeds user queries and fetches relevant document chunks from Supabase pgvector
- **FileCard**: A UI component that renders a downloadable file reference with icon, title, file type, and size
- **Context_Documents**: The deduplicated array of document metadata (`id`, `title`, `file_type`, `file_size_bytes`) returned by the RAG_System for a given query
- **Attachment_Renderer**: The frontend component responsible for displaying FileCards for source documents attached to a response
- **Source_Annotation**: Metadata attached to a streamed response that identifies which Context_Documents were used to generate the answer

## Requirements

### Requirement 1: Attach Source Document Metadata to Responses

**User Story:** As a salesperson, I want to see which documents were used to answer my question, so that I can verify the information and access the original source.

#### Acceptance Criteria

1. WHEN the RAG_System returns one or more Context_Documents for a query, THE Chat_API SHALL include exactly one Source_Annotation per unique Context_Document in the streamed response
2. WHEN the RAG_System returns zero Context_Documents for a query, THE Chat_API SHALL NOT include a Source_Annotation in the streamed response
3. THE Source_Annotation SHALL contain the `id`, `title`, `file_type`, and `file_size_bytes` for the referenced Context_Document
4. IF multiple retrieved chunks originate from the same Context_Document, THEN THE Chat_API SHALL emit only one Source_Annotation for that document
5. THE Chat_API SHALL include no more than 8 Source_Annotations per response

### Requirement 2: Render Source Attachments in the UI

**User Story:** As a salesperson, I want source documents to appear as downloadable cards below the assistant's response, so that I can quickly access the referenced files.

#### Acceptance Criteria

1. WHEN a response contains a Source_Annotation with one or more Context_Documents, THE Attachment_Renderer SHALL display a FileCard for each Context_Document
2. THE Attachment_Renderer SHALL display FileCards after the assistant message text content and after any tool-call UI
3. THE Attachment_Renderer SHALL display FileCards using the same visual style as the existing FileCard component (icon, title, file type label, file size, and download link to `/api/download?document_id={id}`)
4. WHEN a response contains no Source_Annotation, THE Attachment_Renderer SHALL NOT render any attachment UI
5. Each FileCard in the attachments section SHALL link to `/api/download?document_id={id}` where `{id}` is the document's `id` from the Source_Annotation

### Requirement 3: Deduplicate Attachments Against Explicit Tool Calls

**User Story:** As a salesperson, I want to avoid seeing duplicate file cards when the AI already explicitly cited a document in its response.

#### Acceptance Criteria

1. WHEN the LLM calls the `fileReference` tool for a document whose `document_id` matches the `id` of a document also present in the Source_Annotation, THE Attachment_Renderer SHALL render only the tool-call FileCard and SHALL NOT render a separate FileCard for that document in the attachments section
2. THE Attachment_Renderer SHALL use case-insensitive string equality on the document `id` field to determine duplicates between tool-call FileCards and Source_Annotation FileCards
3. WHEN a Source_Annotation references a document that has no matching `fileReference` tool call in the same message, THE Attachment_Renderer SHALL render a FileCard for that document in the attachments section

### Requirement 4: Attachment Section Labeling

**User Story:** As a salesperson, I want to clearly distinguish proactive source attachments from the response text, so that I understand what the cards represent.

#### Acceptance Criteria

1. WHEN one or more source FileCards are rendered in an assistant message, THE Attachment_Renderer SHALL display a "Sources" label directly above the FileCard group
2. IF no source FileCards are present in an assistant message, THEN THE Attachment_Renderer SHALL NOT render the "Sources" label
3. THE "Sources" label SHALL use a font size smaller than the message body text and the text-muted-foreground color token to visually separate it from message content

### Requirement 5: Preserve Existing fileReference Tool Behavior

**User Story:** As a salesperson, I want the existing inline file citation behavior to continue working alongside the new proactive attachments.

#### Acceptance Criteria

1. THE Chat_API SHALL include the `fileReference` tool (accepting `document_id`, `title`, `file_type`, and `file_size_bytes` parameters) in the tool definitions provided to the LLM
2. WHEN the LLM calls the `fileReference` tool, THE FileCard SHALL render inline within the assistant message content at the position of the tool call, displaying the document title, file type, file size, and a download link
3. THE system prompt SHALL instruct the LLM to use the `fileReference` tool when citing a specific document from the retrieved context in the response text
4. WHEN both a `fileReference` tool call and proactive attachments are present in the same assistant response, THE system SHALL render fileReference FileCards inline within the message text and proactive attachments in a separate section, so that the two citation mechanisms are visually and structurally distinct
