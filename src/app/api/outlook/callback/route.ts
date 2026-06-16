import { NextResponse } from "next/server";
import { setTokens } from "@/lib/outlook/token-manager";

const TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const EXCHANGE_TIMEOUT_MS = 10_000;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const returnUrl = state || "/";

  // User denied consent or authorization failed (Req 2.7)
  if (error) {
    const redirectUrl = new URL(returnUrl, origin);
    redirectUrl.searchParams.set("outlook_error", "consent_denied");
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!code) {
    const redirectUrl = new URL(returnUrl, origin);
    redirectUrl.searchParams.set("outlook_error", "missing_code");
    return NextResponse.redirect(redirectUrl.toString());
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    const redirectUrl = new URL(returnUrl, origin);
    redirectUrl.searchParams.set("outlook_error", "not_configured");
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Exchange authorization code for tokens (Req 2.3 - within 10 seconds)
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: "Mail.ReadWrite offline_access",
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EXCHANGE_TIMEOUT_MS);

    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!tokenResponse.ok) {
      // Token exchange failed (Req 2.8)
      const redirectUrl = new URL(returnUrl, origin);
      redirectUrl.searchParams.set("outlook_error", "exchange_failed");
      return NextResponse.redirect(redirectUrl.toString());
    }

    const data = await tokenResponse.json();

    // Set cookies on the redirect response (Req 2.4)
    const redirectUrl = new URL(returnUrl, origin);
    const response = NextResponse.redirect(redirectUrl.toString());

    setTokens(response, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    });

    return response;
  } catch (err: unknown) {
    // Timeout or network failure (Req 2.8)
    const redirectUrl = new URL(returnUrl, origin);
    const errorType =
      err instanceof Error && err.name === "AbortError" ? "timeout" : "exchange_failed";
    redirectUrl.searchParams.set("outlook_error", errorType);
    return NextResponse.redirect(redirectUrl.toString());
  }
}
