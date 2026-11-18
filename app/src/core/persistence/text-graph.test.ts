import { describe, expect, it } from "vitest";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Encoder } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { parseProjectFile } from "../project-file";
import { readLegacyTextGraph, supportsLegacyTextGraph } from "./legacy-text-graph";
import {
  MAX_DATA_DEPTH,
  MAX_GRAPH_OBJECTS,
  parseTextGraph,
  remapTextGraphIds,
  type LineEdgeData,
  type TextNodeData,
  type ConnectPointData,
  type SectionData,
  type UrlNodeData,
  type SvgNodeData,
  type PenStrokeData,
  type ImageNodeData,
  type MediaNodeData,
  type ReferenceBlockData,
  type ExtensionEntityData,
  type LatexNodeData,
  type ArcEdgeData,
  type SplineEdgeData,
  type MultiTargetEdgeData,
  type SyncAssociationData,
} from "./text-graph";
import { createTextGraphCodec, type TextGraphFactories } from "./text-graph-codec";

function legacyNode(id: string, x = 12.34) {
  return {
    _: "TextNode",
    uuid: id,
    text: `Node ${id}`,
    collisionBox: {
      _: "CollisionBox",
      shapes: [{ _: "Rectangle", size: { _: "Vector", y: 80, x: 120 }, location: { _: "Vector", y: 5.67, x } }],
    },
    details: [{ type: "p", children: [{ text: "Details", bold: true }], align: "center" }],
    color: { _: "Color", a: 0.5, b: 20, g: 30, r: 40 },
    sizeAdjust: "manual",
    fontScaleLevel: 2,
    fontFamily: "serif",
    fontWeight: "500",
    borderStyle: "dashed",
  };
}

function legacyEdge(source = "/1", target = "/2") {
  return {
    _: "LineEdge",
    uuid: "edge",
    text: "link",
    associationList: [{ $: source }, { $: target }],
  };
}

function fixture() {
  return [legacyEdge(), legacyNode("a"), legacyNode("b")];
}

function legacySection(id: string, children: unknown[] = [], isCollapsed = false) {
  const rectangle = new Rectangle(new Vector(-12.34, 5.67), new Vector(500.25, 300.75));
  const vector = ({ x, y }: Vector) => ({ _: "Vector", x, y });
  return {
    _: "Section",
    uuid: id,
    text: `Group ${id}`,
    children,
    isCollapsed,
    locked: true,
    borderStyle: "dashed",
    details: [{ type: "p", children: [{ text: "Group details" }] }],
    color: { _: "Color", r: 1, g: 2, b: 3, a: 0.4 },
    _collisionBoxNormal: {
      _: "CollisionBox",
      shapes: [
        ...rectangle
          .getBoundingLines()
          .map(({ start, end }) => ({ _: "Line", start: vector(start), end: vector(end) })),
        { _: "Rectangle", location: vector(rectangle.location), size: vector(new Vector(rectangle.size.x, 50)) },
      ],
    },
  };
}

function groupedFixture() {
  const point = { _: "ConnectPoint", uuid: "point", collisionBox: legacyNode("unused").collisionBox };
  return [
    legacyEdge("/1/children/1", "/2"),
    legacySection("outer", [{ $: "/2" }, point, { $: "/3" }]),
    legacySection("inner", [legacyNode("a")], true),
    { $: "/2/children/0" },
    { $: "/1/children/1" },
  ];
}

function freezeDeep<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const nested of Object.values(value)) freezeDeep(nested);
    Object.freeze(value);
  }
  return value;
}

// Pure factory models exercise the codec contract without importing UI/Project modules or mocking services.
class NodeModel {
  readonly uuid: string;
  readonly rectangle: Rectangle;
  constructor(
    public data: TextNodeData,
    public context: string,
  ) {
    this.uuid = data.id;
    this.rectangle = new Rectangle(
      new Vector(data.rectangle.location.x, data.rectangle.location.y),
      new Vector(data.rectangle.size.x, data.rectangle.size.y),
    );
  }
}

class EdgeModel {
  readonly uuid: string;
  constructor(
    public data: LineEdgeData,
    public source: EntityModel,
    public target: EntityModel,
  ) {
    this.uuid = data.id;
  }
}

class PointModel {
  readonly uuid: string;
  constructor(public data: ConnectPointData) {
    this.uuid = data.id;
  }
}

class SectionModel {
  readonly uuid: string;
  children: EntityModel[] = [];
  constructor(public data: SectionData) {
    this.uuid = data.id;
  }
}

class ImageModel {
  readonly uuid: string;
  constructor(public data: ImageNodeData) {
    this.uuid = data.id;
  }
}

class MediaModel {
  readonly uuid: string;
  constructor(public data: MediaNodeData) {
    this.uuid = data.id;
  }
}

class UrlModel {
  readonly uuid: string;
  constructor(public data: UrlNodeData) {
    this.uuid = data.id;
  }
}

class SvgModel {
  readonly uuid: string;
  constructor(public data: SvgNodeData) {
    this.uuid = data.id;
  }
}

