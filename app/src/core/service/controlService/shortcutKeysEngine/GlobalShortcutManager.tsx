import { register, unregisterAll, isRegistered, unregister } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Settings } from "../../Settings";
import { toast } from "sonner";

// 定义全局快捷键类型
interface GlobalShortcut {
  key: string;
  id: string;
  description: string;
  onPress: () => Promise<void>;
}

export class GlobalShortcutManager {
  private shortcuts: GlobalShortcut[] = [];
  private isInitialized = false;
  private isClickThroughEnabled = false;
  private settingsUnsubscribe: (() => void) | null = null;

  constructor() {
    this.initializeShortcuts();
  }

  // 初始化快捷键定义
  private initializeShortcuts() {
    this.shortcuts = [
      {
        key: "Alt+2",
        id: "toggle-click-through",
        description: "开启/关闭窗口穿透点击",
        onPress: this.handleToggleClickThrough.bind(this),
      },
      {
        key: "Alt+1",
        id: "show-window",
        description: "呼出软件窗口",
        onPress: this.handleShowWindow.bind(this),
      },
    ];
  }

  // 初始化服务
  public async init() {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    Settings.watch("allowGlobalHotKeys", (v) => {
      // v 是变化后的值
      if (v) {
        this.updateShortcuts();
      } else {
        unregisterAll();
      }
    });
  }

  // 更新快捷键注册状态
  public async updateShortcuts() {
    // 先注销所有快捷键
    await unregisterAll();
    for (const shortcut of this.shortcuts) {
      await this.registerShortcut(shortcut);
    }
  }

  // 注册单个快捷键
  private async registerShortcut(shortcut: GlobalShortcut) {
    try {
      // 检查是否已注册
      const alreadyRegistered = await isRegistered(shortcut.key);
      if (alreadyRegistered) {
        await unregister(shortcut.key);
      }

      // 注册快捷键
      await register(shortcut.key, async (event) => {
        if (event.state === "Pressed") {
          await shortcut.onPress();
        }
      });
    } catch (error) {
      toast.error(`注册全局快捷键 ${shortcut.key} 失败: ${error}`);
    }
  }

  // 处理穿透点击切换
  private async handleToggleClickThrough() {
    const window = getCurrentWindow();

    if (!this.isClickThroughEnabled) {
      // 开启了穿透点击
      Settings.windowBackgroundAlpha = Settings.windowBackgroundOpacityAfterOpenClickThrough;
      await window.setAlwaysOnTop(true);
    } else {
      // 关闭了穿透点击
      Settings.windowBackgroundAlpha = Settings.windowBackgroundOpacityAfterCloseClickThrough;
      await window.setAlwaysOnTop(false);
    }

    this.isClickThroughEnabled = !this.isClickThroughEnabled;
    await window.setIgnoreCursorEvents(this.isClickThroughEnabled);
  }

  // 处理显示窗口
  private async handleShowWindow() {
    console.log("开始呼出窗口");
    const window = getCurrentWindow();
    await window.show();
    await window.setSkipTaskbar(false);
    await window.setFocus();
  }

  // 清理资源
  public async dispose() {
    // 注销所有快捷键
    await unregisterAll();

    // 移除设置监听器
    if (this.settingsUnsubscribe) {
      this.settingsUnsubscribe();
      this.settingsUnsubscribe = null;
    }

    this.isInitialized = false;
    console.log("全局快捷键管理器已清理");
  }

  // 获取所有快捷键信息
  public getShortcuts() {
    return this.shortcuts;
  }
}

// 创建单例实例
export const globalShortcutManager = new GlobalShortcutManager();
