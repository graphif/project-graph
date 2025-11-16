import { FileSystemProvider, Service } from "@/core/interfaces/Service";
import { StageObject } from "@/core/sprites/abstract/StageObject";
import { nextProjectIdAtom, projectsAtom, store } from "@/state";
import { ObservableArray } from "@graphif/data-structures";
import { deserialize, serialize } from "@graphif/serializer";
import { Decoder, Encoder } from "@msgpack/msgpack";
import "@pixi/layout";
import { BlobReader, BlobWriter, Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import { EventEmitter } from "eventemitter3";
import mime from "mime";
import { Viewport } from "pixi-viewport";
import { Application, Container, FederatedPointerEvent, Graphics, Point, PointData } from "pixi.js";
import "pixi.js/math-extras";
import { URI } from "vscode-uri";
import { MyWheelPlugin } from "./MyWheelPlugin";
import { Settings } from "./service/Settings";
import { MyText } from "./sprites/MyText";

export class Project extends EventEmitter<{
  "state-change": [state: ProjectState];
  "context-menu": [location: Point];
  "pointer-enter-stage-object": [so: StageObject, event: FederatedPointerEvent];
  "pointer-leave-stage-object": [so: StageObject, event: FederatedPointerEvent];
}> {
  static readonly latestVersion = 18;

  public readonly pixi = new Application();
  public viewport!: Viewport;

  private readonly services = new Map<string, Service>();
  /**
   * 工程文件的URI
   * key: 服务ID
   * value: 服务实例
   */
  private readonly fileSystemProviders = new Map<string, FileSystemProvider>();
  private _uri: URI;
  private _state: ProjectState = ProjectState.Unsaved;
  private _stage = new ObservableArray<StageObject>(this.onStageAdd.bind(this), this.onStageRemove.bind(this), []);
  public tags: string[] = [];
  /**
   * string：UUID
   * value: Blob
   */
  public attachments = new Map<string, Blob>();
  /**
   * 创建Encoder对象比直接用encode()快
   * @see https://github.com/msgpack/msgpack-javascript#reusing-encoder-and-decoder-instances
   */
  private encoder = new Encoder();
  private decoder = new Decoder();

  constructor(uri: URI) {
    super();
    this._uri = uri;
    if (import.meta.hot) {
      import.meta.hot.on("vite:beforeUpdate", () => {
        this.dispose();
      });
    }
    if (import.meta.env.DEV) {
      (window as any).project = this;
    }
  }
  /**
   * 创建一个草稿工程
   * URI为draft:UUID
   */
  static newDraft(): Project {
    // const num = store.get(projectsAtom).filter((p) => p.isDraft).length + 1;
    if (store.get(projectsAtom).length === 0) store.set(nextProjectIdAtom, 1);
    const num = store.get(nextProjectIdAtom);
    const uri = URI.parse("draft:" + num);
    store.set(nextProjectIdAtom, num + 1);
    return new Project(uri);
  }

  /**
   * 立刻加载一个新的服务
   */
  private loadService(service: { id?: string; new (...args: any[]): any }) {
    if (!service.id) {
      service.id = crypto.randomUUID();
      console.warn("[Project] 服务 %o 未指定 ID，自动生成：%s", service, service.id);
    }
    const inst = new service(this);
    this.services.set(service.id, inst);
    if ("tick" in inst) {
      this.pixi.ticker.add(inst.tick, inst);
    }
    this[service.id as keyof this] = inst as this[keyof this];
  }

  async init(
    fileSystemProviders: Record<string, { new (...args: any[]): FileSystemProvider }> = {},
    services: ({ id?: string; new (...args: any[]): any } | false)[] = [],
    sprites: ({ new (...args: any[]): Container } | false)[] = [],
  ) {
    await this.pixi.init({
      backgroundAlpha: Settings.windowBackgroundAlpha,
      powerPreference: (
        {
          highPerformance: "high-performance",
          lowPower: "low-power",
          unspecified: undefined,
        } as const
      )[Settings.powerPreference],
      resizeTo: window,
      antialias: Settings.antialias,
    });
    this.pixi.ticker.maxFPS = Settings.maxFps;
    this.pixi.ticker.minFPS = Settings.minFps;
    // 注册文件系统
    for (const scheme in fileSystemProviders) {
      this.fileSystemProviders.set(scheme, new fileSystemProviders[scheme](this));
    }
    if (!this.fs) {
      throw new Error(`[Project] 未注册 ${this.uri.scheme} 协议的文件系统提供器`);
    }
    try {
      const fileContent = await this.fs.read(this.uri);
      const reader = new ZipReader(new Uint8ArrayReader(fileContent));
      const entries = await reader.getEntries();
      let serializedStageObjects: any[] = [];
      let tags: string[] = [];
      for (const entry of entries) {
        if (entry.filename === "stage.msgpack") {
          const stageRawData = await entry.getData!(new Uint8ArrayWriter());
          serializedStageObjects = this.decoder.decode(stageRawData) as any[];
        } else if (entry.filename === "tags.msgpack") {
          const tagsRawData = await entry.getData!(new Uint8ArrayWriter());
          tags = this.decoder.decode(tagsRawData) as string[];
        } else if (entry.filename.startsWith("attachments/")) {
          const match = entry.filename.trim().match(/^attachments\/([a-zA-Z0-9-]+)\.([a-zA-Z0-9]+)$/);
          if (!match) {
            console.warn("[Project] 附件文件名不符合规范: %s", entry.filename);
            continue;
          }
          const uuid = match[1];
          const ext = match[2];
          const type = mime.getType(ext) || "application/octet-stream";
          const attachment = await entry.getData!(new BlobWriter(type));
          this.attachments.set(uuid, attachment);
        }
      }
      this.stage = deserialize(serializedStageObjects, this);
      this.tags = tags;
    } catch (e) {
      console.warn(e);
    }
    this.state = ProjectState.Saved;

    // const fpsText = this.pixi.stage.addChild(
    //   new MyText("0", {
    //     style: { fontSize: 24 },
    //     x: 10,
    //     y: 50,
    //   }),
    // );
    // // 最多存储60帧的FPS数据，用于计算平均FPS
    // const recentFps: number[] = [];
    // this.pixi.ticker.add(() => {
    //   recentFps.push(this.pixi.ticker.FPS);
    //   fpsText.text = `${Math.round(this.pixi.ticker.FPS)} (AVG ${Math.round(recentFps.reduce((a, b) => a + b, 0) / recentFps.length)})`;
    //   if (recentFps.length > 60) {
    //     recentFps.shift();
    //   }
    // });

    // const pressedKeysText = this.pixi.stage.addChild(
    //   new MyText("", {
    //     style: { fontSize: 24 },
    //     x: 10,
    //     y: 80,
    //   }),
    // );
    // const pressedKeys = new Set<string>();
    // window.addEventListener("keydown", (e) => {
    //   pressedKeys.add(e.key);
    //   pressedKeysText.text = Array.from(pressedKeys).join(", ");
    // });
    // window.addEventListener("keyup", (e) => {
    //   pressedKeys.delete(e.key);
    //   pressedKeysText.text = Array.from(pressedKeys).join(", ");
    // });

    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: Infinity,
      worldHeight: Infinity,
      events: this.pixi.renderer.events,
    }).drag({
      mouseButtons: "middle",
    });
    this.viewport.plugins.add(
      "wheel",
      new MyWheelPlugin(this.viewport, {
        interrupt: false,
      }),
    );
    // .wheel({
    //   lineHeight: 0,
    // });
    this.viewport.cullable = true;
    this.viewport.cullableChildren = true;
    this.pixi.stage.addChild(this.viewport);

    const origin = new Graphics();
    origin.circle(0, 0, 5);
    origin.fill(0xff0000);
    this.viewport.addChild(origin);

    const positionText = this.pixi.stage.addChild(
      new MyText("0,0", {
        style: { fontSize: 12 },
        x: 10,
        y: 30,
      }),
    );

    this.viewport.on("pointermove", (e) => {
      const worldPos = this.viewport.toWorld(e.client);
      positionText.text = `${worldPos.x.toFixed(0)},${worldPos.y.toFixed(0)}`;
      positionText.position = e.client.add(new Point(30, 30));
    });

    for (const sprite of sprites) {
      if (!sprite) continue;
      this.viewport.addChild(new sprite(this));
    }
    for (const service of services) {
      if (!service) continue;
      this.loadService(service);
    }
  }

  /**
   * 用户关闭标签页时，销毁工程
   */
  async dispose() {
    // 释放所有服务
    const promises: Promise<void>[] = [];
    for (const service of this.services.values()) {
      const result = service.dispose?.();
      if (result instanceof Promise) {
        promises.push(result);
      }
    }
    await Promise.allSettled(promises);
    // 销毁pixi
    this.pixi.destroy();
  }

  /**
   * 获取某个服务的实例
   */
  getService<T extends keyof this & string>(serviceId: T): this[T] {
    return this.services.get(serviceId) as this[T];
  }

  get isDraft() {
    return this.uri.scheme === "draft";
  }
  get uri() {
    return this._uri;
  }
  set uri(uri: URI) {
    this._uri = uri;
    this.state = ProjectState.Unsaved;
  }

  async save() {
    await this.fs.write(this.uri, await this.dump());
    this.state = ProjectState.Saved;
  }

  // 备份也要用到这个
  async dump() {
    const serializedStage = serialize(this.stage);
    const encodedStage = this.encoder.encode(serializedStage);
    const uwriter = new Uint8ArrayWriter();

    const writer = new ZipWriter(uwriter); // zip writer用于把zip文件写入uint8array writer
    writer.add("stage.msgpack", new Uint8ArrayReader(encodedStage));
    writer.add("tags.msgpack", new Uint8ArrayReader(this.encoder.encode(this.tags)));
    // 添加附件
    for (const [uuid, attachment] of this.attachments.entries()) {
      writer.add(`attachments/${uuid}.${mime.getExtension(attachment.type)}`, new BlobReader(attachment));
    }
    await writer.close();

    const fileContent = await uwriter.getData();
    return fileContent;
  }

  get fs(): FileSystemProvider {
    return this.fileSystemProviders.get(this.uri.scheme)!;
  }

  addAttachment(data: Blob) {
    const uuid = crypto.randomUUID();
    this.attachments.set(uuid, data);
    return uuid;
  }

  set state(state: ProjectState) {
    if (state === this._state) return;
    this._state = state;
    this.emit("state-change", state);
  }
  get state(): ProjectState {
    return this._state;
  }

  /** @deprecated */
  get isRunning(): boolean {
    return true;
  }
  /** @deprecated */
  loop() {}
  /** @deprecated */
  pause() {}

  mount(wrapper: HTMLElement) {
    wrapper.innerHTML = "";
    wrapper.appendChild(this.pixi.canvas);
  }

  private onStageAdd(it: StageObject) {
    this.viewport?.addChild(it);
  }
  private onStageRemove(it: StageObject) {
    this.viewport?.removeChild(it);
  }
  get stage(): StageObject[] {
    return this._stage;
  }
  set stage(value: StageObject[]) {
    this.viewport?.removeChild(...this._stage);
    this._stage = new ObservableArray(this.onStageAdd.bind(this), this.onStageRemove.bind(this), value);
  }

  getStageObjectAt(point: PointData): StageObject | null {
    return this.stage.find((so) => so.myContainsPoint(point)) || null;
  }
}

