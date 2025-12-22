const EVENT_LISTENERS = Symbol("GRAPHIF_ON_EVENT_LISTENERS");

interface EventConfig {
  eventName: string;
  methodName: string | symbol;
}
interface EventEmitter {
  on(event: string, fn: (...args: any[]) => void): this;
  off(event: string, fn: (...args: any[]) => void): this;
}

export const on =
  <T extends EventEmitter>(eventName: Parameters<T["on"]>[0]) =>
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

export function BindEvents(Base: any) {
  return class Extended extends Base {
    constructor(...args: any[]) {
      super(...args);
      this._autoBindEvents();
    }

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

    destroy(options?: any) {
      // 1. 自动移除监听
      const events = (Reflect.get(this, EVENT_LISTENERS) || []) as EventConfig[];
      events.forEach(({ eventName, methodName }) => {
        const callback = (this as any)[methodName];
        if (typeof callback === "function") {
          this.off(eventName, callback, this);
        }
      });

      super.destroy(options);
    }
  } as any;
}
