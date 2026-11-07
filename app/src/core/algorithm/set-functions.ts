export namespace SetFunctions {
  /**
   * 判断集合A是否是集合B的子集
   * @param setA 待检查的子集
   * @param setB 目标父集
   * @returns 如果setA的所有元素都存在于setB中则返回true，否则返回false
   */
  export function isSubset<T>(setA: Set<T>, setB: Set<T>): boolean {
    for (const item of setA) {
      if (!setB.has(item)) {
        return false;
      }
    }
    return true;
  }
}
