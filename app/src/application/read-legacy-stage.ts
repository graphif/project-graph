import type { Project } from "@/core/project";
import type { StageObject } from "@/core/stage/stage-object/abstract/stage-object";
import { TextNode } from "@/core/stage/stage-object/entity/text-node";
import { Section } from "@/core/stage/stage-object/entity/section";
import { ImageNode } from "@/core/stage/stage-object/entity/image-node";
import { MediaNode } from "@/core/stage/stage-object/entity/media-node";
import { SvgNode } from "@/core/stage/stage-object/entity/svg-node";
import { ReferenceBlockNode } from "@/core/stage/stage-object/entity/reference-block-node";
import { LatexNode } from "@/core/stage/stage-object/entity/latex-node";
import { readLegacyTextGraph } from "@/core/persistence/legacy-text-graph";
import { createStageTextGraphCodec } from "./create-text-graph-codec";

export function readLegacyStage(
  input: unknown[],
  project: Project,
  { initializeGeometry = true }: { initializeGeometry?: boolean } = {},
): StageObject[] {
  return decodeStageGraph(readLegacyTextGraph(input), project, { initializeGeometry });
}

export function decodeStageGraph(
  input: unknown,
  project: Project,
  { initializeGeometry = true }: { initializeGeometry?: boolean } = {},
): StageObject[] {
  const stage = createStageTextGraphCodec().decode(input, project);
  if (initializeGeometry) initializeStageGraph(stage);
  return stage;
}

export function initializeStageGraph(stage: readonly StageObject[]): void {
  // Geometry runs only after all IDs and endpoints exist, before replacing the active stage.
  for (const model of stage) {
    if (model instanceof TextNode) model.initializeGeometry();
    if (model instanceof Section) model.initializeCollapsedGeometry();
  }
  for (const model of stage) {
    if (
      model instanceof ImageNode ||
      model instanceof MediaNode ||
      model instanceof SvgNode ||
      model instanceof ReferenceBlockNode ||
      model instanceof LatexNode
    ) {
      model.initializeResources();
    }
  }
}
