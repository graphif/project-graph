// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { transformWithOxc } from "vite";

// Only replace the native host boundary; keep the actual workspace import graph.
vi.mock("mygo-runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("mygo-runtime")>()),
  isMyGo: () => true,
  runtime: () => ({ platform: "win32" }),
  call: async (method: string) => {
    if (method === "Stores.Read") return {};
    if (method === "Stores.Set" || method === "Stores.SetMany") return;
    throw new Error(`Unexpected native call during module initialization: ${method}`);
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("workspace module initialization", () => {
  it("does not register application models with the reflection serializer", async () => {
    const root = path.resolve("app/src");
    const files = (await readdir(root, { recursive: true })).filter((file) => /\.tsx?$/.test(file));
    for (const file of files) {
      const source = await readFile(path.join(root, file), "utf8");
      expect(source, file).not.toMatch(/from\s+["']@graphif\/serializer["']/);
      expect(source, file).not.toMatch(/^\s*@(?:serializable|passObject|passExtraAtArg1|id)\b/m);
    }
  });

  it.each([
    "stage/stage-manager/basic-methods/graph-methods.ts",
    "render/canvas2d/renderer.ts",
    "stage/stage-object/association/edge.ts",
    "stage/stage-object/association/line-edge.ts",
    "stage/stage-object/entity/text-node.ts",
  ])("does not emit eager type metadata in %s", async (source) => {
    const filename = path.resolve("app/src/core", source);
    const { code } = await transformWithOxc(await readFile(filename, "utf8"), filename);
    expect(code.includes("design:paramtypes")).toBe(false);
    expect(code.includes("design:type")).toBe(false);
  });

  it("loads the workspace graph without mocking models or services", async () => {
    vi.stubGlobal("AudioContext", class {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { Project } = await import("@/core/project");
    const { loadAllServicesBeforeInit } = await import("@/core/load-all-services");
    expect(Project).toBeTypeOf("function");
    expect(loadAllServicesBeforeInit).toBeTypeOf("function");
    const { GraphMethods } = await import("@/core/stage/stage-manager/basic-methods/graph-methods");
    expect((GraphMethods as typeof GraphMethods & { id: string }).id).toBe("graphMethods");

    const { Vector } = await import("@graphif/data-structures");
    const { decodeExtensionValue } = await import("@/core/persistence/extension-value");
    const { CollisionBox } = await import("@/core/stage/stage-object/collision-box/collision-box");
    const { Rectangle } = await import("@graphif/shapes");
    const restored = decodeExtensionValue(
      {
        _: "CollisionBox",
        shapes: [
          {
            _: "Rectangle",
            location: { _: "Vector", x: 1, y: 2 },
            size: { _: "Vector", x: 30, y: 40 },
          },
        ],
      },
      () => {
        throw new Error("Unexpected graph object");
      },
    ) as InstanceType<typeof CollisionBox>;
    expect(restored).toBeInstanceOf(CollisionBox);
    expect(restored.shapes[0]).toBeInstanceOf(Rectangle);
    expect(restored.getRectangle().location).toEqual(new Vector(1, 2));
    expect(restored.getRectangle().size).toEqual(new Vector(30, 40));
  }, 30_000);

  it("round-trips every real stage model through JSON PRG without registering class names", async () => {
    vi.stubGlobal("AudioContext", class {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { Project } = await import("@/core/project");
    const { createStageTextGraphCodec } = await import("./create-text-graph-codec");
    const { decodeStageGraph } = await import("./read-legacy-stage");
    const { parseTextGraph, graphObjectSchemas } = await import("@/core/persistence/text-graph");
    const { parseProjectFile } = await import("@/core/project-file");
    const { LineEdge } = await import("@/core/stage/stage-object/association/line-edge");
    const { Section } = await import("@/core/stage/stage-object/entity/section");
    const { SyncAssociation } = await import("@/core/stage/stage-object/association/sync-association");
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
        customData: { _: "Content", $: "literal", value: 1.23456789 },
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
    const graph = parseTextGraph({ objects, order: objects.map(({ id }) => id) });
    expect(new Set(graph.objects.map(({ kind }) => kind)).size).toBe(Object.keys(graphObjectSchemas).length);
    const original = Project.newDraft();
    const reopened = Project.newDraft();
    try {
      original.attachments.set("asset", new Blob([new Uint8Array([0, 255, 32])], { type: "image/png" }));
      original.stage = decodeStageGraph(graph, original, { initializeGeometry: false });
      original.tags = ["tag"];
      original.readme = "notes";
      original.references = { sections: { inner: ["outer"] }, files: ["other.prg"] };
      const codec = createStageTextGraphCodec();
      expect(codec.encode(original.stage)).toEqual(graph);
      const parsed = await parseProjectFile(
        await original.getFileContent({ includeThumbnail: false }),
        reopened.attachments,
      );
      if (parsed.format !== "json") throw new Error("Expected JSON PRG");
      expect(parsed).toMatchObject({ graph, tags: original.tags, references: original.references, readme: "notes" });
      reopened.stage = decodeStageGraph(parsed.graph, reopened, { initializeGeometry: false });
      expect(codec.encode(reopened.stage)).toEqual(graph);
      const byId = new Map(reopened.stage.map((model) => [model.uuid, model]));
      expect(byId.get("line")).toBeInstanceOf(LineEdge);
      expect(byId.get("outer")).toBeInstanceOf(Section);
      expect(byId.get("sync-a")).toBeInstanceOf(SyncAssociation);
      expect((byId.get("line") as InstanceType<typeof LineEdge>).source).toBe(byId.get("text"));
      expect((byId.get("line") as InstanceType<typeof LineEdge>).target).toBe(byId.get("text"));
      expect((byId.get("outer") as InstanceType<typeof Section>).children).toEqual([
        byId.get("text"),
        byId.get("inner"),
        byId.get("reference"),
      ]);
      expect((byId.get("sync-a") as InstanceType<typeof SyncAssociation>).associationList).toEqual([
        byId.get("sync-b"),
        byId.get("line"),
      ]);
      expect(new Uint8Array(await reopened.attachments.get("asset")!.arrayBuffer())).toEqual(
        new Uint8Array([0, 255, 32]),
      );
    } finally {
      await original.dispose();
      await reopened.dispose();
    }
  }, 30_000);

  it("converts historical JSON into plain DTOs with sections, shared endpoints, strokes and tags", async () => {
    vi.stubGlobal("AudioContext", class {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { ProjectUpgrader } = await import("@/core/stage/project-upgrader");
    const { readLegacyTextGraph } = await import("@/core/persistence/legacy-text-graph");
    const { URI } = await import("vscode-uri");
    const upgraded = await ProjectUpgrader.convertVAnyToN1(
      {
        version: 17,
        entities: [
          {
            type: "core:section",
            uuid: "group",
            text: "Group",
            details: "",
            location: [0, 0],
            size: [200, 100],
            children: ["text"],
          },
          {
            type: "core:text_node",
            uuid: "text",
            text: "Text",
            details: "",
            location: [1.23456789, 2],
            size: [100, 50],
          },
          { type: "core:pen_stroke", uuid: "stroke", content: "1.23456789,2,2.5~3,4,5", color: [1, 2, 3, 1] },
        ],
        associations: [{ type: "core:line_edge", uuid: "line", source: "text", target: "text", text: "Loop" }],
        tags: ["historical"],
      },
      URI.file("C:/fixtures/old.json"),
    );
    const graph = readLegacyTextGraph(upgraded.data);
    expect(graph.objects.find(({ id }) => id === "group")).toMatchObject({ childIds: ["text"], isCollapsed: false });
    expect(graph.objects.find(({ id }) => id === "text")).toMatchObject({
      rectangle: { location: { x: 1.23456789, y: 2 } },
      sizeAdjust: "auto",
    });
    expect(graph.objects.find(({ id }) => id === "line")).toMatchObject({ sourceId: "text", targetId: "text" });
    expect(graph.objects.find(({ id }) => id === "stroke")).toMatchObject({
      segments: [
        { location: { x: 1.23456789, y: 2 }, pressure: 0.5 },
        { location: { x: 3, y: 4 }, pressure: 1 },
      ],
    });
    expect(upgraded.tags).toEqual(["historical"]);
  }, 30_000);
});
