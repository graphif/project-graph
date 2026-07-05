import { Color, Vector } from "@graphif/data-structures";
import { Line, Rectangle } from "@graphif/shapes";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { getMultiLineTextSize } from "@/utils/font";
import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Settings } from "@/core/service/Settings";

/**
 * 三点定圆的辅助结果
 */
interface ArcGeometry {
  center: Vector;
  radius: number;
  startAngle: number;
  endAngle: number;
  counterclockwise: boolean;
}

/**
 * 圆弧上的线段近似采样点
 */
function sampleArcPoints(
  center: Vector,
  radius: number,
  startAngle: number,
  endAngle: number,
  _counterclockwise: boolean,
  segments: number = 20,
): Vector[] {
  const points: Vector[] = [];
  // totalAngle 为负值时表示逆时针方向（角度递减），为正值时表示顺时针（角度递增）
  const totalAngle = endAngle - startAngle;
  const step = totalAngle / segments;
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + step * i;
    points.push(new Vector(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle)));
  }
  return points;
}

/**
 * 计算经过三点的圆心
 */
function computeCircleCenter(a: Vector, b: Vector, c: Vector): Vector {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  const ux =
    ((a.x * a.x + a.y * a.y) * (b.y - c.y) +
      (b.x * b.x + b.y * b.y) * (c.y - a.y) +
      (c.x * c.x + c.y * c.y) * (a.y - b.y)) /
    d;
  const uy =
    ((a.x * a.x + a.y * a.y) * (c.x - b.x) +
      (b.x * b.x + b.y * b.y) * (a.x - c.x) +
      (c.x * c.x + c.y * c.y) * (b.x - a.x)) /
    d;
  return new Vector(ux, uy);
}

/**
 * 计算圆心到点 p 的角度（y-down canvas 坐标系）
 */
function angleFromCenter(center: Vector, p: Vector): number {
  return Math.atan2(p.y - center.y, p.x - center.x);
}

/**
 * 将角度标准化到 [0, 2π)
 */
function normalizeAngle(θ: number): number {
  const r = θ % (2 * Math.PI);
  return r < 0 ? r + 2 * Math.PI : r;
}

/**
 * 计算经过三点 A、C、B 的圆弧参数。
 * 返回的 startAngle 对应 A 点，endAngle 对应 B 点。
 * counterclockwise 控制 canvas arc() 的方向。
 */
function arcThroughThreePoints(a: Vector, b: Vector, c: Vector): ArcGeometry {
  const center = computeCircleCenter(a, b, c);
  const radius = center.distance(a);

  const thetaA = angleFromCenter(center, a);
  const thetaB = angleFromCenter(center, b);
  const thetaC = angleFromCenter(center, c);

  const aN = normalizeAngle(thetaA);
  const bN = normalizeAngle(thetaB);
  const cN = normalizeAngle(thetaC);

  // 判断 C 是否在从 A 到 B 的顺时针弧上
  // 顺时针 (counterclockwise=false)：角度单调递增，可能跨越 2π
  const cwStart = aN;
  let cwEnd = bN;
  if (cwStart > cwEnd) cwEnd += 2 * Math.PI;
  const cCW = cN < cwStart ? cN + 2 * Math.PI : cN;
  const isClockwise = cCW >= cwStart && cCW <= cwEnd;

  if (isClockwise) {
    // canvas 默认方向是顺时针（y-down 下角度递增）
    return {
      center,
      radius,
      startAngle: thetaA,
      endAngle: thetaB + (aN > bN ? 2 * Math.PI : 0),
      counterclockwise: false,
    };
  } else {
    // 逆时针
    return {
      center,
      radius,
      startAngle: thetaA,
      endAngle: thetaB - (aN < bN ? 2 * Math.PI : 0),
      counterclockwise: true,
    };
  }
}

/**
 * 计算圆与矩形 4 条边的交点（线段求交）
 * 返回所有落在矩形边上的交点
 */
