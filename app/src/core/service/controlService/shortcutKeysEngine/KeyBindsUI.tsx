import { matchEmacsKeyPress, transEmacsKeyWinToMac } from "@/utils/emacs";
import { isMac } from "@/utils/platform";
import { createStore } from "@/utils/store";
import { Queue } from "@graphif/data-structures";
import { allKeyBinds } from "./shortcutKeysRegister";
import { activeProjectAtom, store } from "@/state";
import { Project } from "@/core/Project";

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

  interface UIKeyBind {
    id: string;
    key: string;
    isEnabled: boolean;
    onPress: (project?: Project) => void;
    onRelease?: (project?: Project) => void;
  }

  let allUIKeyBinds: UIKeyBind[] = [];

  const registerSet = new Set<string>();

  /**
   * 注册所有非全局快捷键
   * 会先检查是否已经存下来了，如果已经存下来了，先注册存下来的
   * 否则再注册默认快捷键
   */
  export async function registerAllUIKeyBinds() {
    const store = await createStore("keybinds2.json");
    for (const keybind of allKeyBinds.filter((keybindItem) => !keybindItem.isGlobal)) {
      const savedData = await store.get<any>(keybind.id);
      let key: string;
      let isEnabled: boolean;

      if (!savedData) {
        // 没有保存过，走默认设置
        key = keybind.defaultKey;
        if (isMac) {
          key = transEmacsKeyWinToMac(key);
        }
        isEnabled = keybind.defaultEnabled !== false;
        await store.set(keybind.id, { key, isEnabled });
      } else if (typeof savedData === "string") {
        // 兼容旧数据结构
        key = savedData;
        isEnabled = keybind.defaultEnabled !== false;
        await store.set(keybind.id, { key, isEnabled });
      } else {
        // 已经保存过完整配置
        key = savedData.key;
        isEnabled = savedData.isEnabled !== false;
      }

      KeyBindsUI.registerOneUIKeyBind(keybind.id, key, isEnabled, keybind.onPress, keybind.onRelease);
    }
    await store.save();
  }
  /**
   * 注册一个非全局快捷键
   * 只会在软件启动的时候注册一次
   * 其他情况下，只会在修改快捷键的时候进行重新修改值
   */
  export async function registerOneUIKeyBind(
    id: string,
    key: string,
    isEnabled: boolean = true,
    onPress = () => {},
    onRelease?: () => void,
  ) {
    if (registerSet.has(id)) {
      // 防止开发时热更新重复注册
      console.warn(`Keybind ${id} 已经注册过了`);
      return;
    }
    registerSet.add(id);
    allUIKeyBinds.push({ id, key, isEnabled, onPress, onRelease });
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
    const currentConfig = await store.get<any>(id);
    await store.set(id, {
      key,
      isEnabled: currentConfig?.isEnabled !== false,
    });
    await store.save();
  }

  /**
   * 用于切换快捷键启用状态
   * @param id
   * @returns 新的启用状态
   */
  export async function toggleEnabled(id: string): Promise<boolean> {
    let newEnabledState = true;

    allUIKeyBinds = allUIKeyBinds.map((it) => {
      if (it.id === id) {
        newEnabledState = !it.isEnabled;
        return { ...it, isEnabled: newEnabledState };
      }
      return it;
    });

    const store = await createStore("keybinds2.json");
    const currentConfig = await store.get<any>(id);
    const keybind = allKeyBinds.find((kb) => kb.id === id);
    await store.set(id, {
      key: currentConfig?.key || keybind?.defaultKey || "",
      isEnabled: newEnabledState,
    });
    await store.save();

    return newEnabledState;
  }

  /**
   * 重置所有快捷键为默认值
   */
  export async function resetAllKeyBinds() {
    const store = await createStore("keybinds2.json");
    // 清空存储
    await store.clear();
    // 清空已注册的快捷键
    registerSet.clear();
    allUIKeyBinds = [];
    // 重新注册所有快捷键
    await registerAllUIKeyBinds();
  }

  // 跟踪当前按下的单键快捷键
  const pressedSingleKeyBinds = new Set<string>();

  export function uiStartListen() {
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("wheel", onWheel, { passive: true });
  }

  export function uiStopListen() {
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("wheel", onWheel);
    pressedSingleKeyBinds.clear();
  }

  /**
   * 检查是否应该处理键盘事件
   * 当有文本输入元素获得焦点时，不处理键盘事件
   */
  function shouldProcessKeyboardEvent() {
    return !(
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA" ||
      document.activeElement?.getAttribute("contenteditable") === "true"
    );
  }

  function check() {
    // 如果有文本输入元素获得焦点，不处理键盘事件
    if (!shouldProcessKeyboardEvent()) {
      // 清空队列，防止事件积累
      userEventQueue.clear();
      return;
    }
    const activeProject = store.get(activeProjectAtom);
    let executed = false;
    for (const uiKeyBind of allUIKeyBinds) {
      // 如果快捷键未启用，跳过
      if (!uiKeyBind.isEnabled) {
        continue;
      }
      if (matchEmacsKeyPress(uiKeyBind.key, userEventQueue.arrayList)) {
        uiKeyBind.onPress(activeProject);
        // 如果是单键快捷键且有onRelease回调，记录为已按下状态
        if (uiKeyBind.onRelease && uiKeyBind.key.length === 1) {
          pressedSingleKeyBinds.add(uiKeyBind.key);
        }
        executed = true;
      }
    }
    // 执行了快捷键之后，清空队列
    if (executed) {
      userEventQueue.clear();
    }
  }

  function onMouseDown(event: MouseEvent) {
    enqueue(event);
    check();
  }
  function onKeyDown(event: KeyboardEvent) {
    // 如果有文本输入元素获得焦点，不处理键盘事件
    if (!shouldProcessKeyboardEvent()) {
      // 清空队列，防止事件积累
      userEventQueue.clear();
      return;
    }
    if (["control", "alt", "shift", "meta"].includes(event.key.toLowerCase())) return;
    enqueue(event);
    check();
  }
  function onKeyUp(event: KeyboardEvent) {
    // 如果有文本输入元素获得焦点，不处理键盘事件
    if (!shouldProcessKeyboardEvent()) {
      return;
    }
    const activeProject = store.get(activeProjectAtom);
    const key = event.key;

    // 检查是否有对应的单键快捷键需要处理松开事件
    for (const uiKeyBind of allUIKeyBinds) {
      // 如果快捷键未启用，跳过
      if (!uiKeyBind.isEnabled) {
        continue;
      }
      if (uiKeyBind.onRelease && uiKeyBind.key === key && pressedSingleKeyBinds.has(key)) {
        uiKeyBind.onRelease(activeProject);
        pressedSingleKeyBinds.delete(key);
      }
    }
  }
  function onWheel(event: WheelEvent) {
    enqueue(event);
    check();
  }
}
