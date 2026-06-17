import type { SourceDocument } from "@/lib/types";

export function deduplicateSources(
  sourceDocuments: SourceDocument[],
  toolCallDocumentIds: string[]
): SourceDocument[] {
  const toolCallIdSet = new Set(toolCallDocumentIds.map((id) => id.toLowerCase()));
  const seen = new Set<string>();
  return sourceDocuments.filter((doc) => {
    const id = doc.id.toLowerCase();
    if (toolCallIdSet.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
