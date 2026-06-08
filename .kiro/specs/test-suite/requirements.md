# Requirements Document

## Introduction

This spec covers adding a Vitest-based test suite to the harco-agent Next.js project. The goal is to establish test infrastructure and write unit tests for the highest-priority business logic: email domain gating, RAG context retrieval shaping, and API route auth/validation guards.

## Glossary

- **Test_Runner**: Vitest, the unit testing framework configured for the project
- **Login_Gate**: The `isEmailAllowed` function that restricts access to approved domains and explicit email allowlists
- **RAG_Retriever**: The `retrieveContext` function that queries embeddings, deduplicates documents, and shapes context for the LLM
- **Chat_Route**: The POST handler at `/api/chat` that guards access with Supabase auth and streams AI responses
- **Download_Route**: The GET handler at `/api/download` that validates parameters, checks auth, and redirects to signed URLs
- **Supabase_Client**: The server-side Supabase client created via `createClient()` or `createServiceClient()`

## Requirements

### Requirement 1: Test Runner Configuration

**User Story:** As a developer, I want a properly configured Vitest environment, so that I can run unit tests with TypeScript, ESM, and path alias support matching the Next.js project.

#### Acceptance Criteria

1. THE Test_Runner SHALL resolve the TypeScript path alias `@/*` to `./src/*` as defined in the project's `tsconfig.json` `compilerOptions.paths`
2. THE Test_Runner SHALL execute tests using ESM module resolution, compatible with the project's `"type": "module"` setting in `package.json`
3. THE Test_Runner SHALL provide a `test` script in `package.json` that runs all files matching `**/*.test.ts` and `**/*.test.tsx` under the `src/` directory in a single non-watch execution
4. WHEN a test file imports from `@/lib/rag`, THE Test_Runner SHALL resolve it to `./src/lib/rag.ts`
5. THE Test_Runner SHALL use the `node` test environment by default for server-side unit tests

### Requirement 2: Email Domain Gating Tests

**User Story:** As a developer, I want unit tests for the `isEmailAllowed` function, so that I can verify domain restriction logic without calling Supabase auth.

#### Acceptance Criteria

1. WHEN an email with domain `harcofittings.com` is provided, THE Login_Gate SHALL return true
2. WHEN an email with a domain other than `harcofittings.com` is provided and the email is not in the allowlist, THE Login_Gate SHALL return false
3. WHEN an email is present in the `NEXT_PUBLIC_ALLOWED_EMAILS` environment variable (comma-separated list), THE Login_Gate SHALL return true regardless of domain, matching after trimming whitespace and converting to lowercase
4. WHEN an email with mixed casing is provided (e.g., `User@HarcoFittings.com`), THE Login_Gate SHALL return true if the lowercased email matches the allowed domain or the lowercased allowlist entry
5. WHEN the `NEXT_PUBLIC_ALLOWED_EMAILS` variable is empty or unset, THE Login_Gate SHALL still allow `harcofittings.com` domain emails and reject all other domains
6. WHEN an email without an `@` character or an empty string is provided, THE Login_Gate SHALL return false

### Requirement 3: RAG Context Retrieval Shaping Tests

**User Story:** As a developer, I want unit tests for the `retrieveContext` result shaping, so that I can verify deduplication and formatting without calling OpenAI or Supabase.

#### Acceptance Criteria

1. WHEN multiple chunks reference the same `document_id`, THE RAG_Retriever SHALL include that document exactly once in the `documents` array, retaining the field values from the first occurrence encountered
2. WHEN chunks are returned from the database, THE RAG_Retriever SHALL concatenate their `content` fields in the order received and join them with `\n\n---\n\n` separators to produce `contextText`
3. IF no chunks are returned (empty array) or the database call returns an error, THEN THE RAG_Retriever SHALL return `contextText` as an empty string (`""`) and `documents` as an empty array (`[]`)
4. WHEN chunks are returned, THE RAG_Retriever SHALL map each unique document into the `documents` array with the fields `id` (from `document_id`), `title` (from `document_title`), `file_type` (from `document_file_type`), and `file_size_bytes` (from `document_file_size_bytes`)
5. WHEN chunks are returned, THE RAG_Retriever SHALL process at most 5 chunks as bounded by MATCH_COUNT, producing a `contextText` with at most 4 separator sequences

### Requirement 4: Chat Route Auth Guard Tests

**User Story:** As a developer, I want unit tests for the chat route's authentication guard, so that I can verify unauthorized requests are rejected without calling OpenAI.

#### Acceptance Criteria

1. WHEN `supabase.auth.getUser()` returns an error, THE Chat_Route SHALL respond with HTTP status 401 and a text body of "Unauthorized" without invoking the OpenAI streaming call
2. WHEN `supabase.auth.getUser()` returns no user (null) and no error, THE Chat_Route SHALL respond with HTTP status 401 and a text body of "Unauthorized" without invoking the OpenAI streaming call
3. WHEN `supabase.auth.getUser()` returns a valid user object, THE Chat_Route SHALL invoke the OpenAI streaming call and return a non-401 response
4. WHEN an unauthorized request is rejected, THE Chat_Route SHALL not parse the request body or call `retrieveContext`

### Requirement 5: Download Route Validation Tests

**User Story:** As a developer, I want unit tests for the download route's parameter validation and auth guard, so that I can verify error responses without calling Supabase storage.

#### Acceptance Criteria

1. WHEN `supabase.auth.getUser()` returns an error or no user, THE Download_Route SHALL respond with HTTP status 401 and body "Unauthorized"
2. WHEN the request has no `document_id` query parameter and the user is authenticated, THE Download_Route SHALL respond with HTTP status 400 and body "Missing document_id parameter"
3. WHEN the `document_id` does not match any document in the database, THE Download_Route SHALL respond with HTTP status 404 and body "Document not found"
4. WHEN all validations pass and signed URL generation succeeds, THE Download_Route SHALL respond with HTTP status 307 redirecting to the signed storage URL
5. IF signed URL generation fails after document lookup succeeds, THEN THE Download_Route SHALL respond with HTTP status 500 and body "Failed to generate download URL"
