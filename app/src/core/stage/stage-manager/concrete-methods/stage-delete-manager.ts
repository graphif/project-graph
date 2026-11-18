import { Project, service } from "@/core/project";
import { ExplodeDashEffect } from "@/core/service/feedback-service/effect-engine/concrete/explode-dash-effect";
import { Association } from "@/core/stage/stage-object/abstract/association";
import { Entity } from "@/core/stage/stage-object/abstract/stage-entity";
import { StageObject } from "@/core/stage/stage-object/abstract/stage-object";
import { Edge } from "@/core/stage/stage-object/association/edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stage-object/association/muti-target-undirected-edge";
import { ConnectPoint } from "@/core/stage/stage-object/entity/connect-point";
import { ImageNode } from "@/core/stage/stage-object/entity/image-node";
import { LatexNode } from "@/core/stage/stage-object/entity/latex-node";
import { MediaNode } from "@/core/stage/stage-object/entity/media-node";
import { PenStroke } from "@/core/stage/stage-object/entity/pen-stroke";
import { Section } from "@/core/stage/stage-object/entity/section";
import { SvgNode } from "@/core/stage/stage-object/entity/svg-node";
import { TextNode } from "@/core/stage/stage-object/entity/text-node";
import { UrlNode } from "@/core/stage/stage-object/entity/url-node";
import { Color, ProgressNumber } from "@graphif/data-structures";
import { ConnectableEntity } from "../../stage-object/abstract/connectable-entity";
import { ExtensionEntity } from "../../stage-object/entity/extension-entity";
import { ReferenceBlockNode } from "../../stage-object/entity/reference-block-node";

type DeleteHandler<T extends StageObject> = (object: T) => void;
type Constructor<T> = { new (...args: any[]): T };

/**
 * 包含一切删除舞台上的元素的方法
 */
@service("deleteManager")
export class DeleteManager {
  private deleteHandlers = new Map<Constructor<StageObject>, DeleteHandler<StageObject>>();
  // 类型注册器，保证一个类型对应一个函数，绝对类型安全，同时可扩展
  private registerHandler<T extends StageObject>(constructor: Constructor<T>, handler: DeleteHandler<T>) {
    this.deleteHandlers.set(constructor, handler as DeleteHandler<StageObject>);
  }

  constructor(private readonly project: Project) {
    this.registerHandler(TextNode, this.deleteTextNode.bind(this));
    this.registerHandler(Section, this.deleteSection.bind(this));
    this.registerHandler(ConnectPoint, this.deleteConnectPoint.bind(this));
    this.registerHandler(ImageNode, this.deleteImageNode.bind(this));
    this.registerHandler(MediaNode, this.deleteMediaNode.bind(this));
    this.registerHandler(UrlNode, this.deleteUrlNode.bind(this));
    this.registerHandler(PenStroke, this.deletePenStroke.bind(this));
    this.registerHandler(SvgNode, this.deleteSvgNode.bind(this));
    this.registerHandler(LatexNode, this.deleteLatexNode.bind(this));
    this.registerHandler(ReferenceBlockNode, this.deleteReferenceBlockNode.bind(this));
    this.registerHandler(ExtensionEntity, this.deleteExtensionEntity.bind(this));
    this.registerHandler(MultiTargetUndirectedEdge, this.deleteMultiTargetUndirectedEdge.bind(this));
  }

  deleteEntities(deleteNodes: Entity[]) {
    for (const entity of deleteNodes) {
      const handler = this.findDeleteHandler(entity);
      handler?.(entity);
    }
    this.project.stageManager.updateReferences();
  }

  private findDeleteHandler(object: StageObject) {
    for (const [ctor, handler] of this.deleteHandlers) {
      if (object instanceof ctor) return handler;
    }
    console.warn(`No delete handler for ${object.constructor.name}`);
  }

  private deleteSvgNode(entity: SvgNode) {
    if (this.project.stageManager.getEntities().includes(entity)) {
      this.project.stageManager.delete(entity);
      // 删除所有相关的边
      this.deleteEntityAfterClearAssociation(entity);
    }
  }

  private deleteLatexNode(entity: LatexNode) {
    if (this.project.stageManager.getEntities().includes(entity)) {
      this.project.stageManager.delete(entity);
      // 删除所有相关的边
      this.deleteEntityAfterClearAssociation(entity);
    }
  }

  private deleteReferenceBlockNode(entity: ReferenceBlockNode) {
    if (this.project.stageManager.getEntities().includes(entity)) {
      this.project.stageManager.delete(entity);
      // 删除所有相关的边
      this.deleteEntityAfterClearAssociation(entity);
    }
  }

  private deleteExtensionEntity(entity: ExtensionEntity) {
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
    const fatherSection = entity.parentSection;
    if (fatherSection) {
      this.project.sectionInOutManager.goInSection(entity.children, fatherSection);
    } else {
      this.project.sectionInOutManager.goInSections(entity.children, []);
    }
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
  private deleteMediaNode(entity: MediaNode) {
    if (this.project.stageManager.getEntities().includes(entity)) {
      this.project.stageManager.delete(entity);
      this.project.effects.addEffect(
        new ExplodeDashEffect(new ProgressNumber(0, 30), entity.collisionBox.getRectangle(), Color.White),
      );
      this.deleteEntityAfterClearAssociation(entity);
      void entity.dispose();
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
  private deleteEntityAfterClearAssociation(entity: ConnectableEntity) {
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

    // 从孪生同步关系中移除（若成员数量不足2则整个关系也一起删除）
    this.project.syncAssociationManager.onStageObjectDeleted(entity);
  }

  /**
   * 注意不要在遍历edges数组中调用这个方法，否则会导致数组长度变化，导致索引错误
   * @param deleteEdge 要删除的边
   * @returns
   */
  deleteEdge(deleteEdge: Edge): boolean {
    const fromNode = deleteEdge.source;
    const toNode = deleteEdge.target;
    // 检查边的源和目标是否在锁定的 section 内
    if (this.project.sectionMethods.isObjectBeLockedBySection(deleteEdge)) {
      return false; // 连接了锁定 section 内物体的连线不允许删除
    }
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
    // 检查无向边是否连接了锁定的 section 内的物体
    if (this.project.sectionMethods.isObjectBeLockedBySection(edge)) {
      return false; // 连接了锁定 section 内物体的无向边不允许删除
    }
    this.project.stageManager.delete(edge);
    this.project.stageManager.updateReferences();
    return true;
  }
}
