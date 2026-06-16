import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getTokens } from "@/lib/outlook/token-manager";

export async function GET() {
  const cookieStore = await cookies();
  const tokens = getTokens(cookieStore);

  if (tokens && tokens.accessToken) {
    return NextResponse.json({ authenticated: true }, { status: 200 });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
