import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";

/**
 * 全局遮罩渲染器
 */
export namespace GlobalMaskRenderer {
  /**
   * 渲染鼠标位置的圆形遮罩
   * @param project
   * @param mouseLocation
   * @param reverse
   */
  export function renderCircleMask(project: Project, mouseLocation: { x: number; y: number }, reverse = false) {
    if (Settings.isStealthModeEnabled) {
      const ctx = project.canvas.ctx;
      // 设置合成模式为目标输入模式
      if (reverse) {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "destination-in";
      }
      // 获取鼠标位置
      const mouseX = mouseLocation.x;
      const mouseY = mouseLocation.y;
      // 获取潜行模式半径
      const scopeRadius = Settings.stealthModeScopeRadius;
      // 绘制圆形区域
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, scopeRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 1)"; // 设置填充颜色为完全不透明的黑色
      ctx.fill();
      // 恢复合成模式
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /**
   * 渲染鼠标位置的正方形遮罩
   * @param project
   * @param mouseLocation
   * @param reverse
   */
  export function renderSquareMask(project: Project, mouseLocation: { x: number; y: number }, reverse = false) {
    if (Settings.isStealthModeEnabled) {
      const ctx = project.canvas.ctx;
      // 设置合成模式为目标输入模式
      if (reverse) {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "destination-in";
      }
      // 获取鼠标位置
      const mouseX = mouseLocation.x;
      const mouseY = mouseLocation.y;
      // 获取潜行模式半径作为正方形边长
      const sideLength = Settings.stealthModeScopeRadius;
      // 计算正方形左上角坐标（以鼠标位置为中心）
      const squareX = mouseX - sideLength / 2;
      const squareY = mouseY - sideLength / 2;
      // 绘制正方形区域
      ctx.beginPath();
      ctx.rect(squareX, squareY, sideLength, sideLength);
      ctx.fillStyle = "rgba(0, 0, 0, 1)"; // 设置填充颜色为完全不透明的黑色
      ctx.fill();
      // 恢复合成模式
      ctx.globalCompositeOperation = "source-over";
    }
  }
}
