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
import { createClient } from "@/lib/supabase/server";
import { retrieveContext, MATCH_COUNT } from "@/lib/rag";
import { SYSTEM_PROMPT, buildUserPreamble } from "@/lib/system-prompt";
import { classifyEmailSources } from "@/lib/email-sources";
import { detectEmailIntent } from "@/lib/detect-email-intent";
import { formatDocumentContext } from "@/lib/format-context";
import { appendSignature } from "@/lib/email-signature";
import type { SourceDocument } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: Request) {
  const authResponse = await requireAuth();
  if (authResponse) return authResponse;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.display_name as string | undefined;

  const { messages }: { messages: UIMessage[] } = await req.json();

  // Get the latest user message for RAG retrieval
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

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

  const { hasEmailIntent } = detectEmailIntent(userQuery);

  const { otherSources: attachmentDocs } = classifyEmailSources(contextDocs);

  const preamble = buildUserPreamble(displayName);
  let systemWithContext = `${SYSTEM_PROMPT}${preamble ? `\n\n${preamble}` : ""}\n\n${formatDocumentContext(contextDocs, contextText)}`;

  if (hasEmailIntent && contextDocs.length > 0) {
    systemWithContext +=
      "\n\nMANDATORY: The user has explicitly requested an email draft. You MUST call the emailDraft tool in this response. Do NOT skip it even if you are also calling fileReference. Call fileReference for documents AND emailDraft for the email. Both are required.";
  }

  const emailDraftTool = tool({
    description: `Generate an email draft that the user can open in Outlook. Use this when:
- The user explicitly asks for an email draft
- You detect implicit outreach intent AND email sources are in context
- The user accepts a proactive offer to draft an email
Do not include signature lines or placeholder fields in the body.
Leave "to" as empty string unless the user provides a specific recipient.`,
    inputSchema: zodSchema(
      z.object({
        to: z.string().describe("Recipient email address"),
        subject: z.string().describe("Email subject line"),
        body: z.string().describe("Email body text"),
      })
    ),
    execute: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
      const signedBody = user?.email ? appendSignature(body, displayName, user.email) : body;
      return { to, subject, body: signedBody };
    },
  });

  // Authoritative document metadata, keyed by id, from RAG (the same DB rows the
  // download endpoint streams). The model only supplies document_id; title,
  // file_type, and file_size_bytes are resolved here so the card can never
  // disagree with the file that actually downloads.
  const docsById = new Map(contextDocs.map((d) => [d.id, d]));

  const fileReferenceTool = tool({
    description:
      "Show a downloadable file card to the user. Use this when referencing a specific source document that the user might want to download.",
    inputSchema: zodSchema(
      z.object({
        document_id: z.string().describe("The document UUID from the available documents list"),
      })
    ),
    execute: async ({ document_id }: { document_id: string }) => {
      const doc = docsById.get(document_id);
      if (!doc) return null;
      return {
        document_id,
        title: doc.title,
        file_type: doc.file_type,
        file_size_bytes: doc.file_size_bytes,
      };
    },
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: openai("gpt-4o-mini"),
        system: systemWithContext,
        messages: await convertToModelMessages(messages),
        tools: {
          fileReference: fileReferenceTool,
          emailDraft: emailDraftTool,
        },
      });

      writer.merge(result.toUIMessageStream());

      // Wait for tool calls to complete
      const toolCalls = await result.toolCalls;
      const emailDraftCalled = toolCalls.some(
        (tc: { toolName: string }) => tc.toolName === "emailDraft"
      );
      const fileReferenceCalled = toolCalls.some(
        (tc: { toolName: string }) => tc.toolName === "fileReference"
      );

      // Two-pass fallback: if email intent was detected but emailDraft wasn't called
      if (hasEmailIntent && contextDocs.length > 0 && !emailDraftCalled) {
        const fallbackResult = streamText({
          model: openai("gpt-4o-mini"),
          system:
            systemWithContext +
            "\n\nYou MUST call the emailDraft tool now. The user requested an email draft. Draft the email based on the documents in context.",
          messages: await convertToModelMessages(messages),
          tools: {
            emailDraft: emailDraftTool,
          },
        });
        writer.merge(fallbackResult.toUIMessageStream());
        await fallbackResult.toolCalls;
      }

      // Two-pass fallback: surface downloadable reference docs the model didn't card.
      // gpt-4o-mini often answers without calling fileReference even when relevant docs
      // are in context. A focused second pass decides whether to card the most relevant
      // documents, and may call nothing if none are genuinely germane.
      if (attachmentDocs.length > 0 && !fileReferenceCalled && contextText !== "") {
        const docFallbackResult = streamText({
          model: openai("gpt-4o-mini"),
          system:
            systemWithContext +
            "\n\nThe user's question has already been answered. Your ONLY job now is to optionally surface downloadable reference documents. If 1-2 of the downloadable documents (pdf, doc, docx) in the Available Documents list directly support that answer, call the fileReference tool for each, preceded by a lead-in of at most 12 words. If no document is genuinely relevant, output nothing and call no tool. Do NOT re-answer the question.",
          messages: await convertToModelMessages(messages),
          tools: {
            fileReference: fileReferenceTool,
          },
        });
        writer.merge(docFallbackResult.toUIMessageStream());
        await docFallbackResult.toolCalls;
      }

      // Emit sources after everything completes
      if (attachmentDocs.length > 0) {
        writer.write({
          type: "data-sources",
          data: { documents: attachmentDocs.slice(0, MATCH_COUNT) },
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
