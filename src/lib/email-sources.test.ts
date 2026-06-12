import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { classifyEmailSources } from "@/lib/email-sources";
import type { SourceDocument } from "@/lib/types";

/**
 * Property 1: Email source classification partitions correctly by file_type
 * Validates: Requirements 1.1, 1.3, 1.4
 */
describe("classifyEmailSources", () => {
  const fileTypes = ["eml", "msg", "pdf", "docx", "txt", "csv", "xlsx"];

  const arbSourceDocument: fc.Arbitrary<SourceDocument> = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    file_type: fc.oneof(fc.constantFrom(...fileTypes), fc.string({ minLength: 1, maxLength: 10 })),
    file_size_bytes: fc.nat({ max: 10_000_000 }),
  });

  const arbSourceDocuments = fc.array(arbSourceDocument, {
    minLength: 0,
    maxLength: 50,
  });

  it("emailSources contains exactly docs with file_type 'eml' or 'msg'", () => {
    fc.assert(
      fc.property(arbSourceDocuments, (docs) => {
        const { emailSources } = classifyEmailSources(docs);
        expect(emailSources.every((d) => d.file_type === "eml" || d.file_type === "msg")).toBe(
          true
        );

        const expectedEmails = docs.filter((d) => d.file_type === "eml" || d.file_type === "msg");
        expect(emailSources).toEqual(expectedEmails);
      }),
      { numRuns: 100 }
    );
  });

  it("otherSources contains all remaining docs", () => {
    fc.assert(
      fc.property(arbSourceDocuments, (docs) => {
        const { otherSources } = classifyEmailSources(docs);
        expect(otherSources.every((d) => d.file_type !== "eml" && d.file_type !== "msg")).toBe(
          true
        );

        const expectedOther = docs.filter((d) => d.file_type !== "eml" && d.file_type !== "msg");
        expect(otherSources).toEqual(expectedOther);
      }),
      { numRuns: 100 }
    );
  });

  it("no documents are lost or duplicated (partition completeness)", () => {
    fc.assert(
      fc.property(arbSourceDocuments, (docs) => {
        const { emailSources, otherSources } = classifyEmailSources(docs);
        expect(emailSources.length + otherSources.length).toBe(docs.length);
      }),
      { numRuns: 100 }
    );
  });
});
