"use client";

import { useEffect, useState, type FC } from "react";
import { useAuiState } from "@assistant-ui/react";
import { MenuIcon } from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

interface TopBarProps {
  onMenuClick: () => void;
}

export const TopBar: FC<TopBarProps> = ({ onMenuClick }) => {
  const isEmpty = useAuiState((s) => s.thread.isEmpty);
  const title = useAuiState((s) => {
    const id = s.threads.mainThreadId;
    return s.threads.threadItems.find((t) => t.id === id)?.title;
  });
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/documents/count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.count === "number") {
          setCount(data.count);
        }
      })
      .catch(() => {
        // Silent: top bar meta is non-critical.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayTitle = isEmpty ? "New question" : (title ?? "New question");

  return (
    <header className="border-border bg-background flex h-14 shrink-0 items-center gap-3 border-b px-4 lg:px-6">
      <TooltipIconButton
        tooltip="Open menu"
        onClick={onMenuClick}
        aria-label="Open menu"
        variant="ghost"
        className="text-primary -ml-2 size-9 lg:hidden"
      >
        <MenuIcon className="size-5" />
      </TooltipIconButton>

      <h1 className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
        {displayTitle}
      </h1>

      <div className="text-muted-foreground hidden items-center gap-2 font-mono text-[11px] tracking-wide sm:flex">
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-emerald-500"
        />
        {count !== null && (
          <span>
            {count.toLocaleString()} documents indexed · synced today
          </span>
        )}
      </div>
    </header>
  );
};
