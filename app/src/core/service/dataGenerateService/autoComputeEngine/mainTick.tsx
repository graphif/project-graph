import { Project, service } from "@/core/Project";
import { CompareFunctions } from "@/core/service/dataGenerateService/autoComputeEngine/functions/compareLogic";
import { MathFunctions } from "@/core/service/dataGenerateService/autoComputeEngine/functions/mathLogic";
import { NodeLogic } from "@/core/service/dataGenerateService/autoComputeEngine/functions/nodeLogic";
import { ProgramFunctions } from "@/core/service/dataGenerateService/autoComputeEngine/functions/programLogic";
import { StringFunctions } from "@/core/service/dataGenerateService/autoComputeEngine/functions/stringLogic";
import {
  LogicNodeNameEnum,
  LogicNodeSimpleOperatorEnum,
} from "@/core/service/dataGenerateService/autoComputeEngine/logicNodeNameEnum";
import { Entity } from "@/core/sprites/abstract/Entity";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/sprites/TextNode";

type MathFunctionType = (args: number[]) => number[];
type StringFunctionType = (args: string[]) => string[];
type OtherFunctionType = (project: Project, fatherNodes: Entity[], childNodes: Entity[]) => string[];
type VariableFunctionType = (project: Project, args: string[]) => string[];
type StringFunctionMap = Record<string, StringFunctionType>;
type OtherFunctionMap = Record<string, OtherFunctionType>;
type VariableFunctionMap = Record<string, VariableFunctionType>;

@service("autoCompute")
export class AutoCompute {
  /**
   *
   * 简单符号与函数的映射
   */
  MapOperationNameFunction: StringFunctionMap = {
    [LogicNodeSimpleOperatorEnum.ADD]: this.funcTypeTrans(MathFunctions.add),
    [LogicNodeSimpleOperatorEnum.SUBTRACT]: this.funcTypeTrans(MathFunctions.subtract),
    [LogicNodeSimpleOperatorEnum.MULTIPLY]: this.funcTypeTrans(MathFunctions.multiply),
    [LogicNodeSimpleOperatorEnum.DIVIDE]: this.funcTypeTrans(MathFunctions.divide),
    [LogicNodeSimpleOperatorEnum.MODULO]: this.funcTypeTrans(MathFunctions.modulo),
    [LogicNodeSimpleOperatorEnum.POWER]: this.funcTypeTrans(MathFunctions.power),
    // 比较
    [LogicNodeSimpleOperatorEnum.LT]: this.funcTypeTrans(CompareFunctions.lessThan),
    [LogicNodeSimpleOperatorEnum.GT]: this.funcTypeTrans(CompareFunctions.greaterThan),
    [LogicNodeSimpleOperatorEnum.LTE]: this.funcTypeTrans(CompareFunctions.isIncreasing),
    [LogicNodeSimpleOperatorEnum.GTE]: this.funcTypeTrans(CompareFunctions.isDecreasing),
    [LogicNodeSimpleOperatorEnum.EQ]: this.funcTypeTrans(CompareFunctions.isSame),
    [LogicNodeSimpleOperatorEnum.NEQ]: this.funcTypeTrans(CompareFunctions.isDistinct),
    // 逻辑门
    [LogicNodeSimpleOperatorEnum.AND]: this.funcTypeTrans(MathFunctions.and),
    [LogicNodeSimpleOperatorEnum.OR]: this.funcTypeTrans(MathFunctions.or),
    [LogicNodeSimpleOperatorEnum.NOT]: this.funcTypeTrans(MathFunctions.not),
    [LogicNodeSimpleOperatorEnum.XOR]: this.funcTypeTrans(MathFunctions.xor),
  };

