import { Project, service } from "@/core/Project";
import { RectanglePushInEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectanglePushInEffect";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Direction } from "@/types/directions";
import { MarkdownNode, parseMarkdownToJSON } from "@/utils/markdownParse";
import { Color, MonoStack, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { DetailsManager } from "../../stageObject/tools/entityDetailsManager";

/**
 * 包含增加节点的方法
 * 有可能是用鼠标增加，涉及自动命名器
 * 也有可能是用键盘增加，涉及快捷键和自动寻找空地
 */
@service("nodeAdder")
export class NodeAdder {
  constructor(private readonly project: Project) {}

  /**
   * 通过点击位置增加节点
   * @param clickWorldLocation
   * @returns
   */
  async addTextNodeByClick(
    clickWorldLocation: Vector,
    addToSections: Section[],
    selectCurrent = false,
  ): Promise<string> {
    const autoFillColor = this.getAutoColor();
    const node = new TextNode(this.project, {
      text: await this.getAutoName(),
      collisionBox: new CollisionBox([new Rectangle(clickWorldLocation, Vector.getZero())]),
      color: autoFillColor,
    });
    // 将node本身向左上角移动，使其居中
    node.moveTo(node.rectangle.location.subtract(node.rectangle.size.divide(2)));
    this.project.stageManager.add(node);

    for (const section of addToSections) {
      section.children.push(node);
      section.adjustLocationAndSize();
      this.project.effects.addEffect(
        new RectanglePushInEffect(node.rectangle.clone(), section.rectangle.clone(), new ProgressNumber(0, 100)),
      );
    }
    // 处理选中问题
    if (selectCurrent) {
      for (const otherNode of this.project.stageManager.getTextNodes()) {
        if (otherNode.isSelected) {
          otherNode.isSelected = false;
        }
      }
      node.isSelected = true;
    }

    this.project.historyManager.recordStep();
    return node.uuid;
  }

  /**
   * 在当前已经选中的某个节点的情况下，增加节点
   * 增加在某个选中的节点的上方，下方，左方，右方等位置
   * ——快深频
   * @param selectCurrent
   * @returns 返回的是创建节点的uuid，如果当前没有选中节点，则返回空字符串
   */
  async addTextNodeFromCurrentSelectedNode(
    direction: Direction,
    addToSections: Section[],
    selectCurrent = false,
  ): Promise<string> {
    // 先检查当前是否有选中的唯一实体
    const selectedEntities = this.project.stageManager
      .getSelectedEntities()
      .filter((entity) => entity instanceof ConnectableEntity);
    if (selectedEntities.length !== 1) {
      // 未选中或选中多个
      return "";
    }
    /**
     * 当前选择的实体
     */
    const selectedEntity = selectedEntities[0];
    const entityRectangle = selectedEntity.collisionBox.getRectangle();
    let createLocation = new Vector(0, 0);
    const distanceLength = 100;
    if (direction === Direction.Up) {
      createLocation = entityRectangle.topCenter.add(new Vector(0, -distanceLength));
    } else if (direction === Direction.Down) {
      createLocation = entityRectangle.bottomCenter.add(new Vector(0, distanceLength));
    } else if (direction === Direction.Left) {
      createLocation = entityRectangle.leftCenter.add(new Vector(-distanceLength, 0));
    } else if (direction === Direction.Right) {
      createLocation = entityRectangle.rightCenter.add(new Vector(distanceLength, 0));
    }
    addToSections = this.project.sectionMethods.getFatherSections(selectedEntity);
    const uuid = await this.addTextNodeByClick(createLocation, addToSections, selectCurrent);
    const newNode = this.project.stageManager.getTextNodeByUUID(uuid);
    if (!newNode) {
      throw new Error("Failed to add node");
    }
    // 如果是通过上下创建的节点，则需要左对齐
    if (direction === Direction.Up || direction === Direction.Down) {
      const distance = newNode.rectangle.left - entityRectangle.left;
      newNode.moveTo(newNode.rectangle.location.add(new Vector(-distance, 0)));
    }
    if (direction === Direction.Left) {
      // 顶对齐
      const distance = newNode.rectangle.top - entityRectangle.top;
      newNode.moveTo(newNode.rectangle.location.add(new Vector(0, -distance)));
    }
    if (direction === Direction.Right) {
      // 顶对齐，+ 自己对齐到目标的右侧
      const targetLocation = entityRectangle.rightTop;
      newNode.moveTo(targetLocation);
    }
    if (direction === Direction.Up) {
      const targetLocation = entityRectangle.leftTop.subtract(
        new Vector(0, newNode.collisionBox.getRectangle().height),
      );
      newNode.moveTo(targetLocation);
    }
    if (direction === Direction.Down) {
      const targetLocation = entityRectangle.leftBottom;
      newNode.moveTo(targetLocation);
    }
    this.project.historyManager.recordStep();
    return uuid;
  }

  private async getAutoName(): Promise<string> {
    let template = Settings.autoNamerTemplate;
    template = this.project.stageUtils.replaceAutoNameTemplate(template, this.project.stageManager.getTextNodes()[0]);
    return template;
  }

  private getAutoColor(): Color {
    const isEnable = Settings.autoFillNodeColorEnable;
    if (isEnable) {
      const colorData = Settings.autoFillNodeColor;
      return new Color(...colorData);
    } else {
      return Color.Transparent;
    }
  }

  public addConnectPoint(clickWorldLocation: Vector, addToSections: Section[]): string {
    const connectPoint = new ConnectPoint(this.project, {
      collisionBox: new CollisionBox([
        new Rectangle(
          clickWorldLocation.subtract(Vector.same(ConnectPoint.CONNECT_POINT_SHRINK_RADIUS)),
          Vector.same(ConnectPoint.CONNECT_POINT_SHRINK_RADIUS * 2),
        ),
      ]),
    });
    this.project.stageManager.add(connectPoint);

    // 把质点加入到每一个section中，并调整section大小
    for (const section of addToSections) {
      section.children.push(connectPoint);
      section.adjustLocationAndSize();
      // 特效
      this.project.effects.addEffect(
        new RectanglePushInEffect(
          connectPoint.collisionBox.getRectangle(),
          section.rectangle.clone(),
          new ProgressNumber(0, 100),
        ),
      );
    }

    this.project.historyManager.recordStep();
    return connectPoint.uuid;
  }
  /**
   * 通过纯文本生成网状结构
   * 这个函数不稳定，可能会随时throw错误
   * @param text 网状结构的格式文本
   * @param diffLocation
   */
  public addNodeGraphByText(text: string, diffLocation: Vector = Vector.getZero()) {
    const lines = text.split("\n");

    if (lines.length === 0) {
      return;
    }

    const randomRadius = 40 * lines.length;

    const nodeDict = new Map<string, TextNode>();

    const createNodeByName = (name: string) => {
      const node = new TextNode(this.project, {
        text: name,
        collisionBox: new CollisionBox([
          new Rectangle(
            diffLocation.add(new Vector(randomRadius * Math.random(), randomRadius * Math.random())),
            Vector.same(100),
          ),
        ]),
      });
      this.project.stageManager.add(node);
      nodeDict.set(name, node);
      return node;
    };

    for (const line of lines) {
      if (line.trim() === "") {
        continue;
      }
      if (line.includes("-->") || (line.includes("-") && line.includes("->"))) {
        // 这一行是一个关系行
        if (line.includes("-->")) {
          // 连线上无文字
          // 解析
          const names = line.split("-->");
          if (names.length !== 2) {
            throw new Error(`解析时出现错误: "${line}"，应该只有两个名称`);
          }
          const startName = names[0].trim();
          const endName = names[1].trim();
          if (startName === "" || endName === "") {
            throw new Error(`解析时出现错误: "${line}"，名称不能为空`);
          }
          let startNode = nodeDict.get(startName);
          let endNode = nodeDict.get(endName);
          if (!startNode) {
            startNode = createNodeByName(startName);
          }
          if (!endNode) {
            endNode = createNodeByName(endName);
          }
          this.project.stageManager.connectEntity(startNode, endNode);
        } else {
          // 连线上有文字
          // 解析
          // A -xx-> B
          const names = line.split("->");
          if (names.length !== 2) {
            throw new Error(`解析时出现错误: "${line}"，应该只有两个名称`);
          }
          const leftContent = names[0].trim();
          const endName = names[1].trim();
          if (leftContent === "" || endName === "") {
            throw new Error(`解析时出现错误: "${line}"，名称不能为空`);
          }
          let endNode = nodeDict.get(endName);
          if (!endNode) {
            // 没有endNode，临时创建一下
            endNode = createNodeByName(endName);
          }
          const leftContentList = leftContent.split("-");
          if (leftContentList.length !== 2) {
            if (leftContentList.length === 1) {
              throw new Error(
                `解析时出现错误: "${line}"，此行被识别为连线上有文字的行，中间的连接线应该是 "-->"，而不是 "->"`,
              );
            } else {
              throw new Error(
                `解析时出现错误: "${line}"，此行被识别为连线上有文字的行，短横线 “-” 左侧内容应该确保只有两个名称`,
              );
            }
          }
          const startName = leftContentList[0].trim();
          const edgeText = leftContentList[1].trim();
          if (startName === "" || edgeText === "") {
            throw new Error(`解析时出现错误: "${line}"，名称不能为空`);
          }
          let startNode = nodeDict.get(startName);
          if (!startNode) {
            // 临时创建一下
            startNode = createNodeByName(startName);
          }
          this.project.stageManager.connectEntity(startNode, endNode);
          // 在线上填写文字
          const edge = this.project.graphMethods.getEdgeFromTwoEntity(startNode, endNode);
          if (edge === null) {
            throw new Error(`解析时出现错误: "${line}"，找不到对应的连线`);
          }
          edge.rename(edgeText);
        }
      } else {
        // 这一行是一个节点行
        // 获取节点名称，创建节点
        const nodeName = line.trim();
        createNodeByName(nodeName);
      }
    }
  }
  /**
   * 通过带有缩进格式的文本来增加节点
   */
  public addNodeTreeByText(text: string, indention: number, diffLocation: Vector = Vector.getZero()) {
    // 将本文转换成字符串数组，按换行符分割
    const lines = text.split("\n");

    // 准备好栈和根节点
    const rootNode = new TextNode(this.project, {
      text: "root",
      collisionBox: new CollisionBox([new Rectangle(diffLocation, Vector.same(100))]),
    });
    const nodeStack = new MonoStack<TextNode>();
    nodeStack.push(rootNode, -1);
    this.project.stageManager.add(rootNode);
    // 遍历每一行
    for (let yIndex = 0; yIndex < lines.length; yIndex++) {
      const line = lines[yIndex];
      // 跳过空行
      if (line.trim() === "") {
        continue;
      }
      // 解析缩进格式
      const indent = this.getIndentLevel(line, indention);
      // 解析文本内容
      const textContent = line.trim();

      const node = new TextNode(this.project, {
        text: textContent.replaceAll("\\t", "\t").replaceAll("\\n", "\n"),
        collisionBox: new CollisionBox([
          new Rectangle(diffLocation.add(new Vector(indent * 50, yIndex * 100)), Vector.same(100)),
        ]),
      });
      this.project.stageManager.add(node);

      // 检查栈
      // 保持一个严格单调栈
      if (nodeStack.peek()) {
        nodeStack.push(node, indent);
        const fatherNode = nodeStack.unsafeGet(nodeStack.length - 2);
        this.project.stageManager.connectEntity(fatherNode, node);
      }
    }
  }

  /***
   * 'a' -> 0
   * '    a' -> 1
   * '\t\ta' -> 2
   */
  private getIndentLevel(line: string, indention: number): number {
    let indent = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === " ") {
        indent++;
      } else if (line[i] === "\t") {
        indent += indention;
      } else {
        break;
      }
    }
    return Math.floor(indent / indention);
  }

  public addNodeByMarkdown(markdownText: string, diffLocation: Vector = Vector.getZero()) {
    const markdownJson = parseMarkdownToJSON(markdownText);
    // 遍历markdownJson
    const dfsMarkdownNode = (markdownNode: MarkdownNode, deepLevel: number) => {
      // visit
      visitFunction(markdownNode, deepLevel);
      // visited
      for (const child of markdownNode.children) {
        dfsMarkdownNode(child, deepLevel + 1);
      }
    };
    const monoStack = new MonoStack<TextNode>();
    monoStack.push(
      new TextNode(this.project, {
        text: "root",
        collisionBox: new CollisionBox([new Rectangle(diffLocation, Vector.same(100))]),
      }),
      -1,
    );

    let visitedCount = 0;

    const visitFunction = (markdownNode: MarkdownNode, deepLevel: number) => {
      visitedCount++;
      const node = new TextNode(this.project, {
        text: markdownNode.title,
        details: DetailsManager.markdownToDetails(markdownNode.content),
        collisionBox: new CollisionBox([
          new Rectangle(diffLocation.add(new Vector(deepLevel * 50, visitedCount * 100)), Vector.same(100)),
        ]),
      });
      this.project.stageManager.add(node);
      monoStack.push(node, deepLevel);
      // 连接父节点
      const fatherNode = monoStack.unsafeGet(monoStack.length - 2);
      this.project.stageManager.connectEntity(fatherNode, node);
    };

    dfsMarkdownNode(markdownJson[0], 0);
  }

  /**
   * 根据mermaid文本生成框嵌套网状结构
   * 支持graph TD格式的mermaid文本
   * 例如:
   * graph TD;
   *   A[Section A] --> B[Section B];
   *   A --> C[C];
   *   B --> D[D];
   */
  public addNodeMermaidByText(text: string, diffLocation: Vector = Vector.getZero()) {
    // 验证文本格式
    text = text.trim();
    if (!text.startsWith("graph TD;") || !text.endsWith(";")) {
      throw new Error("mermaid文本必须以 'graph TD;' 开头并以 ';' 结尾");
    }

    // 提取中间部分
    const content = text.slice("graph TD;".length, -1).trim();
    const lines = content.split(";");

    // 存储节点和section的映射
    const entityMap = new Map<string, ConnectableEntity | Section>();
    // 存储连接关系
    const connections: { source: string; target: string; text?: string }[] = [];

    // 解析每一行
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === "") continue;

      // 处理连接关系
      if (trimmedLine.includes("-->")) {
        const parts = trimmedLine.split("-->");
        if (parts.length !== 2) {
          throw new Error(`解析时出现错误: "${line}"，连接格式不正确`);
        }
        const source = parts[0].trim();
        const target = parts[1].trim();
        connections.push({ source, target });
      } else if (trimmedLine.includes("-")) {
        // 处理带文字的连接
        const parts = trimmedLine.split("->");
        if (parts.length !== 2) {
          throw new Error(`解析时出现错误: "${line}"，连接格式不正确`);
        }
        const leftContent = parts[0].trim();
        const target = parts[1].trim();

        const leftParts = leftContent.split("-");
        if (leftParts.length !== 2) {
          throw new Error(`解析时出现错误: "${line}"，带文字的连接格式不正确`);
        }
        const source = leftParts[0].trim();
        const edgeText = leftParts[1].trim();
        connections.push({ source, target, text: edgeText });
      } else {
        // 单独的节点定义
        this.createEntityFromMermaidNode(trimmedLine, entityMap, diffLocation);
      }
    }

    // 为所有在连接中提到但尚未创建的节点创建实体
    for (const connection of connections) {
      if (!entityMap.has(connection.source)) {
        this.createEntityFromMermaidNode(connection.source, entityMap, diffLocation);
      }
      if (!entityMap.has(connection.target)) {
        this.createEntityFromMermaidNode(connection.target, entityMap, diffLocation);
      }
    }

    // 建立连接关系
    for (const connection of connections) {
      const sourceEntity = entityMap.get(connection.source);
      const targetEntity = entityMap.get(connection.target);

      if (
        sourceEntity &&
        targetEntity &&
        sourceEntity instanceof ConnectableEntity &&
        targetEntity instanceof ConnectableEntity
      ) {
        this.project.stageManager.connectEntity(sourceEntity, targetEntity);

        // 如果有连线文字
        if (connection.text) {
          const edge = this.project.graphMethods.getEdgeFromTwoEntity(sourceEntity, targetEntity);
          if (edge) {
            edge.rename(connection.text);
          }
        }
      }
    }

    // 设置嵌套关系
    this.setupSectionNesting(entityMap);

    // 调整位置和大小
    this.adjustEntityLayout(entityMap, diffLocation);
  }

  /**
   * 从mermaid节点格式创建实体
   * 例如: A[Section A] -> 创建名为A的Section
   *       B[B] -> 创建名为B的TextNode
   */
  private createEntityFromMermaidNode(
    nodeStr: string,
    entityMap: Map<string, ConnectableEntity | Section>,
    diffLocation: Vector,
  ) {
    // 匹配 [Name] 格式
    const match = nodeStr.match(/^([^\\[]+)\[(.*)\]$/);
    if (match) {
      const id = match[1].trim();
      const text = match[2].trim();

      // 判断是否为Section (名称中包含Section或章节等关键词)
      let entity: ConnectableEntity | Section;
      if (text.includes("Section") || text.includes("章节") || text.includes("组") || text.includes("容器")) {
        // 创建Section
        entity = new Section(this.project, {
          text,
          collisionBox: new CollisionBox([
            new Rectangle(diffLocation.add(new Vector(Math.random() * 200, Math.random() * 200)), new Vector(200, 150)),
          ]),
        });
      } else {
        // 创建普通TextNode
        entity = new TextNode(this.project, {
          text,
          collisionBox: new CollisionBox([
            new Rectangle(diffLocation.add(new Vector(Math.random() * 200, Math.random() * 200)), Vector.same(100)),
          ]),
        });
      }

      this.project.stageManager.add(entity);
      entityMap.set(id, entity);
    } else {
      // 如果没有[Name]格式，直接使用节点名
      const id = nodeStr.trim();
      if (!entityMap.has(id)) {
        const node = new TextNode(this.project, {
          text: id,
          collisionBox: new CollisionBox([
            new Rectangle(diffLocation.add(new Vector(Math.random() * 200, Math.random() * 200)), Vector.same(100)),
          ]),
        });
        this.project.stageManager.add(node);
        entityMap.set(id, node);
      }
    }
  }

  /**
   * 设置Section的嵌套关系
   * 基于连接关系推断嵌套
   */
  private setupSectionNesting(entityMap: Map<string, ConnectableEntity | Section>) {
    // 找出所有Section
    // const sections = Array.from(entityMap.values()).filter((e) => e instanceof Section) as Section[];
    const nodes = Array.from(entityMap.values()).filter(
      (e) => e instanceof ConnectableEntity && !(e instanceof Section),
    ) as ConnectableEntity[];

    // 对于每个节点，检查它是否应该被包含在某个Section中
    for (const node of nodes) {
      // 找出连接到这个节点的所有实体
      const connectedEntities = this.project.graphMethods
        .nodeParentArray(node)
        .concat(this.project.graphMethods.nodeChildrenArray(node));

      // 检查这些实体中是否有Section
      for (const connectedEntity of connectedEntities) {
        if (connectedEntity instanceof Section) {
          // 将节点添加到Section中
          connectedEntity.children.push(node);
          connectedEntity.adjustLocationAndSize();
          break; // 只添加到第一个匹配的Section中
        }
      }
    }
  }

  /**
   * 调整实体的布局
   */
  private adjustEntityLayout(entityMap: Map<string, ConnectableEntity | Section>, diffLocation: Vector) {
    const entities = Array.from(entityMap.values());

    // 简单的网格布局
    const rows = Math.ceil(Math.sqrt(entities.length));
    const cols = Math.ceil(entities.length / rows);
    const spacing = 250;

    let index = 0;
    for (const entity of entities) {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const newLocation = diffLocation.add(new Vector(col * spacing, row * spacing));
      entity.moveTo(newLocation);

      // 如果是Section，调整其大小以包含所有子元素
      if (entity instanceof Section) {
        entity.adjustLocationAndSize();
      }

      index++;
    }
  }
}
