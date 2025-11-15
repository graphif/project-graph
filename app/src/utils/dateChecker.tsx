/**
 * 日期检查和时间转换工具
 */
export namespace DateChecker {
  /**
   * 判断当前是否是某月某日
   * 判断当前是否是3月15日就直接传入3和15即可
   */
  export function isCurrentEqualDate(month: number, day: number): boolean {
    const now = new Date();
    return now.getMonth() + 1 === month && now.getDate() === day;
  }

  /**
   * 将时间戳转换为相对时间格式
   * 例如：1天前，3小时前，5分钟前
   */
  export function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    // 计算时间差的各个单位
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    // 根据时间差选择合适的单位
    if (years > 0) {
      return `${years}${years === 1 ? "年" : "年"}前`;
    }
    if (months > 0) {
      return `${months}${months === 1 ? "月" : "月"}前`;
    }
    if (days > 0) {
      return `${days}${days === 1 ? "天" : "天"}前`;
    }
    if (hours > 0) {
      return `${hours}${hours === 1 ? "小时" : "小时"}前`;
    }
    if (minutes > 0) {
      return `${minutes}${minutes === 1 ? "分钟" : "分钟"}前`;
    }
    if (seconds > 0) {
      return `${seconds}${seconds === 1 ? "秒" : "秒"}前`;
    }
    return "刚刚";
  }
}
