/**
 * 更多的关于动画的函数
 *
 */

//
/**
 * 0 -> 1 -> 0
 * @param t
 * @returns
 */
export const reverseAnimate = (t: number) => {
  return Math.sin(t * Math.PI);
};

/**
 * 正弦函数
 */
export const sine = (t: number, maxValue: number, minValue: number, xRate: number) => {
  const y = Math.sin(t * xRate);
  return (maxValue - minValue) * y + minValue;
};
