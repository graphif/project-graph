import { Project, service } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Direction } from "@/types/directions";
import { ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { v4 } from "uuid";
import { Settings } from "../../Settings";
import { LineEffect } from "../../feedbackService/effectEngine/concrete/LineEffect";
import { RectangleRenderEffect } from "../../feedbackService/effectEngine/concrete/RectangleRenderEffect";

/**
 * 专用于Xmind式的树形结构的键盘操作引擎
 */
@service("keyboardOnlyTreeEngine")
export class KeyboardOnlyTreeEngine {
  constructor(private readonly project: Project) {}

  /**
   * 获取节点的“预方向”
   * 如果有缓存，则拿缓存中的值，没有缓存，根据节点的入度线的方向，来判断“预方向”
   * @param node
   * @returns
   */
  private getNodePreDirection(node: ConnectableEntity): "right" | "left" | "down" | "up" {
    if (this.preDirectionCacheMap.has(node.uuid)) {
      const direction = this.preDirectionCacheMap.get(node.uuid)!;
      return direction;
    }
    const incomingEdges = this.project.graphMethods.getIncomingEdges(node);
    if (incomingEdges.length === 0) {
      return "right";
    }
    const directionCount: Record<string, number> = { right: 0, left: 0, down: 0, up: 0 };
    incomingEdges.forEach((edge) => {
      if (edge.isRightToLeft()) {
        directionCount.left++;
      } else if (edge.isLeftToRight()) {
        directionCount.right++;
      } else if (edge.isBottomToTop()) {
        directionCount.up++;
      } else if (edge.isTopToBottom()) {
        directionCount.down++;
      }
    });
    let maxCount = 0;
    let direction: "right" | "left" | "down" | "up" = "right";
    Object.entries(directionCount).forEach(([dir, count]) => {
      if (count > maxCount) {
        maxCount = count;
        direction = dir as "right" | "left" | "down" | "up";
      }
    });
    return direction;
  }

  private preDirectionCacheMap: Map<string, "right" | "left" | "down" | "up"> = new Map();

  /**
   * 改变节点的“预方向”
   * @param nodes
   * @param direction
   */
  public changePreDirection(nodes: ConnectableEntity[], direction: "right" | "left" | "down" | "up"): void {
    for (const node of nodes) {
      this.preDirectionCacheMap.set(node.uuid, direction);
      // 添加特效提示
      this.addNodeEffectByPreDirection(node);
    }
  }

  /**
   * 根据节点的“预方向”，添加特效提示
   * @param node
   */
  public addNodeEffectByPreDirection(node: ConnectableEntity): void {
    const direction = this.getNodePreDirection(node);
    const rect = node.collisionBox.getRectangle();
    if (direction === "up") {
      this.project.effects.addEffect(LineEffect.rectangleEdgeTip(rect.leftTop, rect.rightTop));
    } else if (direction === "down") {
      this.project.effects.addEffect(LineEffect.rectangleEdgeTip(rect.leftBottom, rect.rightBottom));
    } else if (direction === "left") {
      this.project.effects.addEffect(LineEffect.rectangleEdgeTip(rect.leftTop, rect.leftBottom));
    } else if (direction === "right") {
      this.project.effects.addEffect(LineEffect.rectangleEdgeTip(rect.rightTop, rect.rightBottom));
    }
  }

  /**
   * 树形深度生长节点
   * @returns
   */
  onDeepGenerateNode(defaultText = "新节点", selectAll = true) {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const rootNode = this.project.stageManager.getConnectableEntity().find((node) => node.isSelected);
    if (!rootNode) return;
    this.project.camera.clearMoveCommander();
    this.project.camera.speed = Vector.getZero();
    // 确定创建方向：默认向右
    const direction = this.getNodePreDirection(rootNode);
    // 先找到自己所有的第一层后继节点
    const childSet = this.project.graphMethods.getOneStepSuccessorSet(rootNode);

    // 寻找创建位置
    let createLocation: Vector;
    if (childSet.length === 0) {
      // 没有子节点时，在相应方向的正方向创建
      const rect = rootNode.collisionBox.getRectangle();
      switch (direction) {
        case "right":
          createLocation = rect.rightCenter.add(new Vector(100, 0));
          break;
        case "left":
          createLocation = rect.leftCenter.add(new Vector(-100, 0));
          break;
        case "down":
          createLocation = rect.bottomCenter.add(new Vector(0, 25));
          break;
        case "up":
          createLocation = rect.topCenter.add(new Vector(0, -25));
          break;
      }
    } else {
      // 有子节点时，在相应方向的最后一个子节点的外侧创建
      // 根据方向对已有的子节点进行排序
      switch (direction) {
        case "right":
        case "left":
          // 垂直方向排序
          childSet.sort((a, b) => a.collisionBox.getRectangle().top - b.collisionBox.getRectangle().top);
          break;
        case "up":
        case "down":
          // 水平方向排序
          childSet.sort((a, b) => a.collisionBox.getRectangle().left - b.collisionBox.getRectangle().left);
          break;
      }

      const lastChild = childSet[childSet.length - 1];
      const lastChildRect = lastChild.collisionBox.getRectangle();

      switch (direction) {
        case "right":
          createLocation = lastChildRect.bottomCenter.add(new Vector(0, 10));
          break;
        case "left":
          createLocation = lastChildRect.bottomCenter.add(new Vector(0, 10));
          break;
        case "down":
          createLocation = lastChildRect.rightCenter.add(new Vector(10, 0));
          break;
        case "up":
          createLocation = lastChildRect.rightCenter.add(new Vector(10, 0));
          break;
      }
    }

    // 计算新节点的字体大小
    const newFontScaleLevel = this.calculateNewNodeFontScaleLevel(rootNode, direction);

    // 创建位置寻找完毕
    const newNode = new TextNode(this.project, {
      text: defaultText,
      collisionBox: new CollisionBox([
        new Rectangle(
          createLocation,
          new Vector(rootNode instanceof TextNode ? rootNode.collisionBox.getRectangle().width : 100, 100),
        ),
      ]),
      sizeAdjust: (rootNode instanceof TextNode ? rootNode.sizeAdjust : "auto") as "auto" | "manual",
    });

    // 设置新节点的字体大小
    newNode.setFontScaleLevel(newFontScaleLevel);
    this.project.stageManager.add(newNode);

    // 如果是在框里，则把新生长的节点也纳入到框里
    const fatherSections = this.project.sectionMethods.getFatherSections(rootNode);
    for (const section of fatherSections) {
      section.children.push(newNode);
    }

    // 连接节点
    this.project.stageManager.connectEntity(rootNode, newNode);
    const newEdges = this.project.graphMethods.getEdgesBetween(rootNode, newNode);

    // 根据方向设置边的连接位置
    switch (direction) {
      case "right":
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Right, true);
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Left);
        break;
      case "left":
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Left, true);
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Right);
        break;
      case "down":
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Down, true);
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Up);
        break;
      case "up":
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Up, true);
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Down);
        break;
    }

    // 继承父节点颜色
    if (rootNode instanceof TextNode) {
      newNode.color = rootNode.color.clone();
    }

    // 重新排列树形节点
    const rootNodeParents = this.project.graphMethods.getRoots(rootNode);
    if (rootNodeParents.length === 1) {
      const rootNodeParent = rootNodeParents[0];
      if (this.project.graphMethods.isTree(rootNodeParent)) {
        if (Settings.autoLayoutWhenTreeGenerate) {
          this.project.autoAlign.autoLayoutSelectedFastTreeMode(rootNodeParent);
        }
        // 更新选择状态
        rootNodeParent.isSelected = false;
        newNode.isSelected = true;
        rootNode.isSelected = false;
      }
    }

    // 特效
    this.project.effects.addEffects(this.project.edgeRenderer.getConnectedEffects(rootNode, newNode));
    setTimeout(
      () => {
        // 防止把反引号给输入进去
        this.project.controllerUtils.editTextNode(newNode, selectAll);
      },
      (1000 / 60) * 6,
    );
    // 根据设置决定镜头行为
    switch (Settings.treeGenerateCameraBehavior) {
      case "none":
        // 镜头不动
        break;
      case "moveToNewNode":
        // 镜头移动向新创建的节点
        this.project.camera.bombMove(newNode.collisionBox.getRectangle().center, 5);
        break;
      case "resetToTree":
        // 重置视野，使视野覆盖当前树形结构的外接矩形
        if (rootNodeParents.length === 1) {
          const rootNodeParent = rootNodeParents[0];
          const allNodes = this.project.graphMethods.getSuccessorSet(rootNodeParent, true);
          const treeBoundingRect = Rectangle.getBoundingRectangle(
            allNodes.map((node) => node.collisionBox.getRectangle()),
            10, // 添加一些 padding
          );
          this.project.camera.resetByRectangle(treeBoundingRect);
        }
        break;
    }
  }

  /**
   * 树形广度生长节点
   * @returns
   */
  onBroadGenerateNode() {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const currentSelectNode = this.project.stageManager.getConnectableEntity().find((node) => node.isSelected);
    if (!currentSelectNode) return;
    this.project.camera.clearMoveCommander();
    this.project.camera.speed = Vector.getZero();
    // 找到自己的父节点
    const parents = this.project.graphMethods.nodeParentArray(currentSelectNode);
    if (parents.length === 0) return;
    if (parents.length !== 1) return;
    const parent = parents[0];
    // 获取预方向
    const preDirection = this.getNodePreDirection(parent);
    // 自动命名新节点（如果当前选中的同级节点有标号特征。）
    let nextNodeName = "新节点";
    let isAddNewNumberName = false;
    if (currentSelectNode instanceof TextNode) {
      const newName = extractNumberAndReturnNext(currentSelectNode.text);
      if (newName) {
        nextNodeName = newName;
        isAddNewNumberName = true;
      }
    }
    // 当前选择的节点的正下方创建一个节点
    // 找到创建点
    const newLocation = currentSelectNode.collisionBox.getRectangle().leftBottom.add(new Vector(0, 1));

    // 计算新节点的字体大小
    const newFontScaleLevel = this.calculateNewNodeFontScaleLevel(parent, preDirection);

    const newNode = new TextNode(this.project, {
      text: nextNodeName,
      details: [],
      uuid: v4(),
      collisionBox: new CollisionBox([
        new Rectangle(
          newLocation.clone(),
          new Vector(parent instanceof TextNode ? parent.collisionBox.getRectangle().width : 100, 100),
        ),
      ]),
      sizeAdjust: parent instanceof TextNode ? (parent.sizeAdjust as "auto" | "manual") : "auto",
    });

    // 设置新节点的字体大小
    newNode.setFontScaleLevel(newFontScaleLevel);
    this.project.stageManager.add(newNode);
    // 如果是在框里，则把新生长的节点也纳入到框里
    const fatherSections = this.project.sectionMethods.getFatherSections(parent);
    for (const section of fatherSections) {
      section.children.push(newNode);
    }
    // 连接节点
    this.project.stageManager.connectEntity(parent, newNode);

    const newEdges = this.project.graphMethods.getEdgesBetween(parent, newNode);

    if (preDirection === "right") {
      // 右侧发出 左侧接收
      this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Right, true);
      this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Left);
    } else if (preDirection === "left") {
      this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Left, true);
      this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Right);
    } else if (preDirection === "down") {
      this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Down, true);
      this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Up);
    } else if (preDirection === "up") {
      this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Up, true);
      this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Down);
    }

    // 继承父节点颜色
    if (parent instanceof TextNode) {
      newNode.color = parent.color.clone();
    }
    // 重新排列树形节点
    const rootNodeParents = this.project.graphMethods.getRoots(parent);
    if (rootNodeParents.length === 1) {
      const rootNodeParent = rootNodeParents[0];
      if (this.project.graphMethods.isTree(rootNodeParent)) {
        if (Settings.autoLayoutWhenTreeGenerate) {
          this.project.autoAlign.autoLayoutSelectedFastTreeMode(rootNodeParent);
        }
        // 更新选择状态
        rootNodeParent.isSelected = false;
        newNode.isSelected = true;
        currentSelectNode.isSelected = false;
      }
    }
    this.project.effects.addEffects(this.project.edgeRenderer.getConnectedEffects(parent, newNode));
    setTimeout(
      () => {
        // 防止把反引号给输入进去
        this.project.controllerUtils.editTextNode(newNode, !isAddNewNumberName);
      },
      (1000 / 60) * 6,
    );
    // 根据设置决定镜头行为
    switch (Settings.treeGenerateCameraBehavior) {
      case "none":
        // 镜头不动
        break;
      case "moveToNewNode":
        // 镜头移动向新创建的节点
        this.project.camera.bombMove(newNode.collisionBox.getRectangle().center, 5);
        break;
      case "resetToTree":
        // 重置视野，使视野覆盖当前树形结构的外接矩形
        if (rootNodeParents.length === 1) {
          const rootNodeParent = rootNodeParents[0];
          const allNodes = this.project.graphMethods.getSuccessorSet(rootNodeParent, true);
          const treeBoundingRect = Rectangle.getBoundingRectangle(
            allNodes.map((node) => node.collisionBox.getRectangle()),
            10, // 添加一些 padding
          );
          this.project.camera.resetByRectangle(treeBoundingRect);
        }
        break;
    }
  }

  /**
   * 根据某个已经选中的节点，调整其所在树的结构
   * @param entity
   */
  adjustTreeNode(entity: ConnectableEntity, withEffect = true) {
    const rootNodeParents = this.project.graphMethods.getRoots(entity);
    const rootNode = rootNodeParents[0];
    this.project.autoAlign.autoLayoutSelectedFastTreeMode(rootNode);

    // 添加闪烁特效：树形结构的外接矩形和根节点
    const allNodes = this.project.graphMethods.getSuccessorSet(rootNode, true);
    const treeBoundingRect = Rectangle.getBoundingRectangle(
      allNodes.map((node) => node.collisionBox.getRectangle()),
      10, // 添加一些 padding
    );
    const rootNodeRect = rootNode.collisionBox.getRectangle();

    if (withEffect) {
      // 使用成功阴影颜色作为闪烁特效颜色
      const flashColor = this.project.stageStyleManager.currentStyle.effects.successShadow;

      // 为树的外接矩形添加闪烁特效
      this.project.effects.addEffect(
        new RectangleRenderEffect(
          new ProgressNumber(0, 60),
          treeBoundingRect,
          flashColor.toTransparent(),
          flashColor,
          3,
        ),
      );

      // 为根节点添加闪烁特效
      this.project.effects.addEffect(
        new RectangleRenderEffect(new ProgressNumber(0, 60), rootNodeRect, flashColor.toTransparent(), flashColor, 4),
      );
    }

    // 恢复选择状态
    rootNode.isSelected = false;
    entity.isSelected = true;
  }

  /**
   * 删除当前的节点
   */
  onDeleteCurrentNode() {
    // TODO
  }

  /**
   * 计算新节点的字体大小
   * @param parentNode 父节点
   * @param preDirection 预方向
   * @returns 新节点的字体缩放级别
   */
  private calculateNewNodeFontScaleLevel(
    parentNode: ConnectableEntity,
    preDirection: "right" | "left" | "down" | "up",
  ): number {
    // 默认值
    let newFontScaleLevel = 0;

    // 如果父节点是文本节点，先使用父节点的字体大小
    if (parentNode instanceof TextNode) {
      newFontScaleLevel = parentNode.fontScaleLevel;
    }

    // 获取父节点的出边
    const parentOutEdges = this.project.graphMethods.getOutgoingEdges(parentNode);
    // 根据预方向过滤出同方向的兄弟节点
    let sameDirectionSiblings: ConnectableEntity[] = [];
    switch (preDirection) {
      case "right":
        sameDirectionSiblings = parentOutEdges
          .filter((edge) => edge instanceof Edge && edge.isLeftToRight())
          .map((edge) => edge.target);
        break;
      case "left":
        sameDirectionSiblings = parentOutEdges
          .filter((edge) => edge instanceof Edge && edge.isRightToLeft())
          .map((edge) => edge.target);
        break;
      case "down":
        sameDirectionSiblings = parentOutEdges
          .filter((edge) => edge instanceof Edge && edge.isTopToBottom())
          .map((edge) => edge.target);
        break;
      case "up":
        sameDirectionSiblings = parentOutEdges
          .filter((edge) => edge instanceof Edge && edge.isBottomToTop())
          .map((edge) => edge.target);
        break;
    }

    // 过滤出文本节点类型的兄弟节点
    const textNodeSiblings = sameDirectionSiblings.filter((sibling) => sibling instanceof TextNode) as TextNode[];

    // 检查兄弟节点的字体大小是否一致
    if (textNodeSiblings.length > 0) {
      const firstSiblingFontScale = textNodeSiblings[0].fontScaleLevel;
      const allSame = textNodeSiblings.every((sibling) => sibling.fontScaleLevel === firstSiblingFontScale);

      // 如果所有同方向兄弟节点字体大小一致，使用相同大小
      if (allSame) {
        newFontScaleLevel = firstSiblingFontScale;
      }
    }

    return newFontScaleLevel;
  }
}

