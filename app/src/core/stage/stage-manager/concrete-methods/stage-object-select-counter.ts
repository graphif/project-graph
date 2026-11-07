import { Project, service } from "@/core/Project";
import { Association } from "@/core/stage/stageObject/abstract/Association";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { CubicCatmullRomSplineEdge } from "@/core/stage/stageObject/association/CubicCatmullRomSplineEdge";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";

/**
 * 实时记录选中的各种类型的对象的数量
 * 用于工具栏实时切换按钮的显示
 *
 * 现在2.0已经废弃了，因为有右键菜单了
 */
@service("stageObjectSelectCounter")
export class StageObjectSelectCounter {
  constructor(private readonly project: Project) {}

  // 用于UI层监测
  selectedStageObjectCount = 0;
  selectedEntityCount = 0;
  selectedAssociationCount = 0;
  selectedEdgeCount = 0;
  selectedCREdgeCount = 0;
  selectedImageNodeCount = 0;
  selectedTextNodeCount = 0;
  selectedSectionCount = 0;
  selectedMultiTargetUndirectedEdgeCount = 0;

  /**
   * 上次更新时间
   * 防止频繁更新，影响性能
   */
  private lastUpdateTimestamp = 0;

  update() {
    console.time("updateCount");
    if (Date.now() - this.lastUpdateTimestamp < 10) {
      return;
    }
    this.lastUpdateTimestamp = Date.now();

    // 刷新UI层的选中数量
    this.selectedStageObjectCount = 0;
    this.selectedEntityCount = 0;
    this.selectedEdgeCount = 0;
    this.selectedCREdgeCount = 0;
    this.selectedImageNodeCount = 0;
    this.selectedTextNodeCount = 0;
    this.selectedSectionCount = 0;
    this.selectedAssociationCount = 0;
    this.selectedMultiTargetUndirectedEdgeCount = 0;

    for (const stageObject of this.project.stageManager.getStageObjects()) {
      if (!stageObject.isSelected) {
        continue;
      }
      this.selectedStageObjectCount++;
      if (stageObject instanceof Entity) {
        this.selectedEntityCount++;
        if (stageObject instanceof ImageNode) {
          this.selectedImageNodeCount++;
        } else if (stageObject instanceof TextNode) {
          this.selectedTextNodeCount++;
        } else if (stageObject instanceof Section) {
          this.selectedSectionCount++;
        }
      } else if (stageObject instanceof Association) {
        this.selectedAssociationCount++;
        if (stageObject instanceof MultiTargetUndirectedEdge) {
          this.selectedMultiTargetUndirectedEdgeCount++;
        }
        if (stageObject instanceof Edge) {
          this.selectedEdgeCount++;
          if (stageObject instanceof CubicCatmullRomSplineEdge) {
            this.selectedCREdgeCount++;
          }
        }
      }
    }
    console.timeEnd("updateCount");
  }
}