class StrokeModel {
  readonly uuid: string;
  constructor(public data: PenStrokeData) {
    this.uuid = data.id;
  }
}

class ReferenceModel {
  readonly uuid: string;
  constructor(public data: ReferenceBlockData) {
    this.uuid = data.id;
  }
}
class ExtensionModel {
  readonly uuid: string;
  constructor(public data: ExtensionEntityData) {
    this.uuid = data.id;
  }
}
class LatexModel {
  readonly uuid: string;
  constructor(public data: LatexNodeData) {
    this.uuid = data.id;
  }
}
class ArcModel {
  readonly uuid: string;
  constructor(
    public data: ArcEdgeData,
    public source: ConnectableModel,
    public target: ConnectableModel,
  ) {
    this.uuid = data.id;
  }
}
class MultiModel {
  readonly uuid: string;
  constructor(
    public data: MultiTargetEdgeData,
    public members: ConnectableModel[],
  ) {
    this.uuid = data.id;
  }
}
class SplineModel {
  readonly uuid: string;
  constructor(
    public data: SplineEdgeData,
    public source: ConnectableModel,
    public target: ConnectableModel,
  ) {
    this.uuid = data.id;
  }
}
class SyncModel {
  readonly uuid: string;
  members: Model[] = [];
  constructor(public data: SyncAssociationData) {
    this.uuid = data.id;
  }
}
type ConnectableModel =
  | NodeModel
  | PointModel
  | SectionModel
  | ImageModel
  | MediaModel
  | UrlModel
  | SvgModel
  | ReferenceModel
  | ExtensionModel
  | LatexModel;
type EntityModel = ConnectableModel | StrokeModel;
type Model = EntityModel | EdgeModel | ArcModel | SplineModel | MultiModel | SyncModel;

function factories(): TextGraphFactories<
  string,
  {
    textNode: NodeModel;
    lineEdge: EdgeModel;
    connectPoint: PointModel;
    section: SectionModel;
    imageNode: ImageModel;
    mediaNode: MediaModel;
    urlNode: UrlModel;
    svgNode: SvgModel;
    penStroke: StrokeModel;
    referenceBlock: ReferenceModel;
    extensionEntity: ExtensionModel;
    latexNode: LatexModel;
    arcEdge: ArcModel;
    multiTargetEdge: MultiModel;
    syncAssociation: SyncModel;
    splineEdge: SplineModel;
  }
> {
  return {
    textNode: {
      matches: (model): model is NodeModel => model instanceof NodeModel,
      create: (context, data) => new NodeModel(data, context),
      encode: (model) => ({
        ...model.data,
        rectangle: {
          location: { x: model.rectangle.location.x, y: model.rectangle.location.y },
          size: { x: model.rectangle.size.x, y: model.rectangle.size.y },
        },
      }),
    },
    lineEdge: {
      matches: (model): model is EdgeModel => model instanceof EdgeModel,
      create: (_context, data, { source, target }) => new EdgeModel(data, source, target),
      encode: (model) => ({ ...model.data, sourceId: model.source.uuid, targetId: model.target.uuid }),
    },
    connectPoint: {
      matches: (model): model is PointModel => model instanceof PointModel,
      create: (_context, data) => new PointModel(data),
      encode: (model) => model.data,
    },
    imageNode: {
      matches: (model): model is ImageModel => model instanceof ImageModel,
      create: (_context, data) => new ImageModel(data),
      encode: (model) => model.data,
    },
    mediaNode: {
      matches: (model): model is MediaModel => model instanceof MediaModel,
      create: (_context, data) => new MediaModel(data),
      encode: (model) => model.data,
    },
    urlNode: {
      matches: (model): model is UrlModel => model instanceof UrlModel,
      create: (_context, data) => new UrlModel(data),
      encode: (model) => model.data,
    },
    svgNode: {
      matches: (model): model is SvgModel => model instanceof SvgModel,
      create: (_context, data) => new SvgModel(data),
      encode: (model) => model.data,
    },
    penStroke: {
      matches: (model): model is StrokeModel => model instanceof StrokeModel,
      create: (_context, data) => new StrokeModel(data),
      encode: (model) => model.data,
    },
    referenceBlock: {
      matches: (model): model is ReferenceModel => model instanceof ReferenceModel,
      create: (_context, data) => new ReferenceModel(data),
      encode: (model) => model.data,
    },
    extensionEntity: {
      matches: (model): model is ExtensionModel => model instanceof ExtensionModel,
      create: (_context, data) => new ExtensionModel(data),
      encode: (model) => model.data,
    },
    latexNode: {
      matches: (model): model is LatexModel => model instanceof LatexModel,
      create: (_context, data) => new LatexModel(data),
      encode: (model) => model.data,
    },
    arcEdge: {
      matches: (model): model is ArcModel => model instanceof ArcModel,
      create: (_context, data, { source, target }) => new ArcModel(data, source, target),
      encode: (model) => ({ ...model.data, sourceId: model.source.uuid, targetId: model.target.uuid }),
    },
    splineEdge: {
      matches: (model): model is SplineModel => model instanceof SplineModel,
      create: (_context, data, { source, target }) => new SplineModel(data, source, target),
      encode: (model) => ({ ...model.data, sourceId: model.source.uuid, targetId: model.target.uuid }),
    },
    multiTargetEdge: {
      matches: (model): model is MultiModel => model instanceof MultiModel,
      create: (_context, data, { members }) => new MultiModel(data, members),
      encode: (model) => ({ ...model.data, memberIds: model.members.map(({ uuid }) => uuid) }),
    },
    syncAssociation: {
      matches: (model): model is SyncModel => model instanceof SyncModel,
      create: (_context, data) => new SyncModel(data),
      encode: (model) => ({ ...model.data, memberIds: model.members.map(({ uuid }) => uuid) }),
      link: (model, members) => {
        model.members = members;
      },
    },
    section: {
      matches: (model): model is SectionModel => model instanceof SectionModel,
      create: (_context, data) => new SectionModel(data),
      encode: (model) => ({ ...model.data, childIds: model.children.map(({ uuid }) => uuid) }),
      link: (model, children) => {
        model.children = children;
      },
    },
  };
}

