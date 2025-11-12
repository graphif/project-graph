import { Project } from "@/core/Project";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { CircleFlameEffect } from "@/core/service/feedbackService/effectEngine/concrete/CircleFlameEffect";
import { LineCuttingEffect } from "@/core/service/feedbackService/effectEngine/concrete/LineCuttingEffect";
import { PenStrokeDeletedEffect } from "@/core/service/feedbackService/effectEngine/concrete/PenStrokeDeletedEffect";
import { RectangleSplitTwoPartEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleSplitTwoPartEffect";
import { SoundService } from "@/core/service/feedbackService/SoundService";
import { Settings } from "@/core/service/Settings";
import { Association } from "@/core/stage/stageObject/abstract/Association";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";
// import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { PenStroke } from "@/core/stage/stageObject/entity/PenStroke";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { CursorNameEnum } from "@/types/cursors";
import { isMac } from "@/utils/platform";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Line } from "@graphif/shapes";

export class ControllerCuttingClass extends ControllerClass {
  private _controlKeyEventRegistered = false;
  private _isControlKeyDown = false;
  // mac 特性功能
  private onControlKeyDown = (event: KeyboardEvent) => {
    if (isMac && event.key === "Control" && Settings.macEnableControlToCut && !this._isControlKeyDown) {
      this._isControlKeyDown = true;
      this.project.controller.isMouseDown[2] = true;
      // 模拟鼠标按下事件
      const fakeMouseEvent = new MouseEvent("mousedown", {
        button: 2,
        clientX: MouseLocation.vector().x,
        clientY: MouseLocation.vector().y,
      });
      this.mousedown(fakeMouseEvent);
    }
  };

  // mac 特性功能
  private onControlKeyUp = (event: KeyboardEvent) => {
    if (isMac && event.key === "Control" && Settings.macEnableControlToCut && this._isControlKeyDown) {
      this._isControlKeyDown = false;
      this.project.controller.isMouseDown[2] = false;
      // 模拟鼠标松开事件
      const fakeMouseEvent = new MouseEvent("mouseup", {
        button: 2,
        clientX: MouseLocation.vector().x,
        clientY: MouseLocation.vector().y,
      });
      this.mouseup(fakeMouseEvent);
    }
  };

  private registerControlKeyEvents() {
    if (!this._controlKeyEventRegistered) {
      window.addEventListener("keydown", this.onControlKeyDown);
      window.addEventListener("keyup", this.onControlKeyUp);
      this._controlKeyEventRegistered = true;
    }
  }

  private unregisterControlKeyEvents() {
    if (this._controlKeyEventRegistered) {
      window.removeEventListener("keydown", this.onControlKeyDown);
      window.removeEventListener("keyup", this.onControlKeyUp);
      this._controlKeyEventRegistered = false;
    }
  }
  constructor(protected readonly project: Project) {
    super(project);
    this.registerControlKeyEvents();
  }

  dispose() {
    super.dispose();
    this.unregisterControlKeyEvents();
  }

  public cuttingLine: Line = new Line(Vector.getZero(), Vector.getZero());
  public lastMoveLocation = Vector.getZero();
  public warningEntity: Entity[] = [];
  public warningSections: Section[] = [];
  public warningAssociations: Association[] = [];
  // 是否正在使用
  public isUsing = false;

  /**
   * 切割时与实体相交的两点
   */
  private twoPointsMap: Record<string, Vector[]> = {};

  /**
   * 开始绘制斩断线的起点位置
   */
  private cuttingStartLocation = Vector.getZero();

  public mousedown: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (!(event.button == 2 || event.button == 0 || event.button == 1)) {
      return;
    }