  /**
   * 双井号格式的名字与函数的映射
   */
  MapNameFunction: StringFunctionMap = {
    // 数学一元运算
    [LogicNodeNameEnum.ABS]: this.funcTypeTrans(MathFunctions.abs),
    [LogicNodeNameEnum.FLOOR]: this.funcTypeTrans(MathFunctions.floor),
    [LogicNodeNameEnum.CEIL]: this.funcTypeTrans(MathFunctions.ceil),
    [LogicNodeNameEnum.ROUND]: this.funcTypeTrans(MathFunctions.round),
    [LogicNodeNameEnum.SQRT]: this.funcTypeTrans(MathFunctions.sqrt),
    // 数学二元运算
    [LogicNodeNameEnum.ADD]: this.funcTypeTrans(MathFunctions.add),
    [LogicNodeNameEnum.SUBTRACT]: this.funcTypeTrans(MathFunctions.subtract),
    [LogicNodeNameEnum.MULTIPLY]: this.funcTypeTrans(MathFunctions.multiply),
    [LogicNodeNameEnum.DIVIDE]: this.funcTypeTrans(MathFunctions.divide),
    [LogicNodeNameEnum.MODULO]: this.funcTypeTrans(MathFunctions.modulo),
    [LogicNodeNameEnum.MAX]: this.funcTypeTrans(MathFunctions.max),
    [LogicNodeNameEnum.MIN]: this.funcTypeTrans(MathFunctions.min),
    [LogicNodeNameEnum.POWER]: this.funcTypeTrans(MathFunctions.power),
    [LogicNodeNameEnum.LOG]: this.funcTypeTrans(MathFunctions.log),
    // 数学一元函数
    [LogicNodeNameEnum.SIN]: this.funcTypeTrans(MathFunctions.sin),
    [LogicNodeNameEnum.COS]: this.funcTypeTrans(MathFunctions.cos),
    [LogicNodeNameEnum.TAN]: this.funcTypeTrans(MathFunctions.tan),
    [LogicNodeNameEnum.ASIN]: this.funcTypeTrans(MathFunctions.asin),
    [LogicNodeNameEnum.ACOS]: this.funcTypeTrans(MathFunctions.acos),
    [LogicNodeNameEnum.ATAN]: this.funcTypeTrans(MathFunctions.atan),
    [LogicNodeNameEnum.EXP]: this.funcTypeTrans(MathFunctions.exp),
    [LogicNodeNameEnum.LN]: this.funcTypeTrans(MathFunctions.ln),
    // 比较
    [LogicNodeNameEnum.LT]: this.funcTypeTrans(CompareFunctions.lessThan),
    [LogicNodeNameEnum.GT]: this.funcTypeTrans(CompareFunctions.greaterThan),
    [LogicNodeNameEnum.LTE]: this.funcTypeTrans(CompareFunctions.isIncreasing),
    [LogicNodeNameEnum.GTE]: this.funcTypeTrans(CompareFunctions.isDecreasing),
    [LogicNodeNameEnum.EQ]: this.funcTypeTrans(CompareFunctions.isSame),
    [LogicNodeNameEnum.NEQ]: this.funcTypeTrans(CompareFunctions.isDistinct),
    // 概率论与统计
    [LogicNodeNameEnum.COUNT]: this.funcTypeTrans(MathFunctions.count),
    [LogicNodeNameEnum.AVE]: this.funcTypeTrans(MathFunctions.average),
    [LogicNodeNameEnum.MEDIAN]: this.funcTypeTrans(MathFunctions.median),
    [LogicNodeNameEnum.MODE]: this.funcTypeTrans(MathFunctions.mode),
    [LogicNodeNameEnum.VARIANCE]: this.funcTypeTrans(MathFunctions.variance),
    [LogicNodeNameEnum.STANDARD_DEVIATION]: this.funcTypeTrans(MathFunctions.standardDeviation),
    [LogicNodeNameEnum.RANDOM]: this.funcTypeTrans(MathFunctions.random),
    [LogicNodeNameEnum.RANDOM_INT]: this.funcTypeTrans(MathFunctions.randomInt),
    [LogicNodeNameEnum.RANDOM_FLOAT]: this.funcTypeTrans(MathFunctions.randomFloat),
    [LogicNodeNameEnum.RANDOM_POISSON]: this.funcTypeTrans(MathFunctions.randomPoisson),
    // 逻辑门
    [LogicNodeNameEnum.AND]: this.funcTypeTrans(MathFunctions.and),
    [LogicNodeNameEnum.OR]: this.funcTypeTrans(MathFunctions.or),
    [LogicNodeNameEnum.NOT]: this.funcTypeTrans(MathFunctions.not),
    [LogicNodeNameEnum.XOR]: this.funcTypeTrans(MathFunctions.xor),
    // 字符串类计算
    [LogicNodeNameEnum.UPPER]: StringFunctions.upper,
    [LogicNodeNameEnum.LOWER]: StringFunctions.lower,
    [LogicNodeNameEnum.LEN]: StringFunctions.len,
    [LogicNodeNameEnum.COPY]: StringFunctions.copy,
    [LogicNodeNameEnum.SPLIT]: StringFunctions.split,
    [LogicNodeNameEnum.REPLACE]: StringFunctions.replace,
    [LogicNodeNameEnum.CONNECT]: StringFunctions.connect,
    [LogicNodeNameEnum.CHECK_REGEX_MATCH]: StringFunctions.checkRegexMatch,
  };

