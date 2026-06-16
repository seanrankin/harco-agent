import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSetTokens = vi.fn();

vi.mock("@/lib/outlook/token-manager", () => ({
  setTokens: mockSetTokens,
}));

// Mock environment variables
const ENV_VARS = {
  MICROSOFT_CLIENT_ID: "test-client-id",
  MICROSOFT_CLIENT_SECRET: "test-client-secret",
  MICROSOFT_REDIRECT_URI: "http://localhost/api/outlook/callback",
};

describe("GET /api/outlook/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("MICROSOFT_CLIENT_ID", ENV_VARS.MICROSOFT_CLIENT_ID);
    vi.stubEnv("MICROSOFT_CLIENT_SECRET", ENV_VARS.MICROSOFT_CLIENT_SECRET);
    vi.stubEnv("MICROSOFT_REDIRECT_URI", ENV_VARS.MICROSOFT_REDIRECT_URI);
    vi.stubGlobal("fetch", vi.fn());
  });

  async function importRoute() {
    // Dynamic import to pick up fresh env vars
    const mod = await import("./route");
    return mod.GET;
  }

  it("redirects with consent_denied error when error param is present", async () => {
    const GET = await importRoute();
    const request = new Request(
      "http://localhost/api/outlook/callback?error=access_denied&state=/chat/123"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(location).toContain("/chat/123");
    expect(location).toContain("outlook_error=consent_denied");
  });

  it("redirects with missing_code error when no code param is present", async () => {
    const GET = await importRoute();
    const request = new Request("http://localhost/api/outlook/callback?state=/chat/123");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(location).toContain("outlook_error=missing_code");
  });

  it("redirects with not_configured error when env vars are missing", async () => {
    vi.stubEnv("MICROSOFT_CLIENT_ID", "");
    const GET = await importRoute();
    const request = new Request(
      "http://localhost/api/outlook/callback?code=auth_code_123&state=/chat/123"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(location).toContain("outlook_error=not_configured");
  });

  it("exchanges code for tokens and sets cookies on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "access_123",
          refresh_token: "refresh_456",
          expires_in: 3600,
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const GET = await importRoute();
    const request = new Request(
      "http://localhost/api/outlook/callback?code=auth_code_123&state=/chat/123"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/chat/123");
    expect(response.headers.get("location")).not.toContain("outlook_error");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    );

    expect(mockSetTokens).toHaveBeenCalledWith(expect.anything(), {
      accessToken: "access_123",
      refreshToken: "refresh_456",
      expiresIn: 3600,
    });
  });

  it("redirects with exchange_failed error when token endpoint returns non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      })
    );

    const GET = await importRoute();
    const request = new Request(
      "http://localhost/api/outlook/callback?code=bad_code&state=/chat/123"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(location).toContain("outlook_error=exchange_failed");
  });

  it("redirects with timeout error when fetch is aborted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("Aborted"), { name: "AbortError" }))
    );

    const GET = await importRoute();
    const request = new Request(
      "http://localhost/api/outlook/callback?code=auth_code_123&state=/chat/123"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(location).toContain("outlook_error=timeout");
  });

  it("redirects with exchange_failed on network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));

    const GET = await importRoute();
    const request = new Request(
      "http://localhost/api/outlook/callback?code=auth_code_123&state=/chat/123"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(location).toContain("outlook_error=exchange_failed");
  });

  it("defaults returnUrl to / when state is not provided", async () => {
    const GET = await importRoute();
    const request = new Request("http://localhost/api/outlook/callback?error=access_denied");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    const url = new URL(location);
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("outlook_error")).toBe("consent_denied");
  });
});
