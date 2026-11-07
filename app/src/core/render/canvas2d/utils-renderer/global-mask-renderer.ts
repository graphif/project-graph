import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { Vector } from "@graphif/data-structures";

/**
 * 全局遮罩渲染器
 */
export namespace GlobalMaskRenderer {
  export function renderMask(project: Project, mouseLocation: { x: number; y: number }, reverse = false) {
    if (Settings.stealthModeMaskShape === "circle") {
      renderCircleMask(project, mouseLocation, reverse);
    } else if (Settings.stealthModeMaskShape === "square") {
      renderSquareMask(project, mouseLocation, reverse);
    } else if (Settings.stealthModeMaskShape === "topLeft") {
      renderTopLeftQuadrantMask(project, mouseLocation, reverse);
    } else if (Settings.stealthModeMaskShape === "smartContext") {
      renderSmartContextMask(project, mouseLocation, reverse);
    }
  }

  /**
   * 渲染鼠标位置的圆形遮罩
   * @param project
   * @param mouseLocation
   * @param reverse
   */
  function renderCircleMask(project: Project, mouseLocation: { x: number; y: number }, reverse = false) {
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
  function renderSquareMask(project: Project, mouseLocation: { x: number; y: number }, reverse = false) {
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

  /**
   * 渲染鼠标位置的左上角象限遮罩
   * 只显示鼠标左上方的矩形区域
   * @param project
   * @param mouseLocation
   * @param reverse
   */
  function renderTopLeftQuadrantMask(project: Project, mouseLocation: { x: number; y: number }, reverse = false) {
    if (Settings.isStealthModeEnabled) {
      const ctx = project.canvas.ctx;
      // 设置合成模式
      if (reverse) {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "destination-in";
      }

      // 获取鼠标位置
      const mouseX = mouseLocation.x;
      const mouseY = mouseLocation.y;

      // 绘制左上角象限矩形区域
      // 从鼠标位置向左延伸到画布左边缘，向上延伸到画布上边缘
      ctx.beginPath();
      ctx.rect(
        0, // 从画布最左边开始
        0, // 从画布最上边开始
        mouseX, // 宽度到鼠标x位置
        mouseY, // 高度到鼠标y位置
      );
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fill();

      // 恢复合成模式
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /**
   * 渲染鼠标位置的智能上下文遮罩
   * 优先显示最小Section，其次显示悬浮实体范围
   * @param project
   * @param mouseLocation
   * @param reverse
   */
  function renderSmartContextMask(project: Project, mouseLocation: { x: number; y: number }, reverse = false) {
    if (Settings.isStealthModeEnabled) {
      const ctx = project.canvas.ctx;
      // 设置合成模式
      if (reverse) {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "destination-in";
      }

      // 关键修改：将屏幕坐标转换为世界坐标
      const mouseScreenLocation = new Vector(mouseLocation.x, mouseLocation.y);
      const mouseWorldLocation = project.renderer.transformView2World(mouseScreenLocation);

      // 优先级1: 查找鼠标位置所在的最小Section（使用世界坐标）
      const sectionsAtMouse = project.sectionMethods.getSectionsByInnerLocation(mouseWorldLocation);

      if (sectionsAtMouse.length > 0) {
        // 找到了Section，使用第一个（最深的）Section的矩形区域
        const targetSection = sectionsAtMouse[0];
        const worldRect = targetSection.collisionBox.getRectangle();

        // 关键：将世界坐标的矩形转换回屏幕坐标来绘制
        const screenRect = project.renderer.transformWorld2View(worldRect);

        ctx.beginPath();
        ctx.rect(screenRect.location.x, screenRect.location.y, screenRect.size.x, screenRect.size.y);
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.fill();
      } else {
        // 优先级2: 没有Section，查找悬浮的实体（使用世界坐标）
        const hoverEntity = project.stageManager.findEntityByLocation(mouseWorldLocation);

        if (hoverEntity) {
          const worldRect = hoverEntity.collisionBox.getRectangle();

          // 关键：将世界坐标的矩形转换回屏幕坐标来绘制
          const screenRect = project.renderer.transformWorld2View(worldRect);

          ctx.beginPath();
          ctx.rect(screenRect.location.x, screenRect.location.y, screenRect.size.x, screenRect.size.y);
          ctx.fillStyle = "rgba(0, 0, 0, 1)";
          ctx.fill();
        }
        // 优先级3: 如果既没有Section也没有悬浮实体，不绘制任何遮罩（全部隐藏）
      }

      // 恢复合成模式
      ctx.globalCompositeOperation = "source-over";
    }
  }
}
