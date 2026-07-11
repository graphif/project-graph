import type { Project } from "@/core/Project";
import { Association } from "@/core/stage/stageObject/abstract/Association";
import type { StageObject } from "@/core/stage/stageObject/abstract/StageObject";

export type AINodeRef = `n${number}`;
export type AIEdgeRef = `e${number}`;
export type AIObjectRef = AINodeRef | AIEdgeRef;
export type AIObjectRefKind = "node" | "edge";

export type AIObjectReferenceErrorCode = "invalid_ref_format" | "unknown_ref" | "stale_ref" | "wrong_ref_kind";

export type AIObjectReferenceSnapshot = {
  entries: Array<{ ref: AIObjectRef; uuid: string }>;
  nextNodeRef: number;
  nextEdgeRef: number;
};

const AI_OBJECT_REF_PATTERN = /^(?:n|e)[1-9]\d*$/;

export function isAIObjectRef(value: string): value is AIObjectRef {
  return AI_OBJECT_REF_PATTERN.test(value);
}

export class AIObjectReferenceError extends Error {
  readonly name = "AIObjectReferenceError";

  constructor(
    readonly code: AIObjectReferenceErrorCode,
    readonly ref: string,
    message: string,
  ) {
    super(message);
  }
}

export class AIObjectReferenceRegistry {
  private readonly refToUuid = new Map<AIObjectRef, string>();
  private readonly uuidToRef = new Map<string, AIObjectRef>();
  private nextNodeRef = 1;
  private nextEdgeRef = 1;

  constructor(private readonly project: Project) {}

  exportSnapshot(): AIObjectReferenceSnapshot {
    return {
      entries: [...this.refToUuid].map(([ref, uuid]) => ({ ref, uuid })),
      nextNodeRef: this.nextNodeRef,
      nextEdgeRef: this.nextEdgeRef,
    };
  }

  restoreSnapshot(snapshot: AIObjectReferenceSnapshot): void {
    if (
      !Number.isInteger(snapshot.nextNodeRef) ||
      snapshot.nextNodeRef < 1 ||
      !Number.isInteger(snapshot.nextEdgeRef) ||
      snapshot.nextEdgeRef < 1
    ) {
      throw new Error("AI对象引用快照计数器无效");
    }

    const refToUuid = new Map<AIObjectRef, string>();
    const uuidToRef = new Map<string, AIObjectRef>();

    for (const { ref, uuid } of snapshot.entries) {
      if (!isAIObjectRef(ref) || typeof uuid !== "string" || uuid.length === 0) {
        throw new Error("AI对象引用快照格式无效");
      }
      if (refToUuid.has(ref) || uuidToRef.has(uuid)) {
        throw new Error("AI对象引用快照包含重复引用");
      }
      refToUuid.set(ref, uuid);
      uuidToRef.set(uuid, ref);
    }

    const nextNodeRef = Math.max(1, snapshot.nextNodeRef, this.getNextRefNumber(refToUuid.keys(), "n"));
    const nextEdgeRef = Math.max(1, snapshot.nextEdgeRef, this.getNextRefNumber(refToUuid.keys(), "e"));

    this.refToUuid.clear();
    this.uuidToRef.clear();
    for (const [ref, uuid] of refToUuid) this.refToUuid.set(ref, uuid);
    for (const [uuid, ref] of uuidToRef) this.uuidToRef.set(uuid, ref);
    this.nextNodeRef = nextNodeRef;
    this.nextEdgeRef = nextEdgeRef;
  }

  getOrCreateRef(object: StageObject): AIObjectRef {
    const existing = this.uuidToRef.get(object.uuid);
    if (existing) return existing;

    const ref =
      object instanceof Association ? (`e${this.nextEdgeRef++}` as AIEdgeRef) : (`n${this.nextNodeRef++}` as AINodeRef);
    this.refToUuid.set(ref, object.uuid);
    this.uuidToRef.set(object.uuid, ref);
    return ref;
  }

  resolve(ref: string, expectedKind?: AIObjectRefKind): StageObject {
    if (!isAIObjectRef(ref)) {
      throw new AIObjectReferenceError(
        "invalid_ref_format",
        ref,
        `对象引用格式无效：${ref}。请使用工具返回的 n1 或 e1 形式引用。`,
      );
    }

    const uuid = this.refToUuid.get(ref);
    if (!uuid) {
      throw new AIObjectReferenceError(
        "unknown_ref",
        ref,
        `当前会话中不存在对象引用 ${ref}。请先使用查询工具获取对象引用。`,
      );
    }

    const object = this.project.stageManager.get(uuid);
    if (!object) {
      throw new AIObjectReferenceError("stale_ref", ref, `对象引用 ${ref} 指向的对象已不存在。请重新查询当前舞台。`);
    }

    const actualKind: AIObjectRefKind = object instanceof Association ? "edge" : "node";
    if (expectedKind && actualKind !== expectedKind) {
      throw new AIObjectReferenceError(
        "wrong_ref_kind",
        ref,
        `对象引用 ${ref} 是${actualKind === "node" ? "节点" : "连线"}，但此参数需要${expectedKind === "node" ? "节点" : "连线"}引用。`,
      );
    }

    return object;
  }

  tryResolve(ref: string): StageObject | undefined {
    try {
      return this.resolve(ref);
    } catch (error) {
      if (error instanceof AIObjectReferenceError) return undefined;
      throw error;
    }
  }

  private getNextRefNumber(refs: Iterable<AIObjectRef>, prefix: "n" | "e"): number {
    let next = 1;
    for (const ref of refs) {
      if (ref.startsWith(prefix)) next = Math.max(next, Number(ref.slice(1)) + 1);
    }
    return next;
  }
}
