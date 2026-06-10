import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("MarkdownSkeleton", () => {
  beforeEach(() => {
    vi.resetModules();

    // Mock all heavy dependencies that thread.tsx imports
    vi.doMock("@/components/assistant-ui/attachment", () => ({
      ComposerAttachments: () => null,
      UserMessageAttachments: () => null,
    }));
    vi.doMock("@/components/assistant-ui/reasoning", () => ({
      Reasoning: () => null,
      ReasoningContent: () => null,
      ReasoningRoot: () => null,
      ReasoningText: () => null,
      ReasoningTrigger: () => null,
    }));
    vi.doMock("@/components/assistant-ui/tool-fallback", () => ({
      ToolFallback: () => null,
    }));
    vi.doMock("@/components/assistant-ui/tooltip-icon-button", () => ({
      TooltipIconButton: () => null,
    }));
    vi.doMock("@/components/ui/button", () => ({
      Button: () => null,
    }));
    vi.doMock("@/lib/utils", () => ({
      cn: (...args: string[]) => args.filter(Boolean).join(" "),
    }));
    vi.doMock("@assistant-ui/react", () => ({
      ActionBarMorePrimitive: {
        Root: () => null,
        Trigger: () => null,
        Content: () => null,
        Item: () => null,
      },
      ActionBarPrimitive: {
        Root: () => null,
        Copy: () => null,
        Reload: () => null,
        Edit: () => null,
        ExportMarkdown: () => null,
      },
      AuiIf: () => null,
      BranchPickerPrimitive: {
        Root: () => null,
        Previous: () => null,
        Next: () => null,
        Number: () => null,
        Count: () => null,
      },
      ComposerPrimitive: {
        Root: () => null,
        Input: () => null,
        Send: () => null,
        Cancel: () => null,
        AttachmentDropzone: () => null,
      },
      ErrorPrimitive: { Root: () => null, Message: () => null },
      groupPartByType: () => () => null,
      MessagePrimitive: {
        Root: () => null,
        Parts: () => null,
        GroupedParts: () => null,
        Error: () => null,
      },
      ThreadPrimitive: {
        Root: () => null,
        Viewport: () => null,
        Messages: () => null,
        ViewportFooter: () => null,
        ScrollToBottom: () => null,
        Suggestion: () => null,
      },
      useAuiState: () => null,
    }));
    vi.doMock("next/dynamic", () => ({
      default: vi.fn((loader: () => Promise<any>) => {
        const Comp = () => "dynamic-component";
        (Comp as any).__dynamicLoader = loader;
        return Comp;
      }),
    }));
    vi.doMock("@/components/brand/diamond", () => ({
      Diamond: () => null,
    }));
    vi.doMock("@/components/assistant-ui/markdown-text", () => ({
      MarkdownText: () => "MarkdownRendered",
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("MarkdownSkeleton returns a JSX element with aria-busy='true'", async () => {
    const { MarkdownSkeleton } = await import("./thread");

    // Call the component function directly (no React DOM needed)
    const element = MarkdownSkeleton({}) as React.ReactElement<any>;

    expect(element).toBeDefined();
    expect(element.props["aria-busy"]).toBe("true");
    expect(element.props["aria-label"]).toBe("Loading message");
  });

  it("MarkdownSkeleton renders three animated pulse placeholder lines", async () => {
    const { MarkdownSkeleton } = await import("./thread");

    const element = MarkdownSkeleton({}) as React.ReactElement<any>;
    const children = element.props.children;

    expect(children).toHaveLength(3);
    for (const child of children) {
      expect(child.props.className).toContain("animate-pulse");
    }
  });
});

describe("importMarkdownWithRetry", () => {
  beforeEach(() => {
    vi.resetModules();

    vi.doMock("@/components/assistant-ui/attachment", () => ({
      ComposerAttachments: () => null,
      UserMessageAttachments: () => null,
    }));
    vi.doMock("@/components/assistant-ui/reasoning", () => ({
      Reasoning: () => null,
      ReasoningContent: () => null,
      ReasoningRoot: () => null,
      ReasoningText: () => null,
      ReasoningTrigger: () => null,
    }));
    vi.doMock("@/components/assistant-ui/tool-fallback", () => ({
      ToolFallback: () => null,
    }));
    vi.doMock("@/components/assistant-ui/tooltip-icon-button", () => ({
      TooltipIconButton: () => null,
    }));
    vi.doMock("@/components/ui/button", () => ({
      Button: () => null,
    }));
    vi.doMock("@/lib/utils", () => ({
      cn: (...args: string[]) => args.filter(Boolean).join(" "),
    }));
    vi.doMock("@assistant-ui/react", () => ({
      ActionBarMorePrimitive: {
        Root: () => null,
        Trigger: () => null,
        Content: () => null,
        Item: () => null,
      },
      ActionBarPrimitive: {
        Root: () => null,
        Copy: () => null,
        Reload: () => null,
        Edit: () => null,
        ExportMarkdown: () => null,
      },
      AuiIf: () => null,
      BranchPickerPrimitive: {
        Root: () => null,
        Previous: () => null,
        Next: () => null,
        Number: () => null,
        Count: () => null,
      },
      ComposerPrimitive: {
        Root: () => null,
        Input: () => null,
        Send: () => null,
        Cancel: () => null,
        AttachmentDropzone: () => null,
      },
      ErrorPrimitive: { Root: () => null, Message: () => null },
      groupPartByType: () => () => null,
      MessagePrimitive: {
        Root: () => null,
        Parts: () => null,
        GroupedParts: () => null,
        Error: () => null,
      },
      ThreadPrimitive: {
        Root: () => null,
        Viewport: () => null,
        Messages: () => null,
        ViewportFooter: () => null,
        ScrollToBottom: () => null,
        Suggestion: () => null,
      },
      useAuiState: () => null,
    }));
    vi.doMock("next/dynamic", () => ({
      default: vi.fn((loader: () => Promise<any>) => {
        const Comp = () => "dynamic-component";
        (Comp as any).__dynamicLoader = loader;
        return Comp;
      }),
    }));
    vi.doMock("@/components/brand/diamond", () => ({
      Diamond: () => null,
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the fallback component with 'Message rendering unavailable' when both imports fail", async () => {
    // Mock the markdown-text module to reject on import
    vi.doMock("@/components/assistant-ui/markdown-text", () => {
      throw new Error("Chunk load failed");
    });

    const { importMarkdownWithRetry } = await import("./thread");

    const Component = await importMarkdownWithRetry();

    // The fallback component should render the error message
    const element = (Component as any)({});
    expect(element.props.children).toBe("Message rendering unavailable");
  });

  it("returns MarkdownText on successful first import", async () => {
    const MockMarkdown = () => "markdown-rendered";
    vi.doMock("@/components/assistant-ui/markdown-text", () => ({
      MarkdownText: MockMarkdown,
    }));

    const { importMarkdownWithRetry } = await import("./thread");

    const Component = await importMarkdownWithRetry();
    expect(Component).toBe(MockMarkdown);
  });
});
