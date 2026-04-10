import { Project, service } from "@/core/Project";
import { allKeyBinds } from "./shortcutKeysRegister";
import { parseSingleEmacsKey } from "@/utils/emacs";
import { isMac } from "@/utils/platform";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { getTextSize } from "@/utils/font";
import { KeyBindsUI } from "./KeyBindsUI";

/**
 * 快捷键提示引擎
 * 当按下修饰键时，显示匹配的快捷键提示
 */
@service("keyBindHintEngine")
export class KeyBindHintEngine {
  constructor(private readonly project: Project) {}

  // 每页显示的快捷键数量
  private readonly ITEMS_PER_PAGE = 10;

  // 当前页码
  private currentPage = 0;

  // 当前匹配的修饰键组合
  private currentModifierCombo: string = "";

  // 上一次按下的修饰键组合（用于检测翻页）
  private lastModifierCombo: string = "";

  // 是否正在显示提示
  private isShowingHint = false;

  // 检测是否有其他键被按下（用于重置翻页计数器）
  private hasOtherKeyPressed = false;

  // 记录修饰键是否已经松开过（用于翻页检测）
  private hasModifierReleased = false;

  // 缓存的快捷键列表
  private cachedKeyBinds: Array<{
    id: string;
    key: string;
    displayKey: string;
    title: string;
  }> = [];

  /**
   * 获取当前按下的修饰键组合
   * 返回的是存储格式（C-表示Ctrl/Meta，M-表示Meta/Ctrl）
   */
  private getCurrentModifierCombo(): string {
    const modifiers: string[] = [];
    const pressingKeys = this.project.controller.pressingKeySet;

    // 按照固定顺序检查修饰键
    // 在Mac上，meta对应M-，control对应C-
    // 在Windows上，control对应C-，meta对应M-
    if (pressingKeys.has(isMac ? "meta" : "control")) modifiers.push("C");
    if (pressingKeys.has("alt")) modifiers.push("A");
    if (pressingKeys.has("shift")) modifiers.push("S");
    if (pressingKeys.has(isMac ? "control" : "meta")) modifiers.push("M");

    return modifiers.join("-");
  }

  /**
   * 检查是否只按下了修饰键（没有其他普通键）
   */
  private isOnlyModifiersPressed(): boolean {
    const pressingKeys = this.project.controller.pressingKeySet;

    for (const key of pressingKeys) {
      if (!["control", "alt", "shift", "meta"].includes(key)) {
        return false;
      }
    }
    return pressingKeys.size > 0;
  }

  /**
   * 将存储格式的修饰键组合转换为显示格式
   * 用于匹配快捷键时，考虑Mac的键位转换
   */
  private convertModifierComboForMatching(combo: string): string {
    if (!isMac || !combo) return combo;

    // 在Mac上，存储的C-实际上是M-（Meta/Command）
    // 存储的M-实际上是C-（Control）
    const parts = combo.split("-");
    const convertedParts = parts.map((p) => {
      if (p === "C") return "M";
      if (p === "M") return "C";
      return p;
    });
    return convertedParts.join("-");
  }

  /**
   * 检查快捷键是否匹配当前的修饰键组合
   */
  private isKeyBindMatchModifier(key: string, modifierCombo: string): boolean {
    // 解析快捷键
    const parsed = parseSingleEmacsKey(key);

    // 构建快捷键的修饰键组合（存储格式）
    const keyModifiers: string[] = [];
    if (parsed.control) keyModifiers.push("C");
    if (parsed.alt) keyModifiers.push("A");
    if (parsed.shift) keyModifiers.push("S");
    if (parsed.meta) keyModifiers.push("M");

    const keyModifierCombo = keyModifiers.join("-");

    // 将当前按下的修饰键组合转换为匹配格式
    const matchCombo = this.convertModifierComboForMatching(modifierCombo);

    // 完全匹配
    if (keyModifierCombo === matchCombo) {
      // 确保快捷键有普通按键（不只是修饰键）
      return parsed.key.length > 0 && !["control", "alt", "shift", "meta"].includes(parsed.key);
    }

    return false;
  }

