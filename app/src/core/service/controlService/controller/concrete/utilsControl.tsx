import { Project, service } from "@/core/Project";
import { TabWorkspace } from "@/core/TabWorkspace";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Settings } from "@/core/service/Settings";
import { EntityCreateFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityCreateFlashEffect";
import { RectangleLittleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleLittleNoteEffect";
import type { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import type { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import type { Edge } from "@/core/stage/stageObject/association/Edge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import NodeDetailsWindow from "@/sub/NodeDetailsWindow";
import type { Direction } from "@/types/directions";
import { isDesktop } from "@/utils/platform";
import { colorInvert, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";
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

  private viewRectangleToClient(rectangle: Rectangle) {
    const scale = this.project.canvas.viewToClientScale();
    return new Rectangle(
      this.project.canvas.viewToClient(rectangle.location),
      new Vector(rectangle.width * scale.x, rectangle.height * scale.y),
    );
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
    const rectClient = this.viewRectangleToClient(rectView);
    const clientScale = this.project.canvas.viewToClientScale();
    // 编辑节点
    const textBeforeEdit = clickedNode.text;
    // 进入编辑状态时，取消所有其他节点的选中，只保留当前节点选中
    this.project.stageManager.clearSelectAll();
    clickedNode.isSelected = true;
    clickedNode.isEditing = true;
    // 添加进入编辑状态的闪烁特效（只在默认缩放级别时显示）
    if (this.project.camera.isDefaultZoom()) {
      this.project.effects.addEffect(
        RectangleLittleNoteEffect.fromUtilsLittleNote(
          clickedNode,
          this.project.stageStyleManager.currentStyle.effects.successShadow,
        ),
      );
    }
    const syncTextareaPositionWithNode = (ele: HTMLTextAreaElement) => {
      const currentRectView = this.project.renderer.transformWorld2View(clickedNode.collisionBox.getRectangle());
      const currentRectClient = this.viewRectangleToClient(currentRectView);
      ele.style.left = `${currentRectClient.left.toFixed(2)}px`;
      ele.style.top = `${currentRectClient.top.toFixed(2)}px`;
      ele.style.minWidth = `${currentRectClient.width.toFixed(2)}px`;
      ele.style.minHeight = `${currentRectClient.height.toFixed(2)}px`;
      ele.style.height = "auto";
      ele.style.height = `${(currentRectClient.height + 8 * clientScale.y).toFixed(2)}px`;
      if (clickedNode.sizeAdjust === "manual") {
        ele.style.width = `${currentRectClient.width.toFixed(2)}px`;
      }
    };
    const relayoutTreeWhileEditing = () => {
      const rootNodes = this.project.graphMethods.getRoots(clickedNode, true);
      if (rootNodes.length !== 1) {
        return;
      }
      const rootNode = rootNodes[0];
      const validationResult = this.project.graphMethods.validateTreeStructure(rootNode, true);
      if (!validationResult.isValid) {
        return;
      }
      this.project.autoLayoutFastTree.autoLayoutFastTreeMode(rootNode);
      rootNode.isSelected = false;
      clickedNode.isSelected = true;
    };
    let lastAutoCompleteTabId: string;
    // 实时 LaTeX 预览管理器（输入 $...$ 时在节点上方显示）
    const latexPreview = new LatexPreviewManager();

    this.project.inputElement
      .textarea(
        clickedNode.text,
        async (text, ele) => {
          const currentRequestId = latexPreview.nextRequestId();
          if (lastAutoCompleteTabId) {
            void TabWorkspace.close(lastAutoCompleteTabId);
          }
          // 自动补全逻辑
          await this.autoComplete.handle(text, clickedNode, ele, (value) => {
            lastAutoCompleteTabId = value;
          });
          // onChange
          clickedNode?.rename(text);
          if (Settings.textNodeAutoFormatTreeWhenInput) {
            relayoutTreeWhileEditing();
          }
          syncTextareaPositionWithNode(ele);
          // 宽度由 inputElement.tsx 的 adjustSize（镜像 div 测量）负责，此处不再重复设置
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
              latexPreview.update(latexContent, this.viewRectangleToClient(currentRectView));
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
          left: `${rectClient.left.toFixed(2)}px`,
          top: `${rectClient.top.toFixed(2)}px`,
          // ====
          // auto 模式：初始给节点宽度+8作为起始值，adjustSize 会用镜像 div 立即修正
          // manual 模式：宽度固定为节点当前宽度，不扩展
          width: `${(clickedNode.sizeAdjust === "manual" ? rectClient.width : rectClient.width + 8 * clientScale.x).toFixed(2)}px`,
          minWidth: `${rectClient.width.toFixed(2)}px`,
          minHeight: `${rectClient.height.toFixed(2)}px`,
          // height: `${rectView.height.toFixed(2)}px`,
          padding: `${clickedNode.getPadding() * this.project.camera.currentScale * clientScale.x}px`,
          fontSize: `${clickedNode.getFontSize() * this.project.camera.currentScale * clientScale.x}px`,
          backgroundColor: "transparent",
          color: (clickedNode.color.a === 1
            ? colorInvert(clickedNode.color)
            : colorInvert(this.project.stageStyleManager.currentStyle.Background)
          ).toHexStringWithoutAlpha(),
          outline: `solid 1px ${this.project.stageStyleManager.currentStyle.effects.successShadow.toNewAlpha(Settings.textNodeEditModeOutlineOpacity).toString()}`,
          borderRadius: `${clickedNode.getBorderRadius() * this.project.camera.currentScale * clientScale.x}px`,
        },
        selectAll,
        Settings.textNodeExitEditModeOnWheel,
        // fixedWidth：manual 模式宽度固定为节点当前视图宽度，auto 模式不传（自动扩展）
        clickedNode.sizeAdjust === "manual" ? rectClient.width : undefined,
      )
      .then(async () => {
        void TabWorkspace.close(lastAutoCompleteTabId);
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
      });
  }

  editEdgeText(edge: Edge | MultiTargetUndirectedEdge, selectAll = true): Promise<void> {
    this.project.controller.isCameraLocked = true;
    this.project.camera.stopImmediately();
    const textAreaLocation = this.project.renderer
      .transformWorld2View(edge.textRectangle.location)
      .add(Vector.same(Renderer.NODE_PADDING).multiply(this.project.camera.currentScale));
    const textAreaClientLocation = this.project.canvas.viewToClient(textAreaLocation);
    const clientScale = this.project.canvas.viewToClientScale();
    return this.project.inputElement
      .textarea(
        edge.text,
        (text) => {
          edge.rename(text);
        },
        {
          position: "fixed",
          resize: "none",
          boxSizing: "border-box",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          left: `${textAreaClientLocation.x.toFixed(2)}px`,
          top: `${textAreaClientLocation.y.toFixed(2)}px`,
          fontSize: `${Renderer.FONT_SIZE * this.project.camera.currentScale * clientScale.x}px`,
          backgroundColor: this.project.stageStyleManager.currentStyle.Background.toString(),
          color: this.project.stageStyleManager.currentStyle.StageObjectBorder.toString(),
          outline: "solid 1px rgba(255,255,255,0.1)",
        },
        selectAll,
      )
      .then(() => {
        this.project.controller.isCameraLocked = false;
        this.project.historyManager.recordStep();
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
    // 补充：在大标题覆盖形态下，空白区域也应该稳定命中对应的 Section。
    if (clickedStageObject === null) {
      const clickedSections = this.project.sectionMethods.getSectionsByInnerLocation(clickedLocation);
      clickedStageObject =
        clickedSections.find((section) => this.project.sectionMethods.isSectionBigTitleActive(section)) ?? null;
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

  editSectionTitle(section: Section) {
    if (this.project.sectionMethods.isObjectBeLockedBySection(section)) {
      toast.error("无法编辑已锁定的section");
      return;
    }
    this.project.controller.isCameraLocked = true;
    this.project.camera.stopImmediately();
    section.isEditingTitle = true;
    const inputViewLocation = this.project.renderer
      .transformWorld2View(section.rectangle.location.subtract(new Vector(0, section.text === "" ? 50 : 0)))
      .add(Vector.same(Renderer.NODE_PADDING).multiply(this.project.camera.currentScale));
    const clientScale = this.project.canvas.viewToClientScale();
    this.project.inputElement
      .input(
        this.project.canvas.viewToClient(inputViewLocation),
        section.text,
        (text) => {
          section.rename(text);
        },
        {
          position: "fixed",
          resize: "none",
          boxSizing: "border-box",
          fontSize: `${Renderer.FONT_SIZE * this.project.camera.currentScale * clientScale.x}px`,
          backgroundColor: "transparent",
          color: this.project.stageStyleManager.currentStyle.StageObjectBorder.toString(),
          outline: `solid ${2 * this.project.camera.currentScale * clientScale.x}px ${this.project.stageStyleManager.currentStyle.effects.successShadow.toNewAlpha(0.25).toString()}`,
          marginTop: `${-8 * this.project.camera.currentScale * clientScale.y}px`,
        },
      )
      .then(() => {
        section.isEditingTitle = false;
        this.project.controller.isCameraLocked = false;
        this.project.historyManager.recordStep();
      });
  }
}
