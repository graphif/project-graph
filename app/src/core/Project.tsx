import { FileSystemProvider, Service } from "@/core/interfaces/Service";
import type { CurveRenderer } from "@/core/render/canvas2d/basicRenderer/curveRenderer";
import type { ImageRenderer } from "@/core/render/canvas2d/basicRenderer/ImageRenderer";
import type { ShapeRenderer } from "@/core/render/canvas2d/basicRenderer/shapeRenderer";
import type { SvgRenderer } from "@/core/render/canvas2d/basicRenderer/svgRenderer";
import type { TextRenderer } from "@/core/render/canvas2d/basicRenderer/textRenderer";
import type { DrawingControllerRenderer } from "@/core/render/canvas2d/controllerRenderer/drawingRenderer";
import type { CollisionBoxRenderer } from "@/core/render/canvas2d/entityRenderer/CollisionBoxRenderer";
import type { StraightEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/StraightEdgeRenderer";
import type { SymmetryCurveEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/SymmetryCurveEdgeRenderer";
import type { VerticalPolyEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/VerticalPolyEdgeRenderer";
import type { EdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/EdgeRenderer";
import type { EntityDetailsButtonRenderer } from "@/core/render/canvas2d/entityRenderer/EntityDetailsButtonRenderer";
import type { EntityRenderer } from "@/core/render/canvas2d/entityRenderer/EntityRenderer";
import type { MultiTargetUndirectedEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/multiTargetUndirectedEdge/MultiTargetUndirectedEdgeRenderer";
import type { SectionRenderer } from "@/core/render/canvas2d/entityRenderer/section/SectionRenderer";
import type { SvgNodeRenderer } from "@/core/render/canvas2d/entityRenderer/svgNode/SvgNodeRenderer";
import { TextNodeRenderer } from "@/core/render/canvas2d/entityRenderer/textNode/TextNodeRenderer";
import type { UrlNodeRenderer } from "@/core/render/canvas2d/entityRenderer/urlNode/urlNodeRenderer";
import type { Renderer } from "@/core/render/canvas2d/renderer";
import type { BackgroundRenderer } from "@/core/render/canvas2d/utilsRenderer/backgroundRenderer";
import type { RenderUtils } from "@/core/render/canvas2d/utilsRenderer/RenderUtils";
import type { SearchContentHighlightRenderer } from "@/core/render/canvas2d/utilsRenderer/searchContentHighlightRenderer";
import type { WorldRenderUtils } from "@/core/render/canvas2d/utilsRenderer/WorldRenderUtils";
import type { InputElement } from "@/core/render/domElement/inputElement";
import type { AutoLayoutFastTree } from "@/core/service/controlService/autoLayoutEngine/autoLayoutFastTreeMode";
import type { AutoLayout } from "@/core/service/controlService/autoLayoutEngine/mainTick";
import type { ControllerUtils } from "@/core/service/controlService/controller/concrete/utilsControl";
import type { Controller } from "@/core/service/controlService/controller/Controller";
import type { KeyboardOnlyEngine } from "@/core/service/controlService/keyboardOnlyEngine/keyboardOnlyEngine";
import type { KeyboardOnlyGraphEngine } from "@/core/service/controlService/keyboardOnlyEngine/keyboardOnlyGraphEngine";
import type { KeyboardOnlyTreeEngine } from "@/core/service/controlService/keyboardOnlyEngine/keyboardOnlyTreeEngine";
import type { SelectChangeEngine } from "@/core/service/controlService/keyboardOnlyEngine/selectChangeEngine";
import type { RectangleSelect } from "@/core/service/controlService/rectangleSelectEngine/rectangleSelectEngine";
import type { KeyBinds } from "@/core/service/controlService/shortcutKeysEngine/KeyBinds";
import type { KeyBindsRegistrar } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
import type { MouseInteraction } from "@/core/service/controlService/stageMouseInteractionCore/stageMouseInteractionCore";
import type { AutoComputeUtils } from "@/core/service/dataGenerateService/autoComputeEngine/AutoComputeUtils";
import type { AutoCompute } from "@/core/service/dataGenerateService/autoComputeEngine/mainTick";
import type { GenerateFromFolder } from "@/core/service/dataGenerateService/generateFromFolderEngine/GenerateFromFolderEngine";
import type { StageExport } from "@/core/service/dataGenerateService/stageExportEngine/stageExportEngine";
import type { StageExportPng } from "@/core/service/dataGenerateService/stageExportEngine/StageExportPng";
import type { StageExportSvg } from "@/core/service/dataGenerateService/stageExportEngine/StageExportSvg";
import type { AIEngine } from "@/core/service/dataManageService/aiEngine/AIEngine";
import type { ComplexityDetector } from "@/core/service/dataManageService/ComplexityDetector";
import type { ContentSearch } from "@/core/service/dataManageService/contentSearchEngine/contentSearchEngine";
import type { CopyEngine } from "@/core/service/dataManageService/copyEngine/copyEngine";
import type { Effects } from "@/core/service/feedbackService/effectEngine/effectMachine";
import { StageStyleManager } from "@/core/service/feedbackService/stageStyle/StageStyleManager";
import type { Camera } from "@/core/stage/Camera";
import type { Canvas } from "@/core/stage/Canvas";
import { GraphMethods } from "@/core/stage/stageManager/basicMethods/GraphMethods";
import { SectionMethods } from "@/core/stage/stageManager/basicMethods/SectionMethods";
import type { LayoutManager } from "@/core/stage/stageManager/concreteMethods/LayoutManager";
import type { AutoAlign } from "@/core/stage/stageManager/concreteMethods/StageAutoAlignManager";
import type { DeleteManager } from "@/core/stage/stageManager/concreteMethods/StageDeleteManager";
import type { EntityMoveManager } from "@/core/stage/stageManager/concreteMethods/StageEntityMoveManager";
import type { StageUtils } from "@/core/stage/stageManager/concreteMethods/StageManagerUtils";
import type { MultiTargetEdgeMove } from "@/core/stage/stageManager/concreteMethods/StageMultiTargetEdgeMove";
import type { NodeAdder } from "@/core/stage/stageManager/concreteMethods/StageNodeAdder";
import type { NodeConnector } from "@/core/stage/stageManager/concreteMethods/StageNodeConnector";
import type { StageNodeRotate } from "@/core/stage/stageManager/concreteMethods/stageNodeRotate";
import type { StageObjectColorManager } from "@/core/stage/stageManager/concreteMethods/StageObjectColorManager";
import type { StageObjectSelectCounter } from "@/core/stage/stageManager/concreteMethods/StageObjectSelectCounter";
import type { SectionInOutManager } from "@/core/stage/stageManager/concreteMethods/StageSectionInOutManager";
import type { SectionPackManager } from "@/core/stage/stageManager/concreteMethods/StageSectionPackManager";
import type { TagManager } from "@/core/stage/stageManager/concreteMethods/StageTagManager";
import { HistoryManager } from "@/core/stage/stageManager/StageHistoryManager";
import type { StageManager } from "@/core/stage/stageManager/StageManager";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { nextProjectIdAtom, projectsAtom, store } from "@/state";
import { ObservableArray, Vector } from "@graphif/data-structures";
import { deserialize, serialize } from "@graphif/serializer";
import { Decoder, Encoder } from "@msgpack/msgpack";
import { BlobReader, BlobWriter, Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import { EventEmitter } from "events";
import md5 from "md5";
import mime from "mime";
import { AsciiFilter } from "pixi-filters";
import { Viewport } from "pixi-viewport";
import { URI } from "vscode-uri";
import { Settings } from "./service/Settings";
import { BackgroundGrid } from "./sprites/BackgroundGrid";
import { TextNode } from "./sprites/TextNode";

import { Application, Graphics, Point, Text } from "pixi.js";
// 导入pixi扩展，顺序不能变
import "@pixi/layout";
import "pixi.js/math-extras";

if (import.meta.hot) {
  import.meta.hot.accept();
}

/**
 * “工程”
 * 一个标签页对应一个工程，一个工程只能对应一个URI
 * 一个工程可以加载不同的服务，类似vscode的扩展（Extensions）机制
 */
export class Project extends EventEmitter<{
  "state-change": [state: ProjectState];
  contextmenu: [location: Vector];
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
  private _stage: StageObject[] = [];
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

  /**
   * 创建一个项目
   * @param uri 工程文件的URI
   * 之所以从“路径”改为了“URI”，是因为要为后面的云同步功能做铺垫。
   * 普通的“路径”无法表示云盘中的文件，而URI可以。
   * 同时，草稿文件也从硬编码的“Project Graph”特殊文件路径改为了协议为draft、内容为UUID的URI。
   * @see https://code.visualstudio.com/api/references/vscode-api#workspace.workspaceFile
   */
  constructor(uri: URI) {
    super();
    this._uri = uri;
    if (import.meta.hot) {
      import.meta.hot.on("vite:beforeUpdate", () => {
        this.dispose();
      });
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
    services: { id?: string; new (...args: any[]): any }[] = [],
    postInitServices: { id?: string; new (...args: any[]): any }[] = [],
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
    // 注册服务
    for (const service of services) {
      this.loadService(service);
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

    // 添加固定的元素
    const fpsText = this.pixi.stage.addChild(
      new Text({
        text: "0",
        style: { fill: "white", fontSize: 12 },
        x: 10,
        y: 50,
      }),
    );
    this.pixi.ticker.add(() => {
      fpsText.text = Math.round(this.pixi.ticker.FPS).toString();
    });
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: Infinity,
      worldHeight: Infinity,
      events: this.pixi.renderer.events,
    })
      .drag({
        mouseButtons: "middle",
      })
      .pinch()
      .wheel({
        smooth: 5,
      });
    this.pixi.stage.addChild(this.viewport);
    this.viewport.addChild(new BackgroundGrid(this));
    // 在[0,0]渲染一个红色的圆点，表示原点位置
    const origin = new Graphics();
    origin.circle(0, 0, 5);
    origin.fill(0xff0000);
    this.viewport.addChild(origin);
    for (let i = 0; i < 20; i++) {
      this.viewport.addChild(
        new Text({
          text: `耄耋${i}`,
          style: {
            fill: "white",
            fontSize: 32,
          },
          x: (i % 5) * 100,
          y: 100 + Math.floor(i / 5) * 32,
          resolution: i,
        }),
      );
    }
    this.viewport.addChild(
      new Text({
        text: "创建TextNode",
        interactive: true,
        style: { fill: 0x00ff00 },
        y: -100,
      }).on("click", () => {
        this.stage.push(new TextNode(this, { text: "hello world" }));
      }),
    );
    this.viewport.addChild(
      new Text({
        text: "???",
        interactive: true,
        style: { fill: 0x00ff00 },
        y: -50,
      }).on("click", () => {
        this.viewport.filters = [new AsciiFilter()];
      }),
    );
    const positionText = this.pixi.stage.addChild(
      new Text({
        text: "0,0",
        style: { fill: "white", fontSize: 12 },
        x: 10,
        y: 30,
      }),
    );
    this.viewport.on("pointermove", (e) => {
      const worldPos = this.viewport.toWorld(e.client);
      positionText.text = `${worldPos.x.toFixed(0)},${worldPos.y.toFixed(0)}`;
      positionText.position = e.client.add(new Point(30, 30));
    });

    // 后初始化服务
    for (const service of postInitServices) {
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
    this.pixi.destroy(true, {
      children: true,
      context: true,
    });
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

  /**
   * 将文件暂存到数据目录中（通常为~/.local/share）
   * ~/.local/share/liren.project-graph/stash/<normalizedUri>
   * @see https://code.visualstudio.com/blogs/2016/11/30/hot-exit-in-insiders
   *
   * 频繁用msgpack序列化不会卡吗？
   * 虽然JSON.stringify()在V8上面速度和msgpack差不多
   * 但是要考虑跨平台，目前linux和macos用的都是webkit，目前还没有JavaScriptCore相关的benchmark
   * 而且考虑到以后会把图片也放进文件里面，JSON肯定不合适了
   * @see https://github.com/msgpack/msgpack-javascript#benchmark
   */
  async stash() {
    // TODO: stash
    // const stashFilePath = await join(await appLocalDataDir(), "stash", Base64.encode(this.uri.toString()));
    // const encoded = this.encoder.encodeSharedRef(this.data);
    // await writeFile(stashFilePath, encoded);
  }
  async save() {
    await this.fs.write(this.uri, await this.getFileContent());
    this.state = ProjectState.Saved;
  }

  // 备份也要用到这个
  async getFileContent() {
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

  /**
   * 备份用：生成项目内容的哈希值，用于检测内容是否发生变化
   */
  get stageHash() {
    const serializedStage = serialize(this.stage);
    // 创建临时Encoder来编码数据
    const tempEncoder = new Encoder();
    const encodedStage = tempEncoder.encode(serializedStage);
    return md5(encodedStage);
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
    return new ObservableArray(this.onStageAdd.bind(this), this.onStageRemove.bind(this), this._stage);
  }
  set stage(value: StageObject[]) {
    this.viewport?.removeChild(...this._stage);
    this._stage = value;
    this.viewport?.addChild(...this._stage);
  }
}

declare module "./Project" {
  /*
   * 不直接在class中定义的原因
   * 在class中定义的话ts会报错，因为它没有初始值并且没有在构造函数中赋值
   * 在这里用语法糖定义就能优雅的绕过这个限制
   * 服务加载的顺序在调用registerService()时确定
   */
  interface Project {
    canvas: Canvas;
    inputElement: InputElement;
    keyBinds: KeyBinds;
    controllerUtils: ControllerUtils;
    autoComputeUtils: AutoComputeUtils;
    renderUtils: RenderUtils;
    worldRenderUtils: WorldRenderUtils;
    historyManager: HistoryManager;
    stageManager: StageManager;
    camera: Camera;
    effects: Effects;
    autoCompute: AutoCompute;
    rectangleSelect: RectangleSelect;
    stageNodeRotate: StageNodeRotate;
    complexityDetector: ComplexityDetector;
    aiEngine: AIEngine;
    copyEngine: CopyEngine;
    autoLayout: AutoLayout;
    autoLayoutFastTree: AutoLayoutFastTree;
    layoutManager: LayoutManager;
    autoAlign: AutoAlign;
    mouseInteraction: MouseInteraction;
    contentSearch: ContentSearch;
    deleteManager: DeleteManager;
    nodeAdder: NodeAdder;
    entityMoveManager: EntityMoveManager;
    stageUtils: StageUtils;
    multiTargetEdgeMove: MultiTargetEdgeMove;
    nodeConnector: NodeConnector;
    stageObjectColorManager: StageObjectColorManager;
    stageObjectSelectCounter: StageObjectSelectCounter;
    sectionInOutManager: SectionInOutManager;
    sectionPackManager: SectionPackManager;
    tagManager: TagManager;
    keyboardOnlyEngine: KeyboardOnlyEngine;
    keyboardOnlyGraphEngine: KeyboardOnlyGraphEngine;
    keyboardOnlyTreeEngine: KeyboardOnlyTreeEngine;
    selectChangeEngine: SelectChangeEngine;
    textRenderer: TextRenderer;
    imageRenderer: ImageRenderer;
    shapeRenderer: ShapeRenderer;
    entityRenderer: EntityRenderer;
    edgeRenderer: EdgeRenderer;
    multiTargetUndirectedEdgeRenderer: MultiTargetUndirectedEdgeRenderer;
    curveRenderer: CurveRenderer;
    svgRenderer: SvgRenderer;
    drawingControllerRenderer: DrawingControllerRenderer;
    collisionBoxRenderer: CollisionBoxRenderer;
    entityDetailsButtonRenderer: EntityDetailsButtonRenderer;
    straightEdgeRenderer: StraightEdgeRenderer;
    symmetryCurveEdgeRenderer: SymmetryCurveEdgeRenderer;
    verticalPolyEdgeRenderer: VerticalPolyEdgeRenderer;
    sectionRenderer: SectionRenderer;
    svgNodeRenderer: SvgNodeRenderer;
    textNodeRenderer: TextNodeRenderer;
    urlNodeRenderer: UrlNodeRenderer;
    backgroundRenderer: BackgroundRenderer;
    searchContentHighlightRenderer: SearchContentHighlightRenderer;
    renderer: Renderer;
    controller: Controller;
    stageExport: StageExport;
    stageExportPng: StageExportPng;
    stageExportSvg: StageExportSvg;
    generateFromFolder: GenerateFromFolder;
    keyBindsRegistrar: KeyBindsRegistrar;
    sectionMethods: SectionMethods;
    graphMethods: GraphMethods;
    stageStyleManager: StageStyleManager;
  }
}

export enum ProjectState {
  /**
   * “已保存”
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
   * “未保存”
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
