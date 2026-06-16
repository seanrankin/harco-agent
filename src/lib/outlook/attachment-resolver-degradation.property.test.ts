import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { resolveAttachments } from "./attachment-resolver";

/**
 * Property 4: Graceful degradation on attachment failures
 *
 * For any set of document IDs where a subset fails resolution (not found in DB,
 * signed URL failure, or download failure), the result should contain all
 * successfully resolved documents and report the failed IDs as skipped, without
 * the failures affecting the successful attachments.
 *
 * **Validates: Requirements 3.8, 4.4, 4.5**
 */

const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}));

// Arbitrary: generates a UUID-like string
const uuidArb = fc.uuid();

// Arbitrary: generates a set of unique document IDs and a random failure mask
const documentSetWithFailureMaskArb = fc
  .uniqueArray(uuidArb, { minLength: 1, maxLength: 15 })
  .chain((ids) =>
    fc.tuple(
      fc.constant(ids),
      fc.array(fc.boolean(), { minLength: ids.length, maxLength: ids.length })
    )
  );

describe("Feature: send-to-outlook, Property 4: Graceful degradation on attachment failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("successful documents are preserved and failures are reported as skipped", async () => {
    await fc.assert(
      fc.asyncProperty(documentSetWithFailureMaskArb, async ([ids, failureMask]) => {
        const successIds = ids.filter((_, i) => !failureMask[i]);
        const failureIds = ids.filter((_, i) => failureMask[i]);

        // Configure DB mock: only return documents that should succeed
        const successDocuments = successIds.map((id) => ({
          id,
          storage_path: `path/${id}.pdf`,
          title: `Doc ${id.slice(0, 8)}`,
          file_type: "pdf",
        }));

        mockFrom.mockReturnValue({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: successDocuments,
              error: null,
            }),
          }),
        });

        // Configure storage mock: signed URLs succeed for all found docs
        mockStorageFrom.mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: "https://storage.example.com/signed" },
            error: null,
          }),
        });

        // Configure fetch mock: return a fresh 200 Response for each call
        vi.mocked(globalThis.fetch).mockImplementation(async () => {
          return new Response(Buffer.from("test-content"), { status: 200 });
        });

        const result = await resolveAttachments(ids);

        // 1. resolved contains exactly the documents NOT in the failure set
        const resolvedDocIds = result.resolved.map((r) => r.documentId);
        expect(new Set(resolvedDocIds)).toEqual(new Set(successIds));

        // 2. skipped contains exactly the documents IN the failure set
        expect(new Set(result.skipped)).toEqual(new Set(failureIds));

        // 3. No document appears in both resolved and skipped
        const resolvedSet = new Set(resolvedDocIds);
        const skippedSet = new Set(result.skipped);
        for (const id of resolvedDocIds) {
          expect(skippedSet.has(id)).toBe(false);
        }
        for (const id of result.skipped) {
          expect(resolvedSet.has(id)).toBe(false);
        }

        // 4. resolved + skipped covers all unique input IDs
        const allOutputIds = new Set([...resolvedDocIds, ...result.skipped]);
        expect(allOutputIds).toEqual(new Set(ids));
      }),
      { numRuns: 100 }
    );
  });
});
