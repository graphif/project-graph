import { Color } from "@graphif/color";
import { Vector } from "@graphif/data-structures";
import { CubicCatmullRomSpline, Rectangle } from "@graphif/shapes";
import { v4 as uuidv4 } from "uuid";
import { Serialized } from "@/types/node";
import { getMultiLineTextSize } from "@/utils/font";
import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Edge } from "@/core/stage/stageObject/association/Edge";

/**
 * CR曲线连线
 * 和早期的Edge一样，用于有向的连接两个实体，形成连接关系
 * alpha 不用自己修改了，这个是0.5固定值了，只会微微影响形状
 * tension 控制曲线的弯曲程度，0是折线。
 */
export class CubicCatmullRomSplineEdge extends Edge {
  public uuid: string;
  public text: string;
  protected _source: ConnectableEntity;
  protected _target: ConnectableEntity;
  public color: Color = Color.Transparent;
  public alpha = 0.5;
  public tension = 0;
  private controlPoints: Vector[] = [];
  public getControlPoints(): Vector[] {
    return this.controlPoints;
  }

  // 实验性的增加控制点
  public addControlPoint() {
    if (this.controlPoints.length >= 4) {
      // 获取倒数第二个和倒数第三个控制点
      const secondLastPoint = this.controlPoints[this.controlPoints.length - 2];
      const thirdLastPoint = this.controlPoints[this.controlPoints.length - 3];
      // 计算中间控制点
      const middlePoint = Vector.fromTwoPointsCenter(secondLastPoint, thirdLastPoint);
      // 将新的控制点插入到数组对应的位置上
      this.controlPoints.splice(this.controlPoints.length - 2, 0, middlePoint);
    }
  }

  private _collisionBox: CollisionBox;

  get collisionBox(): CollisionBox {
    return this._collisionBox;
  }

  static fromTwoEntity(
    project: Project,
    source: ConnectableEntity,
    target: ConnectableEntity,
  ): CubicCatmullRomSplineEdge {
    // 处理控制点，控制点必须有四个，1 2 3 4，12可重叠，34可重叠
    const startLocation = source.geometryCenter.clone();
    const endLocation = target.geometryCenter.clone();
    const line = Edge.getCenterLine(source, target);

    const result = new CubicCatmullRomSplineEdge(project, {
      source: source.uuid,
      target: target.uuid,
      text: "",
      uuid: uuidv4(),
      type: "core:cublic_catmull_rom_spline_edge",
      alpha: 0.5,
      tension: 0,
      color: [0, 0, 0, 0],
      sourceRectRate: [0.5, 0.5],
      targetRectRate: [0.5, 0.5],
      controlPoints: [
        [startLocation.x, startLocation.y],
        [line.start.x, line.start.y],
        [line.end.x, line.end.y],
        [endLocation.x, endLocation.y],
      ],
    });
    return result;
  }

  constructor(
    protected readonly project: Project,
    {
      uuid,
      source,
      target,
      text,
      alpha,
      tension,
      color,
      controlPoints,
      sourceRectRate,
      targetRectRate,
    }: Serialized.CubicCatmullRomSplineEdge /** true表示解析状态，false表示解析完毕 */,
    public unknown = false,
  ) {
    super();
    // this._source = this.project.stageManager.getTextNodeByUUID(source) as TextNode;
    // this._target = this.project.stageManager.getTextNodeByUUID(target) as TextNode;
    this._source = new TextNode(this.project, { uuid: source }, true);
    this._target = new TextNode(this.project, { uuid: target }, true);
    this.uuid = uuid;
    this.text = text;
    this.alpha = alpha;
    this.color = new Color(...color);
    this.tension = tension;
    this.controlPoints = controlPoints.map((item) => new Vector(item[0], item[1]));
    this.setSourceRectangleRate(new Vector(...sourceRectRate));
    this.setTargetRectangleRate(new Vector(...targetRectRate));
    this._collisionBox = new CollisionBox([new CubicCatmullRomSpline(this.controlPoints, this.alpha, this.tension)]);
  }

  public getShape(): CubicCatmullRomSpline {
    // 重新计算形状
    const crShape = this._collisionBox.shapes[0] as CubicCatmullRomSpline;
    this.autoUpdateControlPoints(); // ?
    return crShape;
  }

  /**
   * 获取文字的矩形框的方法
   */
  get textRectangle(): Rectangle {
    const textSize = getMultiLineTextSize(this.text, Renderer.FONT_SIZE, 1.2);
    return new Rectangle(this.bodyLine.midPoint().subtract(textSize.divide(2)), textSize);
  }

  autoUpdateControlPoints() {
    // 只更新起始点和结束点
    const startLocation = this._source.collisionBox.getRectangle().center;
    const endLocation = this._target.collisionBox.getRectangle().center;
    const line = Edge.getCenterLine(this._source, this._target);
    if (this.controlPoints.length <= 4) {
      this.controlPoints = [startLocation, line.start, line.end, endLocation];
    } else {
      // 截取出除去前两个和最后两个控制点，获取全部的中间控制点
      const middleControlPoints = this.controlPoints.slice(2, -2);
      this.controlPoints = [startLocation, line.start].concat(middleControlPoints).concat([line.end, endLocation]);
    }
    // 重新生成新的形状
    this._collisionBox.shapes = [new CubicCatmullRomSpline(this.controlPoints, this.alpha, this.tension)];
  }

  /**
   * 获取箭头的位置和方向
   */
  getArrowHead(): { location: Vector; direction: Vector } {
    const crShape = this._collisionBox.shapes[0] as CubicCatmullRomSpline;
    const location = crShape.controlPoints[crShape.controlPoints.length - 2].clone();
    const lines = crShape.computeFunction();
    const funcs = lines[lines.length - 1];
    return {
      location,
      direction: funcs.derivative(0.95),
    };
  }

  adjustSizeByText(): void {}
}
