/**
 * 这里存放所有比较逻辑函数
 * 本来是二元比较，但是扩展成多元比较了
 */

export namespace CompareFunctions {
  /**
   * 判断是否是严格递减序列
   * 如果是，返回[1] 否则返回[0]
   * @param numbers
   * @returns
   */
  export function lessThan(numbers: number[]): number[] {
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i] >= numbers[i + 1]) {
        return [0];
      }
    }
    return [1];
  }

  /**
   * 判断是否是严格递增序列
   * 如果是，返回[1] 否则返回[0]
   * @param numbers
   * @returns
   */
  export function greaterThan(numbers: number[]): number[] {
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i] <= numbers[i + 1]) {
        return [0];
      }
    }
    return [1];
  }

  /**
   * 判断是否是非严格单调递增序列
   * 如果是，返回[1] 否则返回[0]
   * @param numbers
   * @returns
   */
  export function isIncreasing(numbers: number[]): number[] {
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i] > numbers[i + 1]) {
        return [0];
      }
    }
    return [1];
  }

  /**
   * 判断是否是非严格单调递减序列
   * 如果是，返回[1] 否则返回[0]
   * @param numbers
   * @returns
   */
  export function isDecreasing(numbers: number[]): number[] {
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i] < numbers[i + 1]) {
        return [0];
      }
    }
    return [1];
  }

  /**
   * a == b == c ... == n
   * @param numbers
   * @returns
   */
  export function isSame(numbers: number[]): number[] {
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i] !== numbers[i + 1]) {
        return [0];
      }
    }
    return [1];
  }

  /**
   * 是否每个都不一样
   * @param numbers
   * @returns
   */
  export function isDistinct(numbers: number[]): number[] {
    for (let i = 0; i < numbers.length - 1; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        if (numbers[i] === numbers[j]) {
          return [0];
        }
      }
    }
    return [1];
  }
}
