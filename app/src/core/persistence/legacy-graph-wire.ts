import { parseTextGraph, type RectangleData } from "./text-graph";

// Compatibility for existing collaboration peers, not a file writer or general serializer.
export function encodeLegacyGraphWire(input: unknown): unknown[] {
  const graph = parseTextGraph(input);
  const indices = new Map(graph.order.map((id, index) => [id, index]));
  const reference = (id: string) => ({ $: `/${indices.get(id)!}` });
  const vector = (value: { x: number; y: number }) => ({ _: "Vector", ...value });
  const rectangle = (value: RectangleData) => ({
    _: "Rectangle",
    location: vector(value.location),
    size: vector(value.size),
  });
  const objects = new Map(graph.objects.map((object) => [object.id, object]));
  return graph.order.map((id) => {
    const object = objects.get(id)!;
    const { kind, id: uuid, ...fields } = object;
    const data: Record<string, unknown> = { uuid, ...fields };
    if ("color" in object) data.color = { _: "Color", ...object.color };
    if ("rectangle" in object) {
      delete data.rectangle;
      data.collisionBox = { _: "CollisionBox", shapes: [rectangle(object.rectangle)] };
    }
    switch (kind) {
      case "text-node":
        return { _: "TextNode", ...data };
      case "connect-point":
        return { _: "ConnectPoint", ...data };
      case "image-node":
        return { _: "ImageNode", ...data };
      case "media-node":
        return { _: "MediaNode", ...data };
      case "url-node":
        return { _: "UrlNode", ...data };
      case "svg-node":
        return { _: "SvgNode", ...data };
      case "reference-block":
        return { _: "ReferenceBlockNode", ...data };
      case "extension-entity":
        return { _: "ExtensionEntity", ...data };
      case "latex-node":
        return { _: "LatexNode", ...data };
      case "pen-stroke":
        return {
          _: "PenStroke",
          ...data,
          segments: object.segments.map((segment) => ({
            _: "PenStrokeSegment",
            location: vector(segment.location),
            pressure: segment.pressure,
          })),
        };
      case "section": {
        delete data.childIds;
        delete data.collisionBox;
        const {
          location: { x, y },
          size: { x: width, y: height },
        } = object.rectangle;
        const corners = [
          { x, y },
          { x: x + width, y },
          { x: x + width, y: y + height },
          { x, y: y + height },
        ];
        return {
          _: "Section",
          ...data,
          children: object.childIds.map(reference),
          _collisionBoxNormal: {
            _: "CollisionBox",
            shapes: [
              ...corners.map((point, index) => ({
                _: "Line",
                start: vector(point),
                end: vector(corners[(index + 1) % 4]),
              })),
              rectangle({ location: object.rectangle.location, size: { x: width, y: 50 } }),
            ],
          },
        };
      }
      case "line-edge":
      case "arc-edge":
      case "spline-edge":
        delete data.sourceId;
        delete data.targetId;
        data.associationList = [reference(object.sourceId), reference(object.targetId)];
        data.sourceRectangleRate = vector(object.sourceRectangleRate);
        data.targetRectangleRate = vector(object.targetRectangleRate);
        if (kind === "spline-edge") data.controlPoints = object.controlPoints.map(vector);
        return {
          _: kind === "line-edge" ? "LineEdge" : kind === "arc-edge" ? "ArcEdge" : "CubicCatmullRomSplineEdge",
          ...data,
        };
      case "multi-target-edge":
      case "sync-association":
        delete data.memberIds;
        data.associationList = object.memberIds.map(reference);
        if (kind === "multi-target-edge") {
          data.rectRates = object.rectRates.map(vector);
          data.centerRate = vector(object.centerRate);
        }
        return { _: kind === "multi-target-edge" ? "MultiTargetUndirectedEdge" : "SyncAssociation", ...data };
    }
  });
}
