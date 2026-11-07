export namespace ArrayFunctions {
  /**
   * 计算总和
   */
  export function sum(arr: number[]): number {
    return arr.reduce((acc, cur) => acc + cur, 0);
  }

  /**
   * 计算平均值
   */
  export function average(arr: number[]): number {
    if (arr.length === 0) {
      throw new Error("计算平均值时，数组不能为空");
    }
    return sum(arr) / arr.length;
  }

  export function isSame(arr: number[]): boolean {
    if (arr.length === 0) {
      throw new Error("计算是否均一时，数组不能为空");
    }
    if (arr.length === 1) {
      return true;
    }
    const first = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (first !== arr[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * 计算方差
   */
  export function variance(arr: number[]): number {
    const avg = average(arr);
    return arr.reduce((acc, cur) => acc + Math.pow(cur - avg, 2), 0) / arr.length;
  }

  /**
   * 计算标准差
   */
  export function standardDeviation(arr: number[]): number {
    return Math.sqrt(variance(arr));
  }

  /**
   * 获取绝对值最小的那个值
   * @param arr
   */
  export function getMinAbsValue(arr: number[]): number {
    if (arr.length === 0) {
      throw new Error("数组不能为空");
    }

    let minAbsValue = arr[0];

    for (let i = 1; i < arr.length; i++) {
      if (Math.abs(arr[i]) < Math.abs(minAbsValue)) {
        minAbsValue = arr[i];
      }
    }

    return minAbsValue;
  }
}
