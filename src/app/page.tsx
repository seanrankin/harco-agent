"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { FileCard } from "@/components/tool-ui/file-card";
import { EmailDraftCard } from "@/components/tool-ui/email-draft-card";
import { SourceAttachmentsDataUI } from "@/components/tool-ui/source-attachments";
import { DevToolsModal } from "@assistant-ui/react-devtools";

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
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DevToolsModal />
      <FileReferenceToolUI />
      <EmailDraftToolUI />
      <SourceAttachmentsDataUI />
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Harco Knowledge Base</h1>
          <SignOutButton />
        </header>
        <div className="flex-1 overflow-hidden">
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

function SignOutButton() {
  const handleSignOut = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      Sign out
    </button>
  );
}
