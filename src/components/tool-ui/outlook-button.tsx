"use client";

import { CheckIcon, LoaderIcon, AlertCircleIcon } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";

function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
    >
      <path d="M19.484 7.937v5.477l1.916 1.205c.089.053.19.08.291.08s.202-.027.291-.08L30 9.446V8.198a1.664 1.664 0 0 0-1.664-1.664h-8.852v1.403z" />
      <path d="M19.484 15.457l1.747 1.2a.593.593 0 0 0 .637 0c.089-.053 8.132-5.507 8.132-5.507v10.184a1.664 1.664 0 0 1-1.664 1.664H19.484V15.457z" />
      <path d="M2 5.497l14.264-2.166v25.326L2 26.462V5.497z" />
      <path d="M9.16 20.07c-3.26 0-4.76-3.37-4.76-5.86 0-2.69 1.69-5.91 4.82-5.91 3.13 0 4.64 3.27 4.64 5.97 0 2.67-1.59 5.8-4.7 5.8zm.07-10.2c-1.96 0-2.86 2.4-2.86 4.29 0 1.94.96 4.34 2.83 4.34 1.87 0 2.75-2.45 2.75-4.39 0-1.87-.88-4.24-2.72-4.24z" />
    </svg>
  );
}

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
      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (data?.type === "outlook-auth") {
            cleanup();
            resolve();
          }
        } catch {
          // ignore non-JSON messages
        }
      };

      const interval = setInterval(() => {
        try {
          if (popup.closed) {
            cleanup();
            resolve();
          }
        } catch {
          cleanup();
          reject(new Error("Please allow popups for this site"));
        }
      }, 500);

      const cleanup = () => {
        clearInterval(interval);
        window.removeEventListener("message", onMessage);
      };

      window.addEventListener("message", onMessage);
    });
  }, []);

  const handleClick = useCallback(async () => {
    if (state.status === "loading") return;

    setState({ status: "loading" });

    try {
      const statusRes = await fetch("/api/outlook/status");

      if (statusRes.status === 401) {
        const authUrl = `/api/outlook/auth`;
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
          <OutlookIcon className="size-4" />
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
