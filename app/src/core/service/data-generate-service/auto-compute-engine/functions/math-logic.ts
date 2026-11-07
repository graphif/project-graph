import { NumberFunctions } from "@/core/algorithm/numberFunctions";
import { Random } from "@/core/algorithm/random";
import { Decimal } from "decimal.js";

/**
 * 存放和数学逻辑有关的函数
 */
export namespace MathFunctions {
  export function add(numbers: number[]): number[] {
    return [numbers.reduce((acc, cur) => new Decimal(acc).plus(new Decimal(cur)).toNumber(), 0)];
  }

  export function subtract(numbers: number[]): number[] {
    if (numbers.length === 0) {
      return [0];
    }
    if (numbers.length === 1) {
      return [-numbers[0]];
    }
    // 累减
    let result = new Decimal(numbers[0]);
    for (let i = 1; i < numbers.length; i++) {
      result = result.sub(new Decimal(numbers[i]));
    }
    return [result.toNumber()];
  }

  export function multiply(numbers: number[]): number[] {
    return [numbers.reduce((acc, cur) => new Decimal(acc).times(new Decimal(cur)).toNumber(), 1)];
  }

  export function divide(numbers: number[]): number[] {
    if (numbers.length === 0) {
      return [1];
    }
    if (numbers.length === 1) {
      return [1 / numbers[0]];
    }
    let result = new Decimal(numbers[0]);
    for (let i = 1; i < numbers.length; i++) {
      result = result.div(new Decimal(numbers[i]));
    }
    return [result.toNumber()];
  }

  export function modulo(numbers: number[]): number[] {
    if (numbers.length === 0) {
      return [0];
    }
    if (numbers.length === 1) {
      return [0];
    }
    let result = numbers[0];
    for (let i = 1; i < numbers.length; i++) {
      result %= numbers[i];
    }
    return [result];
  }

  export function power(numbers: number[]): number[] {
    if (numbers.length === 0) {
      return [1];
    }
    if (numbers.length === 1) {
      return [Math.pow(numbers[0], 1)];
    }
    let result = new Decimal(numbers[0]);
    for (let i = 1; i < numbers.length; i++) {
      result = result.pow(new Decimal(numbers[i]));
    }
    return [result.toNumber()];
  }

  export function factorial(numbers: number[]): number[] {
    return numbers.map((n) => _factorial(n));
  }

  export function sqrt(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).sqrt().toNumber());
  }

  export function abs(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).abs().toNumber());
  }

  export function log(numbers: number[]): number[] {
    if (numbers.length === 0) {
      return [0];
    }
    if (numbers.length === 1) {
      return [Math.log(numbers[0])];
    }

    return [NumberFunctions.logBase(numbers[1], numbers[0])];
  }

  export function ln(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).ln().toNumber());
  }

  export function exp(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).exp().toNumber());
  }

  export function sin(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).sin().toNumber());
  }

  export function cos(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).cos().toNumber());
  }

  export function tan(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).tan().toNumber());
  }

  export function asin(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).asin().toNumber());
  }

  export function acos(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).acos().toNumber());
  }

  export function atan(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).atan().toNumber());
  }

  export function sinh(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).sinh().toNumber());
  }

  export function cosh(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).cosh().toNumber());
  }

  export function tanh(numbers: number[]): number[] {
    return numbers.map((n) => new Decimal(n).tanh().toNumber());
  }
  export function max(numbers: number[]): number[] {
    return [Math.max(...numbers)];
  }
  export function min(numbers: number[]): number[] {
    return [Math.min(...numbers)];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export function random(_: number[]): number[] {
    return [Math.random()];
  }
  export function randomInt(numbers: number[]): number[] {
    return [Random.randomInt(numbers[0], numbers[1])];
  }
  export function randomFloat(numbers: number[]): number[] {
    return [Random.randomFloat(numbers[0], numbers[1])];
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export function randomBoolean(_: number[]): number[] {
    return [Random.randomBoolean() ? 1 : 0];
  }
  export function randomPoisson(numbers: number[]): number[] {
    return [Random.poissonRandom(numbers[0])];
  }
  export function round(numbers: number[]): number[] {
    return numbers.map((n) => Math.round(n));
  }
  export function floor(numbers: number[]): number[] {
    return numbers.map((n) => Math.floor(n));
  }
  export function ceil(numbers: number[]): number[] {
    return numbers.map((n) => Math.ceil(n));
  }
  // 逻辑门
  export function and(numbers: number[]): number[] {
    return [numbers.every((n) => n === 1) ? 1 : 0];
  }
  export function or(numbers: number[]): number[] {
    return [numbers.some((n) => n === 1) ? 1 : 0];
  }
  export function not(numbers: number[]): number[] {
    return [numbers[0] === 0 ? 1 : 0];
  }
  export function xor(numbers: number[]): number[] {
    // 只要有不一样的，就返回1，如果全是一样的内容，就返回0
    const set = new Set(numbers);
    return [set.size === 1 ? 0 : 1];
  }
  // 统计
  export function count(numbers: number[]): number[] {
    return [numbers.length];
  }
  /**
   * 平均值
   * @param numbers
   * @returns
   */
  export function average(numbers: number[]): number[] {
    return [new Decimal(add(numbers)[0]).div(numbers.length).toNumber()];
  }
  /**
   * 中位数
   * @param numbers
   * @returns
   */
  export function median(numbers: number[]): number[] {
    const sorted = numbers.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return [sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2];
  }

  /**
   * 众数
   * 若没有众数，则只返回第一个数
   * @param numbers
   * @returns
   */
  export function mode(numbers: number[]): number[] {
    const countMap = new Map<number, number>();
    for (const num of numbers) {
      if (countMap.has(num)) {
        countMap.set(num, countMap.get(num)! + 1);
      } else {
        countMap.set(num, 1);
      }
    }
    let maxCount = 0;
    let modeNum = 0;
    for (const [num, count] of countMap) {
      if (count > maxCount) {
        maxCount = count;
        modeNum = num;
      }
    }
    return [modeNum];
  }

  /**
   * 方差
   * @param numbers
   * @returns
   */
  export function variance(numbers: number[]): number[] {
    // 计算数组的平均值
    const mean = (nums: number[]): number => {
      return nums.reduce((acc, curr) => acc + curr, 0) / nums.length;
    };

    const varianceValue =
      numbers.map((n) => Math.pow(n - mean(numbers), 2)).reduce((acc, curr) => acc + curr, 0) / numbers.length;
    return [varianceValue];
  }

  /**
   * 标准差
   * @param n
   * @returns
   */
  export function standardDeviation(numbers: number[]): number[] {
    const results = variance(numbers);
    return [Math.sqrt(results[0])];
  }

  // 辅助函数

  function _factorial(n: number): number {
    if (n === 0) {
      return 1;
    }
    return n * _factorial(n - 1);
  }
}
