import { classifyEmailSources } from "@/lib/email-sources";
import type { SourceDocument } from "@/lib/types";

export function formatDocumentContext(contextDocs: SourceDocument[], contextText: string): string {
  const { emailSources } = classifyEmailSources(contextDocs);
  const emailIds = new Set(emailSources.map((e) => e.id));

  const docList = contextDocs
    .map((d) => {
      const tags: string[] = [];
      if (emailIds.has(d.id)) tags.push("[EMAIL SOURCE]");
      if (d.source_email_id && emailIds.has(d.source_email_id)) {
        tags.push(`[ATTACHMENT OF EMAIL ${d.source_email_id}]`);
      }
      const tagStr = tags.length > 0 ? ` ${tags.join(" ")}` : "";
      return `- [${d.id}] "${d.title}" (${d.file_type}, ${d.file_size_bytes} bytes)${tagStr}`;
    })
    .join("\n");

  return `## Available Documents for Reference\n${docList}\n\n## Email Sources Present: ${emailSources.length > 0 ? "YES" : "NO"}\n\n## Retrieved Context\n${contextText || "No relevant context found for this query."}`;
}
