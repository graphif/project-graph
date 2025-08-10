import { Project, service } from "@/core/Project";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { Settings } from "@/core/service/Settings";
import { Color } from "@graphif/color";
import { Vector } from "@graphif/data-structures";

/**
 * 绘画控制器
 */
@service("drawingControllerRenderer")
export class DrawingControllerRenderer {
  constructor(private readonly project: Project) {}

  /**
   * 渲染预渲染的涂鸦
   */
  renderTempDrawing() {
    const currentStrokeColor = this.project.controller.penStrokeDrawing.getCurrentStrokeColor();

    if (Settings.mouseLeftMode === "draw") {
      // 画鼠标绘制过程，还未抬起鼠标左键的 笔迹
      if (this.project.controller.penStrokeDrawing.currentStroke.length > 0) {
        const startLocation = this.project.controller.penStrokeDrawing.currentStroke[0].startLocation;
        const endLocation = this.project.renderer.transformView2World(MouseLocation.vector());

        // 正在绘制直线
        if (this.project.controller.pressingKeySet.has("shift")) {
          // 垂直于坐标轴的直线
          if (this.project.controller.pressingKeySet.has("control")) {
            const dy = Math.abs(endLocation.y - startLocation.y);
            const dx = Math.abs(endLocation.x - startLocation.x);
            if (dy > dx) {
              // 垂直
              endLocation.x = startLocation.x;
            } else {
              // 水平
              endLocation.y = startLocation.y;
            }

            this.project.curveRenderer.renderSolidLine(
              this.project.renderer.transformWorld2View(startLocation),
              this.project.renderer.transformWorld2View(endLocation),
              currentStrokeColor.a === 0
                ? this.project.stageStyleManager.currentStyle.StageObjectBorder
                : currentStrokeColor,
              this.project.controller.penStrokeDrawing.currentStrokeWidth * this.project.camera.currentScale,
            );
          } else {
            this.project.curveRenderer.renderSolidLine(
              this.project.renderer.transformWorld2View(startLocation),
              MouseLocation.vector(),
              currentStrokeColor.a === 0
                ? this.project.stageStyleManager.currentStyle.StageObjectBorder
                : currentStrokeColor,
              this.project.controller.penStrokeDrawing.currentStrokeWidth * this.project.camera.currentScale,
            );
          }
        } else {
          this.project.curveRenderer.renderPenStroke(
            this.project.controller.penStrokeDrawing.currentStroke.map((segment) => ({
              startLocation: this.project.renderer.transformWorld2View(segment.startLocation),
              endLocation: this.project.renderer.transformWorld2View(segment.endLocation),
              width: segment.width * this.project.camera.currentScale,
            })),
            currentStrokeColor.a === 0
              ? this.project.stageStyleManager.currentStyle.StageObjectBorder
              : currentStrokeColor,
          );
        }
      }
      if (this.project.controller.penStrokeControl.isAdjusting) {
        const circleCenter = this.project.renderer.transformWorld2View(
          this.project.controller.penStrokeControl.startAdjustWidthLocation,
        );
        // 鼠标正在调整状态
        this.project.shapeRenderer.renderCircle(
          circleCenter,
          (this.project.controller.penStrokeDrawing.currentStrokeWidth / 2) * this.project.camera.currentScale,
          currentStrokeColor.a === 0
            ? this.project.stageStyleManager.currentStyle.StageObjectBorder
            : currentStrokeColor,
          Color.Transparent,
          0,
        );
        // 当前粗细显示
        this.project.textRenderer.renderTextFromCenter(
          `2R: ${this.project.controller.penStrokeDrawing.currentStrokeWidth}px`,
          circleCenter.add(
            new Vector(
              0,
              (-(this.project.controller.penStrokeDrawing.currentStrokeWidth / 2) - 40) *
                this.project.camera.currentScale,
            ),
          ),
          24,
          currentStrokeColor.a === 0
            ? this.project.stageStyleManager.currentStyle.StageObjectBorder
            : currentStrokeColor,
        );
      } else {
        // 画跟随鼠标的笔头
        // 如果粗细大于一定程度，则渲染成空心的
        if (this.project.controller.penStrokeDrawing.currentStrokeWidth > 10) {
          this.project.shapeRenderer.renderCircle(
            MouseLocation.vector(),
            (this.project.controller.penStrokeDrawing.currentStrokeWidth / 2) * this.project.camera.currentScale,
            Color.Transparent,
            currentStrokeColor.a === 0
              ? this.project.stageStyleManager.currentStyle.StageObjectBorder
              : currentStrokeColor,
            2 * this.project.camera.currentScale,
          );
        } else {
          this.project.shapeRenderer.renderCircle(
            MouseLocation.vector(),
            (this.project.controller.penStrokeDrawing.currentStrokeWidth / 2) * this.project.camera.currentScale,
            currentStrokeColor.a === 0
              ? this.project.stageStyleManager.currentStyle.StageObjectBorder
              : currentStrokeColor,
            Color.Transparent,
            0,
          );
        }
        // 如果按下shift键，说明正在画直线
        if (this.project.controller.pressingKeySet.has("shift")) {
          this.renderAxisMouse();
        }
      }
    }
  }

  /**
   * 画一个跟随鼠标的巨大十字准星
   * 直线模式
   */
  private renderAxisMouse() {
    // 画一个跟随鼠标的十字准星
    // const crossSize = 2000;

    const crossCenter = MouseLocation.vector();

    // 量角器功能
    // 计算角度，拿到两个世界坐标
    // const startLocation = this.project.controller.penStrokeDrawing.currentStroke[0].startLocation;
    // const endLocation =this.project.renderer.transformView2World(MouseLocation.vector());

    this.renderAngleMouse(crossCenter);
  }

  private diffAngle = 0;

  rotateUpAngle() {
    this.diffAngle += 5;
  }

  rotateDownAngle() {
    this.diffAngle -= 5;
  }

  /**
   * 画跟随鼠标的角度量角器
   */
  private renderAngleMouse(mouseLocation: Vector) {
    const R1 = 50;
    const R2 = 60;
    const R3 = 70;
    for (let i = 0 + this.diffAngle; i < 360 + this.diffAngle; i += 5) {
      let startRadius = R1;
      let remoteRadius = R2;
      if ((i - this.diffAngle) % 15 === 0) {
        remoteRadius = R3;
      }
      if ((i - this.diffAngle) % 30 === 0) {
        startRadius = 10;
        remoteRadius = 200;
      }
      if ((i - this.diffAngle) % 90 === 0) {
        startRadius = 10;
        remoteRadius = 2000;
      }

      const angle = (i * Math.PI) / 180;
      const lineStart = mouseLocation.add(new Vector(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius));
      const lineEnd = mouseLocation.add(new Vector(Math.cos(angle) * remoteRadius, Math.sin(angle) * remoteRadius));
      this.renderLine(lineStart, lineEnd);
    }
  }

  /**
   * 画一条线，专用于在透明状态的时候能清晰的看到线条
   * 因此需要叠两层
   * @param lineStart
   * @param lineEnd
   */
  private renderLine(lineStart: Vector, lineEnd: Vector) {
    this.project.curveRenderer.renderSolidLine(
      lineStart,
      lineEnd,
      this.project.stageStyleManager.currentStyle.Background,
      2,
    );
    this.project.curveRenderer.renderSolidLine(
      lineStart,
      lineEnd,
      this.project.stageStyleManager.currentStyle.effects.successShadow,
      0.5,
    );
  }
}
