import { ArrowUpRightIcon } from "lucide-react";

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

function extColor(ext: string): string {
  switch (ext) {
    case "pdf":
      return "bg-pdf";
    case "docx":
    case "doc":
      return "bg-docx";
    case "xlsx":
    case "xls":
    case "csv":
      return "bg-xlsx";
    default:
      return "bg-muted-foreground";
  }
}

/**
 * Document-icon block — colored card with ext label and a folded corner.
 * Matches the .doc-icon pattern from the design mockup.
 */
export function DocIcon({
  ext,
  size = "md",
}: {
  ext: string;
  size?: "sm" | "md";
}) {
  const label = ext.toUpperCase();
  const dims = size === "sm" ? "h-9 w-7" : "h-12 w-10";
  const fontSize = size === "sm" ? "text-[8px]" : "text-[9px]";
  return (
    <div
      className={`relative shrink-0 rounded-sm ${dims} ${extColor(ext)} grid place-items-end overflow-hidden text-white shadow-sm`}
    >
      {/* folded corner */}
      <span
        aria-hidden="true"
        className="absolute top-0 right-0 size-2.5 bg-background"
        style={{
          clipPath: "polygon(0 0, 100% 100%, 100% 0)",
        }}
      />
      <span
        className={`pb-1 font-mono font-semibold tracking-wider ${fontSize}`}
      >
        {label}
      </span>
    </div>
  );
}

export function FileCard({
  documentId,
  title,
  fileType,
  fileSizeBytes,
}: FileCardProps) {
  const ext = (fileType ?? "file").toLowerCase();
  return (
    <a
      href={`/api/download?document_id=${documentId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card hover:border-muted-foreground/40 my-2 flex w-full max-w-md items-center gap-3.5 rounded-xl border p-3 transition-all hover:shadow-sm"
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
