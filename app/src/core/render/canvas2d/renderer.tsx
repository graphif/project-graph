import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { CubicCatmullRomSplineEdge } from "@/core/stage/stageObject/association/CubicCatmullRomSplineEdge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { getTextSize } from "@/utils/font";
import { isFrame, isMac } from "@/utils/platform";
import { Color, mixColors, Vector } from "@graphif/data-structures";
import { CubicBezierCurve, Rectangle } from "@graphif/shapes";

/**
 * 渲染器
 */
@service("renderer")
export class Renderer {
  /**
   * 节点上的文字大小
   */
  static FONT_SIZE = 32;
  /**
   * 节点详细信息的文字大小
   */
  static FONT_SIZE_DETAILS = 18;
  /**
   * 节点详细信息的文字行数限制
   */
  static ENTITY_DETAILS_LIENS_LIMIT = 4;
  static NODE_PADDING = 14;
  /// 节点的圆角半径
  static NODE_ROUNDED_RADIUS = 8;

  /**
   * 节点详细信息最大宽度
   */
  static ENTITY_DETAILS_WIDTH = 200;

  w = 0;
  h = 0;
  // let canvasRect: Rectangle;
  renderedNodes: number = 0;
  renderedEdges: number = 0;

  /**
   * 记录每一项渲染的耗时
   * {
   *   [渲染项的名字]: ?ms
   * }
   */
  private readonly timings: { [key: string]: number } = {};

  deltaTime = 0;

  // 上一次记录fps的时间
  private lastTime = performance.now();
  // 自上一次记录fps以来的帧数是几
  frameCount = 0;
  frameIndex = 0; // 无穷累加
  // 上一次记录的fps数值
  fps = 0;

  /**
   * 解决Canvas模糊问题
   * 它能让画布的大小和屏幕的大小保持一致
   */
  resizeWindow(newW: number, newH: number) {
    const scale = window.devicePixelRatio;
    this.w = newW;
    this.h = newH;
    this.project.canvas.element.width = newW * scale;
    this.project.canvas.element.height = newH * scale;
    this.project.canvas.element.style.width = `${newW}px`;
    this.project.canvas.element.style.height = `${newH}px`;
    this.project.canvas.ctx.scale(scale, scale);
  }

  // 确保这个函数在软件打开的那一次调用
  constructor(private readonly project: Project) {}

  /**
   * 渲染总入口
   * 建议此函数内部的调用就像一个清单一样，全是函数（这些函数都不是export的）。
   * @returns
   */
  tick() {
    if (Settings.isPauseRenderWhenManipulateOvertime) {
      if (!this.project.controller.isManipulateOverTime()) {
        this.tick_();
      }
    } else {
      this.tick_();
    }
  }

  private tick_() {
    this.updateFPS();
    const viewRectangle = this.getCoverWorldRectangle();
    this.renderBackground();
    this.renderMainStageElements(viewRectangle);

    // 潜行模式 - 只显示鼠标周围的一个圆形区域
    if (Settings.isStealthModeEnabled) {
      const ctx = this.project.canvas.ctx;
      // 设置合成模式为目标输入模式
      ctx.globalCompositeOperation = "destination-in";
      // 获取鼠标位置
      const mouseX = MouseLocation.x;
      const mouseY = MouseLocation.y;
      // 获取潜行模式半径
      const scopeRadius = Settings.stealthModeScopeRadius;
      // 绘制圆形区域
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, scopeRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 1)"; // 设置填充颜色为完全不透明的黑色
      ctx.fill();
      // 恢复合成模式
      ctx.globalCompositeOperation = "source-over";
    }

