import { Project } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";

/**
 * 质点不再区分膨胀状态和收缩状态
 */
@passExtraAtArg1
@passObject
export class ConnectPoint extends Entity {
  // 坍缩状态半径
  static CONNECT_POINT_SHRINK_RADIUS = 15;
  // 膨胀状态半径
  static CONNECT_POINT_EXPAND_RADIUS = 15;

  get geometryCenter(): Vector {
    return this.collisionBox.getRectangle().center;
  }

  isHiddenBySectionCollapse: boolean = false;

  @serializable
  collisionBox: CollisionBox;
  @id
  @serializable
  uuid: string;

  get radius(): number {
    return this._isSelected ? ConnectPoint.CONNECT_POINT_EXPAND_RADIUS : ConnectPoint.CONNECT_POINT_SHRINK_RADIUS;
  }

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
    const oldValue = this._isSelected;
    if (oldValue === value) {
      return;
    }
    this._isSelected = value;

    const rectangle = this.collisionBox.shapes[0];
    if (!(rectangle instanceof Rectangle)) {
      return;
    }

    const centerLocation = this.geometryCenter.clone();
    if (value) {
      // 变为选中，放大
      rectangle.size = Vector.same(ConnectPoint.CONNECT_POINT_EXPAND_RADIUS * 2);
      rectangle.location = centerLocation.subtract(Vector.same(ConnectPoint.CONNECT_POINT_EXPAND_RADIUS));
    } else {
      // 变为 未选中，缩小
      rectangle.size = Vector.same(ConnectPoint.CONNECT_POINT_SHRINK_RADIUS * 2);
      rectangle.location = centerLocation.subtract(Vector.same(ConnectPoint.CONNECT_POINT_SHRINK_RADIUS));
    }
  }

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      collisionBox = new CollisionBox([
        new Rectangle(Vector.getZero(), Vector.same(ConnectPoint.CONNECT_POINT_SHRINK_RADIUS * 2)),
      ]),
      details = [],
    },
    public unknown = false,
  ) {
    super();
    this.uuid = uuid;
    this.collisionBox = collisionBox;
    this.details = details;
  }

  move(delta: Vector): void {
    const newRectangle = this.collisionBox.getRectangle();
    newRectangle.location = newRectangle.location.add(delta);
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }

  moveTo(location: Vector): void {
    const newRectangle = this.collisionBox.getRectangle();
    newRectangle.location = location;
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }
}
