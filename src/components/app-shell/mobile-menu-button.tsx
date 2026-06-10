"use client";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";
import { MenuIcon } from "lucide-react";
import type { FC } from "react";

interface MobileMenuButtonProps {
  /** Whether the sidebar drawer is currently open. When true, the button hides. */
  open: boolean;
  onClick: () => void;
}

/**
 * Floating hamburger that opens the sidebar drawer at ≤lg breakpoints.
 * Hidden on desktop (sidebar is always visible there) and hidden while
 * the drawer is open (so it doesn't sit underneath it).
 */
export const MobileMenuButton: FC<MobileMenuButtonProps> = ({ open, onClick }) => {
  return (
    <TooltipIconButton
      tooltip="Open menu"
      onClick={onClick}
      aria-label="Open menu"
      variant="outline"
      className={cn(
        "bg-card text-primary fixed top-3 left-3 z-30 size-10 rounded-lg shadow-sm transition-opacity lg:hidden",
        open && "pointer-events-none opacity-0"
      )}
    >
      <MenuIcon className="size-5" />
    </TooltipIconButton>
  );
};
