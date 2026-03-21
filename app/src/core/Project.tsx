import { Service } from "@/core/interfaces/Service";
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
import type { ReferenceBlockRenderer } from "@/core/render/canvas2d/entityRenderer/ReferenceBlockRenderer";
import type { SectionRenderer } from "@/core/render/canvas2d/entityRenderer/section/SectionRenderer";
import type { SvgNodeRenderer } from "@/core/render/canvas2d/entityRenderer/svgNode/SvgNodeRenderer";
import type { TextNodeRenderer } from "@/core/render/canvas2d/entityRenderer/textNode/TextNodeRenderer";
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
import type { KeyBindsRegistrar } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
import type { MouseInteraction } from "@/core/service/controlService/stageMouseInteractionCore/stageMouseInteractionCore";
import type { AutoComputeUtils } from "@/core/service/dataGenerateService/autoComputeEngine/AutoComputeUtils";
import type { AutoCompute } from "@/core/service/dataGenerateService/autoComputeEngine/mainTick";
import type { GenerateFromFolder } from "@/core/service/dataGenerateService/generateFromFolderEngine/GenerateFromFolderEngine";
import type { StageExport } from "@/core/service/dataGenerateService/stageExportEngine/stageExportEngine";
import type { StageExportPng } from "@/core/service/dataGenerateService/stageExportEngine/StageExportPng";
import type { StageExportSvg } from "@/core/service/dataGenerateService/stageExportEngine/StageExportSvg";
import type { StageImport } from "@/core/service/dataGenerateService/stageImportEngine/stageImportEngine";
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
import type { SectionCollisionSolver } from "@/core/stage/stageManager/concreteMethods/SectionCollisionSolver";
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
import { Vector } from "@graphif/data-structures";
import Dexie from "dexie";
import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { getOriginalNameOf } from "virtual:original-class-name";
import { Telemetry } from "./service/Telemetry";
import { ReferenceManager } from "./stage/stageManager/concreteMethods/StageReferenceManager";
import { StageObject } from "./stage/stageObject/abstract/StageObject";

/**
 * “工程”
 */
export class Project extends EventEmitter<{
  contextmenu: [location: Vector];
}> {
  public readonly db: Dexie & {
    meta: Dexie.Table<{ key: string; value: any }, string>;
    stage: Dexie.Table<{ soid: string; type: string; tags: string[] }, string>;
    attachments: Dexie.Table<{ atid: string; data: Blob }, string>;
  };
  public readonly stage = new Map<string, StageObject>();

  private readonly services = new Map<string, Service>();
  private readonly tickableServices: Service[] = [];
  private rafHandle = -1;

  /**
   * 创建一个项目
   */
  constructor(public readonly prid: string = nanoid()) {
    super();
    this.db = new Dexie(`pg-project-${prid}`) as typeof this.db;
    this.db.version(1).stores({
      meta: "key",
      stage: "soid, *tags",
      attachments: "atid",
    });
  }

  /**
   * 立刻加载一个新的服务
   */
  loadService(service: { id?: string; new (...args: any[]): any }) {
    if (!service.id) {
      service.id = nanoid();
      console.warn("[Project] 服务 %o 未指定 ID，自动生成：%s", service, service.id);
    }
    const inst = new service(this);
    this.services.set(service.id, inst);
    if ("tick" in inst) {
      this.tickableServices.push(inst);
    }
    this[service.id as keyof this] = inst as this[keyof this];
  }
  /**
   * 立刻销毁一个服务
   */
  disposeService(serviceId: string) {
    const service = this.services.get(serviceId);
    if (service) {
      service.dispose?.();
      this.services.delete(serviceId);
      this.tickableServices.splice(this.tickableServices.indexOf(service), 1);
    }
  }

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
  private tick() {
    for (const service of this.tickableServices) {
      try {
        service.tick?.();
      } catch (e) {
        console.error("[%s] %o", service, e);
        this.tickableServices.splice(this.tickableServices.indexOf(service), 1);
        if (e !== null && typeof e === "object" && "message" in e && e.message === "test") {
          continue;
        }
        toast.promise(
          Telemetry.event("服务tick方法报错", { service: getOriginalNameOf(service.constructor), error: String(e) }),
          {
            loading: `服务 ${getOriginalNameOf(service.constructor)} 出现错误，正在上报错误信息`,
            success: "错误信息已发送给开发者，文件已自动保存，您现在可以关闭这个标签页了",
            error: "上报失败，文件已自动保存，您现在可以关闭这个标签页了",
          },
        );
      }
    }
  }
  /**
   * 用户关闭标签页时，销毁工程
   */
  async dispose() {
    cancelAnimationFrame(this.rafHandle);
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

  /**
   * 获取某个服务的实例
   */
  getService<T extends keyof this & string>(serviceId: T): this[T] {
    return this.services.get(serviceId) as this[T];
  }

  addAttachment(data: Blob) {
    const atid = nanoid();
    this.db.table("attachments").add({ atid, data });
    return atid;
  }

  get running(): boolean {
    return this.rafHandle !== -1;
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
    sectionCollisionSolver: SectionCollisionSolver;
    tagManager: TagManager;
    keyboardOnlyEngine: KeyboardOnlyEngine;
    keyboardOnlyGraphEngine: KeyboardOnlyGraphEngine;
    keyboardOnlyTreeEngine: KeyboardOnlyTreeEngine;
    selectChangeEngine: SelectChangeEngine;
    textRenderer: TextRenderer;
    imageRenderer: ImageRenderer;
    referenceBlockRenderer: ReferenceBlockRenderer;
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
    stageImport: StageImport;
    generateFromFolder: GenerateFromFolder;
    keyBindsRegistrar: KeyBindsRegistrar;
    sectionMethods: SectionMethods;
    graphMethods: GraphMethods;
    stageStyleManager: StageStyleManager;
    referenceManager: ReferenceManager;
  }
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
