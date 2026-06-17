/**
 * Preservation Property Tests - Non-Dual-Intent Behavior Unchanged
 *
 * These tests verify that for inputs that are NOT the bug condition
 * (dual-intent: email + documents), the chat route does NOT inject
 * a "MANDATORY" email reminder into the system prompt.
 *
 * On UNFIXED code, ALL tests should PASS because the reminder feature
 * does not exist yet. After the fix, they confirm non-dual-intent paths
 * remain unaffected.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => null),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
  })),
}));

let capturedSystem: string | undefined;

vi.mock("ai", () => ({
  streamText: vi.fn((opts: any) => {
    capturedSystem = opts.system;
    return { toUIMessageStream: () => new ReadableStream(), toolCalls: Promise.resolve([]) };
  }),
  tool: vi.fn((config: any) => config),
  convertToModelMessages: vi.fn(async (msgs: any) => msgs),
  zodSchema: vi.fn((schema: any) => schema),
  createUIMessageStream: vi.fn(({ execute }: any) => {
    const writer = { write: vi.fn(), merge: vi.fn() };
    execute({ writer });
    return new ReadableStream();
  }),
  createUIMessageStreamResponse: vi.fn(({ stream }: any) => new Response("ok", { status: 200 })),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mock-model"),
}));

vi.mock("@/lib/rag", () => ({
  retrieveContext: vi.fn(async () => ({ contextText: "", documents: [] })),
  MATCH_COUNT: 5,
}));

import { POST } from "./route";
import { retrieveContext } from "@/lib/rag";

function makeRequest(text: string): Request {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", parts: [{ type: "text", text }] }],
    }),
  });
}

const MANDATORY_REMINDER = "MANDATORY";

describe("Preservation: Non-Dual-Intent Behavior Unchanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSystem = undefined;
  });

  /**
   * Property A: For all messages with NO email intent keywords,
   * the system prompt does NOT contain the mandatory email reminder.
   *
   * **Validates: Requirements 3.1, 3.4**
   */
  describe("Property A: No email intent keywords -> no mandatory reminder", () => {
    const informationalPrefixes = fc.constantFrom(
      "What is the pressure rating of",
      "Tell me about",
      "How does",
      "Can you find me info on",
      "What are the specs for",
      "Compare",
      "Show me the details of",
      "List the features of",
      "What do we have for",
      "Pull up information about"
    );

    const productTopics = fc.constantFrom(
      "the ball valve",
      "HDPE fittings",
      "the ControlFlo 360",
      "AquaFuse service saddles",
      "Cambridge Coupling",
      "fusible pipe systems",
      "the 10-inch valve",
      "polyethylene products",
      "DI pipe pricing",
      "our product catalog"
    );

    // Generator: informational queries with no email keywords
    const informationalQueryArb = fc
      .tuple(informationalPrefixes, productTopics)
      .map(([prefix, topic]) => `${prefix} ${topic}`);

    it("no mandatory reminder injected for purely informational queries", async () => {
      await fc.assert(
        fc.asyncProperty(informationalQueryArb, async (query) => {
          capturedSystem = undefined;
          vi.mocked(retrieveContext).mockResolvedValue({
            contextText: "Some context about products",
            documents: [
              {
                id: "doc-1",
                title: "Ball Valve Spec",
                file_type: "pdf",
                file_size_bytes: 1024,
              },
            ],
          });

          await POST(makeRequest(query));

          expect(capturedSystem).toBeDefined();
          expect(capturedSystem).not.toContain(MANDATORY_REMINDER);
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property B: For messages with email intent but empty contextDocs,
   * the route does NOT inject the mandatory reminder.
   *
   * **Validates: Requirements 3.2**
   */
  describe("Property B: Email intent + empty contextDocs -> no mandatory reminder", () => {
    const emailIntentPhrases = fc.constantFrom(
      "Draft an email about ball valves",
      "Write me an email about HDPE fittings",
      "Can you draft the cover email",
      "Put together an email for the prospect",
      "Send them an email about our products",
      "Draft me an email introducing AquaFuse",
      "Write an email to follow up",
      "Compose an email about the meeting"
    );

    it("no mandatory reminder when contextDocs is empty (email-only scenario)", async () => {
      await fc.assert(
        fc.asyncProperty(emailIntentPhrases, async (query) => {
          capturedSystem = undefined;
          // Empty documents - email-only scenario
          vi.mocked(retrieveContext).mockResolvedValue({
            contextText: "",
            documents: [],
          });

          await POST(makeRequest(query));

          expect(capturedSystem).toBeDefined();
          expect(capturedSystem).not.toContain(MANDATORY_REMINDER);
        }),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Property C: For messages using "email" as a noun (not a command),
   * no special treatment is applied (no mandatory reminder).
   *
   * **Validates: Requirements 3.1, 3.3**
   */
  describe("Property C: 'email' as noun (not a command) -> no mandatory reminder", () => {
    const emailAsNounPhrases = fc.constantFrom(
      "what's in the email?",
      "the email says we should follow up",
      "from the email source, what product was mentioned",
      "check the email attachment for specs",
      "the email mentions a price increase",
      "who sent the email about DI pipe",
      "summarize the email from Buckeye State",
      "what did the email say about delivery",
      "is there an email about the Cambridge Coupling",
      "find me the email that mentions AquaFuse"
    );

    it("no mandatory reminder for messages using email as a noun", async () => {
      await fc.assert(
        fc.asyncProperty(emailAsNounPhrases, async (query) => {
          capturedSystem = undefined;
          vi.mocked(retrieveContext).mockResolvedValue({
            contextText: "Email context about products",
            documents: [
              {
                id: "email-1",
                title: "RE: Ball Valve Inquiry",
                file_type: "eml",
                file_size_bytes: 2048,
              },
            ],
          });

          await POST(makeRequest(query));

          expect(capturedSystem).toBeDefined();
          expect(capturedSystem).not.toContain(MANDATORY_REMINDER);
        }),
        { numRuns: 30 }
      );
    });
  });
});
