import { NextResponse } from "next/server";
import { setTokens } from "@/lib/outlook/token-manager";

const TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const EXCHANGE_TIMEOUT_MS = 10_000;

function closePopupResponse(success: boolean, error?: string): NextResponse {
  const message = JSON.stringify({ type: "outlook-auth", success, error });
  const html = `<!DOCTYPE html><html><body><script>
    window.opener && window.opener.postMessage(${JSON.stringify(message)}, window.location.origin);
    window.close();
  </script><p>You can close this window.</p></body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const error = searchParams.get("error");
  const code = searchParams.get("code");

  if (error) {
    return closePopupResponse(false, "consent_denied");
  }

  if (!code) {
    return closePopupResponse(false, "missing_code");
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return closePopupResponse(false, "not_configured");
  }

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
      return closePopupResponse(false, "exchange_failed");
    }

    const data = await tokenResponse.json();

    const response = closePopupResponse(true);

    setTokens(response, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    });

    return response;
  } catch (err: unknown) {
    const errorType =
      err instanceof Error && err.name === "AbortError" ? "timeout" : "exchange_failed";
    return closePopupResponse(false, errorType);
  }
}
