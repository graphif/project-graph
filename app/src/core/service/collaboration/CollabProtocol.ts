import type { StageMapDoc } from "./stageMap";

export type CollabRole = "owner" | "editor" | "viewer";

/** 持久化成员（按账号） */
export type CollabMember = {
  userId: string;
  role: CollabRole;
  name: string;
  email: string;
};

/** 在线连接（按 session，同用户多端各一条） */
export type CollabPresence = {
  sessionId: string;
  userId: string;
  role: CollabRole;
  name: string;
  email: string;
};

export type ClientToServerMessage =
  | { type: "auth"; token: string }
  | { type: "join"; roomId: string }
  | { type: "op"; baseVersion: number; delta: unknown; opId: string }
  | { type: "ping" };

export type ServerToClientMessage =
  | {
      type: "joined";
      roomId: string;
      version: number;
      stage: StageMapDoc;
      tags: string[];
      references: { sections: Record<string, string[]>; files: string[] };
      members: CollabMember[];
      presences: CollabPresence[];
      you: CollabPresence;
    }
  | { type: "op"; version: number; delta: unknown; from: string; opId: string }
  | {
      type: "reject";
      baseVersion: number;
      serverVersion: number;
      reason: string;
      stage?: StageMapDoc;
      tags?: string[];
      references?: { sections: Record<string, string[]>; files: string[] };
    }
  | { type: "presence"; event: "join" | "leave"; presence: CollabPresence }
  /** @deprecated 兼容旧服务端，按 userId 处理 */
  | { type: "member"; event: "join" | "leave" | "role"; member: CollabMember }
  | { type: "error"; message: string }
  | { type: "pong" }
  | { type: "auth_ok"; user: { id: string; email: string; name: string } };

export type CreateRoomResponse = {
  roomId: string;
  inviteCode: string;
  version: number;
  stage: StageMapDoc;
  tags: string[];
  references: { sections: Record<string, string[]>; files: string[] };
  members: CollabMember[];
};

export type JoinRoomResponse = CreateRoomResponse & {
  you: CollabMember;
};
