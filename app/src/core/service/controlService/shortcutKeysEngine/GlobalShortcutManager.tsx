import { getCurrentWindow } from "@tauri-apps/api/window";
import { isRegistered, register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { BringToFront, MousePointerBan } from "lucide-react";
import { toast } from "sonner";
import { createStore } from "@/utils/store";
import { Settings } from "../../Settings";
import type { KeyBindIcon } from "./KeyBindsUI";

export interface GlobalShortcutInfo {
  id: string;
  title: string;
  description: string;
  icon: KeyBindIcon;
  defaultKey: string;
  key: string;
  isEnabled: boolean;
}

interface GlobalShortcut extends GlobalShortcutInfo {
  onPress: () => Promise<void>;
}

interface StoredGlobalShortcut {
  key: string;
  isEnabled: boolean;
}

const STORE_NAME = "global-keybinds.json";

export class GlobalShortcutManager {
  private shortcuts: GlobalShortcut[];
  private initialization: Promise<void> | null = null;
  private registeredKeys = new Set<string>();
  private isClickThroughEnabled = false;
  private isRecording = false;

  constructor() {
    this.shortcuts = [
      {
        id: "show-window",
        title: "呼出软件窗口",
        description: "在软件处于后台或最小化时显示并聚焦主窗口。",
        icon: BringToFront,
        defaultKey: "Alt+Digit1",
        key: "Alt+Digit1",
        isEnabled: false,
        onPress: this.handleShowWindow.bind(this),
      },
      {
        id: "toggle-click-through",
        title: "切换窗口穿透点击",
        description: "开启或关闭窗口穿透点击，并同步调整窗口透明度。",
        icon: MousePointerBan,
        defaultKey: "Alt+Digit2",
        key: "Alt+Digit2",
        isEnabled: false,
        onPress: this.handleToggleClickThrough.bind(this),
      },
    ];
  }

  public init(): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.initialize().catch((error) => {
        this.initialization = null;
        throw error;
      });
    }
    return this.initialization;
  }

  private async initialize() {
    const store = await createStore(STORE_NAME);
    let needsSave = false;

    for (const shortcut of this.shortcuts) {
      const saved = await store.get<StoredGlobalShortcut>(shortcut.id);
      if (saved && typeof saved.key === "string" && typeof saved.isEnabled === "boolean") {
        shortcut.key = saved.key;
        shortcut.isEnabled = saved.isEnabled;
      } else {
        await store.set(shortcut.id, this.toStoredShortcut(shortcut));
        needsSave = true;
      }
    }

    if (needsSave) {
      await store.save();
    }

    for (const shortcut of this.shortcuts.filter((item) => item.isEnabled)) {
      try {
        await this.registerShortcut(shortcut);
      } catch (error) {
        shortcut.isEnabled = false;
        await this.saveShortcut(shortcut);
        toast.error(error instanceof Error ? error.message : String(error));
      }
    }
  }

  public getShortcuts(): GlobalShortcutInfo[] {
    return this.shortcuts.map((shortcut) => ({
      id: shortcut.id,
      title: shortcut.title,
      description: shortcut.description,
      icon: shortcut.icon,
      defaultKey: shortcut.defaultKey,
      key: shortcut.key,
      isEnabled: shortcut.isEnabled,
    }));
  }

  public setRecording(isRecording: boolean) {
    this.isRecording = isRecording;
  }

  public async setShortcutKey(id: string, key: string) {
    await this.init();
    const shortcut = this.getShortcut(id);
    if (shortcut.key === key) return;
    if (this.shortcuts.some((item) => item.id !== id && item.key.toLowerCase() === key.toLowerCase())) {
      throw new Error("该组合键已被另一个全局快捷键使用");
    }

    const oldKey = shortcut.key;
    if (shortcut.isEnabled) {
      await this.unregisterShortcut(oldKey);
      try {
        await this.registerShortcut({ ...shortcut, key });
      } catch (error) {
        await this.registerShortcut(shortcut);
        throw error;
      }
    }

    shortcut.key = key;
    try {
      await this.saveShortcut(shortcut);
    } catch (error) {
      shortcut.key = oldKey;
      if (shortcut.isEnabled) {
        await this.unregisterShortcut(key);
        await this.registerShortcut(shortcut);
      }
      throw error;
    }
  }

  public async setShortcutEnabled(id: string, isEnabled: boolean) {
    await this.init();
    const shortcut = this.getShortcut(id);
    if (shortcut.isEnabled === isEnabled) return;

    if (isEnabled) {
      await this.registerShortcut(shortcut);
    } else {
      await this.unregisterShortcut(shortcut.key);
    }

    shortcut.isEnabled = isEnabled;
    try {
      await this.saveShortcut(shortcut);
    } catch (error) {
      shortcut.isEnabled = !isEnabled;
      if (isEnabled) {
        await this.unregisterShortcut(shortcut.key);
      } else {
        await this.registerShortcut(shortcut);
      }
      throw error;
    }
  }

  private getShortcut(id: string) {
    const shortcut = this.shortcuts.find((item) => item.id === id);
    if (!shortcut) {
      throw new Error(`不存在全局快捷键：${id}`);
    }
    return shortcut;
  }

  private async saveShortcut(shortcut: GlobalShortcut) {
    const store = await createStore(STORE_NAME);
    await store.set(shortcut.id, this.toStoredShortcut(shortcut));
    await store.save();
  }

  private toStoredShortcut(shortcut: GlobalShortcut): StoredGlobalShortcut {
    return { key: shortcut.key, isEnabled: shortcut.isEnabled };
  }

  private async registerShortcut(shortcut: GlobalShortcut) {
    try {
      await register(shortcut.key, async (event) => {
        if (event.state === "Pressed" && !this.isRecording) {
          await shortcut.onPress();
        }
      });
      if (!(await isRegistered(shortcut.key))) {
        await unregister(shortcut.key);
        throw new Error("操作系统未确认注册成功");
      }
      this.registeredKeys.add(shortcut.key);
    } catch (error) {
      throw new Error(this.getRegistrationErrorMessage(shortcut.key, error), { cause: error });
    }
  }

  private async unregisterShortcut(key: string) {
    if (!this.registeredKeys.has(key)) return;
    await unregister(key);
    this.registeredKeys.delete(key);
  }

  private getRegistrationErrorMessage(key: string, error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    return `注册全局快捷键 ${key} 失败：${detail}`;
  }

  private async handleToggleClickThrough() {
    const window = getCurrentWindow();

    if (!this.isClickThroughEnabled) {
      Settings.windowBackgroundAlpha = Settings.windowBackgroundOpacityAfterOpenClickThrough;
      await window.setAlwaysOnTop(true);
    } else {
      Settings.windowBackgroundAlpha = Settings.windowBackgroundOpacityAfterCloseClickThrough;
      await window.setAlwaysOnTop(false);
    }

    this.isClickThroughEnabled = !this.isClickThroughEnabled;
    await window.setIgnoreCursorEvents(this.isClickThroughEnabled);
  }

  private async handleShowWindow() {
    const window = getCurrentWindow();
    await window.unminimize();
    await window.show();
    await window.setSkipTaskbar(false);
    await window.setFocus();
  }

  public async dispose() {
    for (const key of [...this.registeredKeys]) {
      await this.unregisterShortcut(key);
    }
    this.isRecording = false;
    this.initialization = null;
  }
}

export const globalShortcutManager = new GlobalShortcutManager();
