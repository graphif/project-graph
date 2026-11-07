import { Project, service } from "@/core/Project";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 多源无向边移动中心点
 */
@service("multiTargetEdgeMove")
export class MultiTargetEdgeMove {
  constructor(private readonly project: Project) {}

  /**
   *
   * @param lastMoveLocation 鼠标按下的位置
   * @param diffLocation 鼠标移动向量
   */
  moveMultiTargetEdge(diffLocation: Vector) {
    for (const association of this.project.stageManager.getSelectedAssociations()) {
      if (!(association instanceof MultiTargetUndirectedEdge)) {
        continue;
      }
      if (!association.isSelected) {
        continue;
      }
      // const startMouseDragLocation = lastMoveLocation.clone();
      // const endMouseDragLocation = startMouseDragLocation.add(diffLocation);

      const boundingRectangle = Rectangle.getBoundingRectangle(
        association.associationList.map((n) => n.collisionBox.getRectangle()),
      );
      // 当前的中心点
      const currentCenter = association.centerLocation;
      // 新的中心点
      const newCenter = currentCenter.add(diffLocation);
      // 新的比例
      const newRate = new Vector(
        (newCenter.x - boundingRectangle.location.x) / boundingRectangle.width,
        (newCenter.y - boundingRectangle.location.y) / boundingRectangle.height,
      );
      association.centerRate = newRate;
    }
  }
}
