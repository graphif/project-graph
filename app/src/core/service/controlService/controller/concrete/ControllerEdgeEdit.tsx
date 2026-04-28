import { Dialog } from "@/components/ui/dialog";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import type { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { Vector } from "@graphif/data-structures";

/**
 * 包含编辑节点文字，编辑详细信息等功能的控制器
 *
 * 当有节点编辑时，会把摄像机锁定住
 */
export class ControllerEdgeEditClass extends ControllerClass {
  private editEdgeText(clickedLineEdge: Edge, selectAll = true) {
    this.project.controller.isCameraLocked = true;
    // 停止摄像机漂移
    this.project.camera.stopImmediately();

    // clickedLineEdge.isEditing = true;
    const textAreaLocation = this.project.renderer
      .transformWorld2View(clickedLineEdge.textRectangle.location)
      .add(Vector.same(Renderer.NODE_PADDING).multiply(this.project.camera.currentScale));
    this.project.inputElement
      .textarea(
        clickedLineEdge.text,
        (text) => {
          clickedLineEdge?.rename(text);
        },
        {
          position: "fixed",
          resize: "none",
          boxSizing: "border-box",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          left: `${textAreaLocation.x.toFixed(2)}px`,
          top: `${textAreaLocation.y.toFixed(2)}px`,
          fontSize: `${Renderer.FONT_SIZE * this.project.camera.currentScale}px`,
          backgroundColor: this.project.stageStyleManager.currentStyle.Background.toString(),
          color: this.project.stageStyleManager.currentStyle.StageObjectBorder.toString(),
          outline: "solid 1px rgba(255,255,255,0.1)",
          // marginTop: -8 * this.project.camera.currentScale + "px",
        },
        selectAll,
      )
      .then(() => {
        // clickedLineEdge!.isEditing = false;
        // 因为这里用的是不透明文本框，所以不需要停止节点上文字的渲染
        this.project.controller.isCameraLocked = false;
        this.project.historyManager.recordStep();
      });
  }

  private editMultiTargetEdgeText(clickedEdge: MultiTargetUndirectedEdge, selectAll = true) {
    this.project.controller.isCameraLocked = true;
    // 停止摄像机漂移
    this.project.camera.stopImmediately();

    // clickedLineEdge.isEditing = true;
    const textAreaLocation = this.project.renderer
      .transformWorld2View(clickedEdge.textRectangle.location)
      .add(Vector.same(Renderer.NODE_PADDING).multiply(this.project.camera.currentScale));
    this.project.inputElement
      .textarea(
        clickedEdge.text,
        (text) => {
          clickedEdge?.rename(text);
        },
        {
          position: "fixed",
          resize: "none",
          boxSizing: "border-box",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          left: `${textAreaLocation.x.toFixed(2)}px`,
          top: `${textAreaLocation.y.toFixed(2)}px`,
          fontSize: Renderer.FONT_SIZE * this.project.camera.currentScale + "px",
          backgroundColor: this.project.stageStyleManager.currentStyle.Background.toString(),
          color: this.project.stageStyleManager.currentStyle.StageObjectBorder.toString(),
          outline: "solid 1px rgba(255,255,255,0.1)",
          // marginTop: -8 * this.project.camera.currentScale + "px",
        },
        selectAll,
      )
      .then(() => {
        // clickedLineEdge!.isEditing = false;
        // 因为这里用的是不透明文本框，所以不需要停止节点上文字的渲染
        this.project.controller.isCameraLocked = false;
        this.project.historyManager.recordStep();
      });
  }

  mouseDoubleClick = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    if (this.project.controller.camera.isPreGrabbingWhenSpace) {
      return;
    }
    const firstHoverEdge = this.project.mouseInteraction.firstHoverEdge;
    const firstHoverMultiTargetEdge = this.project.mouseInteraction.firstHoverMultiTargetEdge;
    if (!(firstHoverEdge || firstHoverMultiTargetEdge)) {
      return;
    }
    if (firstHoverEdge) {
      // 编辑边上的文字
      this.editEdgeText(firstHoverEdge);
    }
    if (firstHoverMultiTargetEdge) {
      this.editMultiTargetEdgeText(firstHoverMultiTargetEdge);
    }

    return;
  };

  keydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      const selectedEdges = this.project.stageManager.getLineEdges().filter((edge) => edge.isSelected);
      if (selectedEdges.length === 1) {
        setTimeout(() => {
          this.editEdgeText(selectedEdges[0]);
        }); // delay 默认 1ms，防止多输入一个回车
      } else if (selectedEdges.length === 0) {
        return;
      } else {
        Dialog.input("编辑所有选中的边").then((result) => {
          if (!result) return;
          selectedEdges.forEach((edge) => {
            edge.rename(result);
          });
        });
      }
    }
  };
}
