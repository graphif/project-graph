import { Project } from "@/core/Project";
import { Association } from "@/core/stage/stageObject/abstract/Association";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
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
export class MultiTargetUndirectedEdge extends Association {
  @id
  @serializable
  public uuid: string;

  get collisionBox(): CollisionBox {
    // 计算多个节点的外接矩形的中心点
    const center = this.centerLocation;

    const shapes: Shape[] = [];
    for (const node of this.associationList) {
      const line = new Line(center, node.collisionBox.getRectangle().center);
      shapes.push(line);
    }
    return new CollisionBox(shapes);
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
      associationList = [] as Entity[],
      text = "",
      uuid = crypto.randomUUID() as string,
      color = Color.Transparent,
      rectRates = associationList.map(() => Vector.same(0.5)),
      arrow = "none" as UndirectedEdgeArrowType,
      centerRate = Vector.same(0.5),
      padding = 10,
      renderType = "line" as MultiTargetUndirectedEdgeRenderType,
    }: {
      associationList?: Entity[];
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
    if (this.associationList.length === 2) {
      // 和lineEdge保持一样的逻辑
      const line = new Line(
        this.associationList[0].collisionBox.getRectangle().center,
        this.associationList[1].collisionBox.getRectangle().center,
      );
      return line.midPoint();
    }
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

  static createFromSomeEntity(project: Project, entities: Entity[]) {
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
