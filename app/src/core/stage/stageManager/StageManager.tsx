import { Project, service } from "@/core/Project";
import { EntityShrinkEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityShrinkEffect";
import { PenStrokeDeletedEffect } from "@/core/service/feedbackService/effectEngine/concrete/PenStrokeDeletedEffect";
import { Settings } from "@/core/service/Settings";
import { Association } from "@/core/stage/stageObject/abstract/Association";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { CubicCatmullRomSplineEdge } from "@/core/stage/stageObject/association/CubicCatmullRomSplineEdge";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { PenStroke } from "@/core/stage/stageObject/entity/PenStroke";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { Direction } from "@/types/directions";
// import { Serialized } from "@/types/node";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";

// littlefean:应该改成类，实例化的对象绑定到舞台上。这成单例模式了
// 开发过程中会造成多开
// zty012:这个是存储数据的，和舞台无关，应该单独抽离出来
// 并且会在舞台之外的地方操作，所以应该是namespace单例

/**
 * 子场景的相机数据
 */
export type ChildCameraData = {
  /**
   * 传送门的左上角位置
   */
  location: Vector;
  zoom: number;
  /**
   * 传送门大小
   */
  size: Vector;
  /**
   * 相机的目标位置
   */
  targetLocation: Vector;
};

/**
 * 舞台管理器，也可以看成包含了很多操作方法的《舞台实体容器》
 * 管理节点、边的关系等，内部包含了舞台上的所有实体
 */
@service("stageManager")
export class StageManager {
  constructor(private readonly project: Project) {}

  /**
   * TODO: 这个get方法在2.0从O(1)变成O(N)了，可能是引起卡顿的原因，后面待排查
   * @param uuid
   * @returns
   */
  get(uuid: string) {
    return this.project.stage.find((node) => node.uuid === uuid);
  }

  isEmpty(): boolean {
    return this.project.stage.length === 0;
  }
  getTextNodes(): TextNode[] {
    return this.project.stage.filter((node) => node instanceof TextNode);
  }
  getConnectableEntity(): ConnectableEntity[] {
    return this.project.stage.filter((node) => node instanceof ConnectableEntity);
  }
  isEntityExists(uuid: string): boolean {
    return this.project.stage.filter((node) => node.uuid === uuid).length > 0;
  }
  getSections(): Section[] {
    return this.project.stage.filter((node) => node instanceof Section);
  }
  getImageNodes(): ImageNode[] {
    return this.project.stage.filter((node) => node instanceof ImageNode);
  }
  getConnectPoints(): ConnectPoint[] {
    return this.project.stage.filter((node) => node instanceof ConnectPoint);
  }
  getUrlNodes(): UrlNode[] {
    return this.project.stage.filter((node) => node instanceof UrlNode);
  }
  // getPortalNodes(): PortalNode[] {
  //   return this.project.stage.filter((node) => node instanceof PortalNode);
  // }
  getPenStrokes(): PenStroke[] {
    return this.project.stage.filter((node) => node instanceof PenStroke);
  }
  getSvgNodes(): SvgNode[] {
    return this.project.stage.filter((node) => node instanceof SvgNode);
  }

  getStageObjects(): StageObject[] {
    return this.project.stage;
  }

  /**
   * 获取场上所有的实体
   * @returns
   */
  getEntities(): Entity[] {
    return this.project.stage.filter((node) => node instanceof Entity);
  }
  getEntitiesByUUIDs(uuids: string[]): Entity[] {
    return this.project.stage.filter((node) => uuids.includes(node.uuid) && node instanceof Entity) as Entity[];
  }
  isNoEntity(): boolean {
    return this.project.stage.filter((node) => node instanceof Entity).length === 0;
  }
  delete(stageObject: StageObject) {
    this.project.stage.splice(this.project.stage.indexOf(stageObject), 1);
  }

  getAssociations(): Association[] {
    return this.project.stage.filter((node) => node instanceof Association);
  }
  getEdges(): Edge[] {
    return this.project.stage.filter((node) => node instanceof Edge);
  }
  getLineEdges(): LineEdge[] {
    return this.project.stage.filter((node) => node instanceof LineEdge);
  }
  getCrEdges(): CubicCatmullRomSplineEdge[] {
    return this.project.stage.filter((node) => node instanceof CubicCatmullRomSplineEdge);
  }

  add(stageObject: StageObject) {
    this.project.stage.push(stageObject);
  }

  /**
   * 更新节点的引用，将unknown的节点替换为真实的节点，保证对象在内存中的唯一性
   * 节点什么情况下会是unknown的？
   *
   * 包含了对Section框的更新
   * 包含了对Edge双向线偏移状态的更新
   */
  updateReferences() {
    for (const entity of this.getEntities()) {
      // 实体是可连接类型
      if (entity instanceof ConnectableEntity) {
        for (const edge of this.getAssociations()) {
          if (edge instanceof Edge) {
            if (edge.source.unknown && edge.source.uuid === entity.uuid) {
              edge.source = entity;
            }
            if (edge.target.unknown && edge.target.uuid === entity.uuid) {
              edge.target = entity;
            }
          }
        }
      }
    }
    // 以下是Section框的更新，y值降序排序，从下往上排序，因为下面的往往是内层的Section
    for (const section of this.getSections().sort(
      (a, b) => b.collisionBox.getRectangle().location.y - a.collisionBox.getRectangle().location.y,
    )) {
      // 更新孩子数组，并调整位置和大小
      const newChildList = [];

      for (const child of section.children) {
        if (this.project.stage.find((node) => node.uuid === child.uuid)) {
          const childObject = this.project.stage.find(
            (node) => node.uuid === child.uuid && node instanceof Entity,
          ) as Entity;
          if (childObject) {
            newChildList.push(childObject);
          }
        }
      }
      section.children = newChildList;
      section.adjustLocationAndSize();
      section.adjustChildrenStateByCollapse();
    }

    // 以下是LineEdge双向线偏移状态的更新
    for (const edge of this.getLineEdges()) {
      let isShifting = false;
      for (const otherEdge of this.getLineEdges()) {
        if (edge.source === otherEdge.target && edge.target === otherEdge.source) {
          isShifting = true;
          break;
        }
      }
      edge.isShifting = isShifting;
    }
  }

  getTextNodeByUUID(uuid: string): TextNode | null {
    for (const node of this.getTextNodes()) {
      if (node.uuid === uuid) {
        return node;
      }
    }
    return null;
  }
  getConnectableEntityByUUID(uuid: string): ConnectableEntity | null {
    for (const node of this.getConnectableEntity()) {
      if (node.uuid === uuid) {
        return node;
      }
    }
    return null;
  }
  isSectionByUUID(uuid: string): boolean {
    return this.project.stage.find((node) => node.uuid === uuid) instanceof Section;
  }
  getSectionByUUID(uuid: string): Section | null {
    const entity = this.get(uuid);
    if (entity instanceof Section) {
      return entity;
    }
    return null;
  }

  /**
   * 计算所有节点的中心点
   */
  getCenter(): Vector {
    if (this.project.stage.length === 0) {
      return Vector.getZero();
    }
    const allNodesRectangle = Rectangle.getBoundingRectangle(
      this.project.stage.map((node) => node.collisionBox.getRectangle()),
    );
    return allNodesRectangle.center;
  }

  /**
   * 计算所有节点的大小
   */
  getSize(): Vector {
    if (this.project.stage.length === 0) {
      return new Vector(this.project.renderer.w, this.project.renderer.h);
    }
    const size = this.getBoundingRectangle().size;

    return size;
  }

  /**
   * 获取舞台的矩形对象
   */
  getBoundingRectangle(): Rectangle {
    const rect = Rectangle.getBoundingRectangle(
      Array.from(this.project.stage).map((node) => node.collisionBox.getRectangle()),
    );

    return rect;
  }

  /**
   * 根据位置查找节点，常用于点击事件
   * @param location
   * @returns
   */
  findTextNodeByLocation(location: Vector): TextNode | null {
    for (const node of this.getTextNodes()) {
      if (node.collisionBox.isContainsPoint(location)) {
        return node;
      }
    }
    return null;
  }

  /**
   * 用于鼠标悬停时查找边
   * @param location
   * @returns
   */
  findLineEdgeByLocation(location: Vector): LineEdge | null {
    for (const edge of this.getLineEdges()) {
      if (edge.collisionBox.isContainsPoint(location)) {
        return edge;
      }
    }
    return null;
  }

  findAssociationByLocation(location: Vector): Association | null {
    for (const association of this.getAssociations()) {
      if (association.collisionBox.isContainsPoint(location)) {
        return association;
      }
    }
    return null;
  }

  findSectionByLocation(location: Vector): Section | null {
    for (const section of this.getSections()) {
      if (section.collisionBox.isContainsPoint(location)) {
        return section;
      }
    }
    return null;
  }

  findImageNodeByLocation(location: Vector): ImageNode | null {
    for (const node of this.getImageNodes()) {
      if (node.collisionBox.isContainsPoint(location)) {
        return node;
      }
    }
    return null;
  }

  findConnectableEntityByLocation(location: Vector): ConnectableEntity | null {
    for (const entity of this.getConnectableEntity()) {
      if (entity.isHiddenBySectionCollapse) {
        continue;
      }
      if (entity.collisionBox.isContainsPoint(location)) {
        return entity;
      }
    }
    return null;
  }

  /**
   * 优先级：
   * 涂鸦 > 其他
   * @param location
   * @returns
   */
  findEntityByLocation(location: Vector): Entity | null {
    for (const penStroke of this.getPenStrokes()) {
      if (penStroke.isHiddenBySectionCollapse) continue;
      if (penStroke.collisionBox.isContainsPoint(location)) {
        return penStroke;
      }
    }
    for (const entity of this.getEntities()) {
      if (entity.isHiddenBySectionCollapse) {
        continue;
      }
      if (entity.collisionBox.isContainsPoint(location)) {
        return entity;
      }
    }
    return null;
  }

  findConnectPointByLocation(location: Vector): ConnectPoint | null {
    for (const point of this.getConnectPoints()) {
      if (point.isHiddenBySectionCollapse) {
        continue;
      }
      if (point.collisionBox.isContainsPoint(location)) {
        return point;
      }
    }
    return null;
  }
  isHaveEntitySelected(): boolean {
    for (const entity of this.getEntities()) {
      if (entity.isSelected) {
        return true;
      }
    }
    return false;
  }

  /**
   * O(n)
   * @returns
   */
  getSelectedEntities(): Entity[] {
    return this.project.stage.filter((so) => so.isSelected && so instanceof Entity) as Entity[];
  }
  getSelectedAssociations(): Association[] {
    return this.project.stage.filter((so) => so.isSelected && so instanceof Association) as Association[];
  }
  getSelectedStageObjects(): StageObject[] {
    const result: StageObject[] = [];
    result.push(...this.getSelectedEntities());
    result.push(...this.getSelectedAssociations());
    return result;
  }

  /**
   * 获取选中内容的边界矩形
   * @returns
   */
  getBoundingBoxOfSelected(): Rectangle {
    const selectedObjects = this.getSelectedStageObjects();
    if (selectedObjects.length === 0) {
      // 如果没有选中任何对象，返回一个默认的矩形
      return new Rectangle(Vector.getZero(), new Vector(100, 100));
    }

    const rectangles = selectedObjects.map((obj) => obj.collisionBox.getRectangle());
    return Rectangle.getBoundingRectangle(rectangles);
  }

  /**
   * 判断某一点是否有实体存在（排除实体的被Section折叠）
   * @param location
   * @returns
   */
  isEntityOnLocation(location: Vector): boolean {
    for (const entity of this.getEntities()) {
      if (entity.isHiddenBySectionCollapse) {
        continue;
      }
      if (entity.collisionBox.isContainsPoint(location)) {
        return true;
      }
    }
    return false;
  }
  isAssociationOnLocation(location: Vector): boolean {
    for (const association of this.getAssociations()) {
      if (association instanceof Edge) {
        if (association.target.isHiddenBySectionCollapse && association.source.isHiddenBySectionCollapse) {
          continue;
        }
      }
      if (association.collisionBox.isContainsPoint(location)) {
        return true;
      }
    }
    return false;
  }

  // region 以下为舞台操作相关的函数
  // 建议不同的功能分类到具体的文件中，然后最后集中到这里调用，使得下面的显示简短一些
  // 每个操作函数尾部都要加一个记录历史的操作

  deleteEntities(deleteNodes: Entity[]) {
    if (deleteNodes.length === 0) {
      // 此处return 性能优化60ms
      return;
    }
    this.project.deleteManager.deleteEntities(deleteNodes);
    this.project.historyManager.recordStep();
  }

  /**
   * 外部的交互层的delete键可以直接调用这个函数
   */
  deleteSelectedStageObjects() {
    const selectedEntities = this.getEntities().filter((node) => node.isSelected);
    for (const entity of selectedEntities) {
      if (entity instanceof PenStroke) {
        this.project.effects.addEffect(PenStrokeDeletedEffect.fromPenStroke(entity));
      } else {
        this.project.effects.addEffect(EntityShrinkEffect.fromEntity(entity));
      }
    }
    this.deleteEntities(selectedEntities);

    // 处理所有类型的边，包括普通边和多目标无向边
    for (const association of this.getAssociations()) {
      if (association.isSelected) {
        this.deleteAssociation(association);
        if (association instanceof Edge) {
          this.project.effects.addEffects(this.project.edgeRenderer.getCuttingEffects(association));
        }
      }
    }
  }
  deleteAssociation(deleteAssociation: Association): boolean {
    if (deleteAssociation instanceof Edge) {
      return this.deleteEdge(deleteAssociation);
    } else if (deleteAssociation instanceof MultiTargetUndirectedEdge) {
      const res = this.project.deleteManager.deleteMultiTargetUndirectedEdge(deleteAssociation);
      this.project.historyManager.recordStep();
      return res;
    }
    toast.error("无法删除未知类型的关系");
    return false;
  }

  deleteEdge(deleteEdge: Edge): boolean {
    const res = this.project.deleteManager.deleteEdge(deleteEdge);
    this.project.historyManager.recordStep();
    return res;
  }

  // 一个简单的文案
  private static w = `自环已被禁止，可在设置>控制>连线 中打开允许添加自环选项，
    但您可能并不是想添加自环，您可能是想打开右键菜单，所以请在空白位置右键。
    如果您不需要添加自环的操作但想保持能够通过在节点上右键打开菜单的操作，
    可在设置>控制>连线 中关闭“启用右键点击连线功能”。
    但如果您既要右键点击节点创建连线功能，又想要在节点上右键展开右键菜单操作，很抱歉，这两个功能在逻辑上冲突了。
    `;

  connectEntity(fromNode: ConnectableEntity, toNode: ConnectableEntity, isCrEdge: boolean = false) {
    if (fromNode === toNode && !Settings.allowAddCycleEdge) {
      toast.warning(
        <div>
          <span>{StageManager.w}</span>
        </div>,
      );
      return false;
    }
    if (isCrEdge) {
      this.project.nodeConnector.addCrEdge(fromNode, toNode);
    } else {
      this.project.nodeConnector.connectConnectableEntity(fromNode, toNode);
    }

    this.project.historyManager.recordStep();
    return this.project.graphMethods.isConnected(fromNode, toNode);
  }

  /**
   * 多重连接，只记录一次历史
   * @param fromNodes
   * @param toNode
   * @param isCrEdge
   * @returns
   */
  connectMultipleEntities(
    fromNodes: ConnectableEntity[],
    toNode: ConnectableEntity,
    isCrEdge: boolean = false,
    sourceRectRate?: [number, number],
    targetRectRate?: [number, number],
  ) {
    if (fromNodes.length === 0) {
      return false;
    }
    for (const fromNode of fromNodes) {
      if (fromNode === toNode && !Settings.allowAddCycleEdge) {
        toast.warning(
          <div>
            <h2 className="text-xl">请在空白处右键</h2>
            <span>{StageManager.w}</span>
          </div>,
        );
        continue;
      }
      if (isCrEdge) {
        this.project.nodeConnector.addCrEdge(fromNode, toNode);
      } else {
        this.project.nodeConnector.connectConnectableEntity(fromNode, toNode, "", targetRectRate, sourceRectRate);
      }
    }
    this.project.historyManager.recordStep();
    return true;
  }

  /**
   * 反转一个节点与他相连的所有连线方向
   * @param connectEntity
   */
  private reverseNodeEdges(connectEntity: ConnectableEntity) {
    const prepareReverseEdges = [];
    for (const edge of this.getLineEdges()) {
      if (edge.target === connectEntity || edge.source === connectEntity) {
        prepareReverseEdges.push(edge);
      }
    }
    this.project.nodeConnector.reverseEdges(prepareReverseEdges);
  }

  /**
   * 反转所有选中的节点的每个节点的连线
   */
  reverseSelectedNodeEdge() {
    const entities = this.getSelectedEntities().filter((entity) => entity instanceof ConnectableEntity);
    for (const entity of entities) {
      this.reverseNodeEdges(entity);
    }
  }

  reverseSelectedEdges() {
    const selectedEdges = this.getLineEdges().filter((edge) => edge.isSelected);
    if (selectedEdges.length === 0) {
      return;
    }
    this.project.nodeConnector.reverseEdges(selectedEdges);
  }

  // addSerializedData(serializedData: Serialized.File, diffLocation = new Vector(0, 0)) {
  //   this.project.serializedDataAdder.addSerializedData(serializedData, diffLocation);
  //   this.project.historyManager.recordStep();
  // }

  generateNodeTreeByText(text: string, indention: number = 4, location = this.project.camera.location) {
    this.project.nodeAdder.addNodeTreeByText(text, indention, location);
    this.project.historyManager.recordStep();
  }

  generateNodeGraphByText(text: string, location = this.project.camera.location) {
    try {
      this.project.nodeAdder.addNodeGraphByText(text, location);
      this.project.historyManager.recordStep();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  generateNodeMermaidByText(text: string, location = this.project.camera.location) {
    try {
      this.project.nodeAdder.addNodeMermaidByText(text, location);
      this.project.historyManager.recordStep();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  generateNodeByMarkdown(text: string, location = this.project.camera.location) {
    this.project.nodeAdder.addNodeByMarkdown(text, location);
    this.project.historyManager.recordStep();
  }

  /** 将多个实体打包成一个section，并添加到舞台中 */
  async packEntityToSection(addEntities: Entity[]) {
    await this.project.sectionPackManager.packEntityToSection(addEntities);
    this.project.historyManager.recordStep();
  }

  /** 将选中的实体打包成一个section，并添加到舞台中 */
  async packEntityToSectionBySelected() {
    const selectedNodes = this.getSelectedEntities();
    if (selectedNodes.length === 0) {
      return;
    }
    this.packEntityToSection(selectedNodes);
  }

  goInSection(entities: Entity[], section: Section) {
    this.project.sectionInOutManager.goInSection(entities, section);
    this.project.historyManager.recordStep();
  }

  goOutSection(entities: Entity[], section: Section) {
    this.project.sectionInOutManager.goOutSection(entities, section);
    this.project.historyManager.recordStep();
  }
  /** 将所有选中的Section折叠起来 */
  packSelectedSection() {
    this.project.sectionPackManager.packSection();
    this.project.historyManager.recordStep();
  }

  /** 将所有选中的Section展开 */
  unpackSelectedSection() {
    this.project.sectionPackManager.unpackSection();
    this.project.historyManager.recordStep();
  }

  /**
   * 切换选中的Section的折叠状态
   */
  sectionSwitchCollapse() {
    this.project.sectionPackManager.switchCollapse();
    this.project.historyManager.recordStep();
  }

  connectEntityByCrEdge(fromNode: ConnectableEntity, toNode: ConnectableEntity) {
    return this.project.nodeConnector.addCrEdge(fromNode, toNode);
  }

  /**
   * 刷新所有舞台内容
   */
  refreshAllStageObjects() {
    const entities = this.getEntities();
    for (const entity of entities) {
      if (entity instanceof TextNode) {
        if (entity.sizeAdjust === "auto") {
          entity.forceAdjustSizeByText();
        }
      } else if (entity instanceof Section) {
        entity.adjustLocationAndSize();
      }
    }
  }

  /**
   * 刷新选中内容
   */
  refreshSelected() {
    const entities = this.getSelectedEntities();
    for (const entity of entities) {
      if (entity instanceof ImageNode) {
        // entity.refresh();
      }
    }
  }

  /**
   * 改变连线的目标接头点位置
   * @param direction
   */
  changeSelectedEdgeConnectLocation(direction: Direction | null, isSource: boolean = false) {
    const edges = this.getSelectedAssociations().filter((edge) => edge instanceof Edge);
    this.changeEdgesConnectLocation(edges, direction, isSource);
  }

  /**
   * 更改多个连线的目标接头点位置
   * @param edges
   * @param direction
   * @param isSource
   */
  changeEdgesConnectLocation(edges: Edge[], direction: Direction | null, isSource: boolean = false) {
    const newLocationRate = new Vector(0.5, 0.5);
    if (direction === Direction.Left) {
      newLocationRate.x = 0.01;
    } else if (direction === Direction.Right) {
      newLocationRate.x = 0.99;
    } else if (direction === Direction.Up) {
      newLocationRate.y = 0.01;
    } else if (direction === Direction.Down) {
      newLocationRate.y = 0.99;
    }

    for (const edge of edges) {
      if (isSource) {
        edge.sourceRectangleRate = newLocationRate;
      } else {
        edge.targetRectangleRate = newLocationRate;
      }
    }
  }

  switchLineEdgeToCrEdge() {
    const prepareDeleteLineEdge: LineEdge[] = [];
    for (const edge of this.getLineEdges()) {
      if (edge instanceof LineEdge && edge.isSelected) {
        // 删除这个连线，并准备创建cr曲线
        prepareDeleteLineEdge.push(edge);
      }
    }
    for (const lineEdge of prepareDeleteLineEdge) {
      this.deleteEdge(lineEdge);
      this.connectEntityByCrEdge(lineEdge.source, lineEdge.target);
    }
  }

  /**
   * 有向边转无向边
   */
  switchEdgeToUndirectedEdge() {
    const prepareDeleteLineEdge: LineEdge[] = [];
    for (const edge of this.getLineEdges()) {
      if (edge instanceof LineEdge && edge.isSelected) {
        // 删除这个连线，并准备创建
        prepareDeleteLineEdge.push(edge);
      }
    }
    for (const edge of prepareDeleteLineEdge) {
      if (edge.target === edge.source) {
        continue;
      }
      this.deleteEdge(edge);
      const undirectedEdge = MultiTargetUndirectedEdge.createFromSomeEntity(this.project, [edge.target, edge.source]);
      undirectedEdge.text = edge.text;
      undirectedEdge.color = edge.color.clone();
      undirectedEdge.arrow = "outer";
      // undirectedEdge.isSelected = true;
      this.add(undirectedEdge);
    }
  }
  /**
   * 无向边转有向边
   */
  switchUndirectedEdgeToEdge() {
    const prepareDeleteUndirectedEdge: MultiTargetUndirectedEdge[] = [];
    for (const edge of this.getAssociations()) {
      if (edge instanceof MultiTargetUndirectedEdge && edge.isSelected) {
        // 删除这个连线，并准备创建
        prepareDeleteUndirectedEdge.push(edge);
      }
    }
    for (const edge of prepareDeleteUndirectedEdge) {
      if (edge.associationList.length !== 2) {
        continue;
      }

      const [fromNode, toNode] = edge.associationList;
      if (fromNode && toNode && fromNode instanceof ConnectableEntity && toNode instanceof ConnectableEntity) {
        const lineEdge = LineEdge.fromTwoEntity(this.project, fromNode, toNode);
        lineEdge.text = edge.text;
        lineEdge.color = edge.color.clone();
        this.deleteAssociation(edge);
        this.add(lineEdge);
        this.updateReferences();
      }
    }
  }

  addSelectedCREdgeControlPoint() {
    const selectedCREdge = this.getSelectedAssociations().filter((edge) => edge instanceof CubicCatmullRomSplineEdge);
    for (const edge of selectedCREdge) {
      edge.addControlPoint();
    }
  }

  addSelectedCREdgeTension() {
    const selectedCREdge = this.getSelectedAssociations().filter((edge) => edge instanceof CubicCatmullRomSplineEdge);
    for (const edge of selectedCREdge) {
      edge.tension += 0.25;
      edge.tension = Math.min(1, edge.tension);
    }
  }

  reduceSelectedCREdgeTension() {
    const selectedCREdge = this.getSelectedAssociations().filter((edge) => edge instanceof CubicCatmullRomSplineEdge);
    for (const edge of selectedCREdge) {
      edge.tension -= 0.25;
      edge.tension = Math.max(0, edge.tension);
    }
  }

  /**
   * 设置选中Edge的线条类型
   */
  setSelectedEdgeLineType(lineType: string) {
    const selectedEdges = this.getSelectedAssociations().filter((edge) => edge instanceof LineEdge);
    for (const edge of selectedEdges) {
      edge.lineType = lineType;
    }
  }

  /**
   * ctrl + A 全选
   */
  selectAll() {
    const allEntity = this.project.stage;
    for (const entity of allEntity) {
      entity.isSelected = true;
    }
  }
  clearSelectAll() {
    for (const entity of this.project.stage) {
      entity.isSelected = false;
    }
  }
}