function circleRectangleIntersections(center: Vector, radius: number, rect: Rectangle): Vector[] {
  const intersections: Vector[] = [];
  // 矩形四条边
  const edges: [Vector, Vector][] = [
    [rect.location, rect.location.add(new Vector(rect.size.x, 0))], // 上边
    [rect.location.add(new Vector(0, rect.size.y)), rect.location.add(rect.size)], // 下边
    [rect.location, rect.location.add(new Vector(0, rect.size.y))], // 左边
    [rect.location.add(new Vector(rect.size.x, 0)), rect.location.add(rect.size)], // 右边
  ];
  for (const [p1, p2] of edges) {
    const d = p2.subtract(p1);
    const f = p1.subtract(center);
    const a = d.dot(d);
    const b = 2 * f.dot(d);
    const c = f.dot(f) - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) continue;
    const sqrtD = Math.sqrt(discriminant);
    for (const t of [(-b - sqrtD) / (2 * a), (-b + sqrtD) / (2 * a)]) {
      if (t >= 0 && t <= 1) {
        intersections.push(p1.add(d.multiply(t)));
      }
    }
  }
  return intersections;
}

/**
 * 判断点是否在圆弧上（角度范围检查）
 */
function isPointOnArc(
  point: Vector,
  center: Vector,
  startAngle: number,
  endAngle: number,
  counterclockwise: boolean,
): boolean {
  const θ = normalizeAngle(angleFromCenter(center, point));
  const s = normalizeAngle(startAngle);
  const e = normalizeAngle(endAngle);

  if (!counterclockwise) {
    // 顺时针：角度从 start 到 end 单调递增（可能跨 2π）
    if (s < e) return θ >= s && θ <= e;
    return θ >= s || θ <= e;
  } else {
    // 逆时针：角度从 start 到 end 单调递减（可能跨 0）
    if (s > e) return θ <= s && θ >= e;
    return θ <= s || θ >= e;
  }
}

/**
 * 圆弧有向边
 *
 * 从 source 节点中心到 target 节点中心画圆弧，
 * 通过 offset 控制弧线的弯曲方向和程度。
 * arc() 端点被裁剪到节点矩形边缘上，确保箭头不重叠。
 */
@passExtraAtArg1
@passObject
export class ArcEdge extends Edge {
  @id
  @serializable
  public uuid: string;
  @serializable
  public text: string;
  @serializable
  public color: Color = Color.Transparent;
  @serializable
  public lineType: string = "solid";
  @serializable
  public arrowType: string = "default";

  /**
   * 圆弧偏移量（世界坐标）
   * 0 = 直线
   * 正数 = 向 AB 连线左侧弯曲
   * 负数 = 向 AB 连线右侧弯曲
   */
  @serializable
  public offset: number = 0;

  /**
   * 弧线上文字的位置比例。
   * 0.0 = 靠近源节点，0.5 = 中间，1.0 = 靠近目标节点
   */
  @serializable
  public textPosition: number = 0.5;

  /**
   * 获取或计算圆弧几何参数（每次实时计算，不缓存）
   */
  get arcGeometry(): ArcGeometry {
    const srcCenter = this.source.collisionBox.getRectangle().center;
    const tarCenter = this.target.collisionBox.getRectangle().center;

    if (this.offset === 0) {
      // offset=0 退化为直线。用中垂线上距离无限小的第三点来逼近
      const mid = Vector.average(srcCenter, tarCenter);
      const perp = srcCenter.subtract(tarCenter).normalize().rotateDegrees(90);
      const tinyC = mid.add(perp.multiply(0.0001));
      return arcThroughThreePoints(srcCenter, tarCenter, tinyC);
    } else {
      const mid = Vector.average(srcCenter, tarCenter);
      const perp = tarCenter.subtract(srcCenter).normalize().rotateDegrees(90);
      const controlPoint = mid.add(perp.multiply(this.offset));
      return arcThroughThreePoints(srcCenter, tarCenter, controlPoint);
    }
  }

