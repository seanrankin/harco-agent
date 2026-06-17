import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

/**
 * Bug Condition Exploration Test
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 *
 * This test demonstrates the bug where gpt-4o-mini drops the emailDraft tool
 * call when it also needs to call fileReference multiple times. The streamText
 * mock replicates the CURRENT broken behavior: model calls fileReference but
 * omits emailDraft for dual-intent messages.
 *
 * EXPECTED: This test FAILS on unfixed code (confirming the bug exists).
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

// Track what tools the model "calls" in each invocation
let capturedToolCalls: string[] = [];

vi.mock("ai", () => ({
  streamText: vi.fn((_opts: any) => {
    // Simulate the BUG: model calls fileReference but NOT emailDraft
    // when handling a dual-intent message with docs in context.
    // First pass: only fileReference, no emailDraft
    const isFirstPass = capturedToolCalls.length === 0;
    if (isFirstPass) {
      capturedToolCalls = ["fileReference", "fileReference"];
    } else {
      // Second pass (fallback): the model now calls emailDraft
      capturedToolCalls.push("emailDraft");
    }
    return {
      toUIMessageStream: () => new ReadableStream(),
      toolCalls: Promise.resolve(
        isFirstPass
          ? [{ toolName: "fileReference" }, { toolName: "fileReference" }]
          : [{ toolName: "emailDraft" }]
      ),
    };
  }),
  tool: vi.fn((config: any) => config),
  convertToModelMessages: vi.fn(async (msgs: any) => msgs),
  zodSchema: vi.fn((schema: any) => schema),
  createUIMessageStream: vi.fn(({ execute }: any) => {
    const writer = { write: vi.fn(), merge: vi.fn() };
    const p = execute({ writer });
    // Store promise so tests can await it if needed
    (globalThis as any).__streamExecutePromise = p;
    return new ReadableStream();
  }),
  createUIMessageStreamResponse: vi.fn(({ stream }: any) => {
    // Return a response that resolves only after execute completes
    return new Response("ok", { status: 200 });
  }),
}));

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

function makeContextDocs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `doc-${i + 1}`,
    title: `Test Document ${i + 1}`,
    file_type: "pdf",
    file_size_bytes: 1024 * (i + 1),
    source_email_id: null,
  }));
}

describe("Bug Condition: emailDraft dropped when combined with fileReference calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedToolCalls = [];
  });

  it("Property 1: for all dual-intent messages with docs in context, emailDraft tool must be called", async () => {
    /**
     * Validates: Requirements 1.1, 1.2, 1.3
     *
     * Generate user messages containing explicit email intent keywords combined
     * with document retrieval context. Assert that the emailDraft tool is called
     * alongside any fileReference calls.
     */
    const emailIntentPhrases = fc.constantFrom(
      "draft an email",
      "write an email",
      "draft the cover email",
      "put together an email"
    );

    const topicSuffixes = fc.constantFrom(
      "about ball valves",
      "for the AquaFuse specs",
      "about the ControlFlo comparison"
    );

    const docCount = fc.integer({ min: 1, max: 3 });

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(emailIntentPhrases, topicSuffixes, docCount),
        async ([emailPhrase, topic, numDocs]) => {
          capturedToolCalls = [];

          const docs = makeContextDocs(numDocs);

          vi.mocked(retrieveContext).mockResolvedValue({
            contextText: docs.map((d) => `Document: ${d.title}`).join("\n"),
            documents: docs,
          });

          const userMessage = `${emailPhrase} ${topic}`;
          await POST(makeRequest(userMessage));
          // Wait for the async execute callback to complete (including two-pass fallback)
          await (globalThis as any).__streamExecutePromise;

          // The bug: emailDraft is NOT in capturedToolCalls because the mock
          // simulates the broken model behavior. This assertion checks the
          // EXPECTED correct behavior (emailDraft should be called).
          expect(capturedToolCalls).toContain("emailDraft");
        }
      ),
      { numRuns: 20 }
    );
  });
});
