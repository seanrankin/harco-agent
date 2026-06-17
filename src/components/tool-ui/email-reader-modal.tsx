"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { DownloadIcon, LoaderIcon, MailIcon, PaperclipIcon, XIcon } from "lucide-react";
import { Fragment } from "react";
import type { EmailPreview, EmailPreviewAttachment } from "@/lib/email-preview";
import { useEmailPreview } from "./use-email-preview";
import { DocIcon } from "./doc-icon";

interface EmailReaderModalProps {
  documentId: string;
  /** Fallback title shown in the toolbar/title before the parsed subject loads. */
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "@"
  );
}

export function EmailReaderModal({ documentId, title, open, onOpenChange }: EmailReaderModalProps) {
  // Only fetch once the modal is actually opened.
  const state = useEmailPreview(documentId, open);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[120] bg-primary/30 supports-backdrop-filter:backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-150" />
        <DialogPrimitive.Popup
          data-slot="email-reader"
          className="bg-card fixed top-1/2 left-1/2 z-[120] flex max-h-[calc(100dvh-3.5rem)] w-[calc(100%-2rem)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl shadow-2xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-bottom-1 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-200 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:rounded-none"
        >
          {/* Toolbar */}
          <div className="border-line-soft flex shrink-0 items-center gap-2.5 border-b bg-muted/40 py-3 pr-3.5 pl-4.5">
            <span className="text-muted-foreground inline-flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase">
              <MailIcon className="text-primary size-3.5" />
              Email · read-only preview
            </span>
            <DialogPrimitive.Close
              className="text-muted-foreground hover:bg-primary/8 hover:text-primary ml-auto grid size-8.5 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors"
              aria-label="Close email"
            >
              <XIcon className="size-4.5" />
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable email body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-1.5 sm:px-7.5">
            {state.status === "loading" && (
              <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
                <LoaderIcon className="size-4 animate-spin" />
                Loading email…
              </div>
            )}

            {state.status === "error" && (
              <div className="text-muted-foreground py-10 text-sm">
                <DialogPrimitive.Title className="text-primary mb-1 font-serif text-lg font-semibold">
                  {title}
                </DialogPrimitive.Title>
                Couldn&rsquo;t load this email. You can still download it below.
              </div>
            )}

            {state.status === "ready" && <EmailBody data={state.data} fallbackTitle={title} />}
          </div>

          {/* Footer */}
          <div className="border-line-soft flex shrink-0 items-center gap-2.5 border-t bg-muted/30 px-4.5 py-3.5">
            <a
              href={`/api/download?document_id=${documentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-accent text-accent-foreground inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-tight transition-[filter] hover:brightness-105 active:translate-y-px"
            >
              <DownloadIcon className="size-4" />
              Download email
            </a>
            <DialogPrimitive.Close className="text-foreground bg-card hover:bg-muted/60 inline-flex cursor-pointer items-center rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors">
              Close
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function EmailBody({ data, fallbackTitle }: { data: EmailPreview; fallbackTitle: string }) {
  const subject = data.subject || fallbackTitle;
  return (
    <>
      <DialogPrimitive.Title className="text-primary mb-5 font-serif text-2xl leading-tight font-semibold tracking-tight text-pretty">
        {subject}
      </DialogPrimitive.Title>

      <div className="flex items-start gap-3.5">
        <div className="bg-primary grid size-10.5 shrink-0 place-items-center rounded-full text-sm font-bold tracking-wide text-white">
          {initialsOf(data.fromName)}
        </div>
        <div className="min-w-0 flex-1 pt-px">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-primary text-sm font-bold">{data.fromName || data.from}</span>
            {data.from && (
              <span className="text-muted-foreground font-mono text-[11.5px]">
                &lt;{data.from}&gt;
              </span>
            )}
          </div>
          {(data.toName || data.to) && (
            <div className="text-muted-foreground mt-0.5 text-xs">
              to {data.toName} {data.to && `<${data.to}>`}
            </div>
          )}
        </div>
        {data.date && (
          <div className="text-muted-foreground shrink-0 pt-0.5 text-right font-mono text-[11px] whitespace-nowrap max-sm:hidden">
            {data.date}
          </div>
        )}
      </div>

      <div className="bg-line-soft my-5 h-px" />

      <div className="text-card-foreground text-[15px] leading-relaxed">
        {data.body.split(/\n\n+/).map((para, i) => (
          <p key={i} className="mb-4 last:mb-0">
            {para.split("\n").map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </p>
        ))}
      </div>

      {data.attachments.length > 0 && (
        <div className="border-line-soft mt-6 border-t pt-4.5">
          <div className="text-muted-foreground mb-3 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase">
            <PaperclipIcon className="size-3" />
            {data.attachments.length} attachment{data.attachments.length > 1 ? "s" : ""}
          </div>
          <div className="flex flex-col gap-2.5">
            {data.attachments.map((att, i) => (
              <AttachmentChip key={att.documentId ?? i} att={att} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function AttachmentChip({ att }: { att: EmailPreviewAttachment }) {
  const size = formatFileSize(att.sizeBytes);
  const inner = (
    <>
      <DocIcon ext={att.ext} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-primary truncate text-[13px] font-semibold">{att.name}</p>
        <p className="text-muted-foreground font-mono text-[10.5px]">
          {att.ext.toUpperCase()}
          {size && ` · ${size}`}
        </p>
      </div>
      <DownloadIcon className="text-muted-foreground group-hover:text-ring size-4 shrink-0 transition-colors" />
    </>
  );

  const className =
    "group bg-card hover:border-muted-foreground/40 flex items-center gap-3 rounded-[10px] border p-3 text-left transition-all hover:shadow-sm";

  return att.documentId ? (
    <a
      href={`/api/download?document_id=${att.documentId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {inner}
    </a>
  ) : (
    <div className={className.replace("hover:shadow-sm", "")}>{inner}</div>
  );
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
