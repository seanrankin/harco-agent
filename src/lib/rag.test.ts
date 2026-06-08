import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

vi.mock("ai", () => ({
  embed: vi.fn().mockResolvedValue({ embedding: [0.1, 0.2, 0.3] }),
  embedMany: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: { embedding: vi.fn().mockReturnValue("mock-model") },
}));

const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

import { retrieveContext } from "@/lib/rag";

interface Chunk {
  content: string;
  document_id: string;
  document_title: string;
  document_file_type: string;
  document_file_size_bytes: number;
  similarity: number;
}

const chunkArbitrary = fc.record({
  content: fc.string({ minLength: 1 }),
  document_id: fc.string({ minLength: 1 }),
  document_title: fc.string({ minLength: 1 }),
  document_file_type: fc.constantFrom("pdf", "docx", "eml", "txt"),
  document_file_size_bytes: fc.nat({ max: 10_000_000 }),
  similarity: fc.double({ min: 0.5, max: 1.0, noNaN: true }),
});

describe("retrieveContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty result on RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "DB error" } });

    const result = await retrieveContext("test query");

    expect(result).toEqual({ contextText: "", documents: [] });
  });

  it("returns empty result when chunks array is empty", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await retrieveContext("test query");

    expect(result).toEqual({ contextText: "", documents: [] });
  });

  it("Feature: test-suite, Property 4: Document deduplication by ID", async () => {
    // **Validates: Requirements 3.1**
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(chunkArbitrary, { minLength: 2, maxLength: 10 })
          .chain((chunks) => {
            // Force at least two chunks to share a document_id
            const sharedId = chunks[0].document_id;
            const modified = [...chunks];
            modified[modified.length - 1] = {
              ...modified[modified.length - 1],
              document_id: sharedId,
            };
            return fc.constant(modified);
          }),
        async (chunks) => {
          mockRpc.mockResolvedValue({ data: chunks, error: null });

          const result = await retrieveContext("test");

          const uniqueIds = [...new Set(chunks.map((c) => c.document_id))];
          expect(result.documents).toHaveLength(uniqueIds.length);

          const resultIds = result.documents.map((d) => d.id);
          expect(new Set(resultIds)).toEqual(new Set(uniqueIds));

          // Values should come from the first chunk encountered for each ID
          for (const doc of result.documents) {
            const firstChunk = chunks.find(
              (c) => c.document_id === doc.id,
            ) as Chunk;
            expect(doc.title).toBe(firstChunk.document_title);
            expect(doc.file_type).toBe(firstChunk.document_file_type);
            expect(doc.file_size_bytes).toBe(
              firstChunk.document_file_size_bytes,
            );
          }
        },
      ),
    );
  });

  it("Feature: test-suite, Property 5: Context text concatenation", async () => {
    // **Validates: Requirements 3.2**
    await fc.assert(
      fc.asyncProperty(
        fc.array(chunkArbitrary, { minLength: 1, maxLength: 10 }),
        async (chunks) => {
          mockRpc.mockResolvedValue({ data: chunks, error: null });

          const result = await retrieveContext("test");

          const expected = chunks.map((c) => c.content).join("\n\n---\n\n");
          expect(result.contextText).toBe(expected);
        },
      ),
    );
  });

  it("Feature: test-suite, Property 6: Document field mapping correctness", async () => {
    // **Validates: Requirements 3.4**
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(chunkArbitrary, { minLength: 1, maxLength: 10 })
          .map((chunks) => {
            // Ensure all document_ids are unique for this property
            const seen = new Set<string>();
            return chunks.filter((c) => {
              if (seen.has(c.document_id)) return false;
              seen.add(c.document_id);
              return true;
            });
          })
          .filter((chunks) => chunks.length > 0),
        async (chunks) => {
          mockRpc.mockResolvedValue({ data: chunks, error: null });

          const result = await retrieveContext("test");

          expect(result.documents).toHaveLength(chunks.length);

          for (const chunk of chunks) {
            const doc = result.documents.find(
              (d) => d.id === chunk.document_id,
            );
            expect(doc).toBeDefined();
            expect(doc!.id).toBe(chunk.document_id);
            expect(doc!.title).toBe(chunk.document_title);
            expect(doc!.file_type).toBe(chunk.document_file_type);
            expect(doc!.file_size_bytes).toBe(chunk.document_file_size_bytes);
          }
        },
      ),
    );
  });
});
