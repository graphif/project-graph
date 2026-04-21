import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { EdgeCollisionBoxGetter } from "@/core/stage/stageObject/association/EdgeCollisionBoxGetter";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { getMultiLineTextSize } from "@/utils/font";
import { Color, Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";

@passExtraAtArg1
@passObject
export class LineEdge extends Edge {
  @id
  @serializable
  public uuid: string;
  @serializable
  public text: string;
  @serializable
  public color: Color = Color.Transparent;
  @serializable
  public lineType: string = "solid";

  get collisionBox(): CollisionBox {
    return EdgeCollisionBoxGetter.getCollisionBox(this);
  }

  /**
   * 几何组偏移索引（运行时计算，非持久化）
   * 0 = 正常直线/曲线
   * 正负整数 = 向垂直方向偏移，用于同几何组的多重边自动散开
   * 取代旧的 isShifting boolean，逻辑被几何组方案完全包含
   */
  get shiftingIndex(): number {
    return this._shiftingIndex;
  }
  set shiftingIndex(value: number) {
    this._shiftingIndex = value;
  }
  private _shiftingIndex: number = 0;

  constructor(
    protected readonly project: Project,
    {
      associationList = [] as ConnectableEntity[],
      text = "",
      uuid = crypto.randomUUID() as string,
      color = Color.Transparent,
      sourceRectangleRate = Vector.same(0.5),
      targetRectangleRate = Vector.same(0.5),
      lineType = "solid",
    },
    /** true表示解析状态，false表示解析完毕 */
    public unknown = false,
  ) {
    super();
    this.uuid = uuid;
    this.associationList = associationList;
    this.text = text;
    this.color = color;
    this.sourceRectangleRate = sourceRectangleRate;
    this.targetRectangleRate = targetRectangleRate;
    this.lineType = lineType;

    this.adjustSizeByText();
  }

  // warn: 暂时无引用
  static fromTwoEntity(project: Project, source: ConnectableEntity, target: ConnectableEntity): LineEdge {
    const result = new LineEdge(project, {
      associationList: [source, target],
    });
    return result;
  }

  public rename(text: string) {
    this.text = text;
    this.adjustSizeByText();
  }

  get textRectangle(): Rectangle {
    // HACK: 这里会造成频繁渲染，频繁计算文字宽度进而可能出现性能问题
    const textSize = getMultiLineTextSize(this.text, Renderer.FONT_SIZE, 1.2);
    // 自环连线的文字位置在节点左上角上方
    if (this.source.uuid === this.target.uuid) {
      const textLocation = this.source.collisionBox.getRectangle().location.add(new Vector(0, -50));
      return new Rectangle(textLocation.subtract(textSize.divide(2)), textSize);
    }
    if (this._shiftingIndex !== 0) {
      return new Rectangle(this.shiftingMidPoint.subtract(textSize.divide(2)), textSize);
    } else {
      return new Rectangle(this.bodyLine.midPoint().subtract(textSize.divide(2)), textSize);
    }
  }

  get shiftingMidPoint(): Vector {
    const BASE_OFFSET = 60;
    const midPoint = Vector.average(
      this.source.collisionBox.getRectangle().center,
      this.target.collisionBox.getRectangle().center,
    );
    // 使用规范化方向（uuid 较小的节点 → uuid 较大的节点）
    // 保证同一几何组内所有边（包括反向边）共享同一垂直轴，
    // 避免 A→B 和 B→A 因方向取反 × index 取反相互抵消、落到同侧
    const canonicalFrom =
      this.source.uuid <= this.target.uuid
        ? this.source.collisionBox.getRectangle().getCenter()
        : this.target.collisionBox.getRectangle().getCenter();
    const canonicalTo =
      this.source.uuid <= this.target.uuid
        ? this.target.collisionBox.getRectangle().getCenter()
        : this.source.collisionBox.getRectangle().getCenter();
    return midPoint.add(
      canonicalTo
        .subtract(canonicalFrom)
        .normalize()
        .rotateDegrees(90)
        .multiply(this._shiftingIndex * BASE_OFFSET),
    );
  }

  adjustSizeByText(): void {}
}
