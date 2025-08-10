import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { easeOutQuint } from "@/core/service/feedbackService/effectEngine/mathTools/easings";
import { Color } from "@graphif/color";
import { ProgressNumber, Vector } from "@graphif/data-structures";

/**
 * 直线连线被斩断的特效
 */
export class EdgeCutEffect extends Effect {
  constructor(
    timeProgress: ProgressNumber,
    delay: number,
    private start: Vector,
    private end: Vector,
    private color: Color,
    private width: number,
  ) {
    super(timeProgress, delay);
  }

  static default(start: Vector, end: Vector, color: Color, width: number) {
    return new EdgeCutEffect(new ProgressNumber(0, 30), 0, start, end, color, width);
  }

  render(project: Project) {
    const midPoint = new Vector((this.start.x + this.end.x) / 2, (this.start.y + this.end.y) / 2);

    // 计算动画进度 (0-1)
    const progress = easeOutQuint(this.timeProgress.rate); // 30帧完成动画

    // 计算两端缩短后的位置
    const leftEnd = new Vector(
      this.start.x + (midPoint.x - this.start.x) * (1 - progress),
      this.start.y + (midPoint.y - this.start.y) * (1 - progress),
    );

    const rightEnd = new Vector(
      this.end.x + (midPoint.x - this.end.x) * (1 - progress),
      this.end.y + (midPoint.y - this.end.y) * (1 - progress),
    );

    // 绘制两端缩短的线条
    project.curveRenderer.renderSolidLine(
      project.renderer.transformWorld2View(this.start),
      project.renderer.transformWorld2View(leftEnd),
      this.color.toNewAlpha(1 - progress),
      this.width * project.camera.currentScale,
    );
    project.curveRenderer.renderSolidLine(
      project.renderer.transformWorld2View(rightEnd),
      project.renderer.transformWorld2View(this.end),
      this.color.toNewAlpha(1 - progress),
      this.width * project.camera.currentScale,
    );
  }
}
