# Requirements Document

## Introduction

Multi-thread chat history with persistent storage and sidebar navigation for the Harco Agent app. Replaces the current single in-memory thread runtime with a Supabase-backed multi-thread system. Users can create, browse, rename, archive, and delete conversation threads, with history grouped by date in the sidebar.

## Glossary

- **Thread_Service**: The server-side API routes that handle CRUD operations on threads and messages stored in Supabase
- **Thread_List_UI**: The sidebar component built on `ThreadListPrimitive` that displays the user's thread history grouped by date
- **Chat_Runtime**: The assistant-ui runtime instance (`useRemoteThreadListRuntime`) that coordinates thread state between the client adapter and the backend
- **Remote_Thread_Adapter**: The client-side `RemoteThreadListAdapter` implementation that communicates with Thread_Service to sync thread data
- **Thread**: A single conversation belonging to one user, containing zero or more messages
- **Message**: A single user or assistant turn within a Thread, storing role, content, and metadata in the assistant-ui `withFormat` shape
- **Date_Group**: A UI grouping label applied to threads in Thread_List_UI based on the thread's last activity timestamp ("Today", "Earlier this week", "Earlier")

## Requirements

### Requirement 1: Thread Persistence Schema

**User Story:** As a user, I want my chat conversations to be saved to the database, so that I can return to them across sessions and devices.

#### Acceptance Criteria

1. THE Thread_Service SHALL store threads in a `threads` table with columns: `id` (text, PK, default gen_random_uuid()::text), `user_id` (uuid, FK to auth.users, not null), `title` (text, nullable), `archived_at` (timestamptz, nullable), `created_at` (timestamptz, not null, default now()), `updated_at` (timestamptz, not null, default now())
2. THE Thread_Service SHALL store messages in a `messages` table with columns: `id` (text, PK), `thread_id` (text, FK to threads, not null), `parent_id` (text, nullable), `format` (text, not null), `content` (jsonb, not null), `created_at` (timestamptz, not null, default now())
3. THE Thread_Service SHALL enforce Row Level Security on the `threads` table so that authenticated users can only select, insert, update, and delete rows where `user_id` matches `auth.uid()`
4. THE Thread_Service SHALL enforce Row Level Security on the `messages` table so that authenticated users can only select and insert messages where the `thread_id` references a thread owned by the same user
5. WHEN a thread is deleted, THE Thread_Service SHALL cascade-delete all associated messages via the foreign key constraint
6. THE Thread_Service SHALL create an index on `threads(user_id)` and an index on `messages(thread_id)` for query performance
7. THE Thread_Service SHALL provide a migration file in `supabase/migrations/` that creates both tables, RLS policies, and indexes

### Requirement 2: Thread CRUD API Routes

**User Story:** As a developer, I want server-side API routes for thread operations, so that the client adapter has a stable interface for persistence.

#### Acceptance Criteria

1. WHEN a GET request is made to the threads endpoint, THE Thread_Service SHALL return all non-archived threads for the authenticated user ordered by `updated_at` descending, each including `id`, `title`, `archived_at`, `created_at`, and `updated_at` fields
2. WHEN a POST request is made to the threads endpoint, THE Thread_Service SHALL create a new thread with a null title and return the created thread's `id`, `created_at`, and `updated_at` fields
3. WHEN a PATCH request is made to a specific thread endpoint with a `title` field, THE Thread_Service SHALL update the thread title to the provided value (maximum 100 characters, trimmed of leading/trailing whitespace) and return the updated thread
4. WHEN a PATCH request is made to a specific thread endpoint with `archived_at` set to a timestamp value, THE Thread_Service SHALL set the archived timestamp and return the updated thread
5. WHEN a PATCH request is made to a specific thread endpoint with `archived_at` set to null, THE Thread_Service SHALL clear the archived timestamp (unarchive) and return the updated thread
6. WHEN a DELETE request is made to a specific thread endpoint, THE Thread_Service SHALL delete the thread and all of its associated messages and return a 200 response with no body
7. IF the authenticated user does not own the requested thread, THEN THE Thread_Service SHALL return a 404 response
8. IF the request lacks a valid authentication session, THEN THE Thread_Service SHALL return a 401 response
9. IF a PATCH request provides a `title` exceeding 100 characters, THEN THE Thread_Service SHALL return a 400 response with an error message indicating the title length constraint

### Requirement 3: Message Persistence API Routes

