const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

export interface GraphClientConfig {
  accessToken: string;
}

export async function createDraftMessage(
  config: GraphClientConfig,
  draft: { to: string; subject: string; bodyHtml: string }
): Promise<{ id: string }> {
  const response = await fetch(`${GRAPH_BASE_URL}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: draft.subject,
      body: {
        contentType: "HTML",
        content: draft.bodyHtml,
      },
      toRecipients: [
        {
          emailAddress: {
            address: draft.to,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Graph API createDraftMessage failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return { id: data.id };
}

export async function attachFile(
  config: GraphClientConfig,
  messageId: string,
  attachment: { filename: string; contentBytes: string; contentType: string }
): Promise<void> {
  const response = await fetch(`${GRAPH_BASE_URL}/me/messages/${messageId}/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: attachment.filename,
      contentBytes: attachment.contentBytes,
      contentType: attachment.contentType,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Graph API attachFile failed (${response.status}): ${errorBody}`);
  }
}

export async function createUploadSession(
  config: GraphClientConfig,
  messageId: string,
  attachment: { filename: string; fileSize: number }
): Promise<{ uploadUrl: string }> {
  const response = await fetch(
    `${GRAPH_BASE_URL}/me/messages/${messageId}/attachments/createUploadSession`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        AttachmentItem: {
          attachmentType: "file",
          name: attachment.filename,
          size: attachment.fileSize,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Graph API createUploadSession failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return { uploadUrl: data.uploadUrl };
}
