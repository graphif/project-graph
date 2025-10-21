import { Project, service } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";

/**
 * 计算一个节点的半径，半径是一个矩形中心到对角线的距离
 * @param entity
 */
function getEntityRadius(entity: ConnectableEntity): number {
  const rect = entity.collisionBox.getRectangle();
  const width = rect.size.x;
  const height = rect.size.y;
  const diagonalLength = Math.sqrt(width ** 2 + height ** 2);
  return diagonalLength / 2;
}
/**
 * 一种距离到力的映射函数
 * @param distance
 */
function distanceToForce(distance: number): number {
  return 1 / (distance ** 2 + 1);
}

@service("autoLayout")
export class AutoLayout {
  constructor(private readonly project: Project) {}

  tick() {
    // 引力式布局
    if (this.project.controller.pressingKeySet.size === 1 && this.project.controller.pressingKeySet.has("g")) {
      this.gravityLayoutTick();
    }
  }

  /**
   * 引力式布局
   */
  gravityLayoutTick() {
    // 获取所有选中的节点
    const selectedConnectableEntities = this.project.stageManager
      .getSelectedEntities()
      .filter((entity) => entity instanceof ConnectableEntity);
    // 遍历所有选中的节点，将他们的直接孩子节点拉向自己
    selectedConnectableEntities.forEach((entity) => {
      // 计算父向子的关系
      const children = this.project.graphMethods.nodeChildrenArray(entity);
      children.forEach((child) => {
        // 计算子节点到父节点的向量
        const fatherToChildVector = child.collisionBox
          .getRectangle()
          .center.subtract(entity.collisionBox.getRectangle().center);
        // 计算父亲半径和孩子半径
        const fatherRadius = getEntityRadius(entity);
        const childRadius = getEntityRadius(child);
        const currentDistance = fatherToChildVector.magnitude();
        if (currentDistance > (fatherRadius + childRadius) * 2) {
          // 向内拉
          child.move(fatherToChildVector.normalize().multiply(-1));
        } else {
          // 向外排斥
          child.move(fatherToChildVector.normalize());
        }
      });
      // 二重遍历
      selectedConnectableEntities.forEach((entity2) => {
        if (entity === entity2) {
          return;
        }
        // 计算两个节点的距离
        const vector = entity2.collisionBox.getRectangle().center.subtract(entity.collisionBox.getRectangle().center);
        const distance = vector.magnitude();
        // 计算两个节点的半径
        const radius1 = getEntityRadius(entity);
        const radius2 = getEntityRadius(entity2);
        // 计算两个节点的最小距离
        const minDistance = (radius1 + radius2) * 2;
        if (distance < minDistance) {
          entity2.move(vector.normalize().multiply(distanceToForce(distance - minDistance)));
        } else if (distance > minDistance) {
          entity2.move(vector.normalize().multiply(-distanceToForce(distance - minDistance)));
        }
      });
    });
  }
}
