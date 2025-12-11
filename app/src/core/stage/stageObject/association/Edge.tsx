import { ConnectableAssociation } from "@/core/stage/stageObject/abstract/Association";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Vector } from "@graphif/data-structures";
import { serializable } from "@graphif/serializer";
import { Line, Rectangle } from "@graphif/shapes";
import { ConnectPoint } from "../entity/ConnectPoint";
import { ImageNode } from "../entity/ImageNode";
import { ReferenceBlockNode } from "../entity/ReferenceBlockNode";

/**
 * 连接两个实体的有向边
 */
export abstract class Edge extends ConnectableAssociation {
  public abstract uuid: string;
  /**
   * 线段上的文字
   */
  public abstract text: string;
  abstract collisionBox: CollisionBox;

  get isHiddenBySectionCollapse(): boolean {
    return this.source.isHiddenBySectionCollapse && this.target.isHiddenBySectionCollapse;
  }

  /** region 选中状态 */
  /**
   * 是否被选中
   */
  _isSelected: boolean = false;
  public get isSelected(): boolean {
    return this._isSelected;
  }
  public set isSelected(value: boolean) {
    this._isSelected = value;
  }

  /**
   * 任何有向边都可以标注文字
   * 进而获得该文字的外框矩形
   */
  abstract get textRectangle(): Rectangle;

  /**
   * 获取两个实体之间的直线
   * 此直线两端在两个实体外接矩形的边缘，延长后可过两个实体外接矩形的中心
   * 但对于图片节点，如果rate是精确值（不是旧的默认值），则直接使用内部位置
   */
  get bodyLine(): Line {
    const sourceRectangle = this.source.collisionBox.getRectangle();
    const targetRectangle = this.target.collisionBox.getRectangle();

    const edgeCenterLine = new Line(
      sourceRectangle.getInnerLocationByRateVector(this.sourceRectangleRate),
      targetRectangle.getInnerLocationByRateVector(this.targetRectangleRate),
    );
    let startPoint: Vector;
    let endPoint: Vector;

    // 检查是否是旧的默认值
    const isOldDefaultRate = (rate: Vector): boolean => {
      // 旧的默认值：中心、左、右、上、下
      return (
        (rate.x === 0.5 && rate.y === 0.5) || // 中心
        (rate.x === 0.01 && rate.y === 0.5) || // 左
        (rate.x === 0.99 && rate.y === 0.5) || // 右
        (rate.x === 0.5 && rate.y === 0.01) || // 上
        (rate.x === 0.5 && rate.y === 0.99) // 下
      );
    };

    if (this.source instanceof ConnectPoint) {
      startPoint = this.source.geometryCenter;
    } else if (
      (this.source instanceof ImageNode || this.source instanceof ReferenceBlockNode) &&
      !isOldDefaultRate(this.sourceRectangleRate)
    ) {
      // 对于图片或引用块节点，如果是精确值（不是旧的默认值），直接使用内部位置
      startPoint = edgeCenterLine.start;
    } else {
      // 否则渲染在外接矩形边缘上
      startPoint = sourceRectangle.getLineIntersectionPoint(edgeCenterLine);
    }
    if (this.target instanceof ConnectPoint) {
      endPoint = this.target.geometryCenter;
    } else if (
      (this.target instanceof ImageNode || this.target instanceof ReferenceBlockNode) &&
      !isOldDefaultRate(this.targetRectangleRate)
    ) {
      // 对于图片或引用块节点，如果是精确值（不是旧的默认值），直接使用内部位置
      endPoint = edgeCenterLine.end;
    } else {
      // 否则渲染在外接矩形边缘上
      endPoint = targetRectangle.getLineIntersectionPoint(edgeCenterLine);
    }
    return new Line(startPoint, endPoint);
  }

  /**
   * 获取该连线的起始点位置对应的世界坐标
   */
  get sourceLocation(): Vector {
    return this.source.collisionBox.getRectangle().getInnerLocationByRateVector(this.sourceRectangleRate);
  }
  /**
   * 获取该连线的终止点位置对应的世界坐标
   */
  get targetLocation(): Vector {
    return this.target.collisionBox.getRectangle().getInnerLocationByRateVector(this.targetRectangleRate);
  }

  @serializable
  public targetRectangleRate: Vector = new Vector(0.5, 0.5);
  @serializable
  public sourceRectangleRate: Vector = new Vector(0.5, 0.5);

  /**
   * 静态方法：
   * 获取两个实体外接矩形的连线线段，（只连接到两个边，不连到矩形中心）
   * @param source
   * @param target
   * @returns
   */
  static getCenterLine(source: ConnectableEntity, target: ConnectableEntity): Line {
    const sourceRectangle = source.collisionBox.getRectangle();
    const targetRectangle = target.collisionBox.getRectangle();

    const edgeCenterLine = new Line(sourceRectangle.center, targetRectangle.center);
    const startPoint = sourceRectangle.getLineIntersectionPoint(edgeCenterLine);
    const endPoint = targetRectangle.getLineIntersectionPoint(edgeCenterLine);
    return new Line(startPoint, endPoint);
  }

  /** 线段上的文字相关 */
  /**
   * 调整线段上的文字的外框矩形
   */
  abstract adjustSizeByText(): void;

  public rename(text: string) {
    this.text = text;
    this.adjustSizeByText();
  }

  /** 碰撞相关 */
  /**
   * 用于碰撞箱框选
   * @param rectangle
   */
  public isIntersectsWithRectangle(rectangle: Rectangle): boolean {
    return this.collisionBox.isIntersectsWithRectangle(rectangle);
  }

  /**
   * 用于鼠标悬浮在线上的时候
   * @param location
   * @returns
   */
  public isIntersectsWithLocation(location: Vector): boolean {
    return this.collisionBox.isContainsPoint(location);
  }

  /**
   * 用于线段框选
   * @param line
   * @returns
   */
  public isIntersectsWithLine(line: Line): boolean {
    return this.collisionBox.isIntersectsWithLine(line);
  }

  public isLeftToRight(): boolean {
    return this.sourceRectangleRate.x === 0.99 && this.targetRectangleRate.x === 0.01;
  }
  public isRightToLeft(): boolean {
    return this.sourceRectangleRate.x === 0.01 && this.targetRectangleRate.x === 0.99;
  }

  public isTopToBottom(): boolean {
    return this.sourceRectangleRate.y === 0.99 && this.targetRectangleRate.y === 0.01;
  }
  public isBottomToTop(): boolean {
    return this.sourceRectangleRate.y === 0.01 && this.targetRectangleRate.y === 0.99;
  }

  public isUnknownDirection(): boolean {
    return (
      this.sourceRectangleRate.x === 0.5 &&
      this.targetRectangleRate.x === 0.5 &&
      this.sourceRectangleRate.y === 0.5 &&
      this.targetRectangleRate.y === 0.5
    );
  }
}
