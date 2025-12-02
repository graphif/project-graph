import { Project, service } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";

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

  private isGravityLayoutStart: boolean = false;

  tick() {
    // 引力式布局
    // if (this.project.controller.pressingKeySet.size === 1 && this.project.controller.pressingKeySet.has("g")) {
    //   this.gravityLayoutTick();
    // }

    if (this.isGravityLayoutStart) {
      this.gravityLayoutTick();
    }
  }

  public setGravityLayoutStart() {
    this.isGravityLayoutStart = true;
  }

  public setGravityLayoutEnd() {
    this.isGravityLayoutStart = false;
  }

  /**
   * DAG布局算法输入数据结构
   */
  private getDAGLayoutInput(entities: ConnectableEntity[]): {
    nodes: Array<{ id: string; rectangle: Rectangle }>;
    edges: Array<{ from: string; to: string }>;
  } {
    // 构建节点映射，使用UUID作为唯一标识
    const nodeMap = new Map<string, ConnectableEntity>();
    const nodes = entities.map((entity) => {
      nodeMap.set(entity.uuid, entity);
      return {
        id: entity.uuid,
        rectangle: entity.collisionBox.getRectangle(),
      };
    });

    // 构建边关系
    const edges: Array<{ from: string; to: string }> = [];
    for (const entity of entities) {
      const children = this.project.graphMethods.nodeChildrenArray(entity);
      for (const child of children) {
        // 只包含选中实体之间的连接
        if (nodeMap.has(child.uuid)) {
          edges.push({
            from: entity.uuid,
            to: child.uuid,
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * DAG布局算法接口
   * @param input 包含节点和边的DAG结构
   * @returns 每个节点的新位置 { [nodeId: string]: Vector }
   */
  private computeDAGLayout(input: {
    nodes: Array<{ id: string; rectangle: Rectangle }>;
    edges: Array<{ from: string; to: string }>;
  }): { [nodeId: string]: Vector } {
    const { nodes, edges } = input;
    console.log("DAG布局输入:", { nodes, edges });
    // 目前返回空对象，后续由算法实现填充
    return {};
  }

  /**
   * DAG布局主函数
   * @param entities 选中的实体列表
   */
  public autoLayoutDAG(entities: ConnectableEntity[]) {
    try {
      // 1. 准备算法输入数据
      const input = this.getDAGLayoutInput(entities);

      // 2. 调用DAG布局算法计算新位置
      const newPositions = this.computeDAGLayout(input);

      // 3. 应用计算结果到实际节点
      const nodeMap = new Map<string, ConnectableEntity>();
      entities.forEach((entity) => nodeMap.set(entity.uuid, entity));

      // 4. 移动节点到新位置
      for (const [nodeId, position] of Object.entries(newPositions)) {
        const entity = nodeMap.get(nodeId);
        if (entity) {
          entity.moveTo(position);
        }
      }

      // 5. 记录操作步骤，支持撤销
      this.project.historyManager.recordStep();

      // 6. 显示成功提示
      toast.success("DAG布局已应用");
    } catch (error) {
      // 7. 错误处理
      console.error("DAG布局失败:", error);
      toast.error("DAG布局失败，请检查控制台日志");
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
