# Requirements Document

## Introduction

Add a "Send to Outlook" button to the EmailDraftCard component that uses the Microsoft Graph API to create a draft email in the user's Outlook mailbox with file attachments. This enables salespeople to send product documents (PDFs, spec sheets) directly to prospects without the limitations of mailto: links, which cannot handle attachments.

## Glossary

- **Outlook_Button**: The "Send to Outlook" UI button rendered in the EmailDraftCard footer, to the left of the existing "Draft an Email" button.
- **Graph_API_Client**: The server-side component that authenticates with Microsoft Graph API and creates draft messages with attachments.
- **Email_Draft**: The email content (to, subject, body) produced by the AI assistant's emailDraft tool call.
- **File_Attachment**: A document stored in Supabase Storage that is attached to the Outlook draft. Includes both fileReference documents and source documents.
- **OAuth_Flow**: The Microsoft identity platform authorization code flow used to obtain access tokens for sending emails on behalf of the user.
- **Draft_Message**: A message created in the user's Outlook Drafts folder via Microsoft Graph, ready for the user to review and send.

## Requirements

### Requirement 1: Outlook Button Placement

**User Story:** As a salesperson, I want a clearly visible "Send to Outlook" button on my email drafts, so that I can quickly send the draft with attachments to my Outlook client.

#### Acceptance Criteria

1. THE Outlook_Button SHALL be rendered in the EmailDraftCard footer to the left of the existing "Draft an Email" button.
2. THE Outlook_Button SHALL display a Microsoft Outlook icon and the label "Send to Outlook".
3. IF the user is not authenticated with Microsoft WHEN the Outlook_Button is clicked, THEN THE Outlook_Button SHALL initiate the OAuth_Flow, and upon successful authentication, proceed to the draft creation flow automatically.
4. IF the user is authenticated with Microsoft WHEN the Outlook_Button is clicked, THEN THE System SHALL create a draft in the user's Outlook mailbox containing the email To, Subject, Body fields and any attachments from the EmailDraftCard, and display a success confirmation within the EmailDraftCard footer for 3 seconds.
5. IF the OAuth_Flow fails or the user denies consent, THEN THE System SHALL display an error message indicating the authentication was not completed and the Outlook_Button SHALL remain in its default state.
6. IF the draft creation request to Microsoft fails, THEN THE System SHALL display an error message indicating the draft could not be created and the Outlook_Button SHALL return to its default state.
7. WHILE the draft creation request is in progress, THE Outlook_Button SHALL display a loading indicator and be disabled to prevent duplicate submissions.

### Requirement 2: Microsoft OAuth Authentication

**User Story:** As a salesperson, I want to sign in with my Microsoft account once, so that the app can create drafts in my Outlook mailbox without repeated sign-in prompts.

#### Acceptance Criteria

1. WHEN the user clicks the Outlook_Button and no valid access token or refresh token exists in the current session, THE OAuth_Flow SHALL open a popup window to the Microsoft identity platform authorization endpoint.
2. THE OAuth_Flow SHALL request the `Mail.ReadWrite` permission scope to create draft messages with attachments.
3. WHEN Microsoft returns an authorization code, THE Graph_API_Client SHALL exchange the code for access and refresh tokens within 10 seconds.
4. THE Graph_API_Client SHALL store tokens in an HTTP-only, Secure, SameSite=Strict cookie or server-side session inaccessible to client-side JavaScript.
5. WHEN a stored access token has expired and an API call is attempted, THE Graph_API_Client SHALL use the refresh token to obtain a new access token without user interaction.
6. IF the refresh token is invalid or revoked, THEN THE OAuth_Flow SHALL open a popup for the user to re-authenticate and display a message indicating the session has expired.
7. IF the user denies consent or the authorization request fails, THEN THE OAuth_Flow SHALL close the popup and display an error message indicating that Microsoft permissions were not granted.
8. IF the token exchange request fails or times out, THEN THE OAuth_Flow SHALL close the popup and display an error message indicating the sign-in could not be completed and allow the user to retry.

### Requirement 3: Create Draft with Attachments

**User Story:** As a salesperson, I want my email draft created in Outlook with all relevant product documents attached, so that my prospect receives everything they need in one email.

#### Acceptance Criteria

1. WHEN the user clicks the Outlook_Button with an active Microsoft session, THE Graph_API_Client SHALL create a Draft_Message in the user's Outlook Drafts folder via the Microsoft Graph POST /me/messages endpoint.
2. THE Draft_Message SHALL contain the to, subject, and body fields from the Email_Draft, with the body formatted as HTML content type.
3. THE Graph_API_Client SHALL attach all File_Attachments that were rendered as fileReference tool calls in the same assistant message.
4. THE Graph_API_Client SHALL attach all documents listed in the Sources section of the same assistant message.
5. THE Graph_API_Client SHALL deduplicate attachments by document_id so that a document appearing in both fileReference calls and Sources is attached only once.
6. WHEN attaching a file, THE Graph_API_Client SHALL download the file content from Supabase Storage using a signed URL with 3600-second expiry and upload it as a base64-encoded attachment to the Draft_Message.
7. IF a file exceeds 3 MB, THEN THE Graph_API_Client SHALL use the Microsoft Graph upload session API for large attachments.
8. IF a file download from Supabase Storage fails, THEN THE Graph_API_Client SHALL skip that attachment and continue processing the remaining attachments.

