/**
 * 专门用于其他软件中的数据类型转换
 */
export namespace DataTransferEngine {
  /**
   * 将xmind改成zip后，
   * 内部的content.json转换成四空格缩进文本
   * @param xmindContentJson
   */
  export function xmindToString(xmindContentJson: any): string {
    try {
      const sheetObject = xmindContentJson[0];
      const root = sheetObject["rootTopic"];

      const dfs = (obj: XmindNode, indentLevel: number): string => {
        let result = "";
        if (obj.children) {
          // 有子节点

          // 添加标题
          result += "    ".repeat(indentLevel) + obj.title + "\n";
          for (const children of obj.children.attached) {
            result += dfs(children, indentLevel + 1);
          }
        } else {
          // 没有子节点
          result += "    ".repeat(indentLevel) + obj.title + "\n";
        }
        return result;
      };

      return dfs(root, 0);
    } catch {
      throw Error("e");
    }
  }
}

interface XmindNode {
  id: string;
  title: string;
  children?: { attached: XmindNode[] };
}
