import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { formatDocumentContext } from "@/lib/format-context";
import type { SourceDocument } from "@/lib/types";

// --- Generators ---

const EMAIL_TYPES = ["eml", "msg"];
const NON_EMAIL_TYPES = ["pdf", "docx", "txt", "xlsx", "csv", "pptx", "html"];

const arbId = fc.uuid();
const arbTitle = fc.string({ minLength: 1, maxLength: 60 }).filter((s) => !s.includes('"'));
const arbFileSize = fc.integer({ min: 1, max: 10_000_000 });

const arbEmailDoc: fc.Arbitrary<SourceDocument> = fc.record({
  id: arbId,
  title: arbTitle,
  file_type: fc.constantFrom(...EMAIL_TYPES),
  file_size_bytes: arbFileSize,
});

const arbNonEmailDoc: fc.Arbitrary<SourceDocument> = fc.record({
  id: arbId,
  title: arbTitle,
  file_type: fc.constantFrom(...NON_EMAIL_TYPES),
  file_size_bytes: arbFileSize,
});

const arbDoc: fc.Arbitrary<SourceDocument> = fc.oneof(arbEmailDoc, arbNonEmailDoc);

// --- Property Test: Task 2.2 ---

describe("Property 2: Context formatting includes complete metadata for all email sources", () => {
  /**
   * **Validates: Requirements 1.2, 1.5**
   */
  it("every email source line contains [EMAIL SOURCE] tag and non-email lines do not", () => {
    fc.assert(
      fc.property(fc.array(arbDoc, { minLength: 1, maxLength: 20 }), (docs) => {
        const output = formatDocumentContext(docs, "some context");

        for (const doc of docs) {
          const line = output.split("\n").find((l) => l.includes(`[${doc.id}]`));
          expect(line).toBeDefined();

          if (EMAIL_TYPES.includes(doc.file_type)) {
            expect(line).toContain("[EMAIL SOURCE]");
          } else {
            expect(line).not.toContain("[EMAIL SOURCE]");
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("every email source's id, title, and file_type appear in the output", () => {
    fc.assert(
      fc.property(
        fc
          .array(arbDoc, { minLength: 1, maxLength: 20 })
          .filter((docs) => docs.some((d) => EMAIL_TYPES.includes(d.file_type))),
        (docs) => {
          const output = formatDocumentContext(docs, "context text");

          const emailDocs = docs.filter((d) => EMAIL_TYPES.includes(d.file_type));
          for (const doc of emailDocs) {
            expect(output).toContain(doc.id);
            expect(output).toContain(doc.title);
            expect(output).toContain(doc.file_type);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Unit Tests: Task 2.3 ---

describe("Context assembly: Email Sources Present signal", () => {
  /**
   * **Validates: Requirements 1.1, 1.4**
   */
  it("shows 'Email Sources Present: YES' when email sources exist", () => {
    const docs: SourceDocument[] = [
      { id: "abc-123", title: "Test Email", file_type: "eml", file_size_bytes: 1024 },
      { id: "def-456", title: "A PDF", file_type: "pdf", file_size_bytes: 2048 },
    ];

    const output = formatDocumentContext(docs, "some context");
    expect(output).toContain("## Email Sources Present: YES");
  });

  it("shows 'Email Sources Present: NO' when no email sources exist", () => {
    const docs: SourceDocument[] = [
      { id: "abc-123", title: "A PDF", file_type: "pdf", file_size_bytes: 1024 },
      { id: "def-456", title: "A Word Doc", file_type: "docx", file_size_bytes: 2048 },
    ];

    const output = formatDocumentContext(docs, "some context");
    expect(output).toContain("## Email Sources Present: NO");
  });

  it("produces correct output with an empty document list", () => {
    const output = formatDocumentContext([], "");

    expect(output).toContain("## Available Documents for Reference");
    expect(output).toContain("## Email Sources Present: NO");
    expect(output).toContain("No relevant context found for this query.");
  });
});