  MapVariableFunction: VariableFunctionMap = {
    // 编程类功能
    [LogicNodeNameEnum.SET_VAR]: ProgramFunctions.setVar,
    [LogicNodeNameEnum.GET_VAR]: ProgramFunctions.getVar,
  };

  /**
   * 其他特殊功能的函数
   */
  MapOtherFunction: OtherFunctionMap = {
    [LogicNodeNameEnum.RGB]: NodeLogic.setColorByRGB,
    [LogicNodeNameEnum.RGBA]: NodeLogic.setColorByRGBA,
    [LogicNodeNameEnum.GET_LOCATION]: NodeLogic.getLocation,
    [LogicNodeNameEnum.SET_LOCATION]: NodeLogic.setLocation,
    [LogicNodeNameEnum.SET_LOCATION_BY_UUID]: NodeLogic.setLocationByUUID,
    [LogicNodeNameEnum.GET_LOCATION_BY_UUID]: NodeLogic.getLocationByUUID,
    [LogicNodeNameEnum.GET_SIZE]: NodeLogic.getSize,
    [LogicNodeNameEnum.GET_MOUSE_LOCATION]: NodeLogic.getMouseLocation,
    [LogicNodeNameEnum.GET_MOUSE_WORLD_LOCATION]: NodeLogic.getMouseWorldLocation,
    [LogicNodeNameEnum.GET_CAMERA_LOCATION]: NodeLogic.getCameraLocation,
    [LogicNodeNameEnum.SET_CAMERA_LOCATION]: NodeLogic.setCameraLocation,
    [LogicNodeNameEnum.GET_CAMERA_SCALE]: NodeLogic.getCameraScale,
    [LogicNodeNameEnum.SET_CAMERA_SCALE]: NodeLogic.setCameraScale,
    [LogicNodeNameEnum.IS_COLLISION]: NodeLogic.isCollision,
    [LogicNodeNameEnum.GET_TIME]: NodeLogic.getTime,
    [LogicNodeNameEnum.GET_DATE_TIME]: NodeLogic.getDateTime,
    [LogicNodeNameEnum.ADD_DATE_TIME]: NodeLogic.addDateTime,
    [LogicNodeNameEnum.PLAY_SOUND]: NodeLogic.playSound,
    [LogicNodeNameEnum.FPS]: NodeLogic.getFps,
    [LogicNodeNameEnum.GET_NODE_RGBA]: NodeLogic.getNodeRGBA,
    [LogicNodeNameEnum.GET_NODE_UUID]: NodeLogic.getNodeUUID,
    [LogicNodeNameEnum.COLLECT_NODE_DETAILS_BY_RGBA]: NodeLogic.collectNodeDetailsByRGBA,
    [LogicNodeNameEnum.COLLECT_NODE_NAME_BY_RGBA]: NodeLogic.collectNodeNameByRGBA,
    [LogicNodeNameEnum.CREATE_TEXT_NODE_ON_LOCATION]: NodeLogic.createTextNodeOnLocation,
    [LogicNodeNameEnum.IS_HAVE_ENTITY_ON_LOCATION]: NodeLogic.isHaveEntityOnLocation,
    [LogicNodeNameEnum.REPLACE_GLOBAL_CONTENT]: NodeLogic.replaceGlobalContent,
    [LogicNodeNameEnum.SEARCH_CONTENT]: NodeLogic.searchContent,
    [LogicNodeNameEnum.DELETE_PEN_STROKE_BY_COLOR]: NodeLogic.deletePenStrokeByColor,
    [LogicNodeNameEnum.DELAY_COPY]: NodeLogic.delayCopy,
  };

