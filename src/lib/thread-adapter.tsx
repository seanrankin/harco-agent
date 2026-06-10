"use client";

import {
  RuntimeAdapterProvider,
  useAui,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { useMemo } from "react";

async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
}

export const threadListAdapter: RemoteThreadListAdapter = {
  async list() {
    const res = await fetch("/api/threads");
    if (res.status === 401) {
      return { threads: [] };
    }
    await assertOk(res);
    const rows = await res.json();
    return {
      threads: rows.map(
        (row: {
          id: string;
          title: string | null;
          archived_at: string | null;
          updated_at: string;
        }) => ({
          remoteId: row.id,
          title: row.title ?? undefined,
          status: row.archived_at
            ? ("archived" as const)
            : ("regular" as const),
          custom: { updated_at: row.updated_at },
        }),
      ),
    };
  },

  async initialize(threadId: string) {
    const res = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    await assertOk(res);
    const data = await res.json();
    return { remoteId: data.id, externalId: undefined };
  },

  async rename(remoteId: string, newTitle: string) {
    const res = await fetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    await assertOk(res);
  },

  async archive(remoteId: string) {
    const res = await fetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived_at: new Date().toISOString() }),
    });
    await assertOk(res);
  },

  async unarchive(remoteId: string) {
    const res = await fetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived_at: null }),
    });
    await assertOk(res);
  },

  async delete(remoteId: string) {
    const res = await fetch(`/api/threads/${remoteId}`, {
      method: "DELETE",
    });
    await assertOk(res);
  },

  async fetch(remoteId: string) {
    const res = await fetch(`/api/threads/${remoteId}`);
    await assertOk(res);
    const row = await res.json();
    return {
      remoteId: row.id,
      title: row.title ?? undefined,
      status: row.archived_at ? ("archived" as const) : ("regular" as const),
    };
  },

  async generateTitle(remoteId, messages) {
    return createAssistantStream(async (controller) => {
      const res = await fetch(`/api/threads/${remoteId}/title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      await assertOk(res);
      const data = await res.json();
      controller.appendText(data.title);
    });
  },

  unstable_Provider({ children }) {
    const aui = useAui();
    const history = useMemo<ThreadHistoryAdapter>(
      () => ({
        async load() {
          return { messages: [] };
        },
        async append() {},
        withFormat: (fmt) => ({
          async load() {
            const { remoteId } = aui.threadListItem().getState();
            if (!remoteId) return { messages: [] };
            const res = await fetch(`/api/threads/${remoteId}/messages`);
            await assertOk(res);
            const rows = await res.json();
            return {
              messages: rows.map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (row: {
                  id: string;
                  parent_id: string | null;
                  format: string;
                  content: Record<string, unknown>;
                }) => fmt.decode(row as any),
              ),
            };
          },
          async append(item) {
            const { remoteId } = await aui.threadListItem().initialize();
            const res = await fetch(`/api/threads/${remoteId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: fmt.getId(item.message),
                parent_id: item.parentId,
                format: fmt.format,
                content: fmt.encode(item),
              }),
            });
            await assertOk(res);
          },
        }),
      }),
      [aui],
    );
    return (
      <RuntimeAdapterProvider adapters={{ history }}>
        {children}
      </RuntimeAdapterProvider>
    );
  },
};
