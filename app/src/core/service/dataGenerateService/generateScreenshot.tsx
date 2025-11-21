import { loadAllServicesBeforeInit } from "@/core/loadAllServices";
import { Project } from "@/core/Project";
import { PathString } from "@/utils/pathString";
import { RecentFileManager } from "../dataFileService/RecentFileManager";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { sleep } from "@/utils/sleep";
import { Rectangle } from "@graphif/shapes";

/**
 * 从一个文件中生成截图
 */
export namespace GenerateScreenshot {
  /**
   * 创建临时Canvas并渲染Project
   * @param project 项目实例
   * @param targetRect 目标矩形区域
   * @returns 截图的Blob对象
   */
  async function renderProjectToBlob(project: Project, targetRect: Rectangle): Promise<Blob> {
    // 计算缩放比例，确保最终截图宽高不超过1920
    const maxDimension = 1920;
    let scaleFactor = 1;
    if (targetRect.width > maxDimension || targetRect.height > maxDimension) {
      const widthRatio = maxDimension / targetRect.width;
      const heightRatio = maxDimension / targetRect.height;
      scaleFactor = Math.min(widthRatio, heightRatio);
    }
    project.camera.currentScale = scaleFactor;
    project.camera.targetScale = scaleFactor;

    // 创建临时Canvas
    const tempCanvas = document.createElement("canvas");
    const deviceScale = window.devicePixelRatio;
    const canvasWidth = Math.min(targetRect.width * scaleFactor + 2, maxDimension + 2);
    const canvasHeight = Math.min(targetRect.height * scaleFactor + 2, maxDimension + 2);
    tempCanvas.width = canvasWidth * deviceScale;
    tempCanvas.height = canvasHeight * deviceScale;
    tempCanvas.style.width = `${canvasWidth}px`;
    tempCanvas.style.height = `${canvasHeight}px`;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.scale(deviceScale, deviceScale);

    // 保存原Canvas和渲染器尺寸
    const originalCanvas = project.canvas.element;
    const originalRendererWidth = project.renderer.w;
    const originalRendererHeight = project.renderer.h;

    try {
      // 设置临时Canvas
      project.canvas.element = tempCanvas;
      project.canvas.ctx = tempCtx;
      // 更新渲染器尺寸
      project.renderer.w = canvasWidth;
      project.renderer.h = canvasHeight;

      // 渲染
      project.loop();
      await sleep(1000); // 1s
      project.pause();

      // 将Canvas内容转换为Blob
      const blob = await new Promise<Blob>((resolve) => {
        tempCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(new Blob());
          }
        }, "image/png");
      });

      return blob;
    } finally {
      // 恢复原Canvas
      project.canvas.element = originalCanvas;
      project.canvas.ctx = originalCanvas.getContext("2d")!;
      // 恢复渲染器尺寸
      project.renderer.w = originalRendererWidth;
      project.renderer.h = originalRendererHeight;

      // 清理临时资源
      tempCanvas.remove();
    }
  }

  /**
   * 根据文件名和Section框名生成截图
   * @param fileName 文件名
   * @param sectionName Section框名
   * @returns 截图的Blob对象
   */
  export async function generateSection(fileName: string, sectionName: string): Promise<Blob | undefined> {
    try {
      // 加载项目
      const recentFiles = await RecentFileManager.getRecentFiles();
      const file = recentFiles.find((file) => PathString.getFileNameFromPath(file.uri.fsPath) === fileName);
      if (!file) {
        return undefined;
      }

      const project = new Project(file.uri);
      loadAllServicesBeforeInit(project);
      await project.init();

      // 查找指定名称的Section
      const targetSection = project.stage.find((obj) => obj instanceof Section && obj.text === sectionName);
      if (!targetSection) {
        console.error(`Section框 【${sectionName}】 没有发现 in file ${fileName}`);
        return undefined;
      }

      // 调整相机位置到Section
      const sectionRect = targetSection.collisionBox.getRectangle();
      project.camera.location = sectionRect.center;

      // 渲染并获取截图
      const blob = await renderProjectToBlob(project, sectionRect);

      project.dispose();
      return blob;
    } catch (error) {
      console.error("根据Section生成截图失败", error);
      return undefined;
    }
  }

  /**
   * 生成整个文件内容的广视野截图
   * @param fileName 文件名
   * @returns 截图的Blob对象
   */
  export async function generateFullView(fileName: string): Promise<Blob | undefined> {
    try {
      // 加载项目
      const recentFiles = await RecentFileManager.getRecentFiles();
      const file = recentFiles.find((file) => PathString.getFileNameFromPath(file.uri.fsPath) === fileName);
      if (!file) {
        return undefined;
      }

      const project = new Project(file.uri);
      loadAllServicesBeforeInit(project);
      await project.init();

      // 使用相机的reset方法重置视野，以适应所有内容
      project.camera.reset();

      // 获取整个舞台的边界矩形
      const stageSize = project.stageManager.getSize();
      const stageCenter = project.stageManager.getCenter();
      const fullRect = new Rectangle(stageCenter.subtract(stageSize.divide(2)), stageSize);

      // 渲染并获取截图
      const blob = await renderProjectToBlob(project, fullRect);

      project.dispose();
      return blob;
    } catch (error) {
      console.error("生成广视野截图失败", error);
      return undefined;
    }
  }
}
