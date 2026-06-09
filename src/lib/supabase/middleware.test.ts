import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

import { updateSession } from "./middleware";
import { createServerClient } from "@supabase/ssr";

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("bypasses auth when SKIP_AUTH is true", async () => {
    vi.stubEnv("SKIP_AUTH", "true");

    const request = new NextRequest(new URL("http://localhost/"));
    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated user on protected route to /login", async () => {
    vi.stubEnv("SKIP_AUTH", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest(new URL("http://localhost/"));
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("does not redirect unauthenticated user on /login", async () => {
    vi.stubEnv("SKIP_AUTH", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest(new URL("http://localhost/login"));
    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not redirect unauthenticated user on /auth/callback", async () => {
    vi.stubEnv("SKIP_AUTH", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest(new URL("http://localhost/auth/callback"));
    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects authenticated user on /login to /", async () => {
    vi.stubEnv("SKIP_AUTH", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@harcofittings.com" } },
    });

    const request = new NextRequest(new URL("http://localhost/login"));
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("does not redirect authenticated user on protected route", async () => {
    vi.stubEnv("SKIP_AUTH", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@harcofittings.com" } },
    });

    const request = new NextRequest(new URL("http://localhost/"));
    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
