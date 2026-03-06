import { createStore } from "@/utils/store";
import { allKeyBinds } from "./shortcutKeysRegister";
import { isMac } from "@/utils/platform";
import { Dialog } from "@/components/ui/dialog";

/**
 * 修复F11快捷键：如果toggleFullscreen快捷键被设置为单独的F11，则自动添加Ctrl修饰键
 * 这是为了避免系统级F11快捷键冲突导致软件无法使用
 * 主要用于修复老用户的缓存问题，在软件启动时调用一次
 */
export async function fixF11ShortcutInStorage(): Promise<void> {
  const store = await createStore("keybinds2.json");

  // 查找toggleFullscreen快捷键的定义
  const toggleFullscreenKeybind = allKeyBinds.find((kb) => kb.id === "toggleFullscreen");
  if (!toggleFullscreenKeybind) {
    // 未找到toggleFullscreen快捷键定义
    return;
  }

  const savedData = await store.get<any>("toggleFullscreen");
  if (!savedData) {
    // 没有保存过配置，不需要修复
    return;
  }

  let key: string;
  let isEnabled: boolean;
  let needsUpdate = false;

  if (typeof savedData === "string") {
    // 兼容旧数据结构
    key = savedData;
    isEnabled = toggleFullscreenKeybind.defaultEnabled !== false;
    needsUpdate = true;
  } else {
    // 新数据结构
    key = savedData.key;
    isEnabled = savedData.isEnabled !== false;
  }

  // 检查是否为单独的F11（不区分大小写）
  const normalizedKey = key.toLowerCase();
  if (normalizedKey === "f11") {
    // 根据平台添加正确的修饰键
    key = isMac ? "M-F11" : "C-F11";
    needsUpdate = true;
  }

  // 如果需要更新，保存修正后的配置
  if (needsUpdate) {
    await store.set("toggleFullscreen", { key, isEnabled });
    await store.save();
    await Dialog.buttons(
      "检测到存在引起bug的快捷键F11（全屏）",
      `全屏快捷键已自动修复为：${key}。\n\nBug现象：使用鼠标中键拖动视野时，会频繁触发全屏和取消全屏的操作，影响正常使用。\n\n请重启软件生效。`,
      [{ id: "close", label: "了解，稍后关闭", variant: "ghost" }],
    );
  }
}

/**
 * 检查并修复所有快捷键配置中的问题
 * 目前只修复F11快捷键问题
 */
export async function checkAndFixShortcutStorage(): Promise<void> {
  await fixF11ShortcutInStorage();
}
