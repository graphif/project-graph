import { Project } from "@/core/Project";
import { sleep } from "@/utils/sleep";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";

const THUMBNAIL_MAX_DIMENSION = 256;

/** 极端宽高比，超过这个比例视为极端 */
const EXTREME_ASPECT_RATIO = 6;

/**
 * 给一个矩形增加padding
 * @param rect
 * @param padding
 * @returns
 */
function padRectangle(rect: Rectangle, padding: number): Rectangle {
  const padVec = new Vector(padding, padding);
  return new Rectangle(rect.leftTop.subtract(padVec), rect.size.add(padVec.multiply(2)));
}

function getStageContentRectangle(project: Project): Rectangle | undefined {
  const rectangles: Rectangle[] = [];

  for (const entity of project.stageManager.getEntities()) {
    if ("collisionBox" in entity && entity.collisionBox && typeof entity.collisionBox.getRectangle === "function") {
      rectangles.push(entity.collisionBox.getRectangle());
    }
  }
  for (const association of project.stageManager.getAssociations()) {
    if (
      "collisionBox" in association &&
      association.collisionBox &&
      typeof association.collisionBox.getRectangle === "function"
    ) {
      rectangles.push(association.collisionBox.getRectangle());
    }
  }

  if (rectangles.length === 0) return undefined;
  return Rectangle.getBoundingRectangle(rectangles);
}

/**
 * 为已加载的 Project 生成缩略图 PNG Blob（整个项目概览）。
 * 会临时调整相机和 Canvas，完成后恢复原状。
 * 如果舞台为空则返回 undefined。
 */
export async function generateThumbnail(project: Project): Promise<Blob | undefined> {
  const contentRect = getStageContentRectangle(project);
  if (!contentRect) return undefined;

  const contentMaxDim = Math.max(contentRect.width, contentRect.height);
  if (contentMaxDim === 0) return undefined;

  const padding = Math.max(20, contentMaxDim * 0.05);
  const paddedRect = padRectangle(contentRect, padding);

  const w = paddedRect.width;
  const h = paddedRect.height;
  const ratio = w === 0 || h === 0 ? Infinity : Math.max(w / h, h / w);
  const useSquare = ratio >= EXTREME_ASPECT_RATIO;
  if (useSquare) {
    toast.warning(
      `舞台上全部内容的外接矩形比例过于极端，超过1:${EXTREME_ASPECT_RATIO}，开始生成正方形缩略图\n建议排查异常内容，可能是在很远的地方创建了节点。可尝试ctrl+A全选后, F键重制视野观察选中的内容`,
    );
  }
  const squareDim = Math.max(paddedRect.width, paddedRect.height);

  const rect = useSquare
    ? new Rectangle(
        paddedRect.center.subtract(new Vector(squareDim / 2, squareDim / 2)),
        new Vector(squareDim, squareDim),
      )
    : paddedRect;

  // 计算缩放比例
  let scaleFactor = 1;
  if (rect.width > THUMBNAIL_MAX_DIMENSION || rect.height > THUMBNAIL_MAX_DIMENSION) {
    const widthRatio = THUMBNAIL_MAX_DIMENSION / rect.width;
    const heightRatio = THUMBNAIL_MAX_DIMENSION / rect.height;
    scaleFactor = Math.min(widthRatio, heightRatio);
  }

  // 保存原始相机状态
  const originalLocation = project.camera.location.clone();
  const originalCurrentScale = project.camera.currentScale;
  const originalTargetScale = project.camera.targetScale;

  // 设置相机
  project.camera.currentScale = scaleFactor;
  project.camera.targetScale = scaleFactor;
  project.camera.location = rect.center;

  // 创建临时Canvas
  const tempCanvas = document.createElement("canvas");
  const deviceScale = window.devicePixelRatio;
  const canvasWidth = Math.min(rect.width * scaleFactor + 2, THUMBNAIL_MAX_DIMENSION + 2);
  const canvasHeight = Math.min(rect.height * scaleFactor + 2, THUMBNAIL_MAX_DIMENSION + 2);
  tempCanvas.width = canvasWidth * deviceScale;
  tempCanvas.height = canvasHeight * deviceScale;
  tempCanvas.style.width = `${canvasWidth}px`;
  tempCanvas.style.height = `${canvasHeight}px`;
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCtx.scale(deviceScale, deviceScale);

  // 保存原Canvas和渲染器尺寸
  const originalCanvas = project.canvas.element;
  const originalCtx = project.canvas.ctx;
  const originalRendererWidth = project.renderer.w;
  const originalRendererHeight = project.renderer.h;

  try {
    project.canvas.element = tempCanvas;
    project.canvas.ctx = tempCtx;
    project.renderer.w = canvasWidth;
    project.renderer.h = canvasHeight;

    project.loop();
    await sleep(200);
    project.pause();

    const blob = await new Promise<Blob>((resolve) => {
      tempCanvas.toBlob((b) => {
        resolve(b ?? new Blob());
      }, "image/png");
    });

    return blob;
  } finally {
    // 恢复原Canvas
    project.canvas.element = originalCanvas;
    project.canvas.ctx = originalCtx;
    project.renderer.w = originalRendererWidth;
    project.renderer.h = originalRendererHeight;

    // 恢复相机
    project.camera.location = originalLocation;
    project.camera.currentScale = originalCurrentScale;
    project.camera.targetScale = originalTargetScale;

    tempCanvas.remove();
  }
}