  /**
   * 获取所有匹配的快捷键
   */
  private getMatchingKeyBinds(modifierCombo: string): Array<{
    id: string;
    key: string;
    displayKey: string;
    title: string;
  }> {
    const result: Array<{
      id: string;
      key: string;
      displayKey: string;
      title: string;
    }> = [];

    // 从 KeyBindsUI 获取所有已注册的快捷键
    const allUIKeyBinds = KeyBindsUI.getAllUIKeyBinds();

    for (const keyBind of allKeyBinds) {
      // 跳过全局快捷键
      if (keyBind.isGlobal) continue;

      // 获取当前快捷键的配置
      const uiKeyBind = allUIKeyBinds.find((kb: any) => kb.id === keyBind.id);
      if (uiKeyBind && !uiKeyBind.isEnabled) continue;

      const key = uiKeyBind?.key || keyBind.defaultKey;

      // 检查是否匹配当前修饰键组合
      if (this.isKeyBindMatchModifier(key, modifierCombo)) {
        // 解析快捷键获取显示用的按键
        const parsed = parseSingleEmacsKey(key);
        const displayKey = this.formatKeyForDisplay(parsed.key);

        result.push({
          id: keyBind.id,
          key: key,
          displayKey: displayKey,
          title: this.getKeyBindTitle(keyBind.id),
        });
      }
    }

    return result;
  }

  /**
   * 格式化按键显示
   */
  private formatKeyForDisplay(key: string): string {
    // 特殊键映射
    const specialKeyMap: Record<string, string> = {
      arrowup: "↑",
      arrowdown: "↓",
      arrowleft: "←",
      arrowright: "→",
      enter: "↵",
      escape: "Esc",
      backspace: "⌫",
      delete: "Del",
      tab: "Tab",
      space: "Space",
      home: "Home",
      end: "End",
      pageup: "PgUp",
      pagedown: "PgDn",
    };

    if (key in specialKeyMap) {
      return specialKeyMap[key];
    }

    // 大写字母
    if (key.length === 1 && /[a-z]/.test(key)) {
      return key.toUpperCase();
    }

    return key;
  }

  /**
   * 获取快捷键标题
   */
  private getKeyBindTitle(id: string): string {
    // 这里可以后续从翻译文件中获取
    // 暂时返回简化版的标题
    const titleMap: Record<string, string> = {
      saveFile: "保存文件",
      openFile: "打开文件",
      newDraft: "新建草稿",
      undo: "撤销",
      redo: "重做",
      copy: "复制",
      paste: "粘贴",
      selectAll: "全选",
      deleteSelectedStageObjects: "删除",
      resetView: "重置视野",
      toggleFullscreen: "全屏切换",
      closeAllSubWindows: "关闭子窗口",
      searchText: "搜索",
      editEntityDetails: "编辑详情",
      createTextNodeFromCameraLocation: "创建节点",
      selectUp: "向上选择",
      selectDown: "向下选择",
      selectLeft: "向左选择",
      selectRight: "向右选择",
      moveUpSelectedEntities: "向上移动",
      moveDownSelectedEntities: "向下移动",
      moveLeftSelectedEntities: "向左移动",
      moveRightSelectedEntities: "向右移动",
      folderSection: "折叠/展开章节",
      packEntityToSection: "打包到章节",
      reverseEdges: "反向边",
      generateNodeTreeWithDeepMode: "深度生成节点",
      generateNodeTreeWithBroadMode: "广度生成节点",
      switchActiveProject: "切换项目",
      checkoutProtectPrivacy: "隐私模式",
      openColorPanel: "颜色面板",
      switchDebugShow: "调试显示",
      setWindowToMiniSize: "迷你窗口",
    };

    return titleMap[id] || id;
  }

  /**
   * 更新提示状态
   * 在主渲染循环中调用
   */
  update() {
    const modifierCombo = this.getCurrentModifierCombo();

    // 如果没有按下修饰键，重置状态
    if (!this.isOnlyModifiersPressed()) {
      // 检测是否有其他键被按下
      const pressingKeys = this.project.controller.pressingKeySet;
      if (pressingKeys.size > 0) {
        this.hasOtherKeyPressed = true;
      }

      // 如果之前有显示提示，现在松开了，标记为已松开
      if (this.isShowingHint) {
        this.hasModifierReleased = true;
      }

      this.isShowingHint = false;

      // 如果之前显示了提示，现在松开了，且有其他键被按下，则重置翻页计数器
      if (this.lastModifierCombo && this.hasOtherKeyPressed) {
        this.currentPage = 0;
        this.hasOtherKeyPressed = false;
        this.hasModifierReleased = false;
        this.currentModifierCombo = "";
      }

      this.lastModifierCombo = "";
      return;
    }

    // 只按下了修饰键
    this.isShowingHint = true;

    // 检测是否是新的修饰键按下事件
    if (modifierCombo !== this.lastModifierCombo) {
      // 如果是相同的修饰键组合再次按下（翻页）
      // 需要满足：
      // 1. 当前按下的组合和之前记录的组合相同
      // 2. 修饰键曾经松开过（hasModifierReleased为true）
      if (modifierCombo === this.currentModifierCombo && this.hasModifierReleased) {
        const totalPages = Math.ceil(this.cachedKeyBinds.length / this.ITEMS_PER_PAGE);
        // 翻到下一页，如果已经是最后一页则回到第一页
        this.currentPage = (this.currentPage + 1) % totalPages;
        this.hasModifierReleased = false;
      } else if (modifierCombo !== this.currentModifierCombo) {
        // 不同的修饰键组合，重置页码
        this.currentPage = 0;
        this.currentModifierCombo = modifierCombo;
        this.hasModifierReleased = false;
        // 重新获取匹配的快捷键
        this.cachedKeyBinds = this.getMatchingKeyBinds(modifierCombo);
      }
    }

    this.lastModifierCombo = modifierCombo;
  }

