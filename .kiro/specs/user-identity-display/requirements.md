# Requirements Document

## Introduction

Display the authenticated user's name and email in the sidebar footer and automatically append a signature line to AI-generated email drafts. User identity data comes from Supabase Auth user metadata (`display_name`) and the auth user's email address.

## Glossary

- **Sidebar**: The left-side navigation panel (`src/components/app-shell/sidebar.tsx`) containing brand, thread list, and footer
- **Identity_Display**: A UI element in the sidebar footer showing the current user's name and email
- **Email_Draft**: An email generated via the `emailDraft` tool in the chat API route
- **Signature_Line**: A closing line appended to email draft bodies containing the user's name and email
- **User_Metadata**: The `user_metadata` object on the Supabase Auth user record, containing `display_name`
- **Auth_Email**: The email address the user authenticated with, available on the Supabase Auth user object

## Requirements

### Requirement 1: Display User Identity in Sidebar Footer

**User Story:** As a salesperson, I want to see my name and email displayed in the sidebar, so that I can confirm which account I am logged in as.

#### Acceptance Criteria

1. THE Identity_Display SHALL render the user's `display_name` and Auth_Email to the left of the sign-out button in the Sidebar footer
2. WHEN display_name is available, THE Identity_Display SHALL show the display_name on a first line with the standard body font weight, and the Auth_Email on a second line with a smaller font size and muted foreground color
3. WHEN display_name is not available, THE Identity_Display SHALL show only the Auth_Email on a single line with the standard body font weight
4. THE Identity_Display SHALL constrain both text lines to the available space between the left edge of the footer and the sign-out button, and truncate overflowing text with a single trailing ellipsis character per line
5. THE Sidebar SHALL fetch user identity data from the Supabase Auth session available on the client (no additional API call required)
6. IF the Supabase Auth session is unavailable or contains no user email, THEN THE Identity_Display SHALL render nothing in the identity area (sign-out button remains visible)

### Requirement 2: Auto-Insert Signature in Email Drafts

**User Story:** As a salesperson, I want my name and email automatically appended to drafted emails, so that recipients know who the email is from without me manually adding a signature each time.

#### Acceptance Criteria

1. WHEN the emailDraft tool generates an email body, THE Chat_API SHALL append a signature block after the body content before passing the result to the UI
2. THE Signature_Line SHALL contain the user's display_name on one line followed by their Auth_Email on the next line
3. IF display_name is null or an empty string, THEN THE Signature_Line SHALL contain only the Auth_Email
4. THE Signature_Line SHALL be separated from the email body by exactly one blank line
5. THE signature block SHALL be included in all output channels: the rendered card, the Copy action clipboard text, the mailto link body, and the Outlook draft payload
6. THE System_Prompt SHALL NOT instruct the LLM to generate signature content (signature insertion is handled programmatically after tool output)

### Requirement 3: User Data Availability

**User Story:** As a developer, I want user identity data sourced from the existing Supabase Auth user record, so that no additional database tables or queries are needed.

#### Acceptance Criteria

1. THE Chat_API SHALL read display_name from `user_metadata.display_name` on the authenticated user object
2. IF `user_metadata.display_name` is null or an empty string, THEN THE Chat_API SHALL omit the user-name preamble from the system prompt rather than injecting a blank or undefined value
3. THE Chat_API SHALL read Auth_Email from the `email` field on the authenticated user object for use as the sender address in email-draft tool calls
4. THE Sidebar SHALL obtain the user display_name and email from the Supabase Auth client session object already held in memory, without making a separate server round-trip or additional database query
