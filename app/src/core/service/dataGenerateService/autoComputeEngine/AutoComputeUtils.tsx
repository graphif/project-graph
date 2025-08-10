import { Project, service } from "@/core/Project";
import { ProgramFunctions } from "@/core/service/dataGenerateService/autoComputeEngine/functions/programLogic";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Color } from "@graphif/color";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { v4 as uuidv4 } from "uuid";

/**
 * 一些在自动计算引擎中
 * 常用的工具函数
 */
@service("autoComputeUtils")
export class AutoComputeUtils {
  constructor(private readonly project: Project) {}

  /**
   * 获取一个节点的所有直接父节点，按x坐标排序
   * @param node
   * @returns
   */
  getParentTextNodes(node: TextNode): TextNode[] {
    const parents = this.project.graphMethods.nodeParentArray(node).filter((node) => node instanceof TextNode);
    // 将parents按x的坐标排序，小的在前面
    parents.sort((a, b) => {
      return a.collisionBox.getRectangle().location.x - b.collisionBox.getRectangle().location.x;
    });
    return parents;
  }

  getParentEntities(node: TextNode): ConnectableEntity[] {
    const parents = this.project.graphMethods.nodeParentArray(node);
    // 将parents按x的坐标排序，小的在前面
    parents.sort((a, b) => {
      return a.collisionBox.getRectangle().location.x - b.collisionBox.getRectangle().location.x;
    });
    return parents;
  }

  /**
   * 获取一个节点的所有直接子节点，按x坐标排序
   * @param node
   * @returns
   */
  getChildTextNodes(node: TextNode): TextNode[] {
    return this.project.graphMethods
      .nodeChildrenArray(node)
      .filter((node) => node instanceof TextNode)
      .sort((a, b) => a.collisionBox.getRectangle().location.x - b.collisionBox.getRectangle().location.x);
  }

  /**
   * 更改一个TextNode节点的所有子节点名字，如果没有子节点，则新建一个节点
   * @param node
   * @param resultText
   */
  getNodeOneResult(node: TextNode, resultText: string) {
    const childrenList = this.project.graphMethods.nodeChildrenArray(node).filter((node) => node instanceof TextNode);
    if (childrenList.length > 0) {
      for (const child of childrenList) {
        child.rename(resultText);
      }
    } else {
      // 新建一个节点生长出去
      const rect = node.collisionBox.getRectangle();
      const newNode = new TextNode(this.project, {
        uuid: uuidv4(),
        text: resultText,
        // 将 location 和 size 合并到 collisionBox 中
        collisionBox: new CollisionBox([
          new Rectangle(
            new Vector(rect.location.x, rect.location.y + 100), // 原来的 location
            new Vector(100, 100), // 原来的 size
          ),
        ]),
        // 将 color 数组转换为 Color 对象
        color: Color.Transparent.clone(), // [0, 0, 0, 0] 对应 Color.Transparent
      });
      this.project.stageManager.add(newNode);
      this.project.stageManager.connectEntity(node, newNode);
    }
  }

  /**
   * 更改一个section节点的所有子节点名字，如果没有子节点，则新建一个节点
   * @param section
   * @param resultText
   */
  getSectionOneResult(section: Section, resultText: string) {
    const childrenList = this.project.graphMethods
      .nodeChildrenArray(section)
      .filter((node) => node instanceof TextNode);
    if (childrenList.length > 0) {
      for (const child of childrenList) {
        child.rename(resultText);
      }
    } else {
      // 新建一个节点生长出去
      const rect = section.collisionBox.getRectangle();
      const newNode = new TextNode(this.project, {
        uuid: uuidv4(),
        text: resultText,
        collisionBox: new CollisionBox([
          new Rectangle(new Vector(rect.location.x, rect.bottom + 100), new Vector(100, 100)),
        ]),
        color: Color.Transparent.clone(),
      });
      this.project.stageManager.add(newNode);
      this.project.stageManager.connectEntity(section, newNode);
    }
  }

