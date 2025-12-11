import { Project } from "@/core/Project";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { LineEffect } from "@/core/service/feedbackService/effectEngine/concrete/LineEffect";
import { RectangleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleNoteEffect";
import { SoundService } from "@/core/service/feedbackService/SoundService";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { CursorNameEnum } from "@/types/cursors";
import { Direction } from "@/types/directions";
import { isMac } from "@/utils/platform";
import { ProgressNumber, Vector } from "@graphif/data-structures";
import { Line } from "@graphif/shapes";

/**
 * 连线控制器
 * 目前的连接方式：
 * 拖连（可多重）、
 * 左右键点连：右键有点问题
 * 折连、
 * 拖拽再生连（可多重）、
 */
export class ControllerNodeConnectionClass extends ControllerClass {
  private _isControlKeyDown = false;
  private _controlKeyEventRegistered = false;

  private onControlKeyDown = (event: KeyboardEvent) => {
    if (isMac && event.key === "Control" && !this._isControlKeyDown && Settings.macEnableControlToCut) {
      this._isControlKeyDown = true;
      // 模拟鼠标按下事件
      const fakeMouseEvent = new MouseEvent("mousedown", {
        button: 2,
        clientX: MouseLocation.vector().x,
        clientY: MouseLocation.vector().y,
      });
      this.mousedown(fakeMouseEvent);
      this.project.controller.isMouseDown[2] = true;
    }
  };

  private onControlKeyUp = (event: KeyboardEvent) => {
    if (isMac && event.key === "Control" && this._isControlKeyDown && Settings.macEnableControlToCut) {
      this._isControlKeyDown = false;
      // 模拟鼠标松开事件
      const fakeMouseEvent = new MouseEvent("mouseup", {
        button: 2,
        clientX: MouseLocation.vector().x,
        clientY: MouseLocation.vector().y,
      });
      this.mouseup(fakeMouseEvent);
      this.project.controller.isMouseDown[2] = false;
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
  /**
   * 仅限在当前文件中使用的记录
   * 右键点击的位置，仅用于连接检测按下位置和抬起位置是否重叠
   */
  private _lastRightMousePressLocation: Vector = new Vector(0, 0);

  private _isUsing: boolean = false;
  public get isUsing(): boolean {
    return this._isUsing;
  }

  constructor(protected readonly project: Project) {
    super(project);
    this.registerControlKeyEvents();
  }

  dispose() {
    super.dispose();
    this.unregisterControlKeyEvents();
  }
  /**
   * 用于多重连接
   */
  public connectFromEntities: ConnectableEntity[] = [];
  public connectToEntity: ConnectableEntity | null = null;

  private mouseLocations: Vector[] = [];
  public getMouseLocationsPoints(): Vector[] {
    return this.mouseLocations;
  }

  /**
   * 拖拽时左键生成质点
   * @param pressWorldLocation
   */
  public createConnectPointWhenConnect() {
    const pressWorldLocation = this.project.renderer.transformView2World(MouseLocation.vector().clone());
    // 如果是左键，则检查是否在连接的过程中按下
    if (!this.isConnecting()) {
      return;
    }
    if (this.project.stageManager.findConnectableEntityByLocation(pressWorldLocation) !== null) {
      return;
    }
    // 是否是在Section内部双击
    const sections = this.project.sectionMethods.getSectionsByInnerLocation(pressWorldLocation);

    const pointUUID = this.project.nodeAdder.addConnectPoint(pressWorldLocation, sections);
    const connectPoint = this.project.stageManager.getConnectableEntityByUUID(pointUUID) as ConnectPoint;

    // 连向新质点
    for (const fromEntity of this.connectFromEntities) {
      this.project.stageManager.connectEntity(fromEntity, connectPoint);
      this.addConnectEffect(fromEntity, connectPoint);
    }
    this.connectFromEntities = [connectPoint];

    // 选中这个质点
    this.project.stageManager.clearSelectAll();
    // connectPoint.isSelected = true;
  }

  public mousedown: (event: MouseEvent) => void = (event) => {
    if (!(event.button === 2 || event.button === 0)) {
      return;
    }
    if (event.button === 0 && Settings.mouseLeftMode === "connectAndCut") {
      // 把鼠标左键切换为连线模式的情况
      this.onMouseDown(event);
    } else if (event.button === 0 && Settings.mouseLeftMode !== "connectAndCut") {
      // 右键拖拽连线的时候点击左键
      this.createConnectPointWhenConnect();
    } else if (event.button === 2) {
      // if (Stage.mouseRightDragBackground === "moveCamera") {
      //   return;
      // }
      // 正常右键按下
      this.onMouseDown(event);
    }
  };

  // 记录拖拽起始点在图片上的精确位置
  private _startImageLocation: Map<string, Vector> = new Map();
  // 记录拖拽结束点在图片上的精确位置
  private _endImageLocation: Vector | null = null;

  private onMouseDown(event: MouseEvent) {
    const pressWorldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));

    this._lastRightMousePressLocation = pressWorldLocation.clone();

    // 清空之前的轨迹记录
    this.mouseLocations = [pressWorldLocation.clone()];

    const clickedConnectableEntity: ConnectableEntity | null =
      this.project.stageManager.findConnectableEntityByLocation(pressWorldLocation);
    if (clickedConnectableEntity === null) {
      return;
    }

    // 记录起始点在图片或引用块上的精确位置
    if (clickedConnectableEntity instanceof ImageNode || clickedConnectableEntity instanceof ReferenceBlockNode) {
      const rect = clickedConnectableEntity.collisionBox.getRectangle();
      // 计算鼠标在内部的相对位置 (0-1之间)
      const relativeX = (pressWorldLocation.x - rect.location.x) / rect.size.x;
      const relativeY = (pressWorldLocation.y - rect.location.y) / rect.size.y;
      this._startImageLocation.set(clickedConnectableEntity.uuid, new Vector(relativeX, relativeY));
    } else {
      this._startImageLocation.clear();
    }

    // 右键点击了某个节点
    this.connectFromEntities = [];
    for (const node of this.project.stageManager.getConnectableEntity()) {
      if (node.isSelected) {
        this.connectFromEntities.push(node);
      }
    }
    /**
     * 有两种情况：
     * 1. 从框选的节点开始右键拖拽连线，此时需要触发多重连接
     * 2. 从没有框选的节点开始右键拖拽连线，此时不需要触发多重连接
     * ┌───┐┌───┐       ┌───┐┌───┐
     * │┌─┐││┌─┐│ ┌─┐   │┌─┐││┌─┐│ ┌─┐
     * │└─┘││└─┘│ └─┘   │└─┘││└─┘│ └┬┘
     * └─┬─┘└───┘       └───┘└───┘  │
     *   │                          │
     *   │                          │
     *   └──►┌─┐              ┌─┐◄──┘
     *       └─┘              └─┘
     * 右边的方法还是有用的，减少了一步提前框选的操作。
     */
    if (this.connectFromEntities.includes(clickedConnectableEntity)) {
      // 多重连接
      for (const node of this.project.stageManager.getConnectableEntity()) {
        if (node.isSelected) {
          // 特效
          this.project.effects.addEffect(
            new RectangleNoteEffect(
              new ProgressNumber(0, 15),
              node.collisionBox.getRectangle().clone(),
              this.project.stageStyleManager.currentStyle.effects.successShadow.clone(),
            ),
          );
        }
      }
    } else {
      // 不触发多重连接
      // 只触发一次连接
      this.connectFromEntities = [clickedConnectableEntity];
      // 特效
      this.project.effects.addEffect(
        new RectangleNoteEffect(
          new ProgressNumber(0, 15),
          clickedConnectableEntity.collisionBox.getRectangle().clone(),
          this.project.stageStyleManager.currentStyle.effects.successShadow.clone(),
        ),
      );
    }
    // 播放音效
    SoundService.play.connectLineStart();
    this._isUsing = true;
    this.project.controller.setCursorNameHook(CursorNameEnum.Crosshair);
  }

  /**
   * 在mousemove的过程中，是否鼠标悬浮在了目标节点上
   */
  private isMouseHoverOnTarget = false;

  public mousemove: (event: MouseEvent) => void = (event) => {
    if (this.project.controller.rectangleSelect.isUsing || this.project.controller.cutting.isUsing) {
      return;
    }
    if (!this._isUsing) {
      return;
    }
    if (this.project.controller.isMouseDown[0] && Settings.mouseLeftMode === "connectAndCut") {
      this.mouseMove(event);
    }
    if (this.project.controller.isMouseDown[2]) {
      this.mouseMove(event);
    }
  };

  private mouseMove(event: MouseEvent) {
    const worldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    // 添加轨迹
    if (
      this.mouseLocations.length === 0 ||
      this.mouseLocations[this.mouseLocations.length - 1].distance(worldLocation) > 5
    ) {
      this.mouseLocations.push(worldLocation.clone());
    }
    // 连接线
    let isFindConnectToNode = false;
    for (const entity of this.project.stageManager.getConnectableEntity()) {
      if (entity.collisionBox.isContainsPoint(worldLocation)) {
        // 找到了连接的节点，吸附上去
        this.connectToEntity = entity;
        isFindConnectToNode = true;
        if (!this.isMouseHoverOnTarget) {
          SoundService.play.connectFindTarget();
        }
        this.isMouseHoverOnTarget = true;
        break;
      }
    }
    if (!isFindConnectToNode) {
      this.connectToEntity = null;
      this.isMouseHoverOnTarget = false;
    }
    // 由于连接线要被渲染器绘制，所以需要更新总控制里的lastMoveLocation
    this.project.controller.lastMoveLocation = worldLocation.clone();
  }

  public mouseup: (event: MouseEvent) => void = (event) => {
    if (!(event.button === 2 || event.button === 0)) {
      return;
    }
    if (!this.isConnecting()) {
      return;
    }
    if (event.button === 0 && Settings.mouseLeftMode === "connectAndCut") {
      this.mouseUp(event);
    } else if (event.button === 2) {
      this.mouseUp(event);
    }
  };

  private mouseUp(event: MouseEvent) {
    const releaseWorldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    const releaseTargetEntity = this.project.stageManager.findConnectableEntityByLocation(releaseWorldLocation);

    // 记录结束点在图片或引用块上的精确位置
    this._endImageLocation = null;
    if (
      releaseTargetEntity &&
      (releaseTargetEntity instanceof ImageNode || releaseTargetEntity instanceof ReferenceBlockNode)
    ) {
      const rect = releaseTargetEntity.collisionBox.getRectangle();
      // 计算鼠标在内部的相对位置 (0-1之间)
      const relativeX = (releaseWorldLocation.x - rect.location.x) / rect.size.x;
      const relativeY = (releaseWorldLocation.y - rect.location.y) / rect.size.y;
      this._endImageLocation = new Vector(relativeX, relativeY);
    }

    // 根据轨迹判断方向
    let sourceDirection: Direction | null = null;
    let targetDirection: Direction | null = null;

    // 如果开启了根据鼠标轨迹自动调整端点位置的功能，则获取方向信息
    if (Settings.autoAdjustLineEndpointsByMouseTrack) {
      [sourceDirection, targetDirection] = this.getConnectDirectionByMouseTrack();
    }

    // 结束连线
    if (releaseTargetEntity !== null) {
      if (releaseTargetEntity.isSelected) {
        // 如果鼠标释放的节点上是已经选中的节点
        // 区分是拖拽松开连线还是点击松开连线
        if (releaseWorldLocation.distance(this._lastRightMousePressLocation) < 5) {
          // 距离过近，说明是点击事件，不触发连接，让右键菜单触发
        } else {
          // 距离足够远，说明是拖拽事件，完成连线
          if (this.connectToEntity) {
            this.dragMultiConnect(this.connectToEntity, sourceDirection, targetDirection);
          }
        }
      } else {
        // 在目标节点上弹起

        // 区分是拖拽松开连线还是点击松开连线
        if (releaseWorldLocation.distance(this._lastRightMousePressLocation) < 5) {
          // 距离过近，说明是点击事件，而不是拖拽事件
          // 这个可能歪打误撞地被用户触发
          this.clickMultiConnect(releaseWorldLocation);
        } else {
          // 鼠标在待连接节点上抬起
          if (this.connectToEntity) {
            this.dragMultiConnect(this.connectToEntity, sourceDirection, targetDirection);
          }
        }
      }
    } else {
      // 鼠标在空白位置抬起
      // 额外复制一个数组，因为回调函数执行前，这个数组已经被清空了
      const newConnectFromEntities = this.connectFromEntities;

      this.project.controllerUtils.addTextNodeByLocation(releaseWorldLocation, true).then((uuid) => {
        const createdNode = this.project.stageManager.getTextNodeByUUID(uuid) as ConnectableEntity;

        // 让这个新建的节点进入编辑状态
        this.project.controllerUtils.textNodeInEditModeByUUID(uuid);

        for (const fromEntity of newConnectFromEntities) {
          const connectResult = this.project.stageManager.connectEntity(fromEntity, createdNode);
          if (connectResult) {
            this.addConnectEffect(fromEntity, createdNode);
          }
        }
      });
    }
    this.clear();
    this.project.controller.setCursorNameHook(CursorNameEnum.Default);
  }

  /**
   * // 判断轨迹
   * // 根据点状数组生成折线段
   * @returns
   */
  private getConnectDirectionByMouseTrack(): [Direction | null, Direction | null] {
    const lines = [];
    for (let i = 0; i < this.mouseLocations.length - 1; i++) {
      const start = this.mouseLocations[i];
      const end = this.mouseLocations[i + 1];
      lines.push(new Line(start, end));
    }
    // 根据折线段，判断，从选中的实体到目标实体经过的折线段与其交点位置
    let sourceDirection: Direction | null = null;
    let targetDirection: Direction | null = null;

    for (const line of lines) {
      // 寻找源头端点位置
      for (const fromEntity of this.connectFromEntities) {
        if (fromEntity.collisionBox.isContainsPoint(line.start) && !fromEntity.collisionBox.isContainsPoint(line.end)) {
          // 找到了出去的一小段线段
          const rect = fromEntity.collisionBox.getRectangle();
          const intersectionPoint = rect.getLineIntersectionPoint(line);
          // 找到交点，判断交点在哪个方位上
          if (intersectionPoint.y === rect.top) {
            // 从顶部发出
            sourceDirection = Direction.Up;
          } else if (intersectionPoint.y === rect.bottom) {
            // 从底部发出
            sourceDirection = Direction.Down;
          } else if (intersectionPoint.x === rect.left) {
            // 从左侧发出
            sourceDirection = Direction.Left;
          } else if (intersectionPoint.x === rect.right) {
            // 从右侧发出
            sourceDirection = Direction.Right;
          }
        }
      }
      // 寻找目标端点位置
      if (
        this.connectToEntity &&
        this.connectToEntity.collisionBox.isContainsPoint(line.end) &&
        !this.connectToEntity.collisionBox.isContainsPoint(line.start)
      ) {
        // 找到了入来的一小段线段
        const rect = this.connectToEntity.collisionBox.getRectangle();
        const intersectionPoint = rect.getLineIntersectionPoint(line);
        // 找到交点，判断交点在哪个方位上
        if (intersectionPoint.y === rect.top) {
          // 到达顶部
          targetDirection = Direction.Up;
        } else if (intersectionPoint.y === rect.bottom) {
          // 到达底部
          targetDirection = Direction.Down;
        } else if (intersectionPoint.x === rect.left) {
          // 到达左侧
          targetDirection = Direction.Left;
        } else if (intersectionPoint.x === rect.right) {
          // 到达右侧
          targetDirection = Direction.Right;
        }
      }
    }
    return [sourceDirection, targetDirection];
  }

  /**
   * 一种更快捷的连接方法: 节点在选中状态下右键其它节点直接连接，不必拖动
   * issue #135
   * @param releaseWorldLocation
   */
  private clickMultiConnect(releaseWorldLocation: Vector) {
    // 检查是否启用了右键点击连线功能
    if (!Settings.enableRightClickConnect) {
      return;
    }

    // 右键点击位置和抬起位置重叠，说明是右键单击事件，没有发生拖拽现象
    const releaseTargetEntity = this.project.stageManager.findConnectableEntityByLocation(releaseWorldLocation);
    if (!releaseTargetEntity) {
      return;
    }
    const selectedEntities = this.project.stageManager.getConnectableEntity().filter((entity) => entity.isSelected);
    // 还要保证当前舞台有节点被选中
    // 连线
    this.project.stageManager.connectMultipleEntities(selectedEntities, releaseTargetEntity);

    for (const selectedEntity of selectedEntities) {
      this.addConnectEffect(selectedEntity, releaseTargetEntity);
    }
  }

  private clear() {
    // 重置状态
    this.connectFromEntities = [];
    this.connectToEntity = null;
    this._isUsing = false;
    this._startImageLocation.clear();
    this._endImageLocation = null;
  }

  private dragMultiConnect(
    connectToEntity: ConnectableEntity,
    sourceDirection: Direction | null = null,
    targetDirection: Direction | null = null,
  ) {
    // 鼠标在待连接节点上抬起
    // let isHaveConnectResult = false; // 在多重链接的情况下，是否有连接成功

    const isPressC = this.project.controller.pressingKeySet.has("c");
    let sourceRectRate: [number, number] = [0.5, 0.5];

    // 如果是从图片或引用块节点发出，使用精确位置
    const isSingleImageOrReferenceSource =
      this.connectFromEntities.length === 1 &&
      (this.connectFromEntities[0] instanceof ImageNode || this.connectFromEntities[0] instanceof ReferenceBlockNode);

    if (isSingleImageOrReferenceSource) {
      const fromEntity = this.connectFromEntities[0];
      const startPos = this._startImageLocation.get(fromEntity.uuid);
      if (startPos) {
        sourceRectRate = [startPos.x, startPos.y];
      }
    } else {
      // 非图片或引用块节点或多重连接，使用方向计算
      switch (sourceDirection) {
        case Direction.Left:
          sourceRectRate = [0.01, 0.5];
          break;
        case Direction.Right:
          sourceRectRate = [0.99, 0.5];
          break;
        case Direction.Up:
          sourceRectRate = [0.5, 0.01];
          break;
        case Direction.Down:
          sourceRectRate = [0.5, 0.99];
          break;
      }
    }

    // 计算目标位置
    let targetRectRate: [number, number] = [0.5, 0.5];
    // 如果是连接到图片或引用块节点，使用精确位置
    if (
      (connectToEntity instanceof ImageNode || connectToEntity instanceof ReferenceBlockNode) &&
      this._endImageLocation
    ) {
      targetRectRate = [this._endImageLocation.x, this._endImageLocation.y];
    } else {
      // 否则使用方向计算
      switch (targetDirection) {
        case Direction.Left:
          targetRectRate = [0.01, 0.5];
          break;
        case Direction.Right:
          targetRectRate = [0.99, 0.5];
          break;
        case Direction.Up:
          targetRectRate = [0.5, 0.01];
          break;
        case Direction.Down:
          targetRectRate = [0.5, 0.99];
          break;
      }
    }

    // 连线
    this.project.stageManager.connectMultipleEntities(
      this.connectFromEntities,
      connectToEntity,
      isPressC,
      sourceRectRate,
      targetRectRate,
    );

    // 添加连接特效
    for (const entity of this.connectFromEntities) {
      this.addConnectEffect(entity, connectToEntity);
    }

    // 如果端点位置被调整，添加高亮特效
    if (sourceDirection !== null) {
      for (const entity of this.connectFromEntities) {
        const rect = entity.collisionBox.getRectangle();
        let fromLocation: Vector;
        let toLocation: Vector;

        switch (sourceDirection) {
          case Direction.Left:
            fromLocation = new Vector(rect.left, rect.top);
            toLocation = new Vector(rect.left, rect.bottom);
            break;
          case Direction.Right:
            fromLocation = new Vector(rect.right, rect.top);
            toLocation = new Vector(rect.right, rect.bottom);
            break;
          case Direction.Up:
            fromLocation = new Vector(rect.left, rect.top);
            toLocation = new Vector(rect.right, rect.top);
            break;
          case Direction.Down:
            fromLocation = new Vector(rect.left, rect.bottom);
            toLocation = new Vector(rect.right, rect.bottom);
            break;
        }

        this.project.effects.addEffect(LineEffect.rectangleEdgeTip(fromLocation, toLocation));
      }
    }

    if (targetDirection !== null) {
      const rect = connectToEntity.collisionBox.getRectangle();
      let fromLocation: Vector;
      let toLocation: Vector;

      switch (targetDirection) {
        case Direction.Left:
          fromLocation = new Vector(rect.left, rect.top);
          toLocation = new Vector(rect.left, rect.bottom);
          break;
        case Direction.Right:
          fromLocation = new Vector(rect.right, rect.top);
          toLocation = new Vector(rect.right, rect.bottom);
          break;
        case Direction.Up:
          fromLocation = new Vector(rect.left, rect.top);
          toLocation = new Vector(rect.right, rect.top);
          break;
        case Direction.Down:
          fromLocation = new Vector(rect.left, rect.bottom);
          toLocation = new Vector(rect.right, rect.bottom);
          break;
      }

      this.project.effects.addEffect(LineEffect.rectangleEdgeTip(fromLocation, toLocation));
    }
  }

  private isConnecting() {
    return this.connectFromEntities.length > 0 && this._isUsing;
  }

  private addConnectEffect(from: ConnectableEntity, to: ConnectableEntity) {
    for (const effect of this.project.edgeRenderer.getConnectedEffects(from, to)) {
      this.project.effects.addEffect(effect);
    }
  }
}
