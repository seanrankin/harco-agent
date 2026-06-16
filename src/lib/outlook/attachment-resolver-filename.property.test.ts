import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { buildFilename } from "./attachment-resolver";

/**
 * Feature: send-to-outlook, Property 2: Attachment filename construction
 * Validates: Requirements 4.3
 */
describe("Property 2: Attachment filename construction", () => {
  const titleArb = fc.oneof(
    fc.string({ minLength: 1, maxLength: 200 }),
    fc.constantFrom(
      "Product Spec",
      "my file (final)",
      "report.v2",
      "résumé",
      "file name with spaces",
      "hello-world_2024",
      "中文标题",
      "dots...in...title",
      "special!@#$%chars"
    )
  );

  const fileTypeArb = fc.oneof(
    fc
      .string({ minLength: 1, maxLength: 10 })
      .filter((s) => !s.includes(".") && s.trim() === s && s.length > 0),
    fc.constantFrom("pdf", "doc", "docx", "xlsx", "pptx", "txt", "csv", "html", "png", "jpg")
  );

  it("filename equals title + '.' + fileType", () => {
    fc.assert(
      fc.property(titleArb, fileTypeArb, (title, fileType) => {
        const result = buildFilename(title, fileType);
        expect(result).toBe(`${title}.${fileType}`);
      }),
      { numRuns: 100 }
    );
  });

  it("filename always ends with the fileType extension", () => {
    fc.assert(
      fc.property(titleArb, fileTypeArb, (title, fileType) => {
        const result = buildFilename(title, fileType);
        expect(result.endsWith(`.${fileType}`)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("filename always starts with the title", () => {
    fc.assert(
      fc.property(titleArb, fileTypeArb, (title, fileType) => {
        const result = buildFilename(title, fileType);
        expect(result.startsWith(title)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("filename has exactly one more character than title + fileType (the dot separator)", () => {
    fc.assert(
      fc.property(titleArb, fileTypeArb, (title, fileType) => {
        const result = buildFilename(title, fileType);
        expect(result.length).toBe(title.length + 1 + fileType.length);
      }),
      { numRuns: 100 }
    );
  });
});
