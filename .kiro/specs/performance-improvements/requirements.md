# Requirements Document

## Introduction

Performance improvements for the Harco Agent chat application. The chat interface page currently transfers 2.7 MB / 12 MB of resources with cache disabled. The primary causes are: unconditional DevTools import in production, a monolithic client bundle from a top-level "use client" directive, and unoptimized package imports. This spec covers bundle size reduction through code gating, code-splitting, lazy loading, Next.js configuration, and build-time analysis tooling.

## Glossary

- **Chat_Page**: The main chat interface rendered by `src/app/page.tsx`
- **DevToolsModal**: The `@assistant-ui/react-devtools` debugging overlay, only useful during development
- **Bundle_Analyzer**: The `@next/bundle-analyzer` package that produces a visual treemap of the JavaScript bundle
- **Thread**: The primary chat message stream component (`src/components/assistant-ui/thread.tsx`)
- **Tool_UI**: Components that render tool call results mid-conversation (FileCard, EmailDraftCard, SourceAttachments)
- **Markdown_Renderer**: The markdown rendering pipeline including `@assistant-ui/react-markdown`, `remark-gfm`, and syntax highlighting
- **Next_Config**: The Next.js configuration file at `next.config.ts`
- **SimpleImageAttachmentAdapter**: The `@assistant-ui/react` adapter for handling image file uploads in the composer

## Requirements

### Requirement 1: Gate DevToolsModal on Development with Explicit Opt-In

**User Story:** As a user, I want the production bundle to exclude developer tooling, so that page load is faster and transfer size is reduced.

#### Acceptance Criteria

1. THE Chat_Page SHALL render the DevToolsModal component only when BOTH conditions are met: `NODE_ENV=development` AND the environment variable `SHOW_DEVTOOLSMODAL` is set to `true`
2. IF `NODE_ENV` is not `development`, THEN THE Chat_Page SHALL NOT render the DevToolsModal component regardless of the value of `SHOW_DEVTOOLSMODAL`
3. IF `NODE_ENV=development` AND `SHOW_DEVTOOLSMODAL` is not set or is set to any value other than `true`, THEN THE Chat_Page SHALL NOT render the DevToolsModal component
4. WHILE the application is running with `NODE_ENV=production`, THE Chat_Page SHALL NOT include the `@assistant-ui/react-devtools` module in any client-side JavaScript chunk
5. WHEN `npm run build` completes, THE build output SHALL contain zero references to `@assistant-ui/react-devtools` in any client chunk under `.next/static/`

### Requirement 2: Code-Split the Chat Page

**User Story:** As a user, I want the chat page to load only essential code for first paint, so that the initial page load is fast.

#### Acceptance Criteria

1. THE Chat_Page SHALL be a server component at the top level, with client interactivity (runtime provider, state, event handlers) pushed into a child client component
2. WHEN the Chat_Page renders, THE Tool_UI components (FileCard, EmailDraftCard, SourceAttachments) SHALL be loaded dynamically via `next/dynamic` with SSR disabled
3. WHILE a Tool_UI dynamic chunk is loading, THE Chat_Page SHALL display a skeleton placeholder in the position where the component will appear
4. WHEN a tool call result is received mid-conversation, THE Chat_Page SHALL render the corresponding Tool_UI component within 2 seconds of the chunk request initiating on a standard broadband connection
5. IF a Tool_UI dynamic chunk fails to load, THEN THE Chat_Page SHALL display an inline error indicator in place of the component and SHALL NOT crash or unmount the conversation thread
6. THE Chat_Page initial client JavaScript bundle SHALL be at least 30% smaller (measured in transferred kilobytes) after code-splitting compared to the current monolithic bundle, verified via `next build` output or bundle analyzer

### Requirement 3: Lazy-Load Markdown Rendering

**User Story:** As a user, I want markdown rendering code to load only when assistant messages begin streaming, so that the initial bundle is smaller.

#### Acceptance Criteria

1. WHEN the first assistant message begins streaming, THE Thread SHALL dynamically import the Markdown_Renderer chunk via a separate network request
2. WHILE the Markdown_Renderer chunk is loading, THE Thread SHALL display a visible loading placeholder in place of the rendered markdown content
3. IF the Markdown_Renderer chunk fails to load, THEN THE Thread SHALL retry the import once and, if the retry also fails, display an error message indicating that message rendering is unavailable
4. THE Markdown_Renderer chunk SHALL include `@assistant-ui/react-markdown` and `remark-gfm`
5. THE initial client JavaScript bundle, defined as all scripts loaded before the user sends their first message, SHALL NOT include `@assistant-ui/react-markdown` or `remark-gfm` code
6. WHEN the Markdown_Renderer chunk has been loaded once, THE Thread SHALL reuse the cached module for all subsequent assistant messages without additional network requests