  /**
   * 渲染快捷键提示
   */
  render() {
    if (!this.isShowingHint || this.cachedKeyBinds.length === 0) {
      return;
    }

    const totalPages = Math.ceil(this.cachedKeyBinds.length / this.ITEMS_PER_PAGE);
    const actualPage = Math.min(this.currentPage, totalPages - 1);

    // 获取当前页的快捷键
    const startIndex = actualPage * this.ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + this.ITEMS_PER_PAGE, this.cachedKeyBinds.length);
    const pageItems = this.cachedKeyBinds.slice(startIndex, endIndex);

    // 计算起始位置（在左下角按键提示的上方）
    const margin = 10;
    const lineHeight = 28;
    const startY = this.project.renderer.h - 140 - pageItems.length * lineHeight;

    // 渲染背景
    const maxWidth = this.calculateMaxWidth(pageItems);
    const bgPadding = 8;
    const bgRect = new Rectangle(
      new Vector(margin - bgPadding, startY - bgPadding),
      new Vector(maxWidth + bgPadding * 2, pageItems.length * lineHeight + bgPadding * 2),
    );
    this.project.shapeRenderer.renderRect(
      bgRect,
      this.project.stageStyleManager.currentStyle.Background.toNewAlpha(0.9),
      this.project.stageStyleManager.currentStyle.StageObjectBorder.toNewAlpha(0.3),
      1,
    );

    // 渲染每个快捷键提示
    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i];
      const y = startY + i * lineHeight;

      // 渲染修饰键组合
      const modifierText = this.formatModifierCombo(this.currentModifierCombo);
      this.project.textRenderer.renderText(
        modifierText,
        new Vector(margin, y),
        14,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
      );

      const modifierWidth = getTextSize(modifierText, 14).x;

      // 渲染 + 号
      this.project.textRenderer.renderText(
        " + ",
        new Vector(margin + modifierWidth, y),
        14,
        this.project.stageStyleManager.currentStyle.effects.successShadow,
      );

      const plusWidth = getTextSize(" + ", 14).x;

      // 渲染按键
      this.project.textRenderer.renderText(
        item.displayKey,
        new Vector(margin + modifierWidth + plusWidth, y),
        16,
        this.project.stageStyleManager.currentStyle.effects.flash,
      );

      const keyWidth = getTextSize(item.displayKey, 16).x;

      // 渲染标题
      this.project.textRenderer.renderText(
        item.title,
        new Vector(margin + modifierWidth + plusWidth + keyWidth + 15, y + 2),
        12,
        this.project.stageStyleManager.currentStyle.DetailsDebugText,
      );
    }

    // 渲染页码指示器
    if (totalPages > 1) {
      const pageIndicator = `${actualPage + 1}/${totalPages}`;
      const indicatorWidth = getTextSize(pageIndicator, 12).x;
      this.project.textRenderer.renderText(
        pageIndicator,
        new Vector(margin + maxWidth - indicatorWidth, startY - 20),
        12,
        this.project.stageStyleManager.currentStyle.DetailsDebugText,
      );
    }
  }

  /**
   * 格式化修饰键组合显示
   */
  private formatModifierCombo(combo: string): string {
    if (!combo) return "";

    const parts = combo.split("-");
    const displayMap: Record<string, string> = {
      C: isMac ? "⌘" : "Ctrl",
      A: isMac ? "⌥" : "Alt",
      S: "⇧",
      M: isMac ? "⌃" : "Win",
    };

    return parts.map((p) => displayMap[p] || p).join("");
  }

  /**
   * 计算最大宽度
   */
  private calculateMaxWidth(items: Array<{ displayKey: string; title: string }>): number {
    let maxWidth = 0;
    const modifierWidth = getTextSize(this.formatModifierCombo(this.currentModifierCombo), 14).x;
    const plusWidth = getTextSize(" + ", 14).x;

    for (const item of items) {
      const keyWidth = getTextSize(item.displayKey, 16).x;
      const titleWidth = getTextSize(item.title, 12).x;
      const totalWidth = modifierWidth + plusWidth + keyWidth + 15 + titleWidth;
      maxWidth = Math.max(maxWidth, totalWidth);
    }

    return maxWidth;
  }
}
