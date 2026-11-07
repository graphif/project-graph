import { z } from "zod";

export const MAX_GRAPH_OBJECTS = 100_000;
export const MAX_DATA_DEPTH = 64;
const MAX_DATA_VALUES = 2_000_000;

export const vectorDataSchema = z.strictObject({ x: z.number().finite(), y: z.number().finite() });
export const rectangleDataSchema = z.strictObject({
  location: vectorDataSchema,
  size: z.strictObject({ x: z.number().nonnegative().finite(), y: z.number().nonnegative().finite() }),
});
export const colorDataSchema = z.strictObject({
  r: z.number().min(0).max(255),
  g: z.number().min(0).max(255),
  b: z.number().min(0).max(255),
  a: z.number().min(0).max(1),
});

const richTextLeafSchema = z.object({ text: z.string() }).catchall(z.json());
const richTextElementSchema = z
  .object({
    type: z.string(),
    get children(): z.ZodArray<z.ZodUnion<[typeof richTextLeafSchema, z.ZodLazy<typeof richTextElementSchema>]>> {
      return z.array(z.union([richTextLeafSchema, z.lazy(() => richTextElementSchema)]));
    },
  })
  .catchall(z.json());

const objectIdSchema = z.string().min(1).max(256);
const transparent = { r: 0, g: 0, b: 0, a: 0 };

export const textNodeDataSchema = z.strictObject({
  kind: z.literal("text-node"),
  id: objectIdSchema,
  text: z.string().default(""),
  rectangle: rectangleDataSchema,
  details: z.array(richTextElementSchema).default([]),
  color: colorDataSchema.default(transparent),
  sizeAdjust: z.enum(["auto", "manual"]).default("auto"),
  fontScaleLevel: z.number().int().default(0),
  fontFamily: z.string().default(""),
  fontWeight: z.string().default(""),
  borderStyle: z.enum(["solid", "dashed", "none"]).default("solid"),
});

export const lineEdgeDataSchema = z.strictObject({
  kind: z.literal("line-edge"),
  id: objectIdSchema,
  sourceId: objectIdSchema,
  targetId: objectIdSchema,
  text: z.string().default(""),
  color: colorDataSchema.default(transparent),
  sourceRectangleRate: vectorDataSchema.default({ x: 0.5, y: 0.5 }),
  targetRectangleRate: vectorDataSchema.default({ x: 0.5, y: 0.5 }),
  lineType: z.string().default("solid"),
  arrowType: z.string().default("default"),
});

export const connectPointDataSchema = z.strictObject({
  kind: z.literal("connect-point"),
  id: objectIdSchema,
  rectangle: rectangleDataSchema,
  details: textNodeDataSchema.shape.details,
});

export const imageNodeDataSchema = z.strictObject({
  kind: z.literal("image-node"),
  id: objectIdSchema,
  rectangle: rectangleDataSchema,
  details: textNodeDataSchema.shape.details,
  attachmentId: z.string().max(256).default(""),
  scale: z.number().positive().finite().default(1),
  isBackground: z.boolean().default(false),
});

export const mediaNodeDataSchema = z.strictObject({
  kind: z.literal("media-node"),
  id: objectIdSchema,
  rectangle: rectangleDataSchema,
  details: textNodeDataSchema.shape.details,
  attachmentId: imageNodeDataSchema.shape.attachmentId,
  mediaKind: z.enum(["audio", "video"]).default("video"),
  title: z.string().default(""),
});

export const urlNodeDataSchema = z.strictObject({
  kind: z.literal("url-node"),
  id: objectIdSchema,
  rectangle: rectangleDataSchema,
  details: textNodeDataSchema.shape.details,
  title: z.string().default(""),
  url: z.string().default(""),
  color: colorDataSchema.default(transparent),
});

export const svgNodeDataSchema = z.strictObject({
  kind: z.literal("svg-node"),
  id: objectIdSchema,
  rectangle: rectangleDataSchema,
  details: textNodeDataSchema.shape.details,
  attachmentId: imageNodeDataSchema.shape.attachmentId,
  scale: z.number().positive().finite().default(1),
  color: colorDataSchema.default(transparent),
});

