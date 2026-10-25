import type { Project } from "@/core/Project";
import { Association } from "@/core/stage/stageObject/abstract/Association";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { LatexNode } from "@/core/stage/stageObject/entity/LatexNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { extractLatexSource } from "@/utils/latex";
import katex from "katex";
import { toast } from "sonner";

export function convertLatexNodes(
  project: Project,
  candidates = project.stage.filter((object): object is TextNode => object instanceof TextNode),
): number {
  const replacements = new Map<TextNode, LatexNode>();
  const candidatesSet = new Set(candidates);
  for (let index = 0; index < project.stage.length; index++) {
    const node = project.stage[index];
    if (!(node instanceof TextNode) || !candidatesSet.has(node)) continue;
    const latexSource = extractLatexSource(node.text);
    if (!latexSource) continue;
    try {
      katex.renderToString(latexSource, { throwOnError: true, displayMode: true });
    } catch (error) {
      toast.error(`LaTeX 公式解析失败：${String(error)}`);
      continue;
    }
    const replacement = new LatexNode(project, {
      uuid: node.uuid,
      details: node.details,
      latexSource,
      fontScaleLevel: node.fontScaleLevel,
      collisionBox: new CollisionBox([node.collisionBox.getRectangle().clone()]),
    });
    replacement.isSelected = node.isSelected;
    project.stage[index] = replacement;
    replacements.set(node, replacement);
  }
  if (replacements.size === 0) return 0;
  for (const object of project.stage) {
    if (object instanceof Association) {
      object.associationList = object.associationList.map((entity) =>
        entity instanceof TextNode ? (replacements.get(entity) ?? entity) : entity,
      );
    }
    if (object instanceof Section) {
      object.children = object.children.map((entity) =>
        entity instanceof TextNode ? (replacements.get(entity) ?? entity) : entity,
      );
    }
  }
  return replacements.size;
}
