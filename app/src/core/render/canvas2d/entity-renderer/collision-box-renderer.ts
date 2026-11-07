import { Color, Vector } from "@graphif/data-structures";
import { Circle, CubicCatmullRomSpline, Line, Rectangle, SymmetryCurve } from "@graphif/shapes";
import { Project, service } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Settings } from "@/core/service/Settings";

/**
 * 碰撞箱渲染器
 */
@service("collisionBoxRenderer")
export class CollisionBoxRenderer {
  constructor(private readonly project: Project) {}

  private get dynamicScale() {
    if (!Settings.enableCollisionBoxAutoWidth) return 1;
    return this.project.camera.isDefaultZoom() ? this.project.camera.currentScale : 1;
  }

  private get reDynamicScale() {
    if (!Settings.enableCollisionBoxAutoWidth) return 1;
    return this.project.camera.isDefaultZoom() ? 1 : 1 / this.project.camera.currentScale;
  }

  private renderRectangleOutline(shape: Rectangle, color: Color, dashed: boolean = false) {
    const viewRect = new Rectangle(
      this.project.renderer.transformWorld2View(shape.location.subtract(Vector.same(5 * this.reDynamicScale))),
      shape.size.add(Vector.same(10 * this.reDynamicScale)).multiply(this.project.camera.currentScale),
    );
    if (dashed) {
      this.project.shapeRenderer.renderDashedRect(
        viewRect,
        Color.Transparent,
        color,
        2 * this.dynamicScale,
        Renderer.NODE_ROUNDED_RADIUS + 5 * this.dynamicScale,
        5 * this.dynamicScale,
      );
    } else {
      this.project.shapeRenderer.renderRect(
        viewRect,
        Color.Transparent,
        color,
        2 * this.dynamicScale,
        Renderer.NODE_ROUNDED_RADIUS + 5 * this.dynamicScale,
      );
    }
  }

  render(collideBox: CollisionBox, color: Color, dashed: boolean = false) {
    if (collideBox.shapes.length > 0 && collideBox.shapes.every((shape) => shape instanceof Line)) {
      const ctx = this.project.canvas.ctx;
      ctx.save();
      ctx.beginPath();
      let previousEnd: Vector | undefined;
      for (const line of collideBox.shapes) {
        const start = this.project.renderer.transformWorld2View(line.start);
        const end = this.project.renderer.transformWorld2View(line.end);
        if (!previousEnd || previousEnd.x !== start.x || previousEnd.y !== start.y) {
          ctx.moveTo(start.x, start.y);
        }
        ctx.lineTo(end.x, end.y);
        previousEnd = end;
      }
      ctx.lineWidth = 8 * this.dynamicScale;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = color.toString();
      ctx.setLineDash(dashed ? [5 * this.dynamicScale, 5 * this.dynamicScale] : []);
      // 一次描边避免半透明线段的端点反复叠色。
      ctx.stroke();
      ctx.restore();
      return;
    }
    const hasRectangle = collideBox.shapes.some((s) => s instanceof Rectangle);
    const hasLine = collideBox.shapes.some((s) => s instanceof Line);
    if (hasRectangle && hasLine) {
      this.renderRectangleOutline(collideBox.getRectangle(), color, dashed);
      return;
    }
    for (const shape of collideBox.shapes) {
      if (shape instanceof Rectangle) {
        this.renderRectangleOutline(shape, color, dashed);
      } else if (shape instanceof Circle) {
        this.project.shapeRenderer.renderCircle(
          this.project.renderer.transformWorld2View(shape.location),
          (shape.radius + 7.5) * this.project.camera.currentScale,
          Color.Transparent,
          color,
          10 * this.dynamicScale,
        );
      } else if (shape instanceof Line) {
        this.project.curveRenderer.renderSolidLine(
          this.project.renderer.transformWorld2View(shape.start),
          this.project.renderer.transformWorld2View(shape.end),
          color,
          12 * 2 * this.dynamicScale,
        );
      } else if (shape instanceof SymmetryCurve) {
        // shape.endDirection = shape.endDirection.normalize();
        // const size = 15; // 箭头大小
        // shape.end = shape.end.subtract(shape.endDirection.multiply(size / -2));
        this.project.worldRenderUtils.renderSymmetryCurve(shape, color, 10 * this.dynamicScale);
        // this.project.curveRenderer.renderBezierCurve(shape.bezier, color, 10 * this.dynamicScale);
      } else if (shape instanceof CubicCatmullRomSpline) {
        this.project.worldRenderUtils.renderCubicCatmullRomSpline(shape, color, 10 * this.dynamicScale);
      }
    }
  }
}
