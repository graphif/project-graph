import { Project } from "@/core/Project";
import { Entity } from "@/core/sprites/abstract/Entity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Color, Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Line } from "@graphif/shapes";

/**
 * 一笔画中的某一个小段
 * 起始点，结束点，宽度
 */
export class PenStrokeSegment {
  @serializable
  location: Vector;
  @serializable
  pressure: number;
  constructor(location: Vector, pressure: number) {
    this.location = location;
    this.pressure = pressure;
  }
}

@passExtraAtArg1
@passObject
export class PenStroke extends Entity {
  /** 涂鸦不参与吸附对齐 */
  public isAlignExcluded: boolean = true;

  public isHiddenBySectionCollapse: boolean = false;
  // @serializable
  collisionBox: CollisionBox = new CollisionBox([]);

  @id
  @serializable
  public uuid: string;

  move(delta: Vector): void {
    // 移动每一个段
    for (const segment of this.segments) {
      segment.location = segment.location.add(delta);
    }
    this.updateCollisionBoxBySegmentList();
  }
  moveTo(location: Vector): void {
    for (const segment of this.segments) {
      const delta = location.subtract(segment.location);
      segment.location = segment.location.add(delta);
    }
    this.updateCollisionBoxBySegmentList();
  }

  private updateCollisionBoxBySegmentList() {
    this.collisionBox.shapes = [];
    for (let i = 1; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const previousSegment = this.segments[i - 1];
      this.collisionBox.shapes.push(new Line(previousSegment.location, segment.location));
    }
  }

  @serializable
  public segments: PenStrokeSegment[] = [];
  @serializable
  public color: Color = Color.Transparent;

  public getPath(): Vector[] {
    return this.segments.map((it) => it.location);
  }

  constructor(
    protected readonly project: Project,
    { uuid = crypto.randomUUID() as string, segments = [] as PenStrokeSegment[], color = Color.White },
  ) {
    super();
    this.uuid = uuid;
    this.segments = segments;
    this.color = color;
    this.updateCollisionBoxBySegmentList();
  }

  getCollisionBoxFromSegmentList(segmentList: PenStrokeSegment[]): CollisionBox {
    const result = new CollisionBox([]);
    for (let i = 1; i < segmentList.length; i++) {
      const segment = segmentList[i];
      const previousSegment = segmentList[i - 1];
      result.shapes.push(new Line(previousSegment.location, segment.location));
    }
    return result;
  }
}
