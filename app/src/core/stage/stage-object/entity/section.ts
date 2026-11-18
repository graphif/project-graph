import { Project } from "@/core/project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Settings } from "@/core/service/settings";
import { ConnectableEntity } from "@/core/stage/stage-object/abstract/connectable-entity";
import { Entity } from "@/core/stage/stage-object/abstract/stage-entity";
import { CollisionBox } from "@/core/stage/stage-object/collision-box/collision-box";
import { MultiTargetUndirectedEdge } from "@/core/stage/stage-object/association/muti-target-undirected-edge";
import { getTextSize } from "@/utils/font";
import { Color, Vector } from "@graphif/data-structures";
import { serializableType } from "@graphif/serializer";
import { Line, Rectangle, Shape } from "@graphif/shapes";
import { Value } from "platejs";

@serializableType("Section", {
  fields: [
    "details",
    "uuid",
    "_collisionBoxNormal",
    "collisionBox",
    "color",
    "text",
    "children",
    "isCollapsed",
    "locked",
    "borderStyle",
  ],
  id: "uuid",
  create: (data, project) => {
    const section = new Section(project, data, false, { deferGeometry: true });
    section.initializeCollapsedGeometry();
    return section;
  },
})
export class Section extends ConnectableEntity {
  /**
   * 节点是否被选中
   */
  _isSelected: boolean = false;
  public uuid: string;
  _isEditingTitle: boolean = false;
  private _collisionBoxWhenCollapsed: CollisionBox;
  private _collisionBoxNormal: CollisionBox;

  public get isEditingTitle() {
    return this._isEditingTitle;
  }
  public set isEditingTitle(value: boolean) {
    this._isEditingTitle = value;
    this.project.sectionRenderer.render(this);
  }

  /**
   * 小于多少的情况下，开始渲染大标题
   */
  static bigTitleCameraScale = 0.2;

  public get collisionBox(): CollisionBox {
    if (this.isCollapsed) {
      return this._collisionBoxWhenCollapsed;
    } else if (this.locked) {
      // 锁定状态下使用整个矩形作为碰撞箱
      return new CollisionBox([this.rectangle]);
    } else {
      return this._collisionBoxNormal;
    }
  }

  public get expandedRectangle(): Rectangle {
    return this._collisionBoxNormal.getRectangle();
  }

  initializeCollapsedGeometry(): void {
    this._collisionBoxWhenCollapsed = this.collapsedCollisionBox();
  }

  /** 获取折叠状态下的碰撞箱 */
  private collapsedCollisionBox(): CollisionBox {
    const centerLocation = this._collisionBoxNormal.getRectangle().center;
    const collapsedRectangleSize = getTextSize(this.text, Renderer.FONT_SIZE).add(
      Vector.same(Renderer.NODE_PADDING).multiply(2),
    );
    const collapsedRectangle = new Rectangle(
      centerLocation.clone().subtract(collapsedRectangleSize.multiply(0.5)),
      collapsedRectangleSize,
    );
    return new CollisionBox([collapsedRectangle]);
  }

  color: Color = Color.Transparent;
  text: string;
  children: Entity[];

