import { transEmacsKeyWinToMac } from "@/utils/emacs";
import { isMac } from "@/utils/platform";
import { createStore } from "@/platform/store";
import { KeyBindsUI, type KeyBindIcon } from "../service/controlService/shortcutKeysEngine/KeyBindsUI";

export interface ExtensionKeyBindRegisterOptions {
  id: string;
  defaultKey: string;
  onPress: () => void;
  onRelease?: () => void;
  isContinuous?: boolean;
  icon?: KeyBindIcon;
}

/**
 * 专门管理扩展注入的快捷键
 */
export namespace ExtensionKeyBindManager {
  /**
   * 注册扩展快捷键
   * @param extensionId 扩展ID
   * @param options 快捷键注册选项
   */
  export async function register(extensionId: string, options: ExtensionKeyBindRegisterOptions) {
    const fullId = `ext:${extensionId}:${options.id}`;
    const store = await createStore("keybinds2.json");

    // 尝试从存储中获取用户配置
    const savedData = await store.get<any>(fullId);
    let key: string;
    let isEnabled: boolean;

    if (!savedData) {
      key = isMac ? transEmacsKeyWinToMac(options.defaultKey) : options.defaultKey;
      isEnabled = true;
      // 首次注册保存到配置中，这样设置页面就能看到了
      await store.set(fullId, { key, isEnabled });
      await store.save();
    } else {
      key = savedData.key;
      isEnabled = savedData.isEnabled !== false;
    }

    KeyBindsUI.registerOneUIKeyBind(
      fullId,
      key,
      isEnabled,
      options.onPress,
      options.onRelease,
      options.isContinuous,
      undefined,
      options.icon,
    );
  }

  /**
   * 注销某个扩展的所有快捷键
   * 通常在扩展禁用或卸载时调用
   */
  export function unregisterAll(extensionId: string) {
    const prefix = `ext:${extensionId}:`;
    const allBinds = KeyBindsUI.getAllUIKeyBinds();
    for (const kb of allBinds) {
      if (kb.id.startsWith(prefix)) {
        KeyBindsUI.unregisterOneUIKeyBind(kb.id);
      }
    }
  }
}
