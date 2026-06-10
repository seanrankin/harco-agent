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
import { requireAuth } from "@/lib/auth";
import { retrieveContext, MATCH_COUNT } from "@/lib/rag";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import type { SourceDocument } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: Request) {
  const authResponse = await requireAuth();
  if (authResponse) return authResponse;

  const { messages }: { messages: UIMessage[] } = await req.json();

  // Get the latest user message for RAG retrieval
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  let contextText = "";
  let contextDocs: SourceDocument[] = [];

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
              data: { documents: attachmentDocs.slice(0, MATCH_COUNT) },
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
