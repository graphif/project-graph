import { afterEach, describe, expect, it } from "vitest";
import { VirtualClipboard } from "../service/data-manage-service/copy-engine/virtual-clipboard";
import { remapClipboardGraph } from "./clipboard-graph";
import { encodeLegacyGraphWire } from "./legacy-graph-wire";
import { readLegacyTextGraph } from "./legacy-text-graph";
import { graphObjectSchemas, parseTextGraph } from "./text-graph";

function fixture() {
  const rectangle = { location: { x: 1.23456789, y: -3.456789 }, size: { x: 123.45, y: 67.89 } };
  const objects = [
    {
      kind: "text-node",
      id: "text",
      rectangle,
      text: "Text",
      details: [{ type: "p", children: [{ text: "Details", bold: true }] }],
    },
    { kind: "connect-point", id: "point", rectangle },
    { kind: "image-node", id: "image", rectangle, attachmentId: "asset" },
    { kind: "media-node", id: "media", rectangle, attachmentId: "asset", mediaKind: "audio" },
    { kind: "url-node", id: "url", rectangle, url: "https://example.com" },
    { kind: "svg-node", id: "svg", rectangle, attachmentId: "asset" },
    { kind: "pen-stroke", id: "stroke", segments: [{ location: { x: 2.3456789, y: 5.6 }, pressure: 0.125 }] },
    { kind: "reference-block", id: "reference", rectangle, attachmentId: "asset", fileName: "Other" },
    {
      kind: "extension-entity",
      id: "extension",
      rectangle,
      extensionId: "test",
      typeName: "widget",
      customData: { _: "Content", $: "not-a-reference", value: 1.23456789 },
    },
    { kind: "latex-node", id: "latex", rectangle, latexSource: "x^2" },
    { kind: "section", id: "inner", rectangle, childIds: ["image"], isCollapsed: true },
    { kind: "section", id: "outer", rectangle, childIds: ["text", "inner", "reference"] },
    { kind: "line-edge", id: "line", sourceId: "text", targetId: "text" },
    { kind: "arc-edge", id: "arc", sourceId: "text", targetId: "point", offset: -2.3456789 },
    {
      kind: "spline-edge",
      id: "spline",
      sourceId: "text",
      targetId: "point",
      controlPoints: [0, 1, 2, 3].map((x) => ({ x, y: x / 3 })),
    },
    {
      kind: "multi-target-edge",
      id: "multi",
      memberIds: ["text", "point"],
      rectRates: [
        { x: 0.25, y: 0.75 },
        { x: 0.5, y: 0.5 },
      ],
    },
    { kind: "sync-association", id: "sync-a", memberIds: ["sync-b", "line"], keys: ["text"] },
    { kind: "sync-association", id: "sync-b", memberIds: ["sync-a", "multi"], keys: ["color"] },
  ];
  return parseTextGraph({ objects, order: objects.map(({ id }) => id) });
}

afterEach(() => VirtualClipboard.clear());

describe("explicit graph boundaries", () => {
  it("keeps all declared graph kinds on the existing collaboration wire without class-name registration", () => {
    const graph = fixture();
    expect(new Set(graph.objects.map(({ kind }) => kind)).size).toBe(Object.keys(graphObjectSchemas).length);
    const before = structuredClone(graph);
    const wire = encodeLegacyGraphWire({ ...graph, objects: [...graph.objects].reverse() });
    expect(readLegacyTextGraph(JSON.parse(JSON.stringify(wire)))).toEqual(graph);
    expect(graph).toEqual(before);
  });

  it("isolates copied DTOs and binary attachments between copies and pastes", () => {
    const data = new Uint8Array([0, 255, 32]);
    const graph = fixture();
    VirtualClipboard.copy({ graph, attachments: { asset: { data: data.buffer, type: "image/png" } } });
    data[0] = 42;
    graph.order.reverse();
    const first = VirtualClipboard.paste()!;
    expect(new Uint8Array(first.attachments.asset.data)).toEqual(new Uint8Array([0, 255, 32]));
    new Uint8Array(first.attachments.asset.data)[1] = 42;
    first.graph.objects.length = 0;
    expect(VirtualClipboard.paste()!.graph).toEqual(fixture());
    expect(new Uint8Array(VirtualClipboard.paste()!.attachments.asset.data)).toEqual(new Uint8Array([0, 255, 32]));
  });

  it("remaps every object reference once, including self-loops, shared attachments, sections and cyclic syncs", () => {
    const source = fixture();
    const seen: string[] = [];
    const graph = remapClipboardGraph(
      source,
      (id) => {
        seen.push(id);
        return `copy-${id}`;
      },
      new Map([["asset", "copied-asset"]]),
    );
    expect(seen).toEqual(source.order);
    expect(graph.order).toEqual(source.order.map((id) => `copy-${id}`));
    expect(graph.objects.find(({ id }) => id === "copy-line")).toMatchObject({
      sourceId: "copy-text",
      targetId: "copy-text",
    });
    expect(graph.objects.find(({ id }) => id === "copy-outer")).toMatchObject({
      childIds: ["copy-text", "copy-inner", "copy-reference"],
    });
    expect(graph.objects.find(({ id }) => id === "copy-sync-a")).toMatchObject({
      memberIds: ["copy-sync-b", "copy-line"],
    });
    expect(graph.objects.find(({ id }) => id === "copy-multi")).toMatchObject({
      memberIds: ["copy-text", "copy-point"],
    });
    expect(
      graph.objects
        .filter((object) => "attachmentId" in object)
        .every((object) => object.attachmentId === "copied-asset"),
    ).toBe(true);
    expect(graph.objects.find(({ id }) => id === "copy-extension")).toMatchObject({
      customData: { _: "Content", $: "not-a-reference" },
    });
    expect(source).toEqual(fixture());
  });
});
