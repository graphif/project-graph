import { Container } from "pixi.js";

// 使用 Symbol 存储事件元数据，防止命名冲突
const EVENT_LISTENERS = Symbol("PIXI_EVENT_LISTENERS");

interface EventConfig {
  eventName: string;
  methodName: string | symbol;
}

/**
 * 1. 方法装饰器：收集事件绑定信息
 * 标记该方法需要监听特定事件
 */
export const on =
  <T extends Container>(eventName: Parameters<T["on"]>[0]) =>
  (target: T, property: string) => {
    // target 在方法装饰器中指向类的 prototype
    const list = (Reflect.get(target, EVENT_LISTENERS) || []) as EventConfig[];

    list.push({
      eventName: eventName as string,
      methodName: property as string | symbol,
    });

    // 将元数据挂载到原型上
    Reflect.set(target, EVENT_LISTENERS, list);
  };

/**
 * 2. 类装饰器：劫持 Constructor 和 Destroy
 * 必须添加在类上，用于处理 @on 收集到的元数据
 */
export function BindEvents(Base: any) {
  return class Extended extends Base {
    constructor(...args: any[]) {
      super(...args);
      this._autoBindEvents();
    }

    /**
     * 自动绑定逻辑
     */
    private _autoBindEvents() {
      // 从原型链获取元数据
      const events = (Reflect.get(this, EVENT_LISTENERS) || []) as EventConfig[];

      events.forEach(({ eventName, methodName }) => {
        const callback = (this as any)[methodName];
        if (typeof callback === "function") {
          // 绑定事件，并强制绑定 this 上下文
          this.on(eventName, callback, this);
        }
      });
    }

    /**
     * 劫持 destroy 方法
     * PixiJS 的 destroy 通常接受一个 options 对象
     */
    destroy(options?: any) {
      // 1. 自动移除监听
      const events = (Reflect.get(this, EVENT_LISTENERS) || []) as EventConfig[];
      events.forEach(({ eventName, methodName }) => {
        const callback = (this as any)[methodName];
        if (typeof callback === "function") {
          this.off(eventName, callback, this);
        }
      });

      // 2. 调用原始 destroy
      super.destroy(options);
    }
  } as any;
}
