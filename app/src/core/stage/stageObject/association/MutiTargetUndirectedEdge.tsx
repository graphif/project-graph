import { Project } from "@/core/Project";
import { ConvexHull } from "@/core/algorithm/geometry/convexHull";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { ConnectableAssociation } from "@/core/stage/stageObject/abstract/Association";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { getMultiLineTextSize } from "@/utils/font";
import { Color, Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Line, Rectangle, Shape } from "@graphif/shapes";

/**
 * 无向边的箭头类型
 * inner：--> xxx <--
 * outer：<-- xxx -->
 * none： --- xxx ---
 */
export type UndirectedEdgeArrowType = "inner" | "outer" | "none";
/**
 * 无向边的渲染方式
 * line：内部连线式渲染
 * convex：凸包连线式渲染
 * circle：圆形包围渲染
 */
export type MultiTargetUndirectedEdgeRenderType = "line" | "convex" | "circle";

/**
 * 多端无向边
 *
 * 超边。
 * 以后可以求最大强独立集
 */
@passExtraAtArg1
@passObject
export class MultiTargetUndirectedEdge extends ConnectableAssociation {
  @id
  @serializable
  public uuid: string;

  get collisionBox(): CollisionBox {
    // 根据不同的渲染类型生成不同的碰撞箱
    if (this.renderType === "convex") {
      // 凸包类型：使用凸包边缘的折线段作为碰撞箱
      const shapes: Shape[] = [];
      if (this.associationList.length >= 2) {
        // 计算凸包点
        const convexPoints: Vector[] = [];
        this.associationList.map((node) => {
          const nodeRectangle = node.collisionBox.getRectangle().expandFromCenter(this.padding);
          convexPoints.push(nodeRectangle.leftTop);
          convexPoints.push(nodeRectangle.rightTop);
          convexPoints.push(nodeRectangle.rightBottom);
          convexPoints.push(nodeRectangle.leftBottom);
        });
        if (this.text !== "") {
          const textRectangle = this.textRectangle.expandFromCenter(this.padding);
          convexPoints.push(textRectangle.leftTop);
          convexPoints.push(textRectangle.rightTop);
          convexPoints.push(textRectangle.rightBottom);
          convexPoints.push(textRectangle.leftBottom);
        }
        // 计算凸包
        const convexHull = ConvexHull.computeConvexHull(convexPoints);
        // 将凸包点转换为连续的线段
        for (let i = 0; i < convexHull.length; i++) {
          const start = convexHull[i];
          const end = convexHull[(i + 1) % convexHull.length];
          shapes.push(new Line(start, end));
        }
      }
      return new CollisionBox(shapes);
    } else if (this.renderType === "circle") {
      // 圆形类型：使用圆形边缘的折线段（多边形近似）作为碰撞箱
      const shapes: Shape[] = [];
      if (this.associationList.length >= 2) {
        // 计算所有点
        const allPoints: Vector[] = [];
        this.associationList.map((node) => {
          const nodeRectangle = node.collisionBox.getRectangle().expandFromCenter(this.padding);
          allPoints.push(nodeRectangle.leftTop);
          allPoints.push(nodeRectangle.rightTop);
          allPoints.push(nodeRectangle.rightBottom);
          allPoints.push(nodeRectangle.leftBottom);
        });
        if (this.text !== "") {
          const textRectangle = this.textRectangle.expandFromCenter(this.padding);
          allPoints.push(textRectangle.leftTop);
          allPoints.push(textRectangle.rightTop);
          allPoints.push(textRectangle.rightBottom);
          allPoints.push(textRectangle.leftBottom);
        }
        // 计算圆心和半径
        const center = Vector.averageMultiple(allPoints);
        let maxDistance = 0;
        for (const point of allPoints) {
          const distance = center.distance(point);
          if (distance > maxDistance) {
            maxDistance = distance;
          }
        }
        // 生成多边形顶点（20个顶点近似圆形）
        const vertexCount = 20;
        const vertices: Vector[] = [];
        for (let i = 0; i < vertexCount; i++) {
          const angle = (i / vertexCount) * Math.PI * 2;
          const x = center.x + maxDistance * Math.cos(angle);
          const y = center.y + maxDistance * Math.sin(angle);
          vertices.push(new Vector(x, y));
        }
        // 将顶点转换为连续的线段
        for (let i = 0; i < vertices.length; i++) {
          const start = vertices[i];
          const end = vertices[(i + 1) % vertices.length];
          shapes.push(new Line(start, end));
        }
      }
      return new CollisionBox(shapes);
    } else {
      // line类型：保持现有实现
      const center = this.centerLocation;
      const shapes: Shape[] = [];
      for (const node of this.associationList) {
        const line = new Line(center, node.collisionBox.getRectangle().center);
        shapes.push(line);
      }
      return new CollisionBox(shapes);
    }
  }

  @serializable
  public text: string;
  @serializable
  public color: Color;
  @serializable
  public rectRates: Vector[];
  @serializable
  public centerRate: Vector;
  @serializable
  public arrow: UndirectedEdgeArrowType = "none";
  @serializable
  public renderType: MultiTargetUndirectedEdgeRenderType = "line";
  @serializable
  public padding: number;

  public rename(text: string) {
    this.text = text;
  }

  constructor(
    protected readonly project: Project,
    {
      associationList = [] as ConnectableEntity[],
      text = "",
      uuid = crypto.randomUUID() as string,
      color = Color.Transparent,
      rectRates = associationList.map(() => Vector.same(0.5)),
      arrow = "none" as UndirectedEdgeArrowType,
      centerRate = Vector.same(0.5),
      padding = 10,
      renderType = "line" as MultiTargetUndirectedEdgeRenderType,
    }: {
      associationList?: ConnectableEntity[];
      text?: string;
      uuid?: string;
      color?: Color;
      rectRates?: Vector[];
      arrow?: UndirectedEdgeArrowType;
      centerRate?: Vector;
      padding?: number;
      renderType?: MultiTargetUndirectedEdgeRenderType;
    },
    /** true表示解析状态，false表示解析完毕 */
    public unknown = false,
  ) {
    super();

    this.text = text;
    this.uuid = uuid;
    this.color = color;
    this.associationList = associationList;
    this.rectRates = rectRates;
    this.centerRate = centerRate;
    this.arrow = arrow;
    this.renderType = renderType;
    this.padding = padding;
  }

  /**
   * 获取中心点
   */
  public get centerLocation(): Vector {
    const boundingRectangle = Rectangle.getBoundingRectangle(
      this.associationList.map((n) => n.collisionBox.getRectangle()),
    );
    return boundingRectangle.getInnerLocationByRateVector(this.centerRate);
  }

  get textRectangle(): Rectangle {
    // HACK: 这里会造成频繁渲染，频繁计算文字宽度进而可能出现性能问题
    const textSize = getMultiLineTextSize(this.text, Renderer.FONT_SIZE, 1.2);
    return new Rectangle(this.centerLocation.subtract(textSize.divide(2)), textSize);
  }

  static createFromSomeEntity(project: Project, entities: ConnectableEntity[]) {
    // 自动计算padding
    let padding = 10;
    for (const entity of entities) {
      const hyperEdges = project.graphMethods.getHyperEdgesByNode(entity);
      if (hyperEdges.length > 0) {
        const maxPadding = Math.max(...hyperEdges.map((e) => e.padding));
        padding = Math.max(maxPadding + 10, padding);
      }
    }

    return new MultiTargetUndirectedEdge(project, {
      associationList: entities,
      padding,
    });
  }

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
}
