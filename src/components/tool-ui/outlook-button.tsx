"use client";

import { CheckIcon, LoaderIcon, MailIcon, AlertCircleIcon } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";

interface OutlookButtonProps {
  to: string;
  subject: string;
  body: string;
  documentIds: string[];
}

type ButtonState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success" }
  | { status: "partial"; attached: number; total: number }
  | { status: "error"; message: string };

export function OutlookButton({ to, subject, body, documentIds }: OutlookButtonProps) {
  const [state, setState] = useState<ButtonState>({ status: "idle" });
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const scheduleReset = useCallback((ms: number) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setState({ status: "idle" });
      resetTimerRef.current = null;
    }, ms);
  }, []);

  const sendDraft = useCallback(async () => {
    const res = await fetch("/api/outlook/send-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body, documentIds }),
    });

    if (res.status === 401) {
      throw new Error("re-auth");
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Could not create draft");
    }

    const data = await res.json();
    return data as {
      messageId: string;
      attachmentCount: number;
      totalRequested: number;
      skippedDocumentIds: string[];
    };
  }, [to, subject, body, documentIds]);

  const waitForAuthPopup = useCallback((popup: Window): Promise<void> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(interval);
            resolve();
          }
        } catch {
          clearInterval(interval);
          reject(new Error("Please allow popups for this site"));
        }
      }, 500);
    });
  }, []);

  const handleClick = useCallback(async () => {
    if (state.status === "loading") return;

    setState({ status: "loading" });

    try {
      const statusRes = await fetch("/api/outlook/status");

      if (statusRes.status === 401) {
        const returnUrl = encodeURIComponent(window.location.pathname);
        const authUrl = `/api/outlook/auth?returnUrl=${returnUrl}`;
        const popup = window.open(authUrl, "outlook-auth", "width=600,height=700");

        if (!popup) {
          setState({ status: "error", message: "Please allow popups for this site" });
          scheduleReset(5000);
          return;
        }

        await waitForAuthPopup(popup);

        const retryStatus = await fetch("/api/outlook/status");
        if (retryStatus.status === 401) {
          setState({ status: "error", message: "Microsoft permissions not granted" });
          scheduleReset(5000);
          return;
        }
      }

      const result = await sendDraft();

      if (result.attachmentCount < result.totalRequested) {
        setState({
          status: "partial",
          attached: result.attachmentCount,
          total: result.totalRequested,
        });
        scheduleReset(3000);
      } else {
        setState({ status: "success" });
        scheduleReset(3000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create draft";

      if (message === "re-auth") {
        setState({ status: "error", message: "Session expired. Please try again." });
      } else {
        setState({ status: "error", message });
      }
      scheduleReset(5000);
    }
  }, [state.status, sendDraft, waitForAuthPopup, scheduleReset]);

  const disabled = state.status === "loading";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="bg-accent text-accent-foreground inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-tight transition-[filter] hover:brightness-105 active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
    >
      {renderContent(state)}
    </button>
  );
}

function renderContent(state: ButtonState) {
  switch (state.status) {
    case "idle":
      return (
        <>
          <MailIcon className="size-4" />
          Send to Outlook
        </>
      );
    case "loading":
      return (
        <>
          <LoaderIcon className="size-4 animate-spin" />
          Sending…
        </>
      );
    case "success":
      return (
        <>
          <CheckIcon className="size-4" />
          Sent to Drafts
        </>
      );
    case "partial":
      return (
        <>
          <CheckIcon className="size-4" />
          Sent to Drafts ({state.attached} of {state.total} attached)
        </>
      );
    case "error":
      return (
        <>
          <AlertCircleIcon className="size-4" />
          {state.message}
        </>
      );
  }
}
