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
import { LineEdge } from "../../stageObject/association/LineEdge";

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
   * 如果是直接创建，则需要记录位置，如果是通过已有位置创建，则还需要调整一次位置，此时不需要记录
   * @param shouldRecordHistory
   * @returns 创建节点的uuid
   */
  async addTextNodeByClick(
    clickWorldLocation: Vector,
    addToSections: Section[],
    selectCurrent = false,
    shouldRecordHistory = true,
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
    if (shouldRecordHistory) {
      this.project.historyManager.recordStep();
    }
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
    const uuid = await this.addTextNodeByClick(createLocation, addToSections, selectCurrent, false);
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
    // 创建时没有记录，这里调整完位置再记录
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
          this.project.nodeConnector.connectEntityFast(startNode, endNode);
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
          this.project.nodeConnector.connectEntityFast(startNode, endNode, edgeText);
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
        // 创建从父节点右侧到子节点左侧的连线
        const newEdge = new LineEdge(this.project, {
          associationList: [fatherNode, node],
          targetRectangleRate: new Vector(0.01, 0.5), // 目标节点左侧边缘
          sourceRectangleRate: new Vector(0.99, 0.5), // 源节点右侧边缘
        });
        this.project.stageManager.add(newEdge);
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
      // 创建从父节点右侧到子节点左侧的连线
      const newEdge = new LineEdge(this.project, {
        associationList: [fatherNode, node],
        targetRectangleRate: new Vector(0.01, 0.5), // 目标节点左侧边缘
        sourceRectangleRate: new Vector(0.99, 0.5), // 源节点右侧边缘
      });
      this.project.stageManager.add(newEdge);
      this.project.stageManager.updateReferences();
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
    const normalizeLine = (line: string) => line.trim().replace(/;$/, "");

    type MermaidNodeToken = {
      id: string;
      label?: string;
      shape: "rectangle" | "round" | "circle" | "rhombus" | "stadium" | "other";
    };

    const decodeMermaidText = (value: string): string => value.replace(/&quot;/g, '"').replace(/<br\s*\/?>/gi, "\n");

    const sanitizeLabel = (raw: string | undefined): string | undefined => {
      if (!raw) {
        return undefined;
      }
      let result = raw.trim();
      if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) {
        result = result.slice(1, -1);
      }
      result = decodeMermaidText(result);
      result = result.trim();
      return result.length > 0 ? result : undefined;
    };

    const parseNodeToken = (token: string): MermaidNodeToken => {
      const content = normalizeLine(token);

      const bracketMatch = content.match(/^([^[]+)\[(.*)\]$/);
      if (bracketMatch) {
        return {
          id: decodeMermaidText(bracketMatch[1].trim()),
          label: sanitizeLabel(bracketMatch[2]),
          shape: "rectangle",
        };
      }

      const quotedBracketMatch = content.match(/^([^[]+)\["(.*)"\]$/);
      if (quotedBracketMatch) {
        return {
          id: decodeMermaidText(quotedBracketMatch[1].trim()),
          label: sanitizeLabel(`"${quotedBracketMatch[2]}"`),
          shape: "rectangle",
        };
      }

      const doubleRoundMatch = content.match(/^([^(]+)\(\((.*)\)\)$/);
      if (doubleRoundMatch) {
        return {
          id: decodeMermaidText(doubleRoundMatch[1].trim()),
          label: sanitizeLabel(doubleRoundMatch[2]),
          shape: "circle",
        };
      }

      const roundMatch = content.match(/^([^(]+)\((.*)\)$/);
      if (roundMatch) {
        return {
          id: decodeMermaidText(roundMatch[1].trim()),
          label: sanitizeLabel(roundMatch[2]),
          shape: "round",
        };
      }

      const rhombusMatch = content.match(/^([^{}]+)\{(.*)\}$/);
      if (rhombusMatch) {
        return {
          id: decodeMermaidText(rhombusMatch[1].trim()),
          label: sanitizeLabel(rhombusMatch[2]),
          shape: "rhombus",
        };
      }

      const stadiumMatch = content.match(/^([^[]+)\[\((.*)\)\]$/);
      if (stadiumMatch) {
        return {
          id: decodeMermaidText(stadiumMatch[1].trim()),
          label: sanitizeLabel(stadiumMatch[2]),
          shape: "stadium",
        };
      }

      const cleanId = sanitizeLabel(content) ?? decodeMermaidText(content);
      return {
        id: cleanId,
        shape: "other",
      };
    };

    const lines = text
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 &&
          !line.startsWith("```") &&
          !line.startsWith("%%") &&
          !line.toLowerCase().startsWith("style ") &&
          !line.toLowerCase().startsWith("linkstyle ") &&
          !line.toLowerCase().startsWith("classdef "),
      );

    if (lines.length === 0) {
      return;
    }

    const entityMap = new Map<string, ConnectableEntity>();
    const entityParentMap = new Map<ConnectableEntity, Section>();
    const sectionChildrenMap = new Map<Section, ConnectableEntity[]>();
    const sectionStack: Section[] = [];
    const createdEntities = new Set<ConnectableEntity>();
    const pendingEdges: Array<{ source: ConnectableEntity; target: ConnectableEntity; label?: string }> = [];

    const ensureSectionChild = (section: Section, child: ConnectableEntity) => {
      if (section === child) {
        return;
      }
      if (!sectionChildrenMap.has(section)) {
        sectionChildrenMap.set(section, []);
      }
      const childList = sectionChildrenMap.get(section)!;
      if (!childList.includes(child)) {
        childList.push(child);
      }
      if (!section.children.includes(child)) {
        section.children.push(child);
      }
      entityParentMap.set(child, section);
    };

    const shouldTreatAsSection = (label: string | undefined, forceSection: boolean): boolean => {
      if (forceSection) {
        return true;
      }
      if (!label) {
        return false;
      }
      return /(section|章节|组|容器)/i.test(label);
    };

    const createDefaultRectangle = (size: Vector) =>
      new Rectangle(diffLocation.add(new Vector(Math.random() * 40, Math.random() * 40)), size);

    const ensureEntity = (
      token: string,
      options: { forceSection?: boolean; displayText?: string } = {},
    ): ConnectableEntity => {
      const parsed = parseNodeToken(token);
      const baseId = parsed.id;
      if (!baseId) {
        throw new Error(`无法解析节点标识: "${token}"`);
      }

      const existing = entityMap.get(baseId);
      const finalLabel = options.displayText ?? parsed.label;
      const forceSection = options.forceSection ?? false;
      const treatAsSection = shouldTreatAsSection(finalLabel, forceSection);

      if (existing) {
        if (finalLabel) {
          if (existing instanceof Section) {
            if (existing.text !== finalLabel) {
              existing.rename(finalLabel);
            }
          } else if (existing instanceof TextNode) {
            if (existing.text !== finalLabel) {
              existing.rename(finalLabel);
            }
          }
        }
        if (sectionStack.length > 0) {
          const currentSection = sectionStack[sectionStack.length - 1];
          ensureSectionChild(currentSection, existing);
        }
        return existing;
      }

      let entity: ConnectableEntity;
      if (treatAsSection) {
        const section = new Section(this.project, {
          text: finalLabel ?? baseId,
          collisionBox: new CollisionBox([createDefaultRectangle(new Vector(240, 180))]),
          children: [],
        });
        entity = section;
        sectionChildrenMap.set(section, sectionChildrenMap.get(section) ?? []);
      } else {
        entity = new TextNode(this.project, {
          text: finalLabel ?? baseId,
          collisionBox: new CollisionBox([createDefaultRectangle(Vector.same(120))]),
        });
      }

      this.project.stageManager.add(entity);
      entityMap.set(baseId, entity);
      createdEntities.add(entity);

      if (sectionStack.length > 0) {
        const currentSection = sectionStack[sectionStack.length - 1];
        ensureSectionChild(currentSection, entity);
      }

      return entity;
    };

    for (const rawLine of lines) {
      const line = normalizeLine(rawLine);
      if (line.length === 0) {
        continue;
      }

      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith("graph ")) {
        continue;
      }

      if (lowerLine.startsWith("subgraph ")) {
        const token = line.slice("subgraph ".length).trim();
        const sectionEntity = ensureEntity(token, { forceSection: true });
        if (sectionEntity instanceof Section) {
          sectionStack.push(sectionEntity);
        }
        continue;
      }

      if (lowerLine === "end" || lowerLine.startsWith("end ")) {
        sectionStack.pop();
        continue;
      }

      const arrowIndex = line.indexOf("-->");
      if (arrowIndex !== -1) {
        const leftPart = line.slice(0, arrowIndex).trim();
        const rightPart = line.slice(arrowIndex + 3).trim();

        if (!rightPart) {
          continue;
        }

        let sourceToken = leftPart;
        let edgeLabel: string | undefined;

        const labelIndex = leftPart.indexOf("--");
        if (labelIndex !== -1) {
          sourceToken = leftPart.slice(0, labelIndex).trim();
          const rawLabel = leftPart.slice(labelIndex + 2).trim();
          edgeLabel = sanitizeLabel(rawLabel);
        }

        const sourceEntity = ensureEntity(sourceToken);
        const targetEntity = ensureEntity(rightPart);

        pendingEdges.push({ source: sourceEntity, target: targetEntity, label: edgeLabel });
        continue;
      }

      ensureEntity(line);
    }

    const layoutGroup = (entities: ConnectableEntity[], origin: Vector, spacing: Vector) => {
      if (entities.length === 0) {
        return;
      }
      const columns = Math.max(1, Math.ceil(Math.sqrt(entities.length)));
      for (let index = 0; index < entities.length; index++) {
        const entity = entities[index];
        const row = Math.floor(index / columns);
        const col = index % columns;
        const target = origin.add(new Vector(col * spacing.x, row * spacing.y));

        if (entity instanceof Section) {
          layoutSection(entity, target);
        } else {
          entity.moveTo(target);
          if (entity instanceof TextNode) {
            entity.forceAdjustSizeByText();
          }
        }
      }
    };

    const layoutSection = (section: Section, origin: Vector) => {
      const children = sectionChildrenMap.get(section) ?? [];
      if (children.length === 0) {
        section.moveTo(origin);
        section.adjustLocationAndSize();
        section.moveTo(origin);
        return;
      }

      section.moveTo(origin);
      layoutGroup(children, origin.add(new Vector(40, 120)), new Vector(200, 160));
      section.adjustLocationAndSize();
      section.moveTo(origin);
    };

    const rootEntities: ConnectableEntity[] = [];
    for (const entity of entityMap.values()) {
      if (!entityParentMap.has(entity)) {
        rootEntities.push(entity);
      }
    }

    layoutGroup(rootEntities, diffLocation, new Vector(260, 200));

    for (const { source, target, label } of pendingEdges) {
      if (label) {
        this.project.nodeConnector.connectEntityFast(source, target, label);
      } else {
        this.project.nodeConnector.connectEntityFast(source, target);
      }
    }

    for (const section of sectionChildrenMap.keys()) {
      section.adjustLocationAndSize();
    }

    if (createdEntities.size > 0 || pendingEdges.length > 0) {
      this.project.historyManager.recordStep();
    }
  }
}
