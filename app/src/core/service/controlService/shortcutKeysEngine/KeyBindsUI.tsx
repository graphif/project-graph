import {
  formatEmacsKey,
  matchEmacsKeyPress,
  parseSingleEmacsKey,
  transEmacsKeyWinToMac,
  transformedKeys,
} from "@/utils/emacs";
import { isMac } from "@/utils/platform";
import { createStore } from "@/utils/store";
import { Queue } from "@graphif/data-structures";
import { allKeyBinds } from "./shortcutKeysRegister";
import { activeTabAtom, store } from "@/state";
import { Project } from "@/core/Project";

export interface UIKeyBind {
  id: string;
  key: string;
  isEnabled: boolean;
  onPress: (project?: Project) => void;
  // 是否是持续型快捷键
  isContinuous?: boolean;
  onRelease?: (project?: Project) => void;
}
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

  let allUIKeyBinds: UIKeyBind[] = [];

  /**
   * 获取所有已注册的UI快捷键
   */
  export function getAllUIKeyBinds(): UIKeyBind[] {
    return allUIKeyBinds;
  }

  /**
   * 获取指定ID的快捷键
   */
  export function getUIKeyBind(id: string): UIKeyBind | undefined {
    return allUIKeyBinds.find((kb) => kb.id === id);
  }

  // 快捷键变化监听器
  const keyBindChangeListeners = new Map<string, Set<(keyBind: UIKeyBind) => void>>();

  /**
   * 监听指定快捷键的变化
   * @param id 快捷键ID
   * @param callback 回调函数
   * @returns 取消监听的函数
   */
  export function onKeyBindChange(id: string, callback: (keyBind: UIKeyBind) => void): () => void {
    if (!keyBindChangeListeners.has(id)) {
      keyBindChangeListeners.set(id, new Set());
    }
    keyBindChangeListeners.get(id)!.add(callback);

    // 立即返回当前值
    const currentKeyBind = getUIKeyBind(id);
    if (currentKeyBind) {
      callback(currentKeyBind);
    }

    return () => {
      keyBindChangeListeners.get(id)?.delete(callback);
    };
  }

  /**
   * 通知快捷键变化
   */
  function notifyKeyBindChange(id: string, keyBind: UIKeyBind) {
    const listeners = keyBindChangeListeners.get(id);
    if (listeners) {
      listeners.forEach((callback) => {
        callback(keyBind);
      });
    }
  }

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

      KeyBindsUI.registerOneUIKeyBind(
        keybind.id,
        key,
        isEnabled,
        keybind.onPress,
        keybind.onRelease,
        keybind.isContinuous,
      );
    }
    await store.save();
  }
  /**
   * 注册一个非全局快捷键
   * 只会在软件启动的时候注册一次
   * 其他情况下，只会在修改快捷键的时候进行重新修改值
   */
  export function registerOneUIKeyBind(
    id: string,
    key: string,
    isEnabled: boolean = true,
    onPress = () => {},
    onRelease?: () => void,
    isContinuous?: boolean,
  ) {
    if (registerSet.has(id)) {
      // 检查是否已经是同 ID 的快捷键，如果是，则更新它（用于扩展重新认领逻辑）
      const index = allUIKeyBinds.findIndex((kb) => kb.id === id);
      if (index !== -1) {
        allUIKeyBinds[index] = { id, key, isEnabled, onPress, onRelease, isContinuous };
        notifyKeyBindChange(id, allUIKeyBinds[index]);
        return;
      }
      console.warn(`Keybind ${id} 已经注册过了`);
      return;
    }
    registerSet.add(id);
    const keyBind: UIKeyBind = { id, key, isEnabled, onPress, onRelease, isContinuous };
    allUIKeyBinds.push(keyBind);

    // 通知监听器有新的快捷键注册
    notifyKeyBindChange(id, keyBind);
  }

  /**
   * 注销一个快捷键
   */
  export function unregisterOneUIKeyBind(id: string) {
    if (!registerSet.has(id)) return;
    registerSet.delete(id);
    allUIKeyBinds = allUIKeyBinds.filter((kb) => kb.id !== id);
    // 这里不需要特别通知，因为 UI 应该会随之消失或不再响应
  }

  /**
   * 用于修改快捷键
   * @param id
   * @param key
   */
  export async function changeOneUIKeyBind(id: string, key: string) {
    let updatedKeyBind: UIKeyBind | undefined;
    allUIKeyBinds = allUIKeyBinds.map((it) => {
      if (it.id === id) {
        updatedKeyBind = { ...it, key };
        return updatedKeyBind;
      }
      return it;
    });

    // 通知监听器快捷键已更改
    if (updatedKeyBind) {
      notifyKeyBindChange(id, updatedKeyBind);
    }

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
   * 重置所有快捷键为默认值（包括快捷键值和启用状态）
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

  /**
   * 仅重置所有快捷键的启用状态为默认值
   */
  export async function resetAllKeyBindsEnabledState() {
    const store = await createStore("keybinds2.json");

    // 遍历所有非全局快捷键
    for (const keybind of allKeyBinds.filter((keybindItem) => !keybindItem.isGlobal)) {
      const currentConfig = await store.get<any>(keybind.id);

      // 如果存在当前配置，只重置isEnabled字段，保留key字段
      if (currentConfig) {
        await store.set(keybind.id, {
          key: currentConfig.key,
          isEnabled: keybind.defaultEnabled !== false,
        });
      } else {
        // 如果不存在配置，使用默认值创建
        let defaultValue = keybind.defaultKey;
        if (isMac) {
          defaultValue = transEmacsKeyWinToMac(defaultValue);
        }
        await store.set(keybind.id, {
          key: defaultValue,
          isEnabled: keybind.defaultEnabled !== false,
        });
      }
    }

    await store.save();

    // 更新内存中的快捷键配置
    for (const uiKeyBind of allUIKeyBinds) {
      const keybind = allKeyBinds.find((kb) => kb.id === uiKeyBind.id);
      if (keybind) {
        uiKeyBind.isEnabled = keybind.defaultEnabled !== false;
      }
    }
  }

  /**
   * 仅重置所有快捷键的值为默认值，保留启用状态
   */
  export async function resetAllKeyBindsValues() {
    const store = await createStore("keybinds2.json");

    // 遍历所有非全局快捷键
    for (const keybind of allKeyBinds.filter((keybindItem) => !keybindItem.isGlobal)) {
      const currentConfig = await store.get<any>(keybind.id);

      // 应用Mac键位转换
      let defaultValue = keybind.defaultKey;
      if (isMac) {
        defaultValue = transEmacsKeyWinToMac(defaultValue);
      }

      // 如果存在当前配置，只重置key字段，保留isEnabled字段
      if (currentConfig) {
        await store.set(keybind.id, {
          key: defaultValue,
          isEnabled: currentConfig.isEnabled !== false,
        });
      } else {
        // 如果不存在配置，使用默认值创建
        await store.set(keybind.id, {
          key: defaultValue,
          isEnabled: keybind.defaultEnabled !== false,
        });
      }
    }

    await store.save();

    // 更新内存中的快捷键配置
    for (const uiKeyBind of allUIKeyBinds) {
      const keybind = allKeyBinds.find((kb) => kb.id === uiKeyBind.id);
      if (keybind) {
        let defaultValue = keybind.defaultKey;
        if (isMac) {
          defaultValue = transEmacsKeyWinToMac(defaultValue);
        }
        uiKeyBind.key = defaultValue;
      }
    }
  }

  // 跟踪当前按下的单键快捷键（序列型）
  const pressedSingleKeyBinds = new Set<string>();

  // 跟踪当前按下的持续型快捷键（存放 id，防止重复触发）
  const pressedContinuousKeyBindIds = new Set<string>();

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
    pressedContinuousKeyBindIds.clear();
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

  function check(): boolean {
    // 如果有文本输入元素获得焦点，不处理键盘事件
    if (!shouldProcessKeyboardEvent()) {
      // 清空队列，防止事件积累
      userEventQueue.clear();
      return false;
    }
    const tab = store.get(activeTabAtom);
    const activeProject = tab instanceof Project ? tab : undefined;
    let executed = false;
    for (const uiKeyBind of allUIKeyBinds) {
      // 如果快捷键未启用，跳过
      if (!uiKeyBind.isEnabled) {
        continue;
      }
      // 持续型快捷键不走序列匹配
      if (uiKeyBind.isContinuous) {
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
    return executed;
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

    const tab = store.get(activeTabAtom);
    const activeProject = tab instanceof Project ? tab : undefined;

    // ——持续型快捷键独立路径——
    let continuousExecuted = false;
    {
      const rawKey = event.key.toLowerCase();
      // 兼容中文输入法下的全角符号（如「【」→「[」）
      const pressedKey = rawKey in transformedKeys ? transformedKeys[rawKey as keyof typeof transformedKeys] : rawKey;
      for (const uiKeyBind of allUIKeyBinds) {
        if (!uiKeyBind.isContinuous) continue;
        if (!uiKeyBind.isEnabled) continue;
        // 解析快捷键字符串，同时比对裸键和修饰键
        const parsed = parseSingleEmacsKey(uiKeyBind.key);
        if (parsed.key !== pressedKey) continue;
        if (parsed.control !== event.ctrlKey) continue;
        if (parsed.alt !== event.altKey) continue;
        if (parsed.shift !== event.shiftKey) continue;
        if (parsed.meta !== event.metaKey) continue;
        // 防止 keydown 重复触发（按住时浏览器会持续发送 keydown 事件）
        if (pressedContinuousKeyBindIds.has(uiKeyBind.id)) continue;
        pressedContinuousKeyBindIds.add(uiKeyBind.id);
        uiKeyBind.onPress(activeProject);
        continuousExecuted = true;
      }
    }
    // 持续型路径处理后，不 return——序列型照常入队检测（两者不冲突）

    // ——序列型快捷键路径——
    enqueue(event);
    const sequenceExecuted = check();

    // 只要有快捷键被执行，就阻止浏览器默认行为（防止 Tab 跳焦点、方向键滚动页面等）
    if (continuousExecuted || sequenceExecuted) {
      event.preventDefault();
    }
  }
  function onKeyUp(event: KeyboardEvent) {
    // 如果有文本输入元素获得焦点，不处理键盘事件
    if (!isMac && !shouldProcessKeyboardEvent()) {
      return;
    }
    const tab = store.get(activeTabAtom);
    const activeProject = tab instanceof Project ? tab : undefined;
    const key = event.key;

    // ——持续型快捷键松开——
    // 只比对裸键（不检查修饰键），这样松开主键即可立即停止，无需等待修饰键松开
    const rawKeyUp = key.toLowerCase();
    // 兼容中文输入法下的全角符号（如「】」→「]」）
    const keyUpNormalized =
      rawKeyUp in transformedKeys ? transformedKeys[rawKeyUp as keyof typeof transformedKeys] : rawKeyUp;
    for (const uiKeyBind of allUIKeyBinds) {
      if (!uiKeyBind.isContinuous) continue;
      if (!uiKeyBind.isEnabled) continue;
      const parsed = parseSingleEmacsKey(uiKeyBind.key);
      if (parsed.key !== keyUpNormalized) continue;
      if (!pressedContinuousKeyBindIds.has(uiKeyBind.id)) continue;
      pressedContinuousKeyBindIds.delete(uiKeyBind.id);
      uiKeyBind.onRelease?.(activeProject);
    }

    // ——序列型快捷键松开——
    // 检查是否有对应的单键快捷键需要处理松开事件
    for (const uiKeyBind of allUIKeyBinds) {
      // 如果快捷键未启用，跳过
      if (!uiKeyBind.isEnabled) continue;
      if (uiKeyBind.isContinuous) continue;
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

  /**
   * 获取当前按键序列的字符串表示
   * 用于在debug模式下显示当前已按下的按键序列
   */
  export function getCurrentKeySequence(): string {
    if (userEventQueue.length === 0) {
      return "";
    }
    return userEventQueue.arrayList.map((event) => formatEmacsKey(event)).join(" ");
  }
}
