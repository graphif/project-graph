import { isLinux, isMac, isWindows } from "@/utils/platform";
import { parseEmacsKey, parseSingleEmacsKey } from "@/utils/emacs";

/**
 * 修饰键显示信息
 */
export interface ModifierDisplayInfo {
  control: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

/**
 * 获取修饰键的显示文本数组
 * @param modifiers 修饰键信息
 * @returns 修饰键显示文本数组
 */
export function getModifierDisplayTexts(modifiers: ModifierDisplayInfo): string[] {
  const mods: string[] = [];

  if (modifiers.control) {
    if (isMac) {
      mods.push("⌃");
    } else if (isWindows || isLinux) {
      mods.push("Ctrl");
    } else {
      mods.push("control");
    }
  }
  if (modifiers.alt) {
    if (isMac) {
      mods.push("⌥");
    } else if (isWindows || isLinux) {
      mods.push("Alt");
    } else {
      mods.push("alt");
    }
  }
  if (modifiers.shift) {
    if (isMac) {
      mods.push("⇧");
    } else if (isWindows || isLinux) {
      mods.push("Shift");
    } else {
      mods.push("shift");
    }
  }
  if (modifiers.meta) {
    if (isMac) {
      mods.push("⌘");
    } else if (isWindows) {
      mods.push("❖");
    } else if (isLinux) {
      mods.push("Super");
    } else {
      mods.push("meta");
    }
  }

  return mods;
}

/**
 * 格式化按键显示
 * @param signalKey 按键字符串（如 "arrowup", "enter", "f"）
 * @returns 格式化后的按键显示
 */
export function formatSigalKeyForDisplay(signalKey: string): string {
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

  if (signalKey in specialKeyMap) {
    return specialKeyMap[signalKey];
  }

  // 鼠标按键
  if (signalKey.startsWith("<") && signalKey.endsWith(">")) {
    const button = signalKey.slice(1, -1);
    if (button === "MWU") return "滚轮上";
    if (button === "MWD") return "滚轮下";
    return `鼠标${button}`;
  }

  // 普通按键直接返回
  return signalKey;
}

/**
 * 格式化单个快捷键（emacs格式）为显示文本
 * @param emacsKey emacs格式的快捷键（如 "C-s", "A-S-f"）
 * @returns 格式化后的显示文本数组 [修饰键数组, 按键]
 */
export function formatSingleKeyBind(emacsKey: string): { modifiers: string[]; key: string } {
  const parsed = parseSingleEmacsKey(emacsKey);
  const modifiers = getModifierDisplayTexts(parsed);
  const key = formatSigalKeyForDisplay(parsed.key);
  return { modifiers, key };
}

/**
 * 格式化快捷键序列（emacs格式）为显示文本
 * @param emacsKey emacs格式的快捷键序列（如 "C-s C-t"）
 * @returns 格式化后的显示文本数组
 */
export function formatKeyBindSequence(emacsKey: string): Array<{ modifiers: string[]; key: string }> {
  if (!emacsKey.trim()) return [];
  const parsed = parseEmacsKey(emacsKey.trim());
  return parsed.map((item) => ({
    modifiers: getModifierDisplayTexts(item),
    key: formatSigalKeyForDisplay(item.key),
  }));
}

/**
 * 将快捷键格式化为字符串（用于简单显示）
 * @param emacsKey emacs格式的快捷键
 * @param separator 分隔符，默认为 " + "
 * @returns 格式化后的字符串
 */
export function formatKeyBindToString(emacsKey: string, separator: string = " + "): string {
  const formatted = formatSingleKeyBind(emacsKey);
  if (formatted.modifiers.length === 0) {
    return formatted.key;
  }
  return [...formatted.modifiers, formatted.key].join(separator);
}

/**
 * 将快捷键序列格式化为字符串
 * @param emacsKey emacs格式的快捷键序列
 * @param keySeparator 按键内部分隔符，默认为 " + "
 * @param sequenceSeparator 序列分隔符，默认为 ", "
 * @returns 格式化后的字符串
 */
export function formatKeyBindSequenceToString(
  emacsKey: string,
  keySeparator: string = " + ",
  sequenceSeparator: string = ", ",
): string {
  const formatted = formatKeyBindSequence(emacsKey);
  return formatted
    .map((item) => {
      if (item.modifiers.length === 0) {
        return item.key;
      }
      return [...item.modifiers, item.key].join(keySeparator);
    })
    .join(sequenceSeparator);
}
