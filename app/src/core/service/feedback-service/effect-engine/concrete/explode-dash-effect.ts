import { Color, mixColors, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Random } from "@/core/algorithm/random";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 * 方块的爆炸粉尘效果
 */
export class ExplodeDashEffect extends Effect {
  ashLocationArray: Vector[] = [];
  ashSpeedArray: Vector[] = [];

  private getDashCountPreEntity(): number {
    // // 说明是按Delete删除的
    // if (project.controller.cutting.warningEntity.length === 0) {
    //   return 0;
    // }

    // // 说明是按鼠标删除的，可以多一些
    // return Math.floor(1000 / project.controller.cutting.warningEntity.length);
    // TODO: 把逻辑移动到render()
    return 30;
  }

  constructor(
    /**
     * 一开始为0，每tick + 1
     */
    public override timeProgress: ProgressNumber,
    public rectangle: Rectangle,
    public color: Color,
  ) {
    super(timeProgress);
    for (let i = 0; i < this.getDashCountPreEntity(); i++) {
      this.ashLocationArray.push(
        new Vector(
          Random.randomFloat(rectangle.left, rectangle.right),
          Random.randomFloat(rectangle.top, rectangle.bottom),
        ),
      );
      this.ashSpeedArray.push(
        this.ashLocationArray[i].subtract(this.rectangle.center).normalize().multiply(Random.randomFloat(0.5, 10)),
      );
    }
  }

  override tick(project: Project) {
    super.tick(project);
    for (let i = 0; i < this.ashLocationArray.length; i++) {
      this.ashLocationArray[i] = this.ashLocationArray[i].add(this.ashSpeedArray[i]);
    }
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    for (const ashLocation of this.ashLocationArray) {
      const viewLocation = project.renderer.transformWorld2View(ashLocation);
      const color = mixColors(
        project.stageStyleManager.currentStyle.StageObjectBorder,
        project.stageStyleManager.currentStyle.StageObjectBorder.toTransparent(),
        this.timeProgress.rate,
      );

      project.renderUtils.renderPixel(viewLocation, color);
    }
  }
}
