import { Project } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Color, Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";

/**
 * Svg 节点
 */
@passExtraAtArg1
@passObject
export class SvgNode extends Entity {
  @serializable
  color: Color = Color.Transparent;
  @id
  @serializable
  uuid: string;
  @serializable
  scale: number;
  @serializable
  collisionBox: CollisionBox;
  @serializable
  attachmentId: string;
  isHiddenBySectionCollapse: boolean = false;

  originalSize: Vector = Vector.getZero();
  image: HTMLImageElement = new Image();

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID(),
      details = [],
      attachmentId = "",
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), Vector.getZero())]),
      scale = 1,
      color = Color.Transparent,
    },
  ) {
    super();
    this.uuid = uuid;
    this.details = details;
    this.scale = scale;
    this.attachmentId = attachmentId;
    this.collisionBox = collisionBox;
    this.color = color;

    const blob = project.attachments.get(attachmentId);
    if (!blob) {
      return;
    }
    const url = URL.createObjectURL(blob);
    this.image = new Image();
    this.image.src = url;
    this.image.onload = () => {
      this.originalSize = new Vector(this.image.naturalWidth, this.image.naturalHeight);
      this.collisionBox = new CollisionBox([
        new Rectangle(this.collisionBox.getRectangle().location, this.originalSize.multiply(this.scale)),
      ]);
    };
  }

  public get geometryCenter(): Vector {
    return this.collisionBox.getRectangle().center;
  }

  public scaleUpdate(scaleDiff: number) {
    this.scale += scaleDiff;
    if (this.scale < 0.1) {
      this.scale = 0.1;
    }
    if (this.scale > 10) {
      this.scale = 10;
    }

    this.collisionBox = new CollisionBox([
      new Rectangle(this.collisionBox.getRectangle().location, this.originalSize.multiply(this.scale)),
    ]);
  }

  move(delta: Vector): void {
    const newRectangle = this.collisionBox.getRectangle().clone();
    newRectangle.location = newRectangle.location.add(delta);
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }

  moveTo(location: Vector): void {
    const newRectangle = this.collisionBox.getRectangle().clone();
    newRectangle.location = location.clone();
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }

  /**
   * 修改SVG内容中的颜色
   * @param newColor 新颜色
   */
  async changeColor(newColor: Color) {
    // 先释放原来的objecturl
    URL.revokeObjectURL(this.image.src);
    this.color = newColor;
    const hexColor = newColor.toHexStringWithoutAlpha();
    // 先转换回svg代码
    const svgCode = await this.project.attachments.get(this.attachmentId)?.text();
    if (!svgCode) {
      return;
    }
    // 替换所有currentColor
    const newSvgCode = svgCode.replace(/currentColor/g, hexColor);
    // 重新创建image对象
    const newBlob = new Blob([newSvgCode], { type: "image/svg+xml" });
    const newUrl = URL.createObjectURL(newBlob);
    this.image = new Image();
    this.image.src = newUrl;
    // 因为只是改了颜色所以不用重新计算大小
  }
}