  /**
   * 获取圆弧在矩形边缘上的裁剪后的端点
   */
  get clippedStart(): Vector {
    const geo = this.arcGeometry;
    const srcRect = this.source.collisionBox.getRectangle();
    const srcCenter = srcRect.center;
    const intersections = circleRectangleIntersections(geo.center, geo.radius, srcRect);
    if (intersections.length === 0) return srcCenter;
    // 取离 source 中心最近的交点（弧线"离开"矩形的点）
    intersections.sort((a, b) => a.distance(srcCenter) - b.distance(srcCenter));
    // 在圆弧上的交点中，选与弧线走向一致的一个
    const onArc = intersections.filter((p) =>
      isPointOnArc(p, geo.center, geo.startAngle, geo.endAngle, geo.counterclockwise),
    );
    // 如果 offset=0 的方向判断可能不准确，退回到最近的交点
    const candidates = onArc.length > 0 ? onArc : intersections;
    // 取最靠近中心的（即第一个离开矩形的点）
    return candidates.reduce((a, b) => (a.distance(srcCenter) < b.distance(srcCenter) ? a : b));
  }

  /**
   * 获取圆弧在目标矩形边缘上的裁剪后的端点
   */
  get clippedEnd(): Vector {
    const geo = this.arcGeometry;
    const tarRect = this.target.collisionBox.getRectangle();
    const tarCenter = tarRect.center;
    const intersections = circleRectangleIntersections(geo.center, geo.radius, tarRect);
    if (intersections.length === 0) return tarCenter;
    const onArc = intersections.filter((p) =>
      isPointOnArc(p, geo.center, geo.startAngle, geo.endAngle, geo.counterclockwise),
    );
    const candidates = onArc.length > 0 ? onArc : intersections;
    // 取最靠近目标中心的（即最后一个进入矩形的点）
    return candidates.reduce((a, b) => (a.distance(tarCenter) < b.distance(tarCenter) ? a : b));
  }

  /**
   * 获取圆弧在终点处的切线方向（用于箭头）
   */
  getArrowDirection(): Vector {
    const geo = this.arcGeometry;
    const end = this.clippedEnd;
    // 圆在 end 点的切线方向 = 半径向量的垂直方向
    const radial = end.subtract(geo.center).normalize();
    // 根据弧的走向选择切线方向
    // 对于从 source 到 target 的弧，箭头指向 target 的切线方向
    // 在 y-down canvas 中，顺时针弧的切线是 radial 顺时针旋转 90°
    if (geo.counterclockwise) {
      // 逆时针：切线是 radial 逆时针旋转 90°
      return radial.rotateDegrees(-90);
    } else {
      // 顺时针：切线是 radial 顺时针旋转 90°
      return radial.rotateDegrees(90);
    }
  }

  /**
   * 获取圆弧在起点处离开 source 节点的切线方向（用于菱形方向）
   * 与 getArrowDirection 对称，计算 source 端的切线
   */
  getSourceDirection(): Vector {
    const geo = this.arcGeometry;
    const start = this.clippedStart;
    const radial = start.subtract(geo.center).normalize();
    // source 端：弧线离开 source 的方向
    // 顺时针弧（counterclockwise=false）：切线是 radial 顺时针旋转 90°
    // 逆时针弧（counterclockwise=true）：切线是 radial 逆时针旋转 90°
    // 但 source 端方向与 target 端相反，所以取反
    if (geo.counterclockwise) {
      return radial.rotateDegrees(90);
    } else {
      return radial.rotateDegrees(-90);
    }
  }

