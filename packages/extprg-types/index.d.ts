/* eslint-disable */
/** Auto-generated from extensionHostApiFactory. Do not edit manually. */
import type { __, Omit, Partial } from "lodash";
import type { Camera, LucideProps, View, X, ZoomIn, ZoomOut } from "lucide-react";
import type { Decoder, Encoder } from "@msgpack/msgpack";
import type { DefaultChatTransport, UIMessage } from "ai";
import type { DirEntry, exists, mkdir, readDir, remove } from "@tauri-apps/plugin-fs";
import type { fetch } from "@tauri-apps/plugin-http";
import type { JSONSchema } from "zod/v4/core";
import type { ProxyMethods } from "comlink";
import type { save } from "@tauri-apps/plugin-dialog";
import type { toast } from "sonner";
import type { URI } from "vscode-uri";
import type { Value } from "platejs";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type debounce from "lodash/debounce.js";
import type EventEmitter from "events";
import type katex from "katex";
import type z from "zod";

declare const Button: ({ className, variant, size, asChild, ...props }: ClassAttributes<HTMLButtonElement> & ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<(props?: (ConfigVariants<{ variant: { default: string; destructive: string; outline: string; secondary: string; ghost: string; link: string; }; size: { default: string; sm: string; lg: string; icon: string; }; }> & ClassProp) | undefined) => string> & { asChild?: boolean | undefined; }) => Element;
declare const buttonVariants: (props?: (ConfigVariants<{ variant: { default: string; destructive: string; outline: string; secondary: string; ghost: string; link: string; }; size: { default: string; sm: string; lg: string; icon: string; }; }> & ClassProp) | undefined) => string;
declare interface ClickEventPayload {
  relativeWorldX: number;
  relativeWorldY: number;
  worldX: number;
  worldY: number;
  customData: any;
  uuid: string;
}
declare interface FileSystemProvider {
  read(uri: URI | SerializedObject<"URI">): Promise<Uint8Array<ArrayBufferLike>>;
  readDir(uri: URI | SerializedObject<"URI">): Promise<DirEntry[]>;
  write(uri: URI | SerializedObject<"URI">, content: Uint8Array<ArrayBufferLike> | SerializedObject<"Uint8Array">): Promise<void>;
  remove(uri: URI | SerializedObject<"URI">): Promise<void>;
  exists(uri: URI | SerializedObject<"URI">): Promise<boolean>;
  mkdir(uri: URI | SerializedObject<"URI">): Promise<void>;
  rename(oldUri: URI | SerializedObject<"URI">, newUri: URI | SerializedObject<"URI">): Promise<void>;
}
declare interface Service {
  tick?: (() => void) | undefined;
  dispose?: (() => void | Promise<void>) | undefined;
}
/**
* “工程”
* 一个标签页对应一个工程，一个工程只能对应一个URI
* 一个工程可以加载不同的服务，类似vscode的扩展（Extensions）机制
*/
declare interface Project {
  /**
  * 工程文件的URI
  * key: 服务ID
  * value: 服务实例
  */
  _uri: URI;
  _projectState: ProjectState;
  _isSaving: boolean;
  stage: StageObject[];
  tags: string[];
  /**
  * string：UUID
  * value: Blob
  */
  attachments: Map<string, Blob>;
  /**
  * 创建Encoder对象比直接用encode()快
  * @see https://github.com/msgpack/msgpack-javascript#reusing-encoder-and-decoder-instances
  */
  encoder: Encoder<undefined>;
  decoder: Decoder<undefined>;
  /**
  * 比较两个版本号字符串（格式：x.y.z）
  * @param version1 版本1
  * @param version2 版本2
  * @returns 如果 version1 < version2 返回 -1，如果 version1 > version2 返回 1，如果相等返回 0
  */
  compareVersion(version1: string, version2: string): number;
  /**
  * 检查是否需要升级，如果需要则显示确认对话框
  * @param currentVersion 当前文件版本
  * @param latestVersion 最新版本
  */
  checkAndConfirmUpgrade(currentVersion: string, latestVersion: string): Promise<boolean>;
  /**
  * 解析项目文件（ZIP格式），提取所有数据
  * @returns 解析后的数据对象
  */
  parseProjectFile(): Promise<{ serializedStageObjects: any[]; tags: string[]; references: { sections: Record<string, string[]>; files: string[]; }; metadata: PrgMetadata; readme?: string | undefined; }>;
  /**
  * 服务加载完成后再调用
  */
  init(): Promise<void>;
  isDraft: boolean;
  title: string;
  icon(props: Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>): ReactNode;
  uri: URI;
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
  stash(): Promise<void>;
  save(options: { includeThumbnail?: boolean | undefined; }): Promise<void>;
  references: { sections: Record<string, string[]>; files: string[]; };
  metadata: PrgMetadata;
  readme?: string | undefined;
  getFileContent(options: { includeThumbnail?: boolean | undefined; }): Promise<Uint8Array<ArrayBuffer>>;
  /**
  * 备份用：生成项目内容的哈希值，用于检测内容是否发生变化
  */
  stageHash: string;
  /**
  * 注册一个文件管理器
  * @param scheme 目前有 "file" | "draft"， 以后可能有其他的协议
  */
  addAttachment(data: Blob | SerializedObject<"Blob">): string;
  projectState: ProjectState;
  isSaving: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  /**
  * 立刻加载一个新的服务
  */
  loadService(service: { new (...args: any[]): any; id?: string | undefined; }): void;
  componentDidMount(): void;
  currentComponent: ComponentType<{}> | null;
  getComponent(): ComponentType<{}>;
  render(): ReactNode;
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
  syncAssociationManager: StageSyncAssociationManager;
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
  latexNodeRenderer: LatexNodeRenderer;
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
  keyBindHintEngine: KeyBindHintEngine;
  sectionMethods: SectionMethods;
  graphMethods: GraphMethods;
  stageStyleManager: StageStyleManager;
  autoSaveBackup: AutoSaveBackupService;
  referenceManager: ReferenceManager;
  readonly id: `${string}-${string}-${string}-${string}-${string}`;
  layout: "docked" | "floating";
  floatingRect: Rectangle;
  zIndex: number;
  closing: boolean;
  canDock: boolean;
  closable: boolean;
  closeOnEscape: boolean;
  closeWhenClickOutside: boolean;
  closeWhenClickInside: boolean;
  titleBarOverlay: boolean;
  eventEmitter: EventEmitter<any>;
  readonly services: Map<string, Service>;
  readonly fileSystemProviders: Map<string, FileSystemProvider>;
  readonly tickableServices: Service[];
  rafHandle: number;
  lastTickTime: number;
  /**
  * 注册一个文件管理器
  * @param scheme 目前有 "file" | "draft"， 以后可能有其他的协议
  */
  registerFileSystemProvider(scheme: string, provider: new (...args: any[]) => FileSystemProvider): void;
  fs: FileSystemProvider;
  on(event: string | symbol, listener: (...args: any[]) => void): Project;
  emit(event: string | symbol, ...args: Array<any>): boolean;
  removeAllListeners(event: undefined | string | symbol): Project;
  /**
  * 立刻销毁一个服务
  */
  disposeService(serviceId: string): void;
  /**
  * 获取某个服务的实例
  */
  getService(serviceId: T | SerializedObject<"T">): Project[T];
  loop(): void;
  pause(): void;
  tick(): void;
  dispose(): Promise<void>;
  isRunning: boolean;
  /**
  * If using React Context, re-declare this in your class to be the
  * `React.ContextType` of your `static contextType`.
  * Should be used with type annotation or static contextType.
  *
  * @example
  * ```ts
  * static contextType = MyContext
  * // For TS pre-3.7:
  * context!: React.ContextType<typeof MyContext>
  * // For TS 3.7 and above:
  * declare context: React.ContextType<typeof MyContext>
  * ```
  *
  * @see {@link https://react.dev/reference/react/Component#context React Docs}
  */
  context: unknown;
  setState(state: null | Record<string, never> | SerializedObject<"Record"> | ((prevState: Readonly<Record<string, never>>, props: Readonly<Record<string, never>>) => Record<string, never> | Pick<Record<string, never>, K> | null) | Pick<Record<string, never>, K> | SerializedObject<"Pick">, callback: undefined | (() => void)): void;
  forceUpdate(callback: undefined | (() => void)): void;
  readonly props: Readonly<Record<string, never>>;
  state: Readonly<Record<string, never>>;
  /**
  * Called to determine whether the change in props and state should trigger a re-render.
  *
  * `Component` always returns true.
  * `PureComponent` implements a shallow comparison on props and state and returns true if any
  * props or states have changed.
  *
  * If false is returned, {@link Component.render}, `componentWillUpdate`
  * and `componentDidUpdate` will not be called.
  */
  shouldComponentUpdate?: ((nextProps: Readonly<Record<string, never>>, nextState: Readonly<Record<string, never>>, nextContext: any) => boolean) | undefined;
  /**
  * Called immediately before a component is destroyed. Perform any necessary cleanup in this method, such as
  * cancelled network requests, or cleaning up any DOM elements created in `componentDidMount`.
  */
  componentWillUnmount?: (() => void) | undefined;
  /**
  * Catches exceptions generated in descendant components. Unhandled exceptions will cause
  * the entire component tree to unmount.
  */
  componentDidCatch?: ((error: Error, errorInfo: ErrorInfo) => void) | undefined;
  /**
  * Runs before React applies the result of {@link Component.render render} to the document, and
  * returns an object to be given to {@link componentDidUpdate}. Useful for saving
  * things such as scroll position before {@link Component.render render} causes changes to it.
  *
  * Note: the presence of this method prevents any of the deprecated
  * lifecycle events from running.
  */
  getSnapshotBeforeUpdate?: ((prevProps: Readonly<Record<string, never>>, prevState: Readonly<Record<string, never>>) => any) | undefined;
  /**
  * Called immediately after updating occurs. Not called for the initial render.
  *
  * The snapshot is only present if {@link getSnapshotBeforeUpdate} is present and returns non-null.
  */
  componentDidUpdate?: ((prevProps: Readonly<Record<string, never>>, prevState: Readonly<Record<string, never>>, snapshot?: any) => void) | undefined;
  /**
  * Called immediately before mounting occurs, and before {@link Component.render}.
  * Avoid introducing any side-effects or subscriptions in this method.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use {@link ComponentLifecycle.componentDidMount componentDidMount} or the constructor instead; will stop working in React 17
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#initializing-state}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  componentWillMount?: (() => void) | undefined;
  /**
  * Called immediately before mounting occurs, and before {@link Component.render}.
  * Avoid introducing any side-effects or subscriptions in this method.
  *
  * This method will not stop working in React 17.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use {@link ComponentLifecycle.componentDidMount componentDidMount} or the constructor instead
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#initializing-state}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  UNSAFE_componentWillMount?: (() => void) | undefined;
  /**
  * Called when the component may be receiving new props.
  * React may call this even if props have not changed, so be sure to compare new and existing
  * props if you only want to handle changes.
  *
  * Calling {@link Component.setState} generally does not trigger this method.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use static {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} instead; will stop working in React 17
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#updating-state-based-on-props}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  componentWillReceiveProps?: ((nextProps: Readonly<Record<string, never>>, nextContext: any) => void) | undefined;
  /**
  * Called when the component may be receiving new props.
  * React may call this even if props have not changed, so be sure to compare new and existing
  * props if you only want to handle changes.
  *
  * Calling {@link Component.setState} generally does not trigger this method.
  *
  * This method will not stop working in React 17.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use static {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} instead
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#updating-state-based-on-props}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  UNSAFE_componentWillReceiveProps?: ((nextProps: Readonly<Record<string, never>>, nextContext: any) => void) | undefined;
  /**
  * Called immediately before rendering when new props or state is received. Not called for the initial render.
  *
  * Note: You cannot call {@link Component.setState} here.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use getSnapshotBeforeUpdate instead; will stop working in React 17
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#reading-dom-properties-before-an-update}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  componentWillUpdate?: ((nextProps: Readonly<Record<string, never>>, nextState: Readonly<Record<string, never>>, nextContext: any) => void) | undefined;
  /**
  * Called immediately before rendering when new props or state is received. Not called for the initial render.
  *
  * Note: You cannot call {@link Component.setState} here.
  *
  * This method will not stop working in React 17.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use getSnapshotBeforeUpdate instead
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#reading-dom-properties-before-an-update}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  UNSAFE_componentWillUpdate?: ((nextProps: Readonly<Record<string, never>>, nextState: Readonly<Record<string, never>>, nextContext: any) => void) | undefined;
}
declare enum ProjectState {
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
* 关于各种曲线和直线的渲染
* 注意：这里全都是View坐标系
*/
declare interface CurveRenderer {
  readonly project: Project;
  /**
  * 绘制一条直线实线
  * @param start
  * @param end
  * @param color
  * @param width
  */
  renderSolidLine(start: Vector | SerializedObject<"Vector">, end: Vector | SerializedObject<"Vector">, color: Color | SerializedObject<"Color">, width: number): void;
  /**
  * 绘制折线实线
  * @param locations 所有点构成的数组
  * @param color
  * @param width
  */
  renderSolidLineMultiple(locations: Array<Vector | SerializedObject<"Vector">>, color: Color | SerializedObject<"Color">, width: number): void;
  renderPenStroke(stroke: Array<PenStrokeSegment | SerializedObject<"PenStrokeSegment">>, color: Color | SerializedObject<"Color">): void;
  /**
  * 绘制经过平滑后的折线
  * 核心思路：将折线的顶点转换为连续贝塞尔曲线的控制点。
  * @param locations
  * @param color
  * @param width
  */
  renderSolidLineMultipleSmoothly(locations: Array<Vector | SerializedObject<"Vector">>, color: Color | SerializedObject<"Color">, width: number): void;
  smoothPoints(points: Array<Vector | SerializedObject<"Vector">>, tension: number): { type: string; cp1: { x: number; y: number; }; cp2: { x: number; y: number; }; end: Vector; }[];
  /**
  * 画一段折线，带有宽度实时变化
  * 实测发现有宽度变化，频繁变更粗细会导致渲染卡顿
  * @param locations
  * @param color
  * @param widthList
  */
  renderSolidLineMultipleWithWidth(locations: Array<Vector | SerializedObject<"Vector">>, color: Color | SerializedObject<"Color">, widthList: Array<number>): void;
  /**
  * 绘制折线实线，带有阴影
  * @param locations
  * @param color
  * @param width
  * @param shadowColor
  * @param shadowBlur
  */
  renderSolidLineMultipleWithShadow(locations: Array<Vector | SerializedObject<"Vector">>, color: Color | SerializedObject<"Color">, width: number, shadowColor: Color | SerializedObject<"Color">, shadowBlur: number): void;
  /**
  * 绘制一条虚线
  *
  * 2024年11月10日 发现虚线渲染不生效，也很难排查到原因
  * 2024年12月5日 突然发现又没有问题了，也不知道为什么。
  * @param start
  * @param end
  * @param color
  * @param width
  * @param dashLength 虚线的长度，效果： =2: "--  --  --  --", =1: "- - - - -"
  */
  renderDashedLine(start: Vector | SerializedObject<"Vector">, end: Vector | SerializedObject<"Vector">, color: Color | SerializedObject<"Color">, width: number, dashLength: number): void;
  /**
  * 绘制一条双实线
  * 通过绘制两条平行的实线来实现双实线效果
  * @param start
  * @param end
  * @param color
  * @param width
  * @param gap 两条线之间的间距
  */
  renderDoubleLine(start: Vector | SerializedObject<"Vector">, end: Vector | SerializedObject<"Vector">, color: Color | SerializedObject<"Color">, width: number, gap: number): void;
  /**
  * 绘制一条贝塞尔曲线
  * @param curve
  */
  renderBezierCurve(curve: CubicBezierCurve | SerializedObject<"CubicBezierCurve">, color: Color | SerializedObject<"Color">, width: number): void;
  /**
  * 绘制一条虚线贝塞尔曲线
  * @param curve
  * @param color
  * @param width
  * @param dashLength 虚线的长度
  */
  renderDashedBezierCurve(curve: CubicBezierCurve | SerializedObject<"CubicBezierCurve">, color: Color | SerializedObject<"Color">, width: number, dashLength: number): void;
  /**
  * 绘制一条双实线贝塞尔曲线
  * 通过绘制两条平行的贝塞尔曲线来实现双实线效果
  * @param curve
  * @param color
  * @param width
  * @param gap 两条线之间的间距
  */
  renderDoubleBezierCurve(curve: CubicBezierCurve | SerializedObject<"CubicBezierCurve">, color: Color | SerializedObject<"Color">, width: number, gap: number): void;
  /**
  * 绘制一条对称曲线
  * @param curve
  */
  renderSymmetryCurve(curve: SymmetryCurve | SerializedObject<"SymmetryCurve">, color: Color | SerializedObject<"Color">, width: number): void;
  /**
  * 绘制一条从颜色渐变到另一种颜色的实线
  */
  renderGradientLine(start: Vector | SerializedObject<"Vector">, end: Vector | SerializedObject<"Vector">, startColor: Color | SerializedObject<"Color">, endColor: Color | SerializedObject<"Color">, width: number): void;
  /**
  * 绘制一条颜色渐变的贝塞尔曲线
  * @param curve
  */
  renderGradientBezierCurve(curve: CubicBezierCurve | SerializedObject<"CubicBezierCurve">, startColor: Color | SerializedObject<"Color">, endColor: Color | SerializedObject<"Color">, width: number): void;
}
/**
* 图片渲染器
* 基于View坐标系
*/
declare interface ImageRenderer {
  readonly project: Project;
  /**
  * 根据图片HTML元素来渲染图片到canvas指定位置
  * @param imageElement
  * @param location 图片左上角位置
  * @param scale 1 表示正常，0.5 表示缩小一半，2 表示放大两倍
  */
  renderImageElement(source: ImageBitmap | SerializedObject<"ImageBitmap"> | HTMLImageElement | SerializedObject<"HTMLImageElement"> | HTMLVideoElement | SerializedObject<"HTMLVideoElement"> | HTMLCanvasElement | SerializedObject<"HTMLCanvasElement"> | OffscreenCanvas | SerializedObject<"OffscreenCanvas">, location: Vector | SerializedObject<"Vector">, scale: number): void;
  /**
  * 根据ImageBitmap来渲染图片到canvas指定位置
  * @param bitmap ImageBitmap对象
  * @param location 图片左上角位置
  * @param scale 1 表示正常，0.5 表示缩小一半，2 表示放大两倍
  */
  renderImageBitmap(bitmap: undefined | ImageBitmap | SerializedObject<"ImageBitmap">, location: Vector | SerializedObject<"Vector">, scale: number): void;
}
/**
* 基础图形渲染器
* 注意：全部都是基于View坐标系
*/
declare interface ShapeRenderer {
  readonly project: Project;
  /**
  * 画一个圆
  * @param ctx
  * @param centerLocation
  * @param radius
  * @param color
  * @param strokeColor
  * @param strokeWidth
  */
  renderCircle(centerLocation: Vector | SerializedObject<"Vector">, radius: number, color: Color | SerializedObject<"Color">, strokeColor: Color | SerializedObject<"Color">, strokeWidth: number): void;
  /**
  * 画一个圆弧但不填充
  * 从开始弧度到结束弧度，逆时针转过去。（因为y轴向下）
  * @param centerLocation 圆弧的中心
  * @param radius 半径
  * @param angle1 开始弧度
  * @param angle2 结束弧度
  * @param strokeColor
  * @param strokeWidth
  */
  renderArc(centerLocation: Vector | SerializedObject<"Vector">, radius: number, angle1: number, angle2: number, strokeColor: Color | SerializedObject<"Color">, strokeWidth: number): void;
  /**
  * 画一个矩形，但是坐标点是矩形的中心点
  * @param centerLocation
  * @param width
  * @param height
  * @param color
  * @param strokeColor
  * @param strokeWidth
  * @param radius
  */
  renderRectFromCenter(centerLocation: Vector | SerializedObject<"Vector">, width: number, height: number, color: Color | SerializedObject<"Color">, strokeColor: Color | SerializedObject<"Color">, strokeWidth: number, radius: number): void;
  /**
  * 画矩形
  * @param rect
  * @param color
  * @param strokeColor
  * @param strokeWidth
  * @param radius
  */
  renderRect(rect: Rectangle | SerializedObject<"Rectangle">, color: Color | SerializedObject<"Color">, strokeColor: Color | SerializedObject<"Color">, strokeWidth: number, radius: number): void;
  renderDashedRect(rect: Rectangle | SerializedObject<"Rectangle">, color: Color | SerializedObject<"Color">, strokeColor: Color | SerializedObject<"Color">, strokeWidth: number, radius: number, dashLength: number): void;
  /**
  * 画一个带阴影的矩形
  * @param rect
  */
  renderRectWithShadow(rect: Rectangle | SerializedObject<"Rectangle">, fillColor: Color | SerializedObject<"Color">, strokeColor: Color | SerializedObject<"Color">, strokeWidth: number, shadowColor: Color | SerializedObject<"Color">, shadowBlur: number, shadowOffsetX: number, shadowOffsetY: number, radius: number): void;
  /**
  * 绘制一个多边形并填充
  * @param points 多边形的顶点数组，三角形就只需三个点，
  * 不用考虑首尾点闭合。
  * @param fillColor
  * @param strokeColor
  * @param strokeWidth
  */
  renderPolygonAndFill(points: Array<Vector | SerializedObject<"Vector">>, fillColor: Color | SerializedObject<"Color">, strokeColor: Color | SerializedObject<"Color">, strokeWidth: number, lineJoin: "round" | "bevel"): void;
  /**
  * 绘制一个以中心点为基准的三角形
  * @param centerLocation 中心点位置
  * @param size 三角形大小（外接圆半径）
  * @param rotation 旋转角度（弧度）
  * @param fillColor 填充颜色
  * @param strokeColor 边框颜色
  * @param strokeWidth 边框宽度
  */
  renderTriangleFromCenter(centerLocation: Vector | SerializedObject<"Vector">, size: number, rotation: number, fillColor: Color | SerializedObject<"Color">, strokeColor: Color | SerializedObject<"Color">, strokeWidth: number): void;
  /**
  * 绘制一个以中心点为基准的正方形
  * @param centerLocation 中心点位置
  * @param size 正方形边长
  * @param rotation 旋转角度（弧度）
  * @param fillColor 填充颜色
  * @param strokeColor 边框颜色
  * @param strokeWidth 边框宽度
  */
  renderSquareFromCenter(centerLocation: Vector | SerializedObject<"Vector">, size: number, rotation: number, fillColor: Color | SerializedObject<"Color">, strokeColor: Color | SerializedObject<"Color">, strokeWidth: number): void;
  /**
  * 绘制中心过渡的圆形不加边框
  * 常用于一些特效
  */
  renderCircleTransition(viewLocation: Vector | SerializedObject<"Vector">, radius: number, centerColor: Color | SerializedObject<"Color">): void;
  /**
  * 画一个类似摄像机的形状，矩形边框
  * 表面上看上去是一个矩形框，但是只有四个角，每隔边的中间部分是透明的
  * @param rect 矩形
  * @param borderColor 边框颜色
  * @param borderWidth 边框宽度
  */
  renderCameraShapeBorder(rect: Rectangle | SerializedObject<"Rectangle">, borderColor: Color | SerializedObject<"Color">, borderWidth: number): void;
  /**
  * 渲染缩放控制点的箭头指示
  * 在矩形的左上角和右下角绘制箭头，用于提示用户可以拖拽缩放
  * @param rect 缩放控制点矩形
  * @param color 箭头颜色
  * @param strokeWidth 箭头线条宽度
  */
  renderResizeArrow(rect: Rectangle | SerializedObject<"Rectangle">, color: Color | SerializedObject<"Color">, strokeWidth: number): void;
}
declare interface SvgRenderer {
  svgCache: { [key: string]: HTMLImageElement; };
  readonly project: Project;
  renderSvgFromLeftTop(svg: string, location: Vector | SerializedObject<"Vector">, width: number, height: number): void;
  renderSvgFromCenter(svg: string, centerLocation: Vector | SerializedObject<"Vector">, width: number, height: number): void;
  renderSvgFromLeftTopWithoutSize(svg: string, location: Vector | SerializedObject<"Vector">, scaleNumber: number): void;
  renderSvgFromCenterWithoutSize(svg: string, centerLocation: Vector | SerializedObject<"Vector">): void;
}
/**
* 专门用于在Canvas上渲染文字
* 支持缓存
* 注意：基于View坐标系
*/
declare interface TextRenderer {
  cache: LruCache<string, ImageBitmap>;
  readonly project: Project;
  hash(text: string, size: number, fontFamily: undefined | string, fontWeight: undefined | string): string;
  getCache(text: string, size: number, fontFamily: undefined | string, fontWeight: undefined | string): ImageBitmap | undefined;
  /**
  * 获取text相同，fontSize最接近的缓存图片
  */
  getCacheNearestSize(text: string, size: number, fontFamily: undefined | string, fontWeight: undefined | string): ImageBitmap | undefined;
  buildCache(text: string, size: number, color: Color | SerializedObject<"Color">, fontFamily: undefined | string, fontWeight: undefined | string): CanvasImageSource;
  /**
  * 从左上角画文本
  */
  renderText(text: string, location: Vector | SerializedObject<"Vector">, size: number, color: Color | SerializedObject<"Color">, fontFamily: undefined | string, fontWeight: undefined | string): void;
  /**
  * 渲染临时文字，不构建缓存，不使用缓存
  */
  renderTempText(text: string, location: Vector | SerializedObject<"Vector">, size: number, color: Color | SerializedObject<"Color">, fontFamily: undefined | string, fontWeight: undefined | string): void;
  /**
  * 从中心位置开始绘制文本
  */
  renderTextFromCenter(text: string, centerLocation: Vector | SerializedObject<"Vector">, size: number, color: Color | SerializedObject<"Color">, fontFamily: undefined | string, fontWeight: undefined | string): void;
  renderTempTextFromCenter(text: string, centerLocation: Vector | SerializedObject<"Vector">, size: number, color: Color | SerializedObject<"Color">, fontFamily: undefined | string, fontWeight: undefined | string): void;
  renderTextInRectangle(text: string, rectangle: Rectangle | SerializedObject<"Rectangle">, color: Color | SerializedObject<"Color">, fontFamily: undefined | string, fontWeight: undefined | string): void;
  getFontSizeByRectangleSize(text: string, rectangle: Rectangle | SerializedObject<"Rectangle">, fontFamily: undefined | string, fontWeight: undefined | string): Vector;
  /**
  * 渲染多行文本
  * @param text
  * @param location
  * @param fontSize
  * @param color
  * @param lineHeight
  */
  renderMultiLineText(text: string, location: Vector | SerializedObject<"Vector">, fontSize: number, limitWidth: number, color: Color | SerializedObject<"Color">, lineHeight: number, limitLines: number, fontFamily: undefined | string, fontWeight: undefined | string): void;
  renderTempMultiLineText(text: string, location: Vector | SerializedObject<"Vector">, fontSize: number, limitWidth: number, color: Color | SerializedObject<"Color">, lineHeight: number, limitLines: number, fontFamily: undefined | string, fontWeight: undefined | string): void;
  /**
  * 从中心位置绘制带描边的多行文本。
  * 描边颜色通常设为背景色，用于让文字"压住"穿过它的连线，
  * 比矩形遮罩更简洁且不依赖坐标求交。
  */
  renderMultiLineTextFromCenterWithStroke(text: string, centerLocation: Vector | SerializedObject<"Vector">, size: number, fillColor: Color | SerializedObject<"Color">, strokeColor: Color | SerializedObject<"Color">, limitWidth: number, lineHeight: number, fontFamily: undefined | string, fontWeight: undefined | string): void;
  renderMultiLineTextFromCenter(text: string, centerLocation: Vector | SerializedObject<"Vector">, size: number, limitWidth: number, color: Color | SerializedObject<"Color">, lineHeight: number, limitLines: number, fontFamily: undefined | string, fontWeight: undefined | string): void;
  renderTempMultiLineTextFromCenter(text: string, centerLocation: Vector | SerializedObject<"Vector">, size: number, limitWidth: number, color: Color | SerializedObject<"Color">, lineHeight: number, limitLines: number, fontFamily: undefined | string, fontWeight: undefined | string): void;
  textArrayCache: LruCache<string, string[]>;
  /**
  * 加了缓存后的多行文本渲染函数
  * @param text
  * @param fontSize
  * @param limitWidth
  */
  textToTextArrayWrapCache(text: string, fontSize: number, limitWidth: number, fontFamily: undefined | string, fontWeight: undefined | string): string[];
  /**
  * 渲染多行文本的辅助函数
  * 将一段字符串分割成多行数组，遇到宽度限制和换行符进行换行。
  * 复用 font.tsx 中的公共函数
  * @param text
  */
  textToTextArray(text: string, fontSize: number, limitWidth: number, fontFamily: undefined | string, fontWeight: undefined | string): string[];
  /**
  * 测量多行文本的大小
  * @param text
  * @param fontSize
  * @param limitWidth
  * @returns
  */
  measureMultiLineTextSize(text: string, fontSize: number, limitWidth: number, lineHeight: number, fontFamily: undefined | string, fontWeight: undefined | string): Vector;
}
/**
* 绘画控制器
*/
declare interface DrawingControllerRenderer {
  readonly project: Project;
  /**
  * 渲染预渲染的涂鸦
  */
  renderTempDrawing(): void;
  renderTrace(currentStrokeColor: Color | SerializedObject<"Color">): void;
  renderMouse(currentStrokeColor: Color | SerializedObject<"Color">): void;
  renderAdjusting(currentStrokeColor: Color | SerializedObject<"Color">): void;
  /**
  * 画一个跟随鼠标的巨大十字准星
  * 直线模式
  */
  renderAxisMouse(): void;
  diffAngle: number;
  rotateUpAngle(): void;
  rotateDownAngle(): void;
  /**
  * 画跟随鼠标的角度量角器
  */
  renderAngleMouse(mouseLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 画一条线，专用于在透明状态的时候能清晰的看到线条
  * 因此需要叠两层
  * @param lineStart
  * @param lineEnd
  */
  renderLine(lineStart: Vector | SerializedObject<"Vector">, lineEnd: Vector | SerializedObject<"Vector">): void;
}
/**
* 碰撞箱渲染器
*/
declare interface CollisionBoxRenderer {
  readonly project: Project;
  dynamicScale: number;
  reDynamicScale: number;
  render(collideBox: CollisionBox | SerializedObject<"CollisionBox">, color: Color | SerializedObject<"Color">, dashed: boolean): void;
}
/**
* 直线渲染器
*/
declare interface StraightEdgeRenderer {
  readonly project: Project;
  getCuttingEffects(edge: LineEdge | SerializedObject<"LineEdge">): Effect[];
  getConnectedEffects(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">, targetRectangleRate: undefined | Vector | SerializedObject<"Vector">): Effect[];
  renderLine(start: Vector | SerializedObject<"Vector">, end: Vector | SerializedObject<"Vector">, edge: LineEdge | SerializedObject<"LineEdge">, width: number): void;
  renderNormalState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  getNormalStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  getCycleStageSvg(): ReactNode;
  getShiftingStageSvg(): ReactNode;
  renderArrowHead(edge: LineEdge | SerializedObject<"LineEdge">, direction: Vector | SerializedObject<"Vector">, endPoint: Vector | SerializedObject<"Vector">, size: number): void;
  /**
  * 对三角形箭头，将线体终点从节点边缘往回缩进到三角形底边，
  * 避免线体穿入空心三角形内部。
  * 缩进量 = triSize = size * 1.8，其中 size = 8 * edgeWidth（世界坐标）
  */
  getAdjustedLineEnd(endPoint: Vector | SerializedObject<"Vector">, direction: Vector | SerializedObject<"Vector">, arrowType: string, edgeWidth: number): Vector;
  shouldRenderTargetArrow(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  renderShiftingState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderCycleState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderVirtualEdge(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, mouseLocation: Vector | SerializedObject<"Vector">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">): void;
  renderVirtualConfirmedEdge(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, endNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">, targetRectangleRate: undefined | Vector | SerializedObject<"Vector">): void;
  isCycleState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  isNormalState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
}
/**
* 贝塞尔曲线
*/
declare interface SymmetryCurveEdgeRenderer {
  readonly project: Project;
  shouldRenderTargetArrow(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  getCuttingEffects(edge: LineEdge | SerializedObject<"LineEdge">): Effect[];
  getConnectedEffects(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">, targetRectangleRate: undefined | Vector | SerializedObject<"Vector">): Effect[];
  renderNormalState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderShiftingState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderCycleState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  getNormalStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  getCycleStageSvg(): ReactNode;
  getShiftingStageSvg(): ReactNode;
  renderVirtualEdge(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, mouseLocation: Vector | SerializedObject<"Vector">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">): void;
  renderVirtualConfirmedEdge(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, endNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">, targetRectangleRate: undefined | Vector | SerializedObject<"Vector">): void;
  /**
  * 渲染curve及箭头,curve.end即箭头头部
  * @param curve
  */
  renderArrowCurve(curve: SymmetryCurve | SerializedObject<"SymmetryCurve">, color: Color | SerializedObject<"Color">, width: number, edge: undefined | LineEdge | SerializedObject<"LineEdge">): void;
  /**
  //  * 仅仅绘制曲线
  //  * @param curve
  //  */
  renderText(curve: SymmetryCurve | SerializedObject<"SymmetryCurve">, edge: LineEdge | SerializedObject<"LineEdge">): void;
  isCycleState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  isNormalState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
}
/**
* 折线渲染器
*/
declare interface VerticalPolyEdgeRenderer {
  readonly project: Project;
  getCuttingEffects(edge: LineEdge | SerializedObject<"LineEdge">): Effect[];
  getConnectedEffects(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">, targetRectangleRate: undefined | Vector | SerializedObject<"Vector">): Effect[];
  /**
  * 起始点在目标点的哪个区域，返回起始点朝向终点的垂直向量
  *    上
  * 左 end 右
  *    下
  * 如果起点在左侧，返回 "->" 即 new Vector(1, 0)
  * @param edge
  * @returns
  */
  getVerticalDirection(edge: LineEdge | SerializedObject<"LineEdge">): Vector;
  /**
  * 固定长度
  */
  fixedLength: number;
  renderTest(edge: LineEdge | SerializedObject<"LineEdge">): void;
  gaussianFunction(x: number): number;
  renderNormalState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderShiftingState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  shouldRenderTargetArrow(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  renderArrowHead(edge: LineEdge | SerializedObject<"LineEdge">, direction: Vector | SerializedObject<"Vector">, endPoint: Vector | SerializedObject<"Vector">): void;
  renderCycleState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  getNormalStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  getCycleStageSvg(): ReactNode;
  getShiftingStageSvg(): ReactNode;
  renderVirtualEdge(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, mouseLocation: Vector | SerializedObject<"Vector">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">): void;
  renderVirtualConfirmedEdge(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, endNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">, targetRectangleRate: undefined | Vector | SerializedObject<"Vector">): void;
  isCycleState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  isNormalState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
}
/**
* 边的总渲染器单例
*/
declare interface EdgeRenderer {
  currentRenderer: EdgeRendererClass;
  readonly project: Project;
  checkRendererBySettings(lineStyle: "bezier" | "straight" | "vertical"): void;
  /**
  * 更新渲染器
  */
  updateRenderer(style: "bezier" | "straight" | "vertical"): Promise<void>;
  renderLineEdge(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderCrEdge(edge: CubicCatmullRomSplineEdge | SerializedObject<"CubicCatmullRomSplineEdge">): void;
  renderArcEdge(edge: ArcEdge | SerializedObject<"ArcEdge">): void;
  /**
  * 当一个内部可连接实体被外部连接但它的父级section折叠了
  * 通过这个函数能获取它的最小非折叠父级
  * 可以用于连线的某一端被折叠隐藏了的情况
  * @param innerEntity
  */
  getMinNonCollapseParentSection(innerEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">): Section;
  getEdgeView(edge: LineEdge | SerializedObject<"LineEdge">): LineEdge;
  getEdgeSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  renderVirtualEdge(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, mouseLocation: Vector | SerializedObject<"Vector">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">): void;
  renderVirtualConfirmedEdge(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, endNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">, targetRectangleRate: undefined | Vector | SerializedObject<"Vector">): void;
  getCuttingEffects(edge: Edge | SerializedObject<"Edge">): Effect[];
  getConnectedEffects(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">, targetRectangleRate: undefined | Vector | SerializedObject<"Vector">): Effect[];
  /**
  * 绘制箭头
  * @param endPoint 世界坐标
  * @param direction
  * @param size
  */
  renderArrowHead(endPoint: Vector | SerializedObject<"Vector">, direction: Vector | SerializedObject<"Vector">, size: number, color: Color | SerializedObject<"Color">): void;
  /**
  * 根据 arrowType 绘制 target 端箭头/装饰
  * @param endPoint 世界坐标（target 端）
  * @param startPoint 世界坐标（source 端节点边缘，用于菱形绘制起点）
  * @param direction 箭头方向（归一化，target 端朝向）
  * @param size 箭头尺寸（= 8 * edgeWidth）
  * @param color 颜色
  * @param arrowType 箭头类型
  * @param edgeWidth 线宽（世界坐标，用于描边粗细同步）
  * @param sourceDirection source 端离开节点的方向（归一化），供菱形使用；缺省时从 startPoint→endPoint 推算
  */
  renderArrowByType(endPoint: Vector | SerializedObject<"Vector">, startPoint: Vector | SerializedObject<"Vector">, direction: Vector | SerializedObject<"Vector">, size: number, color: Color | SerializedObject<"Color">, arrowType: string, edgeWidth: number, sourceDirection: undefined | Vector | SerializedObject<"Vector">): void;
  /**
  * 空心三角形箭头（UML 继承/实现）
  * 尖部 30°（两侧各 15°），比燕尾更尖锐更长
  * 填充舞台背景色，遮住穿过三角形内部的线体
  */
  renderHollowTriangleArrow(endPoint: Vector | SerializedObject<"Vector">, direction: Vector | SerializedObject<"Vector">, size: number, color: Color | SerializedObject<"Color">, edgeWidth: number): void;
  /**
  * 实心三角形箭头
  * 尖部 30°（两侧各 15°），比燕尾更尖锐更长
  */
  renderFilledTriangleArrow(endPoint: Vector | SerializedObject<"Vector">, direction: Vector | SerializedObject<"Vector">, size: number, color: Color | SerializedObject<"Color">): void;
  /**
  * 在 source 端绘制菱形（聚合/组合）
  * 菱形完全在节点外部，内侧尖端（inner）贴住节点边缘
  * @param sourceEdgePoint source 端节点边缘世界坐标
  * @param direction 从 source 指向 target 的方向（归一化，即离开节点的方向）
  * @param size 菱形半轴长度
  * @param color 颜色
  * @param filled 是否实心
  * @param edgeWidth 线宽（世界坐标，用于描边粗细同步）
  */
  renderDiamondAtSource(sourceEdgePoint: Vector | SerializedObject<"Vector">, direction: Vector | SerializedObject<"Vector">, size: number, color: Color | SerializedObject<"Color">, filled: boolean, edgeWidth: number): void;
  /**
  * 生成箭头的SVG多边形
  * @param endPoint 世界坐标
  * @param direction
  * @param size
  * @returns SVG多边形字符串
  */
  generateArrowHeadSvg(endPoint: Vector | SerializedObject<"Vector">, direction: Vector | SerializedObject<"Vector">, size: number, edgeColor: Color | SerializedObject<"Color">): ReactNode;
}
/**
* 不同类型的边的渲染器 基类
*
* 形态：
*   正常形态
*   自环形态
*   偏移形态（未实现）
*
* 交互时状态 阴影：
*   鼠标悬浮阴影
*   选中阴影
*   即将删除警告阴影
*
* 虚拟连线：
*   鼠标拖拽时还未连接到目标
*   鼠标拖拽时吸附到目标
*
* 特效：
*   连接成功特效
*   删除斩断特效
*/
declare interface EdgeRendererClass {
  isCycleState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  isNormalState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  /**
  * 绘制正常看到的状态
  */
  renderNormalState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  /**
  * 绘制双向线的偏移状态
  */
  renderShiftingState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  /**
  * 绘制自环状态
  */
  renderCycleState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  getNormalStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  getShiftingStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  getCycleStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  /**
  * 绘制鼠标连线移动时的虚拟连线效果
  * @param startNode
  * @param mouseLocation 世界坐标系
  */
  renderVirtualEdge(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, mouseLocation: Vector | SerializedObject<"Vector">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">): void;
  /**
  * 绘制鼠标连线移动到目标节点上吸附住 时候虚拟连线效果
  * @param startNode
  * @param endNode
  */
  renderVirtualConfirmedEdge(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, endNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">, targetRectangleRate: undefined | Vector | SerializedObject<"Vector">): void;
  /**
  * 获取这个线在切断时的特效
  * 外层将在切断时根据此函数来获取特效并自动加入到渲染器中
  */
  getCuttingEffects(edge: Edge | SerializedObject<"Edge">): Effect[];
  /**
  * 获取这个线在连接成功时的特效
  */
  getConnectedEffects(startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">, targetRectangleRate: undefined | Vector | SerializedObject<"Vector">): Effect[];
}
/**
* 仅仅渲染一个节点右上角的按钮
*/
declare interface EntityDetailsButtonRenderer {
  readonly project: Project;
  render(entity: Entity | SerializedObject<"Entity">): void;
}
/**
* 处理节点相关的绘制
*/
declare interface EntityRenderer {
  sectionSortedZIndex: Section[];
  extensionEntityRenderer: ExtensionEntityRenderer;
  readonly project: Project;
  /**
  * 对所有section排序一次
  * 为了防止每帧都调用导致排序，为了提高性能
  * 决定：每隔几秒更新一次
  */
  sortSectionsByZIndex(): void;
  tickNumber: number;
  renderAllSectionsBackground(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  /**
  * 统一渲染全部框的大标题
  */
  renderAllSectionsBigTitle(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  /**
  * 检查实体是否应该被跳过渲染
  */
  shouldSkipEntity(entity: Entity | SerializedObject<"Entity">, viewRectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isBackgroundImageNode(entity: Entity | SerializedObject<"Entity">): boolean;
  /**
  * 统一渲染所有实体
  */
  renderAllEntities(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  /**
  * 父渲染函数,这里在代码上游不会传入Section
  * @param entity
  */
  renderEntity(entity: Entity | SerializedObject<"Entity">): void;
  renderEntityDebug(entity: Entity | SerializedObject<"Entity">): void;
  renderConnectPoint(connectPoint: ConnectPoint | SerializedObject<"ConnectPoint">): void;
  renderImageNode(imageNode: ImageNode | SerializedObject<"ImageNode">): void;
  /**
  * 渲染涂鸦笔画
  * TODO: 绘制时的碰撞箱应该有一个合适的宽度
  * @param penStroke
  */
  renderPenStroke(penStroke: PenStroke | SerializedObject<"PenStroke">): void;
  renderEntityDetails(entity: Entity | SerializedObject<"Entity">): void;
  _renderEntityDetails(entity: Entity | SerializedObject<"Entity">, limitLiens: number): void;
  renderEntityTagShap(entity: Entity | SerializedObject<"Entity">): void;
  /**
  * 在 ConnectableEntity 选中时，于碰撞箱对应方向的中点外侧渲染一个扁宽三角形，表示生长方向。
  * 三角形在世界坐标系中定义，随画布缩放/平移正确跟随节点。
  *
  * 尺寸说明（世界单位）：
  *   halfWidth = 12  垂直于生长方向的半宽，形成扁宽效果
  *   depth     = 8   沿生长方向的深度
  *   gap       = 9.5 底边距碰撞箱边框的偏移（选中框外扩 7.5 + 额外 2）
  */
  renderGrowthDirectionTriangle(entity: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
}
declare interface ExtensionEntityRenderer {
  readonly project: Project;
  render(entity: ExtensionEntity | SerializedObject<"ExtensionEntity">): void;
  drawPendingBox(ctx: CanvasRenderingContext2D | SerializedObject<"CanvasRenderingContext2D">, x: number, y: number, w: number, h: number): void;
  drawErrorBox(ctx: CanvasRenderingContext2D | SerializedObject<"CanvasRenderingContext2D">, x: number, y: number, w: number, h: number, text: string, extensionId: string, color: string): void;
  drawCollisionBox(ctx: CanvasRenderingContext2D | SerializedObject<"CanvasRenderingContext2D">, entity: ExtensionEntity | SerializedObject<"ExtensionEntity">, scale: number): void;
  renderSelectionOutline(ctx: CanvasRenderingContext2D | SerializedObject<"CanvasRenderingContext2D">, entity: ExtensionEntity | SerializedObject<"ExtensionEntity">, scale: number): void;
  triggerWorkerRender(entity: ExtensionEntity | SerializedObject<"ExtensionEntity">, pixelRatio: number): Promise<void>;
}
/**
* 渲染 LaTeX 公式节点
*/
declare interface LatexNodeRenderer {
  readonly project: Project;
  /**
  * 计算节点当前应显示的公式颜色：
  *  - node.color 透明（alpha === 0）→ 跟随主题边框色（StageObjectBorder）
  *  - 否则 → 使用用户自定义的 node.color
  * 返回 CSS color 字符串（如 rgba(...)），与 currentRenderedColorCss 格式一致。
  */
  getTargetColorCss(node: LatexNode | SerializedObject<"LatexNode">): string;
  render(node: LatexNode | SerializedObject<"LatexNode">): void;
}
declare interface MultiTargetUndirectedEdgeRenderer {
  readonly project: Project;
  render(edge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">): void;
  renderLineShape(edge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">, edgeColor: Color | SerializedObject<"Color">, centerLocation: Vector | SerializedObject<"Vector">): void;
  renderConvexShape(edge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">, edgeColor: Color | SerializedObject<"Color">): void;
  renderCircle(edge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">, edgeColor: Color | SerializedObject<"Color">): void;
}
/**
* 引用块节点渲染器
*/
declare interface ReferenceBlockRenderer {
  readonly project: Project;
  render(referenceBlockNode: ReferenceBlockNode | SerializedObject<"ReferenceBlockNode">): void;
  /**
  * 渲染中括号边框
  */
  renderBrackets(rect: Rectangle | SerializedObject<"Rectangle">, color: Color | SerializedObject<"Color">): void;
  /**
  * 渲染被引用的section边框
  */
  renderSourceSectionBorder(section: Section | SerializedObject<"Section">, countNumber: number, color: Color | SerializedObject<"Color">): void;
}
declare interface SectionRenderer {
  readonly project: Project;
  /** 画折叠状态 */
  renderCollapsed(section: Section | SerializedObject<"Section">): void;
  renderNoCollapse(section: Section | SerializedObject<"Section">): void;
  renderBackgroundColor(section: Section | SerializedObject<"Section">): void;
  /**
  * 渲染覆盖了的大标题
  * @param section
  * @returns
  */
  renderBigCoveredTitle(section: Section | SerializedObject<"Section">): void;
  /**
  * 渲染框的标题，以Figma白板的方式
  * @param section
  * @returns
  */
  renderTopTitle(section: Section | SerializedObject<"Section">): void;
  render(section: Section | SerializedObject<"Section">): void;
}
/**
* 渲染SVG节点
*/
declare interface SvgNodeRenderer {
  readonly project: Project;
  render(svgNode: SvgNode | SerializedObject<"SvgNode">): void;
}
declare interface TextNodeRenderer {
  readonly project: Project;
  renderTextNode(node: TextNode | SerializedObject<"TextNode">): void;
  /**
  * 渲染键盘树形模式下的方向提示：
  * - 当前预测生长方向：在生长位置渲染叉号（X），若该位置有可连接实体则高亮并渲染预览连线
  * - 其余三个方向：显示对应的方向切换快捷键，颜色较淡
  * - 广度生长：显示反斜杠快捷键
  * 布局要求：
  * - 顶部和底部提示：居中对齐，标题和快捷键分两行显示
  * - 左侧提示：文字右侧紧贴节点左侧，标题和快捷键分两行显示
  * - 右侧提示：文字左侧紧贴节点右侧，标题和快捷键分两行显示
  * - 标题字体很小，快捷键字体稍大
  */
  renderKeyboardTreeHint(node: TextNode | SerializedObject<"TextNode">): void;
  /**
  * 为逻辑节点在内部边缘绘制「」标记
  */
  renderLogicNodeWarningTrap(node: TextNode | SerializedObject<"TextNode">): void;
  /**
  * 画节点文字层信息
  * @param node
  */
  renderTextNodeTextLayer(node: TextNode | SerializedObject<"TextNode">): void;
}
declare interface UrlNodeRenderer {
  readonly project: Project;
  render(urlNode: UrlNode | SerializedObject<"UrlNode">): void;
  renderHoverState(urlNode: UrlNode | SerializedObject<"UrlNode">): void;
}
/**
* 渲染器
*/
declare interface Renderer {
  w: number;
  h: number;
  renderedEdges: number;
  /**
  * 记录每一项渲染的耗时
  * {
  *   [渲染项的名字]: ?ms
  * }
  */
  readonly timings: { [key: string]: number; };
  deltaTime: number;
  lastTime: number;
  frameCount: number;
  frameIndex: number;
  fps: number;
  /**
  * 解决Canvas模糊问题
  * 它能让画布的大小和屏幕的大小保持一致
  */
  resizeWindow(newW: number, newH: number): void;
  readonly project: Project;
  /**
  * 渲染总入口
  * 建议此函数内部的调用就像一个清单一样，全是函数（这些函数都不是export的）。
  * @returns
  */
  tick(): void;
  tick_(): void;
  renderViewElements(_viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  renderZoomLevelStage(): void;
  renderMainStageElements(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  renderStageElementsWithoutReactions(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  isOverView(viewRectangle: Rectangle | SerializedObject<"Rectangle">, entity: StageObject | SerializedObject<"StageObject">): boolean;
  renderCenterPointer(): void;
  /** 鼠标hover的边 */
  renderHoverCollisionBox(): void;
  /** 框选框 */
  renderSelectingRectangle(): void;
  /** 切割线 */
  renderCuttingLine(): void;
  /** 手动连接线 */
  renderConnectingLine(): void;
  /**
  * 在悬停的图片上绘制十字定位标记
  * 十字线的长和宽刚好是图片的长和宽，交叉点对准鼠标指针中心
  */
  renderCrosshairOnHoverImage(): void;
  /**
  * 渲染和纯键盘操作相关的功能
  */
  renderKeyboardOnly(): void;
  /** 层级移动时，渲染移动指向线 */
  rendererLayerMovingLine(): void;
  renderJumpLine(startLocation: Vector | SerializedObject<"Vector">, endLocation: Vector | SerializedObject<"Vector">): void;
  /** 待删除的节点和边 */
  renderWarningStageObjects(): void;
  /** 画所有被标签了的节点的特殊装饰物和缩小视野时的直观显示 */
  renderTags(): void;
  renderEntities(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  renderEdges(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  /**
  * 渲染背景
  */
  renderBackground(): void;
  /**
  * 每次在frameTick最开始的时候调用一次
  */
  updateFPS(): void;
  /** 画debug信息 */
  renderDebugDetails(): void;
  /**
  * 渲染左下角的文字
  * @returns
  */
  renderSpecialKeys(): void;
  /**
  * 将世界坐标转换为视野坐标 (渲染经常用)
  * 可以画图推理出
  * renderLocation + viewLocation = worldLocation
  * 所以
  * viewLocation = worldLocation - renderLocation
  * 但viewLocation是左上角，还要再平移一下
  * @param worldLocation
  * @returns
  */
  transformWorld2View(location: Vector | SerializedObject<"Vector">): Vector;
  /**
  * 将世界坐标转换为视野坐标 (渲染经常用)
  * 可以画图推理出
  * renderLocation + viewLocation = worldLocation
  * 所以
  * viewLocation = worldLocation - renderLocation
  * 但viewLocation是左上角，还要再平移一下
  * @param worldLocation
  * @returns
  */
  transformWorld2View(rectangle: Rectangle | SerializedObject<"Rectangle">): Rectangle;
  /**
  * 将视野坐标转换为世界坐标 (处理鼠标点击事件用)
  * 上一个函数的相反，就把上一个顺序倒着来就行了
  * worldLocation = viewLocation + renderLocation
  * @param viewLocation
  * @returns
  */
  transformView2World(location: Vector | SerializedObject<"Vector">): Vector;
  /**
  * 将视野坐标转换为世界坐标 (处理鼠标点击事件用)
  * 上一个函数的相反，就把上一个顺序倒着来就行了
  * worldLocation = viewLocation + renderLocation
  * @param viewLocation
  * @returns
  */
  transformView2World(rectangle: Rectangle | SerializedObject<"Rectangle">): Rectangle;
  /**
  * 获取摄像机视野范围内所覆盖住的世界范围矩形
  * 返回的矩形是世界坐标下的矩形
  */
  getCoverWorldRectangle(): Rectangle;
}
declare interface BackgroundRenderer {
  readonly project: Project;
  /**
  * 画洞洞板式的背景
  * @param ctx
  * @param width
  * @param height
  */
  renderDotBackground(viewRect: Rectangle | SerializedObject<"Rectangle">): void;
  /**
  * 水平线条式的背景
  */
  renderHorizonBackground(viewRect: Rectangle | SerializedObject<"Rectangle">): void;
  /**
  * 垂直线条式的背景
  */
  renderVerticalBackground(viewRect: Rectangle | SerializedObject<"Rectangle">): void;
  /**
  * 平面直角坐标系背景
  * 只画一个十字坐标
  */
  renderCartesianBackground(viewRect: Rectangle | SerializedObject<"Rectangle">): void;
  getCurrentGap(): number;
  getLocationXIterator(viewRect: Rectangle | SerializedObject<"Rectangle">, currentGap: number): IterableIterator<number>;
  getLocationYIterator(viewRect: Rectangle | SerializedObject<"Rectangle">, currentGap: number): IterableIterator<number>;
}
/**
* 一些基础的渲染图形
* 注意：这些渲染的参数都是View坐标系下的。
*/
declare interface RenderUtils {
  readonly project: Project;
  /**
  * 绘制一个像素点
  * @param location
  * @param color
  */
  renderPixel(location: Vector | SerializedObject<"Vector">, color: Color | SerializedObject<"Color">): void;
  /**
  * 画箭头（只画头，不画线）
  */
  renderArrow(direction: Vector | SerializedObject<"Vector">, location: Vector | SerializedObject<"Vector">, color: Color | SerializedObject<"Color">, size: number): void;
}
/**
* 高亮渲染所有搜索结果
*/
declare interface SearchContentHighlightRenderer {
  readonly project: Project;
  render(frameTickIndex: number): void;
}
/**
* 一些基础的渲染图形
* 注意：这些渲染的参数都是World坐标系下的。
*/
declare interface WorldRenderUtils {
  readonly project: Project;
  /**
  * 绘制一条Catmull-Rom样条线
  * @param curve
  */
  renderCubicCatmullRomSpline(spline: CubicCatmullRomSpline | SerializedObject<"CubicCatmullRomSpline">, color: Color | SerializedObject<"Color">, width: number): void;
  /**
  * 绘制一条贝塞尔曲线
  * @param curve
  */
  renderBezierCurve(curve: CubicBezierCurve | SerializedObject<"CubicBezierCurve">, color: Color | SerializedObject<"Color">, width: number): void;
  /**
  * 绘制一条对称曲线
  * @param curve
  */
  renderSymmetryCurve(curve: SymmetryCurve | SerializedObject<"SymmetryCurve">, color: Color | SerializedObject<"Color">, width: number): void;
  /**
  * 绘制一条虚线对称曲线
  * @param curve
  */
  renderDashedSymmetryCurve(curve: SymmetryCurve | SerializedObject<"SymmetryCurve">, color: Color | SerializedObject<"Color">, width: number, dashLength: number): void;
  /**
  * 绘制一条双实线对称曲线
  * @param curve
  */
  renderDoubleSymmetryCurve(curve: SymmetryCurve | SerializedObject<"SymmetryCurve">, color: Color | SerializedObject<"Color">, width: number, gap: number): void;
  renderLaser(start: Vector | SerializedObject<"Vector">, end: Vector | SerializedObject<"Vector">, width: number, color: Color | SerializedObject<"Color">): void;
  renderPrismaticBlock(centerLocation: Vector | SerializedObject<"Vector">, radius: number, color: Color | SerializedObject<"Color">, strokeColor: Color | SerializedObject<"Color">, strokeWidth: number): void;
  renderRectangleFlash(rectangle: Rectangle | SerializedObject<"Rectangle">, shadowColor: Color | SerializedObject<"Color">, shadowBlur: number, roundedRadius: number): void;
  renderCuttingFlash(start: Vector | SerializedObject<"Vector">, end: Vector | SerializedObject<"Vector">, width: number, shadowColor: Color | SerializedObject<"Color">): void;
}
/**
* 主要用于解决canvas上无法输入的问题，用临时生成的jsdom元素透明地贴在上面
*/
declare interface InputElement {
  /**
  * 在指定位置创建一个输入框
  * @param location 输入框的左上角位置（相对于窗口左上角的位置）
  * @param defaultValue 一开始的默认文本
  * @param onChange 输入框文本改变函数
  * @param style 输入框样式
  * @returns
  */
  input(location: Vector | SerializedObject<"Vector">, defaultValue: string, onChange: (value: string) => void, style: Partial<CSSStyleDeclaration> | SerializedObject<"Partial">): Promise<string>;
  /**
  * 在指定位置创建一个多行输入框
  * @param location 输入框的左上角位置（相对于窗口左上角的位置）
  * @param defaultValue 一开始的默认文本
  * @param onChange 输入框文本改变函数
  * @param style 输入框样式
  * @param selectAllWhenCreated 是否在创建时全选内容
  * @returns
  */
  textarea(defaultValue: string, onChange: (value: string, element: HTMLTextAreaElement) => void, style: Partial<CSSStyleDeclaration> | SerializedObject<"Partial">, selectAllWhenCreated: boolean, exitOnWheel: boolean, fixedWidth: undefined | number): Promise<string>;
  addSuccessEffect(): void;
  addFailEffect(withToast: boolean): void;
  readonly project: Project;
}
/**
* 瞬间树形布局算法
* 瞬间：一次性直接移动所有节点到合适的位置
* 树形：此布局算法仅限于树形结构，在代码上游保证
*/
declare interface AutoLayoutFastTree {
  readonly project: Project;
  /**
  * 获取当前树的外接矩形，注意不要有环，有环就废了
  * @param node
  * @param skipDashed 是否跳过虚线边（树形格式化时传 true）
  * @returns
  */
  getTreeBoundingRectangle(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, skipDashed: boolean): Rectangle;
  /**
  * 将一个子树 看成一个外接矩形，移动这个外接矩形左上角到某一个位置
  * @param treeRoot
  * @param targetLocation
  * @param skipDashed 是否跳过虚线边
  */
  moveTreeRectTo(treeRoot: ConnectableEntity | SerializedObject<"ConnectableEntity">, targetLocation: Vector | SerializedObject<"Vector">, skipDashed: boolean): void;
  /**
  * 获取根节点的所有第一层子节点，并根据指定方向进行排序
  * @param node 根节点
  * @param childNodes 子节点列表
  * @param direction 排序方向：col表示从上到下，row表示从左到右
  * @returns 排序后的子节点数组
  */
  getSortedChildNodes(_node: ConnectableEntity | SerializedObject<"ConnectableEntity">, childNodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>, direction: "col" | "row"): ConnectableEntity[];
  /**
  * 排列多个子树，支持从上到下或从左到右排列
  * 从上到下排列多个子树，除了第一个子树，其他子树都相对于第一个子树的外接矩形进行位置调整
  * @param trees 要排列的子树数组
  * @param direction 要排列的是哪一侧的子树群
  * @param gap 子树之间的间距
  * @param skipDashed 是否跳过虚线边
  * @returns
  */
  alignTrees(trees: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>, direction: "top" | "bottom" | "left" | "right", gap: number, skipDashed: boolean): void;
  /**
  * 根据根节点位置，调整子树的位置
  * @param rootNode 固定位置的根节点
  * @param childList 需要调整位置的子节点列表
  * @param gap 根节点与子节点之间的间距
  * @param position 子节点相对于根节点的位置：rightCenter(右侧中心)、leftCenter(左侧中心)、bottomCenter(下方中心)、topCenter(上方中心)
  * @param skipDashed 是否跳过虚线边
  */
  adjustChildrenTreesByRootNodeLocation(rootNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, childList: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>, gap: number, position: "rightCenter" | "leftCenter" | "bottomCenter" | "topCenter", skipDashed: boolean): void;
  /**
  * 检测并解决不同方向子树群之间的重叠问题
  * @param rootNode 根节点
  * @param directionGroups 不同方向的子树群
  * @param skipDashed 是否跳过虚线边
  * @param minGap 两个子树群之间的最小间距，推开时保证至少留出此间距
  */
  resolveSubtreeOverlaps(rootNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, directionGroups: { right?: ConnectableEntity[] | undefined; left?: ConnectableEntity[] | undefined; bottom?: ConnectableEntity[] | undefined; top?: ConnectableEntity[] | undefined; }, skipDashed: boolean, minGap: number): void;
  /**
  * 检查两个方向子树群之间是否有矩形重叠或连线相交
  * @param rootNode 根节点
  * @param group1 第一个子树群
  * @param group2 第二个子树群
  * @param skipDashed 是否跳过虚线边
  * @param minGap 最小间距，矩形之间距离小于此值时也视为"重叠"需要推开
  */
  hasOverlapOrLineIntersection(rootNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, group1: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>, group2: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>, dir1: "top" | "bottom" | "left" | "right", dir2: "top" | "bottom" | "left" | "right", skipDashed: boolean, minGap: number): boolean;
  /**
  * 获取一组连线中文字外接矩形的最大尺寸
  * @param edges 连线列表
  * @param direction "horizontal" 取宽度，"vertical" 取高度
  */
  getMaxEdgeTextDimension(edges: Array<Edge | SerializedObject<"Edge">>, direction: "vertical" | "horizontal"): number;
  /**
  * 快速树形布局
  * @param rootNode
  */
  autoLayoutFastTreeMode(rootNode: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  treeReverseX(selectedRootEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  treeReverseY(selectedRootEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  /**
  * 将树形结构翻转位置
  * @param selectedRootEntity
  */
  treeReverse(selectedRootEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">, direction: "X" | "Y"): void;
}
declare interface AutoLayout {
  readonly project: Project;
  /**
  * DAG布局算法输入数据结构
  */
  getDAGLayoutInput(entities: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): { nodes: { id: string; rectangle: Rectangle; }[]; edges: { from: string; to: string; }[]; };
  /**
  * DAG布局算法接口
  * @param input 包含节点和边的DAG结构
  * @returns 每个节点的新位置 { [nodeId: string]: Vector }
  */
  computeDAGLayout(input: { nodes: { id: string; rectangle: Rectangle; }[]; edges: { from: string; to: string; }[]; }): { [nodeId: string]: Vector; };
  /**
  * 使用Kahn算法对DAG进行拓扑排序，并计算节点层数
  * @param nodes 节点数组
  * @param edges 边数组
  * @returns 包含拓扑排序结果和节点层数映射的对象
  */
  topologicalSort(nodes: Array<{ id: string; rectangle: Rectangle; }>, edges: Array<{ from: string; to: string; }>): { order: string[]; levels: Map<string, number>; };
  /**
  * DAG布局主函数
  * @param entities 选中的实体列表
  */
  autoLayoutDAG(entities: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): void;
}
/**
* 关系的重新塑性控制器
*
* 曾经：旋转图的节点控制器
* 鼠标按住Ctrl旋转节点
* 或者拖拽连线旋转
*
* 有向边的嫁接
*/
declare interface ControllerAssociationReshapeClass {
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  lastMoveLocation: Vector;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  readonly project: Project;
  readonly bindEventsTimeout: Timeout;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  /**
  * 鼠标移出窗口越界，强行停止功能
  * @param _outsideLocation
  */
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
/**
*
* 处理键盘按下事件
* @param event - 键盘事件
*/
declare interface ControllerCameraClass {
  allowViewerModeInteraction: boolean;
  isUsingMouseGrabMove: boolean;
  lastMousePressLocation: Vector[];
  /**
  * 是否正在使用空格+左键 拖动视野
  */
  isPreGrabbingWhenSpace: boolean;
  mac: ControllerCameraMac;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  /**
  * 处理键盘松开事件
  * @param event - 键盘事件
  */
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  /**
  * 处理鼠标移动事件
  * @param event - 鼠标事件
  */
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMoveOutWindowForcedShutdown(vectorObject: Vector | SerializedObject<"Vector">): void;
  /**
  * 处理鼠标松开事件
  * @param event - 鼠标事件
  */
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  /**
  * 处理鼠标滚轮事件
  * @param event - 滚轮事件
  */
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  dealStealthMode(event: WheelEvent | SerializedObject<"WheelEvent">): boolean;
  /**
  * 在上游代码已经确认是鼠标滚轮事件，这里进行处理
  * @param event
  * @returns
  */
  zoomUIMethod(event: WheelEvent | SerializedObject<"WheelEvent">, overrideDeltaY: undefined | number): void;
  mousewheelFunction(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  /**
  * 处理鼠标双击事件
  * @param event - 鼠标事件
  */
  mouseDoubleClick(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  /**
  * 根据鼠标移动位置移动摄像机
  * @param x - 鼠标在X轴的坐标
  * @param y - 鼠标在Y轴的坐标
  * @param mouseIndex - 鼠标按钮索引
  */
  moveCameraByMouseMove(x: number, y: number, mouseIndex: number): void;
  moveCameraByTouchPadTwoFingerMove(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  zoomCameraByMouseWheel(event: WheelEvent | SerializedObject<"WheelEvent">, overrideDeltaY: undefined | number): void;
  moveYCameraByMouseWheel(event: WheelEvent | SerializedObject<"WheelEvent">, overrideDeltaY: undefined | number): void;
  moveCameraByMouseSideWheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  zoomCameraByMouseSideWheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  moveYCameraByMouseSideWheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  moveXCameraByMouseWheel(event: WheelEvent | SerializedObject<"WheelEvent">, overrideDeltaY: undefined | number): void;
  moveXCameraByMouseSideWheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  /**
  *
  * 区分滚轮和触摸板的核心函数
  * 返回true：是鼠标滚轮事件
  * 返回false：是触摸板事件
  * @param event
  * @returns
  */
  isMouseWheel(event: WheelEvent | SerializedObject<"WheelEvent">): boolean;
  addDistanceNumberAndDetect(distance: number): boolean;
  detectDeltaY: LimitLengthQueue<number>;
  importantNumbers: Set<number>;
  readonly project: Project;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
declare interface ControllerCuttingClass {
  _controlKeyEventRegistered: boolean;
  _isControlKeyDown: boolean;
  onControlKeyDown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  onControlKeyUp(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  registerControlKeyEvents(): void;
  unregisterControlKeyEvents(): void;
  readonly project: Project;
  dispose(): void;
  cuttingLine: Line;
  lastMoveLocation: Vector;
  warningEntity: Entity[];
  warningSections: Section[];
  warningAssociations: Association[];
  isUsing: boolean;
  /**
  * 切割时与实体相交的两点
  */
  twoPointsMap: Record<string, Vector[]>;
  /**
  * 开始绘制斩断线的起点位置
  */
  cuttingStartLocation: Vector;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseDownEvent(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  clearIsolationPoint(): void;
  mouseUpFunction(mouseUpWindowLocation: Vector | SerializedObject<"Vector">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMoveOutWindowForcedShutdown(outsideLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 更新斩断线经过的所有鼠标对象
  *
  * 目前的更新是直接清除所有然后再重新遍历所有对象，后续可以优化
  * 此函数会在鼠标移动被频繁调用，所以需要优化
  */
  updateWarningObjectByCuttingLine(): void;
  /**
  * 用于在释放的时候添加特效
  */
  addEffectByWarningEntity(): void;
  readonly bindEventsTimeout: Timeout;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
/**
* 包含编辑节点文字，编辑详细信息等功能的控制器
*
* 当有节点编辑时，会把摄像机锁定住
*/
declare interface ControllerEdgeEditClass {
  editEdgeText(clickedLineEdge: Edge | SerializedObject<"Edge">, selectAll: boolean): void;
  editMultiTargetEdgeText(clickedEdge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">, selectAll: boolean): void;
  mouseDoubleClick(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly project: Project;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  /**
  * 鼠标移出窗口越界，强行停止功能
  * @param _outsideLocation
  */
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
/**
* 拖拽节点使其移动的控制器
*
*/
declare interface ControllerEntityClickSelectAndMoveClass {
  allowViewerModeInteraction: boolean;
  isMovingEntity: boolean;
  mouseDownViewLocation: Vector;
  shakeDetector: ShakeDetector;
  /** 按住 Shift 拖拽时锁定的移动轴，null 表示尚未确定 */
  shiftAxisLock: "x" | "y" | null;
  /** 按住 Shift 拖拽时，相对于按下时世界坐标的累计位移，用于确定锁定轴 */
  shiftAccumulatedDelta: Vector;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
  readonly project: Project;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
/**
* 创建节点的控制器
*/
declare interface ControllerEntityCreateClass {
  readonly project: Project;
  mouseDoubleClick(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  createConnectPoint(pressLocation: Vector | SerializedObject<"Vector">, addToSections: Array<Section | SerializedObject<"Section">>): void;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  /**
  * 鼠标移出窗口越界，强行停止功能
  * @param _outsideLocation
  */
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
/**
* 创建节点层级移动控制器
*/
declare interface ControllerLayerMovingClass {
  isEnabled: boolean;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  readonly project: Project;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  /**
  * 鼠标移出窗口越界，强行停止功能
  * @param _outsideLocation
  */
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface ControllerEntityResizeClass {
  changeSizeEntity: Entity | null;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
  readonly project: Project;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
declare interface ControllerExtensionEntityClickClass {
  readonly project: Project;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  /**
  * 鼠标移出窗口越界，强行停止功能
  * @param _outsideLocation
  */
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface ControllerImageScaleClass {
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly project: Project;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  /**
  * 鼠标移出窗口越界，强行停止功能
  * @param _outsideLocation
  */
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
/**
* 连线控制器
* 目前的连接方式：
* 拖连（可多重）、
* 左右键点连：右键有点问题
* 折连、
* 拖拽再生连（可多重）、
*/
declare interface ControllerNodeConnectionClass {
  _isControlKeyDown: boolean;
  _controlKeyEventRegistered: boolean;
  onControlKeyDown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  onControlKeyUp(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  registerControlKeyEvents(): void;
  unregisterControlKeyEvents(): void;
  /**
  * 仅限在当前文件中使用的记录
  * 右键点击的位置，仅用于连接检测按下位置和抬起位置是否重叠
  */
  _lastRightMousePressLocation: Vector;
  _isUsing: boolean;
  isUsing: boolean;
  readonly project: Project;
  dispose(): void;
  /**
  * 用于多重连接
  */
  connectFromEntities: ConnectableEntity[];
  connectToEntity: ConnectableEntity | null;
  mouseLocations: Vector[];
  getMouseLocationsPoints(): Vector[];
  /**
  * 拖拽时左键生成质点
  * @param pressWorldLocation
  */
  createConnectPointWhenConnect(): void;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  _startImageLocation: Map<string, Vector>;
  _endImageLocation: Vector | null;
  _hoverImageLocation: Vector | null;
  _previewSourceDirection: Direction | null;
  _previewTargetDirection: Direction | null;
  /**
  * 获取当前悬停的图片节点（用于绘制十字定位标记）
  */
  getHoverImageNode(): ImageNode | null;
  /**
  * 获取当前悬停图片上的精确位置（相对坐标 0-1）
  */
  getHoverImageLocation(): Vector | null;
  onMouseDown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  /**
  * 在mousemove的过程中，是否鼠标悬浮在了目标节点上
  */
  isMouseHoverOnTarget: boolean;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
  mouseUp(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  /**
  * // 判断轨迹
  * // 根据点状数组生成折线段
  * @returns
  */
  getConnectDirectionByMouseTrack(): [Direction | null, Direction | null];
  _hasSourceSparkTriggered: boolean;
  _hasTargetSparkTriggered: boolean;
  getOppositeDirection(direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): Direction;
  /**
  * 一种更快捷的连接方法: 节点在选中状态下右键其它节点直接连接，不必拖动
  * issue #135
  * @param releaseWorldLocation
  */
  clickMultiConnect(releaseWorldLocation: Vector | SerializedObject<"Vector">): void;
  clear(): void;
  updatePreviewDirections(): void;
  directionToRate(direction: null | Direction.Up | Direction.Down | Direction.Left | Direction.Right): Vector;
  getPreviewSourceRectangleRate(): Vector;
  getPreviewTargetRectangleRate(): Vector;
  dragMultiConnect(connectToEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceDirection: null | Direction.Up | Direction.Down | Direction.Left | Direction.Right, targetDirection: null | Direction.Up | Direction.Down | Direction.Left | Direction.Right): void;
  isConnecting(): boolean;
  addConnectEffect(from: ConnectableEntity | SerializedObject<"ConnectableEntity">, to: ConnectableEntity | SerializedObject<"ConnectableEntity">, sourceRectRate: undefined | Vector | SerializedObject<"Vector">, targetRectRate: undefined | Vector | SerializedObject<"Vector">): void;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
/**
* 包含编辑节点文字，编辑详细信息等功能的控制器
*
* 当有节点编辑时，会把摄像机锁定住
*/
declare interface ControllerNodeEditClass {
  readonly project: Project;
  mouseDoubleClick(event: MouseEvent | SerializedObject<"MouseEvent">): Promise<void>;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  editUrlNodeTitle(clickedUrlNode: UrlNode | SerializedObject<"UrlNode">): void;
  /**
  * 编辑 LaTeX 公式节点（双击时调用）
  * 弹出编辑小窗口
  */
  editLatexNode(node: LatexNode | SerializedObject<"LatexNode">): void;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  /**
  * 鼠标移出窗口越界，强行停止功能
  * @param _outsideLocation
  */
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
/**
* 所有和笔迹控制特定的逻辑都在这里
*/
declare interface ControllerPenStrokeControlClass {
  isAdjusting: boolean;
  /**
  * Alt键右键按下时的位置
  */
  startAdjustWidthLocation: Vector;
  /**
  * 在右键移动的过程中，记录上一次的位置
  */
  lastAdjustWidthLocation: Vector;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  onMouseMoveWhenAdjusting(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  readonly project: Project;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  /**
  * 鼠标移出窗口越界，强行停止功能
  * @param _outsideLocation
  */
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
/**
* 涂鸦功能
*/
declare interface ControllerPenStrokeDrawingClass {
  _isUsing: boolean;
  /** 在移动的过程中，记录这一笔画的笔迹 */
  currentSegments: PenStrokeSegment[];
  /** 当前是否是在绘制直线 */
  isDrawingLine: boolean;
  currentStrokeWidth: number;
  /** 待 OCR 识别的笔迹，在 debounce 窗口内累积 */
  pendingOCRStrokes: PenStroke[];
  /** OCR 模型是否存在（首次用到时惰性检查） */
  _ocrModelExists: boolean | null;
  readonly project: Project;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  /**
  * 在 debounce 窗口（1s）后将累积的笔迹合并成一张图片，调用 OCR 后替换为 TextNode
  */
  triggerOCR(...args: []): Promise<void> | undefined;
  releaseMouseAndClear(): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  getCurrentStrokeColor(): Color;
  changeCurrentStrokeColorAlpha(dAlpha: number): void;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
declare interface ControllerRectangleSelectClass {
  allowViewerModeInteraction: boolean;
  _isUsing: boolean;
  /**
  * 框选框
  * 这里必须一开始为null，否则报错，can not asses "Rectangle"
  * 这个框选框是基于世界坐标的。
  * 此变量会根据两个点的位置自动更新。
  */
  selectingRectangle: Rectangle | null;
  isUsing: boolean;
  shutDown(): void;
  mouseMoveOutWindowForcedShutdown(mouseLocation: Vector | SerializedObject<"Vector">): void;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  /**
  * 当前的框选框的方向
  */
  isSelectDirectionRight: boolean;
  getSelectMode(): "intersect" | "contain";
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  readonly project: Project;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
/**
* 包含编辑节点文字，编辑详细信息等功能的控制器
*
* 当有节点编辑时，会把摄像机锁定住
*/
declare interface ControllerSectionEditClass {
  readonly project: Project;
  mouseDoubleClick(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  editSectionTitle(section: Section | SerializedObject<"Section">): void;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  /**
  * 鼠标移出窗口越界，强行停止功能
  * @param _outsideLocation
  */
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
/**
* 这里是专门存放代码相同的地方
*    因为有可能多个控制器公用同一个代码，
*/
declare interface ControllerUtils {
  readonly autoComplete: AutoCompleteManager;
  readonly project: Project;
  viewRectangleToClient(rectangle: Rectangle | SerializedObject<"Rectangle">): Rectangle;
  /**
  * 编辑节点
  * @param clickedNode
  */
  editTextNode(clickedNode: TextNode | SerializedObject<"TextNode">, selectAll: boolean): void;
  editEdgeText(edge: Edge | SerializedObject<"Edge"> | MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">, selectAll: boolean): Promise<void>;
  /**
  * 通过快捷键的方式来打开Entity的详细信息编辑
  */
  editNodeDetailsByKeyboard(): void;
  editNodeDetails(clickedNode: Entity | SerializedObject<"Entity">): void;
  addTextNodeByLocation(location: Vector | SerializedObject<"Vector">, selectCurrent: boolean, autoEdit: boolean): Promise<string>;
  createConnectPoint(location: Vector | SerializedObject<"Vector">): void;
  addTextNodeFromCurrentSelectedNode(direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right, selectCurrent: boolean): void;
  textNodeInEditModeByUUID(uuid: string): void;
  /**
  * 检测鼠标是否点击到了某个stage对象上
  * @param clickedLocation
  */
  getClickedStageObject(clickedLocation: Vector | SerializedObject<"Vector">): StageObject | null;
  /**
  * 鼠标是否点击在了调整大小的小框上
  * @param clickedLocation
  */
  isClickedResizeRect(clickedLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 将选中的内容标准化
  * 如果选中了外层的section，也选中了内层的物体，则取消选中内部的物体
  */
  selectedEntityNormalizing(): void;
  editSectionTitle(section: Section | SerializedObject<"Section">): void;
}
/**
* 管理文本节点编辑时的自动补全弹窗。
*
* 支持两种触发格式：
* - `#...` — 模糊匹配逻辑节点名称
* - `[[...]]` — 模糊匹配最近文件名，含 `[[文件名#Section名]]` 格式
*/
declare interface AutoCompleteManager {
  currentTabId: string | undefined;
  readonly project: Project;
  /** 根据当前输入文本决定触发哪种补全，无匹配前缀则不做任何事 */
  handle(...args: [text: string, node: TextNode, ele: HTMLTextAreaElement, setWindowId: (id: string) => void]): void;
  /** 根据当前输入文本决定触发哪种补全，无匹配前缀则不做任何事 */
  handle(...args: [text: string, node: TextNode, ele: HTMLTextAreaElement, setWindowId: (id: string) => void]): void | undefined;
  openWindow(node: TextNode | SerializedObject<"TextNode">, entries: Record<string, string> | SerializedObject<"Record">, onSelect: (value: string) => void, setWindowId: (id: string) => void): void;
  handleLogic(text: string, node: TextNode | SerializedObject<"TextNode">, ele: HTMLTextAreaElement | SerializedObject<"HTMLTextAreaElement">, setWindowId: (id: string) => void): void;
  handleReference(...args: [text: string, node: TextNode, ele: HTMLTextAreaElement, setWindowId: (id: string) => void]): Promise<void> | undefined;
  handleReferenceFile(searchText: string, node: TextNode | SerializedObject<"TextNode">, ele: HTMLTextAreaElement | SerializedObject<"HTMLTextAreaElement">, setWindowId: (id: string) => void): Promise<void>;
  handleReferenceSection(searchText: string, node: TextNode | SerializedObject<"TextNode">, ele: HTMLTextAreaElement | SerializedObject<"HTMLTextAreaElement">, setWindowId: (id: string) => void): Promise<void>;
}
/**
* 控制器，控制鼠标、键盘事件
*
* 所有具体的控制功能逻辑都封装在控制器对象中
*/
declare interface Controller {
  setCursorName(name: CursorNameEnum.None | CursorNameEnum.Default | CursorNameEnum.Pointer | CursorNameEnum.Crosshair | CursorNameEnum.Move | CursorNameEnum.Grab | CursorNameEnum.Grabbing | CursorNameEnum.Text | CursorNameEnum.NotAllowed | CursorNameEnum.EResize | CursorNameEnum.NResize | CursorNameEnum.NeResize | CursorNameEnum.NwResize | CursorNameEnum.SResize | CursorNameEnum.SeResize | CursorNameEnum.SwResize | CursorNameEnum.WResize | CursorNameEnum.NsResize | CursorNameEnum.NeswResize | CursorNameEnum.NwseResize | CursorNameEnum.ColResize | CursorNameEnum.RowResize | CursorNameEnum.AllScroll | CursorNameEnum.ZoomIn | CursorNameEnum.ZoomOut | CursorNameEnum.GrabHand | CursorNameEnum.NotAllowedHand | CursorNameEnum.Pen | CursorNameEnum.Eraser | CursorNameEnum.Handwriting | CursorNameEnum.ZoomInHand | CursorNameEnum.ZoomOutHand): void;
  readonly pressingKeySet: Set<string>;
  pressingKeysString(): string;
  /**
  * 是否正在进行移动(拖拽旋转)连线的操作
  */
  isMovingEdge: boolean;
  /**
  * 为移动节点做准备，移动时，记录每上一帧移动的位置
  */
  lastMoveLocation: Vector;
  /**
  * 当前的鼠标的位置
  */
  mouseLocation: Vector;
  /**
  * 有时需要锁定相机，比如 编辑节点时
  */
  isCameraLocked: boolean;
  /**
  * 上次选中的节点
  * 仅为 Ctrl交叉选择使用
  */
  readonly lastSelectedEntityUUID: Set<string>;
  readonly lastSelectedEdgeUUID: Set<string>;
  touchStartLocation: Vector;
  touchStartDistance: number;
  touchDelta: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  readonly isMouseDown: boolean[];
  lastManipulateTime: number;
  /**
  * 重置渲染倒计时器
  * 触发了一次操作，记录时间
  */
  resetCountdownTimer(): void;
  /**
  * 检测是否已经有挺长一段时间没有操作了
  * 进而决定不刷新屏幕
  */
  isManipulateOverTime(): boolean;
  /**
  * 悬浮提示的边缘距离
  */
  readonly edgeHoverTolerance: 10;
  readonly project: Project;
  dispose(): void;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  pointerleave(_event: PointerEvent | SerializedObject<"PointerEvent">): void;
  handleMousedown(button: number, _x: number, _y: number): void;
  handleMouseup(button: number, x: number, y: number): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  touchstart(e: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(e: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(e: TouchEvent | SerializedObject<"TouchEvent">): void;
  associationReshape: ControllerAssociationReshapeClass;
  camera: ControllerCameraClass;
  cutting: ControllerCuttingClass;
  edgeEdit: ControllerEdgeEditClass;
  entityClickSelectAndMove: ControllerEntityClickSelectAndMoveClass;
  entityCreate: ControllerEntityCreateClass;
  extensionEntityClick: ControllerExtensionEntityClickClass;
  layerMoving: ControllerLayerMovingClass;
  entityResize: ControllerEntityResizeClass;
  nodeConnection: ControllerNodeConnectionClass;
  nodeEdit: ControllerNodeEditClass;
  penStrokeControl: ControllerPenStrokeControlClass;
  penStrokeDrawing: ControllerPenStrokeDrawingClass;
  rectangleSelect: ControllerRectangleSelectClass;
  sectionEdit: ControllerSectionEditClass;
  imageScale: ControllerImageScaleClass;
}
/**
* 控制器类，用于处理事件绑定和解绑
* 每一个对象都是一个具体的功能
*/
declare interface ControllerClass {
  readonly project: Project;
  readonly bindEventsTimeout: Timeout;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  allowViewerModeInteraction: boolean;
  shouldHandleInteraction: boolean;
  readonly handleKeydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleKeyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly handleMousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  readonly handleMousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly handleTouchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  readonly handleTouchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  toViewEvent(event: T | SerializedObject<"T">): T;
  dispose(): void;
  /**
  * tips:
  * 如果把双击函数写在mousedown里
  * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
  *  1按下，2抬起，3按下，4抬起
  *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
  *  挡在了canvas上面。导致第四步抬起释放没有监听到了
  *  进而导致：
  *  双击创建节点后会有一个框选框吸附在鼠标上
  *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
  * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
  * ——2024年12月5日
  * @param event 鼠标事件对象
  */
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  /**
  * 鼠标移出窗口越界，强行停止功能
  * @param _outsideLocation
  */
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
/**
* 纯键盘控制的相关引擎
*/
declare interface KeyboardOnlyEngine {
  readonly project: Project;
  /**
  * 只有在某些面板打开的时候，这个引擎才会禁用，防止误触
  */
  openning: boolean;
  setOpenning(value: boolean): void;
  isOpenning(): boolean;
  dispose(): void;
  startEditNode(event: KeyboardEvent | SerializedObject<"KeyboardEvent">, selectedNode: TextNode | SerializedObject<"TextNode">): void;
  onKeyUp(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  onKeyDown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  addSuccessEffect(): void;
  addFailEffect(): void;
}
/**
* 纯键盘创建图论型的引擎
*/
declare interface KeyboardOnlyGraphEngine {
  /**
  * 虚拟目标位置控制器
  */
  targetLocationController: KeyboardOnlyDirectionController;
  virtualTargetLocation(): Vector;
  tick(): void;
  readonly project: Project;
  /**
  * 是否达到了按下Tab键的前置条件
  */
  isEnableVirtualCreate(): boolean;
  _isCreating: boolean;
  _creatingFromUUID: string | null;
  creatingFromUUID(): string | null;
  /**
  * 当前是否是按下Tab键不松开的情况
  * @returns
  */
  isCreating(): boolean;
  /**
  * 按下Tab键开始创建
  * @returns
  */
  createStart(): void;
  lastPressTabTime: number;
  /**
  * 返回按下Tab键的时间完成率，0-1之间，0表示刚刚按下Tab键，1表示已经达到可以松开Tab键的状态
  * @returns
  */
  getPressTabTimeInterval(): number;
  createFinished(): Promise<void>;
  moveVirtualTarget(delta: Vector | SerializedObject<"Vector">): void;
  /**
  * 取消创建
  */
  createCancel(): void;
  /**
  * 开始向指定方向移动虚拟目标（供持续型快捷键调用）
  */
  startMovingDirection(dir: Direction.Up | Direction.Down | Direction.Left | Direction.Right): void;
  /**
  * 停止向指定方向移动虚拟目标（供持续型快捷键调用）
  */
  stopMovingDirection(dir: Direction.Up | Direction.Down | Direction.Left | Direction.Right): void;
  /**
  * 是否有实体在虚拟目标位置
  * @returns
  */
  isTargetLocationHaveEntity(): boolean;
}
/**
* 专用于Xmind式的树形结构的键盘操作引擎
*/
declare interface KeyboardOnlyTreeEngine {
  readonly project: Project;
  /**
  * 方向取反
  */
  getOppositeDirection(direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): Direction;
  /**
  * 将一条边整体设置为标准方向连线。
  * 例如向左时，源端点贴左侧，目标端点贴右侧。
  */
  changeEdgeToDirection(edge: Edge | SerializedObject<"Edge">, direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): void;
  /**
  * 判断一条边是否与目标方向同轴（即属于"需要翻转"的那个轴）。
  * 翻转到 Left/Right 时，只处理水平方向的边；
  * 翻转到 Up/Down 时，只处理垂直方向的边。
  * 其他轴向的边（如翻转到 Left 时遇到 Up/Down 边）保持不变。
  */
  isEdgeOnSameAxis(edge: Edge | SerializedObject<"Edge">, direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): boolean;
  /**
  * 以指定节点为子树根，递归修改整棵子树的边方向，
  * 并额外调整指向该根节点的父边，最后触发一次树形自动布局。
  * 只翻转与目标方向同轴的边，其他轴向的边（如水平树中存在的上下边）保持不变。
  */
  adjustSubtreeDirection(root: ConnectableEntity | SerializedObject<"ConnectableEntity">, direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): void;
  /**
  * 对当前选中的所有可连接节点分别执行“以自身为根调整子树方向”。
  */
  adjustSelectedSubtreesDirection(direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): void;
  /**
  * 获取节点的“预方向”
  * 如果有缓存，则拿缓存中的值，没有缓存，根据节点的入度线的方向，来判断“预方向”
  * @param node
  * @returns
  */
  getNodePreDirection(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): "left" | "right" | "down" | "up";
  preDirectionCacheMap: Map<string, "left" | "right" | "down" | "up">;
  /**
  * 计算生长探测线的起点：当前节点在生长方向上的边缘中点
  */
  getGrowthLineStart(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, direction: "left" | "right" | "down" | "up"): Vector;
  /**
  * 计算生长探测线的终点（原叉号中心）世界坐标。
  *
  * 间距逻辑与 autoLayoutFastTreeMode 完全一致：
  *   - 基础间距：fatherChildNearGap = 50 * 2^(fontScaleLevel/2)
  *   - 左右方向始终用 fatherChildNormalGap（= nearGap * 3）
  *   - 上下方向：同方向已有子节点 ≤ 1 时用 nearGap，否则用 normalGap
  */
  getGrowthLineEnd(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, direction: "left" | "right" | "down" | "up"): Vector;
  /**
  * 用生长探测线（起点→终点）与舞台上所有可连接实体的碰撞箱做线段相交检测，
  * 返回第一个与探测线相交且满足条件的实体（排除自身、排除已有连线的实体）。
  * 没有则返回 null。
  */
  findConnectTargetByGrowthLine(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, direction: "left" | "right" | "down" | "up"): ConnectableEntity | null;
  /**
  * 改变节点的“预方向”
  * @param nodes
  * @param direction
  */
  changePreDirection(nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>, direction: "left" | "right" | "down" | "up"): void;
  /**
  * 根据节点的“预方向”，添加特效提示
  * @param node
  */
  addNodeEffectByPreDirection(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  /**
  * 树形深度生长节点
  * @returns
  */
  onDeepGenerateNode(defaultText: string, selectAll: boolean, editEdgeFirst: boolean): void;
  /**
  * 树形广度生长节点
  * @returns
  */
  onBroadGenerateNode(): void;
  /**
  * 根据某个已经选中的节点，调整其所在树的结构
  * @param entity
  */
  adjustTreeNode(entity: ConnectableEntity | SerializedObject<"ConnectableEntity">, withEffect: boolean): void;
  /**
  * 删除当前的节点
  */
  onDeleteCurrentNode(): void;
  /**
  * 计算新节点的字体大小
  * @param parentNode 父节点
  * @param preDirection 预方向
  * @returns 新节点的字体缩放级别
  */
  calculateNewNodeFontScaleLevel(parentNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, preDirection: "left" | "right" | "down" | "up"): number;
  editEdgeTextAndThenNode(edge: Edge | SerializedObject<"Edge">, newNode: TextNode | SerializedObject<"TextNode">, selectAll: boolean): void;
}
/**
* 仅在keyboardOnlyEngine中使用，用于处理select change事件
*/
declare interface SelectChangeEngine {
  lastSelectNodeByKeyboardUUID: string;
  readonly project: Project;
  selectUp(addSelect: boolean): void;
  selectDown(addSelect: boolean): void;
  selectLeft(addSelect: boolean): void;
  selectRight(addSelect: boolean): void;
  /**
  * 方向导航核心：直线条形区域优先，其次 45° 扇形，始终限定在同一层级内导航。
  *
  * 层级规则：
  * - 在 Section 内部 → 候选集为父 Section 的直接子节点（不含自身）
  * - 在顶层（无父 Section）→ 候选集为无父 Section 的顶层节点（含 分组框本体，但不含其内部子节点）
  *
  * 跳出规则（Section 内同层无候选时）：
  * - 上/左/右 → 选中父 分组框本体
  * - 下 → 以父 Section 为基准在父层继续向下导航，避免落回 Section 本体后死循环
  */
  navigateInDirection(selectedNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): ConnectableEntity | null;
  /**
  * 获取某个 Section 的直接子节点候选集（排除指定节点自身及被折叠隐藏的节点）。
  */
  getSameLevelCandidates(parentSection: Section | SerializedObject<"Section">, excludeNode: ConnectableEntity | SerializedObject<"ConnectableEntity">): ConnectableEntity[];
  /**
  * 获取顶层候选集：无父 Section 的节点（分组框本体算顶层，其内部子节点不算），排除指定节点自身。
  */
  getTopLevelCandidates(excludeNode: ConnectableEntity | SerializedObject<"ConnectableEntity">): ConnectableEntity[];
  /**
  * 扩散选择（根据连线）
  * @param isKeepExpand 扩散后是否保持原有的选择
  * @param reversed 是否反向扩散
  * @returns
  */
  expandSelect(isKeepExpand: boolean, reversed: boolean): void;
  /**
  * 扩散选择（节点和连线交替）
  * 正向：节点 -> 出边 -> 子节点
  * 反向：节点 -> 入边 -> 父节点
  */
  expandSelectWithEdge(isKeepExpand: boolean, reversed: boolean): void;
  afterSelect(selectedNodeRect: ConnectableEntity | SerializedObject<"ConnectableEntity">, newSelectedConnectableEntity: null | ConnectableEntity | SerializedObject<"ConnectableEntity">, clearOldSelect: boolean): void;
  getCurrentSelectedNode(): ConnectableEntity | null;
  addEffect(selectedNodeRect: Rectangle | SerializedObject<"Rectangle">, newSelectNodeRect: Rectangle | SerializedObject<"Rectangle">): void;
  getMostNearConnectableEntity(nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>, location: Vector | SerializedObject<"Vector">): ConnectableEntity | null;
  selectMostNearLocationNode(location: Vector | SerializedObject<"Vector">): ConnectableEntity | null;
  /**
  * 收集指定方向上「等宽/等高条形区域」内的所有节点。
  * 上/下：条形宽度 = 当前节点宽度（左右边界对齐），向指定方向无限延伸。
  * 左/右：条形高度 = 当前节点高度（上下边界对齐），向指定方向无限延伸。
  */
  collectNodesInStrip(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right, candidates: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): ConnectableEntity[];
  /**
  * 从条形候选集中找方向上最近的节点。
  * 距离 Dh = 两节点在导航方向上最近两条边之间的间距（非负）。
  * Dh 相等时按垂直轴偏差（中心偏离）排序。
  */
  getMostNearInStripByDh(nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>, nodeRect: Rectangle | SerializedObject<"Rectangle">, direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): ConnectableEntity | null;
  /**
  * 收集指定方向上 45° 扇形区域内的节点。
  */
  collectFanNodes(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right, candidates: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): ConnectableEntity[];
  collectTopNodes(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, candidates: undefined | Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): ConnectableEntity[];
  collectBottomNodes(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, candidates: undefined | Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): ConnectableEntity[];
  collectLeftNodes(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, candidates: undefined | Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): ConnectableEntity[];
  collectRightNodes(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, candidates: undefined | Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): ConnectableEntity[];
}
/**
* 框选引擎
* 因为不止鼠标会用到框选，mac下的空格+双指移动可能也用到框选功能
* 所以框选功能单独抽离成一个引擎，提供API被其他地方调用
*/
declare interface RectangleSelect {
  readonly project: Project;
  selectStartLocation: Vector;
  selectEndLocation: Vector;
  getSelectStartLocation(): Vector;
  getSelectEndLocation(): Vector;
  selectingRectangle: Rectangle | null;
  limitSection: Section | null;
  isSelectDirectionRight: boolean;
  getRectangle(): Rectangle | null;
  shutDown(): void;
  startSelecting(worldLocation: Vector | SerializedObject<"Vector">): void;
  moveSelecting(newEndLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 相当于鼠标松开释放
  */
  endSelecting(): void;
  updateStageObjectByMove(): void;
  /**
  * 判断当前的框选框是否选中了某个实体
  * @param entity
  */
  isSelectWithEntity(entity: StageObject | SerializedObject<"StageObject">): boolean;
  getSelectMode(): "intersect" | "contain";
  getSelectMoveDistance(): number;
}
/**
* 快捷键提示引擎
* 当按下修饰键时，显示匹配的快捷键提示
*/
declare interface KeyBindHintEngine {
  readonly project: Project;
  readonly ITEMS_PER_PAGE: 10;
  currentPage: number;
  currentModifierCombo: string;
  lastModifierCombo: string;
  isShowingHint: boolean;
  hasOtherKeyPressed: boolean;
  hasModifierReleased: boolean;
  cachedKeyBinds: { id: string; key: string; displayKey: string; title: string; }[];
  /**
  * 获取当前按下的修饰键组合
  * 返回的是存储格式（C-表示Ctrl/Meta，M-表示Meta/Ctrl）
  */
  getCurrentModifierCombo(): string;
  /**
  * 检查是否只按下了修饰键（没有其他普通键）
  */
  isOnlyModifiersPressed(): boolean;
  /**
  * 将存储格式的修饰键组合转换为显示格式
  * 用于匹配快捷键时，考虑Mac的键位转换
  */
  convertModifierComboForMatching(combo: string): string;
  /**
  * 检查快捷键是否匹配当前的修饰键组合
  */
  isKeyBindMatchModifier(key: string, modifierCombo: string): boolean;
  /**
  * 获取所有匹配的快捷键
  * O(N)
  */
  getMatchingKeyBinds(modifierCombo: string): { id: string; key: string; displayKey: string; title: string; }[];
  /**
  * 获取快捷键标题
  * 从 i18n 翻译文件中读取
  */
  getKeyBindTitle(id: string): string;
  /**
  * 更新提示状态
  * 在主渲染循环中调用
  */
  update(): void;
  /**
  * 渲染快捷键提示
  */
  render(): void;
}
declare type KeyBindIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
declare interface UIKeyBind {
  id: string;
  key: string;
  isEnabled: boolean;
  onPress(project: undefined | Project | SerializedObject<"Project">): void;
  when(project: undefined | Project | SerializedObject<"Project">): boolean | Promise<boolean>;
  icon?: KeyBindIcon | undefined;
  isContinuous?: boolean | undefined;
  onRelease?: ((project?: Project | undefined) => void) | undefined;
}
declare type KeyBindWhen = (project?: Project) => boolean | Promise<boolean>;
declare interface MouseInteraction {
  readonly project: Project;
  /**
  * 鼠标悬浮的边
  */
  _hoverEdges: Edge[];
  /** 鼠标悬浮的框 */
  _hoverSections: Section[];
  _hoverConnectPoints: ConnectPoint[];
  /**
  * 鼠标悬浮的多边形边
  */
  _hoverMultiTargetEdges: MultiTargetUndirectedEdge[];
  hoverEdges: Edge[];
  firstHoverEdge: Edge | undefined;
  hoverSections: Section[];
  hoverConnectPoints: ConnectPoint[];
  firstHoverSection: Section | undefined;
  hoverMultiTargetEdges: MultiTargetUndirectedEdge[];
  firstHoverMultiTargetEdge: MultiTargetUndirectedEdge | undefined;
  /**
  * mousemove 事件触发此函数
  * 要确保此函数只会被外界的一个地方调用，因为mousemove事件会频繁触发
  * @param mouseWorldLocation
  */
  updateByMouseMove(mouseWorldLocation: Vector | SerializedObject<"Vector">): void;
}
/**
* 自动保存与备份系统
*
* 自动备份：
* 超过限制时删除老文件
* 保存在 C:\Users\{userName}\AppData\Local\liren.project-graph\备份文件夹 下
*/
declare interface AutoSaveBackupService {
  lastBackupTime: number;
  lastBackupHash: string;
  lastSaveTime: number;
  readonly project: Project;
  /**
  * 高频率调用的tick函数，内部实现降频操作
  */
  tick(): void;
  autoSave(): Promise<void>;
  /**
  * 执行自动备份操作
  */
  autoBackup(): Promise<void>;
  /**
  * Backup near the original file (sideBySide or subfolder strategy)
  */
  localAutoBackup(strategy: "sideBySide" | "subfolder"): Promise<boolean>;
  manualBackup(): Promise<void>;
  resolveAutoBackupDir(candidate: { kind: "custom"; path: string; } | { kind: "default"; }): Promise<string | null>;
  tryBackupToDir(backupDir: string): Promise<boolean>;
  backupCurrentProject(backupDir: string): Promise<boolean>;
  /**
  * 生成备份文件名
  */
  generateBackupFileName(): string;
  /**
  * 生成时间戳字符串
  */
  generateTimestamp(): string;
  /**
  * 获取原始文件名（不包含扩展名）
  */
  getOriginalFileName(): string;
  /**
  * 创建备份文件
  */
  createBackupFile(backupFilePath: string): Promise<void>;
  /**
  * 管理备份文件数量，删除过旧的备份文件
  */
  manageBackupFiles(backupDir: string, prefix: undefined | string): Promise<void>;
}
declare type RecentFile = {
    uri: URI;
    /**
     * 上次保存或打开的时间戳
     */
    time: number;
};
/**
* 一些在自动计算引擎中
* 常用的工具函数
*/
declare interface AutoComputeUtils {
  readonly project: Project;
  /**
  * 获取一个节点的所有直接父节点，按x坐标排序
  * @param node
  * @returns
  */
  getParentTextNodes(node: TextNode | SerializedObject<"TextNode">): TextNode[];
  getParentEntities(node: TextNode | SerializedObject<"TextNode">): ConnectableEntity[];
  /**
  * 获取一个节点的所有直接子节点，按x坐标排序
  * @param node
  * @returns
  */
  getChildTextNodes(node: TextNode | SerializedObject<"TextNode">): TextNode[];
  /**
  * 更改一个TextNode节点的所有子节点名字，如果没有子节点，则新建一个节点
  * @param node
  * @param resultText
  */
  getNodeOneResult(node: TextNode | SerializedObject<"TextNode">, resultText: string): void;
  /**
  * 更改一个section节点的所有子节点名字，如果没有子节点，则新建一个节点
  * @param section
  * @param resultText
  */
  getSectionOneResult(section: Section | SerializedObject<"Section">, resultText: string): void;
  getSectionMultiResult(section: Section | SerializedObject<"Section">, resultTextList: Array<string>): void;
  /**
  * 生成一个节点的多个结果
  * 如果子节点数量不够，则新建节点
  * 如果子节点数量超过，则不修改多余节点
  * @param node
  * @param resultTextList
  */
  generateMultiResult(node: TextNode | SerializedObject<"TextNode">, resultTextList: Array<string>): void;
  /**
  * 将字符串转换为数字
  * @param str
  * @returns
  */
  stringToNumber(str: string): number;
  /**
  * 判断一个节点是否和逻辑节点直接相连
  * 同时判断是否有逻辑节点的父节点或子节点
  * @param node
  */
  isNodeConnectedWithLogicNode(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): boolean;
  /**
  * 判断一个节点的名字格式是否符合逻辑节点的格式
  * 1：以#开头，以#结尾，总共只能有两个#
  * 2：中间只有数字、大写字母、下划线
  * @param name
  */
  isNameIsLogicNode(name: string): boolean;
}
/**
* 所有逻辑节点的枚举
*/
declare enum LogicNodeNameEnum {
  AND = "#AND#",
  OR = "#OR#",
  NOT = "#NOT#",
  XOR = "#XOR#",
  TEST = "#TEST#",
  ADD = "#ADD#",
  SUBTRACT = "#SUB#",
  MULTIPLY = "#MUL#",
  DIVIDE = "#DIV#",
  MODULO = "#MOD#",
  FLOOR = "#FLOOR#",
  CEIL = "#CEIL#",
  ROUND = "#ROUND#",
  SQRT = "#SQRT#",
  POWER = "#POW#",
  LOG = "#LOG#",
  ABS = "#ABS#",
  RANDOM = "#RANDOM#",
  RANDOM_INT = "#RANDOM_INT#",
  RANDOM_FLOAT = "#RANDOM_FLOAT#",
  RANDOM_ITEM = "#RANDOM_ITEM#",
  RANDOM_ITEMS = "#RANDOM_ITEMS#",
  RANDOM_POISSON = "#RANDOM_POISSON#",
  SIN = "#SIN#",
  COS = "#COS#",
  TAN = "#TAN#",
  ASIN = "#ASIN#",
  ACOS = "#ACOS#",
  ATAN = "#ATAN#",
  LN = "#LN#",
  EXP = "#EXP#",
  MAX = "#MAX#",
  MIN = "#MIN#",
  LT = "#LT#",
  GT = "#GT#",
  LTE = "#LTE#",
  GTE = "#GTE#",
  EQ = "#EQ#",
  NEQ = "#NEQ#",
  UPPER = "#UPPER#",
  LOWER = "#LOWER#",
  LEN = "#LEN#",
  COPY = "#COPY#",
  SPLIT = "#SPLIT#",
  REPLACE = "#REPLACE#",
  CONNECT = "#CONNECT#",
  CHECK_REGEX_MATCH = "#CHECK_REGEX_MATCH#",
  COUNT = "#COUNT#",
  AVE = "#AVE#",
  MEDIAN = "#MEDIAN#",
  MODE = "#MODE#",
  VARIANCE = "#VARIANCE#",
  STANDARD_DEVIATION = "#STANDARD_DEVIATION#",
  SET_VAR = "#SET_VAR#",
  GET_VAR = "#GET_VAR#",
  RGB = "#RGB#",
  RGBA = "#RGBA#",
  GET_LOCATION = "#GET_LOCATION#",
  SET_LOCATION = "#SET_LOCATION#",
  SET_LOCATION_BY_UUID = "#SET_LOCATION_BY_UUID#",
  GET_LOCATION_BY_UUID = "#GET_LOCATION_BY_UUID#",
  GET_SIZE = "#GET_SIZE#",
  GET_MOUSE_LOCATION = "#GET_MOUSE_LOCATION#",
  GET_MOUSE_WORLD_LOCATION = "#GET_MOUSE_WORLD_LOCATION#",
  GET_CAMERA_LOCATION = "#GET_CAMERA_LOCATION#",
  SET_CAMERA_LOCATION = "#SET_CAMERA_LOCATION#",
  GET_CAMERA_SCALE = "#GET_CAMERA_SCALE#",
  SET_CAMERA_SCALE = "#SET_CAMERA_SCALE#",
  IS_COLLISION = "#IS_COLLISION#",
  GET_TIME = "#GET_TIME#",
  GET_DATE_TIME = "#GET_DATE_TIME#",
  ADD_DATE_TIME = "#ADD_DATE_TIME#",
  PLAY_SOUND = "#PLAY_SOUND#",
  GET_NODE_UUID = "#GET_NODE_UUID#",
  GET_NODE_RGBA = "#GET_NODE_RGBA#",
  COLLECT_NODE_DETAILS_BY_RGBA = "#COLLECT_NODE_DETAILS_BY_RGBA#",
  COLLECT_NODE_NAME_BY_RGBA = "#COLLECT_NODE_NAME_BY_RGBA#",
  FPS = "#FPS#",
  CREATE_TEXT_NODE_ON_LOCATION = "#CREATE_TEXT_NODE_ON_LOCATION#",
  IS_HAVE_ENTITY_ON_LOCATION = "#IS_HAVE_ENTITY_ON_LOCATION#",
  REPLACE_GLOBAL_CONTENT = "#REPLACE_GLOBAL_CONTENT#",
  SEARCH_CONTENT = "#SEARCH_CONTENT#",
  DELETE_PEN_STROKE_BY_COLOR = "#DELETE_PEN_STROKE_BY_COLOR#",
  DELAY_COPY = "#DELAY_COPY#",
}
declare interface AutoCompute {
  /**
  *
  * 简单符号与函数的映射
  */
  MapOperationNameFunction: StringFunctionMap;
  /**
  * 双井号格式的名字与函数的映射
  */
  MapNameFunction: StringFunctionMap;
  MapVariableFunction: VariableFunctionMap;
  /**
  * 其他特殊功能的函数
  */
  MapOtherFunction: OtherFunctionMap;
  variables: Map<string, string>;
  readonly project: Project;
  tickNumber: number;
  /**
  *
  * @param tickNumber 帧号
  * @returns
  */
  tick(): void;
  /**
  * 将 MathFunctionType 转换为 StringFunctionType
  * @param mF
  * @returns
  */
  funcTypeTrans(mF: MathFunctionType | SerializedObject<"MathFunctionType">): StringFunctionType;
  isTextNodeLogic(node: TextNode | SerializedObject<"TextNode">): boolean;
  isSectionLogic(section: Section | SerializedObject<"Section">): boolean;
  /**
  * 按y轴从上到下排序，如果y轴相同，则按照x轴从左到右排序
  * @param entities
  * @returns
  */
  sortEntityByLocation(entities: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): ConnectableEntity[];
  /**
  * 运行一个节点的计算
  * @param node
  */
  computeTextNode(node: TextNode | SerializedObject<"TextNode">): void;
  computeSection(section: Section | SerializedObject<"Section">): void;
  computeEdge(edge: LineEdge | SerializedObject<"LineEdge">): void;
}
declare type MathFunctionType = (args: number[]) => number[];
declare type OtherFunctionMap = Record<string, OtherFunctionType>;
declare type OtherFunctionType = (project: Project, fatherNodes: ConnectableEntity[], childNodes: ConnectableEntity[]) => string[];
declare type StringFunctionMap = Record<string, StringFunctionType>;
declare type StringFunctionType = (args: string[]) => string[];
declare type VariableFunctionMap = Record<string, VariableFunctionType>;
declare type VariableFunctionType = (project: Project, args: string[]) => string[];
/**
* 文件结构类型
*/
declare type FolderEntry = {
    name: string;
    path: string;
    is_file: boolean;
    children?: FolderEntry[];
};
declare interface GenerateFromFolder {
  readonly project: Project;
  generateFromFolder(folderPath: string): Promise<void>;
  generateTreeFromFolder(folderPath: string): Promise<void>;
  getColorByPath(path: string): Color;
}
/**
* 导出器基类，包含共享的工具方法
*/
declare interface BaseExporter {
  readonly project: Project;
  /**
  * 树形遍历节点
  * @param textNode
  * @param nodeToStringFunc
  * @returns
  */
  getTreeTypeString(textNode: TextNode | SerializedObject<"TextNode">, nodeToStringFunc: (node: TextNode, level: number) => string): string;
  /**
  * issue: #276 【细节优化】导出功能的排序逻辑，从连接顺序变为角度判断
  * @param node
  */
  getNodeChildrenArray(node: TextNode | SerializedObject<"TextNode">): ConnectableEntity[];
}
/**
* Markdown 格式导出器
* 将节点导出为带标题层级的层次化 Markdown 格式
*/
declare interface MarkdownExporter {
  /**
  * 将文本节点及其子节点导出为 Markdown 格式
  * @param textNode 要导出的根文本节点
  * @returns Markdown 格式字符串
  */
  export(textNode: TextNode | SerializedObject<"TextNode">): string;
  /**
  * 将单个节点转换为 Markdown 格式
  * @param node 文本节点
  * @param level 标题层级 (1-6)
  * @returns 该节点的 Markdown 字符串
  */
  getNodeMarkdown(node: TextNode | SerializedObject<"TextNode">, level: number): string;
  readonly project: Project;
  /**
  * 树形遍历节点
  * @param textNode
  * @param nodeToStringFunc
  * @returns
  */
  getTreeTypeString(textNode: TextNode | SerializedObject<"TextNode">, nodeToStringFunc: (node: TextNode, level: number) => string): string;
  /**
  * issue: #276 【细节优化】导出功能的排序逻辑，从连接顺序变为角度判断
  * @param node
  */
  getNodeChildrenArray(node: TextNode | SerializedObject<"TextNode">): ConnectableEntity[];
}
/**
* Mermaid 图表导出器
*
* 格式：
* ```mermaid
* graph TD
* A --> B
* A --> C
* B -- 连线文字 --> C
* ```
*
* (TD) 表示自上而下，LR表示自左而右
* 使用 subgraph ... end 来定义子图。
*/
declare interface MermaidExporter {
  readonly project: Project;
  /**
  * 将实体导出为 Mermaid 图表格式
  * @param entities 要导出的实体
  * @returns Mermaid 图表字符串
  */
  export(entities: Array<Entity | SerializedObject<"Entity">>): string;
}
/**
* 纯文本格式导出器
*
* 格式：
* A
* B
* C
*
* A --> B
* A --> C
* B -xx-> C
*/
declare interface PlainTextExporter {
  readonly project: Project;
  /**
  * 将实体导出为纯文本格式
  * @param nodes 要导出的选中实体
  * @returns 纯文本表示
  */
  export(nodes: Array<Entity | SerializedObject<"Entity">>): string;
}
/**
* 专注于导出各种格式内容的引擎
* （除了svg）
*/
declare interface StageExport {
  readonly plainTextExporter: PlainTextExporter;
  readonly markdownExporter: MarkdownExporter;
  readonly tabExporter: TabExporter;
  readonly mermaidExporter: MermaidExporter;
  readonly project: Project;
  /**
  * 格式：
  * A
  * B
  * C
  *
  * A --> B
  * A --> C
  * B -xx-> C
  *
  * @param nodes 传入的是选中了的节点
  * @returns
  */
  getPlainTextByEntities(nodes: Array<Entity | SerializedObject<"Entity">>): string;
  getMarkdownStringByTextNode(textNode: TextNode | SerializedObject<"TextNode">): string;
  getTabStringByTextNode(textNode: TextNode | SerializedObject<"TextNode">): string;
  /**
  * 格式：
  * ```mermaid
  * graph TD
  * A --> B
  * A --> C
  * B -- 连线文字 --> C
  * ```
  *
  * （TD）表示自上而下，LR表示自左而右
  * 使用 subgraph ... end 来定义子图。
  */
  getMermaidTextByEntities(entities: Array<Entity | SerializedObject<"Entity">>): string;
}
declare interface EventMap {
  progress: [progress: number];
  complete: [blob: Blob];
  error: [error: Error];
}
declare interface StageExportPng {
  readonly project: Project;
  /**
  * 将整个舞台导出为png图片
  */
  exportStage_(emitter: EventEmitter<EventMap> | SerializedObject<"EventEmitter">, signal: AbortSignal | SerializedObject<"AbortSignal">, sleepTime: number): Promise<void>;
  exportStage(signal: AbortSignal | SerializedObject<"AbortSignal">, sleepTime: number): EventEmitter<EventMap>;
  generateCanvasNode(): HTMLCanvasElement;
}
/**
* 将舞台当前内容导出为SVG
*
*
*/
declare interface StageExportSvg {
  readonly project: Project;
  svgConfig: SvgExportConfig;
  exportContext: { outputDir: string; imageMap: Map<string, string>; } | null;
  setConfig(config: SvgExportConfig | SerializedObject<"SvgExportConfig">): void;
  dumpNode(node: TextNode | SerializedObject<"TextNode">): Element;
  /**
  * 渲染Section顶部颜色
  * @param section
  * @returns
  */
  dumpSection(section: Section | SerializedObject<"Section">): Element;
  /**
  * 只渲染Section的底部颜色
  * @param section
  * @returns
  */
  dumpSectionBase(section: Section | SerializedObject<"Section">): Element;
  dumpEdge(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  /**
  * 渲染实体的详细信息
  * @param entity 实体
  * @returns 详细信息SVG元素
  */
  dumpEntityDetails(entity: Entity | SerializedObject<"Entity">): ReactNode;
  /**
  * 获取实体的 data-details 属性值
  * @param entity 实体
  * @returns 详细信息文本，如果为空则返回 undefined
  */
  getEntityDetailsDataAttribute(entity: Entity | SerializedObject<"Entity">): string | undefined;
  dumpUrlNode(node: UrlNode | SerializedObject<"UrlNode">): Element;
  /**
  *
  * @param node
  * @param svgConfigObject 配置对象
  * @returns
  */
  dumpImageNode(node: ImageNode | SerializedObject<"ImageNode">, svgConfigObject: SvgExportConfig | SerializedObject<"SvgExportConfig">): Element;
  getEntitiesOuterRectangle(entities: Array<Entity | SerializedObject<"Entity">>, padding: number): Rectangle;
  dumpSelected(): ReactNode;
  dumpStage(): ReactNode;
  /**
  * 将整个舞台导出为SVG字符串
  * @returns
  */
  dumpStageToSVGString(): string;
  /**
  * 将选中的节点导出为SVG字符串
  * @returns
  */
  dumpSelectedToSVGString(): string;
  /**
  * 将整个舞台导出为SVG文件，并导出所有图片附件
  * @param filePath SVG文件保存路径
  */
  exportStageToSVGFile(filePath: string): Promise<void>;
  /**
  * 将选中的节点导出为SVG文件，并导出相关图片附件
  * @param filePath SVG文件保存路径
  */
  exportSelectedToSVGFile(filePath: string): Promise<void>;
}
declare interface SvgExportConfig {
  imageMode: "absolutePath" | "relativePath" | "base64";
}
/**
* Tab 缩进格式导出器
* 将节点导出为层次化的 Tab 缩进格式
*/
declare interface TabExporter {
  /**
  * 将文本节点及其子节点导出为 Tab 缩进格式
  * @param textNode 要导出的根文本节点
  * @returns Tab 缩进格式字符串
  */
  export(textNode: TextNode | SerializedObject<"TextNode">): string;
  /**
  * 将单个节点转换为 Tab 缩进格式
  * @param node 文本节点
  * @param level 缩进层级
  * @returns 该节点的 Tab 缩进字符串
  */
  getTabText(node: TextNode | SerializedObject<"TextNode">, level: number): string;
  readonly project: Project;
  /**
  * 树形遍历节点
  * @param textNode
  * @param nodeToStringFunc
  * @returns
  */
  getTreeTypeString(textNode: TextNode | SerializedObject<"TextNode">, nodeToStringFunc: (node: TextNode, level: number) => string): string;
  /**
  * issue: #276 【细节优化】导出功能的排序逻辑，从连接顺序变为角度判断
  * @param node
  */
  getNodeChildrenArray(node: TextNode | SerializedObject<"TextNode">): ConnectableEntity[];
}
/**
* 导入器基类，包含共享的工具方法
*/
declare interface BaseImporter {
  readonly project: Project;
}
/**
* 图结构导入器
* 支持通过纯文本生成网状结构
* 格式：
* - A --> B （连线上无文字）
* - A -label-> B （连线上有文字）
* - A （单独的节点）
*/
declare interface GraphImporter {
  /**
  * 导入图结构文本并生成节点
  * 这个函数不稳定，可能会随时throw错误
  * @param text 网状结构的格式文本
  * @param diffLocation 偏移位置
  */
  import(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  readonly project: Project;
}
/**
* Markdown 导入器
* 将 Markdown 格式文本转换为节点树结构
* 支持标题层级（#, ##, ###）
*/
declare interface MarkdownImporter {
  /**
  * 导入 Markdown 文本并生成节点树
  * @param markdownText Markdown 格式文本
  * @param diffLocation 偏移位置
  * @param autoLayout 是否自动应用树形布局（默认为 true，自动整理为向右的树状结构）
  */
  import(markdownText: string, diffLocation: Vector | SerializedObject<"Vector">, autoLayout: boolean): void;
  readonly project: Project;
}
/**
* Mermaid 图导入器
* 支持根据 mermaid 文本生成框嵌套网状结构
* 支持 graph TD 格式的 mermaid 文本
* 支持 subgraph 嵌套
* 解析节点形状和标签
* 处理各种连线类型
*/
declare interface MermaidImporter {
  /**
  * 导入 Mermaid 文本并生成节点
  * @param text Mermaid 格式文本
  * @param diffLocation 偏移位置
  * @example
  * graph TD;
  *   A[Section A] --> B[Section B];
  *   A --> C[C];
  *   B --> D[D];
  */
  import(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 规范化行，去除尾部分号
  */
  normalizeLine(line: string): string;
  /**
  * 解码 Mermaid 文本中的特殊字符
  */
  decodeMermaidText(value: string): string;
  /**
  * 清理标签文本
  */
  sanitizeLabel(raw: undefined | string): string | undefined;
  /**
  * 解析节点标记，提取节点ID、标签和形状
  */
  parseNodeToken(token: string): MermaidNodeToken;
  readonly project: Project;
}
/**
* Mermaid 节点标记类型
*/
declare type MermaidNodeToken = {
    id: string;
    label?: string;
    shape: "rectangle" | "round" | "circle" | "rhombus" | "stadium" | "other";
};
/**
* 专注于从各种格式导入并生成节点的引擎
*/
declare interface StageImport {
  readonly graphImporter: GraphImporter;
  readonly treeImporter: TreeImporter;
  readonly mermaidImporter: MermaidImporter;
  readonly markdownImporter: MarkdownImporter;
  readonly project: Project;
  /**
  * 通过纯文本生成网状结构
  * 格式：
  * - A --> B （连线上无文字）
  * - A -label-> B （连线上有文字）
  * - A （单独的节点）
  * @param text 网状结构的格式文本
  * @param diffLocation 偏移位置
  */
  addNodeGraphByText(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 通过带有缩进格式的文本来增加节点
  * 格式：基于缩进的树形文本
  * @param text 树形结构的格式文本
  * @param indention 缩进大小（空格数或Tab数）
  * @param diffLocation 偏移位置
  */
  addNodeTreeByText(text: string, indention: number, diffLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 从指定节点开始根据文本生成树形结构
  * @param uuid 根节点的UUID
  * @param text 树形结构的格式文本
  * @param indention 缩进大小（空格数或Tab数）
  * @returns 导入结果对象
  */
  addNodeTreeByTextFromNode(uuid: string, text: string, indention: number): { success: boolean; error?: string | undefined; nodeCount?: number | undefined; };
  /**
  * 根据 mermaid 文本生成框嵌套网状结构
  * 支持 graph TD 格式的 mermaid 文本
  * @param text Mermaid 格式文本
  * @param diffLocation 偏移位置
  * @example
  * graph TD;
  *   A[Section A] --> B[Section B];
  *   A --> C[C];
  *   B --> D[D];
  */
  addNodeMermaidByText(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 根据 Markdown 文本生成节点树结构
  * 支持 Markdown 标题层级（#, ##, ###）
  * @param markdownText Markdown 格式文本
  * @param diffLocation 偏移位置
  * @param autoLayout 是否自动应用树形布局（默认为 true）
  * @example
  * # 标题1
  * ## 子标题1.1
  * ## 子标题1.2
  * # 标题2
  */
  addNodeByMarkdown(markdownText: string, diffLocation: Vector | SerializedObject<"Vector">, autoLayout: boolean): void;
}
/**
* 树形结构导入器
* 支持通过带有缩进格式的文本来增加节点
* 格式：基于缩进的树形文本
* 使用栈处理父子关系
* 自动连接父子节点
*/
declare interface TreeImporter {
  /**
  * 导入树形结构文本并生成节点
  * @param text 树形结构的格式文本
  * @param indention 缩进大小（空格数或Tab数）
  * @param diffLocation 偏移位置
  */
  import(text: string, indention: number, diffLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 从指定节点开始导入树形结构文本并生成节点
  * @param uuid 根节点的UUID
  * @param text 树形结构的格式文本
  * @param indention 缩进大小（空格数或Tab数）
  * @returns 导入结果对象
  */
  importFromNode(uuid: string, text: string, indention: number): { success: boolean; error?: string | undefined; nodeCount?: number | undefined; };
  /**
  * 计算缩进层级
  * @param line 文本行
  * @param indention 缩进大小
  * @returns 缩进层级
  * @example
  * 'a' -> 0
  * '    a' -> 1
  * '\t\ta' -> 2
  */
  getIndentLevel(line: string, indention: number): number;
  readonly project: Project;
}
declare interface AIEngine {
  createTransport(project: Project | SerializedObject<"Project">): DefaultChatTransport<UIMessage<unknown, UIDataTypes, UITools>>;
  createChatFetch(project: Project | SerializedObject<"Project">): (input: string | URL | Request, init?: (RequestInit & ClientOptions) | undefined) => Promise<Response>;
  getModels(): Promise<string[]>;
  readRequestBody(body: undefined | null | string | ArrayBuffer | SerializedObject<"ArrayBuffer"> | Blob | SerializedObject<"Blob"> | ReadableStream<any> | SerializedObject<"ReadableStream"> | ArrayBufferView<ArrayBuffer> | SerializedObject<"ArrayBufferView"> | FormData | SerializedObject<"FormData"> | URLSearchParams | SerializedObject<"URLSearchParams">): Promise<any>;
}
declare type AIMessageMetadata = {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
};
/**
* 舞台场景复杂度检测器
*/
declare interface ComplexityDetector {
  readonly project: Project;
  /**
  * 检测当前舞台
  */
  detectorCurrentStage(): CountResultObject;
}
declare interface CountResultObject {
  textNodeWordCount: number;
  associationWordCount: number;
  entityDetailsWordCount: number;
  textCharSize: number;
  averageWordCountPreTextNode: number;
  entityCount: number;
  sectionCount: number;
  textNodeCount: number;
  penStrokeCount: number;
  imageCount: number;
  urlCount: number;
  connectPointCount: number;
  isolatedConnectPointCount: number;
  noTransparentEntityColorCount: number;
  transparentEntityColorCount: number;
  entityColorTypeCount: number;
  noTransparentEdgeColorCount: number;
  transparentEdgeColorCount: number;
  edgeColorTypeCount: number;
  stageWidth: number;
  stageHeight: number;
  stageArea: number;
  associationCount: number;
  selfLoopCount: number;
  isolatedConnectableEntityCount: number;
  multiEdgeCount: number;
  entityDensity: number;
  entityOverlapCount: number;
  /**
  * 当前运行时树化时被归一化丢弃的交叉父关系数量。
  * 运行时已不再保留交叉嵌套，这个值用于反映旧数据残留。
  */
  crossEntityCount: number;
  maxSectionDepth: number;
  emptySetCount: number;
}
declare interface ContentSearch {
  readonly project: Project;
  /**
  * 搜索结果
  */
  searchResultNodes: StageObject[];
  /**
  * 是否忽略大小写
  */
  isCaseSensitive: boolean;
  /**
  * 搜索范围
  */
  searchScope: SearchScope;
  /**
  * 搜索结果的索引
  */
  currentSearchResultIndex: number;
  /**
  * 抽取一个舞台对象的被搜索文本
  * @param stageObject
  * @returns
  */
  getStageObjectText(stageObject: StageObject | SerializedObject<"StageObject">): string;
  /**
  * 获取选中对象的外接矩形
  * @returns 外接矩形，如果没有选中对象则返回null
  */
  getSelectedObjectsBounds(): Rectangle | null;
  /**
  * 判断对象是否在指定范围内
  * @param obj 要判断的对象
  * @param bounds 范围矩形
  * @returns 是否在范围内
  */
  isObjectInBounds(obj: StageObject | SerializedObject<"StageObject">, bounds: Rectangle | SerializedObject<"Rectangle">): boolean;
  startSearch(searchString: string, autoFocus: boolean): boolean;
  /**
  * 切换下一个
  */
  nextSearchResult(): void;
  /**
  * 切换上一个
  */
  previousSearchResult(): void;
}
/**
* 专门用来管理节点复制的引擎
*/
declare interface CopyEngine {
  copyEngineImage: CopyEngineImage;
  copyEngineText: CopyEngineText;
  readonly project: Project;
  /**
  * 用户按下了ctrl+c，
  * 将当前选中的节点复制到虚拟粘贴板
  * 也要将选中的部分复制到系统粘贴板
  */
  copy(): Promise<void>;
  /**
  * 用户按下了ctrl+v，将粘贴板数据粘贴到画布上
  */
  paste(): void;
  virtualClipboardPaste(): void;
  /**
  * 剪切
  * 复制，然后删除选中的舞台对象
  */
  cut(): Promise<void>;
  readSystemClipboardAndPaste(): Promise<void>;
  pasteFromWebClipboard(): Promise<void>;
  pasteFromTauriClipboard(): Promise<void>;
}
declare interface CopyEngineImage {
  project: Project;
  pasteImageFromTauriClipboard(): Promise<void>;
  pasteImageBlob(blob: Blob | SerializedObject<"Blob">): Promise<void>;
  compressImageBlob(blob: Blob | SerializedObject<"Blob">): Promise<Blob>;
  pasteImageFromWebClipboard(): Promise<false | undefined>;
}
/**
* 专门处理文本粘贴的服务
*/
declare interface CopyEngineText {
  project: Project;
  copyEnginePastePlainText(item: string): Promise<void>;
}
/**
* 特效机器
*
* 它将产生一个机器对象，并唯一附着在舞台上。
* 如果有多页签多页面，则每个页面都有自己的唯一特效机器。
*/
declare interface Effects {
  readonly project: Project;
  effects: Effect[];
  addEffect(effect: Effect | SerializedObject<"Effect">): void;
  effectsCount: number;
  addEffects(effects: Array<Effect | SerializedObject<"Effect">>): void;
  tick(): void;
}
/**
* 一次性特效类
* timeProgress 0~max 表示时间进度，0表示开始，单位：帧
*/
declare interface Effect {
  /**
  * 注意这个进度条初始值应该是0
  */
  timeProgress: ProgressNumber;
  delay: number;
  /** 子特效（构成树形组合模式） */
  subEffects: Effect[];
  tick(project: Project | SerializedObject<"Project">): void;
  /**
  * 渲染方法
  */
  render(project: Project | SerializedObject<"Project">): void;
}
/**
* 舞台上的颜色风格管理器
*/
declare interface StageStyleManager {
  currentStyle: StageStyle;
}
declare type Settings = z.infer<typeof settingsSchema>;
declare const settingsSchema: ZodObject<{ language: ZodDefault<ZodUnion<readonly [ZodLiteral<"en">, ZodLiteral<"zh_CN">, ZodLiteral<"zh_TW">, ZodLiteral<"zh_TWC">, ZodLiteral<"id">]>>; isClassroomMode: ZodDefault<ZodBoolean>; viewerMode: ZodDefault<ZodBoolean>; showQuickSettingsToolbar: ZodDefault<ZodBoolean>; showRecentFilesThumbnails: ZodDefault<ZodBoolean>; windowBackgroundAlpha: ZodDefault<ZodNumber>; windowBackgroundOpacityAfterOpenClickThrough: ZodDefault<ZodNumber>; windowBackgroundOpacityAfterCloseClickThrough: ZodDefault<ZodNumber>; isRenderCenterPointer: ZodDefault<ZodBoolean>; centerCrosshairColor: ZodDefault<ZodTuple<[ZodNumber, ZodNumber, ZodNumber], null>>; centerCrosshairShape: ZodDefault<ZodUnion<readonly [ZodLiteral<"crossDot">, ZodLiteral<"tightCross">, ZodLiteral<"xShape">, ZodLiteral<"circleDot">, ZodLiteral<"iBeam">]>>; centerCrosshairAlpha: ZodDefault<ZodNumber>; showBackgroundHorizontalLines: ZodDefault<ZodBoolean>; showBackgroundVerticalLines: ZodDefault<ZodBoolean>; showBackgroundDots: ZodDefault<ZodBoolean>; showBackgroundCartesian: ZodDefault<ZodBoolean>; enableTagTextNodesBigDisplay: ZodDefault<ZodBoolean>; showTextNodeBorder: ZodDefault<ZodBoolean>; showTreeDirectionHint: ZodDefault<ZodBoolean>; lineStyle: ZodDefault<ZodUnion<readonly [ZodLiteral<"straight">, ZodLiteral<"bezier">, ZodLiteral<"vertical">]>>; hideArrowWhenPointingToConnectPoint: ZodDefault<ZodBoolean>; sectionBitTitleRenderType: ZodDefault<ZodUnion<readonly [ZodLiteral<"none">, ZodLiteral<"top">, ZodLiteral<"cover">]>>; nodeDetailsPanel: ZodDefault<ZodUnion<readonly [ZodLiteral<"small">, ZodLiteral<"vditor">]>>; alwaysShowDetails: ZodDefault<ZodBoolean>; entityDetailsFontSize: ZodDefault<ZodNumber>; entityDetailsLinesLimit: ZodDefault<ZodNumber>; entityDetailsWidthLimit: ZodDefault<ZodNumber>; showDebug: ZodDefault<ZodBoolean>; protectingPrivacy: ZodDefault<ZodBoolean>; protectingPrivacyMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"secretWord">, ZodLiteral<"caesar">]>>; windowCollapsingWidth: ZodDefault<ZodNumber>; windowCollapsingHeight: ZodDefault<ZodNumber>; limitCameraInCycleSpace: ZodDefault<ZodBoolean>; historySize: ZodDefault<ZodNumber>; autoRefreshStageByMouseAction: ZodDefault<ZodBoolean>; isPauseRenderWhenManipulateOvertime: ZodDefault<ZodBoolean>; renderOverTimeWhenNoManipulateTime: ZodDefault<ZodNumber>; ignoreTextNodeTextRenderLessThanFontSize: ZodDefault<ZodNumber>; sectionBigTitleThresholdRatio: ZodDefault<ZodNumber>; sectionBigTitleCameraScaleThreshold: ZodDefault<ZodNumber>; sectionBigTitleOpacity: ZodDefault<ZodNumber>; hideSectionContentsWhenBigTitleActive: ZodDefault<ZodBoolean>; sectionBackgroundFillMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"full">, ZodLiteral<"titleOnly">]>>; sectionInitBorderStyle: ZodDefault<ZodUnion<readonly [ZodLiteral<"solid">, ZodLiteral<"dashed">, ZodLiteral<"none">]>>; autoEnterSectionEditMode: ZodDefault<ZodBoolean>; cacheTextAsBitmap: ZodDefault<ZodBoolean>; textCacheSize: ZodDefault<ZodNumber>; textScalingBehavior: ZodDefault<ZodUnion<readonly [ZodLiteral<"temp">, ZodLiteral<"nearestCache">, ZodLiteral<"cacheEveryTick">]>>; antialiasing: ZodDefault<ZodUnion<readonly [ZodLiteral<"disabled">, ZodLiteral<"low">, ZodLiteral<"medium">, ZodLiteral<"high">]>>; textIntegerLocationAndSizeRender: ZodDefault<ZodBoolean>; compatibilityMode: ZodDefault<ZodBoolean>; isEnableEntityCollision: ZodDefault<ZodBoolean>; isEnableSectionCollision: ZodDefault<ZodBoolean>; autoNamerTemplate: ZodDefault<ZodString>; autoNamerSectionTemplate: ZodDefault<ZodString>; autoNamerDetailsTemplate: ZodDefault<ZodString>; autoNamerTreeNodeTemplate: ZodDefault<ZodString>; autoSaveWhenClose: ZodDefault<ZodBoolean>; autoSave: ZodDefault<ZodBoolean>; autoSaveInterval: ZodDefault<ZodNumber>; autoBackup: ZodDefault<ZodBoolean>; autoBackupInterval: ZodDefault<ZodNumber>; autoBackupLimitCount: ZodDefault<ZodNumber>; autoBackupCustomPath: ZodDefault<ZodString>; autoBackupCustomPath2: ZodDefault<ZodString>; autoBackupStrategy: ZodDefault<ZodUnion<readonly [ZodLiteral<"default">, ZodLiteral<"sideBySide">, ZodLiteral<"subfolder">]>>; enableDragEdgeRotateStructure: ZodDefault<ZodBoolean>; enableCtrlWheelRotateStructure: ZodDefault<ZodBoolean>; aiApiBaseUrl: ZodDefault<ZodString>; aiApiKey: ZodDefault<ZodString>; aiModel: ZodDefault<ZodString>; aiShowTokenCount: ZodDefault<ZodBoolean>; enableOCR: ZodDefault<ZodBoolean>; mouseRightDragBackground: ZodDefault<ZodUnion<readonly [ZodLiteral<"cut">, ZodLiteral<"moveCamera">]>>; enableSpaceKeyMouseLeftDrag: ZodDefault<ZodBoolean>; enableDragAutoAlign: ZodDefault<ZodBoolean>; reverseTreeMoveMode: ZodDefault<ZodBoolean>; mouseWheelMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"zoom">, ZodLiteral<"move">, ZodLiteral<"moveX">, ZodLiteral<"none">, ZodLiteral<"zoomUI">]>>; mouseWheelModeReverse: ZodDefault<ZodBoolean>; mouseWheelWithShiftMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"zoom">, ZodLiteral<"move">, ZodLiteral<"moveX">, ZodLiteral<"none">, ZodLiteral<"zoomUI">]>>; mouseWheelWithShiftModeReverse: ZodDefault<ZodBoolean>; mouseWheelWithCtrlMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"zoom">, ZodLiteral<"move">, ZodLiteral<"moveX">, ZodLiteral<"none">, ZodLiteral<"zoomUI">]>>; mouseWheelWithCtrlModeReverse: ZodDefault<ZodBoolean>; mouseWheelWithAltMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"zoom">, ZodLiteral<"move">, ZodLiteral<"moveX">, ZodLiteral<"none">, ZodLiteral<"zoomUI">]>>; mouseWheelWithAltModeReverse: ZodDefault<ZodBoolean>; uiScalePercent: ZodDefault<ZodNumber>; doubleClickMiddleMouseButton: ZodDefault<ZodUnion<readonly [ZodLiteral<"adjustCamera">, ZodLiteral<"none">]>>; doubleClickMiddleMouseButtonOnEntity: ZodDefault<ZodUnion<readonly [ZodLiteral<"openUrl">, ZodLiteral<"none">]>>; mouseSideWheelMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"zoom">, ZodLiteral<"move">, ZodLiteral<"moveX">, ZodLiteral<"none">, ZodLiteral<"cameraMoveToMouse">, ZodLiteral<"adjustWindowOpacity">, ZodLiteral<"adjustPenStrokeWidth">]>>; macMouseWheelIsSmoothed: ZodDefault<ZodBoolean>; enableWindowsTouchPad: ZodDefault<ZodBoolean>; autoAdjustLineEndpointsByMouseTrack: ZodDefault<ZodBoolean>; macTrackpadAndMouseWheelDifference: ZodDefault<ZodUnion<readonly [ZodLiteral<"trackpadIntAndWheelFloat">, ZodLiteral<"tarckpadFloatAndWheelInt">]>>; macTrackpadScaleSensitivity: ZodDefault<ZodNumber>; macEnableControlToCut: ZodDefault<ZodBoolean>; allowGlobalHotKeys: ZodDefault<ZodBoolean>; cameraFollowsSelectedNodeOnArrowKeys: ZodDefault<ZodBoolean>; arrowKeySelectOnlyInViewport: ZodDefault<ZodBoolean>; moveAmplitude: ZodDefault<ZodNumber>; moveFriction: ZodDefault<ZodNumber>; scaleExponent: ZodDefault<ZodNumber>; cameraZoomInLimitBehavior: ZodDefault<ZodUnion<readonly [ZodLiteral<"macro">, ZodLiteral<"micro">, ZodLiteral<"reset">]>>; cameraZoomOutLimitBehavior: ZodDefault<ZodUnion<readonly [ZodLiteral<"macro">, ZodLiteral<"micro">, ZodLiteral<"reset">]>>; cameraResetViewPaddingRate: ZodDefault<ZodNumber>; cameraResetMaxScale: ZodDefault<ZodNumber>; scaleCameraByMouseLocation: ZodDefault<ZodBoolean>; cameraKeyboardScaleRate: ZodDefault<ZodNumber>; rectangleSelectWhenRight: ZodDefault<ZodUnion<readonly [ZodLiteral<"intersect">, ZodLiteral<"contain">]>>; rectangleSelectWhenLeft: ZodDefault<ZodUnion<readonly [ZodLiteral<"intersect">, ZodLiteral<"contain">]>>; enableRightClickConnect: ZodDefault<ZodBoolean>; rightClickConnectEdgeType: ZodDefault<ZodUnion<readonly [ZodLiteral<"normal">, ZodLiteral<"arc">]>>; defaultEdgeLineType: ZodDefault<ZodUnion<readonly [ZodLiteral<"solid">, ZodLiteral<"dashed">, ZodLiteral<"double">]>>; defaultEdgeArrowType: ZodDefault<ZodUnion<readonly [ZodLiteral<"default">, ZodLiteral<"hollow-triangle">, ZodLiteral<"filled-triangle">, ZodLiteral<"hollow-diamond">, ZodLiteral<"filled-diamond">]>>; textNodeStartEditMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"enter">, ZodLiteral<"ctrlEnter">, ZodLiteral<"altEnter">, ZodLiteral<"shiftEnter">, ZodLiteral<"space">]>>; textNodeContentLineBreak: ZodDefault<ZodUnion<readonly [ZodLiteral<"enter">, ZodLiteral<"ctrlEnter">, ZodLiteral<"altEnter">, ZodLiteral<"shiftEnter">]>>; textNodeExitEditMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"enter">, ZodLiteral<"ctrlEnter">, ZodLiteral<"altEnter">, ZodLiteral<"shiftEnter">]>>; textNodeExitEditModeOnWheel: ZodDefault<ZodBoolean>; textNodeSelectAllWhenStartEditByMouseClick: ZodDefault<ZodBoolean>; textNodeSelectAllWhenStartEditByKeyboard: ZodDefault<ZodBoolean>; textNodeBackspaceDeleteWhenEmpty: ZodDefault<ZodBoolean>; textNodeBigContentThresholdWhenPaste: ZodDefault<ZodNumber>; textNodePasteSizeAdjustMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"auto">, ZodLiteral<"manual">, ZodLiteral<"autoByLength">]>>; clipboardPasteMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"auto">, ZodLiteral<"webview">, ZodLiteral<"tauri">]>>; resizePastedImages: ZodDefault<ZodBoolean>; maxPastedImageSize: ZodDefault<ZodNumber>; compressImageToWebp: ZodDefault<ZodBoolean>; webpQuality: ZodDefault<ZodNumber>; compressImageToBlackAndWhite: ZodDefault<ZodBoolean>; blackAndWhiteThreshold: ZodDefault<ZodNumber>; wrapImageInGroup: ZodDefault<ZodBoolean>; textNodeManualDefaultCharWidth: ZodDefault<ZodNumber>; allowAddCycleEdge: ZodDefault<ZodBoolean>; enableDragNodeShakeDetachFromEdge: ZodDefault<ZodBoolean>; autoLayoutWhenTreeGenerate: ZodDefault<ZodBoolean>; enableTreeGenerateConnectByProbe: ZodDefault<ZodBoolean>; treeGenerateInheritParentColor: ZodDefault<ZodBoolean>; textNodeAutoFormatTreeWhenInput: ZodDefault<ZodBoolean>; treeGenerateCameraBehavior: ZodDefault<ZodUnion<readonly [ZodLiteral<"none">, ZodLiteral<"moveToNewNode">, ZodLiteral<"resetToTree">]>>; enableTabGenerateNodeInInput: ZodDefault<ZodBoolean>; enableBackslashGenerateNodeInInput: ZodDefault<ZodBoolean>; gamepadDeadzone: ZodDefault<ZodNumber>; showGrid: ZodDefault<ZodBoolean>; maxFps: ZodDefault<ZodNumber>; maxFpsUnfocused: ZodDefault<ZodNumber>; effectsPerferences: ZodDefault<ZodRecord<ZodString, ZodBoolean>>; autoFillNodeColor: ZodDefault<ZodTuple<[ZodNumber, ZodNumber, ZodNumber, ZodNumber], null>>; autoFillNodeColorEnable: ZodDefault<ZodBoolean>; autoFillPenStrokeColor: ZodDefault<ZodTuple<[ZodNumber, ZodNumber, ZodNumber, ZodNumber], null>>; autoFillPenStrokeColorEnable: ZodDefault<ZodBoolean>; colorPanelMouseEnterPreview: ZodDefault<ZodBoolean>; autoFillEdgeColor: ZodDefault<ZodTuple<[ZodNumber, ZodNumber, ZodNumber, ZodNumber], null>>; autoOpenPath: ZodDefault<ZodString>; generateTextNodeByStringTabCount: ZodDefault<ZodNumber>; enableCollision: ZodDefault<ZodBoolean>; enableDragAlignToGrid: ZodDefault<ZodBoolean>; mouseLeftMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"selectAndMove">, ZodLiteral<"draw">, ZodLiteral<"connectAndCut">]>>; doubleClickEmptySpaceAction: ZodDefault<ZodUnion<readonly [ZodLiteral<"createTextNode">, ZodLiteral<"none">]>>; soundEnabled: ZodDefault<ZodBoolean>; cuttingLineStartSoundFile: ZodDefault<ZodString>; connectLineStartSoundFile: ZodDefault<ZodString>; connectFindTargetSoundFile: ZodDefault<ZodString>; cuttingLineReleaseSoundFile: ZodDefault<ZodString>; alignAndAttachSoundFile: ZodDefault<ZodString>; packEntityToSectionSoundFile: ZodDefault<ZodString>; treeGenerateDeepSoundFile: ZodDefault<ZodString>; treeGenerateBroadSoundFile: ZodDefault<ZodString>; treeAdjustSoundFile: ZodDefault<ZodString>; viewAdjustSoundFile: ZodDefault<ZodString>; entityJumpSoundFile: ZodDefault<ZodString>; associationAdjustSoundFile: ZodDefault<ZodString>; uiButtonEnterSoundFile: ZodDefault<ZodString>; uiButtonClickSoundFile: ZodDefault<ZodString>; uiSwitchButtonOnSoundFile: ZodDefault<ZodString>; uiSwitchButtonOffSoundFile: ZodDefault<ZodString>; githubToken: ZodDefault<ZodString>; githubUser: ZodDefault<ZodString>; theme: ZodDefault<ZodString>; themeMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"light">, ZodLiteral<"dark">]>>; lightTheme: ZodDefault<ZodString>; darkTheme: ZodDefault<ZodString>; telemetry: ZodDefault<ZodBoolean>; historyManagerMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"memoryEfficient">, ZodLiteral<"timeEfficient">]>>; isStealthModeEnabled: ZodDefault<ZodBoolean>; stealthModeScopeRadius: ZodDefault<ZodNumber>; stealthModeReverseMask: ZodDefault<ZodBoolean>; stealthModeMaskShape: ZodDefault<ZodUnion<readonly [ZodLiteral<"circle">, ZodLiteral<"square">, ZodLiteral<"topLeft">, ZodLiteral<"smartContext">]>>; clearHistoryWhenManualSave: ZodDefault<ZodBoolean>; soundPitchVariationRange: ZodDefault<ZodNumber>; autoImportTxtFileWhenOpenPrg: ZodDefault<ZodBoolean>; imageImportOrder: ZodDefault<ZodUnion<readonly [ZodLiteral<"mtime">, ZodLiteral<"path">]>>; enableAutoEdgeWidth: ZodDefault<ZodBoolean>; enableCollisionBoxAutoWidth: ZodDefault<ZodBoolean>; newNodeScaleByCamera: ZodDefault<ZodBoolean>; newNodeScaleByCameraOffset: ZodDefault<ZodNumber>; showKeyBindHint: ZodDefault<ZodBoolean>; showEditModeHint: ZodDefault<ZodBoolean>; textNodeEditModeOutlineOpacity: ZodDefault<ZodNumber>; pieMenuConfig: ZodDefault<ZodArray<ZodObject<{ id: ZodString; name: ZodString; enabled: ZodDefault<ZodBoolean>; trigger: ZodString; items: ZodArray<ZodString>; }, $strip>>>; contextMenuConfig: ZodDefault<ZodArray<ZodObject<{ type: ZodUnion<readonly [ZodLiteral<"item">, ZodLiteral<"separator">, ZodLiteral<"sub">, ZodLiteral<"group">, ZodLiteral<"setColorForSelected">, ZodLiteral<"setPenStrokeColor">]>; id: ZodString; label: ZodOptional<ZodString>; icon: ZodOptional<ZodString>; visible: ZodDefault<ZodBoolean>; children: ZodOptional<ZodArray<ZodAny>>; layout: ZodOptional<ZodUnion<readonly [ZodLiteral<"row">, ZodLiteral<"grid">]>>; cols: ZodOptional<ZodNumber>; }, $strip>>>; disabledExtensions: ZodDefault<ZodArray<ZodString>>; extensionSettings: ZodDefault<ZodRecord<ZodString, ZodRecord<ZodString, ZodUnknown>>>; defaultFontFamily: ZodDefault<ZodString>; hideCursorInPenMode: ZodDefault<ZodBoolean>; penPressureCurve: ZodDefault<ZodUnion<readonly [ZodLiteral<"fixed">, ZodLiteral<"linear">, ZodLiteral<"sqrt">, ZodLiteral<"cbrt">, ZodLiteral<"quadratic">, ZodLiteral<"cubic">]>>; globalMenuConfig: ZodDefault<ZodArray<ZodObject<{ type: ZodUnion<readonly [ZodLiteral<"topMenu">, ZodLiteral<"item">, ZodLiteral<"separator">, ZodLiteral<"sub">, ZodLiteral<"recentFiles">, ZodLiteral<"versionInfo">, ZodLiteral<"unstableVersionBanner">, ZodLiteral<"devMenu">, ZodLiteral<"featureFlagsList">]>; id: ZodString; label: ZodOptional<ZodString>; icon: ZodOptional<ZodString>; visible: ZodOptional<ZodBoolean>; children: ZodOptional<ZodArray<ZodAny>>; }, $strip>>>; }, $strip>;
/**
* 摄像机
*
* 该摄像机可以看成是悬浮在空中的，能上下左右四个方向喷气的小型飞机。
* 喷气的含义是：按下WASD键可以控制四个喷气孔喷气，产生动力，松开立刻失去动力。
* 同时空气有空气阻力，会对速度的反方向产生阻力。
* 但滚轮会控制摄像机的缩放镜头。同时缩放大小也会影响喷气动力的大小，越是观看细节，喷的动力越小，移动越慢。
*/
declare interface Camera {
  /**
  * 空气摩擦力速度指数
  * 指数=2，表示 f = -k * v^2
  * 指数=1，表示 f = -k * v
  * 指数越大，速度衰减越快
  */
  readonly frictionExponent: 1.5;
  /**
  * 摄像机的位置（世界坐标）
  * 实际上代表的是 currentLocation
  */
  location: Vector;
  /**
  * 上次鼠标缩放滚轮交互位置
  * 世界坐标
  */
  targetLocationByScale: Vector;
  /** 当前的 画布/摄像机移动的速度矢量 */
  speed: Vector;
  /**
  * 可以看成一个九宫格，主要用于处理 w s a d 按键移动，
  * 当同时按下w和s，这个值会是(-1,-1)，表示朝着左上移动
  */
  accelerateCommander: Vector;
  /**
  * 当前镜头缩放比例 >1放大 <1缩小
  * 会逐渐趋近于目标缩放比例
  */
  currentScale: number;
  /** 目标镜头缩放比例 */
  targetScale: number;
  /**
  * 震动特效导致的位置偏移
  * 也就是当有震动特效的时候，不是舞台在震动，而是摄像机在震动
  */
  readonly shakeLocation: Vector;
  /**
  * 记录的摄像机位置和缩放大小
  */
  savedCameraState: { location: Vector; scale: number; } | null;
  readonly shockMoveDiffLocationsQueue: Queue<Vector>;
  /**
  * 触发一次翻页式移动
  *
  * 触发一次后，接下来的60帧里，摄像机都会移动一小段距离，朝向目的位置移动
  */
  pageMove(direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): void;
  /**
  * 爆炸式移动
  * @param targetLocation 摄像机即将要移动到的世界坐标
  */
  bombMove(targetLocation: Vector | SerializedObject<"Vector">, frameCount: number): void;
  tickIndex: number;
  hasResetOnOpen: boolean;
  tick(): void;
  /**
  * 当前的帧编号
  */
  tickNumber: number;
  /**
  * 多少帧以后，才能继续跟随鼠标缩放
  */
  allowScaleFollowMouseLocationTicks: number;
  setAllowScaleFollowMouseLocationTicks(ticks: number): void;
  zoomInByKeyboardPress(): void;
  zoomOutByKeyboardPress(): void;
  addScaleFollowMouseLocationTime(sec: number): void;
  isStartZoomIn: boolean;
  isStartZoomOut: boolean;
  /**
  * 修改摄像机位置，但是通过一种奇特的方式来修改
  * 将某个世界坐标位置对准当前的某个视野坐标位置，来修改摄像机位置
  * @param otherWorldLocation
  * @param viewLocation
  */
  setLocationByOtherLocation(otherWorldLocation: Vector | SerializedObject<"Vector">, viewLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 强制清除移动动力命令
  * 防止无限滚屏
  */
  clearMoveCommander(): void;
  /**
  * 突然停止摄像机所有运动
  * 清除移动动力、速度、缩放操作
  */
  stopImmediately(): void;
  /**
  * 单纯缩放镜头
  * 让currentScale不断逼近targetScale
  * @returns 缩放前后变化的比值
  */
  dealCameraScaleInTick(): number;
  readonly project: Project;
  /**
  * 重置摄像机的缩放，让其画面刚好能容下舞台上所有内容的外接矩形
  * 还是不要有动画过度了，因为过度效果会带来一点卡顿（2024年10月25日）
  */
  reset(): void;
  resetBySelected(): void;
  resetByRectangle(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  resetScale(): void;
  resetLocationToZero(): void;
  /**
  * 保存当前摄像机状态
  * 只有在当前没有保存状态的情况下才保存
  */
  saveCameraState(): void;
  /**
  * 恢复之前保存的摄像机状态
  * 恢复后清除保存的状态，以便下次使用
  */
  restoreCameraState(): void;
  isDefaultZoom(): boolean;
}
/**
* 将Canvas标签和里面的ctx捏在一起封装成一个类
*/
declare interface Canvas {
  ctx: CanvasRenderingContext2D;
  resizeObserver?: ResizeObserver | undefined;
  readonly project: Project;
  element: HTMLCanvasElement;
  mount(wrapper: HTMLDivElement | SerializedObject<"HTMLDivElement">): void;
  clientToView(clientX: number, clientY: number): Vector;
  viewToClient(location: Vector | SerializedObject<"Vector">): Vector;
  viewToClientScale(): Vector;
  dispose(): void;
}
declare interface GraphMethods {
  readonly project: Project;
  isTree(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, skipDashed: boolean): boolean;
  /**
  * 获取节点的显示文本（最多5个字符，溢出用省略号）
  */
  getNodeDisplayName(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): string;
  /**
  * 详细检测树形结构问题
  * @param rootNode 根节点
  * @param skipDashed 是否跳过虚线边
  * @returns 检测结果，包含所有发现的问题
  */
  validateTreeStructure(rootNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, skipDashed: boolean): TreeValidationResult;
  /** 获取节点连接的子节点数组，未排除自环 */
  nodeChildrenArray(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, skipDashed: boolean): ConnectableEntity[];
  /**
  * 获取一个节点的所有父亲节点，排除自环
  * 性能有待优化！！
  */
  nodeParentArray(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, skipDashed: boolean): ConnectableEntity[];
  edgeChildrenArray(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): Edge[];
  edgeParentArray(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): Edge[];
  /**
  * 获取反向边集
  * @param skipDashed 是否跳过虚线边
  */
  getReversedEdgeDict(skipDashed: boolean): Record<string, string>;
  /**
  * 当前节点是否是存在于树形结构中，且非树形结构的跟节点
  * @param node
  * @returns
  */
  isCurrentNodeInTreeStructAndNotRoot(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): boolean;
  /**
  * 获取自己的祖宗节点
  * @param node 节点
  * @param skipDashed 是否跳过虚线边（用于树形格式化时）
  */
  getRoots(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, skipDashed: boolean): ConnectableEntity[];
  isConnected(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, target: ConnectableEntity | SerializedObject<"ConnectableEntity">): boolean;
  /**
  * 通过一个节点获取一个 可达节点集合/后继节点集合 Successor Set
  * 包括它自己
  * @param node
  * @param isHaveSelf 是否包含节点自身
  * @param skipDashed 是否跳过虚线边（用于树形格式化时，避免虚线连接的节点被包含）
  */
  getSuccessorSet(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, isHaveSelf: boolean, skipDashed: boolean): ConnectableEntity[];
  /**
  * 获取一个节点的一步可达节点集合/后继节点集合 One-Step Successor Set
  * 排除自环
  * @param node
  */
  getOneStepSuccessorSet(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): ConnectableEntity[];
  getEdgesBetween(node1: ConnectableEntity | SerializedObject<"ConnectableEntity">, node2: ConnectableEntity | SerializedObject<"ConnectableEntity">): Edge[];
  getEdgeFromTwoEntity(fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">): Edge | null;
  /**
  * 找到和一个节点直接相连的所有超边
  * @param node
  * @returns
  */
  getHyperEdgesByNode(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): MultiTargetUndirectedEdge[];
  /**
  * 获取一个节点的所有出度（出边）
  * @param node 源节点
  * @returns 节点的所有出边数组
  */
  getOutgoingEdges(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): Edge[];
  /**
  * 获取一个节点的所有入度（入边）
  * @param node 目标节点
  * @returns 节点的所有入边数组
  */
  getIncomingEdges(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): Edge[];
  /**
  * 获取一个节点通过连接它的所有超边的其他节点
  * 例如 {A B C}, {C, D, E}，f(A) => {B, C, D, E}
  * @param node 指定节点
  * @returns 通过超边连接的所有其他节点集合（排除节点自身）
  */
  getNodesConnectedByHyperEdges(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): ConnectableEntity[];
  nodeChildrenArrayWithinSet(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, nodeSet: Set<string> | SerializedObject<"Set">): ConnectableEntity[];
  nodeParentArrayWithinSet(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, nodeSet: Set<string> | SerializedObject<"Set">): ConnectableEntity[];
  /**
  * 根据一组节点判断其在子图中的连接关系是否构成一棵树，并返回唯一根节点。
  * 规则：
  * - 子图中每个节点的入度至多为1
  * - 恰好存在一个入度为0的根节点
  * - 从根出发可达所有节点（连通），且无环
  */
  getTreeRootByNodes(nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): ConnectableEntity | null;
  /** 判断一组节点在其诱导子图中是否构成一棵树 */
  isTreeByNodes(nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): boolean;
  /** 判断一组节点在其诱导子图中是否构成有向无环图（DAG） */
  isDAGByNodes(nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): boolean;
}
/**
* 树形结构问题
*/
declare interface TreeIssue {
  type: TreeIssueType;
  message: string;
  nodes?: ConnectableEntity[] | undefined;
  edges?: Edge[] | undefined;
}
/**
* 树形结构问题类型
*/
declare type TreeIssueType = "selfLoop" | "cycle" | "diamond" | "overlappingEdges";
/**
* 树形结构检测结果
*/
declare interface TreeValidationResult {
  isValid: boolean;
  issues: TreeIssue[];
}
declare interface SectionMethods {
  readonly project: Project;
  /**
  * 获取一个实体的它自己的父亲Sections、是第一层所有父亲Sections
  * 在废除交叉嵌套后，实体只会有一个直接父 Section。
  * @param entity
  * @complexity O(1)
  */
  getFatherSections(entity: Entity | SerializedObject<"Entity">): Section[];
  /**
  * 检查舞台对象是否在锁定的Section内
  * 对于实体：检查它的所有父Section是否有锁定的
  * 对于连线：检查它连接的所有实体是否在锁定的Section内
  * @param object 舞台对象（实体或连线）
  * @returns 如果对象连接了锁定的Section内物体，返回true
  * @complexity O(d)，d 为实体祖先链深度；对多目标边为 O(k·d)，k 为端点数
  */
  isObjectBeLockedBySection(object: StageObject | SerializedObject<"StageObject">): boolean;
  /**
  * 获取一个实体被他包围的全部实体，一层一层的包含并以数组返回
  * A{B{C{entity}}}
  * 会返回 [C, B, A]
  * @param entity
  * @complexity O(d)，d 为实体祖先链深度
  */
  getFatherSectionsList(entity: Entity | SerializedObject<"Entity">): Section[];
  /**
  * 根据一个位置，获取包含这个位置的所有Section（深Section优先）
  * 例如在十字位置上，获取到的结果是 [B]
  *               │
  *     ┌─────────┼────────────────────────┐
  *     │A        │                        │
  *     │  ┌──────┼──────┐   ┌───────┐     │
  *     │  │B     │      │   │C      │     │
  *─────┼──┼──────┼──────┼───┼───────┼─────┼─────
  *     │  │      │      │   │       │     │
  *     │  └──────┼──────┘   └───────┘     │
  *     │         │                        │
  *     └─────────┼────────────────────────┘
  *               │
  * @returns
  * @complexity O(S)，S 为舞台上 Section 总数（需遍历所有根 Section 的子树）
  */
  getSectionsByInnerLocation(location: Vector | SerializedObject<"Vector">): Section[];
  /**
  * 获取某个位置所在的最内层 Section。
  * 在单父树结构下，命中结果只会有一个优先目标。
  * @complexity O(S)，内部调用 getSectionsByInnerLocation
  */
  getInnermostSectionByLocation(location: Vector | SerializedObject<"Vector">): Section | null;
  /**
  * 当前视野下，这个 Section 是否进入了大标题覆盖形态。
  * 进入该形态后，交互应优先命中 Section 本身，而不是内部普通实体。
  * @complexity O(1)
  */
  isSectionBigTitleActive(section: Section | SerializedObject<"Section">): boolean;
  /**
  * 如果某个实体被处于大标题形态的祖先 Section 覆盖，返回这个最近的祖先。
  * 该判断只用于交互与渲染层，不会改变实体本身的可见性数据。
  * @complexity O(d)，d 为实体祖先链深度
  */
  getBigTitleCoveringAncestorSection(entity: Entity | SerializedObject<"Entity">): Section | null;
  /**
  * 判断实体是否因大标题 Section 激活而被隐藏（受设置开关控制）。
  * @complexity O(d)，d 为实体祖先链深度
  */
  isEntityHiddenByBigTitleSection(entity: Entity | SerializedObject<"Entity">): boolean;
  /**
  * 判断实体是否被某个大标题 Section 覆盖（不受设置开关控制，用于交互层）。
  * @complexity O(d)，d 为实体祖先链深度
  */
  isEntityCoveredByBigTitleSection(entity: Entity | SerializedObject<"Entity">): boolean;
  /**
  * 获取某个实体的所有处于大标题激活状态的祖先 Section（从近到远）。
  * @complexity O(d)，d 为实体祖先链深度
  */
  getBigTitleCoveringAncestorSections(entity: Entity | SerializedObject<"Entity">): Section[];
  /**
  * 判断连线是否因大标题 Section 激活而被隐藏（受设置开关控制）。
  * 隐藏条件：连线所有端点存在共同的大标题祖先 Section。
  * 若两端分属不同的平级大标题 Section，连线穿越舞台，不应隐藏。
  *
  * 场景1：A框[a] ←→ B框[b]，A和B平级（无共同父框），都进入大标题
  *   → a 的大标题祖先集合 = {A}，b 的大标题祖先集合 = {B}，无交集 → 不隐藏 ✅
  *
  * 场景2：C框{ A框[a], B框[b] }，C进入大标题（A、B也可能同时进入大标题）
  *   → a 的大标题祖先集合 = {A, C}，b 的大标题祖先集合 = {B, C}，交集 = {C} → 隐藏 ✅
  *
  * 场景3：a 在 A框（大标题），b 不在任何框
  *   → b 的大标题祖先集合为空 → 不隐藏 ✅
  * @complexity O(k·d)，k 为端点数，d 为祖先链深度；
  *             公共祖先查找额外 O(k·d)，整体仍为 O(k·d)
  */
  isAssociationHiddenByBigTitleSection(association: Association | SerializedObject<"Association">): boolean;
  /**
  * 判断连线是否被某个大标题 Section 覆盖（不受设置开关控制，用于交互层）。
  * 只要有任意一端被大标题覆盖，即视为连线被覆盖，鼠标交互不响应。
  * @complexity O(k·d)，k 为端点数，d 为祖先链深度
  */
  isAssociationCoveredByBigTitleSection(association: Association | SerializedObject<"Association">): boolean;
  /**
  * 获取实体最外层的锁定祖先 Section。
  * 返回值用于交互层决定应该把选中/拖拽重定向到哪个锁定框。
  * @complexity O(d)，d 为实体祖先链深度
  */
  getOutermostLockedAncestorSection(entity: Entity | SerializedObject<"Entity">): Section | null;
  /**
  * 通过多个Section，获取最外层的Section（即没有父亲的Section）
  * @param sections
  * @returns
  * @complexity O(E)，E 为传入 sections 列表长度（Set 构建 O(E)，filter O(E)）
  */
  shallowerSection(sections: Array<Section | SerializedObject<"Section">>): Section[];
  /**
  * 从实体列表中筛选出"最浅层"的非 Section 实体：
  * 若某实体的任意祖先 Section 已在传入列表中，则该实体被排除（由祖先代表）。
  * 最终结果同时附加传入列表中的所有 Section。
  * @complexity O(E·d)，E 为传入实体列表长度，d 为祖先链深度
  */
  shallowerNotSectionEntities(entities: Array<Entity | SerializedObject<"Entity">>): Entity[];
  /**
  * 检测某个实体是否在某个集合内，跨级也算
  * @param entity
  * @param section
  * @complexity O(d)，d 为实体祖先链深度
  */
  isEntityInSection(entity: Entity | SerializedObject<"Entity">, section: Section | SerializedObject<"Section">): boolean;
  /**
  * 返回一个分组框的最大嵌套深度
  * @param section
  * @complexity O(N)，N 为 section 子树内的后代 Section 总数
  */
  getSectionMaxDeep(section: Section | SerializedObject<"Section">): number;
  /**
  * 根据选中的多个Section，获取所有选中的实体（包括子实体）
  * 可以解决复制多个Section时，内部实体的连线问题
  * @param selectedEntities
  * @complexity O(N)，N 为所有传入实体子树的后代节点总数之和
  */
  getAllEntitiesInSelectedSectionsOrEntities(selectedEntities: Array<Entity | SerializedObject<"Entity">>): Entity[];
  /**
  * 对传入的 Section 列表按 y 轴坐标从上到下排序（z 轴暂不考虑）。
  * @complexity O(E·log E)，E 为传入 sections 列表长度（原生排序）
  */
  getSortedSectionsByZ(sections: Array<Section | SerializedObject<"Section">>): Section[];
  /**
  * 递归获取某个 Section 子树中包含指定位置的最深层 Section。
  * 若该 Section 已折叠或被隐藏，或位置不在其范围内，直接返回空数组。
  * 若有子 Section 命中，则只返回最深层的子 Section；否则返回自身。
  * @complexity O(N)，N 为该 Section 子树内的后代 Section 总数
  */
  getDeepestSectionsAtLocation(section: Section | SerializedObject<"Section">, location: Vector | SerializedObject<"Vector">): Section[];
}
declare interface LayoutManager {
  readonly project: Project;
  alignLeft(): void;
  alignRight(): void;
  alignTop(): void;
  alignBottom(): void;
  alignCenterHorizontal(): void;
  alignCenterVertical(): void;
  alignHorizontalSpaceBetween(): void;
  alignVerticalSpaceBetween(): void;
  /**
  * 从左到右紧密排列
  */
  alignLeftToRightNoSpace(): void;
  /**
  * 从上到下密排列
  */
  alignTopToBottomNoSpace(): void;
  layoutBySelected(layoutFunction: (entities: Entity[]) => void, isDeep: boolean): void;
  adjustSelectedTextNodeWidth(mode: "maxWidth" | "minWidth" | "average"): void;
  layoutToSquare(entities: Array<Entity | SerializedObject<"Entity">>): void;
  layoutToTightSquare(entities: Array<Entity | SerializedObject<"Entity">>): void;
}
/**
* Section 碰撞管理器：负责检测同级 Section 之间的碰撞，并将重叠的同级分支递归地推离。
*
* 集成点：在 updateFatherSectionByMove 的每次 adjustLocationAndSize() 调用后，
* 调用 solveOverlaps(section) 来消除新产生的重叠。
* 可通过设置 isEnableSectionCollision 全局开关控制是否启用。
*/
declare interface SectionCollisionSolver {
  readonly project: Project;
  /**
  * 当 grownSection 刚刚通过 adjustLocationAndSize() 增大后，
  * 检测其与同级 Section 的重叠，并将重叠的同级分支推离。
  * 递归地向上传播，确保每一层级的同级冲突都被解决。
  *
  * @param grownSection 刚刚增大或移动的 Section
  * @param visited      本次求解链中已处理过的 Section uuid（防止循环）
  */
  solveOverlaps(grownSection: Section | SerializedObject<"Section">, visited: Set<string> | SerializedObject<"Set">): void;
  /**
  * 在 sibling 被推移后，沿父级链向上依次 adjustLocationAndSize，
  * 并对每个扩大的父框再次检测同级碰撞（递归向上传播）。
  */
  updateAncestorsAfterShift(entity: Entity | SerializedObject<"Entity">, visited: Set<string> | SerializedObject<"Set">): void;
  /**
  * 获取与给定 Section 共享直接父框的所有同级 Section。
  * 若 section 处于根层级（无父框），则返回所有其他根层级 Section。
  */
  getSiblingsSections(section: Section | SerializedObject<"Section">): Section[];
  /**
  * 计算将 siblingRect 从 grownRect 推离所需的最小分离向量。
  * 选择重叠量较小的轴方向推移（与 collideWithOtherEntity 逻辑一致）。
  */
  computePushDelta(grownRect: Rectangle | SerializedObject<"Rectangle">, siblingRect: Rectangle | SerializedObject<"Rectangle">): Vector;
  /**
  * 对 entity 及其所有后代（子树）直接施加位移，
  * 不触发 updateFatherSectionByMove / updateOtherEntityLocationByMove 等事件链，
  * 从而避免在批量推移过程中引发循环或振荡。
  *
  * 注意：对锁定 Section，collisionBox 返回临时对象，无法有效修改底层数据，
  * 因此跳过。调用方应在调用前过滤掉锁定的同级 Section。
  */
  rawShiftEntityTree(entity: Entity | SerializedObject<"Entity">, delta: Vector | SerializedObject<"Vector">): void;
}
/**
* 自动对齐和布局管理器
*/
declare interface AutoAlign {
  readonly project: Project;
  getSelectionOuterRectangle(entities: Array<Entity | SerializedObject<"Entity">>): Rectangle | null;
  calculateDistanceByRectangle(rectA: Rectangle | SerializedObject<"Rectangle">, rectB: Rectangle | SerializedObject<"Rectangle">): number;
  alignRectangleToTargetX(selectedRect: Rectangle | SerializedObject<"Rectangle">, otherRect: Rectangle | SerializedObject<"Rectangle">): number;
  alignRectangleToTargetY(selectedRect: Rectangle | SerializedObject<"Rectangle">, otherRect: Rectangle | SerializedObject<"Rectangle">): number;
  _addAlignEffectByRect(selectedRect: Rectangle | SerializedObject<"Rectangle">, otherRect: Rectangle | SerializedObject<"Rectangle">): void;
  getGridSnapDeltaX(rect: Rectangle | SerializedObject<"Rectangle">): number;
  getGridSnapDeltaY(rect: Rectangle | SerializedObject<"Rectangle">): number;
  /**
  * 对齐到网格
  */
  alignAllSelectedToGrid(): void;
  /**
  * 吸附函数
  * 用于鼠标松开的时候自动移动位置一小段距离
  */
  alignAllSelected(): void;
  /**
  * 预先对齐显示反馈
  * 用于鼠标移动的时候显示对齐的效果
  */
  preAlignAllSelected(): void;
  /**
  * 将一个节点对齐到网格
  * @param selectedEntity
  */
  onEntityMoveAlignToGrid(selectedEntity: Entity | SerializedObject<"Entity">): void;
  onEntityMoveAlignToGridX(selectedEntity: Entity | SerializedObject<"Entity">): void;
  onEntityMoveAlignToGridY(selectedEntity: Entity | SerializedObject<"Entity">): void;
  /**
  * 将一个节点对齐到其他节点
  * @param selectedEntity
  * @param otherEntities 其他未选中的节点，在上游做好筛选
  */
  onEntityMoveAlignToOtherEntity(selectedEntity: Entity | SerializedObject<"Entity">, otherEntities: Array<Entity | SerializedObject<"Entity">>, isPreAlign: boolean): void;
  /**
  * 添加对齐特效
  * @param selectedEntity
  * @param otherEntity
  */
  _addAlignEffect(selectedEntity: Entity | SerializedObject<"Entity">, otherEntity: Entity | SerializedObject<"Entity">): void;
  /**
  * 将一个节点对齐到另一个节点
  * @param selectedEntity
  * @param otherEntity
  * @returns 返回吸附距离
  */
  onEntityMoveAlignToTargetEntityX(selectedEntity: Entity | SerializedObject<"Entity">, otherEntity: Entity | SerializedObject<"Entity">, isPreAlign: boolean): number;
  onEntityMoveAlignToTargetEntityY(selectedEntity: Entity | SerializedObject<"Entity">, otherEntity: Entity | SerializedObject<"Entity">, isPreAlign: boolean): number;
  calculateDistance(entityA: Entity | SerializedObject<"Entity">, entityB: Entity | SerializedObject<"Entity">): number;
  /**
  * 自动布局树形结构
  * @param selectedRootEntity
  */
  autoLayoutSelectedFastTreeMode(selectedRootEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
}
declare type Constructor<T> = {
    new (...args: any[]): T;
};
declare type DeleteHandler<T> = (object: T) => void;
/**
* 包含一切删除舞台上的元素的方法
*/
declare interface DeleteManager {
  deleteHandlers: Map<Constructor<StageObject>, DeleteHandler<StageObject>>;
  registerHandler(constructor: Constructor<T> | SerializedObject<"Constructor">, handler: DeleteHandler<T> | SerializedObject<"DeleteHandler">): void;
  readonly project: Project;
  deleteEntities(deleteNodes: Array<Entity | SerializedObject<"Entity">>): void;
  findDeleteHandler(object: StageObject | SerializedObject<"StageObject">): DeleteHandler<StageObject> | undefined;
  deleteSvgNode(entity: SvgNode | SerializedObject<"SvgNode">): void;
  deleteLatexNode(entity: LatexNode | SerializedObject<"LatexNode">): void;
  deleteReferenceBlockNode(entity: ReferenceBlockNode | SerializedObject<"ReferenceBlockNode">): void;
  deleteExtensionEntity(entity: ExtensionEntity | SerializedObject<"ExtensionEntity">): void;
  deletePenStroke(penStroke: PenStroke | SerializedObject<"PenStroke">): void;
  deleteSection(entity: Section | SerializedObject<"Section">): void;
  deleteImageNode(entity: ImageNode | SerializedObject<"ImageNode">): void;
  deleteUrlNode(entity: UrlNode | SerializedObject<"UrlNode">): void;
  deleteConnectPoint(entity: ConnectPoint | SerializedObject<"ConnectPoint">): void;
  deleteTextNode(entity: TextNode | SerializedObject<"TextNode">): void;
  /**
  * 删除所有相关的边
  * @param entity
  */
  deleteEntityAfterClearAssociation(entity: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  /**
  * 注意不要在遍历edges数组中调用这个方法，否则会导致数组长度变化，导致索引错误
  * @param deleteEdge 要删除的边
  * @returns
  */
  deleteEdge(deleteEdge: Edge | SerializedObject<"Edge">): boolean;
  deleteMultiTargetUndirectedEdge(edge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">): boolean;
}
/**
* 管理节点的位置移动
* 不仅仅有鼠标拖动的移动，还有对齐造成的移动
* 还要处理节点移动后，对Section大小造成的影响
* 以后还可能有自动布局的功能
*/
declare interface EntityMoveManager {
  readonly project: Project;
  /** 方向命令向量，由快捷键 press/release 写入，值域 [-1,1]×[-1,1] */
  moveAccelerateCommander: Vector;
  /** 当前速度 */
  moveSpeed: Vector;
  /** 速度指数摩擦力指数（与 Camera 保持一致） */
  readonly frictionExponent: 1.5;
  /**
  * 每帧物理 tick：把速度转化为实体位移
  * 注意：移动过程中不记录历史（避免历史爆炸），松开按键速度归零后再记录一次
  */
  tick(): void;
  /**
  * 持续移动：某方向键按下
  */
  continuousMoveKeyPress(direction: Vector | SerializedObject<"Vector">): void;
  /**
  * 持续移动：某方向键松开（速度会自然衰减至停止后记录历史）
  */
  continuousMoveKeyRelease(direction: Vector | SerializedObject<"Vector">): void;
  /**
  * 立刻刹车：清除命令向量和速度（进入编辑模式等场景使用）
  */
  stopImmediately(): void;
  /**
  * 检查实体是否可以移动（考虑锁定状态）
  * @param entity 要检查的实体
  * @returns 如果实体可以移动返回 true，否则返回 false
  */
  canMoveEntity(entity: Entity | SerializedObject<"Entity">): boolean;
  /**
  * 让某一个实体移动一小段距离
  * @param entity
  * @param delta
  * @param isAutoAdjustSection 移动的时候是否触发分组框的弹性调整
  */
  moveEntityUtils(entity: Entity | SerializedObject<"Entity">, delta: Vector | SerializedObject<"Vector">, isAutoAdjustSection: boolean): void;
  /**
  * 跳跃式移动传入的实体
  * 会破坏嵌套关系
  * @param entity
  * @param delta
  */
  jumpMoveEntityUtils(entity: Entity | SerializedObject<"Entity">, delta: Vector | SerializedObject<"Vector">): void;
  /**
  * 将某个实体移动到目标位置
  * @param entity
  * @param location
  */
  moveEntityToUtils(entity: Entity | SerializedObject<"Entity">, location: Vector | SerializedObject<"Vector">): void;
  /**
  * 移动所有选中的实体一小段距离
  * @param delta
  * @param isAutoAdjustSection
  */
  moveSelectedEntities(delta: Vector | SerializedObject<"Vector">, isAutoAdjustSection: boolean): void;
  /**
  * 跳跃式移动所有选中的可连接实体
  * 会破坏框的嵌套关系
  * @param delta
  */
  jumpMoveSelectedConnectableEntities(delta: Vector | SerializedObject<"Vector">): void;
  /**
  * 树型移动 所有选中的实体
  * @param delta
  * @param skipDashed 是否跳过虚线边（树形格式化时传 true，避免带动虚线连接的节点）
  */
  moveEntitiesWithChildren(delta: Vector | SerializedObject<"Vector">, skipDashed: boolean): void;
  /**
  * 树形移动传入的可连接实体
  * @param node
  * @param delta
  * @param skipDashed 是否跳过虚线边（树形格式化时传 true，避免带动虚线连接的节点）
  */
  moveWithChildren(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, delta: Vector | SerializedObject<"Vector">, skipDashed: boolean): void;
}
/**
* 舞台管理器相关的工具函数
*
*/
declare interface StageUtils {
  readonly project: Project;
  /**
  * 替换不需要在舞台上做检测的自动生成的名称
  * @param template
  * @returns
  */
  replaceAutoNameWithoutStage(template: string): string;
  /**
  * 替换带有{{i}} 命名的自动生成的名称
  * @param template
  * @param targetStageObject
  */
  replaceAutoNameTemplate(currentName: string, targetStageObject: StageObject | SerializedObject<"StageObject">): string;
  isNameConflictWithTextNodes(name: string): boolean;
  isNameConflictWithSections(name: string): boolean;
}
/**
* 多源无向边移动中心点
*/
declare interface MultiTargetEdgeMove {
  readonly project: Project;
  /**
  *
  * @param lastMoveLocation 鼠标按下的位置
  * @param diffLocation 鼠标移动向量
  */
  moveMultiTargetEdge(diffLocation: Vector | SerializedObject<"Vector">): void;
}
/**
* 包含增加节点的方法
* 有可能是用鼠标增加，涉及自动命名器
* 也有可能是用键盘增加，涉及快捷键和自动寻找空地
*/
declare interface NodeAdder {
  readonly project: Project;
  /**
  * 通过点击位置增加节点
  * @param clickWorldLocation
  * 如果是直接创建，则需要记录位置，如果是通过已有位置创建，则还需要调整一次位置，此时不需要记录
  * @param shouldRecordHistory
  * @returns 创建节点的uuid
  */
  addTextNodeByClick(clickWorldLocation: Vector | SerializedObject<"Vector">, addToSections: Array<Section | SerializedObject<"Section">>, selectCurrent: boolean, shouldRecordHistory: boolean, options: undefined | { overrideFontScaleLevel?: number | undefined; }): Promise<string>;
  /**
  * 在当前已经选中的某个节点的情况下，增加节点
  * 增加在某个选中的节点的上方，下方，左方，右方等位置
  * ——快深频
  * @param selectCurrent
  * @returns 返回的是创建节点的uuid，如果当前没有选中节点，则返回空字符串
  */
  addTextNodeFromCurrentSelectedNode(direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right, addToSections: Array<Section | SerializedObject<"Section">>, selectCurrent: boolean): Promise<string>;
  getAutoName(): Promise<string>;
  getAutoColor(): Color;
  addConnectPoint(clickWorldLocation: Vector | SerializedObject<"Vector">, addToSections: Array<Section | SerializedObject<"Section">>): string;
  /**
  * 通过纯文本生成网状结构
  * 这个函数不稳定，可能会随时throw错误
  * @param text 网状结构的格式文本
  * @param diffLocation
  */
  addNodeGraphByText(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 通过带有缩进格式的文本来增加节点
  */
  addNodeTreeByText(text: string, indention: number, diffLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 根据 mermaid 文本生成框嵌套网状结构
  * 支持 graph TD 格式的 mermaid 文本
  * @param text Mermaid 格式文本
  * @param diffLocation 偏移位置
  */
  addNodeMermaidByText(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  /**
  * 根据 Markdown 文本生成节点树结构
  * @param markdownText Markdown 格式文本
  * @param diffLocation 偏移位置
  * @param autoLayout 是否自动应用树形布局（默认为 true）
  */
  addNodeByMarkdown(markdownText: string, diffLocation: Vector | SerializedObject<"Vector">, autoLayout: boolean): void;
  /***
  * 'a' -> 0
  * '    a' -> 1
  * '\t\ta' -> 2
  */
  getIndentLevel(line: string, indention: number): number;
}
/**
* 集成所有连线相关的功能
*/
declare interface NodeConnector {
  readonly project: Project;
  /**
  * 检测是否可以连接两个节点
  * @param fromNode
  * @param toNode
  */
  isConnectable(fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">): boolean;
  /**
  * 如果两个节点都是同一个 ConnectPoint 对象类型，则不能连接，因为没有必要
  * @param fromNode
  * @param toNode
  * @param text
  * @returns
  */
  connectConnectableEntity(fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, text: string, targetRectRate: undefined | [number, number], sourceRectRate: undefined | [number, number]): void;
  connectEntityFast(fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, text: string): void;
  addCrEdge(fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  addArcEdge(fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  reverseEdges(edges: Array<LineEdge | SerializedObject<"LineEdge">>): void;
  /**
  * 单独改变一个节点的连接点
  * @param edge
  * @param newTarget
  * @returns
  */
  changeEdgeTarget(edge: LineEdge | SerializedObject<"LineEdge">, newTarget: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  /**
  * 单独改变一个节点的源连接点
  * @param edge
  * @param newSource
  * @returns
  */
  changeEdgeSource(edge: LineEdge | SerializedObject<"LineEdge">, newSource: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  /**
  * 改变所有选中的连线的目标节点
  * @param newTarget
  */
  changeSelectedEdgeTarget(newTarget: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  /**
  * 改变所有选中的连线的源节点
  * @param newSource
  */
  changeSelectedEdgeSource(newSource: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
}
/**
* 所有和旋转相关的操作
*/
declare interface StageNodeRotate {
  readonly project: Project;
  /**
  * 通过拖拽边的方式来旋转节点
  * 会查找所有选中的边，但只能旋转一个边
  * @param lastMoveLocation
  * @param diffLocation
  */
  moveEdges(lastMoveLocation: Vector | SerializedObject<"Vector">, diffLocation: Vector | SerializedObject<"Vector">): void;
  /**
  *
  * @param rotateCenterNode 递归开始的节点
  * @param currentNode 当前递归遍历到的节点
  * @param degrees 旋转角度
  * @param visitedUUIDs 已经访问过的节点的uuid列表，用于避免死循环
  */
  rotateNodeDfs(rotateCenterNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, currentNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, degrees: number, visitedUUIDs: Array<string>): void;
}
/**
* 管理所有 节点/连线 的颜色
* 不仅包括添加颜色和去除颜色，还包括让颜色变暗和变亮等
*/
declare interface StageObjectColorManager {
  readonly project: Project;
  setSelectedStageObjectColor(color: Color | SerializedObject<"Color">, skipHistory: boolean): void;
  darkenNodeColor(): void;
  lightenNodeColor(): void;
}
/**
* 实时记录选中的各种类型的对象的数量
* 用于工具栏实时切换按钮的显示
*
* 现在2.0已经废弃了，因为有右键菜单了
*/
declare interface StageObjectSelectCounter {
  readonly project: Project;
  selectedStageObjectCount: number;
  selectedEntityCount: number;
  selectedAssociationCount: number;
  selectedEdgeCount: number;
  selectedCREdgeCount: number;
  selectedImageNodeCount: number;
  selectedTextNodeCount: number;
  selectedSectionCount: number;
  selectedMultiTargetUndirectedEdgeCount: number;
  /**
  * 上次更新时间
  * 防止频繁更新，影响性能
  */
  lastUpdateTimestamp: number;
  update(): void;
}
declare interface parserResult {
  /**
  * 是否是一个合法的引用块内容
  */
  isValid: boolean;
  /**
  * 不合法的原因
  */
  invalidReason: string;
  /**
  * 引用的文件名
  */
  fileName: string;
  /**
  * 引用的章节名，为空表示引用整个文件
  */
  sectionName: string;
}
declare interface ReferenceManager {
  readonly project: Project;
  /**
  * 处理引用按钮点击事件
  * O(N) 需要查找每一个引用的Section
  * @param clickLocation 点击位置
  */
  onClickReferenceNumber(clickLocation: Vector | SerializedObject<"Vector">): void;
  buildSectionName2SectionMap(sectionNames: Array<string>): Record<string, Section>;
  /**
  * 更新当前项目中的一个Section的引用信息
  * @param recentFiles
  * @param sectionName
  */
  updateOneSectionReferenceInfo(recentFiles: Array<RecentFile | SerializedObject<"RecentFile">>, sectionName: string): Promise<void>;
  /**
  * 更新当前项目的引用信息
  * （清理无效的引用）
  */
  updateCurrentProjectReference(): Promise<void>;
  checkReferenceBlockInProject(project: Project | SerializedObject<"Project">, fileName: string, sectionName: string): boolean;
  insertRefDataToSourcePrgFile(fileName: string, sectionName: string): Promise<void>;
  /**
  * 从源头 跳转到引用位置
  * @param section
  */
  jumpToReferenceLocation(fileName: string, referenceBlockNodeSectionName: string): Promise<void>;
  openSectionReferencePanel(section: Section | SerializedObject<"Section">): void;
}
/**
* 管理所有东西进出StageSection的逻辑
*/
declare interface SectionInOutManager {
  readonly project: Project;
  goInSection(entities: Array<Entity | SerializedObject<"Entity">>, section: Section | SerializedObject<"Section">): void;
  /**
  * 一些实体跳入多个Section（交叉嵌套）
  * 会先解除所有实体与Section的关联，再重新关联
  * @param entities
  * @param sections
  */
  goInSections(entities: Array<Entity | SerializedObject<"Entity">>, sections: Array<Section | SerializedObject<"Section">>): void;
  goOutSection(entities: Array<Entity | SerializedObject<"Entity">>, section: Section | SerializedObject<"Section">): void;
  /**
  * 将实体挂入某个 Section，但暂不刷新运行时索引。
  * 如果实体已经有父 Section，会先从旧父级中摘除，保证单父结构。
  */
  attachEntityToSection(entity: Entity | SerializedObject<"Entity">, section: Section | SerializedObject<"Section">): boolean;
  /**
  * 将实体从当前父 Section 中摘除，但暂不刷新运行时索引。
  */
  entityDropParent(entity: Entity | SerializedObject<"Entity">, convertEmptySectionToTextNode: boolean, excludeSection: null | Section | SerializedObject<"Section">): boolean;
  /**
  * Section 丢弃某个孩子
  * @param section
  * @param entity
  */
  sectionDropChild(section: Section | SerializedObject<"Section">, entity: Entity | SerializedObject<"Entity">, convertEmptySectionToTextNode: boolean): boolean;
  pickPreferredSection(sections: Array<Section | SerializedObject<"Section">>): Section | null;
  getSectionArea(section: Section | SerializedObject<"Section">): number;
  /**
  * 将section转换为TextNode，保持UUID、详细信息和连线关系不变
  * @param section 要转换的section
  */
  convertSectionToTextNode(section: Section | SerializedObject<"Section">): void;
}
/**
* 管理所有东西进出StageSection的逻辑
*/
declare interface SectionPackManager {
  readonly project: Project;
  /** 折叠起来 */
  packSection(): void;
  /**
  * 由于复层折叠，引起所有子节点的被隐藏状态发生改变
  * @param section
  * @param isCollapsed
  */
  modifyHiddenDfs(section: Section | SerializedObject<"Section">, isCollapsed: boolean): void;
  /** 展开 */
  unpackSection(): void;
  switchCollapse(): void;
  /**
  * 将所有选中的节点当场转换成Section
  */
  textNodeToSection(): void;
  /**
  * 将节点树转换成嵌套集合 （递归的）
  */
  textNodeTreeToSection(rootNode: TextNode | SerializedObject<"TextNode">): void;
  /**
  * 非递归的 将节点树转换成嵌套集合
  * @param rootNode
  */
  textNodeTreeToSectionNoDeep(rootNode: TextNode | SerializedObject<"TextNode">): void;
  /**
  * 将指定的文本节点转换成Section，自动删除原来的TextNode
  * @param textNode 要转换的节点
  * @param ignoreEdges 是否忽略边的影响
  * @param addConnectPoints 是否添加质点
  */
  targetTextNodeToSection(textNode: TextNode | SerializedObject<"TextNode">, ignoreEdges: boolean, addConnectPoints: boolean): Section;
  /**
  * 拆包操作
  */
  unpackSelectedSections(): void;
  /**
  * 打包的反操作：拆包
  * @param entities 要拆包的实体
  * 如果选择了section内部一层的实体，则父section脱离剥皮，变成一个textNode
  * 如果选择的是一个section，则其本身脱离剥皮，变成一个textNode，内部内容掉落出来。
  */
  unpackSections(entities: Array<Entity | SerializedObject<"Entity">>): void;
  /** 将多个实体打包成一个section，并添加到舞台中 */
  packEntityToSection(addEntities: Array<Entity | SerializedObject<"Entity">>): Promise<Section | undefined>;
  /**
  * 从框选区域创建Section，并在左上角和右下角添加质点
  */
  createSectionFromSelectionRectangle(): Section | undefined;
  /**
  * 将选中的实体打包成Section
  */
  packSelectedEntitiesToSection(): Promise<Section | undefined>;
  /**
  * 获取一个智能的Section标题，如果Section内是树形结构
  * @param addEntities
  * @returns
  */
  getSmartSectionTitle(addEntities: Array<Entity | SerializedObject<"Entity">>): string;
}
/**
* 孪生同步关系管理器
*
* 负责：
* 1. 创建孪生节点（从已有节点派生出新节点，并建立 SyncAssociation）
* 2. 触发同步（当某个成员字段变化后，同步至同组其他成员）
* 3. 查询某节点所在的 SyncAssociation
*/
declare interface StageSyncAssociationManager {
  readonly project: Project;
  createTwinsFromSelectedEntities(): void;
  /**
  * 获取所有 SyncAssociation 对象
  */
  getSyncAssociations(): SyncAssociation[];
  /**
  * 获取某个 StageObject 所在的所有 SyncAssociation
  */
  getSyncAssociationsByMember(member: StageObject | SerializedObject<"StageObject">): SyncAssociation[];
  /**
  * 获取某个 StageObject 的所有孪生兄弟（同组中除自身以外的成员）
  */
  getSyncSiblings(member: StageObject | SerializedObject<"StageObject">): StageObject[];
  /**
  * 从已有的 TextNode 创建一个孪生节点。
  *
  * 行为：
  * - 新节点内容（text、color、details）与原节点相同
  * - 新节点位置偏移在原节点右侧
  * - 如果原节点已在某个 SyncAssociation 中，新节点直接加入该组；否则新建一个 SyncAssociation
  *
  * @param source 作为孪生来源的节点
  */
  createTwinTextNode(source: TextNode | SerializedObject<"TextNode">): TextNode;
  /**
  * 当某个成员的指定字段发生变化时，将变化同步给同组所有其他成员。
  *
  * 使用 syncingSet 防止循环同步：
  * - A 修改 → 同步 B、C，将 A 加入 syncingSet
  * - B 收到同步写入时，发现 B 也在某个 SyncAssociation 中，但 A 已在 syncingSet 中，跳过
  *
  * @param source 发生变化的源节点
  * @param key 发生变化的字段名
  * @param syncingSet 当前同步会话中已处理过的节点 UUID 集合（防止循环）
  */
  syncFrom(source: StageObject | SerializedObject<"StageObject">, key: "details" | "text" | "color", syncingSet: Set<string> | SerializedObject<"Set">): void;
  /**
  * 当某个 StageObject 被从舞台删除时，从所有 SyncAssociation 中移除它。
  * 若某个 SyncAssociation 成员数量减少到 1 以下，则整个关系对象也被删除。
  *
  * 由 StageDeleteManager 调用。
  *
  * @param deleted 被删除的对象
  */
  onStageObjectDeleted(deleted: StageObject | SerializedObject<"StageObject">): void;
}
/**
* 标签管理器
*/
declare interface TagManager {
  readonly project: Project;
  /**
  * 和project.tags同步
  * 用于提高性能
  * 不要在外界修改
  */
  tagSet: Set<string>;
  reset(uuids: Array<string>): void;
  addTag(uuid: string): void;
  removeTag(uuid: string): void;
  /**
  * O(1)查询某uuid是否是标签
  * @param uuid
  * @returns
  */
  hasTag(uuid: string): boolean;
  /**
  * 清理未引用的标签
  */
  updateTags(): void;
  moveUpTag(uuid: string): void;
  moveDownTag(uuid: string): void;
  /**
  * 将所有选择的实体添加或移除标签
  */
  changeTagBySelected(): void;
  /**
  * 用于ui渲染
  * @returns 所有标签对应的名字
  */
  refreshTagNamesUI(): { tagName: string; uuid: string; color: [number, number, number, number]; }[];
  /**
  * 跳转到标签位置
  * @param tagUUID
  * @returns
  */
  moveCameraToTag(tagUUID: string): void;
}
/**
* 专门管理历史记录
* 负责撤销、反撤销、重做等操作
* 具有直接更改舞台状态的能力
*/
declare interface HistoryManager {
  memoryEfficient: HistoryManagerAbs;
  timeEfficient: HistoryManagerAbs;
  currentManager: HistoryManagerAbs;
  /**
  * 记录一步骤
  */
  recordStep(): void;
  /**
  * 撤销
  */
  undo(): void;
  /**
  * 反撤销
  */
  redo(): void;
  /**
  * 获取指定索引的历史记录
  * @param index 历史记录索引
  * @returns 舞台对象
  */
  get(index: number): Record<string, any>[];
  /**
  * 清空历史记录
  */
  clearHistory(): void;
  /**
  * 切换历史记录管理器模式
  * @param useTimeEfficient 是否使用时间效率优先的管理器
  */
  switchMode(useTimeEfficient: boolean): void;
}
declare interface HistoryManagerAbs {
  recordStep(): void;
  undo(): void;
  redo(): void;
  get(index: number): Record<string, any>[];
  clearHistory(): void;
}
/**
* 舞台管理器，也可以看成包含了很多操作方法的《舞台实体容器》
* 管理节点、边的关系等，内部包含了舞台上的所有实体
*/
declare interface StageManager {
  /**
  * 运行时缓存的根 Section 列表。
  * 它们没有直接父级 Section，会在 `updateReferences()` 中重建。
  */
  rootSections: Section[];
  /**
  * 运行时缓存的顶层实体列表。
  * 不在任何 Section 内的实体会出现在这里，会在 `updateReferences()` 中重建。
  */
  topLevelEntities: Entity[];
  /**
  * 最近一次运行时 Section 树重建时，被归一化丢弃的交叉父关系数量。
  * 该值不参与序列化，用于提示旧数据中曾存在多父嵌套。
  */
  normalizedCrossParentRelationCount: number;
  readonly project: Project;
  getRootSections(): Section[];
  getTopLevelEntities(): Entity[];
  getNormalizedCrossParentRelationCount(): number;
  /**
  * TODO: 这个get方法在2.0从O(1)变成O(N)了，可能是引起卡顿的原因，后面待排查
  * @param uuid
  * @returns
  */
  get(uuid: string): StageObject | undefined;
  isEmpty(): boolean;
  getTextNodes(): TextNode[];
  getConnectableEntity(): ConnectableEntity[];
  isEntityExists(uuid: string): boolean;
  getSections(): Section[];
  getImageNodes(): ImageNode[];
  getConnectPoints(): ConnectPoint[];
  getUrlNodes(): UrlNode[];
  getPenStrokes(): PenStroke[];
  getSvgNodes(): SvgNode[];
  getLatexNodes(): LatexNode[];
  getStageObjects(): StageObject[];
  /**
  * 获取场上所有的实体
  * @returns
  */
  getEntities(): Entity[];
  getEntitiesByUUIDs(uuids: Array<string>): Entity[];
  isNoEntity(): boolean;
  delete(stageObject: StageObject | SerializedObject<"StageObject">): void;
  getAssociations(): Association[];
  getEdges(): Edge[];
  getLineEdges(): LineEdge[];
  getCrEdges(): CubicCatmullRomSplineEdge[];
  getArcEdges(): ArcEdge[];
  add(stageObject: StageObject | SerializedObject<"StageObject">, skipUpdateReferences: boolean): void;
  /**
  * 更新节点的引用，将unknown的节点替换为真实的节点，保证对象在内存中的唯一性
  * 节点什么情况下会是unknown的？
  *
  * 包含了对分组框的更新
  * 包含了对Edge几何组偏移索引的更新（多重边/双向边自动散开）
  */
  updateReferences(): void;
  rebuildSectionRuntimeTree(): void;
  pickDirectParentSection(entity: Entity | SerializedObject<"Entity">, candidates: Array<Section | SerializedObject<"Section">>): Section | null;
  assignSectionRuntimeInfo(entity: Entity | SerializedObject<"Entity">, depth: number, lockedAncestor: null | Section | SerializedObject<"Section">): void;
  getEntityArea(entity: Entity | SerializedObject<"Entity">): number;
  getTextNodeByUUID(uuid: string): TextNode | null;
  getConnectableEntityByUUID(uuid: string): ConnectableEntity | null;
  isSectionByUUID(uuid: string): boolean;
  getSectionByUUID(uuid: string): Section | null;
  /**
  * 计算所有节点的中心点
  */
  getCenter(): Vector;
  /**
  * 计算所有节点的大小
  */
  getSize(): Vector;
  /**
  * 获取舞台的矩形对象
  */
  getBoundingRectangle(): Rectangle;
  /**
  * 根据位置查找节点，常用于点击事件
  * @param location
  * @returns
  */
  findTextNodeByLocation(location: Vector | SerializedObject<"Vector">): TextNode | null;
  /**
  * 用于鼠标悬停时查找边
  * @param location
  * @returns
  */
  findLineEdgeByLocation(location: Vector | SerializedObject<"Vector">): LineEdge | null;
  findAssociationByLocation(location: Vector | SerializedObject<"Vector">): Association | null;
  findSectionByLocation(location: Vector | SerializedObject<"Vector">): Section | null;
  findImageNodeByLocation(location: Vector | SerializedObject<"Vector">): ImageNode | null;
  findConnectableEntityByLocation(location: Vector | SerializedObject<"Vector">): ConnectableEntity | null;
  /**
  * 优先级：
  * 涂鸦 > 其他
  * @param location
  * @returns
  */
  findEntityByLocation(location: Vector | SerializedObject<"Vector">): Entity | null;
  findEntityInHierarchyByLocation(entities: Array<Entity | SerializedObject<"Entity">>, location: Vector | SerializedObject<"Vector">, accept: (entity: Entity) => entity is T, prioritizePenStroke: boolean, sectionOnlyMode: boolean): T | null;
  findConnectPointByLocation(location: Vector | SerializedObject<"Vector">): ConnectPoint | null;
  isHaveEntitySelected(): boolean;
  /**
  * O(n)
  * @returns
  */
  getSelectedEntities(): Entity[];
  getSelectedAssociations(): Association[];
  getSelectedStageObjects(): StageObject[];
  /**
  * 获取选中内容的边界矩形
  * @returns
  */
  getBoundingBoxOfSelected(): Rectangle;
  /**
  * 判断某一点是否有实体存在（排除实体的被Section折叠）
  * @param location
  * @returns
  */
  isEntityOnLocation(location: Vector | SerializedObject<"Vector">): boolean;
  isAssociationOnLocation(location: Vector | SerializedObject<"Vector">): boolean;
  deleteEntities(deleteNodes: Array<Entity | SerializedObject<"Entity">>): void;
  /**
  * 外部的交互层的delete键可以直接调用这个函数
  */
  deleteSelectedStageObjects(): void;
  deleteAssociation(deleteAssociation: Association | SerializedObject<"Association">): boolean;
  deleteEdge(deleteEdge: Edge | SerializedObject<"Edge">): boolean;
  connectEntity(fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, isCrEdge: boolean): boolean;
  /**
  * 多重连接，只记录一次历史
  * @param fromNodes
  * @param toNode
  * @param isCrEdge
  * @returns
  */
  connectMultipleEntities(fromNodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, isCrEdge: boolean, sourceRectRate: undefined | [number, number], targetRectRate: undefined | [number, number], isArcEdge: boolean): boolean;
  reverseSelectedEdges(): void;
  generateNodeTreeByText(text: string, indention: number, location: Vector | SerializedObject<"Vector">): void;
  generateNodeGraphByText(text: string, location: Vector | SerializedObject<"Vector">): void;
  generateNodeMermaidByText(text: string, location: Vector | SerializedObject<"Vector">): void;
  generateNodeByMarkdown(text: string, location: Vector | SerializedObject<"Vector">, autoLayout: boolean): void;
  /** 将多个实体打包成一个section，并添加到舞台中 */
  packEntityToSection(addEntities: Array<Entity | SerializedObject<"Entity">>): Promise<void>;
  /** 将选中的实体打包成一个section，并添加到舞台中 */
  packEntityToSectionBySelected(): Promise<void>;
  goInSection(entities: Array<Entity | SerializedObject<"Entity">>, section: Section | SerializedObject<"Section">): void;
  goOutSection(entities: Array<Entity | SerializedObject<"Entity">>, section: Section | SerializedObject<"Section">): void;
  /** 将所有选中的Section折叠起来 */
  packSelectedSection(): void;
  /** 将所有选中的Section展开 */
  unpackSelectedSection(): void;
  /**
  * 切换选中的Section的折叠状态
  */
  sectionSwitchCollapse(): void;
  connectEntityByCrEdge(fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">, toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  /**
  * 刷新所有舞台内容
  */
  refreshAllStageObjects(): void;
  /**
  * 刷新选中内容
  */
  refreshSelected(): void;
  /**
  * 改变连线的目标接头点位置
  * @param direction
  */
  changeSelectedEdgeConnectLocation(direction: null | Direction.Up | Direction.Down | Direction.Left | Direction.Right, isSource: boolean): void;
  /**
  * 更改多个连线的目标接头点位置
  * @param edges
  * @param direction
  * @param isSource
  */
  changeEdgesConnectLocation(edges: Array<Edge | SerializedObject<"Edge">>, direction: null | Direction.Up | Direction.Down | Direction.Left | Direction.Right, isSource: boolean): void;
  switchLineEdgeToCrEdge(): void;
  /**
  * 有向边转无向边
  */
  switchEdgeToUndirectedEdge(): void;
  /**
  * 有向边转弧形边
  */
  switchEdgeToArcEdge(): void;
  /**
  * 无向边转有向边
  */
  switchUndirectedEdgeToEdge(): void;
  addSelectedCREdgeControlPoint(): void;
  addSelectedCREdgeTension(): void;
  reduceSelectedCREdgeTension(): void;
  /**
  * 设置选中Edge的线条类型
  */
  setSelectedEdgeLineType(lineType: string): void;
  /**
  * 设置选中Edge的箭头类型
  */
  setSelectedEdgeArrowType(arrowType: string): void;
  /**
  * ctrl + A 全选
  */
  selectAll(): void;
  clearSelectAll(): void;
}
/**
* 一切连接关系的抽象
*/
declare interface Association {
  associationList: StageObject[];
  /**
  * 任何关系都应该有一个颜色用来标注
  */
  color: Color;
  readonly project: Project;
  uuid: string;
  collisionBox: CollisionBox;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* 一切可被连接的关联
*/
declare interface ConnectableAssociation {
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  /**
  * 任何关系都应该有一个颜色用来标注
  */
  color: Color;
  readonly project: Project;
  uuid: string;
  collisionBox: CollisionBox;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* 一切可被Edge连接的东西，且会算入图分析算法的东西
*/
declare interface ConnectableEntity {
  /**
  * 几何中心点
  * 用于联动旋转等算法
  */
  geometryCenter: Vector;
  unknown: boolean;
  /**
  * 将某个物体移动某个距离
  * @param delta
  */
  move(delta: Vector | SerializedObject<"Vector">): void;
  /**
  * 是否忽略自动对齐功能
  * 例如涂鸦就不吸附对齐
  */
  isAlignExcluded: boolean;
  /**
  * 将某个物体移动到某个位置
  * 注意：看的是最小外接矩形的左上角位置，不是中心位置
  * @param location
  */
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  /**
  * 与其他实体碰撞，调整位置；能够递归传递
  * @param other 其他实体
  */
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  /**
  * 是不是因为所在的Section被折叠而隐藏了
  * 因为任何Entity都可以放入Section
  */
  isHiddenBySectionCollapse: boolean;
  detailsManager: DetailsManager;
  readonly project: Project;
  uuid: string;
  collisionBox: CollisionBox;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* 一切独立存在、能被移动的东西，且放在框里能被连带移动的东西
* 实体
*/
declare interface Entity {
  /**
  * 将某个物体移动某个距离
  * @param delta
  */
  move(delta: Vector | SerializedObject<"Vector">): void;
  /**
  * 是否忽略自动对齐功能
  * 例如涂鸦就不吸附对齐
  */
  isAlignExcluded: boolean;
  /**
  * 将某个物体移动到某个位置
  * 注意：看的是最小外接矩形的左上角位置，不是中心位置
  * @param location
  */
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  /**
  * 与其他实体碰撞，调整位置；能够递归传递
  * @param other 其他实体
  */
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  /**
  * 是不是因为所在的Section被折叠而隐藏了
  * 因为任何Entity都可以放入Section
  */
  isHiddenBySectionCollapse: boolean;
  detailsManager: DetailsManager;
  readonly project: Project;
  uuid: string;
  collisionBox: CollisionBox;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* 一切舞台上的东西
* 都具有碰撞箱，uuid
*/
declare interface StageObject {
  readonly project: Project;
  uuid: string;
  collisionBox: CollisionBox;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
declare interface ResizeAble {
  /**
  * 拽住右下角的拖拽点拖拽，来改变大小
  * @param delta
  */
  resizeHandle(delta: Vector | SerializedObject<"Vector">): void;
  /**
  * 获取改变大小的拖拽区域
  */
  getResizeHandleRect(): Rectangle;
}
/**
* 圆弧有向边
*
* 从 source 节点中心到 target 节点中心画圆弧，
* 通过 offset 控制弧线的弯曲方向和程度。
* arc() 端点被裁剪到节点矩形边缘上，确保箭头不重叠。
*/
declare interface ArcEdge {
  uuid: string;
  text: string;
  color: Color;
  lineType: string;
  arrowType: string;
  /**
  * 圆弧偏移量（世界坐标）
  * 0 = 直线
  * 正数 = 向 AB 连线左侧弯曲
  * 负数 = 向 AB 连线右侧弯曲
  */
  offset: number;
  /**
  * 弧线上文字的位置比例。
  * 0.0 = 靠近源节点，0.5 = 中间，1.0 = 靠近目标节点
  */
  textPosition: number;
  /**
  * 获取或计算圆弧几何参数（每次实时计算，不缓存）
  */
  arcGeometry: ArcGeometry;
  /**
  * 获取圆弧在矩形边缘上的裁剪后的端点
  */
  clippedStart: Vector;
  /**
  * 获取圆弧在目标矩形边缘上的裁剪后的端点
  */
  clippedEnd: Vector;
  /**
  * 获取圆弧在终点处的切线方向（用于箭头）
  */
  getArrowDirection(): Vector;
  /**
  * 获取圆弧在起点处离开 source 节点的切线方向（用于菱形方向）
  * 弧线在 source 端的行进方向（从 source 出发朝向 target）
  */
  getSourceDirection(): Vector;
  collisionBox: CollisionBox;
  edgeWidth: number;
  textFontSize: number;
  textRectangle: Rectangle;
  /**
  * 获取圆弧的中点（用于文字定位）
  * 使用裁剪后的起点终点计算中点在可见弧段上的位置
  */
  getArcMidPoint(): Vector;
  readonly project: Project;
  unknown: boolean;
  adjustSizeByText(): void;
  isHiddenBySectionCollapse: boolean;
  /**
  * 是否被选中
  */
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 获取两个实体之间的直线
  * 此直线两端在两个实体外接矩形的边缘，延长后可过两个实体外接矩形的中心
  * 但对于图片节点，如果rate是精确值（不是旧的默认值），则直接使用内部位置
  */
  bodyLine: Line;
  /**
  * 获取该连线的起始点位置对应的世界坐标
  */
  sourceLocation: Vector;
  /**
  * 获取该连线的终止点位置对应的世界坐标
  */
  targetLocation: Vector;
  targetRectangleRate: Vector;
  sourceRectangleRate: Vector;
  rename(text: string): void;
  /**
  * 用于碰撞箱框选
  * @param rectangle
  */
  isIntersectsWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  /**
  * 用于鼠标悬浮在线上的时候
  * @param location
  * @returns
  */
  isIntersectsWithLocation(location: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 用于线段框选
  * @param line
  * @returns
  */
  isIntersectsWithLine(line: Line | SerializedObject<"Line">): boolean;
  isLeftToRight(): boolean;
  isRightToLeft(): boolean;
  isTopToBottom(): boolean;
  isBottomToTop(): boolean;
  isUnknownDirection(): boolean;
  /**
  * 是否是非标准连线（端点位置不对应标准四方向，也不是默认中心方向）
  * 例如：右侧发出 + 上侧接收，即混合了不同轴的端点
  */
  isNonStandardDirection(): boolean;
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* 三点定圆的辅助结果
*/
declare interface ArcGeometry {
  center: Vector;
  radius: number;
  startAngle: number;
  endAngle: number;
  counterclockwise: boolean;
}
/**
* CR曲线连线
* 和早期的Edge一样，用于有向的连接两个实体，形成连接关系
* alpha 不用自己修改了，这个是0.5固定值了，只会微微影响形状
* tension 控制曲线的弯曲程度，0是折线。
*/
declare interface CubicCatmullRomSplineEdge {
  uuid: string;
  text: string;
  _source: ConnectableEntity;
  _target: ConnectableEntity;
  color: Color;
  alpha: number;
  tension: number;
  controlPoints: Vector[];
  getControlPoints(): Vector[];
  addControlPoint(): void;
  _collisionBox: CollisionBox;
  collisionBox: CollisionBox;
  readonly project: Project;
  unknown: boolean;
  getShape(): CubicCatmullRomSpline;
  /**
  * 获取文字的矩形框的方法
  */
  textRectangle: Rectangle;
  autoUpdateControlPoints(): void;
  /**
  * 获取箭头的位置和方向
  */
  getArrowHead(): { location: Vector; direction: Vector; };
  adjustSizeByText(): void;
  isHiddenBySectionCollapse: boolean;
  /**
  * 是否被选中
  */
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 获取两个实体之间的直线
  * 此直线两端在两个实体外接矩形的边缘，延长后可过两个实体外接矩形的中心
  * 但对于图片节点，如果rate是精确值（不是旧的默认值），则直接使用内部位置
  */
  bodyLine: Line;
  /**
  * 获取该连线的起始点位置对应的世界坐标
  */
  sourceLocation: Vector;
  /**
  * 获取该连线的终止点位置对应的世界坐标
  */
  targetLocation: Vector;
  targetRectangleRate: Vector;
  sourceRectangleRate: Vector;
  rename(text: string): void;
  /**
  * 用于碰撞箱框选
  * @param rectangle
  */
  isIntersectsWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  /**
  * 用于鼠标悬浮在线上的时候
  * @param location
  * @returns
  */
  isIntersectsWithLocation(location: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 用于线段框选
  * @param line
  * @returns
  */
  isIntersectsWithLine(line: Line | SerializedObject<"Line">): boolean;
  isLeftToRight(): boolean;
  isRightToLeft(): boolean;
  isTopToBottom(): boolean;
  isBottomToTop(): boolean;
  isUnknownDirection(): boolean;
  /**
  * 是否是非标准连线（端点位置不对应标准四方向，也不是默认中心方向）
  * 例如：右侧发出 + 上侧接收，即混合了不同轴的端点
  */
  isNonStandardDirection(): boolean;
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* 连接两个实体的有向边
*/
declare interface Edge {
  uuid: string;
  /**
  * 线段上的文字
  */
  text: string;
  collisionBox: CollisionBox;
  isHiddenBySectionCollapse: boolean;
  /**
  * 是否被选中
  */
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 任何有向边都可以标注文字
  * 进而获得该文字的外框矩形
  */
  textRectangle: Rectangle;
  /**
  * 获取两个实体之间的直线
  * 此直线两端在两个实体外接矩形的边缘，延长后可过两个实体外接矩形的中心
  * 但对于图片节点，如果rate是精确值（不是旧的默认值），则直接使用内部位置
  */
  bodyLine: Line;
  /**
  * 获取该连线的起始点位置对应的世界坐标
  */
  sourceLocation: Vector;
  /**
  * 获取该连线的终止点位置对应的世界坐标
  */
  targetLocation: Vector;
  targetRectangleRate: Vector;
  sourceRectangleRate: Vector;
  /**
  * 调整线段上的文字的外框矩形
  */
  adjustSizeByText(): void;
  rename(text: string): void;
  /**
  * 用于碰撞箱框选
  * @param rectangle
  */
  isIntersectsWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  /**
  * 用于鼠标悬浮在线上的时候
  * @param location
  * @returns
  */
  isIntersectsWithLocation(location: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 用于线段框选
  * @param line
  * @returns
  */
  isIntersectsWithLine(line: Line | SerializedObject<"Line">): boolean;
  isLeftToRight(): boolean;
  isRightToLeft(): boolean;
  isTopToBottom(): boolean;
  isBottomToTop(): boolean;
  isUnknownDirection(): boolean;
  /**
  * 是否是非标准连线（端点位置不对应标准四方向，也不是默认中心方向）
  * 例如：右侧发出 + 上侧接收，即混合了不同轴的端点
  */
  isNonStandardDirection(): boolean;
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  /**
  * 任何关系都应该有一个颜色用来标注
  */
  color: Color;
  readonly project: Project;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
declare interface LineEdge {
  uuid: string;
  text: string;
  color: Color;
  lineType: string;
  arrowType: string;
  collisionBox: CollisionBox;
  /**
  * 几何组偏移索引（运行时计算，非持久化）
  * 0 = 正常直线/曲线
  * 正负整数 = 向垂直方向偏移，用于同几何组的多重边自动散开
  * 取代旧的 isShifting boolean，逻辑被几何组方案完全包含
  */
  shiftingIndex: number;
  _shiftingIndex: number;
  readonly project: Project;
  /** true表示解析状态，false表示解析完毕 */
  unknown: boolean;
  rename(text: string): void;
  /** 与渲染器保持一致的线宽，用于字号等比缩放 */
  edgeWidth: number;
  /** 连线文字字号，随线宽等比缩放 */
  textFontSize: number;
  textRectangle: Rectangle;
  shiftingMidPoint: Vector;
  adjustSizeByText(): void;
  isHiddenBySectionCollapse: boolean;
  /**
  * 是否被选中
  */
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 获取两个实体之间的直线
  * 此直线两端在两个实体外接矩形的边缘，延长后可过两个实体外接矩形的中心
  * 但对于图片节点，如果rate是精确值（不是旧的默认值），则直接使用内部位置
  */
  bodyLine: Line;
  /**
  * 获取该连线的起始点位置对应的世界坐标
  */
  sourceLocation: Vector;
  /**
  * 获取该连线的终止点位置对应的世界坐标
  */
  targetLocation: Vector;
  targetRectangleRate: Vector;
  sourceRectangleRate: Vector;
  /**
  * 用于碰撞箱框选
  * @param rectangle
  */
  isIntersectsWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  /**
  * 用于鼠标悬浮在线上的时候
  * @param location
  * @returns
  */
  isIntersectsWithLocation(location: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 用于线段框选
  * @param line
  * @returns
  */
  isIntersectsWithLine(line: Line | SerializedObject<"Line">): boolean;
  isLeftToRight(): boolean;
  isRightToLeft(): boolean;
  isTopToBottom(): boolean;
  isBottomToTop(): boolean;
  isUnknownDirection(): boolean;
  /**
  * 是否是非标准连线（端点位置不对应标准四方向，也不是默认中心方向）
  * 例如：右侧发出 + 上侧接收，即混合了不同轴的端点
  */
  isNonStandardDirection(): boolean;
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* 多端无向边
*
* 超边。
* 以后可以求最大强独立集
*/
declare interface MultiTargetUndirectedEdge {
  uuid: string;
  collisionBox: CollisionBox;
  text: string;
  color: Color;
  rectRates: Vector[];
  centerRate: Vector;
  arrow: UndirectedEdgeArrowType;
  arrowType: UndirectedEdgeArrowShape;
  renderType: MultiTargetUndirectedEdgeRenderType;
  lineType: UndirectedEdgeLineType;
  padding: number;
  rename(text: string): void;
  readonly project: Project;
  /** true表示解析状态，false表示解析完毕 */
  unknown: boolean;
  /**
  * 获取中心点
  */
  centerLocation: Vector;
  textRectangle: Rectangle;
  /**
  * 是否被选中
  */
  _isSelected: boolean;
  isSelected: boolean;
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* 无向边的渲染方式
* line：内部连线式渲染
* convex：凸包连线式渲染
* circle：圆形包围渲染
*/
declare type MultiTargetUndirectedEdgeRenderType = "line" | "convex" | "circle";
/**
* 无向边的箭头形状（与 LineEdge.arrowType 保持一致）
* default：燕尾箭头
* hollow-triangle：空心三角形
* filled-triangle：实心三角形
* hollow-diamond：空心菱形
* filled-diamond：实心菱形
*/
declare type UndirectedEdgeArrowShape = "default" | "hollow-triangle" | "filled-triangle" | "hollow-diamond" | "filled-diamond";
/**
* 无向边的箭头类型
* inner：--> xxx <--
* outer：<-- xxx -->
* none： --- xxx ---
*/
declare type UndirectedEdgeArrowType = "inner" | "outer" | "none";
/**
* 无向边的线条类型
* solid：实线
* dashed：虚线
* double：双实线
*/
declare type UndirectedEdgeLineType = "solid" | "dashed" | "double";
/**
* 孪生同步关系可同步的字段
*/
declare type SyncableKey = "text" | "color" | "details";
/**
* 孪生同步关系（SyncAssociation）
*
* 将一组 StageObject 绑定在一起，当其中任意成员的指定字段（keys）发生变化时，
* 其余成员的同名字段自动同步更新。
*
* 特性：
* - 不占据画布物理空间（isPhysical = false），不参与框选、劈砍、视野重置等交互
* - 没有碰撞箱（返回零大小空碰撞箱）
* - 成员数量 >= 2 时有效；若成员被删除导致只剩 1 个，整个关系对象会被自动清理
* - 支持任意数量的成员，修改一个成员会同步至同组所有其他成员
*/
declare interface SyncAssociation {
  uuid: string;
  /**
  * 需要同步的字段列表
  * "text"：同步节点文字内容
  * "color"：同步节点背景颜色
  * "details"：同步节点富文本详情
  */
  keys: SyncableKey[];
  /**
  * 参与同步的所有成员（宽泛接受 StageObject，未来可扩展）
  */
  associationList: StageObject[];
  /**
  * 孪生关系没有碰撞箱，返回零大小的空碰撞箱
  */
  collisionBox: CollisionBox;
  /**
  * 孪生关系不占据物理空间，排除在框选、劈砍、F键视野重置等交互之外
  */
  isPhysical: boolean;
  /**
  * 孪生关系对象不可被选中
  */
  _isSelected: boolean;
  isSelected: boolean;
  readonly project: Project;
  /** true 表示解析状态，false 表示解析完毕 */
  unknown: boolean;
  /**
  * 将 source 节点的同步字段值，复制给 this（自身）
  * 由 StageSyncAssociationManager.syncFrom 调用，不应直接调用
  *
  * @param source 发生变化的源节点
  */
  applyFrom(source: StageObject | SerializedObject<"StageObject">): void;
  /**
  * 任何关系都应该有一个颜色用来标注
  */
  color: Color;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* 碰撞箱类
*/
declare interface CollisionBox {
  shapes: Shape[];
  /**
  *
  * @param shapes 更新碰撞箱的形状列表
  */
  updateShapeList(shapes: Array<Shape | SerializedObject<"Shape">>): void;
  isContainsPoint(location: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 碰撞框选
  * @param rectangle
  * @returns
  */
  isIntersectsWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  /**
  * 完全覆盖框选
  * @param rectangle
  * @returns
  */
  isContainedByRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isIntersectsWithLine(line: Line | SerializedObject<"Line">): boolean;
  /**
  * 获取碰撞箱们的最小外接矩形
  * 如果形状数组为空，则返回00点的无大小矩形
  */
  getRectangle(): Rectangle;
}
/**
* 质点不再区分膨胀状态和收缩状态
*/
declare interface ConnectPoint {
  geometryCenter: Vector;
  isHiddenBySectionCollapse: boolean;
  collisionBox: CollisionBox;
  uuid: string;
  radius: number;
  /**
  * 节点是否被选中
  */
  _isSelected: boolean;
  /**
  * 获取节点的选中状态
  */
  isSelected: boolean;
  readonly project: Project;
  unknown: boolean;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  /**
  * 是否忽略自动对齐功能
  * 例如涂鸦就不吸附对齐
  */
  isAlignExcluded: boolean;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  /**
  * 与其他实体碰撞，调整位置；能够递归传递
  * @param other 其他实体
  */
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
declare interface ExtensionEntity {
  geometryCenter: Vector;
  uuid: string;
  extensionId: string;
  typeName: string;
  customData: any;
  collisionBox: CollisionBox;
  isHiddenBySectionCollapse: boolean;
  _bitmapCache: ImageBitmap | null;
  _isDirty: boolean;
  _isRendering: boolean;
  _renderFailed: boolean;
  /** 上次触发渲染时使用的 pixelRatio（scale × devicePixelRatio），用于检测是否需要重渲 */
  _lastRenderedPixelRatio: number;
  readonly project: Project;
  rectangle: Rectangle;
  location: Vector;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  markDirty(): void;
  setCustomData(data: any): void;
  unknown: boolean;
  /**
  * 是否忽略自动对齐功能
  * 例如涂鸦就不吸附对齐
  */
  isAlignExcluded: boolean;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  /**
  * 与其他实体碰撞，调整位置；能够递归传递
  * @param other 其他实体
  */
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
declare interface ExtensionEntityConfig {
  initialData: any;
  collisionBox: CollisionBox;
}
/**
* 一个图片节点
* 图片的路径字符串决定了这个图片是什么
*
* 有两个转换过程：
*
* 图片路径 -> base64字符串 -> 图片Element -> 完成
*   gettingBase64
*     |
*     v
*   fileNotfound
*   base64EncodeError
*
*/
declare interface ImageNode {
  isHiddenBySectionCollapse: boolean;
  uuid: string;
  collisionBox: CollisionBox;
  attachmentId: string;
  scale: number;
  /**
  * 是否为背景图片
  */
  isBackground: boolean;
  /**
  * 节点是否被选中
  */
  _isSelected: boolean;
  /**
  * 获取节点的选中状态
  */
  isSelected: boolean;
  bitmap: ImageBitmap | undefined;
  state: "loading" | "success" | "notFound";
  readonly project: Project;
  unknown: boolean;
  onReady?: (() => void) | undefined;
  scaleUpdate(scaleDiff: number): void;
  /**
  * 只读，获取节点的矩形
  * 若要修改节点的矩形，请使用 moveTo等 方法
  */
  rectangle: Rectangle;
  geometryCenter: Vector;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  /**
  * 反转图片颜色
  * 将图片的RGB值转换为互补色（255-R, 255-G, 255-B）
  * 并将反色后的图片数据保存到project.attachments中，实现持久化存储
  */
  reverseColors(): void;
  /**
  * 交换图片的红蓝通道
  * 将图片的红色和蓝色通道对调，绿色和alpha通道保持不变
  * 并将处理后的图片数据保存到project.attachments中，实现持久化存储
  */
  swapRedBlueChannels(): void;
  compressImage(): void;
  /**
  * 处理拖拽缩放逻辑
  * @param delta 拖拽距离向量
  */
  resizeHandle(delta: Vector | SerializedObject<"Vector">): void;
  /**
  * 获取缩放控制点矩形
  * 返回右下角的一个小矩形，用于拖拽缩放
  */
  getResizeHandleRect(): Rectangle;
  /**
  * 是否忽略自动对齐功能
  * 例如涂鸦就不吸附对齐
  */
  isAlignExcluded: boolean;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  /**
  * 与其他实体碰撞，调整位置；能够递归传递
  * @param other 其他实体
  */
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* LaTeX 公式节点
*
* 将 LaTeX 字符串渲染为公式图片显示在舞台上。
* 持久化只存储 LaTeX 字符串，SVG 渲染结果在运行时动态生成。
* 缩放方式与文本节点一致，使用 fontScaleLevel 指数缩放。
*/
declare interface LatexNode {
  uuid: string;
  /**
  * LaTeX 源代码字符串（不含 $ 符号），如 "E=mc^2"
  */
  latexSource: string;
  collisionBox: CollisionBox;
  color: Color;
  /**
  * 字体缩放级别，与 TextNode 一致
  * 公式大小缩放公式：scale = 2^(fontScaleLevel / 2)
  */
  fontScaleLevel: number;
  isHiddenBySectionCollapse: boolean;
  /** 渲染结果图片 */
  image: HTMLImageElement;
  /** 渲染后 SVG 的原始像素尺寸 */
  svgOriginalSize: Vector;
  /** 渲染状态 */
  state: "loading" | "error" | "success";
  /**
  * 当前图片实际渲染时使用的颜色（CSS color 字符串，如 rgba(...) / #rrggbb）。
  * LatexNodeRenderer 在每帧对比"应显示颜色"与此值，不一致时触发重新渲染。
  */
  currentRenderedColorCss: string;
  /** 节点是否被选中 */
  _isSelected: boolean;
  isSelected: boolean;
  rectangle: Rectangle;
  geometryCenter: Vector;
  readonly project: Project;
  /**
  * 获取当前缩放倍数
  * 公式：2^(fontScaleLevel / 2)
  */
  getScale(): number;
  /**
  * 放大字体（增加 fontScaleLevel）
  */
  increaseFontSize(anchorRate: undefined | Vector | SerializedObject<"Vector">): void;
  /**
  * 缩小字体（减少 fontScaleLevel）
  */
  decreaseFontSize(anchorRate: undefined | Vector | SerializedObject<"Vector">): void;
  /**
  * 根据当前 fontScaleLevel 更新碰撞箱大小
  */
  updateCollisionBoxByScale(anchorRate: undefined | Vector | SerializedObject<"Vector">): void;
  _adjustLocationToKeepAnchor(oldRect: Rectangle | SerializedObject<"Rectangle">, anchorRate: Vector | SerializedObject<"Vector">): void;
  /**
  * 更新 LaTeX 源码并重新渲染
  * @param newLatex 新的 LaTeX 字符串
  * @param colorCss 渲染颜色（CSS color 字符串，如 "rgba(255,0,0,0.5)" / "#ffffff"），不传则沿用当前已记录的颜色
  */
  updateLatex(newLatex: string, colorCss: undefined | string): Promise<void>;
  /**
  * 以指定颜色重新渲染当前 LaTeX（颜色变化时由 LatexNodeRenderer 调用）
  */
  reRenderWithColor(colorCss: string): Promise<void>;
  /**
  * 将 LaTeX 字符串渲染为 HTMLImageElement
  * 流程：katex.renderToString → SVG foreignObject → Blob URL → Image
  * @param latex LaTeX 源码
  * @param colorCss 公式颜色（CSS color 字符串，如 "rgba(255,0,0,0.5)" / "#ffffff"）
  */
  renderLatexToImage(latex: string, colorCss: string): Promise<void>;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  unknown: boolean;
  /**
  * 是否忽略自动对齐功能
  * 例如涂鸦就不吸附对齐
  */
  isAlignExcluded: boolean;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  /**
  * 与其他实体碰撞，调整位置；能够递归传递
  * @param other 其他实体
  */
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
declare interface PenStroke {
  /** 涂鸦不参与吸附对齐 */
  isAlignExcluded: boolean;
  isHiddenBySectionCollapse: boolean;
  collisionBox: CollisionBox;
  uuid: string;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  updateCollisionBoxBySegmentList(): void;
  segments: PenStrokeSegment[];
  color: Color;
  getPath(): Vector[];
  readonly project: Project;
  getCollisionBoxFromSegmentList(segmentList: Array<PenStrokeSegment | SerializedObject<"PenStrokeSegment">>): CollisionBox;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  /**
  * 与其他实体碰撞，调整位置；能够递归传递
  * @param other 其他实体
  */
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* 一笔画中的某一个小段
* 起始点，结束点，宽度
*/
declare interface PenStrokeSegment {
  location: Vector;
  pressure: number;
}
/**
* 引用块节点
* 用于跨文件引用其他prg文件中的Section内容
* 以静态图片的方式渲染在舞台上
*/
declare interface ReferenceBlockNode {
  isHiddenBySectionCollapse: boolean;
  uuid: string;
  collisionBox: CollisionBox;
  /**
  * 引用的文件名，不包括文件扩展名
  */
  fileName: string;
  /**
  * 引用的分组框名，为空表示引用整个文件
  */
  sectionName: string;
  scale: number;
  attachmentId: string;
  /**
  * 节点是否被选中
  */
  _isSelected: boolean;
  bitmap: ImageBitmap | undefined;
  state: "loading" | "success" | "notFound";
  readonly project: Project;
  unknown: boolean;
  isSelected: boolean;
  loadImageFromAttachment(): void;
  generateScreenshot(): Promise<void>;
  updateCollisionBox(): void;
  scaleUpdate(scaleDiff: number): void;
  rectangle: Rectangle;
  geometryCenter: Vector;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  /**
  * 更新引用的内容
  */
  refresh(): Promise<void>;
  /**
  * 用户点击这个引用块，跳转到对应的跨文件的 地方
  */
  goToSource(): Promise<void>;
  focusSectionInProject(project: Project | SerializedObject<"Project">): void;
  /**
  * 处理拖拽缩放逻辑
  * @param delta 拖拽距离向量
  */
  resizeHandle(delta: Vector | SerializedObject<"Vector">): void;
  /**
  * 获取缩放控制点矩形
  * 返回右下角的一个小矩形，用于拖拽缩放
  */
  getResizeHandleRect(): Rectangle;
  /**
  * 是否忽略自动对齐功能
  * 例如涂鸦就不吸附对齐
  */
  isAlignExcluded: boolean;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  /**
  * 与其他实体碰撞，调整位置；能够递归传递
  * @param other 其他实体
  */
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
declare interface Section {
  /**
  * 节点是否被选中
  */
  _isSelected: boolean;
  uuid: string;
  _isEditingTitle: boolean;
  _collisionBoxWhenCollapsed: CollisionBox;
  _collisionBoxNormal: CollisionBox;
  isEditingTitle: boolean;
  collisionBox: CollisionBox;
  /** 获取折叠状态下的碰撞箱 */
  collapsedCollisionBox(): CollisionBox;
  color: Color;
  text: string;
  children: Entity[];
  /** 是否是折叠状态 */
  isCollapsed: boolean;
  /**
  * 是否锁定 Section 内部物体
  * 当 locked 为 true 时，Section 内部的所有物体都不能移动或删除
  */
  locked: boolean;
  /**
  * 边框样式：实线、虚线、无边框
  */
  borderStyle: "none" | "solid" | "dashed";
  isHiddenBySectionCollapse: boolean;
  readonly project: Project;
  unknown: boolean;
  rename(newName: string): void;
  /**
  * 根据子内容 自动调整分组框的位置和大小
  * 如果没有子内容，则
  *   自动调整大小为 标题+padding，位置为 当前碰撞箱外接矩形的左上角
  */
  adjustLocationAndSize(): void;
  /**
  * 根据自身的折叠状态调整子节点的状态
  * 以屏蔽触碰和显示
  */
  adjustChildrenStateByCollapse(parentCollapsed: boolean): void;
  /**
  * 获取节点的选中状态
  */
  isSelected: boolean;
  /**
  * 只读，获取节点的矩形
  * 若要修改节点的矩形，请使用 moveTo等 方法
  */
  rectangle: Rectangle;
  geometryCenter: Vector;
  move(delta: Vector | SerializedObject<"Vector">): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  /**
  * 将某个物体 的最小外接矩形的左上角位置 移动到某个位置
  * @param location
  */
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  /**
  * 是否忽略自动对齐功能
  * 例如涂鸦就不吸附对齐
  */
  isAlignExcluded: boolean;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  detailsManager: DetailsManager;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* Svg 节点
*/
declare interface SvgNode {
  color: Color;
  uuid: string;
  scale: number;
  collisionBox: CollisionBox;
  attachmentId: string;
  isHiddenBySectionCollapse: boolean;
  originalSize: Vector;
  image: HTMLImageElement;
  readonly project: Project;
  geometryCenter: Vector;
  scaleUpdate(scaleDiff: number): void;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  /**
  * 修改SVG内容中的颜色
  * @param newColor 新颜色
  * 并将修改后的SVG内容保存到project.attachments中，实现持久化存储
  */
  changeColor(newColor: Color | SerializedObject<"Color">, mode: "fill" | "stroke"): Promise<void>;
  /**
  * 处理拖拽缩放逻辑
  * @param delta 拖拽距离向量
  */
  resizeHandle(delta: Vector | SerializedObject<"Vector">): void;
  /**
  * 获取缩放控制点矩形
  * 返回右下角的一个小矩形，用于拖拽缩放
  */
  getResizeHandleRect(): Rectangle;
  unknown: boolean;
  /**
  * 是否忽略自动对齐功能
  * 例如涂鸦就不吸附对齐
  */
  isAlignExcluded: boolean;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  /**
  * 与其他实体碰撞，调整位置；能够递归传递
  * @param other 其他实体
  */
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
*
* 文字节点类
* 2024年10月20日：Node 改名为 TextNode，防止与 原生 Node 类冲突
*/
declare interface TextNode {
  uuid: string;
  text: string;
  collisionBox: CollisionBox;
  color: Color;
  /**
  * 字体缩放级别，整数，基准值为0，对应默认字体大小
  * 计算公式：finalFontSize = Renderer.FONT_SIZE * Math.pow(2, fontScaleLevel)
  */
  fontScaleLevel: number;
  /**
  * 调整大小的模式
  * auto：自动缩紧
  * manual：手动调整宽度，高度自动撑开。
  */
  sizeAdjust: string;
  /**
  * 自定义字体，空字符串表示使用默认字体
  */
  fontFamily: string;
  /**
  * 自定义字重，空字符串表示使用 normal
  */
  fontWeight: string;
  /**
  * 节点是否被选中
  */
  _isSelected: boolean;
  /**
  * 获取节点的选中状态
  */
  isSelected: boolean;
  /**
  * 只读，获取节点的矩形
  * 若要修改节点的矩形，请使用 moveTo等 方法
  */
  rectangle: Rectangle;
  geometryCenter: Vector;
  /**
  * 是否在编辑文字，编辑时不渲染文字
  */
  _isEditing: boolean;
  isEditing: boolean;
  isHiddenBySectionCollapse: boolean;
  readonly project: Project;
  unknown: boolean;
  /**
  * 字体大小缓存，避免重复计算
  */
  fontSizeCache: number;
  /**
  * 获取当前字体大小
  */
  getFontSize(): number;
  /**
  * 动态内边距，与字体大小等比缩放
  */
  getPadding(): number;
  /**
  * 动态边框粗细，与字体大小等比缩放，基准为 2px
  */
  getBorderWidth(): number;
  /**
  * 动态圆角半径，与字体大小等比缩放
  */
  getBorderRadius(): number;
  /**
  * 更新字体大小缓存
  * fontScaleLevel 存储的是"半个级别"，所以计算时要除以 2
  * 这样步长就是 0.5，避免了浮点数精度问题
  */
  updateFontSizeCache(): void;
  setFontScaleLevel(level: number): void;
  /**
  * 放大字体
  * @param anchorRate 可选。缩放时保持固定的锚点（矩形内比例，如 (0.5,0.5) 为中心）。不传则保持左上角不变。
  */
  increaseFontSize(anchorRate: undefined | Vector | SerializedObject<"Vector">): void;
  /**
  * 缩小字体
  * @param anchorRate 可选。缩放时保持固定的锚点（矩形内比例）。不传则保持左上角不变。
  */
  decreaseFontSize(anchorRate: undefined | Vector | SerializedObject<"Vector">): void;
  /**
  * 在尺寸已变更后，根据旧矩形和锚点比例调整 location，使锚点在世界坐标中保持不变
  */
  _adjustLocationToKeepAnchor(oldRect: Rectangle | SerializedObject<"Rectangle">, anchorRate: Vector | SerializedObject<"Vector">): void;
  /**
  * 调整后的矩形是当前文字加了一圈padding之后的大小
  */
  adjustSizeByText(): void;
  adjustHeightByText(): void;
  /**
  * 强制触发自动调整大小
  */
  forceAdjustSizeByText(): void;
  /**
  * 强制触发手动模式下的高度调整
  */
  forceAdjustHeightByText(): void;
  rename(text: string): void;
  resizeHandle(delta: Vector | SerializedObject<"Vector">): void;
  resizeWidthTo(width: number): void;
  getResizeHandleRect(): Rectangle;
  /**
  * 将某个物体移动一小段距离
  * @param delta
  */
  move(delta: Vector | SerializedObject<"Vector">): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  /**
  * 将某个物体 的最小外接矩形的左上角位置 移动到某个位置
  * @param location
  */
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  /**
  * 是否忽略自动对齐功能
  * 例如涂鸦就不吸附对齐
  */
  isAlignExcluded: boolean;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  detailsManager: DetailsManager;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
/**
* 网页链接节点
* 通过在舞台上ctrl+v触发创建
* 一旦创建，url就不能改了，因为也不涉及修改。
*/
declare interface UrlNode {
  uuid: string;
  title: string;
  url: string;
  color: Color;
  collisionBox: CollisionBox;
  /** 是否正在编辑标题 */
  _isEditingTitle: boolean;
  /** 鼠标是否悬浮在标题上 */
  isMouseHoverTitle: boolean;
  /** 鼠标是否悬浮在url上 */
  isMouseHoverUrl: boolean;
  isEditingTitle: boolean;
  geometryCenter: Vector;
  /**
  * 获取上方标题部分的矩形区域
  */
  titleRectangle: Rectangle;
  urlRectangle: Rectangle;
  /**
  * 只读，获取节点的矩形
  * 若要修改节点的矩形，请使用 moveTo等 方法
  */
  rectangle: Rectangle;
  move(delta: Vector | SerializedObject<"Vector">): void;
  /**
  * 将某个物体 的最小外接矩形的左上角位置 移动到某个位置
  * @param location
  */
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  isHiddenBySectionCollapse: boolean;
  readonly project: Project;
  rename(title: string): void;
  adjustSizeByText(): void;
  unknown: boolean;
  /**
  * 是否忽略自动对齐功能
  * 例如涂鸦就不吸附对齐
  */
  isAlignExcluded: boolean;
  /**
  * [
  *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
  *  { type: 'h1', children: [{ text: 'And this heading.' }] }
  * ]
  */
  details: Value;
  /**
  * 运行时直接父级 Section。
  * 不参与序列化，打开文件后由 `StageManager.updateReferences()` 重建。
  */
  parentSection: Section | null;
  /**
  * 运行时层级深度。
  * 顶层实体和根 Section 都为 0，嵌套越深数值越大。
  */
  sectionDepth: number;
  /**
  * 运行时最近的锁定祖先 Section。
  * 用于后续把锁定判断从全局扫描收敛到沿父链查询。
  */
  nearestLockedAncestorSection: Section | null;
  /** 用于交互使用，比如鼠标悬浮显示details */
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  /**
  * 由于自身位置的移动，递归的更新所有父级Section的位置和大小。
  * 每次父框 adjustLocationAndSize 后，调用碰撞求解器推开与其重叠的同级分支。
  */
  updateFatherSectionByMove(): void;
  /**
  * 由于自身位置的更新，排开所有同级节点的位置
  * 此函数在move函数中被调用，更新
  */
  updateOtherEntityLocationByMove(): void;
  /**
  * 与其他实体碰撞，调整位置；能够递归传递
  * @param other 其他实体
  */
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  /**
  * 是否是"物理存在"的对象（占据画布空间）
  * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
  * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
  */
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  /**
  * 防止孪生同步循环触发的标志
  * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
  * 检测到该标志时跳过向外同步，避免循环同步。
  * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
  */
  _isSyncing: boolean;
}
declare interface Tab {
  readonly id: `${string}-${string}-${string}-${string}-${string}`;
  layout: "docked" | "floating";
  floatingRect: Rectangle;
  zIndex: number;
  closing: boolean;
  canDock: boolean;
  closable: boolean;
  closeOnEscape: boolean;
  closeWhenClickOutside: boolean;
  closeWhenClickInside: boolean;
  titleBarOverlay: boolean;
  eventEmitter: EventEmitter<any>;
  readonly services: Map<string, Service>;
  readonly fileSystemProviders: Map<string, FileSystemProvider>;
  readonly tickableServices: Service[];
  rafHandle: number;
  lastTickTime: number;
  getComponent(): ComponentType<{}>;
  title: string;
  icon: ComponentType<any> | null;
  /**
  * 注册一个文件管理器
  * @param scheme 目前有 "file" | "draft"， 以后可能有其他的协议
  */
  registerFileSystemProvider(scheme: string, provider: new (...args: any[]) => FileSystemProvider): void;
  fs: FileSystemProvider;
  on(event: string | symbol, listener: (...args: any[]) => void): Tab;
  emit(event: string | symbol, ...args: Array<any>): boolean;
  removeAllListeners(event: undefined | string | symbol): Tab;
  /**
  * 立刻加载一个新的服务
  */
  loadService(service: { new (...args: any[]): any; id?: string | undefined; }): void;
  /**
  * 立刻销毁一个服务
  */
  disposeService(serviceId: string): void;
  /**
  * 获取某个服务的实例
  */
  getService(serviceId: T | SerializedObject<"T">): Tab[T];
  init(): Promise<void>;
  loop(): void;
  pause(): void;
  tick(): void;
  dispose(): Promise<void>;
  isRunning: boolean;
  render(): ReactNode;
  /**
  * If using React Context, re-declare this in your class to be the
  * `React.ContextType` of your `static contextType`.
  * Should be used with type annotation or static contextType.
  *
  * @example
  * ```ts
  * static contextType = MyContext
  * // For TS pre-3.7:
  * context!: React.ContextType<typeof MyContext>
  * // For TS 3.7 and above:
  * declare context: React.ContextType<typeof MyContext>
  * ```
  *
  * @see {@link https://react.dev/reference/react/Component#context React Docs}
  */
  context: unknown;
  setState(state: null | Record<string, never> | SerializedObject<"Record"> | ((prevState: Readonly<Record<string, never>>, props: Readonly<Record<string, never>>) => Record<string, never> | Pick<Record<string, never>, K> | null) | Pick<Record<string, never>, K> | SerializedObject<"Pick">, callback: undefined | (() => void)): void;
  forceUpdate(callback: undefined | (() => void)): void;
  readonly props: Readonly<Record<string, never>>;
  state: Readonly<Record<string, never>>;
  /**
  * Called immediately after a component is mounted. Setting state here will trigger re-rendering.
  */
  componentDidMount?: (() => void) | undefined;
  /**
  * Called to determine whether the change in props and state should trigger a re-render.
  *
  * `Component` always returns true.
  * `PureComponent` implements a shallow comparison on props and state and returns true if any
  * props or states have changed.
  *
  * If false is returned, {@link Component.render}, `componentWillUpdate`
  * and `componentDidUpdate` will not be called.
  */
  shouldComponentUpdate?: ((nextProps: Readonly<Record<string, never>>, nextState: Readonly<Record<string, never>>, nextContext: any) => boolean) | undefined;
  /**
  * Called immediately before a component is destroyed. Perform any necessary cleanup in this method, such as
  * cancelled network requests, or cleaning up any DOM elements created in `componentDidMount`.
  */
  componentWillUnmount?: (() => void) | undefined;
  /**
  * Catches exceptions generated in descendant components. Unhandled exceptions will cause
  * the entire component tree to unmount.
  */
  componentDidCatch?: ((error: Error, errorInfo: ErrorInfo) => void) | undefined;
  /**
  * Runs before React applies the result of {@link Component.render render} to the document, and
  * returns an object to be given to {@link componentDidUpdate}. Useful for saving
  * things such as scroll position before {@link Component.render render} causes changes to it.
  *
  * Note: the presence of this method prevents any of the deprecated
  * lifecycle events from running.
  */
  getSnapshotBeforeUpdate?: ((prevProps: Readonly<Record<string, never>>, prevState: Readonly<Record<string, never>>) => any) | undefined;
  /**
  * Called immediately after updating occurs. Not called for the initial render.
  *
  * The snapshot is only present if {@link getSnapshotBeforeUpdate} is present and returns non-null.
  */
  componentDidUpdate?: ((prevProps: Readonly<Record<string, never>>, prevState: Readonly<Record<string, never>>, snapshot?: any) => void) | undefined;
  /**
  * Called immediately before mounting occurs, and before {@link Component.render}.
  * Avoid introducing any side-effects or subscriptions in this method.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use {@link ComponentLifecycle.componentDidMount componentDidMount} or the constructor instead; will stop working in React 17
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#initializing-state}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  componentWillMount?: (() => void) | undefined;
  /**
  * Called immediately before mounting occurs, and before {@link Component.render}.
  * Avoid introducing any side-effects or subscriptions in this method.
  *
  * This method will not stop working in React 17.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use {@link ComponentLifecycle.componentDidMount componentDidMount} or the constructor instead
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#initializing-state}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  UNSAFE_componentWillMount?: (() => void) | undefined;
  /**
  * Called when the component may be receiving new props.
  * React may call this even if props have not changed, so be sure to compare new and existing
  * props if you only want to handle changes.
  *
  * Calling {@link Component.setState} generally does not trigger this method.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use static {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} instead; will stop working in React 17
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#updating-state-based-on-props}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  componentWillReceiveProps?: ((nextProps: Readonly<Record<string, never>>, nextContext: any) => void) | undefined;
  /**
  * Called when the component may be receiving new props.
  * React may call this even if props have not changed, so be sure to compare new and existing
  * props if you only want to handle changes.
  *
  * Calling {@link Component.setState} generally does not trigger this method.
  *
  * This method will not stop working in React 17.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use static {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} instead
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#updating-state-based-on-props}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  UNSAFE_componentWillReceiveProps?: ((nextProps: Readonly<Record<string, never>>, nextContext: any) => void) | undefined;
  /**
  * Called immediately before rendering when new props or state is received. Not called for the initial render.
  *
  * Note: You cannot call {@link Component.setState} here.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use getSnapshotBeforeUpdate instead; will stop working in React 17
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#reading-dom-properties-before-an-update}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  componentWillUpdate?: ((nextProps: Readonly<Record<string, never>>, nextState: Readonly<Record<string, never>>, nextContext: any) => void) | undefined;
  /**
  * Called immediately before rendering when new props or state is received. Not called for the initial render.
  *
  * Note: You cannot call {@link Component.setState} here.
  *
  * This method will not stop working in React 17.
  *
  * Note: the presence of {@link NewLifecycle.getSnapshotBeforeUpdate getSnapshotBeforeUpdate}
  * or {@link StaticLifecycle.getDerivedStateFromProps getDerivedStateFromProps} prevents
  * this from being invoked.
  *
  * @deprecated 16.3, use getSnapshotBeforeUpdate instead
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#reading-dom-properties-before-an-update}
  * @see {@link https://legacy.reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path}
  */
  UNSAFE_componentWillUpdate?: ((nextProps: Readonly<Record<string, never>>, nextState: Readonly<Record<string, never>>, nextContext: any) => void) | undefined;
}
/**
* 所有鼠标光标的名称枚举
*/
declare enum CursorNameEnum {
  None = "none",
  Default = "default",
  Pointer = "pointer",
  Crosshair = "crosshair",
  Move = "move",
  Grab = "grab",
  Grabbing = "grabbing",
  Text = "text",
  NotAllowed = "not-allowed",
  EResize = "e-resize",
  NResize = "n-resize",
  NeResize = "ne-resize",
  NwResize = "nw-resize",
  SResize = "s-resize",
  SeResize = "se-resize",
  SwResize = "sw-resize",
  WResize = "w-resize",
  NsResize = "ns-resize",
  NeswResize = "nesw-resize",
  NwseResize = "nwse-resize",
  ColResize = "col-resize",
  RowResize = "row-resize",
  AllScroll = "all-scroll",
  ZoomIn = "zoom-in",
  ZoomOut = "zoom-out",
  GrabHand = "grab-hand",
  NotAllowedHand = "not-allowed-hand",
  Pen = "pen",
  Eraser = "eraser",
  Handwriting = "handwriting",
  ZoomInHand = "zoom-in-hand",
  ZoomOutHand = "zoom-out-hand",
}
/**
* 经常会有方向键控制的场景，比如上下左右移动，这时可以用这个枚举来表示方向。
*/
declare enum Direction {
  Up,
  Down,
  Left,
  Right,
}
/**
* 扩展（插件）的元数据
*/
declare interface ExtensionMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
}
/**
* .prg 文件的元数据
* 存储在 .prg 文件的 metadata.msgpack 中
* 用于版本管理、数据升级、文件信息记录等
*/
declare interface PrgMetadata {
  /**
  * 数据文件版本号（语义化版本格式，如 "2.0.0", "2.1.0"）
  * 用于判断是否需要数据升级
  * @required
  */
  version: string;
  /**
  * 扩展（插件）元数据，如果是插件类型的prg则包含此字段
  */
  extension?: ExtensionMetadata | undefined;
}
declare type Association = StageObject & {
    text: string;
    color: Color;
};
declare type Color = [
    number,
    number,
    number,
    number
];
declare type CubicCatmullRomSplineEdge = Edge & {
    type: "core:cublic_catmull_rom_spline_edge";
    text: string;
    controlPoints: Vector[];
    alpha: number;
    tension: number;
};
declare type Edge = Association & {
    source: string;
    target: string;
    sourceRectRate: [
        number,
        number
    ]; // 默认中心 0.5, 0.5
    targetRectRate: [
        number,
        number
    ]; // 默认中心 0.5, 0.5
};
declare type StageObject = {
    uuid: string;
    type: string;
};
declare type Vector = [
    number,
    number
];
declare interface MarkdownNode {
  title: string;
  content: string;
  children: MarkdownNode[];
}
/**
* 颜色对象
* 不透明度最大值为1，最小值为0
*/
declare interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
  toString(): string;
  toHexString(): string;
  toHexStringWithoutAlpha(): string;
  clone(): Color;
  /**
  * 将此颜色转换为透明色，
  * 和(0, 0, 0, 0)不一样
  * 因为(0, 0, 0, 0)是黑色的透明色，在颜色线性混合的时候会偏黑
  * @returns
  */
  toTransparent(): Color;
  /**
  * 和toTransparent完全相反
  * @returns
  */
  toSolid(): Color;
  toNewAlpha(a: number): Color;
  /**
  * 判断自己是否和另一个颜色相等
  */
  equals(color: Color | SerializedObject<"Color">): boolean;
  toArray(): [number, number, number, number];
  /**
  * 降低颜色的饱和度
  * @param amount 0 到 1 之间的值，表示去饱和的程度
  */
  desaturate(amount: number): Color;
  /**
  * 将颜色转换为冷色调且低饱和度的版本
  * 注意：此方法是基于简单假设实现的，并不能精确地转换颜色空间。
  */
  toColdLowSaturation(): Color;
  rgbToHsl(): { h: number; s: number; l: number; };
  hslToRgb: any;
  hueToRgb: any;
  /**
  * 改变色相
  * @param deHue 色相差值(角度)，正数表示顺时针，负数表示逆时针
  */
  changeHue(deHue: number): Color;
}
declare interface LimitLengthQueue<T> {
  limitLength: any;
  enqueue(element: T | SerializedObject<"T">): void;
  /**
  * 获取多个队尾元素，如果长度不足则返回数组长度不足
  * @param multi
  */
  multiGetTail(multi: number): T[];
  items: T[];
  dequeue(): T | undefined;
  arrayList: T[];
  peek(): T | undefined;
  tail(): T | undefined;
  clear(): void;
  isEmpty(): boolean;
  length: number;
  size(): number;
  toString(): string;
}
/**
* 最近最少使用缓存
* 原理：当缓存满时，删除最早添加的缓存
*/
declare interface LruCache<K, V> {
  readonly capacity: any;
  set(key: K | SerializedObject<"K">, value: V | SerializedObject<"V">): LruCache<K, V>;
  get(key: K | SerializedObject<"K">): V | undefined;
  clear(): void;
  /**
  * @returns true if an element in the Map existed and has been removed, or false if the element does not exist.
  */
  delete(key: K | SerializedObject<"K">): boolean;
  /**
  * Executes a provided function once per each key/value pair in the Map, in insertion order.
  */
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg: any): void;
  /**
  * @returns boolean indicating whether an element with the specified key exists or not.
  */
  has(key: K | SerializedObject<"K">): boolean;
  /**
  * @returns the number of elements in the Map.
  */
  readonly size: number;
  /**
  * Returns an iterable of key, value pairs for every entry in the map.
  */
  entries(): MapIterator<[K, V]>;
  /**
  * Returns an iterable of keys in the map
  */
  keys(): MapIterator<K>;
  /**
  * Returns an iterable of values in the map
  */
  values(): MapIterator<V>;
  /** Returns an iterable of entries in the map. */
  "__@iterator@308"(): MapIterator<[K, V]>;
  readonly "__@toStringTag@900": string;
}
/**
* 进度条数字类
* 可用于 血量、等等的进度条使用场景
*/
declare interface ProgressNumber {
  curValue: number;
  maxValue: number;
  /**
  * 返回百分比，0-100
  */
  percentage: number;
  /**
  * 返回比率，0-1
  */
  rate: number;
  isFull: boolean;
  isEmpty: boolean;
  setEmpty(): void;
  setFull(): void;
  add(value: number): void;
  clone(): ProgressNumber;
  subtract(value: number): void;
}
declare interface Queue<T> {
  items: T[];
  enqueue(element: T | SerializedObject<"T">): void;
  dequeue(): T | undefined;
  arrayList: T[];
  peek(): T | undefined;
  tail(): T | undefined;
  clear(): void;
  isEmpty(): boolean;
  length: number;
  size(): number;
  toString(): string;
}
declare interface Vector {
  x: number;
  y: number;
  isZero(): boolean;
  add(vector: Vector | SerializedObject<"Vector">): Vector;
  subtract(vector: Vector | SerializedObject<"Vector">): Vector;
  multiply(scalar: number): Vector;
  divide(scalar: number): Vector;
  /**
  * 获得向量的模长
  * @returns
  */
  magnitude(): number;
  /**
  * 获得向量的单位向量
  * 如果向量的模长为0，则返回(0,0)
  * @returns
  */
  normalize(): Vector;
  dot(vector: Vector | SerializedObject<"Vector">): number;
  /**
  * 获得一个与该向量垂直的单位向量
  */
  getPerpendicular(): Vector;
  /**
  * 将自身向量按顺时针旋转一定角度，获得一个新的向量
  * @param angle 单位：弧度
  */
  rotate(angle: number): Vector;
  /**
  * 将自身向量按逆时针旋转一定角度，获得一个新的向量
  * @param degrees 单位：度
  */
  rotateDegrees(degrees: number): Vector;
  /**
  * 计算自己向量与另一个向量之间的角度
  * @param vector
  * @returns 单位：弧度
  */
  angle(vector: Vector | SerializedObject<"Vector">): number;
  /**
  * 计算自己向量与另一个向量之间的夹角
  * @param vector
  * @returns 单位：度
  */
  angleTo(vector: Vector | SerializedObject<"Vector">): number;
  /**
  * 计算自己向量与另一个向量之间的夹角，但带正负号
  * 如果另一个向量相对自己是顺时针，则返回正值，否则返回负值
  * @param vector
  * @returns 单位：度
  */
  angleToSigned(vector: Vector | SerializedObject<"Vector">): number;
  /**
  * 从自己这个向量所指向的点到另一个向量所指向的点的距离
  * @param vector
  * @returns
  */
  distance(vector: Vector | SerializedObject<"Vector">): number;
  cross(other: Vector | SerializedObject<"Vector">): number;
  /**
  * 向量之间的分量分别相乘
  * @param other
  */
  componentMultiply(other: Vector | SerializedObject<"Vector">): Vector;
  /**
  * 将自己方向的单位向量分解成一堆向量，就像散弹分裂子弹一样
  * 返回的都是单位向量
  *
  * 根据散弹数量和间隔角度，计算出每个散弹的方向单位向量
  * 做法是先依次生成 bulletCount 个向量，每个间隔角度为 bulletIntervalDegrees，顺时针旋转
  * 第一个生成的向量恰好就是攻击方向。
  * 最后再整体 逆时针旋转总角度的一半，得到每个向量最终的方向向量
  */
  splitVector(splitCount: number, splitDegrees: number): Vector[];
  /**
  * 将自己这个向量转换成角度数字
  * 例如当自己 x=1 y=1 时，返回 45
  */
  toDegrees(): number;
  clone(): Vector;
  equals(vector: Vector | SerializedObject<"Vector">): boolean;
  nearlyEqual(vector: Vector | SerializedObject<"Vector">, radius: number): boolean;
  toString(): string;
  limitX(min: number, max: number): Vector;
  limitY(min: number, max: number): Vector;
  toInteger(): Vector;
  toArray(): [number, number];
  __add__(other: Vector | SerializedObject<"Vector">): Vector;
}
/**
* 圆形，
* 注意：坐标点location属性是圆心属性
*/
declare interface Circle {
  location: Vector;
  radius: number;
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithLine(line: Line | SerializedObject<"Line">): boolean;
  getRectangle(): Rectangle;
  toString(): string;
}
/**
* 贝塞尔曲线
*/
declare interface CubicBezierCurve {
  start: Vector;
  ctrlPt1: Vector;
  ctrlPt2: Vector;
  end: Vector;
  toString(): string;
  /**
  * 根据参数t（范围[0, 1]）获取贝塞尔曲线上的点
  * @param t
  * @returns
  */
  getPointByT(t: number): Vector;
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithLine(l: Line | SerializedObject<"Line">): boolean;
  getRectangle(): Rectangle;
}
/**
* CR曲线形状
*/
declare interface CubicCatmullRomSpline {
  controlPoints: Vector[];
  alpha: number;
  tension: number;
  computePath(): Vector[];
  computeLines: any;
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithLine(line: Line | SerializedObject<"Line">): boolean;
  getRectangle(): Rectangle;
  /**
  * 计算控制点所构成的曲线的参数方程和导数
  */
  computeFunction(): { equation: (t: number) => Vector; derivative: (t: number) => Vector; }[];
}
declare interface IntersectionResult {
  intersects: boolean;
  point?: Vector | undefined;
}
/**
* 线段类
*/
declare interface Line {
  start: Vector;
  end: Vector;
  toString(): string;
  length(): number;
  midPoint(): Vector;
  direction(): Vector;
  /**
  * 判断点是否在线段附近
  * @param point
  * @param tolerance 附近容错度
  */
  isPointNearLine(point: Vector | SerializedObject<"Vector">, tolerance: undefined | number): boolean;
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithLine(line: Line | SerializedObject<"Line">): boolean;
  isParallel(other: Line | SerializedObject<"Line">): boolean;
  isCollinear(other: Line | SerializedObject<"Line">): boolean;
  /**
  * 判断该线段是否和一个水平的线段相交
  * @param y 水平线段的y坐标
  * @param xLeft 水平线段的左端点
  * @param xRight 水平线段的右端点
  */
  isIntersectingWithHorizontalLine(y: number, xLeft: number, xRight: number): boolean;
  getRectangle(): Rectangle;
  /**
  * 判断该线段是否和一个垂直的线段相交
  * @param x 垂直线段的x坐标
  * @param yBottom 垂直线段的下端点
  * @param yTop 垂直线段的上端点
  */
  isIntersectingWithVerticalLine(x: number, yBottom: number, yTop: number): boolean;
  /**
  * 一个线段是否和一个水平线段相交
  *  this line
  *    xx
  *      x
  *  ├────xxx─────────┤
  *         xxx
  *            xxx
  *  xLeft       xxx  xRight
  *
  * @param y
  * @param xLeft
  * @param xRight
  * @returns
  */
  getIntersectingWithHorizontalLine(y: number, xLeft: number, xRight: number): IntersectionResult;
  /**
  * 当前线段和垂直线段相交算法
  * start
  * x   │yTop
  *  x  │
  *   x │
  *    x│
  *     x   end
  *     │x
  *     │
  *     │yBottom
  * @param x
  * @param yBottom
  * @param yTop
  * @returns
  */
  getIntersectingWithVerticalLine(x: number, yBottom: number, yTop: number): IntersectionResult;
  isIntersectingWithCircle(circle: Circle | SerializedObject<"Circle">): boolean;
  /**
  * 判断两条线段是否相交
  */
  isIntersecting(other: Line | SerializedObject<"Line">): boolean;
  cross(other: Line | SerializedObject<"Line">): number;
  getIntersection(other: Line | SerializedObject<"Line">): Vector | null;
}
declare interface Rectangle {
  location: Vector;
  size: Vector;
  left: number;
  right: number;
  top: number;
  bottom: number;
  center: Vector;
  getInnerLocationByRateVector(rateVector: Vector | SerializedObject<"Vector">): Vector;
  leftCenter: Vector;
  rightCenter: Vector;
  topCenter: Vector;
  bottomCenter: Vector;
  leftTop: Vector;
  rightTop: Vector;
  leftBottom: Vector;
  rightBottom: Vector;
  width: number;
  height: number;
  getRectangle(): Rectangle;
  /**
  * 以中心点为中心，扩展矩形
  * @param amount
  * @returns
  */
  expandFromCenter(amount: number): Rectangle;
  clone(): Rectangle;
  /**
  * 按照 上右下左 的顺序返回四条边
  * @returns
  */
  getBoundingLines(): Line[];
  getFroePoints(): Vector[];
  /**
  * 和另一个矩形有部分相交（碰到一点点就算）
  */
  isCollideWith(other: Rectangle | SerializedObject<"Rectangle">): boolean;
  /**
  * 判断一个矩形是否完全在某个矩形内部
  * @param otherBig
  */
  isAbsoluteIn(otherBig: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  /**
  * 自己这个矩形是否和线段有交点
  * 用于节点切割检测
  *
  * @param line
  */
  isCollideWithLine(line: Line | SerializedObject<"Line">): boolean;
  /**
  * 获取线段和矩形的交点
  * @param line
  */
  getCollidePointsWithLine(line: Line | SerializedObject<"Line">): Vector[];
  /**
  * 是否完全在另一个矩形内
  * AI写的，有待测试
  * @param other
  * @returns
  */
  isInOther(other: Rectangle | SerializedObject<"Rectangle">): boolean;
  /**
  * 获取两个矩形的重叠区域的矩形的宽度和高度
  * 如果没有重叠区域，则宽度和高度都是0
  * 返回的x,y 都大于零
  */
  getOverlapSize(other: Rectangle | SerializedObject<"Rectangle">): Vector;
  /**
  * 判断点是否在矩形内/边上也算
  * 为什么边上也算，因为节点的位置在左上角上，可以用于判断节点是否存在于某位置
  */
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  /**
  *
  * @param scale
  * @returns
  */
  multiply(scale: number): Rectangle;
  toString(): string;
  getCenter(): Vector;
  /**
  * 返回一个线段和这个矩形的交点，如果没有交点，就返回这个矩形的中心点
  * 请确保线段和矩形只有一个交点，出现两个交点的情况还未测试
  */
  getLineIntersectionPoint(line: Line | SerializedObject<"Line">): Vector;
  /**
  * 获取在this矩形边上的point的单位法向量,若point不在this矩形边上，则该函数可能返回任意向量。
  * @param point
  */
  getNormalVectorAt(point: Vector | SerializedObject<"Vector">): Vector;
  translate(offset: Vector | SerializedObject<"Vector">): Rectangle;
  limit(limit: Rectangle | SerializedObject<"Rectangle">): Rectangle;
}
/**
* 可交互的 图形抽象类
*/
declare interface Shape {
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithLine(line: Line | SerializedObject<"Line">): boolean;
  /**
  * 获取图形的最小外接矩形，用于对齐操作
  */
  getRectangle(): Rectangle;
}
/**
* 对称曲线
*/
declare interface SymmetryCurve {
  start: Vector;
  startDirection: Vector;
  end: Vector;
  endDirection: Vector;
  bending: number;
  bezier: CubicBezierCurve;
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithLine(line: Line | SerializedObject<"Line">): boolean;
  toString(): string;
  getRectangle(): Rectangle;
}

interface SerializedObject<Name extends string> {
  $rpc?: { deserializeWithProject?: boolean };
  _: Name | (string & {});
  [key: string | number | symbol]: any;
}

interface LucideIcon {
  $lucide: string;
}

type AutoProxyArrayItem<T> = T extends object ? Promise<AutoProxy<T>> : T;
type AutoProxyValue<T> = T extends readonly (infer Item)[] ? AutoProxyArrayItem<Item>[] : T extends object ? AutoProxy<T> : T;
type AutoProxyMethod<T> = T extends (...args: infer Args) => infer Result ? (...args: Args) => Promise<AutoProxyValue<Awaited<Result>>> : never;
type AutoProxy<T> = T extends object ? { [Key in keyof T]: T[Key] extends (...args: any[]) => any ? AutoProxyMethod<T[Key]> : Promise<AutoProxyValue<T[Key]>>; } & ProxyMethods : T;

export type ExtensionHostApi = {
  toast(message: string): Promise<void>;
  toast_success(message: string): Promise<void>;
  toast_error(message: string): Promise<void>;
  toast_warning(message: string): Promise<void>;
  dialog_confirm(title: undefined | string, description: undefined | string, options: undefined | { destructive?: boolean | undefined; } | SerializedObject<"__object">): Promise<boolean>;
  dialog_input(title: undefined | string, description: undefined | string, options: undefined | { defaultValue?: string | undefined; placeholder?: string | undefined; destructive?: boolean | undefined; multiline?: boolean | undefined; } | SerializedObject<"__object">): Promise<string | undefined>;
  dialog_copy(title: undefined | string, description: undefined | string, value: undefined | string): Promise<void>;
  dialog_buttons(title: string, description: string, buttons: Buttons | SerializedObject<"Buttons">): Promise<Buttons[number]["id"]>;
  fetch(input: string | URL | SerializedObject<"URL"> | Request | SerializedObject<"Request">, init: undefined | RequestInit & ClientOptions): Promise<Response>;
  fetch_base64(url: string): Promise<string>;
  fetch_json(url: string): Promise<unknown>;
  fetch_binary(url: string): Promise<{ buffer: Uint8Array<ArrayBufferLike>; mimeType: string; }>;
  shell_execute(program: string, args: undefined | Array<string>, stdin: undefined | string): Promise<{ code: number | null; stdout: string; stderr: string; }>;
  settings_getOwn(key: string): Promise<any>;
  settings_setOwn(key: string, value: unknown): Promise<void>;
  settings_getGlobal(key: string): Promise<any>;
  settings_setGlobal(key: string, value: unknown): Promise<any>;
  keybinds_register(id: string, icon: (LucideIcon) | { $lucide: string; }, defaultKey: string, onPress: () => void, onRelease: undefined | (() => void), isContinuous: undefined | false | true): Promise<void>;
  keybinds_unregisterAll(): Promise<void>;
  themes_register(id: string, name: string, description: undefined | string, type: "light" | "dark", themeContent: any): Promise<void>;
  tabs_getAll(): Array<Promise<AutoProxy<Tab>>>;
  tabs_getAllProjects(): Array<Promise<AutoProxy<Project>>>;
  tabs_getCurrent(): Promise<null | AutoProxy<Tab>>;
  tabs_getCurrentProject(): Promise<null | AutoProxy<Project>>;
  entity_registerType(typeName: string, initialData: any, collisionBox: CollisionBox | SerializedObject<"CollisionBox">, renderFn: (data: any) => Promise<ImageBitmap>): Promise<void>;
  entity_onClick(typeName: string, handler: (payload: ClickEventPayload) => void): Promise<void>;
  entity_create(typeName: string, data: any, location: { x: number; y: number; }): Promise<AutoProxy<ExtensionEntity>>;
  form(schema: JSONSchema | SerializedObject<"JSONSchema">, options: { title: string; confirmText?: string | undefined; cancelText?: string | undefined; }): Promise<Record<string, unknown>>;
};

declare global {
  const prg: ExtensionHostApi;
  interface Window { prg: ExtensionHostApi; }
  interface DedicatedWorkerGlobalScope { prg: ExtensionHostApi; }
}
