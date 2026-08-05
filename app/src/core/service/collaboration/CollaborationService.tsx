import { Project, service } from "@/core/Project";
import type { Service } from "@/core/interfaces/Service";
import { UserState } from "@/core/service/UserState";
import { Vector } from "@graphif/data-structures";
import { deserialize, serialize } from "@graphif/serializer";
import { toast } from "sonner";
import {
  createCollabRoom,
  downloadCollabAttachment,
  joinCollabRoom,
  listCollabAttachments,
  uploadCollabAttachment,
} from "./CollabApi";
import type { CollabMember, CollabPresence, CollabRole, ServerToClientMessage } from "./CollabProtocol";
import { CollabTransport } from "./CollabTransport";
import {
  cloneStageMap,
  diffStageMap,
  emptyStageMap,
  patchStageMap,
  stageArrayToMap,
  stageMapToArray,
  type StageMapDoc,
} from "./stageMap";

export type CollaborationStatus = "idle" | "connecting" | "synced" | "disconnected" | "error";

export type CollabStateSnapshot = {
  status: CollaborationStatus;
  roomId: string | null;
  inviteCode: string | null;
  version: number;
  role: CollabRole | null;
  /** 账号级成员（权限） */
  members: CollabMember[];
  /** 连接级在线列表（同用户多端各一条） */
  presences: CollabPresence[];
  userId: string | null;
  sessionId: string | null;
};

export type RemoteCursor = {
  sessionId: string;
  x: number;
  y: number;
};

export type RemoteCursorChat = RemoteCursor & {
  text: string;
};

const CURSOR_SEND_INTERVAL_MS = 33;
const CURSOR_CHAT_TIMEOUT_MS = 5_000;

@service("collaboration")
export class CollaborationService implements Service {
  private transport = new CollabTransport();
  private roomId: string | null = null;
  private inviteCode: string | null = null;
  private version = 0;
  private ackMap: StageMapDoc = emptyStageMap();
  private applyingRemote = false;
  private role: CollabRole | null = null;
  private members: CollabMember[] = [];
  private presences: CollabPresence[] = [];
  private status: CollaborationStatus = "idle";
  private inFlightOpId: string | null = null;
  private dirty = false;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private readonly remoteCursors = new Map<string, RemoteCursor>();
  private readonly remoteCursorChats = new Map<string, RemoteCursorChat>();
  private lastCursorSentAt = 0;
  private lastLocalCursor: RemoteCursor | null = null;
  private cursorChatInput: HTMLInputElement | null = null;
  private cursorChatTimeout: ReturnType<typeof setTimeout> | null = null;
  private sessionToken: string | null = null;
  private attachmentSync: Promise<void> = Promise.resolve();
  private readonly syncedAttachments = new Map<string, Blob>();

  constructor(private readonly project: Project) {
    this.project.on("stage-commit", () => {
      void this.onLocalCommit();
    });
    this.project.on("attachment-add", () => {
      if (!this.isActive) return;
      void this.queueAttachmentSync().catch((error) => {
        toast.error(`上传附件失败：${error instanceof Error ? error.message : String(error)}`);
      });
    });
    this.project.canvas.element.addEventListener("pointermove", this.handlePointerMove);
    this.project.canvas.element.addEventListener("pointerleave", this.handlePointerLeave);
  }

  get isActive() {
    return this.roomId !== null && this.status !== "idle";
  }

  get currentRoomId() {
    return this.roomId;
  }

  get currentInviteCode() {
    return this.inviteCode;
  }

  get currentRole() {
    return this.role;
  }

  get currentMembers() {
    return this.members;
  }

  get currentPresences() {
    return this.presences;
  }

  get currentStatus() {
    return this.status;
  }

  get currentVersion() {
    return this.version;
  }

  get currentUserId() {
    return this.userId;
  }

  get currentSessionId() {
    return this.sessionId;
  }

  getRemoteCursors(): RemoteCursor[] {
    return [...this.remoteCursors.values()];
  }

