import { Settings } from "@/core/service/Settings";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Circle, Line, SymmetryCurve } from "@graphif/shapes";
import { ConnectPoint } from "../entity/ConnectPoint";
import { Vector } from "@graphif/data-structures";

export namespace EdgeCollisionBoxGetter {
  /**
   * 初始化边的渲染器
   */
  export function init() {
    Settings.watch("lineStyle", updateState);
  }

  let currentStyle: Settings["lineStyle"];

  function updateState(style: Settings["lineStyle"]) {
    currentStyle = style;
  }

  /**
   * 根据不同的设置状态，以及edge，动态获取edge的碰撞箱
   * @param edge
   */
  export function getCollisionBox(edge: LineEdge): CollisionBox {
    if (edge.source.uuid === edge.target.uuid) {
      // 是一个自环，碰撞箱是圆形
      const sourceEntityRect = edge.source.collisionBox.getRectangle();
      return new CollisionBox([new Circle(sourceEntityRect.location, sourceEntityRect.size.y / 2)]);
    } else {
      if (currentStyle === "bezier") {
        return getBezierCollisionBox(edge);
      } else if (currentStyle === "straight") {
        return getStraightCollisionBox(edge);
      } else if (currentStyle === "vertical") {
        return new CollisionBox([edge.bodyLine]);
      } else {
        return new CollisionBox([edge.bodyLine]);
      }
    }
  }

  function getBezierCollisionBox(edge: LineEdge): CollisionBox {
    if (edge.isShifting) {
      const shiftingMidPoint = edge.shiftingMidPoint;
      // 从source.Center到shiftingMidPoint的线
      const sourceRectangle = edge.source.collisionBox.getRectangle();
      const targetRectangle = edge.target.collisionBox.getRectangle();

      const startLine = new Line(sourceRectangle.center, shiftingMidPoint);
      const endLine = new Line(shiftingMidPoint, targetRectangle.center);
      let startPoint = sourceRectangle.getLineIntersectionPoint(startLine);
      if (startPoint.equals(sourceRectangle.center)) {
        startPoint = sourceRectangle.getLineIntersectionPoint(endLine);
      }
      let endPoint = targetRectangle.getLineIntersectionPoint(endLine);
      if (endPoint.equals(targetRectangle.center)) {
        endPoint = targetRectangle.getLineIntersectionPoint(startLine);
      }
      const curve = new SymmetryCurve(
        startPoint,
        startLine.direction(),
        endPoint,
        endLine.direction().multiply(-1),
        Math.abs(endPoint.subtract(startPoint).magnitude()) / 2,
      );
      const size = 15; // 箭头大小
      curve.end = curve.end.subtract(curve.endDirection.normalize().multiply(size / -2));
      return new CollisionBox([curve]);
    } else {
      const start = edge.bodyLine.start;
      const end = edge.bodyLine.end;
      const startDirection =
        edge.source instanceof ConnectPoint
          ? Vector.getZero()
          : edge.source.collisionBox.getRectangle().getNormalVectorAt(start);
      const endDirection =
        edge.target instanceof ConnectPoint
          ? Vector.getZero()
          : edge.target.collisionBox.getRectangle().getNormalVectorAt(end);

      // const endNormal = edge.target.collisionBox.getRectangle().getNormalVectorAt(end);
      return new CollisionBox([
        new SymmetryCurve(
          start,
          startDirection,
          end.add(endDirection.multiply(15 / 2)),
          endDirection,
          Math.min(300, Math.abs(end.subtract(start).magnitude()) / 2),
        ),
      ]);
    }
  }

  function getStraightCollisionBox(edge: LineEdge): CollisionBox {
    if (edge.isShifting) {
      const shiftingMidPoint = edge.shiftingMidPoint;
      // 从source.Center到shiftingMidPoint的线
      const startLine = new Line(edge.source.collisionBox.getRectangle().center, shiftingMidPoint);
      const endLine = new Line(shiftingMidPoint, edge.target.collisionBox.getRectangle().center);
      return new CollisionBox([startLine, endLine]);
    } else {
      return new CollisionBox([edge.bodyLine]);
    }
  }
}
