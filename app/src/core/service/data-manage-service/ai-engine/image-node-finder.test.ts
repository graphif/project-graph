import { describe, expect, it } from "vitest";
import { findFirstImageInChildren } from "./imageNodeFinder";

describe("findFirstImageInChildren", () => {
  it("命中第一个 image 节点时直接返回", () => {
    const img = { kind: "image" };
    const text = { kind: "text" };
    const result = findFirstImageInChildren(
      [text, img],
      (n) => n.kind === "image",
      () => undefined,
    );
    expect(result).toBe(img);
  });

  it("递归进入容器节点的 children 找到 image", () => {
    const img = { kind: "image" };
    const section = { kind: "section", children: [{ kind: "text" }, img] };
    const result = findFirstImageInChildren(
      [section],
      (n: any) => n.kind === "image",
      (n: any) => (n.kind === "section" ? n.children : undefined),
    );
    expect(result).toBe(img);
  });

  it("多层嵌套时找到最深的 image", () => {
    const img = { kind: "image" };
    const inner = { kind: "section", children: [img] };
    const outer = { kind: "section", children: [inner] };
    const result = findFirstImageInChildren(
      [outer],
      (n: any) => n.kind === "image",
      (n: any) => (n.kind === "section" ? n.children : undefined),
    );
    expect(result).toBe(img);
  });

  it("没有任何 image 时返回 undefined", () => {
    const result = findFirstImageInChildren(
      [{ kind: "text" }, { kind: "section", children: [{ kind: "text" }] }],
      (n: any) => n.kind === "image",
      (n: any) => (n.kind === "section" ? n.children : undefined),
    );
    expect(result).toBeUndefined();
  });
});
