"use client";

import {
  AssistantRuntimeProvider,
  makeAssistantToolUI,
  SimpleImageAttachmentAdapter,
  useAssistantRuntime,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DevToolsModal } from "@assistant-ui/react-devtools";
import { useCallback, useMemo, useState } from "react";

import { Thread } from "@/components/assistant-ui/thread";
import { Sidebar } from "@/components/app-shell/sidebar";
import { MobileMenuButton } from "@/components/app-shell/mobile-menu-button";
import { FileCard } from "@/components/tool-ui/file-card";
import { EmailDraftCard } from "@/components/tool-ui/email-draft-card";
import { SourceAttachmentsDataUI } from "@/components/tool-ui/source-attachments";

const FileReferenceToolUI = makeAssistantToolUI({
  toolName: "fileReference",
  render: ({ args }) => {
    if (!args) return null;
    return (
      <FileCard
        documentId={args.document_id as string}
        title={args.title as string}
        fileType={args.file_type as string}
        fileSizeBytes={args.file_size_bytes as number}
      />
    );
  },
});

const EmailDraftToolUI = makeAssistantToolUI({
  toolName: "emailDraft",
  render: ({ args }) => {
    if (!args) return null;
    return (
      <EmailDraftCard
        to={args.to as string}
        subject={args.subject as string}
        body={args.body as string}
      />
    );
  },
});

export default function ChatPage() {
  // TODO(redesign): SimpleImageAttachmentAdapter holds files in browser memory
  // only — they vanish on reload. Swap for a Supabase Storage adapter when we
  // want attachments to persist with messages.
  const adapters = useMemo(
    () => ({ attachments: new SimpleImageAttachmentAdapter() }),
    [],
  );
  const runtime = useChatRuntime({ adapters });
  const [navOpen, setNavOpen] = useState(false);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DevToolsModal />
      <FileReferenceToolUI />
      <EmailDraftToolUI />
      <SourceAttachmentsDataUI />
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
    // TODO(redesign): once a multi-thread RemoteThreadListAdapter is wired,
    // this will create a fresh thread and slot it into the sidebar's history
    // list. For now it resets the in-memory thread.
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
        <MobileMenuButton open={navOpen} onClick={() => setNavOpen(true)} />
        <Thread />
      </main>
    </div>
  );
}
