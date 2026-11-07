import { z } from "zod";
import { graphObjectSchemas, parseTextGraph, type TextGraphData } from "./text-graph";

type Identified = { uuid: string };

type GraphKey = keyof typeof graphObjectSchemas;
export type GraphModels = Record<GraphKey, Identified>;
type RelationshipKey = "lineEdge" | "arcEdge" | "splineEdge" | "multiTargetEdge" | "syncAssociation";
type Entity<Models extends GraphModels> = Models[Exclude<GraphKey, RelationshipKey>];
type Connectable<Models extends GraphModels> = Models[Exclude<GraphKey, RelationshipKey | "penStroke">];
type Data<Key extends GraphKey> = z.output<(typeof graphObjectSchemas)[Key]>;

export type TextGraphFactories<Context, Models extends GraphModels> = {
  [Key in keyof Models & GraphKey]: {
    matches: (model: Identified) => model is Models[Key];
    encode: (model: Models[Key]) => Data<Key>;
    create: Key extends "lineEdge" | "arcEdge" | "splineEdge"
      ? (
          context: Context,
          data: Data<Key>,
          endpoints: { source: Connectable<Models>; target: Connectable<Models> },
        ) => Models[Key]
      : Key extends "multiTargetEdge"
        ? (context: Context, data: Data<Key>, endpoints: { members: Connectable<Models>[] }) => Models[Key]
        : (context: Context, data: Data<Key>) => Models[Key];
  } & (Key extends "section"
    ? { link: (model: Models[Key], children: Entity<Models>[]) => void }
    : Key extends "syncAssociation"
      ? { link: (model: Models[Key], members: Models[GraphKey][]) => void }
      : object);
};