  getSectionMultiResult(section: Section, resultTextList: string[]) {
    let childrenList = this.project.graphMethods.nodeChildrenArray(section).filter((node) => node instanceof TextNode);
    if (childrenList.length < resultTextList.length) {
      // 子节点数量不够，需要新建节点
      const needCount = resultTextList.length - childrenList.length;
      for (let j = 0; j < needCount; j++) {
        const rect = section.collisionBox.getRectangle();
        const newNode = new TextNode(this.project, {
          uuid: uuidv4(),
          text: "",
          collisionBox: new CollisionBox([
            new Rectangle(
              new Vector(rect.location.x, rect.bottom + 100 + j * 100), // 原来的 location
              new Vector(100, 100),
            ),
          ]),
          color: Color.Transparent.clone(),
        });
        this.project.stageManager.add(newNode);
        this.project.stageManager.connectEntity(section, newNode);
      }
    }
    // 子节点数量够了，直接修改，顺序是从上到下
    childrenList = this.project.graphMethods
      .nodeChildrenArray(section)
      .filter((node) => node instanceof TextNode)
      .sort(
        (node1, node2) => node1.collisionBox.getRectangle().location.y - node2.collisionBox.getRectangle().location.y,
      );
    // 开始修改
    for (let i = 0; i < resultTextList.length; i++) {
      childrenList[i].rename(resultTextList[i]);
    }
  }

  /**
   * 生成一个节点的多个结果
   * 如果子节点数量不够，则新建节点
   * 如果子节点数量超过，则不修改多余节点
   * @param node
   * @param resultTextList
   */
  generateMultiResult(node: TextNode, resultTextList: string[]) {
    if (resultTextList.length === 0) {
      return;
    }
    // 先把子节点数量凑够
    let childrenList = this.project.graphMethods.nodeChildrenArray(node).filter((node) => node instanceof TextNode);
    if (childrenList.length < resultTextList.length) {
      // 子节点数量不够，需要新建节点
      const needCount = resultTextList.length - childrenList.length;
      for (let j = 0; j < needCount; j++) {
        const rect = node.collisionBox.getRectangle();
        const newNode = new TextNode(this.project, {
          uuid: uuidv4(),
          text: "",
          collisionBox: new CollisionBox([
            new Rectangle(
              new Vector(rect.location.x, rect.location.y + 100 + j * 100), // 原来的 location
              new Vector(100, 100),
            ),
          ]),
          color: Color.Transparent.clone(),
        });
        this.project.stageManager.add(newNode);
        this.project.stageManager.connectEntity(node, newNode);
      }
    }
    // 子节点数量够了，直接修改，顺序是从上到下
    childrenList = this.project.graphMethods
      .nodeChildrenArray(node)
      .filter((node) => node instanceof TextNode)
      .sort(
        (node1, node2) => node1.collisionBox.getRectangle().location.y - node2.collisionBox.getRectangle().location.y,
      );
    // 开始修改
    for (let i = 0; i < resultTextList.length; i++) {
      childrenList[i].rename(resultTextList[i]);
    }
  }

  /**
   * 将字符串转换为数字
   * @param str
   * @returns
   */
  stringToNumber(str: string) {
    if (ProgramFunctions.isHaveVar(str)) {
      return parseFloat(ProgramFunctions.getVarInCore(str));
    }
    return parseFloat(str);
  }

  /**
   * 判断一个节点是否和逻辑节点直接相连
   * 同时判断是否有逻辑节点的父节点或子节点
   * @param node
   */
  isNodeConnectedWithLogicNode(node: ConnectableEntity): boolean {
    for (const fatherNode of this.project.graphMethods.nodeParentArray(node)) {
      if (fatherNode instanceof TextNode && this.isNameIsLogicNode(fatherNode.text)) {
        return true;
      }
    }
    for (const childNode of this.project.graphMethods.nodeChildrenArray(node)) {
      if (childNode instanceof TextNode && this.isNameIsLogicNode(childNode.text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 判断一个节点的名字格式是否符合逻辑节点的格式
   * 1：以#开头，以#结尾，总共只能有两个#
   * 2：中间只有数字、大写字母、下划线
   * @param name
   */
  isNameIsLogicNode(name: string): boolean {
    const reg = /^#[a-zA-Z0-9_]+#$/;
    return reg.test(name);
  }
}
