/** Shared (client-safe) types for the email reader preview. */

export interface EmailPreviewAttachment {
  name: string;
  ext: string;
  sizeBytes: number;
  /** Present when the attachment was ingested as its own document and can be downloaded. */
  documentId?: string;
}

/**
 * True for legacy Exchange / X.500 directory addresses that aren't human-readable,
 * e.g. "IMCEAEX-_O=HARCO_OU=...CN=RECIPIENTS_CN=JRIORDAN@eurprd05.prod.outlook.com".
 * These leak into the from/to fields of some .msg/.eml files and should be hidden.
 */
export function isLegacyExchangeAddress(value: string | null | undefined): boolean {
  if (!value) return false;
  if (/^IMCEAEX/i.test(value)) return true;
  const localPart = value.split("@")[0];
  if (/[_/](?:O|OU|CN)=/i.test(localPart)) return true;
  return localPart.length > 64;
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
