import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify thread ownership
  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (threadError || !thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  try {
    const conversationText = messages
      .map((m: { role?: string; content?: unknown; parts?: unknown[] }) => {
        const role = m.role === "assistant" ? "Assistant" : "User";
        let text = "";

        if (typeof m.content === "string") {
          text = m.content;
        } else if (Array.isArray(m.parts)) {
          text = m.parts
            .filter(
              (p: unknown): p is { type: string; text: string } =>
                typeof p === "object" &&
                p !== null &&
                "type" in p &&
                (p as { type: string }).type === "text" &&
                "text" in p
            )
            .map((p) => p.text)
            .join(" ");
        } else if (Array.isArray(m.content)) {
          text = m.content
            .filter(
              (p: unknown): p is { type: string; text: string } =>
                typeof p === "object" &&
                p !== null &&
                "type" in p &&
                (p as { type: string }).type === "text" &&
                "text" in p
            )
            .map((p) => p.text)
            .join(" ");
        }

        return text ? `${role}: ${text}` : "";
      })
      .filter(Boolean)
      .join("\n");

    if (!conversationText) {
      return NextResponse.json({ title: "New conversation" });
    }

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Generate a concise title (2-6 words) summarizing the user's question. No quotes, no punctuation at the end, no filler words like "inquiry about" or "question regarding". Just name the topic directly.\n\nConversation:\n${conversationText}`,
    });

    let title = text.trim().replace(/[.!?]+$/, "");

    if (title.length > 60) {
      title = title.slice(0, 60);
    }

    if (title.length < 2) {
      title = "New conversation";
    }

    // Update thread title in DB
    const { error: updateError } = await supabase
      .from("threads")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update title" }, { status: 500 });
    }

    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ error: "Title generation failed" }, { status: 500 });
  }
}
