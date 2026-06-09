import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // Dev-only auth bypass
  if (process.env.SKIP_AUTH !== "true") {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("document_id");

  if (!documentId) {
    return new Response("Missing document_id parameter", { status: 400 });
  }

  // Service client bypasses RLS — auth has already been enforced above.
  const service = createServiceClient();

  const { data: doc, error: docError } = await service
    .from("documents")
    .select("storage_path, title, file_type")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    return new Response("Document not found", { status: 404 });
  }

  // Generate a signed URL (60-minute expiry)
  const { data: signedUrlData, error: urlError } = await service.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 60 * 60);

  if (urlError || !signedUrlData) {
    return new Response("Failed to generate download URL", { status: 500 });
  }

  return NextResponse.redirect(signedUrlData.signedUrl);
}
