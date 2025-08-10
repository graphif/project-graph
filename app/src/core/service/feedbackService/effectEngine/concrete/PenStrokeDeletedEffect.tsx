import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { PenStroke } from "@/core/stage/stageObject/entity/PenStroke";
import { Color } from "@graphif/color";
import { ProgressNumber, Vector } from "@graphif/data-structures";

export class PenStrokeDeletedEffect extends Effect {
  private pathList: Vector[] = [];
  private currentPartList: Vector[] = [];
  private color: Color = new Color(0, 0, 0);
  private width: number = 1;

  constructor(
    public override timeProgress: ProgressNumber,
    penStroke: PenStroke,
  ) {
    super(timeProgress);
    const segmentList = penStroke.getSegmentList();
    this.pathList = penStroke.getPath();
    this.color = penStroke.getColor();
    if (this.color.a === 0) {
      this.color = this.project.stageStyleManager.currentStyle.StageObjectBorder.clone();
    }
    this.width = segmentList[0].width;
  }

  static fromPenStroke(penStroke: PenStroke): PenStrokeDeletedEffect {
    const len = penStroke.getPath().length;
    return new PenStrokeDeletedEffect(new ProgressNumber(0, len), penStroke);
  }

  override tick(project: Project) {
    super.tick(project);
    const currentSep = Math.floor(this.pathList.length * this.timeProgress.rate);
    this.currentPartList = [];
    for (let i = currentSep; i < this.pathList.length; i++) {
      this.currentPartList.push(this.pathList[i]);
    }
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    if (this.currentPartList.length === 0) {
      return;
    }

    project.curveRenderer.renderSolidLineMultiple(
      this.currentPartList.map((v) => project.renderer.transformWorld2View(v)),
      this.color.toNewAlpha(1 - this.timeProgress.rate),
      this.width * project.camera.currentScale,
    );
  }
}
