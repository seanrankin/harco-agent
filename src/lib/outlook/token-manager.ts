import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { type NextResponse } from "next/server";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ACCESS_TOKEN_COOKIE = "ms_access_token";
const REFRESH_TOKEN_COOKIE = "ms_refresh_token";
const TOKEN_EXPIRY_COOKIE = "ms_token_expiry";

const COOKIE_OPTIONS_BASE = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
};

function getEncryptionKey(): Buffer {
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!secret) {
    throw new Error("MICROSOFT_CLIENT_SECRET is not set");
  }
  return scryptSync(secret, "ms-token-salt", 32);
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(encoded: string): string {
  const key = getEncryptionKey();
  const parts = encoded.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

export function getTokens(
  cookieStore: ReadonlyRequestCookies
): { accessToken: string; refreshToken: string; expiresAt: number } | null {
  const accessTokenCookie = cookieStore.get(ACCESS_TOKEN_COOKIE);
  const refreshTokenCookie = cookieStore.get(REFRESH_TOKEN_COOKIE);
  const expiryCookie = cookieStore.get(TOKEN_EXPIRY_COOKIE);

  if (!accessTokenCookie?.value || !refreshTokenCookie?.value) {
    return null;
  }

  try {
    const accessToken = decrypt(accessTokenCookie.value);
    const refreshToken = decrypt(refreshTokenCookie.value);
    const expiresAt = expiryCookie?.value ? parseInt(expiryCookie.value, 10) : 0;
    return { accessToken, refreshToken, expiresAt };
  } catch {
    return null;
  }
}

export function isTokenExpired(expiresAt: number): boolean {
  // Consider expired if within 5 minutes of expiry
  return Date.now() / 1000 >= expiresAt - 300;
}

export function setTokens(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
): void {
  const encryptedAccess = encrypt(tokens.accessToken);
  const encryptedRefresh = encrypt(tokens.refreshToken);
  const expiresAt = Math.floor(Date.now() / 1000) + tokens.expiresIn;

  response.cookies.set(ACCESS_TOKEN_COOKIE, encryptedAccess, {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 3600,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, encryptedRefresh, {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 604800,
  });

  response.cookies.set(TOKEN_EXPIRY_COOKIE, expiresAt.toString(), {
    ...COOKIE_OPTIONS_BASE,
  });
}

export function clearTokens(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 0,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 0,
  });
  response.cookies.set(TOKEN_EXPIRY_COOKIE, "", {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 0,
  });
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth environment variables are not configured");
  }

  const tokenEndpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: "Mail.ReadWrite offline_access",
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
  };
}
