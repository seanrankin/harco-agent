# UI Library Mapping

Tracks which library owns each UI primitive in the Harco Agent codebase. This prevents bundle bloat from shipping duplicate implementations of the same interaction pattern.

## Libraries in Use

| Library                      | Role                                    | Package                         |
| ---------------------------- | --------------------------------------- | ------------------------------- |
| @base-ui/react               | Headless primitives (unstyled)          | `@base-ui/react`                |
| radix-ui                     | Headless primitives (unstyled)          | `radix-ui`                      |
| shadcn                       | Styled wrappers in `src/components/ui/` | local (built on @base-ui/react) |
| @assistant-ui/react          | Chat-specific primitives                | `@assistant-ui/react`           |
| @assistant-ui/react-markdown | Markdown rendering                      | `@assistant-ui/react-markdown`  |

## Primitive Ownership

### General UI Primitives (src/components/ui/)

| Primitive   | Library        | File                                                   |
| ----------- | -------------- | ------------------------------------------------------ |
| Button      | @base-ui/react | `src/components/ui/button.tsx`                         |
| Tooltip     | @base-ui/react | `src/components/ui/tooltip.tsx`                        |
| Dialog      | @base-ui/react | `src/components/ui/dialog.tsx`                         |
| Avatar      | @base-ui/react | `src/components/ui/avatar.tsx`                         |
| Collapsible | @base-ui/react | `src/components/ui/collapsible.tsx`                    |
| ~~Slot~~    | ~~radix-ui~~   | Removed - consolidated to @base-ui/react `render` prop |

### Chat Primitives (@assistant-ui/react)

| Primitive                | Purpose                                            | Used In                        |
| ------------------------ | -------------------------------------------------- | ------------------------------ |
| ThreadPrimitive          | Thread container, viewport, scroll, suggestions    | `thread.tsx`                   |
| ComposerPrimitive        | Message input, send, cancel, attachments           | `thread.tsx`, `attachment.tsx` |
| MessagePrimitive         | Message wrapper, parts, grouped parts, attachments | `thread.tsx`, `attachment.tsx` |
| ActionBarPrimitive       | Copy, reload, edit, export actions                 | `thread.tsx`                   |
| ActionBarMorePrimitive   | Overflow menu for actions                          | `thread.tsx`                   |
| BranchPickerPrimitive    | Navigate message branches                          | `thread.tsx`                   |
| AttachmentPrimitive      | Attachment root, name, remove                      | `attachment.tsx`               |
| ErrorPrimitive           | Error display in messages                          | `thread.tsx`                   |
| AuiIf                    | Conditional rendering helper                       | `thread.tsx`                   |
| AssistantRuntimeProvider | Runtime context provider                           | `chat-client.tsx`              |
| makeAssistantToolUI      | Register tool call renderers                       | `chat-client.tsx`              |
| makeAssistantDataUI      | Register data renderers                            | `source-attachments.tsx`       |

### Markdown Primitives (@assistant-ui/react-markdown)

| Primitive                 | Purpose                   | Used In             |
| ------------------------- | ------------------------- | ------------------- |
| MarkdownTextPrimitive     | Renders markdown content  | `markdown-text.tsx` |
| memoizeMarkdownComponents | Memoization helper        | `markdown-text.tsx` |
| useIsMarkdownCodeBlock    | Code block detection hook | `markdown-text.tsx` |

## Overlaps

### Slot / Composition Pattern

| Capability                           | radix-ui             | @base-ui/react |
| ------------------------------------ | -------------------- | -------------- |
| Component composition (polymorphism) | `Slot` + `Slottable` | `render` prop  |

**Status:** Resolved. The `Slot` from `radix-ui` was removed. The `@base-ui/react` `render` prop pattern (already used by TooltipTrigger) now handles composition exclusively. Children are passed through directly without `Slottable`.

### No Other Overlaps Detected

The remaining primitives are unique to their respective libraries:

- `@base-ui/react` provides general UI building blocks (Button, Tooltip, Dialog, Avatar, Collapsible)
- `@assistant-ui/react` provides chat-specific primitives (Thread, Composer, Message, ActionBar, etc.)
- These two libraries do not overlap in functionality within this codebase

## Recommendation

1. ~~Remove the `radix-ui` Slot usage in `tooltip-icon-button.tsx`~~ Done - refactored to use direct children with `@base-ui/react`'s `render` prop pattern.
2. Keep `@base-ui/react` as the sole provider of general UI primitives.
3. Keep `@assistant-ui/react` as the sole provider of chat primitives (no overlap with general UI).
4. The `radix-ui` package remains in `package.json` but has zero direct imports from source code. It can be removed from `dependencies` if no transitive dependency requires it.
