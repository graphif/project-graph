import { Settings } from "@/core/service/Settings";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { Vector } from "@graphif/data-structures";

/**
 * 所有和笔迹控制特定的逻辑都在这里
 */
export class ControllerPenStrokeControlClass extends ControllerClass {
  public isAdjusting = false;
  /**
   * Alt键右键按下时的位置
   */
  public startAdjustWidthLocation: Vector = Vector.getZero();
  /**
   * 在右键移动的过程中，记录上一次的位置
   */
  public lastAdjustWidthLocation: Vector = Vector.getZero();

  public mousedown: (event: MouseEvent) => void = (event) => {
    if (!(event.button === 2 && Settings.mouseLeftMode === "draw")) {
      return;
    }
    if (this.project.controller.camera.isPreGrabbingWhenSpace) {
      return;
    }
    const pressWorldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    if (event.button === 2 && this.project.controller.pressingKeySet.has("alt")) {
      // 右键按下时，开始调整笔刷粗细
      this.startAdjustWidthLocation = pressWorldLocation.clone();
      this.isAdjusting = true;
      this.lastAdjustWidthLocation = pressWorldLocation.clone();
    }
  };

  public mousemove: (event: MouseEvent) => void = (event) => {
    if (Settings.mouseLeftMode === "selectAndMove") {
      // 检查鼠标是否悬浮在笔迹上
      const location = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
      for (const node of this.project.stageManager.getPenStrokes()) {
        node.isMouseHover = false;
        if (node.collisionBox.isContainsPoint(location)) {
          node.isMouseHover = true;
        }
      }
    }
    if (Settings.mouseLeftMode === "draw") {
      if (this.project.controller.pressingKeySet.has("alt") && this.project.controller.isMouseDown[2]) {
        this.onMouseMoveWhenAdjusting(event);
        return;
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public mouseup: (event: MouseEvent) => void = (_event) => {
    if (Settings.mouseLeftMode === "draw") {
      if (this.isAdjusting) {
        this.isAdjusting = false;
      }
    }
  };

  // public mousewheel: (event: WheelEvent) => void = (event) => {
  //   if (Settings.mouseLeftMode !== "draw") {
  //     return;
  //   }
  //   if (this.project.controller.pressingKeySet.has("control")) {
  //     // 控制放大缩小
  //     if (isMac) {
  //       // mac暂不支持滚轮缩放大小
  //       return;
  //     } else {
  //       let newWidth;
  //       if (event.deltaY > 0) {
  //         newWidth = Stage.drawingMachine.currentStrokeWidth + 1;
  //       } else {
  //         newWidth = Stage.drawingMachine.currentStrokeWidth - 1;
  //       }
  //       Stage.drawingMachine.currentStrokeWidth = Math.max(1, Math.min(newWidth, 1000));
  //     }
  //   }
  // };

  private onMouseMoveWhenAdjusting = (event: MouseEvent) => {
    // 更改宽度，检测鼠标上下移动的距离（模仿PS的笔刷粗细调整）
    const currentWorldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));

    // const delta = this.startAdjustWidthLocation.distance(currentWorldLocation);
    let change = 1;
    if (currentWorldLocation.y > this.lastAdjustWidthLocation.y) {
      change *= -1;
    }
    // let delta = this.lastAdjustWidthLocation.distance(currentWorldLocation);
    // // 如果鼠标在往下走，就减小
    // if (currentWorldLocation.y > this.lastAdjustWidthLocation.y) {
    //   delta = -delta;
    // }
    const lastWidth = this.project.controller.penStrokeDrawing.currentStrokeWidth ?? 1;
    // this.project.effects.addEffect(LineEffect.default(this.startAdjustWidthLocation, worldLocation.clone()));
    const newWidth = Math.round(lastWidth + change);

    // 限制宽度范围
    this.project.controller.penStrokeDrawing.currentStrokeWidth = Math.max(1, Math.min(newWidth, 1000));

    // 记录上一次位置
    this.lastAdjustWidthLocation = currentWorldLocation.clone();
  };
}