  /** 是否是折叠状态 */
  isCollapsed: boolean;
  /**
   * 是否锁定 Section 内部物体
   * 当 locked 为 true 时，Section 内部的所有物体都不能移动或删除
   */
  locked: boolean = false;
  /**
   * 边框样式：实线、虚线、无边框
   */
  borderStyle: "solid" | "dashed" | "none" = "solid";
  isHiddenBySectionCollapse = false;

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      text = "",
      collisionBox = new CollisionBox([new Rectangle(new Vector(0, 0), new Vector(0, 0))]),
      _collisionBoxNormal: collisionBoxNormal = undefined as CollisionBox | undefined,
      color = Color.Transparent,
      locked = false,
      isCollapsed = false,
      children = [] as Entity[],
      details = [] as Value,
      borderStyle = "solid" as "solid" | "dashed" | "none",
    } = {},
    public unknown = false,
    { deferGeometry = false }: { deferGeometry?: boolean } = {},
  ) {
    super();
    this.uuid = uuid;

    if (collisionBoxNormal) {
      // 从序列化数据恢复：直接使用保存的 _collisionBoxNormal（含正确位置）
      this._collisionBoxNormal = collisionBoxNormal;
    } else {
      // 新建：从 collisionBox 参数构建 _collisionBoxNormal
      const rect = collisionBox.getRectangle();
      const shapes: Shape[] = rect.getBoundingLines();
      this._collisionBoxNormal = new CollisionBox(shapes);
    }
    this._collisionBoxWhenCollapsed = collisionBox;

    this.color = color;
    this.text = text;
    this.locked = locked;
    this.isCollapsed = isCollapsed;
    this.details = details;
    this.children = children;
    this.borderStyle = borderStyle;
    // 一定要放在最后
    if (!deferGeometry) this.adjustLocationAndSize();
  }

  /**
   * 根据多个实体创建Section
   * @param entities
   */
  static fromEntities(project: Project, entities: Entity[]): Section {
    const section = new Section(project, {
      text: "section",
      children: entities,
      borderStyle: Settings.sectionInitBorderStyle,
    });

    return section;
  }

  rename(newName: string) {
    this.text = newName;
    this.adjustLocationAndSize();
  }

  /**
   * 根据子内容 自动调整分组框的位置和大小
   * 如果没有子内容，则
   *   自动调整大小为 标题+padding，位置为 当前碰撞箱外接矩形的左上角
   */
  adjustLocationAndSize() {
    let rectangle: Rectangle;
    const titleSize = getTextSize(this.text, Renderer.FONT_SIZE);

    const titleBarHeight = this.text === "" ? 0 : 50;

    if (this.children.length === 0) {
      rectangle = new Rectangle(
        this.collisionBox.getRectangle().location,
        new Vector(Math.max(titleSize.x + Renderer.NODE_PADDING * 2, 100), 100),
      );
    } else {
      const bounds = this.children.map((child) => child.collisionBox.getRectangle());
      const descendants = new Set<Entity>();
      const collect = (entity: Entity) => {
        if (descendants.has(entity)) return;
        descendants.add(entity);
        if (entity instanceof Section && !entity.isCollapsed) entity.children.forEach(collect);
      };
      this.children.forEach(collect);
      // 只包含端点全部在框内的包围线；跨分组连线不能反过来撑大两边的框。
      for (const edge of this.project.stageManager.getAssociations()) {
        if (
          edge instanceof MultiTargetUndirectedEdge &&
          edge.renderType !== "line" &&
          edge.associationList.length >= 2 &&
          edge.associationList.every((node) => descendants.has(node))
        ) {
          bounds.push(edge.collisionBox.getRectangle());
        }
      }
      // 调整展开状态
      rectangle = Rectangle.getBoundingRectangle(bounds, 30);
      rectangle.size.x = Math.max(rectangle.size.x, titleSize.x + Renderer.NODE_PADDING * 2);
      // 留白范围在上面调整
      rectangle.location = rectangle.location.subtract(new Vector(0, titleBarHeight));
      rectangle.size = rectangle.size.add(new Vector(0, titleBarHeight));
    }

    this._collisionBoxNormal.shapes = rectangle.getBoundingLines();
    // 群友需求：希望分组框扩大交互范围，标题也能拖动
    if (titleBarHeight > 0) {
      const newRect = new Rectangle(rectangle.location.clone(), new Vector(rectangle.size.x, titleBarHeight));
      this._collisionBoxNormal.shapes.push(newRect);
    }
    // 调整折叠状态
    this._collisionBoxWhenCollapsed = this.collapsedCollisionBox();
  }
  /**
   * 根据自身的折叠状态调整子节点的状态
   * 以屏蔽触碰和显示
   */
  adjustChildrenStateByCollapse(parentCollapsed = false) {
    const shouldHide = parentCollapsed || this.isCollapsed;
    if (shouldHide) {
      this.children.forEach((child) => {
        child.isHiddenBySectionCollapse = true;
        if (child instanceof Section) {
          child.adjustChildrenStateByCollapse(true);
        }
      });
    } else {
      this.children.forEach((child) => {
        if (child instanceof Section) {
          child.adjustChildrenStateByCollapse(false);
        }
      });
    }
  }

  /**
   * 获取节点的选中状态
   */
  public get isSelected() {
    return this._isSelected;
  }
  public set isSelected(value: boolean) {
    this._isSelected = value;
  }

  /**
   * 只读，获取节点的矩形
   * 若要修改节点的矩形，请使用 moveTo等 方法
   */
  public get rectangle(): Rectangle {
    if (this.isCollapsed) {
      return this._collisionBoxWhenCollapsed.getRectangle();
    } else {
      const topLine: Line = this._collisionBoxNormal.shapes[0] as Line;
      const rightLine: Line = this._collisionBoxNormal.shapes[1] as Line;
      const bottomLine: Line = this._collisionBoxNormal.shapes[2] as Line;
      const leftLine: Line = this._collisionBoxNormal.shapes[3] as Line;
      return new Rectangle(
        new Vector(leftLine.start.x, topLine.start.y),
        new Vector(rightLine.end.x - leftLine.start.x, bottomLine.end.y - topLine.start.y),
      );
    }
  }

  public get geometryCenter() {
    return this.rectangle.location.clone().add(this.rectangle.size.clone().multiply(0.5));
  }

  move(delta: Vector): void {
    const outermostMove = this.project.sectionMoveDepth === 0;
    this.project.sectionMoveDepth++;
    try {
      // 让自己移动
      for (const shape of this.collisionBox.shapes) {
        if (shape instanceof Line) {
          shape.start = shape.start.add(delta);
          shape.end = shape.end.add(delta);
        } else if (shape instanceof Rectangle) {
          shape.location = shape.location.add(delta);
        }
      }
      // 让内部元素也移动
      for (const child of this.children) {
        // 跳过已被选中的子元素，避免重复移动（解决速度叠加bug）
        if (child.isSelected) {
          continue;
        }
        child.move(delta);
      }
    } finally {
      this.project.sectionMoveDepth--;
    }

    // 移动雪花特效
    if (!this.isHiddenBySectionCollapse) {
      this.project.effects.addMoveShadow(this.rectangle, delta);
    }
    if (outermostMove) {
      this.updateFatherSectionByMove();
      // 移动其他实体，递归碰撞
      this.updateOtherEntityLocationByMove();
    }
  }
  protected override collideWithOtherEntity(other: Entity): void {
    if (!Settings.isEnableEntityCollision) {
      return;
    }
    if (other instanceof Section) {
      if (this.project.sectionMethods.isEntityInSection(this, other)) {
        return;
      }
    }
    if (this.project.sectionMethods.isEntityInSection(other, this)) {
      return;
    }
    super.collideWithOtherEntity(other);
  }

  /**
   * 将某个物体 的最小外接矩形的左上角位置 移动到某个位置
   * @param location
   */
  moveTo(location: Vector): void {
    const currentLeftTop = this.rectangle.location;
    const delta = location.clone().subtract(currentLeftTop);
    this.move(delta);
    this.updateFatherSectionByMove();
  }
}
