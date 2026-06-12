import type { SourceDocument } from "@/lib/types";

const EMAIL_TYPES = new Set(["eml", "msg"]);

export function classifyEmailSources(docs: SourceDocument[]): {
  emailSources: SourceDocument[];
  otherSources: SourceDocument[];
} {
  return {
    emailSources: docs.filter((d) => EMAIL_TYPES.has(d.file_type)),
    otherSources: docs.filter((d) => !EMAIL_TYPES.has(d.file_type)),
  };
}
