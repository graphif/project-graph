// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/service/Settings", () => ({
  Settings: {
    aiApiBaseUrl: "",
    aiApiKey: "",
    aiModel: "",
    isEnableEntityCollision: false,
    isEnableSectionCollision: false,
    maxPastedImageSize: 0,
  },
}));
vi.mock("@/core/stage/stageObject/association/Edge", () => ({ Edge: class Edge {} }));
vi.mock("@/core/stage/stageObject/entity/ImageNode", () => ({ ImageNode: class ImageNode {} }));
vi.mock("@/core/stage/stageObject/entity/Section", () => ({ Section: class Section {} }));
vi.mock("@/core/stage/stageObject/entity/TextNode", () => ({ TextNode: class TextNode {} }));
vi.mock("@/core/stage/stageObject/tools/entityDetailsManager", () => ({
  DetailsManager: { markdownToDetails: () => [] },
}));
vi.mock("@/core/service/dataManageService/imageUtils", () => ({
  blobToCompressedDataUrl: async () => "",
  prepareImageBlobForImport: async () => ({ blob: new Blob(), width: 1, height: 1 }),
}));
vi.mock("@/core/service/dataManageService/imageNodeFactory", () => ({
  calculateImageDisplaySize: () => ({ width: 1, height: 1, scale: 1 }),
  createImageNodeFromBlob: async () => ({ node: {}, width: 1, height: 1 }),
}));
vi.mock("./imageNodeFinder", () => ({ findFirstImageInChildren: () => undefined }));
vi.mock("./OpenverseImageSearch", () => ({ findDownloadableOpenverseImage: async () => undefined }));

import { createBuiltInToolAgentTools } from "./BuiltInToolAgentAdapter";
import { getBuiltInToolWindowEntries } from "./BuiltInToolWindowAdapter";
import { AIObjectReferenceRegistry } from "./AIObjectReferenceRegistry";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

