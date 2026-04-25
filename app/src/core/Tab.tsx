import { Dialog } from "@/components/ui/dialog";
import { EventEmitter } from "events";
import React from "react";
import { toast } from "sonner";
import { getOriginalNameOf } from "virtual:original-class-name";
import { FileSystemProvider, Service } from "./interfaces/Service";
import { Telemetry } from "./service/Telemetry";

export abstract class Tab extends React.Component<Record<string, never>, Record<string, never>> {
  protected eventEmitter = new EventEmitter();

  protected readonly services = new Map<string, Service>();
  protected readonly fileSystemProviders = new Map<string, FileSystemProvider>();
  protected readonly tickableServices: Service[] = [];
  protected rafHandle = -1;

  abstract getComponent(): React.ComponentType;

  get title(): string {
    return this.constructor.name;
  }

  get icon(): React.ComponentType<any> | null {
    return null;
  }

  constructor(props: Record<string, never>) {
    super(props);
  }

  /**
   * 注册一个文件管理器
   * @param scheme 目前有 "file" | "draft"， 以后可能有其他的协议
   */
  registerFileSystemProvider(scheme: string, provider: { new (...args: any[]): FileSystemProvider }) {
    this.fileSystemProviders.set(scheme, new provider(this as any));
  }

  get fs(): FileSystemProvider {
    return this.fileSystemProviders.get((this as any).uri.scheme)!;
  }

  // EventEmitter proxy methods
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    this.eventEmitter.on(event, listener);
    return this;
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    return this.eventEmitter.emit(event, ...args);
  }

  removeAllListeners(event?: string | symbol): this {
    this.eventEmitter.removeAllListeners(event);
    return this;
  }

  /**
   * 立刻加载一个新的服务
   */
  loadService(service: { id?: string; new (...args: any[]): any }) {
    if (!service.id) {
      service.id = crypto.randomUUID();
      console.warn("[Tab] 服务 %o 未指定 ID，自动生成：%s", service, service.id);
    }
    const inst = new service(this);
    this.services.set(service.id, inst);
    if ("tick" in inst) {
      this.tickableServices.push(inst);
    }
    (this as any)[service.id] = inst;
  }

  /**
   * 立刻销毁一个服务
   */
  disposeService(serviceId: string) {
    const service = this.services.get(serviceId);
    if (service) {
      service.dispose?.();
      this.services.delete(serviceId);
      const index = this.tickableServices.indexOf(service);
      if (index !== -1) {
        this.tickableServices.splice(index, 1);
      }
    }
  }

  /**
   * 获取某个服务的实例
   */
  getService<T extends keyof this & string>(serviceId: T): this[T] {
    return this.services.get(serviceId) as this[T];
  }

  abstract init(): Promise<void>;

  loop() {
    if (this.rafHandle !== -1) return;
    const animationFrame = () => {
      this.tick();
      this.rafHandle = requestAnimationFrame(animationFrame.bind(this));
    };
    animationFrame();
  }

  pause() {
    if (this.rafHandle === -1) return;
    cancelAnimationFrame(this.rafHandle);
    this.rafHandle = -1;
  }

  protected tick() {
    for (const service of this.tickableServices) {
      try {
        service.tick?.();
      } catch (e) {
        console.error("[%s] %o", service, e);
        const index = this.tickableServices.indexOf(service);
        if (index !== -1) {
          this.tickableServices.splice(index, 1);
        }

        Dialog.buttons(`${getOriginalNameOf(service.constructor)} 发生未知错误`, String(e), [
          { id: "cancel", label: "取消", variant: "ghost" },
          { id: "ok", label: "确定" },
        ]);

        if (e !== null && typeof e === "object" && "message" in e && e.message === "test") {
          continue;
        }
        toast.promise(
          Telemetry.event("服务tick方法报错", { service: getOriginalNameOf(service.constructor), error: String(e) }),
          {
            loading: "正在上报错误",
            success: "错误信息已发送给开发者",
            error: "上报失败",
          },
        );
      }
    }
  }

  async dispose() {
    this.pause();
    const promises: Promise<void>[] = [];
    for (const service of this.services.values()) {
      const result = service.dispose?.();
      if (result instanceof Promise) {
        promises.push(result);
      }
    }
    await Promise.allSettled(promises);
    this.services.clear();
    this.tickableServices.length = 0;
  }

  get isRunning(): boolean {
    return this.rafHandle !== -1;
  }

  abstract render(): React.ReactNode;
}