  get collisionBox(): CollisionBox {
    const geo = this.arcGeometry;
    const start = this.clippedStart;
    const end = this.clippedEnd;

    const startAngle = angleFromCenter(geo.center, start);
    const endAngle = angleFromCenter(geo.center, end);

    // 计算从 startAngle 到 endAngle 的 adjustedEnd（与画弧方向一致）
    let adjustedEnd: number;
    if (!geo.counterclockwise) {
      // 顺时针：角度递增
      adjustedEnd = startAngle <= endAngle ? endAngle : endAngle + 2 * Math.PI;
    } else {
      // 逆时针：角度递减
      adjustedEnd = startAngle >= endAngle ? endAngle : endAngle - 2 * Math.PI;
    }

    // 用线段近似弧线作为碰撞箱（与 renderArcEdge 中的画弧方向完全一致）
    const points = sampleArcPoints(geo.center, geo.radius, startAngle, adjustedEnd, geo.counterclockwise);

    const lines: Line[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      lines.push(new Line(points[i], points[i + 1]));
    }
    return new CollisionBox(lines);
  }

  get edgeWidth(): number {
    if (Settings.enableAutoEdgeWidth && this.target instanceof Section && this.source instanceof Section) {
      const rect1 = this.source.collisionBox.getRectangle();
      const rect2 = this.target.collisionBox.getRectangle();
      return Math.min(Math.min(Math.max(rect1.width, rect1.height), Math.max(rect2.width, rect2.height)) / 100, 100);
    } else if (this.source instanceof TextNode) {
      return this.source.getBorderWidth();
    }
    return 2;
  }

  get textFontSize(): number {
    return Renderer.FONT_SIZE * (this.edgeWidth / 2);
  }

  get textRectangle(): Rectangle {
    const textSize = getMultiLineTextSize(this.text, this.textFontSize, 1.2);
    // 文字放在圆弧中点
    const midPoint = this.getArcMidPoint();
    return new Rectangle(midPoint.subtract(textSize.divide(2)), textSize);
  }

  /**
   * 获取圆弧的中点（用于文字定位）
   * 使用裁剪后的起点终点计算中点在可见弧段上的位置
   */
  getArcMidPoint(): Vector {
    const geo = this.arcGeometry;
    const start = this.clippedStart;
    const end = this.clippedEnd;

    const startAngle = Math.atan2(start.y - geo.center.y, start.x - geo.center.x);
    const endAngle = Math.atan2(end.y - geo.center.y, end.x - geo.center.x);

    // 计算 adjustedEnd（与 renderArcEdge 一致）
    let adjustedEnd: number;
    if (!geo.counterclockwise) {
      adjustedEnd = startAngle <= endAngle ? endAngle : endAngle + 2 * Math.PI;
    } else {
      adjustedEnd = startAngle >= endAngle ? endAngle : endAngle - 2 * Math.PI;
    }

    // 使用 textPosition 在弧线上插值（0=起点方向，1=终点方向）
    const textAngle = startAngle + (adjustedEnd - startAngle) * this.textPosition;
    return new Vector(geo.center.x + geo.radius * Math.cos(textAngle), geo.center.y + geo.radius * Math.sin(textAngle));
  }

  constructor(
    protected readonly project: Project,
    {
      associationList = [] as ConnectableEntity[],
      text = "",
      uuid = crypto.randomUUID() as string,
      color = Color.Transparent,
      sourceRectangleRate = Vector.same(0.5),
      targetRectangleRate = Vector.same(0.5),
      lineType = "solid",
      arrowType = "default",
      offset = 0,
      textPosition = 0.5,
    },
    public unknown = false,
  ) {
    super();
    this.uuid = uuid;
    this.associationList = associationList;
    this.text = text;
    this.color = color;
    this.sourceRectangleRate = sourceRectangleRate;
    this.targetRectangleRate = targetRectangleRate;
    this.lineType = lineType;
    this.arrowType = arrowType;
    this.offset = offset;
    this.textPosition = textPosition;

    this.adjustSizeByText();
  }

  adjustSizeByText(): void {}
}
