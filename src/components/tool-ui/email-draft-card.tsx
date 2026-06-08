import { Mail } from "lucide-react";

interface EmailDraftCardProps {
  to: string;
  subject: string;
  body: string;
}

function buildMailtoLink({ to, subject, body }: EmailDraftCardProps): string {
  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}

export function EmailDraftCard({ to, subject, body }: EmailDraftCardProps) {
  const mailtoLink = buildMailtoLink({ to, subject, body });

  return (
    <div className="my-2 max-w-sm rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <Mail className="h-6 w-6 shrink-0 text-blue-600 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Email Draft</p>
          <p className="text-xs text-muted-foreground truncate">To: {to}</p>
          <p className="text-xs text-muted-foreground truncate">
            Subject: {subject}
          </p>
          <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
            {body}
          </p>
        </div>
      </div>
      <a
        href={mailtoLink}
        className="mt-3 flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Mail className="h-4 w-4" />
        Open in Outlook
      </a>
    </div>
  );
}
