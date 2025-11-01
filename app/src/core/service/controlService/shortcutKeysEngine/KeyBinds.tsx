import { Project } from "@/core/Project";
import { activeProjectAtom, store } from "@/state";
import { matchEmacsKey } from "@/utils/emacs";
import { isMac } from "@/utils/platform";
import { createStore } from "@/utils/store";
import { Queue } from "@graphif/data-structures";
import { Store } from "@tauri-apps/plugin-store";
import { AdditionalOperation, apply, RulesLogic } from "json-logic-js";
import { KeyBindsRegistrar } from "./shortcutKeysRegister";

/**
 * 用于管理快捷键绑定
 */
export namespace KeyBinds {
  let store: Store | null = null;

  export async function init() {
    store = await createStore("keybinds2.json");
    if ((await store.values()).find((it) => typeof it !== "string")) {
      // 重置store
      await store.clear();
    }
    setTimeout(async () => {
      await KeyBindsRegistrar.registerKeyBinds();
    }, 0);
  }

  export async function set(id: string, key: string) {
    if (!store) {
      throw new Error("Store not initialized.");
    }
    await store.set(id, key);
    if (callbacks[id]) {
      callbacks[id].forEach((callback) => callback(key));
    }
  }

  /**
   * 获取曾经设置过的快捷键 按法
   * @param id
   * @returns
   */
  export async function get(id: string): Promise<string | null> {
    if (!store) {
      throw new Error("Store not initialized.");
    }
    const data = await store.get<string>(id);
    return data || null;
  }

  /**
   * 让某一个快捷键开始监听
   * @param id
   * @param callback
   * @returns
   */
  export function watch(key: string, callback: (value: string) => void) {
    if (!callbacks[key]) {
      callbacks[key] = [];
    }
    callbacks[key].push(callback);
    if (store) {
      get(key).then((value) => {
        if (!value) return;
        callback(value);
      });
    }
    return () => {
      callbacks[key] = callbacks[key].filter((cb) => cb !== callback);
    };
  }

  let callbacks: {
    [key: string]: Array<(value: any) => void>;
  } = {};

  /**
   * 获取所有快捷键绑定
   * @returns
   */
  export async function entries() {
    if (!store) {
      throw new Error("Keybind Store not initialized.");
    }
    return await store.entries<string>();
  }

  // 仅用于初始化软件时注册快捷键
  export const registeredIdSet: Set<string> = new Set();
  export const binds: Set<_Bind> = new Set();

  /**
   * 注册快捷键，注意：Mac会自动将此进行替换
   * @param id 确保唯一的描述性字符串
   * @param defaultKey 例如 "C-A-S-t" 表示 Ctrl+Alt+Shift+t，如果是mac，会自动将C-和M-互换！！
   * @param onPress 按下后的执行函数
   * @returns
   */
  export async function create(
    id: string,
    defaultKey: string,
    rule: RulesLogic<AdditionalOperation> = true,
    onPress = (_project: Project) => {},
  ): Promise<_Bind> {
    if (registeredIdSet.has(id)) {
      throw new Error(`Keybind ${id} 已经注册过了`);
    }
    if (isMac) {
      defaultKey = defaultKey.replace("C-", "Control-");
      defaultKey = defaultKey.replace("M-", "C-");
      defaultKey = defaultKey.replace("Control-", "M-");
    }
    registeredIdSet.add(id);
    let userSetKey = await get(id);
    if (!userSetKey) {
      // 注册新的快捷键
      await set(id, defaultKey);
      userSetKey = defaultKey;
    }
    const obj = new _Bind(id, userSetKey, rule, onPress);
    // 将绑定对象添加到集合中，以便后续清理
    binds.add(obj);
    // 监听快捷键变化
    watch(id, (value) => {
      obj.key = value;
    });
    return obj;
  }

  export function dispose() {
    binds.forEach((bind) => bind.dispose());
    binds.clear();
    registeredIdSet.clear();
    callbacks = {};
  }

  /**
   * 重置所有快捷键为默认值
   */
  export async function resetAllKeyBinds() {
    if (!store) {
      throw new Error("Store not initialized.");
    }
    // 清除已注册ID集合和资源
    dispose();
    // 清空存储
    await store.clear();
    // 重新注册所有快捷键
    await KeyBindsRegistrar.registerKeyBinds();
  }
}

/**
 * 快捷键绑定对象，一个此对象表示一个 快捷键功能绑定
 */
class _Bind {
  public button: number = -1;
  // @ts-expect-error // TODO: dblclick
  private lastMatch: number = 0;
  private events = new Queue<MouseEvent | KeyboardEvent | WheelEvent>();

  private enqueue(event: MouseEvent | KeyboardEvent | WheelEvent) {
    // 队列里面最多20个（因为秘籍键长度最大20）
    while (this.events.length >= 20) {
      this.events.dequeue();
    }
    this.events.enqueue(event);
  }
  /**
   * 每发生一个事件，都会调用这个函数
   */
  private check() {
    if (!apply(this.rule)) return;
    if (matchEmacsKey(this.key, this.events.arrayList)) {
      this.onPress(store.get(activeProjectAtom)!);
      // 执行了快捷键之后，清空队列
      this.events.clear();
    }
  }

  constructor(
    public id: string,
    public key: string,
    public rule: RulesLogic<AdditionalOperation>,
    public readonly onPress: (_project: Project) => void,
  ) {
    // 有任意事件时，管它是什么，都放进队列
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("wheel", this.onWheel, { passive: true });
  }

  onMouseDown = (event: MouseEvent) => {
    this.button = event.button;
    this.enqueue(event);
    this.check();
  };
  onKeyDown = (event: KeyboardEvent) => {
    if (["control", "alt", "shift", "meta"].includes(event.key.toLowerCase())) return;
    this.enqueue(event);
    this.check();
  };
  onWheel = (event: WheelEvent) => {
    this.enqueue(event);
    this.check();
  };

  dispose() {
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("wheel", this.onWheel);
  }
}
