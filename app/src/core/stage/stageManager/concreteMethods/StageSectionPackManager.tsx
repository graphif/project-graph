// import { Section } from "@/core/stageObject/entity/Section";
// import { Entity } from "@/core/stageObject/StageEntity";
import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { toast } from "sonner";
import { v4 } from "uuid";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 管理所有东西进出StageSection的逻辑
 */
@service("sectionPackManager")
export class SectionPackManager {
  constructor(private readonly project: Project) {}

  /** 折叠起来 */
  packSection(): void {
    for (const section of this.project.stageManager.getSections()) {
      if (!section.isSelected) {
        continue;
      }
      this.modifyHiddenDfs(section, true);
      section.isCollapsed = true;
    }
    this.project.stageManager.updateReferences();
  }

  /**
   * 由于复层折叠，引起所有子节点的被隐藏状态发生改变
   * @param section
   * @param isCollapsed
   */
  private modifyHiddenDfs(section: Section, isCollapsed: boolean) {
    // section.isCollapsed = isCollapsed;
    for (const childEntity of section.children) {
      if (childEntity instanceof Section) {
        this.modifyHiddenDfs(childEntity, isCollapsed);
      }
      childEntity.isHiddenBySectionCollapse = isCollapsed;
    }
  }

  /** 展开 */
  unpackSection(): void {
    for (const section of this.project.stageManager.getSections()) {
      if (!section.isSelected) {
        continue;
      }
      this.modifyHiddenDfs(section, false);
      section.isCollapsed = false;
    }
    this.project.stageManager.updateReferences();
  }

  switchCollapse(): void {
    for (const section of this.project.stageManager.getSections()) {
      if (!section.isSelected) {
        continue;
      }
      if (section.isCollapsed) {
        this.unpackSection();
      } else {
        this.packSection();
      }
    }
  }

  /**
   * 将所有选中的节点当场转换成Section
   */
  textNodeToSection(): void {
    for (const textNode of this.project.stageManager.getTextNodes()) {
      if (!textNode.isSelected) {
        continue;
      }
      this.targetTextNodeToSection(textNode);
    }
    this.project.historyManager.recordStep();
  }

  /**
   * 将节点树转换成嵌套集合 （递归的）
   */
  textNodeTreeToSection(rootNode: TextNode): void {
    if (!this.project.graphMethods.isTree(rootNode)) {
      toast.error("请选择一个树状结构的节点作为根节点");
      return;
    }
    const dfs = (node: TextNode): Section | TextNode => {
      const childNodes = this.project.graphMethods.nodeChildrenArray(node).filter((node) => node instanceof TextNode);
      if (childNodes.length === 0) {
        return node;
      }
      const childEntityList = [];
      for (const childNode of childNodes) {
        const transEntity = dfs(childNode);
        childEntityList.push(transEntity);

        const edges = this.project.graphMethods.getEdgesBetween(node, childNode);
        for (const edge of edges) {
          this.project.stageManager.deleteEdge(edge);
        }
      }
      const section = this.targetTextNodeToSection(node, true);

      this.project.sectionInOutManager.goInSection(childEntityList, section);
      return section;
    };
    dfs(rootNode);
    this.project.historyManager.recordStep();
  }

  /**
   * 非递归的 将节点树转换成嵌套集合
   * @param rootNode
   */
  textNodeTreeToSectionNoDeep(rootNode: TextNode): void {
    if (!this.project.graphMethods.isTree(rootNode)) {
      toast.error("请选择一个树状结构的节点作为根节点");
      return;
    }
    const childNodes = this.project.graphMethods.nodeChildrenArray(rootNode).filter((node) => node instanceof TextNode);
    const childSets = this.project.graphMethods.getSuccessorSet(rootNode, true);
    if (childNodes.length === 0) {
      return;
    }

    for (const childNode of childNodes) {
      const edges = this.project.graphMethods.getEdgesBetween(rootNode, childNode);
      for (const edge of edges) {
        this.project.stageManager.deleteEdge(edge);
      }
    }
    const section = this.targetTextNodeToSection(rootNode, true);
    const rootNodeFatherSection = this.project.sectionMethods.getFatherSections(rootNode);
    for (const fatherSection of rootNodeFatherSection) {
      this.project.sectionInOutManager.goOutSection(childSets, fatherSection);
    }
    this.project.sectionInOutManager.goInSection(childSets, section);
    this.project.historyManager.recordStep();
  }