export const penStrokeDataSchema = z.strictObject({
  kind: z.literal("pen-stroke"),
  id: objectIdSchema,
  segments: z
    .array(z.strictObject({ location: vectorDataSchema, pressure: z.number().finite() }))
    .max(MAX_GRAPH_OBJECTS),
  color: colorDataSchema.default(transparent),
  details: textNodeDataSchema.shape.details,
});

export const referenceBlockDataSchema = z.strictObject({
  kind: z.literal("reference-block"),
  id: objectIdSchema,
  rectangle: rectangleDataSchema,
  details: textNodeDataSchema.shape.details,
  fileName: z.string().default(""),
  sectionName: z.string().default(""),
  scale: z.number().positive().finite().default(1),
  attachmentId: imageNodeDataSchema.shape.attachmentId,
});

export const extensionEntityDataSchema = z.strictObject({
  kind: z.literal("extension-entity"),
  id: objectIdSchema,
  rectangle: rectangleDataSchema,
  details: textNodeDataSchema.shape.details,
  extensionId: z.string().min(1).max(256),
  typeName: z.string().min(1).max(256),
  customData: z.json(),
});

export const latexNodeDataSchema = z.strictObject({
  kind: z.literal("latex-node"),
  id: objectIdSchema,
  rectangle: rectangleDataSchema,
  details: textNodeDataSchema.shape.details,
  latexSource: z.string().default(""),
  color: colorDataSchema.default(transparent),
  fontScaleLevel: z.number().int().default(0),
});

export const arcEdgeDataSchema = lineEdgeDataSchema.extend({
  kind: z.literal("arc-edge"),
  offset: z.number().finite().default(0),
  textPosition: z.number().min(0).max(1).default(0.5),
});

export const splineEdgeDataSchema = lineEdgeDataSchema.omit({ lineType: true, arrowType: true }).extend({
  kind: z.literal("spline-edge"),
  alpha: z.number().finite().default(0.5),
  tension: z.number().finite().default(0),
  controlPoints: z.array(vectorDataSchema).min(4).max(MAX_GRAPH_OBJECTS),
});

export const multiTargetEdgeDataSchema = z.strictObject({
  kind: z.literal("multi-target-edge"),
  id: objectIdSchema,
  memberIds: z.array(objectIdSchema).max(MAX_GRAPH_OBJECTS),
  text: z.string().default(""),
  color: colorDataSchema.default(transparent),
  rectRates: z.array(vectorDataSchema).max(MAX_GRAPH_OBJECTS),
  centerRate: vectorDataSchema.default({ x: 0.5, y: 0.5 }),
  arrow: z.enum(["inner", "outer", "none"]).default("none"),
  arrowType: z
    .enum(["default", "hollow-triangle", "filled-triangle", "hollow-diamond", "filled-diamond"])
    .default("default"),
  renderType: z.enum(["line", "convex", "circle"]).default("line"),
  lineType: z.enum(["solid", "dashed", "double"]).default("solid"),
  padding: z.number().finite().default(10),
});

export const syncAssociationDataSchema = z.strictObject({
  kind: z.literal("sync-association"),
  id: objectIdSchema,
  memberIds: z.array(objectIdSchema).max(MAX_GRAPH_OBJECTS),
  keys: z.array(z.enum(["text", "color", "details"])).default(["text", "color", "details"]),
  color: colorDataSchema.default(transparent),
});

export const sectionDataSchema = z.strictObject({
  kind: z.literal("section"),
  id: objectIdSchema,
  rectangle: rectangleDataSchema,
  childIds: z.array(objectIdSchema).max(MAX_GRAPH_OBJECTS).default([]),
  text: z.string().default(""),
  color: colorDataSchema.default(transparent),
  details: textNodeDataSchema.shape.details,
  isCollapsed: z.boolean().default(false),
  locked: z.boolean().default(false),
  borderStyle: textNodeDataSchema.shape.borderStyle,
});

