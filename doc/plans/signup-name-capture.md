# Plan: Capture user name at signup and use it in chat responses

## Context

Auth is magic-link / OTP (`signInWithOtp`) with email only — there is no name on
the account. The assistant currently addresses every user as "John Fralick"
because that name is pulled from the RAG'd documents, not from any stored user
identity. The system prompt (`src/lib/system-prompt.ts`) never passes a user
name to the model.

Goal: collect each user's name on their first sign-in, store it as the Supabase
**display name** (`user_metadata.display_name`), and inject that name into the
chat system prompt so the assistant addresses the actual logged-in user and
stops borrowing names out of the documents.

### Decisions (confirmed with user)
- **Scope:** capture + store the name AND wire it into the chat prompt.
- **Capture point:** a name input on the existing login form, above the email input.
- **Repeat visits:** show name + email on a device's first sign-in; once the user
  has completed sign-in from that browser, hide the name field on later visits
  (local flag). Name is required only when the field is shown.
- **Storage:** `user_metadata.display_name` via the OTP `options.data` payload.
  No DB migration, no profiles table, no separate onboarding screen.

### Magic-link constraint (drives the design)
The login form cannot tell a new user from a returning one before sending the
link (no safe client-side existence check). Supabase writes `options.data` only
on account *creation* and ignores it on later logins. So the device-local flag
is a heuristic: a returning user on a brand-new browser will see the name field
once and the value they type is simply discarded (harmless).

## Changes

### 1. `src/lib/onboarding.ts` (new, tiny)
Single shared constant for the device flag so login and the app shell don't drift:
```ts
export const SIGNED_IN_FLAG = "harco-signed-in";
```

### 2. `src/app/login/page.tsx`
- Add `name` state and a `showName` state (default `true`).
- In a `useEffect`, set `showName = false` when `localStorage.getItem(SIGNED_IN_FLAG)`
  is present (returning device → hide the field).
- Render a **Name** input above the Work-email input in `RequestForm`, only when
  `showName` is true. Style it to match the existing email input block.
- Validation: when `showName` is true, require a non-empty trimmed name before
  sending; show the existing error treatment if empty.
- Pass the name into the OTP call:
  ```ts
  supabase.auth.signInWithOtp({
    email: target,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: name.trim() ? { display_name: name.trim() } : undefined,
    },
  });
  ```
- Thread `name` through to `SentPanel`'s resend call too (so a resend after an
  expired link still carries the name).

### 3. `src/components/chat-client.tsx`
- Add a `useEffect` on mount that sets `localStorage.setItem(SIGNED_IN_FLAG, "1")`.
  Reaching this component means the user is authenticated, so this reliably marks
  the device as "has signed in" → the login name field hides next time.

### 4. `src/lib/system-prompt.ts`
- Add a small pure helper (keeps it unit-testable):
  ```ts
  export function buildUserPreamble(displayName?: string): string {
    if (!displayName) return "";
    return `You are assisting ${displayName}. Address them by their first name only when it reads naturally. IMPORTANT: never address the user by any personal name found in the context documents (email senders/recipients, letter signatories, etc.) — those names belong to the documents, not the current user.`;
  }
  ```

### 5. `src/app/api/chat/route.ts`
- After `requireAuth()` passes, get the user to read the display name:
  ```ts
  const supabase = await createClient();           // from "@/lib/supabase/server"
  const { data: { user } } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.display_name as string | undefined;
  ```
- Fold the preamble into the system string (between `SYSTEM_PROMPT` and the doc context):
  ```ts
  const preamble = buildUserPreamble(displayName);
  const systemWithContext = `${SYSTEM_PROMPT}${preamble ? `\n\n${preamble}` : ""}\n\n${formatDocumentContext(contextDocs, contextText)}`;
  ```
- Under `SKIP_AUTH=true` (dev), `getUser()` returns no user → `displayName`
  undefined → no preamble. No crash, existing behavior preserved.

## Reused / existing pieces
- `isEmailAllowed` / `ALLOWED_DOMAIN` from `@/lib/email` — unchanged, still gates email.
- `createClient` from `@/lib/supabase/server` — already used elsewhere in the route layer.
- `requireAuth` from `@/lib/auth` — unchanged.

## Verification
1. **Fresh device first sign-in:** clear `localStorage`, load `/login` → Name field
   shows above email, and is required (submitting empty shows the error). Enter a
   name + Harco email, complete the magic link.
2. **Display name stored:** confirm in Supabase (Auth → Users → Display name, or
   `user_metadata.display_name`) that the entered name is saved.
3. **Repeat visit:** sign out / revisit `/login` on the same browser → Name field
   is hidden, email-only flow as before.
4. **Responses fixed:** in chat, ask "what's my name?" / request an email draft →
   assistant uses the entered name and no longer says "John Fralick".
5. **Unit test:** add a test for `buildUserPreamble` (empty input → "", a name →
   string containing the name and the "never use document names" instruction).
   Run `npm test`.
6. **Lint/build:** `npm run lint` and `npm run build` clean.
