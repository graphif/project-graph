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
import AutoCompleteWindow from "@/sub/AutoCompleteWindow";
import NodeDetailsWindow from "@/sub/NodeDetailsWindow";
import { Direction } from "@/types/directions";
import { isDesktop } from "@/utils/platform";
import { Color, colorInvert, Vector } from "@graphif/data-structures";
import { toast } from "sonner";
import { PathString } from "@/utils/pathString";
import { DateChecker } from "@/utils/dateChecker";

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
        async (text, ele) => {
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
          padding: Renderer.NODE_PADDING * this.project.camera.currentScale + "px",
          fontSize: Renderer.FONT_SIZE * this.project.camera.currentScale + "px",
          backgroundColor: "transparent",
          color: fontColor,
          outline: `solid ${1 * this.project.camera.currentScale}px ${this.project.stageStyleManager.currentStyle.effects.successShadow.toNewAlpha(0.1).toString()}`,
          borderRadius: `${Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale}px`,
        },
        selectAll,
        // rectWorld.width * this.project.camera.currentScale, // limit width
      )
      .then(() => {
        SubWindow.close(lastAutoCompleteWindowId);
        clickedNode!.isEditing = false;
        this.project.controller.isCameraLocked = false;
        // this.project.historyManager.recordStep();

        // 实验
        this.finishChangeTextNode(clickedNode);
      });
  }

  editEdgeText(clickedLineEdge: Edge, selectAll = true) {
    this.project.controller.isCameraLocked = true;

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
    this.project.controller.isCameraLocked = true;
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
    });
  }

  async addTextNodeByLocation(location: Vector, selectCurrent: boolean = false) {
    const sections = this.project.sectionMethods.getSectionsByInnerLocation(location);
    // 新建节点
    const uuid = await this.project.nodeAdder.addTextNodeByClick(location, sections, selectCurrent);
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
      if (matchingNodes.length > 0) {
        const windowId = AutoCompleteWindow.open(
          this.project.renderer.transformWorld2View(node.rectangle).leftBottom,
          Object.fromEntries(matchingNodes),
          (value) => {
            ele.value = value;
          },
        ).id;
        setWindowId(windowId);
      } else {
        const windowId = AutoCompleteWindow.open(
          this.project.renderer.transformWorld2View(node.rectangle).leftBottom,
          {
            tip:
              searchText === ""
                ? "暂无匹配的逻辑节点名称，请输入全大写字母"
                : `暂无匹配的逻辑节点名称【${searchText}】`,
          },
          (value) => {
            ele.value = value;
          },
        ).id;
        setWindowId(windowId);
      }
      // 处理[[格式的补全
    } else if (text.startsWith("[[")) {
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
        if (matchingFiles.length > 0) {
          const windowId = AutoCompleteWindow.open(
            this.project.renderer.transformWorld2View(node.rectangle).leftBottom,
            Object.fromEntries(matchingFiles),
            (value) => {
              // 用户选择后，需要保留[[前缀并添加选择的文件名
              ele.value = `[[${value}`;
            },
          ).id;
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
        if (matchingSections.length > 0) {
          const windowId = AutoCompleteWindow.open(
            this.project.renderer.transformWorld2View(node.rectangle).leftBottom,
            Object.fromEntries(matchingSections),
            (value) => {
              // 用户选择后，需要保留[[前缀、文件名和#，并添加选择的section名称
              ele.value = `[[${fileName}#${value}`;
            },
          ).id;
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
          setWindowId(windowId);
        }
      }
    }
  }

  // 实验性的孪生关系
  public finishChangeTextNode(textNode: TextNode) {
    // 查找所有无向边，如果无向边的颜色 = (11, 45, 14, 0)，那么就找到了一个关联
    const edges: MultiTargetUndirectedEdge[] = [];

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

    return edges;
  }
}
