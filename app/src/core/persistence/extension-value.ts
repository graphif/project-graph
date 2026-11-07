import { Color, Vector } from "@graphif/data-structures";
import { Circle, CubicBezierCurve, CubicCatmullRomSpline, Line, Rectangle, Shape } from "@graphif/shapes";
import { CollisionBox } from "../stage/stage-object/collision-box/collision-box";
import { readLegacyTextGraph, supportsLegacyTextGraph } from "./legacy-text-graph";
import { assertBoundedData, colorDataSchema, vectorDataSchema, type TextGraphData } from "./text-graph";
import { z } from "zod";

// The extension wire keeps its public tags; it never selects constructors from a global registry.
export function decodeExtensionValue(input: unknown, decodeGraph: (graph: TextGraphData) => unknown): unknown {
  assertBoundedData(input);
  function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Extension RPC: expected object");
    return value as Record<string, unknown>;
  }
  function vector(value: unknown): Vector {
    const data = record(value);
    if (data._ !== "Vector") throw new Error("Extension RPC: expected Vector");
    const { x, y } = vectorDataSchema.parse({ x: data.x, y: data.y });
    return new Vector(x, y);
  }
  function shape(value: unknown): Shape {
    const result = decode(value);
    if (!(result instanceof Shape)) throw new Error("Extension RPC: expected shape");
    return result;
  }
  function list(value: unknown): unknown[] {
    if (!Array.isArray(value)) throw new Error("Extension RPC: expected array");
    return value;
  }
  const nestedDefinitions: { $: string }[] = [];
  function graphObject(value: unknown, path: string): Record<string, unknown> {
    const data = record(value);
    if (Object.hasOwn(data, "$")) {
      if (
        Object.keys(data).length !== 1 ||
        typeof data.$ !== "string" ||
        !/^(?:\/(?:children|associationList|0|[1-9]\d*))*$/.test(data.$)
      ) {
        throw new Error("Extension RPC: invalid graph reference");
      }
      // RPC references start at a single root, whereas the file adapter starts at a stage array.
      return { $: `/0${data.$}` };
    }
    if (path !== "/0") nestedDefinitions.push({ $: path });
    const result: Record<string, unknown> = { ...data, uuid: data.uuid ?? crypto.randomUUID() };
    for (const key of ["children", "associationList"]) {
      if (data[key] !== undefined)
        result[key] = list(data[key]).map((child, index) => graphObject(child, `${path}/${key}/${index}`));
    }
    delete result.$rpc;
    return result;
  }
  function decode(value: unknown): unknown {
    const data = record(value);
    switch (data._) {
      case "Vector":
        return vector(data);
      case "Color": {
        const color = colorDataSchema.parse({ r: data.r, g: data.g, b: data.b, a: data.a ?? 1 });
        return new Color(color.r, color.g, color.b, color.a);
      }
      case "Rectangle": {
        const size = vector(data.size);
        if (size.x < 0 || size.y < 0) throw new Error("Extension RPC: negative rectangle size");
        return new Rectangle(vector(data.location), size);
      }
      case "Line":
        return new Line(vector(data.start), vector(data.end));
      case "Circle":
        return new Circle(vector(data.location), z.number().finite().nonnegative().parse(data.radius));
      case "CubicBezierCurve":
        return new CubicBezierCurve(vector(data.start), vector(data.ctrlPt1), vector(data.ctrlPt2), vector(data.end));
      case "CubicCatmullRomSpline":
        return new CubicCatmullRomSpline(
          list(data.controlPoints).map(vector),
          z
            .number()
            .finite()
            .min(0)
            .max(1)
            .parse(data.alpha ?? 0.5),
          z
            .number()
            .finite()
            .min(0)
            .max(1)
            .parse(data.tension ?? 0),
        );
      case "CollisionBox":
        return new CollisionBox(list(data.shapes).map(shape));
      default: {
        if (!supportsLegacyTextGraph([data])) throw new Error(`Extension RPC: unsupported type ${String(data._)}`);
        const root = graphObject(data, "/0");
        return decodeGraph(readLegacyTextGraph([root, ...nestedDefinitions]));
      }
    }
  }
  return decode(input);
}
