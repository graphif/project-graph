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

  let allUIKeyBinds: {
    id: string;
    key: string;
    onPress: (project?: Project) => void;
    onRelease?: (project?: Project) => void;
  }[] = [];

  const registerSet = new Set<string>();

  /**
   * 注册所有非全局快捷键
   * 会先检查是否已经存下来了，如果已经存下来了，先注册存下来的
   * 否则再注册默认快捷键
   */
  export async function registerAllUIKeyBinds() {
    const store = await createStore("keybinds2.json");
    for (const keybind of allKeyBinds.filter((keybindItem) => !keybindItem.isGlobal)) {
      const savedKey = await store.get<string>(keybind.id);
      if (!savedKey) {
        // 没有保存过，走默认设置
        let defaultKey = keybind.defaultKey;
        if (isMac) {
          defaultKey = transEmacsKeyWinToMac(defaultKey);
        }
        await store.set(keybind.id, defaultKey);
        KeyBindsUI.registerOneUIKeyBind(keybind.id, defaultKey, keybind.onPress, keybind.onRelease);
      } else {
        // 已经保存过了，走保存值
        KeyBindsUI.registerOneUIKeyBind(keybind.id, savedKey, keybind.onPress, keybind.onRelease);
      }
    }
    await store.save();
  }
  /**
   * 注册一个非全局快捷键
   * 只会在软件启动的时候注册一次
   * 其他情况下，只会在修改快捷键的时候进行重新修改值
   */
  export async function registerOneUIKeyBind(id: string, key: string, onPress = () => {}, onRelease?: () => void) {
    if (registerSet.has(id)) {
      // 防止开发时热更新重复注册
      console.warn(`Keybind ${id} 已经注册过了`);
      return;
    }
    registerSet.add(id);
    allUIKeyBinds.push({ id, key, onPress, onRelease });
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

  function check() {
    const activeProject = store.get(activeProjectAtom);
    let executed = false;
    for (const uiKeyBind of allUIKeyBinds) {
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
    if (["control", "alt", "shift", "meta"].includes(event.key.toLowerCase())) return;
    enqueue(event);
    check();
  }
  function onKeyUp(event: KeyboardEvent) {
    const activeProject = store.get(activeProjectAtom);
    const key = event.key;

    // 检查是否有对应的单键快捷键需要处理松开事件
    for (const uiKeyBind of allUIKeyBinds) {
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
