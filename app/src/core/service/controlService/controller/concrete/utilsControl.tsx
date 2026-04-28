import { Project, service } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { LogicNodeNameToRenderNameMap } from "@/core/service/dataGenerateService/autoComputeEngine/logicNodeNameEnum";
import { CrossFileContentQuery } from "@/core/service/dataGenerateService/crossFileContentQuery";
import Fuse from "fuse.js";
import { EntityCreateFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityCreateFlashEffect";
import { SubWindow } from "@/core/service/SubWindow";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { LatexNode } from "@/core/stage/stageObject/entity/LatexNode";
import LatexEditWindow from "@/sub/LatexEditWindow";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Rectangle } from "@graphif/shapes";
import AutoCompleteWindow from "@/sub/AutoCompleteWindow";
import NodeDetailsWindow from "@/sub/NodeDetailsWindow";
import { Direction } from "@/types/directions";
import { isDesktop } from "@/utils/platform";
import { Color, colorInvert, Vector } from "@graphif/data-structures";
import { toast } from "sonner";
import { PathString } from "@/utils/pathString";
import { DateChecker } from "@/utils/dateChecker";
import { TextNodeSmartTools } from "@/core/service/dataManageService/textNodeSmartTools";
import { ReferenceManager } from "@/core/stage/stageManager/concreteMethods/StageReferenceManager";
import _ from "lodash";
import { Settings } from "@/core/service/Settings";
import { RectangleLittleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleLittleNoteEffect";
import { ReferenceFileScanner } from "@/core/service/dataFileService/ReferenceFileScanner";
import { loadAllServicesAfterInit, loadAllServicesBeforeInit } from "@/core/loadAllServices";
import { activeTabAtom, tabsAtom, store } from "@/state";
import { URI } from "vscode-uri";

/**
 * 这里是专门存放代码相同的地方
 *    因为有可能多个控制器公用同一个代码，
 */
@service("controllerUtils")
export class ControllerUtils {
  private currentAutoCompleteWindowId: string | undefined;
  constructor(private readonly project: Project) {}

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
    // RectangleElement.div(rectView, this.project.stageStyleManager.currentStyle.CollideBoxSelected);
    let lastAutoCompleteWindowId: string;
    // 实时 LaTeX 预览 div（输入 $...$ 时在节点上方显示）
    let latexPreviewDiv: HTMLDivElement | null = null;
    let latexPreviewDismissed = false; // 标志：编辑已结束，禁止异步回调继续创建预览框
    let latexPreviewRequestId = 0;
    let katexPromise: Promise<typeof import("katex")> | null = null;
    const removeLatexPreview = () => {
      if (latexPreviewDiv) {
        latexPreviewDiv.remove();
        latexPreviewDiv = null;
      }
    };
    const dismissLatexPreview = () => {
      latexPreviewDismissed = true;
      removeLatexPreview();
    };
    const getInlineLatexAtCursor = (value: string, cursor: number): string | null => {
      const pos = Math.max(0, Math.min(cursor, value.length));
      const dollarIndices: number[] = [];
      for (let i = 0; i < value.length; i++) {
        if (value[i] === "$") dollarIndices.push(i);
      }
      let k = 0;
      while (k < dollarIndices.length && dollarIndices[k] < pos) k++;
      if (k % 2 === 0) return null;
      const start = dollarIndices[k - 1]!;
      const end = dollarIndices[k] ?? -1;
      const content = end === -1 ? value.slice(start + 1, pos) : value.slice(start + 1, end);
      return content;
    };
    this.project.inputElement
      .textarea(
        clickedNode.text,
        // "",
        async (text, ele) => {
          const currentRequestId = ++latexPreviewRequestId;
          if (lastAutoCompleteWindowId) {
            SubWindow.close(lastAutoCompleteWindowId);
          }
          // 自动补全逻辑
          await this.handleAutoComplete(text, clickedNode, ele, (value) => {
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

          this.finishChangeTextNode(clickedNode);

          // 实时 LaTeX 预览：检测光标附近的 $...$ 片段
          const cursor =
            ele.selectionStart === null
              ? text.length
              : ele.selectionStart > 0 && text[ele.selectionStart - 1] === "$"
                ? ele.selectionStart - 1
                : ele.selectionStart;
          const latexContent = getInlineLatexAtCursor(text, cursor);
          if (latexContent !== null) {
            try {
              const { default: katex } = await (katexPromise ??= import("katex"));
              // 异步 import 之后先检查编辑是否已结束，避免在退出后重建预览框
              if (latexPreviewDismissed || currentRequestId !== latexPreviewRequestId) return;
              const previewHtml = katex.renderToString(latexContent || "\\ldots", {
                throwOnError: false,
                displayMode: true,
                output: "htmlAndMathml",
              });
              const currentRectView = this.project.renderer.transformWorld2View(
                clickedNode.collisionBox.getRectangle(),
              );
              if (!latexPreviewDiv) {
                latexPreviewDiv = document.createElement("div");
                latexPreviewDiv.style.cssText = `
                  position: fixed;
                  z-index: 9999;
                  background: var(--background, white);
                  border: 1px solid rgba(128,128,128,0.4);
                  border-radius: 6px;
                  padding: 8px 12px;
                  pointer-events: none;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                  max-width: 500px;
                `;
                document.body.appendChild(latexPreviewDiv);
              }
              latexPreviewDiv.innerHTML = previewHtml;
              const margin = 8;
              const previewHeight = latexPreviewDiv.offsetHeight || 60;
              const previewWidth = latexPreviewDiv.offsetWidth || 200;
              let left = currentRectView.left;
              let top = currentRectView.top - previewHeight - margin;
              if (top < margin) {
                top = currentRectView.top + currentRectView.height + margin;
              }
              left = Math.max(margin, Math.min(left, window.innerWidth - previewWidth - margin));
              top = Math.max(margin, Math.min(top, window.innerHeight - previewHeight - margin));
              latexPreviewDiv.style.left = `${left}px`;
              latexPreviewDiv.style.top = `${top}px`;
            } catch {
              // 忽略渲染错误
            }
          } else {
            removeLatexPreview();
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
          padding: clickedNode.getPadding() * this.project.camera.currentScale + "px",
          fontSize: clickedNode.getFontSize() * this.project.camera.currentScale + "px",
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
        dismissLatexPreview();
        clickedNode!.isEditing = false;
        this.project.controller.isCameraLocked = false;
        if (clickedNode.text !== textBeforeEdit) {
          this.project.historyManager.recordStep();
        }

        // 实验
        this.finishChangeTextNode(clickedNode);
        await this.autoChangeTextNodeToReferenceBlock(this.project, clickedNode);
        // 检测 $...$ 格式，自动转换为 LaTeX 公式节点
        await this.autoChangeTextNodeToLatexNode(this.project, clickedNode);
        // 文本节点退出编辑模式后，检查是否需要自动格式化树形结构
        if (Settings.textNodeAutoFormatTreeWhenExitEdit) {
          // 格式化树形结构
          this.project.keyboardOnlyTreeEngine.adjustTreeNode(clickedNode, false);
        }
      });
  }

  editEdgeText(clickedLineEdge: Edge, selectAll = true) {
    this.project.controller.isCameraLocked = true;
    // 停止摄像机漂移
    this.project.camera.stopImmediately();

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
        this.project.historyManager.recordStep();
      });
  }
  editMultiTargetEdgeText(clickedEdge: MultiTargetUndirectedEdge, selectAll = true) {
    this.project.controller.isCameraLocked = true;
    // 停止摄像机漂移
    this.project.camera.stopImmediately();

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
        this.project.historyManager.recordStep();
      });
  }

  editUrlNodeTitle(clickedUrlNode: UrlNode) {
    this.project.controller.isCameraLocked = true;
    // 停止摄像机漂移
    this.project.camera.stopImmediately();
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
        this.project.historyManager.recordStep();
      });
  }

  editSectionTitle(section: Section) {
    // 检查section是否被锁定（包括祖先section的锁定状态）
    if (this.project.sectionMethods.isObjectBeLockedBySection(section)) {
      toast.error("无法编辑已锁定的section");
      return;
    }
    this.project.controller.isCameraLocked = true;
    // 停止摄像机漂移
    this.project.camera.stopImmediately();
    // 编辑节点
    section.isEditingTitle = true;
    this.project.inputElement
      .input(
        this.project.renderer
          .transformWorld2View(section.rectangle.location.subtract(new Vector(0, section.text === "" ? 50 : 0)))
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
    console.log();
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
   * 将选中的内容标准化，如果选中了外层的section，也选中了内层的物体，则取消选中内部的物体
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

  /**
   * 处理自动补全逻辑
   * @param text 当前输入的文本
   * @param node 当前编辑的文本节点
   * @param ele 输入框元素
   * @param setWindowId 设置自动补全窗口ID的回调函数
   */
  private async handleAutoComplete(
    text: string,
    node: TextNode,
    ele: HTMLTextAreaElement,
    setWindowId: (id: string) => void,
  ) {
    // 处理#开头的逻辑节点补全
    if (text.startsWith("#")) {
      this.handleAutoCompleteLogic(text, node, ele, setWindowId);
      // 处理[[格式的补全
    } else if (text.startsWith("[[")) {
      this.handleAutoCompleteReferenceDebounced(text, node, ele, setWindowId);
    }
  }
  private handleAutoCompleteReferenceDebounced = _.debounce(
    (text: string, node: TextNode, ele: HTMLTextAreaElement, setWindowId: (id: string) => void) => {
      this.handleAutoCompleteReference(text, node, ele, setWindowId);
      console.log("ref匹配执行了");
    },
    500,
  );

  private handleAutoCompleteLogic(
    text: string,
    node: TextNode,
    ele: HTMLTextAreaElement,
    setWindowId: (id: string) => void,
  ) {
    // 提取搜索文本，去掉所有#
    const searchText = text.replaceAll("#", "").toLowerCase();

    const logicNodeEntries = Object.entries(LogicNodeNameToRenderNameMap).map(([key, renderName]) => ({
      key,
      name: key.replaceAll("#", "").toLowerCase(),
      renderName,
    }));

    const fuse = new Fuse(logicNodeEntries, {
      keys: ["name"],
      threshold: 0.3, // (0 = exact, 1 = very fuzzy)
    });

    const searchResults = fuse.search(searchText);
    const matchingNodes = searchResults.map((result) => [result.item.key, result.item.renderName]);

    // 打开自动补全窗口
    if (this.currentAutoCompleteWindowId) {
      SubWindow.close(this.currentAutoCompleteWindowId);
    }
    if (matchingNodes.length > 0) {
      const windowId = AutoCompleteWindow.open(
        this.project.renderer.transformWorld2View(node.rectangle).leftBottom,
        Object.fromEntries(matchingNodes),
        (value) => {
          ele.value = value;
        },
      ).id;
      this.currentAutoCompleteWindowId = windowId;
      setWindowId(windowId);
    } else {
      const windowId = AutoCompleteWindow.open(
        this.project.renderer.transformWorld2View(node.rectangle).leftBottom,
        {
          tip:
            searchText === "" ? "暂无匹配的逻辑节点名称，请输入全大写字母" : `暂无匹配的逻辑节点名称【${searchText}】`,
        },
        (value) => {
          ele.value = value;
        },
      ).id;
      this.currentAutoCompleteWindowId = windowId;
      setWindowId(windowId);
    }
  }

  private async handleAutoCompleteReference(
    text: string,
    node: TextNode,
    ele: HTMLTextAreaElement,
    setWindowId: (id: string) => void,
  ) {
    // 提取搜索文本，去掉开头的[[
    const searchText = text.slice(2).toLowerCase().replace("]]", "");
    // 检查是否包含#
    const hasHash = searchText.includes("#");

    if (!hasHash) {
      // 获取最近文件列表
      const recentFiles = await RecentFileManager.getRecentFiles();

      // 处理最近文件列表，提取文件名
      const fileEntries = recentFiles.map((file) => {
        // 提取文件名（不含扩展名）
        const fileName = PathString.getFileNameFromPath(file.uri.path);
        return { name: fileName, time: file.time }; // 使用对象格式以便Fuse.js搜索
      });

      const fuse = new Fuse(fileEntries, {
        keys: ["name"], // 搜索name属性
        threshold: 0.3,
      });

      const searchResults = fuse.search(searchText);
      const matchingFiles = searchResults.map((result) => [
        result.item.name,
        DateChecker.formatRelativeTime(result.item.time),
      ]); // 转换为相对时间格式

      // 打开自动补全窗口
      if (this.currentAutoCompleteWindowId) {
        SubWindow.close(this.currentAutoCompleteWindowId);
      }
      if (matchingFiles.length > 0) {
        const windowId = AutoCompleteWindow.open(
          this.project.renderer.transformWorld2View(node.rectangle).leftBottom,
          Object.fromEntries(matchingFiles),
          (value) => {
            // 用户选择后，需要保留[[前缀并添加选择的文件名
            ele.value = `[[${value}`;
          },
        ).id;
        this.currentAutoCompleteWindowId = windowId;
        setWindowId(windowId);
      } else {
        const windowId = AutoCompleteWindow.open(
          this.project.renderer.transformWorld2View(node.rectangle).leftBottom,
          {
            tip: searchText === "" ? "暂无最近文件" : `暂无匹配的最近文件【${searchText}】`,
          },
          (value) => {
            ele.value = `[[${value}`;
          },
        ).id;
        this.currentAutoCompleteWindowId = windowId;
        setWindowId(windowId);
      }
    } else {
      // 包含#，拆分文件名和section名称
      const [fileName, sectionName] = searchText.split("#", 2);

      // 获取该文件中的所有section
      const sections = await CrossFileContentQuery.getSectionsByFileName(fileName);

      // 将section名称转换为对象数组，以便Fuse.js搜索
      const sectionObjects = sections.map((section) => ({ name: section }));
      let searchResults;

      // 当section名称为空时，显示所有section（最多20个）
      if (!sectionName?.trim()) {
        // 取前20个section
        searchResults = sectionObjects.slice(0, 20).map((item) => ({ item }));
      } else {
        // 创建Fuse搜索器，对section名称进行模糊匹配
        const fuse = new Fuse(sectionObjects, { keys: ["name"], threshold: 0.3 });
        searchResults = fuse.search(sectionName);
      }

      const matchingSections = searchResults.map((result) => [result.item.name, ""]);

      // 打开自动补全窗口
      if (this.currentAutoCompleteWindowId) {
        SubWindow.close(this.currentAutoCompleteWindowId);
      }
      if (matchingSections.length > 0) {
        const windowId = AutoCompleteWindow.open(
          this.project.renderer.transformWorld2View(node.rectangle).leftBottom,
          Object.fromEntries(matchingSections),
          (value) => {
            // 用户选择后，需要保留[[前缀、文件名和#，并添加选择的section名称
            ele.value = `[[${fileName}#${value}`;
          },
        ).id;
        this.currentAutoCompleteWindowId = windowId;
        setWindowId(windowId);
      } else {
        const windowId = AutoCompleteWindow.open(
          this.project.renderer.transformWorld2View(node.rectangle).leftBottom,
          {
            tip: sectionName === "" ? `这个文件中没有section，无法创建引用` : `暂无匹配的section【${sectionName}】`,
          },
          (value) => {
            ele.value = `[[${fileName}#${value}`;
          },
        ).id;
        this.currentAutoCompleteWindowId = windowId;
        setWindowId(windowId);
      }
    }
  }

  // 完成编辑节点的操作
  public finishChangeTextNode(textNode: TextNode) {
    this.syncChangeTextNode(textNode);
  }

  /**
   * 自动将文本节点转换为引用块（支持自动创建新文件）
   *
   * 流程：
   * 1. 检测文本节点是否为 [[文件名]] 或 [[文件名#Section名]] 格式
   * 2. 优先在当前项目的引用文件夹中查找目标文件
   * 3. 找到文件：校验 Section 是否存在，然后直接创建引用块
   * 4. 未找到文件：自动创建新的 .prg 文件（含初始文本节点），切换到新项目，再创建引用块
   */
  private async autoChangeTextNodeToReferenceBlock(project: Project, textNode: TextNode) {
    if (!(textNode.text.startsWith("[[") && textNode.text.endsWith("]]"))) {
      return;
    }
    textNode.isSelected = true;

    const parserResult = ReferenceManager.referenceBlockTextParser(textNode.text);
    if (!parserResult.isValid) {
      toast.error(parserResult.invalidReason);
      return;
    }

    // 草稿项目不允许创建引用文件
    if (project.isDraft) {
      toast.error("草稿项目不能创建新引用文件");
      return;
    }

    // 优先在当前项目的引用文件夹中查找
    const foundPath = await ReferenceFileScanner.findFileInReferenceFolder(project.uri.fsPath, parserResult.fileName);

    if (foundPath) {
      // 文件已存在：加入最近文件列表，校验 Section，然后创建引用块
      await RecentFileManager.addRecentFileByUri(URI.file(foundPath));
      if (parserResult.sectionName) {
        const sections = await CrossFileContentQuery.getSectionsByFileName(parserResult.fileName);
        if (!sections.includes(parserResult.sectionName)) {
          toast.error(`文件【${parserResult.fileName}】中没有section【${parserResult.sectionName}】，不能创建引用`);
          return;
        }
      }
      await TextNodeSmartTools.changeTextNodeToReferenceBlock(project);
      return;
    }

    // 文件不存在：尝试从最近文件列表中查找（兼容旧逻辑）
    const recentFiles = await RecentFileManager.getRecentFiles();
    const recentFile = recentFiles.find(
      (item) => PathString.getFileNameFromPath(item.uri.fsPath) === parserResult.fileName,
    );
    if (recentFile) {
      if (parserResult.sectionName) {
        const sections = await CrossFileContentQuery.getSectionsByFileName(parserResult.fileName);
        if (!sections.includes(parserResult.sectionName)) {
          toast.error(`文件【${parserResult.fileName}】中没有section【${parserResult.sectionName}】，不能创建引用`);
          return;
        }
      }
      await TextNodeSmartTools.changeTextNodeToReferenceBlock(project);
      return;
    }

    // 文件完全不存在：自动在引用文件夹中创建新文件
    await ReferenceFileScanner.ensureReferenceFolderExists(project.uri.fsPath);
    const newUri = ReferenceFileScanner.getNewFileUri(project.uri.fsPath, parserResult.fileName);

    const newProject = Project.newDraft();
    newProject.uri = newUri;
    loadAllServicesBeforeInit(newProject);
    await newProject.init();
    loadAllServicesAfterInit(newProject);

    // 新文件中创建一个以文件名命名的初始文本节点
    const newTextNode = new TextNode(newProject, { text: parserResult.fileName });
    newProject.stageManager.add(newTextNode);
    newTextNode.isSelected = true;

    await newProject.save();
    await RecentFileManager.addRecentFileByUri(newUri);
    await ReferenceFileScanner.addFileToCache(project.uri.fsPath, parserResult.fileName);

    // 将新项目加入项目列表并切换
    store.set(tabsAtom, [...store.get(tabsAtom), newProject]);
    store.set(activeTabAtom, newProject);

    // 在原项目中创建引用块
    await TextNodeSmartTools.changeTextNodeToReferenceBlock(project);
  }

  /**
   * 自动将文本节点转换为 LaTeX 公式节点
   * 检测文本是否以 $ 开头和结尾（且长度 > 2），若是则创建 LatexNode 替换 TextNode
   */
  private async autoChangeTextNodeToLatexNode(project: Project, textNode: TextNode) {
    const text = textNode.text.trim();
    // 格式检测：以 $ 开头和结尾，且中间有内容
    if (!(text.startsWith("$") && text.endsWith("$") && text.length > 2)) {
      return;
    }
    // 防止误匹配 $$ 空公式（即 text = "$$"）
    const latexSource = text.slice(1, -1).trim();
    if (!latexSource) {
      return;
    }

    const location = textNode.collisionBox.getRectangle().location.clone();

    // 创建 LatexNode，放置在原 TextNode 相同位置
    const latexNode = new LatexNode(project, {
      latexSource,
      fontScaleLevel: 0,
      collisionBox: new CollisionBox([new Rectangle(location, Vector.getZero())]),
    });

    // 删除旧 TextNode（会自动清理关联边）
    project.deleteManager.deleteEntities([textNode]);

    // 添加新 LatexNode
    project.stageManager.add(latexNode);
    latexNode.isSelected = true;

    project.historyManager.recordStep();
  }

  /**
   * 编辑 LaTeX 公式节点（双击时调用）
   * 弹出编辑小窗口
   */
  editLatexNode(node: LatexNode) {
    LatexEditWindow.open(this.project, node);
  }

  // 同步更改孪生节点
  private syncChangeTextNode(textNode: TextNode) {
    // 查找所有无向边，如果无向边的颜色 = (11, 45, 14, 0)，那么就找到了一个关联

    const otherUUID: Set<string> = new Set();

    // 直接和这个节点相连的所有超边
    this.project.stageManager
      .getAssociations()
      .filter((association) => association instanceof MultiTargetUndirectedEdge)
      .filter((association) => association.color.equals(new Color(11, 45, 14, 0)))
      .filter((association) => association.associationList.includes(textNode))
      .forEach((association) => {
        association.associationList.forEach((node) => {
          if (node instanceof TextNode) {
            otherUUID.add(node.uuid);
          }
        });
      });

    otherUUID.forEach((uuid) => {
      const node = this.project.stageManager.getTextNodeByUUID(uuid);
      if (node) {
        // node.text = textNode.text;
        node.rename(textNode.text);
        node.color = textNode.color;
      }
    });
  }
}
