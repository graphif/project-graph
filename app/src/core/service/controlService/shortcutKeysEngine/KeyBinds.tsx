import { Project, service } from "@/core/Project";
import { matchEmacsKeyPress, transEmacsKeyWinToMac } from "@/utils/emacs";
import { isMac } from "@/utils/platform";
import { createStore } from "@/utils/store";
import { Queue } from "@graphif/data-structures";
import { Store } from "@tauri-apps/plugin-store";
import { isKeyBindHasRelease } from "./shortcutKeysRegister";

/**
 * 快捷键配置接口
 */
interface KeyBindConfig {
  key: string;
  isEnabled: boolean;
}

/**
 * 用于管理快捷键绑定
 */
@service("keyBinds")
export class KeyBinds {
  private store: Store | null = null;

  constructor(private readonly project: Project) {
    (async () => {
      this.store = await createStore("keybinds2.json");
      await this.project.keyBindsRegistrar.registerAllKeyBinds();
      // 不再重置store，支持新的数据结构
    })();
  }

  async set(id: string, config: KeyBindConfig) {
    if (!this.store) {
      throw new Error("Store not initialized.");
    }
    await this.store.set(id, config);
    if (this.callbacks[id]) {
      this.callbacks[id].forEach((callback) => callback(config));
    }
  }

  /**
   * 获取快捷键配置
   * @param id
   * @returns
   */
  async get(id: string): Promise<KeyBindConfig | null> {
    if (!this.store) {
      throw new Error("Store not initialized.");
    }
    const data = await this.store.get<KeyBindConfig | string>(id);
    if (!data) {
      return null;
    }
    // 兼容旧数据结构
    if (typeof data === "string") {
      return {
        key: data,
        isEnabled: true,
      };
    }
    return data;
  }

  /**
   * 切换快捷键启用状态
   * @param id
   * @returns
   */
  async toggleEnabled(id: string): Promise<boolean> {
    const config = await this.get(id);
    if (!config) {
      return true;
    }
    const newConfig = {
      ...config,
      isEnabled: !config.isEnabled,
    };
    await this.set(id, newConfig);
    return newConfig.isEnabled;
  }

  /**
   * 让某一个快捷键开始监听
   * @param id
   * @param callback
   * @returns
   */
  watch(key: string, callback: (value: KeyBindConfig) => void) {
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
   * @returns [[key, value], [key, value], ...], 具体来说是 [["copy", {key: "C-c", isEnabled: true}], ...]
   */
  async entries() {
    if (!this.store) {
      throw new Error("Keybind Store not initialized.");
    }
    return await this.store.entries<KeyBindConfig | string>();
  }

  // 仅用于初始化软件时注册快捷键
  registeredIdSet: Set<string> = new Set();
  bindSet: Set<_Bind> = new Set();

  /**
   * 注册快捷键，注意：Mac会自动将此进行替换
   * 此函数内部会判断用户是否已经有自定义的快捷键了
   * 如果用户已经自定义了快捷键，则 defaultKey 函数就没有效果了。
   * @param id 确保唯一的描述性字符串
   * @param defaultKey 例如 "C-A-S-t" 表示 Ctrl+Alt+Shift+t，如果是mac，会自动将C-和M-互换！！
   * @param onPress 按下后的执行函数
   * @param onReleaes 松开按键后执行的函数
   * @param defaultEnabled 默认是否启用
   * @returns
   */
  async create(
    id: string,
    defaultKey: string,
    onPress = () => {},
    onReleaes?: () => void,
    defaultEnabled: boolean = true,
  ): Promise<_Bind> {
    if (this.registeredIdSet.has(id)) {
      throw new Error(`Keybind ${id} 已经注册过了`);
    }
    if (isMac) {
      defaultKey = transEmacsKeyWinToMac(defaultKey);
    }
    this.registeredIdSet.add(id);
    let userConfig = await this.get(id);
    if (!userConfig) {
      // 注册新的快捷键
      const newConfig: KeyBindConfig = {
        key: defaultKey,
        isEnabled: defaultEnabled,
      };
      await this.set(id, newConfig);
      userConfig = newConfig;
    } else if (typeof userConfig === "string") {
      // 兼容旧数据结构
      const newConfig: KeyBindConfig = {
        key: userConfig,
        isEnabled: defaultEnabled,
      };
      await this.set(id, newConfig);
      userConfig = newConfig;
    }
    const obj = new _Bind(this.project, id, userConfig.key, userConfig.isEnabled, onPress, onReleaes);
    // 将绑定对象添加到集合中，以便后续清理
    this.bindSet.add(obj);
    // 监听快捷键变化
    this.watch(id, (value) => {
      obj.key = value.key;
      obj.isEnabled = value.isEnabled;
    });
    return obj;
  }

  dispose() {
    this.bindSet.forEach((bind) => bind.dispose());
    this.bindSet.clear();
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
    await this.project.keyBindsRegistrar.registerAllKeyBinds();
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
  // 是否启用
  public isEnabled: boolean;

  private enqueue(event: MouseEvent | KeyboardEvent | WheelEvent) {
    // 队列里面最多20个（因为秘籍键长度最大20）
    // 这里改成40 是因为可能有松开按键事件混入
    while (this.events.length >= 40) {
      this.events.dequeue();
    }
    this.events.enqueue(event);
  }
  /**
   * 每发生一个事件，都会调用这个函数
   */
  private check() {
    // 如果快捷键未启用，直接返回
    if (!this.isEnabled) {
      return;
    }

    if (
      matchEmacsKeyPress(
        this.key,
        this.events.arrayList.filter((event) => !(event instanceof KeyboardEvent && event.type === "keyup")),
      )
    ) {
      this.onPress();
      // 执行了快捷键之后，清空队列
      if (isKeyBindHasRelease(this.key)) {
        // 不清空
      } else {
        this.events.clear();
      }
    }

    if (
      matchEmacsKeyPress(
        this.key,
        this.events.arrayList.filter((event) => !(event instanceof KeyboardEvent && event.type === "keydown")),
      )
    ) {
      if (this.onRelease) {
        this.onRelease();
      }
      // 执行了快捷键之后，清空队列
      this.events.clear();
    }
  }

  constructor(
    private readonly project: Project,
    public id: string,
    public key: string,
    isEnabled: boolean,
    private readonly onPress: () => void,
    private readonly onRelease?: () => void,
  ) {
    this.isEnabled = isEnabled;
    // 有任意事件时，管它是什么，都放进队列
    this.project.canvas.element.addEventListener("mousedown", this.onMouseDown);
    this.project.canvas.element.addEventListener("keydown", this.onKeyDown);
    this.project.canvas.element.addEventListener("keyup", this.onKeyUp);
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
  onKeyUp = (event: KeyboardEvent) => {
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
