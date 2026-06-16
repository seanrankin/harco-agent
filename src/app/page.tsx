import { ChatClient } from "@/components/chat-client";
import { isOutlookEnabled } from "@/lib/outlook/config";

export default function ChatPage() {
  return <ChatClient outlookEnabled={isOutlookEnabled()} />;
}
