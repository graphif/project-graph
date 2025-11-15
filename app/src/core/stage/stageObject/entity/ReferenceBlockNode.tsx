import { Project } from "@/core/Project";
import { GenerateSectionScreenshot } from "@/core/service/dataGenerateService/generateSectionScreenshot";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";

/**
 * 引用块节点
 * 用于跨文件引用其他prg文件中的Section内容
 * 以静态图片的方式渲染在舞台上
 */
@passExtraAtArg1
@passObject
export class ReferenceBlockNode extends ConnectableEntity {
  isHiddenBySectionCollapse: boolean = false;
  @id
  @serializable
  public uuid: string;
  @serializable
  public collisionBox: CollisionBox;
  @serializable
  public fileName: string;
  @serializable
  public sectionName: string;
  @serializable
  scale: number;
  @serializable
  attachmentId: string;

  /**
   * 节点是否被选中
   */
  _isSelected: boolean = false;

  bitmap: ImageBitmap | undefined;
  state: "loading" | "success" | "notFound" = "loading";

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), new Vector(100, 100))]),
      fileName = "",
      sectionName = "",
      scale = 1,
      attachmentId = "",
      details = [],
    },
    public unknown = false,
  ) {
    super();
    this.uuid = uuid;
    this.collisionBox = collisionBox;
    this.fileName = fileName;
    this.sectionName = sectionName;
    this.scale = scale;
    this.attachmentId = attachmentId;
    this.details = details;

    // 如果已经有attachmentId，直接加载图片
    if (attachmentId) {
      this.loadImageFromAttachment();
    } else {
      // 否则生成截图
      this.generateScreenshot();
    }
  }

  public get isSelected() {
    return this._isSelected;
  }

  public set isSelected(value: boolean) {
    this._isSelected = value;
  }

  private loadImageFromAttachment() {
    const blob = this.project.attachments.get(this.attachmentId);
    if (!blob) {
      this.state = "notFound";
      return;
    }
    createImageBitmap(blob).then((bitmap) => {
      this.bitmap = bitmap;
      this.state = "success";
      this.updateCollisionBox();
    });
  }

  private async generateScreenshot() {
    try {
      this.state = "loading";
      // 调用API获取截图
      // const screenshotBlob = await this.project.generateSectionScreenshot(this.fileName, this.sectionName);
      const screenshotBlob = await GenerateSectionScreenshot.generate(this.fileName, this.sectionName);
      if (screenshotBlob) {
        // 保存到附件
        const newAttachmentId = this.project.addAttachment(screenshotBlob);
        this.attachmentId = newAttachmentId;
        // 加载图片
        this.loadImageFromAttachment();
      } else {
        this.state = "notFound";
      }
    } catch (error) {
      console.error("Failed to generate screenshot:", error);
      this.state = "notFound";
    }
  }

  private updateCollisionBox() {
    if (!this.bitmap) return;
    this.collisionBox = new CollisionBox([
      new Rectangle(this.rectangle.location, new Vector(this.bitmap.width, this.bitmap.height).multiply(this.scale)),
    ]);
  }

  public scaleUpdate(scaleDiff: number) {
    this.scale += scaleDiff;
    if (this.scale < 0.1) {
      this.scale = 0.1;
    }
    if (this.scale > 10) {
      this.scale = 10;
    }
    this.updateCollisionBox();
  }

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
   * 更新引用的内容
   */
  async refresh() {
    await this.generateScreenshot();
  }
}
