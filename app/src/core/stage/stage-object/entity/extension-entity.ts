import type { Project } from "@/core/Project";
import { Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import { ConnectableEntity } from "../abstract/ConnectableEntity";
import { CollisionBox } from "../collisionBox/collisionBox";

export interface ExtensionEntityConfig {
  initialData: any;
  collisionBox: CollisionBox;
}

@passExtraAtArg1
@passObject
export class ExtensionEntity extends ConnectableEntity {
  public get geometryCenter(): Vector {
    return this.rectangle.center;
  }

  @id
  @serializable
  uuid: string;

  @serializable
  public extensionId = "";

  @serializable
  public typeName = "";

  @serializable
  public customData: any = {};

  @serializable
  public collisionBox: CollisionBox;

  public isHiddenBySectionCollapse = false;

  public _bitmapCache: ImageBitmap | null = null;
  public _isDirty = true;
  public _isRendering = false;
  public _renderFailed = false;
  /** 上次触发渲染时使用的 pixelRatio（scale × devicePixelRatio），用于检测是否需要重渲 */
  public _lastRenderedPixelRatio = 0;

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID(),
      extensionId = "",
      typeName = "",
      customData = {},
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), new Vector(100, 80))]),
    }: {
      uuid?: string;
      extensionId?: string;
      typeName?: string;
      customData?: any;
      collisionBox?: CollisionBox;
    } = {},
  ) {
    super();
    this.uuid = uuid;
    this.extensionId = extensionId;
    this.typeName = typeName;
    this.customData = customData;
    this.collisionBox = collisionBox;
  }

  public get rectangle(): Rectangle {
    return this.collisionBox.shapes[0] as Rectangle;
  }

  public get location(): Vector {
    return this.rectangle.location;
  }

  public set location(v: Vector) {
    this.rectangle.location = v;
  }

  public override move(delta: Vector): void {
    this.location = this.location.add(delta);
    this.updateFatherSectionByMove();
  }

  public override moveTo(location: Vector): void {
    this.location = location.clone();
    this.updateFatherSectionByMove();
  }

  public markDirty() {
    this._isDirty = true;
  }

  public setCustomData(data: any) {
    this.customData = data;
    this._isDirty = true;
  }
}