describe("explicit text graph migration slice", () => {
  it("preserves spline control points, precision and endpoint identity", () => {
    const graph = readLegacyTextGraph(
      freezeDeep([
        {
          ...legacyEdge(),
          _: "CubicCatmullRomSplineEdge",
          alpha: 0.5,
          tension: 0.125,
          controlPoints: [0, 1, 2, 3, 4].map((x) => ({ _: "Vector", x: x + 0.123456789, y: -x })),
        },
        legacyNode("a"),
        legacyNode("b"),
      ]),
    );
    const codec = createTextGraphCodec(factories());
    const models = codec.decode(graph, "spline");
    const spline = models[0];
    if (!(spline instanceof SplineModel)) throw new Error("bad fixture");
    expect(spline.source).toBe(models[1]);
    expect(spline.target).toBe(models[2]);
    expect(codec.encode(models)).toEqual(graph);
    expect(remapTextGraphIds(graph, (id) => `copy-${id}`).objects[0]).toMatchObject({
      sourceId: "copy-a",
      targetId: "copy-b",
    });
    spline.data.controlPoints = [];
    expect(() => codec.encode(models)).toThrow("controlPoints");
  });

  it("round-trips references, extensions, LaTeX and relationships, including cyclic sync identities", () => {
    const node = legacyNode("unused");
    const input = freezeDeep([
      { ...legacyEdge("/3", "/4"), _: "ArcEdge", uuid: "arc", offset: -12.345678901, textPosition: 0.75 },
      {
        _: "MultiTargetUndirectedEdge",
        uuid: "multi",
        associationList: [{ $: "/3" }, { $: "/5" }],
        arrow: "outer",
        arrowType: "filled-diamond",
        renderType: "convex",
        lineType: "double",
        padding: 12.345678901,
        rectRates: [
          { _: "Vector", x: 0.25, y: 0.75 },
          { _: "Vector", x: 0.125, y: 0.875 },
        ],
      },
      {
        _: "SyncAssociation",
        uuid: "sync-a",
        associationList: [{ $: "/0" }, { $: "/6" }],
        keys: ["text"],
        color: node.color,
      },
      {
        _: "ReferenceBlockNode",
        uuid: "reference",
        collisionBox: node.collisionBox,
        details: node.details,
        fileName: "Other",
        sectionName: "Chapter",
        attachmentId: "snapshot",
        scale: 0.125,
      },
      {
        _: "ExtensionEntity",
        uuid: "extension",
        collisionBox: node.collisionBox,
        details: node.details,
        extensionId: "example.extension",
        typeName: "widget",
        customData: { _: "User content", $: "not-a-reference", x: 1.23456789, nested: [null, false] },
      },
      {
        _: "LatexNode",
        uuid: "latex",
        collisionBox: node.collisionBox,
        details: node.details,
        latexSource: "E=mc^2",
        fontScaleLevel: -2,
        color: node.color,
      },
      { _: "SyncAssociation", uuid: "sync-b", associationList: [{ $: "/2" }, { $: "/1" }], keys: ["color", "details"] },
      legacySection("group", [{ $: "/3" }, { $: "/4" }, { $: "/5" }]),
    ]);
    expect(supportsLegacyTextGraph(input)).toBe(true);
    const graph = readLegacyTextGraph(input);
    const codec = createTextGraphCodec(factories());
    const models = codec.decode({ ...graph, objects: [...graph.objects].reverse() }, "all-kinds");
    const [arc, multi, syncA, reference, extension, latex, syncB, group] = models;
    if (
      !(arc instanceof ArcModel) ||
      !(multi instanceof MultiModel) ||
      !(syncA instanceof SyncModel) ||
      !(syncB instanceof SyncModel) ||
      !(group instanceof SectionModel)
    )
      throw new Error("bad fixture");
    expect(arc.source).toBe(reference);
    expect(arc.target).toBe(extension);
    expect(multi.members).toEqual([reference, latex]);
    expect(syncA.members).toEqual([arc, syncB]);
    expect(syncB.members).toEqual([syncA, multi]);
    expect(group.children).toEqual([reference, extension, latex]);
    expect(codec.encode(models)).toEqual(graph);
    expect(codec.encode(codec.decode(JSON.parse(JSON.stringify(graph)), "reopen"))).toEqual(graph);
    const pasted = remapTextGraphIds(graph, (id) => `copy-${id}`);
    expect(pasted.objects[2]).toMatchObject({ memberIds: ["copy-arc", "copy-sync-b"] });
    expect(pasted.objects[3]).toMatchObject({ attachmentId: "snapshot" });
    expect(pasted.objects[4]).toMatchObject({ customData: { $: "not-a-reference", x: 1.23456789 } });
    expect(input[0]).toMatchObject({ offset: -12.345678901 });
  });

  it.each([
    { _: "ReferenceBlockNode", scale: 0 },
    { _: "ReferenceBlockNode", fileName: 1 },
    { _: "ExtensionEntity", extensionId: "", typeName: "widget" },
    { _: "ExtensionEntity", extensionId: "example", typeName: "" },
    { _: "LatexNode", latexSource: 2 },
    { _: "LatexNode", fontScaleLevel: 0.25 },
  ])("rejects invalid reference/extension/formula fields before allocation: %j", (fields) => {
    expect(() =>
      readLegacyTextGraph([{ uuid: "bad", collisionBox: legacyNode("unused").collisionBox, ...fields }]),
    ).toThrow("graph.objects.0");
  });

  it("validates relationship members and rates before any factory is called", () => {
    const graph = readLegacyTextGraph([
      { _: "MultiTargetUndirectedEdge", uuid: "multi", associationList: [{ $: "/1" }, { $: "/2" }] },
      legacyNode("a"),
      legacyNode("b"),
    ]);
    const edge = graph.objects[0];
    if (edge.kind !== "multi-target-edge") throw new Error("bad fixture");
    edge.rectRates.pop();
    expect(() => parseTextGraph(graph)).toThrow("one rate per member");
    edge.rectRates.push({ x: 0.5, y: 0.5 });
    edge.memberIds[0] = "multi";
    expect(() => parseTextGraph(graph)).toThrow("invalid relationship member");
  });

  it("round-trips URL, SVG and pen strokes with shared Section membership and attachment identity", () => {
    const node = legacyNode("unused");
    const input = freezeDeep([
      legacyEdge("/2", "/3"),
      legacySection("group", [{ $: "/2" }, { $: "/3" }, { $: "/4" }]),
      {
        _: "UrlNode",
        uuid: "url",
        collisionBox: node.collisionBox,
        details: node.details,
        color: node.color,
        title: "Reference",
        url: "https://example.com/a?q=1#section",
      },
      {
        _: "SvgNode",
        uuid: "svg",
        collisionBox: node.collisionBox,
        details: node.details,
        color: node.color,
        attachmentId: "original-svg",
        scale: 0.125,
      },
      {
        _: "PenStroke",
        uuid: "stroke",
        color: node.color,
        segments: [
          { _: "PenStrokeSegment", location: { _: "Vector", x: -12.345678901, y: 3.5 }, pressure: 0 },
          { _: "PenStrokeSegment", location: { _: "Vector", x: 4.25, y: 5.75 }, pressure: 0.8 },
        ],
      },
    ]);
    expect(supportsLegacyTextGraph(input)).toBe(true);
    const graph = readLegacyTextGraph(input);
    const codec = createTextGraphCodec(factories());
    const models = codec.decode({ ...graph, objects: [...graph.objects].reverse() }, "new-kinds");
    const [edge, section, url, svg, stroke] = models;
    if (!(edge instanceof EdgeModel) || !(section instanceof SectionModel)) throw new Error("bad fixture");
    expect(edge.source).toBe(url);
    expect(edge.target).toBe(svg);
    expect(section.children).toEqual([url, svg, stroke]);
    expect(graph.objects[2]).toMatchObject({
      title: "Reference",
      url: "https://example.com/a?q=1#section",
      details: node.details,
    });
    expect(graph.objects[3]).toMatchObject({ attachmentId: "original-svg", scale: 0.125, color: { a: 0.5 } });
    expect(graph.objects[4]).toMatchObject({
      segments: [{ location: { x: -12.345678901 }, pressure: 0 }, { pressure: 0.8 }],
    });
    expect(codec.encode(codec.decode(JSON.parse(JSON.stringify(graph)), "reopen"))).toEqual(graph);
    const pasted = remapTextGraphIds(graph, (id) => `copy-${id}`);
    expect(pasted.objects[3]).toMatchObject({ id: "copy-svg", attachmentId: "original-svg" });
    expect(pasted.objects[1]).toMatchObject({ childIds: ["copy-url", "copy-svg", "copy-stroke"] });
    const edgeData = graph.objects[0];
    if (edgeData.kind !== "line-edge") throw new Error("bad fixture");
    edgeData.targetId = "stroke";
    expect(() => codec.decode(graph, "invalid")).toThrow("expected existing connectable entity");
  });

  it.each([
    { _: "UrlNode", title: 12 },
    { _: "UrlNode", url: {} },
    { _: "SvgNode", scale: 0 },
    { _: "SvgNode", scale: -1 },
    { _: "SvgNode", attachmentId: 12 },
    { _: "PenStroke", segments: [{ location: { _: "Vector", x: 0, y: 0 }, pressure: "0.5" }] },
  ])("rejects invalid URL/SVG/stroke data before allocation: %j", (fields) => {
    expect(() =>
      readLegacyTextGraph([{ uuid: "bad", collisionBox: legacyNode("unused").collisionBox, ...fields }]),
    ).toThrow("graph.objects.0");
  });

  it("round-trips image and audio/video attachments, geometry and graph identity without resource loading", () => {
    const input = freezeDeep([
      legacyEdge("/2", "/3"),
      legacySection("media-group", [{ $: "/2" }, { $: "/3" }, { $: "/4" }]),
      {
        _: "ImageNode",
        uuid: "image",
        collisionBox: legacyNode("unused").collisionBox,
        attachmentId: "image-attachment",
        scale: 0.25,
        isBackground: true,
        details: legacyNode("unused").details,
      },
      {
        _: "MediaNode",
        uuid: "audio",
        collisionBox: legacyNode("unused").collisionBox,
        attachmentId: "audio-attachment",
        mediaKind: "audio",
        title: "Audio title",
      },
      {
        _: "MediaNode",
        uuid: "video",
        collisionBox: legacyNode("unused").collisionBox,
        attachmentId: "missing-video",
      },
    ]);
    expect(supportsLegacyTextGraph(input)).toBe(true);
    const graph = readLegacyTextGraph(input);
    expect(graph.objects[2]).toMatchObject({
      kind: "image-node",
      attachmentId: "image-attachment",
      scale: 0.25,
      isBackground: true,
      rectangle: { location: { x: 12.34, y: 5.67 }, size: { x: 120, y: 80 } },
      details: legacyNode("unused").details,
    });
    expect(graph.objects[3]).toMatchObject({ kind: "media-node", mediaKind: "audio", title: "Audio title" });
    expect(graph.objects[4]).toMatchObject({ kind: "media-node", mediaKind: "video", title: "" });
    const codec = createTextGraphCodec(factories());
    const models = codec.decode({ ...graph, objects: [...graph.objects].reverse() }, "media");
    const [edge, section, image, audio, video] = models;
    if (!(edge instanceof EdgeModel) || !(section instanceof SectionModel)) throw new Error("bad fixture");
    expect(edge.source).toBe(image);
    expect(edge.target).toBe(audio);
    expect(section.children).toEqual([image, audio, video]);
    expect(codec.encode(codec.decode(JSON.parse(JSON.stringify(graph)), "reopen"))).toEqual(graph);
    const pasted = remapTextGraphIds(graph, (id) => `copy-${id}`);
    expect(pasted.objects[2]).toMatchObject({ id: "copy-image", attachmentId: "image-attachment" });
    expect(pasted.objects[3]).toMatchObject({ id: "copy-audio", attachmentId: "audio-attachment" });
    expect(pasted.objects[1]).toMatchObject({ childIds: ["copy-image", "copy-audio", "copy-video"] });
  });

  it.each([
    { _: "ImageNode", scale: 0 },
    { _: "ImageNode", scale: -1 },
    { _: "ImageNode", isBackground: "true" },
    { _: "ImageNode", attachmentId: 42 },
    { _: "MediaNode", mediaKind: "future" },
    { _: "MediaNode", title: 42 },
  ])("rejects invalid image/media data before allocating models: %j", (fields) => {
    const input = [{ uuid: "invalid", collisionBox: legacyNode("unused").collisionBox, ...fields }];
    expect(() => readLegacyTextGraph(freezeDeep(input))).toThrow("graph.objects.0");
  });

  it("links nested Sections, shared children and point/Section endpoints independently of allocation order", () => {
    const input = freezeDeep(groupedFixture());
    const graph = readLegacyTextGraph(input);
    expect(readLegacyTextGraph(input)).toEqual(graph);
    const codec = createTextGraphCodec(factories());
    const models = codec.decode({ ...graph, objects: [...graph.objects].reverse() }, "grouped");
    const [edge, outer, inner, node, point] = models;
    if (!(edge instanceof EdgeModel) || !(outer instanceof SectionModel) || !(inner instanceof SectionModel)) {
      throw new Error("bad grouped fixture");
    }
    expect(edge.source).toBe(point);
    expect(edge.target).toBe(inner);
    expect(outer.children).toEqual([inner, point, node]);
    expect(inner.children[0]).toBe(node);
    expect(inner.data).toMatchObject({
      rectangle: { location: { x: -12.34, y: 5.67 }, size: { x: 500.25, y: 300.75 } },
      isCollapsed: true,
      locked: true,
      borderStyle: "dashed",
      color: { r: 1, g: 2, b: 3, a: 0.4 },
      details: [{ type: "p", children: [{ text: "Group details" }] }],
    });
    const exported = codec.encode(models);
    expect(codec.encode(codec.decode(JSON.parse(JSON.stringify(exported)), "reopened"))).toEqual(exported);
    expect(codec.encode(codec.decode(exported, "undo"))).toEqual(exported);
    const calls: string[] = [];
    const pasted = remapTextGraphIds(exported, (id) => {
      calls.push(id);
      return `copy-${id}`;
    });
    const copies = codec.decode(pasted, "paste");
    const copyOuter = copies[1];
    const copyInner = copies[2];
    if (!(copyOuter instanceof SectionModel) || !(copyInner instanceof SectionModel)) throw new Error("bad fixture");
    expect(calls).toEqual(exported.order);
    expect(copyOuter.children).toEqual([copyInner, copies[4], copies[3]]);
    expect(copyInner.children[0]).toBe(copies[3]);
    expect(copyInner.children[0]).not.toBe(node);
    expect(copies.map(({ uuid }) => uuid)).toEqual(exported.order.map((id) => `copy-${id}`));
  });

  it("reads historical rectangle-only Sections and normalizes repeated legacy children without losing shared identity", () => {
    const section = {
      _: "Section",
      uuid: "section",
      children: [{ $: "/1" }, { $: "/1" }],
      collisionBox: legacyNode("unused").collisionBox,
    };
    const graph = readLegacyTextGraph(freezeDeep([section, legacyNode("a")]));
    expect(graph.objects[0]).toMatchObject({ childIds: ["a"], isCollapsed: false, locked: false });
  });

  it("detects unsupported inline kinds before selecting the explicit legacy reader", () => {
    expect(supportsLegacyTextGraph(groupedFixture())).toBe(true);
    expect(
      supportsLegacyTextGraph([legacySection("mixed", [{ _: "FutureNode", uuid: "ref" }]), { $: "/0/children/0" }]),
    ).toBe(false);
    const invalid = [{ ...legacySection("bad"), children: "invalid" }];
    expect(supportsLegacyTextGraph(invalid)).toBe(true);
    expect(() => readLegacyTextGraph(invalid)).toThrow("children: expected array");
  });

  it.each([
    ["self membership", [legacySection("a", [{ $: "/0" }])], "cyclic section"],
    ["indirect cycle", [legacySection("a", [{ $: "/1" }]), legacySection("b", [{ $: "/0" }])], "cyclic section"],
    ["relationship child", [legacySection("a", [{ $: "/1" }]), legacyEdge("/0", "/0")], "expected existing entity"],
    ["unlisted child", [legacySection("a", [legacyNode("unlisted")])], "every object"],
    ["missing child", [legacySection("a", [{ $: "/9" }])], "missing legacy reference"],
    ["unsupported child", [legacySection("a", [{ _: "FutureNode", uuid: "future" }])], "unsupported legacy"],
    ["unsafe child path", [legacySection("a", [{ $: "/0/details/0" }])], "unsafe legacy reference"],
  ])("rejects %s before any factory is invoked", (_name, input, message) => {
    const table = factories();
    table.section.create = () => {
      throw new Error("must not create");
    };
    expect(() => createTextGraphCodec(table).decode(readLegacyTextGraph(freezeDeep(input)), "invalid")).toThrow(
      message,
    );
  });

  it("bounds logical Section depth even when the raw JSON is flat", () => {
    const chain = (length: number) =>
      Array.from({ length }, (_, index) =>
        legacySection(`section-${index}`, index < length - 1 ? [{ $: `/${index + 1}` }] : []),
      );
    expect(() => readLegacyTextGraph(chain(MAX_DATA_DEPTH + 1))).toThrow("sections: nesting depth limit");
    expect(readLegacyTextGraph(chain(MAX_DATA_DEPTH)).objects).toHaveLength(MAX_DATA_DEPTH);
  });

  it("rejects malformed Section border geometry, duplicate DTO children and Section factory ID changes", () => {
    const malformed = legacySection("bad");
    malformed._collisionBoxNormal.shapes[0] = {
      _: "Rectangle",
      location: { _: "Vector", x: 0, y: 0 },
      size: { _: "Vector", x: 1, y: 1 },
    };
    expect(() => readLegacyTextGraph([malformed])).toThrow("expected legacy Line");
    const graph = readLegacyTextGraph(groupedFixture());
    const section = graph.objects.find((object) => object.kind === "section")!;
    if (section.kind !== "section") throw new Error("bad fixture");
    section.childIds.push(section.childIds[0]);
    expect(() => parseTextGraph(graph)).toThrow("childIds: duplicate ID");
    section.childIds.pop();
    const table = factories();
    table.section.create = (_context, data) => new SectionModel({ ...data, id: "changed" });
    expect(() => createTextGraphCodec(table).decode(graph, "invalid")).toThrow("factory changed ID");
  });

  it("reads a legacy PRG, creates shared endpoints, exports JSON DTO and reopens without precision loss", async () => {
    const output = new Uint8ArrayWriter();
    const writer = new ZipWriter(output, { level: 0 });
    const encoder = new Encoder();
    await writer.add("stage.msgpack", new Uint8ArrayReader(encoder.encode(fixture())));
    await writer.add("metadata.msgpack", new Uint8ArrayReader(encoder.encode({ version: "2.7.0" })));
    await writer.close();
    const file = await parseProjectFile(await output.getData(), new Map());
    if (file.format !== "legacy") throw new Error("expected legacy fixture");
    const graph = readLegacyTextGraph(freezeDeep(file.serializedStageObjects));
    const codec = createTextGraphCodec(factories());
    const models = codec.decode(graph, "project-a");
    const edge = models[0];
    const source = models[1];
    expect(edge).toBeInstanceOf(EdgeModel);
    expect(source).toBeInstanceOf(NodeModel);
    if (!(edge instanceof EdgeModel) || !(source instanceof NodeModel)) throw new Error("bad fixture");
    expect(edge.source).toBe(source);
    expect(edge.target).toBe(models[2]);
    source.rectangle.location.x = 12.345678901;
    const exported = codec.encode(models);
    const reopened = codec.decode(JSON.parse(JSON.stringify(exported)), "project-b");
    expect(codec.encode(reopened)).toEqual(exported);
    expect(reopened[1]).not.toBe(source);
    expect((exported.objects.find(({ id }) => id === "a") as TextNodeData).rectangle.location.x).toBe(12.345678901);
    expect(source.context).toBe("project-a");
  });

  it("does not mutate frozen inputs or depend on property, object or factory table order", () => {
    const input = freezeDeep(fixture());
    const first = readLegacyTextGraph(input);
    expect(readLegacyTextGraph(input)).toEqual(first);
    const reorderedInput = input.map((object) => Object.fromEntries(Object.entries(object).reverse()));
    expect(readLegacyTextGraph(reorderedInput)).toEqual(first);
    const table = factories();
    const codec = createTextGraphCodec({
      syncAssociation: table.syncAssociation,
      splineEdge: table.splineEdge,
      multiTargetEdge: table.multiTargetEdge,
      arcEdge: table.arcEdge,
      latexNode: table.latexNode,
      extensionEntity: table.extensionEntity,
      referenceBlock: table.referenceBlock,
      mediaNode: table.mediaNode,
      imageNode: table.imageNode,
      penStroke: table.penStroke,
      svgNode: table.svgNode,
      urlNode: table.urlNode,
      section: table.section,
      lineEdge: table.lineEdge,
      connectPoint: table.connectPoint,
      textNode: table.textNode,
    });
    const graph = freezeDeep({ ...first, objects: [...first.objects].reverse() });
    const models = codec.decode(graph, "isolated");
    expect(models.map(({ uuid }) => uuid)).toEqual(first.order);
    expect(codec.encode(models).objects).toEqual(first.objects);
  });

  it("resolves inline first definitions, shared forward references and self-loop edges", () => {
    const inline = legacyNode("a");
    const input = [
      { ...legacyEdge(), associationList: [inline, { $: "/0/associationList/0" }] },
      { $: "/0/associationList/0" },
    ];
    const codec = createTextGraphCodec(factories());
    const models = codec.decode(readLegacyTextGraph(freezeDeep(input)), "loop");
    const edge = models[0];
    if (!(edge instanceof EdgeModel)) throw new Error("bad fixture");
    expect(edge.source).toBe(models[1]);
    expect(edge.target).toBe(models[1]);
  });

  it("isolates factory instances and snapshots callbacks instead of a mutable global registry", () => {
    const table = factories();
    const first = createTextGraphCodec(table);
    table.textNode.create = () => {
      throw new Error("reconfigured");
    };
    const second = createTextGraphCodec(table);
    const graph = readLegacyTextGraph(fixture());
    expect(first.decode(graph, "first")).toHaveLength(3);
    expect(() => second.decode(graph, "second")).toThrow("reconfigured");
    expect(Object.isFrozen(first)).toBe(true);
  });

  it("restores independent undo snapshots and remaps pasted internal references exactly once", () => {
    const codec = createTextGraphCodec(factories());
    const before = freezeDeep(readLegacyTextGraph(fixture()));
    const edited = codec.decode(before, "edit");
    const source = edited[1];
    if (!(source instanceof NodeModel)) throw new Error("bad fixture");
    source.data.text = "edited";
    const after = freezeDeep(codec.encode(edited));
    expect(codec.encode(codec.decode(before, "undo"))).toEqual(before);
    expect(codec.encode(codec.decode(after, "redo"))).toEqual(after);
    const calls: string[] = [];
    const pasted = remapTextGraphIds(before, (id) => {
      calls.push(id);
      return `copy-${id}`;
    });
    expect(calls).toEqual(before.objects.map(({ id }) => id));
    const pasteModels = codec.decode(pasted, "paste");
    const edge = pasteModels[0];
    if (!(edge instanceof EdgeModel)) throw new Error("bad fixture");
    expect(edge.source).toBe(pasteModels[1]);
    expect(edge.source.uuid).toBe("copy-a");
    expect(before.order).toEqual(["edge", "a", "b"]);
    expect(() => remapTextGraphIds(before, () => "duplicate")).toThrow("duplicate ID");
  });

  it.each([
    ["missing endpoint", [legacyEdge("/9"), legacyNode("a"), legacyNode("b")], "missing legacy reference"],
    ["unsafe path", [legacyEdge("/1/__proto__"), legacyNode("a"), legacyNode("b")], "unsafe legacy reference"],
    ["unknown tag", [{ _: "FutureNode", uuid: "future" }], "unsupported legacy"],
    ["duplicate ID", [legacyNode("a"), legacyNode("a")], "duplicate definition"],
    ["path cycle", [{ $: "/1" }, { $: "/0" }], "cyclic legacy reference"],
    ["wrong endpoint type", [legacyEdge("/0", "/0")], "expected connectable entity"],
    ["unlisted endpoint", [{ ...legacyEdge(), associationList: [legacyNode("a"), legacyNode("b")] }], "every object"],
    ["ambiguous ref", [{ $: "/0", _: "TextNode" }], "invalid legacy reference"],
  ])("rejects %s without invoking runtime factories", (_label, input, message) => {
    expect(() => readLegacyTextGraph(freezeDeep(input))).toThrow(message);
  });

  it("validates the entire graph before invoking any factory", () => {
    const graph = readLegacyTextGraph(fixture());
    const edge = graph.objects[0];
    if (edge.kind !== "line-edge") throw new Error("bad fixture");
    edge.targetId = "missing";
    const table = factories();
    table.textNode.create = () => {
      throw new Error("must not create");
    };
    expect(() => createTextGraphCodec(table).decode(graph, "active")).toThrow("expected existing connectable entity");
  });

  it("rejects factories and encoders that change object IDs", () => {
    const graph = readLegacyTextGraph(fixture());
    const table = factories();
    table.textNode.create = (context, data) => new NodeModel({ ...data, id: "changed" }, context);
    expect(() => createTextGraphCodec(table).decode(graph, "active")).toThrow("factory changed ID");
    const models = createTextGraphCodec(factories()).decode(graph, "active");
    const wrongEncoder = factories();
    wrongEncoder.lineEdge.encode = (model) => ({ ...model.data, id: "changed" });
    expect(() => createTextGraphCodec(wrongEncoder).encode(models)).toThrow("codec changed ID");
  });

  it("reports named geometry and color paths without leaking node text", () => {
    const negativeSize = legacyNode("bad-size");
    negativeSize.collisionBox.shapes[0].size.x = -1;
    expect(() => readLegacyTextGraph([negativeSize])).toThrow("rectangle.size.x");
    const invalidColor = legacyNode("bad-color");
    invalidColor.color.a = 2;
    expect(() => readLegacyTextGraph([invalidColor])).toThrow("color.a");
    const invalid = { ...legacyNode("bad-text"), text: { privateContent: "do not print" } };
    expect(() => readLegacyTextGraph([invalid])).toThrow(/^graph.objects.0.text: invalid_type$/);
  });

  it("does not evaluate accessors in untrusted input", () => {
    let accessed = false;
    const input = Object.defineProperty({}, "objects", {
      enumerable: true,
      get() {
        accessed = true;
        return [];
      },
    });
    expect(() => parseTextGraph(input)).toThrow("accessors are not supported");
    expect(accessed).toBe(false);
  });

  it("rejects invalid data, excessive depth, object count, cycles and ambiguous ordering", () => {
    const graph = readLegacyTextGraph(fixture());
    expect(() => parseTextGraph({ ...graph, order: ["edge", "a", "a"] })).toThrow("duplicate ID");
    expect(() => parseTextGraph({ ...graph, order: ["edge", "a"] })).toThrow("every object");
    expect(() => parseTextGraph({ ...graph, order: ["edge", "a", "missing"] })).toThrow("missing object");
    const invalid = legacyNode("a", Number.NaN);
    expect(() => readLegacyTextGraph([invalid])).toThrow("JSON-compatible");
    expect(() => readLegacyTextGraph(Array.from({ length: MAX_GRAPH_OBJECTS + 1 }, () => null))).toThrow(
      "bounded array",
    );
    let deep: unknown = null;
    for (let index = 0; index <= MAX_DATA_DEPTH; index++) deep = { nested: deep };
    expect(() => parseTextGraph(deep)).toThrow("nesting depth");
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    expect(() => parseTextGraph(cycle)).toThrow("cyclic input");
    expect(() => parseTextGraph(JSON.parse('{"__proto__":{}}'))).toThrow("unsafe property");
  });
});
