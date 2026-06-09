export interface SourceDocument {
  id: string;
  title: string;
  file_type: string;
  file_size_bytes: number;
}

export function deduplicateSources(
  sourceDocuments: SourceDocument[],
  toolCallDocumentIds: string[],
): SourceDocument[] {
  const toolCallIdSet = new Set(
    toolCallDocumentIds.map((id) => id.toLowerCase()),
  );
  return sourceDocuments.filter(
    (doc) => !toolCallIdSet.has(doc.id.toLowerCase()),
  );
}
