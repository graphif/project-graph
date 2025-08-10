import { Project, service } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Settings } from "@/core/service/Settings";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { PenStroke } from "@/core/stage/stageObject/entity/PenStroke";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { Color } from "@graphif/color";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 处理节点相关的绘制
 */
@service("entityRenderer")
export class EntityRenderer {
  private sectionSortedZIndex: Section[] = [];

  constructor(private readonly project: Project) {}

  /**
   * 对所有section排序一次
   * 为了防止每帧都调用导致排序，为了提高性能
   * 决定：每隔几秒更新一次
   */
  sortSectionsByZIndex() {
    const sections = this.project.stageManager.getSections();
    sections.sort((a, b) => a.collisionBox.getRectangle().top - b.collisionBox.getRectangle().top);
    this.sectionSortedZIndex = sections;
  }

  private tickNumber = 0;

  renderAllSectionsBackground(viewRectangle: Rectangle) {
    if (this.sectionSortedZIndex.length != this.project.stageManager.getSections().length) {
      this.sortSectionsByZIndex();
    } else {
      // 假设fps=60，则10秒更新一次
      if (this.tickNumber % 600 === 0) {
        this.sortSectionsByZIndex();
      }
    }
    // 1 遍历所有section实体，画底部颜色
    for (const section of this.sectionSortedZIndex) {
      if (this.project.renderer.isOverView(viewRectangle, section)) {
        continue;
      }
      this.project.sectionRenderer.renderBackgroundColor(section);
    }
    // 最后更新帧
    this.tickNumber++;
  }

  /**
   * 统一渲染全部框的大标题
   */
  renderAllSectionsBigTitle(viewRectangle: Rectangle) {
    if (Settings.sectionBitTitleRenderType === "none") {
      return;
    }
    // 从最深层的最小框开始渲染
    // 目前的层级排序是假的，是直接按y轴从上往下判定
    // 认为最靠上的才是最底下的
    for (let z = this.sectionSortedZIndex.length - 1; z >= 0; z--) {
      const section = this.sectionSortedZIndex[z];
      if (this.project.renderer.isOverView(viewRectangle, section)) {
        continue;
      }
      if (Settings.sectionBitTitleRenderType === "cover") {
        this.project.sectionRenderer.renderBigCoveredTitle(section);
      } else if (Settings.sectionBitTitleRenderType === "top") {
        this.project.sectionRenderer.renderTopTitle(section);
      }
    }
  }

  /**
   * 统一渲染所有实体
   * 返回实际渲染的实体数量
   */
  renderAllEntities(viewRectangle: Rectangle) {
    let renderedNodes = 0;

    // 2 遍历所有非section实体 / 非涂鸦实体
    for (const entity of this.project.stageManager.getEntities()) {
      if (entity instanceof Section) {
        continue;
      }
      if (entity instanceof PenStroke) {
        continue;
      }
      // 视线之外不画
      if (this.project.renderer.isOverView(viewRectangle, entity)) {
        continue;
      }
      this.renderEntity(entity);
      renderedNodes++;
    }
    // 3 遍历所有section实体，画顶部大文字
    for (const section of this.project.stageManager.getSections()) {
      if (this.project.renderer.isOverView(viewRectangle, section)) {
        continue;
      }
      this.project.sectionRenderer.render(section);
    }
    // 4 遍历所有涂鸦实体
    for (const penStroke of this.project.stageManager.getPenStrokes()) {
      if (this.project.renderer.isOverView(viewRectangle, penStroke)) {
        continue;
      }
      this.renderEntity(penStroke);
    }
    return renderedNodes;
  }

  /**
   * 父渲染函数
   * @param entity
   */
  renderEntity(entity: Entity) {
    // section 折叠不画
    if (entity.isHiddenBySectionCollapse) {
      return;
    }
    if (entity instanceof Section) {
      this.project.sectionRenderer.render(entity);
    } else if (entity instanceof TextNode) {
      this.project.textNodeRenderer.renderTextNode(entity);
    } else if (entity instanceof ConnectPoint) {
      this.renderConnectPoint(entity);
    } else if (entity instanceof ImageNode) {
      this.renderImageNode(entity);
    } else if (entity instanceof UrlNode) {
      this.project.urlNodeRenderer.render(entity);
    } else if (entity instanceof PenStroke) {
      this.renderPenStroke(entity);
    } else if (entity instanceof SvgNode) {
      this.project.svgNodeRenderer.render(entity);
    }
    // details右上角小按钮
    if (this.project.camera.currentScale > Settings.ignoreTextNodeTextRenderLessThanCameraScale) {
      this.project.entityDetailsButtonRenderer.render(entity);
    }
  }

