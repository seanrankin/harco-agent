import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("isOutlookEnabled", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns true when all three env vars are set", async () => {
    process.env.MICROSOFT_CLIENT_ID = "test-client-id";
    process.env.MICROSOFT_CLIENT_SECRET = "test-secret";
    process.env.MICROSOFT_REDIRECT_URI = "https://example.com/callback";

    const { isOutlookEnabled } = await import("./config");
    expect(isOutlookEnabled()).toBe(true);
  });

  it("returns false when MICROSOFT_CLIENT_ID is missing", async () => {
    process.env.MICROSOFT_CLIENT_SECRET = "test-secret";
    process.env.MICROSOFT_REDIRECT_URI = "https://example.com/callback";
    delete process.env.MICROSOFT_CLIENT_ID;

    const { isOutlookEnabled } = await import("./config");
    expect(isOutlookEnabled()).toBe(false);
  });

  it("returns false when MICROSOFT_CLIENT_SECRET is missing", async () => {
    process.env.MICROSOFT_CLIENT_ID = "test-client-id";
    process.env.MICROSOFT_REDIRECT_URI = "https://example.com/callback";
    delete process.env.MICROSOFT_CLIENT_SECRET;

    const { isOutlookEnabled } = await import("./config");
    expect(isOutlookEnabled()).toBe(false);
  });

  it("returns false when MICROSOFT_REDIRECT_URI is missing", async () => {
    process.env.MICROSOFT_CLIENT_ID = "test-client-id";
    process.env.MICROSOFT_CLIENT_SECRET = "test-secret";
    delete process.env.MICROSOFT_REDIRECT_URI;

    const { isOutlookEnabled } = await import("./config");
    expect(isOutlookEnabled()).toBe(false);
  });

  it("returns false when an env var is empty string", async () => {
    process.env.MICROSOFT_CLIENT_ID = "";
    process.env.MICROSOFT_CLIENT_SECRET = "test-secret";
    process.env.MICROSOFT_REDIRECT_URI = "https://example.com/callback";

    const { isOutlookEnabled } = await import("./config");
    expect(isOutlookEnabled()).toBe(false);
  });

  it("logs a warning when env vars are missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.MICROSOFT_CLIENT_ID;
    delete process.env.MICROSOFT_CLIENT_SECRET;
    process.env.MICROSOFT_REDIRECT_URI = "https://example.com/callback";

    const { isOutlookEnabled } = await import("./config");
    isOutlookEnabled();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("MICROSOFT_CLIENT_ID"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("MICROSOFT_CLIENT_SECRET"));
    warnSpy.mockRestore();
  });

  it("logs warning only once across multiple calls", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.MICROSOFT_CLIENT_ID;
    process.env.MICROSOFT_CLIENT_SECRET = "test-secret";
    process.env.MICROSOFT_REDIRECT_URI = "https://example.com/callback";

    const { isOutlookEnabled } = await import("./config");
    isOutlookEnabled();
    isOutlookEnabled();
    isOutlookEnabled();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
