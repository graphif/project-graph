import { mixColors, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Random } from "@/core/algorithm/random";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 *
 */
export class NodeMoveShadowEffect extends Effect {
  pointList: Vector[] = [];
  pointInitSpeedList: Vector[] = [];

  constructor(
    public override timeProgress: ProgressNumber,
    public rectangle: Rectangle,
    public rectangleSpeed: Vector,
  ) {
    super(timeProgress);
    if (rectangleSpeed.magnitude() < 1) {
      return;
    }
    // 框的边缘或内部随机生成点
    for (let i = 0; i < 2; i++) {
      const direction = this.getSpeedMainDirection(this.rectangleSpeed);
      let x, y;
      if (direction === "top") {
        x = Random.randomFloat(this.rectangle.left, this.rectangle.right);
        y = this.rectangle.bottom;
      } else if (direction === "bottom") {
        x = Random.randomFloat(this.rectangle.left, this.rectangle.right);
        y = this.rectangle.top;
      } else if (direction === "left") {
        y = Random.randomFloat(this.rectangle.top, this.rectangle.bottom);
        x = this.rectangle.right;
      } else if (direction === "right") {
        y = Random.randomFloat(this.rectangle.top, this.rectangle.bottom);
        x = this.rectangle.left;
      } else {
        x = Random.randomFloat(this.rectangle.left, this.rectangle.right);
        y = Random.randomFloat(this.rectangle.top, this.rectangle.bottom);
      }

      this.pointList.push(new Vector(x, y));
      this.pointInitSpeedList.push(
        this.rectangleSpeed.multiply(Random.randomFloat(-0.1, -1)).rotateDegrees(Random.randomFloat(-30, 30)),
      );
    }
  }

  override tick(project: Project) {
    super.tick(project);
    // 移动点
    for (let i = 0; i < this.pointList.length; i++) {
      this.pointList[i] = this.pointList[i].add(this.pointInitSpeedList[i].multiply(1 - this.timeProgress.rate));
    }
  }

  /**
   * 将速度方向转换为垂直坐标轴的方向，按照最可能的方向返回
   */
  getSpeedMainDirection(speed: Vector): "top" | "bottom" | "left" | "right" {
    if (Math.abs(speed.y) > Math.abs(speed.x)) {
      // y轴更重要
      if (speed.y > 0) {
        return "bottom";
      } else if (speed.y < 0) {
        return "top";
      }
    } else {
      // x轴更重要
      if (speed.x > 0) {
        return "right";
      } else if (speed.x < 0) {
        return "left";
      }
    }
    // 不可能走到这里
    return "top";
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    for (const point of this.pointList) {
      const viewLocation = project.renderer.transformWorld2View(point);
      const color = mixColors(
        project.stageStyleManager.currentStyle.effects.flash,
        project.stageStyleManager.currentStyle.effects.flash.toTransparent(),
        this.timeProgress.rate,
      );

      project.renderUtils.renderPixel(viewLocation, color);
    }
  }
}
