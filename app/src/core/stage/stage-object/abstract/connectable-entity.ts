import { Vector } from "@graphif/data-structures";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";

/**
 * 一切可被Edge连接的东西，且会算入图分析算法的东西
 */
export abstract class ConnectableEntity extends Entity {
  /**
   * 几何中心点
   * 用于联动旋转等算法
   */
  abstract geometryCenter: Vector;

  public unknown = false;

  public get clipConnectionToBoundary(): boolean {
    return false;
  }
}
