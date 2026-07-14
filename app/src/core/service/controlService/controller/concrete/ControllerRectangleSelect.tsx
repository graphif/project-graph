import { Settings } from "@/core/service/Settings";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

export class ControllerRectangleSelectClass extends ControllerClass {
  protected get allowViewerModeInteraction(): boolean {
    return true;
  }

  private _isUsing: boolean = false;
  /**
   * 框选框
   * 这里必须一开始为null，否则报错，can not asses "Rectangle"
   * 这个框选框是基于世界坐标的。
   * 此变量会根据两个点的位置自动更新。
   */
  public selectingRectangle: Rectangle | null = null;

  public get isUsing() {
    return this._isUsing;
  }

  public shutDown() {
    this.project.rectangleSelect.shutDown();
    this._isUsing = false;
  }

  public mouseMoveOutWindowForcedShutdown(mouseLocation: Vector) {
    super.mouseMoveOutWindowForcedShutdown(mouseLocation);
    this.shutDown();
  }

  public mousedown: (event: MouseEvent) => void = (event) => {
    if (this.project.controller.pressingKeySet.has("alt")) {
      // layer moving mode
      return;
    }
    if (Settings.mouseLeftMode !== "selectAndMove") {
      return;
    }
    const button = event.button;
    if (button !== 0) {
      return;
    }
    if (this.project.controller.camera.isPreGrabbingWhenSpace) {
      return;
    }
    const pressWorldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));

    if (this.project.controllerUtils.getClickedStageObject(pressWorldLocation) !== null) {
      // 不是点击在空白处
      return;
    }
    if (this.project.controllerUtils.isClickedResizeRect(pressWorldLocation)) {
      return;
    }

    this._isUsing = true;

    this.project.rectangleSelect.startSelecting(pressWorldLocation);

    const clickedAssociation = this.project.stageManager.findAssociationByLocation(pressWorldLocation);
    if (clickedAssociation !== null) {
      // 在连线身上按下
      this._isUsing = false;
    }
    this.project.controller.rectangleSelect.lastMoveLocation = pressWorldLocation.clone();
  };

  public mousemove: (event: MouseEvent) => void = (event) => {
    if (Settings.mouseLeftMode !== "selectAndMove") {
      return;
    }
    if (!this._isUsing) {
      return;
    }

    if (!this.project.controller.isMouseDown[0]) {
      return;
    }
    const worldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));

    this.project.rectangleSelect.moveSelecting(worldLocation);

    this.project.controller.rectangleSelect.lastMoveLocation = worldLocation.clone();
  };

  /**
   * 当前的框选框的方向
   */
  private isSelectDirectionRight = false;
  // 获取此时此刻应该的框选逻辑
  public getSelectMode(): "contain" | "intersect" {
    if (this.isSelectDirectionRight) {
      return Settings.rectangleSelectWhenLeft;
    } else {
      return Settings.rectangleSelectWhenLeft;
    }
  }

  public mouseup = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    if (Settings.mouseLeftMode !== "selectAndMove") {
      return;
    }
    // 左键松开
    this._isUsing = false;

    // 代替
    this.project.rectangleSelect.endSelecting();
  };
}
