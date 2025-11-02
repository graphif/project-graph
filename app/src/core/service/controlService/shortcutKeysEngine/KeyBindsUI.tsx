import { matchEmacsKeyPress, transEmacsKeyWinToMac } from "@/utils/emacs";
import { isMac } from "@/utils/platform";
import { createStore } from "@/utils/store";
import { Queue } from "@graphif/data-structures";
import { allKeyBinds } from "./shortcutKeysRegister";

/**
 * UI级别的快捷键管理
 */
export namespace KeyBindsUI {
  const userEventQueue = new Queue<KeyboardEvent | MouseEvent | WheelEvent>();

  function enqueue(event: MouseEvent | KeyboardEvent | WheelEvent) {
    // 队列里面最多20个（因为秘籍键长度最大20）
    while (userEventQueue.length >= 20) {
      userEventQueue.dequeue();
    }
    userEventQueue.enqueue(event);
  }

  let allUIKeyBinds: { id: string; key: string; onPress: () => void }[] = [];

  const registerSet = new Set<string>();

  /**
   * 注册所有UI级别的快捷键
   * 会先检查是否已经存下来了，如果已经存下来了，先注册存下来的
   * 否则再注册默认快捷键
   */
  export async function registerAllUIKeyBinds() {
    const store = await createStore("keybinds2.json");
    for (const keybind of allKeyBinds.filter((keybindItem) => keybindItem.isUI)) {
      const savedKey = await store.get<string>(keybind.id);
      if (!savedKey) {
        // 没有保存过，走默认设置
        let defaultKey = keybind.defaultKey;
        if (isMac) {
          defaultKey = transEmacsKeyWinToMac(defaultKey);
        }
        await store.set(keybind.id, defaultKey);
        KeyBindsUI.registerOneUIKeyBind(keybind.id, defaultKey, keybind.onPress);
      } else {
        // 已经保存过了，走保存值
        KeyBindsUI.registerOneUIKeyBind(keybind.id, savedKey, keybind.onPress);
      }
    }
    await store.save();
  }
  /**
   * 注册一个UI级别的快捷键
   * 只会在软件启动的时候注册一次
   * 其他情况下，只会在修改快捷键的时候进行重新修改值
   */
  export async function registerOneUIKeyBind(id: string, key: string, onPress = () => {}) {
    if (registerSet.has(id)) {
      // 防止开发时热更新重复注册
      console.warn(`UI Keybind ${id} 已经注册过了`);
      return;
    }
    registerSet.add(id);
    allUIKeyBinds.push({ id, key, onPress });
  }

  /**
   * 用于修改快捷键
   * @param id
   * @param key
   */
  export async function changeOneUIKeyBind(id: string, key: string) {
    allUIKeyBinds = allUIKeyBinds.map((it) => {
      if (it.id === id) {
        return { ...it, key };
      }
      return it;
    });

    const store = await createStore("keybinds2.json");
    await store.set(id, key);
    await store.save();
  }

  export function uiStartListen() {
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { passive: true });
  }

  export function uiStopListen() {
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("wheel", onWheel);
  }

  function check() {
    for (const uiKeyBind of allUIKeyBinds) {
      if (matchEmacsKeyPress(uiKeyBind.key, userEventQueue.arrayList)) {
        uiKeyBind.onPress();
        // 执行了快捷键之后，清空队列
        userEventQueue.clear();
      }
    }
  }

  function onMouseDown(event: MouseEvent) {
    enqueue(event);
    check();
  }
  function onKeyDown(event: KeyboardEvent) {
    if (["control", "alt", "shift", "meta"].includes(event.key.toLowerCase())) return;
    enqueue(event);
    check();
  }
  function onWheel(event: WheelEvent) {
    enqueue(event);
    check();
  }
}
