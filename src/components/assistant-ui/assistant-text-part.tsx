"use client";

import { useAuiState, useMessage } from "@assistant-ui/react";
import { memo, useMemo, type FC } from "react";

import { EmailDraftCard } from "@/components/tool-ui/email-draft-card";
import { parseInlineEmail } from "@/lib/parse-inline-email";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";

/**
 * Replaces bare <MarkdownText /> in AssistantMessage rendering.
 *
 * Handles two failure modes where the model ignores tool-call instructions:
 *
 * 1. Model calls emailDraft AND writes the email as text:
 *    → suppress the duplicated text, keep only surrounding prose.
 *
 * 2. Model writes an email as text WITHOUT calling the tool:
 *    → parse it, render an EmailDraftCard from the extracted fields.
 *
 * If neither case applies, renders <MarkdownText /> unchanged.
 */
const AssistantTextPartImpl: FC = () => {
  const message = useMessage();
  const partText = useAuiState((s) => {
    if (s.part.type === "text") return s.part.text;
    return null;
  });

  const hasEmailToolCall = message.content.some(
    (part) => part.type === "tool-call" && part.toolName === "emailDraft"
  );

  const parsed = useMemo(() => {
    if (!partText) return null;
    return parseInlineEmail(partText);
  }, [partText]);

  // No text content or no email detected → render normally
  if (!parsed || !parsed.email) {
    return <MarkdownText />;
  }

  // Case 1: Tool call exists + text duplicates the email → suppress duplicate
  if (hasEmailToolCall) {
    if (!parsed.before && !parsed.after) return null;
    return (
      <div className="aui-md">
        {parsed.before && <p className="my-2.5 leading-normal">{parsed.before}</p>}
        {parsed.after && <p className="my-2.5 leading-normal">{parsed.after}</p>}
      </div>
    );
  }

  // Case 2: No tool call but text IS an email → render as card
  return (
    <>
      {parsed.before && <p className="aui-md my-2.5 leading-normal">{parsed.before}</p>}
      <EmailDraftCard
        to={parsed.email.to}
        subject={parsed.email.subject}
        body={parsed.email.body}
      />
      {parsed.after && <p className="aui-md my-2.5 leading-normal">{parsed.after}</p>}
    </>
  );
};

export const AssistantTextPart = memo(AssistantTextPartImpl);
