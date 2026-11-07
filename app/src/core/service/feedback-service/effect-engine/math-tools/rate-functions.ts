export namespace RateFunctions {
  /**
   * 从0,0点到 1,0，y值从0到1再回到0
   * @param xRate
   * @returns
   */
  export function doorFunction(xRate: number): number {
    return Math.sin(xRate * Math.PI) ** 1;
  }

  /**
   * 开口向下的二次函数，恰好过0,0点和1,0点，最大高度为1
   * @param xRate 输入的x值
   * @returns 对应的y值
   */
  export function quadraticDownward(xRate: number): number {
    // 计算开口向下的二次函数值
    return -4 * (xRate - 0.5) ** 2 + 1;
  }
}
