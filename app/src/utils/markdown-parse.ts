export interface MarkdownNode {
  title: string;
  content: string;
  children: MarkdownNode[];
}

/**
 * 将markdonwn文本解析为JSON对象
 * @param markdown
 * @returns
 */
export function parseMarkdownToJSON(markdown: string): MarkdownNode[] {
  const lines = markdown.split("\n");
  const root: MarkdownNode[] = [];
  const stack: { node: MarkdownNode; level: number }[] = [];

  for (const line of lines) {
    // 匹配标题（如 #, ##, ### 等）
    const titleMatch = line.match(/^(#+)\s*(.*)/);
    if (titleMatch) {
      const level = titleMatch[1].length; // 标题层级
      const title = titleMatch[2].trim(); // 标题内容

      const newNode: MarkdownNode = {
        title,
        content: "",
        children: [],
      };

      // 根据层级找到父节点
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // 根节点
        root.push(newNode);
      } else {
        // 添加到父节点的 children 中
        stack[stack.length - 1].node.children.push(newNode);
      }

      // 将当前节点推入栈中
      stack.push({ node: newNode, level });
    } else if (line.trim()) {
      // 非标题行，作为内容处理
      if (stack.length > 0) {
        stack[stack.length - 1].node.content += line + "\n";
        // 再去除一下最终的换行符
        stack[stack.length - 1].node.content = stack[stack.length - 1].node.content.trim();
      }
    }
  }

  return root;
}
