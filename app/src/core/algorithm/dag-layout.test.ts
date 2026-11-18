// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { LayoutDAGRequest, LayoutPosition } from "@/generated/mygo";
import { describe, expect, it } from "vitest";
import {
  computeDAGInputRevision,
  createDAGLayoutProjection,
  resolveDAGLayoutOptions,
  validateDAGLayoutResponse,
} from "./dag-layout";

type FixtureCase = {
  name: string;
  request: LayoutDAGRequest;
  expected: {
    positions: LayoutPosition[];
    cycleNodeIds: string[];
    warnings: string[];
  };
};

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../fixtures/algorithm/dag-layout.json", import.meta.url)), "utf8"),
) as { cases: FixtureCase[] };

/**
 * 迁移前的 TypeScript 布局算法，作为迁移验证期的对照实现。
 * Go 版本新增了「锁定节点不移动」的规则，这里同样跳过锁定节点。
 */
function oracleLayout(request: LayoutDAGRequest): LayoutPosition[] {
  const { nodes, edges } = request;
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const levels = new Map<string, number>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
    levels.set(node.id, 0);
  }
  for (const edge of edges) {
    adjacency.get(edge.from)!.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }
  const queue = nodes.filter((node) => inDegree.get(node.id) === 0).map((node) => node.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    const currentLevel = levels.get(current)!;
    for (const neighbor of adjacency.get(current) ?? []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) - 1);
      levels.set(neighbor, Math.max(levels.get(neighbor) ?? 0, currentLevel + 1));
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }
  if (order.length === 0) return [];

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const groups = new Map<number, string[]>();
  for (const [nodeId, level] of levels) {
    if (!groups.has(level)) groups.set(level, []);
    groups.get(level)!.push(nodeId);
  }
  const maxLevel = Math.max(...levels.values());
  const levelWidths = new Map<number, number>();
  for (let level = 0; level <= maxLevel; level++) {
    let width = 0;
    for (const nodeId of groups.get(level) ?? []) {
      width = Math.max(width, byId.get(nodeId)!.width);
    }
    levelWidths.set(level, width);
  }
  const anchor = byId.get(order[0])!;
  const offsets = new Map<number, number>([[0, anchor.x]]);
  for (let level = 1; level <= maxLevel; level++) {
    offsets.set(level, offsets.get(level - 1)! + (levelWidths.get(level - 1) ?? 0) + request.options.horizontalSpacing);
  }
  const positions: LayoutPosition[] = [];
  for (let level = 0; level <= maxLevel; level++) {
    const group = groups.get(level) ?? [];
    for (let index = 0; index < group.length; index++) {
      const node = byId.get(group[index])!;
      if (node.locked) continue;
      if (level === 0 && index === 0) {
        positions.push({ id: node.id, x: node.x, y: node.y });
        continue;
      }
      positions.push({
        id: node.id,
        x: offsets.get(level)!,
        y: anchor.y + index * request.options.verticalSpacing,
      });
    }
  }
  return positions;
}

describe("DAG布局共享fixture", () => {
  it.each(fixture.cases.map((testCase) => [testCase.name, testCase] as const))(
    "%s 与迁移前的TypeScript实现结果一致",
    (_name, testCase) => {
      expect(oracleLayout(testCase.request)).toEqual(testCase.expected.positions);
    },
  );
});

describe("布局输入投影", () => {
  const entity = (uuid: string, x: number, y: number, width = 100, height = 50, locked = false) =>
    ({
      uuid,
      locked,
      nearestLockedAncestorSection: null,
      collisionBox: { getRectangle: () => ({ location: { x, y }, width, height }) },
    }) as never;

  it("只投影参与布局的节点与它们之间的边", () => {
    const root = entity("root", 10, 20);
    const child = entity("child", 0, 0);
    const outsider = entity("outsider", 0, 0);
    const projection = createDAGLayoutProjection([root, child], (current) =>
      current.uuid === "root" ? [child, outsider] : [],
    );
    expect(projection.nodes.map((node) => node.id)).toEqual(["root", "child"]);
    expect(projection.edges).toHaveLength(1);
    expect(projection.edges[0]).toMatchObject({ from: "root", to: "child" });
  });

  it("锁定状态会进入投影", () => {
    const projection = createDAGLayoutProjection([entity("root", 0, 0, 100, 50, true)], () => []);
    expect(projection.nodes[0].locked).toBe(true);
  });

  it("坐标或拓扑变化会改变输入版本号", () => {
    const options = resolveDAGLayoutOptions();
    const before = createDAGLayoutProjection([entity("root", 10, 20)], () => []);
    const moved = createDAGLayoutProjection([entity("root", 11, 20)], () => []);
    expect(computeDAGInputRevision(before, options)).not.toBe(computeDAGInputRevision(moved, options));
  });

  it("相同输入总是得到相同版本号", () => {
    const options = resolveDAGLayoutOptions();
    const first = createDAGLayoutProjection([entity("root", 10, 20)], () => []);
    const second = createDAGLayoutProjection([entity("root", 10, 20)], () => []);
    expect(computeDAGInputRevision(first, options)).toBe(computeDAGInputRevision(second, options));
  });
});

describe("布局结果校验", () => {
  const request: LayoutDAGRequest = {
    projectId: "project",
    requestId: "request",
    inputRevision: "revision",
    nodes: [],
    edges: [],
    options: { horizontalSpacing: 150, verticalSpacing: 100 },
  };

  it("拒绝不属于本次请求的结果", () => {
    expect(() =>
      validateDAGLayoutResponse(request, { ...request, requestId: "other", positions: [] }, new Set()),
    ).toThrowError(/另一次请求/);
    expect(() =>
      validateDAGLayoutResponse(request, { ...request, inputRevision: "other", positions: [] }, new Set()),
    ).toThrowError(/过期/);
  });

  it("拒绝未知节点与非法坐标", () => {
    expect(() =>
      validateDAGLayoutResponse(request, { ...request, positions: [{ id: "unknown", x: 0, y: 0 }] }, new Set<string>()),
    ).toThrowError(/未知节点/);
    expect(() =>
      validateDAGLayoutResponse(request, { ...request, positions: [{ id: "a", x: Number.NaN, y: 0 }] }, new Set(["a"])),
    ).toThrowError(/非法坐标/);
  });

  it("拒绝重复节点", () => {
    expect(() =>
      validateDAGLayoutResponse(
        request,
        {
          ...request,
          positions: [
            { id: "a", x: 0, y: 0 },
            { id: "a", x: 1, y: 1 },
          ],
        },
        new Set(["a"]),
      ),
    ).toThrowError(/重复节点/);
  });
});
