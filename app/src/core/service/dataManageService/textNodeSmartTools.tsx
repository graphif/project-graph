import { Dialog } from "@/components/ui/dialog";
import { loadAllServicesBeforeInit } from "@/core/loadAllServices";
import { Project } from "@/core/Project";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { DetailsManager } from "@/core/stage/stageObject/tools/entityDetailsManager";
import { PathString } from "@/utils/pathString";
import { averageColors, Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";
import { v4 } from "uuid";

export namespace TextNodeSmartTools {
  export function ttt(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    for (const node of selectedTextNodes) {
      if (node.sizeAdjust === "auto") {
        node.sizeAdjust = "manual";
        node.resizeHandle(Vector.getZero());
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
   * 把节点叠在父节点下游的一堆连线上，使用这个方法，就能把节点给插入这个地方
   * @param project
   */
  export function insertNodeToTree(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    if (selectedTextNodes.length !== 1) {
      toast.error("树形接入时，选中的节点数量必须为1");
    }
    const selectedNode = selectedTextNodes[0];
    // 遍历所有LineEdge，检测碰撞
    const collideEdges: LineEdge[] = [];
    for (const lineEdge of project.stageManager.getLineEdges()) {
      if (lineEdge.collisionBox.isIntersectsWithRectangle(selectedNode.collisionBox.getRectangle())) {
        collideEdges.push(lineEdge);
      }
    }
    // 再检测一下，收集到的所有LineEdge是否是同一个
    const sourceUUIDList = collideEdges.map((edge) => edge.source.uuid);
    if (new Set(sourceUUIDList).size === 1) {
      const sourceNode = collideEdges[0].source;
      const targetNodes = collideEdges.map((edge) => edge.target);
      // 删除所有已有的连线
      collideEdges.forEach((edge) => project.stageManager.deleteAssociation(edge));
      // source -> selected
      project.stageManager.connectEntity(sourceNode, selectedNode);
      // selected ===> targetNodes
      targetNodes.forEach((targetNode) => {
        project.stageManager.connectEntity(selectedNode, targetNode);
      });
      project.historyManager.recordStep();
    } else {
      toast.error("树形接入时，这个选中的节点没有与任何连线相碰，或者所有相碰的连线源头不唯一");
    }
  }

  /**
   * 将选中的特殊格式的文本节点，转换成引用块
   * @param project
   * @returns
   */
  export async function changeTextNodeToReferenceBlock(project: Project) {
    // 仅当项目不是草稿时才更新引用
    if (project.isDraft) {
      toast.error("草稿项目不能更新为引用块");
      return;
    }

    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    if (selectedTextNodes.length !== 1) {
      toast.error("只能选中一个节点作为引用块");
      return;
    }
    const selectedNode = selectedTextNodes[0];
    const text = selectedNode.text;
    let referenceName = "";
    if (text.trim().startsWith("[[") && text.trim().endsWith("]]")) {
      referenceName = text.trim().slice(2, -2);
    } else {
      toast.error("引用块必须以[[和]]包裹");
      return;
    }
    const fileName = referenceName.split("#")[0];
    const sectionName = referenceName.split("#")[1];

    const referenceBlock = new ReferenceBlockNode(project, {
      collisionBox: new CollisionBox([
        new Rectangle(selectedNode.collisionBox.getRectangle().leftTop, new Vector(100, 100)),
      ]),
      fileName,
      sectionName,
    });

    project.stageManager.add(referenceBlock);
    project.stageManager.delete(selectedNode); // TODO: 直接删除原有节点有隐患

    // 更新被引用文件的reference.msgpack
    const currentFileName = PathString.getFileNameFromPath(project.uri.path);
    if (!currentFileName) return;

    try {
      // 根据文件名查找被引用文件
      const recentFiles = await RecentFileManager.getRecentFiles();
      const referencedFile = recentFiles.find(
        (file) =>
          PathString.getFileNameFromPath(file.uri.path) === fileName ||
          PathString.getFileNameFromPath(file.uri.fsPath) === fileName,
      );
      if (!referencedFile) return;

      // 创建被引用文件的Project实例
      const referencedProject = new Project(referencedFile.uri);

      // 初始化项目
      loadAllServicesBeforeInit(referencedProject);
      await referencedProject.init();

      // 更新引用
      if (!referencedProject.references.sections[sectionName]) {
        referencedProject.references.sections[sectionName] = [];
      }

      // 确保数组中没有重复的文件名
      const index = referencedProject.references.sections[sectionName].indexOf(currentFileName);
      if (index === -1) {
        referencedProject.references.sections[sectionName].push(currentFileName);
        // 保存更新
        await referencedProject.save();
      }
      // 关闭项目
      await referencedProject.dispose();
      // TODO: 存在隐患，欠考虑如果引用已经被当前软件打开的情况。
    } catch (error) {
      toast.error("Failed to update reference:" + String(error));
    }
  }
}
