import { openai } from "@ai-sdk/openai";
import {
  streamText,
  tool,
  convertToModelMessages,
  zodSchema,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { retrieveContext } from "@/lib/rag";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a helpful knowledge base assistant for Harco Fittings, a pipe and pipe fitting manufacturer. You help salespeople find information from company documents.

Rules:
- Only answer based on the provided context documents. If the context doesn't contain relevant information, say so clearly.
- When you reference a specific document, ALWAYS use the fileReference tool to provide a downloadable link. Never output JSON or tool arguments as text in your response. If you want to show a document, call the fileReference tool.
- Never reply with file cards alone. Always precede fileReference tool calls with one short sentence (≤ 20 words) that either introduces what you're sending ("Here's the comparison sheet for those valves.") or teases a key fact pulled directly from the document. If you can quote a useful line from the source, prefer the quote.
- When a user asks you to draft an email, use the emailDraft tool to provide a formatted, sendable draft. Do not include any signature line, closing name, or placeholder fields (name, email, phone, title, etc.) in the email body. The user's email client handles signatures.
- Be concise and professional. These are busy salespeople who need quick answers.
- If asked about something outside the company documents, politely explain that you can only help with information from the Harco knowledge base.
- NEVER output raw JSON, tool schemas, or function call parameters as text. Always use the tools directly.`;

export async function POST(req: Request) {
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

  const { messages }: { messages: UIMessage[] } = await req.json();

  // Get the latest user message for RAG retrieval
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  let contextText = "";
  let contextDocs: {
    id: string;
    title: string;
    file_type: string;
    file_size_bytes: number;
  }[] = [];

  let userQuery = "";
  if (lastUserMessage) {
    userQuery = lastUserMessage.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ");
  }

  if (userQuery) {
    const retrieved = await retrieveContext(userQuery);
    contextText = retrieved.contextText;
    contextDocs = retrieved.documents;
  }

  const systemWithContext = `${SYSTEM_PROMPT}

## Available Documents for Reference
${contextDocs.map((d) => `- [${d.id}] "${d.title}" (${d.file_type}, ${d.file_size_bytes} bytes)`).join("\n")}

## Retrieved Context
${contextText || "No relevant context found for this query."}`;

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const EMAIL_TYPES = new Set(["eml", "msg"]);
      const attachmentDocs = contextDocs.filter(
        (d) => !EMAIL_TYPES.has(d.file_type),
      );

      const result = streamText({
        model: openai("gpt-4o-mini"),
        system: systemWithContext,
        messages: await convertToModelMessages(messages),
        onFinish: () => {
          // Emit sources AFTER the model finishes so the Sources block
          // renders beneath the assistant's prose, not above it.
          if (attachmentDocs.length > 0) {
            writer.write({
              type: "data-sources",
              data: { documents: attachmentDocs.slice(0, 8) },
            });
          }
        },
        tools: {
          fileReference: tool({
            description:
              "Show a downloadable file card to the user. Use this when referencing a specific source document that the user might want to download.",
            inputSchema: zodSchema(
              z.object({
                document_id: z
                  .string()
                  .describe(
                    "The document UUID from the available documents list",
                  ),
                title: z.string().describe("The document title"),
                file_type: z
                  .string()
                  .describe("File extension (docx, pdf, etc)"),
                file_size_bytes: z.number().describe("File size in bytes"),
              }),
            ),
          }),
          emailDraft: tool({
            description:
              "Generate an email draft that the user can open in Outlook. Use this when the user asks you to write or draft an email.",
            inputSchema: zodSchema(
              z.object({
                to: z.string().describe("Recipient email address"),
                subject: z.string().describe("Email subject line"),
                body: z.string().describe("Email body text"),
              }),
            ),
          }),
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
