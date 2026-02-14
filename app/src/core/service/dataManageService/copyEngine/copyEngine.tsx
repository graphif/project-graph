import { Project, service } from "@/core/Project";
import { isMac } from "@/utils/platform";
import { ConnectableAssociation } from "@/core/stage/stageObject/abstract/Association";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Serialized } from "@/types/node";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { deserialize, serialize } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import { Image as TauriImage } from "@tauri-apps/api/image";
import { readText, writeImage, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";
import { v4 } from "uuid";
import { RectangleNoteEffect } from "../../feedbackService/effectEngine/concrete/RectangleNoteEffect";
import { RectangleNoteReversedEffect } from "../../feedbackService/effectEngine/concrete/RectangleNoteReversedEffect";
import { VirtualClipboard } from "./VirtualClipboard";
import { CopyEngineImage } from "./copyEngineImage";
import { CopyEngineText } from "./copyEngineText";
import { CopyEngineUtils } from "./copyEngineUtils";

/**
 * 专门用来管理节点复制的引擎
 */
@service("copyEngine")
export class CopyEngine {
  private copyEngineImage: CopyEngineImage;
  private copyEngineText: CopyEngineText;

  constructor(private readonly project: Project) {
    this.copyEngineImage = new CopyEngineImage(project);
    this.copyEngineText = new CopyEngineText(project);
  }

  /**
   * 用户按下了ctrl+c，
   * 将当前选中的节点复制到虚拟粘贴板
   * 也要将选中的部分复制到系统粘贴板
   */
  async copy() {
    // 获取所有选中的实体，不能包含关系
    const selectedEntities = this.project.stageManager.getSelectedEntities();
    if (selectedEntities.length === 0) {
      // 如果没有选中东西，就是清空虚拟粘贴板
      VirtualClipboard.clear();
      toast.info("当前没有选中任何实体，已清空了虚拟剪贴板");
      return;
    }
    const copiedStageObjects = CopyEngineUtils.getAllStageObjectFromEntities(this.project, selectedEntities);

    // 收集所有需要复制的附件（ImageNode 和 SvgNode 的附件）
    const attachmentMap = await CopyEngineUtils.collectAttachmentFromStageObjects(this.project, copiedStageObjects);

    // 深拷贝一下数据，只有在粘贴的时候才刷新uuid
    const serializedCopiedStageObjects = serialize(copiedStageObjects);
    console.log(serializedCopiedStageObjects);

    // 将舞台对象和附件一起存储到虚拟粘贴板
    VirtualClipboard.copy({
      stageObjects: serialize(serializedCopiedStageObjects),
      attachments: Object.fromEntries(attachmentMap),
    });

    const rect = Rectangle.getBoundingRectangle(selectedEntities.map((it) => it.collisionBox.getRectangle()));
    this.project.effects.addEffect(new RectangleNoteReversedEffect(new ProgressNumber(0, 100), rect, Color.Green));

    // 更新系统剪贴板
    // 如果只有一张图片就直接复制图片
    if (selectedEntities.length === 1 && selectedEntities[0] instanceof ImageNode) {
      const imageNode = selectedEntities[0] as ImageNode;
      const blob = this.project.attachments.get(imageNode.attachmentId);
      if (blob) {
        blob.arrayBuffer().then(TauriImage.fromBytes).then(writeImage);
        toast.success("已将选中的图片复制到系统剪贴板");
      }
    } else {
      // 否则复制全部文本节点，用两个换行分割
      const textNodes = selectedEntities.filter((it) => it instanceof TextNode) as TextNode[];
      if (textNodes.length > 0) {
        const text = textNodes.map((it) => it.text).join("\n\n");
        writeText(text);
        toast.success("已将选中的文本复制到系统剪贴板");
      }
    }
    // 最后清空所有选择
    this.project.stageManager.clearSelectAll();
  }

  /**
   * 用户按下了ctrl+v，将粘贴板数据粘贴到画布上
   */
  paste() {
    // 如果有虚拟粘贴板数据，则优先粘贴虚拟粘贴板上的东西
    if (VirtualClipboard.hasData()) {
      this.virtualClipboardPaste();
    } else {
      this.readSystemClipboardAndPaste();
    }
  }

  virtualClipboardPaste() {
    // 获取虚拟粘贴板上数据的外接矩形
    const clipboardData = VirtualClipboard.paste();

    // 兼容旧格式：如果直接是序列化数据，则没有附件
    let pastDataSerialized: any;
    let attachmentsData: Record<string, { data: ArrayBuffer; type: string }> | undefined;

    if (clipboardData && typeof clipboardData === "object" && "stageObjects" in clipboardData) {
      // 新格式：包含附件数据
      pastDataSerialized = clipboardData.stageObjects;
      attachmentsData = clipboardData.attachments;
    } else {
      // 旧格式：只有序列化数据
      pastDataSerialized = clipboardData;
    }

    const pasteData: StageObject[] = deserialize(pastDataSerialized, this.project);

    // 处理附件：将附件添加到新项目中，并建立 oldAttachmentId -> newAttachmentId 的映射
    const attachmentIdMap = new Map<string, string>();
    if (attachmentsData) {
      for (const [oldAttachmentId, attachmentInfo] of Object.entries(attachmentsData)) {
        // 将 ArrayBuffer 转换回 Blob
        const blob = new Blob([attachmentInfo.data], { type: attachmentInfo.type });
        // 添加到新项目并生成新的 UUID
        const newAttachmentId = this.project.addAttachment(blob);
        attachmentIdMap.set(oldAttachmentId, newAttachmentId);
      }
    }

    // 粘贴的时候刷新UUID
    for (const stageObject of pasteData) {
      if (stageObject instanceof Entity) {
        // @ts-expect-error 没办法，只能这么做了，否则会出现移动速度2倍甚至n倍的bug
        stageObject.project = this.project;
        const newUUID = v4();
        const oldUUID = stageObject.uuid;
        stageObject.uuid = newUUID;

        // 更新附件ID（如果是 ImageNode 或 SvgNode）
        if (stageObject instanceof ImageNode) {
          const oldAttachmentId = stageObject.attachmentId;
          if (oldAttachmentId && attachmentIdMap.has(oldAttachmentId)) {
            const newAttachmentId = attachmentIdMap.get(oldAttachmentId)!;
            stageObject.attachmentId = newAttachmentId;
            // 重新加载图片附件
            const blob = this.project.attachments.get(newAttachmentId);
            if (blob) {
              createImageBitmap(blob).then((bitmap) => {
                stageObject.bitmap = bitmap;
                stageObject.state = "success";
                // 设置碰撞箱
                stageObject.scaleUpdate(0);
              });
            }
          }
        } else if (stageObject instanceof SvgNode) {
          const oldAttachmentId = stageObject.attachmentId;
          if (oldAttachmentId && attachmentIdMap.has(oldAttachmentId)) {
            const newAttachmentId = attachmentIdMap.get(oldAttachmentId)!;
            stageObject.attachmentId = newAttachmentId;
            // 重新加载 SVG 附件
            const blob = this.project.attachments.get(newAttachmentId);
            if (blob) {
              const url = URL.createObjectURL(blob);
              stageObject.image = new Image();
              stageObject.image.src = url;
              stageObject.image.onload = () => {
                stageObject.originalSize = new Vector(stageObject.image.naturalWidth, stageObject.image.naturalHeight);
                stageObject.collisionBox = new CollisionBox([
                  new Rectangle(
                    stageObject.collisionBox.getRectangle().location,
                    stageObject.originalSize.multiply(stageObject.scale),
                  ),
                ]);
              };
            }
          }
        }

        // 开始遍历所有关联，更新uuid
        for (const stageObject2 of pasteData) {
          if (stageObject2 instanceof ConnectableAssociation) {
            // 更新这个关系对象本身的uuid,因为目前还没有关系的关系，所以可以直接更新。
            stageObject2.uuid = v4();

            if (stageObject2 instanceof Edge) {
              if (stageObject2.source.uuid === oldUUID) {
                stageObject2.source.uuid = newUUID;
              }
              if (stageObject2.target.uuid === oldUUID) {
                stageObject2.target.uuid = newUUID;
              }
            } else if (stageObject2 instanceof MultiTargetUndirectedEdge) {
              for (const associationListItem of stageObject2.associationList) {
                if (associationListItem.uuid === oldUUID) {
                  associationListItem.uuid = newUUID;
                }
              }
            }
          }
        }
      }
    }
    // 将pasteData设为选中状态
    const shouldSelectedEntities = this.project.sectionMethods.shallowerNotSectionEntities(
      pasteData.filter((it) => it instanceof Entity) as Entity[],
    );
    shouldSelectedEntities.forEach((it) => (it.isSelected = true));
    // 粘贴到舞台上（必须先粘贴到舞台上，再运行选择标准化、移动函数）
    this.project.stage.push(...pasteData);
    // 选中标准化
    this.project.controllerUtils.selectedEntityNormalizing();

    // 将所有选中的实体，往右下角移动一点
    const rect = Rectangle.getBoundingRectangle(pasteData.map((it: StageObject) => it.collisionBox.getRectangle()));
    this.project.entityMoveManager.moveSelectedEntities(new Vector(0, rect.height));
    // 加特效
    const effectRect = Rectangle.getBoundingRectangle(
      shouldSelectedEntities.map((it) => it.collisionBox.getRectangle()),
    );
    this.project.effects.addEffect(new RectangleNoteEffect(new ProgressNumber(0, 50), effectRect, Color.Green));
    toast.success(
      <div>
        <h2 className="text-lg">粘贴成功</h2>
        <p className="text-xs">粘贴位置在{effectRect.leftTop.toString()}，如果您是跨文档粘贴，请注意调整位置</p>
        <p className="text-xs">已帮您自动选中该内容，按下默认快捷键 `F` 即可快速聚焦到该内容</p>
      </div>,
    );

    // 清空虚拟粘贴板
    VirtualClipboard.clear(); // TODO: 先暂时清空吧。连续两次ctrl + v会导致重叠问题，待排查
  }

  /**
   * 剪切
   * 复制，然后删除选中的舞台对象
   */
  async cut() {
    await this.copy();
    this.project.stageManager.deleteSelectedStageObjects();
  }

  async readSystemClipboardAndPaste() {
    if (isMac) {
      // macOS 专用：优先使用 Web API 读取文本剪贴板（主线程安全），
      // 避免 Tauri clipboard plugin 在 tokio worker 线程读取 NSPasteboard 时
      // 与 WKWebView 主线程的并发访问导致 SIGSEGV 崩溃。
      // 参见: https://github.com/tauri-apps/plugins-workspace/issues/3205
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.length > 0) {
          this.copyEngineText.copyEnginePastePlainText(text);
        } else {
          // 文本为空则尝试图片
          await this.copyEngineImage.processClipboardImage();
        }
        setTimeout(() => {
          // 粘贴完成后清除按键状态，防止 Web API 弹出的 paste 按钮导致卡键
          this.project.controller.pressingKeySet.clear();
        });
      } catch (err) {
        // Web API 失败（权限拒绝等），清除按键状态后 fallback 到图片粘贴
        this.project.controller.pressingKeySet.clear();
        console.warn("macOS Web API readText 失败，尝试粘贴图片", err);
        try {
          await this.copyEngineImage.processClipboardImage();
        } catch (err) {
          console.error("粘贴图片时发生错误:", err);
        }
      }
    } else {
      // Linux / Windows：直接使用 Tauri 插件，没有 NSPasteboard 线程安全问题
      try {
        const text = await readText();
        this.copyEngineText.copyEnginePastePlainText(text);
      } catch (err) {
        console.warn("文本剪贴板是空的", err);
        try {
          await this.copyEngineImage.processClipboardImage();
        } catch (err) {
          console.error("粘贴图片时发生错误:", err);
          console.error("错误详情:", {
            name: err instanceof Error ? err.name : "Unknown",
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : "No stack",
          });
        }
      }
    }
  }
}

export function getRectangleFromSerializedEntities(serializedEntities: Serialized.Entity[]): Rectangle {
  const rectangles = [];
  for (const node of serializedEntities) {
    if (
      Serialized.isTextNode(node) ||
      Serialized.isSection(node) ||
      Serialized.isImageNode(node) ||
      Serialized.isUrlNode(node) ||
      Serialized.isPortalNode(node) ||
      Serialized.isSvgNode(node)
    ) {
      // 比较常规的矩形
      rectangles.push(new Rectangle(new Vector(...node.location), new Vector(...node.size)));
    }
    if (node.type === "core:connect_point") {
      rectangles.push(new Rectangle(new Vector(...node.location), new Vector(1, 1)));
    } else if (node.type === "core:pen_stroke") {
      // rectangles.push(new Rectangle(new Vector(...node.location), new Vector(1, 1)));
      // TODO: 画笔粘贴板矩形暂时不考虑
    }
  }
  return Rectangle.getBoundingRectangle(rectangles);
}
