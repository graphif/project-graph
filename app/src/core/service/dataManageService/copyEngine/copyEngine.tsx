import { Project, service } from "@/core/Project";
import { SetFunctions } from "@/core/algorithm/setFunctions";
import { ConnectableAssociation } from "@/core/stage/stageObject/abstract/Association";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Serialized } from "@/types/node";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { deserialize, serialize } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import { Image } from "@tauri-apps/api/image";
import { readText, writeImage, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";
import { v4 } from "uuid";
import { RectangleNoteEffect } from "../../feedbackService/effectEngine/concrete/RectangleNoteEffect";
import { RectangleNoteReversedEffect } from "../../feedbackService/effectEngine/concrete/RectangleNoteReversedEffect";
import { VirtualClipboard } from "./VirtualClipboard";
import { CopyEngineImage } from "./copyEngineImage";
import { CopyEngineText } from "./copyEngineText";

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
  copy() {
    // 获取所有选中的实体，不能包含关系
    const selectedEntities = this.project.stageManager.getSelectedEntities();
    if (selectedEntities.length === 0) {
      // 如果没有选中东西，就是清空虚拟粘贴板
      VirtualClipboard.clear();
      toast.info("当前没有选中任何实体，已清空了虚拟剪贴板");
      return;
    }

    // 更新虚拟剪贴板
    const selectedUUIDs = new Set(selectedEntities.map((it) => it.uuid));
    // ===== 开始构建 copyedStageObjects
    const copiedStageObjects: StageObject[] = [...selectedEntities]; // 准备复制后的数据
    // 处理Section框内部的实体
    // 先检测一下选中的内容中是否有框
    const isHaveSection = selectedEntities.some((it) => it instanceof Section);
    if (isHaveSection) {
      // 如果有框，则获取框内的实体
      const innerEntities = this.project.sectionMethods.getAllEntitiesInSelectedSectionsOrEntities(selectedEntities);
      // 根据 selectedUUIDs 过滤
      const filteredInnerEntities = innerEntities.filter((it) => !selectedUUIDs.has(it.uuid));
      copiedStageObjects.push(...filteredInnerEntities);
      // 补充 selectedUUIDs
      for (const entity of filteredInnerEntities) {
        selectedUUIDs.add(entity.uuid);
      }
    }
    // O(N), N 为当前舞台对象数量
    for (const association of this.project.stageManager.getAssociations()) {
      if (association instanceof ConnectableAssociation) {
        if (association instanceof Edge) {
          if (selectedUUIDs.has(association.source.uuid) && selectedUUIDs.has(association.target.uuid)) {
            copiedStageObjects.push(association);
          }
        } else if (association instanceof MultiTargetUndirectedEdge) {
          // 无向边
          const associationUUIDs = new Set(association.associationList.map((it) => it.uuid));
          if (SetFunctions.isSubset(associationUUIDs, selectedUUIDs)) {
            copiedStageObjects.push(association);
          }
        }
      }
    }
    // ===== copyedStageObjects 构建完毕

    // 深拷贝一下数据，只有在粘贴的时候才刷新uuid
    const serializedCopiedStageObjects = serialize(copiedStageObjects);
    console.log(serializedCopiedStageObjects);
    VirtualClipboard.copy(serialize(serializedCopiedStageObjects));
    const rect = Rectangle.getBoundingRectangle(selectedEntities.map((it) => it.collisionBox.getRectangle()));
    this.project.effects.addEffect(new RectangleNoteReversedEffect(new ProgressNumber(0, 100), rect, Color.Green));

    // 更新系统剪贴板
    // 如果只有一张图片就直接复制图片
    if (selectedEntities.length === 1 && selectedEntities[0] instanceof ImageNode) {
      const imageNode = selectedEntities[0] as ImageNode;
      const blob = this.project.attachments.get(imageNode.attachmentId);
      if (blob) {
        blob.arrayBuffer().then(Image.fromBytes).then(writeImage);
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
    const pastDataSerialized = VirtualClipboard.paste();
    const pasteData: StageObject[] = deserialize(pastDataSerialized, this.project);

    // 粘贴的时候刷新UUID
    for (const stageObject of pasteData) {
      if (stageObject instanceof Entity) {
        // @ts-expect-error 没办法，只能这么做了，否则会出现移动速度2倍甚至n倍的bug
        stageObject.project = this.project;
        const newUUID = v4();
        const oldUUID = stageObject.uuid;
        stageObject.uuid = newUUID;
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
    this.project.stageObjectSelectCounter.update();

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
  cut() {
    this.copy();
    this.project.stageManager.deleteSelectedStageObjects();
  }

  async readSystemClipboardAndPaste() {
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
