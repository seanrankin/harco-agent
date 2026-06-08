import { FileText, FileSpreadsheet, File } from "lucide-react";

interface FileCardProps {
  documentId: string;
  title: string;
  fileType: string;
  fileSizeBytes: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ fileType }: { fileType: string }) {
  const className = "h-8 w-8 shrink-0";
  switch (fileType) {
    case "docx":
    case "doc":
      return <FileText className={`${className} text-blue-600`} />;
    case "pdf":
      return <FileText className={`${className} text-red-600`} />;
    case "xlsx":
    case "xls":
    case "csv":
      return <FileSpreadsheet className={`${className} text-green-600`} />;
    default:
      return <File className={`${className} text-gray-500`} />;
  }
}

export function FileCard({
  documentId,
  title,
  fileType,
  fileSizeBytes,
}: FileCardProps) {
  return (
    <a
      href={`/api/download?document_id=${documentId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-accent my-2 max-w-sm"
    >
      <FileIcon fileType={fileType} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">
          {fileType.toUpperCase()} &middot; {formatFileSize(fileSizeBytes)}
        </p>
      </div>
    </a>
  );
}
