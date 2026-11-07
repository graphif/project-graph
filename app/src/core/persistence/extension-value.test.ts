import { describe, expect, it, vi } from "vitest";
import { Vector } from "@graphif/data-structures";
import { Circle, Rectangle } from "@graphif/shapes";
import { CollisionBox } from "../stage/stage-object/collision-box/collision-box";
import { decodeExtensionValue } from "./extension-value";

const vector = (x: number, y: number) => ({ y, _: "Vector", x });
const rectangle = { size: vector(120.123456789, 60), _: "Rectangle", location: vector(-1.23456789, 3) };

describe("extension RPC compatibility", () => {
  it("decodes named geometry independent of key order, without mutating its input", () => {
    const input = Object.freeze({
      shapes: [rectangle, { radius: 5, _: "Circle", location: vector(1, 2) }],
      _: "CollisionBox",
    });
    const before = structuredClone(input);
    const decoded = decodeExtensionValue(input, vi.fn()) as CollisionBox;
    expect(decoded).toBeInstanceOf(CollisionBox);
    expect(decoded.shapes[0]).toBeInstanceOf(Rectangle);
    expect(decoded.shapes[0].getRectangle().location).toEqual(new Vector(-1.23456789, 3));
    expect(decoded.shapes[1]).toBeInstanceOf(Circle);
    expect(input).toEqual(before);
    expect(decodeExtensionValue(vector(1, 2), vi.fn())).not.toBe(decodeExtensionValue(vector(1, 2), vi.fn()));
  });

  it("adapts single-root RPC references and keeps user data literal", () => {
    const input = {
      _: "SyncAssociation",
      uuid: "sync",
      associationList: [
        { $: "" },
        {
          _: "ExtensionEntity",
          uuid: "entity",
          collisionBox: { _: "CollisionBox", shapes: [rectangle] },
          extensionId: "ext",
          typeName: "test",
          customData: { _: "Vector", $: "literal" },
        },
      ],
      keys: [],
      $rpc: { deserializeWithProject: true },
    };
    const factory = vi.fn((graph) => graph);
    const graph = decodeExtensionValue(input, factory);
    expect(graph).toMatchObject({
      order: ["sync", "entity"],
      objects: [
        { kind: "sync-association", memberIds: ["sync", "entity"] },
        { kind: "extension-entity", customData: { _: "Vector", $: "literal" } },
      ],
    });
    expect(input.associationList[0]).toEqual({ $: "" });
  });

  it.each([
    { _: "UnknownConstructor" },
    { _: "Vector", x: Infinity, y: 0 },
    { _: "Rectangle", location: vector(0, 0), size: vector(-1, 2) },
    { _: "CollisionBox", shapes: [vector(0, 0)] },
    { _: "Section", children: [{ $: "/__proto__" }] },
  ])("rejects invalid values before invoking a graph factory: %j", (input) => {
    const factory = vi.fn();
    expect(() => decodeExtensionValue(input, factory)).toThrow();
    expect(factory).not.toHaveBeenCalled();
  });
});
