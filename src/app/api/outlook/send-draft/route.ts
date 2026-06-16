import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import {
  getTokens,
  isTokenExpired,
  refreshAccessToken,
  setTokens,
} from "@/lib/outlook/token-manager";
import { resolveAttachments, deduplicateDocumentIds } from "@/lib/outlook/attachment-resolver";
import { createDraftMessage, attachFile, createUploadSession } from "@/lib/outlook/graph-client";

const sendDraftSchema = z.object({
  to: z.string().max(255),
  subject: z.string().max(255),
  body: z.string().max(100_000),
  documentIds: z.array(z.string()).max(20),
});

const LARGE_FILE_THRESHOLD = 3 * 1024 * 1024; // 3MB

export async function POST(request: Request) {
  // 1. Supabase auth check
  const authResponse = await requireAuth();
  if (authResponse) return authResponse;

  // 2. Parse and validate body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = sendDraftSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const fieldErrors = parseResult.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json({ error: "Validation failed", fieldErrors }, { status: 400 });
  }

  const { to, subject, body, documentIds } = parseResult.data;

  // 3. Read Microsoft tokens from cookies
  const cookieStore = await cookies();
  const tokens = getTokens(cookieStore);

  if (!tokens) {
    return NextResponse.json({ error: "Microsoft authentication required" }, { status: 401 });
  }

  // 4. Refresh token if expired
  let accessToken = tokens.accessToken;
  let response: NextResponse | null = null;

  if (isTokenExpired(tokens.expiresAt)) {
    try {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      accessToken = refreshed.accessToken;

      // We'll set cookies on the final response
      response = NextResponse.json({} as Record<string, unknown>);
      setTokens(response, refreshed);
    } catch {
      return NextResponse.json({ error: "Microsoft authentication required" }, { status: 401 });
    }
  }

  // 5. Deduplicate document IDs
  const uniqueDocumentIds = deduplicateDocumentIds(documentIds);
  const totalRequested = uniqueDocumentIds.length;

  // 6. Resolve attachments from Supabase Storage
  const { resolved, skipped } = await resolveAttachments(uniqueDocumentIds);

  // 7. Create draft via Graph API
  let messageId: string;
  try {
    const draft = await createDraftMessage({ accessToken }, { to, subject, bodyHtml: body });
    messageId = draft.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Graph API request failed";
    return NextResponse.json(
      { error: "Failed to create draft message", details: message },
      { status: 502 }
    );
  }

  // 8. Attach files to the draft
  let attachmentCount = 0;
  const skippedDocumentIds = [...skipped];

  for (const attachment of resolved) {
    try {
      if (attachment.sizeBytes > LARGE_FILE_THRESHOLD) {
        await createUploadSession({ accessToken }, messageId, {
          filename: attachment.filename,
          fileSize: attachment.sizeBytes,
        });
      } else {
        await attachFile({ accessToken }, messageId, {
          filename: attachment.filename,
          contentBytes: attachment.contentBytes,
          contentType: attachment.contentType,
        });
      }
      attachmentCount++;
    } catch {
      skippedDocumentIds.push(attachment.documentId);
    }
  }

  // 9. Build response
  const responseBody = {
    messageId,
    attachmentCount,
    totalRequested,
    skippedDocumentIds,
  };

  // If we refreshed the token, use the response we already created (with cookies set)
  if (response) {
    // Replace the placeholder body with the actual response
    return new NextResponse(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(response.headers.entries()),
      },
    });
  }

  return NextResponse.json(responseBody, { status: 200 });
}