  getRemoteCursorChats(): RemoteCursorChat[] {
    return [...this.remoteCursorChats.values()];
  }

  openCursorChat() {
    if (!this.isActive || !this.transport.connected || this.cursorChatInput) return;
    const location = this.lastLocalCursor ?? this.project.renderer.transformView2World(new Vector(0, 0));
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 200;
    input.placeholder = "说点什么...";
    input.setAttribute("aria-label", "协作光标聊天");
    Object.assign(input.style, {
      position: "fixed",
      zIndex: "60",
      width: "180px",
      height: "28px",
      padding: "0 8px",
      border: "2px solid currentColor",
      borderRadius: "4px",
      color: this.selfPresence?.color ?? "#3b82f6",
      background: "var(--background)",
      outline: "none",
      fontSize: "12px",
    });
    document.body.append(input);
    this.cursorChatInput = input;
    this.positionCursorChatInput(location);
    input.addEventListener("input", this.handleCursorChatInput);
    input.addEventListener("keydown", this.handleCursorChatKeydown);
    this.sendCursorChat(input.value, location);
    this.resetCursorChatTimeout();
    requestAnimationFrame(() => input.focus());
  }

  get canEdit() {
    return this.role === "owner" || this.role === "editor";
  }

  getState(): CollabStateSnapshot {
    return {
      status: this.status,
      roomId: this.roomId,
      inviteCode: this.inviteCode,
      version: this.version,
      role: this.role,
      members: [...this.members],
      presences: [...this.presences],
      userId: this.userId,
      sessionId: this.sessionId,
    };
  }

  private emitState() {
    this.project.emit("collab-state", this.getState());
  }

  private setStatus(status: CollaborationStatus) {
    this.status = status;
    this.project.emit("collab-status", status);
    this.emitState();
  }

  private snapshotMap(): StageMapDoc {
    return stageArrayToMap(serialize(this.project.stage) as unknown[]);
  }

