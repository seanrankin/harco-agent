export const EMAIL_FILE_TYPES = new Set(["eml", "msg"]);

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
    case "eml":
    case "msg":
      return "bg-primary";
    default:
      return "bg-muted-foreground";
  }
}

/**
 * Document-icon block — colored tile with an ext label and a folded corner.
 * Matches the .doc-icon pattern from the design mockup. Email files render an
 * "@" glyph on a navy tile instead of the extension label.
 */
export function DocIcon({ ext, size = "md" }: { ext: string; size?: "sm" | "md" }) {
  const isEmail = EMAIL_FILE_TYPES.has(ext);
  const dims = size === "sm" ? "h-9 w-7" : "h-12 w-10";
  const fontSize = size === "sm" ? "text-[8px]" : "text-[9px]";
  return (
    <div
      className={`relative shrink-0 rounded-sm ${dims} ${extColor(ext)} grid place-items-center overflow-hidden text-white shadow-sm`}
    >
      {/* folded corner */}
      <span
        aria-hidden="true"
        className="absolute top-0 right-0 size-2.5 bg-background"
        style={{ clipPath: "polygon(0 0, 100% 100%, 100% 0)" }}
      />
      {isEmail ? (
        <span className={`font-mono font-bold ${size === "sm" ? "text-sm" : "text-base"}`}>@</span>
      ) : (
        <span
          className={`grid h-full w-full place-items-end pb-1 font-mono font-semibold tracking-wider ${fontSize}`}
        >
          {ext.toUpperCase()}
        </span>
      )}
    </div>
  );
}
