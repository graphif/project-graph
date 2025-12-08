import { Project } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { ResizeAble } from "@/core/stage/stageObject/abstract/StageObjectInterface";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Color, Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";

/**
 * Svg 节点
 */
@passExtraAtArg1
@passObject
export class SvgNode extends ConnectableEntity implements ResizeAble {
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
   * 并将修改后的SVG内容保存到project.attachments中，实现持久化存储
   */
  async changeColor(newColor: Color, mode: "fill" | "stroke" = "fill") {
    // 先释放原来的objecturl
    URL.revokeObjectURL(this.image.src);
    this.color = newColor;
    const hexColor = newColor.toHexStringWithoutAlpha();
    // 先转换回svg代码
    const svgCode = await this.project.attachments.get(this.attachmentId)?.text();
    if (!svgCode) {
      return;
    }
    let newSvgCode = svgCode;
    if (mode === "fill") {
      // 替换所有fill="xxxx"格式为fill="新颜色"
      newSvgCode = svgCode.replace(/fill="[^"]*"/g, `fill="${hexColor}"`);
    } else if (mode === "stroke") {
      // 替换所有stroke="xxxx"格式为stroke="新颜色"
      newSvgCode = svgCode.replace(/stroke="[^"]*"/g, `stroke="${hexColor}"`);
    }
    // 创建新的Blob
    const newBlob = new Blob([newSvgCode], { type: "image/svg+xml" });

    // 将修改后的SVG内容保存到project.attachments中，实现持久化存储
    const newAttachmentId = this.project.addAttachment(newBlob);
    // 更新当前节点的attachmentId
    this.attachmentId = newAttachmentId;

    // 重新创建image对象
    const newUrl = URL.createObjectURL(newBlob);
    this.image = new Image();
    this.image.src = newUrl;
    // 因为只是改了颜色所以不用重新计算大小
  }

  /**
   * 处理拖拽缩放逻辑
   * @param delta 拖拽距离向量
   */
  resizeHandle(delta: Vector) {
    if (this.originalSize.x === 0 || this.originalSize.y === 0) return;

    // 计算当前显示尺寸
    const currentDisplayWidth = this.originalSize.x * this.scale;

    // 根据delta计算新的显示尺寸（只使用delta.x，保持等比例缩放）
    const newDisplayWidth = Math.max(currentDisplayWidth + delta.x, this.originalSize.x * 0.1);

    // 计算新的缩放比例
    const newScale = newDisplayWidth / this.originalSize.x;

    // 更新缩放比例，使用现有的scaleUpdate方法保持一致性
    const scaleDiff = newScale - this.scale;
    this.scaleUpdate(scaleDiff);
  }

  /**
   * 获取缩放控制点矩形
   * 返回右下角的一个小矩形，用于拖拽缩放
   */
  getResizeHandleRect(): Rectangle {
    // 确保collisionBox和rectangle都已初始化
    const rect = this.collisionBox.getRectangle();
    if (!rect) {
      // 如果rect不存在，返回一个默认的矩形
      return new Rectangle(Vector.same(0), new Vector(25, 25));
    }
    // 创建一个25x25的矩形，位于右下角
    return new Rectangle(new Vector(rect.right - 25, rect.bottom - 25), new Vector(25, 25));
  }
}
