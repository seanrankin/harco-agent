import { cn } from "@/lib/utils";

interface SpecTableProps {
  /** Two-column key/value rows. */
  rows: ReadonlyArray<readonly [key: string, value: string]>;
  className?: string;
}

/**
 * Two-column key/value spec table — matches the `.spec-table` pattern from the
 * design mockup. Single source of truth for spec/data tabular styling.
 *
 * The LLM-rendered markdown tables in `markdown-text.tsx` share the same look
 * via their own component overrides; keep both in sync visually.
 *
 * TODO(redesign): register as `makeAssistantToolUI({ toolName: "lookup_spec" })`
 * once the backend exposes that tool. Until then this component is exported
 * but unused — preserves the styling as a contract for the future tool.
 */
export function SpecTable({ rows, className }: SpecTableProps) {
  return (
    <div
      className={cn(
        "bg-card border-border my-3 w-full overflow-hidden rounded-[10px] border",
        className
      )}
    >
      {rows.map(([key, value], i) => (
        <div
          key={`${key}-${i}`}
          className="grid grid-cols-[132px_1fr] border-b border-border/60 last:border-b-0"
        >
          <div className="bg-muted/40 text-muted-foreground border-border/60 border-r px-3.5 py-2.5 font-mono text-[11px] tracking-wider uppercase">
            {key}
          </div>
          <div className="text-primary px-3.5 py-2.5 font-mono text-xs font-medium">{value}</div>
        </div>
      ))}
    </div>
  );
}
