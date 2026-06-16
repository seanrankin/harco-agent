import { describe, it, expect, vi, beforeEach } from "vitest";
import { deduplicateDocumentIds, buildFilename, resolveAttachments } from "./attachment-resolver";

const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}));

describe("deduplicateDocumentIds", () => {
  it("removes duplicate IDs", () => {
    const result = deduplicateDocumentIds(["a", "b", "a", "c", "b"]);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("preserves order of first occurrence", () => {
    const result = deduplicateDocumentIds(["c", "a", "b", "a", "c"]);
    expect(result).toEqual(["c", "a", "b"]);
  });

  it("handles empty array", () => {
    expect(deduplicateDocumentIds([])).toEqual([]);
  });

  it("handles single element", () => {
    expect(deduplicateDocumentIds(["x"])).toEqual(["x"]);
  });

  it("handles all duplicates", () => {
    expect(deduplicateDocumentIds(["a", "a", "a"])).toEqual(["a"]);
  });
});

describe("buildFilename", () => {
  it("concatenates title and file type with a dot", () => {
    expect(buildFilename("Product Spec", "pdf")).toBe("Product Spec.pdf");
  });

  it("handles titles with spaces", () => {
    expect(buildFilename("My Document Name", "docx")).toBe("My Document Name.docx");
  });

  it("handles file types with multiple characters", () => {
    expect(buildFilename("Report", "xlsx")).toBe("Report.xlsx");
  });
});

describe("resolveAttachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns empty result for empty input", async () => {
    const result = await resolveAttachments([]);
    expect(result).toEqual({ resolved: [], skipped: [] });
  });

  it("resolves documents successfully", async () => {
    const docId = "123e4567-e89b-12d3-a456-426614174000";
    const fileContent = Buffer.from("hello world");

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: docId,
              storage_path: "path/to/file.pdf",
              title: "Test Doc",
              file_type: "pdf",
            },
          ],
          error: null,
        }),
      }),
    });

    mockStorageFrom.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://storage.example.com/signed" },
        error: null,
      }),
    });

    vi.mocked(globalThis.fetch).mockResolvedValue(new Response(fileContent, { status: 200 }));

    const result = await resolveAttachments([docId]);

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0]).toEqual({
      documentId: docId,
      filename: "Test Doc.pdf",
      contentType: "application/pdf",
      contentBytes: fileContent.toString("base64"),
      sizeBytes: fileContent.byteLength,
    });
    expect(result.skipped).toEqual([]);
  });

  it("skips documents not found in database", async () => {
    const docId = "123e4567-e89b-12d3-a456-426614174000";

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    const result = await resolveAttachments([docId]);

    expect(result.resolved).toEqual([]);
    expect(result.skipped).toEqual([docId]);
  });

  it("skips documents when signed URL generation fails", async () => {
    const docId = "123e4567-e89b-12d3-a456-426614174000";

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: docId,
              storage_path: "path/to/file.pdf",
              title: "Test Doc",
              file_type: "pdf",
            },
          ],
          error: null,
        }),
      }),
    });

    mockStorageFrom.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Storage error" },
      }),
    });

    const result = await resolveAttachments([docId]);

    expect(result.resolved).toEqual([]);
    expect(result.skipped).toEqual([docId]);
  });

  it("skips documents when download fails", async () => {
    const docId = "123e4567-e89b-12d3-a456-426614174000";

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: docId,
              storage_path: "path/to/file.pdf",
              title: "Test Doc",
              file_type: "pdf",
            },
          ],
          error: null,
        }),
      }),
    });

    mockStorageFrom.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://storage.example.com/signed" },
        error: null,
      }),
    });

    vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 500 }));

    const result = await resolveAttachments([docId]);

    expect(result.resolved).toEqual([]);
    expect(result.skipped).toEqual([docId]);
  });

  it("deduplicates before resolving", async () => {
    const docId = "123e4567-e89b-12d3-a456-426614174000";
    const fileContent = Buffer.from("content");

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: docId,
              storage_path: "path/to/file.pdf",
              title: "Doc",
              file_type: "pdf",
            },
          ],
          error: null,
        }),
      }),
    });

    mockStorageFrom.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://storage.example.com/signed" },
        error: null,
      }),
    });

    vi.mocked(globalThis.fetch).mockResolvedValue(new Response(fileContent, { status: 200 }));

    const result = await resolveAttachments([docId, docId, docId]);

    expect(result.resolved).toHaveLength(1);
    expect(result.skipped).toEqual([]);
  });

  it("handles mixed success and failure", async () => {
    const goodId = "good-id-00000000-0000-0000-0000";
    const badId = "bad-id-000000000-0000-0000-0000";
    const fileContent = Buffer.from("content");

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: goodId,
              storage_path: "path/good.pdf",
              title: "Good",
              file_type: "pdf",
            },
          ],
          error: null,
        }),
      }),
    });

    mockStorageFrom.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://storage.example.com/signed" },
        error: null,
      }),
    });

    vi.mocked(globalThis.fetch).mockResolvedValue(new Response(fileContent, { status: 200 }));

    const result = await resolveAttachments([goodId, badId]);

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0].documentId).toBe(goodId);
    expect(result.skipped).toEqual([badId]);
  });

  it("skips all documents when query fails entirely", async () => {
    const ids = ["id-1", "id-2"];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "DB error" },
        }),
      }),
    });

    const result = await resolveAttachments(ids);

    expect(result.resolved).toEqual([]);
    expect(result.skipped).toEqual(ids);
  });
});
