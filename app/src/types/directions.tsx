import { Vector } from "@graphif/data-structures";

/**
 * 经常会有方向键控制的场景，比如上下左右移动，这时可以用这个枚举来表示方向。
 */
export enum Direction {
  Up = "up",
  Down = "down",
  Left = "left",
  Right = "right",
}

export function reverseDirection(direction: Direction) {
  switch (direction) {
    case Direction.Up:
      return Direction.Down;
    case Direction.Down:
      return Direction.Up;
    case Direction.Left:
      return Direction.Right;
    case Direction.Right:
      return Direction.Left;
  }
}

export function directionToVector(direction: Direction, magnitude: number): Vector {
  switch (direction) {
    case Direction.Up:
      return new Vector(0, -magnitude);
    case Direction.Down:
      return new Vector(0, magnitude);
    case Direction.Left:
      return new Vector(-magnitude, 0);
    case Direction.Right:
      return new Vector(magnitude, 0);
  }
}
