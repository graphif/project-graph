import { describe, expect, test } from "vitest";
import { deserialize, serialize, serializableType } from "../src/index";

@serializableType("SchemaPoint", { fields: ["x", "y"] })
class a {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

@serializableType("SchemaNode", {
  fields: ["uuid", "point", "children", "customData"],
  id: "uuid",
  rawFields: ["customData"],
  deferredFields: ["children"],
  construct: "object",
  extra: "first",
})
class b {
  context: unknown;
  uuid: string;
  point: a;
  children: b[];
  customData: unknown;
  constructor(context: unknown, data: { uuid: string; point: a; children?: b[]; customData?: unknown }) {
    this.context = context;
    this.uuid = data.uuid;
    this.point = data.point;
    this.children = data.children ?? [];
    this.customData = data.customData ?? {};
  }
}

describe("explicit serializer schemas", () => {
  test("uses stable wire names and declared constructor order, regardless of JSON key order", () => {
    const point = deserialize({ y: -148.58, _: "SchemaPoint", ignored: "extra", x: -66.41 });
    expect(point).toBeInstanceOf(a);
    expect(point).toEqual(new a(-66.41, -148.58));
    expect(serialize(point)).toEqual({ _: "SchemaPoint", x: -66.41, y: -148.58 });
  });

  test("does not mutate or share data with the input on repeated reads", () => {
    const input = { _: "SchemaNode", uuid: "node", point: { _: "SchemaPoint", x: 1, y: 2 }, children: [] };
    const before = structuredClone(input);
    Object.freeze(input.point);
    Object.freeze(input.children);
    Object.freeze(input);
    const first = deserialize(input);
    first.point.x = 5;
    first.children.push(first);
    expect(deserialize(input).point.x).toBe(1);
    expect(input).toEqual(before);
  });

  test("passes project context and restores cyclic model links with real constructors", () => {
    const context = { project: "test" };
    const first = new b(context, { uuid: "a", point: new a(1, 2) });
    const second = new b(context, { uuid: "b", point: first.point, children: [first] });
    first.children = [second];
    const restored = deserialize(JSON.parse(JSON.stringify(serialize([first, second]))), context) as b[];
    expect(restored[0]).toBeInstanceOf(b);
    expect(restored[0].context).toBe(context);
    expect(restored[0].children[0]).toBe(restored[1]);
    expect(restored[1].children[0]).toBe(restored[0]);
    expect(restored[0].point).toBe(restored[1].point);
  });

  test("keeps old ID references, including forward references and references to arrays and plain objects", () => {
    const input = [
      { $: "/1" },
      { _: "SchemaNode", uuid: "node", point: { _: "SchemaPoint", x: 1, y: 2 }, children: [] },
      { $: "/1/children" },
      { $: "/4" },
      { nested: { _: "SchemaPoint", y: 4, x: 3 } },
    ];
    const output = deserialize(input);
    expect(output[0]).toBe(output[1]);
    expect(output[2]).toBe(output[1].children);
    expect(output[3]).toBe(output[4]);
    expect(output[4].nested).toEqual(new a(3, 4));
  });

  test("deduplicates identified models before traversing their fields", () => {
    const node = new b(undefined, { uuid: "shared", point: new a(1, 2) });
    const duplicate = new b(undefined, { uuid: "shared", point: new a(3, 4) });
    duplicate.children.push(duplicate);
    const wire = serialize([node, duplicate]);
    expect(wire[1]).toEqual({ $: "/0" });
    const output = deserialize(wire);
    expect(output[0]).toBe(output[1]);
  });

  test("preserves full numeric precision and isolates nested plain data", () => {
    const input = { values: [new a(1.23456789, 0.987654321)], nested: { value: 1.23456789 } };
    const wire = serialize(input);
    expect(wire.values[0].x).toBe(1.23456789);
    expect(deserialize(wire).values[0]).toBeInstanceOf(a);
    wire.nested.value = 9;
    expect(input.nested.value).toBe(1.23456789);
  });

  test("preserves protocol-like keys in declared raw payloads", () => {
    const customData = { _: "Content", $: "literal", nested: [{ $: "/not-a-reference" }] };
    const node = new b(undefined, { uuid: "raw", point: new a(0, 0), customData });
    const wire = serialize(node);
    const output = deserialize(wire) as b;
    expect(output.customData).toEqual(customData);
    expect(output.customData).not.toBe(customData);
    expect(output.customData).not.toBe(wire.customData);
  });

  test("escapes reference path segments and supports root references in plain data", () => {
    const shared = { value: 1 };
    const input: Record<string, unknown> = { "a/b~c": shared, same: shared };
    input.self = input;
    const wire = serialize(input);
    expect(wire.same).toEqual({ $: "/a~1b~0c" });
    expect(wire.self).toEqual({ $: "" });
    const output = deserialize(JSON.parse(JSON.stringify(wire)));
    expect(output.same).toBe(output["a/b~c"]);
    expect(output.self).toBe(output);
  });

  test.each([
    { $: "/missing" },
    { $: "/toString" },
    { $: "invalid" },
    { $: 1 },
    { $: "", extra: true },
    { $: "" },
    [{ $: "/1" }, { $: "/0" }],
    { _: "MissingSchema" },
    { _: 1 },
  ])("rejects invalid or cyclic references and unknown tags: %j", (input) => {
    expect(() => deserialize(input)).toThrow(TypeError);
  });

  test("rejects duplicate wire names and unsupported runtime objects", () => {
    expect(() => serializableType("SchemaPoint", { fields: [] })(class {})).toThrow(/Duplicate type/);
    expect(() => serialize(new Date())).toThrow(/Unregistered/);
    expect(() => serialize({ value: Number.NaN })).toThrow(/Non-finite/);
    expect(() => serialize({ value: () => 1 })).toThrow(/Unsupported/);
  });

  test("does not write __proto__ through the prototype setter", () => {
    const input = JSON.parse('{"__proto__":{"polluted":true}}');
    const result = deserialize(serialize(input));
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.hasOwn(result, "__proto__")).toBe(true);
    expect(result.polluted).toBeUndefined();
  });
});