  variables = new Map<string, string>();

  constructor(private readonly project: Project) {}

  private tickNumber = 0;

  /**
   *
   * @param tickNumber 帧号
   * @returns
   */
  tick() {
    // debug 只有在按下x键才会触发
    if (!this.project.controller.pressingKeySet.has("x")) {
      return;
    }
    if (this.project.controller.pressingKeySet.has("shift")) {
      if (this.tickNumber % 60 !== 0) {
        return;
      }
    }

    // 用于显示逻辑节点执行顺序标号
    let i = 0;

    let nodes = this.project.stageManager.getTextNodes().filter((node) => this.isTextNodeLogic(node));
    nodes = this.sortEntityByLocation(nodes) as TextNode[];

    // 自动计算引擎功能

    for (const node of nodes) {
      this.computeTextNode(node);
      this.project.effects.addEffect(TextRaiseEffectLocated.fromDebugLogicNode(i, node.geometryCenter));
      i++;
    }
    // region 计算section
    let sections = this.project.stageManager
      .getSections()
      .filter((section) => this.isSectionLogic(section) && section.text.length > 0);
    sections = this.sortEntityByLocation(sections) as Section[];

    for (const section of sections) {
      this.computeSection(section);
    }
    // region 根据Edge计算
    for (const edge of this.project.stageManager
      .getLineEdges()
      .sort(
        (a, b) => a.source.collisionBox.getRectangle().location.x - b.source.collisionBox.getRectangle().location.x,
      )) {
      this.computeEdge(edge);
    }
    // NodeLogic.step++;
    // TODO: 逻辑引擎执行一步，计数器+1
  }

  /**
   * 将 MathFunctionType 转换为 StringFunctionType
   * @param mF
   * @returns
   */
  funcTypeTrans(mF: MathFunctionType): StringFunctionType {
    return (args: string[]): string[] => {
      const numbers = args.map((arg) => this.project.autoComputeUtils.stringToNumber(arg));
      const result = mF(numbers);
      return result.map((num) => String(num));
    };
  }

  isTextNodeLogic(node: TextNode): boolean {
    const names = [
      ...Object.keys(this.MapNameFunction),
      ...Object.keys(this.MapOtherFunction),
      ...Object.keys(this.MapVariableFunction),
    ];
    return names.includes(node.text);
  }

  private isSectionLogic(section: Section): boolean {
    for (const name of Object.keys(this.MapNameFunction)) {
      if (section.text === name) {
        return true;
      }
    }
    return false;
  }

