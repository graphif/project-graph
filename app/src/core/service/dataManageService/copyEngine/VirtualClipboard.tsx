/**
 * 独立于系统剪贴板之外的虚拟剪贴板
 * 保留舞台对象及附件，避免将内部对象协议写入系统剪贴板。
 */
export namespace VirtualClipboard {
  let data: any = null;

  export function copy(newData: any) {
    data = newData;
  }
  export function paste() {
    return data;
  }
  export function clear() {
    data = null;
  }
  export function hasData() {
    return data !== null;
  }
}
