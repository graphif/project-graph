import { Color, Vector } from "@graphif/data-structures";
import { Project, service } from "@/core/Project";

/**
 * 一些基础的渲染图形
 * 注意：这些渲染的参数都是View坐标系下的。
 */
@service("renderUtils")
export class RenderUtils {
  constructor(private readonly project: Project) {}

  /**
   * 绘制一个像素点
   * @param location
   * @param color
   */
  renderPixel(location: Vector, color: Color) {
    this.project.canvas.ctx.fillStyle = color.toString();
    this.project.canvas.ctx.fillRect(
      location.x,
      location.y,
      1 * this.project.camera.currentScale,
      1 * this.project.camera.currentScale,
    );
  }

  /**
   * 画箭头（只画头，不画线）
   */
  renderArrow(direction: Vector, location: Vector, color: Color, size: number) {
    /*
    Python 代码：
    self.path = QPainterPath(point_at.to_qt())
        nor = direction.normalize()
        self.path.lineTo((point_at - nor.rotate(20) * arrow_size).to_qt())
        self.path.lineTo((point_at - nor * (arrow_size / 2)).to_qt())
        self.path.lineTo((point_at - nor.rotate(-20) * arrow_size).to_qt())
        self.path.closeSubpath()
    */
    const nor = direction.normalize();
    const arrow_size = size / 2;
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.moveTo(location.x, location.y);
    this.project.canvas.ctx.lineTo(
      location.x - nor.rotate(20).x * arrow_size,
      location.y - nor.rotate(20).y * arrow_size,
    );
    this.project.canvas.ctx.lineTo(location.x - nor.x * (arrow_size / 2), location.y - nor.y * (arrow_size / 2));
    this.project.canvas.ctx.lineTo(
      location.x - nor.rotate(-20).x * arrow_size,
      location.y - nor.rotate(-20).y * arrow_size,
    );
    this.project.canvas.ctx.closePath();
    this.project.canvas.ctx.fillStyle = color.toString();
    this.project.canvas.ctx.fill();
  }
}
