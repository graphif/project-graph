import { describe, expect, it, vi } from "vitest";
import { Vector } from "@graphif/data-structures";
import type { Project } from "@/core/project";

vi.mock("@/core/service/settings", () => ({ Settings: { doubleClickEmptySpaceAction: "createTextNode" } }));
vi.mock("@/core/stage/stage-object/entity/section", () => ({ Section: class {} }));

import { ControllerEntityCreateClass } from "./controller-entity-create";

describe("double-click creation", () => {
  it("requests immediate editing for a new text node", () => {
    const addTextNodeByLocation = vi.fn();
    const project = {
      controller: { camera: {}, pressingKeySet: new Set() },
      rectangleSelect: { shutDown: vi.fn() },
      renderer: { transformView2World: (point: Vector) => point },
      stageManager: {
        findEntityByLocation: () => null,
        isEntityOnLocation: () => false,
        isAssociationOnLocation: () => false,
      },
      sectionMethods: { getSectionsByInnerLocation: () => [] },
      controllerUtils: { addTextNodeByLocation },
    } as unknown as Project;
    new ControllerEntityCreateClass(project).mouseDoubleClick({ button: 0, clientX: 80, clientY: 60 } as MouseEvent);
    expect(addTextNodeByLocation).toHaveBeenCalledWith(new Vector(80, 60), true, true);
  });
});
