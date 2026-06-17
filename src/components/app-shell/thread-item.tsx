"use client";

import { useState, useRef, useEffect, useCallback, type FC } from "react";
import {
  ThreadListItemPrimitive,
  useThreadListItem,
  useThreadListItemRuntime,
} from "@assistant-ui/react";
import { ArchiveIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { truncatePreview, validateTitle } from "@/lib/thread-utils";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const ThreadItem: FC = () => {
  const state = useThreadListItem();
  const runtime = useThreadListItemRuntime();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayTitle = state.title ? state.title : truncatePreview("New conversation");

  const startRename = useCallback(() => {
    setRenameValue(state.title ?? "");
    setIsRenaming(true);
  }, [state.title]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const confirmRename = useCallback(async () => {
    const result = validateTitle(renameValue);
    if (!result.valid) {
      setIsRenaming(false);
      setRenameValue("");
      return;
    }
    const trimmed = renameValue.trim();
    const previousTitle = state.title;
    setIsRenaming(false);
    try {
      await runtime.rename(trimmed);
    } catch {
      // Revert optimistic UI on failure: the runtime state will revert
      void previousTitle;
    }
  }, [renameValue, state.title, runtime]);

  const cancelRename = useCallback(() => {
    setIsRenaming(false);
    setRenameValue("");
  }, []);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmRename();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelRename();
      }
    },
    [confirmRename, cancelRename]
  );

  const handleArchive = useCallback(async () => {
    try {
      await runtime.archive();
    } catch {
      // Revert handled by runtime
    }
  }, [runtime]);

  const handleDelete = useCallback(async () => {
    setDeleteOpen(false);
    try {
      await runtime.delete();
    } catch {
      // Revert handled by runtime
    }
  }, [runtime]);

  return (
    <ThreadListItemPrimitive.Root
      className={cn(
        "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        "hover:bg-primary/[0.06]",
        state.isMain && "bg-primary/10"
      )}
    >
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={confirmRename}
          className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          aria-label="Rename thread"
        />
      ) : (
        <ThreadListItemPrimitive.Trigger
          className={cn(
            "min-w-0 flex-1 cursor-pointer truncate text-left",
            state.isMain ? "text-primary font-medium" : "text-foreground"
          )}
        >
          {displayTitle}
        </ThreadListItemPrimitive.Trigger>
      )}

      {!isRenaming && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <TooltipIconButton
            tooltip="Rename"
            onClick={(e) => {
              e.stopPropagation();
              startRename();
            }}
            className="size-6 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <PencilIcon className="size-3.5" />
          </TooltipIconButton>

          <TooltipIconButton
            tooltip="Archive"
            onClick={(e) => {
              e.stopPropagation();
              handleArchive();
            }}
            className="size-6 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <ArchiveIcon className="size-3.5" />
          </TooltipIconButton>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger
              render={
                <TooltipIconButton
                  tooltip="Delete"
                  onClick={(e) => e.stopPropagation()}
                  className="size-6 cursor-pointer text-muted-foreground hover:text-destructive"
                >
                  <Trash2Icon className="size-3.5" />
                </TooltipIconButton>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete thread</DialogTitle>
                <DialogDescription>
                  This will permanently delete this conversation and all its messages. This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </ThreadListItemPrimitive.Root>
  );
};
