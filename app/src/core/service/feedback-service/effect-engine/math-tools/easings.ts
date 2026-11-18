/**
 * 此模块定义了一些常见的缓动函数
 *
 * https://easings.net/zh-cn
 */

/**
 *
 * @param t
 * @returns
 */
export const easeInSine = (t: number) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export const easeInQuad = (t: number) => t * t;
export const easeOutQuad = (t: number) => t * (2 - t);
export const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

export const easeInCubic = (t: number) => t * t * t;
export const easeOutCubic = (t: number) => --t * t * t + 1;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);

export const easeInQuart = (t: number) => t * t * t * t;
export const easeOutQuart = (t: number) => 1 - --t * t * t * t;
export const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t);

export const easeInQuint = (t: number) => t * t * t * t * t;
export const easeOutQuint = (t: number) => 1 + --t * t * t * t * t;
export const easeInOutQuint = (t: number) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t);

export const easeInExpo = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
export const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOutExpo = (t: number) =>
  t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;

export const easeInCirc = (t: number) => 1 - Math.sqrt(1 - t * t);
export const easeOutCirc = (t: number) => Math.sqrt(1 - --t * t);
export const easeInOutCirc = (t: number) =>
  t < 0.5 ? (1 - Math.sqrt(1 - 2 * t * t)) / 2 : (Math.sqrt(1 - (2 * t - 1) * (2 * t - 1)) + 1) / 2;

export const easeInElastic = (t: number) =>
  t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
export const easeOutElastic = (t: number) =>
  t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
export const easeInOutElastic = (t: number) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1;

export const easeInBack = (t: number) => c3 * t * t * t - c1 * t * t;
export const easeOutBack = (t: number) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
export const easeInOutBack = (t: number) =>
  t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;

const c1 = 1.70158;
const c2 = c1 * 1.525;
const c3 = c1 + 1;