### Requirement 4: Attachment Resolution

**User Story:** As a salesperson, I want all referenced documents automatically included, so that I do not have to manually find and attach files.

#### Acceptance Criteria

1. WHEN resolving attachments, THE Graph_API_Client SHALL query the documents table to retrieve storage_path, title, and file_type for each document ID.
2. WHEN resolving attachments, THE Graph_API_Client SHALL generate a signed URL from Supabase Storage with a 3600-second expiry for each document's storage_path.
3. THE Graph_API_Client SHALL set the attachment filename to the document title concatenated with a dot and the file_type value from the documents table (e.g., "Product Spec.pdf").
4. IF a document ID does not exist in the database, THEN THE Graph_API_Client SHALL skip that attachment and continue processing the remaining attachments.
5. IF signed URL generation fails for a document, THEN THE Graph_API_Client SHALL skip that attachment and continue processing the remaining attachments.

### Requirement 5: User Feedback and Error Handling

**User Story:** As a salesperson, I want clear feedback on whether my email draft was created successfully, so that I know when to check my Outlook Drafts folder.

#### Acceptance Criteria

1. WHILE the draft creation is in progress, THE Outlook_Button SHALL display a loading state with a spinner indicator and SHALL be non-interactive until the operation completes or fails.
2. WHEN the Draft_Message is created successfully, THE Outlook_Button SHALL display a success state with a checkmark and the text "Sent to Drafts".
3. IF the Graph_API_Client fails to create the draft, THEN THE Outlook_Button SHALL display an error state with text indicating the nature of the failure (e.g., authentication, network, or permissions).
4. IF one or more attachments fail to upload but the draft is created, THEN THE Outlook_Button SHALL display a partial success state indicating the count of attachments successfully included out of the total attempted.
5. WHEN the success or partial success state is displayed, THE Outlook_Button SHALL return to its default state after 3 seconds.
6. WHEN the error state is displayed, THE Outlook_Button SHALL return to its default state after 5 seconds, allowing the user to retry.

### Requirement 6: API Route for Draft Creation

**User Story:** As a developer, I want a server-side API route that handles the Microsoft Graph interaction, so that tokens and file content are never exposed to the client.

#### Acceptance Criteria

1. THE endpoint SHALL be exposed as a POST route at `/api/outlook/send-draft`.
2. THE endpoint SHALL require authentication via the existing requireAuth helper.
3. THE endpoint SHALL accept a JSON body containing: `to` (a string email address), `subject` (a string, max 255 characters), `body` (an HTML string, max 100,000 characters), and `documentIds` (an array of UUID strings, max 20 items).
4. IF the request body is missing required fields or any field fails validation (invalid email format, subject exceeds 255 characters, body exceeds 100,000 characters, documentIds exceeds 20 items, or documentIds contains non-UUID values), THEN THE endpoint SHALL return a 400 status with an error message indicating which validation failed.
5. THE endpoint SHALL return a JSON response with the created draft message ID and attachment count with a 200 status on success.
6. IF the Microsoft access token is missing or expired without a valid refresh token, THEN THE endpoint SHALL return a 401 status indicating re-authentication is required.
7. IF one or more document IDs cannot be found in the database, THE endpoint SHALL proceed with the documents that were found and report the missing IDs in the response.
8. IF the Microsoft Graph API request fails for any reason other than token expiry, THEN THE endpoint SHALL return a 502 status with an error message indicating the upstream service failed.

### Requirement 7: Microsoft App Registration Configuration

**User Story:** As a developer, I want the Microsoft app registration configured via environment variables, so that the deployment stays portable across environments.

#### Acceptance Criteria

1. THE Graph_API_Client SHALL read the Microsoft application (client) ID from the `MICROSOFT_CLIENT_ID` environment variable.
2. THE Graph_API_Client SHALL read the Microsoft client secret from the `MICROSOFT_CLIENT_SECRET` environment variable.
3. THE Graph_API_Client SHALL read the OAuth redirect URI from the `MICROSOFT_REDIRECT_URI` environment variable.
4. IF any required Microsoft environment variable (`MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI`) is missing or set to an empty string, THEN THE Outlook_Button SHALL not be rendered in the UI.
5. IF any required Microsoft environment variable is missing or empty, THEN THE Graph_API_Client SHALL log a warning at application startup indicating which variable is missing.
6. THE Graph_API_Client SHALL treat all three Microsoft environment variables as server-only (no `NEXT_PUBLIC_` prefix), ensuring they are never exposed to the browser.
