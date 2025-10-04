import { Project, service } from "@/core/Project";
import { Entity } from "@/core/sprites/abstract/Entity";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";

/**
 * 所有和旋转相关的操作
 */
@service("stageNodeRotate")
export class StageNodeRotate {
  constructor(private readonly project: Project) {}

  /**
   * 通过拖拽边的方式来旋转节点
   * 会查找所有选中的边，但只能旋转一个边
   * @param lastMoveLocation
   * @param diffLocation
   */
  moveEdges(lastMoveLocation: Vector, diffLocation: Vector) {
    for (const edge of this.project.stageManager.getLineEdges()) {
      if (edge.isSelected) {
        const startMouseDragLocation = lastMoveLocation.clone();
        const endMouseDragLocation = startMouseDragLocation.add(diffLocation);
        const vectorStart = startMouseDragLocation.subtract(edge.source.geometryCenter);
        const vectorEnd = endMouseDragLocation.subtract(edge.source.geometryCenter);
        let degrees = vectorStart.angleToSigned(vectorEnd);
        // degrees一直是正数
        if (Number.isNaN(degrees)) {
          degrees = 0;
        }
        const sourceEntity = this.project.stageManager.getConnectableEntityByUUID(edge.source.uuid);
        const targetEntity = this.project.stageManager.getConnectableEntityByUUID(edge.target.uuid);

        if (sourceEntity && targetEntity) {
          this.rotateNodeDfs(
            this.project.stageManager.getConnectableEntityByUUID(edge.source.uuid)!,
            this.project.stageManager.getConnectableEntityByUUID(edge.target.uuid)!,
            degrees,
            [edge.source.uuid],
          );
        } else {
          console.error("source or target entity not found");
        }
        break; // 只旋转一个边
      }
    }
  }

  /**
   *
   * @param rotateCenterNode 递归开始的节点
   * @param currentNode 当前递归遍历到的节点
   * @param degrees 旋转角度
   * @param visitedUUIDs 已经访问过的节点的uuid列表，用于避免死循环
   */
  rotateNodeDfs(rotateCenterNode: Entity, currentNode: Entity, degrees: number, visitedUUIDs: string[]): void {
    const rotateCenterLocation = rotateCenterNode.geometryCenter;
    // 先旋转自己

    const centerToChildVector = currentNode.geometryCenter.subtract(rotateCenterLocation);

    const centerToChildVectorRotated = centerToChildVector.rotateDegrees(degrees);

    this.project.entityMoveManager.moveEntityUtils(
      currentNode,
      centerToChildVectorRotated.subtract(centerToChildVector),
    );
    // 再旋转子节点
    for (const child of this.project.graphMethods.nodeChildrenArray(currentNode)) {
      if (visitedUUIDs.includes(child.uuid)) {
        continue;
      }
      visitedUUIDs.push(child.uuid);
      const childNode = this.project.stageManager.getConnectableEntityByUUID(child.uuid);
      if (!childNode) {
        console.error("child node not found");
        continue;
      }
      const midPoint = Vector.fromTwoPointsCenter(currentNode.geometryCenter, childNode.geometryCenter);

      this.project.effects.addEffect(
        new LineEffect(
          new ProgressNumber(0, 20),
          currentNode.geometryCenter,
          midPoint,
          new Color(255, 255, 255, 0),
          new Color(255, 255, 255, 0.5),
          Math.abs(degrees),
        ),
      );
      this.project.effects.addEffect(
        new LineEffect(
          new ProgressNumber(0, 20),
          midPoint,
          childNode.geometryCenter,
          new Color(255, 255, 255, 0.5),
          new Color(255, 255, 255, 0),
          Math.abs(degrees),
        ),
      );

      this.rotateNodeDfs(
        rotateCenterNode,
        // 2024年10月6日：发现打开文件后，旋转节点无法带动子树，只能传递一层。
        // child,
        childNode,
        degrees,
        // visitedUUIDs.concat(currentNode.uuid),
        visitedUUIDs,
      );
    }
  }
}
