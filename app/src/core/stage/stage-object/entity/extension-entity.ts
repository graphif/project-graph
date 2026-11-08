import type { Project } from "@/core/project";
import { Vector } from "@graphif/data-structures";
import { serializableType } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import { ConnectableEntity } from "../abstract/connectable-entity";
import { CollisionBox } from "../collision-box/collision-box";
import type { Value } from "platejs";

export interface ExtensionEntityConfig {
  initialData: any;
  collisionBox: CollisionBox;
}

@serializableType("ExtensionEntity", {
  fields: ["details", "uuid", "extensionId", "typeName", "customData", "collisionBox"],
  rawFields: ["customData"],
  id: "uuid",
  construct: "object",
  extra: "first",
})
export class ExtensionEntity extends ConnectableEntity {
  public get geometryCenter(): Vector {
    return this.rectangle.center;
  }

  uuid: string;

  public extensionId = "";

  public typeName = "";

  public customData: any = {};

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
      details = [],
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), new Vector(100, 80))]),
    }: {
      uuid?: string;
      extensionId?: string;
      typeName?: string;
      customData?: any;
      details?: Value;
      collisionBox?: CollisionBox;
    } = {},
  ) {
    super();
    this.uuid = uuid;
    this.extensionId = extensionId;
    this.typeName = typeName;
    this.customData = customData;
    this.details = details;
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
