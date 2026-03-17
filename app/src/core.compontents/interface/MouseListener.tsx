/**
 * 鼠标监听器
 */
export interface MouseListener {
  /**
   * 鼠标按下事件
   * @param event 事件
   */
  onDown(event: MouseEvent): void;
  /**
   * 鼠标抬起事件
   * @param event 事件
   */
  onUp(event: MouseEvent): void;
  /**
   * 鼠标移动事件
   * @param event 事件
   */
  onMove(event: MouseEvent): void;
  /**
   * 鼠标单机事件
   * @param event 事件
   */
  onClick(event: MouseEvent): void;
  // 弃用
  // onEnter(event: MouseEvent): void;
  // onLeave(event: MouseEvent): void;
}
