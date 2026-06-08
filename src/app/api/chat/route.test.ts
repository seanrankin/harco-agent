import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: vi.fn(),
  tool: vi.fn((config) => config),
  convertToModelMessages: vi.fn(async (msgs) => msgs),
  zodSchema: vi.fn((schema) => schema),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mock-model"),
}));

vi.mock("@/lib/rag", () => ({
  retrieveContext: vi.fn(async () => ({ contextText: "", documents: [] })),
}));

import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { streamText } from "ai";
import { retrieveContext } from "@/lib/rag";

function makeRequest(body: object = { messages: [] }): Request {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Chat Route Auth Guard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.SKIP_AUTH;
  });

  it("returns 401 when supabase.auth.getUser() returns an error", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("Invalid token"),
        }),
      },
    } as any);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns 401 when supabase.auth.getUser() returns no user and no error", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(streamText).not.toHaveBeenCalled();
  });

  it("invokes streaming and returns non-401 when user is valid", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "test@harcofittings.com" } },
          error: null,
        }),
      },
    } as any);

    vi.mocked(streamText).mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok", { status: 200 }),
    } as any);

    vi.mocked(retrieveContext).mockResolvedValue({
      contextText: "",
      documents: [],
    });

    const response = await POST(
      makeRequest({
        messages: [{ role: "user", parts: [{ type: "text", text: "hello" }] }],
      }),
    );

    expect(response.status).not.toBe(401);
    expect(streamText).toHaveBeenCalled();
  });

  it("does not parse request body or call retrieveContext when unauthorized", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("expired"),
        }),
      },
    } as any);

    const req = makeRequest({ messages: [{ role: "user", content: "hi" }] });
    const jsonSpy = vi.spyOn(req, "json");

    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(retrieveContext).not.toHaveBeenCalled();
  });
});
