import { parseTextGraph, remapTextGraphIds, type TextGraphData } from "./text-graph";

export function remapClipboardGraph(
  value: unknown,
  makeId: (id: string) => string,
  attachmentIds: ReadonlyMap<string, string>,
): TextGraphData {
  const graph = remapTextGraphIds(value, makeId);
  return parseTextGraph({
    ...graph,
    objects: graph.objects.map((object) =>
      "attachmentId" in object
        ? { ...object, attachmentId: attachmentIds.get(object.attachmentId) ?? object.attachmentId }
        : object,
    ),
  });
}
