import { Settings } from "@/core/service/Settings";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { CursorNameEnum } from "@/types/cursors";
import { isMac } from "@/utils/platform";
import { Vector } from "@graphif/data-structures";

/**
 * 关系的重新塑性控制器
 *
 * 曾经：旋转图的节点控制器
 * 鼠标按住Ctrl旋转节点
 * 或者拖拽连线旋转
 *
 * 有向边的嫁接
 */
export class ControllerAssociationReshapeClass extends ControllerClass {
  public mousewheel: (event: WheelEvent) => void = (event: WheelEvent) => {
    // 只有当旋转设置启用、按下了正确的键，并且鼠标悬停在文本节点上时，才处理旋转事件
    if (
      Settings.enableCtrlWheelRotateStructure &&
      (isMac
        ? this.project.controller.pressingKeySet.has("meta")
        : this.project.controller.pressingKeySet.has("control"))
    ) {
      const location = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
      const hoverNode = this.project.stageManager.findTextNodeByLocation(location);
      if (hoverNode !== null) {
        // 旋转节点
        if (event.deltaY > 0) {
          this.project.stageNodeRotate.rotateNodeDfs(hoverNode, hoverNode, 10, []);
        } else {
          this.project.stageNodeRotate.rotateNodeDfs(hoverNode, hoverNode, -10, []);
        }
        // 处理完旋转事件后返回
        return;
      }
    }
    // 否则，不处理该事件，让相机控制器处理
    // 这样当旋转设置关闭，或者鼠标不在节点上时，Ctrl+鼠标滚轮可以正常滚动视野
  };

  public lastMoveLocation: Vector = Vector.getZero();

  public mousedown: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (Settings.mouseLeftMode !== "selectAndMove") {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    if (this.project.controller.camera.isPreGrabbingWhenSpace) {
      return;
    }
    const pressWorldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    // 点击
    const clickedAssociation = this.project.stageManager.findAssociationByLocation(pressWorldLocation);
    if (clickedAssociation === null) {
      return;
    }
    const isHaveEntitySelected = this.project.stageManager.getEntities().some((entity) => entity.isSelected);
    if (isHaveEntitySelected) {
      // 如果有实体被选中的情况下，不能拖动关系
      // 这是为了防止：移动质点时，很容易带动边的选中 的情况
      return;
    }
    const isHaveLineEdgeSelected = this.project.stageManager.getLineEdges().some((edge) => edge.isSelected);
    const isHaveMultiTargetEdgeSelected = this.project.stageManager
      .getSelectedAssociations()
      .some((association) => association instanceof MultiTargetUndirectedEdge);

    this.lastMoveLocation = pressWorldLocation.clone();

    if (isHaveLineEdgeSelected) {
      this.project.controller.isMovingEdge = true;

      if (clickedAssociation.isSelected) {
        // E1
        this.project.stageManager.getLineEdges().forEach((edge) => {
          edge.isSelected = false;
        });
      } else {
        // E2
        this.project.stageManager.getLineEdges().forEach((edge) => {
          edge.isSelected = false;
        });
      }
      clickedAssociation.isSelected = true;
    } else if (isHaveMultiTargetEdgeSelected) {
      // 点击了多源无向边
      clickedAssociation.isSelected = true;
    } else {
      // F
      clickedAssociation.isSelected = true;
    }
    this.project.controller.setCursorNameHook(CursorNameEnum.Move);
  };

  public mousemove: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (Settings.mouseLeftMode !== "selectAndMove") {
      return;
    }
    if (this.project.controller.rectangleSelect.isUsing || this.project.controller.cutting.isUsing) {
      return;
    }
    const worldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    if (this.project.controller.isMouseDown[0]) {
      const isControlPressed = isMac
        ? this.project.controller.pressingKeySet.has("meta")
        : this.project.controller.pressingKeySet.has("control");
      const isShiftPressed = this.project.controller.pressingKeySet.has("shift");

      if (isControlPressed && isShiftPressed) {
        // 更改Edge的源节点 (Control+Shift 组合)
        const entity = this.project.stageManager.findConnectableEntityByLocation(worldLocation);
        if (entity !== null) {
          // 找到目标，更改源节点
          this.project.nodeConnector.changeSelectedEdgeSource(entity);
        }
      } else if (isControlPressed) {
        // 更改Edge的目标节点 (仅 Control)
        const entity = this.project.stageManager.findConnectableEntityByLocation(worldLocation);
        if (entity !== null) {
          // 找到目标，更改目标
          this.project.nodeConnector.changeSelectedEdgeTarget(entity);
        }
      } else {
        const diffLocation = worldLocation.subtract(this.lastMoveLocation);
        // 拖拽Edge
        this.project.controller.isMovingEdge = true;
        this.project.stageNodeRotate.moveEdges(this.lastMoveLocation, diffLocation);
        this.project.multiTargetEdgeMove.moveMultiTargetEdge(diffLocation);
      }
      this.lastMoveLocation = worldLocation.clone();
    }
  };

  public mouseup: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (Settings.mouseLeftMode !== "selectAndMove") {
      return;
    }
    if (event.button !== 0) {
      return;
    }

    // 如果是空格键拖拽视野，不要记录历史
    if (this.project.controller.camera.isPreGrabbingWhenSpace || this.project.controller.pressingKeySet.has(" ")) {
      this.project.controller.isMovingEdge = false;
      this.project.controller.setCursorNameHook(CursorNameEnum.Default);
      return;
    }

    if (this.project.controller.isMovingEdge) {
      this.project.historyManager.recordStep(); // 鼠标抬起了，移动结束，记录历史过程
      this.project.controller.isMovingEdge = false;
    }
    this.project.controller.setCursorNameHook(CursorNameEnum.Default);
  };
}
