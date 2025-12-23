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
   * 是否是偏移状态
   * 偏移是为双向线准备的 A->B, B->A，防止重叠
   */
  get isShifting(): boolean {
    return this._isShifting;
  }
  set isShifting(value: boolean) {
    this._isShifting = value;
  }
  private _isShifting: boolean = false;

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
    if (this.isShifting) {
      return new Rectangle(this.shiftingMidPoint.subtract(textSize.divide(2)), textSize);
    } else {
      return new Rectangle(this.bodyLine.midPoint().subtract(textSize.divide(2)), textSize);
    }
  }

  get shiftingMidPoint(): Vector {
    const midPoint = Vector.average(
      this.source.collisionBox.getRectangle().center,
      this.target.collisionBox.getRectangle().center,
    );
    return midPoint.add(
      this.target.collisionBox
        .getRectangle()
        .getCenter()
        .subtract(this.source.collisionBox.getRectangle().getCenter())
        .normalize()
        .rotateDegrees(90)
        .multiply(50),
    );
  }

  adjustSizeByText(): void {}
}
