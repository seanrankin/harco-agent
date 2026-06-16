import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDraftMessage, attachFile, createUploadSession } from "./graph-client";

const mockConfig = { accessToken: "test-token-123" };

describe("graph-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createDraftMessage", () => {
    it("sends correct payload to POST /me/messages", async () => {
      const mockResponse = { id: "msg-abc-123" };
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 201 }));

      const result = await createDraftMessage(mockConfig, {
        to: "buyer@example.com",
        subject: "Product Spec Sheet",
        bodyHtml: "<p>Hi, attached is the spec sheet.</p>",
      });

      expect(result).toEqual({ id: "msg-abc-123" });
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me/messages",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-token-123",
            "Content-Type": "application/json",
          },
        })
      );

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.subject).toBe("Product Spec Sheet");
      expect(body.body).toEqual({
        contentType: "HTML",
        content: "<p>Hi, attached is the spec sheet.</p>",
      });
      expect(body.toRecipients).toEqual([{ emailAddress: { address: "buyer@example.com" } }]);
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Forbidden", { status: 403 }));

      await expect(
        createDraftMessage(mockConfig, {
          to: "x@y.com",
          subject: "Test",
          bodyHtml: "<p>test</p>",
        })
      ).rejects.toThrow("Graph API createDraftMessage failed (403)");
    });
  });

  describe("attachFile", () => {
    it("sends correct payload to POST /me/messages/{id}/attachments", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(null, { status: 201 }));

      await attachFile(mockConfig, "msg-abc-123", {
        filename: "Product Spec.pdf",
        contentBytes: "dGVzdA==",
        contentType: "application/pdf",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me/messages/msg-abc-123/attachments",
        expect.objectContaining({ method: "POST" })
      );

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body["@odata.type"]).toBe("#microsoft.graph.fileAttachment");
      expect(body.name).toBe("Product Spec.pdf");
      expect(body.contentBytes).toBe("dGVzdA==");
      expect(body.contentType).toBe("application/pdf");
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Too large", { status: 413 }));

      await expect(
        attachFile(mockConfig, "msg-1", {
          filename: "big.pdf",
          contentBytes: "abc",
          contentType: "application/pdf",
        })
      ).rejects.toThrow("Graph API attachFile failed (413)");
    });
  });

  describe("createUploadSession", () => {
    it("sends correct payload and returns uploadUrl", async () => {
      const mockResponse = {
        uploadUrl: "https://outlook.office.com/upload/session-xyz",
      };
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const result = await createUploadSession(mockConfig, "msg-abc-123", {
        filename: "LargeDocument.pdf",
        fileSize: 5_000_000,
      });

      expect(result).toEqual({
        uploadUrl: "https://outlook.office.com/upload/session-xyz",
      });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toBe(
        "https://graph.microsoft.com/v1.0/me/messages/msg-abc-123/attachments/createUploadSession"
      );

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.AttachmentItem).toEqual({
        attachmentType: "file",
        name: "LargeDocument.pdf",
        size: 5_000_000,
      });
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Server error", { status: 500 })
      );

      await expect(
        createUploadSession(mockConfig, "msg-1", {
          filename: "big.pdf",
          fileSize: 10_000_000,
        })
      ).rejects.toThrow("Graph API createUploadSession failed (500)");
    });
  });
});
