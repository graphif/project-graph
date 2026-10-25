import { Settings } from "@/core/service/Settings";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Circle, Line, SymmetryCurve } from "@graphif/shapes";
import { ConnectPoint } from "../entity/ConnectPoint";
import { ImageNode } from "../entity/ImageNode";
import { Vector } from "@graphif/data-structures";

export namespace EdgeCollisionBoxGetter {
  /**
   * 初始化边的渲染器
   */
  export function init() {
    Settings.watch("lineStyle", updateState);
  }

  let currentStyle: Settings["lineStyle"];
  const cache = new WeakMap<
    LineEdge,
    {
      bodyLine: Line;
      style: Settings["lineStyle"];
      shiftingIndex: number;
      autoWidth: boolean;
      edgeWidth: number;
      sourceUuid: string;
      targetUuid: string;
      box: CollisionBox;
    }
  >();

  function updateState(style: Settings["lineStyle"]) {
    currentStyle = style;
  }

  /**
   * 根据不同的设置状态，以及edge，动态获取edge的碰撞箱
   * @param edge
   */
  export function getCollisionBox(edge: LineEdge): CollisionBox {
    const bodyLine = edge.bodyLine;
    const cached = cache.get(edge);
    const edgeWidth = edge.edgeWidth;
    if (
      cached &&
      cached.bodyLine === bodyLine &&
      cached.style === currentStyle &&
      cached.shiftingIndex === edge.shiftingIndex &&
      cached.autoWidth === Settings.enableAutoEdgeWidth &&
      cached.edgeWidth === edgeWidth &&
      cached.sourceUuid === edge.source.uuid &&
      cached.targetUuid === edge.target.uuid
    ) {
      return cached.box;
    }
    const box = computeCollisionBox(edge);
    cache.set(edge, {
      bodyLine,
      style: currentStyle,
      shiftingIndex: edge.shiftingIndex,
      autoWidth: Settings.enableAutoEdgeWidth,
      edgeWidth,
      sourceUuid: edge.source.uuid,
      targetUuid: edge.target.uuid,
      box,
    });
    return box;
  }

  function computeCollisionBox(edge: LineEdge): CollisionBox {
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
    if (edge.shiftingIndex !== 0) {
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
      const bodyLine = edge.bodyLine;
      const start = bodyLine.start;
      const end = bodyLine.end;
      const lineDirection = end.subtract(start).normalize();

      const startDirection = (() => {
        if (edge.source instanceof ConnectPoint) return Vector.getZero();
        const fromRate = Edge.getNormalVectorByRate(edge.sourceRectangleRate);
        if (fromRate !== null) return fromRate;
        const sourceRect = edge.source.collisionBox.getRectangle();
        const isExact =
          (edge.source instanceof ImageNode || edge.source.constructor.name === "ReferenceBlockNode") &&
          start.x !== sourceRect.left &&
          start.x !== sourceRect.right &&
          start.y !== sourceRect.top &&
          start.y !== sourceRect.bottom;
        return isExact ? lineDirection : sourceRect.getNormalVectorAt(start);
      })();

      const endDirection = (() => {
        if (edge.target instanceof ConnectPoint) return Vector.getZero();
        const toRate = Edge.getNormalVectorByRate(edge.targetRectangleRate);
        if (toRate !== null) return toRate;
        const targetRect = edge.target.collisionBox.getRectangle();
        const isExact =
          (edge.target instanceof ImageNode || edge.target.constructor.name === "ReferenceBlockNode") &&
          end.x !== targetRect.left &&
          end.x !== targetRect.right &&
          end.y !== targetRect.top &&
          end.y !== targetRect.bottom;
        return isExact ? lineDirection.multiply(-1) : targetRect.getNormalVectorAt(end);
      })();

      const curve = new SymmetryCurve(start, startDirection, end, endDirection);
      curve.end = end.add(endDirection.multiply(15 / 2));
      return new CollisionBox([curve]);
    }
  }

  function getStraightCollisionBox(edge: LineEdge): CollisionBox {
    if (edge.shiftingIndex !== 0) {
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
