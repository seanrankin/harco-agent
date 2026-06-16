import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  encrypt,
  decrypt,
  getTokens,
  setTokens,
  clearTokens,
  isTokenExpired,
  refreshAccessToken,
} from "./token-manager";

// Mock crypto module partially - we need real crypto for encryption tests
vi.stubEnv("MICROSOFT_CLIENT_SECRET", "test-client-secret-for-encryption");
vi.stubEnv("MICROSOFT_CLIENT_ID", "test-client-id");

describe("token-manager", () => {
  describe("encrypt/decrypt round-trip", () => {
    it("decrypts back to the original plaintext", () => {
      const original = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.fake-access-token";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("produces different ciphertext each time due to random IV", () => {
      const original = "same-token-value";
      const encrypted1 = encrypt(original);
      const encrypted2 = encrypt(original);
      expect(encrypted1).not.toBe(encrypted2);
      // But both decrypt to the same value
      expect(decrypt(encrypted1)).toBe(original);
      expect(decrypt(encrypted2)).toBe(original);
    });

    it("handles empty string", () => {
      const original = "";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("handles unicode characters", () => {
      const original = "token-with-émojis-🎉-and-ñ";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("throws on tampered ciphertext", () => {
      const encrypted = encrypt("valid-token");
      const parts = encrypted.split(":");
      // Corrupt the ciphertext portion
      parts[2] = Buffer.from("corrupted-data").toString("base64");
      expect(() => decrypt(parts.join(":"))).toThrow();
    });

    it("throws on invalid format (missing parts)", () => {
      expect(() => decrypt("only-one-part")).toThrow("Invalid encrypted token format");
    });
  });

  describe("isTokenExpired", () => {
    it("returns true when token is past expiry", () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 60;
      expect(isTokenExpired(pastExpiry)).toBe(true);
    });

    it("returns true when token expires within 5 minutes", () => {
      const nearExpiry = Math.floor(Date.now() / 1000) + 200; // 200s < 300s buffer
      expect(isTokenExpired(nearExpiry)).toBe(true);
    });

    it("returns false when token has more than 5 minutes remaining", () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 600;
      expect(isTokenExpired(futureExpiry)).toBe(false);
    });
  });

  describe("getTokens", () => {
    it("returns null when no cookies present", () => {
      const mockCookieStore = {
        get: () => undefined,
      } as any;

      const result = getTokens(mockCookieStore);
      expect(result).toBeNull();
    });

    it("returns null when access token cookie is missing", () => {
      const mockCookieStore = {
        get: (name: string) => {
          if (name === "ms_refresh_token") return { value: encrypt("refresh") };
          return undefined;
        },
      } as any;

      const result = getTokens(mockCookieStore);
      expect(result).toBeNull();
    });

    it("returns decrypted tokens when all cookies are present", () => {
      const accessToken = "my-access-token";
      const refreshToken = "my-refresh-token";
      const expiresAt = "1700000000";

      const mockCookieStore = {
        get: (name: string) => {
          if (name === "ms_access_token") return { value: encrypt(accessToken) };
          if (name === "ms_refresh_token") return { value: encrypt(refreshToken) };
          if (name === "ms_token_expiry") return { value: expiresAt };
          return undefined;
        },
      } as any;

      const result = getTokens(mockCookieStore);
      expect(result).toEqual({
        accessToken,
        refreshToken,
        expiresAt: 1700000000,
      });
    });

    it("returns null when cookie value is corrupted", () => {
      const mockCookieStore = {
        get: (name: string) => {
          if (name === "ms_access_token") return { value: "corrupted-not-encrypted" };
          if (name === "ms_refresh_token") return { value: "also-corrupted" };
          if (name === "ms_token_expiry") return { value: "1700000000" };
          return undefined;
        },
      } as any;

      const result = getTokens(mockCookieStore);
      expect(result).toBeNull();
    });
  });

  describe("setTokens", () => {
    it("sets all three cookies with correct attributes", () => {
      const setCookies: Array<{ name: string; value: string; options: any }> = [];
      const mockResponse = {
        cookies: {
          set: (name: string, value: string, options: any) => {
            setCookies.push({ name, value, options });
          },
        },
      } as any;

      setTokens(mockResponse, {
        accessToken: "access-123",
        refreshToken: "refresh-456",
        expiresIn: 3600,
      });

      expect(setCookies).toHaveLength(3);

      const accessCookie = setCookies.find((c) => c.name === "ms_access_token")!;
      expect(accessCookie.options.httpOnly).toBe(true);
      expect(accessCookie.options.secure).toBe(true);
      expect(accessCookie.options.sameSite).toBe("strict");
      expect(accessCookie.options.path).toBe("/");
      expect(accessCookie.options.maxAge).toBe(3600);
      // Value should be encrypted (verify by decrypting)
      expect(decrypt(accessCookie.value)).toBe("access-123");

      const refreshCookie = setCookies.find((c) => c.name === "ms_refresh_token")!;
      expect(refreshCookie.options.maxAge).toBe(604800);
      expect(decrypt(refreshCookie.value)).toBe("refresh-456");

      const expiryCookie = setCookies.find((c) => c.name === "ms_token_expiry")!;
      expect(expiryCookie.options.httpOnly).toBe(true);
      const expiresAt = parseInt(expiryCookie.value, 10);
      // Should be roughly now + 3600
      const now = Math.floor(Date.now() / 1000);
      expect(expiresAt).toBeGreaterThanOrEqual(now + 3599);
      expect(expiresAt).toBeLessThanOrEqual(now + 3601);
    });
  });

  describe("clearTokens", () => {
    it("sets all cookies with maxAge 0 to clear them", () => {
      const setCookies: Array<{ name: string; value: string; options: any }> = [];
      const mockResponse = {
        cookies: {
          set: (name: string, value: string, options: any) => {
            setCookies.push({ name, value, options });
          },
        },
      } as any;

      clearTokens(mockResponse);

      expect(setCookies).toHaveLength(3);
      for (const cookie of setCookies) {
        expect(cookie.value).toBe("");
        expect(cookie.options.maxAge).toBe(0);
      }
    });
  });

  describe("refreshAccessToken", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("returns new tokens on successful refresh", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
      });

      const result = await refreshAccessToken("old-refresh-token");

      expect(result).toEqual({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresIn: 3600,
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        })
      );
    });

    it("uses the original refresh token if response does not include a new one", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          expires_in: 7200,
        }),
      });

      const result = await refreshAccessToken("keep-this-refresh-token");

      expect(result.refreshToken).toBe("keep-this-refresh-token");
    });

    it("throws when the token endpoint returns an error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"error":"invalid_grant"}',
      });

      await expect(refreshAccessToken("expired-refresh-token")).rejects.toThrow(
        "Token refresh failed (400)"
      );
    });

    it("throws when env vars are missing", async () => {
      const origClientId = process.env.MICROSOFT_CLIENT_ID;
      delete process.env.MICROSOFT_CLIENT_ID;

      await expect(refreshAccessToken("some-token")).rejects.toThrow(
        "Microsoft OAuth environment variables are not configured"
      );

      process.env.MICROSOFT_CLIENT_ID = origClientId;
    });
  });
});
