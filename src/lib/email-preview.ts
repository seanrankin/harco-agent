/** Shared (client-safe) types for the email reader preview. */

export interface EmailPreviewAttachment {
  name: string;
  ext: string;
  sizeBytes: number;
  /** Present when the attachment was ingested as its own document and can be downloaded. */
  documentId?: string;
}

export interface EmailPreview {
  subject: string;
  fromName: string;
  from: string;
  toName: string;
  to: string;
  /** Pre-formatted send date, e.g. "Tue, Mar 18, 2025 · 9:42 AM". */
  date: string;
  body: string;
  attachments: EmailPreviewAttachment[];
}
