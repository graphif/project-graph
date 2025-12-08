import { Project } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { ResizeAble } from "@/core/stage/stageObject/abstract/StageObjectInterface";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";

/**
 * 一个图片节点
 * 图片的路径字符串决定了这个图片是什么
 *
 * 有两个转换过程：
 *
 * 图片路径 -> base64字符串 -> 图片Element -> 完成
 *   gettingBase64
 *     |
 *     v
 *   fileNotfound
 *   base64EncodeError
 *
 */
@passExtraAtArg1
@passObject
export class ImageNode extends ConnectableEntity implements ResizeAble {
  isHiddenBySectionCollapse: boolean = false;
  @id
  @serializable
  public uuid: string;
  @serializable
  public collisionBox: CollisionBox;
  @serializable
  attachmentId: string;
  @serializable
  scale: number;
  /**
   * 节点是否被选中
   */
  _isSelected: boolean = false;

  /**
   * 获取节点的选中状态
   */
  public get isSelected() {
    return this._isSelected;
  }

  public set isSelected(value: boolean) {
    this._isSelected = value;
  }

  bitmap: ImageBitmap | undefined;
  state: "loading" | "success" | "notFound" = "loading";

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), Vector.getZero())]),
      details = [],
      attachmentId = "",
      scale = 1,
    },
    public unknown = false,
  ) {
    super();
    this.uuid = uuid;
    this.collisionBox = collisionBox;
    this.details = details;
    this.attachmentId = attachmentId;
    this.scale = scale;

    const blob = project.attachments.get(attachmentId);
    if (!blob) {
      this.state = "notFound";
      return;
    }
    createImageBitmap(blob).then((bitmap) => {
      this.bitmap = bitmap;
      this.state = "success";
      // 设置碰撞箱
      this.scaleUpdate(0);
    });
  }

  public scaleUpdate(scaleDiff: number) {
    this.scale += scaleDiff;
    if (this.scale < 0.1) {
      this.scale = 0.1;
    }
    if (this.scale > 10) {
      this.scale = 10;
    }
    if (!this.bitmap) return;
    this.collisionBox = new CollisionBox([
      new Rectangle(this.rectangle.location, new Vector(this.bitmap.width, this.bitmap.height).multiply(this.scale)),
    ]);
  }

  /**
   * 只读，获取节点的矩形
   * 若要修改节点的矩形，请使用 moveTo等 方法
   */
  public get rectangle(): Rectangle {
    return this.collisionBox.shapes[0] as Rectangle;
  }

  public get geometryCenter() {
    return this.rectangle.location.clone().add(this.rectangle.size.clone().multiply(0.5));
  }

  move(delta: Vector): void {
    const newRectangle = this.rectangle.clone();
    newRectangle.location = newRectangle.location.add(delta);
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }
  moveTo(location: Vector): void {
    const newRectangle = this.rectangle.clone();
    newRectangle.location = location.clone();
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }

  /**
   * 反转图片颜色
   * 将图片的RGB值转换为互补色（255-R, 255-G, 255-B）
   * 并将反色后的图片数据保存到project.attachments中，实现持久化存储
   */
  reverseColors() {
    if (!this.bitmap) return;

    // 创建临时canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置canvas尺寸
    canvas.width = this.bitmap.width;
    canvas.height = this.bitmap.height;

    // 绘制原图
    ctx.drawImage(this.bitmap, 0, 0);

    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 反转颜色（255-R, 255-G, 255-B）
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]; // R
      data[i + 1] = 255 - data[i + 1]; // G
      data[i + 2] = 255 - data[i + 2]; // B
      // data[i + 3] 保持不变（alpha通道）
    }

    // 将修改后的图像数据绘制回canvas
    ctx.putImageData(imageData, 0, 0);

    // 创建新的ImageBitmap并保存到attachments中
    createImageBitmap(imageData).then((newBitmap) => {
      this.bitmap = newBitmap;

      // 将canvas转换为Blob并保存到project.attachments中
      canvas.toBlob((blob) => {
        if (blob) {
          // 创建新的attachmentId并替换原有数据
          const newAttachmentId = this.project.addAttachment(blob);
          // 更新当前节点的attachmentId
          this.attachmentId = newAttachmentId;
        }
      }, "image/png");
    });
  }

  /**
   * 处理拖拽缩放逻辑
   * @param delta 拖拽距离向量
   */
  resizeHandle(delta: Vector) {
    if (!this.bitmap) return;

    // 计算当前图片的实际显示尺寸
    const currentDisplayWidth = this.bitmap.width * this.scale;

    // 根据delta计算新的显示尺寸（只使用delta.x，保持等比例缩放）
    const newDisplayWidth = Math.max(currentDisplayWidth + delta.x, this.bitmap.width * 0.1);

    // 计算新的缩放比例
    const newScale = newDisplayWidth / this.bitmap.width;

    // 更新缩放比例，使用现有的scaleUpdate方法保持一致性
    const scaleDiff = newScale - this.scale;
    this.scaleUpdate(scaleDiff);
  }

  /**
   * 获取缩放控制点矩形
   * 返回右下角的一个小矩形，用于拖拽缩放
   */
  getResizeHandleRect(): Rectangle {
    const rect = this.collisionBox.getRectangle();
    // 创建一个25x25的矩形，位于图片右下角
    return new Rectangle(new Vector(rect.right - 25, rect.bottom - 25), new Vector(25, 25));
  }
}
