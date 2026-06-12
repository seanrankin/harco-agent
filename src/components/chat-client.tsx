"use client";

import {
  AssistantRuntimeProvider,
  makeAssistantToolUI,
  useAssistantRuntime,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import { threadListAdapter } from "@/lib/thread-adapter";

import { Thread } from "@/components/assistant-ui/thread";
import { Sidebar } from "@/components/app-shell/sidebar";
import { TopBar } from "@/components/app-shell/top-bar";
import { ChunkErrorBoundary } from "@/components/ui/chunk-error-boundary";

// Skeleton loading placeholders for dynamically-loaded Tool UI components
function FileCardSkeleton() {
  return (
    <div className="my-2 flex w-full items-center gap-3.5 rounded-xl border p-3">
      <div className="h-12 w-10 animate-pulse rounded-sm bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function EmailDraftCardSkeleton() {
  return (
    <div className="my-3 w-full max-w-xl overflow-hidden rounded-xl border">
      <div className="h-9 animate-pulse border-b bg-muted/40" />
      <div className="space-y-2 px-4 py-3">
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2 border-t px-4 py-3">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function SourceAttachmentsSkeleton() {
  return (
    <div className="mt-5 border-t pt-3">
      <div className="mb-2 h-3 w-40 animate-pulse rounded bg-muted" />
      <div className="space-y-1">
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}

// Tool UIs: only needed mid-conversation, loaded dynamically
const FileCard = dynamic(() => import("@/components/tool-ui/file-card").then((m) => m.FileCard), {
  ssr: false,
  loading: () => <FileCardSkeleton />,
});

const EmailDraftCard = dynamic(
  () => import("@/components/tool-ui/email-draft-card").then((m) => m.EmailDraftCard),
  { ssr: false, loading: () => <EmailDraftCardSkeleton /> }
);

const SourceAttachmentsDataUI = dynamic(
  () => import("@/components/tool-ui/source-attachments").then((m) => m.SourceAttachmentsDataUI),
  { ssr: false, loading: () => <SourceAttachmentsSkeleton /> }
);

const DevToolsModal =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SHOW_DEVTOOLSMODAL === "true"
    ? dynamic(() => import("@assistant-ui/react-devtools").then((m) => m.DevToolsModal))
    : () => null;

const FileReferenceToolUI = makeAssistantToolUI({
  toolName: "fileReference",
  render: ({ args }) => {
    if (!args) return null;
    return (
      <ChunkErrorBoundary>
        <FileCard
          documentId={args.document_id as string}
          title={args.title as string}
          fileType={args.file_type as string}
          fileSizeBytes={args.file_size_bytes as number}
        />
      </ChunkErrorBoundary>
    );
  },
});

const EmailDraftToolUI = makeAssistantToolUI({
  toolName: "emailDraft",
  render: ({ args }) => {
    if (!args) return null;
    return (
      <ChunkErrorBoundary>
        <EmailDraftCard
          to={args.to as string}
          subject={args.subject as string}
          body={args.body as string}
        />
      </ChunkErrorBoundary>
    );
  },
});

export function ChatClient() {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useChatRuntime,
    adapter: threadListAdapter,
  });
  const [navOpen, setNavOpen] = useState(false);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DevToolsModal />
      <FileReferenceToolUI />
      <EmailDraftToolUI />
      <ChunkErrorBoundary>
        <SourceAttachmentsDataUI />
      </ChunkErrorBoundary>
      <AppShell navOpen={navOpen} setNavOpen={setNavOpen} />
    </AssistantRuntimeProvider>
  );
}

function AppShell({
  navOpen,
  setNavOpen,
}: {
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
}) {
  const assistantRuntime = useAssistantRuntime();

  const handleNewQuestion = useCallback(() => {
    void assistantRuntime.threads.switchToNewThread();
    setNavOpen(false);
  }, [assistantRuntime, setNavOpen]);

  const handleSignOut = useCallback(async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  return (
    <div className="bg-background flex h-full w-full">
      <Sidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onNewQuestion={handleNewQuestion}
        onSignOut={handleSignOut}
      />
      <main className="relative flex h-full min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={() => setNavOpen(true)} />
        <Thread />
      </main>
    </div>
  );
}
