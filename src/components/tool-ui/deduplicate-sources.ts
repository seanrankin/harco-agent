import type { SourceDocument } from "@/lib/types";

export function deduplicateSources(
  sourceDocuments: SourceDocument[],
  toolCallDocumentIds: string[]
): SourceDocument[] {
  const toolCallIdSet = new Set(toolCallDocumentIds.map((id) => id.toLowerCase()));
  return sourceDocuments.filter((doc) => !toolCallIdSet.has(doc.id.toLowerCase()));
}