declare module "./Project" {
  /*
   * 不直接在class中定义的原因
   * 在class中定义的话ts会报错，因为它没有初始值并且没有在构造函数中赋值
   * 在这里用语法糖定义就能优雅的绕过这个限制
   * 服务加载的顺序在调用registerService()时确定
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Project {}
}

export enum ProjectState {
  /**
   * "已保存"
   * 已写入到原始文件中
   * 已上传到云端
   */
  Saved,
  /**
   * "已暂存"
   * 未写入到原始文件中，但是已经暂存到数据目录
   * 未上传到云端，但是已经暂存到本地
   */
  Stashed,
  /**
   * "未保存"
   * 未写入到原始文件中，也未暂存到数据目录（真·未保存）
   * 未上传到云端，也未暂存到本地
   */
  Unsaved,
}

/**
 * 装饰器
 * @example
 * @service("renderer")
 * class Renderer {}
 *
 * 装饰了这个类之后，这个类会多一个id属性（静态属性），值为"renderer"
 * 可以通过 Renderer.id 获取到这个值
 */
export const service =
  (id: string) =>
  <
    T extends {
      [x: string | number | symbol]: any;
      id?: string;
      new (...args: any[]): any;
    },
  >(
    target: T,
  ): T & { id: string } => {
    target.id = id;
    return target as T & { id: string };
  };
