import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * File-card metadata trust test.
 *
 * Regression: the fileReference card once rendered the model's guessed
 * file_type/title/size, so a document stored as ".eml" was labeled "PDF" while
 * the download streamed the real .eml. The tool now takes only document_id and
 * resolves metadata server-side from the same documents rows RAG returned (the
 * rows the download endpoint streams), so the label can never disagree with the
 * file.
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

let streamTextCalls: StreamTextOpts[] = [];

vi.mock("ai", () => ({
  streamText: vi.fn((opts: StreamTextOpts) => {
    streamTextCalls.push(opts);
    return {
      toUIMessageStream: () => new ReadableStream(),
      toolCalls: Promise.resolve([]),
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

// A document stored as an .eml — the case the model used to mislabel "PDF".
const EML_DOC = {
  id: "eml-1",
  title: "Product Info BLURT #25: NSF Listings",
  file_type: "eml",
  file_size_bytes: 5734,
  source_email_id: null,
};

type FileReferenceTool = {
  execute: (input: { document_id: string }) => Promise<unknown>;
};

async function getFileReferenceTool(): Promise<FileReferenceTool> {
  await POST(makeRequest("what NSF 61 listings do we have"));
  await execStore.promise;
  return streamTextCalls[0].tools.fileReference as FileReferenceTool;
}

describe("fileReference card metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamTextCalls = [];
    vi.mocked(retrieveContext).mockResolvedValue({
      contextText: "Document: NSF Listings",
      documents: [EML_DOC],
    });
  });

  it("resolves title, file_type, and size from the documents row, not from the model", async () => {
    const fileReference = await getFileReferenceTool();

    const meta = await fileReference.execute({ document_id: "eml-1" });

    expect(meta).toEqual({
      document_id: "eml-1",
      title: "Product Info BLURT #25: NSF Listings",
      file_type: "eml",
      file_size_bytes: 5734,
    });
  });

  it("returns null for a document_id that is not in the retrieved context", async () => {
    const fileReference = await getFileReferenceTool();

    const meta = await fileReference.execute({ document_id: "not-a-real-id" });

    expect(meta).toBeNull();
  });
});
