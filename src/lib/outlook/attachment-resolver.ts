import { createServiceClient } from "@/lib/supabase/server";

export interface ResolvedAttachment {
  documentId: string;
  filename: string;
  contentType: string;
  contentBytes: string;
  sizeBytes: number;
}

export interface AttachmentResolutionResult {
  resolved: ResolvedAttachment[];
  skipped: string[];
}

const CONTENT_TYPE_MAP: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  txt: "text/plain",
  csv: "text/csv",
  html: "text/html",
  eml: "message/rfc822",
};

function getContentType(fileType: string): string {
  return CONTENT_TYPE_MAP[fileType.toLowerCase()] || "application/octet-stream";
}

export function deduplicateDocumentIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function buildFilename(title: string, fileType: string): string {
  return `${title}.${fileType}`;
}

export async function resolveAttachments(
  documentIds: string[]
): Promise<AttachmentResolutionResult> {
  const uniqueIds = deduplicateDocumentIds(documentIds);
  const resolved: ResolvedAttachment[] = [];
  const skipped: string[] = [];

  if (uniqueIds.length === 0) {
    return { resolved, skipped };
  }

  const supabase = createServiceClient();

  const { data: documents, error: queryError } = await supabase
    .from("documents")
    .select("id, storage_path, title, file_type")
    .in("id", uniqueIds);

  if (queryError) {
    return { resolved, skipped: uniqueIds };
  }

  const documentMap = new Map((documents ?? []).map((doc) => [doc.id, doc]));

  for (const id of uniqueIds) {
    const doc = documentMap.get(id);

    if (!doc) {
      skipped.push(id);
      continue;
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 3600);

    if (urlError || !signedUrlData) {
      skipped.push(id);
      continue;
    }

    try {
      const response = await fetch(signedUrlData.signedUrl);

      if (!response.ok) {
        skipped.push(id);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const contentBytes = Buffer.from(arrayBuffer).toString("base64");

      resolved.push({
        documentId: id,
        filename: buildFilename(doc.title, doc.file_type),
        contentType: getContentType(doc.file_type),
        contentBytes,
        sizeBytes: arrayBuffer.byteLength,
      });
    } catch {
      skipped.push(id);
    }
  }

  return { resolved, skipped };
}
