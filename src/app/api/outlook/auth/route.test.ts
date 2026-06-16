import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "./route";

describe("GET /api/outlook/auth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MICROSOFT_CLIENT_ID: "test-client-id",
      MICROSOFT_REDIRECT_URI: "https://app.example.com/api/outlook/callback",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("redirects to Microsoft authorization URL with correct params", async () => {
    const response = await GET();

    expect(response.status).toBe(307);

    const location = response.headers.get("location")!;
    const url = new URL(location);

    expect(url.origin + url.pathname).toBe(
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
    );
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/outlook/callback"
    );
    expect(url.searchParams.get("scope")).toBe("Mail.ReadWrite offline_access");
    expect(url.searchParams.get("state")).toBe("popup");
  });

  it("returns 500 when MICROSOFT_CLIENT_ID is missing", async () => {
    delete process.env.MICROSOFT_CLIENT_ID;

    const response = await GET();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Microsoft OAuth is not configured");
  });

  it("returns 500 when MICROSOFT_REDIRECT_URI is missing", async () => {
    delete process.env.MICROSOFT_REDIRECT_URI;

    const response = await GET();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Microsoft OAuth is not configured");
  });
});
