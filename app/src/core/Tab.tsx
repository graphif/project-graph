import { Dialog } from "@/components/ui/dialog";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { EventEmitter } from "events";
import React from "react";
import { toast } from "sonner";
import { getOriginalNameOf } from "virtual:original-class-name";
import type { URI } from "vscode-uri";
import { FileSystemProvider, Service } from "./interfaces/Service";
import { Settings } from "./service/Settings";
import { Telemetry } from "./service/Telemetry";

export abstract class Tab extends React.Component<Record<string, never>, Record<string, never>> {
  readonly id = crypto.randomUUID();
  layout: "docked" | "floating" = "docked";
  floatingRect = new Rectangle(Vector.getZero(), Vector.same(100));
  zIndex = 0;
  closing = false;
  canDock = true;
  closable = true;
  closeOnEscape = true;
  closeWhenClickOutside = false;
  closeWhenClickInside = false;
  titleBarOverlay = false;

  protected eventEmitter = new EventEmitter();

  protected readonly services = new Map<string, Service>();
  protected readonly fileSystemProviders = new Map<string, FileSystemProvider>();
  protected readonly tickableServices: Service[] = [];
  protected rafHandle = -1;
  protected lastTickTime = 0;

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

  async init(): Promise<void> {}

  loop() {
    if (this.rafHandle !== -1) return;

    const startTime = performance.now();
    let ticksExecuted = 0;

    const animationFrame = (time: number) => {
      const isFocused = document.hasFocus();
      const maxFps = Math.max(1, isFocused ? Settings.maxFps : Settings.maxFpsUnfocused);
      const timeStep = 1000 / maxFps;
      const totalElapsed = time - startTime;
      const expectedTicks = Math.floor(totalElapsed / timeStep);
      let ticksNeeded = expectedTicks - ticksExecuted;
      if (ticksNeeded > 10) {
        ticksExecuted = expectedTicks;
        ticksNeeded = 0;
      }
      while (ticksNeeded > 0) {
        this.tick();
        ticksExecuted++;
        ticksNeeded--;
      }
      this.rafHandle = requestAnimationFrame(animationFrame);
    };

    this.rafHandle = requestAnimationFrame(animationFrame);
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

  render(): React.ReactNode {
    return null;
  }
}

export interface ResourceTab extends Tab {
  readonly uri: URI;
}

export function isResourceTab(tab: Tab): tab is ResourceTab {
  return "uri" in tab;
}

export interface ComponentTabOptions {
  title?: string;
  icon?: React.ComponentType<any> | null;
  children?: React.ReactNode | ((tab: ComponentTab) => React.ReactNode);
  contextTarget?: "activeResourceTab";
  layout?: Tab["layout"];
  rect?: Rectangle;
  canDock?: boolean;
  closable?: boolean;
  closeOnEscape?: boolean;
  closeWhenClickOutside?: boolean;
  closeWhenClickInside?: boolean;
  titleBarOverlay?: boolean;
}

export class ComponentTab extends Tab {
  private readonly tabTitle: string;
  private readonly tabIcon: React.ComponentType<any> | null;
  readonly contextTarget: ComponentTabOptions["contextTarget"];
  children: ComponentTabOptions["children"];
  private readonly component: React.ComponentType;

  constructor(options: ComponentTabOptions) {
    super({});
    this.tabTitle = options.title ?? "";
    this.tabIcon = options.icon ?? null;
    this.contextTarget = options.contextTarget;
    this.children = options.children;
    this.layout = options.layout ?? "floating";
    this.floatingRect = options.rect ?? this.floatingRect;
    this.canDock = options.canDock ?? true;
    this.closable = options.closable ?? true;
    this.closeOnEscape = options.closeOnEscape ?? true;
    this.closeWhenClickOutside = options.closeWhenClickOutside ?? false;
    this.closeWhenClickInside = options.closeWhenClickInside ?? false;
    this.titleBarOverlay = options.titleBarOverlay ?? false;

    const tab = this;
    this.component = function ComponentTabContent() {
      return <>{typeof tab.children === "function" ? tab.children(tab) : tab.children}</>;
    };
  }

  override get title() {
    return this.tabTitle;
  }

  override get icon() {
    return this.tabIcon;
  }

  getComponent(): React.ComponentType {
    return this.component;
  }
}
