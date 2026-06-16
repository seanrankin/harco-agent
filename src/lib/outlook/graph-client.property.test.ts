import { describe, it, expect, vi, afterEach } from "vitest";
import * as fc from "fast-check";
import { createDraftMessage } from "./graph-client";

/**
 * Feature: send-to-outlook
 * Property 6: Draft payload preserves all email fields
 * Validates: Requirements 3.2
 */
describe("Feature: send-to-outlook, Property 6: Draft payload preserves all email fields", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetchCapture(): { getBody: () => unknown } {
    let lastBody: unknown;
    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      lastBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ id: "mock-message-id" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    return { getBody: () => lastBody };
  }

  // Generator for valid email addresses
  const alphanumCharArb = fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789".split(""));
  const emailArb = fc
    .tuple(
      fc.array(alphanumCharArb, { minLength: 1, maxLength: 20 }),
      fc.array(alphanumCharArb, { minLength: 1, maxLength: 10 }),
      fc.constantFrom("com", "org", "net", "io", "co.uk", "de", "fr")
    )
    .map(([local, domain, tld]) => `${local.join("")}@${domain.join("")}.${tld}`);

  // Generator for subjects: up to 255 chars including unicode, emoji, special chars
  const subjectArb = fc.string({ minLength: 0, maxLength: 255 });

  // Generator for HTML body: up to 1000 chars with unicode, entities, and tags
  const htmlFragmentArb = fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.constantFrom(
      "<p>Hello</p>",
      "<strong>Bold</strong>",
      "&amp;",
      "&lt;",
      "&gt;",
      "&#x1F600;",
      "<br/>",
      "<ul><li>item</li></ul>"
    ),
    fc.string({ minLength: 1, maxLength: 30 }).map((s) => `<div>${s}</div>`)
  );

  const bodyHtmlArb = fc
    .array(htmlFragmentArb, { minLength: 1, maxLength: 10 })
    .map((parts) => parts.join(""))
    .filter((s) => s.length <= 1000);

  it("payload toRecipients[0].emailAddress.address matches input to", async () => {
    await fc.assert(
      fc.asyncProperty(emailArb, subjectArb, bodyHtmlArb, async (to, subject, bodyHtml) => {
        const { getBody } = mockFetchCapture();
        await createDraftMessage({ accessToken: "test-token" }, { to, subject, bodyHtml });

        const payload = getBody() as Record<string, unknown>;
        expect((payload as any).toRecipients[0].emailAddress.address).toBe(to);
      }),
      { numRuns: 100 }
    );
  });

  it("payload subject matches input subject exactly", async () => {
    await fc.assert(
      fc.asyncProperty(emailArb, subjectArb, bodyHtmlArb, async (to, subject, bodyHtml) => {
        const { getBody } = mockFetchCapture();
        await createDraftMessage({ accessToken: "test-token" }, { to, subject, bodyHtml });

        const payload = getBody() as any;
        expect(payload.subject).toBe(subject);
      }),
      { numRuns: 100 }
    );
  });

  it("payload body.content matches input bodyHtml exactly", async () => {
    await fc.assert(
      fc.asyncProperty(emailArb, subjectArb, bodyHtmlArb, async (to, subject, bodyHtml) => {
        const { getBody } = mockFetchCapture();
        await createDraftMessage({ accessToken: "test-token" }, { to, subject, bodyHtml });

        const payload = getBody() as any;
        expect(payload.body.content).toBe(bodyHtml);
      }),
      { numRuns: 100 }
    );
  });

  it("payload body.contentType is always HTML", async () => {
    await fc.assert(
      fc.asyncProperty(emailArb, subjectArb, bodyHtmlArb, async (to, subject, bodyHtml) => {
        const { getBody } = mockFetchCapture();
        await createDraftMessage({ accessToken: "test-token" }, { to, subject, bodyHtml });

        const payload = getBody() as any;
        expect(payload.body.contentType).toBe("HTML");
      }),
      { numRuns: 100 }
    );
  });
});
