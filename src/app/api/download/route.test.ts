import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}));

import { GET } from "./route";

describe("GET /api/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SKIP_AUTH;
  });

  it("responds 401 when auth returns an error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token" },
    });

    const request = new Request(
      "http://localhost/api/download?document_id=abc",
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("responds 401 when auth returns no user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new Request(
      "http://localhost/api/download?document_id=abc",
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("responds 400 when document_id query parameter is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const request = new Request("http://localhost/api/download");
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Missing document_id parameter");
  });

  it("responds 404 when document is not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Not found" },
          }),
        }),
      }),
    });

    const request = new Request(
      "http://localhost/api/download?document_id=nonexistent",
    );
    const response = await GET(request);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Document not found");
  });

  it("responds 307 redirect to signed URL on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              storage_path: "docs/file.pdf",
              title: "Test File",
              file_type: "pdf",
            },
            error: null,
          }),
        }),
      }),
    });
    mockStorageFrom.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://storage.example.com/signed-url" },
        error: null,
      }),
    });

    const request = new Request(
      "http://localhost/api/download?document_id=test-id",
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://storage.example.com/signed-url",
    );
  });

  it("responds 500 when signed URL generation fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              storage_path: "docs/file.pdf",
              title: "Test File",
              file_type: "pdf",
            },
            error: null,
          }),
        }),
      }),
    });
    mockStorageFrom.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Storage error" },
      }),
    });

    const request = new Request(
      "http://localhost/api/download?document_id=test-id",
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Failed to generate download URL");
  });
});