  /**
   * 将指定的文本节点转换成Section，自动删除原来的TextNode
   * @param textNode 要转换的节点
   * @param ignoreEdges 是否忽略边的影响
   */
  targetTextNodeToSection(textNode: TextNode, ignoreEdges: boolean = false): Section {
    // 获取这个节点的父级Section
    const fatherSections = this.project.sectionMethods.getFatherSections(textNode);
    const newSection = new Section(this.project, {
      text: textNode.text,
      collisionBox: textNode.collisionBox,
      color: textNode.color,
      details: textNode.details,
    });
    newSection.adjustLocationAndSize();

    // 将新的Section加入舞台
    this.project.stageManager.add(newSection);
    for (const fatherSection of fatherSections) {
      this.project.sectionInOutManager.goInSection([newSection], fatherSection);
    }

    if (!ignoreEdges) {
      for (const edge of this.project.stageManager.getAssociations()) {
        if (edge instanceof Edge) {
          if (edge.target.uuid === textNode.uuid) {
            edge.target = newSection;
          }
          if (edge.source.uuid === textNode.uuid) {
            edge.source = newSection;
          }
        }
      }
    }
    // 删除原来的textNode
    this.project.stageManager.deleteEntities([textNode]);
    // 更新section的碰撞箱
    newSection.adjustLocationAndSize();
    return newSection;
  }

  /**
   * 拆包操作
   */
  unpackSelectedSections() {
    const selectedSections = this.project.stageManager.getSelectedEntities();
    this.unpackSections(selectedSections);
    this.project.historyManager.recordStep();
  }

  /**
   * 打包的反操作：拆包
   * @param entities 要拆包的实体
   * 如果选择了section内部一层的实体，则父section脱离剥皮，变成一个textNode
   * 如果选择的是一个section，则其本身脱离剥皮，变成一个textNode，内部内容掉落出来。
   */
  private unpackSections(entities: Entity[]) {
    if (entities.length === 0) return;
    // 目前先仅支持选中section后再进行拆包操作
    const sections = entities.filter((entity) => entity instanceof Section);
    if (sections.length === 0) {
      toast.error("请选择一个section");
      return;
    }
    for (const section of sections) {
      const currentSectionFathers = this.project.sectionMethods.getFatherSections(section);
      // 生成一个textnode
      const sectionLocation = section.collisionBox.getRectangle().location;
      const textNode = new TextNode(this.project, {
        uuid: v4(),
        text: section.text,
        details: section.details,
        location: [sectionLocation.x, sectionLocation.y],
        size: [100, 100],
        color: section.color.toArray(),
      });
      // 将textNode添加到舞台
      this.project.stageManager.add(textNode);
      // 将新的textnode添加到父section中
      this.project.sectionInOutManager.goInSections([textNode], currentSectionFathers);
      // 将section的子节点添加到父section中
      this.project.sectionInOutManager.goInSections(section.children, currentSectionFathers);
      // 将section从舞台中删除
      this.project.stageManager.deleteEntities([section]);
    }
  }

