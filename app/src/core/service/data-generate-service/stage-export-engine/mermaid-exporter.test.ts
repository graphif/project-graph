import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/core/project";
import type { Entity } from "@/core/stage/stage-object/abstract/stage-entity";
import type { Value } from "platejs";

vi.mock("@/core/project", () => ({ Project: class {}, service: () => (target: unknown) => target }));
vi.mock("@/core/service/settings", () => ({ Settings: { exportMermaidIncludeNodeDetails: false } }));
vi.mock("@/core/stage/stage-object/entity/text-node", () => ({ TextNode: class {} }));
vi.mock("@/core/stage/stage-object/entity/section", () => ({ Section: class {} }));
vi.mock("@/core/stage/stage-object/association/line-edge", () => ({ LineEdge: class {} }));
vi.mock("../../data-manage-service/copy-engine/copy-engine-utils", () => ({
  CopyEngineUtils: { getAllStageObjectFromEntities: vi.fn() },
}));
vi.mock("@/core/stage/stage-object/tools/entity-details-manager", () => ({
  DetailsManager: { detailsToMarkdown: vi.fn() },
}));
vi.mock("./plain-text-exporter", () => ({ PlainTextExporter: class {} }));
vi.mock("./markdown-exporter", () => ({ MarkdownExporter: class {} }));
vi.mock("./tab-exporter", () => ({ TabExporter: class {} }));

import { Settings } from "@/core/service/settings";
import { TextNode } from "@/core/stage/stage-object/entity/text-node";
import { Section } from "@/core/stage/stage-object/entity/section";
import { LineEdge } from "@/core/stage/stage-object/association/line-edge";
import { DetailsManager } from "@/core/stage/stage-object/tools/entity-details-manager";
import { CopyEngineUtils } from "../../data-manage-service/copy-engine/copy-engine-utils";
import { MermaidExporter } from "./mermaid-exporter";
import { StageExport } from "./stage-export-engine";

const transparent = { a: 0, toHexStringWithoutAlpha: () => "#000000" };
const details: Value = [
  { type: "p", children: [{ text: "" }] },
  { type: "p", children: [{ text: "Later paragraph", bold: true }] },
];

function node(uuid: string, text: string, value: Value = [], section = false): TextNode | Section {
  return Object.assign(Object.create(section ? Section.prototype : TextNode.prototype), {
    uuid,
    text,
    details: value,
    color: transparent,
  });
}

function project(containment: Record<string, string[]> = {}): Project {
  return {
    sectionMethods: {
      isEntityInSection: (entity: Entity, section: Section) =>
        containment[section.uuid]?.includes(entity.uuid) ?? false,
    },
  } as unknown as Project;
}

