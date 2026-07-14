/* eslint-disable */
/** Auto-generated from extensionHostApiFactory. Do not edit manually. */
import type { __, Omit, Partial } from "lodash";
import type {
  ButtonHTMLAttributes,
  ClassAttributes,
  ComponentType,
  ErrorInfo,
  ForwardRefExoticComponent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
  RefAttributes,
  RefObject,
  TouchEvent,
  WheelEvent,
} from "react";
import type { Camera, LucideProps, X, ZoomIn, ZoomOut } from "lucide-react";
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
import type EventEmitter from "events";
import type z from "zod";

declare const Button: ({
  className,
  variant,
  size,
  asChild,
  ...props
}: ClassAttributes<HTMLButtonElement> &
  ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<
    (
      props?:
        | (ConfigVariants<{
            variant: {
              default: string;
              destructive: string;
              outline: string;
              secondary: string;
              ghost: string;
              link: string;
            };
            size: { default: string; sm: string; lg: string; icon: string };
          }> &
            ClassProp)
        | undefined,
    ) => string
  > & { asChild?: boolean | undefined }) => Element;
declare const buttonVariants: (
  props?:
    | (ConfigVariants<{
        variant: {
          default: string;
          destructive: string;
          outline: string;
          secondary: string;
          ghost: string;
          link: string;
        };
        size: { default: string; sm: string; lg: string; icon: string };
      }> &
        ClassProp)
    | undefined,
) => string;
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
  write(
    uri: URI | SerializedObject<"URI">,
    content: Uint8Array<ArrayBufferLike> | SerializedObject<"Uint8Array">,
  ): Promise<void>;
  remove(uri: URI | SerializedObject<"URI">): Promise<void>;
  exists(uri: URI | SerializedObject<"URI">): Promise<boolean>;
  mkdir(uri: URI | SerializedObject<"URI">): Promise<void>;
  rename(oldUri: URI | SerializedObject<"URI">, newUri: URI | SerializedObject<"URI">): Promise<void>;
}
declare interface Service {
  tick?: (() => void) | undefined;
  dispose?: (() => void | Promise<void>) | undefined;
}
declare interface Project {
  _uri: URI;
  _projectState: ProjectState;
  _isSaving: boolean;
  stage: StageObject[];
  tags: string[];
  attachments: Map<string, Blob>;
  encoder: Encoder<undefined>;
  decoder: Decoder<undefined>;
  compareVersion(version1: string, version2: string): number;
  checkAndConfirmUpgrade(currentVersion: string, latestVersion: string): Promise<boolean>;
  parseProjectFile(): Promise<{
    serializedStageObjects: any[];
    tags: string[];
    references: { sections: Record<string, string[]>; files: string[] };
    metadata: PrgMetadata;
    readme?: string | undefined;
  }>;
  init(): Promise<void>;
  isDraft: boolean;
  title: string;
  icon(props: Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>): ReactNode;
  uri: URI;
  stash(): Promise<void>;
  save(options: { includeThumbnail?: boolean | undefined }): Promise<void>;
  references: { sections: Record<string, string[]>; files: string[] };
  metadata: PrgMetadata;
  readme?: string | undefined;
  getFileContent(options: { includeThumbnail?: boolean | undefined }): Promise<Uint8Array<ArrayBuffer>>;
  stageHash: string;
  addAttachment(data: Blob | SerializedObject<"Blob">): string;
  projectState: ProjectState;
  isSaving: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  loadService(service: { new (...args: any[]): any; id?: string | undefined }): void;
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
  eventEmitter: EventEmitter<any>;
  readonly services: Map<string, Service>;
  readonly fileSystemProviders: Map<string, FileSystemProvider>;
  readonly tickableServices: Service[];
  rafHandle: number;
  lastTickTime: number;
  registerFileSystemProvider(scheme: string, provider: new (...args: any[]) => FileSystemProvider): void;
  fs: FileSystemProvider;
  on(event: string | number, listener: (...args: any[]) => void): Project;
  emit(event: string | number, ...args: Array<any>): boolean;
  removeAllListeners(event: undefined | string | number): Project;
  disposeService(serviceId: string): void;
  getService(serviceId: T | SerializedObject<"T">): Project[T];
  loop(): void;
  pause(): void;
  tick(): void;
  dispose(): Promise<void>;
  isRunning: boolean;
  context: unknown;
  setState(
    state:
      | null
      | Record<string, never>
      | SerializedObject<"Record">
      | ((
          prevState: Readonly<Record<string, never>>,
          props: Readonly<Record<string, never>>,
        ) => Record<string, never> | Pick<Record<string, never>, K> | null)
      | Pick<Record<string, never>, K>
      | SerializedObject<"Pick">,
    callback: undefined | (() => void),
  ): void;
  forceUpdate(callback: undefined | (() => void)): void;
  readonly props: Readonly<Record<string, never>>;
  state: Readonly<Record<string, never>>;
  shouldComponentUpdate?:
    | ((
        nextProps: Readonly<Record<string, never>>,
        nextState: Readonly<Record<string, never>>,
        nextContext: any,
      ) => boolean)
    | undefined;
  componentWillUnmount?: (() => void) | undefined;
  componentDidCatch?: ((error: Error, errorInfo: ErrorInfo) => void) | undefined;
  getSnapshotBeforeUpdate?:
    | ((prevProps: Readonly<Record<string, never>>, prevState: Readonly<Record<string, never>>) => any)
    | undefined;
  componentDidUpdate?:
    | ((prevProps: Readonly<Record<string, never>>, prevState: Readonly<Record<string, never>>, snapshot?: any) => void)
    | undefined;
  componentWillMount?: (() => void) | undefined;
  UNSAFE_componentWillMount?: (() => void) | undefined;
  componentWillReceiveProps?: ((nextProps: Readonly<Record<string, never>>, nextContext: any) => void) | undefined;
  UNSAFE_componentWillReceiveProps?:
    | ((nextProps: Readonly<Record<string, never>>, nextContext: any) => void)
    | undefined;
  componentWillUpdate?:
    | ((
        nextProps: Readonly<Record<string, never>>,
        nextState: Readonly<Record<string, never>>,
        nextContext: any,
      ) => void)
    | undefined;
  UNSAFE_componentWillUpdate?:
    | ((
        nextProps: Readonly<Record<string, never>>,
        nextState: Readonly<Record<string, never>>,
        nextContext: any,
      ) => void)
    | undefined;
}
declare enum ProjectState {
  Saved,
  Stashed,
  Unsaved,
}
declare interface CurveRenderer {
  readonly project: Project;
  renderSolidLine(
    start: Vector | SerializedObject<"Vector">,
    end: Vector | SerializedObject<"Vector">,
    color: Color | SerializedObject<"Color">,
    width: number,
  ): void;
  renderSolidLineMultiple(
    locations: Array<Vector | SerializedObject<"Vector">>,
    color: Color | SerializedObject<"Color">,
    width: number,
  ): void;
  renderPenStroke(
    stroke: Array<PenStrokeSegment | SerializedObject<"PenStrokeSegment">>,
    color: Color | SerializedObject<"Color">,
  ): void;
  renderSolidLineMultipleSmoothly(
    locations: Array<Vector | SerializedObject<"Vector">>,
    color: Color | SerializedObject<"Color">,
    width: number,
  ): void;
  smoothPoints(
    points: Array<Vector | SerializedObject<"Vector">>,
    tension: number,
  ): { type: string; cp1: { x: number; y: number }; cp2: { x: number; y: number }; end: Vector }[];
  renderSolidLineMultipleWithWidth(
    locations: Array<Vector | SerializedObject<"Vector">>,
    color: Color | SerializedObject<"Color">,
    widthList: Array<number>,
  ): void;
  renderSolidLineMultipleWithShadow(
    locations: Array<Vector | SerializedObject<"Vector">>,
    color: Color | SerializedObject<"Color">,
    width: number,
    shadowColor: Color | SerializedObject<"Color">,
    shadowBlur: number,
  ): void;
  renderDashedLine(
    start: Vector | SerializedObject<"Vector">,
    end: Vector | SerializedObject<"Vector">,
    color: Color | SerializedObject<"Color">,
    width: number,
    dashLength: number,
  ): void;
  renderDoubleLine(
    start: Vector | SerializedObject<"Vector">,
    end: Vector | SerializedObject<"Vector">,
    color: Color | SerializedObject<"Color">,
    width: number,
    gap: number,
  ): void;
  renderBezierCurve(
    curve: CubicBezierCurve | SerializedObject<"CubicBezierCurve">,
    color: Color | SerializedObject<"Color">,
    width: number,
  ): void;
  renderDashedBezierCurve(
    curve: CubicBezierCurve | SerializedObject<"CubicBezierCurve">,
    color: Color | SerializedObject<"Color">,
    width: number,
    dashLength: number,
  ): void;
  renderDoubleBezierCurve(
    curve: CubicBezierCurve | SerializedObject<"CubicBezierCurve">,
    color: Color | SerializedObject<"Color">,
    width: number,
    gap: number,
  ): void;
  renderSymmetryCurve(
    curve: SymmetryCurve | SerializedObject<"SymmetryCurve">,
    color: Color | SerializedObject<"Color">,
    width: number,
  ): void;
  renderGradientLine(
    start: Vector | SerializedObject<"Vector">,
    end: Vector | SerializedObject<"Vector">,
    startColor: Color | SerializedObject<"Color">,
    endColor: Color | SerializedObject<"Color">,
    width: number,
  ): void;
  renderGradientBezierCurve(
    curve: CubicBezierCurve | SerializedObject<"CubicBezierCurve">,
    startColor: Color | SerializedObject<"Color">,
    endColor: Color | SerializedObject<"Color">,
    width: number,
  ): void;
}
declare interface ImageRenderer {
  readonly project: Project;
  renderImageElement(
    source:
      | ImageBitmap
      | SerializedObject<"ImageBitmap">
      | HTMLImageElement
      | SerializedObject<"HTMLImageElement">
      | HTMLVideoElement
      | SerializedObject<"HTMLVideoElement">
      | HTMLCanvasElement
      | SerializedObject<"HTMLCanvasElement">
      | OffscreenCanvas
      | SerializedObject<"OffscreenCanvas">,
    location: Vector | SerializedObject<"Vector">,
    scale: number,
  ): void;
  renderImageBitmap(
    bitmap: undefined | ImageBitmap | SerializedObject<"ImageBitmap">,
    location: Vector | SerializedObject<"Vector">,
    scale: number,
  ): void;
}
declare interface ShapeRenderer {
  readonly project: Project;
  renderCircle(
    centerLocation: Vector | SerializedObject<"Vector">,
    radius: number,
    color: Color | SerializedObject<"Color">,
    strokeColor: Color | SerializedObject<"Color">,
    strokeWidth: number,
  ): void;
  renderArc(
    centerLocation: Vector | SerializedObject<"Vector">,
    radius: number,
    angle1: number,
    angle2: number,
    strokeColor: Color | SerializedObject<"Color">,
    strokeWidth: number,
  ): void;
  renderRectFromCenter(
    centerLocation: Vector | SerializedObject<"Vector">,
    width: number,
    height: number,
    color: Color | SerializedObject<"Color">,
    strokeColor: Color | SerializedObject<"Color">,
    strokeWidth: number,
    radius: number,
  ): void;
  renderRect(
    rect: Rectangle | SerializedObject<"Rectangle">,
    color: Color | SerializedObject<"Color">,
    strokeColor: Color | SerializedObject<"Color">,
    strokeWidth: number,
    radius: number,
  ): void;
  renderDashedRect(
    rect: Rectangle | SerializedObject<"Rectangle">,
    color: Color | SerializedObject<"Color">,
    strokeColor: Color | SerializedObject<"Color">,
    strokeWidth: number,
    radius: number,
    dashLength: number,
  ): void;
  renderRectWithShadow(
    rect: Rectangle | SerializedObject<"Rectangle">,
    fillColor: Color | SerializedObject<"Color">,
    strokeColor: Color | SerializedObject<"Color">,
    strokeWidth: number,
    shadowColor: Color | SerializedObject<"Color">,
    shadowBlur: number,
    shadowOffsetX: number,
    shadowOffsetY: number,
    radius: number,
  ): void;
  renderPolygonAndFill(
    points: Array<Vector | SerializedObject<"Vector">>,
    fillColor: Color | SerializedObject<"Color">,
    strokeColor: Color | SerializedObject<"Color">,
    strokeWidth: number,
    lineJoin: "round" | "bevel",
  ): void;
  renderTriangleFromCenter(
    centerLocation: Vector | SerializedObject<"Vector">,
    size: number,
    rotation: number,
    fillColor: Color | SerializedObject<"Color">,
    strokeColor: Color | SerializedObject<"Color">,
    strokeWidth: number,
  ): void;
  renderSquareFromCenter(
    centerLocation: Vector | SerializedObject<"Vector">,
    size: number,
    rotation: number,
    fillColor: Color | SerializedObject<"Color">,
    strokeColor: Color | SerializedObject<"Color">,
    strokeWidth: number,
  ): void;
  renderCircleTransition(
    viewLocation: Vector | SerializedObject<"Vector">,
    radius: number,
    centerColor: Color | SerializedObject<"Color">,
  ): void;
  renderCameraShapeBorder(
    rect: Rectangle | SerializedObject<"Rectangle">,
    borderColor: Color | SerializedObject<"Color">,
    borderWidth: number,
  ): void;
  renderResizeArrow(
    rect: Rectangle | SerializedObject<"Rectangle">,
    color: Color | SerializedObject<"Color">,
    strokeWidth: number,
  ): void;
}
declare interface SvgRenderer {
  svgCache: { [key: string]: HTMLImageElement };
  readonly project: Project;
  renderSvgFromLeftTop(svg: string, location: Vector | SerializedObject<"Vector">, width: number, height: number): void;
  renderSvgFromCenter(
    svg: string,
    centerLocation: Vector | SerializedObject<"Vector">,
    width: number,
    height: number,
  ): void;
  renderSvgFromLeftTopWithoutSize(
    svg: string,
    location: Vector | SerializedObject<"Vector">,
    scaleNumber: number,
  ): void;
  renderSvgFromCenterWithoutSize(svg: string, centerLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface TextRenderer {
  cache: LruCache<string, ImageBitmap>;
  readonly project: Project;
  hash(text: string, size: number, fontFamily: undefined | string, fontWeight: undefined | string): string;
  getCache(
    text: string,
    size: number,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): ImageBitmap | undefined;
  getCacheNearestSize(
    text: string,
    size: number,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): ImageBitmap | undefined;
  buildCache(
    text: string,
    size: number,
    color: Color | SerializedObject<"Color">,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): CanvasImageSource;
  renderText(
    text: string,
    location: Vector | SerializedObject<"Vector">,
    size: number,
    color: Color | SerializedObject<"Color">,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): void;
  renderTempText(
    text: string,
    location: Vector | SerializedObject<"Vector">,
    size: number,
    color: Color | SerializedObject<"Color">,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): void;
  renderTextFromCenter(
    text: string,
    centerLocation: Vector | SerializedObject<"Vector">,
    size: number,
    color: Color | SerializedObject<"Color">,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): void;
  renderTempTextFromCenter(
    text: string,
    centerLocation: Vector | SerializedObject<"Vector">,
    size: number,
    color: Color | SerializedObject<"Color">,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): void;
  renderTextInRectangle(
    text: string,
    rectangle: Rectangle | SerializedObject<"Rectangle">,
    color: Color | SerializedObject<"Color">,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): void;
  getFontSizeByRectangleSize(
    text: string,
    rectangle: Rectangle | SerializedObject<"Rectangle">,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): Vector;
  renderMultiLineText(
    text: string,
    location: Vector | SerializedObject<"Vector">,
    fontSize: number,
    limitWidth: number,
    color: Color | SerializedObject<"Color">,
    lineHeight: number,
    limitLines: number,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): void;
  renderTempMultiLineText(
    text: string,
    location: Vector | SerializedObject<"Vector">,
    fontSize: number,
    limitWidth: number,
    color: Color | SerializedObject<"Color">,
    lineHeight: number,
    limitLines: number,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): void;
  renderMultiLineTextFromCenterWithStroke(
    text: string,
    centerLocation: Vector | SerializedObject<"Vector">,
    size: number,
    fillColor: Color | SerializedObject<"Color">,
    strokeColor: Color | SerializedObject<"Color">,
    limitWidth: number,
    lineHeight: number,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): void;
  renderMultiLineTextFromCenter(
    text: string,
    centerLocation: Vector | SerializedObject<"Vector">,
    size: number,
    limitWidth: number,
    color: Color | SerializedObject<"Color">,
    lineHeight: number,
    limitLines: number,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): void;
  renderTempMultiLineTextFromCenter(
    text: string,
    centerLocation: Vector | SerializedObject<"Vector">,
    size: number,
    limitWidth: number,
    color: Color | SerializedObject<"Color">,
    lineHeight: number,
    limitLines: number,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): void;
  textArrayCache: LruCache<string, string[]>;
  textToTextArrayWrapCache(
    text: string,
    fontSize: number,
    limitWidth: number,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): string[];
  textToTextArray(
    text: string,
    fontSize: number,
    limitWidth: number,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): string[];
  measureMultiLineTextSize(
    text: string,
    fontSize: number,
    limitWidth: number,
    lineHeight: number,
    fontFamily: undefined | string,
    fontWeight: undefined | string,
  ): Vector;
}
declare interface DrawingControllerRenderer {
  readonly project: Project;
  renderTempDrawing(): void;
  renderTrace(currentStrokeColor: Color | SerializedObject<"Color">): void;
  renderMouse(currentStrokeColor: Color | SerializedObject<"Color">): void;
  renderAdjusting(currentStrokeColor: Color | SerializedObject<"Color">): void;
  renderAxisMouse(): void;
  diffAngle: number;
  rotateUpAngle(): void;
  rotateDownAngle(): void;
  renderAngleMouse(mouseLocation: Vector | SerializedObject<"Vector">): void;
  renderLine(lineStart: Vector | SerializedObject<"Vector">, lineEnd: Vector | SerializedObject<"Vector">): void;
}
declare interface CollisionBoxRenderer {
  readonly project: Project;
  dynamicScale: number;
  reDynamicScale: number;
  render(
    collideBox: CollisionBox | SerializedObject<"CollisionBox">,
    color: Color | SerializedObject<"Color">,
    dashed: boolean,
  ): void;
}
declare interface StraightEdgeRenderer {
  readonly project: Project;
  getCuttingEffects(edge: LineEdge | SerializedObject<"LineEdge">): Effect[];
  getConnectedEffects(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
    targetRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): Effect[];
  renderLine(
    start: Vector | SerializedObject<"Vector">,
    end: Vector | SerializedObject<"Vector">,
    edge: LineEdge | SerializedObject<"LineEdge">,
    width: number,
  ): void;
  renderNormalState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  getNormalStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  getCycleStageSvg(): ReactNode;
  getShiftingStageSvg(): ReactNode;
  renderArrowHead(
    edge: LineEdge | SerializedObject<"LineEdge">,
    direction: Vector | SerializedObject<"Vector">,
    endPoint: Vector | SerializedObject<"Vector">,
    size: number,
  ): void;
  getAdjustedLineEnd(
    endPoint: Vector | SerializedObject<"Vector">,
    direction: Vector | SerializedObject<"Vector">,
    arrowType: string,
    edgeWidth: number,
  ): Vector;
  shouldRenderTargetArrow(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  renderShiftingState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderCycleState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderVirtualEdge(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    mouseLocation: Vector | SerializedObject<"Vector">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  renderVirtualConfirmedEdge(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    endNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
    targetRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  isCycleState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  isNormalState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
}
declare interface SymmetryCurveEdgeRenderer {
  readonly project: Project;
  shouldRenderTargetArrow(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  getCuttingEffects(edge: LineEdge | SerializedObject<"LineEdge">): Effect[];
  getConnectedEffects(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
    targetRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): Effect[];
  renderNormalState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderShiftingState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderCycleState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  getNormalStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  getCycleStageSvg(): ReactNode;
  getShiftingStageSvg(): ReactNode;
  renderVirtualEdge(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    mouseLocation: Vector | SerializedObject<"Vector">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  renderVirtualConfirmedEdge(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    endNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
    targetRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  renderArrowCurve(
    curve: SymmetryCurve | SerializedObject<"SymmetryCurve">,
    color: Color | SerializedObject<"Color">,
    width: number,
    edge: undefined | LineEdge | SerializedObject<"LineEdge">,
  ): void;
  renderText(
    curve: SymmetryCurve | SerializedObject<"SymmetryCurve">,
    edge: LineEdge | SerializedObject<"LineEdge">,
  ): void;
  isCycleState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  isNormalState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
}
declare interface VerticalPolyEdgeRenderer {
  readonly project: Project;
  getCuttingEffects(edge: LineEdge | SerializedObject<"LineEdge">): Effect[];
  getConnectedEffects(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
    targetRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): Effect[];
  getVerticalDirection(edge: LineEdge | SerializedObject<"LineEdge">): Vector;
  fixedLength: number;
  renderTest(edge: LineEdge | SerializedObject<"LineEdge">): void;
  gaussianFunction(x: number): number;
  renderNormalState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderShiftingState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  shouldRenderTargetArrow(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  renderArrowHead(
    edge: LineEdge | SerializedObject<"LineEdge">,
    direction: Vector | SerializedObject<"Vector">,
    endPoint: Vector | SerializedObject<"Vector">,
  ): void;
  renderCycleState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  getNormalStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  getCycleStageSvg(): ReactNode;
  getShiftingStageSvg(): ReactNode;
  renderVirtualEdge(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    mouseLocation: Vector | SerializedObject<"Vector">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  renderVirtualConfirmedEdge(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    endNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
    targetRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  isCycleState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  isNormalState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
}
declare interface EdgeRenderer {
  currentRenderer: EdgeRendererClass;
  readonly project: Project;
  checkRendererBySettings(lineStyle: "bezier" | "straight" | "vertical"): void;
  updateRenderer(style: "bezier" | "straight" | "vertical"): Promise<void>;
  renderLineEdge(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderCrEdge(edge: CubicCatmullRomSplineEdge | SerializedObject<"CubicCatmullRomSplineEdge">): void;
  renderArcEdge(edge: ArcEdge | SerializedObject<"ArcEdge">): void;
  getMinNonCollapseParentSection(innerEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">): Section;
  getEdgeView(edge: LineEdge | SerializedObject<"LineEdge">): LineEdge;
  getEdgeSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  renderVirtualEdge(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    mouseLocation: Vector | SerializedObject<"Vector">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  renderVirtualConfirmedEdge(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    endNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
    targetRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  getCuttingEffects(edge: Edge | SerializedObject<"Edge">): Effect[];
  getConnectedEffects(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
    targetRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): Effect[];
  renderArrowHead(
    endPoint: Vector | SerializedObject<"Vector">,
    direction: Vector | SerializedObject<"Vector">,
    size: number,
    color: Color | SerializedObject<"Color">,
  ): void;
  renderArrowByType(
    endPoint: Vector | SerializedObject<"Vector">,
    startPoint: Vector | SerializedObject<"Vector">,
    direction: Vector | SerializedObject<"Vector">,
    size: number,
    color: Color | SerializedObject<"Color">,
    arrowType: string,
    edgeWidth: number,
    sourceDirection: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  renderHollowTriangleArrow(
    endPoint: Vector | SerializedObject<"Vector">,
    direction: Vector | SerializedObject<"Vector">,
    size: number,
    color: Color | SerializedObject<"Color">,
    edgeWidth: number,
  ): void;
  renderFilledTriangleArrow(
    endPoint: Vector | SerializedObject<"Vector">,
    direction: Vector | SerializedObject<"Vector">,
    size: number,
    color: Color | SerializedObject<"Color">,
  ): void;
  renderDiamondAtSource(
    sourceEdgePoint: Vector | SerializedObject<"Vector">,
    direction: Vector | SerializedObject<"Vector">,
    size: number,
    color: Color | SerializedObject<"Color">,
    filled: boolean,
    edgeWidth: number,
  ): void;
  generateArrowHeadSvg(
    endPoint: Vector | SerializedObject<"Vector">,
    direction: Vector | SerializedObject<"Vector">,
    size: number,
    edgeColor: Color | SerializedObject<"Color">,
  ): ReactNode;
}
declare interface EdgeRendererClass {
  isCycleState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  isNormalState(edge: LineEdge | SerializedObject<"LineEdge">): boolean;
  renderNormalState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderShiftingState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  renderCycleState(edge: LineEdge | SerializedObject<"LineEdge">): void;
  getNormalStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  getShiftingStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  getCycleStageSvg(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  renderVirtualEdge(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    mouseLocation: Vector | SerializedObject<"Vector">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  renderVirtualConfirmedEdge(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    endNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
    targetRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  getCuttingEffects(edge: Edge | SerializedObject<"Edge">): Effect[];
  getConnectedEffects(
    startNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceRectangleRate: undefined | Vector | SerializedObject<"Vector">,
    targetRectangleRate: undefined | Vector | SerializedObject<"Vector">,
  ): Effect[];
}
declare interface EntityDetailsButtonRenderer {
  readonly project: Project;
  render(entity: Entity | SerializedObject<"Entity">): void;
}
declare interface EntityRenderer {
  sectionSortedZIndex: Section[];
  extensionEntityRenderer: ExtensionEntityRenderer;
  readonly project: Project;
  sortSectionsByZIndex(): void;
  tickNumber: number;
  renderAllSectionsBackground(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  renderAllSectionsBigTitle(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  shouldSkipEntity(
    entity: Entity | SerializedObject<"Entity">,
    viewRectangle: Rectangle | SerializedObject<"Rectangle">,
  ): boolean;
  isBackgroundImageNode(entity: Entity | SerializedObject<"Entity">): boolean;
  renderAllEntities(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  renderEntity(entity: Entity | SerializedObject<"Entity">): void;
  renderEntityDebug(entity: Entity | SerializedObject<"Entity">): void;
  renderConnectPoint(connectPoint: ConnectPoint | SerializedObject<"ConnectPoint">): void;
  renderImageNode(imageNode: ImageNode | SerializedObject<"ImageNode">): void;
  renderPenStroke(penStroke: PenStroke | SerializedObject<"PenStroke">): void;
  renderEntityDetails(entity: Entity | SerializedObject<"Entity">): void;
  _renderEntityDetails(entity: Entity | SerializedObject<"Entity">, limitLiens: number): void;
  renderEntityTagShap(entity: Entity | SerializedObject<"Entity">): void;
  renderGrowthDirectionTriangle(entity: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
}
declare interface ExtensionEntityRenderer {
  readonly project: Project;
  render(entity: ExtensionEntity | SerializedObject<"ExtensionEntity">): void;
  drawPendingBox(
    ctx: CanvasRenderingContext2D | SerializedObject<"CanvasRenderingContext2D">,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void;
  drawErrorBox(
    ctx: CanvasRenderingContext2D | SerializedObject<"CanvasRenderingContext2D">,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    extensionId: string,
    color: string,
  ): void;
  drawCollisionBox(
    ctx: CanvasRenderingContext2D | SerializedObject<"CanvasRenderingContext2D">,
    entity: ExtensionEntity | SerializedObject<"ExtensionEntity">,
    scale: number,
  ): void;
  renderSelectionOutline(
    ctx: CanvasRenderingContext2D | SerializedObject<"CanvasRenderingContext2D">,
    entity: ExtensionEntity | SerializedObject<"ExtensionEntity">,
    scale: number,
  ): void;
  triggerWorkerRender(entity: ExtensionEntity | SerializedObject<"ExtensionEntity">, pixelRatio: number): Promise<void>;
}
declare interface LatexNodeRenderer {
  readonly project: Project;
  getTargetColorCss(node: LatexNode | SerializedObject<"LatexNode">): string;
  render(node: LatexNode | SerializedObject<"LatexNode">): void;
}
declare interface MultiTargetUndirectedEdgeRenderer {
  readonly project: Project;
  render(edge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">): void;
  renderLineShape(
    edge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">,
    edgeColor: Color | SerializedObject<"Color">,
    centerLocation: Vector | SerializedObject<"Vector">,
  ): void;
  renderConvexShape(
    edge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">,
    edgeColor: Color | SerializedObject<"Color">,
  ): void;
  renderCircle(
    edge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">,
    edgeColor: Color | SerializedObject<"Color">,
  ): void;
}
declare interface ReferenceBlockRenderer {
  readonly project: Project;
  render(referenceBlockNode: ReferenceBlockNode | SerializedObject<"ReferenceBlockNode">): void;
  renderBrackets(rect: Rectangle | SerializedObject<"Rectangle">, color: Color | SerializedObject<"Color">): void;
  renderSourceSectionBorder(
    section: Section | SerializedObject<"Section">,
    countNumber: number,
    color: Color | SerializedObject<"Color">,
  ): void;
}
declare interface SectionRenderer {
  readonly project: Project;
  renderCollapsed(section: Section | SerializedObject<"Section">): void;
  renderNoCollapse(section: Section | SerializedObject<"Section">): void;
  renderBackgroundColor(section: Section | SerializedObject<"Section">): void;
  renderBigCoveredTitle(section: Section | SerializedObject<"Section">): void;
  renderTopTitle(section: Section | SerializedObject<"Section">): void;
  render(section: Section | SerializedObject<"Section">): void;
}
declare interface SvgNodeRenderer {
  readonly project: Project;
  render(svgNode: SvgNode | SerializedObject<"SvgNode">): void;
}
declare interface TextNodeRenderer {
  readonly project: Project;
  renderTextNode(node: TextNode | SerializedObject<"TextNode">): void;
  renderKeyboardTreeHint(node: TextNode | SerializedObject<"TextNode">): void;
  renderLogicNodeWarningTrap(node: TextNode | SerializedObject<"TextNode">): void;
  renderTextNodeTextLayer(node: TextNode | SerializedObject<"TextNode">): void;
}
declare interface UrlNodeRenderer {
  readonly project: Project;
  render(urlNode: UrlNode | SerializedObject<"UrlNode">): void;
  renderHoverState(urlNode: UrlNode | SerializedObject<"UrlNode">): void;
}
declare interface Renderer {
  w: number;
  h: number;
  renderedEdges: number;
  readonly timings: { [key: string]: number };
  deltaTime: number;
  lastTime: number;
  frameCount: number;
  frameIndex: number;
  fps: number;
  resizeWindow(newW: number, newH: number): void;
  readonly project: Project;
  tick(): void;
  tick_(): void;
  renderViewElements(_viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  renderZoomLevelStage(): void;
  renderMainStageElements(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  renderStageElementsWithoutReactions(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  isOverView(
    viewRectangle: Rectangle | SerializedObject<"Rectangle">,
    entity: StageObject | SerializedObject<"StageObject">,
  ): boolean;
  renderCenterPointer(): void;
  renderHoverCollisionBox(): void;
  renderSelectingRectangle(): void;
  renderCuttingLine(): void;
  renderConnectingLine(): void;
  renderCrosshairOnHoverImage(): void;
  renderKeyboardOnly(): void;
  rendererLayerMovingLine(): void;
  renderJumpLine(
    startLocation: Vector | SerializedObject<"Vector">,
    endLocation: Vector | SerializedObject<"Vector">,
  ): void;
  renderWarningStageObjects(): void;
  renderTags(): void;
  renderEntities(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  renderEdges(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  renderBackground(): void;
  updateFPS(): void;
  renderDebugDetails(): void;
  renderSpecialKeys(): void;
  transformWorld2View(location: Vector | SerializedObject<"Vector">): Vector;
  transformWorld2View(rectangle: Rectangle | SerializedObject<"Rectangle">): Rectangle;
  transformView2World(location: Vector | SerializedObject<"Vector">): Vector;
  transformView2World(rectangle: Rectangle | SerializedObject<"Rectangle">): Rectangle;
  getCoverWorldRectangle(): Rectangle;
}
declare interface BackgroundRenderer {
  readonly project: Project;
  renderDotBackground(viewRect: Rectangle | SerializedObject<"Rectangle">): void;
  renderHorizonBackground(viewRect: Rectangle | SerializedObject<"Rectangle">): void;
  renderVerticalBackground(viewRect: Rectangle | SerializedObject<"Rectangle">): void;
  renderCartesianBackground(viewRect: Rectangle | SerializedObject<"Rectangle">): void;
  getCurrentGap(): number;
  getLocationXIterator(
    viewRect: Rectangle | SerializedObject<"Rectangle">,
    currentGap: number,
  ): IterableIterator<number>;
  getLocationYIterator(
    viewRect: Rectangle | SerializedObject<"Rectangle">,
    currentGap: number,
  ): IterableIterator<number>;
}
declare interface RenderUtils {
  readonly project: Project;
  renderPixel(location: Vector | SerializedObject<"Vector">, color: Color | SerializedObject<"Color">): void;
  renderArrow(
    direction: Vector | SerializedObject<"Vector">,
    location: Vector | SerializedObject<"Vector">,
    color: Color | SerializedObject<"Color">,
    size: number,
  ): void;
}
declare interface SearchContentHighlightRenderer {
  readonly project: Project;
  render(frameTickIndex: number): void;
}
declare interface WorldRenderUtils {
  readonly project: Project;
  renderCubicCatmullRomSpline(
    spline: CubicCatmullRomSpline | SerializedObject<"CubicCatmullRomSpline">,
    color: Color | SerializedObject<"Color">,
    width: number,
  ): void;
  renderBezierCurve(
    curve: CubicBezierCurve | SerializedObject<"CubicBezierCurve">,
    color: Color | SerializedObject<"Color">,
    width: number,
  ): void;
  renderSymmetryCurve(
    curve: SymmetryCurve | SerializedObject<"SymmetryCurve">,
    color: Color | SerializedObject<"Color">,
    width: number,
  ): void;
  renderDashedSymmetryCurve(
    curve: SymmetryCurve | SerializedObject<"SymmetryCurve">,
    color: Color | SerializedObject<"Color">,
    width: number,
    dashLength: number,
  ): void;
  renderDoubleSymmetryCurve(
    curve: SymmetryCurve | SerializedObject<"SymmetryCurve">,
    color: Color | SerializedObject<"Color">,
    width: number,
    gap: number,
  ): void;
  renderLaser(
    start: Vector | SerializedObject<"Vector">,
    end: Vector | SerializedObject<"Vector">,
    width: number,
    color: Color | SerializedObject<"Color">,
  ): void;
  renderPrismaticBlock(
    centerLocation: Vector | SerializedObject<"Vector">,
    radius: number,
    color: Color | SerializedObject<"Color">,
    strokeColor: Color | SerializedObject<"Color">,
    strokeWidth: number,
  ): void;
  renderRectangleFlash(
    rectangle: Rectangle | SerializedObject<"Rectangle">,
    shadowColor: Color | SerializedObject<"Color">,
    shadowBlur: number,
    roundedRadius: number,
  ): void;
  renderCuttingFlash(
    start: Vector | SerializedObject<"Vector">,
    end: Vector | SerializedObject<"Vector">,
    width: number,
    shadowColor: Color | SerializedObject<"Color">,
  ): void;
}
declare interface InputElement {
  input(
    location: Vector | SerializedObject<"Vector">,
    defaultValue: string,
    onChange: (value: string) => void,
    style: Partial<CSSStyleDeclaration> | SerializedObject<"Partial">,
  ): Promise<string>;
  textarea(
    defaultValue: string,
    onChange: (value: string, element: HTMLTextAreaElement) => void,
    style: Partial<CSSStyleDeclaration> | SerializedObject<"Partial">,
    selectAllWhenCreated: boolean,
    exitOnWheel: boolean,
    fixedWidth: undefined | number,
  ): Promise<string>;
  addSuccessEffect(): void;
  addFailEffect(withToast: boolean): void;
  readonly project: Project;
}
declare interface AutoLayoutFastTree {
  readonly project: Project;
  getTreeBoundingRectangle(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    skipDashed: boolean,
  ): Rectangle;
  moveTreeRectTo(
    treeRoot: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    targetLocation: Vector | SerializedObject<"Vector">,
    skipDashed: boolean,
  ): void;
  getSortedChildNodes(
    _node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    childNodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
    direction: "col" | "row",
  ): ConnectableEntity[];
  alignTrees(
    trees: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
    direction: "top" | "bottom" | "left" | "right",
    gap: number,
    skipDashed: boolean,
  ): void;
  adjustChildrenTreesByRootNodeLocation(
    rootNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    childList: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
    gap: number,
    position: "rightCenter" | "leftCenter" | "bottomCenter" | "topCenter",
    skipDashed: boolean,
  ): void;
  resolveSubtreeOverlaps(
    rootNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    directionGroups: {
      right?: ConnectableEntity[] | undefined;
      left?: ConnectableEntity[] | undefined;
      bottom?: ConnectableEntity[] | undefined;
      top?: ConnectableEntity[] | undefined;
    },
    skipDashed: boolean,
    minGap: number,
  ): void;
  hasOverlapOrLineIntersection(
    rootNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    group1: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
    group2: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
    dir1: "top" | "bottom" | "left" | "right",
    dir2: "top" | "bottom" | "left" | "right",
    skipDashed: boolean,
    minGap: number,
  ): boolean;
  getMaxEdgeTextDimension(edges: Array<Edge | SerializedObject<"Edge">>, direction: "vertical" | "horizontal"): number;
  autoLayoutFastTreeMode(rootNode: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  treeReverseX(selectedRootEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  treeReverseY(selectedRootEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  treeReverse(
    selectedRootEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    direction: "X" | "Y",
  ): void;
}
declare interface AutoLayout {
  readonly project: Project;
  getDAGLayoutInput(entities: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): {
    nodes: { id: string; rectangle: Rectangle }[];
    edges: { from: string; to: string }[];
  };
  computeDAGLayout(input: { nodes: { id: string; rectangle: Rectangle }[]; edges: { from: string; to: string }[] }): {
    [nodeId: string]: Vector;
  };
  topologicalSort(
    nodes: Array<{ id: string; rectangle: Rectangle }>,
    edges: Array<{ from: string; to: string }>,
  ): { order: string[]; levels: Map<string, number> };
  autoLayoutDAG(entities: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): void;
}
declare interface ControllerAssociationReshapeClass {
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  lastMoveLocation: Vector;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  readonly project: Project;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface ControllerCameraClass {
  isUsingMouseGrabMove: boolean;
  lastMousePressLocation: Vector[];
  isPreGrabbingWhenSpace: boolean;
  mac: ControllerCameraMac;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMoveOutWindowForcedShutdown(vectorObject: Vector | SerializedObject<"Vector">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  dealStealthMode(event: WheelEvent | SerializedObject<"WheelEvent">): boolean;
  zoomUIMethod(event: WheelEvent | SerializedObject<"WheelEvent">, overrideDeltaY: undefined | number): void;
  mousewheelFunction(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  moveCameraByMouseMove(x: number, y: number, mouseIndex: number): void;
  moveCameraByTouchPadTwoFingerMove(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  zoomCameraByMouseWheel(event: WheelEvent | SerializedObject<"WheelEvent">, overrideDeltaY: undefined | number): void;
  moveYCameraByMouseWheel(event: WheelEvent | SerializedObject<"WheelEvent">, overrideDeltaY: undefined | number): void;
  moveCameraByMouseSideWheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  zoomCameraByMouseSideWheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  moveYCameraByMouseSideWheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  moveXCameraByMouseWheel(event: WheelEvent | SerializedObject<"WheelEvent">, overrideDeltaY: undefined | number): void;
  moveXCameraByMouseSideWheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  isMouseWheel(event: WheelEvent | SerializedObject<"WheelEvent">): boolean;
  addDistanceNumberAndDetect(distance: number): boolean;
  detectDeltaY: LimitLengthQueue<number>;
  importantNumbers: Set<number>;
  readonly project: Project;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
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
  twoPointsMap: Record<string, Vector[]>;
  cuttingStartLocation: Vector;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseDownEvent(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  clearIsolationPoint(): void;
  mouseUpFunction(mouseUpWindowLocation: Vector | SerializedObject<"Vector">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMoveOutWindowForcedShutdown(outsideLocation: Vector | SerializedObject<"Vector">): void;
  updateWarningObjectByCuttingLine(): void;
  addEffectByWarningEntity(): void;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
declare interface ControllerEdgeEditClass {
  editEdgeText(clickedLineEdge: Edge | SerializedObject<"Edge">, selectAll: boolean): void;
  editMultiTargetEdgeText(
    clickedEdge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">,
    selectAll: boolean,
  ): void;
  mouseDoubleClick(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  readonly project: Project;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface ControllerEntityClickSelectAndMoveClass {
  isMovingEntity: boolean;
  mouseDownViewLocation: Vector;
  shakeDetector: ShakeDetector;
  shiftAxisLock: "x" | "y" | null;
  shiftAccumulatedDelta: Vector;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
  readonly project: Project;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
declare interface ControllerEntityCreateClass {
  readonly project: Project;
  mouseDoubleClick(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  createConnectPoint(
    pressLocation: Vector | SerializedObject<"Vector">,
    addToSections: Array<Section | SerializedObject<"Section">>,
  ): void;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface ControllerLayerMovingClass {
  isEnabled: boolean;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  readonly project: Project;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface ControllerEntityResizeClass {
  changeSizeEntity: Entity | null;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
  readonly project: Project;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
declare interface ControllerExtensionEntityClickClass {
  readonly project: Project;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface ControllerImageScaleClass {
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  readonly project: Project;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface ControllerNodeConnectionClass {
  _isControlKeyDown: boolean;
  _controlKeyEventRegistered: boolean;
  onControlKeyDown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  onControlKeyUp(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  registerControlKeyEvents(): void;
  unregisterControlKeyEvents(): void;
  _lastRightMousePressLocation: Vector;
  _isUsing: boolean;
  isUsing: boolean;
  readonly project: Project;
  dispose(): void;
  connectFromEntities: ConnectableEntity[];
  connectToEntity: ConnectableEntity | null;
  mouseLocations: Vector[];
  getMouseLocationsPoints(): Vector[];
  createConnectPointWhenConnect(): void;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  _startImageLocation: Map<string, Vector>;
  _endImageLocation: Vector | null;
  _hoverImageLocation: Vector | null;
  _previewSourceDirection: Direction | null;
  _previewTargetDirection: Direction | null;
  getHoverImageNode(): ImageNode | null;
  getHoverImageLocation(): Vector | null;
  onMouseDown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  isMouseHoverOnTarget: boolean;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
  mouseUp(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  getConnectDirectionByMouseTrack(): [Direction | null, Direction | null];
  _hasSourceSparkTriggered: boolean;
  _hasTargetSparkTriggered: boolean;
  getOppositeDirection(direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): Direction;
  clickMultiConnect(releaseWorldLocation: Vector | SerializedObject<"Vector">): void;
  clear(): void;
  updatePreviewDirections(): void;
  directionToRate(direction: null | Direction.Up | Direction.Down | Direction.Left | Direction.Right): Vector;
  getPreviewSourceRectangleRate(): Vector;
  getPreviewTargetRectangleRate(): Vector;
  dragMultiConnect(
    connectToEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceDirection: null | Direction.Up | Direction.Down | Direction.Left | Direction.Right,
    targetDirection: null | Direction.Up | Direction.Down | Direction.Left | Direction.Right,
  ): void;
  isConnecting(): boolean;
  addConnectEffect(
    from: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    to: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    sourceRectRate: undefined | Vector | SerializedObject<"Vector">,
    targetRectRate: undefined | Vector | SerializedObject<"Vector">,
  ): void;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
declare interface ControllerNodeEditClass {
  readonly project: Project;
  mouseDoubleClick(event: MouseEvent | SerializedObject<"MouseEvent">): Promise<void>;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  editUrlNodeTitle(clickedUrlNode: UrlNode | SerializedObject<"UrlNode">): void;
  editLatexNode(node: LatexNode | SerializedObject<"LatexNode">): void;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface ControllerPenStrokeControlClass {
  isAdjusting: boolean;
  startAdjustWidthLocation: Vector;
  lastAdjustWidthLocation: Vector;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  onMouseMoveWhenAdjusting(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  readonly project: Project;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface ControllerPenStrokeDrawingClass {
  _isUsing: boolean;
  currentSegments: PenStrokeSegment[];
  isDrawingLine: boolean;
  currentStrokeWidth: number;
  pendingOCRStrokes: PenStroke[];
  _ocrModelExists: boolean | null;
  readonly project: Project;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousemove(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  triggerOCR(...args: []): Promise<void> | undefined;
  releaseMouseAndClear(): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  getCurrentStrokeColor(): Color;
  changeCurrentStrokeColorAlpha(dAlpha: number): void;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
declare interface ControllerRectangleSelectClass {
  _isUsing: boolean;
  selectingRectangle: Rectangle | null;
  isUsing: boolean;
  shutDown(): void;
  mouseMoveOutWindowForcedShutdown(mouseLocation: Vector | SerializedObject<"Vector">): void;
  mousedown(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  isSelectDirectionRight: boolean;
  getSelectMode(): "intersect" | "contain";
  mouseup(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  readonly project: Project;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  mouseDoubleClick(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
}
declare interface ControllerSectionEditClass {
  readonly project: Project;
  mouseDoubleClick(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  mousemove(event: MouseEvent | SerializedObject<"MouseEvent">): void;
  keydown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  editSectionTitle(section: Section | SerializedObject<"Section">): void;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  keyup(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  mousedown(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  mousewheel(event: WheelEvent | SerializedObject<"WheelEvent">): void;
  touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface ControllerUtils {
  readonly autoComplete: AutoCompleteManager;
  readonly project: Project;
  editTextNode(clickedNode: TextNode | SerializedObject<"TextNode">, selectAll: boolean): void;
  editEdgeText(
    edge: Edge | SerializedObject<"Edge"> | MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">,
    selectAll: boolean,
  ): Promise<void>;
  editNodeDetailsByKeyboard(): void;
  editNodeDetails(clickedNode: Entity | SerializedObject<"Entity">): void;
  addTextNodeByLocation(
    location: Vector | SerializedObject<"Vector">,
    selectCurrent: boolean,
    autoEdit: boolean,
  ): Promise<string>;
  createConnectPoint(location: Vector | SerializedObject<"Vector">): void;
  addTextNodeFromCurrentSelectedNode(
    direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right,
    selectCurrent: boolean,
  ): void;
  textNodeInEditModeByUUID(uuid: string): void;
  getClickedStageObject(clickedLocation: Vector | SerializedObject<"Vector">): StageObject | null;
  isClickedResizeRect(clickedLocation: Vector | SerializedObject<"Vector">): boolean;
  selectedEntityNormalizing(): void;
  editSectionTitle(section: Section | SerializedObject<"Section">): void;
}
declare interface AutoCompleteManager {
  currentWindowId: string | undefined;
  readonly project: Project;
  handle(...args: [text: string, node: TextNode, ele: HTMLTextAreaElement, setWindowId: (id: string) => void]): void;
  handle(
    ...args: [text: string, node: TextNode, ele: HTMLTextAreaElement, setWindowId: (id: string) => void]
  ): void | undefined;
  openWindow(
    node: TextNode | SerializedObject<"TextNode">,
    entries: Record<string, string> | SerializedObject<"Record">,
    onSelect: (value: string) => void,
    setWindowId: (id: string) => void,
  ): void;
  handleLogic(
    text: string,
    node: TextNode | SerializedObject<"TextNode">,
    ele: HTMLTextAreaElement | SerializedObject<"HTMLTextAreaElement">,
    setWindowId: (id: string) => void,
  ): void;
  handleReference(
    ...args: [text: string, node: TextNode, ele: HTMLTextAreaElement, setWindowId: (id: string) => void]
  ): Promise<void> | undefined;
  handleReferenceFile(
    searchText: string,
    node: TextNode | SerializedObject<"TextNode">,
    ele: HTMLTextAreaElement | SerializedObject<"HTMLTextAreaElement">,
    setWindowId: (id: string) => void,
  ): Promise<void>;
  handleReferenceSection(
    searchText: string,
    node: TextNode | SerializedObject<"TextNode">,
    ele: HTMLTextAreaElement | SerializedObject<"HTMLTextAreaElement">,
    setWindowId: (id: string) => void,
  ): Promise<void>;
}
declare interface Controller {
  setCursorName(
    name:
      | CursorNameEnum.None
      | CursorNameEnum.Default
      | CursorNameEnum.Pointer
      | CursorNameEnum.Crosshair
      | CursorNameEnum.Move
      | CursorNameEnum.Grab
      | CursorNameEnum.Grabbing
      | CursorNameEnum.Text
      | CursorNameEnum.NotAllowed
      | CursorNameEnum.EResize
      | CursorNameEnum.NResize
      | CursorNameEnum.NeResize
      | CursorNameEnum.NwResize
      | CursorNameEnum.SResize
      | CursorNameEnum.SeResize
      | CursorNameEnum.SwResize
      | CursorNameEnum.WResize
      | CursorNameEnum.NsResize
      | CursorNameEnum.NeswResize
      | CursorNameEnum.NwseResize
      | CursorNameEnum.ColResize
      | CursorNameEnum.RowResize
      | CursorNameEnum.AllScroll
      | CursorNameEnum.ZoomIn
      | CursorNameEnum.ZoomOut
      | CursorNameEnum.GrabHand
      | CursorNameEnum.NotAllowedHand
      | CursorNameEnum.Pen
      | CursorNameEnum.Eraser
      | CursorNameEnum.Handwriting
      | CursorNameEnum.ZoomInHand
      | CursorNameEnum.ZoomOutHand,
  ): void;
  readonly pressingKeySet: Set<string>;
  pressingKeysString(): string;
  isMovingEdge: boolean;
  lastMoveLocation: Vector;
  mouseLocation: Vector;
  isCameraLocked: boolean;
  readonly lastSelectedEntityUUID: Set<string>;
  readonly lastSelectedEdgeUUID: Set<string>;
  touchStartLocation: Vector;
  touchStartDistance: number;
  touchDelta: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
  readonly isMouseDown: boolean[];
  lastManipulateTime: number;
  resetCountdownTimer(): void;
  isManipulateOverTime(): boolean;
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
declare interface ControllerClass {
  readonly project: Project;
  lastMoveLocation: Vector;
  lastClickTime: number;
  lastClickLocation: Vector;
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
  dispose(): void;
  _mouseup(event: PointerEvent | SerializedObject<"PointerEvent">): void;
  _touchstart(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  _touchmove(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  onePointTouchMoveLocation: Vector;
  _touchend(event: TouchEvent | SerializedObject<"TouchEvent">): void;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface KeyboardOnlyEngine {
  readonly project: Project;
  openning: boolean;
  setOpenning(value: boolean): void;
  isOpenning(): boolean;
  dispose(): void;
  startEditNode(
    event: KeyboardEvent | SerializedObject<"KeyboardEvent">,
    selectedNode: TextNode | SerializedObject<"TextNode">,
  ): void;
  onKeyUp(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  onKeyDown(event: KeyboardEvent | SerializedObject<"KeyboardEvent">): void;
  addSuccessEffect(): void;
  addFailEffect(): void;
}
declare interface KeyboardOnlyGraphEngine {
  targetLocationController: KeyboardOnlyDirectionController;
  virtualTargetLocation(): Vector;
  tick(): void;
  readonly project: Project;
  isEnableVirtualCreate(): boolean;
  _isCreating: boolean;
  _creatingFromUUID: string | null;
  creatingFromUUID(): string | null;
  isCreating(): boolean;
  createStart(): void;
  lastPressTabTime: number;
  getPressTabTimeInterval(): number;
  createFinished(): Promise<void>;
  moveVirtualTarget(delta: Vector | SerializedObject<"Vector">): void;
  createCancel(): void;
  startMovingDirection(dir: Direction.Up | Direction.Down | Direction.Left | Direction.Right): void;
  stopMovingDirection(dir: Direction.Up | Direction.Down | Direction.Left | Direction.Right): void;
  isTargetLocationHaveEntity(): boolean;
}
declare interface KeyboardOnlyTreeEngine {
  readonly project: Project;
  getOppositeDirection(direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): Direction;
  changeEdgeToDirection(
    edge: Edge | SerializedObject<"Edge">,
    direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right,
  ): void;
  isEdgeOnSameAxis(
    edge: Edge | SerializedObject<"Edge">,
    direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right,
  ): boolean;
  adjustSubtreeDirection(
    root: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right,
  ): void;
  adjustSelectedSubtreesDirection(direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): void;
  getNodePreDirection(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
  ): "left" | "right" | "down" | "up";
  preDirectionCacheMap: Map<string, "left" | "right" | "down" | "up">;
  getGrowthLineStart(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    direction: "left" | "right" | "down" | "up",
  ): Vector;
  getGrowthLineEnd(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    direction: "left" | "right" | "down" | "up",
  ): Vector;
  findConnectTargetByGrowthLine(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    direction: "left" | "right" | "down" | "up",
  ): ConnectableEntity | null;
  changePreDirection(
    nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
    direction: "left" | "right" | "down" | "up",
  ): void;
  addNodeEffectByPreDirection(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  onDeepGenerateNode(defaultText: string, selectAll: boolean, editEdgeFirst: boolean): void;
  onBroadGenerateNode(): void;
  adjustTreeNode(entity: ConnectableEntity | SerializedObject<"ConnectableEntity">, withEffect: boolean): void;
  onDeleteCurrentNode(): void;
  calculateNewNodeFontScaleLevel(
    parentNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    preDirection: "left" | "right" | "down" | "up",
  ): number;
  editEdgeTextAndThenNode(
    edge: Edge | SerializedObject<"Edge">,
    newNode: TextNode | SerializedObject<"TextNode">,
    selectAll: boolean,
  ): void;
}
declare interface SelectChangeEngine {
  lastSelectNodeByKeyboardUUID: string;
  readonly project: Project;
  selectUp(addSelect: boolean): void;
  selectDown(addSelect: boolean): void;
  selectLeft(addSelect: boolean): void;
  selectRight(addSelect: boolean): void;
  navigateInDirection(
    selectedNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right,
  ): ConnectableEntity | null;
  getSameLevelCandidates(
    parentSection: Section | SerializedObject<"Section">,
    excludeNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
  ): ConnectableEntity[];
  getTopLevelCandidates(excludeNode: ConnectableEntity | SerializedObject<"ConnectableEntity">): ConnectableEntity[];
  expandSelect(isKeepExpand: boolean, reversed: boolean): void;
  expandSelectWithEdge(isKeepExpand: boolean, reversed: boolean): void;
  afterSelect(
    selectedNodeRect: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    newSelectedConnectableEntity: null | ConnectableEntity | SerializedObject<"ConnectableEntity">,
    clearOldSelect: boolean,
  ): void;
  getCurrentSelectedNode(): ConnectableEntity | null;
  addEffect(
    selectedNodeRect: Rectangle | SerializedObject<"Rectangle">,
    newSelectNodeRect: Rectangle | SerializedObject<"Rectangle">,
  ): void;
  getMostNearConnectableEntity(
    nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
    location: Vector | SerializedObject<"Vector">,
  ): ConnectableEntity | null;
  selectMostNearLocationNode(location: Vector | SerializedObject<"Vector">): ConnectableEntity | null;
  collectNodesInStrip(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right,
    candidates: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
  ): ConnectableEntity[];
  getMostNearInStripByDh(
    nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
    nodeRect: Rectangle | SerializedObject<"Rectangle">,
    direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right,
  ): ConnectableEntity | null;
  collectFanNodes(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right,
    candidates: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
  ): ConnectableEntity[];
  collectTopNodes(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    candidates: undefined | Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
  ): ConnectableEntity[];
  collectBottomNodes(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    candidates: undefined | Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
  ): ConnectableEntity[];
  collectLeftNodes(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    candidates: undefined | Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
  ): ConnectableEntity[];
  collectRightNodes(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    candidates: undefined | Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
  ): ConnectableEntity[];
}
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
  endSelecting(): void;
  updateStageObjectByMove(): void;
  isSelectWithEntity(entity: StageObject | SerializedObject<"StageObject">): boolean;
  getSelectMode(): "intersect" | "contain";
  getSelectMoveDistance(): number;
}
declare interface KeyBindHintEngine {
  readonly project: Project;
  readonly ITEMS_PER_PAGE: 10;
  currentPage: number;
  currentModifierCombo: string;
  lastModifierCombo: string;
  isShowingHint: boolean;
  hasOtherKeyPressed: boolean;
  hasModifierReleased: boolean;
  cachedKeyBinds: { id: string; key: string; displayKey: string; title: string }[];
  getCurrentModifierCombo(): string;
  isOnlyModifiersPressed(): boolean;
  convertModifierComboForMatching(combo: string): string;
  isKeyBindMatchModifier(key: string, modifierCombo: string): boolean;
  getMatchingKeyBinds(modifierCombo: string): { id: string; key: string; displayKey: string; title: string }[];
  getKeyBindTitle(id: string): string;
  update(): void;
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
  _hoverEdges: Edge[];
  _hoverSections: Section[];
  _hoverConnectPoints: ConnectPoint[];
  _hoverMultiTargetEdges: MultiTargetUndirectedEdge[];
  hoverEdges: Edge[];
  firstHoverEdge: Edge | undefined;
  hoverSections: Section[];
  hoverConnectPoints: ConnectPoint[];
  firstHoverSection: Section | undefined;
  hoverMultiTargetEdges: MultiTargetUndirectedEdge[];
  firstHoverMultiTargetEdge: MultiTargetUndirectedEdge | undefined;
  updateByMouseMove(mouseWorldLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface AutoSaveBackupService {
  lastBackupTime: number;
  lastBackupHash: string;
  lastSaveTime: number;
  readonly project: Project;
  tick(): void;
  autoSave(): Promise<void>;
  autoBackup(): Promise<void>;
  localAutoBackup(strategy: "sideBySide" | "subfolder"): Promise<boolean>;
  manualBackup(): Promise<void>;
  resolveAutoBackupDir(candidate: { kind: "custom"; path: string } | { kind: "default" }): Promise<string | null>;
  tryBackupToDir(backupDir: string): Promise<boolean>;
  backupCurrentProject(backupDir: string): Promise<boolean>;
  generateBackupFileName(): string;
  generateTimestamp(): string;
  getOriginalFileName(): string;
  createBackupFile(backupFilePath: string): Promise<void>;
  manageBackupFiles(backupDir: string, prefix: undefined | string): Promise<void>;
}
declare type RecentFile = {
  uri: URI;
  /**
   * 上次保存或打开的时间戳
   */
  time: number;
};
declare interface AutoComputeUtils {
  readonly project: Project;
  getParentTextNodes(node: TextNode | SerializedObject<"TextNode">): TextNode[];
  getParentEntities(node: TextNode | SerializedObject<"TextNode">): ConnectableEntity[];
  getChildTextNodes(node: TextNode | SerializedObject<"TextNode">): TextNode[];
  getNodeOneResult(node: TextNode | SerializedObject<"TextNode">, resultText: string): void;
  getSectionOneResult(section: Section | SerializedObject<"Section">, resultText: string): void;
  getSectionMultiResult(section: Section | SerializedObject<"Section">, resultTextList: Array<string>): void;
  generateMultiResult(node: TextNode | SerializedObject<"TextNode">, resultTextList: Array<string>): void;
  stringToNumber(str: string): number;
  isNodeConnectedWithLogicNode(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): boolean;
  isNameIsLogicNode(name: string): boolean;
}
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
  MapOperationNameFunction: StringFunctionMap;
  MapNameFunction: StringFunctionMap;
  MapVariableFunction: VariableFunctionMap;
  MapOtherFunction: OtherFunctionMap;
  variables: Map<string, string>;
  readonly project: Project;
  tickNumber: number;
  tick(): void;
  funcTypeTrans(mF: MathFunctionType | SerializedObject<"MathFunctionType">): StringFunctionType;
  isTextNodeLogic(node: TextNode | SerializedObject<"TextNode">): boolean;
  isSectionLogic(section: Section | SerializedObject<"Section">): boolean;
  sortEntityByLocation(entities: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): ConnectableEntity[];
  computeTextNode(node: TextNode | SerializedObject<"TextNode">): void;
  computeSection(section: Section | SerializedObject<"Section">): void;
  computeEdge(edge: LineEdge | SerializedObject<"LineEdge">): void;
}
declare type MathFunctionType = (args: number[]) => number[];
declare type OtherFunctionMap = Record<string, OtherFunctionType>;
declare type OtherFunctionType = (
  project: Project,
  fatherNodes: ConnectableEntity[],
  childNodes: ConnectableEntity[],
) => string[];
declare type StringFunctionMap = Record<string, StringFunctionType>;
declare type StringFunctionType = (args: string[]) => string[];
declare type VariableFunctionMap = Record<string, VariableFunctionType>;
declare type VariableFunctionType = (project: Project, args: string[]) => string[];
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
declare interface BaseExporter {
  readonly project: Project;
  getTreeTypeString(
    textNode: TextNode | SerializedObject<"TextNode">,
    nodeToStringFunc: (node: TextNode, level: number) => string,
  ): string;
  getNodeChildrenArray(node: TextNode | SerializedObject<"TextNode">): ConnectableEntity[];
}
declare interface MarkdownExporter {
  export(textNode: TextNode | SerializedObject<"TextNode">): string;
  getNodeMarkdown(node: TextNode | SerializedObject<"TextNode">, level: number): string;
  readonly project: Project;
  getTreeTypeString(
    textNode: TextNode | SerializedObject<"TextNode">,
    nodeToStringFunc: (node: TextNode, level: number) => string,
  ): string;
  getNodeChildrenArray(node: TextNode | SerializedObject<"TextNode">): ConnectableEntity[];
}
declare interface MermaidExporter {
  readonly project: Project;
  export(entities: Array<Entity | SerializedObject<"Entity">>): string;
}
declare interface PlainTextExporter {
  readonly project: Project;
  export(nodes: Array<Entity | SerializedObject<"Entity">>): string;
}
declare interface StageExport {
  readonly plainTextExporter: PlainTextExporter;
  readonly markdownExporter: MarkdownExporter;
  readonly tabExporter: TabExporter;
  readonly mermaidExporter: MermaidExporter;
  readonly project: Project;
  getPlainTextByEntities(nodes: Array<Entity | SerializedObject<"Entity">>): string;
  getMarkdownStringByTextNode(textNode: TextNode | SerializedObject<"TextNode">): string;
  getTabStringByTextNode(textNode: TextNode | SerializedObject<"TextNode">): string;
  getMermaidTextByEntities(entities: Array<Entity | SerializedObject<"Entity">>): string;
}
declare interface EventMap {
  progress: [progress: number];
  complete: [blob: Blob];
  error: [error: Error];
}
declare interface StageExportPng {
  readonly project: Project;
  exportStage_(
    emitter: EventEmitter<EventMap> | SerializedObject<"EventEmitter">,
    signal: AbortSignal | SerializedObject<"AbortSignal">,
    sleepTime: number,
  ): Promise<void>;
  exportStage(signal: AbortSignal | SerializedObject<"AbortSignal">, sleepTime: number): EventEmitter<EventMap>;
  generateCanvasNode(): HTMLCanvasElement;
}
declare interface StageExportSvg {
  readonly project: Project;
  svgConfig: SvgExportConfig;
  exportContext: { outputDir: string; imageMap: Map<string, string> } | null;
  setConfig(config: SvgExportConfig | SerializedObject<"SvgExportConfig">): void;
  dumpNode(node: TextNode | SerializedObject<"TextNode">): Element;
  dumpSection(section: Section | SerializedObject<"Section">): Element;
  dumpSectionBase(section: Section | SerializedObject<"Section">): Element;
  dumpEdge(edge: LineEdge | SerializedObject<"LineEdge">): ReactNode;
  dumpEntityDetails(entity: Entity | SerializedObject<"Entity">): ReactNode;
  getEntityDetailsDataAttribute(entity: Entity | SerializedObject<"Entity">): string | undefined;
  dumpUrlNode(node: UrlNode | SerializedObject<"UrlNode">): Element;
  dumpImageNode(
    node: ImageNode | SerializedObject<"ImageNode">,
    svgConfigObject: SvgExportConfig | SerializedObject<"SvgExportConfig">,
  ): Element;
  getEntitiesOuterRectangle(entities: Array<Entity | SerializedObject<"Entity">>, padding: number): Rectangle;
  dumpSelected(): ReactNode;
  dumpStage(): ReactNode;
  dumpStageToSVGString(): string;
  dumpSelectedToSVGString(): string;
  exportStageToSVGFile(filePath: string): Promise<void>;
  exportSelectedToSVGFile(filePath: string): Promise<void>;
}
declare interface SvgExportConfig {
  imageMode: "absolutePath" | "relativePath" | "base64";
}
declare interface TabExporter {
  export(textNode: TextNode | SerializedObject<"TextNode">): string;
  getTabText(node: TextNode | SerializedObject<"TextNode">, level: number): string;
  readonly project: Project;
  getTreeTypeString(
    textNode: TextNode | SerializedObject<"TextNode">,
    nodeToStringFunc: (node: TextNode, level: number) => string,
  ): string;
  getNodeChildrenArray(node: TextNode | SerializedObject<"TextNode">): ConnectableEntity[];
}
declare interface BaseImporter {
  readonly project: Project;
}
declare interface GraphImporter {
  import(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  readonly project: Project;
}
declare interface MarkdownImporter {
  import(markdownText: string, diffLocation: Vector | SerializedObject<"Vector">, autoLayout: boolean): void;
  readonly project: Project;
}
declare interface MermaidImporter {
  import(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  normalizeLine(line: string): string;
  decodeMermaidText(value: string): string;
  sanitizeLabel(raw: undefined | string): string | undefined;
  parseNodeToken(token: string): MermaidNodeToken;
  readonly project: Project;
}
declare type MermaidNodeToken = {
  id: string;
  label?: string;
  shape: "rectangle" | "round" | "circle" | "rhombus" | "stadium" | "other";
};
declare interface StageImport {
  readonly graphImporter: GraphImporter;
  readonly treeImporter: TreeImporter;
  readonly mermaidImporter: MermaidImporter;
  readonly markdownImporter: MarkdownImporter;
  readonly project: Project;
  addNodeGraphByText(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  addNodeTreeByText(text: string, indention: number, diffLocation: Vector | SerializedObject<"Vector">): void;
  addNodeTreeByTextFromNode(
    uuid: string,
    text: string,
    indention: number,
  ): { success: boolean; error?: string | undefined; nodeCount?: number | undefined };
  addNodeMermaidByText(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  addNodeByMarkdown(markdownText: string, diffLocation: Vector | SerializedObject<"Vector">, autoLayout: boolean): void;
}
declare interface TreeImporter {
  import(text: string, indention: number, diffLocation: Vector | SerializedObject<"Vector">): void;
  importFromNode(
    uuid: string,
    text: string,
    indention: number,
  ): { success: boolean; error?: string | undefined; nodeCount?: number | undefined };
  getIndentLevel(line: string, indention: number): number;
  readonly project: Project;
}
declare interface AIEngine {
  createTransport(
    project: Project | SerializedObject<"Project">,
  ): DefaultChatTransport<UIMessage<unknown, UIDataTypes, UITools>>;
  createChatFetch(
    project: Project | SerializedObject<"Project">,
  ): (input: string | URL | Request, init?: (RequestInit & ClientOptions) | undefined) => Promise<Response>;
  getModels(): Promise<string[]>;
  readRequestBody(
    body:
      | undefined
      | null
      | string
      | ArrayBuffer
      | SerializedObject<"ArrayBuffer">
      | Blob
      | SerializedObject<"Blob">
      | ReadableStream<any>
      | SerializedObject<"ReadableStream">
      | ArrayBufferView<ArrayBuffer>
      | SerializedObject<"ArrayBufferView">
      | FormData
      | SerializedObject<"FormData">
      | URLSearchParams
      | SerializedObject<"URLSearchParams">,
  ): Promise<any>;
}
declare type AIMessageMetadata = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};
declare interface ComplexityDetector {
  readonly project: Project;
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
  crossEntityCount: number;
  maxSectionDepth: number;
  emptySetCount: number;
}
declare interface ContentSearch {
  readonly project: Project;
  searchResultNodes: StageObject[];
  isCaseSensitive: boolean;
  searchScope: SearchScope;
  currentSearchResultIndex: number;
  getStageObjectText(stageObject: StageObject | SerializedObject<"StageObject">): string;
  getSelectedObjectsBounds(): Rectangle | null;
  isObjectInBounds(
    obj: StageObject | SerializedObject<"StageObject">,
    bounds: Rectangle | SerializedObject<"Rectangle">,
  ): boolean;
  startSearch(searchString: string, autoFocus: boolean): boolean;
  nextSearchResult(): void;
  previousSearchResult(): void;
}
declare interface CopyEngine {
  copyEngineImage: CopyEngineImage;
  copyEngineText: CopyEngineText;
  readonly project: Project;
  copy(): Promise<void>;
  paste(): void;
  virtualClipboardPaste(): void;
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
declare interface CopyEngineText {
  project: Project;
  copyEnginePastePlainText(item: string): Promise<void>;
}
declare interface Effects {
  readonly project: Project;
  effects: Effect[];
  addEffect(effect: Effect | SerializedObject<"Effect">): void;
  effectsCount: number;
  addEffects(effects: Array<Effect | SerializedObject<"Effect">>): void;
  tick(): void;
}
declare interface Effect {
  timeProgress: ProgressNumber;
  delay: number;
  subEffects: Effect[];
  tick(project: Project | SerializedObject<"Project">): void;
  render(project: Project | SerializedObject<"Project">): void;
}
declare interface StageStyleManager {
  currentStyle: StageStyle;
}
declare type Settings = z.infer<typeof settingsSchema>;
declare const settingsSchema: ZodObject<
  {
    language: ZodDefault<
      ZodUnion<
        readonly [ZodLiteral<"en">, ZodLiteral<"zh_CN">, ZodLiteral<"zh_TW">, ZodLiteral<"zh_TWC">, ZodLiteral<"id">]
      >
    >;
    isClassroomMode: ZodDefault<ZodBoolean>;
    showQuickSettingsToolbar: ZodDefault<ZodBoolean>;
    showRecentFilesThumbnails: ZodDefault<ZodBoolean>;
    windowBackgroundAlpha: ZodDefault<ZodNumber>;
    windowBackgroundOpacityAfterOpenClickThrough: ZodDefault<ZodNumber>;
    windowBackgroundOpacityAfterCloseClickThrough: ZodDefault<ZodNumber>;
    isRenderCenterPointer: ZodDefault<ZodBoolean>;
    centerCrosshairColor: ZodDefault<ZodTuple<[ZodNumber, ZodNumber, ZodNumber], null>>;
    centerCrosshairShape: ZodDefault<
      ZodUnion<
        readonly [
          ZodLiteral<"crossDot">,
          ZodLiteral<"tightCross">,
          ZodLiteral<"xShape">,
          ZodLiteral<"circleDot">,
          ZodLiteral<"iBeam">,
        ]
      >
    >;
    centerCrosshairAlpha: ZodDefault<ZodNumber>;
    showBackgroundHorizontalLines: ZodDefault<ZodBoolean>;
    showBackgroundVerticalLines: ZodDefault<ZodBoolean>;
    showBackgroundDots: ZodDefault<ZodBoolean>;
    showBackgroundCartesian: ZodDefault<ZodBoolean>;
    enableTagTextNodesBigDisplay: ZodDefault<ZodBoolean>;
    showTextNodeBorder: ZodDefault<ZodBoolean>;
    showTreeDirectionHint: ZodDefault<ZodBoolean>;
    lineStyle: ZodDefault<ZodUnion<readonly [ZodLiteral<"straight">, ZodLiteral<"bezier">, ZodLiteral<"vertical">]>>;
    hideArrowWhenPointingToConnectPoint: ZodDefault<ZodBoolean>;
    sectionBitTitleRenderType: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"none">, ZodLiteral<"top">, ZodLiteral<"cover">]>
    >;
    nodeDetailsPanel: ZodDefault<ZodUnion<readonly [ZodLiteral<"small">, ZodLiteral<"vditor">]>>;
    alwaysShowDetails: ZodDefault<ZodBoolean>;
    entityDetailsFontSize: ZodDefault<ZodNumber>;
    entityDetailsLinesLimit: ZodDefault<ZodNumber>;
    entityDetailsWidthLimit: ZodDefault<ZodNumber>;
    showDebug: ZodDefault<ZodBoolean>;
    protectingPrivacy: ZodDefault<ZodBoolean>;
    protectingPrivacyMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"secretWord">, ZodLiteral<"caesar">]>>;
    windowCollapsingWidth: ZodDefault<ZodNumber>;
    windowCollapsingHeight: ZodDefault<ZodNumber>;
    limitCameraInCycleSpace: ZodDefault<ZodBoolean>;
    historySize: ZodDefault<ZodNumber>;
    autoRefreshStageByMouseAction: ZodDefault<ZodBoolean>;
    isPauseRenderWhenManipulateOvertime: ZodDefault<ZodBoolean>;
    renderOverTimeWhenNoManipulateTime: ZodDefault<ZodNumber>;
    ignoreTextNodeTextRenderLessThanFontSize: ZodDefault<ZodNumber>;
    sectionBigTitleThresholdRatio: ZodDefault<ZodNumber>;
    sectionBigTitleCameraScaleThreshold: ZodDefault<ZodNumber>;
    sectionBigTitleOpacity: ZodDefault<ZodNumber>;
    hideSectionContentsWhenBigTitleActive: ZodDefault<ZodBoolean>;
    sectionBackgroundFillMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"full">, ZodLiteral<"titleOnly">]>>;
    sectionInitBorderStyle: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"solid">, ZodLiteral<"dashed">, ZodLiteral<"none">]>
    >;
    autoEnterSectionEditMode: ZodDefault<ZodBoolean>;
    cacheTextAsBitmap: ZodDefault<ZodBoolean>;
    textCacheSize: ZodDefault<ZodNumber>;
    textScalingBehavior: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"temp">, ZodLiteral<"nearestCache">, ZodLiteral<"cacheEveryTick">]>
    >;
    antialiasing: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"disabled">, ZodLiteral<"low">, ZodLiteral<"medium">, ZodLiteral<"high">]>
    >;
    textIntegerLocationAndSizeRender: ZodDefault<ZodBoolean>;
    compatibilityMode: ZodDefault<ZodBoolean>;
    isEnableEntityCollision: ZodDefault<ZodBoolean>;
    isEnableSectionCollision: ZodDefault<ZodBoolean>;
    autoNamerTemplate: ZodDefault<ZodString>;
    autoNamerSectionTemplate: ZodDefault<ZodString>;
    autoNamerDetailsTemplate: ZodDefault<ZodString>;
    autoNamerTreeNodeTemplate: ZodDefault<ZodString>;
    autoSaveWhenClose: ZodDefault<ZodBoolean>;
    autoSave: ZodDefault<ZodBoolean>;
    autoSaveInterval: ZodDefault<ZodNumber>;
    autoBackup: ZodDefault<ZodBoolean>;
    autoBackupInterval: ZodDefault<ZodNumber>;
    autoBackupLimitCount: ZodDefault<ZodNumber>;
    autoBackupCustomPath: ZodDefault<ZodString>;
    autoBackupCustomPath2: ZodDefault<ZodString>;
    autoBackupStrategy: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"default">, ZodLiteral<"sideBySide">, ZodLiteral<"subfolder">]>
    >;
    enableDragEdgeRotateStructure: ZodDefault<ZodBoolean>;
    enableCtrlWheelRotateStructure: ZodDefault<ZodBoolean>;
    aiApiBaseUrl: ZodDefault<ZodString>;
    aiApiKey: ZodDefault<ZodString>;
    aiModel: ZodDefault<ZodString>;
    aiShowTokenCount: ZodDefault<ZodBoolean>;
    enableOCR: ZodDefault<ZodBoolean>;
    mouseRightDragBackground: ZodDefault<ZodUnion<readonly [ZodLiteral<"cut">, ZodLiteral<"moveCamera">]>>;
    enableSpaceKeyMouseLeftDrag: ZodDefault<ZodBoolean>;
    enableDragAutoAlign: ZodDefault<ZodBoolean>;
    reverseTreeMoveMode: ZodDefault<ZodBoolean>;
    mouseWheelMode: ZodDefault<
      ZodUnion<
        readonly [ZodLiteral<"zoom">, ZodLiteral<"move">, ZodLiteral<"moveX">, ZodLiteral<"none">, ZodLiteral<"zoomUI">]
      >
    >;
    mouseWheelModeReverse: ZodDefault<ZodBoolean>;
    mouseWheelWithShiftMode: ZodDefault<
      ZodUnion<
        readonly [ZodLiteral<"zoom">, ZodLiteral<"move">, ZodLiteral<"moveX">, ZodLiteral<"none">, ZodLiteral<"zoomUI">]
      >
    >;
    mouseWheelWithShiftModeReverse: ZodDefault<ZodBoolean>;
    mouseWheelWithCtrlMode: ZodDefault<
      ZodUnion<
        readonly [ZodLiteral<"zoom">, ZodLiteral<"move">, ZodLiteral<"moveX">, ZodLiteral<"none">, ZodLiteral<"zoomUI">]
      >
    >;
    mouseWheelWithCtrlModeReverse: ZodDefault<ZodBoolean>;
    mouseWheelWithAltMode: ZodDefault<
      ZodUnion<
        readonly [ZodLiteral<"zoom">, ZodLiteral<"move">, ZodLiteral<"moveX">, ZodLiteral<"none">, ZodLiteral<"zoomUI">]
      >
    >;
    mouseWheelWithAltModeReverse: ZodDefault<ZodBoolean>;
    uiScalePercent: ZodDefault<ZodNumber>;
    doubleClickMiddleMouseButton: ZodDefault<ZodUnion<readonly [ZodLiteral<"adjustCamera">, ZodLiteral<"none">]>>;
    doubleClickMiddleMouseButtonOnEntity: ZodDefault<ZodUnion<readonly [ZodLiteral<"openUrl">, ZodLiteral<"none">]>>;
    mouseSideWheelMode: ZodDefault<
      ZodUnion<
        readonly [
          ZodLiteral<"zoom">,
          ZodLiteral<"move">,
          ZodLiteral<"moveX">,
          ZodLiteral<"none">,
          ZodLiteral<"cameraMoveToMouse">,
          ZodLiteral<"adjustWindowOpacity">,
          ZodLiteral<"adjustPenStrokeWidth">,
        ]
      >
    >;
    macMouseWheelIsSmoothed: ZodDefault<ZodBoolean>;
    enableWindowsTouchPad: ZodDefault<ZodBoolean>;
    autoAdjustLineEndpointsByMouseTrack: ZodDefault<ZodBoolean>;
    macTrackpadAndMouseWheelDifference: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"trackpadIntAndWheelFloat">, ZodLiteral<"tarckpadFloatAndWheelInt">]>
    >;
    macTrackpadScaleSensitivity: ZodDefault<ZodNumber>;
    macEnableControlToCut: ZodDefault<ZodBoolean>;
    allowGlobalHotKeys: ZodDefault<ZodBoolean>;
    cameraFollowsSelectedNodeOnArrowKeys: ZodDefault<ZodBoolean>;
    arrowKeySelectOnlyInViewport: ZodDefault<ZodBoolean>;
    moveAmplitude: ZodDefault<ZodNumber>;
    moveFriction: ZodDefault<ZodNumber>;
    scaleExponent: ZodDefault<ZodNumber>;
    cameraZoomInLimitBehavior: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"macro">, ZodLiteral<"micro">, ZodLiteral<"reset">]>
    >;
    cameraZoomOutLimitBehavior: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"macro">, ZodLiteral<"micro">, ZodLiteral<"reset">]>
    >;
    cameraResetViewPaddingRate: ZodDefault<ZodNumber>;
    cameraResetMaxScale: ZodDefault<ZodNumber>;
    scaleCameraByMouseLocation: ZodDefault<ZodBoolean>;
    cameraKeyboardScaleRate: ZodDefault<ZodNumber>;
    rectangleSelectWhenRight: ZodDefault<ZodUnion<readonly [ZodLiteral<"intersect">, ZodLiteral<"contain">]>>;
    rectangleSelectWhenLeft: ZodDefault<ZodUnion<readonly [ZodLiteral<"intersect">, ZodLiteral<"contain">]>>;
    enableRightClickConnect: ZodDefault<ZodBoolean>;
    rightClickConnectEdgeType: ZodDefault<ZodUnion<readonly [ZodLiteral<"normal">, ZodLiteral<"arc">]>>;
    defaultEdgeLineType: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"solid">, ZodLiteral<"dashed">, ZodLiteral<"double">]>
    >;
    defaultEdgeArrowType: ZodDefault<
      ZodUnion<
        readonly [
          ZodLiteral<"default">,
          ZodLiteral<"hollow-triangle">,
          ZodLiteral<"filled-triangle">,
          ZodLiteral<"hollow-diamond">,
          ZodLiteral<"filled-diamond">,
        ]
      >
    >;
    textNodeStartEditMode: ZodDefault<
      ZodUnion<
        readonly [
          ZodLiteral<"enter">,
          ZodLiteral<"ctrlEnter">,
          ZodLiteral<"altEnter">,
          ZodLiteral<"shiftEnter">,
          ZodLiteral<"space">,
        ]
      >
    >;
    textNodeContentLineBreak: ZodDefault<
      ZodUnion<
        readonly [ZodLiteral<"enter">, ZodLiteral<"ctrlEnter">, ZodLiteral<"altEnter">, ZodLiteral<"shiftEnter">]
      >
    >;
    textNodeExitEditMode: ZodDefault<
      ZodUnion<
        readonly [ZodLiteral<"enter">, ZodLiteral<"ctrlEnter">, ZodLiteral<"altEnter">, ZodLiteral<"shiftEnter">]
      >
    >;
    textNodeExitEditModeOnWheel: ZodDefault<ZodBoolean>;
    textNodeSelectAllWhenStartEditByMouseClick: ZodDefault<ZodBoolean>;
    textNodeSelectAllWhenStartEditByKeyboard: ZodDefault<ZodBoolean>;
    textNodeBackspaceDeleteWhenEmpty: ZodDefault<ZodBoolean>;
    textNodeBigContentThresholdWhenPaste: ZodDefault<ZodNumber>;
    textNodePasteSizeAdjustMode: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"auto">, ZodLiteral<"manual">, ZodLiteral<"autoByLength">]>
    >;
    clipboardPasteMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"auto">, ZodLiteral<"webview">, ZodLiteral<"tauri">]>>;
    resizePastedImages: ZodDefault<ZodBoolean>;
    maxPastedImageSize: ZodDefault<ZodNumber>;
    compressImageToWebp: ZodDefault<ZodBoolean>;
    webpQuality: ZodDefault<ZodNumber>;
    compressImageToBlackAndWhite: ZodDefault<ZodBoolean>;
    blackAndWhiteThreshold: ZodDefault<ZodNumber>;
    wrapImageInGroup: ZodDefault<ZodBoolean>;
    textNodeManualDefaultCharWidth: ZodDefault<ZodNumber>;
    allowAddCycleEdge: ZodDefault<ZodBoolean>;
    enableDragNodeShakeDetachFromEdge: ZodDefault<ZodBoolean>;
    autoLayoutWhenTreeGenerate: ZodDefault<ZodBoolean>;
    enableTreeGenerateConnectByProbe: ZodDefault<ZodBoolean>;
    treeGenerateInheritParentColor: ZodDefault<ZodBoolean>;
    textNodeAutoFormatTreeWhenInput: ZodDefault<ZodBoolean>;
    treeGenerateCameraBehavior: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"none">, ZodLiteral<"moveToNewNode">, ZodLiteral<"resetToTree">]>
    >;
    enableTabGenerateNodeInInput: ZodDefault<ZodBoolean>;
    enableBackslashGenerateNodeInInput: ZodDefault<ZodBoolean>;
    gamepadDeadzone: ZodDefault<ZodNumber>;
    showGrid: ZodDefault<ZodBoolean>;
    maxFps: ZodDefault<ZodNumber>;
    maxFpsUnfocused: ZodDefault<ZodNumber>;
    effectsPerferences: ZodDefault<ZodRecord<ZodString, ZodBoolean>>;
    autoFillNodeColor: ZodDefault<ZodTuple<[ZodNumber, ZodNumber, ZodNumber, ZodNumber], null>>;
    autoFillNodeColorEnable: ZodDefault<ZodBoolean>;
    autoFillPenStrokeColor: ZodDefault<ZodTuple<[ZodNumber, ZodNumber, ZodNumber, ZodNumber], null>>;
    autoFillPenStrokeColorEnable: ZodDefault<ZodBoolean>;
    colorPanelMouseEnterPreview: ZodDefault<ZodBoolean>;
    autoFillEdgeColor: ZodDefault<ZodTuple<[ZodNumber, ZodNumber, ZodNumber, ZodNumber], null>>;
    autoOpenPath: ZodDefault<ZodString>;
    generateTextNodeByStringTabCount: ZodDefault<ZodNumber>;
    enableCollision: ZodDefault<ZodBoolean>;
    enableDragAlignToGrid: ZodDefault<ZodBoolean>;
    mouseLeftMode: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"selectAndMove">, ZodLiteral<"draw">, ZodLiteral<"connectAndCut">]>
    >;
    doubleClickEmptySpaceAction: ZodDefault<ZodUnion<readonly [ZodLiteral<"createTextNode">, ZodLiteral<"none">]>>;
    soundEnabled: ZodDefault<ZodBoolean>;
    cuttingLineStartSoundFile: ZodDefault<ZodString>;
    connectLineStartSoundFile: ZodDefault<ZodString>;
    connectFindTargetSoundFile: ZodDefault<ZodString>;
    cuttingLineReleaseSoundFile: ZodDefault<ZodString>;
    alignAndAttachSoundFile: ZodDefault<ZodString>;
    packEntityToSectionSoundFile: ZodDefault<ZodString>;
    treeGenerateDeepSoundFile: ZodDefault<ZodString>;
    treeGenerateBroadSoundFile: ZodDefault<ZodString>;
    treeAdjustSoundFile: ZodDefault<ZodString>;
    viewAdjustSoundFile: ZodDefault<ZodString>;
    entityJumpSoundFile: ZodDefault<ZodString>;
    associationAdjustSoundFile: ZodDefault<ZodString>;
    uiButtonEnterSoundFile: ZodDefault<ZodString>;
    uiButtonClickSoundFile: ZodDefault<ZodString>;
    uiSwitchButtonOnSoundFile: ZodDefault<ZodString>;
    uiSwitchButtonOffSoundFile: ZodDefault<ZodString>;
    githubToken: ZodDefault<ZodString>;
    githubUser: ZodDefault<ZodString>;
    theme: ZodDefault<ZodString>;
    themeMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"light">, ZodLiteral<"dark">]>>;
    lightTheme: ZodDefault<ZodString>;
    darkTheme: ZodDefault<ZodString>;
    telemetry: ZodDefault<ZodBoolean>;
    historyManagerMode: ZodDefault<ZodUnion<readonly [ZodLiteral<"memoryEfficient">, ZodLiteral<"timeEfficient">]>>;
    isStealthModeEnabled: ZodDefault<ZodBoolean>;
    stealthModeScopeRadius: ZodDefault<ZodNumber>;
    stealthModeReverseMask: ZodDefault<ZodBoolean>;
    stealthModeMaskShape: ZodDefault<
      ZodUnion<readonly [ZodLiteral<"circle">, ZodLiteral<"square">, ZodLiteral<"topLeft">, ZodLiteral<"smartContext">]>
    >;
    clearHistoryWhenManualSave: ZodDefault<ZodBoolean>;
    soundPitchVariationRange: ZodDefault<ZodNumber>;
    autoImportTxtFileWhenOpenPrg: ZodDefault<ZodBoolean>;
    imageImportOrder: ZodDefault<ZodUnion<readonly [ZodLiteral<"mtime">, ZodLiteral<"path">]>>;
    enableAutoEdgeWidth: ZodDefault<ZodBoolean>;
    enableCollisionBoxAutoWidth: ZodDefault<ZodBoolean>;
    newNodeScaleByCamera: ZodDefault<ZodBoolean>;
    newNodeScaleByCameraOffset: ZodDefault<ZodNumber>;
    showKeyBindHint: ZodDefault<ZodBoolean>;
    showEditModeHint: ZodDefault<ZodBoolean>;
    textNodeEditModeOutlineOpacity: ZodDefault<ZodNumber>;
    contextMenuConfig: ZodDefault<
      ZodArray<
        ZodObject<
          {
            type: ZodUnion<
              readonly [
                ZodLiteral<"item">,
                ZodLiteral<"separator">,
                ZodLiteral<"sub">,
                ZodLiteral<"group">,
                ZodLiteral<"setColorForSelected">,
                ZodLiteral<"setPenStrokeColor">,
              ]
            >;
            id: ZodString;
            label: ZodOptional<ZodString>;
            icon: ZodOptional<ZodString>;
            visible: ZodDefault<ZodBoolean>;
            children: ZodOptional<ZodArray<ZodAny>>;
            layout: ZodOptional<ZodUnion<readonly [ZodLiteral<"row">, ZodLiteral<"grid">]>>;
            cols: ZodOptional<ZodNumber>;
          },
          $strip
        >
      >
    >;
    disabledExtensions: ZodDefault<ZodArray<ZodString>>;
    extensionSettings: ZodDefault<ZodRecord<ZodString, ZodRecord<ZodString, ZodUnknown>>>;
    defaultFontFamily: ZodDefault<ZodString>;
    hideCursorInPenMode: ZodDefault<ZodBoolean>;
    penPressureCurve: ZodDefault<
      ZodUnion<
        readonly [
          ZodLiteral<"fixed">,
          ZodLiteral<"linear">,
          ZodLiteral<"sqrt">,
          ZodLiteral<"cbrt">,
          ZodLiteral<"quadratic">,
          ZodLiteral<"cubic">,
        ]
      >
    >;
    globalMenuConfig: ZodDefault<
      ZodArray<
        ZodObject<
          {
            type: ZodUnion<
              readonly [
                ZodLiteral<"topMenu">,
                ZodLiteral<"item">,
                ZodLiteral<"separator">,
                ZodLiteral<"sub">,
                ZodLiteral<"recentFiles">,
                ZodLiteral<"versionInfo">,
                ZodLiteral<"unstableVersionBanner">,
                ZodLiteral<"devMenu">,
                ZodLiteral<"featureFlagsList">,
              ]
            >;
            id: ZodString;
            label: ZodOptional<ZodString>;
            icon: ZodOptional<ZodString>;
            visible: ZodOptional<ZodBoolean>;
            children: ZodOptional<ZodArray<ZodAny>>;
          },
          $strip
        >
      >
    >;
  },
  $strip
>;
declare interface Camera {
  readonly frictionExponent: 1.5;
  location: Vector;
  targetLocationByScale: Vector;
  speed: Vector;
  accelerateCommander: Vector;
  currentScale: number;
  targetScale: number;
  readonly shakeLocation: Vector;
  savedCameraState: { location: Vector; scale: number } | null;
  readonly shockMoveDiffLocationsQueue: Queue<Vector>;
  pageMove(direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right): void;
  bombMove(targetLocation: Vector | SerializedObject<"Vector">, frameCount: number): void;
  tickIndex: number;
  hasResetOnOpen: boolean;
  tick(): void;
  tickNumber: number;
  allowScaleFollowMouseLocationTicks: number;
  setAllowScaleFollowMouseLocationTicks(ticks: number): void;
  zoomInByKeyboardPress(): void;
  zoomOutByKeyboardPress(): void;
  addScaleFollowMouseLocationTime(sec: number): void;
  isStartZoomIn: boolean;
  isStartZoomOut: boolean;
  setLocationByOtherLocation(
    otherWorldLocation: Vector | SerializedObject<"Vector">,
    viewLocation: Vector | SerializedObject<"Vector">,
  ): void;
  clearMoveCommander(): void;
  stopImmediately(): void;
  dealCameraScaleInTick(): number;
  readonly project: Project;
  reset(): void;
  resetBySelected(): void;
  resetByRectangle(viewRectangle: Rectangle | SerializedObject<"Rectangle">): void;
  resetScale(): void;
  resetLocationToZero(): void;
  saveCameraState(): void;
  restoreCameraState(): void;
  isDefaultZoom(): boolean;
}
declare interface Canvas {
  ctx: CanvasRenderingContext2D;
  readonly project: Project;
  element: HTMLCanvasElement;
  mount(wrapper: HTMLDivElement | SerializedObject<"HTMLDivElement">): void;
  dispose(): void;
}
declare interface GraphMethods {
  readonly project: Project;
  isTree(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, skipDashed: boolean): boolean;
  getNodeDisplayName(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): string;
  validateTreeStructure(
    rootNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    skipDashed: boolean,
  ): TreeValidationResult;
  nodeChildrenArray(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    skipDashed: boolean,
  ): ConnectableEntity[];
  nodeParentArray(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    skipDashed: boolean,
  ): ConnectableEntity[];
  edgeChildrenArray(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): Edge[];
  edgeParentArray(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): Edge[];
  getReversedEdgeDict(skipDashed: boolean): Record<string, string>;
  isCurrentNodeInTreeStructAndNotRoot(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): boolean;
  getRoots(node: ConnectableEntity | SerializedObject<"ConnectableEntity">, skipDashed: boolean): ConnectableEntity[];
  isConnected(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    target: ConnectableEntity | SerializedObject<"ConnectableEntity">,
  ): boolean;
  getSuccessorSet(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    isHaveSelf: boolean,
    skipDashed: boolean,
  ): ConnectableEntity[];
  getOneStepSuccessorSet(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): ConnectableEntity[];
  getEdgesBetween(
    node1: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    node2: ConnectableEntity | SerializedObject<"ConnectableEntity">,
  ): Edge[];
  getEdgeFromTwoEntity(
    fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
  ): Edge | null;
  getHyperEdgesByNode(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): MultiTargetUndirectedEdge[];
  getOutgoingEdges(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): Edge[];
  getIncomingEdges(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): Edge[];
  getNodesConnectedByHyperEdges(node: ConnectableEntity | SerializedObject<"ConnectableEntity">): ConnectableEntity[];
  nodeChildrenArrayWithinSet(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    nodeSet: Set<string> | SerializedObject<"Set">,
  ): ConnectableEntity[];
  nodeParentArrayWithinSet(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    nodeSet: Set<string> | SerializedObject<"Set">,
  ): ConnectableEntity[];
  getTreeRootByNodes(nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): ConnectableEntity | null;
  isTreeByNodes(nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): boolean;
  isDAGByNodes(nodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>): boolean;
}
declare interface TreeIssue {
  type: TreeIssueType;
  message: string;
  nodes?: ConnectableEntity[] | undefined;
  edges?: Edge[] | undefined;
}
declare type TreeIssueType = "selfLoop" | "cycle" | "diamond" | "overlappingEdges";
declare interface TreeValidationResult {
  isValid: boolean;
  issues: TreeIssue[];
}
declare interface SectionMethods {
  readonly project: Project;
  getFatherSections(entity: Entity | SerializedObject<"Entity">): Section[];
  isObjectBeLockedBySection(object: StageObject | SerializedObject<"StageObject">): boolean;
  getFatherSectionsList(entity: Entity | SerializedObject<"Entity">): Section[];
  getSectionsByInnerLocation(location: Vector | SerializedObject<"Vector">): Section[];
  getInnermostSectionByLocation(location: Vector | SerializedObject<"Vector">): Section | null;
  isSectionBigTitleActive(section: Section | SerializedObject<"Section">): boolean;
  getBigTitleCoveringAncestorSection(entity: Entity | SerializedObject<"Entity">): Section | null;
  isEntityHiddenByBigTitleSection(entity: Entity | SerializedObject<"Entity">): boolean;
  isEntityCoveredByBigTitleSection(entity: Entity | SerializedObject<"Entity">): boolean;
  getBigTitleCoveringAncestorSections(entity: Entity | SerializedObject<"Entity">): Section[];
  isAssociationHiddenByBigTitleSection(association: Association | SerializedObject<"Association">): boolean;
  isAssociationCoveredByBigTitleSection(association: Association | SerializedObject<"Association">): boolean;
  getOutermostLockedAncestorSection(entity: Entity | SerializedObject<"Entity">): Section | null;
  shallowerSection(sections: Array<Section | SerializedObject<"Section">>): Section[];
  shallowerNotSectionEntities(entities: Array<Entity | SerializedObject<"Entity">>): Entity[];
  isEntityInSection(
    entity: Entity | SerializedObject<"Entity">,
    section: Section | SerializedObject<"Section">,
  ): boolean;
  getSectionMaxDeep(section: Section | SerializedObject<"Section">): number;
  getAllEntitiesInSelectedSectionsOrEntities(selectedEntities: Array<Entity | SerializedObject<"Entity">>): Entity[];
  getSortedSectionsByZ(sections: Array<Section | SerializedObject<"Section">>): Section[];
  getDeepestSectionsAtLocation(
    section: Section | SerializedObject<"Section">,
    location: Vector | SerializedObject<"Vector">,
  ): Section[];
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
  alignLeftToRightNoSpace(): void;
  alignTopToBottomNoSpace(): void;
  layoutBySelected(layoutFunction: (entities: Entity[]) => void, isDeep: boolean): void;
  adjustSelectedTextNodeWidth(mode: "maxWidth" | "minWidth" | "average"): void;
  layoutToSquare(entities: Array<Entity | SerializedObject<"Entity">>): void;
  layoutToTightSquare(entities: Array<Entity | SerializedObject<"Entity">>): void;
}
declare interface SectionCollisionSolver {
  readonly project: Project;
  solveOverlaps(
    grownSection: Section | SerializedObject<"Section">,
    visited: Set<string> | SerializedObject<"Set">,
  ): void;
  updateAncestorsAfterShift(
    entity: Entity | SerializedObject<"Entity">,
    visited: Set<string> | SerializedObject<"Set">,
  ): void;
  getSiblingsSections(section: Section | SerializedObject<"Section">): Section[];
  computePushDelta(
    grownRect: Rectangle | SerializedObject<"Rectangle">,
    siblingRect: Rectangle | SerializedObject<"Rectangle">,
  ): Vector;
  rawShiftEntityTree(entity: Entity | SerializedObject<"Entity">, delta: Vector | SerializedObject<"Vector">): void;
}
declare interface AutoAlign {
  readonly project: Project;
  getSelectionOuterRectangle(entities: Array<Entity | SerializedObject<"Entity">>): Rectangle | null;
  calculateDistanceByRectangle(
    rectA: Rectangle | SerializedObject<"Rectangle">,
    rectB: Rectangle | SerializedObject<"Rectangle">,
  ): number;
  alignRectangleToTargetX(
    selectedRect: Rectangle | SerializedObject<"Rectangle">,
    otherRect: Rectangle | SerializedObject<"Rectangle">,
  ): number;
  alignRectangleToTargetY(
    selectedRect: Rectangle | SerializedObject<"Rectangle">,
    otherRect: Rectangle | SerializedObject<"Rectangle">,
  ): number;
  _addAlignEffectByRect(
    selectedRect: Rectangle | SerializedObject<"Rectangle">,
    otherRect: Rectangle | SerializedObject<"Rectangle">,
  ): void;
  getGridSnapDeltaX(rect: Rectangle | SerializedObject<"Rectangle">): number;
  getGridSnapDeltaY(rect: Rectangle | SerializedObject<"Rectangle">): number;
  alignAllSelectedToGrid(): void;
  alignAllSelected(): void;
  preAlignAllSelected(): void;
  onEntityMoveAlignToGrid(selectedEntity: Entity | SerializedObject<"Entity">): void;
  onEntityMoveAlignToGridX(selectedEntity: Entity | SerializedObject<"Entity">): void;
  onEntityMoveAlignToGridY(selectedEntity: Entity | SerializedObject<"Entity">): void;
  onEntityMoveAlignToOtherEntity(
    selectedEntity: Entity | SerializedObject<"Entity">,
    otherEntities: Array<Entity | SerializedObject<"Entity">>,
    isPreAlign: boolean,
  ): void;
  _addAlignEffect(
    selectedEntity: Entity | SerializedObject<"Entity">,
    otherEntity: Entity | SerializedObject<"Entity">,
  ): void;
  onEntityMoveAlignToTargetEntityX(
    selectedEntity: Entity | SerializedObject<"Entity">,
    otherEntity: Entity | SerializedObject<"Entity">,
    isPreAlign: boolean,
  ): number;
  onEntityMoveAlignToTargetEntityY(
    selectedEntity: Entity | SerializedObject<"Entity">,
    otherEntity: Entity | SerializedObject<"Entity">,
    isPreAlign: boolean,
  ): number;
  calculateDistance(entityA: Entity | SerializedObject<"Entity">, entityB: Entity | SerializedObject<"Entity">): number;
  autoLayoutSelectedFastTreeMode(selectedRootEntity: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
}
declare type Constructor<T> = {
  new (...args: any[]): T;
};
declare type DeleteHandler<T> = (object: T) => void;
declare interface DeleteManager {
  deleteHandlers: Map<Constructor<StageObject>, DeleteHandler<StageObject>>;
  registerHandler(
    constructor: Constructor<T> | SerializedObject<"Constructor">,
    handler: DeleteHandler<T> | SerializedObject<"DeleteHandler">,
  ): void;
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
  deleteEntityAfterClearAssociation(entity: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  deleteEdge(deleteEdge: Edge | SerializedObject<"Edge">): boolean;
  deleteMultiTargetUndirectedEdge(
    edge: MultiTargetUndirectedEdge | SerializedObject<"MultiTargetUndirectedEdge">,
  ): boolean;
}
declare interface EntityMoveManager {
  readonly project: Project;
  moveAccelerateCommander: Vector;
  moveSpeed: Vector;
  readonly frictionExponent: 1.5;
  tick(): void;
  continuousMoveKeyPress(direction: Vector | SerializedObject<"Vector">): void;
  continuousMoveKeyRelease(direction: Vector | SerializedObject<"Vector">): void;
  stopImmediately(): void;
  canMoveEntity(entity: Entity | SerializedObject<"Entity">): boolean;
  moveEntityUtils(
    entity: Entity | SerializedObject<"Entity">,
    delta: Vector | SerializedObject<"Vector">,
    isAutoAdjustSection: boolean,
  ): void;
  jumpMoveEntityUtils(entity: Entity | SerializedObject<"Entity">, delta: Vector | SerializedObject<"Vector">): void;
  moveEntityToUtils(entity: Entity | SerializedObject<"Entity">, location: Vector | SerializedObject<"Vector">): void;
  moveSelectedEntities(delta: Vector | SerializedObject<"Vector">, isAutoAdjustSection: boolean): void;
  jumpMoveSelectedConnectableEntities(delta: Vector | SerializedObject<"Vector">): void;
  moveEntitiesWithChildren(delta: Vector | SerializedObject<"Vector">, skipDashed: boolean): void;
  moveWithChildren(
    node: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    delta: Vector | SerializedObject<"Vector">,
    skipDashed: boolean,
  ): void;
}
declare interface StageUtils {
  readonly project: Project;
  replaceAutoNameWithoutStage(template: string): string;
  replaceAutoNameTemplate(
    currentName: string,
    targetStageObject: StageObject | SerializedObject<"StageObject">,
  ): string;
  isNameConflictWithTextNodes(name: string): boolean;
  isNameConflictWithSections(name: string): boolean;
}
declare interface MultiTargetEdgeMove {
  readonly project: Project;
  moveMultiTargetEdge(diffLocation: Vector | SerializedObject<"Vector">): void;
}
declare interface NodeAdder {
  readonly project: Project;
  addTextNodeByClick(
    clickWorldLocation: Vector | SerializedObject<"Vector">,
    addToSections: Array<Section | SerializedObject<"Section">>,
    selectCurrent: boolean,
    shouldRecordHistory: boolean,
    options: undefined | { overrideFontScaleLevel?: number | undefined },
  ): Promise<string>;
  addTextNodeFromCurrentSelectedNode(
    direction: Direction.Up | Direction.Down | Direction.Left | Direction.Right,
    addToSections: Array<Section | SerializedObject<"Section">>,
    selectCurrent: boolean,
  ): Promise<string>;
  getAutoName(): Promise<string>;
  getAutoColor(): Color;
  addConnectPoint(
    clickWorldLocation: Vector | SerializedObject<"Vector">,
    addToSections: Array<Section | SerializedObject<"Section">>,
  ): string;
  addNodeGraphByText(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  addNodeTreeByText(text: string, indention: number, diffLocation: Vector | SerializedObject<"Vector">): void;
  addNodeMermaidByText(text: string, diffLocation: Vector | SerializedObject<"Vector">): void;
  addNodeByMarkdown(markdownText: string, diffLocation: Vector | SerializedObject<"Vector">, autoLayout: boolean): void;
  getIndentLevel(line: string, indention: number): number;
}
declare interface NodeConnector {
  readonly project: Project;
  isConnectable(
    fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
  ): boolean;
  connectConnectableEntity(
    fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    text: string,
    targetRectRate: undefined | [number, number],
    sourceRectRate: undefined | [number, number],
  ): void;
  connectEntityFast(
    fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    text: string,
  ): void;
  addCrEdge(
    fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
  ): void;
  addArcEdge(
    fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
  ): void;
  reverseEdges(edges: Array<LineEdge | SerializedObject<"LineEdge">>): void;
  changeEdgeTarget(
    edge: LineEdge | SerializedObject<"LineEdge">,
    newTarget: ConnectableEntity | SerializedObject<"ConnectableEntity">,
  ): void;
  changeEdgeSource(
    edge: LineEdge | SerializedObject<"LineEdge">,
    newSource: ConnectableEntity | SerializedObject<"ConnectableEntity">,
  ): void;
  changeSelectedEdgeTarget(newTarget: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
  changeSelectedEdgeSource(newSource: ConnectableEntity | SerializedObject<"ConnectableEntity">): void;
}
declare interface StageNodeRotate {
  readonly project: Project;
  moveEdges(
    lastMoveLocation: Vector | SerializedObject<"Vector">,
    diffLocation: Vector | SerializedObject<"Vector">,
  ): void;
  rotateNodeDfs(
    rotateCenterNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    currentNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    degrees: number,
    visitedUUIDs: Array<string>,
  ): void;
}
declare interface StageObjectColorManager {
  readonly project: Project;
  setSelectedStageObjectColor(color: Color | SerializedObject<"Color">, skipHistory: boolean): void;
  darkenNodeColor(): void;
  lightenNodeColor(): void;
}
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
  lastUpdateTimestamp: number;
  update(): void;
}
declare interface parserResult {
  isValid: boolean;
  invalidReason: string;
  fileName: string;
  sectionName: string;
}
declare interface ReferenceManager {
  readonly project: Project;
  onClickReferenceNumber(clickLocation: Vector | SerializedObject<"Vector">): void;
  buildSectionName2SectionMap(sectionNames: Array<string>): Record<string, Section>;
  updateOneSectionReferenceInfo(
    recentFiles: Array<RecentFile | SerializedObject<"RecentFile">>,
    sectionName: string,
  ): Promise<void>;
  updateCurrentProjectReference(): Promise<void>;
  checkReferenceBlockInProject(
    project: Project | SerializedObject<"Project">,
    fileName: string,
    sectionName: string,
  ): boolean;
  insertRefDataToSourcePrgFile(fileName: string, sectionName: string): Promise<void>;
  jumpToReferenceLocation(fileName: string, referenceBlockNodeSectionName: string): Promise<void>;
  openSectionReferencePanel(section: Section | SerializedObject<"Section">): void;
}
declare interface SectionInOutManager {
  readonly project: Project;
  goInSection(
    entities: Array<Entity | SerializedObject<"Entity">>,
    section: Section | SerializedObject<"Section">,
  ): void;
  goInSections(
    entities: Array<Entity | SerializedObject<"Entity">>,
    sections: Array<Section | SerializedObject<"Section">>,
  ): void;
  goOutSection(
    entities: Array<Entity | SerializedObject<"Entity">>,
    section: Section | SerializedObject<"Section">,
  ): void;
  attachEntityToSection(
    entity: Entity | SerializedObject<"Entity">,
    section: Section | SerializedObject<"Section">,
  ): boolean;
  entityDropParent(
    entity: Entity | SerializedObject<"Entity">,
    convertEmptySectionToTextNode: boolean,
    excludeSection: null | Section | SerializedObject<"Section">,
  ): boolean;
  sectionDropChild(
    section: Section | SerializedObject<"Section">,
    entity: Entity | SerializedObject<"Entity">,
    convertEmptySectionToTextNode: boolean,
  ): boolean;
  pickPreferredSection(sections: Array<Section | SerializedObject<"Section">>): Section | null;
  getSectionArea(section: Section | SerializedObject<"Section">): number;
  convertSectionToTextNode(section: Section | SerializedObject<"Section">): void;
}
declare interface SectionPackManager {
  readonly project: Project;
  packSection(): void;
  modifyHiddenDfs(section: Section | SerializedObject<"Section">, isCollapsed: boolean): void;
  unpackSection(): void;
  switchCollapse(): void;
  textNodeToSection(): void;
  textNodeTreeToSection(rootNode: TextNode | SerializedObject<"TextNode">): void;
  textNodeTreeToSectionNoDeep(rootNode: TextNode | SerializedObject<"TextNode">): void;
  targetTextNodeToSection(
    textNode: TextNode | SerializedObject<"TextNode">,
    ignoreEdges: boolean,
    addConnectPoints: boolean,
  ): Section;
  unpackSelectedSections(): void;
  unpackSections(entities: Array<Entity | SerializedObject<"Entity">>): void;
  packEntityToSection(addEntities: Array<Entity | SerializedObject<"Entity">>): Promise<Section | undefined>;
  createSectionFromSelectionRectangle(): Section | undefined;
  packSelectedEntitiesToSection(): Promise<Section | undefined>;
  getSmartSectionTitle(addEntities: Array<Entity | SerializedObject<"Entity">>): string;
}
declare interface StageSyncAssociationManager {
  readonly project: Project;
  createTwinsFromSelectedEntities(): void;
  getSyncAssociations(): SyncAssociation[];
  getSyncAssociationsByMember(member: StageObject | SerializedObject<"StageObject">): SyncAssociation[];
  getSyncSiblings(member: StageObject | SerializedObject<"StageObject">): StageObject[];
  createTwinTextNode(source: TextNode | SerializedObject<"TextNode">): TextNode;
  syncFrom(
    source: StageObject | SerializedObject<"StageObject">,
    key: "details" | "text" | "color",
    syncingSet: Set<string> | SerializedObject<"Set">,
  ): void;
  onStageObjectDeleted(deleted: StageObject | SerializedObject<"StageObject">): void;
}
declare interface TagManager {
  readonly project: Project;
  tagSet: Set<string>;
  reset(uuids: Array<string>): void;
  addTag(uuid: string): void;
  removeTag(uuid: string): void;
  hasTag(uuid: string): boolean;
  updateTags(): void;
  moveUpTag(uuid: string): void;
  moveDownTag(uuid: string): void;
  changeTagBySelected(): void;
  refreshTagNamesUI(): { tagName: string; uuid: string; color: [number, number, number, number] }[];
  moveCameraToTag(tagUUID: string): void;
}
declare interface HistoryManager {
  memoryEfficient: HistoryManagerAbs;
  timeEfficient: HistoryManagerAbs;
  currentManager: HistoryManagerAbs;
  recordStep(): void;
  undo(): void;
  redo(): void;
  get(index: number): Record<string, any>[];
  clearHistory(): void;
  switchMode(useTimeEfficient: boolean): void;
}
declare interface HistoryManagerAbs {
  recordStep(): void;
  undo(): void;
  redo(): void;
  get(index: number): Record<string, any>[];
  clearHistory(): void;
}
declare interface StageManager {
  rootSections: Section[];
  topLevelEntities: Entity[];
  normalizedCrossParentRelationCount: number;
  readonly project: Project;
  getRootSections(): Section[];
  getTopLevelEntities(): Entity[];
  getNormalizedCrossParentRelationCount(): number;
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
  updateReferences(): void;
  rebuildSectionRuntimeTree(): void;
  pickDirectParentSection(
    entity: Entity | SerializedObject<"Entity">,
    candidates: Array<Section | SerializedObject<"Section">>,
  ): Section | null;
  assignSectionRuntimeInfo(
    entity: Entity | SerializedObject<"Entity">,
    depth: number,
    lockedAncestor: null | Section | SerializedObject<"Section">,
  ): void;
  getEntityArea(entity: Entity | SerializedObject<"Entity">): number;
  getTextNodeByUUID(uuid: string): TextNode | null;
  getConnectableEntityByUUID(uuid: string): ConnectableEntity | null;
  isSectionByUUID(uuid: string): boolean;
  getSectionByUUID(uuid: string): Section | null;
  getCenter(): Vector;
  getSize(): Vector;
  getBoundingRectangle(): Rectangle;
  findTextNodeByLocation(location: Vector | SerializedObject<"Vector">): TextNode | null;
  findLineEdgeByLocation(location: Vector | SerializedObject<"Vector">): LineEdge | null;
  findAssociationByLocation(location: Vector | SerializedObject<"Vector">): Association | null;
  findSectionByLocation(location: Vector | SerializedObject<"Vector">): Section | null;
  findImageNodeByLocation(location: Vector | SerializedObject<"Vector">): ImageNode | null;
  findConnectableEntityByLocation(location: Vector | SerializedObject<"Vector">): ConnectableEntity | null;
  findEntityByLocation(location: Vector | SerializedObject<"Vector">): Entity | null;
  findEntityInHierarchyByLocation(
    entities: Array<Entity | SerializedObject<"Entity">>,
    location: Vector | SerializedObject<"Vector">,
    accept: (entity: Entity) => entity is T,
    prioritizePenStroke: boolean,
    sectionOnlyMode: boolean,
  ): T | null;
  findConnectPointByLocation(location: Vector | SerializedObject<"Vector">): ConnectPoint | null;
  isHaveEntitySelected(): boolean;
  getSelectedEntities(): Entity[];
  getSelectedAssociations(): Association[];
  getSelectedStageObjects(): StageObject[];
  getBoundingBoxOfSelected(): Rectangle;
  isEntityOnLocation(location: Vector | SerializedObject<"Vector">): boolean;
  isAssociationOnLocation(location: Vector | SerializedObject<"Vector">): boolean;
  deleteEntities(deleteNodes: Array<Entity | SerializedObject<"Entity">>): void;
  deleteSelectedStageObjects(): void;
  deleteAssociation(deleteAssociation: Association | SerializedObject<"Association">): boolean;
  deleteEdge(deleteEdge: Edge | SerializedObject<"Edge">): boolean;
  connectEntity(
    fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    isCrEdge: boolean,
  ): boolean;
  connectMultipleEntities(
    fromNodes: Array<ConnectableEntity | SerializedObject<"ConnectableEntity">>,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    isCrEdge: boolean,
    sourceRectRate: undefined | [number, number],
    targetRectRate: undefined | [number, number],
    isArcEdge: boolean,
  ): boolean;
  reverseSelectedEdges(): void;
  generateNodeTreeByText(text: string, indention: number, location: Vector | SerializedObject<"Vector">): void;
  generateNodeGraphByText(text: string, location: Vector | SerializedObject<"Vector">): void;
  generateNodeMermaidByText(text: string, location: Vector | SerializedObject<"Vector">): void;
  generateNodeByMarkdown(text: string, location: Vector | SerializedObject<"Vector">, autoLayout: boolean): void;
  packEntityToSection(addEntities: Array<Entity | SerializedObject<"Entity">>): Promise<void>;
  packEntityToSectionBySelected(): Promise<void>;
  goInSection(
    entities: Array<Entity | SerializedObject<"Entity">>,
    section: Section | SerializedObject<"Section">,
  ): void;
  goOutSection(
    entities: Array<Entity | SerializedObject<"Entity">>,
    section: Section | SerializedObject<"Section">,
  ): void;
  packSelectedSection(): void;
  unpackSelectedSection(): void;
  sectionSwitchCollapse(): void;
  connectEntityByCrEdge(
    fromNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
    toNode: ConnectableEntity | SerializedObject<"ConnectableEntity">,
  ): void;
  refreshAllStageObjects(): void;
  refreshSelected(): void;
  changeSelectedEdgeConnectLocation(
    direction: null | Direction.Up | Direction.Down | Direction.Left | Direction.Right,
    isSource: boolean,
  ): void;
  changeEdgesConnectLocation(
    edges: Array<Edge | SerializedObject<"Edge">>,
    direction: null | Direction.Up | Direction.Down | Direction.Left | Direction.Right,
    isSource: boolean,
  ): void;
  switchLineEdgeToCrEdge(): void;
  switchEdgeToUndirectedEdge(): void;
  switchEdgeToArcEdge(): void;
  switchUndirectedEdgeToEdge(): void;
  addSelectedCREdgeControlPoint(): void;
  addSelectedCREdgeTension(): void;
  reduceSelectedCREdgeTension(): void;
  setSelectedEdgeLineType(lineType: string): void;
  setSelectedEdgeArrowType(arrowType: string): void;
  selectAll(): void;
  clearSelectAll(): void;
}
declare interface Association {
  associationList: StageObject[];
  color: Color;
  readonly project: Project;
  uuid: string;
  collisionBox: CollisionBox;
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  _isSyncing: boolean;
}
declare interface ConnectableAssociation {
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  color: Color;
  readonly project: Project;
  uuid: string;
  collisionBox: CollisionBox;
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  _isSyncing: boolean;
}
declare interface ConnectableEntity {
  geometryCenter: Vector;
  unknown: boolean;
  move(delta: Vector | SerializedObject<"Vector">): void;
  isAlignExcluded: boolean;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  isHiddenBySectionCollapse: boolean;
  detailsManager: DetailsManager;
  readonly project: Project;
  uuid: string;
  collisionBox: CollisionBox;
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  _isSyncing: boolean;
}
declare interface Entity {
  move(delta: Vector | SerializedObject<"Vector">): void;
  isAlignExcluded: boolean;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  isHiddenBySectionCollapse: boolean;
  detailsManager: DetailsManager;
  readonly project: Project;
  uuid: string;
  collisionBox: CollisionBox;
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  _isSyncing: boolean;
}
declare interface StageObject {
  readonly project: Project;
  uuid: string;
  collisionBox: CollisionBox;
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  _isSyncing: boolean;
}
declare interface ResizeAble {
  resizeHandle(delta: Vector | SerializedObject<"Vector">): void;
  getResizeHandleRect(): Rectangle;
}
declare interface ArcEdge {
  uuid: string;
  text: string;
  color: Color;
  lineType: string;
  arrowType: string;
  offset: number;
  textPosition: number;
  arcGeometry: ArcGeometry;
  clippedStart: Vector;
  clippedEnd: Vector;
  getArrowDirection(): Vector;
  getSourceDirection(): Vector;
  collisionBox: CollisionBox;
  edgeWidth: number;
  textFontSize: number;
  textRectangle: Rectangle;
  getArcMidPoint(): Vector;
  readonly project: Project;
  unknown: boolean;
  adjustSizeByText(): void;
  isHiddenBySectionCollapse: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  bodyLine: Line;
  sourceLocation: Vector;
  targetLocation: Vector;
  targetRectangleRate: Vector;
  sourceRectangleRate: Vector;
  rename(text: string): void;
  isIntersectsWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isIntersectsWithLocation(location: Vector | SerializedObject<"Vector">): boolean;
  isIntersectsWithLine(line: Line | SerializedObject<"Line">): boolean;
  isLeftToRight(): boolean;
  isRightToLeft(): boolean;
  isTopToBottom(): boolean;
  isBottomToTop(): boolean;
  isUnknownDirection(): boolean;
  isNonStandardDirection(): boolean;
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  isPhysical: boolean;
  _isSyncing: boolean;
}
declare interface ArcGeometry {
  center: Vector;
  radius: number;
  startAngle: number;
  endAngle: number;
  counterclockwise: boolean;
}
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
  textRectangle: Rectangle;
  autoUpdateControlPoints(): void;
  getArrowHead(): { location: Vector; direction: Vector };
  adjustSizeByText(): void;
  isHiddenBySectionCollapse: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  bodyLine: Line;
  sourceLocation: Vector;
  targetLocation: Vector;
  targetRectangleRate: Vector;
  sourceRectangleRate: Vector;
  rename(text: string): void;
  isIntersectsWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isIntersectsWithLocation(location: Vector | SerializedObject<"Vector">): boolean;
  isIntersectsWithLine(line: Line | SerializedObject<"Line">): boolean;
  isLeftToRight(): boolean;
  isRightToLeft(): boolean;
  isTopToBottom(): boolean;
  isBottomToTop(): boolean;
  isUnknownDirection(): boolean;
  isNonStandardDirection(): boolean;
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  isPhysical: boolean;
  _isSyncing: boolean;
}
declare interface Edge {
  uuid: string;
  text: string;
  collisionBox: CollisionBox;
  isHiddenBySectionCollapse: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  textRectangle: Rectangle;
  bodyLine: Line;
  sourceLocation: Vector;
  targetLocation: Vector;
  targetRectangleRate: Vector;
  sourceRectangleRate: Vector;
  adjustSizeByText(): void;
  rename(text: string): void;
  isIntersectsWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isIntersectsWithLocation(location: Vector | SerializedObject<"Vector">): boolean;
  isIntersectsWithLine(line: Line | SerializedObject<"Line">): boolean;
  isLeftToRight(): boolean;
  isRightToLeft(): boolean;
  isTopToBottom(): boolean;
  isBottomToTop(): boolean;
  isUnknownDirection(): boolean;
  isNonStandardDirection(): boolean;
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  color: Color;
  readonly project: Project;
  isPhysical: boolean;
  _isSyncing: boolean;
}
declare interface LineEdge {
  uuid: string;
  text: string;
  color: Color;
  lineType: string;
  arrowType: string;
  collisionBox: CollisionBox;
  shiftingIndex: number;
  _shiftingIndex: number;
  readonly project: Project;
  unknown: boolean;
  rename(text: string): void;
  edgeWidth: number;
  textFontSize: number;
  textRectangle: Rectangle;
  shiftingMidPoint: Vector;
  adjustSizeByText(): void;
  isHiddenBySectionCollapse: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  bodyLine: Line;
  sourceLocation: Vector;
  targetLocation: Vector;
  targetRectangleRate: Vector;
  sourceRectangleRate: Vector;
  isIntersectsWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isIntersectsWithLocation(location: Vector | SerializedObject<"Vector">): boolean;
  isIntersectsWithLine(line: Line | SerializedObject<"Line">): boolean;
  isLeftToRight(): boolean;
  isRightToLeft(): boolean;
  isTopToBottom(): boolean;
  isBottomToTop(): boolean;
  isUnknownDirection(): boolean;
  isNonStandardDirection(): boolean;
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  isPhysical: boolean;
  _isSyncing: boolean;
}
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
  unknown: boolean;
  centerLocation: Vector;
  textRectangle: Rectangle;
  _isSelected: boolean;
  isSelected: boolean;
  associationList: ConnectableEntity[];
  reverse(): void;
  target: ConnectableEntity;
  source: ConnectableEntity;
  isPhysical: boolean;
  _isSyncing: boolean;
}
declare type MultiTargetUndirectedEdgeRenderType = "line" | "convex" | "circle";
declare type UndirectedEdgeArrowShape =
  | "default"
  | "hollow-triangle"
  | "filled-triangle"
  | "hollow-diamond"
  | "filled-diamond";
declare type UndirectedEdgeArrowType = "inner" | "outer" | "none";
declare type UndirectedEdgeLineType = "solid" | "dashed" | "double";
declare type SyncableKey = "text" | "color" | "details";
declare interface SyncAssociation {
  uuid: string;
  keys: SyncableKey[];
  associationList: StageObject[];
  collisionBox: CollisionBox;
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  readonly project: Project;
  unknown: boolean;
  applyFrom(source: StageObject | SerializedObject<"StageObject">): void;
  color: Color;
  _isSyncing: boolean;
}
declare interface CollisionBox {
  shapes: Shape[];
  updateShapeList(shapes: Array<Shape | SerializedObject<"Shape">>): void;
  isContainsPoint(location: Vector | SerializedObject<"Vector">): boolean;
  isIntersectsWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isContainedByRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isIntersectsWithLine(line: Line | SerializedObject<"Line">): boolean;
  getRectangle(): Rectangle;
}
declare interface ConnectPoint {
  geometryCenter: Vector;
  isHiddenBySectionCollapse: boolean;
  collisionBox: CollisionBox;
  uuid: string;
  radius: number;
  _isSelected: boolean;
  isSelected: boolean;
  readonly project: Project;
  unknown: boolean;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  isAlignExcluded: boolean;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  isPhysical: boolean;
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
  _lastRenderedPixelRatio: number;
  readonly project: Project;
  rectangle: Rectangle;
  location: Vector;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  markDirty(): void;
  setCustomData(data: any): void;
  unknown: boolean;
  isAlignExcluded: boolean;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  _isSyncing: boolean;
}
declare interface ExtensionEntityConfig {
  initialData: any;
  collisionBox: CollisionBox;
}
declare interface ImageNode {
  isHiddenBySectionCollapse: boolean;
  uuid: string;
  collisionBox: CollisionBox;
  attachmentId: string;
  scale: number;
  isBackground: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  bitmap: ImageBitmap | undefined;
  state: "loading" | "success" | "notFound";
  readonly project: Project;
  unknown: boolean;
  onReady?: (() => void) | undefined;
  scaleUpdate(scaleDiff: number): void;
  rectangle: Rectangle;
  geometryCenter: Vector;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  reverseColors(): void;
  swapRedBlueChannels(): void;
  compressImage(): void;
  resizeHandle(delta: Vector | SerializedObject<"Vector">): void;
  getResizeHandleRect(): Rectangle;
  isAlignExcluded: boolean;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  isPhysical: boolean;
  _isSyncing: boolean;
}
declare interface LatexNode {
  uuid: string;
  latexSource: string;
  collisionBox: CollisionBox;
  color: Color;
  fontScaleLevel: number;
  isHiddenBySectionCollapse: boolean;
  image: HTMLImageElement;
  svgOriginalSize: Vector;
  state: "loading" | "error" | "success";
  currentRenderedColorCss: string;
  _isSelected: boolean;
  isSelected: boolean;
  rectangle: Rectangle;
  geometryCenter: Vector;
  readonly project: Project;
  getScale(): number;
  increaseFontSize(anchorRate: undefined | Vector | SerializedObject<"Vector">): void;
  decreaseFontSize(anchorRate: undefined | Vector | SerializedObject<"Vector">): void;
  updateCollisionBoxByScale(anchorRate: undefined | Vector | SerializedObject<"Vector">): void;
  _adjustLocationToKeepAnchor(
    oldRect: Rectangle | SerializedObject<"Rectangle">,
    anchorRate: Vector | SerializedObject<"Vector">,
  ): void;
  updateLatex(newLatex: string, colorCss: undefined | string): Promise<void>;
  reRenderWithColor(colorCss: string): Promise<void>;
  renderLatexToImage(latex: string, colorCss: string): Promise<void>;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  unknown: boolean;
  isAlignExcluded: boolean;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  isPhysical: boolean;
  _isSyncing: boolean;
}
declare interface PenStroke {
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
  getCollisionBoxFromSegmentList(
    segmentList: Array<PenStrokeSegment | SerializedObject<"PenStrokeSegment">>,
  ): CollisionBox;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  _isSyncing: boolean;
}
declare interface PenStrokeSegment {
  location: Vector;
  pressure: number;
}
declare interface ReferenceBlockNode {
  isHiddenBySectionCollapse: boolean;
  uuid: string;
  collisionBox: CollisionBox;
  fileName: string;
  sectionName: string;
  scale: number;
  attachmentId: string;
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
  refresh(): Promise<void>;
  goToSource(): Promise<void>;
  focusSectionInProject(project: Project | SerializedObject<"Project">): void;
  resizeHandle(delta: Vector | SerializedObject<"Vector">): void;
  getResizeHandleRect(): Rectangle;
  isAlignExcluded: boolean;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  isPhysical: boolean;
  _isSyncing: boolean;
}
declare interface Section {
  _isSelected: boolean;
  uuid: string;
  _isEditingTitle: boolean;
  _collisionBoxWhenCollapsed: CollisionBox;
  _collisionBoxNormal: CollisionBox;
  isEditingTitle: boolean;
  collisionBox: CollisionBox;
  collapsedCollisionBox(): CollisionBox;
  color: Color;
  text: string;
  children: Entity[];
  isCollapsed: boolean;
  locked: boolean;
  borderStyle: "none" | "solid" | "dashed";
  isHiddenBySectionCollapse: boolean;
  readonly project: Project;
  unknown: boolean;
  rename(newName: string): void;
  adjustLocationAndSize(): void;
  adjustChildrenStateByCollapse(parentCollapsed: boolean): void;
  isSelected: boolean;
  rectangle: Rectangle;
  geometryCenter: Vector;
  move(delta: Vector | SerializedObject<"Vector">): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  isAlignExcluded: boolean;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  detailsManager: DetailsManager;
  isPhysical: boolean;
  _isSyncing: boolean;
}
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
  changeColor(newColor: Color | SerializedObject<"Color">, mode: "fill" | "stroke"): Promise<void>;
  resizeHandle(delta: Vector | SerializedObject<"Vector">): void;
  getResizeHandleRect(): Rectangle;
  unknown: boolean;
  isAlignExcluded: boolean;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  _isSyncing: boolean;
}
declare interface TextNode {
  uuid: string;
  text: string;
  collisionBox: CollisionBox;
  color: Color;
  fontScaleLevel: number;
  sizeAdjust: string;
  fontFamily: string;
  fontWeight: string;
  _isSelected: boolean;
  isSelected: boolean;
  rectangle: Rectangle;
  geometryCenter: Vector;
  _isEditing: boolean;
  isEditing: boolean;
  isHiddenBySectionCollapse: boolean;
  readonly project: Project;
  unknown: boolean;
  fontSizeCache: number;
  getFontSize(): number;
  getPadding(): number;
  getBorderWidth(): number;
  getBorderRadius(): number;
  updateFontSizeCache(): void;
  setFontScaleLevel(level: number): void;
  increaseFontSize(anchorRate: undefined | Vector | SerializedObject<"Vector">): void;
  decreaseFontSize(anchorRate: undefined | Vector | SerializedObject<"Vector">): void;
  _adjustLocationToKeepAnchor(
    oldRect: Rectangle | SerializedObject<"Rectangle">,
    anchorRate: Vector | SerializedObject<"Vector">,
  ): void;
  adjustSizeByText(): void;
  adjustHeightByText(): void;
  forceAdjustSizeByText(): void;
  forceAdjustHeightByText(): void;
  rename(text: string): void;
  resizeHandle(delta: Vector | SerializedObject<"Vector">): void;
  resizeWidthTo(width: number): void;
  getResizeHandleRect(): Rectangle;
  move(delta: Vector | SerializedObject<"Vector">): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  isAlignExcluded: boolean;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  detailsManager: DetailsManager;
  isPhysical: boolean;
  _isSyncing: boolean;
}
declare interface UrlNode {
  uuid: string;
  title: string;
  url: string;
  color: Color;
  collisionBox: CollisionBox;
  _isEditingTitle: boolean;
  isMouseHoverTitle: boolean;
  isMouseHoverUrl: boolean;
  isEditingTitle: boolean;
  geometryCenter: Vector;
  titleRectangle: Rectangle;
  urlRectangle: Rectangle;
  rectangle: Rectangle;
  move(delta: Vector | SerializedObject<"Vector">): void;
  moveTo(location: Vector | SerializedObject<"Vector">): void;
  isHiddenBySectionCollapse: boolean;
  readonly project: Project;
  rename(title: string): void;
  adjustSizeByText(): void;
  unknown: boolean;
  isAlignExcluded: boolean;
  details: Value;
  parentSection: Section | null;
  sectionDepth: number;
  nearestLockedAncestorSection: Section | null;
  isMouseHover: boolean;
  detailsButtonRectangle(): Rectangle;
  isMouseInDetailsButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  referenceButtonCircle(): Circle;
  isMouseInReferenceButton(mouseWorldLocation: Vector | SerializedObject<"Vector">): boolean;
  updateFatherSectionByMove(): void;
  updateOtherEntityLocationByMove(): void;
  collideWithOtherEntity(other: Entity | SerializedObject<"Entity">): void;
  detailsManager: DetailsManager;
  isPhysical: boolean;
  _isSelected: boolean;
  isSelected: boolean;
  _isSyncing: boolean;
}
declare interface Tab {
  eventEmitter: EventEmitter<any>;
  readonly services: Map<string, Service>;
  readonly fileSystemProviders: Map<string, FileSystemProvider>;
  readonly tickableServices: Service[];
  rafHandle: number;
  lastTickTime: number;
  getComponent(): ComponentType<{}>;
  title: string;
  icon: ComponentType<any> | null;
  registerFileSystemProvider(scheme: string, provider: new (...args: any[]) => FileSystemProvider): void;
  fs: FileSystemProvider;
  on(event: string | number, listener: (...args: any[]) => void): Tab;
  emit(event: string | number, ...args: Array<any>): boolean;
  removeAllListeners(event: undefined | string | number): Tab;
  loadService(service: { new (...args: any[]): any; id?: string | undefined }): void;
  disposeService(serviceId: string): void;
  getService(serviceId: T | SerializedObject<"T">): Tab[T];
  init(): Promise<void>;
  loop(): void;
  pause(): void;
  tick(): void;
  dispose(): Promise<void>;
  isRunning: boolean;
  render(): ReactNode;
  context: unknown;
  setState(
    state:
      | null
      | Record<string, never>
      | SerializedObject<"Record">
      | ((
          prevState: Readonly<Record<string, never>>,
          props: Readonly<Record<string, never>>,
        ) => Record<string, never> | Pick<Record<string, never>, K> | null)
      | Pick<Record<string, never>, K>
      | SerializedObject<"Pick">,
    callback: undefined | (() => void),
  ): void;
  forceUpdate(callback: undefined | (() => void)): void;
  readonly props: Readonly<Record<string, never>>;
  state: Readonly<Record<string, never>>;
  componentDidMount?: (() => void) | undefined;
  shouldComponentUpdate?:
    | ((
        nextProps: Readonly<Record<string, never>>,
        nextState: Readonly<Record<string, never>>,
        nextContext: any,
      ) => boolean)
    | undefined;
  componentWillUnmount?: (() => void) | undefined;
  componentDidCatch?: ((error: Error, errorInfo: ErrorInfo) => void) | undefined;
  getSnapshotBeforeUpdate?:
    | ((prevProps: Readonly<Record<string, never>>, prevState: Readonly<Record<string, never>>) => any)
    | undefined;
  componentDidUpdate?:
    | ((prevProps: Readonly<Record<string, never>>, prevState: Readonly<Record<string, never>>, snapshot?: any) => void)
    | undefined;
  componentWillMount?: (() => void) | undefined;
  UNSAFE_componentWillMount?: (() => void) | undefined;
  componentWillReceiveProps?: ((nextProps: Readonly<Record<string, never>>, nextContext: any) => void) | undefined;
  UNSAFE_componentWillReceiveProps?:
    | ((nextProps: Readonly<Record<string, never>>, nextContext: any) => void)
    | undefined;
  componentWillUpdate?:
    | ((
        nextProps: Readonly<Record<string, never>>,
        nextState: Readonly<Record<string, never>>,
        nextContext: any,
      ) => void)
    | undefined;
  UNSAFE_componentWillUpdate?:
    | ((
        nextProps: Readonly<Record<string, never>>,
        nextState: Readonly<Record<string, never>>,
        nextContext: any,
      ) => void)
    | undefined;
}
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
declare enum Direction {
  Up,
  Down,
  Left,
  Right,
}
declare interface ExtensionMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
}
declare interface PrgMetadata {
  version: string;
  extension?: ExtensionMetadata | undefined;
}
declare type Association = StageObject & {
  text: string;
  color: Color;
};
declare type Color = [number, number, number, number];
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
  sourceRectRate: [number, number]; // 默认中心 0.5, 0.5
  targetRectRate: [number, number]; // 默认中心 0.5, 0.5
};
declare type StageObject = {
  uuid: string;
  type: string;
};
declare type Vector = [number, number];
declare interface MarkdownNode {
  title: string;
  content: string;
  children: MarkdownNode[];
}
declare interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
  toString(): string;
  toHexString(): string;
  toHexStringWithoutAlpha(): string;
  clone(): Color;
  toTransparent(): Color;
  toSolid(): Color;
  toNewAlpha(a: number): Color;
  equals(color: Color | SerializedObject<"Color">): boolean;
  toArray(): [number, number, number, number];
  desaturate(amount: number): Color;
  toColdLowSaturation(): Color;
  rgbToHsl(): { h: number; s: number; l: number };
  hslToRgb: any;
  hueToRgb: any;
  changeHue(deHue: number): Color;
}
declare interface LimitLengthQueue<T> {
  limitLength: any;
  enqueue(element: T | SerializedObject<"T">): void;
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
declare interface LruCache<K, V> {
  readonly capacity: any;
  set(key: K | SerializedObject<"K">, value: V | SerializedObject<"V">): LruCache<K, V>;
  get(key: K | SerializedObject<"K">): V | undefined;
  clear(): void;
  delete(key: K | SerializedObject<"K">): boolean;
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg: any): void;
  has(key: K | SerializedObject<"K">): boolean;
  readonly size: number;
  entries(): MapIterator<[K, V]>;
  keys(): MapIterator<K>;
  values(): MapIterator<V>;
  "__@iterator@297"(): MapIterator<[K, V]>;
  readonly "__@toStringTag@889": string;
}
declare interface ProgressNumber {
  curValue: number;
  maxValue: number;
  percentage: number;
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
  magnitude(): number;
  normalize(): Vector;
  dot(vector: Vector | SerializedObject<"Vector">): number;
  getPerpendicular(): Vector;
  rotate(angle: number): Vector;
  rotateDegrees(degrees: number): Vector;
  angle(vector: Vector | SerializedObject<"Vector">): number;
  angleTo(vector: Vector | SerializedObject<"Vector">): number;
  angleToSigned(vector: Vector | SerializedObject<"Vector">): number;
  distance(vector: Vector | SerializedObject<"Vector">): number;
  cross(other: Vector | SerializedObject<"Vector">): number;
  componentMultiply(other: Vector | SerializedObject<"Vector">): Vector;
  splitVector(splitCount: number, splitDegrees: number): Vector[];
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
declare interface Circle {
  location: Vector;
  radius: number;
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithLine(line: Line | SerializedObject<"Line">): boolean;
  getRectangle(): Rectangle;
  toString(): string;
}
declare interface CubicBezierCurve {
  start: Vector;
  ctrlPt1: Vector;
  ctrlPt2: Vector;
  end: Vector;
  toString(): string;
  getPointByT(t: number): Vector;
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithLine(l: Line | SerializedObject<"Line">): boolean;
  getRectangle(): Rectangle;
}
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
  computeFunction(): { equation: (t: number) => Vector; derivative: (t: number) => Vector }[];
}
declare interface IntersectionResult {
  intersects: boolean;
  point?: Vector | undefined;
}
declare interface Line {
  start: Vector;
  end: Vector;
  toString(): string;
  length(): number;
  midPoint(): Vector;
  direction(): Vector;
  isPointNearLine(point: Vector | SerializedObject<"Vector">, tolerance: undefined | number): boolean;
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithLine(line: Line | SerializedObject<"Line">): boolean;
  isParallel(other: Line | SerializedObject<"Line">): boolean;
  isCollinear(other: Line | SerializedObject<"Line">): boolean;
  isIntersectingWithHorizontalLine(y: number, xLeft: number, xRight: number): boolean;
  getRectangle(): Rectangle;
  isIntersectingWithVerticalLine(x: number, yBottom: number, yTop: number): boolean;
  getIntersectingWithHorizontalLine(y: number, xLeft: number, xRight: number): IntersectionResult;
  getIntersectingWithVerticalLine(x: number, yBottom: number, yTop: number): IntersectionResult;
  isIntersectingWithCircle(circle: Circle | SerializedObject<"Circle">): boolean;
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
  expandFromCenter(amount: number): Rectangle;
  clone(): Rectangle;
  getBoundingLines(): Line[];
  getFroePoints(): Vector[];
  isCollideWith(other: Rectangle | SerializedObject<"Rectangle">): boolean;
  isAbsoluteIn(otherBig: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithLine(line: Line | SerializedObject<"Line">): boolean;
  getCollidePointsWithLine(line: Line | SerializedObject<"Line">): Vector[];
  isInOther(other: Rectangle | SerializedObject<"Rectangle">): boolean;
  getOverlapSize(other: Rectangle | SerializedObject<"Rectangle">): Vector;
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  multiply(scale: number): Rectangle;
  toString(): string;
  getCenter(): Vector;
  getLineIntersectionPoint(line: Line | SerializedObject<"Line">): Vector;
  getNormalVectorAt(point: Vector | SerializedObject<"Vector">): Vector;
  translate(offset: Vector | SerializedObject<"Vector">): Rectangle;
  limit(limit: Rectangle | SerializedObject<"Rectangle">): Rectangle;
}
declare interface Shape {
  isPointIn(point: Vector | SerializedObject<"Vector">): boolean;
  isCollideWithRectangle(rectangle: Rectangle | SerializedObject<"Rectangle">): boolean;
  isCollideWithLine(line: Line | SerializedObject<"Line">): boolean;
  getRectangle(): Rectangle;
}
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
type AutoProxyValue<T> = T extends readonly (infer Item)[]
  ? AutoProxyArrayItem<Item>[]
  : T extends object
    ? AutoProxy<T>
    : T;
type AutoProxyMethod<T> = T extends (...args: infer Args) => infer Result
  ? (...args: Args) => Promise<AutoProxyValue<Awaited<Result>>>
  : never;
type AutoProxy<T> = T extends object
  ? {
      [Key in keyof T]: T[Key] extends (...args: any[]) => any
        ? AutoProxyMethod<T[Key]>
        : Promise<AutoProxyValue<T[Key]>>;
    } & ProxyMethods
  : T;

export type ExtensionHostApi = {
  toast(message: string): Promise<void>;
  toast_success(message: string): Promise<void>;
  toast_error(message: string): Promise<void>;
  toast_warning(message: string): Promise<void>;
  dialog_confirm(
    title: undefined | string,
    description: undefined | string,
    options: undefined | { destructive?: boolean | undefined } | SerializedObject<"__object">,
  ): Promise<boolean>;
  dialog_input(
    title: undefined | string,
    description: undefined | string,
    options:
      | undefined
      | {
          defaultValue?: string | undefined;
          placeholder?: string | undefined;
          destructive?: boolean | undefined;
          multiline?: boolean | undefined;
        }
      | SerializedObject<"__object">,
  ): Promise<string | undefined>;
  dialog_copy(title: undefined | string, description: undefined | string, value: undefined | string): Promise<void>;
  dialog_buttons(
    title: string,
    description: string,
    buttons: Buttons | SerializedObject<"Buttons">,
  ): Promise<Buttons[number]["id"]>;
  fetch(
    input: string | URL | SerializedObject<"URL"> | Request | SerializedObject<"Request">,
    init: undefined | (RequestInit & ClientOptions),
  ): Promise<Response>;
  fetch_base64(url: string): Promise<string>;
  fetch_json(url: string): Promise<unknown>;
  fetch_binary(url: string): Promise<{ buffer: Uint8Array<ArrayBufferLike>; mimeType: string }>;
  shell_execute(
    program: string,
    args: undefined | Array<string>,
    stdin: undefined | string,
  ): Promise<{ code: number | null; stdout: string; stderr: string }>;
  settings_getOwn(key: string): Promise<any>;
  settings_setOwn(key: string, value: unknown): Promise<void>;
  settings_getGlobal(key: string): Promise<any>;
  settings_setGlobal(key: string, value: unknown): Promise<any>;
  keybinds_register(
    id: string,
    icon: LucideIcon | { $lucide: string },
    defaultKey: string,
    onPress: () => void,
    onRelease: undefined | (() => void),
    isContinuous: undefined | false | true,
  ): Promise<void>;
  keybinds_unregisterAll(): Promise<void>;
  themes_register(
    id: string,
    name: string,
    description: undefined | string,
    type: "light" | "dark",
    themeContent: any,
  ): Promise<void>;
  tabs_getAll(): Array<Promise<AutoProxy<Tab>>>;
  tabs_getAllProjects(): Array<Promise<AutoProxy<Project>>>;
  tabs_getCurrent(): Promise<null | AutoProxy<Tab>>;
  tabs_getCurrentProject(): Promise<null | AutoProxy<Project>>;
  entity_registerType(
    typeName: string,
    initialData: any,
    collisionBox: CollisionBox | SerializedObject<"CollisionBox">,
    renderFn: (data: any) => Promise<ImageBitmap>,
  ): Promise<void>;
  entity_onClick(typeName: string, handler: (payload: ClickEventPayload) => void): Promise<void>;
  entity_create(typeName: string, data: any, location: { x: number; y: number }): Promise<AutoProxy<ExtensionEntity>>;
  form(
    schema: JSONSchema | SerializedObject<"JSONSchema">,
    options: { title: string; confirmText?: string | undefined; cancelText?: string | undefined },
  ): Promise<Record<string, unknown>>;
};

declare global {
  const prg: ExtensionHostApi;
  interface Window {
    prg: ExtensionHostApi;
  }
  interface DedicatedWorkerGlobalScope {
    prg: ExtensionHostApi;
  }
}
