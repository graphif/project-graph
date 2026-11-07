import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { PenStroke } from "@/core/stage/stageObject/entity/PenStroke";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";

export class PenStrokeDeletedEffect extends Effect {
  private pathList: Vector[] = [];
  private color: Color = new Color(0, 0, 0);
  private width: number = 1;

  constructor(
    public override timeProgress: ProgressNumber,
    penStroke: PenStroke,
  ) {
    super(timeProgress);
    const segmentList = penStroke.segments;
    this.pathList = penStroke.getPath();
    this.color = penStroke.color;
    this.width = segmentList[0].pressure * 5;
  }

  static fromPenStroke(penStroke: PenStroke): PenStrokeDeletedEffect {
    // 将固定时间设置为50帧（大约0.8秒，假设60FPS）
    // 不再根据路径长度设置进度条最大值
    return new PenStrokeDeletedEffect(new ProgressNumber(0, 50), penStroke);
  }

  override tick(project: Project) {
    super.tick(project);
    // 移除基于路径长度的分段逻辑
    // 简单地使用进度条的进度来控制透明度
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }

    // 渲染整个路径，但使用进度来控制透明度
    project.curveRenderer.renderSolidLineMultiple(
      this.pathList.map((v) => project.renderer.transformWorld2View(v)),
      this.color.toNewAlpha(1 - this.timeProgress.rate), // 随着进度增加，透明度逐渐降低
      this.width * project.camera.currentScale,
    );
  }
}
