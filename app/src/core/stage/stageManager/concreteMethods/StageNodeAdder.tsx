import { Project, service } from "@/core/Project";
import { RectanglePushInEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectanglePushInEffect";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Direction } from "@/types/directions";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

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
  public addNodeGraphByText(text: string, diffLocation: Vector = Vector.getZero()): void {
    this.project.stageImport.addNodeGraphByText(text, diffLocation);
  }

  /**
   * 通过带有缩进格式的文本来增加节点
   */
  public addNodeTreeByText(text: string, indention: number, diffLocation: Vector = Vector.getZero()): void {
    this.project.stageImport.addNodeTreeByText(text, indention, diffLocation);
  }

  /**
   * 根据 mermaid 文本生成框嵌套网状结构
   * 支持 graph TD 格式的 mermaid 文本
   * @param text Mermaid 格式文本
   * @param diffLocation 偏移位置
   */
  public addNodeMermaidByText(text: string, diffLocation: Vector = Vector.getZero()): void {
    this.project.stageImport.addNodeMermaidByText(text, diffLocation);
  }

  public addNodeByMarkdown(markdownText: string, diffLocation: Vector = Vector.getZero()) {
    this.project.stageImport.addNodeByMarkdown(markdownText, diffLocation);
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
}
