import { Project } from "@/core/Project";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { GenerateScreenshot } from "@/core/service/dataGenerateService/generateScreenshot";
import { onOpenFile } from "@/core/service/GlobalMenu";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { ResizeAble } from "@/core/stage/stageObject/abstract/StageObjectInterface";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { PathString } from "@/utils/pathString";
import { Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import { Section } from "./Section";
import { RectangleLittleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleLittleNoteEffect";

/**
 * 引用块节点
 * 用于跨文件引用其他prg文件中的Section内容
 * 以静态图片的方式渲染在舞台上
 */
@passExtraAtArg1
@passObject
export class ReferenceBlockNode extends ConnectableEntity implements ResizeAble {
  isHiddenBySectionCollapse: boolean = false;
  @id
  @serializable
  public uuid: string;
  @serializable
  public collisionBox: CollisionBox;

  /**
   * 引用的文件名，不包括文件扩展名
   */
  @serializable
  public fileName: string;

  /**
   * 引用的Section框名，为空表示引用整个文件
   */
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
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), new Vector(400, 200))]),
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
      let screenshotBlob;

      // 根据sectionName是否为空来决定调用哪个方法
      if (this.sectionName) {
        // 引用特定的Section
        screenshotBlob = await GenerateScreenshot.generateSection(this.fileName, this.sectionName);
      } else {
        // 引用整个文件
        screenshotBlob = await GenerateScreenshot.generateFullView(this.fileName);
      }

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

  /**
   * 用户点击这个引用块，跳转到对应的跨文件的 地方
   */
  async goToSource() {
    if (this.state !== "success") {
      return;
    }
    const recentFiles = await RecentFileManager.getRecentFiles();
    const file = recentFiles.find(
      (file) =>
        PathString.getFileNameFromPath(file.uri.path) === this.fileName ||
        PathString.getFileNameFromPath(file.uri.fsPath) === this.fileName,
    );
    if (!file) {
      return;
    }
    // 跳转到源头：对应的源头Section
    const project = await onOpenFile(file.uri, "ReferenceBlockNode跳转打开-prg文件");
    if (!project) {
      return;
    }
    const targetSection = project.stage
      .filter((obj) => obj instanceof Section)
      .find((section) => section.text === this.sectionName);
    if (!targetSection) {
      return;
    }
    const center = targetSection.collisionBox.getRectangle().center;
    project.camera.location = center;
    project.effects.addEffect(RectangleLittleNoteEffect.fromUtilsSlowNote(targetSection));
  }

  /**
   * 处理拖拽缩放逻辑
   * @param delta 拖拽距离向量
   */
  resizeHandle(delta: Vector) {
    if (!this.bitmap) return;

    // 计算当前显示尺寸
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
    // 创建一个25x25的矩形，位于右下角
    return new Rectangle(new Vector(rect.right - 25, rect.bottom - 25), new Vector(25, 25));
  }
}
