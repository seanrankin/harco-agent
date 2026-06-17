"use client";

import { type FC } from "react";
import { ThreadListPrimitive } from "@assistant-ui/react";
import { useAuiState } from "@assistant-ui/store";
import { Diamond } from "@/components/brand/diamond";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";
import { ThreadItem } from "./thread-item";
import { UserIdentity } from "./user-identity";
import { LogOutIcon, PlusIcon, XIcon } from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onNewQuestion: () => void;
  onSignOut: () => void;
  userDisplayName?: string | null;
  userEmail?: string | null;
}

const EmptyThreadList: FC = () => {
  const count = useAuiState((s) => s.threads.threadIds.length);
  if (count > 0) return null;
  return (
    <p className="text-muted-foreground px-4 py-8 text-center text-sm">No conversations yet</p>
  );
};

export const Sidebar: FC<SidebarProps> = ({
  open,
  onClose,
  onNewQuestion,
  onSignOut,
  userDisplayName,
  userEmail,
}) => {
  return (
    <>
      {/* Drawer scrim (mobile only) */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 cursor-default bg-primary/25 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        aria-label="Knowledge base navigation"
        className={cn(
          "bg-sidebar border-border flex h-full w-72 shrink-0 flex-col border-r",
          "fixed inset-y-0 left-0 z-50 shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0 lg:shadow-none"
        )}
      >
        {/* Brand block */}
        <div className="border-border/60 flex items-center gap-3 border-b px-5 py-5">
          <Diamond size={36} color="var(--primary)" />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-primary font-serif text-base font-semibold tracking-tight">
              Harco Fittings
            </span>
            <span className="text-muted-foreground font-mono text-[9px] tracking-widest uppercase">
              Knowledge Base
            </span>
          </div>
          <TooltipIconButton
            tooltip="Close menu"
            onClick={onClose}
            className="text-muted-foreground hover:text-primary -mr-1 size-8 lg:hidden"
            aria-label="Close menu"
          >
            <XIcon />
          </TooltipIconButton>
        </div>

        {/* New question */}
        <div className="p-4">
          <Button
            type="button"
            variant="default"
            onClick={onNewQuestion}
            className="w-full justify-start gap-2 rounded-lg font-semibold"
          >
            <PlusIcon className="size-4" />
            New question
          </Button>
        </div>

        {/* Thread history list */}
        <ThreadListPrimitive.Root className="flex-1 overflow-y-auto">
          <div className="space-y-0.5 px-2">
            <ThreadListPrimitive.Items components={{ ThreadListItem: ThreadItem }} />
          </div>
          <EmptyThreadList />
        </ThreadListPrimitive.Root>

        {/* Footer — sign out */}
        <div className="border-border/60 flex items-center border-t p-3">
          <UserIdentity displayName={userDisplayName} email={userEmail} />
          <TooltipIconButton
            tooltip="Sign out"
            onClick={onSignOut}
            className="text-muted-foreground hover:text-primary size-9 shrink-0"
            aria-label="Sign out"
          >
            <LogOutIcon className="size-4" />
          </TooltipIconButton>
        </div>
      </aside>
    </>
  );
};
