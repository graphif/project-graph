import { Project, service } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { LogicNodeNameToRenderNameMap } from "@/core/service/dataGenerateService/autoComputeEngine/logicNodeNameEnum";
import { EntityCreateFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityCreateFlashEffect";
import { SubWindow } from "@/core/service/SubWindow";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { PortalNode } from "@/core/stage/stageObject/entity/PortalNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import AutoCompleteWindow from "@/sub/AutoCompleteWindow";
import { Direction } from "@/types/directions";
import { isDesktop } from "@/utils/platform";
import { colorInvert, Vector } from "@graphif/data-structures";
import { toast } from "sonner";

/**
 * 这里是专门存放代码相同的地方
 *    因为有可能多个控制器公用同一个代码，
 */
@service("controllerUtils")
export class ControllerUtils {
  constructor(private readonly project: Project) {}

  /**
   * 编辑节点
   * @param clickedNode
   */
  editTextNode(clickedNode: TextNode, selectAll = true) {
    this.project.controller.isCameraLocked = true;
    // Disable keyboard shortcuts during text editing to prevent conflicts
    this.project.keyboardOnlyEngine.setOpenning(false);
    const rectWorld = clickedNode.collisionBox.getRectangle();
    const rectView = this.project.renderer.transformWorld2View(rectWorld);
    const fontColor = (
      clickedNode.color.a === 1
        ? colorInvert(clickedNode.color)
        : colorInvert(this.project.stageStyleManager.currentStyle.Background)
    ).toHexStringWithoutAlpha();
    // 编辑节点
    clickedNode.isEditing = true;
    // RectangleElement.div(rectView, this.project.stageStyleManager.currentStyle.CollideBoxSelected);
    let lastAutoCompleteWindowId: string;
    this.project.inputElement
      .textarea(
        clickedNode.text,
        // "",
        (text, ele) => {
          if (lastAutoCompleteWindowId) {
            SubWindow.close(lastAutoCompleteWindowId);
          }
          // 自动补全逻辑节点
          if (text.startsWith("#")) {
            lastAutoCompleteWindowId = AutoCompleteWindow.open(
              this.project.renderer.transformWorld2View(clickedNode.rectangle).leftBottom,
              Object.fromEntries(
                Object.entries(LogicNodeNameToRenderNameMap).filter(([k]) =>
                  k.toLowerCase().startsWith(text.toLowerCase()),
                ),
              ),
              (value) => {
                ele.value = value;
              },
            ).id;
          }
          // onChange
          clickedNode?.rename(text);
          const rectWorld = clickedNode.collisionBox.getRectangle();
          const rectView = this.project.renderer.transformWorld2View(rectWorld);
          ele.style.height = "auto";
          ele.style.height = `${rectView.height.toFixed(2)}px`;
          // 自动改变宽度
          ele.style.width = "auto";
          ele.style.width = `${rectView.width.toFixed(2)}px`;
          // 自动调整它的外层框的大小
          const fatherSections = this.project.sectionMethods.getFatherSectionsList(clickedNode);
          for (const section of fatherSections) {
            section.adjustLocationAndSize();
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
          // width: `${rectView.width.toFixed(2)}px`,
          // maxWidth: `${rectView.width.toFixed(2)}px`,
          minWidth: `${rectView.width.toFixed(2)}px`,
          minHeight: `${rectView.height.toFixed(2)}px`,
          // height: `${rectView.height.toFixed(2)}px`,
          padding: Renderer.NODE_PADDING * this.project.camera.currentScale + "px",
          fontSize: Renderer.FONT_SIZE * this.project.camera.currentScale + "px",
          backgroundColor: "transparent",
          color: fontColor,
          outline: `solid ${2 * this.project.camera.currentScale}px ${this.project.stageStyleManager.currentStyle.effects.successShadow.toNewAlpha(0.25).toString()}`,
          borderRadius: `${Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale}px`,
        },
        selectAll,
        // rectWorld.width * this.project.camera.currentScale, // limit width
      )
      .then(() => {
        SubWindow.close(lastAutoCompleteWindowId);
        clickedNode!.isEditing = false;
        this.project.controller.isCameraLocked = false;
        // Re-enable keyboard shortcuts after text editing finishes
        this.project.keyboardOnlyEngine.setOpenning(true);
        // this.project.historyManager.recordStep();
        // 更新选中内容的数量
        this.project.stageObjectSelectCounter.update();
      });
  }

  editEdgeText(clickedLineEdge: Edge, selectAll = true) {
    this.project.controller.isCameraLocked = true;
    // Disable keyboard shortcuts during text editing to prevent conflicts
    this.project.keyboardOnlyEngine.setOpenning(false);

    // clickedLineEdge.isEditing = true;
    const textAreaLocation = this.project.renderer
      .transformWorld2View(clickedLineEdge.textRectangle.location)
      .add(Vector.same(Renderer.NODE_PADDING).multiply(this.project.camera.currentScale));
    this.project.inputElement
      .textarea(
        clickedLineEdge.text,
        (text) => {
          clickedLineEdge?.rename(text);
        },
        {
          position: "fixed",
          resize: "none",
          boxSizing: "border-box",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          left: `${textAreaLocation.x.toFixed(2)}px`,
          top: `${textAreaLocation.y.toFixed(2)}px`,
          fontSize: Renderer.FONT_SIZE * this.project.camera.currentScale + "px",
          backgroundColor: this.project.stageStyleManager.currentStyle.Background.toString(),
          color: this.project.stageStyleManager.currentStyle.StageObjectBorder.toString(),
          outline: "solid 1px rgba(255,255,255,0.1)",
          // marginTop: -8 * this.project.camera.currentScale + "px",
        },
        selectAll,
      )
      .then(() => {
        // clickedLineEdge!.isEditing = false;
        // 因为这里用的是不透明文本框，所以不需要停止节点上文字的渲染
        this.project.controller.isCameraLocked = false;
        // Re-enable keyboard shortcuts after text editing finishes
        this.project.keyboardOnlyEngine.setOpenning(true);
        this.project.historyManager.recordStep();
      });
  }
  editMultiTargetEdgeText(clickedEdge: MultiTargetUndirectedEdge, selectAll = true) {
    this.project.controller.isCameraLocked = true;
    // Disable keyboard shortcuts during text editing to prevent conflicts
    this.project.keyboardOnlyEngine.setOpenning(false);

    // clickedLineEdge.isEditing = true;
    const textAreaLocation = this.project.renderer
      .transformWorld2View(clickedEdge.textRectangle.location)
      .add(Vector.same(Renderer.NODE_PADDING).multiply(this.project.camera.currentScale));
    this.project.inputElement
      .textarea(
        clickedEdge.text,
        (text) => {
          clickedEdge?.rename(text);
        },
        {
          position: "fixed",
          resize: "none",
          boxSizing: "border-box",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          left: `${textAreaLocation.x.toFixed(2)}px`,
          top: `${textAreaLocation.y.toFixed(2)}px`,
          fontSize: Renderer.FONT_SIZE * this.project.camera.currentScale + "px",
          backgroundColor: this.project.stageStyleManager.currentStyle.Background.toString(),
          color: this.project.stageStyleManager.currentStyle.StageObjectBorder.toString(),
          outline: "solid 1px rgba(255,255,255,0.1)",
          // marginTop: -8 * this.project.camera.currentScale + "px",
        },
        selectAll,
      )
      .then(() => {
        // clickedLineEdge!.isEditing = false;
        // 因为这里用的是不透明文本框，所以不需要停止节点上文字的渲染
        this.project.controller.isCameraLocked = false;
        // Re-enable keyboard shortcuts after text editing finishes
        this.project.keyboardOnlyEngine.setOpenning(true);
        this.project.historyManager.recordStep();
      });
  }

  editUrlNodeTitle(clickedUrlNode: UrlNode) {
    this.project.controller.isCameraLocked = true;
    // Disable keyboard shortcuts during text editing to prevent conflicts
    this.project.keyboardOnlyEngine.setOpenning(false);
    // 编辑节点
    clickedUrlNode.isEditingTitle = true;
    this.project.inputElement
      .input(
        this.project.renderer
          .transformWorld2View(clickedUrlNode.rectangle.location)
          .add(Vector.same(Renderer.NODE_PADDING).multiply(this.project.camera.currentScale)),
        clickedUrlNode.title,
        (text) => {
          clickedUrlNode?.rename(text);
        },
        {
          fontSize: Renderer.FONT_SIZE * this.project.camera.currentScale + "px",
          backgroundColor: "transparent",
          color: this.project.stageStyleManager.currentStyle.StageObjectBorder.toString(),
          outline: "none",
          marginTop: -8 * this.project.camera.currentScale + "px",
          width: "100vw",
        },
      )
      .then(() => {
        clickedUrlNode!.isEditingTitle = false;
        this.project.controller.isCameraLocked = false;
        // Re-enable keyboard shortcuts after text editing finishes
        this.project.keyboardOnlyEngine.setOpenning(true);
        this.project.historyManager.recordStep();
      });
  }

  editSectionTitle(section: Section) {
    this.project.controller.isCameraLocked = true;
    // Disable keyboard shortcuts during text editing to prevent conflicts
    this.project.keyboardOnlyEngine.setOpenning(false);
    // 编辑节点
    section.isEditingTitle = true;
    this.project.inputElement
      .input(
        this.project.renderer
          .transformWorld2View(section.rectangle.location)
          .add(Vector.same(Renderer.NODE_PADDING).multiply(this.project.camera.currentScale)),
        section.text,
        (text) => {
          section.rename(text);
        },
        {
          position: "fixed",
          resize: "none",
          boxSizing: "border-box",
          fontSize: Renderer.FONT_SIZE * this.project.camera.currentScale + "px",
          backgroundColor: "transparent",
          color: this.project.stageStyleManager.currentStyle.StageObjectBorder.toString(),
          outline: `solid ${2 * this.project.camera.currentScale}px ${this.project.stageStyleManager.currentStyle.effects.successShadow.toNewAlpha(0.25).toString()}`,
          marginTop: -8 * this.project.camera.currentScale + "px",
        },
      )
      .then(() => {
        section.isEditingTitle = false;
        this.project.controller.isCameraLocked = false;
        // Re-enable keyboard shortcuts after text editing finishes
        this.project.keyboardOnlyEngine.setOpenning(true);
        this.project.historyManager.recordStep();
      });
  }

  editPortalNodeTitle(clickedPortalNode: PortalNode) {
    this.project.controller.isCameraLocked = true;
    // 编辑节点
    clickedPortalNode.isEditingTitle = true;
    this.project.inputElement
      .input(
        this.project.renderer
          .transformWorld2View(clickedPortalNode.rectangle.location)
          .add(Vector.same(Renderer.NODE_PADDING).multiply(this.project.camera.currentScale)),
        clickedPortalNode.title,
        (text) => {
          clickedPortalNode?.rename(text);
        },
        {
          fontSize: Renderer.FONT_SIZE * this.project.camera.currentScale + "px",
          backgroundColor: "transparent",
          color: this.project.stageStyleManager.currentStyle.StageObjectBorder.toString(),
          outline: "none",
          marginTop: -8 * this.project.camera.currentScale + "px",
          width: "100vw",
        },
      )
      .then(() => {
        clickedPortalNode!.isEditingTitle = false;
        this.project.controller.isCameraLocked = false;
        this.project.historyManager.recordStep();
      });
  }

  /**
   * 一个全局对象，用于编辑节点的钩子函数
   */
  editTextNodeHookGlobal = {
    /**
     * 编辑节点的钩子函数，用于开始编辑，弹窗触发
     * @param _
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hookFunctionStart(_: Entity) {
      // 在外部将被修改
    },
    /**
     * 编辑节点的钩子函数，用于结束编辑，弹窗关闭
     * @param _
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hookFunctionEnd(_: Entity) {
      // 在外部将被修改
    },
  };

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

    clickedNode.isEditingDetails = true;
    this.editTextNodeHookGlobal.hookFunctionStart(clickedNode);
  }

  async addTextNodeByLocation(location: Vector, selectCurrent: boolean = false) {
    const sections = this.project.sectionMethods.getSectionsByInnerLocation(location);
    // 新建节点
    const uuid = await this.project.nodeAdder.addTextNodeByClick(location, sections, selectCurrent);
    this.textNodeInEditModeByUUID(uuid);
    return uuid;
  }
  createConnectPoint(location: Vector) {
    const sections = this.project.sectionMethods.getSectionsByInnerLocation(location);
    this.project.nodeAdder.addConnectPoint(location, sections);
  }

  addTextNodeFromCurrentSelectedNode(direction: Direction, selectCurrent = false) {
    this.project.nodeAdder.addTextNodeFromCurrentSelectedNode(direction, [], selectCurrent).then((uuid) => {
      this.textNodeInEditModeByUUID(uuid);
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
      if (selectedEntity instanceof TextNode) {
        const resizeRect = selectedEntity.getResizeHandleRect();
        if (resizeRect.isPointIn(clickedLocation)) {
          // 点中了扩大缩小的东西
          return true;
        }
      }
    }
    return false;
  }
}
