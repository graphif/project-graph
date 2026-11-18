import { Vector } from "@graphif/data-structures";
import { DirectionKeyUtilsEngine } from "@/core/service/control-service/direction-key-utils-engine/direction-key-utils-engine";

/**
 * 纯键盘控制引擎内部的 生成节点位置的方向控制内核
 */
export class KeyboardOnlyDirectionController extends DirectionKeyUtilsEngine {
  protected reset(): void {
    console.warn("重启位置");
  }

  public clearSpeedAndAcc(): void {
    this.speed = Vector.getZero();
    this.accelerate = Vector.getZero();
    this.accelerateCommander = Vector.getZero();
  }
}
