import type { Entity } from "../abstract/StageEntity";
import {
  BaseBlockquotePlugin,
  BaseH1Plugin,
  BaseH2Plugin,
  BaseH3Plugin,
  BaseH4Plugin,
  BaseH5Plugin,
  BaseH6Plugin,
  BaseHorizontalRulePlugin,
  BaseBoldPlugin,
  BaseCodePlugin,
  BaseHighlightPlugin,
  BaseItalicPlugin,
  BaseKbdPlugin,
  BaseStrikethroughPlugin,
  BaseSubscriptPlugin,
  BaseSuperscriptPlugin,
  BaseUnderlinePlugin,
} from "@platejs/basic-nodes";
import {
  BaseFontBackgroundColorPlugin,
  BaseFontColorPlugin,
  BaseFontFamilyPlugin,
  BaseFontSizePlugin,
} from "@platejs/basic-styles";
import { BaseCodeBlockPlugin, BaseCodeLinePlugin, BaseCodeSyntaxPlugin } from "@platejs/code-block";
import { BaseIndentPlugin } from "@platejs/indent";
import { BaseLinkPlugin } from "@platejs/link";
import { BaseListPlugin } from "@platejs/list";
import { BaseEquationPlugin, BaseInlineEquationPlugin } from "@platejs/math";
import { BaseTablePlugin, BaseTableRowPlugin, BaseTableCellPlugin, BaseTableCellHeaderPlugin } from "@platejs/table";
import { MarkdownPlugin, remarkMdx, remarkMention } from "@platejs/markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { toast } from "sonner";
import { type Value, createSlateEditor, BaseParagraphPlugin } from "platejs";

const conversionPlugins = [
  BaseParagraphPlugin,
  BaseBlockquotePlugin,
  BaseH1Plugin,
  BaseH2Plugin,
  BaseH3Plugin,
  BaseH4Plugin,
  BaseH5Plugin,
  BaseH6Plugin,
  BaseHorizontalRulePlugin,
  BaseBoldPlugin,
  BaseCodePlugin,
  BaseHighlightPlugin,
  BaseItalicPlugin,
  BaseKbdPlugin,
  BaseStrikethroughPlugin,
  BaseSubscriptPlugin,
  BaseSuperscriptPlugin,
  BaseUnderlinePlugin,
  BaseFontBackgroundColorPlugin,
  BaseFontColorPlugin,
  BaseFontFamilyPlugin,
  BaseFontSizePlugin,
  BaseCodeBlockPlugin,
  BaseCodeLinePlugin,
  BaseCodeSyntaxPlugin,
  BaseIndentPlugin,
  BaseListPlugin,
  BaseLinkPlugin,
  BaseEquationPlugin,
  BaseInlineEquationPlugin,
  BaseTablePlugin,
  BaseTableRowPlugin,
  BaseTableCellPlugin,
  BaseTableCellHeaderPlugin,
];

function createConversionEditor() {
  return createSlateEditor({
    plugins: [
      ...conversionPlugins,
      MarkdownPlugin.configure({ options: { remarkPlugins: [remarkMath, remarkGfm, remarkMdx, remarkMention] } }),
    ],
  });
}

let conversionEditor: ReturnType<typeof createConversionEditor> | undefined;

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
      return this.getCachedDetails().markdown;
    }
  }

  private cacheMap = new WeakMap<Value, { markdown: string; stageText: string }>();

  private getCachedDetails() {
    const details = this.entity.details;
    let cached = this.cacheMap.get(details);
    if (!cached) {
      const markdown = DetailsManager.detailsToMarkdown(details);
      cached = { markdown, stageText: markdown.replace("\n\n", "\n") };
      this.cacheMap.set(details, cached);
    }
    return cached;
  }
  /**
   * 获取用于渲染在舞台上的字符串
   * @returns
   */
  public getRenderStageString(): string {
    return this.isEmpty() ? "" : this.getCachedDetails().stageText;
  }

  /**
   * 将详细信息(platejs格式)转换为markdown字符串
   * 可能用于：被搜索、渲染在舞台上、详略交换
   * @param details platejs的Value格式内容
   * @returns markdown字符串
   */
  public static detailsToMarkdown(details: Value) {
    const editor = (conversionEditor ??= createConversionEditor());
    try {
      editor.children = details;
      const markdown = editor.api.markdown.serialize();
      return markdown;
    } catch (error) {
      // TODO: 先暂时这样处理一下，后面再看如何导出成更好的markdown字符串
      // 这里先记录一个触发错误的情况，就是富文本
      // [{"children":[{"text":"gfw的泄露","fontFamily":"\"PingFang SC\", HarmonyOS_Regular, \"Helvetica Neue\", \"Microsoft YaHei\", sans-serif","fontSize":"17px","backgroundColor":"rgb(255, 255, 255)","color":"rgb(47, 50, 56)"}],"type":"p","id":"EVpKUIdRu5"}]

      toast.error(`详情转换失败：${String(error)}`);
      return JSON.stringify(details);
    } finally {
      // 转换器跨工程复用，不能持有上一个工程的详情对象。
      editor.children = [];
    }
  }

  public static markdownToDetails(md: string) {
    const editor = (conversionEditor ??= createConversionEditor());
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
