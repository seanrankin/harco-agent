import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Microsoft OAuth is not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get("returnUrl") ?? "/";

  const authorizationUrl = new URL(
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
  );

  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("scope", "Mail.ReadWrite offline_access");
  authorizationUrl.searchParams.set("state", returnUrl);

  return NextResponse.redirect(authorizationUrl.toString());
}
