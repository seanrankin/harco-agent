// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { OutlookButton } from "./outlook-button";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const defaultProps = {
  to: "test@example.com",
  subject: "Hello",
  body: "<p>Hi there</p>",
  documentIds: ["doc-1", "doc-2"],
};

function authenticatedStatusResponse() {
  return new Response(JSON.stringify({ authenticated: true }), { status: 200 });
}

function unauthenticatedStatusResponse() {
  return new Response(JSON.stringify({ authenticated: false }), { status: 401 });
}

function successDraftResponse() {
  return new Response(
    JSON.stringify({
      messageId: "msg-123",
      attachmentCount: 2,
      totalRequested: 2,
      skippedDocumentIds: [],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function partialDraftResponse() {
  return new Response(
    JSON.stringify({
      messageId: "msg-456",
      attachmentCount: 1,
      totalRequested: 2,
      skippedDocumentIds: ["doc-2"],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function errorDraftResponse() {
  return new Response(JSON.stringify({ error: "Could not create draft" }), { status: 502 });
}

/** Flush microtask queue (works with both real and fake timers) */
function flushMicrotasks() {
  return new Promise<void>((resolve) => resolve());
}

describe("OutlookButton", () => {
  // Validates: Requirement 5.1
  it("renders idle state correctly with 'Send to Outlook' text", () => {
    render(<OutlookButton {...defaultProps} />);
    expect(screen.getByText("Send to Outlook")).toBeDefined();
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  // Validates: Requirement 5.1
  it("shows loading state on click and disables button", async () => {
    // Never-resolving fetch keeps us in loading state
    global.fetch = vi.fn(() => new Promise<Response>(() => {}));

    render(<OutlookButton {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByText("Sending…")).toBeDefined();
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  // Validates: Requirement 5.2
  it("shows success state after successful send-draft", async () => {
    global.fetch = vi.fn((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/outlook/status"))
        return Promise.resolve(authenticatedStatusResponse());
      if (urlStr.includes("/api/outlook/send-draft"))
        return Promise.resolve(successDraftResponse());
      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<OutlookButton {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    await waitFor(() => {
      expect(screen.getByText("Sent to Drafts")).toBeDefined();
    });
  });

  // Validates: Requirement 5.4
  it("shows partial state when attachmentCount < totalRequested", async () => {
    global.fetch = vi.fn((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/outlook/status"))
        return Promise.resolve(authenticatedStatusResponse());
      if (urlStr.includes("/api/outlook/send-draft"))
        return Promise.resolve(partialDraftResponse());
      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<OutlookButton {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    await waitFor(() => {
      expect(screen.getByText(/1 of 2 attached/)).toBeDefined();
    });
  });

  // Validates: Requirement 5.3
  it("shows error state when fetch returns 502", async () => {
    global.fetch = vi.fn((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/outlook/status"))
        return Promise.resolve(authenticatedStatusResponse());
      if (urlStr.includes("/api/outlook/send-draft")) return Promise.resolve(errorDraftResponse());
      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<OutlookButton {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    await waitFor(() => {
      expect(screen.getByText("Could not create draft")).toBeDefined();
    });
  });

  // Validates: Requirement 5.3
  it("shows error state when fetch throws network error", async () => {
    global.fetch = vi.fn((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/outlook/status"))
        return Promise.resolve(authenticatedStatusResponse());
      if (urlStr.includes("/api/outlook/send-draft"))
        return Promise.reject(new Error("Network failure"));
      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<OutlookButton {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    await waitFor(() => {
      expect(screen.getByText("Network failure")).toBeDefined();
    });
  });

  // Validates: Requirement 5.5
  it("auto-resets from success to idle after 3 seconds", async () => {
    vi.useFakeTimers();

    global.fetch = vi.fn((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/outlook/status"))
        return Promise.resolve(authenticatedStatusResponse());
      if (urlStr.includes("/api/outlook/send-draft"))
        return Promise.resolve(successDraftResponse());
      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<OutlookButton {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
      // Flush all pending promises
      await flushMicrotasks();
      await flushMicrotasks();
      await flushMicrotasks();
    });

    // Should be in success state
    expect(screen.getByText("Sent to Drafts")).toBeDefined();

    // Advance past the 3s reset
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("Send to Outlook")).toBeDefined();

    vi.useRealTimers();
  });

  // Validates: Requirement 5.6
  it("auto-resets from error to idle after 5 seconds", async () => {
    vi.useFakeTimers();

    global.fetch = vi.fn((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/outlook/status"))
        return Promise.resolve(authenticatedStatusResponse());
      if (urlStr.includes("/api/outlook/send-draft")) return Promise.resolve(errorDraftResponse());
      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<OutlookButton {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
      await flushMicrotasks();
      await flushMicrotasks();
      await flushMicrotasks();
    });

    expect(screen.getByText("Could not create draft")).toBeDefined();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("Send to Outlook")).toBeDefined();

    vi.useRealTimers();
  });

  // Validates: Requirement 5.3 (auth popup flow)
  it("opens auth popup when status returns 401", async () => {
    vi.useFakeTimers();

    const mockPopup = { closed: false } as Window;
    const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(mockPopup);

    let statusCallCount = 0;
    global.fetch = vi.fn((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/outlook/status")) {
        statusCallCount++;
        if (statusCallCount === 1) return Promise.resolve(unauthenticatedStatusResponse());
        return Promise.resolve(authenticatedStatusResponse());
      }
      if (urlStr.includes("/api/outlook/send-draft"))
        return Promise.resolve(successDraftResponse());
      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<OutlookButton {...defaultProps} />);

    // Click the button - this starts the async handleClick
    act(() => {
      fireEvent.click(screen.getByRole("button"));
    });

    // Let the status promise resolve (microtasks)
    await act(async () => {
      await flushMicrotasks();
      await flushMicrotasks();
    });

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/outlook/auth"),
      "outlook-auth",
      "width=600,height=700"
    );

    // Simulate popup closing
    (mockPopup as { closed: boolean }).closed = true;

    // Advance through the poll interval (500ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Let the retry status + send-draft resolve
    await act(async () => {
      await flushMicrotasks();
      await flushMicrotasks();
      await flushMicrotasks();
    });

    expect(screen.getByText("Sent to Drafts")).toBeDefined();

    vi.useRealTimers();
  });

  // Validates: Requirement 5.2 (retry after auth)
  it("retries send-draft after auth popup closes", async () => {
    vi.useFakeTimers();

    const mockPopup = { closed: false } as Window;
    vi.spyOn(window, "open").mockReturnValue(mockPopup);

    let statusCallCount = 0;
    global.fetch = vi.fn((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/outlook/status")) {
        statusCallCount++;
        if (statusCallCount === 1) return Promise.resolve(unauthenticatedStatusResponse());
        return Promise.resolve(authenticatedStatusResponse());
      }
      if (urlStr.includes("/api/outlook/send-draft"))
        return Promise.resolve(successDraftResponse());
      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<OutlookButton {...defaultProps} />);

    act(() => {
      fireEvent.click(screen.getByRole("button"));
    });

    await act(async () => {
      await flushMicrotasks();
      await flushMicrotasks();
    });

    // Simulate popup closing
    (mockPopup as { closed: boolean }).closed = true;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await act(async () => {
      await flushMicrotasks();
      await flushMicrotasks();
      await flushMicrotasks();
    });

    // Verify send-draft was called
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const sendDraftCalls = fetchCalls.filter(([url]: [RequestInfo | URL]) =>
      url.toString().includes("/api/outlook/send-draft")
    );
    expect(sendDraftCalls.length).toBe(1);

    vi.useRealTimers();
  });

  // Validates: Requirement 5.3 (popup blocked)
  it("shows error when popup is blocked (window.open returns null)", async () => {
    vi.useFakeTimers();

    vi.spyOn(window, "open").mockReturnValue(null);

    global.fetch = vi.fn((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/outlook/status"))
        return Promise.resolve(unauthenticatedStatusResponse());
      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<OutlookButton {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
      await flushMicrotasks();
      await flushMicrotasks();
      await flushMicrotasks();
    });

    expect(screen.getByText("Please allow popups for this site")).toBeDefined();

    vi.useRealTimers();
  });
});
