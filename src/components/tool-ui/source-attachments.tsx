"use client";

import { makeAssistantDataUI, useMessage } from "@assistant-ui/react";
import { FileCard } from "@/components/tool-ui/file-card";
import {
  deduplicateSources,
  type SourceDocument,
} from "@/lib/deduplicate-sources";

interface SourcesData {
  documents: SourceDocument[];
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
      <div className="mt-2">
        <p className="text-xs text-muted-foreground mb-1">Sources</p>
        {sources.map((doc) => (
          <FileCard
            key={doc.id}
            documentId={doc.id}
            title={doc.title}
            fileType={doc.file_type}
            fileSizeBytes={doc.file_size_bytes}
          />
        ))}
      </div>
    );
  },
});