export const graphObjectSchemas = {
  textNode: textNodeDataSchema,
  connectPoint: connectPointDataSchema,
  imageNode: imageNodeDataSchema,
  mediaNode: mediaNodeDataSchema,
  urlNode: urlNodeDataSchema,
  svgNode: svgNodeDataSchema,
  penStroke: penStrokeDataSchema,
  section: sectionDataSchema,
  lineEdge: lineEdgeDataSchema,
  referenceBlock: referenceBlockDataSchema,
  extensionEntity: extensionEntityDataSchema,
  latexNode: latexNodeDataSchema,
  arcEdge: arcEdgeDataSchema,
  splineEdge: splineEdgeDataSchema,
  multiTargetEdge: multiTargetEdgeDataSchema,
  syncAssociation: syncAssociationDataSchema,
} as const;

type ObjectSchema = (typeof graphObjectSchemas)[keyof typeof graphObjectSchemas];
const objectSchemas = Object.values(graphObjectSchemas) as [ObjectSchema, ...ObjectSchema[]];

export const textGraphDataSchema = z.strictObject({
  objects: z.array(z.discriminatedUnion("kind", objectSchemas)).max(MAX_GRAPH_OBJECTS),
  order: z.array(objectIdSchema).max(MAX_GRAPH_OBJECTS),
});

export type TextNodeData = z.output<typeof textNodeDataSchema>;
export type RectangleData = z.output<typeof rectangleDataSchema>;
export type LineEdgeData = z.output<typeof lineEdgeDataSchema>;
export type ConnectPointData = z.output<typeof connectPointDataSchema>;
export type ImageNodeData = z.output<typeof imageNodeDataSchema>;
export type MediaNodeData = z.output<typeof mediaNodeDataSchema>;
export type UrlNodeData = z.output<typeof urlNodeDataSchema>;
export type SvgNodeData = z.output<typeof svgNodeDataSchema>;
export type PenStrokeData = z.output<typeof penStrokeDataSchema>;
export type SectionData = z.output<typeof sectionDataSchema>;
export type ReferenceBlockData = z.output<typeof referenceBlockDataSchema>;
export type ExtensionEntityData = z.output<typeof extensionEntityDataSchema>;
export type LatexNodeData = z.output<typeof latexNodeDataSchema>;
export type ArcEdgeData = z.output<typeof arcEdgeDataSchema>;
export type SplineEdgeData = z.output<typeof splineEdgeDataSchema>;
export type MultiTargetEdgeData = z.output<typeof multiTargetEdgeDataSchema>;
export type SyncAssociationData = z.output<typeof syncAssociationDataSchema>;
export type TextGraphData = z.output<typeof textGraphDataSchema>;

export function isEntityData(object: TextGraphData["objects"][number]): boolean {
  return (
    object.kind !== "line-edge" &&
    object.kind !== "arc-edge" &&
    object.kind !== "spline-edge" &&
    object.kind !== "multi-target-edge" &&
    object.kind !== "sync-association"
  );
}

export function isConnectableData(object: TextGraphData["objects"][number]): boolean {
  return isEntityData(object) && object.kind !== "pen-stroke";
}

// Bound traversal before recursive schemas, including rich-text plugin properties.
export function assertBoundedData(value: unknown): void {
  const ancestors = new Set<object>();
  let count = 0;
  function visit(current: unknown, depth: number): void {
    if (++count > MAX_DATA_VALUES) throw new Error("data: value count limit exceeded");
    if (depth > MAX_DATA_DEPTH) throw new Error("data: nesting depth limit exceeded");
    if (current === null || typeof current === "string" || typeof current === "boolean") return;
    if (typeof current === "number" && Number.isFinite(current)) return;
    if (typeof current !== "object" || current === null) throw new Error("data: expected JSON-compatible value");
    if (ancestors.has(current)) throw new Error("data: cyclic input; use object IDs for references");
    const prototype: unknown = Object.getPrototypeOf(current);
    if (!Array.isArray(current) && prototype !== Object.prototype && prototype !== null) {
      throw new Error("data: expected plain object");
    }
    ancestors.add(current);
    for (const key of Object.keys(current)) {
      if (key === "__proto__" || key === "prototype" || key === "constructor") {
        throw new Error("data: unsafe property name");
      }
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (!descriptor || !("value" in descriptor)) throw new Error("data: accessors are not supported");
      visit(descriptor.value, depth + 1);
    }
    ancestors.delete(current);
  }
  visit(value, 0);
}

