import { Color, Vector } from "@graphif/data-structures";
import { Circle, CubicCatmullRomSpline, Diamond, Line, Rectangle, SymmetryCurve } from "@graphif/shapes";
import { Project, service } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";

/**
 * 碰撞箱渲染器
 */
@service("collisionBoxRenderer")
export class CollisionBoxRenderer {
  constructor(private readonly project: Project) {}

  render(collideBox: CollisionBox, color: Color) {
    const scale =
      this.project.camera.currentScale > 0.02
        ? this.project.camera.currentScale
        : this.project.camera.currentScale * 20;
    for (const shape of collideBox.shapes) {
      if (shape instanceof Rectangle) {
        this.project.shapeRenderer.renderRect(
          new Rectangle(
            this.project.renderer.transformWorld2View(shape.location.subtract(Vector.same(7.5))),
            shape.size.add(Vector.same(15)).multiply(this.project.camera.currentScale),
          ),
          Color.Transparent,
          color,
          8 * scale,
          16 * scale,
        );
      } else if (shape instanceof Circle) {
        this.project.shapeRenderer.renderCircle(
          this.project.renderer.transformWorld2View(shape.location),
          (shape.radius + 7.5) * this.project.camera.currentScale,
          Color.Transparent,
          color,
          10 * scale,
        );
      } else if (shape instanceof Diamond) {
        const vertices = shape.getVertices();
        const viewVertices = vertices.map((v) => this.project.renderer.transformWorld2View(v));
        this.project.shapeRenderer.renderPolygonAndFill(viewVertices, Color.Transparent, color, 8 * scale);
      } else if (shape instanceof Line) {
        this.project.curveRenderer.renderSolidLine(
          this.project.renderer.transformWorld2View(shape.start),
          this.project.renderer.transformWorld2View(shape.end),
          color,
          12 * 2 * scale,
        );
      } else if (shape instanceof SymmetryCurve) {
        // shape.endDirection = shape.endDirection.normalize();
        // const size = 15; // 箭头大小
        // shape.end = shape.end.subtract(shape.endDirection.multiply(size / -2));
        this.project.worldRenderUtils.renderSymmetryCurve(shape, color, 10);
      } else if (shape instanceof CubicCatmullRomSpline) {
        this.project.worldRenderUtils.renderCubicCatmullRomSpline(shape, color, 10);
      }
    }
  }
}
