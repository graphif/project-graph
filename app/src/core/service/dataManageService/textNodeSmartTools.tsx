import { Dialog } from "@/components/ui/dialog";
import { loadAllServicesBeforeInit } from "@/core/loadAllServices";
import { Project } from "@/core/Project";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { Settings } from "@/core/service/Settings";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { DetailsManager } from "@/core/stage/stageObject/tools/entityDetailsManager";
import { PathString } from "@/utils/pathString";
import { averageColors, Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";
import { v4 } from "uuid";

export namespace TextNodeSmartTools {
  /**
   * 根据指向该节点的连线计算缩放锚点：无连线则中心；仅一条则用该连线在节点上的 target 比例。
   * 用于 Ctrl+加减号 放大缩小节点时保持锚点不动。
   */
  export function getAnchorRateForTextNode(project: Project, node: TextNode): Vector {
    const incomingEdges = project.graphMethods.edgeParentArray(node);
    if (incomingEdges.length === 0) return new Vector(0.5, 0.5);
    if (incomingEdges.length === 1) return incomingEdges[0].targetRectangleRate.clone();
    return new Vector(0.5, 0.5);
  }

  /**
   * 切换文本节点的宽度调整模式（ttt 快捷键）
   *
   * - auto → manual：将宽度设为「textNodeManualDefaultCharWidth」设置项指定的字符数对应的像素值
   *   换算公式：pixelWidth = charWidth × FONT_SIZE + NODE_PADDING × 2
   * - manual → auto：根据文本内容自动调整宽度
   */
  export function ttt(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    for (const node of selectedTextNodes) {
      if (node.sizeAdjust === "auto") {
        node.sizeAdjust = "manual";
        const charWidth = Settings.textNodeManualDefaultCharWidth;
        // FONT_SIZE = 32（一个中文字符的宽度），NODE_PADDING = 14（节点内边距）
        const pixelWidth = charWidth * node.getFontSize() + node.getPadding() * 2;
        node.resizeWidthTo(pixelWidth);
      } else if (node.sizeAdjust === "manual") {
        node.sizeAdjust = "auto";
        node.forceAdjustSizeByText();
      }
    }
  }
  /**
   * 揉成一个
   * @param project
   * @returns
   */
  export function rua(project: Project) {
    let selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    if (selectedTextNodes.length <= 1) {
      toast.error("rua的节点数量不能小于2");
      return;
    }
    setTimeout(() => {
      project.camera.clearMoveCommander();
      Dialog.input("请输入连接符（n代表一个换行符，t代表一个制表符）").then((userInput) => {
        if (userInput === undefined) return;
        userInput = userInput.replaceAll("n", "\n");
        userInput = userInput.replaceAll("t", "\t");
        selectedTextNodes = selectedTextNodes.sort(
          (a, b) => a.collisionBox.getRectangle().location.y - b.collisionBox.getRectangle().location.y,
        );

        // 收集所有连线信息
        const upstreamEdges = collectUpstreamEdges(project, selectedTextNodes);
        const downstreamEdges = collectDownstreamEdges(project, selectedTextNodes);

        // 创建合并后的节点
        const newTextNode = createMergedNode(project, selectedTextNodes, userInput);
        project.stageManager.add(newTextNode);

        // 处理上游连线
        processUpstreamEdges(project, upstreamEdges, newTextNode);

        // 处理下游连线
        processDownstreamEdges(project, downstreamEdges, newTextNode);

        // 选中新的节点
        newTextNode.isSelected = true;
        project.stageManager.deleteEntities(selectedTextNodes);
      });
    });
  }

  /**
   * 收集所有上游连线，按源节点分组
   */
  function collectUpstreamEdges(project: Project, nodes: TextNode[]): Map<string, Edge[]> {
    const upstreamEdges = new Map<string, Edge[]>();

    nodes.forEach((node) => {
      const edges = project.graphMethods.edgeParentArray(node);
      edges.forEach((edge) => {
        if (!nodes.includes(edge.source as TextNode)) {
          // 只收集来自外部节点的连线
          const sourceId = edge.source.uuid;
          if (!upstreamEdges.has(sourceId)) {
            upstreamEdges.set(sourceId, []);
          }
          upstreamEdges.get(sourceId)!.push(edge);
        }
      });
    });

    return upstreamEdges;
  }

  /**
   * 收集所有下游连线，按目标节点分组
   */
  function collectDownstreamEdges(project: Project, nodes: TextNode[]): Map<string, Edge[]> {
    const downstreamEdges = new Map<string, Edge[]>();

    nodes.forEach((node) => {
      const edges = project.graphMethods.edgeChildrenArray(node);
      edges.forEach((edge) => {
        if (!nodes.includes(edge.target as TextNode)) {
          // 只收集指向外部节点的连线
          const targetId = edge.target.uuid;
          if (!downstreamEdges.has(targetId)) {
            downstreamEdges.set(targetId, []);
          }
          downstreamEdges.get(targetId)!.push(edge);
        }
      });
    });

    return downstreamEdges;
  }

  /**
   * 创建合并后的节点
   */
  function createMergedNode(project: Project, nodes: TextNode[], userInput: string): TextNode {
    let mergeText = "";
    const detailsList = [];
    for (const textNode of nodes) {
      mergeText += textNode.text + userInput;
      detailsList.push(textNode.details);
    }
    mergeText = mergeText.trim();
    const leftTop = Rectangle.getBoundingRectangle(nodes.map((node) => node.collisionBox.getRectangle())).leftTop;
    const avgColor = averageColors(nodes.map((node) => node.color));

    return new TextNode(project, {
      uuid: v4(),
      text: mergeText,
      collisionBox: new CollisionBox([new Rectangle(new Vector(leftTop.x, leftTop.y), new Vector(400, 1))]),
      color: avgColor.clone(),
      sizeAdjust: userInput.includes("\n") ? "manual" : "auto",
      details: DetailsManager.mergeDetails(detailsList),
    });
  }

  /**
   * 处理上游连线
   */
  function processUpstreamEdges(project: Project, upstreamEdges: Map<string, Edge[]>, newNode: TextNode) {
    upstreamEdges.forEach((edges) => {
      const source = edges[0].source;

      // 合并连线属性
      const mergedEdgeProps = mergeEdgeProperties(edges);

      // 创建新连线
      project.stageManager.add(
        new LineEdge(project, {
          associationList: [source, newNode],
          text: mergedEdgeProps.text,
          targetRectangleRate: mergedEdgeProps.targetRectangleRate,
          sourceRectangleRate: mergedEdgeProps.sourceRectangleRate,
          color: mergedEdgeProps.color,
        }),
      );
    });
  }

  /**
   * 处理下游连线
   */
  function processDownstreamEdges(project: Project, downstreamEdges: Map<string, Edge[]>, newNode: TextNode) {
    downstreamEdges.forEach((edges) => {
      const target = edges[0].target;

      // 合并连线属性
      const mergedEdgeProps = mergeEdgeProperties(edges);

      // 创建新连线
      project.stageManager.add(
        new LineEdge(project, {
          associationList: [newNode, target],
          text: mergedEdgeProps.text,
          targetRectangleRate: mergedEdgeProps.targetRectangleRate,
          sourceRectangleRate: mergedEdgeProps.sourceRectangleRate,
          color: mergedEdgeProps.color,
        }),
      );
    });
  }

  /**
   * 合并连线属性
   */
  function mergeEdgeProperties(edges: Edge[]): {
    text: string;
    targetRectangleRate: Vector;
    sourceRectangleRate: Vector;
    color: Color;
  } {
    // 合并文本：按遍历顺序拼接不重复的文本
    const texts = new Set<string>();
    edges.forEach((edge) => {
      if (edge.text && edge.text.trim()) {
        texts.add(edge.text.trim());
      }
    });
    const mergedText = Array.from(texts).join(" ");

    // 使用最后一个连线的位置属性
    const lastEdge = edges[edges.length - 1];

    // 合并颜色
    const colors = edges.map((edge) => edge.color);
    const mergedColor = averageColors(colors);

    return {
      text: mergedText,
      targetRectangleRate: lastEdge.targetRectangleRate.clone(),
      sourceRectangleRate: lastEdge.sourceRectangleRate.clone(),
      color: mergedColor.clone(),
    };
  }

  export function kei(project: Project) {
    // 获取所有选中的文本节点
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    selectedTextNodes.forEach((node) => {
      node.isSelected = false;
    });
    setTimeout(() => {
      Dialog.input("请输入分割符（n代表一个换行符，t代表一个制表符）").then((userInput) => {
        if (userInput === undefined || userInput === "") return;
        userInput = userInput.replaceAll("n", "\n");
        userInput = userInput.replaceAll("t", "\t");
        for (const node of selectedTextNodes) {
          keiOneTextNode(project, node, userInput);
        }
        // 删除所有选中的文本节点
        project.stageManager.deleteEntities(selectedTextNodes);
      });
    });
  }

  function keiOneTextNode(project: Project, node: TextNode, userInput: string) {
    const text = node.text;
    const seps = [userInput];
    const escapedSeps = seps.map((sep) => sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(escapedSeps.join("|"), "g");
    const splitedTextList = text.split(regex).filter((item) => item !== "");
    const putLocation = node.collisionBox.getRectangle().location.clone();

    const newNodes: TextNode[] = [];

    const fromLines: Edge[] = project.graphMethods.edgeParentArray(node);
    const toLines: Edge[] = project.graphMethods.edgeChildrenArray(node);

    splitedTextList.forEach((splitedText) => {
      const newTextNode = new TextNode(project, {
        uuid: v4(),
        text: splitedText,
        collisionBox: new CollisionBox([new Rectangle(new Vector(putLocation.x, putLocation.y), new Vector(1, 1))]),
        color: node.color.clone(),
      });
      newNodes.push(newTextNode);
      project.stageManager.add(newTextNode);
      putLocation.y += 100;
    });

    fromLines.forEach((edge) => {
      newNodes.forEach((newNode) => {
        project.stageManager.add(
          new LineEdge(project, {
            associationList: [edge.source, newNode],
            text: edge.text,
            targetRectangleRate: edge.targetRectangleRate.clone(),
            sourceRectangleRate: edge.sourceRectangleRate.clone(),
            color: edge.color.clone(),
          }),
        );
      });
    });
    toLines.forEach((edge) => {
      newNodes.forEach((newNode) => {
        project.stageManager.add(
          new LineEdge(project, {
            associationList: [newNode, edge.target],
            text: edge.text,
            targetRectangleRate: edge.targetRectangleRate.clone(),
            sourceRectangleRate: edge.sourceRectangleRate.clone(),
            color: edge.color.clone(),
          }),
        );
      });
    });

    // 再整体向下排列一下
    newNodes.forEach((newNode) => {
      newNode.isSelected = true;
    });
    project.layoutManager.alignTopToBottomNoSpace();
    newNodes.forEach((newNode) => {
      newNode.isSelected = false;
    });
  }

  export function exchangeTextAndDetails(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    for (const node of selectedTextNodes) {
      const details = node.details;
      const text = node.text;
      node.details = DetailsManager.markdownToDetails(text);
      node.text = DetailsManager.detailsToMarkdown(details);
      node.forceAdjustSizeByText();
    }
    project.historyManager.recordStep();
  }

  export function removeFirstCharFromSelectedTextNodes(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    if (selectedTextNodes.length === 0) {
      return;
    }

    // 记录操作历史
    project.historyManager.recordStep();

    for (const node of selectedTextNodes) {
      if (node.text.length > 0) {
        // 获取要移除的字符
        const removedChar = node.text.charAt(0);

        // 更新原节点文本
        node.rename(node.text.substring(1));

        // 创建新的单字符节点
        const rect = node.collisionBox.getRectangle();

        // 创建新节点（先创建但不立即添加到舞台，以便获取其实际宽度）
        const newNode = new TextNode(project, {
          text: removedChar,
          collisionBox: new CollisionBox([new Rectangle(new Vector(0, 0), new Vector(0, 0))]),
          color: node.color.clone(),
        });

        // 计算新节点的实际宽度
        const newNodeWidth = newNode.collisionBox.getRectangle().width;

        // 检测左侧是否有单字符节点，如果有则将它们往左推
        const textNodes = project.stageManager.getTextNodes();
        const leftNodes = textNodes.filter(
          (n) =>
            n !== node &&
            n.text.length === 1 &&
            n.rectangle.right <= rect.left &&
            Math.abs(n.rectangle.center.y - rect.center.y) < rect.size.y / 2,
        );

        // 按x坐标从右到左排序，确保先推最靠近原节点的
        leftNodes.sort((a, b) => b.rectangle.right - a.rectangle.right);

        // 推动现有节点，使用新节点的实际宽度作为推动距离
        leftNodes.forEach((n) => {
          n.move(new Vector(-newNodeWidth, 0));
        });

        // 设置新节点的位置，使其右侧边缘贴住原节点的左侧边缘
        newNode.moveTo(new Vector(rect.left - newNodeWidth, rect.location.y));
        // 添加到舞台
        project.stageManager.add(newNode);

        // 保持原节点的选中状态
        node.isSelected = true;
      }
    }
  }

  export function removeLastCharFromSelectedTextNodes(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    if (selectedTextNodes.length === 0) {
      return;
    }

    // 记录操作历史
    project.historyManager.recordStep();

    for (const node of selectedTextNodes) {
      if (node.text.length > 0) {
        // 获取要移除的字符
        const removedChar = node.text.charAt(node.text.length - 1);

        // 更新原节点文本
        node.rename(node.text.substring(0, node.text.length - 1));

        // 创建新的单字符节点
        const rect = node.collisionBox.getRectangle();

        // 创建新节点（先创建但不立即添加到舞台，以便获取其实际宽度）
        const newNode = new TextNode(project, {
          text: removedChar,
          collisionBox: new CollisionBox([new Rectangle(new Vector(0, 0), new Vector(0, 0))]),
          color: node.color.clone(),
        });

        // 计算新节点的实际宽度
        const newNodeWidth = newNode.collisionBox.getRectangle().width;

        // 检测右侧是否有单字符节点，如果有则将它们往右推
        const textNodes = project.stageManager.getTextNodes();
        const rightNodes = textNodes.filter(
          (n) =>
            n !== node &&
            n.text.length === 1 &&
            n.rectangle.left >= rect.right &&
            Math.abs(n.rectangle.center.y - rect.center.y) < rect.size.y / 2,
        );

        // 按x坐标从左到右排序，确保先推最靠近原节点的
        rightNodes.sort((a, b) => a.rectangle.left - b.rectangle.left);

        // 推动现有节点，使用新节点的实际宽度作为推动距离
        rightNodes.forEach((n) => {
          n.move(new Vector(newNodeWidth, 0));
        });

        // 设置新节点的位置，使其左侧边缘贴住原节点的右侧边缘
        newNode.moveTo(new Vector(rect.right, rect.location.y));

        // 添加到舞台
        project.stageManager.add(newNode);

        // 保持原节点的选中状态
        node.isSelected = true;
      }
    }
  }

  const specialColorList = [new Color(59, 114, 60), new Color(61, 10, 11)];
  const specialCharPrefix = ["✅", "❌"];

  export function okk(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    for (const node of selectedTextNodes) {
      if (specialColorList.some((value) => value.equals(node.color))) {
        node.color = Color.Transparent;
      } else {
        node.color = new Color(59, 114, 60);
      }
      // 向孪生兄弟同步 color
      project.syncAssociationManager.syncFrom(node, "color");
      if (specialCharPrefix.some((value) => node.text.startsWith(value + " "))) {
        node.rename(node.text.slice(2));
      } else {
        node.rename("✅ " + node.text);
      }
      project.controllerUtils.finishChangeTextNode(node);
    }
    project.stageManager.updateReferences();
  }

  export function err(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    for (const node of selectedTextNodes) {
      if (specialColorList.some((value) => value.equals(node.color))) {
        node.color = Color.Transparent;
      } else {
        node.color = new Color(61, 10, 11);
      }
      // 向孪生兄弟同步 color
      project.syncAssociationManager.syncFrom(node, "color");
      if (specialCharPrefix.some((value) => node.text.startsWith(value + " "))) {
        node.rename(node.text.slice(2));
      } else {
        node.rename("❌ " + node.text);
      }
      project.controllerUtils.finishChangeTextNode(node);
    }
    project.stageManager.updateReferences();
  }

  /**
   * 递归地从一个实体中提取所有可搜索的纯文本（markdown格式）
   */
  function collectEntityText(entity: Entity): string {
    const parts: string[] = [];

    if (entity instanceof Section) {
      parts.push(entity.text);
      if (!entity.detailsManager.isEmpty()) {
        parts.push(DetailsManager.detailsToMarkdown(entity.details));
      }
      for (const child of entity.children) {
        parts.push(collectEntityText(child));
      }
    } else if (entity instanceof TextNode) {
      parts.push(entity.text);
      if (!entity.detailsManager.isEmpty()) {
        parts.push(DetailsManager.detailsToMarkdown(entity.details));
      }
    } else {
      if (!entity.detailsManager.isEmpty()) {
        parts.push(DetailsManager.detailsToMarkdown(entity.details));
      }
    }

    return parts.filter(Boolean).join("\n");
  }

  /**
   * 加载被引用文件，提取目标Section（或全文件）的所有文本内容，返回markdown字符串。
   * 找不到文件或Section时静默返回空字符串。
   */
  async function extractSectionText(fileName: string, sectionName: string): Promise<string> {
    try {
      const recentFiles = await RecentFileManager.getRecentFiles();
      const file = recentFiles.find(
        (f) =>
          PathString.getFileNameFromPath(f.uri.path) === fileName ||
          PathString.getFileNameFromPath(f.uri.fsPath) === fileName,
      );
      if (!file) return "";

      const tempProject = new Project(file.uri);
      loadAllServicesBeforeInit(tempProject);
      await tempProject.init();

      try {
        if (sectionName) {
          const targetSection = tempProject.stage.find((obj) => obj instanceof Section && obj.text === sectionName) as
            | Section
            | undefined;
          if (!targetSection) return "";
          return collectEntityText(targetSection);
        } else {
          // 引用整个文件：收集所有顶层实体
          return tempProject.stage
            .filter((obj) => obj instanceof Entity)
            .map((obj) => collectEntityText(obj as Entity))
            .filter(Boolean)
            .join("\n");
        }
      } finally {
        tempProject.dispose();
      }
    } catch {
      return "";
    }
  }

  /**
   * 将选中的特殊格式文本节点转换成引用块
   *
   * 流程：
   * 1. 解析 [[文件名]] 或 [[文件名#Section名]]
   * 2. 收集原节点上的所有连线（用于后续迁移）
   * 3. 创建引用块节点
   * 4. 用 Section 框包裹引用块，以文件名作为框标题
   * 5. 将被引用 Section 的文字提取到 details，供搜索使用
   * 6. 迁移原节点的所有连线到新引用块
   * 7. 删除原文本节点
   */
  export async function changeTextNodeToReferenceBlock(project: Project) {
    // 仅当项目不是草稿时才更新引用
    if (project.isDraft) {
      toast.error("在草稿项目中不能创建引用块");
      return;
    }

    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    if (selectedTextNodes.length !== 1) {
      if (selectedTextNodes.length === 0) {
        toast.error(
          "没有选中任何文本节点，无法触发文本节点到引用块的转化，可以尝试按Enter键退出编辑状态的方式触发转化",
        );
        return;
      }
      toast.error("只能选中一个节点作为引用块，您选中了多个文本节点");
      return;
    }
    const selectedNode = selectedTextNodes[0];
    const text = selectedNode.text;

    // 解析引用格式：[[文件名]] 或 [[文件名#Section名]]
    let referenceName = "";
    if (text.trim().startsWith("[[") && text.trim().endsWith("]]")) {
      referenceName = text.trim().slice(2, -2);
    } else {
      toast.error("引用块必须以[[和]]包裹");
      return;
    }
    const fileName = referenceName.split("#")[0];
    const sectionName = referenceName.split("#")[1] || "";

    // 步骤1：收集所有与原节点相关的连线（用于后续迁移）
    const associations = project.stageManager.getAssociations();
    const relatedEdges: (Edge | MultiTargetUndirectedEdge)[] = [];
    for (const association of associations) {
      if (association instanceof Edge) {
        if (association.source === selectedNode || association.target === selectedNode) {
          relatedEdges.push(association);
        }
      } else if (association instanceof MultiTargetUndirectedEdge) {
        if (association.associationList.includes(selectedNode)) {
          relatedEdges.push(association);
        }
      }
    }

    // 步骤2：创建引用块节点
    const referenceBlock = new ReferenceBlockNode(project, {
      collisionBox: new CollisionBox([
        new Rectangle(selectedNode.collisionBox.getRectangle().leftTop, new Vector(100, 100)),
      ]),
      fileName,
      sectionName,
    });

    project.stageManager.add(referenceBlock);

    // 步骤3：用 Section 框包裹引用块，以文件名作为标题
    const section = Section.fromEntities(project, [referenceBlock]);
    section.rename(fileName);
    project.stageManager.add(section);

    // 步骤4：提取被引用 Section 内的所有文字到 details，供当前项目搜索
    const markdown = await extractSectionText(fileName, sectionName);
    if (markdown.trim()) {
      referenceBlock.details = DetailsManager.markdownToDetails(markdown);
    }

    // 步骤5：迁移所有相关连线到新的引用块节点
    for (const edge of relatedEdges) {
      if (edge instanceof Edge) {
        if (edge.source === selectedNode) edge.source = referenceBlock;
        if (edge.target === selectedNode) edge.target = referenceBlock;
      } else if (edge instanceof MultiTargetUndirectedEdge) {
        const index = edge.associationList.indexOf(selectedNode);
        if (index !== -1) edge.associationList[index] = referenceBlock;
      }
    }

    // 步骤6：删除原文本节点
    project.stageManager.delete(selectedNode);
    await project.referenceManager.insertRefDataToSourcePrgFile(fileName, sectionName);
  }
}