export function createTextGraphCodec<Context, Models extends GraphModels>(
  factories: TextGraphFactories<Context, Models> & {
    textNode: { create: (context: Context, data: Data<"textNode">) => Models["textNode"] };
  },
) {
  const textNode = Object.freeze({ ...factories.textNode });
  const lineEdge = Object.freeze({ ...factories.lineEdge });
  const connectPoint = Object.freeze({ ...factories.connectPoint });
  const section = Object.freeze({ ...factories.section });
  const imageNode = Object.freeze({ ...factories.imageNode });
  const mediaNode = Object.freeze({ ...factories.mediaNode });
  const urlNode = Object.freeze({ ...factories.urlNode });
  const svgNode = Object.freeze({ ...factories.svgNode });
  const penStroke = Object.freeze({ ...factories.penStroke });
  const referenceBlock = Object.freeze({ ...factories.referenceBlock });
  const extensionEntity = Object.freeze({ ...factories.extensionEntity });
  const latexNode = Object.freeze({ ...factories.latexNode });
  const arcEdge = Object.freeze({ ...factories.arcEdge });
  const splineEdge = Object.freeze({ ...factories.splineEdge });
  const multiTargetEdge = Object.freeze({ ...factories.multiTargetEdge });
  const syncAssociation = Object.freeze({ ...factories.syncAssociation });
  type Model = Models[GraphKey];
  return Object.freeze({
    encode(models: readonly Identified[]): TextGraphData {
      return parseTextGraph({
        objects: models.map((model) => {
          const id = model.uuid;
          const data = textNode.matches(model)
            ? textNode.encode(model)
            : lineEdge.matches(model)
              ? lineEdge.encode(model)
              : connectPoint.matches(model)
                ? connectPoint.encode(model)
                : section.matches(model)
                  ? section.encode(model)
                  : imageNode.matches(model)
                    ? imageNode.encode(model)
                    : mediaNode.matches(model)
                      ? mediaNode.encode(model)
                      : urlNode.matches(model)
                        ? urlNode.encode(model)
                        : svgNode.matches(model)
                          ? svgNode.encode(model)
                          : penStroke.matches(model)
                            ? penStroke.encode(model)
                            : referenceBlock.matches(model)
                              ? referenceBlock.encode(model)
                              : extensionEntity.matches(model)
                                ? extensionEntity.encode(model)
                                : latexNode.matches(model)
                                  ? latexNode.encode(model)
                                  : arcEdge.matches(model)
                                    ? arcEdge.encode(model)
                                    : splineEdge.matches(model)
                                      ? splineEdge.encode(model)
                                      : multiTargetEdge.matches(model)
                                        ? multiTargetEdge.encode(model)
                                        : syncAssociation.matches(model)
                                          ? syncAssociation.encode(model)
                                          : undefined;
          if (!data) throw new Error(`objects[${id}]: unsupported runtime kind`);
          if (data.id !== id) throw new Error(`objects[${id}]: codec changed ID`);
          return data;
        }),
        order: models.map(({ uuid }) => uuid),
      });
    },
    decode(input: unknown, context: Context): Model[] {
      // Validate the entire graph before calling any factory or touching the active project.
      const graph = parseTextGraph(input);
      const nodes = new Map<string, Entity<Models>>();
      const connectableNodes = new Map<string, Connectable<Models>>();
      const groups = new Map<string, Models["section"]>();
      const objects = new Map<string, Model>();
      for (const data of graph.objects) {
        let model: Connectable<Models>;
        switch (data.kind) {
          case "text-node":
            model = textNode.create(context, data);
            break;
          case "connect-point":
            model = connectPoint.create(context, data);
            break;
          case "image-node":
            model = imageNode.create(context, data);
            break;
          case "media-node":
            model = mediaNode.create(context, data);
            break;
          case "url-node":
            model = urlNode.create(context, data);
            break;
          case "svg-node":
            model = svgNode.create(context, data);
            break;
          case "reference-block":
            model = referenceBlock.create(context, data);
            break;
          case "extension-entity":
            model = extensionEntity.create(context, data);
            break;
          case "latex-node":
            model = latexNode.create(context, data);
            break;
          case "sync-association": {
            const sync = syncAssociation.create(context, data);
            if (sync.uuid !== data.id) throw new Error(`objects[${data.id}]: factory changed ID`);
            objects.set(data.id, sync);
            continue;
          }
          case "pen-stroke": {
            const stroke = penStroke.create(context, data);
            if (stroke.uuid !== data.id) throw new Error(`objects[${data.id}]: factory changed ID`);
            nodes.set(data.id, stroke);
            objects.set(data.id, stroke);
            continue;
          }
          case "section": {
            const group = section.create(context, data);
            groups.set(data.id, group);
            model = group;
            break;
          }
          default:
            continue;
        }
        if (model.uuid !== data.id) throw new Error(`objects[${data.id}]: factory changed ID`);
        nodes.set(data.id, model);
        connectableNodes.set(data.id, model);
        objects.set(data.id, model);
      }
      for (const data of graph.objects) {
        if (data.kind === "section") {
          section.link(
            groups.get(data.id)!,
            data.childIds.map((id) => nodes.get(id)!),
          );
        }
      }
      for (const data of graph.objects) {
        let model: Model;
        if (data.kind === "line-edge")
          model = lineEdge.create(context, data, {
            source: connectableNodes.get(data.sourceId)!,
            target: connectableNodes.get(data.targetId)!,
          });
        else if (data.kind === "arc-edge")
          model = arcEdge.create(context, data, {
            source: connectableNodes.get(data.sourceId)!,
            target: connectableNodes.get(data.targetId)!,
          });
        else if (data.kind === "spline-edge")
          model = splineEdge.create(context, data, {
            source: connectableNodes.get(data.sourceId)!,
            target: connectableNodes.get(data.targetId)!,
          });
        else if (data.kind === "multi-target-edge")
          model = multiTargetEdge.create(context, data, {
            members: data.memberIds.map((id) => connectableNodes.get(id)!),
          });
        else continue;
        if (model.uuid !== data.id) throw new Error(`objects[${data.id}]: factory changed ID`);
        objects.set(data.id, model);
      }
      for (const data of graph.objects) {
        if (data.kind === "sync-association") {
          const model = objects.get(data.id)!;
          if (!syncAssociation.matches(model)) throw new Error(`objects[${data.id}]: invalid sync factory`);
          syncAssociation.link(
            model,
            data.memberIds.map((id) => objects.get(id)!),
          );
        }
      }
      return graph.order.map((id) => objects.get(id)!);
    },
  });
}
