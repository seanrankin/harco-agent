"use client";

import { makeAssistantDataUI, useMessage } from "@assistant-ui/react";
import { deduplicateSources } from "@/components/tool-ui/deduplicate-sources";
import type { SourceDocument } from "@/lib/types";

interface SourcesData {
  documents: SourceDocument[];
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const SourceAttachmentsDataUI = makeAssistantDataUI<SourcesData>({
  name: "sources",
  render: function SourceAttachments({ data }) {
    const message = useMessage();

    if (!data?.documents || !Array.isArray(data.documents)) {
      return null;
    }

    const toolCallDocumentIds = message.content
      .filter(
        (part): part is Extract<typeof part, { type: "tool-call" }> =>
          part.type === "tool-call" && part.toolName === "fileReference",
      )
      .map((part) => (part.args as { document_id?: string }).document_id ?? "")
      .filter(Boolean);

    const sources = deduplicateSources(data.documents, toolCallDocumentIds);

    if (sources.length === 0) {
      return null;
    }

    return (
      <div className="border-border/60 mt-5 border-t pt-3">
        <p className="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.12em] uppercase">
          Sources · grounded in {sources.length} document
          {sources.length === 1 ? "" : "s"}
        </p>
        <ul className="-mx-2 flex flex-col gap-0.5">
          {sources.map((doc, i) => {
            const ext = (doc.file_type ?? "file").toLowerCase();
            const size = formatFileSize(doc.file_size_bytes);
            return (
              <li
                key={doc.id}
                /* Citation badges in the prose scroll to these anchors */
                id={`source-${i + 1}`}
              >
                <a
                  href={`/api/download?document_id=${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:bg-ring/5 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] transition-colors"
                >
                  <span className="bg-ring/10 text-ring inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] font-mono text-[9.5px] font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-primary min-w-0 flex-1 truncate font-medium">
                    {doc.title}
                  </span>
                  <span className="text-muted-foreground hidden font-mono text-[10.5px] tracking-wide sm:inline">
                    {ext.toUpperCase()}
                    {size && ` · ${size}`}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    );
  },
});
