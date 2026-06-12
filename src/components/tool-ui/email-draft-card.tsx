"use client";

import { CheckIcon, CopyIcon, MailIcon } from "lucide-react";
import { useState } from "react";

interface EmailDraftCardProps {
  to: string;
  subject: string;
  body: string;
}

function buildMailtoLink({ to, subject, body }: EmailDraftCardProps): string {
  const subject_ = encodeURIComponent(subject);
  const body_ = encodeURIComponent(body);
  return `mailto:${encodeURIComponent(to)}?subject=${subject_}&body=${body_}`;
}

export function EmailDraftCard({ to, subject, body }: EmailDraftCardProps) {
  const mailtoLink = buildMailtoLink({ to, subject, body });
  const [copied, setCopied] = useState(false);

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

      {/* Actions */}
      <div className="border-border/60 bg-muted/30 flex flex-wrap items-center gap-2 border-t px-4 py-3">
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