  private attachmentIdsInStage(doc: StageMapDoc): Set<string> {
    const attachmentIds = new Set<string>();
    const visit = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value === "object") {
        for (const [key, item] of Object.entries(value)) {
          if (key === "attachmentId" && typeof item === "string" && item) attachmentIds.add(item);
          else visit(item);
        }
      }
    };
    visit(doc);
    return attachmentIds;
  }

  private async syncAttachments() {
    if (!this.roomId || !this.sessionToken) return;
    const pending = [...this.project.attachments.entries()].filter(
      ([id, blob]) => this.syncedAttachments.get(id) !== blob,
    );
    await Promise.all(
      pending.map(async ([attachmentId, blob]) => {
        await uploadCollabAttachment(this.sessionToken!, this.roomId!, attachmentId, blob);
        this.syncedAttachments.set(attachmentId, blob);
      }),
    );
  }

  private queueAttachmentSync(): Promise<void> {
    const next = this.attachmentSync.then(() => this.syncAttachments());
    this.attachmentSync = next.catch(() => undefined);
    return next;
  }

  private async downloadAttachments(attachmentIds: Iterable<string>) {
    if (!this.roomId || !this.sessionToken) return;
    await Promise.all(
      [...attachmentIds]
        .filter((attachmentId) => !this.project.attachments.has(attachmentId))
        .map(async (attachmentId) => {
          const blob = await downloadCollabAttachment(this.sessionToken!, this.roomId!, attachmentId);
          this.project.attachments.set(attachmentId, blob);
          this.syncedAttachments.set(attachmentId, blob);
        }),
    );
    this.project.loop();
  }

  private applyStageMap(doc: StageMapDoc, tags?: string[], references?: Project["references"]) {
    this.applyingRemote = true;
    try {
      const array = stageMapToArray(doc);
      this.project.stage = deserialize(structuredClone(array), this.project);
      if (tags) this.project.tags = tags;
      if (references) this.project.references = references;
      this.project.stageManager.updateReferences();
      this.project.historyManager.clearHistory();
      this.ackMap = cloneStageMap(doc);
    } finally {
      this.applyingRemote = false;
    }
  }

  async createRoom(): Promise<{ roomId: string; inviteCode: string }> {
    const session = await UserState.getSession();
    if (!session?.token) throw new Error("请先登录 Graphif 账号");

    const stage = this.snapshotMap();
    const created = await createCollabRoom(session.token, {
      stage,
      tags: this.project.tags,
      references: this.project.references,
    });

    this.roomId = created.roomId;
    this.inviteCode = created.inviteCode;
    this.version = created.version;
    this.ackMap = cloneStageMap(created.stage);
    this.members = created.members;
    this.role = created.members.find((m) => m.userId === session.user.id)?.role ?? "owner";
    this.userId = session.user.id;
    this.sessionToken = session.token;
    this.emitState();

    await this.queueAttachmentSync();
    await this.connectWs(session.token, created.roomId);
    toast.success(`协作房间已创建，邀请码：${created.inviteCode}`);
    return { roomId: created.roomId, inviteCode: created.inviteCode };
  }

  async joinRoom(inviteCode: string): Promise<void> {
    const session = await UserState.getSession();
    if (!session?.token) throw new Error("请先登录 Graphif 账号");

    const joined = await joinCollabRoom(session.token, inviteCode);
    this.roomId = joined.roomId;
    this.inviteCode = joined.inviteCode;
    this.version = joined.version;
    this.members = joined.members;
    this.role = joined.you.role;
    this.userId = session.user.id;
    this.sessionToken = session.token;
    this.applyStageMap(joined.stage, joined.tags, joined.references);
    const attachments = await listCollabAttachments(session.token, joined.roomId);
    await this.downloadAttachments([
      ...this.attachmentIdsInStage(joined.stage),
      ...attachments.map((attachment) => attachment.attachmentId),
    ]);
    this.emitState();

    await this.connectWs(session.token, joined.roomId);
    toast.success("已加入协作房间");
  }

  private connectWs(token: string, roomId: string): Promise<void> {
    this.setStatus("connecting");
    return new Promise((resolve, reject) => {
      let settled = false;
      this.transport.connect(token, {
        onMessage: (msg) => {
          if (msg.type === "auth_ok" && !settled) {
            this.transport.send({ type: "join", roomId });
            return;
          }
          if (msg.type === "joined" && !settled) {
            this.version = msg.version;
            this.ackMap = cloneStageMap(msg.stage);
            this.members = msg.members;
            this.presences = msg.presences ?? [];
            this.role = msg.you.role;
            this.sessionId = msg.you.sessionId;
            this.userId = msg.you.userId;
            this.setStatus("synced");
            settled = true;
            resolve();
            return;
          }
          this.handleServerMessage(msg);
        },
        onClose: () => {
          if (this.roomId) this.setStatus("disconnected");
          if (!settled) {
            settled = true;
            reject(new Error("协作连接已断开"));
          }
        },
        onError: (e) => {
          this.setStatus("error");
          if (!settled) {
            settled = true;
            console.error("CollabTransport error:", e);
            reject(new Error("协作连接失败"));
          }
        },
      });
    });
  }

  private handleServerMessage(msg: ServerToClientMessage) {
    switch (msg.type) {
      case "op":
        this.handleRemoteOp(msg);
        break;
      case "attachment":
        void this.downloadAttachments([msg.attachmentId]).catch((error) => {
          toast.error(`同步附件失败：${error instanceof Error ? error.message : String(error)}`);
        });
        break;
      case "reject":
        this.handleReject(msg);
        break;
      case "presence":
        if (msg.event === "leave") {
          this.presences = this.presences.filter((p) => p.sessionId !== msg.presence.sessionId);
          this.remoteCursors.delete(msg.presence.sessionId);
          this.remoteCursorChats.delete(msg.presence.sessionId);
        } else {
          const idx = this.presences.findIndex((p) => p.sessionId === msg.presence.sessionId);
          if (idx >= 0) this.presences[idx] = msg.presence;
          else this.presences.push(msg.presence);
        }
        this.project.emit("collab-presences", this.presences);
        this.emitState();
        break;
      case "cursor":
        if (msg.sessionId === this.sessionId) break;
        if (msg.x === null || msg.y === null) this.remoteCursors.delete(msg.sessionId);
        else this.remoteCursors.set(msg.sessionId, { sessionId: msg.sessionId, x: msg.x, y: msg.y });
        this.project.loop();
        break;
      case "cursor_chat":
        if (msg.sessionId === this.sessionId) break;
        if (msg.x === null || msg.y === null || !msg.text) this.remoteCursorChats.delete(msg.sessionId);
        else
          this.remoteCursorChats.set(msg.sessionId, { sessionId: msg.sessionId, x: msg.x, y: msg.y, text: msg.text });
        this.project.loop();
        break;
      case "member":
        // 兼容旧服务端：仅更新账号级 members，不代替 presence
        if (msg.event === "leave") {
          this.members = this.members.filter((m) => m.userId !== msg.member.userId);
        } else {
          const idx = this.members.findIndex((m) => m.userId === msg.member.userId);
          if (idx >= 0) this.members[idx] = msg.member;
          else this.members.push(msg.member);
        }
        this.project.emit("collab-members", this.members);
        this.emitState();
        break;
      case "error":
        toast.error(`协作错误：${msg.message}`);
        break;
      default:
        break;
    }
  }

  private handleRemoteOp(msg: Extract<ServerToClientMessage, { type: "op" }>) {
    // 只能用本端 in-flight opId 判断「自己发出的确认」。
    // 同账号多客户端时 msg.from === userId 也会成立，不能用来跳过舞台应用。
    if (msg.opId === this.inFlightOpId) {
      this.inFlightOpId = null;
      try {
        this.ackMap = patchStageMap(this.ackMap, msg.delta);
        this.version = msg.version;
        this.setStatus("synced");
        this.flushIfDirty();
      } catch (e) {
        console.error("[collab] confirm own op failed", e);
        this.inFlightOpId = null;
        this.ackMap = this.snapshotMap();
        this.version = msg.version;
        this.emitState();
      }
      return;
    }

    try {
      // 远程 op（含同账号其他设备）：基于 ackMap 应用，覆盖本地未确认编辑
      if (this.inFlightOpId) {
        this.inFlightOpId = null;
        this.dirty = true;
      }
      const next = patchStageMap(this.ackMap, msg.delta);
      this.applyStageMap(next);
      void this.downloadAttachments(this.attachmentIdsInStage(next)).catch((error) => {
        toast.error(`同步附件失败：${error instanceof Error ? error.message : String(error)}`);
      });
      this.version = msg.version;
      this.setStatus("synced");
      this.flushIfDirty();
    } catch (e) {
      toast.error("应用远程编辑失败，请重新加入房间");
      console.error("[collab] apply remote op failed", msg, e);
    }
  }

  private handleReject(msg: Extract<ServerToClientMessage, { type: "reject" }>) {
    this.inFlightOpId = null;
    this.dirty = false;
    if (msg.stage) {
      this.applyStageMap(msg.stage, msg.tags, msg.references);
      this.version = msg.serverVersion;
      this.setStatus("synced");
      toast.message("与服务器状态冲突，已同步为最新版本");
    } else {
      this.setStatus("error");
      toast.error(`操作被拒绝：${msg.reason}`);
    }
  }

  private async onLocalCommit() {
    if (!this.isActive || this.applyingRemote) return;
    if (!this.canEdit) {
      toast.error("当前为只读权限，无法编辑");
      this.applyStageMap(this.ackMap);
      return;
    }
    if (!this.transport.connected) {
      this.setStatus("disconnected");
      return;
    }

    this.dirty = true;
    try {
      await this.queueAttachmentSync();
    } catch (error) {
      this.setStatus("error");
      toast.error(`上传附件失败：${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    this.flushIfDirty();
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (!this.isActive || !this.transport.connected) return;
    const now = performance.now();
    if (now - this.lastCursorSentAt < CURSOR_SEND_INTERVAL_MS) return;
    this.lastCursorSentAt = now;
    const viewLocation = this.project.canvas.clientToView(event.clientX, event.clientY);
    const worldLocation = this.project.renderer.transformView2World(viewLocation);
    this.lastLocalCursor = { sessionId: this.sessionId ?? "", x: worldLocation.x, y: worldLocation.y };
    this.transport.send({ type: "cursor", x: worldLocation.x, y: worldLocation.y });
    if (this.cursorChatInput) {
      this.positionCursorChatInput(this.lastLocalCursor);
      this.sendCursorChat(this.cursorChatInput.value, this.lastLocalCursor);
    }
  };

  private readonly handlePointerLeave = () => {
    if (this.isActive && this.transport.connected) this.transport.send({ type: "cursor", x: null, y: null });
  };

  private get selfPresence() {
    return this.presences.find((presence) => presence.sessionId === this.sessionId);
  }

  private readonly handleCursorChatInput = () => {
    if (!this.cursorChatInput || !this.lastLocalCursor) return;
    this.sendCursorChat(this.cursorChatInput.value, this.lastLocalCursor);
    this.resetCursorChatTimeout();
  };

  private readonly handleCursorChatKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" || event.key === "Enter") {
      event.preventDefault();
      this.closeCursorChat();
    }
  };

  private positionCursorChatInput(location: Pick<RemoteCursor, "x" | "y">) {
    if (!this.cursorChatInput) return;
    const clientLocation = this.project.canvas.viewToClient(
      this.project.renderer.transformWorld2View(new Vector(location.x, location.y)),
    );
    this.cursorChatInput.style.left = `${clientLocation.x + 14}px`;
    this.cursorChatInput.style.top = `${clientLocation.y + 14}px`;
  }

  private sendCursorChat(text: string, location: Pick<RemoteCursor, "x" | "y">) {
    this.transport.send({ type: "cursor_chat", x: location.x, y: location.y, text });
  }

  private resetCursorChatTimeout() {
    if (this.cursorChatTimeout) clearTimeout(this.cursorChatTimeout);
    this.cursorChatTimeout = setTimeout(() => this.closeCursorChat(), CURSOR_CHAT_TIMEOUT_MS);
  }

  private closeCursorChat() {
    if (this.cursorChatTimeout) clearTimeout(this.cursorChatTimeout);
    this.cursorChatTimeout = null;
    const input = this.cursorChatInput;
    this.cursorChatInput = null;
    input?.remove();
    this.transport.send({ type: "cursor_chat", x: null, y: null, text: "" });
  }

  private flushIfDirty() {
    if (!this.dirty || this.inFlightOpId || !this.transport.connected || !this.isActive) return;
    const nextMap = this.snapshotMap();
    const delta = diffStageMap(this.ackMap, nextMap);
    if (!delta) {
      this.dirty = false;
      return;
    }
    const opId = crypto.randomUUID();
    this.inFlightOpId = opId;
    this.dirty = false;
    this.transport.send({
      type: "op",
      baseVersion: this.version,
      delta,
      opId,
    });
  }

  leave() {
    this.transport.disconnect();
    this.roomId = null;
    this.inviteCode = null;
    this.role = null;
    this.members = [];
    this.presences = [];
    this.remoteCursors.clear();
    this.remoteCursorChats.clear();
    this.lastLocalCursor = null;
    this.closeCursorChat();
    this.inFlightOpId = null;
    this.dirty = false;
    this.version = 0;
    this.userId = null;
    this.sessionId = null;
    this.sessionToken = null;
    this.syncedAttachments.clear();
    this.ackMap = emptyStageMap();
    this.setStatus("idle");
  }

  dispose() {
    this.leave();
    this.project.canvas.element.removeEventListener("pointermove", this.handlePointerMove);
    this.project.canvas.element.removeEventListener("pointerleave", this.handlePointerLeave);
  }
}