describe("Mermaid node details export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Settings.exportMermaidIncludeNodeDetails = false;
    vi.mocked(DetailsManager.detailsToMarkdown).mockReturnValue("**Later paragraph**\n\n- [来源](https://example.com)");
  });

  it("leaves the original graph, labels, edges and styles unchanged when disabled", () => {
    const a = node("a", '同名 "节点"\n下一行', details);
    const b = node("b", "同名节点", details);
    a.color = { ...transparent, a: 0.5 } as TextNode["color"];
    const edge = Object.assign(Object.create(LineEdge.prototype), {
      source: a,
      target: b,
      text: "关系",
      lineType: "dashed",
      color: transparent,
    });
    vi.mocked(CopyEngineUtils.getAllStageObjectFromEntities).mockReturnValue([a, b, edge]);
    const result = new MermaidExporter(project()).export([a, b]);

    expect(result).toBe(
      'graph TD\nid0["同名 &quot;节点&quot;<br>下一行"]\nid1["同名节点"]\nid0 -. "关系" .-> id1\nstyle id0 fill:#000000,fill-opacity:0.5',
    );
    expect(DetailsManager.detailsToMarkdown).not.toHaveBeenCalled();
  });

  it("serializes the complete rich text including content after an empty first paragraph", () => {
    const a = node("a", "节点", details);
    vi.mocked(CopyEngineUtils.getAllStageObjectFromEntities).mockReturnValue([a]);
    const snapshot = structuredClone(a.details);
    const result = new MermaidExporter(project()).export([a], true);

    expect(DetailsManager.detailsToMarkdown).toHaveBeenCalledWith(a.details);
    expect(result).toBe(
      'graph TD\nid0["节点"]\n\n%% Node details: id0\n%% **Later paragraph**\n%% \n%% - [来源](https://example.com)',
    );
    expect(a.details).toEqual(snapshot);
    expect(a.text).toBe("节点");
  });

  it("uses diagram IDs for nested sections and same-title nodes, including section descendants", () => {
    const child = node("child", "同名", details);
    const outer = node("outer", "外层", details, true);
    const inner = node("inner", "内层", details, true);
    const twin = node("twin", "同名", details);
    vi.mocked(CopyEngineUtils.getAllStageObjectFromEntities).mockReturnValue([child, outer, inner, twin]);
    const p = project({ outer: ["inner", "child", "twin"], inner: ["child"] });
    const exporter = new MermaidExporter(p);
    const withoutDetails = exporter.export([outer]);
    const withDetails = exporter.export([outer], true);

    expect(withDetails.startsWith(withoutDetails + "\n\n")).toBe(true);
    expect(withDetails).toContain('subgraph id0["外层"]');
    expect(withDetails).toContain('subgraph id1["内层"]');
    expect(withDetails).toContain('id2["同名"]');
    expect(withDetails).toContain('id3["同名"]');
    expect(withDetails).toContain("%% Node details: id2");
    expect(withDetails).toContain("%% Node details: id0");
    expect(withDetails).toContain("%% Node details: id1");
    expect(withDetails).toContain("%% Node details: id3");
    expect(CopyEngineUtils.getAllStageObjectFromEntities).toHaveBeenLastCalledWith(p, [outer]);
  });

  it("skips empty details and keeps empty selections unchanged", () => {
    vi.mocked(CopyEngineUtils.getAllStageObjectFromEntities).mockReturnValue([]);
    expect(new MermaidExporter(project()).export([], true)).toBe("graph TD");
    const a = node("a", "Empty");
    const b = node("b", "Whitespace", details);
    vi.mocked(CopyEngineUtils.getAllStageObjectFromEntities).mockReturnValue([a, b]);
    vi.mocked(DetailsManager.detailsToMarkdown).mockReturnValue(" \n \u200b");
    expect(new MermaidExporter(project()).export([a, b], true)).not.toContain("%%");
    expect(DetailsManager.detailsToMarkdown).toHaveBeenCalledTimes(1);
  });

  it("keeps every detail line commented and neutralizes Mermaid directive openers", () => {
    const a = node("a", "节点", details);
    vi.mocked(CopyEngineUtils.getAllStageObjectFromEntities).mockReturnValue([a]);
    vi.mocked(DetailsManager.detailsToMarkdown).mockReturnValue(
      '100%\r\n%%{init: {"theme":"dark"}}%%\rA --> B\u2028```mermaid\u2029end',
    );
    const result = new MermaidExporter(project()).export([a], true);
    const commentLines = result.slice(result.indexOf("%% Node details:")).split("\n");

    expect(commentLines.every((line) => line.startsWith("%% "))).toBe(true);
    expect(result).toContain("%% 100%");
    expect(result).toContain('%% %\\u0025{init: {"theme":"dark"}}%%');
    expect(result).not.toContain("%%{");
    expect(result).not.toContain("\r");
  });

  it("reads the current saved preference through the existing export entry point", () => {
    const a = node("a", "节点", details);
    vi.mocked(CopyEngineUtils.getAllStageObjectFromEntities).mockReturnValue([a]);
    const stageExport = new StageExport(project());

    expect(stageExport.getMermaidTextByEntities([a])).not.toContain("%% Node details:");
    Settings.exportMermaidIncludeNodeDetails = true;
    expect(stageExport.getMermaidTextByEntities([a])).toContain("%% Node details: id0");
    Settings.exportMermaidIncludeNodeDetails = false;
    expect(stageExport.getMermaidTextByEntities([a])).not.toContain("%% Node details:");
  });
});
