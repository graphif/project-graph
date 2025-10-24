import { Project, service } from "@/core/Project";
import { matchEmacsKey } from "@/utils/emacs";
import { isMac } from "@/utils/platform";
import { createStore } from "@/utils/store";
import { Queue } from "@graphif/data-structures";
import { Store } from "@tauri-apps/plugin-store";

/**
 * 用于管理快捷键绑定
 */
@service("keyBinds")
export class KeyBinds {
  private store: Store | null = null;

  constructor(private readonly project: Project) {
    (async () => {
      this.store = await createStore("keybinds2.json");
      await this.project.keyBindsRegistrar.registerKeyBinds();
      if ((await this.store.values()).find((it) => typeof it !== "string")) {
        // 重置store
        await this.store.clear();
      }
    })();
  }

  async set(id: string, key: string) {
    if (!this.store) {
      throw new Error("Store not initialized.");
    }
    await this.store.set(id, key);
    if (this.callbacks[id]) {
      this.callbacks[id].forEach((callback) => callback(key));
    }
  }

  /**
   * 获取曾经设置过的快捷键 按法
   * @param id
   * @returns
   */
  async get(id: string): Promise<string | null> {
    if (!this.store) {
      throw new Error("Store not initialized.");
    }
    const data = await this.store.get<string>(id);
    return data || null;
  }

  /**
   * 让某一个快捷键开始监听
   * @param id
   * @param callback
   * @returns
   */
  watch(key: string, callback: (value: string) => void) {
    if (!this.callbacks[key]) {
      this.callbacks[key] = [];
    }
    this.callbacks[key].push(callback);
    if (this.store) {
      this.get(key).then((value) => {
        if (!value) return;
        callback(value);
      });
    }
    return () => {
      this.callbacks[key] = this.callbacks[key].filter((cb) => cb !== callback);
    };
  }

  private callbacks: {
    [key: string]: Array<(value: any) => void>;
  } = {};

  /**
   * 获取所有快捷键绑定
   * @returns [[key, value], [key, value], ...], 具体来说是 [["copy", "C-c"], ["paste", "C-v"], ...]
   */
  async entries() {
    if (!this.store) {
      throw new Error("Keybind Store not initialized.");
    }
    return await this.store.entries<string>();
  }

  // 仅用于初始化软件时注册快捷键
  registeredIdSet: Set<string> = new Set();
  binds: Set<_Bind> = new Set();

  /**
   * 注册快捷键，注意：Mac会自动将此进行替换
   * @param id 确保唯一的描述性字符串
   * @param defaultKey 例如 "C-A-S-t" 表示 Ctrl+Alt+Shift+t，如果是mac，会自动将C-和M-互换！！
   * @param onPress 按下后的执行函数
   * @returns
   */
  async create(id: string, defaultKey: string, onPress = () => {}): Promise<_Bind> {
    if (this.registeredIdSet.has(id)) {
      throw new Error(`Keybind ${id} 已经注册过了`);
    }
    if (isMac) {
      defaultKey = defaultKey.replace("C-", "Control-");
      defaultKey = defaultKey.replace("M-", "C-");
      defaultKey = defaultKey.replace("Control-", "M-");
    }
    this.registeredIdSet.add(id);
    let userSetKey = await this.get(id);
    if (!userSetKey) {
      // 注册新的快捷键
      await this.set(id, defaultKey);
      userSetKey = defaultKey;
    }
    const obj = new _Bind(this.project, id, userSetKey, onPress);
    // 将绑定对象添加到集合中，以便后续清理
    this.binds.add(obj);
    // 监听快捷键变化
    this.watch(id, (value) => {
      obj.key = value;
    });
    return obj;
  }

  dispose() {
    this.binds.forEach((bind) => bind.dispose());
    this.binds.clear();
    this.registeredIdSet.clear();
    this.callbacks = {};
  }

  /**
   * 重置所有快捷键为默认值
   */
  async resetAllKeyBinds() {
    if (!this.store) {
      throw new Error("Store not initialized.");
    }
    // 清除已注册ID集合和资源
    this.dispose();
    // 清空存储
    await this.store.clear();
    // 重新注册所有快捷键
    await this.project.keyBindsRegistrar.registerKeyBinds();
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
    if (matchEmacsKey(this.key, this.events.arrayList)) {
      this.onPress();
      // 执行了快捷键之后，清空队列
      this.events.clear();
    }
  }

  constructor(
    private readonly project: Project,
    public id: string,
    public key: string,
    private readonly onPress: () => void,
  ) {
    // 有任意事件时，管它是什么，都放进队列
    this.project.canvas.element.addEventListener("mousedown", this.onMouseDown);
    this.project.canvas.element.addEventListener("keydown", this.onKeyDown);
    this.project.canvas.element.addEventListener("wheel", this.onWheel, { passive: true });
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
    this.project.canvas.element.removeEventListener("mousedown", this.onMouseDown);
    this.project.canvas.element.removeEventListener("keydown", this.onKeyDown);
    this.project.canvas.element.removeEventListener("wheel", this.onWheel);
  }
}
