// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { Vector } from "@graphif/data-structures";

const { requestDAGLayout } = vi.hoisted(() => ({ requestDAGLayout: vi.fn() }));

vi.mock("@/platform/algorithms", () => ({ requestDAGLayout }));
vi.mock("@/core/service/settings", () => ({ Settings: { isEnableSectionCollision: false } }));

import type { LayoutDAGRequest, LayoutDAGResponse } from "@/generated/mygo";
import { Algorithms } from "./algorithm-service";

type MockEntity = {
  uuid: string;
  nearestLockedAncestorSection: null;
  collisionBox: { getRectangle: () => { location: Vector; width: number; height: number } };
  moveTo: Mock<(location: Vector) => void>;
};

function createEntity(uuid: string, x: number, y: number): MockEntity {
  const rectangle = { location: new Vector(x, y), width: 100, height: 50 };
  const entity: MockEntity = {
    uuid,
    nearestLockedAncestorSection: null,
    collisionBox: { getRectangle: () => rectangle },
    moveTo: vi.fn((location: Vector) => {
      rectangle.location = new Vector(location.x, location.y);
    }),
  };
  return entity;
}

function createProject(entities: MockEntity[], children: Record<string, string[]>) {
  const recordStep = vi.fn();
  const byId = new Map(entities.map((entity) => [entity.uuid, entity]));
  const project = {
    id: "project-id",
    graphMethods: {
      nodeChildrenArray: (entity: MockEntity) => (children[entity.uuid] ?? []).map((id) => byId.get(id)!),
    },
    historyManager: { recordStep },
  };
  return { project, recordStep };
}

describe("Algorithms.layoutDag", () => {
  it("把结果应用到一个事务里并记录一次历史", async () => {
    const root = createEntity("root", 10, 20);
    const child = createEntity("child", 0, 0);
    const { project, recordStep } = createProject([root, child], { root: ["child"] });
    requestDAGLayout.mockImplementation(async (request: LayoutDAGRequest): Promise<LayoutDAGResponse> => {
      expect(request.projectId).toBe("project-id");
      expect(request.nodes.map((node) => node.id)).toEqual(["root", "child"]);
      expect(request.edges).toHaveLength(1);
      return {
        ...request,
        positions: [
          { id: "root", x: 10, y: 20 },
          { id: "child", x: 260, y: 20 },
        ],
      };
    });

    const algorithms = new Algorithms(project as never);
    const result = await algorithms.layoutDag([root, child] as never);

    expect(result).toEqual({ movedCount: 2, internalEdgeCount: 1 });
    expect(recordStep).toHaveBeenCalledOnce();
    expect(root.moveTo).not.toHaveBeenCalled();
    expect(child.moveTo).toHaveBeenCalledTimes(1);
    expect(child.moveTo.mock.calls[0][0]).toMatchObject({ x: 260, y: 20 });
  });

  it("舞台在计算期间被改动时丢弃结果", async () => {
    const root = createEntity("root", 10, 20);
    const child = createEntity("child", 0, 0);
    const { project, recordStep } = createProject([root, child], { root: ["child"] });
    requestDAGLayout.mockImplementation(async (request: LayoutDAGRequest): Promise<LayoutDAGResponse> => {
      child.moveTo(new Vector(999, 999));
      return { ...request, positions: [{ id: "child", x: 260, y: 20 }] };
    });

    const algorithms = new Algorithms(project as never);
    await expect(algorithms.layoutDag([root, child] as never)).rejects.toThrowError(/舞台发生了变化/);
    expect(recordStep).not.toHaveBeenCalled();
  });

  it("结果包含未知节点时拒绝应用", async () => {
    const root = createEntity("root", 10, 20);
    const { project, recordStep } = createProject([root], {});
    requestDAGLayout.mockImplementation(async (request: LayoutDAGRequest): Promise<LayoutDAGResponse> => {
      return { ...request, positions: [{ id: "unknown", x: 0, y: 0 }] };
    });

    const algorithms = new Algorithms(project as never);
    await expect(algorithms.layoutDag([root] as never)).rejects.toThrowError(/未知节点/);
    expect(recordStep).not.toHaveBeenCalled();
  });

  it("位置没有变化时不新增历史", async () => {
    const root = createEntity("root", 10, 20);
    const { project, recordStep } = createProject([root], {});
    requestDAGLayout.mockImplementation(async (request: LayoutDAGRequest): Promise<LayoutDAGResponse> => {
      return { ...request, positions: [{ id: "root", x: 10, y: 20 }] };
    });

    const algorithms = new Algorithms(project as never);
    const result = await algorithms.layoutDag([root] as never);
    expect(result.movedCount).toBe(1);
    expect(recordStep).not.toHaveBeenCalled();
  });
});
