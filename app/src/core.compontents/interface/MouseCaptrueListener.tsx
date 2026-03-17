/**
 * 事件捕获接口，决定组件以什么样的架构处理鼠标事件
 */
export interface MouseCaptrueListener {
  /**
   * 捕获鼠标按下
   * @param event 事件
   */
  onDownCaptrue(event: MouseEvent): void;
  /**
   * 捕获鼠标抬起
   * @param event 事件
   */
  onUpCaptrue(event: MouseEvent): void;
  /**
   * 捕获鼠标移动
   * @param event 事件
   */
  onMoveCaptrue(event: MouseEvent): void;
  /**
   * 捕获鼠标单机
   * @param event 事件
   */
  onClickCaptrue(event: MouseEvent): void;
  // onEnterCaptrue(event: MouseEvent): void;
  // onLeaveCaptrue(event: MouseEvent): void;
}