/**
 * 提取字符串中的标号格式并返回下一标号字符串
 * 例如：
 * 输入："1 xxxx"
 * 返回："2 "
 *
 * 输入："1. xxxx"
 * 返回："2. "
 *
 * 输入："[1] xxx"
 * 返回："[2] "
 *
 * 输入："1) xxx"
 * 返回："2) "
 *
 * 输入："(1) xxx"
 * 返回："(2) "
 *
 * 类似的括号格式可能还有：
 * 【1】
 * 1:
 * 1、
 * 1,
 * 1，
 *
 * 总之，返回的序号总比输入的序号大1
 * 输入的序号后面可能会有标题内容，返回的内容中会不带标题内容，自动过滤
 * @param str
 */
function extractNumberAndReturnNext(str: string): string {
  const s = (str ?? "").trimStart();
  if (!s) return "";

  // 成对括号映射：ASCII + 常见全角/中文括号（用 Unicode 转义避免混淆）
  const BRACKET_PAIRS: Record<string, string> = {
    "(": ")",
    "[": "]",
    "{": "}",
    "\uFF08": "\uFF09", // （ ）
    "\u3010": "\u3011", // 【 】
    "\u3014": "\u3015", // 〔 〕
    "\u3016": "\u3017", // 〖 〗
  };

  // 常见分隔符集合：半角 + 全角（用 Unicode 转义避免混淆）
  const DELIMS = new Set<string>([
    ".",
    ")",
    ":",
    ",",
    "\uFF1A", // ：
    "\u3001", // 、
    "\uFF0C", // ，
    "\uFF0E", // ．
    "\u3002", // 。
  ]);

  // 1) 括号包裹的数字：例如 (1)、[1]、{1}、（1）、【1】、〔1〕、〖1〗
  const open = s[0];
  const close = BRACKET_PAIRS[open];
  if (close) {
    let i = 1;

    // 跳过括号后的空白
    while (i < s.length && /\s/.test(s[i])) i++;

    // 读取连续数字
    const numStart = i;
    while (i < s.length && s.charCodeAt(i) >= 48 && s.charCodeAt(i) <= 57) i++;
    if (i === numStart) return ""; // 括号里没数字

    // 跳过数字后的空白
    while (i < s.length && /\s/.test(s[i])) i++;

    // 必须紧跟对应闭括号
    if (s[i] === close) {
      const n = parseInt(s.slice(numStart, i), 10) + 1;
      return `${open}${n}${close} `;
    }
    return "";
  }

  // 2) 数字起始的情况：1. / 1) / 1: / 1、 / 1, / 1，/ 1． / 1。/ 或纯数字“1 ”
  const m = s.match(/^(\d+)/);
  if (m) {
    const numStr = m[1];
    let i = numStr.length;

    // 跳过数字后的空白
    while (i < s.length && /\s/.test(s[i])) i++;

    const delim = s[i];
    const next = String(parseInt(numStr, 10) + 1);

    if (delim && DELIMS.has(delim)) {
      return `${next}${delim} `;
    }
    return `${next} `;
  }

  // 未匹配到已知格式
  return "";
}
