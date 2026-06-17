import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Document-suggestion fallback tests.
 *
 * gpt-4o-mini often answers without calling fileReference even when relevant
 * downloadable docs are in context. The route adds a deterministic second pass
 * that surfaces the most relevant documents. These tests verify when that
 * fallback pass runs and when it is correctly skipped.
 */

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
  })),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mock-model"),
}));

type StreamTextOpts = { tools: Record<string, unknown> };

// Tool names the FIRST streamText pass should report calling.
let firstPassToolCalls: string[] = [];
// Captured options for every streamText invocation, in order.
let streamTextCalls: StreamTextOpts[] = [];

vi.mock("ai", () => ({
  streamText: vi.fn((opts: StreamTextOpts) => {
    streamTextCalls.push(opts);
    const isFirstPass = streamTextCalls.length === 1;
    const toolNames = isFirstPass ? firstPassToolCalls : [];
    return {
      toUIMessageStream: () => new ReadableStream(),
      toolCalls: Promise.resolve(toolNames.map((toolName) => ({ toolName }))),
    };
  }),
  tool: vi.fn((config: unknown) => config),
  convertToModelMessages: vi.fn(async (msgs: unknown) => msgs),
  zodSchema: vi.fn((schema: unknown) => schema),
  createUIMessageStream: vi.fn(
    ({ execute }: { execute: (arg: { writer: unknown }) => Promise<unknown> }) => {
      const writer = { write: vi.fn(), merge: vi.fn() };
      execStore.promise = execute({ writer });
      return new ReadableStream();
    }
  ),
  createUIMessageStreamResponse: vi.fn(() => new Response("ok", { status: 200 })),
}));

// Holds the execute() promise so tests can await the async stream callback.
const execStore: { promise: Promise<unknown> | null } = { promise: null };

vi.mock("@/lib/rag", () => ({
  retrieveContext: vi.fn(),
  MATCH_COUNT: 5,
}));

import { POST } from "./route";
import { retrieveContext } from "@/lib/rag";

function makeRequest(userMessage: string): Request {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", parts: [{ type: "text", text: userMessage }] }],
    }),
  });
}

// Informational query with no email intent, so only the document fallback can fire.
const INFO_QUERY = "what mechanical joint fittings do you offer";

const PDF_DOC = {
  id: "doc-1",
  title: "Harco Fittings Product Catalog",
  file_type: "pdf",
  file_size_bytes: 2048,
  source_email_id: null,
};

const EMAIL_DOC = {
  id: "eml-1",
  title: "Re: pricing question",
  file_type: "eml",
  file_size_bytes: 1024,
  source_email_id: null,
};

async function runPost(message: string) {
  await POST(makeRequest(message));
  await execStore.promise;
}

describe("Document-suggestion fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firstPassToolCalls = [];
    streamTextCalls = [];
  });

  it("runs a fileReference-only fallback pass when docs are present and the first pass cards nothing", async () => {
    firstPassToolCalls = []; // model answered without calling fileReference
    vi.mocked(retrieveContext).mockResolvedValue({
      contextText: "Document: Harco Fittings Product Catalog",
      documents: [PDF_DOC],
    });

    await runPost(INFO_QUERY);

    expect(streamTextCalls).toHaveLength(2);
    const fallbackOpts = streamTextCalls[1];
    expect(Object.keys(fallbackOpts.tools)).toEqual(["fileReference"]);
    expect(fallbackOpts.tools.emailDraft).toBeUndefined();
  });

  it("does not run the fallback when the first pass already called fileReference", async () => {
    firstPassToolCalls = ["fileReference"];
    vi.mocked(retrieveContext).mockResolvedValue({
      contextText: "Document: Harco Fittings Product Catalog",
      documents: [PDF_DOC],
    });

    await runPost(INFO_QUERY);

    expect(streamTextCalls).toHaveLength(1);
  });

  it("does not run the fallback when no downloadable (non-email) docs are in context", async () => {
    firstPassToolCalls = [];
    vi.mocked(retrieveContext).mockResolvedValue({
      contextText: "Document: Re: pricing question",
      documents: [EMAIL_DOC],
    });

    await runPost(INFO_QUERY);

    expect(streamTextCalls).toHaveLength(1);
  });

  it("does not run the fallback when retrieval found no grounding context", async () => {
    firstPassToolCalls = [];
    vi.mocked(retrieveContext).mockResolvedValue({
      contextText: "",
      documents: [],
    });

    await runPost(INFO_QUERY);

    expect(streamTextCalls).toHaveLength(1);
  });
});
