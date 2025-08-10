import { Color } from "@graphif/color";
import { Vector } from "@graphif/data-structures";
import { Line } from "@graphif/shapes";
import { Serialized } from "@/types/node";
import { Project } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";

/**
 * 一笔画中的某一个小段
 * 起始点，结束点，宽度
 */
export class PenStrokeSegment {
  constructor(
    public startLocation: Vector,
    public endLocation: Vector,
    public width: number,
  ) {}
}

export class PenStroke extends Entity {
  /** 涂鸦不参与吸附对齐 */
  public isAlignExcluded: boolean = true;

  public isHiddenBySectionCollapse: boolean = false;
  collisionBox: CollisionBox = new CollisionBox([]);
  public uuid: string;

  move(delta: Vector): void {
    for (const segment of this.segmentList) {
      segment.startLocation = segment.startLocation.add(delta);
      segment.endLocation = segment.endLocation.add(delta);
    }
    this.updateCollisionBoxBySegmentList();
  }
  moveTo(location: Vector): void {
    for (const segment of this.segmentList) {
      segment.startLocation = location.clone();
      segment.endLocation = location.clone();
    }
    this.updateCollisionBoxBySegmentList();
  }

  private updateCollisionBoxBySegmentList() {
    this.collisionBox.shapes = [];
    for (const segment of this.segmentList) {
      this.collisionBox.shapes.push(new Line(segment.startLocation, segment.endLocation));
    }
  }

  private segmentList: PenStrokeSegment[] = [];
  private color: Color = Color.Transparent;
  public getColor(): Color {
    return this.color;
  }
  public setColor(color: Color): void {
    this.color = color;
  }

  public getPath(): Vector[] {
    const result: Vector[] = [];
    for (const segment of this.segmentList) {
      result.push(segment.startLocation);
    }
    if (this.segmentList.length >= 1) {
      result.push(this.segmentList[this.segmentList.length - 1].endLocation);
    }
    return result;
  }
  public getSegmentList(): PenStrokeSegment[] {
    return this.segmentList;
  }

  /**
   *
   * @param path str格式："x1,y1,w1 x2,y2,w2 x3,y3,w3..."
   */
  constructor(
    protected readonly project: Project,
    { uuid, content, color }: Serialized.PenStroke,
  ) {
    super();
    // 开始解析字符串
    this.checkType(content);
    this.setColor(new Color(...color));

    // 生成一个随机的uuid
    this.uuid = uuid;
    // 解析每一段
    const segmentList = this.stringToSegmentList(content);
    this.segmentList = segmentList;
    this.updateCollisionBoxBySegmentList();
  }

  stringToSegmentList(origin: string): PenStrokeSegment[] {
    const segments = origin.split("~");
    const result: PenStrokeSegment[] = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const currentPointString = segments[i];
      const nextPointString = segments[i + 1];
      const currentPointStrList = currentPointString.split(",");
      const nextPointStrList = nextPointString.split(",");
      if (currentPointStrList.length < 3 || nextPointStrList.length < 3) {
        throw new Error("字符串格式不正确");
      }
      const currentPoint = new Vector(parseFloat(currentPointStrList[0]), parseFloat(currentPointStrList[1]));
      const nextPoint = new Vector(parseFloat(nextPointStrList[0]), parseFloat(nextPointStrList[1]));
      const width = parseFloat(currentPointStrList[2]);
      result.push(new PenStrokeSegment(currentPoint, nextPoint, width));
    }
    return result;
  }

  dumpString(): string {
    const resultList: string[] = [];
    for (const segment of this.segmentList) {
      resultList.push(`${segment.startLocation.x},${segment.startLocation.y},${segment.width}`);
    }
    // 还要把最后一段的结尾加进来
    const tailSegment = this.segmentList[this.segmentList.length - 1];
    resultList.push(`${tailSegment.startLocation.x},${tailSegment.startLocation.y},${tailSegment.width}`);
    return resultList.join("~");
  }

  getCollisionBoxFromSegmentList(segmentList: PenStrokeSegment[]): CollisionBox {
    const result = new CollisionBox([]);
    for (const segment of segmentList) {
      result.shapes.push(new Line(segment.startLocation, segment.endLocation));
    }
    return result;
  }

  /**
   * 检查格式是否合适
   * @param origin
   */
  checkType(origin: string) {
    if (!origin.includes("~")) {
      throw new Error("字符串格式不正确，没有分隔号");
    }
    const segments = origin.split("~");
    for (let i = 0; i < segments.length - 1; i++) {
      const currentPointString = segments[i];
      const nextPointString = segments[i + 1];
      const currentPointStrList = currentPointString.split(",");
      const nextPointStrList = nextPointString.split(",");
      if (currentPointStrList.length < 3 || nextPointStrList.length < 3) {
        throw new Error("字符串格式不正确");
      }
      const currentPoint = new Vector(parseFloat(currentPointStrList[0]), parseFloat(currentPointStrList[1]));
      const nextPoint = new Vector(parseFloat(nextPointStrList[0]), parseFloat(nextPointStrList[1]));
      if (isNaN(currentPoint.x) || isNaN(currentPoint.y) || isNaN(nextPoint.x) || isNaN(nextPoint.y)) {
        throw new Error("坐标格式不正确");
      }
      const width = parseFloat(currentPointStrList[2]);
      if (width <= 0) {
        throw new Error("宽度必须大于0");
      }
    }
  }
}