export function parseTextGraph(value: unknown): TextGraphData {
  assertBoundedData(value);
  const parsed = textGraphDataSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // Zod messages may include user-controlled literals. Report the path and error code, not project content.
    throw new Error(`graph.${issue.path.map(String).join(".")}: ${issue.code}`);
  }
  const graph = parsed.data;
  const objects = new Map<string, TextGraphData["objects"][number]>();
  for (const object of graph.objects) {
    if (objects.has(object.id)) throw new Error(`objects[${object.id}]: duplicate ID`);
    objects.set(object.id, object);
  }
  const ordered = new Set<string>();
  for (const id of graph.order) {
    if (!objects.has(id)) throw new Error(`order[${id}]: missing object`);
    if (ordered.has(id)) throw new Error(`order[${id}]: duplicate ID`);
    ordered.add(id);
  }
  if (ordered.size !== objects.size) throw new Error("order: must contain every object exactly once");
  for (const object of graph.objects) {
    if (object.kind === "line-edge" || object.kind === "arc-edge" || object.kind === "spline-edge") {
      for (const field of ["sourceId", "targetId"] as const) {
        const endpoint = objects.get(object[field]);
        if (!endpoint || !isConnectableData(endpoint)) {
          throw new Error(`objects[${object.id}].${field}: expected existing connectable entity`);
        }
      }
    } else if (object.kind === "section") {
      const children = new Set<string>();
      for (const id of object.childIds) {
        const child = objects.get(id);
        if (!child || !isEntityData(child)) {
          throw new Error(`objects[${object.id}].childIds: expected existing entity`);
        }
        if (children.has(id)) throw new Error(`objects[${object.id}].childIds: duplicate ID`);
        children.add(id);
      }
    } else if (object.kind === "multi-target-edge" || object.kind === "sync-association") {
      for (const id of object.memberIds) {
        const member = objects.get(id);
        if (!member || (object.kind === "multi-target-edge" && !isConnectableData(member))) {
          throw new Error(`objects[${object.id}].memberIds: invalid relationship member`);
        }
      }
      if (object.kind === "multi-target-edge" && object.rectRates.length !== object.memberIds.length) {
        throw new Error(`objects[${object.id}].rectRates: expected one rate per member`);
      }
    }
  }
  // Graph edges may loop, but Section's recursive layout/collapse tree must be acyclic and bounded.
  const heights = new Map<string, number>();
  const visiting = new Set<string>();
  function sectionHeight(section: SectionData, depth: number): number {
    if (depth > MAX_DATA_DEPTH) throw new Error("sections: nesting depth limit exceeded");
    if (visiting.has(section.id)) throw new Error(`objects[${section.id}].childIds: cyclic section membership`);
    const cached = heights.get(section.id);
    if (cached !== undefined) return cached;
    visiting.add(section.id);
    let height = 1;
    for (const id of section.childIds) {
      const child = objects.get(id)!;
      if (child.kind === "section") height = Math.max(height, 1 + sectionHeight(child, depth + 1));
    }
    if (height > MAX_DATA_DEPTH) throw new Error("sections: nesting depth limit exceeded");
    visiting.delete(section.id);
    heights.set(section.id, height);
    return height;
  }
  for (const object of graph.objects) {
    if (object.kind === "section") sectionHeight(object, 1);
  }
  return graph;
}

export function remapTextGraphIds(value: unknown, makeId: (id: string) => string): TextGraphData {
  const graph = parseTextGraph(value);
  const ids = new Map(graph.objects.map(({ id }) => [id, makeId(id)]));
  const remap = (id: string) => ids.get(id)!;
  return parseTextGraph({
    objects: graph.objects.map((object) => {
      switch (object.kind) {
        case "line-edge":
        case "arc-edge":
        case "spline-edge":
          return {
            ...object,
            id: remap(object.id),
            sourceId: remap(object.sourceId),
            targetId: remap(object.targetId),
          };
        case "section":
          return { ...object, id: remap(object.id), childIds: object.childIds.map(remap) };
        case "multi-target-edge":
        case "sync-association":
          return { ...object, id: remap(object.id), memberIds: object.memberIds.map(remap) };
        default:
          return { ...object, id: remap(object.id) };
      }
    }),
    order: graph.order.map(remap),
  });
}