### Requirement 4: Remove Unused SimpleImageAttachmentAdapter

**User Story:** As a developer, I want to remove unused adapters, so that the bundle does not include unnecessary image handling code.

#### Acceptance Criteria

1. IF no image upload workflow is exposed to users in the chat composer, THEN THE Chat_Page SHALL NOT import or instantiate SimpleImageAttachmentAdapter
2. WHEN SimpleImageAttachmentAdapter is removed, THE Chat_Page SHALL initialize the chat runtime by calling useChatRuntime without an attachments adapter and render the thread without thrown exceptions
3. WHEN SimpleImageAttachmentAdapter is removed, THE production build SHALL complete with zero type errors and the application SHALL load in the browser without runtime exceptions
4. WHEN SimpleImageAttachmentAdapter is removed, THE Chat_Page composer SHALL NOT display a file-attachment affordance (e.g., paperclip button) that lacks a functioning upload handler

### Requirement 5: Optimize Package Imports via Next.js Configuration

**User Story:** As a developer, I want Next.js to tree-shake barrel imports from large libraries, so that unused exports are excluded from the bundle.

#### Acceptance Criteria

1. THE Next_Config SHALL include `optimizePackageImports` for `lucide-react`, `@assistant-ui/react`, `radix-ui`, and `@base-ui/react`
2. WHEN the production build runs with the `optimizePackageImports` configuration, THE build system SHALL complete without errors and produce a valid application bundle
3. WHEN the production build completes, THE total client JavaScript bundle size SHALL be at least 5% smaller than a production build of the same codebase without the `optimizePackageImports` configuration

### Requirement 6: Add Bundle Analyzer for Visibility

**User Story:** As a developer, I want to visualize the JavaScript bundle composition, so that I can identify further optimization opportunities.

#### Acceptance Criteria

1. THE project SHALL include `@next/bundle-analyzer` as a dev dependency
2. WHEN the `ANALYZE=true` environment variable is set during build, THE build system SHALL generate an interactive treemap visualization of all JavaScript chunks and open it in the default browser upon build completion
3. IF the `ANALYZE` environment variable is set to `true`, THEN THE Next.js configuration SHALL wrap the base config with the bundle analyzer plugin
4. IF the `ANALYZE` environment variable is not set or is set to any value other than `true`, THEN THE build system SHALL produce a standard Next.js build without loading the bundle analyzer plugin
5. WHEN the `ANALYZE=true` environment variable is set during build, THE build system SHALL complete the build successfully and produce the same build output artifacts as a standard build in addition to the treemap visualization

### Requirement 7: Use next/image for Public Assets

**User Story:** As a user, I want images to be optimized automatically, so that page load is faster on all devices.

#### Acceptance Criteria

1. WHEN a component renders an image from the `public/` directory, THE component SHALL use the `next/image` component with explicit `width` and `height` attributes specified as positive integer values in pixels
2. THE application SHALL NOT use raw `<img>` tags for any images served from the `public/` directory
3. WHEN a component renders an SVG file from the `public/` directory, THE component SHALL either use the `next/image` component with explicit `width` and `height` attributes, or inline the SVG as a React component
4. IF an image in the `public/` directory lacks known intrinsic dimensions, THEN the component SHALL specify `width` and `height` attributes that match the intended rendered size of the image in the layout

### Requirement 8: Audit and Reduce Duplicate UI Libraries

**User Story:** As a developer, I want to eliminate redundant UI library code, so that the bundle does not ship overlapping implementations.

#### Acceptance Criteria

1. THE project SHALL maintain a documented mapping (in a markdown file within the `doc/` directory) of each UI primitive in use (e.g., Button, Tooltip, Dialog, Avatar, Collapsible) to the single library that provides it (`radix-ui`, `@base-ui/react`, `@assistant-ui/react`, or shadcn)
2. WHERE two or more of the listed libraries export a component serving the same interaction role (e.g., both provide a Tooltip or both provide a Dialog), THE project SHALL import that primitive from only one of those libraries and remove the unused library's equivalent from all consuming files
3. WHEN the consolidation is complete, THE project SHALL have no source file that imports the same primitive category from more than one UI library, verifiable by a codebase-wide import search
4. WHEN a production bundle is built, THE bundle analyzer treemap (via `@next/bundle-analyzer` or equivalent configured tool) SHALL show zero instances where the same primitive category ships code from two or more of the listed UI libraries in the same route bundle
