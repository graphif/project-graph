import { Vector } from "@graphif/data-structures";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";

/**
 * 仅在keyboardOnlyEngine模块中使用
 * 纯键盘操作，按下Tab自动生长节点时，自动选择一开始瞬间出现的初始目标位置
 * 的功能模块
 *
 * 以尽可能减少用户按方向键更改目标位置的操作，提高效率
 */
export const NewTargetLocationSelector = {
  diffLocation: new Vector(150, 0),

  /**
   *
   * @param selectedNode 当前选择的是哪个节点
   * @returns 返回最佳的目标位置
   */
  onTabDown(selectedNode: ConnectableEntity): Vector {
    return selectedNode.collisionBox.getRectangle().center.add(this.diffLocation);
  },

  /**
   * 在Tab键抬起时
   * @param selectedNode 当前选择的是哪个节点
   * @param finalChoiceLocation 最终用户选择生成的位置
   */
  onTabUp(selectedNode: ConnectableEntity, finalChoiceLocation: Vector): void {
    this.diffLocation = finalChoiceLocation.subtract(selectedNode.collisionBox.getRectangle().center);
  },
};
