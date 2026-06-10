import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, thread_id, parent_id, format, content, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(messages);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();

  if (typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json(
      { error: "id is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  if (
    !("parent_id" in body) ||
    (body.parent_id !== null && typeof body.parent_id !== "string")
  ) {
    return NextResponse.json(
      { error: "parent_id is required and must be a string or null" },
      { status: 400 },
    );
  }

  if (typeof body.format !== "string" || body.format.length === 0) {
    return NextResponse.json(
      { error: "format is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  if (
    body.content === null ||
    body.content === undefined ||
    typeof body.content !== "object" ||
    Array.isArray(body.content)
  ) {
    return NextResponse.json(
      { error: "content is required and must be an object" },
      { status: 400 },
    );
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      id: body.id,
      thread_id: id,
      parent_id: body.parent_id,
      format: body.format,
      content: body.content,
    })
    .select("id, thread_id, parent_id, format, content, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(message, { status: 201 });
}
