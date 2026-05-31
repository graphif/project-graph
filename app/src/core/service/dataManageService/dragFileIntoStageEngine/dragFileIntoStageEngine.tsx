import { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { readFile, stat } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import { onOpenFile } from "../../GlobalMenu";
import { PathString } from "@/utils/pathString";
import { DetailsManager } from "@/core/stage/stageObject/tools/entityDetailsManager";
import { Settings } from "@/core/service/Settings";

/**
 * 处理文件拖拽到舞台的引擎
 */
export namespace DragFileIntoStageEngine {
  /**
   * 处理文件拖拽到舞台，对各种类型的文件分类讨论
   * @param project 当前活动的项目
   * @param pathList 拖拽的文件路径列表
   */
  export async function handleDrop(project: Project, pathList: string[]) {
    try {
      const imageTypeSet = new Set(["png", "jpg", "jpeg", "webp"]);
      const imagePaths: string[] = [];
      for (const filePath of pathList) {
        const extName = filePath.split(".").pop()?.toLowerCase() ?? "";
        if (imageTypeSet.has(extName)) {
          imagePaths.push(filePath);
        }
      }

      const sortedImagePaths = await sortFileList(imagePaths);

      let imageIndex = 0;
      for (const filePath of pathList) {
        const extName = filePath.split(".").pop()?.toLowerCase();
        if (extName === "png") {
          await handleDropImage(project, sortedImagePaths[imageIndex], "image/png", imageIndex);
          imageIndex++;
        } else if (extName === "jpg" || extName === "jpeg") {
          await handleDropImage(project, sortedImagePaths[imageIndex], "image/jpeg", imageIndex);
          imageIndex++;
        } else if (extName === "webp") {
          await handleDropImage(project, sortedImagePaths[imageIndex], "image/webp", imageIndex);
          imageIndex++;
        } else if (extName === "txt") {
          handleDropTxt(project, filePath);
        } else if (extName === "svg") {
          handleDropSvg(project, filePath);
        } else if (extName === "prg") {
          const uri = URI.file(filePath);
          onOpenFile(uri, "拖拽prg文件到舞台");
        } else {
          toast.error(`不支持的文件类型: 【${extName}】`);
        }
      }
    } catch (error) {
      toast.error(`处理拖拽文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据设置对文件列表排序
   */
  async function sortFileList(fileList: string[]): Promise<string[]> {
    const order = Settings.imageImportOrder;
    if (order === "path") {
      return [...fileList].sort();
    }
    // order === "mtime", sort by file modification time ascending
    const entries = await Promise.all(
      fileList.map(async (p) => ({ path: p, mtime: (await stat(p)).mtime?.getTime() ?? 0 })),
    );
    entries.sort((a, b) => a.mtime - b.mtime);
    return entries.map((e) => e.path);
  }

  /**
   * 把文件的绝对路径拖拽到舞台，生成一个文本节点
   * @param project
   * @param filePath 绝对路径
   */
  export async function handleDropFileAbsolutePath(project: Project, pathList: string[]) {
    for (const filePath of pathList) {
      let processedItem = filePath.trim();
      if (
        (processedItem.startsWith('"') && processedItem.endsWith('"')) ||
        (processedItem.startsWith("'") && processedItem.endsWith("'"))
      ) {
        if (processedItem.length >= 2) {
          processedItem = processedItem.slice(1, -1).trim();
        }
      }

      const { emoji, name } = PathString.getEmojiAndNameByPath(processedItem);

      const textNode = new TextNode(project, {
        text: `${emoji}${name}`,
        details: DetailsManager.markdownToDetails(processedItem),
        collisionBox: new CollisionBox([new Rectangle(project.camera.location.clone(), Vector.getZero())]),
      });

      project.stageManager.add(textNode);
    }
  }

  /**
   * 把文件的相对路径拖拽到舞台，生成一个文本节点
   * @param project
   * @param filePath 相对路径
   */
  export async function handleDropFileRelativePath(project: Project, pathList: string[]) {
    if (project.isDraft) {
      toast.error("草稿是未保存文件，没有路径，不能用相对路径导入");
      return;
    }
    // windows 的fsPath大概率是  d:/ 小写的盘符
    const currentProjectPath = PathString.uppercaseAbsolutePathDiskChar(project.uri.fsPath);

    for (const filePath of pathList) {
      const relativePath = PathString.getRelativePath(currentProjectPath, filePath);

      let processedItem = filePath.trim();
      if (
        (processedItem.startsWith('"') && processedItem.endsWith('"')) ||
        (processedItem.startsWith("'") && processedItem.endsWith("'"))
      ) {
        if (processedItem.length >= 2) {
          processedItem = processedItem.slice(1, -1).trim();
        }
      }

      const { emoji, name } = PathString.getEmojiAndNameByPath(processedItem);

      // 如果生成的相对路径为空或没有意义，降级处理
      const displayText = relativePath ? `${emoji}${relativePath}` : `${emoji}${name}`;

      const textNode = new TextNode(project, {
        text: displayText,
        details: DetailsManager.markdownToDetails(processedItem),
        collisionBox: new CollisionBox([new Rectangle(project.camera.location.clone(), Vector.getZero())]),
      });

      project.stageManager.add(textNode);
    }
  }

  /**
   * 将任意图片格式（jpg/jpeg/webp/png）转换为 PNG Blob
   * 利用浏览器 Canvas API 完成转换，并根据设置决定是否压缩
   */
  async function convertToPngBlob(fileData: Uint8Array, sourceMime: string): Promise<Blob> {
    const sourceBlob = new Blob([fileData as BlobPart], { type: sourceMime });
    const url = URL.createObjectURL(sourceBlob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.naturalWidth;
        let h = img.naturalHeight;

        if (Settings.resizePastedImages) {
          const maxSize = Settings.maxPastedImageSize;
          const maxDim = Math.max(w, h);
          if (maxDim > maxSize) {
            const scale = maxSize / maxDim;
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("无法获取 Canvas 2D 上下文"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const outputType = Settings.compressImageToWebp ? "image/webp" : "image/png";
        canvas.toBlob(
          (blob) => {
            if (blob) {
              if (outputType === "image/webp" && !blob.type.includes("webp")) {
                toast.warning("当前系统 webview 不支持 WebP 编码，已回退为 PNG");
              }
              resolve(blob);
            } else reject(new Error("Canvas toBlob 失败"));
          },
          outputType,
          Settings.compressImageToWebp ? Settings.webpQuality : undefined,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("图片加载失败"));
      };
      img.src = url;
    });
  }

  /**
   * 处理图片文件拖拽到舞台（支持 png/jpg/jpeg/webp，统一转换为 PNG 存储）
   * 按 imageIndex 从左下阶梯排列：第1张在视野中心，之后每张相对前一张左移50px、下移50px
   */
  export async function handleDropImage(
    project: Project,
    filePath: string,
    sourceMime: string,
    imageIndex: number = 0,
  ): Promise<void> {
    const fileData = await readFile(filePath);

    // 转为 PNG（非 PNG 格式必然转换；PNG 格式仅在开启压缩时经过 canvas 以缩放尺寸）
    const blob =
      sourceMime === "image/png" && !Settings.resizePastedImages && !Settings.compressImageToWebp
        ? new Blob([new Uint8Array(fileData)], { type: "image/png" })
        : await convertToPngBlob(new Uint8Array(fileData), sourceMime);

    const attachmentId = project.addAttachment(blob);

    // 第1张在视野中心，之后每张左移50px、下移50px（y轴向下）
    // collisionBox 使用占位尺寸，ImageNode 构造后会异步加载 bitmap 并自动更新碰撞箱
    const addLocation = project.camera.location.clone();
    addLocation.x += -imageIndex * 50;
    addLocation.y += imageIndex * 50;

    const imageNode = new ImageNode(project, {
      attachmentId,
      collisionBox: new CollisionBox([new Rectangle(addLocation, new Vector(1, 1))]),
    });

    project.stageManager.add(imageNode);
  }

  /** @deprecated 请使用 handleDropImage */
  export async function handleDropPng(project: Project, filePath: string) {
    return handleDropImage(project, filePath, "image/png");
  }

  export async function handleDropTxt(project: Project, filePath: string) {
    const fileData = await readFile(filePath);
    const content = new TextDecoder().decode(fileData);
    const textNode = new TextNode(project, {
      text: content,
      collisionBox: new CollisionBox([new Rectangle(project.camera.location.clone(), new Vector(300, 150))]),
      sizeAdjust: "manual",
    });

    project.stageManager.add(textNode);
  }

  export async function handleDropSvg(project: Project, filePath: string) {
    const fileData = await readFile(filePath);
    const content = new TextDecoder().decode(fileData);
    const svg = new DOMParser().parseFromString(content, "image/svg+xml");
    const item = new XMLSerializer().serializeToString(svg.documentElement);
    const attachmentId = project.addAttachment(new Blob([item], { type: "image/svg+xml" }));
    const entity = new SvgNode(project, {
      attachmentId,
    });
    project.stageManager.add(entity);
  }
}