  /** 将多个实体打包成一个section，并添加到舞台中 */
  async packEntityToSection(addEntities: Entity[]) {
    if (addEntities.length === 0) {
      return;
    }
    addEntities = this.project.sectionMethods.shallowerNotSectionEntities(addEntities);
    // 检测父亲section是否是等同
    const firstParents = this.project.sectionMethods.getFatherSections(addEntities[0]);
    if (addEntities.length > 1) {
      let isAllSameFather = true;

      for (let i = 1; i < addEntities.length; i++) {
        const secondParents = this.project.sectionMethods.getFatherSections(addEntities[i]);
        if (firstParents.length !== secondParents.length) {
          isAllSameFather = false;
          break;
        }
        // 检查父亲数组是否相同
        const firstParentsString = firstParents
          .map((section: any) => section.uuid)
          .sort()
          .join();
        const secondParentsString = secondParents
          .map((section: any) => section.uuid)
          .sort()
          .join();
        if (firstParentsString !== secondParentsString) {
          isAllSameFather = false;
          break;
        }
      }

      if (!isAllSameFather) {
        // 暂时不支持交叉section的创建
        toast.error("选中的实体不在同一层级下，暂时不鼓励交叉section的直接打包型创建");
        return;
      }
    }
    for (const fatherSection of firstParents) {
      this.project.stageManager.goOutSection(addEntities, fatherSection);
    }
    const section = Section.fromEntities(this.project, addEntities);
    let smartTitle = this.getSmartSectionTitle(addEntities);
    if (smartTitle.length > 10) {
      smartTitle = smartTitle.slice(0, 10) + "...";
    }
    section.text =
      smartTitle.length > 0
        ? smartTitle
        : this.project.stageUtils.replaceAutoNameTemplate(Settings.autoNamerSectionTemplate, section);
    this.project.stageManager.add(section);
    for (const fatherSection of firstParents) {
      this.project.stageManager.goInSection([section], fatherSection);
    }
  }

  /**
   * 从框选区域创建Section，并在左上角和右下角添加质点
   */
  createSectionFromSelectionRectangle(): void {
    const rectangleSelect = this.project.rectangleSelect;
    const selectionRectangle = rectangleSelect.getRectangle();

    if (!selectionRectangle) {
      return;
    }

    // 创建空的Section
    const collisionBox = new CollisionBox([selectionRectangle.clone()]);
    const section = new Section(this.project, {
      text: "section",
      collisionBox: collisionBox,
      children: [],
      isCollapsed: false,
      isHidden: false,
    });

    // 创建左上角和右下角的质点
    const radius = ConnectPoint.CONNECT_POINT_SHRINK_RADIUS;

    // 左上角质点
    const topLeftLocation = selectionRectangle.location.clone();
    const topLeftCollisionBox = new CollisionBox([new Rectangle(topLeftLocation, Vector.same(radius * 2))]);
    const topLeftPoint = new ConnectPoint(this.project, {
      collisionBox: topLeftCollisionBox,
    });

    // 右下角质点
    const bottomRightLocation = selectionRectangle.location
      .clone()
      .add(new Vector(selectionRectangle.size.x - radius * 2, selectionRectangle.size.y - radius * 2));
    const bottomRightCollisionBox = new CollisionBox([new Rectangle(bottomRightLocation, Vector.same(radius * 2))]);
    const bottomRightPoint = new ConnectPoint(this.project, {
      collisionBox: bottomRightCollisionBox,
    });

    // 将质点添加到舞台
    this.project.stageManager.add(topLeftPoint);
    this.project.stageManager.add(bottomRightPoint);

    // 将Section添加到舞台
    this.project.stageManager.add(section);
    // 重命名 Section
    // 此处未生效，以后再排查
    // setTimeout(() => {
    //   this.project.stageUtils.replaceAutoNameTemplate(Settings.autoNamerSectionTemplate, section);
    // });

    // 将质点放入Section
    this.project.stageManager.goInSection([topLeftPoint, bottomRightPoint], section);

    // 清空矩形框
    rectangleSelect.shutDown();

    // 记录历史步骤
    this.project.historyManager.recordStep();
  }

  /**
   * 将选中的实体打包成Section
   */
  packSelectedEntitiesToSection(): void {
    const selectedEntities = this.project.stageManager.getEntities().filter((entity) => entity.isSelected);
    if (selectedEntities.length > 0) {
      this.packEntityToSection(selectedEntities);
    }
  }

  getSmartSectionTitle(addEntities: Entity[]): string {
    const textNodes = addEntities.filter((e) => e instanceof TextNode) as TextNode[];
    if (textNodes.length === 0) return "";
    // 所有实体必须是文本节点
    if (textNodes.length !== addEntities.length) return "";

    // 必须构成树形结构（在诱导子图中）
    if (!this.project.graphMethods.isTreeByNodes(textNodes)) return "";

    const root = this.project.graphMethods.getTreeRootByNodes(textNodes);
    if (!root || !(root instanceof TextNode)) return "";
    return root.text;
  }
}