    this.renderViewElements(viewRectangle);
  }

  private renderViewElements(viewRectangle: Rectangle) {
    this.renderSpecialKeys();
    this.renderCenterPointer();
    this.renderPrivacyBoard(viewRectangle);
    this.renderDebugDetails();
  }

  private renderMainStageElements(viewRectangle: Rectangle) {
    // 先渲染主场景
    this.renderStageElementsWithoutReactions(viewRectangle);
    // 交互相关的
    this.project.drawingControllerRenderer.renderTempDrawing();
    this.renderWarningStageObjects();
    this.renderHoverCollisionBox();
    this.renderSelectingRectangle();
    this.renderCuttingLine();
    this.renderConnectingLine();
    this.renderKeyboardOnly();
    this.rendererLayerMovingLine();
    this.project.searchContentHighlightRenderer.render(this.frameIndex);
    // renderViewRectangle(viewRectangle);
  }

  // 渲染一切实体相关的要素
  private renderStageElementsWithoutReactions(viewRectangle: Rectangle) {
    this.project.entityRenderer.renderAllSectionsBackground(viewRectangle);
    this.renderEdges(viewRectangle);
    this.renderEntities(viewRectangle);
    this.project.entityRenderer.renderAllSectionsBigTitle(viewRectangle);
    this.renderTags();
    // debug

    // debugRender();
  }

  // 是否超出了视野之外
  isOverView(viewRectangle: Rectangle, entity: StageObject): boolean {
    if (!Settings.limitCameraInCycleSpace) {
      // 如果没有开循环空间，就要看看是否超出了视野
      return !viewRectangle.isCollideWith(entity.collisionBox.getRectangle());
    }
    // 如果开了循环空间，就永远不算超出视野
    return false;
  }

  // 渲染中心准星
  private renderCenterPointer() {
    if (!Settings.isRenderCenterPointer) {
      return;
    }
    const viewCenterLocation = this.transformWorld2View(this.project.camera.location);
    this.project.shapeRenderer.renderCircle(
      viewCenterLocation,
      1,
      this.project.stageStyleManager.currentStyle.GridHeavy,
      Color.Transparent,
      0,
    );
    for (let i = 0; i < 4; i++) {
      const degrees = i * 90;
      const shortLineStart = viewCenterLocation.add(new Vector(10, 0).rotateDegrees(degrees));
      const shortLineEnd = viewCenterLocation.add(new Vector(20, 0).rotateDegrees(degrees));
      this.project.curveRenderer.renderSolidLine(
        shortLineStart,
        shortLineEnd,
        this.project.stageStyleManager.currentStyle.GridHeavy,
        1,
      );
    }
  }

  private renderPrivacyBoard(viewRectangle: Rectangle) {
    // 画隐私保护边
    if (Settings.protectingPrivacy) {
      this.project.shapeRenderer.renderRect(
        this.transformWorld2View(viewRectangle),
        Color.Transparent,
        new Color(33, 54, 167, 0.5),
        50,
      );
    }
  }
  /** 鼠标hover的边 */
  private renderHoverCollisionBox() {
    for (const edge of this.project.mouseInteraction.hoverEdges) {
      this.project.collisionBoxRenderer.render(
        edge.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxPreSelected,
      );
    }
    for (const section of this.project.mouseInteraction.hoverSections) {
      this.project.collisionBoxRenderer.render(
        section.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxPreSelected,
      );
    }
    for (const multiTargetUndirectedEdge of this.project.mouseInteraction.hoverMultiTargetEdges) {
      this.project.collisionBoxRenderer.render(
        multiTargetUndirectedEdge.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxPreSelected,
      );
    }
    for (const connectPoint of this.project.mouseInteraction.hoverConnectPoints) {
      this.project.collisionBoxRenderer.render(
        connectPoint.collisionBox,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
      );
    }
  }

  /** 框选框 */
  private renderSelectingRectangle() {
    const rectangle = this.project.rectangleSelect.getRectangle();
    if (rectangle) {
      if (
        isMac
          ? this.project.controller.pressingKeySet.has("meta")
          : this.project.controller.pressingKeySet.has("control")
      ) {
        this.project.textRenderer.renderTextInRectangle(
          "!",
          this.transformWorld2View(rectangle),
          this.project.stageStyleManager.currentStyle.SelectRectangleBorder,
        );
      }
      if (this.project.controller.pressingKeySet.has("shift")) {
        this.project.textRenderer.renderTextInRectangle(
          "+",
          this.transformWorld2View(rectangle),
          this.project.stageStyleManager.currentStyle.SelectRectangleBorder,
        );
      }
      const selectMode = this.project.rectangleSelect.getSelectMode();
      if (selectMode === "intersect") {
        this.project.shapeRenderer.renderRect(
          this.transformWorld2View(rectangle),
          this.project.stageStyleManager.currentStyle.SelectRectangleFill,
          this.project.stageStyleManager.currentStyle.SelectRectangleBorder,
          1,
        );
      } else if (selectMode === "contain") {
        this.project.shapeRenderer.renderRect(
          this.transformWorld2View(rectangle),
          this.project.stageStyleManager.currentStyle.SelectRectangleFill,
          Color.Transparent,
          0,
        );
        this.project.shapeRenderer.renderCameraShapeBorder(
          this.transformWorld2View(rectangle),
          this.project.stageStyleManager.currentStyle.SelectRectangleBorder,
          1,
        );
        // 完全覆盖框选的提示
        this.project.textRenderer.renderText(
          "完全覆盖框选",
          this.transformWorld2View(rectangle.leftBottom).add(new Vector(20, 10)),
          10,
          this.project.stageStyleManager.currentStyle.SelectRectangleBorder,
        );
      }
    }
    // if (Stage.selectMachine.isUsing && Stage.selectMachine.selectingRectangle) {
    //   const selectMode = Stage.selectMachine.getSelectMode();
    //   if (selectMode === "intersect") {
    //     this.project.shapeRenderer.renderRect(
    //       Stage.selectMachine.selectingRectangle.transformWorld2View(),
    //       this.project.stageStyleManager.currentStyle.SelectRectangleFill,
    //       this.project.stageStyleManager.currentStyle.SelectRectangleBorder,
    //       1,
    //     );
    //   } else if (selectMode === "contain") {
    //     this.project.shapeRenderer.renderRect(
    //       Stage.selectMachine.selectingRectangle.transformWorld2View(),
    //       this.project.stageStyleManager.currentStyle.SelectRectangleFill,
    //       Color.Transparent,
    //       0,
    //     );
    //     this.project.shapeRenderer.renderCameraShapeBorder(
    //       Stage.selectMachine.selectingRectangle.transformWorld2View(),
    //       this.project.stageStyleManager.currentStyle.SelectRectangleBorder,
    //       1,
    //     );
    //     // 完全覆盖框选的提示
    //     this.project.textRenderer.renderOneLineText(
    //       "完全覆盖框选",
    //       transformWorld2View(Stage.selectMachine.selectingRectangle.leftBottom).add(new Vector(20, 10)),
    //       10,
    //       this.project.stageStyleManager.currentStyle.SelectRectangleBorder,
    //     );
    //   }
    // }
  }
  /** 切割线 */
  private renderCuttingLine() {
    if (this.project.controller.cutting.isUsing && this.project.controller.cutting.cuttingLine) {
      this.project.worldRenderUtils.renderLaser(
        this.project.controller.cutting.cuttingLine.start,
        this.project.controller.cutting.cuttingLine.end,
        2,
        this.project.stageStyleManager.currentStyle.effects.warningShadow,
      );
    }
  }

  /** 手动连接线 */
  private renderConnectingLine() {
    if (this.project.controller.nodeConnection.isUsing) {
      // 如果鼠标位置没有和任何节点相交
      let connectTargetNode = null;
      const mouseLocation = this.transformView2World(MouseLocation.vector());
      for (const node of this.project.stageManager.getConnectableEntity()) {
        if (node.collisionBox.isContainsPoint(mouseLocation)) {
          connectTargetNode = node;
          break;
        }
      }
      if (connectTargetNode === null) {
        for (const node of this.project.controller.nodeConnection.connectFromEntities) {
          this.project.edgeRenderer.renderVirtualEdge(node, mouseLocation);
        }
      } else {
        // 画一条像吸住了的线
        for (const node of this.project.controller.nodeConnection.connectFromEntities) {
          this.project.edgeRenderer.renderVirtualConfirmedEdge(node, connectTargetNode);
        }
      }
      if (Settings.showDebug) {
        // 调试模式下显示右键连线轨迹
        const points = this.project.controller.nodeConnection
          .getMouseLocationsPoints()
          .map((point) => this.transformWorld2View(point));
        if (points.length > 1) {
          this.project.curveRenderer.renderSolidLineMultiple(
            this.project.controller.nodeConnection
              .getMouseLocationsPoints()
              .map((point) => this.transformWorld2View(point)),
            this.project.stageStyleManager.currentStyle.effects.warningShadow,
            1,
          );
        }
      }
    }
  }

  /**
   * 渲染和纯键盘操作相关的功能
   */
  private renderKeyboardOnly() {
    if (this.project.keyboardOnlyGraphEngine.isCreating()) {
      const isHaveEntity = this.project.keyboardOnlyGraphEngine.isTargetLocationHaveEntity();
      for (const node of this.project.stageManager.getTextNodes()) {
        if (node.isSelected) {
          {
            const startLocation = node.rectangle.center;
            const endLocation = this.project.keyboardOnlyGraphEngine.virtualTargetLocation();
            let rate = this.project.keyboardOnlyGraphEngine.getPressTabTimeInterval() / 100;
            rate = Math.min(1, rate);
            const currentLocation = startLocation.add(endLocation.subtract(startLocation).multiply(rate));
            this.project.worldRenderUtils.renderLaser(
              startLocation,
              currentLocation,
              2,
              rate < 1 ? Color.Yellow : isHaveEntity ? Color.Blue : Color.Green,
            );
            if (rate === 1 && !isHaveEntity) {
              this.project.shapeRenderer.renderRectFromCenter(
                this.transformWorld2View(this.project.keyboardOnlyGraphEngine.virtualTargetLocation()),
                120 * this.project.camera.currentScale,
                60 * this.project.camera.currentScale,
                Color.Transparent,
                mixColors(this.project.stageStyleManager.currentStyle.StageObjectBorder, Color.Transparent, 0.5),
                2 * this.project.camera.currentScale,
                Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale,
              );
            }
          }
          let hintText = "松开 “生长自由节点键” 完成新节点创建,IKJL键移动生长位置";
          if (isHaveEntity) {
            hintText = "连接！";
          }
          // 在生成点下方写文字提示
          this.project.textRenderer.renderMultiLineText(
            hintText,
            this.transformWorld2View(
              this.project.keyboardOnlyGraphEngine.virtualTargetLocation().add(new Vector(0, 50)),
            ),
            15 * this.project.camera.currentScale,
            Infinity,
            this.project.stageStyleManager.currentStyle.StageObjectBorder,
          );
        }
      }
    }
  }

  /** 层级移动时，渲染移动指向线 */
  private rendererLayerMovingLine() {
    if (!this.project.controller.layerMoving.isEnabled) {
      return;
    }
    // 有alt
    if (!this.project.controller.pressingKeySet.has("alt")) {
      return;
    }
    // 有alt且仅按下了alt键
    if (this.project.controller.pressingKeySet.size !== 1) {
      return;
    }
    if (this.project.stageManager.getSelectedEntities().length === 0) {
      return;
    }

    const boundingRectangle = Rectangle.getBoundingRectangle(
      this.project.stageManager.getSelectedEntities().map((entity) => {
        return entity.collisionBox.getRectangle();
      }),
    );
    const targetBoundingRectangle = new Rectangle(
      boundingRectangle.location.add(this.project.controller.mouseLocation.subtract(boundingRectangle.location)),
      boundingRectangle.size.clone(),
    );
    const targetSections = this.project.sectionMethods.getSectionsByInnerLocation(
      this.project.controller.mouseLocation,
    );
    for (const targetSection of targetSections) {
      const sectionAndSelectedBoundingRectagnle = Rectangle.getBoundingRectangle([
        targetBoundingRectangle,
        targetSection.collisionBox.getRectangle(),
      ]);
      this.project.shapeRenderer.renderDashedRect(
        new Rectangle(
          this.transformWorld2View(sectionAndSelectedBoundingRectagnle.location),
          sectionAndSelectedBoundingRectagnle.size.multiply(this.project.camera.currentScale),
        ),
        Color.Transparent,
        this.project.stageStyleManager.currentStyle.StageObjectBorder.toNewAlpha(0.8),
        2 * this.project.camera.currentScale,
        Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale,
      );
    }

    this.project.shapeRenderer.renderDashedRect(
      new Rectangle(
        this.transformWorld2View(boundingRectangle.location),
        boundingRectangle.size.multiply(this.project.camera.currentScale),
      ),
      Color.Transparent,
      Color.Green.toNewAlpha(0.5),
      2 * this.project.camera.currentScale,
      Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale,
    );
    this.project.shapeRenderer.renderDashedRect(
      new Rectangle(
        this.transformWorld2View(targetBoundingRectangle.location),
        targetBoundingRectangle.size.multiply(this.project.camera.currentScale),
      ),
      Color.Transparent,
      Color.Green.toNewAlpha(0.5),
      2 * this.project.camera.currentScale,
      Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale,
    );

    this.renderJumpLine(boundingRectangle.leftTop, targetBoundingRectangle.leftTop);
    this.project.textRenderer.renderTextFromCenter(
      "Jump To",
      this.transformWorld2View(this.project.controller.mouseLocation).subtract(new Vector(0, -30)),
      16,
      this.project.stageStyleManager.currentStyle.CollideBoxPreSelected.toSolid(),
    );
  }

  private renderJumpLine(startLocation: Vector, endLocation: Vector) {
    let lineWidth = 8;
    if (this.project.controller.isMouseDown[0]) {
      lineWidth = 16;
    }
    const distance = startLocation.distance(endLocation);
    const height = distance / 2;
    // 影子
    this.project.curveRenderer.renderGradientLine(
      this.transformWorld2View(startLocation),
      this.transformWorld2View(endLocation),
      Color.Transparent,
      new Color(0, 0, 0, 0.2),
      lineWidth * this.project.camera.currentScale,
    );
    this.project.curveRenderer.renderGradientBezierCurve(
      new CubicBezierCurve(
        this.transformWorld2View(startLocation),
        this.transformWorld2View(startLocation.add(new Vector(0, -height))),
        this.transformWorld2View(endLocation.add(new Vector(0, -height))),
        this.transformWorld2View(endLocation),
      ),
      this.project.stageStyleManager.currentStyle.CollideBoxPreSelected.toTransparent(),
      this.project.stageStyleManager.currentStyle.CollideBoxPreSelected.toSolid(),
      lineWidth * this.project.camera.currentScale,
    );
    // 画箭头
    const arrowLen = 10 + distance * 0.01;
    this.project.curveRenderer.renderBezierCurve(
      new CubicBezierCurve(
        this.transformWorld2View(endLocation),
        this.transformWorld2View(endLocation),
        this.transformWorld2View(endLocation),
        this.transformWorld2View(endLocation.add(new Vector(-arrowLen, -arrowLen * 2))),
      ),
      this.project.stageStyleManager.currentStyle.CollideBoxPreSelected.toSolid(),
      lineWidth * this.project.camera.currentScale,
    );
    this.project.curveRenderer.renderBezierCurve(
      new CubicBezierCurve(
        this.transformWorld2View(endLocation),
        this.transformWorld2View(endLocation),
        this.transformWorld2View(endLocation),
        this.transformWorld2View(endLocation.add(new Vector(arrowLen, -arrowLen * 2))),
      ),
      this.project.stageStyleManager.currentStyle.CollideBoxPreSelected.toSolid(),
      lineWidth * this.project.camera.currentScale,
    );
  }

  /** 待删除的节点和边 */
  private renderWarningStageObjects() {
    // 待删除的节点
    for (const node of this.project.controller.cutting.warningEntity) {
      this.project.collisionBoxRenderer.render(
        node.collisionBox,
        this.project.stageStyleManager.currentStyle.effects.warningShadow.toNewAlpha(0.5),
      );
    }
    // 待删除的边
    for (const association of this.project.controller.cutting.warningAssociations) {
      this.project.collisionBoxRenderer.render(
        association.collisionBox,
        this.project.stageStyleManager.currentStyle.effects.warningShadow.toNewAlpha(0.5),
      );
    }
    for (const section of this.project.controller.cutting.warningSections) {
      this.project.collisionBoxRenderer.render(
        section.collisionBox,
        this.project.stageStyleManager.currentStyle.effects.warningShadow.toNewAlpha(0.5),
      );
    }
  }

  /** 画所有被标签了的节点的特殊装饰物和缩小视野时的直观显示 */
  private renderTags() {
    for (const tagString of this.project.tags) {
      const tagObject = this.project.stageManager.get(tagString); // 这不成了ON方了？
      if (!tagObject) {
        continue;
      }
      const rect = tagObject.collisionBox.getRectangle();
      this.project.shapeRenderer.renderPolygonAndFill(
        [
          this.transformWorld2View(rect.leftTop.add(new Vector(0, 8))),
          this.transformWorld2View(rect.leftCenter.add(new Vector(-15, 0))),
          this.transformWorld2View(rect.leftBottom.add(new Vector(0, -8))),
        ],
        new Color(255, 0, 0, 0.5),
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
        2 * this.project.camera.currentScale,
      );
    }
  }
  private renderEntities(viewRectangle: Rectangle) {
    this.renderedNodes = this.project.entityRenderer.renderAllEntities(viewRectangle);
  }

  private renderEdges(viewRectangle: Rectangle) {
    this.renderedEdges = 0;
    for (const association of this.project.stageManager.getAssociations()) {
      if (this.isOverView(viewRectangle, association)) {
        continue;
      }
      if (association instanceof MultiTargetUndirectedEdge) {
        this.project.multiTargetUndirectedEdgeRenderer.render(association);
      }
      if (association instanceof LineEdge) {
        this.project.edgeRenderer.renderLineEdge(association);
      }
      if (association instanceof CubicCatmullRomSplineEdge) {
        this.project.edgeRenderer.renderCrEdge(association);
      }
      this.renderedEdges++;
    }
  }

  /**
   * 渲染背景
   */
  private renderBackground() {
    const rect = this.getCoverWorldRectangle();
    // 先清空一下背景
    this.project.canvas.ctx.clearRect(0, 0, this.w, this.h);
    // 画canvas底色
    this.project.shapeRenderer.renderRect(
      this.transformWorld2View(rect),
      this.project.stageStyleManager.currentStyle.Background.toNewAlpha(Settings.windowBackgroundAlpha),
      Color.Transparent,
      0,
    );
    if (Settings.showBackgroundDots) {
      this.project.backgroundRenderer.renderDotBackground(rect);
    }
    if (Settings.showBackgroundHorizontalLines) {
      this.project.backgroundRenderer.renderHorizonBackground(rect);
    }
    if (Settings.showBackgroundVerticalLines) {
      this.project.backgroundRenderer.renderVerticalBackground(rect);
    }
    if (Settings.showBackgroundCartesian) {
      this.project.backgroundRenderer.renderCartesianBackground(rect);
    }
  }

  /**
   * 每次在frameTick最开始的时候调用一次
   */
  private updateFPS() {
    // 计算FPS
    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000; // s
    this.deltaTime = deltaTime;

    this.frameIndex++;
    const currentTime = performance.now();
    this.frameCount++;
    if (currentTime - this.lastTime > 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }

  /** 画debug信息 */
  private renderDebugDetails() {
    if (!Settings.showDebug || isFrame) {
      return;
    }

    const detailsData = [
      "调试信息已开启，可在设置中关闭，或快捷键关闭",
      `scale: ${this.project.camera.currentScale}`,
      `target: ${this.project.camera.targetScale}`,
      `shake: ${this.project.camera.shakeLocation.toString()}`,
      `location: ${this.project.camera.location.x.toFixed(2)}, ${this.project.camera.location.y.toFixed(2)}`,
      `location: ${this.project.camera.location.x}, ${this.project.camera.location.y}`,
      `window: ${this.w}x${this.h}`,
      `effect count: ${this.project.effects.effectsCount}`,
      `node count: ${this.renderedNodes} , ${this.project.stageManager.getTextNodes().length}`,
      `edge count: ${this.renderedEdges} , ${this.project.stageManager.getLineEdges().length}`,
      `section count: ${this.project.stageManager.getSections().length}`,
      `pressingKeys: ${this.project.controller.pressingKeysString()}`,
      `鼠标按下情况: ${this.project.controller.isMouseDown}`,
      `框选框: ${JSON.stringify(this.project.rectangleSelect.getRectangle())}`,
      `正在切割: ${this.project.controller.cutting.isUsing}`,
      `Stage.warningNodes: ${this.project.controller.cutting.warningEntity.length}`,
      `Stage.warningAssociations: ${this.project.controller.cutting.warningAssociations.length}`,
      `ConnectFromNodes: ${this.project.controller.nodeConnection.connectFromEntities}`,
      `lastSelectedNode: ${this.project.controller.lastSelectedEntityUUID.size}`,
      `粘贴板: ${this.project.copyEngine ? "存在" : "undefined"}`,
      `fps: ${this.fps}`,
      `delta: ${this.deltaTime.toFixed(2)}`,
      `uri: ${decodeURI(this.project.uri.toString())}`,
      `isEnableEntityCollision: ${Settings.isEnableEntityCollision}`,
      ...this.project.historyManager.deltas.map((patch, index) => `history#${index}: ${JSON.stringify(patch)}`),
    ];
    for (const [k, v] of Object.entries(this.timings)) {
      detailsData.push(`render time:${k}: ${v.toFixed(2)}`);
    }
    for (const line of detailsData) {
      this.project.textRenderer.renderTempText(
        line,
        new Vector(10, 80 + detailsData.indexOf(line) * 12),
        10,
        this.project.stageStyleManager.currentStyle.DetailsDebugText,
      );
    }
  }

  /**
   * 渲染左下角的文字
   * @returns
   */
  private renderSpecialKeys() {
    if (this.project.controller.pressingKeySet.size === 0) {
      return;
    }

    const margin = 10;
    let x = margin;
    const fontSize = 30;

    for (const key of this.project.controller.pressingKeySet) {
      const textLocation = new Vector(x, this.h - 100);
      this.project.textRenderer.renderText(
        key,
        textLocation,
        fontSize,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
      );
      const textSize = getTextSize(key, fontSize);
      x += textSize.x + margin;
    }
    if (
      !Settings.allowMoveCameraByWSAD &&
      (this.project.controller.pressingKeySet.has("w") ||
        this.project.controller.pressingKeySet.has("s") ||
        this.project.controller.pressingKeySet.has("a") ||
        this.project.controller.pressingKeySet.has("d"))
    ) {
      this.project.textRenderer.renderText(
        "      方向键移动视野被禁止，可通过快捷键或设置界面松开“手刹”",
        new Vector(margin, this.h - 60),
        15,
        this.project.stageStyleManager.currentStyle.effects.flash,
      );

      this.project.svgRenderer.renderSvgFromLeftTop(
        `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="${this.project.stageStyleManager.currentStyle.effects.warningShadow.toString()}"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M 12 12.5 C12 8.5 12 12 12 9" />
  <path d="M 12 15 C12 15 12 15 12 15" />
  <path d="M 12 18 C15.5 18 18 15.5 18 12" />
  <path d="M 12 6 C8.5 6 6 8.5 6 12" />
  <path d="M 18 12 C18 8.5 15.5 6 12 6" />
  <path d="M 19 18 C21 16 21.5 8.5 19 6" />
  <path d="M 4.5 18 C2.5 16 2.5 8.5 4.5 6" />
  <path d="M 6 12 C6 15.5 8.5 18 12 18" />
</svg>`,
        new Vector(margin, this.h - 60),
        24,
        24,
      );
    }
  }

  /**
   * 将世界坐标转换为视野坐标 (渲染经常用)
   * 可以画图推理出
   * renderLocation + viewLocation = worldLocation
   * 所以
   * viewLocation = worldLocation - renderLocation
   * 但viewLocation是左上角，还要再平移一下
   * @param worldLocation
   * @returns
   */
  transformWorld2View(location: Vector): Vector;
  transformWorld2View(rectangle: Rectangle): Rectangle;
  transformWorld2View(arg1: Vector | Rectangle): Vector | Rectangle {
    if (arg1 instanceof Rectangle) {
      return new Rectangle(
        this.transformWorld2View(arg1.location),
        arg1.size.multiply(this.project.camera.currentScale),
      );
    }
    if (arg1 instanceof Vector) {
      return arg1
        .subtract(this.project.camera.location)
        .multiply(this.project.camera.currentScale)
        .add(new Vector(this.w / 2, this.h / 2))
        .add(this.project.camera.shakeLocation);
    }
    return arg1;
  }

  /**
   * 将视野坐标转换为世界坐标 (处理鼠标点击事件用)
   * 上一个函数的相反，就把上一个顺序倒着来就行了
   * worldLocation = viewLocation + renderLocation
   * @param viewLocation
   * @returns
   */
  transformView2World(location: Vector): Vector;
  transformView2World(rectangle: Rectangle): Rectangle;
  transformView2World(arg1: Vector | Rectangle): Vector | Rectangle {
    if (arg1 instanceof Rectangle) {
      return new Rectangle(this.transformView2World(arg1.location), this.transformView2World(arg1.size));
    }
    if (arg1 instanceof Vector) {
      return arg1
        .subtract(this.project.camera.shakeLocation)
        .subtract(new Vector(this.w / 2, this.h / 2))
        .multiply(1 / this.project.camera.currentScale)
        .add(this.project.camera.location);
    }
    return arg1;
  }

  /**
   * 获取摄像机视野范围内所覆盖住的世界范围矩形
   * 返回的矩形是世界坐标下的矩形
   */
  getCoverWorldRectangle(): Rectangle {
    const size = new Vector(this.w / this.project.camera.currentScale, this.h / this.project.camera.currentScale);
    return new Rectangle(this.project.camera.location.subtract(size.divide(2)), size);
  }
}
