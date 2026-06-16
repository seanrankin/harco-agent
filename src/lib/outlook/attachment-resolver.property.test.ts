import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { deduplicateDocumentIds } from "./attachment-resolver";

/**
 * Feature: send-to-outlook
 * Property 1: Attachment deduplication produces the unique union
 * Validates: Requirements 3.3, 3.4, 3.5
 */
describe("Feature: send-to-outlook, Property 1: Attachment deduplication produces the unique union", () => {
  const uuidArb = fc.uuid({ version: 4 });

  it("result contains only unique elements (no duplicates)", () => {
    fc.assert(
      fc.property(fc.array(uuidArb, { minLength: 0, maxLength: 50 }), (ids) => {
        const result = deduplicateDocumentIds(ids);
        const asSet = new Set(result);
        expect(result.length).toBe(asSet.size);
      }),
      { numRuns: 100 }
    );
  });

  it("every element in the input appears in the result", () => {
    fc.assert(
      fc.property(fc.array(uuidArb, { minLength: 0, maxLength: 50 }), (ids) => {
        const result = deduplicateDocumentIds(ids);
        for (const id of ids) {
          expect(result).toContain(id);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("result length equals the number of unique elements in input", () => {
    fc.assert(
      fc.property(fc.array(uuidArb, { minLength: 0, maxLength: 50 }), (ids) => {
        const result = deduplicateDocumentIds(ids);
        const uniqueCount = new Set(ids).size;
        expect(result.length).toBe(uniqueCount);
      }),
      { numRuns: 100 }
    );
  });

  it("result preserves first-occurrence order", () => {
    fc.assert(
      fc.property(fc.array(uuidArb, { minLength: 0, maxLength: 50 }), (ids) => {
        const result = deduplicateDocumentIds(ids);
        const expectedOrder: string[] = [];
        const seen = new Set<string>();
        for (const id of ids) {
          if (!seen.has(id)) {
            seen.add(id);
            expectedOrder.push(id);
          }
        }
        expect(result).toEqual(expectedOrder);
      }),
      { numRuns: 100 }
    );
  });

  it("for two arrays combined, deduplication of their concat equals the set union", () => {
    fc.assert(
      fc.property(
        fc.array(uuidArb, { minLength: 0, maxLength: 25 }),
        fc.array(uuidArb, { minLength: 0, maxLength: 25 }),
        (arr1, arr2) => {
          const combined = [...arr1, ...arr2];
          const result = deduplicateDocumentIds(combined);
          const union = new Set([...arr1, ...arr2]);

          // Result has all elements from the union
          expect(result.length).toBe(union.size);
          for (const id of union) {
            expect(result).toContain(id);
          }
          // Result contains nothing extra
          for (const id of result) {
            expect(union.has(id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
