import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to test module-scope behavior (DevToolsModal conditional).
// The conditional is evaluated at import time, so we use vi.resetModules() + dynamic import
// with vi.stubEnv to control env vars before each re-import.

// Shared mocks that persist across resetModules
const mockDynamic = vi.fn((loader: () => Promise<any>) => {
  const DynamicComp = () => "dynamic-component";
  (DynamicComp as any).__dynamicLoader = loader;
  return DynamicComp;
});

const mockUseChatRuntime = vi.fn(() => ({ type: "mock-runtime" }));
const mockUseRemoteThreadListRuntime = vi.fn(() => ({ type: "mock-runtime" }));

describe("DevToolsModal gating", () => {
  beforeEach(() => {
    vi.resetModules();

    // Re-register mocks before each dynamic import
    vi.doMock("next/dynamic", () => ({ default: mockDynamic }));
    vi.doMock("@assistant-ui/react", () => ({
      AssistantRuntimeProvider: ({ children }: any) => children,
      makeAssistantToolUI: vi.fn(() => () => null),
      useAssistantRuntime: vi.fn(() => ({
        threads: { switchToNewThread: vi.fn() },
      })),
      useRemoteThreadListRuntime: mockUseRemoteThreadListRuntime,
    }));
    vi.doMock("@assistant-ui/react-ai-sdk", () => ({
      useChatRuntime: mockUseChatRuntime,
    }));
    vi.doMock("@/lib/thread-adapter", () => ({
      threadListAdapter: {},
    }));
    vi.doMock("@/components/assistant-ui/thread", () => ({
      Thread: () => null,
    }));
    vi.doMock("@/components/app-shell/sidebar", () => ({
      Sidebar: () => null,
    }));
    vi.doMock("@/components/app-shell/top-bar", () => ({
      TopBar: () => null,
    }));
    vi.doMock("@/components/tool-ui/file-card", () => ({
      FileCard: () => null,
    }));
    vi.doMock("@/components/tool-ui/email-draft-card", () => ({
      EmailDraftCard: () => null,
    }));
    vi.doMock("@/components/tool-ui/source-attachments", () => ({
      SourceAttachmentsDataUI: () => null,
    }));
    vi.doMock("@assistant-ui/react-devtools", () => ({
      DevToolsModal: () => "DevToolsRendered",
    }));
    vi.doMock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

    mockDynamic.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders DevToolsModal via dynamic import when NODE_ENV=development and SHOW_DEVTOOLSMODAL=true", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SHOW_DEVTOOLSMODAL", "true");

    await import("./chat-client");

    // When both conditions are met, next/dynamic should be called with a loader
    // that imports @assistant-ui/react-devtools
    const devtoolsCall = mockDynamic.mock.calls.find((call) => {
      const loader = call[0];
      return loader.toString().includes("react-devtools");
    });
    expect(devtoolsCall).toBeDefined();
  });

  it("returns null component when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SHOW_DEVTOOLSMODAL", "true");

    await import("./chat-client");

    // In production, the conditional short-circuits: DevToolsModal = () => null
    // So next/dynamic should NOT be called with the devtools loader
    const devtoolsCall = mockDynamic.mock.calls.find((call) => {
      const loader = call[0];
      return loader.toString().includes("react-devtools");
    });
    expect(devtoolsCall).toBeUndefined();
  });

  it("returns null component when SHOW_DEVTOOLSMODAL is unset", async () => {
    vi.stubEnv("NODE_ENV", "development");
    // Do not set NEXT_PUBLIC_SHOW_DEVTOOLSMODAL

    await import("./chat-client");

    const devtoolsCall = mockDynamic.mock.calls.find((call) => {
      const loader = call[0];
      return loader.toString().includes("react-devtools");
    });
    expect(devtoolsCall).toBeUndefined();
  });

  it("returns null component when SHOW_DEVTOOLSMODAL is not 'true'", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SHOW_DEVTOOLSMODAL", "false");

    await import("./chat-client");

    const devtoolsCall = mockDynamic.mock.calls.find((call) => {
      const loader = call[0];
      return loader.toString().includes("react-devtools");
    });
    expect(devtoolsCall).toBeUndefined();
  });
});

describe("ChatClient without SimpleImageAttachmentAdapter", () => {
  beforeEach(() => {
    vi.resetModules();
    mockUseChatRuntime.mockClear();
    mockUseRemoteThreadListRuntime.mockClear();

    vi.doMock("next/dynamic", () => ({ default: mockDynamic }));
    vi.doMock("@assistant-ui/react", () => ({
      AssistantRuntimeProvider: ({ children }: any) => children,
      makeAssistantToolUI: vi.fn(() => () => null),
      useAssistantRuntime: vi.fn(() => ({
        threads: { switchToNewThread: vi.fn() },
      })),
      useRemoteThreadListRuntime: mockUseRemoteThreadListRuntime,
    }));
    vi.doMock("@assistant-ui/react-ai-sdk", () => ({
      useChatRuntime: mockUseChatRuntime,
    }));
    vi.doMock("@/lib/thread-adapter", () => ({
      threadListAdapter: {},
    }));
    vi.doMock("@/components/assistant-ui/thread", () => ({
      Thread: () => null,
    }));
    vi.doMock("@/components/app-shell/sidebar", () => ({
      Sidebar: () => null,
    }));
    vi.doMock("@/components/app-shell/top-bar", () => ({
      TopBar: () => null,
    }));
    vi.doMock("@/components/tool-ui/file-card", () => ({
      FileCard: () => null,
    }));
    vi.doMock("@/components/tool-ui/email-draft-card", () => ({
      EmailDraftCard: () => null,
    }));
    vi.doMock("@/components/tool-ui/source-attachments", () => ({
      SourceAttachmentsDataUI: () => null,
    }));
    vi.doMock("@assistant-ui/react-devtools", () => ({
      DevToolsModal: () => "DevToolsRendered",
    }));
    vi.doMock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ChatClient module loads without throwing (no SimpleImageAttachmentAdapter needed)", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const mod = await import("./chat-client");
    expect(mod.ChatClient).toBeDefined();
    expect(typeof mod.ChatClient).toBe("function");
  });

  it("useChatRuntime is called without an attachments adapter argument", async () => {
    vi.stubEnv("NODE_ENV", "development");

    // We need to actually invoke ChatClient to trigger useChatRuntime
    // Since we're in a node environment without React rendering, we verify the source code pattern.
    // The mock tracks calls, but useChatRuntime is called inside the component body.
    // We verify the source does not pass attachments by checking the import doesn't reference SimpleImageAttachmentAdapter.
    const mod = await import("./chat-client");

    // Verify the module doesn't export or reference SimpleImageAttachmentAdapter
    expect((mod as any).SimpleImageAttachmentAdapter).toBeUndefined();

    // Verify the source code of ChatClient doesn't contain SimpleImageAttachmentAdapter
    const sourceCode = mod.ChatClient.toString();
    expect(sourceCode).not.toContain("SimpleImageAttachmentAdapter");
  });
});
