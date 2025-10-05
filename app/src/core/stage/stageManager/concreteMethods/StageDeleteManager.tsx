import { Project, service } from "@/core/Project";
import { ExplodeDashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ExplodeDashEffect";
import { Association } from "@/core/stage/stageObject/abstract/Association";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { PenStroke } from "@/core/stage/stageObject/entity/PenStroke";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { Color, ProgressNumber } from "@graphif/data-structures";

type DeleteHandler<T extends Entity> = (entity: T) => void;
type Constructor<T> = { new (...args: any[]): T };

/**
 * 包含一切删除舞台上的元素的方法
 */
@service("deleteManager")
export class DeleteManager {
  private deleteHandlers = new Map<Constructor<Entity>, DeleteHandler<Entity>>();
  // 类型注册器，保证一个类型对应一个函数，绝对类型安全，同时可扩展
  private registerHandler<T extends Entity>(constructor: Constructor<T>, handler: DeleteHandler<T>) {
    this.deleteHandlers.set(constructor, handler as DeleteHandler<Entity>);
  }

  constructor(private readonly project: Project) {
    this.registerHandler(TextNode, this.deleteTextNode.bind(this));
    this.registerHandler(Section, this.deleteSection.bind(this));
    this.registerHandler(ConnectPoint, this.deleteConnectPoint.bind(this));
    this.registerHandler(ImageNode, this.deleteImageNode.bind(this));
    this.registerHandler(UrlNode, this.deleteUrlNode.bind(this));
    this.registerHandler(PenStroke, this.deletePenStroke.bind(this));
    this.registerHandler(SvgNode, this.deleteSvgNode.bind(this));
  }

  deleteEntities(deleteNodes: Entity[]) {
    for (const entity of deleteNodes) {
      const handler = this.findDeleteHandler(entity);
      handler?.(entity);
    }
  }

  private findDeleteHandler(entity: Entity) {
    for (const [ctor, handler] of this.deleteHandlers) {
      if (entity instanceof ctor) return handler;
    }
    console.warn(`No delete handler for ${entity.constructor.name}`);
  }

  private deleteSvgNode(entity: SvgNode) {
    if (this.project.stageManager.getEntities().includes(entity)) {
      this.project.stageManager.delete(entity);
      // 删除所有相关的边
      this.deleteEntityAfterClearAssociation(entity);
    }
  }

  private deletePenStroke(penStroke: PenStroke) {
    if (this.project.stageManager.getPenStrokes().includes(penStroke)) {
      this.project.stageManager.delete(penStroke);
    }
  }

  private deleteSection(entity: Section) {
    if (!this.project.stageManager.getSections().includes(entity)) {
      console.warn("section not in sections!!!", entity.uuid);
      return;
    }

    // 先删除所有内部的东西
    if (entity.isCollapsed) {
      this.deleteEntities(entity.children);
    }

    // 再删除自己
    this.project.stageManager.delete(entity);
    this.deleteEntityAfterClearAssociation(entity);
    // 将自己所有的父级Section的children添加自己的children
    const fatherSections = this.project.sectionMethods.getFatherSections(entity);
    this.project.sectionInOutManager.goInSections(entity.children, fatherSections);
  }
  private deleteImageNode(entity: ImageNode) {
    if (this.project.stageManager.getImageNodes().includes(entity)) {
      this.project.stageManager.delete(entity);
      this.project.effects.addEffect(
        new ExplodeDashEffect(new ProgressNumber(0, 30), entity.collisionBox.getRectangle(), Color.White),
      );
      // 删除所有相关的边
      this.deleteEntityAfterClearAssociation(entity);
    }
  }
  private deleteUrlNode(entity: UrlNode) {
    if (this.project.stageManager.getUrlNodes().includes(entity)) {
      this.project.stageManager.delete(entity);
      // 删除所有相关的边
      this.deleteEntityAfterClearAssociation(entity);
    }
  }

  private deleteConnectPoint(entity: ConnectPoint) {
    // 先判断这个node是否在nodes里
    if (this.project.stageManager.getConnectPoints().includes(entity)) {
      // 从数组中去除
      this.project.stageManager.delete(entity);
      this.project.effects.addEffect(
        new ExplodeDashEffect(new ProgressNumber(0, 30), entity.collisionBox.getRectangle(), Color.White),
      );
      // 删除所有相关的边
      this.deleteEntityAfterClearAssociation(entity);
    } else {
      console.warn("connect point not in connect points", entity.uuid);
    }
  }

  private deleteTextNode(entity: TextNode) {
    // 先判断这个node是否在nodes里
    if (this.project.stageManager.isEntityExists(entity.uuid)) {
      // TODO: 删除逻辑节点存储的状态
      // if (NodeLogic.delayStates.has(entity.uuid)) NodeLogic.delayStates.delete(entity.uuid);
      // 从数组中去除
      this.project.stageManager.delete(entity);
      // 增加特效
      this.project.effects.addEffect(
        new ExplodeDashEffect(
          new ProgressNumber(0, 30),
          entity.collisionBox.getRectangle(),
          entity.color.a === 0 ? Color.White : entity.color.clone(),
        ),
      );
    } else {
      console.warn("node not in nodes", entity.uuid);
    }
    // 删除所有相关的边
    this.deleteEntityAfterClearAssociation(entity);
  }

  /**
   * 删除所有相关的边
   * @param entity
   */
  private deleteEntityAfterClearAssociation(entity: Entity) {
    const prepareDeleteAssociation: Association[] = [];
    const visitedAssociations: Set<string> = new Set();

    for (const edge of this.project.stageManager.getAssociations()) {
      if (edge instanceof Edge) {
        if ((edge.source === entity || edge.target === entity) && visitedAssociations.has(edge.uuid) === false) {
          prepareDeleteAssociation.push(edge);
          visitedAssociations.add(edge.uuid);
        }
      } else if (edge instanceof MultiTargetUndirectedEdge) {
        if (edge.associationList.includes(entity) && visitedAssociations.has(edge.uuid) === false) {
          prepareDeleteAssociation.push(edge);
          visitedAssociations.add(edge.uuid);
        }
      }
    }
    for (const edge of prepareDeleteAssociation) {
      this.project.stageManager.delete(edge);
    }
  }

  /**
   * 注意不要在遍历edges数组中调用这个方法，否则会导致数组长度变化，导致索引错误
   * @param deleteEdge 要删除的边
   * @returns
   */
  deleteEdge(deleteEdge: Edge): boolean {
    const fromNode = deleteEdge.source;
    const toNode = deleteEdge.target;
    // 先判断这两个节点是否在nodes里
    if (
      this.project.stageManager.isEntityExists(fromNode.uuid) &&
      this.project.stageManager.isEntityExists(toNode.uuid)
    ) {
      // 删除边
      this.project.stageManager.delete(deleteEdge);
      this.project.stageManager.updateReferences();
      return true;
    } else {
      return false;
    }
  }

  deleteMultiTargetUndirectedEdge(edge: MultiTargetUndirectedEdge) {
    this.project.stageManager.delete(edge);
    this.project.stageManager.updateReferences();
    return true;
  }
}