    // 左键按下的
    if (event.button === 0 && Settings.mouseLeftMode === "connectAndCut") {
      this.mouseDownEvent(event);
      return;
    }
    // 右键按下的
    if (event.button === 2 && Settings.mouseRightDragBackground === "cut") {
      this.mouseDownEvent(event);
      return;
    }
    // 中键按下的
    if (event.button === 1 && Settings.mouseRightDragBackground === "moveCamera") {
      this.mouseDownEvent(event);
      return;
    }
  };

  private mouseDownEvent(event: MouseEvent) {
    const pressWorldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    this.lastMoveLocation = pressWorldLocation.clone();

    const isClickedEntity = this.project.stageManager.isEntityOnLocation(pressWorldLocation);
    const isClickedAssociation = this.project.stageManager.isAssociationOnLocation(pressWorldLocation);

    if (!isClickedEntity && !isClickedAssociation) {
      // 开始绘制切断线
      this.isUsing = true;
      this.cuttingStartLocation = pressWorldLocation.clone();
      this.cuttingLine = new Line(this.cuttingStartLocation, this.cuttingStartLocation.clone());
      // 添加音效提示
      SoundService.play.cuttingLineStart();
      // 鼠标提示
      this.project.controller.setCursorNameHook(CursorNameEnum.Crosshair);
    } else {
      this.isUsing = false;
    }
  }

  public mousemove: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (!this.isUsing) {
      return;
    }
    if (this.project.controller.penStrokeControl.isAdjusting) {
      this.isUsing = false;
      return;
    }
    // 正在切断线
    this.cuttingLine = new Line(this.cuttingStartLocation, this.lastMoveLocation);

    this.updateWarningObjectByCuttingLine();
    this.lastMoveLocation = this.project.renderer.transformView2World(
      new Vector(event.clientX, event.clientY), // 鼠标位置
    );
    // 渲染器需要
    this.project.controller.lastMoveLocation = this.lastMoveLocation.clone();
  };

  // 删除孤立质点
  private clearIsolationPoint() {
    // 待检测的质点集
    const connectedPoints: ConnectPoint[] = [];
    for (const edge of this.warningAssociations) {
      if (edge instanceof Edge) {
        if (edge.source instanceof ConnectPoint) {
          connectedPoints.push(edge.source);
        }
        if (edge.target instanceof ConnectPoint) {
          connectedPoints.push(edge.target);
        }
      }
    }
    // 检测所有待检测的质点是否是孤立状态
    const prepareDeleteConnectPoints: ConnectPoint[] = [];
    for (const point of connectedPoints) {
      const childCount = this.project.graphMethods.nodeChildrenArray(point).length;
      const parentCount = this.project.graphMethods.nodeParentArray(point).length;
      if (childCount === 0 && parentCount === 0) {
        prepareDeleteConnectPoints.push(point);
      }
    }
    // 开始删除孤立质点
    this.project.stageManager.deleteEntities(prepareDeleteConnectPoints);
  }

  public mouseUpFunction(mouseUpWindowLocation: Vector) {
    this.isUsing = false;
    // 最后再更新一下鼠标位置
    this.lastMoveLocation = this.project.renderer.transformView2World(
      mouseUpWindowLocation, // 鼠标位置
    );
    this.updateWarningObjectByCuttingLine();
    // 鼠标提示解除
    this.project.controller.setCursorNameHook(CursorNameEnum.Default);
    // 删除连线
    for (const edge of this.warningAssociations) {
      this.project.stageManager.deleteAssociation(edge);

      // 2.0 先暂时关闭这个动画，它出bug了，会闪出一条很长的跨越屏幕的直线

      // if (edge instanceof Edge) {
      //   if (edge instanceof LineEdge) {
      //     const effects = this.project.edgeRenderer.getCuttingEffects(edge);
      //     console.log(effects);
      //     this.project.effects.addEffects(effects);
      //   }
      // }
    }
    // 删除实体 （消耗性功能）
    this.project.stageManager.deleteEntities(this.warningEntity);
    // 删除产生的孤立质点（消耗性能）
    this.clearIsolationPoint();
    // 特效
    this.addEffectByWarningEntity();

    if (this.warningEntity.length !== 0 || this.warningAssociations.length !== 0) {
      this.project.stageManager.updateReferences();
    }

    this.warningEntity = [];
    this.warningSections = [];

    this.warningAssociations = [];

    this.project.effects.addEffect(
      new LineCuttingEffect(
        new ProgressNumber(0, 15),
        this.cuttingStartLocation,
        this.lastMoveLocation,
        this.project.stageStyleManager.currentStyle.effects.warningShadow,
        this.project.stageStyleManager.currentStyle.effects.warningShadow,
        this.cuttingStartLocation.distance(this.lastMoveLocation) / 10,
      ),
    );

    // 声音提示
    SoundService.play.cuttingLineRelease();
  }

  public mouseup: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (!(event.button == 2 || event.button == 0 || event.button == 1)) {
      return;
    }
    if (!this.isUsing) {
      return;
    }
    this.mouseUpFunction(new Vector(event.clientX, event.clientY));
  };

  public mouseMoveOutWindowForcedShutdown(outsideLocation: Vector) {
    super.mouseMoveOutWindowForcedShutdown(outsideLocation);
    this.project.controller.cutting.mouseUpFunction(outsideLocation);
  }

  // private clearWarningObject() {
  //   this.warningEntity = [];
  //   this.warningSections = [];
  //   this.warningEdges = [];
  // }

  /**
   * 更新斩断线经过的所有鼠标对象
   *
   * 目前的更新是直接清除所有然后再重新遍历所有对象，后续可以优化
   * 此函数会在鼠标移动被频繁调用，所以需要优化
   */
  private updateWarningObjectByCuttingLine() {
    this.warningEntity = [];

    this.twoPointsMap = {};

    for (const entity of this.project.stageManager.getEntities()) {
      // if (entity instanceof Section) {
      //   continue; // Section的碰撞箱比较特殊
      // }
      if (entity.isHiddenBySectionCollapse) {
        continue; // 隐藏的节点不参与碰撞检测
      }
      if (entity.collisionBox.isIntersectsWithLine(this.cuttingLine)) {
        this.warningEntity.push(entity);
      }

      // 特效
      const collidePoints = entity.collisionBox.getRectangle().getCollidePointsWithLine(this.cuttingLine);

      if (collidePoints.length === 2) {
        this.twoPointsMap[entity.uuid] = collidePoints;
      }

      // 增加两点特效
      for (const collidePoint of collidePoints) {
        this.project.effects.addEffect(
          new CircleFlameEffect(new ProgressNumber(0, 5), collidePoint, 10, new Color(255, 255, 255, 1)),
        );
      }
    }
    this.warningSections = [];
    for (const section of this.project.stageManager.getSections()) {
      if (section.isHiddenBySectionCollapse) {
        continue; // 隐藏的节点不参与碰撞检测
      }
      if (section.collisionBox.isIntersectsWithLine(this.cuttingLine)) {
        this.warningSections.push(section);
      }
    }

    this.warningAssociations = [];
    for (const edge of this.project.stageManager.getAssociations()) {
      if (edge instanceof Edge && edge.isHiddenBySectionCollapse) {
        continue; // 连线被隐藏了
      }
      if (edge.collisionBox.isIntersectsWithLine(this.cuttingLine)) {
        this.warningAssociations.push(edge);
      }
    }
  }

  /**
   * 用于在释放的时候添加特效
   */
  private addEffectByWarningEntity() {
    // 裂开特效
    for (const entity of this.warningEntity) {
      const collidePoints = this.twoPointsMap[entity.uuid];
      if (collidePoints) {
        let fillColor = Color.Transparent;
        if (entity instanceof TextNode) {
          fillColor = entity.color.clone();
        } else if (entity instanceof Section) {
          fillColor = entity.color.clone();
        }

        if (entity instanceof PenStroke) {
          this.project.effects.addEffect(PenStrokeDeletedEffect.fromPenStroke(entity));
        } else {
          this.project.effects.addEffect(
            new RectangleSplitTwoPartEffect(
              entity.collisionBox.getRectangle(),
              collidePoints,
              50,
              fillColor,
              this.project.stageStyleManager.currentStyle.StageObjectBorder,
              2,
            ),
          );
        }
      }
    }
  }
}
