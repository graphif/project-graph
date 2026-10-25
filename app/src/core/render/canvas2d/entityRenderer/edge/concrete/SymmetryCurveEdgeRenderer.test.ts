import { describe, expect, it, vi } from "vitest";
import { Color, Vector } from "@graphif/data-structures";
import { SymmetryCurve } from "@graphif/shapes";
import type { Project } from "@/core/Project";
import type { LineEdge } from "@/core/stage/stageObject/association/LineEdge";

vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));
vi.mock("@/core/service/Settings", () => ({ Settings: { enableCollisionBoxAutoWidth: true } }));
vi.mock("@/core/service/feedbackService/effectEngine/concrete/CircleFlameEffect", () => ({
  CircleFlameEffect: class {},
}));
vi.mock("@/core/service/feedbackService/effectEngine/concrete/LineCuttingEffect", () => ({
  LineCuttingEffect: class {},
}));
vi.mock("@/core/render/canvas2d/entityRenderer/edge/EdgeRendererClass", () => ({ EdgeRendererClass: class {} }));
vi.mock("@/core/render/svg/SvgUtils", () => ({ SvgUtils: {} }));
vi.mock("@/core/stage/stageObject/association/Edge", () => ({ Edge: class {} }));
vi.mock("@/core/stage/stageObject/entity/ConnectPoint", () => ({ ConnectPoint: class {} }));
vi.mock("@/core/stage/stageObject/entity/Section", () => ({ Section: class {} }));
vi.mock("@/core/stage/stageObject/entity/ImageNode", () => ({ ImageNode: class {} }));
vi.mock("@/core/stage/stageObject/entity/TextNode", () => ({ TextNode: class {} }));

import { SymmetryCurveEdgeRenderer } from "./SymmetryCurveEdgeRenderer";

describe("curve hover highlight", () => {
  it.each(
    ["default", "hollow-triangle", "filled-triangle", "hollow-diamond", "filled-diamond"].flatMap((arrowType) =>
      [false, true].map((warning) => ({ arrowType, warning })),
    ),
  )("uses rendered geometry for $arrowType arrows (cutting: $warning)", ({ arrowType, warning }) => {
    const draw = vi.fn();
    const edge = { uuid: "edge", arrowType, lineType: "solid", isSelected: true } as LineEdge;
    const project = {
      camera: { currentScale: 2, isDefaultZoom: () => false },
      mouseInteraction: { hoverEdges: warning ? [] : [{ uuid: "edge" }] },
      controller: { cutting: { warningAssociations: warning ? [edge] : [] } },
      stageStyleManager: {
        currentStyle: {
          CollideBoxSelected: Color.White,
          CollideBoxPreSelected: Color.Red,
          effects: { warningShadow: Color.Red },
        },
      },
      worldRenderUtils: { renderSymmetryCurve: draw },
      edgeRenderer: { renderArrowByType: vi.fn() },
    } as unknown as Project;
    const renderer = new SymmetryCurveEdgeRenderer(project) as unknown as {
      renderArrowCurve: (curve: SymmetryCurve, color: Color, width: number, edge: LineEdge) => void;
    };
    renderer.renderArrowCurve(
      new SymmetryCurve(new Vector(0, 0), new Vector(1, 0), new Vector(100, 30), new Vector(-1, 0), 50),
      Color.White,
      2,
      edge,
    );
    expect(draw).toHaveBeenCalledTimes(2);
    expect(draw.mock.calls[0][0]).toBe(draw.mock.calls[1][0]);
    expect(draw.mock.calls[0][1]).toEqual(Color.Red.toNewAlpha(0.35));
    expect(draw.mock.calls[1][1]).toBe(Color.White);
    expect(draw.mock.calls[0][2]).toBe(8);
    expect(draw.mock.calls[1][2]).toBe(4);
  });
});
