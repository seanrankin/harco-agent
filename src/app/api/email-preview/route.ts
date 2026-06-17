import { NextResponse } from "next/server";
import { extname } from "path";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import type { EmailPreview, EmailPreviewAttachment } from "@/lib/email-preview";

const EMAIL_TYPES = new Set(["eml", "msg"]);

function formatDate(value: Date | string | undefined | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

function nameAddr(value: { name?: string; address?: string } | undefined): {
  name: string;
  addr: string;
} {
  if (!value) return { name: "", addr: "" };
  return { name: value.name || value.address || "", addr: value.address || "" };
}

interface ParsedAddress {
  value?: { name?: string; address?: string }[];
}
interface ParsedMail {
  subject?: string;
  from?: ParsedAddress;
  to?: ParsedAddress | ParsedAddress[];
  date?: Date;
  text?: string;
  html?: string | false;
}

async function parseEml(buffer: Buffer) {
  const { simpleParser } = (await import("mailparser")) as {
    simpleParser: (input: Buffer) => Promise<ParsedMail>;
  };
  const parsed = await simpleParser(buffer);

  const from = nameAddr(parsed.from?.value?.[0]);
  const to = nameAddr(Array.isArray(parsed.to) ? parsed.to[0]?.value?.[0] : parsed.to?.value?.[0]);

  let body = parsed.text ?? "";
  if (!body && parsed.html) {
    body = parsed.html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<\/(p|div|br|tr|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n");
  }

  return {
    subject: parsed.subject ?? "",
    fromName: from.name,
    from: from.addr,
    toName: to.name,
    to: to.addr,
    date: formatDate(parsed.date),
    body: body.trim(),
  };
}

async function parseMsg(buffer: Buffer) {
  const { default: MsgReader } = await import("@kenjiuno/msgreader");
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  const reader = new MsgReader(arrayBuffer);
  const data = reader.getFileData() as {
    subject?: string;
    senderName?: string;
    senderEmail?: string;
    body?: string;
    messageDeliveryTime?: string;
    headers?: string;
    recipients?: { name?: string; email?: string; smtpAddress?: string }[];
  };

  const recipient = data.recipients?.[0];
  return {
    subject: data.subject ?? "",
    fromName: data.senderName ?? data.senderEmail ?? "",
    from: data.senderEmail ?? "",
    toName: recipient?.name ?? "",
    to: recipient?.email ?? recipient?.smtpAddress ?? "",
    date: formatDate(data.messageDeliveryTime),
    body: (data.body ?? "").trim(),
  };
}

export async function GET(request: Request) {
  const authResponse = await requireAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("document_id");
  if (!documentId) {
    return new Response("Missing document_id parameter", { status: 400 });
  }

  // Service client bypasses RLS — auth was enforced above.
  const service = createServiceClient();

  const { data: doc, error: docError } = await service
    .from("documents")
    .select("storage_path, title, file_type")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    return new Response("Document not found", { status: 404 });
  }

  const ext = (doc.file_type ?? "").toLowerCase();
  if (!EMAIL_TYPES.has(ext)) {
    return new Response("Document is not an email", { status: 400 });
  }

  const { data: blob, error: dlError } = await service.storage
    .from("documents")
    .download(doc.storage_path);

  if (dlError || !blob) {
    return new Response("Failed to read email", { status: 500 });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());

  let parsed;
  try {
    parsed = ext === "msg" ? await parseMsg(buffer) : await parseEml(buffer);
  } catch {
    return new Response("Failed to parse email", { status: 500 });
  }

  // Attachment download links come from child documents ingested under this email.
  const { data: children } = await service
    .from("documents")
    .select("id, title, file_type, file_size_bytes")
    .eq("source_email_id", documentId);

  const attachments: EmailPreviewAttachment[] = (children ?? []).map((c) => {
    const attExt = (c.file_type ?? "").toLowerCase();
    const hasExt = extname(c.title).toLowerCase().slice(1) === attExt;
    return {
      name: hasExt ? c.title : `${c.title}.${attExt}`,
      ext: attExt,
      sizeBytes: c.file_size_bytes ?? 0,
      documentId: c.id,
    };
  });

  const payload: EmailPreview = {
    subject: parsed.subject || doc.title,
    fromName: parsed.fromName,
    from: parsed.from,
    toName: parsed.toName,
    to: parsed.to,
    date: parsed.date,
    body: parsed.body,
    attachments,
  };

  return NextResponse.json(payload);
}
