import type { Project } from "@/core/Project";
import { Association } from "@/core/stage/stageObject/abstract/Association";
import type { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { describe, expect, it } from "vitest";
import { AIObjectReferenceError, AIObjectReferenceRegistry } from "./AIObjectReferenceRegistry";

function createFixture() {
  const objects = new Map<string, StageObject>();
  const project = {
    stageManager: {
      get: (uuid: string) => objects.get(uuid),
    },
  } as unknown as Project;
  return { objects, registry: new AIObjectReferenceRegistry(project) };
}

function createNode(uuid: string): StageObject {
  return { uuid } as StageObject;
}

function createEdge(uuid: string): Association {
  return Object.assign(Object.create(Association.prototype), { uuid }) as Association;
}

describe("AIObjectReferenceRegistry", () => {
  it("为节点和连线分配独立且稳定的短引用", () => {
    const { objects, registry } = createFixture();
    const firstNode = createNode("node-1");
    const secondNode = createNode("node-2");
    const edge = createEdge("edge-1");
    objects.set(firstNode.uuid, firstNode);
    objects.set(secondNode.uuid, secondNode);
    objects.set(edge.uuid, edge);

    expect(registry.getOrCreateRef(firstNode)).toBe("n1");
    expect(registry.getOrCreateRef(firstNode)).toBe("n1");
    expect(registry.getOrCreateRef(secondNode)).toBe("n2");
    expect(registry.getOrCreateRef(edge)).toBe("e1");
  });

  it("通过短引用解析当前舞台对象", () => {
    const { objects, registry } = createFixture();
    const node = createNode("node-1");
    objects.set(node.uuid, node);
    const ref = registry.getOrCreateRef(node);

    expect(registry.resolve(ref, "node")).toBe(node);
    expect(registry.tryResolve(ref)).toBe(node);
  });

  it("对象删除后保留引用但报告 stale_ref，且编号不复用", () => {
    const { objects, registry } = createFixture();
    const deletedNode = createNode("node-1");
    objects.set(deletedNode.uuid, deletedNode);
    expect(registry.getOrCreateRef(deletedNode)).toBe("n1");
    objects.delete(deletedNode.uuid);

    expect(() => registry.resolve("n1")).toThrowError(
      expect.objectContaining<Partial<AIObjectReferenceError>>({ code: "stale_ref" }),
    );
    expect(registry.tryResolve("n1")).toBeUndefined();

    const newNode = createNode("node-2");
    objects.set(newNode.uuid, newNode);
    expect(registry.getOrCreateRef(newNode)).toBe("n2");
  });

  it("相同UUID的对象被恢复后继续使用原引用", () => {
    const { objects, registry } = createFixture();
    const originalNode = createNode("node-1");
    objects.set(originalNode.uuid, originalNode);
    expect(registry.getOrCreateRef(originalNode)).toBe("n1");
    objects.delete(originalNode.uuid);

    const restoredNode = createNode("node-1");
    objects.set(restoredNode.uuid, restoredNode);
    expect(registry.resolve("n1")).toBe(restoredNode);
    expect(registry.getOrCreateRef(restoredNode)).toBe("n1");
  });

  it("区分无效、未知和类型错误引用", () => {
    const { objects, registry } = createFixture();
    const edge = createEdge("edge-1");
    objects.set(edge.uuid, edge);
    registry.getOrCreateRef(edge);

    expect(() => registry.resolve("bad-ref")).toThrowError(
      expect.objectContaining<Partial<AIObjectReferenceError>>({ code: "invalid_ref_format" }),
    );
    expect(() => registry.resolve("n1")).toThrowError(
      expect.objectContaining<Partial<AIObjectReferenceError>>({ code: "unknown_ref" }),
    );
    expect(() => registry.resolve("e1", "node")).toThrowError(
      expect.objectContaining<Partial<AIObjectReferenceError>>({ code: "wrong_ref_kind" }),
    );
  });
});