function getTool(name: string) {
  const tool = getBuiltInToolWindowEntries().find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Missing tool: ${name}`);
  return tool;
}

function getFields(value: unknown): string[] {
  return Object.keys((value as { shape: Record<string, unknown> }).shape);
}

function createNode(uuid: string): ConnectableEntity {
  return Object.assign(Object.create(ConnectableEntity.prototype), {
    uuid,
    parentSection: null,
    collisionBox: new CollisionBox([new Rectangle(new Vector(0, 0), new Vector(100, 50))]),
    moveTo: vi.fn(),
  }) as ConnectableEntity;
}

function createDeletionProject(initialEntities: ConnectableEntity[], initialAssociations: object[] = []) {
  let entities = [...initialEntities];
  let associations = [...initialAssociations];
  const deleteEntities = vi.fn((targets: ConnectableEntity[]) => {
    const targetSet = new Set(targets);
    entities = entities.filter((entity) => !targetSet.has(entity));
    associations = associations.filter(
      (association) =>
        !(association as { associationList?: ConnectableEntity[] }).associationList?.some((entity) =>
          targetSet.has(entity),
        ),
    );
  });
  const stageManager = {
    get: (uuid: string) => [...entities, ...associations].find((object) => (object as { uuid?: string }).uuid === uuid),
    getEntities: () => entities,
    getAssociations: () => associations,
    getSelectedEntities: () => entities.filter((entity) => entity.isSelected),
    deleteEntities,
  };
  return {
    project: { stageManager },
    deleteEntities,
    getEntities: () => entities,
    getAssociations: () => associations,
    removeEntityFromStage: (entity: ConnectableEntity) => {
      entities = entities.filter((candidate) => candidate !== entity);
    },
  };
}

describe("AI layout tool schemas", () => {
  it("exposes DAG layout without exposing placement", () => {
    const tool = getTool("auto_layout_dag");

    expect(tool.parameters.safeParse({ refs: ["n1", "n2"] }).success).toBe(true);
    expect(getFields(tool.parameters)).toEqual(["refs"]);
    expect(getBuiltInToolWindowEntries().some((candidate) => candidate.name.includes("placement"))).toBe(false);
  });

  it("does not expose coordinates on text or image creation and editing tools", () => {
    const createText = getTool("create_text_node");
    const editText = getTool("edit_text_node");
    const editImage = getTool("edit_image_node");
    const searchImage = getTool("search_and_add_image_node");

    expect(createText.parameters.safeParse({ text: "node" }).success).toBe(true);
    expect(getFields(createText.parameters)).not.toEqual(expect.arrayContaining(["x", "y", "placement"]));
    expect(getFields((editText.parameters.shape as { data: unknown }).data)).not.toEqual(
      expect.arrayContaining(["x", "y", "placement"]),
    );
    expect(getFields((editImage.parameters.shape as { data: unknown }).data)).not.toEqual(
      expect.arrayContaining(["x", "y", "placement"]),
    );
    expect(getFields(searchImage.parameters)).not.toEqual(expect.arrayContaining(["x", "y", "placement"]));
  });

  it("rejects unconnected nodes before invoking the DAG layout service", async () => {
    const first = createNode("first");
    const second = createNode("second");
    const objects = new Map([
      [first.uuid, first],
      [second.uuid, second],
    ]);
    const autoLayoutDAG = vi.fn();
    const project = {
      stageManager: {
        get: (uuid: string) => objects.get(uuid),
        getEdges: () => [],
      },
      graphMethods: { isDAGByNodes: vi.fn() },
      autoLayout: { autoLayoutDAG },
    };
    const references = new AIObjectReferenceRegistry(project as never);
    const tools = createBuiltInToolAgentTools(project as never, references) as unknown as Record<
      string,
      { execute: (data: unknown) => Promise<string> }
    >;

    const result = await tools.auto_layout_dag.execute({
      refs: [references.getOrCreateRef(first), references.getOrCreateRef(second)],
    });

    expect(result).toContain("no_internal_edges");
    expect(autoLayoutDAG).not.toHaveBeenCalled();
  });

  it("passes a valid DAG selection to the shared layout service", async () => {
    const first = createNode("first");
    const second = createNode("second");
    const edge = Object.assign(Object.create(Edge.prototype), { source: first, target: second }) as Edge;
    const objects = new Map([
      [first.uuid, first],
      [second.uuid, second],
    ]);
    const autoLayoutDAG = vi.fn(() => ({ movedCount: 2, internalEdgeCount: 1 }));
    const project = {
      stageManager: {
        get: (uuid: string) => objects.get(uuid),
        getEdges: () => [edge],
      },
      graphMethods: { isDAGByNodes: () => true },
      autoLayout: { autoLayoutDAG },
    };
    const references = new AIObjectReferenceRegistry(project as never);
    const tools = createBuiltInToolAgentTools(project as never, references) as unknown as Record<
      string,
      { execute: (data: unknown) => Promise<string> }
    >;

    const result = await tools.auto_layout_dag.execute({
      refs: [references.getOrCreateRef(first), references.getOrCreateRef(second)],
    });

    expect(autoLayoutDAG).toHaveBeenCalledWith([first, second]);
    expect(result).toContain("movedCount");
  });
});

describe("AI node deletion tools", () => {
  it("only accepts node references", () => {
    const deleteNode = getTool("delete_node");
    const deleteNodes = getTool("delete_nodes");

    expect(deleteNode.parameters.safeParse({ ref: "n1" }).success).toBe(true);
    expect(deleteNode.parameters.safeParse({ ref: "e1" }).success).toBe(false);
    expect(deleteNodes.parameters.safeParse({ refs: ["n1", "n2"] }).success).toBe(true);
    expect(deleteNodes.parameters.safeParse({ refs: ["n1", "e1"] }).success).toBe(false);
  });

  it("uses the shared deletion pipeline so connected associations are removed", async () => {
    const deleted = createNode("deleted");
    const remaining = createNode("remaining");
    const association = { uuid: "edge", associationList: [deleted, remaining] };
    const fixture = createDeletionProject([deleted, remaining], [association]);
    const references = new AIObjectReferenceRegistry(fixture.project as never);
    const tools = createBuiltInToolAgentTools(fixture.project as never, references) as unknown as Record<
      string,
      { execute: (data: unknown) => Promise<string> }
    >;

    const result = await tools.delete_node.execute({ ref: references.getOrCreateRef(deleted) });

    expect(fixture.deleteEntities).toHaveBeenCalledOnce();
    expect(fixture.deleteEntities).toHaveBeenCalledWith([deleted]);
    expect(fixture.getEntities()).toEqual([remaining]);
    expect(fixture.getAssociations()).toEqual([]);
    expect(result).toContain("deletedNodeCount: 1");
    expect(result).toContain("deletedAssociationCount: 1");
  });

  it("resolves an entire batch before deleting anything", async () => {
    const first = createNode("first");
    const stale = createNode("stale");
    const fixture = createDeletionProject([first, stale]);
    const references = new AIObjectReferenceRegistry(fixture.project as never);
    const firstRef = references.getOrCreateRef(first);
    const staleRef = references.getOrCreateRef(stale);
    fixture.removeEntityFromStage(stale);
    const tools = createBuiltInToolAgentTools(fixture.project as never, references) as unknown as Record<
      string,
      { execute: (data: unknown) => Promise<string> }
    >;

    const result = await tools.delete_nodes.execute({ refs: [firstRef, staleRef] });

    expect(result).toContain("stale_ref");
    expect(fixture.deleteEntities).not.toHaveBeenCalled();
    expect(fixture.getEntities()).toEqual([first]);
  });

  it("deduplicates a batch and records it through one deletion transaction", async () => {
    const first = createNode("first");
    const second = createNode("second");
    const fixture = createDeletionProject([first, second]);
    const references = new AIObjectReferenceRegistry(fixture.project as never);
    const firstRef = references.getOrCreateRef(first);
    const secondRef = references.getOrCreateRef(second);
    const tools = createBuiltInToolAgentTools(fixture.project as never, references) as unknown as Record<
      string,
      { execute: (data: unknown) => Promise<string> }
    >;

    const result = await tools.delete_nodes.execute({ refs: [firstRef, secondRef, firstRef] });

    expect(fixture.deleteEntities).toHaveBeenCalledOnce();
    expect(fixture.deleteEntities).toHaveBeenCalledWith([first, second]);
    expect(result).toContain("deletedNodeCount: 2");
  });

  it("deletes all selected nodes through one shared transaction", async () => {
    const selected = createNode("selected");
    const remaining = createNode("remaining");
    selected.isSelected = true;
    remaining.isSelected = false;
    const fixture = createDeletionProject([selected, remaining]);
    const references = new AIObjectReferenceRegistry(fixture.project as never);
    const tools = createBuiltInToolAgentTools(fixture.project as never, references) as unknown as Record<
      string,
      { execute: (data: unknown) => Promise<string> }
    >;

    const result = await tools.delete_selected_nodes.execute({});

    expect(fixture.deleteEntities).toHaveBeenCalledOnce();
    expect(fixture.deleteEntities).toHaveBeenCalledWith([selected]);
    expect(fixture.getEntities()).toEqual([remaining]);
    expect(result).toContain("deletedNodeCount: 1");
  });
});
