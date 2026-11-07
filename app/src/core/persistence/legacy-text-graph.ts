import { assertBoundedData, MAX_GRAPH_OBJECTS, parseTextGraph, type TextGraphData } from "./text-graph";

const legacyKinds = new Set([
  "TextNode",
  "ConnectPoint",
  "ImageNode",
  "MediaNode",
  "UrlNode",
  "SvgNode",
  "PenStroke",
  "Section",
  "LineEdge",
  "ReferenceBlockNode",
  "ExtensionEntity",
  "LatexNode",
  "ArcEdge",
  "CubicCatmullRomSplineEdge",
  "MultiTargetUndirectedEdge",
  "SyncAssociation",
]);

export function supportsLegacyTextGraph(value: unknown[]): boolean {
  assertBoundedData(value);
  const pending: unknown[] = [...value];
  while (pending.length) {
    const item = pending.pop();
    if (!isRecord(item) || Object.hasOwn(item, "$")) continue;
    if (typeof item._ === "string" && !legacyKinds.has(item._)) return false;
    for (const field of ["children", "associationList"]) {
      if (Array.isArray(item[field])) {
        for (const child of item[field]) pending.push(child);
      }
    }
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${path}: expected object`);
  return value;
}

function tagged(value: unknown, tag: string, path: string): Record<string, unknown> {
  const data = record(value, path);
  if (data._ !== tag) throw new Error(`${path}: expected legacy ${tag}`);
  return data;
}

function vector(value: unknown, path: string) {
  const data = tagged(value, "Vector", path);
  if (
    typeof data.x !== "number" ||
    typeof data.y !== "number" ||
    !Number.isFinite(data.x) ||
    !Number.isFinite(data.y)
  ) {
    throw new Error(`${path}: expected finite vector coordinates`);
  }
  return { x: data.x, y: data.y };
}

function color(value: unknown, path: string) {
  if (value === undefined) return undefined;
  const data = tagged(value, "Color", path);
  return { r: data.r, g: data.g, b: data.b, a: data.a };
}

function rectangle(value: unknown, path: string) {
  const box = tagged(value, "CollisionBox", path);
  if (!Array.isArray(box.shapes) || box.shapes.length !== 1) {
    throw new Error(`${path}.shapes: expected exactly one Rectangle`);
  }
  const data = tagged(box.shapes[0], "Rectangle", `${path}.shapes[0]`);
  return {
    location: vector(data.location, `${path}.location`),
    size: vector(data.size, `${path}.size`),
  };
}

function sectionRectangle(value: unknown, path: string) {
  const box = tagged(value, "CollisionBox", path);
  if (!Array.isArray(box.shapes)) throw new Error(`${path}.shapes: expected array`);
  // Older Section constructors accepted a single Rectangle; newer files store four border Lines.
  if (box.shapes.length === 1) return rectangle(value, path);
  if (box.shapes.length !== 4 && box.shapes.length !== 5) {
    throw new Error(`${path}.shapes: expected four border Lines and optional title Rectangle`);
  }
  const lines = box.shapes.slice(0, 4).map((shape, index) => {
    const line = tagged(shape, "Line", `${path}.shapes[${index}]`);
    return {
      start: vector(line.start, `${path}.shapes[${index}].start`),
      end: vector(line.end, `${path}.shapes[${index}].end`),
    };
  });
  const [top, right, bottom, left] = lines;
  const samePoint = (a: typeof top.start, b: typeof top.start) => a.x === b.x && a.y === b.y;
  if (
    top.start.y !== top.end.y ||
    right.start.x !== right.end.x ||
    bottom.start.y !== bottom.end.y ||
    left.start.x !== left.end.x ||
    !samePoint(top.end, right.start) ||
    !samePoint(right.end, bottom.start) ||
    !samePoint(bottom.end, left.start) ||
    !samePoint(left.end, top.start)
  ) {
    throw new Error(`${path}.shapes: expected rectangular border in top/right/bottom/left order`);
  }
  if (box.shapes.length === 5) {
    rectangle({ _: "CollisionBox", shapes: [box.shapes[4]] }, `${path}.title`);
  }
  return {
    location: top.start,
    size: { x: top.end.x - top.start.x, y: right.end.y - right.start.y },
  };
}

export function readLegacyTextGraph(value: unknown): TextGraphData {
  assertBoundedData(value);
  if (!Array.isArray(value) || value.length > MAX_GRAPH_OBJECTS) {
    throw new Error("stage: expected bounded array");
  }
  const definitions = new Map<string, Record<string, unknown>>();
  const resolved = new WeakMap<object, Record<string, unknown>>();

  function resolve(input: unknown, path: string): Record<string, unknown> {
    let result = record(input, path);
    const seen = new Set<object>();
    while (Object.hasOwn(result, "$")) {
      const cached = resolved.get(result);
      if (cached) {
        result = cached;
        break;
      }
      if (Object.keys(result).length !== 1 || typeof result.$ !== "string") {
        throw new Error(`${path}: invalid legacy reference`);
      }
      const pointer = result.$;
      if (seen.has(result)) throw new Error(`${path}: cyclic legacy reference path`);
      seen.add(result);
      // Only canonical own-property paths emitted by the old serializer are accepted.
      if (pointer.length > 2048 || !/^\/(?:0|[1-9]\d*)(?:\/(?:associationList|children|0|[1-9]\d*))*$/.test(pointer)) {
        throw new Error(`${path}: unsafe legacy reference path`);
      }
      let target: unknown = value;
      for (const segment of pointer.slice(1).split("/")) {
        if (typeof target !== "object" || target === null || !Object.hasOwn(target, segment)) {
          throw new Error(`${path}: missing legacy reference target`);
        }
        target = Reflect.get(target, segment);
      }
      result = record(target, path);
    }
    for (const reference of seen) resolved.set(reference, result);
    return result;
  }

  function collect(input: unknown, path: string): string {
    const data = resolve(input, path);
    if (typeof data._ !== "string" || !legacyKinds.has(data._)) {
      throw new Error(`${path}: unsupported legacy stage kind`);
    }
    if (typeof data.uuid !== "string" || !data.uuid || data.uuid.length > 256) {
      throw new Error(`${path}.uuid: expected nonempty ID`);
    }
    const existing = definitions.get(data.uuid);
    if (existing) {
      if (existing !== data) throw new Error(`${path}[${data.uuid}]: duplicate definition; use a reference`);
      return data.uuid;
    }
    if (definitions.size >= MAX_GRAPH_OBJECTS) throw new Error("stage: object count limit exceeded");
    definitions.set(data.uuid, data);
    return data.uuid;
  }

  // Index top-level definitions before resolving endpoints, allowing forward references.
  const order: string[] = [];
  for (let index = 0; index < value.length; index++) {
    order.push(collect(value[index], `stage[${index}]`));
  }

  const objects: unknown[] = [];
  for (const [id, data] of definitions) {
    const path = `stage[${id}]`;
    if (data._ === "TextNode") {
      objects.push({
        kind: "text-node",
        id,
        text: data.text,
        rectangle: rectangle(data.collisionBox, `${path}.collisionBox`),
        details: data.details,
        color: color(data.color, `${path}.color`),
        sizeAdjust: data.sizeAdjust,
        fontScaleLevel: data.fontScaleLevel,
        fontFamily: data.fontFamily,
        fontWeight: data.fontWeight,
        borderStyle: data.borderStyle,
      });
    } else if (data._ === "ConnectPoint") {
      objects.push({
        kind: "connect-point",
        id,
        rectangle: rectangle(data.collisionBox, `${path}.collisionBox`),
        details: data.details,
      });
    } else if (data._ === "ImageNode" || data._ === "MediaNode") {
      const common = {
        id,
        rectangle: rectangle(data.collisionBox, `${path}.collisionBox`),
        details: data.details,
        attachmentId: data.attachmentId,
      };
      objects.push(
        data._ === "ImageNode"
          ? { ...common, kind: "image-node", scale: data.scale, isBackground: data.isBackground }
          : { ...common, kind: "media-node", mediaKind: data.mediaKind, title: data.title },
      );
    } else if (data._ === "UrlNode") {
      objects.push({
        kind: "url-node",
        id,
        rectangle: rectangle(data.collisionBox, `${path}.collisionBox`),
        details: data.details,
        title: data.title,
        url: data.url,
        color: color(data.color, `${path}.color`),
      });
    } else if (data._ === "SvgNode") {
      objects.push({
        kind: "svg-node",
        id,
        rectangle: rectangle(data.collisionBox, `${path}.collisionBox`),
        details: data.details,
        attachmentId: data.attachmentId,
        scale: data.scale,
        color: color(data.color, `${path}.color`),
      });
    } else if (data._ === "PenStroke") {
      if (!Array.isArray(data.segments)) throw new Error(`${path}.segments: expected array`);
      objects.push({
        kind: "pen-stroke",
        id,
        segments: data.segments.map((segment, index) => {
          const item = record(segment, `${path}.segments[${index}]`);
          return { location: vector(item.location, `${path}.segments[${index}].location`), pressure: item.pressure };
        }),
        color: color(data.color, `${path}.color`),
        details: data.details,
      });
    } else if (data._ === "ReferenceBlockNode" || data._ === "ExtensionEntity" || data._ === "LatexNode") {
      const common = {
        id,
        rectangle: rectangle(data.collisionBox, `${path}.collisionBox`),
        details: data.details,
      };
      if (data._ === "ReferenceBlockNode")
        objects.push({
          ...common,
          kind: "reference-block",
          fileName: data.fileName,
          sectionName: data.sectionName,
          scale: data.scale,
          attachmentId: data.attachmentId,
        });
      else if (data._ === "ExtensionEntity")
        objects.push({
          ...common,
          kind: "extension-entity",
          extensionId: data.extensionId,
          typeName: data.typeName,
          customData: data.customData === undefined ? {} : data.customData,
        });
      else
        objects.push({
          ...common,
          kind: "latex-node",
          latexSource: data.latexSource,
          color: color(data.color, `${path}.color`),
          fontScaleLevel: data.fontScaleLevel,
        });
    } else if (data._ === "MultiTargetUndirectedEdge" || data._ === "SyncAssociation") {
      if (!Array.isArray(data.associationList)) throw new Error(`${path}.associationList: expected array`);
      const memberIds = data.associationList.map((member, index) =>
        collect(member, `${path}.associationList[${index}]`),
      );
      const common = { id, memberIds, color: color(data.color, `${path}.color`) };
      if (data._ === "SyncAssociation") objects.push({ ...common, kind: "sync-association", keys: data.keys });
      else {
        if (data.rectRates !== undefined && !Array.isArray(data.rectRates))
          throw new Error(`${path}.rectRates: expected array`);
        objects.push({
          ...common,
          kind: "multi-target-edge",
          text: data.text,
          rectRates:
            data.rectRates === undefined
              ? memberIds.map(() => ({ x: 0.5, y: 0.5 }))
              : data.rectRates.map((rate: unknown, index: number) => vector(rate, `${path}.rectRates[${index}]`)),
          centerRate: data.centerRate === undefined ? undefined : vector(data.centerRate, `${path}.centerRate`),
          arrow: data.arrow,
          arrowType: data.arrowType,
          renderType: data.renderType,
          lineType: data.lineType,
          padding: data.padding,
        });
      }
    } else if (data._ === "Section") {
      if (data.children !== undefined && !Array.isArray(data.children)) {
        throw new Error(`${path}.children: expected array`);
      }
      const childIds = (data.children ?? []).map((child: unknown, index: number) =>
        collect(child, `${path}.children[${index}]`),
      );
      objects.push({
        kind: "section",
        id,
        rectangle: sectionRectangle(data._collisionBoxNormal ?? data.collisionBox, `${path}._collisionBoxNormal`),
        childIds: [...new Set(childIds)],
        text: data.text,
        details: data.details,
        color: color(data.color, `${path}.color`),
        isCollapsed: data.isCollapsed,
        locked: data.locked,
        borderStyle: data.borderStyle,
      });
    } else {
      if (!Array.isArray(data.associationList) || data.associationList.length !== 2) {
        throw new Error(`${path}.associationList: expected two endpoints`);
      }
      const endpointId = (input: unknown, index: number) => {
        const endpoint = resolve(input, `${path}.associationList[${index}]`);
        if (
          typeof endpoint._ !== "string" ||
          !legacyKinds.has(endpoint._) ||
          [
            "LineEdge",
            "ArcEdge",
            "CubicCatmullRomSplineEdge",
            "MultiTargetUndirectedEdge",
            "SyncAssociation",
            "PenStroke",
          ].includes(endpoint._) ||
          typeof endpoint.uuid !== "string"
        ) {
          throw new Error(`${path}.associationList[${index}]: expected connectable entity`);
        }
        return collect(input, `${path}.associationList[${index}]`);
      };
      const common = {
        id,
        sourceId: endpointId(data.associationList[0], 0),
        targetId: endpointId(data.associationList[1], 1),
        text: data.text,
        color: color(data.color, `${path}.color`),
        sourceRectangleRate:
          data.sourceRectangleRate === undefined
            ? undefined
            : vector(data.sourceRectangleRate, `${path}.sourceRectangleRate`),
        targetRectangleRate:
          data.targetRectangleRate === undefined
            ? undefined
            : vector(data.targetRectangleRate, `${path}.targetRectangleRate`),
      };
      if (data._ === "CubicCatmullRomSplineEdge") {
        if (!Array.isArray(data.controlPoints)) throw new Error(`${path}.controlPoints: expected array`);
        objects.push({
          ...common,
          kind: "spline-edge",
          alpha: data.alpha,
          tension: data.tension,
          controlPoints: data.controlPoints.map((point, index) => vector(point, `${path}.controlPoints[${index}]`)),
        });
      } else
        objects.push({
          ...common,
          kind: data._ === "ArcEdge" ? "arc-edge" : "line-edge",
          lineType: data.lineType,
          arrowType: data.arrowType,
          ...(data._ === "ArcEdge" ? { offset: data.offset, textPosition: data.textPosition } : {}),
        });
    }
  }
  // Undefined means an omitted legacy field; defaults are defined only in the DTO schema.
  return parseTextGraph({
    objects: objects.map((object) =>
      Object.fromEntries(Object.entries(record(object, "object")).filter(([, v]) => v !== undefined)),
    ),
    order,
  });
}
