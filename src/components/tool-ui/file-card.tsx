"use client";

import { ArrowUpRightIcon, DownloadIcon, MailIcon } from "lucide-react";
import { useState } from "react";
import { DocIcon, EMAIL_FILE_TYPES } from "./doc-icon";
import { EmailReaderModal } from "./email-reader-modal";
import { useEmailPreview } from "./use-email-preview";

interface FileCardProps {
  documentId: string;
  title: string;
  fileType?: string;
  fileSizeBytes?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileCard({ documentId, title, fileType, fileSizeBytes }: FileCardProps) {
  const ext = (fileType ?? "file").toLowerCase();

  if (EMAIL_FILE_TYPES.has(ext)) {
    return (
      <EmailFileCard
        documentId={documentId}
        title={title}
        ext={ext}
        fileSizeBytes={fileSizeBytes}
      />
    );
  }

  return (
    <a
      href={`/api/download?document_id=${documentId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card hover:border-muted-foreground/40 my-2 flex w-full max-w-xl items-center gap-3.5 rounded-xl border p-3 transition-all hover:shadow-sm"
    >
      <DocIcon ext={ext} />
      <div className="min-w-0 flex-1">
        <p className="text-primary truncate text-sm leading-snug font-semibold tracking-tight">
          {title}
        </p>
        <p className="text-muted-foreground mt-0.5 font-mono text-[10px] tracking-wide">
          {ext.toUpperCase()} · {formatFileSize(fileSizeBytes ?? 0)}
        </p>
      </div>
      <span className="text-ring inline-flex shrink-0 items-center gap-1 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100">
        Download
        <ArrowUpRightIcon className="size-3.5" />
      </span>
    </a>
  );
}

function EmailFileCard({
  documentId,
  title,
  ext,
  fileSizeBytes,
}: {
  documentId: string;
  title: string;
  ext: string;
  fileSizeBytes?: number;
}) {
  const [open, setOpen] = useState(false);
  const preview = useEmailPreview(documentId, true);

  const sub =
    preview.status === "ready" && (preview.data.fromName || preview.data.date)
      ? [preview.data.fromName, preview.data.date].filter(Boolean).join(" · ")
      : `${ext.toUpperCase()} · ${formatFileSize(fileSizeBytes ?? 0)}`;

  return (
    <>
      <div className="bg-card my-2 flex w-full max-w-xl items-center gap-3.5 rounded-xl border p-3 transition-colors max-[480px]:flex-wrap">
        <DocIcon ext={ext} />
        <div className="min-w-0 flex-1">
          <p className="text-primary truncate text-sm leading-snug font-semibold tracking-tight">
            {title}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-[11px] tracking-wide">{sub}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 max-[480px]:w-full max-[480px]:justify-end">
          <a
            href={`/api/download?document_id=${documentId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:bg-primary/8 hover:text-primary inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
          >
            <DownloadIcon className="size-3.5" />
            Download
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-ring hover:bg-ring/10 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
          >
            <MailIcon className="size-3.5" />
            Preview
          </button>
        </div>
      </div>
      <EmailReaderModal documentId={documentId} title={title} open={open} onOpenChange={setOpen} />
    </>
  );
}
