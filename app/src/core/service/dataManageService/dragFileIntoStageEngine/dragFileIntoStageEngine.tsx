import { Random } from "@/core/algorithm/random";
import { Project } from "@/core/Project";
import { TextNode } from "@/core/sprites/TextNode";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { readFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";

/**
 * 处理文件拖拽到舞台的引擎
 */
export namespace DragFileIntoStageEngine {
  /**
   * 处理文件拖拽到舞台
   * @param project 当前活动的项目
   * @param pathList 拖拽的文件路径列表
   * @param mouseLocation 拖拽到的位置（舞台坐标系）
   */
  export async function handleDrop(project: Project, pathList: string[]) {
    try {
      for (const filePath of pathList) {
        const extName = filePath.split(".").pop()?.toLowerCase();
        if (extName === "png") {
          handleDropPng(project, filePath);
        } else if (extName === "txt") {
          handleDropTxt(project, filePath);
        } else if (extName === "svg") {
          handleDropSvg(project, filePath);
        } else {
          toast.error(`不支持的文件类型: 【${extName}】`);
        }
      }
    } catch (error) {
      toast.error(`处理拖拽文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  export async function handleDropPng(project: Project, filePath: string) {
    // 使用Tauri的文件系统API读取文件内容
    const fileData = await readFile(filePath);

    // 创建Blob对象
    const blob = new Blob([new Uint8Array(fileData)], { type: "image/png" });

    // 添加到项目的attachments中
    const attachmentId = project.addAttachment(blob);

    const addLocation = project.camera.location.clone();
    // 添加位置向左下角随机偏移
    addLocation.x += Random.randomInt(0, -500);
    addLocation.y += Random.randomInt(0, 500);

    // 创建ImageNode并添加到舞台
    const imageNode = new ImageNode(project, {
      attachmentId,
      collisionBox: new CollisionBox([new Rectangle(addLocation, new Vector(300, 150))]),
    });

    project.stageManager.add(imageNode);
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
