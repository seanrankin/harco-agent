import {
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/reasoning";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { FC } from "react";

import { Diamond } from "@/components/brand/diamond";

export const MarkdownSkeleton: FC = () => (
  <div
    className="flex flex-col gap-2 py-1"
    aria-busy="true"
    aria-label="Loading message"
  >
    <div className="bg-muted h-3.5 w-[92%] animate-pulse rounded" />
    <div className="bg-muted h-3.5 w-[78%] animate-pulse rounded" />
    <div className="bg-muted h-3.5 w-[85%] animate-pulse rounded" />
  </div>
);

export const importMarkdownWithRetry = () =>
  import("@/components/assistant-ui/markdown-text")
    .then((m) => m.MarkdownText)
    .catch(() =>
      // Retry once on failure
      import("@/components/assistant-ui/markdown-text")
        .then((m) => m.MarkdownText)
        .catch(() => {
          // Both attempts failed, return a fallback component
          const Fallback: FC = () => (
            <p className="text-muted-foreground text-sm italic">
              Message rendering unavailable
            </p>
          );
          Fallback.displayName = "MarkdownLoadError";
          return Fallback;
        }),
    );

const MarkdownText = dynamic(importMarkdownWithRetry, {
  loading: () => <MarkdownSkeleton />,
});

// Four starter prompts mirrored from the design mockup. Hardcoded for v1.
// TODO(redesign): source these from runtime/runtime-extras once suggestions
// can vary by context (e.g., recent activity, role).
const STARTER_SUGGESTIONS = [
  {
    prompt:
      "What products does Harco Fittings offer? Give me a summary from the product catalog.",
    description: "Summarizes the catalog + attaches the DOCX",
  },
  {
    prompt: "Is PE pipe actually good for rocky sites?",
    description: "Answers from the Info Blurt email archive",
  },
  {
    prompt:
      "Draft an email explaining that AVK Series 66 gate valves with PE ends meet Buy America Act requirements and are made in Minden, NV.",
    description: "Builds an Outlook-ready draft",
  },
  {
    prompt:
      "A contractor is bidding a project and asked for everything we have on 10-inch PE ball valves — what should I send?",
    description: "Surfaces the comparison PDF as an attachment",
  },
];

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background @container flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "44rem",
        ["--composer-radius" as string]: "24px",
        ["--composer-padding" as string]: "10px",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        data-slot="aui_thread-viewport"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div className="mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-4">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <ThreadWelcome />
          </AuiIf>

          <div
            data-slot="aui_message-group"
            className="mb-10 flex flex-col gap-y-8 empty:hidden"
          >
            <ThreadPrimitive.Messages>
              {() => <ThreadMessage />}
            </ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer bg-background sticky bottom-0 mt-auto flex flex-col gap-4 overflow-visible rounded-t-(--composer-radius) pb-4 md:pb-6">
            <ThreadScrollToBottom />
            <Composer />
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);

  if (isEditing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom
      render={
        <TooltipIconButton
          tooltip="Scroll to bottom"
          variant="outline"
          className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
        />
      }
    >
      <ArrowDownIcon />
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root my-auto flex grow flex-col items-center justify-center px-4">
      <div className="aui-thread-welcome-center flex w-full max-w-xl flex-col items-center text-center">
        <Diamond
          size={72}
          color="var(--primary)"
          className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both mb-6 duration-200"
        />
        <h1 className="aui-thread-welcome-headline fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-primary font-serif text-3xl font-semibold tracking-tight delay-75 duration-200 sm:text-4xl">
          Ask the Harco library.
        </h1>
        <p className="aui-thread-welcome-sub fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-muted-foreground mt-3 text-base delay-100 duration-200">
          Plain-English answers grounded in Harco&rsquo;s product docs, spec
          sheets, and email archive — every one linked back to the source file.
        </p>
      </div>
      <ThreadStarterSuggestions />
    </div>
  );
};

const ThreadStarterSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions mt-8 grid w-full max-w-2xl gap-3 pb-4 @md:grid-cols-2">
      {STARTER_SUGGESTIONS.map((s, i) => (
        <div
          key={s.prompt}
          className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200"
          style={{ animationDelay: `${150 + i * 40}ms` }}
        >
          <ThreadPrimitive.Suggestion
            prompt={s.prompt}
            send
            render={
              <Button
                variant="outline"
                className="aui-thread-welcome-suggestion bg-card hover:border-muted-foreground/30 hover:shadow-sm flex h-auto w-full cursor-pointer flex-col items-start justify-start gap-1.5 rounded-xl border px-4 py-3.5 text-start text-sm whitespace-normal transition-all"
              />
            }
          >
            <span className="text-primary text-sm leading-snug font-semibold tracking-tight">
              {s.prompt}
            </span>
            <span className="text-muted-foreground text-xs">
              {s.description}
            </span>
          </ThreadPrimitive.Suggestion>
        </div>
      ))}
    </div>
  );
};

const Composer: FC = () => {
  return (
    <div className="aui-composer-wrap flex w-full flex-col">
      <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
        <ComposerPrimitive.AttachmentDropzone
          render={
            <div
              data-slot="aui_composer-shell"
              className="bg-card focus-within:border-ring/75 focus-within:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:bg-accent/50 flex w-full flex-col gap-2 rounded-(--composer-radius) border p-(--composer-padding) shadow-sm transition-shadow focus-within:ring-2 data-[dragging=true]:border-dashed"
            />
          }
        >
          <ComposerAttachments />
          <ComposerPrimitive.Input
            placeholder="Ask about a fitting, spec, stock, or draft an email…"
            className="aui-composer-input placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-1.75 py-1 text-sm outline-none"
            rows={1}
            autoFocus
            aria-label="Message input"
          />
          <ComposerAction />
        </ComposerPrimitive.AttachmentDropzone>
      </ComposerPrimitive.Root>
      <p className="aui-composer-disclaimer text-muted-foreground mx-auto mt-2 max-w-(--thread-max-width) text-center text-[11px] leading-relaxed">
        Harco Assistant can be wrong — confirm part numbers and ratings against
        the linked source before quoting.
      </p>
    </div>
  );
};

