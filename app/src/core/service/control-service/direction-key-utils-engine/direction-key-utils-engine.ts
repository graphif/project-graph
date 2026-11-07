import { Vector } from "@graphif/data-structures";
import { Direction } from "@/types/directions";

/**
 * 方向键的通用引擎
 * 例如 WSAD键，上下左右方向键，IKJL键控制的带有加速度的运动
 *
 * 使用时建议继承此类，重写reset方法，在reset方法中初始化相关变量
 */
export class DirectionKeyUtilsEngine {
  location: Vector = Vector.getZero();
  speed: Vector = Vector.getZero();
  accelerate: Vector = Vector.getZero();
  /**
   * 空气摩擦力系数
   */
  frictionCoefficient = 0.1;
  /**
   * 可以看成一个九宫格，主要用于处理 方向 按键移动，
   * 当同时按下w和s，这个值会是(-1,-1)，表示朝着左上移动
   */
  accelerateCommander: Vector = Vector.getZero();
  /**
   * 每个方向上的动力矢量大小
   */
  moveAmplitude = 2;
  /**
   * 空气摩擦力速度指数
   * 指数=2，表示 f = -k * v^2
   * 指数=1，表示 f = -k * v
   * 指数越大，速度衰减越快
   */
  frictionExponent = 1.5;

  /**
   * 是否反向
   */
  public isDirectionReversed = false;

  constructor() {}

  static keyMap: Record<Direction, Vector> = {
    [Direction.Up]: new Vector(0, -1),
    [Direction.Down]: new Vector(0, 1),
    [Direction.Left]: new Vector(-1, 0),
    [Direction.Right]: new Vector(1, 0),
  };

  /**
   * 在继承的类中重写此方法
   */
  protected reset() {}

  /**
   * 重新设置指定位置并清空速度和加速度
   * @param location
   */
  public resetLocation(location: Vector) {
    this.location = location;
    this.speed = Vector.getZero();
    this.accelerate = Vector.getZero();
    // this.accelerateCommander = Vector.getZero();
  }

  /**
   * 初始化方法，用于绑定快捷键之类的
   */
  public init() {}

  // 方向键按下

  public keyPress(direction: Direction) {
    let addAccelerate = DirectionKeyUtilsEngine.keyMap[direction];
    // 如果反向
    if (this.isDirectionReversed) {
      addAccelerate = addAccelerate.multiply(-1);
    }
    // 当按下某一个方向的时候,相当于朝着某个方向赋予一次加速度
    this.accelerateCommander = this.accelerateCommander.add(addAccelerate).limitX(-1, 1).limitY(-1, 1);
  }

  // 方向键松开

  public keyRelease(direction: Direction) {
    let addAccelerate = DirectionKeyUtilsEngine.keyMap[direction];
    // 如果反向
    if (this.isDirectionReversed) {
      addAccelerate = addAccelerate.multiply(-1);
    }
    // 当松开某一个方向的时候,相当于停止加速度
    this.accelerateCommander = this.accelerateCommander.subtract(addAccelerate).limitX(-1, 1).limitY(-1, 1);
  }

  public logicTick() {
    if (Number.isNaN(this.location.x) || Number.isNaN(this.location.y)) {
      this.speed = Vector.getZero();
      this.reset();
      return;
    }

    let friction = Vector.getZero();
    if (!this.speed.isZero()) {
      const speedSize = this.speed.magnitude();
      // 计算摩擦力
      friction = this.speed
        .normalize()
        .multiply(-1)
        .multiply(this.frictionCoefficient * speedSize ** this.frictionExponent);
    }

    // 速度 = 速度 + 加速度（各个方向的力之和）
    this.speed = this.speed.add(this.accelerateCommander.multiply(this.moveAmplitude)).add(friction);
    this.location = this.location.add(this.speed);
  }
}