**User Story:** As a developer, I want server-side API routes for reading and writing messages, so that thread history loads on navigation and new messages are saved in real time.

#### Acceptance Criteria

1. WHEN a GET request is made to the messages endpoint for a thread, THE Thread_Service SHALL return all messages for that thread ordered by `created_at` ascending as a JSON array
2. WHEN a POST request is made to the messages endpoint for a thread with a valid JSON body containing `id` (string), `parent_id` (string or null), `format` (string), and `content` (object), THE Thread_Service SHALL insert the message and return the created record with a 201 status code
3. IF the authenticated user does not own the parent thread or the thread does not exist, THEN THE Thread_Service SHALL return a 404 response for message operations
4. IF the POST request body is missing any required field (`id`, `parent_id`, `format`, `content`) or contains a non-object `content` value, THEN THE Thread_Service SHALL return a 400 response with an error message indicating the validation failure
5. IF the request lacks a valid authenticated session, THEN THE Thread_Service SHALL return a 401 response
6. THE Thread_Service SHALL store the message payload as-is without transforming or validating the internal structure of the `content` field

### Requirement 4: Remote Thread List Adapter

**User Story:** As a developer, I want a RemoteThreadListAdapter that bridges the assistant-ui runtime to the backend API routes, so that the runtime handles thread lifecycle automatically.

#### Acceptance Criteria

1. THE Remote_Thread_Adapter SHALL implement the `RemoteThreadListAdapter` interface from `@assistant-ui/react`, providing all required methods: `list()`, `initialize()`, `rename()`, `archive()`, `unarchive()`, `delete()`, `generateTitle()`, and `unstable_Provider`
2. WHEN the adapter's `list()` method is called, THE Remote_Thread_Adapter SHALL call the threads GET endpoint and return the full array of thread metadata objects to the runtime
3. WHEN the runtime requests a new thread, THE Remote_Thread_Adapter SHALL call the threads POST endpoint and return the created thread's `remoteId`, `title`, and `status` to the runtime
4. WHEN the runtime requests thread rename, THE Remote_Thread_Adapter SHALL call the threads PATCH endpoint with the new title
5. WHEN the runtime requests thread archive, THE Remote_Thread_Adapter SHALL call the threads PATCH endpoint with `archived_at` set to the current timestamp
6. WHEN the runtime requests thread unarchive, THE Remote_Thread_Adapter SHALL call the threads PATCH endpoint with `archived_at` set to null
7. WHEN the runtime requests thread deletion, THE Remote_Thread_Adapter SHALL call the threads DELETE endpoint
8. IF a thread endpoint responds with an HTTP error status, THEN THE Remote_Thread_Adapter SHALL throw an error containing the response status code so the runtime can surface the failure
9. THE Remote_Thread_Adapter SHALL implement a `ThreadHistoryAdapter` via the `unstable_Provider` that exposes `load()` to fetch messages from the messages GET endpoint and `append(message)` to persist a message via the messages POST endpoint for the active thread

### Requirement 5: Runtime Migration

**User Story:** As a user, I want my conversations to persist across page reloads and sessions, so that I never lose context.

#### Acceptance Criteria

1. THE Chat_Runtime SHALL use `useRemoteThreadListRuntime` instead of `useChatRuntime` as the primary runtime provider
2. THE Chat_Runtime SHALL pass the Remote_Thread_Adapter and a chat adapter (with the existing `/api/chat` endpoint) to the runtime factory
3. THE Chat_Runtime SHALL register `SimpleImageAttachmentAdapter` on the per-thread chat runtime so that image attachments in the composer are preserved during the migration
4. WHEN the page loads, THE Chat_Runtime SHALL restore the thread with the most recent `updated_at` timestamp among the authenticated user's non-archived threads
5. IF the authenticated user has no existing threads on page load, THEN THE Chat_Runtime SHALL create a new empty thread and present the composer in its initial state
6. IF the Remote_Thread_Adapter fails to load the thread list within 10 seconds, THEN THE Chat_Runtime SHALL display an error indication and allow the user to retry

### Requirement 6: Thread List Sidebar UI

**User Story:** As a user, I want to see my past conversations in the sidebar grouped by date, so that I can quickly find and resume any previous thread.

#### Acceptance Criteria

