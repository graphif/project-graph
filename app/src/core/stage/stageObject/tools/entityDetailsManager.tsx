import { Entity } from "../abstract/StageEntity";
import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { CodeBlockKit } from "@/components/editor/plugins/code-block-kit";
import { FixedToolbarKit } from "@/components/editor/plugins/fixed-toolbar-kit";
import { FloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit";
import { FontKit } from "@/components/editor/plugins/font-kit";
import { LinkKit } from "@/components/editor/plugins/link-kit";
import { ListKit } from "@/components/editor/plugins/list-kit";
import { MathKit } from "@/components/editor/plugins/math-kit";
import { TableKit } from "@/components/editor/plugins/table-kit";
import { MarkdownPlugin } from "@platejs/markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Value } from "platejs";
import { createPlateEditor } from "platejs/react";

/**
 * 详细信息管理器
 */
export class DetailsManager {
  constructor(private entity: Entity) {}

  public isEmpty() {
    if (this.entity.details.length === 0) {
      return true;
    } else {
      const firstItem = this.entity.details[0];
      if (firstItem.type === "p") {
        const firstChildren = firstItem.children[0];
        if (firstChildren.text === "") {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 获取这个详细信息能被搜索到的字符串
   * @returns
   */
  public getBeSearchingText(): string {
    if (this.isEmpty()) {
      return "";
    } else {
      return DetailsManager.detailsToMarkdown(this.entity.details);
    }
  }

  private cacheMap: Map<Value, string> = new Map();
  /**
   * 获取用于渲染在舞台上的字符串
   * @returns
   */
  public getRenderStageString(): string {
    if (this.isEmpty()) {
      return "";
    } else {
      if (this.cacheMap.has(this.entity.details)) {
        return this.cacheMap.get(this.entity.details)!;
      } else {
        const markdown = DetailsManager.detailsToMarkdown(this.entity.details).replace("\n\n", "\n");
        this.cacheMap.set(this.entity.details, markdown);
        return markdown;
      }
    }
  }

  /**
   * 将详细信息(platejs格式)转换为markdown字符串
   * 可能用于：被搜索、渲染在舞台上、详略交换
   * @param details platejs的Value格式内容
   * @returns markdown字符串
   */
  public static detailsToMarkdown(details: Value) {
    try {
      const editor = createPlateEditor({
        plugins: [
          ...FloatingToolbarKit,
          ...FixedToolbarKit,
          ...BasicMarksKit,
          ...BasicBlocksKit,
          ...FontKit,
          ...TableKit,
          ...MathKit,
          ...CodeBlockKit,
          ...ListKit,
          ...LinkKit,
          MarkdownPlugin,
        ],
      });
      editor.children = details;
      const markdown = editor.api.markdown.serialize();
      return markdown;
    } catch (error) {
      // TODO: 先暂时这样处理一下，后面再看如何导出成更好的markdown字符串
      // 这里先记录一个触发错误的情况，就是富文本
      // [{"children":[{"text":"gfw的泄露","fontFamily":"\"PingFang SC\", HarmonyOS_Regular, \"Helvetica Neue\", \"Microsoft YaHei\", sans-serif","fontSize":"17px","backgroundColor":"rgb(255, 255, 255)","color":"rgb(47, 50, 56)"}],"type":"p","id":"EVpKUIdRu5"}]

      console.error(error);
      return JSON.stringify(details);
    }
  }

  public static markdownToDetails(md: string) {
    const editor = createPlateEditor({
      plugins: [
        ...FloatingToolbarKit,
        ...FixedToolbarKit,
        ...BasicMarksKit,
        ...BasicBlocksKit,
        ...FontKit,
        ...TableKit,
        ...MathKit,
        ...CodeBlockKit,
        ...ListKit,
        ...LinkKit,
        MarkdownPlugin,
      ],
    });
    const value = editor.api.markdown.deserialize(md, {
      remarkPlugins: [remarkGfm, remarkMath, remarkBreaks],
    });
    return value;
  }

  /**
   * 合并多个详细信息为一个
   * @param detailsList 要合并的详细信息列表
   * @returns 合并后的详细信息
   */
  public static mergeDetails(detailsList: Value[]): Value {
    // 创建一个空的Value数组
    const mergedDetails: Value = [];

    // 遍历所有details，将它们的内容合并到一个数组中
    for (const details of detailsList) {
      mergedDetails.push(...details);
    }

    return mergedDetails;
  }
}
