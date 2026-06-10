import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: vi.fn(),
  tool: vi.fn((config) => config),
  convertToModelMessages: vi.fn(async (msgs) => msgs),
  zodSchema: vi.fn((schema) => schema),
  createUIMessageStream: vi.fn(({ execute }) => {
    const writer = {
      write: vi.fn(),
      merge: vi.fn(),
    };
    execute({ writer });
    return new ReadableStream();
  }),
  createUIMessageStreamResponse: vi.fn(
    ({ stream }) => new Response("ok", { status: 200 }),
  ),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mock-model"),
}));

vi.mock("@/lib/rag", () => ({
  retrieveContext: vi.fn(async () => ({ contextText: "", documents: [] })),
}));

import { POST } from "./route";
import { requireAuth } from "@/lib/auth";
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
  });

  it("returns 401 when requireAuth returns a 401 response", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(streamText).not.toHaveBeenCalled();
  });

  it("invokes streaming and returns non-401 when auth passes", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null);

    vi.mocked(streamText).mockReturnValue({
      toUIMessageStream: () => new ReadableStream(),
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
    vi.mocked(requireAuth).mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );

    const req = makeRequest({ messages: [{ role: "user", content: "hi" }] });
    const jsonSpy = vi.spyOn(req, "json");

    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(retrieveContext).not.toHaveBeenCalled();
  });
});
