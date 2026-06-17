"use client";

import { useAuiState } from "@assistant-ui/react";
import { CheckIcon, CopyIcon, DownloadIcon, MailIcon } from "lucide-react";
import { useState } from "react";
import { OutlookButton } from "./outlook-button";
import { DocIcon } from "./doc-icon";

export interface EmailDraftAttachment {
  documentId: string;
  title: string;
  fileType: string;
  fileSizeBytes?: number;
}

interface EmailDraftCardProps {
  to: string;
  subject: string;
  body: string;
  attachments?: EmailDraftAttachment[];
  outlookEnabled?: boolean;
}

function buildMailtoLink({ to, subject, body }: Pick<EmailDraftCardProps, "to" | "subject" | "body">): string {
  const subject_ = encodeURIComponent(subject);
  const body_ = encodeURIComponent(body);
  return `mailto:${encodeURIComponent(to)}?subject=${subject_}&body=${body_}`;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmailDraftCard({
  to,
  subject,
  body,
  attachments = [],
  outlookEnabled,
}: EmailDraftCardProps) {
  const mailtoLink = buildMailtoLink({ to, subject, body });
  const [copied, setCopied] = useState(false);

  // Hold the action buttons back until the assistant message has finished
  // streaming, then reveal them — the draft reads as "complete" before you act.
  const isRunning = useAuiState((s) => s.message.status?.type === "running");

  const documentIds = attachments.map((a) => a.documentId);

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="bg-card my-3 w-full max-w-xl overflow-hidden rounded-xl border shadow-sm">
      {/* Header */}
      <div className="bg-muted/40 text-muted-foreground border-border flex items-center gap-2 border-b px-4 py-2.5 font-mono text-[10px] font-semibold tracking-wider uppercase">
        <MailIcon className="size-3.5" />
        Email draft · ready to send
      </div>

      {/* Field rows */}
      <div className="px-4 pt-3.5 pb-1">
        <Field label="To" value={to} />
        <Field label="Subject" value={subject} />
      </div>

      {/* Body */}
      <div className="border-border/60 text-foreground border-t px-4 pt-3 pb-4 text-sm leading-relaxed whitespace-pre-wrap">
        {body}
      </div>

      {/* Attachments — live inside the draft, above the actions */}
      {attachments.length > 0 && (
        <div className="px-4 pb-1">
          <p className="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.1em] uppercase">
            Source file{attachments.length > 1 ? "s" : ""} · download to attach
          </p>
          <div className="flex flex-col gap-2">
            {attachments.map((att) => (
              <a
                key={att.documentId}
                href={`/api/download?document_id=${att.documentId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-background hover:border-muted-foreground/40 flex items-center gap-3 rounded-[10px] border p-2.5 transition-all hover:bg-card hover:shadow-sm"
              >
                <DocIcon ext={(att.fileType ?? "file").toLowerCase()} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-primary truncate text-[13px] font-semibold">{att.title}</p>
                  <p className="text-muted-foreground font-mono text-[10.5px]">
                    {(att.fileType ?? "").toUpperCase()}
                    {att.fileSizeBytes ? ` · ${formatFileSize(att.fileSizeBytes)}` : ""}
                  </p>
                </div>
                <span className="text-muted-foreground group-hover:text-ring inline-flex shrink-0 items-center gap-1 text-xs font-semibold transition-colors">
                  <DownloadIcon className="size-3.5" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Actions — revealed once streaming completes */}
      <div className="border-border/60 bg-muted/30 mt-2 border-t px-4 py-3">
        {isRunning ? (
          <div
            className="text-muted-foreground flex items-center gap-2 text-xs"
            aria-label="Finishing draft"
          >
            <span className="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full" />
            Finishing draft…
          </div>
        ) : (
          <div className="animate-in fade-in-0 slide-in-from-bottom-1 flex flex-wrap items-center gap-2 duration-300">
            {outlookEnabled && (
              <OutlookButton to={to} subject={subject} body={body} documentIds={documentIds} />
            )}
            <a
              href={mailtoLink}
              className="bg-accent text-accent-foreground inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-tight transition-[filter] hover:brightness-105 active:translate-y-px"
            >
              <MailIcon className="size-4" />
              Draft an Email
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="text-foreground bg-card hover:bg-muted/60 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
            >
              {copied ? (
                <>
                  <CheckIcon className="size-3.5" /> Copied
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5" /> Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1 text-sm leading-snug">
      <span className="text-muted-foreground w-14 shrink-0 pt-0.5 font-mono text-[10px] tracking-wider uppercase">
        {label}
      </span>
      <span className="text-primary min-w-0 flex-1 font-medium break-words">{value}</span>
    </div>
  );
}
