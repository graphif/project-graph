/**
 * 渲染接口，决定组件以什么架构绘制
 */
export interface ReaderInterface {
  /**
   * 绘制逻辑，决定是否执行重绘
   * @param ctx canvas ctx
   */
  render(ctx: CanvasRenderingContext2D): void;
  /**
   * 触发单词重绘，UI绘制的具体函数
   * @param ctx canvas ctx
   */
  renderOnce(ctx: CanvasRenderingContext2D): void;
  /**
   * 请求组件重绘
   */
  reRender(): void;
}