1. THE Thread_List_UI SHALL render thread items using `ThreadListPrimitive.Root` and `ThreadListPrimitive.Items` from assistant-ui
2. THE Thread_List_UI SHALL group threads into Date_Groups: "Today", "Earlier this week", and "Earlier" based on each thread's `updated_at` timestamp, where "Today" includes threads updated since midnight in the user's local timezone, "Earlier this week" includes threads updated since the most recent Monday at midnight local time but before today, and "Earlier" includes all remaining threads
3. THE Thread_List_UI SHALL display each thread item with its title, or if no title is set, a plain-text preview truncated to a maximum of 50 characters (with trailing ellipsis) derived from the first user message in the thread
4. THE Thread_List_UI SHALL sort threads within each Date_Group by `updated_at` descending (most recently updated first)
5. WHEN a thread item is clicked, THE Thread_List_UI SHALL switch the active thread in the Chat_Runtime
6. THE Thread_List_UI SHALL apply a visually distinct background color to the currently active thread item, differentiating it from inactive items
7. WHEN the thread list is empty, THE Thread_List_UI SHALL display a message indicating no previous conversations exist

### Requirement 7: New Thread Creation

**User Story:** As a user, I want the "New question" button to create a new persistent thread, so that each conversation is saved independently.

#### Acceptance Criteria

1. WHEN the "New question" button is clicked, THE Thread_List_UI SHALL create a new thread via the Chat_Runtime and display it at the top of the "Today" Date_Group with a default title of "New conversation"
2. WHEN a new thread is created, THE Chat_Runtime SHALL switch to the new thread and present the composer with no messages and an empty input field
3. WHEN a new thread is created on a viewport at or below the mobile breakpoint (860px), THE Thread_List_UI SHALL close the sidebar drawer
4. IF thread creation fails due to a network or server error, THEN THE Thread_List_UI SHALL display an error message indicating the thread could not be created and SHALL remain on the current thread without losing any in-progress input

### Requirement 8: Thread Operations from Sidebar

**User Story:** As a user, I want to rename, archive, and delete threads from the sidebar, so that I can organize my conversation history.

#### Acceptance Criteria

1. WHEN the user triggers rename on a thread item, THE Thread_List_UI SHALL present an inline editable text field pre-filled with the current title and select all text for immediate replacement
2. WHEN the user confirms a rename by pressing Enter or blurring the editable field, THE Thread_List_UI SHALL validate that the title is not empty or whitespace-only and contains at most 100 characters, then call the Chat_Runtime to persist the new title
3. IF the user submits an invalid rename title (empty, whitespace-only, or exceeding 100 characters), THEN THE Thread_List_UI SHALL revert the field to the previous title and display an inline error indication
4. WHEN the user presses Escape while the rename field is active, THE Thread_List_UI SHALL cancel the rename and revert the field to the previous title without calling the Chat_Runtime
5. WHEN the user triggers archive on a thread item, THE Thread_List_UI SHALL call the Chat_Runtime to archive the thread and remove it from the visible list
6. WHEN the user triggers delete on a thread item, THE Thread_List_UI SHALL display a confirmation prompt using the Dialog component before proceeding
7. WHEN the user confirms deletion in the confirmation prompt, THE Thread_List_UI SHALL call the Chat_Runtime to permanently delete the thread and its messages
8. IF the deleted or archived thread was the active thread, THEN THE Chat_Runtime SHALL switch to the most recently updated remaining thread, or create a new thread if none remain
9. IF a rename, archive, or delete operation fails, THEN THE Thread_List_UI SHALL revert any optimistic UI changes and display an error message indicating which operation failed

### Requirement 9: Auto-Title Generation

**User Story:** As a user, I want threads to receive a meaningful title automatically after the first exchange, so that I can identify them in the sidebar without manual effort.

#### Acceptance Criteria

1. WHEN the first assistant response completes in a new thread that has no title, THE Thread_Service SHALL generate a title between 2 and 60 characters in length derived from the conversation topic
2. THE Thread_Service SHALL derive the title from the user's first message content and the assistant's first response
3. WHEN a title is generated, THE Thread_List_UI SHALL display the new title in the corresponding thread item within 2 seconds of generation completing, without requiring a page reload
4. IF title generation fails due to a service error or timeout, THEN THE Thread_Service SHALL leave the thread title null and the Thread_List_UI SHALL continue displaying the first message preview as the thread label
5. IF the user's first message contains fewer than 2 words of text content, THEN THE Thread_Service SHALL still attempt title generation using whatever content is available including the assistant's response
