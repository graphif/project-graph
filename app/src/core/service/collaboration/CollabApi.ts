import { fetch } from "@tauri-apps/plugin-http";
import type { CreateRoomResponse, JoinRoomResponse } from "./CollabProtocol";
import { resolveCollabHttpBase } from "./CollabTransport";
import type { StageMapDoc } from "./stageMap";

async function collabFetch(path: string, token: string, init?: RequestInit) {
  const base = resolveCollabHttpBase();
  if (!base) throw new Error("协作服务地址未配置（LR_COLLAB_BASE_URL / LR_API_BASE_URL）");
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  // eslint-disable-next-line no-useless-assignment
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const err = typeof body === "object" && body && "error" in body ? String((body as { error: unknown }).error) : text;
    throw new Error(err || `HTTP ${response.status}`);
  }
  return body;
}

export async function createCollabRoom(
  token: string,
  payload: {
    stage: StageMapDoc;
    tags: string[];
    references: { sections: Record<string, string[]>; files: string[] };
  },
): Promise<CreateRoomResponse> {
  return (await collabFetch("/api/collab/rooms", token, {
    method: "POST",
    body: JSON.stringify(payload),
  })) as CreateRoomResponse;
}

export async function joinCollabRoom(token: string, inviteCode: string): Promise<JoinRoomResponse> {
  return (await collabFetch("/api/collab/rooms/join", token, {
    method: "POST",
    body: JSON.stringify({ inviteCode }),
  })) as JoinRoomResponse;
}

function attachmentPath(roomId: string, attachmentId: string) {
  return `/api/collab/rooms/${encodeURIComponent(roomId)}/attachments/${encodeURIComponent(attachmentId)}`;
}

export async function uploadCollabAttachment(
  token: string,
  roomId: string,
  attachmentId: string,
  blob: Blob,
): Promise<void> {
  const response = await fetch(`${resolveCollabHttpBase()}${attachmentPath(roomId, attachmentId)}`, {
    method: "PUT",
    body: blob,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": blob.type || "application/octet-stream",
    },
  });
  if (!response.ok) throw new Error(`附件上传失败：HTTP ${response.status}`);
}

export async function downloadCollabAttachment(token: string, roomId: string, attachmentId: string): Promise<Blob> {
  const response = await fetch(`${resolveCollabHttpBase()}${attachmentPath(roomId, attachmentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`附件下载失败：HTTP ${response.status}`);
  return new Blob([await response.arrayBuffer()], {
    type: response.headers.get("content-type") || "application/octet-stream",
  });
}

export async function listCollabAttachments(
  token: string,
  roomId: string,
): Promise<{ attachmentId: string; contentType: string }[]> {
  const body = (await collabFetch(`/api/collab/rooms/${encodeURIComponent(roomId)}/attachments`, token)) as {
    attachments?: { attachmentId: string; contentType: string }[];
  };
  return body.attachments ?? [];
}
