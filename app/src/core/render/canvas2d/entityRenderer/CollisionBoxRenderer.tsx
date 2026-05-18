import { Color, Vector } from "@graphif/data-structures";
import { Circle, CubicCatmullRomSpline, Line, Rectangle, SymmetryCurve } from "@graphif/shapes";
import { Project, service } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Settings } from "@/core/service/Settings";

/**
 * 碰撞箱渲染器
 */
@service("collisionBoxRenderer")
export class CollisionBoxRenderer {
  constructor(private readonly project: Project) {}

  private isDefaultZoom(): boolean {
    const scale = this.project.camera.currentScale;
    return 0.1 < scale && scale < 4; // 缩小宏观 <--------> 放大围观
    // return scale < 4; // 缩小宏观 <--------> 放大围观
  }

  private get dynamicScale() {
    if (!Settings.enableCollisionBoxAutoWidth) return 1;
    return this.isDefaultZoom() ? this.project.camera.currentScale : 1;
  }

  private get reDynamicScale() {
    if (!Settings.enableCollisionBoxAutoWidth) return 1;
    return this.isDefaultZoom() ? 1 : 1 / this.project.camera.currentScale;
  }

  render(collideBox: CollisionBox, color: Color, dashed: boolean = false) {
    for (const shape of collideBox.shapes) {
      if (shape instanceof Rectangle) {
        if (dashed) {
          this.project.shapeRenderer.renderDashedRect(
            new Rectangle(
              this.project.renderer.transformWorld2View(
                shape.location.subtract(Vector.same(7.5 * this.reDynamicScale)),
              ),
              shape.size.add(Vector.same(15 * this.reDynamicScale)).multiply(this.project.camera.currentScale),
            ),
            Color.Transparent,
            color,
            4 * this.dynamicScale,
            16 * this.dynamicScale,
            8 * this.dynamicScale,
          );
        } else {
          this.project.shapeRenderer.renderRect(
            new Rectangle(
              this.project.renderer.transformWorld2View(
                shape.location.subtract(Vector.same(7.5 * this.reDynamicScale)),
              ),
              shape.size.add(Vector.same(15 * this.reDynamicScale)).multiply(this.project.camera.currentScale),
            ),
            Color.Transparent,
            color,
            8 * this.dynamicScale,
            16 * this.dynamicScale,
          );
        }
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
