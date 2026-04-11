import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { allKeyBinds } from "./shortcutKeysRegister";
import { parseEmacsKey, parseSingleEmacsKey } from "@/utils/emacs";
import { isMac } from "@/utils/platform";
import { Vector } from "@graphif/data-structures";
import { getTextSize } from "@/utils/font";
import { KeyBindsUI, type UIKeyBind } from "./KeyBindsUI";
import { formatKeyBindSequenceToString } from "@/utils/keyDisplay";
import i18next from "i18next";

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
    const parsedList = parseEmacsKey(key);

    // 构建快捷键的修饰键组合（存储格式）
    const keyModifiers: string[] = [];
    if (parsedList.some((p) => p.control)) keyModifiers.push("C");
    if (parsedList.some((p) => p.alt)) keyModifiers.push("A");
    if (parsedList.some((p) => p.shift)) keyModifiers.push("S");
    if (parsedList.some((p) => p.meta)) keyModifiers.push("M");

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
   * O(N)
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
      const uiKeyBind = allUIKeyBinds.find((kb: UIKeyBind) => kb.id === keyBind.id);
      if (uiKeyBind && !uiKeyBind.isEnabled) continue;

      const key = uiKeyBind?.key || keyBind.defaultKey;

      // 检查是否匹配当前修饰键组合
      if (this.isKeyBindMatchModifier(key, modifierCombo)) {
        // 使用复用的函数格式化按键显示
        const displayKey = formatKeyBindSequenceToString(key);

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
   * 获取快捷键标题
   * 从 i18n 翻译文件中读取
   */
  private getKeyBindTitle(id: string): string {
    // 使用 i18next 直接从翻译文件读取
    const translation = i18next.t(`${id}.title`, { ns: "keyBinds", defaultValue: "" });
    return translation || id;
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
    if (!Settings.showKeyBindHint || !this.isShowingHint || this.cachedKeyBinds.length === 0) {
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

    // 渲染每个快捷键提示
    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i];
      const y = startY + i * lineHeight;

      // 使用复用的函数格式化修饰键组合
      let currentX = margin;

      // 渲染按键
      this.project.textRenderer.renderText(
        item.displayKey,
        new Vector(currentX, y),
        16,
        this.project.stageStyleManager.currentStyle.effects.flash,
      );
      currentX += getTextSize(item.displayKey, 16).x;

      // 渲染标题
      this.project.textRenderer.renderText(
        item.title,
        new Vector(currentX + 15, y + 2),
        12,
        this.project.stageStyleManager.currentStyle.DetailsDebugText,
      );
    }

    // 渲染页码指示器
    if (totalPages > 1) {
      const pageIndicator = `${actualPage + 1}/${totalPages}`;
      this.project.textRenderer.renderText(
        pageIndicator,
        new Vector(margin, startY - 20),
        12,
        this.project.stageStyleManager.currentStyle.DetailsDebugText,
      );
    }
  }
}
