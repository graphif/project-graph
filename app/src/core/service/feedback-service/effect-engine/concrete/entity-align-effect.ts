import { mixColors, ProgressNumber, Vector } from "@graphif/data-structures";
import { Line, Rectangle } from "@graphif/shapes";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 * 实体对齐特效
 */
export class EntityAlignEffect extends Effect {
  private lines: Line[] = [];
  static fromEntity(moveRectangle: Rectangle, targetRectangle: Rectangle): EntityAlignEffect {
    return new EntityAlignEffect(new ProgressNumber(0, 20), moveRectangle, targetRectangle);
  }
  constructor(
    public override timeProgress: ProgressNumber,
    moveRectangle: Rectangle,
    targetRectangle: Rectangle,
  ) {
    super(timeProgress);
    const moveEntityRectangle = moveRectangle;
    const targetEntityRectangle = targetRectangle;

    // 两个矩形构成的最小外接矩形
    const twoRectangle = Rectangle.getBoundingRectangle([moveEntityRectangle, targetEntityRectangle]);
    // 计算两个矩形现在是哪里对齐了，是左边缘x轴对齐，还是右边缘x轴对齐，
    // 还是上边缘y轴对齐，还是下边缘y轴对齐
    // 左边缘x对齐检测
    if (moveEntityRectangle.left === targetEntityRectangle.left) {
      // 左边缘x轴对齐，添加一个左边缘线
      this.lines.push(
        new Line(
          new Vector(moveEntityRectangle.left, twoRectangle.top),
          new Vector(moveEntityRectangle.left, twoRectangle.bottom),
        ),
      );
    }
    // 右边缘x轴对齐检测
    if (moveEntityRectangle.right === targetEntityRectangle.right) {
      // 右边缘x轴对齐，添加一个右边缘线
      this.lines.push(
        new Line(
          new Vector(moveEntityRectangle.right, twoRectangle.top),
          new Vector(moveEntityRectangle.right, twoRectangle.bottom),
        ),
      );
    }
    // 中心x轴对齐检测
    if (moveEntityRectangle.center.x === targetEntityRectangle.center.x) {
      // 中心x轴对齐，添加一个竖着的中心线
      this.lines.push(
        new Line(
          new Vector(twoRectangle.center.x, twoRectangle.top),
          new Vector(twoRectangle.center.x, twoRectangle.bottom),
        ),
      );
    }
    // 上边缘y轴对齐检测
    if (moveEntityRectangle.top === targetEntityRectangle.top) {
      // 上边缘y轴对齐，添加一个上边缘线
      this.lines.push(
        new Line(
          new Vector(twoRectangle.left, moveEntityRectangle.top),
          new Vector(twoRectangle.right, moveEntityRectangle.top),
        ),
      );
    }
    // 下边缘y轴对齐检测
    if (moveEntityRectangle.bottom === targetEntityRectangle.bottom) {
      // 下边缘y轴对齐，添加一个下边缘线
      this.lines.push(
        new Line(
          new Vector(twoRectangle.left, moveEntityRectangle.bottom),
          new Vector(twoRectangle.right, moveEntityRectangle.bottom),
        ),
      );
    }
    // 中心y轴对齐检测
    if (moveEntityRectangle.center.y === targetEntityRectangle.center.y) {
      // 中心y轴对齐，添加一个横着的中心线
      this.lines.push(
        new Line(
          new Vector(twoRectangle.left, twoRectangle.center.y),
          new Vector(twoRectangle.right, twoRectangle.center.y),
        ),
      );
    }
  }

  render(project: Project) {
    for (const line of this.lines) {
      project.curveRenderer.renderDashedLine(
        project.renderer.transformWorld2View(line.start),
        project.renderer.transformWorld2View(line.end),
        mixColors(
          project.stageStyleManager.currentStyle.CollideBoxSelected.toSolid(),
          project.stageStyleManager.currentStyle.CollideBoxSelected.clone().toTransparent(),
          1 - this.timeProgress.rate,
        ),
        0.5 * project.camera.currentScale,
        8 * project.camera.currentScale,
      );
    }
  }
}