const ComposerAction: FC = () => {
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between gap-3">
      <span className="aui-composer-grounding-note text-muted-foreground flex-1 font-mono text-[10px] tracking-wide max-sm:hidden">
        Answers grounded in Harco&rsquo;s document library · sources shown
      </span>
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send
          render={
            <TooltipIconButton
              tooltip="Send message"
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-send size-8 rounded-full"
              aria-label="Send message"
            />
          }
        >
          <ArrowUpIcon className="aui-composer-send-icon size-4" />
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel
          render={
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="aui-composer-cancel size-8 rounded-full"
              aria-label="Stop generating"
            />
          }
        >
          <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  // reserves space for action bar and compensates with `-mb` for consistent msg spacing
  // keeps hovered action bar from shifting layout (autohide doesn't support absolute positioning well)
  // for pt-[n] use -mb-[n + 6] & min-h-[n + 6] to preserve compensation
  const ACTION_BAR_PT = "pt-1.5";
  const ACTION_BAR_HEIGHT = `-mb-7.5 min-h-7.5 ${ACTION_BAR_PT}`;

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 animate-in relative grid grid-cols-[auto_1fr] items-start gap-x-3 duration-150"
    >
      <AssistantAvatar />
      <div className="col-start-2 flex flex-col">
        <div
          data-slot="aui_assistant-message-author"
          className="text-primary mb-1 text-sm font-semibold"
        >
          Harco Assistant
        </div>
        <div
          data-slot="aui_assistant-message-content"
          // [contain-intrinsic-size:auto_24px] fixes issue #4104, don't change without checking for regressions
          className="text-foreground leading-relaxed wrap-break-word [contain-intrinsic-size:auto_24px] [content-visibility:auto]"
        >
          <MessagePrimitive.GroupedParts
            groupBy={groupPartByType({
              reasoning: ["group-chainOfThought", "group-reasoning"],
              "tool-call": ["group-chainOfThought", "group-tool"],
              "standalone-tool-call": [],
            })}
          >
            {({ part, children }) => {
              switch (part.type) {
                case "group-chainOfThought":
                  return <div data-slot="aui_chain-of-thought">{children}</div>;
                case "group-reasoning": {
                  const running = part.status.type === "running";
                  return (
                    <ReasoningRoot defaultOpen={running}>
                      <ReasoningTrigger active={running} />
                      <ReasoningContent aria-busy={running}>
                        <ReasoningText>{children}</ReasoningText>
                      </ReasoningContent>
                    </ReasoningRoot>
                  );
                }
                case "group-tool":
                  return <>{children}</>;
                case "text":
                  return <MarkdownText />;
                case "reasoning":
                  return <Reasoning {...part} />;
                case "tool-call":
                  return part.toolUI ?? <ToolFallback {...part} />;
                case "data":
                  return part.dataRendererUI ?? null;
                case "indicator":
                  return (
                    <span
                      data-slot="aui_assistant-message-indicator"
                      className="text-muted-foreground border-border bg-muted/50 inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase"
                      aria-label="Assistant is working"
                    >
                      <span className="bg-muted-foreground/70 size-1.5 animate-pulse rounded-full" />
                      Searching docs…
                    </span>
                  );
                default:
                  return null;
              }
            }}
          </MessagePrimitive.GroupedParts>
          <MessageError />
        </div>

        <div
          data-slot="aui_assistant-message-footer"
          className={cn("-ms-1 flex items-center", ACTION_BAR_HEIGHT)}
        >
          <BranchPicker />
          <AssistantActionBar />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantAvatar: FC = () => {
  return (
    <div
      data-slot="aui_assistant-avatar"
      className="col-start-1 flex shrink-0 items-center justify-center pt-1"
      aria-hidden="true"
    >
      <Diamond size={32} color="var(--primary)" />
    </div>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root text-muted-foreground col-start-3 row-start-2 -ms-1 flex gap-1"
    >
      <ActionBarPrimitive.Copy render={<TooltipIconButton tooltip="Copy" />}>
        <AuiIf condition={(s) => s.message.isCopied}>
          <CheckIcon />
        </AuiIf>
        <AuiIf condition={(s) => !s.message.isCopied}>
          <CopyIcon />
        </AuiIf>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload
        render={<TooltipIconButton tooltip="Refresh" />}
      >
        <RefreshCwIcon />
      </ActionBarPrimitive.Reload>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger
          render={
            <TooltipIconButton
              tooltip="More"
              className="data-[state=open]:bg-accent"
            />
          }
        >
          <MoreHorizontalIcon />
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-md"
        >
          <ActionBarPrimitive.ExportMarkdown
            render={
              <ActionBarMorePrimitive.Item className="aui-action-bar-more-item hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none" />
            }
          >
            <DownloadIcon className="size-4" />
            Export as Markdown
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_60px] [content-visibility:auto] [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content peer bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 leading-relaxed wrap-break-word empty:hidden">
          <MessagePrimitive.Parts />
        </div>
        <div className="aui-user-action-bar-wrapper absolute start-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 peer-empty:hidden rtl:translate-x-full">
          <UserActionBar />
        </div>
      </div>

      <BranchPicker
        data-slot="aui_user-branch-picker"
        className="col-span-full col-start-1 row-start-3 -me-1 justify-end"
      />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit
        render={
          <TooltipIconButton
            tooltip="Edit"
            className="aui-user-action-edit p-4"
          />
        }
      >
        <PencilIcon />
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_edit-composer-wrapper"
      className="flex flex-col px-2"
    >
      <ComposerPrimitive.Root className="aui-edit-composer-root border-ring/60 bg-card ring-ring/15 ms-auto flex w-full max-w-[85%] flex-col rounded-2xl rounded-br-sm border shadow-md ring-2">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input text-foreground placeholder:text-muted-foreground/70 min-h-14 w-full resize-none bg-transparent p-4 text-sm leading-relaxed outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel
            render={<Button variant="ghost" size="sm" />}
          >
            Cancel
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send render={<Button size="sm" />}>
            Send
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground -ms-2 me-2 inline-flex items-center text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous
        render={<TooltipIconButton tooltip="Previous" />}
      >
        <ChevronLeftIcon />
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next render={<TooltipIconButton tooltip="Next" />}>
        <ChevronRightIcon />
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
