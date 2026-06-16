import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { z } from "zod";

// Replicate the exact schema from the route to test validation properties directly
const sendDraftSchema = z.object({
  to: z.string().max(255),
  subject: z.string().max(255),
  body: z.string().max(100_000),
  documentIds: z.array(z.string()).max(20),
});

// Helper: generate a valid base payload
const validPayload = () => ({
  to: "user@example.com",
  subject: "Test Subject",
  body: "<p>Hello</p>",
  documentIds: ["550e8400-e29b-41d4-a716-446655440000"],
});

describe("Feature: send-to-outlook, Property 3: Request validation rejects invalid inputs", () => {
  // **Validates: Requirements 6.3, 6.4**

  it("to field exceeding 255 characters is always rejected", () => {
    const longTo = fc.string({ minLength: 256, maxLength: 500 });

    fc.assert(
      fc.property(longTo, (to) => {
        const payload = { ...validPayload(), to };
        const result = sendDraftSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          const fields = result.error.issues.map((i) => i.path.join("."));
          expect(fields).toContain("to");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("subjects exceeding 255 characters are always rejected", () => {
    const longSubject = fc.string({ minLength: 256, maxLength: 500 });

    fc.assert(
      fc.property(longSubject, (subject) => {
        const payload = { ...validPayload(), subject };
        const result = sendDraftSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          const fields = result.error.issues.map((i) => i.path.join("."));
          expect(fields).toContain("subject");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("bodies exceeding 100,000 characters are always rejected", () => {
    // Generate strings just over the limit to avoid memory issues
    const longBody = fc.string({ minLength: 100_001, maxLength: 100_050 });

    fc.assert(
      fc.property(longBody, (body) => {
        const payload = { ...validPayload(), body };
        const result = sendDraftSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          const fields = result.error.issues.map((i) => i.path.join("."));
          expect(fields).toContain("body");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("documentIds with more than 20 items are always rejected", () => {
    const anyString = fc.string({ minLength: 1, maxLength: 36 });
    const tooManyIds = fc.array(anyString, { minLength: 21, maxLength: 30 });

    fc.assert(
      fc.property(tooManyIds, (documentIds) => {
        const payload = { ...validPayload(), documentIds };
        const result = sendDraftSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          const fields = result.error.issues.map((i) => i.path.join("."));
          expect(fields).toContain("documentIds");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("valid payloads always pass validation", () => {
    const validTo = fc.string({ minLength: 0, maxLength: 255 });
    const validSubject = fc.string({ minLength: 0, maxLength: 255 });
    const validBody = fc.string({ minLength: 0, maxLength: 1000 }); // keep small for perf
    const validDocIds = fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
      minLength: 0,
      maxLength: 20,
    });

    fc.assert(
      fc.property(
        validTo,
        validSubject,
        validBody,
        validDocIds,
        (to, subject, body, documentIds) => {
          const payload = { to, subject, body, documentIds };
          const result = sendDraftSchema.safeParse(payload);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