  /**
   * 渲染实体下方的注释（详细信息）
   * @param entity
   */
  renderEntityDetails(entity: Entity) {
    if (entity.details && !entity.isEditingDetails) {
      if (Settings.alwaysShowDetails) {
        this._renderEntityDetails(entity, Renderer.ENTITY_DETAILS_LIENS_LIMIT);
      } else {
        if (entity.isMouseHover) {
          this._renderEntityDetails(entity, Renderer.ENTITY_DETAILS_LIENS_LIMIT);
        }
      }
    }
  }
  private _renderEntityDetails(entity: Entity, limitLiens: number) {
    this.project.textRenderer.renderMultiLineText(
      entity.details,
      this.project.renderer.transformWorld2View(
        entity.collisionBox.getRectangle().location.add(new Vector(0, entity.collisionBox.getRectangle().size.y)),
      ),
      Renderer.FONT_SIZE_DETAILS * this.project.camera.currentScale,
      Math.max(
        Renderer.ENTITY_DETAILS_WIDTH * this.project.camera.currentScale,
        entity.collisionBox.getRectangle().size.x * this.project.camera.currentScale,
      ),
      this.project.stageStyleManager.currentStyle.NodeDetailsText,
      1.2,
      limitLiens,
    );
  }

  private renderConnectPoint(connectPoint: ConnectPoint) {
    if (connectPoint.isSelected) {
      // 在外面增加一个框
      this.project.collisionBoxRenderer.render(
        connectPoint.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
    }
    this.project.shapeRenderer.renderCircle(
      this.project.renderer.transformWorld2View(connectPoint.geometryCenter),
      connectPoint.radius * this.project.camera.currentScale,
      Color.Transparent,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      2 * this.project.camera.currentScale,
    );
    this.renderEntityDetails(connectPoint);
  }

  private renderImageNode(imageNode: ImageNode) {
    if (imageNode.isSelected) {
      // 在外面增加一个框
      this.project.collisionBoxRenderer.render(
        imageNode.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
    }
    // 节点身体矩形
    // 2群群友反馈这个图片不加边框应该更好看。因为有透明logo图案，边框贴紧会很难看。

    // this.project.shapeRenderer.renderRect(
    //   new Rectangle(
    //     Renderer.transformWorld2View(imageNode.rectangle.location),
    //     imageNode.rectangle.size.multiply(this.project.camera.currentScale),
    //   ),
    //   Color.Transparent,
    //   this.project.stageStyleManager.currentStyle.StageObjectBorder,
    //   2 * this.project.camera.currentScale,
    // );
    if (imageNode.state === "loading") {
      this.project.textRenderer.renderTextFromCenter(
        "loading...",
        this.project.renderer.transformWorld2View(imageNode.rectangle.center),
        20 * this.project.camera.currentScale,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
      );
    } else if (imageNode.state === "success") {
      this.project.imageRenderer.renderImageElement(
        imageNode.bitmap!,
        this.project.renderer.transformWorld2View(imageNode.rectangle.location),
        imageNode.scale,
      );
    } else if (imageNode.state === "notFound") {
      this.project.textRenderer.renderTextFromCenter(
        `not found ${imageNode.attachmentId}`,
        this.project.renderer.transformWorld2View(imageNode.rectangle.center),
        20 * this.project.camera.currentScale,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
      );
    }
    this.renderEntityDetails(imageNode);
  }

  /**
   * 渲染涂鸦笔画
   * TODO: 绘制时的碰撞箱应该有一个合适的宽度
   * @param penStroke
   */
  private renderPenStroke(penStroke: PenStroke) {
    let penStrokeColor = penStroke.getColor();
    if (penStrokeColor.a === 0) {
      penStrokeColor = this.project.stageStyleManager.currentStyle.StageObjectBorder.clone();
    }
    // const path = penStroke.getPath();
    // if (path.length <= 3) {
    //   CurveRenderer.renderSolidLineMultipleWithWidth(
    //     penStroke.getPath().map((v) => Renderer.transformWorld2View(v)),
    //     penStrokeColor,
    //     penStroke.getSegmentList().map((seg) => seg.width * this.project.camera.currentScale),
    //   );
    // } else {
    //   CurveRenderer.renderSolidLineMultipleSmoothly(
    //     penStroke.getPath().map((v) => Renderer.transformWorld2View(v)),
    //     penStrokeColor,
    //     penStroke.getSegmentList()[0].width * this.project.camera.currentScale,
    //   );
    // }
    const segmentList = penStroke.getSegmentList();

    this.project.curveRenderer.renderPenStroke(
      segmentList.map((segment) => ({
        startLocation: this.project.renderer.transformWorld2View(segment.startLocation),
        endLocation: this.project.renderer.transformWorld2View(segment.endLocation),
        width: segment.width * this.project.camera.currentScale,
      })),
      penStrokeColor,
    );
    if (penStroke.isMouseHover) {
      this.project.collisionBoxRenderer.render(
        penStroke.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxPreSelected,
      );
    }
    if (penStroke.isSelected) {
      this.project.collisionBoxRenderer.render(
        penStroke.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected.with({ a: 0.5 }),
      );
    }
  }
}
