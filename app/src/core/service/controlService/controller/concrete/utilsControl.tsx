import { Project, service } from "@/core/Project";
import { EntityCreateFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityCreateFlashEffect";
import { SubWindow } from "@/core/service/SubWindow";
import type { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import type { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import NodeDetailsWindow from "@/sub/NodeDetailsWindow";
import type { Direction } from "@/types/directions";
import { isDesktop } from "@/utils/platform";
import { colorInvert, type Vector } from "@graphif/data-structures";
import { toast } from "sonner";
import { Settings } from "@/core/service/Settings";
import { RectangleLittleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleLittleNoteEffect";
import {
  autoChangeTextNodeToLatexNode,
  autoChangeTextNodeToReferenceBlock,
  AutoCompleteManager,
  LatexPreviewManager,
} from "./utilsControlTools";

/**
 * 这里是专门存放代码相同的地方
 *    因为有可能多个控制器公用同一个代码，
 */
@service("controllerUtils")
export class ControllerUtils {
  private readonly autoComplete: AutoCompleteManager;
  constructor(private readonly project: Project) {
    this.autoComplete = new AutoCompleteManager(project);
  }

  /**
   * 编辑节点
   * @param clickedNode
   */
  editTextNode(clickedNode: TextNode, selectAll = true) {
    this.project.controller.isCameraLocked = true;
    // 停止摄像机漂移
    this.project.camera.stopImmediately();
    // 停止实体移动漂移
    this.project.entityMoveManager.stopImmediately();
    const rectWorld = clickedNode.collisionBox.getRectangle();
    const rectView = this.project.renderer.transformWorld2View(rectWorld);
    // 编辑节点
    const textBeforeEdit = clickedNode.text;
    clickedNode.isEditing = true;
    // 添加进入编辑状态的闪烁特效
    this.project.effects.addEffect(
      RectangleLittleNoteEffect.fromUtilsLittleNote(
        clickedNode,
        this.project.stageStyleManager.currentStyle.effects.successShadow,
      ),
    );
    let lastAutoCompleteWindowId: string;
    // 实时 LaTeX 预览管理器（输入 $...$ 时在节点上方显示）
    const latexPreview = new LatexPreviewManager();

    this.project.inputElement
      .textarea(
        clickedNode.text,
        async (text, ele) => {
          const currentRequestId = latexPreview.nextRequestId();
          if (lastAutoCompleteWindowId) {
            SubWindow.close(lastAutoCompleteWindowId);
          }
          // 自动补全逻辑
          await this.autoComplete.handle(text, clickedNode, ele, (value) => {
            lastAutoCompleteWindowId = value;
          });
          // onChange
          clickedNode?.rename(text);
          const rectWorld = clickedNode.collisionBox.getRectangle();
          const rectView = this.project.renderer.transformWorld2View(rectWorld);
          ele.style.height = "auto";
          ele.style.height = `${rectView.height.toFixed(2) + 8}px`;
          // 自动改变宽度
          if (clickedNode.sizeAdjust === "manual") {
            ele.style.width = "auto";
            ele.style.width = `${rectView.width.toFixed(2) + 8}px`;
          } else if (clickedNode.sizeAdjust === "auto") {
            ele.style.width = "100vw";
          }
          // 自动调整它的外层框的大小
          const fatherSections = this.project.sectionMethods.getFatherSectionsList(clickedNode);
          for (const section of fatherSections) {
            section.adjustLocationAndSize();
          }

          // 实时 LaTeX 预览：检测光标附近的 $...$ 片段
          const cursor =
            ele.selectionStart === null
              ? text.length
              : ele.selectionStart > 0 && text[ele.selectionStart - 1] === "$"
                ? ele.selectionStart - 1
                : ele.selectionStart;
          const latexContent = LatexPreviewManager.getInlineLatexAtCursor(text, cursor);
          if (latexContent !== null) {
            if (!latexPreview.isDismissed() && currentRequestId === latexPreview.currentRequestId()) {
              const currentRectView = this.project.renderer.transformWorld2View(
                clickedNode.collisionBox.getRectangle(),
              );
              latexPreview.update(latexContent, currentRectView);
            }
          } else {
            latexPreview.remove();
          }
        },
        {
          position: "fixed",
          resize: "none",
          boxSizing: "border-box",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          left: `${rectView.left.toFixed(2)}px`,
          top: `${rectView.top.toFixed(2)}px`,
          // ====
          width: clickedNode.sizeAdjust === "manual" ? `${rectView.width.toFixed(2)}px` : "100vw",
          // maxWidth: `${rectView.width.toFixed(2)}px`,
          minWidth: `${rectView.width.toFixed(2)}px`,
          minHeight: `${rectView.height.toFixed(2)}px`,
          // height: `${rectView.height.toFixed(2)}px`,
          padding: `${clickedNode.getPadding() * this.project.camera.currentScale}px`,
          fontSize: `${clickedNode.getFontSize() * this.project.camera.currentScale}px`,
          backgroundColor: "transparent",
          color: (clickedNode.color.a === 1
            ? colorInvert(clickedNode.color)
            : colorInvert(this.project.stageStyleManager.currentStyle.Background)
          ).toHexStringWithoutAlpha(),
          outline: `solid ${1 * this.project.camera.currentScale}px ${this.project.stageStyleManager.currentStyle.effects.successShadow.toNewAlpha(0.1).toString()}`,
          borderRadius: `${clickedNode.getBorderRadius() * this.project.camera.currentScale}px`,
        },
        selectAll,
        // rectWorld.width * this.project.camera.currentScale, // limit width
      )
      .then(async () => {
        SubWindow.close(lastAutoCompleteWindowId);
        // 移除 LaTeX 实时预览 div
        latexPreview.dismiss();
        clickedNode!.isEditing = false;
        this.project.controller.isCameraLocked = false;
        if (clickedNode.text !== textBeforeEdit) {
          this.project.historyManager.recordStep();
        }

        await autoChangeTextNodeToReferenceBlock(this.project, clickedNode);
        // 检测 $...$ 格式，自动转换为 LaTeX 公式节点
        await autoChangeTextNodeToLatexNode(this.project, clickedNode);
        // 文本节点退出编辑模式后，检查是否需要自动格式化树形结构
        if (Settings.textNodeAutoFormatTreeWhenExitEdit) {
          // 格式化树形结构
          this.project.keyboardOnlyTreeEngine.adjustTreeNode(clickedNode, false);
        }
      });
  }

  /**
   * 通过快捷键的方式来打开Entity的详细信息编辑
   */
  editNodeDetailsByKeyboard() {
    const nodes = this.project.stageManager.getEntities().filter((node) => node.isSelected);
    if (nodes.length === 0) {
      toast.error("请先选择一个节点，才能编辑详细信息");
      return;
    }
    this.editNodeDetails(nodes[0]);
  }

  editNodeDetails(clickedNode: Entity) {
    // this.project.controller.isCameraLocked = true;
    // 编辑节点详细信息的视野移动锁定解除，——用户：快深频
    NodeDetailsWindow.open(clickedNode.details, (value) => {
      clickedNode.details = value;
      // 向孪生兄弟同步 details
      this.project.syncAssociationManager.syncFrom(clickedNode, "details");
    });
  }

  async addTextNodeByLocation(location: Vector, selectCurrent: boolean = false, autoEdit: boolean = false) {
    const sections = this.project.sectionMethods.getSectionsByInnerLocation(location);
    // 新建节点
    const uuid = await this.project.nodeAdder.addTextNodeByClick(location, sections, selectCurrent);
    if (autoEdit) {
      // 自动进入编辑模式
      this.textNodeInEditModeByUUID(uuid);
    }
    return uuid;
  }
  createConnectPoint(location: Vector) {
    const sections = this.project.sectionMethods.getSectionsByInnerLocation(location);
    this.project.nodeAdder.addConnectPoint(location, sections);
  }

  addTextNodeFromCurrentSelectedNode(direction: Direction, selectCurrent = false) {
    this.project.nodeAdder.addTextNodeFromCurrentSelectedNode(direction, [], selectCurrent).then((uuid) => {
      setTimeout(() => {
        this.textNodeInEditModeByUUID(uuid);
      });
    });
  }

  textNodeInEditModeByUUID(uuid: string) {
    const createNode = this.project.stageManager.getTextNodeByUUID(uuid);
    if (createNode === null) {
      // 说明 创建了立刻删掉了
      return;
    }
    // 整特效
    this.project.effects.addEffect(EntityCreateFlashEffect.fromCreateEntity(createNode));
    if (isDesktop) {
      this.editTextNode(createNode);
    }
  }

  /**
   * 检测鼠标是否点击到了某个stage对象上
   * @param clickedLocation
   */
  getClickedStageObject(clickedLocation: Vector) {
    let clickedStageObject: StageObject | null = this.project.stageManager.findEntityByLocation(clickedLocation);
    // 补充：在宏观视野下，框应该被很轻松的点击
    if (clickedStageObject === null && this.project.camera.currentScale < Section.bigTitleCameraScale) {
      const clickedSections = this.project.sectionMethods.getSectionsByInnerLocation(clickedLocation);
      if (clickedSections.length > 0) {
        clickedStageObject = clickedSections[0];
      }
    }
    if (clickedStageObject === null) {
      for (const association of this.project.stageManager.getAssociations()) {
        if (!association.isPhysical) {
          continue; // 非物理对象（如 SyncAssociation）不参与点击检测
        }
        if (association instanceof LineEdge) {
          if (association.target.isHiddenBySectionCollapse && association.source.isHiddenBySectionCollapse) {
            continue;
          }
        }
        if (association.collisionBox.isContainsPoint(clickedLocation)) {
          clickedStageObject = association;
          break;
        }
      }
    }
    return clickedStageObject;
  }

  /**
   * 鼠标是否点击在了调整大小的小框上
   * @param clickedLocation
   */
  isClickedResizeRect(clickedLocation: Vector): boolean {
    const selectedEntities = this.project.stageManager.getSelectedStageObjects();

    for (const selectedEntity of selectedEntities) {
      // 检查是否是支持缩放的实体类型
      if (
        selectedEntity instanceof TextNode ||
        selectedEntity instanceof ImageNode ||
        selectedEntity instanceof SvgNode ||
        selectedEntity instanceof ReferenceBlockNode
      ) {
        // 对TextNode进行特殊处理，只在手动模式下允许缩放
        if (selectedEntity instanceof TextNode && selectedEntity.sizeAdjust === "auto") {
          continue;
        }

        const resizeRect = selectedEntity.getResizeHandleRect();
        if (resizeRect.isPointIn(clickedLocation)) {
          // 点中了扩大缩小的东西
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 将选中的内容标准化
   * 如果选中了外层的section，也选中了内层的物体，则取消选中内部的物体
   */
  public selectedEntityNormalizing() {
    const selectedEntities = this.project.stageManager.getSelectedEntities();
    const shallowerSections = this.project.sectionMethods.shallowerSection(
      selectedEntities.filter((entity) => entity instanceof Section),
    );
    const shallowerEntities = this.project.sectionMethods.shallowerNotSectionEntities(selectedEntities);
    for (const entity of selectedEntities) {
      if (entity instanceof Section) {
        if (!shallowerSections.includes(entity)) {
          entity.isSelected = false;
        }
      } else {
        if (!shallowerEntities.includes(entity)) {
          entity.isSelected = false;
        }
      }
    }
  }
}
