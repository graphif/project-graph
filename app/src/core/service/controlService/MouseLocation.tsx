import { Vector } from "@graphif/data-structures";

export const MouseLocation = {
  x: 0,
  y: 0,
  clientX: 0,
  clientY: 0,
  init() {
    window.addEventListener("pointermove", (event) => {
      MouseLocation.clientX = event.clientX;
      MouseLocation.clientY = event.clientY;
      if (event.target instanceof HTMLCanvasElement) {
        const rect = event.target.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          MouseLocation.x = ((event.clientX - rect.left) * event.target.clientWidth) / rect.width;
          MouseLocation.y = ((event.clientY - rect.top) * event.target.clientHeight) / rect.height;
        }
      }
      // this.project.controller.recordManipulate();
      // 检测是否超出范围
      // TODO: 优化，给每个 Controller 加一个 pointerMoveOutWindowForcedShutdown 方法
      // if (this.x < 0 || this.x > window.innerWidth || this.y < 0 || this.y > window.innerHeight) {
      //   if (this.project.controller.cutting.isUsing) {
      //     this.project.controller.cutting.pointerMoveOutWindowForcedShutdown(this.vectorObject);
      //   }
      //   if (this.project.controller.camera.isUsingMouseGrabMove) {
      //     this.project.controller.camera.pointerMoveOutWindowForcedShutdown(this.vectorObject);
      //   }
      //   if (this.project.controller.rectangleSelect.isUsing) {
      //     this.project.controller.rectangleSelect.pointerMoveOutWindowForcedShutdown(this.vectorObject);
      //   }
      //   this.project.controller.entityClickSelectAndMove.pointerMoveOutWindowForcedShutdown(this.vectorObject);
      // }
    });
  },
  /**
   * 返回视野坐标系中的鼠标位置
   * 注意：此处返回的是 view 坐标系中的位置
   * @returns
   */
  vector(): Vector {
    return new Vector(this.x, this.y);
  },
  clientVector(): Vector {
    return new Vector(this.clientX, this.clientY);
  },
};
