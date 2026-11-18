import { describe, expect, it } from "vitest";
import { stageArrayToMap, stageMapToArray } from "./stage-map";

describe("serializer collaboration references", () => {
  it("inlines shared value objects before stage ordering changes", () => {
    const color = { _: "Color", r: 1, g: 2, b: 3, a: 1 };
    const wire = [
      { _: "TextNode", uuid: "first", color },
      { _: "TextNode", uuid: "second", color: { $: "/0/color" } },
      { _: "LineEdge", uuid: "edge", associationList: [{ $: "/0" }, { $: "/1" }] },
    ];
    const before = structuredClone(wire);
    const map = stageArrayToMap(wire);
    map.order.reverse();
    expect(stageMapToArray(map)).toEqual([
      { _: "LineEdge", uuid: "edge", associationList: [{ $: "/2" }, { $: "/1" }] },
      { _: "TextNode", uuid: "second", color },
      { _: "TextNode", uuid: "first", color },
    ]);
    expect(wire).toEqual(before);
  });

  it("preserves opaque extension fields that resemble either reference protocol", () => {
    const wire = [
      { _: "ExtensionEntity", uuid: "extension", customData: { a: { $: "/missing" }, b: { $u: "missing" } } },
    ];
    expect(stageMapToArray(stageArrayToMap(wire))).toEqual(wire);
  });

  it("indexes models first defined inside another model and keeps their top-level order", () => {
    const node = { _: "TextNode", uuid: "node", text: "nested" };
    const wire = [{ _: "Section", uuid: "group", children: [node] }, { $: "/0/children/0" }];
    const map = stageArrayToMap(wire);
    expect(map.order).toEqual(["group", "node"]);
    expect(map.objects.node).toEqual(node);
    expect(stageMapToArray(map)).toEqual([{ _: "Section", uuid: "group", children: [{ $: "/1" }] }, node]);
  });

  it("resolves chains of shared containers and escaped field names", () => {
    const wire = [
      { _: "TextNode", uuid: "first", "a/b": { value: 1 } },
      { _: "TextNode", uuid: "second", nested: { $: "/0/a~1b" } },
      { _: "TextNode", uuid: "third", nested: { $: "/1/nested" } },
    ];
    const result = stageArrayToMap(wire);
    expect(result.objects.third).toEqual({ _: "TextNode", uuid: "third", nested: { value: 1 } });
  });

  it("rejects missing and cyclic value references", () => {
    expect(() => stageArrayToMap([{ _: "TextNode", uuid: "a", color: { $: "/missing" } }])).toThrow(
      /Invalid collaboration/,
    );
    expect(() => stageArrayToMap([{ _: "TextNode", uuid: "a", color: { $: "/0/color" } }])).toThrow(
      /Invalid collaboration/,
    );
  });
});