  /**
   * 按y轴从上到下排序，如果y轴相同，则按照x轴从左到右排序
   * @param entities
   * @returns
   */
  private sortEntityByLocation(entities: Entity[]): Entity[] {
    // 按照y坐标排序
    // 太草了，2025.1.18 周六晚上littlefean发现y轴排序不能只传递一个对象，要传递两个对象然后相互减
    // 否则就拍了个寂寞……
    return entities.sort((a, b) => {
      const yDiff = a.collisionBox.getRectangle().location.y - b.collisionBox.getRectangle().location.y;
      if (yDiff === 0) {
        return a.collisionBox.getRectangle().location.x - b.collisionBox.getRectangle().location.x;
      }
      return yDiff;
    });
  }

  /**
   * 运行一个节点的计算
   * @param node
   */
  private computeTextNode(node: TextNode) {
    for (const name of Object.keys(this.MapNameFunction)) {
      if (node.text === name) {
        // 发现了一个逻辑节点
        this.project.effects.addEffect(RectangleLittleNoteEffect.fromUtilsLittleNote(node));

        const result = this.MapNameFunction[name](
          this.project.autoComputeUtils.getParentTextNodes(node).map((p) => p.text),
        );
        this.project.autoComputeUtils.generateMultiResult(node, result);
      }
    }
    // 特殊类型计算
    for (const name of Object.keys(this.MapOtherFunction)) {
      if (node.text === name) {
        // 发现了一个特殊节点
        if (name === LogicNodeNameEnum.DELAY_COPY) {
          // 延迟复制要传逻辑节点本身的uuid
          const result = this.MapOtherFunction[name](
            this.project,
            [...this.project.autoComputeUtils.getParentEntities(node), node],
            this.project.autoComputeUtils.getChildTextNodes(node),
          );
          this.project.autoComputeUtils.generateMultiResult(node, result);
          continue;
        }
        const result = this.MapOtherFunction[name](
          this.project,
          this.project.autoComputeUtils.getParentEntities(node),
          this.project.autoComputeUtils.getChildTextNodes(node),
        );
        this.project.autoComputeUtils.generateMultiResult(node, result);
      }
    }
    // 变量计算
    for (const name of Object.keys(this.MapVariableFunction)) {
      if (node.text === name) {
        // 发现了一个变量节点
        const result = this.MapVariableFunction[name](
          this.project,
          this.project.autoComputeUtils.getParentTextNodes(node).map((p) => p.text),
        );
        this.project.autoComputeUtils.generateMultiResult(node, result);
      }
    }
  }

  private computeSection(section: Section) {
    for (const name of Object.keys(this.MapNameFunction)) {
      if (section.text === name) {
        // 发现了一个逻辑Section
        const inputStringList: string[] = [];
        for (const child of section.children.sort(
          (a, b) => a.collisionBox.getRectangle().location.x - b.collisionBox.getRectangle().location.x,
        )) {
          if (child instanceof TextNode) {
            inputStringList.push(child.text);
          }
        }
        const result = this.MapNameFunction[name](inputStringList);
        this.project.autoComputeUtils.getSectionMultiResult(section, result);
      }
    }
  }

  private computeEdge(edge: LineEdge) {
    for (const name of Object.keys(this.MapOperationNameFunction)) {
      if (edge.text === name) {
        // 发现了一个逻辑Edge
        const source = edge.source;
        const target = edge.target;
        if (source instanceof TextNode && target instanceof TextNode) {
          const inputStringList: string[] = [source.text, target.text];

          const result = this.MapOperationNameFunction[name](inputStringList);
          this.project.autoComputeUtils.getNodeOneResult(target, result[0]);
        }
      }
      // 更加简化的Edge计算
      if (edge.text.includes(name)) {
        // 检测 '+5' '/2' 这样的情况，提取后面的数字
        const num = Number(edge.text.replace(name, ""));
        if (num) {
          const source = edge.source;
          const target = edge.target;
          if (source instanceof TextNode && target instanceof TextNode) {
            const inputStringList: string[] = [source.text, num.toString()];
            const result = this.MapOperationNameFunction[name](inputStringList);
            target.rename(result[0]);
          }
        }
      }
    }
  }
}
