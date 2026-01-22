import { Project } from "@/core/Project";
import { MouseTipFeedbackEffect } from "@/core/service/feedbackService/effectEngine/concrete/MouseTipFeedbackEffect";
import { Settings } from "@/core/service/Settings";
import { isMac } from "@/utils/platform";
import { Vector } from "@graphif/data-structures";

export class ControllerCameraMac {
  constructor(protected readonly project: Project) {}

  /**
   * 在mac系统下，判断是否是鼠标滚轮事件
   * @param event 事件对象
   */
  isMouseWheel(event: WheelEvent) {
    // 这里mac暂不考虑侧边横向滚轮。
    if (event.deltaX !== 0 && event.deltaY !== 0) {
      // 斜向滚动肯定不是鼠标滚轮。因为滚轮只有横向滚轮和竖向滚轮
      return false;
    } else {
      // 垂直方向滚动
      const distance = Math.abs(event.deltaY);
      // 在mac系统下

      // 测试者“雨幕”反馈数据：
      // 鼠标滚轮：移动距离是整数
      // 触摸板：小数

      // 测试者“大道”反馈数据：
      // 鼠标滚动一格：整数，会显示好多小数字，4 5 6 7 6 5 4这样的。

      // M4 mackbook实测：
      // 鼠标滚动一格，会显示一格数字 4.63535543
      // 反而是触摸版，会显示 (1, 4), (0, 3) .... 很多小整数向量
      if (Settings.macTrackpadAndMouseWheelDifference === "tarckpadFloatAndWheelInt") {
        if (Number.isInteger(distance)) {
          // 整数距离，是鼠标滚轮
          return true;
        } else {
          // 小数距离，是触摸板
          return false;
        }
      } else if (Settings.macTrackpadAndMouseWheelDifference === "trackpadIntAndWheelFloat") {
        if (Number.isInteger(distance)) {
          return false;
        }
        return true;
      }
      // 无法检测出逻辑
      return false;
    }
  }

  private readonly FINGER_SCALE_MIN_DETECT_TIME = 2; // s
  // 上次检测时间
  private lastDetectTime = Date.now();

  // 默认鼠标滚轮，否则mac鼠标用户一打开文件会缩放过于灵敏
  private currentWheelMode: "fingerScale" | "mouseWheel" = "mouseWheel";
  /**
   * 检测识别双指缩放
   * @param event
   */
  isTouchPadTwoFingerScale(event: WheelEvent): boolean {
    // 上游已经筛选出了斜向移动，现在只需要区分 上下滚动是双指缩放触发的，还是滚轮触发的
    /**
     * 区分逻辑：
     * 双指缩放的第一个触发大小的y通常不到1，极小概率是大于1的（很剧烈的双指缩放的时候）
     * 鼠标滚轮滚动的触发大小的y通常是4.xxxxx一个小数（不开启平滑滚动）
     *
     * 如果触发了一个事件移动不到1，那么后续连续触发的多个事件中都按双指缩放算
     */
    const y = event.deltaY;
    if (Math.abs(y) < 4) {
      // 一定是双指缩放！
      this.currentWheelMode = "fingerScale";
      this.lastDetectTime = Date.now();
      return true;
    } else {
      // 可能是滚轮，也可能是双指缩放的中间过程
      const currentTime = Date.now();
      const diffTime = currentTime - this.lastDetectTime;
      if (diffTime > this.FINGER_SCALE_MIN_DETECT_TIME * 1000) {
        // 间隔过大，认为是滚轮
        this.currentWheelMode = "mouseWheel";
        this.lastDetectTime = currentTime;
        return false;
      } else {
        this.lastDetectTime = currentTime;
        // 间隔时间太短，按照上一次的模式判断
        if (this.currentWheelMode === "fingerScale") {
          return true;
        } else {
          return false;
        }
      }
    }
  }

  /**
   * mac 触发在触摸板上双指缩放的事件
   * @param event
   */
  handleTwoFingerScale(event: WheelEvent) {
    // 获取触发滚轮的鼠标位置
    const mouseLocation = new Vector(event.clientX, event.clientY);
    // 计算鼠标位置在视野中的位置
    const worldLocation = this.project.renderer.transformView2World(mouseLocation);
    this.project.camera.targetLocationByScale = worldLocation;

    // 构建幂函数 y = a ^ x
    // const power = 1.02; // 1.05 有点敏感，1.01 有点迟钝
    const power = Settings.macTrackpadScaleSensitivity * 0.14 + 1.01;
    // y 是 camera 的currentScale
    // 通过y反解x
    const currnetCameraScale = this.project.camera.currentScale;
    const x = Math.log(currnetCameraScale) / Math.log(power);
    // x 根据滚轮事件来变化
    const diffX = event.deltaY * -1;
    const newX = x + diffX;
    // 求解新的 camera scale
    const newCameraScale = Math.pow(power, newX);
    // this.project.camera.currentScale = newCameraScale;
    this.project.camera.targetScale = newCameraScale;
    // this.project.camera.setAllowScaleFollowMouseLocationTicks(2 * 60);
  }

  moveCameraByTouchPadTwoFingerMove(event: WheelEvent) {
    // 过滤 -0
    if (Math.abs(event.deltaX) < 0.01 && Math.abs(event.deltaY) < 0.01) {
      return;
    }
    if (this.project.controller.pressingKeySet.has(" ")) {
      this.handleRectangleSelectByTwoFingerMove(event);
      return;
    } else if (this.project.controller.pressingKeySet.has("meta") && isMac) {
      this.handleDrageMoveEntityByTwoFingerMove(event);
      return;
    }
    const dx = event.deltaX / 400;
    const dy = event.deltaY / 400;
    const diffLocation = new Vector(dx, dy).multiply((Settings.moveAmplitude * 50) / this.project.camera.currentScale);
    this.project.camera.location = this.project.camera.location.add(diffLocation);
    this.project.effects.addEffect(MouseTipFeedbackEffect.directionObject(diffLocation));
  }

  private handleRectangleSelectByTwoFingerMove(event: WheelEvent) {
    const dx = event.deltaX;
    const dy = event.deltaY;
    // TODO: 调用矩形框选
    const rectangle = this.project.rectangleSelect.getRectangle();
    if (rectangle) {
      // 正在框选中
      const selectEndLocation = this.project.rectangleSelect.getSelectEndLocation();
      this.project.rectangleSelect.moveSelecting(
        selectEndLocation.add(new Vector(-dx, -dy).divide(this.project.camera.currentScale)),
      );
    } else {
      // 开始框选
      const mouseLocation = new Vector(event.clientX, event.clientY);
      const worldLocation = this.project.renderer.transformView2World(mouseLocation);
      this.project.rectangleSelect.startSelecting(worldLocation);
    }
  }

  private handleDrageMoveEntityByTwoFingerMove(event: WheelEvent) {
    const dx = event.deltaX;
    const dy = event.deltaY;
    const diffLocation = new Vector(-dx, -dy).divide(this.project.camera.currentScale);
    this.project.entityMoveManager.moveSelectedEntities(diffLocation);
  }
}
