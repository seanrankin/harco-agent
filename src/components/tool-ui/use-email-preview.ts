"use client";

import { useEffect, useState } from "react";
import type { EmailPreview } from "@/lib/email-preview";

// Module-level cache keyed by document id so the email file card (sender + date)
// and the reader modal (full body) share a single network request per email.
const cache = new Map<string, Promise<EmailPreview>>();

export function fetchEmailPreview(documentId: string): Promise<EmailPreview> {
  let promise = cache.get(documentId);
  if (!promise) {
    promise = fetch(`/api/email-preview?document_id=${encodeURIComponent(documentId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Email preview failed (${res.status})`);
        return (await res.json()) as EmailPreview;
      })
      .catch((err) => {
        // Don't cache failures — allow a later retry.
        cache.delete(documentId);
        throw err;
      });
    cache.set(documentId, promise);
  }
  return promise;
}

type State =
  | { status: "loading" }
  | { status: "ready"; data: EmailPreview }
  | { status: "error" };

export function useEmailPreview(documentId: string, enabled = true): State {
  const [state, setState] = useState<State>({ status: "loading" });
  const [trackedId, setTrackedId] = useState(documentId);

  // Reset to loading when the target document changes (render-phase reset
  // avoids a synchronous setState inside the effect).
  if (trackedId !== documentId) {
    setTrackedId(documentId);
    setState({ status: "loading" });
  }

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchEmailPreview(documentId)
      .then((data) => active && setState({ status: "ready", data }))
      .catch(() => active && setState({ status: "error" }));
    return () => {
      active = false;
    };
  }, [documentId, enabled]);

  return state;
}
