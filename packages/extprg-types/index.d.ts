/* eslint-disable */
// @ts-nocheck

/**
 * Auto-generated. Do not edit manually.
 * 2026-05-12T12:57:55.114Z
 */

// ── 第三方类型导入 ──
import type { Color, LimitLengthQueue, LruCache, ProgressNumber, Vector } from "@graphif/data-structures";
import type {
  Circle,
  CubicBezierCurve,
  CubicCatmullRomSpline,
  Line,
  Rectangle,
  Shape,
  SymmetryCurve,
} from "@graphif/shapes";
import type { DirEntry } from "@tauri-apps/plugin-fs";
import type { fetch } from "@tauri-apps/plugin-http";
import type { Store } from "@tauri-apps/plugin-store";
import type { LucideProps } from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { URI } from "vscode-uri";

// ── 本地类型定义 ──
declare class AIEngine {
  createTransport(project: Project | { _: "Project" | (string & {}) }): Promise<void>;
  createChatFetch(project: Project | { _: "Project" | (string & {}) }): Promise<typeof fetch>;
  getModels(): Promise<void>;
  readRequestBody(body: BodyInit | null | undefined): Promise<any>;
}

declare class Association extends StageObject {
  associationList: Promise<StageObject>[];
  color: Promise<Color>;
}

declare class AutoAlign {
  constructor(project: Project | { _: "Project" | (string & {}) });
  getSelectionOuterRectangle(entities: Entity[]): Promise<Rectangle | null>;
  calculateDistanceByRectangle(
    rectA: Rectangle | { _: "Rectangle" | (string & {}) },
    rectB: Rectangle | { _: "Rectangle" | (string & {}) },
  ): Promise<void>;
  alignRectangleToTargetX(
    selectedRect: Rectangle | { _: "Rectangle" | (string & {}) },
    otherRect: Rectangle | { _: "Rectangle" | (string & {}) },
  ): Promise<number>;
  alignRectangleToTargetY(
    selectedRect: Rectangle | { _: "Rectangle" | (string & {}) },
    otherRect: Rectangle | { _: "Rectangle" | (string & {}) },
  ): Promise<number>;
  _addAlignEffectByRect(
    selectedRect: Rectangle | { _: "Rectangle" | (string & {}) },
    otherRect: Rectangle | { _: "Rectangle" | (string & {}) },
  ): Promise<void>;
  getGridSnapDeltaX(rect: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  getGridSnapDeltaY(rect: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  alignAllSelectedToGrid(): Promise<void>;
  alignAllSelected(): Promise<void>;
  preAlignAllSelected(): Promise<void>;
  onEntityMoveAlignToGrid(selectedEntity: Entity | { _: "Entity" | (string & {}) }): Promise<void>;
  onEntityMoveAlignToGridX(selectedEntity: Entity | { _: "Entity" | (string & {}) }): Promise<void>;
  onEntityMoveAlignToGridY(selectedEntity: Entity | { _: "Entity" | (string & {}) }): Promise<void>;
  onEntityMoveAlignToOtherEntity(
    selectedEntity: Entity | { _: "Entity" | (string & {}) },
    otherEntities: Entity[],
    isPreAlign = false,
  ): Promise<void>;
  _addAlignEffect(
    selectedEntity: Entity | { _: "Entity" | (string & {}) },
    otherEntity: Entity | { _: "Entity" | (string & {}) },
  ): Promise<void>;
  onEntityMoveAlignToTargetEntityX(
    selectedEntity: Entity | { _: "Entity" | (string & {}) },
    otherEntity: Entity | { _: "Entity" | (string & {}) },
    isPreAlign = false,
  ): Promise<number>;
  onEntityMoveAlignToTargetEntityY(
    selectedEntity: Entity | { _: "Entity" | (string & {}) },
    otherEntity: Entity | { _: "Entity" | (string & {}) },
    isPreAlign = false,
  ): Promise<number>;
  calculateDistance(
    entityA: Entity | { _: "Entity" | (string & {}) },
    entityB: Entity | { _: "Entity" | (string & {}) },
  ): Promise<void>;
  autoLayoutSelectedFastTreeMode(
    selectedRootEntity: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<void>;
}

declare class AutoCompleteManager {
  currentWindowId: Promise<string | undefined>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  handle;
  openWindow(
    node: TextNode,
    entries: Record<string, string>,
    onSelect: (value: string) => void,
    setWindowId: (id: string) => void,
  ): Promise<void>;
  handleLogic(text: string, node: TextNode, ele: HTMLTextAreaElement, setWindowId: (id: string) => void): Promise<void>;
  handleReference;
  handleReferenceFile(
    searchText: string,
    node: TextNode,
    ele: HTMLTextAreaElement,
    setWindowId: (id: string) => void,
  ): Promise<void>;
  handleReferenceSection(
    searchText: string,
    node: TextNode,
    ele: HTMLTextAreaElement,
    setWindowId: (id: string) => void,
  ): Promise<void>;
}

declare class AutoCompute {
  MapOperationNameFunction: Promise<StringFunctionMap>;
  MapNameFunction: Promise<StringFunctionMap>;
  MapVariableFunction: Promise<VariableFunctionMap>;
  MapOtherFunction: Promise<OtherFunctionMap>;
  variables;
  constructor(project: Project | { _: "Project" | (string & {}) });
  tickNumber;
  tick(): Promise<void>;
  funcTypeTrans(mF: MathFunctionType): Promise<StringFunctionType>;
  isTextNodeLogic(node: TextNode | { _: "TextNode" | (string & {}) }): Promise<boolean>;
  isSectionLogic(section: Section | { _: "Section" | (string & {}) }): Promise<boolean>;
  sortEntityByLocation(entities: ConnectableEntity[]): Promise<ConnectableEntity>[];
  computeTextNode(node: TextNode | { _: "TextNode" | (string & {}) }): Promise<void>;
  computeSection(section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  computeEdge(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<void>;
}

declare class AutoComputeUtils {
  constructor(project: Project | { _: "Project" | (string & {}) });
  getParentTextNodes(node: TextNode | { _: "TextNode" | (string & {}) }): Promise<TextNode>[];
  getParentEntities(node: TextNode | { _: "TextNode" | (string & {}) }): Promise<ConnectableEntity>[];
  getChildTextNodes(node: TextNode | { _: "TextNode" | (string & {}) }): Promise<TextNode>[];
  getNodeOneResult(node: TextNode | { _: "TextNode" | (string & {}) }, resultText: string): Promise<void>;
  getSectionOneResult(section: Section, resultText: string): Promise<void>;
  getSectionMultiResult(section: Section, resultTextList: string[]): Promise<void>;
  generateMultiResult(node: TextNode | { _: "TextNode" | (string & {}) }, resultTextList: string[]): Promise<void>;
  stringToNumber(str: string): Promise<void>;
  isNodeConnectedWithLogicNode(node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): Promise<boolean>;
  isNameIsLogicNode(name: string): Promise<boolean>;
}

declare class AutoLayout {
  constructor(project: Project | { _: "Project" | (string & {}) });
  getDAGLayoutInput(entities: ConnectableEntity[]): Promise<{
    nodes: Array<{ id: string; rectangle: Rectangle }>;
    edges: Array<{ from: string; to: string }>;
  }>;
  computeDAGLayout(input: {
    nodes: Array<{ id: string; rectangle: Rectangle }>;
    edges: Array<{ from: string; to: string }>;
  }): Promise<{ [nodeId: string]: Vector }>;
  topologicalSort(
    nodes: Array<{ id: string; rectangle: Rectangle }>,
    edges: Array<{ from: string; to: string }>,
  ): Promise<{ order: string[]; levels: Map<string, number> }>;
  autoLayoutDAG(entities: ConnectableEntity[]): Promise<void>;
}

declare class AutoLayoutFastTree {
  constructor(project: Project | { _: "Project" | (string & {}) });
  getTreeBoundingRectangle(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    skipDashed = false,
  ): Promise<Rectangle>;
  moveTreeRectTo(
    treeRoot: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    targetLocation: Vector | { _: "Vector" | (string & {}) },
    skipDashed = false,
  ): Promise<void>;
  getSortedChildNodes(
    _node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    childNodes: ConnectableEntity[],
    direction: "col" | "row" = "col",
  ): Promise<ConnectableEntity>[];
  alignTrees(
    trees: ConnectableEntity[],
    direction: "top" | "bottom" | "left" | "right",
    gap = 10,
    skipDashed = false,
  ): Promise<void>;
  adjustChildrenTreesByRootNodeLocation(
    rootNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    childList: ConnectableEntity[],
    gap = 100,
    position: "rightCenter" | "leftCenter" | "bottomCenter" | "topCenter" = "rightCenter",
    skipDashed = false,
  ): Promise<void>;
  resolveSubtreeOverlaps(
    rootNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    directionGroups: {
      right?: ConnectableEntity[];
      left?: ConnectableEntity[];
      bottom?: ConnectableEntity[];
      top?: ConnectableEntity[];
    },
    skipDashed = false,
  ): Promise<void>;
  hasOverlapOrLineIntersection(
    rootNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    group1: ConnectableEntity[],
    group2: ConnectableEntity[],
    dir1: "left" | "right" | "top" | "bottom",
    dir2: "left" | "right" | "top" | "bottom",
    skipDashed = false,
  ): Promise<boolean>;
  autoLayoutFastTreeMode(rootNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): Promise<void>;
  treeReverseX(selectedRootEntity: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): Promise<void>;
  treeReverseY(selectedRootEntity: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): Promise<void>;
  treeReverse(
    selectedRootEntity: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    direction: "X" | "Y",
  ): Promise<void>;
}

declare class AutoSaveBackupService {
  lastBackupTime;
  lastBackupHash;
  lastSaveTime;
  constructor(project: Project | { _: "Project" | (string & {}) });
  tick(): Promise<void>;
  autoSave(): Promise<void>;
  autoBackup(): Promise<void>;
  manualBackup(): Promise<void>;
  resolveAutoBackupDir(candidate: { kind: "custom"; path: string } | { kind: "default" }): Promise<string | null>;
  tryBackupToDir(backupDir: string): Promise<boolean>;
  backupCurrentProject(backupDir: string): Promise<boolean>;
  generateBackupFileName(): Promise<string>;
  getOriginalFileName(): Promise<string>;
  createBackupFile(backupFilePath: string): Promise<void>;
  manageBackupFiles(backupDir: string): Promise<void>;
}

declare class BackgroundRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  renderDotBackground(viewRect: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  renderHorizonBackground(viewRect: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  renderVerticalBackground(viewRect: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  renderCartesianBackground(viewRect: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  getCurrentGap(): Promise<number>;
  getLocationXIterator(
    viewRect: Rectangle | { _: "Rectangle" | (string & {}) },
    currentGap: number,
  ): Promise<IterableIterator<number>>;
  getLocationYIterator(
    viewRect: Rectangle | { _: "Rectangle" | (string & {}) },
    currentGap: number,
  ): Promise<IterableIterator<number>>;
}

declare class BaseExporter {
  constructor(project: Project | { _: "Project" | (string & {}) });
  getTreeTypeString(
    textNode: TextNode | { _: "TextNode" | (string & {}) },
    nodeToStringFunc: (node: TextNode, level: number) => string,
  ): Promise<void>;
  getNodeChildrenArray(node: TextNode | { _: "TextNode" | (string & {}) }): Promise<ConnectableEntity>[];
}

declare class BaseImporter {
  constructor(project: Project | { _: "Project" | (string & {}) });
}

declare class Camera {
  frictionExponent;
  location: Promise<Vector>;
  targetLocationByScale: Promise<Vector>;
  speed: Promise<Vector>;
  accelerateCommander: Promise<Vector>;
  currentScale: Promise<number>;
  targetScale: Promise<number>;
  shakeLocation: Promise<Vector>;
  savedCameraState: Promise<{ location: Vector; scale: number } | null>;
  shockMoveDiffLocationsQueue;
  pageMove(direction: Direction): Promise<void>;
  bombMove(targetLocation: Vector | { _: "Vector" | (string & {}) }, frameCount = 40): Promise<void>;
  tick(): Promise<void>;
  tickNumber;
  allowScaleFollowMouseLocationTicks;
  setAllowScaleFollowMouseLocationTicks(ticks: number): Promise<void>;
  zoomInByKeyboardPress(): Promise<void>;
  zoomOutByKeyboardPress(): Promise<void>;
  addScaleFollowMouseLocationTime(sec: number): Promise<void>;
  isStartZoomIn: Promise<boolean>;
  isStartZoomOut: Promise<boolean>;
  setLocationByOtherLocation(
    otherWorldLocation: Vector | { _: "Vector" | (string & {}) },
    viewLocation: Vector | { _: "Vector" | (string & {}) },
  ): Promise<void>;
  clearMoveCommander(): Promise<void>;
  stopImmediately(): Promise<void>;
  dealCameraScaleInTick(): Promise<void>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  reset(): Promise<void>;
  resetBySelected(): Promise<void>;
  resetByRectangle(viewRectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  resetScale(): Promise<void>;
  resetLocationToZero(): Promise<void>;
  saveCameraState(): Promise<void>;
  restoreCameraState(): Promise<void>;
}

declare class Canvas {
  ctx: Promise<CanvasRenderingContext2D>;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    element: HTMLCanvasElement = document.createElement("canvas"),
  );
  mount(wrapper: HTMLDivElement): Promise<void>;
  dispose(): Promise<void>;
}

declare interface ClickEventPayload {
  relativeWorldX: Promise<number>;
  relativeWorldY: Promise<number>;
  worldX: Promise<number>;
  worldY: Promise<number>;
  customData: any;
  uuid: Promise<string>;
}

declare class CollisionBox {
  shapes: Promise<Shape>[];
  constructor(shapes: Shape[]);
  updateShapeList(shapes: Shape[]): void;
  isContainsPoint(location: Vector | { _: "Vector" | (string & {}) }): Promise<boolean>;
  isIntersectsWithRectangle(rectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<boolean>;
  isContainedByRectangle(rectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<boolean>;
  isIntersectsWithLine(line: Line | { _: "Line" | (string & {}) }): Promise<boolean>;
  getRectangle(): Promise<Rectangle>;
}

declare class CollisionBoxRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  render(
    collideBox: CollisionBox | { _: "CollisionBox" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
  ): Promise<void>;
}

declare class ComplexityDetector {
  constructor(project: Project | { _: "Project" | (string & {}) });
  detectorCurrentStage(): Promise<CountResultObject>;
}

declare class ConnectableAssociation extends Association {
  associationList: Promise<ConnectableEntity>[];
  reverse(): Promise<void>;
  get target(): Promise<ConnectableEntity>;
  set target(value: ConnectableEntity);
  get source(): Promise<ConnectableEntity>;
  set source(value: ConnectableEntity);
}

declare class ConnectableEntity extends Entity {
  geometryCenter: Promise<Vector>;
  unknown;
}

declare class ConnectPoint extends ConnectableEntity {
  CONNECT_POINT_SHRINK_RADIUS;
  CONNECT_POINT_EXPAND_RADIUS;
  get geometryCenter(): Promise<Vector>;
  isHiddenBySectionCollapse: Promise<boolean>;
  collisionBox: Promise<CollisionBox>;
  uuid: Promise<string>;
  get radius(): Promise<number>;
  _isSelected: Promise<boolean>;
  get isSelected(): Promise<any>;
  set isSelected(value: boolean);
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      uuid = crypto.randomUUID() as string,
      collisionBox = new CollisionBox([
        new Rectangle(Vector.getZero(), Vector.same(ConnectPoint.CONNECT_POINT_SHRINK_RADIUS * 2)),
      ]),
      details = [],
    },
    unknown = false,
  );
  move(delta: Vector | { _: "Vector" | (string & {}) }): void;
  moveTo(location: Vector | { _: "Vector" | (string & {}) }): void;
}

declare class ContentSearch {
  constructor(project: Project | { _: "Project" | (string & {}) });
  searchResultNodes: Promise<StageObject>[];
  isCaseSensitive;
  searchScope;
  currentSearchResultIndex;
  getStageObjectText(stageObject: StageObject | { _: "StageObject" | (string & {}) }): Promise<string>;
  getSelectedObjectsBounds(): Promise<Rectangle | null>;
  isObjectInBounds(
    obj: StageObject | { _: "StageObject" | (string & {}) },
    bounds: Rectangle | { _: "Rectangle" | (string & {}) },
  ): Promise<boolean>;
  startSearch(searchString: string, autoFocus = true): Promise<boolean>;
  nextSearchResult(): Promise<void>;
  previousSearchResult(): Promise<void>;
}

declare class Controller {
  setCursorNameHook: Promise<(_: CursorNameEnum) => void>;
  pressingKeySet: Promise<Set<string>>;
  pressingKeysString(): Promise<string>;
  isMovingEdge;
  lastMoveLocation;
  mouseLocation;
  isCameraLocked;
  lastSelectedEntityUUID: Promise<Set<string>>;
  lastSelectedEdgeUUID: Promise<Set<string>>;
  touchStartLocation;
  touchStartDistance;
  touchDelta;
  lastClickTime;
  lastClickLocation;
  isMouseDown: Promise<boolean>[];
  lastManipulateTime;
  resetCountdownTimer(): Promise<void>;
  isManipulateOverTime(): Promise<void>;
  edgeHoverTolerance;
  constructor(project: Project | { _: "Project" | (string & {}) });
  dispose(): Promise<void>;
  mousedown(event: MouseEvent): Promise<void>;
  mouseup(event: MouseEvent): Promise<void>;
  mousewheel(event: WheelEvent): Promise<void>;
  handleMousedown(button: number, _x: number, _y: number): Promise<void>;
  handleMouseup(button: number, x: number, y: number): Promise<void>;
  keydown(event: KeyboardEvent): Promise<void>;
  keyup(event: KeyboardEvent): Promise<void>;
  touchstart(e: TouchEvent): Promise<void>;
  touchmove(e: TouchEvent): Promise<void>;
  touchend(e: TouchEvent): Promise<void>;
  associationReshape: Promise<ControllerAssociationReshapeClass>;
  camera: Promise<ControllerCameraClass>;
  cutting: Promise<ControllerCuttingClass>;
  edgeEdit: Promise<ControllerEdgeEditClass>;
  entityClickSelectAndMove: Promise<ControllerEntityClickSelectAndMoveClass>;
  entityCreate: Promise<ControllerEntityCreateClass>;
  extensionEntityClick: Promise<ControllerExtensionEntityClickClass>;
  layerMoving: Promise<ControllerLayerMovingClass>;
  entityResize: Promise<ControllerEntityResizeClass>;
  nodeConnection: Promise<ControllerNodeConnectionClass>;
  nodeEdit: Promise<ControllerNodeEditClass>;
  penStrokeControl: Promise<ControllerPenStrokeControlClass>;
  penStrokeDrawing: Promise<ControllerPenStrokeDrawingClass>;
  rectangleSelect: Promise<ControllerRectangleSelectClass>;
  sectionEdit: Promise<ControllerSectionEditClass>;
  imageScale: Promise<ControllerImageScaleClass>;
}

declare class ControllerAssociationReshapeClass extends ControllerClass {
  mousewheel: Promise<(event: WheelEvent) => void>;
  lastMoveLocation: Promise<Vector>;
  mousedown: Promise<(event: MouseEvent) => void>;
  mousemove: Promise<(event: MouseEvent) => void>;
  mouseup: Promise<(event: MouseEvent) => void>;
}

declare class ControllerCameraClass extends ControllerClass {
  isUsingMouseGrabMove;
  lastMousePressLocation: Promise<Vector>[];
  isPreGrabbingWhenSpace;
  mac;
  keydown: Promise<(event: KeyboardEvent) => void>;
  keyup: Promise<(event: KeyboardEvent) => void>;
  mousedown;
  mousemove: Promise<(event: MouseEvent) => void>;
  mouseMoveOutWindowForcedShutdown(vectorObject: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  mouseup;
  mousewheel;
  dealStealthMode(event: WheelEvent): Promise<void>;
  mousewheelFunction(event: WheelEvent): Promise<void>;
  mouseDoubleClick: Promise<(event: MouseEvent) => void>;
  moveCameraByMouseMove(x: number, y: number, mouseIndex: number): Promise<void>;
  moveCameraByTouchPadTwoFingerMove(event: WheelEvent): Promise<void>;
  zoomCameraByMouseWheel(event: WheelEvent): Promise<void>;
  moveYCameraByMouseWheel(event: WheelEvent): Promise<void>;
  moveCameraByMouseSideWheel(event: WheelEvent): Promise<void>;
  zoomCameraByMouseSideWheel(event: WheelEvent): Promise<void>;
  moveYCameraByMouseSideWheel(event: WheelEvent): Promise<void>;
  moveXCameraByMouseWheel(event: WheelEvent): Promise<void>;
  moveXCameraByMouseSideWheel(event: WheelEvent): Promise<void>;
  isMouseWheel(event: WheelEvent): Promise<boolean>;
  addDistanceNumberAndDetect(distance: number): Promise<boolean>;
  detectDeltaY: Promise<LimitLengthQueue<number>>;
  importantNumbers: Promise<Set<number>>;
}

declare class ControllerClass {
  constructor(project: Project | { _: "Project" | (string & {}) });
  lastMoveLocation: Promise<Vector>;
  lastClickTime: Promise<number>;
  lastClickLocation: Promise<Vector>;
  keydown: Promise<(event: KeyboardEvent) => void>;
  keyup: Promise<(event: KeyboardEvent) => void>;
  mousedown: Promise<(event: PointerEvent) => void>;
  mouseup: Promise<(event: PointerEvent) => void>;
  mousemove: Promise<(event: PointerEvent) => void>;
  mousewheel: Promise<(event: WheelEvent) => void>;
  mouseDoubleClick: Promise<(event: PointerEvent) => void>;
  touchstart: Promise<(event: TouchEvent) => void>;
  touchmove: Promise<(event: TouchEvent) => void>;
  touchend: Promise<(event: TouchEvent) => void>;
  dispose(): Promise<void>;
  _mouseup;
  _touchstart;
  _touchmove;
  onePointTouchMoveLocation: Promise<Vector>;
  _touchend;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
}

declare class ControllerCuttingClass extends ControllerClass {
  _controlKeyEventRegistered;
  _isControlKeyDown;
  onControlKeyDown;
  onControlKeyUp;
  registerControlKeyEvents(): Promise<void>;
  unregisterControlKeyEvents(): Promise<void>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  dispose(): Promise<void>;
  cuttingLine: Promise<Line>;
  lastMoveLocation;
  warningEntity: Promise<Entity>[];
  warningSections: Promise<Section>[];
  warningAssociations: Promise<Association>[];
  isUsing;
  twoPointsMap: Promise<Record<string, Vector[]>>;
  cuttingStartLocation;
  mousedown: Promise<(event: MouseEvent) => void>;
  mouseDownEvent(event: MouseEvent): Promise<void>;
  mousemove: Promise<(event: MouseEvent) => void>;
  clearIsolationPoint(): Promise<void>;
  mouseUpFunction(mouseUpWindowLocation: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  mouseup: Promise<(event: MouseEvent) => void>;
  mouseMoveOutWindowForcedShutdown(outsideLocation: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  updateWarningObjectByCuttingLine(): Promise<void>;
  addEffectByWarningEntity(): Promise<void>;
}

declare class ControllerEdgeEditClass extends ControllerClass {
  editEdgeText(clickedLineEdge: Edge | { _: "Edge" | (string & {}) }, selectAll = true): Promise<void>;
  editMultiTargetEdgeText(
    clickedEdge: MultiTargetUndirectedEdge | { _: "MultiTargetUndirectedEdge" | (string & {}) },
    selectAll = true,
  ): Promise<void>;
  mouseDoubleClick;
  keydown;
}

declare class ControllerEntityClickSelectAndMoveClass extends ControllerClass {
  isMovingEntity;
  mouseDownViewLocation;
  shakeDetector;
  shiftAxisLock: Promise<"x" | "y" | null>;
  shiftAccumulatedDelta;
  mousedown: Promise<(event: MouseEvent) => void>;
  mousemove: Promise<(event: MouseEvent) => void>;
  mouseup: Promise<(event: MouseEvent) => void>;
  mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector | { _: "Vector" | (string & {}) }): void;
}

declare class ControllerEntityCreateClass extends ControllerClass {
  constructor(project: Project | { _: "Project" | (string & {}) });
  mouseDoubleClick;
  createConnectPoint(pressLocation: Vector | { _: "Vector" | (string & {}) }, addToSections: Section[]): Promise<void>;
}

declare class ControllerEntityResizeClass extends ControllerClass {
  changeSizeEntity: Promise<Entity | null>;
  mousedown: Promise<(event: MouseEvent) => void>;
  mousemove: Promise<(event: MouseEvent) => void>;
  mouseup: Promise<(event: MouseEvent) => void>;
}

declare class ControllerExtensionEntityClickClass extends ControllerClass {
  constructor(project: Project | { _: "Project" | (string & {}) });
  mousedown;
}

declare class ControllerImageScaleClass extends ControllerClass {
  mousewheel;
}

declare class ControllerLayerMovingClass extends ControllerClass {
  get isEnabled(): Promise<boolean>;
  mousemove: Promise<(event: MouseEvent) => void>;
  mouseup: Promise<(event: MouseEvent) => void>;
}

declare class ControllerNodeConnectionClass extends ControllerClass {
  _isControlKeyDown;
  _controlKeyEventRegistered;
  onControlKeyDown;
  onControlKeyUp;
  registerControlKeyEvents(): Promise<void>;
  unregisterControlKeyEvents(): Promise<void>;
  _lastRightMousePressLocation: Promise<Vector>;
  _isUsing: Promise<boolean>;
  get isUsing(): Promise<boolean>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  dispose(): Promise<void>;
  connectFromEntities: Promise<ConnectableEntity>[];
  connectToEntity: Promise<ConnectableEntity | null>;
  mouseLocations: Promise<Vector>[];
  getMouseLocationsPoints(): Promise<Vector>[];
  createConnectPointWhenConnect(): Promise<void>;
  mousedown: Promise<(event: MouseEvent) => void>;
  _startImageLocation: Promise<Map<string, Vector>>;
  _endImageLocation: Promise<Vector | null>;
  _hoverImageLocation: Promise<Vector | null>;
  _previewSourceDirection: Promise<Direction | null>;
  _previewTargetDirection: Promise<Direction | null>;
  getHoverImageNode(): Promise<ImageNode | null>;
  getHoverImageLocation(): Promise<Vector | null>;
  onMouseDown(event: MouseEvent): Promise<void>;
  isMouseHoverOnTarget;
  mousemove: Promise<(event: MouseEvent) => void>;
  mouseMove(event: MouseEvent): Promise<void>;
  mouseup: Promise<(event: MouseEvent) => void>;
  mouseUp(event: MouseEvent): Promise<void>;
  getConnectDirectionByMouseTrack(): Promise<[Direction | null, Direction | null]>;
  _hasSourceSparkTriggered;
  _hasTargetSparkTriggered;
  getOppositeDirection(direction: Direction): Promise<Direction>;
  clickMultiConnect(releaseWorldLocation: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  clear(): Promise<void>;
  updatePreviewDirections(): Promise<void>;
  directionToRate(direction: Direction | null): Promise<Vector>;
  getPreviewSourceRectangleRate(): Promise<Vector>;
  getPreviewTargetRectangleRate(): Promise<Vector>;
  dragMultiConnect(
    connectToEntity: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceDirection: Direction | null = null,
    targetDirection: Direction | null = null,
  ): Promise<void>;
  isConnecting(): Promise<void>;
  addConnectEffect(
    from: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    to: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceRectRate?: Vector | { _: "Vector" | (string & {}) },
    targetRectRate?: Vector | { _: "Vector" | (string & {}) },
  ): Promise<void>;
}

declare class ControllerNodeEditClass extends ControllerClass {
  constructor(project: Project | { _: "Project" | (string & {}) });
  mouseDoubleClick;
  mouseup;
  mousemove;
  editUrlNodeTitle(clickedUrlNode: UrlNode | { _: "UrlNode" | (string & {}) }): Promise<void>;
  editLatexNode(node: LatexNode | { _: "LatexNode" | (string & {}) }): Promise<void>;
}

declare class ControllerPenStrokeControlClass extends ControllerClass {
  isAdjusting;
  startAdjustWidthLocation: Promise<Vector>;
  lastAdjustWidthLocation: Promise<Vector>;
  mousedown: Promise<(event: MouseEvent) => void>;
  mousemove: Promise<(event: MouseEvent) => void>;
  mouseup: Promise<(event: MouseEvent) => void>;
  onMouseMoveWhenAdjusting;
}

declare class ControllerPenStrokeDrawingClass extends ControllerClass {
  _isUsing: Promise<boolean>;
  currentSegments: Promise<PenStrokeSegment>[];
  isDrawingLine;
  currentStrokeWidth: Promise<number>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  mousedown;
  mousemove;
  mouseup;
  releaseMouseAndClear(): Promise<void>;
  mousewheel: Promise<(event: WheelEvent) => void>;
  getCurrentStrokeColor(): Promise<void>;
  changeCurrentStrokeColorAlpha(dAlpha: number): Promise<void>;
}

declare class ControllerRectangleSelectClass extends ControllerClass {
  _isUsing: Promise<boolean>;
  selectingRectangle: Promise<Rectangle | null>;
  get isUsing(): Promise<any>;
  shutDown(): Promise<void>;
  mouseMoveOutWindowForcedShutdown(mouseLocation: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  mousedown: Promise<(event: MouseEvent) => void>;
  mousemove: Promise<(event: MouseEvent) => void>;
  isSelectDirectionRight;
  getSelectMode(): Promise<"contain" | "intersect">;
  mouseup;
}

declare class ControllerSectionEditClass extends ControllerClass {
  constructor(project: Project | { _: "Project" | (string & {}) });
  mouseDoubleClick;
  mousemove;
  keydown;
  editSectionTitle(section: Section | { _: "Section" | (string & {}) }): Promise<void>;
}

declare class ControllerUtils {
  autoComplete: Promise<AutoCompleteManager>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  editTextNode(clickedNode: TextNode, selectAll = true): Promise<void>;
  editNodeDetailsByKeyboard(): Promise<void>;
  editNodeDetails(clickedNode: Entity): Promise<void>;
  addTextNodeByLocation(
    location: Vector | { _: "Vector" | (string & {}) },
    selectCurrent: boolean = false,
    autoEdit: boolean = false,
  ): Promise<void>;
  createConnectPoint(location: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  addTextNodeFromCurrentSelectedNode(direction: Direction, selectCurrent = false): Promise<void>;
  textNodeInEditModeByUUID(uuid: string): Promise<void>;
  getClickedStageObject(clickedLocation: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  isClickedResizeRect(clickedLocation: Vector | { _: "Vector" | (string & {}) }): Promise<boolean>;
  selectedEntityNormalizing(): Promise<void>;
}

declare class CopyEngine {
  copyEngineImage: Promise<CopyEngineImage>;
  copyEngineText: Promise<CopyEngineText>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  copy(): Promise<void>;
  paste(): Promise<void>;
  virtualClipboardPaste(): Promise<void>;
  cut(): Promise<void>;
  readSystemClipboardAndPaste(): Promise<void>;
}

declare class CopyEngineImage {
  constructor(project: Project | { _: "Project" | (string & {}) });
  processClipboardImage(): Promise<void>;
  processImageStandard(): Promise<void>;
  copyEnginePasteImage(item: Blob): Promise<void>;
  debugImageData(imageData: any): void;
  fixImageData(data: Uint8ClampedArray): Promise<Uint8ClampedArray>;
  processImageWindowsCompat(): Promise<void>;
  ensureImageDataFormat(data: any, width: number, height: number): Promise<Uint8ClampedArray>;
  validateCanvasContent(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  createBlobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob>;
}

declare class CopyEngineText {
  constructor(project: Project | { _: "Project" | (string & {}) });
  copyEnginePastePlainText(item: string): Promise<void>;
}

declare class CubicCatmullRomSplineEdge extends Edge {
  uuid: Promise<string>;
  text: Promise<string>;
  _source: Promise<ConnectableEntity>;
  _target: Promise<ConnectableEntity>;
  color: Promise<Color>;
  alpha;
  tension;
  controlPoints: Promise<Vector>[];
  getControlPoints(): Promise<Vector>[];
  addControlPoint(): Promise<void>;
  _collisionBox: Promise<CollisionBox>;
  get collisionBox(): Promise<CollisionBox>;
  fromTwoEntity(
    project: Project | { _: "Project" | (string & {}) },
    source: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    target: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<CubicCatmullRomSplineEdge>;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      uuid,
      source,
      target,
      text,
      alpha,
      tension,
      color,
      controlPoints,
      sourceRectRate,
      targetRectRate,
    }: Serialized.CubicCatmullRomSplineEdge,
    unknown = false,
  );
  getShape(): Promise<CubicCatmullRomSpline>;
  get textRectangle(): Promise<Rectangle>;
  autoUpdateControlPoints(): Promise<void>;
  getArrowHead(): Promise<{ location: Vector; direction: Vector }>;
  adjustSizeByText(): void;
}

declare enum CursorNameEnum {
  Default = "cursor-default",
  Pointer = "cursor-pointer",
  Crosshair = "cursor-crosshair",
  Move = "cursor-move",
  Grab = "cursor-grab",
  Grabbing = "cursor-grabbing",
  Text = "cursor-text",
  NotAllowed = "cursor-not-allowed",
  EResize = "cursor-e-resize",
  NResize = "cursor-n-resize",
  NeResize = "cursor-ne-resize",
  NwResize = "cursor-nw-resize",
  SResize = "cursor-s-resize",
  SeResize = "cursor-se-resize",
  SwResize = "cursor-sw-resize",
  WResize = "cursor-w-resize",
  NsResize = "cursor-ns-resize",
  NeswResize = "cursor-nesw-resize",
  NwseResize = "cursor-nwse-resize",
  ColResize = "cursor-col-resize",
  RowResize = "cursor-row-resize",
  AllScroll = "cursor-all-scroll",
  ZoomIn = "cursor-zoom-in",
  ZoomOut = "cursor-zoom-out",
  GrabHand = "cursor-grab-hand",
  NotAllowedHand = "cursor-not-allowed-hand",
  Pen = "cursor-pen",
  Eraser = "cursor-eraser",
  Handwriting = "cursor-handwriting",
  ZoomInHand = "cursor-zoom-in-hand",
  ZoomOutHand = "cursor-zoom-out-hand",
}

declare class CurveRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  renderSolidLine(
    start: Vector | { _: "Vector" | (string & {}) },
    end: Vector | { _: "Vector" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
  ): void;
  renderSolidLineMultiple(locations: Vector[], color: Color | { _: "Color" | (string & {}) }, width: number): void;
  renderPenStroke(stroke: PenStrokeSegment[], color: Color | { _: "Color" | (string & {}) }): void;
  renderSolidLineMultipleSmoothly(
    locations: Vector[],
    color: Color | { _: "Color" | (string & {}) },
    width: number,
  ): void;
  smoothPoints(points: Vector[], tension = 0.5): Promise<void>;
  renderSolidLineMultipleWithWidth(
    locations: Vector[],
    color: Color | { _: "Color" | (string & {}) },
    widthList: number[],
  ): void;
  renderSolidLineMultipleWithShadow(
    locations: Vector[],
    color: Color | { _: "Color" | (string & {}) },
    width: number,
    shadowColor: Color | { _: "Color" | (string & {}) },
    shadowBlur: number,
  ): void;
  renderDashedLine(
    start: Vector | { _: "Vector" | (string & {}) },
    end: Vector | { _: "Vector" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
    dashLength: number,
  ): void;
  renderDoubleLine(
    start: Vector | { _: "Vector" | (string & {}) },
    end: Vector | { _: "Vector" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
    gap: number,
  ): void;
  renderBezierCurve(
    curve: CubicBezierCurve | { _: "CubicBezierCurve" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
  ): void;
  renderDashedBezierCurve(
    curve: CubicBezierCurve | { _: "CubicBezierCurve" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
    dashLength: number,
  ): void;
  renderDoubleBezierCurve(
    curve: CubicBezierCurve | { _: "CubicBezierCurve" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
    gap: number,
  ): void;
  renderSymmetryCurve(
    curve: SymmetryCurve | { _: "SymmetryCurve" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
  ): void;
  renderGradientLine(
    start: Vector | { _: "Vector" | (string & {}) },
    end: Vector | { _: "Vector" | (string & {}) },
    startColor: Color | { _: "Color" | (string & {}) },
    endColor: Color | { _: "Color" | (string & {}) },
    width: number,
  ): void;
  renderGradientBezierCurve(
    curve: CubicBezierCurve | { _: "CubicBezierCurve" | (string & {}) },
    startColor: Color | { _: "Color" | (string & {}) },
    endColor: Color | { _: "Color" | (string & {}) },
    width: number,
  ): void;
}

declare class DeleteManager {
  deleteHandlers;
  registerHandler<T extends StageObject>(constructor: Constructor<T>, handler: DeleteHandler<T>): Promise<void>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  deleteEntities(deleteNodes: Entity[]): Promise<void>;
  findDeleteHandler(object: StageObject | { _: "StageObject" | (string & {}) }): Promise<void>;
  deleteSvgNode(entity: SvgNode | { _: "SvgNode" | (string & {}) }): Promise<void>;
  deleteLatexNode(entity: LatexNode | { _: "LatexNode" | (string & {}) }): Promise<void>;
  deleteReferenceBlockNode(entity: ReferenceBlockNode): Promise<void>;
  deleteExtensionEntity(entity: ExtensionEntity): Promise<void>;
  deletePenStroke(penStroke: PenStroke | { _: "PenStroke" | (string & {}) }): Promise<void>;
  deleteSection(entity: Section | { _: "Section" | (string & {}) }): Promise<void>;
  deleteImageNode(entity: ImageNode | { _: "ImageNode" | (string & {}) }): Promise<void>;
  deleteUrlNode(entity: UrlNode | { _: "UrlNode" | (string & {}) }): Promise<void>;
  deleteConnectPoint(entity: ConnectPoint | { _: "ConnectPoint" | (string & {}) }): Promise<void>;
  deleteTextNode(entity: TextNode | { _: "TextNode" | (string & {}) }): Promise<void>;
  deleteEntityAfterClearAssociation(
    entity: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<void>;
  deleteEdge(deleteEdge: Edge | { _: "Edge" | (string & {}) }): Promise<boolean>;
  deleteMultiTargetUndirectedEdge(
    edge: MultiTargetUndirectedEdge | { _: "MultiTargetUndirectedEdge" | (string & {}) },
  ): Promise<void>;
}

declare function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>);
declare namespace Dialog {
  function confirm(title = "你确定？", description = "", { destructive = false } = {}): Promise<boolean>;
  function input(
    title = "请输入文本",
    description = "",
    { defaultValue = "", placeholder = "...", destructive = false, multiline = false } = {},
  ): Promise<string | undefined>;
  function buttons<
    Buttons extends readonly {
      id: string;
      label: string;
      variant?: Parameters<typeof Button>[number]["variant"];
    }[],
  >(title: string, description: string, buttons: Buttons): Promise<Buttons[number]["id"]>;
  function copy(title = "导出成功", description = "", value = ""): Promise<void>;
}

declare enum Direction {
  Up,
  Down,
  Left,
  Right,
}

declare class DrawingControllerRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  renderTempDrawing(): Promise<void>;
  renderTrace(currentStrokeColor: Color | { _: "Color" | (string & {}) }): Promise<void>;
  renderMouse(currentStrokeColor: Color | { _: "Color" | (string & {}) }): Promise<void>;
  renderAdjusting(currentStrokeColor: Color | { _: "Color" | (string & {}) }): Promise<void>;
  renderAxisMouse(): Promise<void>;
  diffAngle;
  rotateUpAngle(): Promise<void>;
  rotateDownAngle(): Promise<void>;
  renderAngleMouse(mouseLocation: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  renderLine(
    lineStart: Vector | { _: "Vector" | (string & {}) },
    lineEnd: Vector | { _: "Vector" | (string & {}) },
  ): Promise<void>;
}

declare class Edge extends ConnectableAssociation {
  uuid: Promise<string>;
  text: Promise<string>;
  collisionBox: Promise<CollisionBox>;
  get isHiddenBySectionCollapse(): Promise<boolean>;
  _isSelected: Promise<boolean>;
  get isSelected(): Promise<boolean>;
  set isSelected(value: boolean);
  get textRectangle(): Promise<Rectangle>;
  get bodyLine(): Promise<Line>;
  get sourceLocation(): Promise<Vector>;
  get targetLocation(): Promise<Vector>;
  targetRectangleRate: Promise<Vector>;
  sourceRectangleRate: Promise<Vector>;
  getCenterLine(
    source: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    target: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<Line>;
  getNormalVectorByRate(rate: Vector | { _: "Vector" | (string & {}) }): Promise<Vector | null>;
  getExactEdgePositionByRate(
    rect: Rectangle | { _: "Rectangle" | (string & {}) },
    rate: Vector | { _: "Vector" | (string & {}) },
  ): Promise<Vector | null>;
  adjustSizeByText(): void;
  rename(text: string): Promise<void>;
  isIntersectsWithRectangle(rectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<boolean>;
  isIntersectsWithLocation(location: Vector | { _: "Vector" | (string & {}) }): Promise<boolean>;
  isIntersectsWithLine(line: Line | { _: "Line" | (string & {}) }): Promise<boolean>;
  isLeftToRight(): Promise<boolean>;
  isRightToLeft(): Promise<boolean>;
  isTopToBottom(): Promise<boolean>;
  isBottomToTop(): Promise<boolean>;
  isUnknownDirection(): Promise<boolean>;
  isNonStandardDirection(): Promise<boolean>;
}

declare class EdgeRenderer {
  currentRenderer: Promise<EdgeRendererClass>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  checkRendererBySettings(lineStyle: Settings["lineStyle"]): Promise<void>;
  updateRenderer(style: Settings["lineStyle"]): Promise<void>;
  renderLineEdge(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<void>;
  renderCrEdge(edge: CubicCatmullRomSplineEdge | { _: "CubicCatmullRomSplineEdge" | (string & {}) }): Promise<void>;
  getMinNonCollapseParentSection(
    innerEntity: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<Section>;
  getEdgeView(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<LineEdge>;
  getEdgeSvg(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<React.ReactNode>;
  renderVirtualEdge(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    mouseLocation: Vector | { _: "Vector" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): Promise<void>;
  renderVirtualConfirmedEdge(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    endNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
    targetRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): Promise<void>;
  getCuttingEffects(edge: Edge | { _: "Edge" | (string & {}) }): Promise<void>;
  getConnectedEffects(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
    targetRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): Promise<void>;
  renderArrowHead(
    endPoint: Vector | { _: "Vector" | (string & {}) },
    direction: Vector | { _: "Vector" | (string & {}) },
    size: number,
    color: Color | { _: "Color" | (string & {}) },
  ): Promise<void>;
  generateArrowHeadSvg(
    endPoint: Vector | { _: "Vector" | (string & {}) },
    direction: Vector | { _: "Vector" | (string & {}) },
    size: number,
    edgeColor: Color | { _: "Color" | (string & {}) },
  ): Promise<React.ReactNode>;
}

declare class EdgeRendererClass {
  constructor();
  isCycleState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<boolean>;
  isNormalState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<boolean>;
  renderNormalState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  renderShiftingState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  renderCycleState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  getNormalStageSvg(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<React.ReactNode>;
  getShiftingStageSvg(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<React.ReactNode>;
  getCycleStageSvg(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<React.ReactNode>;
  renderVirtualEdge(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    mouseLocation: Vector | { _: "Vector" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): void;
  renderVirtualConfirmedEdge(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    endNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
    targetRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): void;
  getCuttingEffects(edge: Edge | { _: "Edge" | (string & {}) }): Promise<Effect>[];
  getConnectedEffects(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
    targetRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): Promise<Effect>[];
}

declare class Effect {
  constructor(timeProgress: ProgressNumber | { _: "ProgressNumber" | (string & {}) }, delay: number = 0);
  subEffects: Promise<Effect>[];
  tick(project: Project | { _: "Project" | (string & {}) }): void;
  render(project: Project | { _: "Project" | (string & {}) }): void;
}

declare class Effects {
  constructor(project: Project | { _: "Project" | (string & {}) });
  effects: Promise<Effect>[];
  addEffect(effect: Effect): Promise<void>;
  get effectsCount(): Promise<any>;
  addEffects(effects: Effect[]): Promise<void>;
  tick(): Promise<void>;
}

declare class Entity extends StageObject {
  move(delta: Vector | { _: "Vector" | (string & {}) }): void;
  isAlignExcluded;
  moveTo(location: Vector | { _: "Vector" | (string & {}) }): void;
  details: Promise<Value>;
  isMouseHover: Promise<boolean>;
  detailsButtonRectangle(): Promise<Rectangle>;
  isMouseInDetailsButton(mouseWorldLocation: Vector | { _: "Vector" | (string & {}) }): Promise<boolean>;
  referenceButtonCircle(): Promise<Circle>;
  isMouseInReferenceButton(mouseWorldLocation: Vector | { _: "Vector" | (string & {}) }): Promise<boolean>;
  updateFatherSectionByMove(): Promise<void>;
  updateOtherEntityLocationByMove(): Promise<void>;
  collideWithOtherEntity(other: Entity): Promise<void>;
  isHiddenBySectionCollapse: Promise<boolean>;
  detailsManager;
}

declare class EntityDetailsButtonRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  render(entity: Entity | { _: "Entity" | (string & {}) }): Promise<void>;
}

declare class EntityMoveManager {
  constructor(project: Project | { _: "Project" | (string & {}) });
  moveAccelerateCommander: Promise<Vector>;
  moveSpeed: Promise<Vector>;
  frictionExponent;
  tick(): Promise<void>;
  continuousMoveKeyPress(direction: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  continuousMoveKeyRelease(direction: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  stopImmediately(): Promise<void>;
  canMoveEntity(entity: Entity | { _: "Entity" | (string & {}) }): Promise<boolean>;
  moveEntityUtils(
    entity: Entity | { _: "Entity" | (string & {}) },
    delta: Vector | { _: "Vector" | (string & {}) },
    isAutoAdjustSection: boolean = true,
  ): Promise<void>;
  jumpMoveEntityUtils(
    entity: Entity | { _: "Entity" | (string & {}) },
    delta: Vector | { _: "Vector" | (string & {}) },
  ): Promise<void>;
  moveEntityToUtils(
    entity: Entity | { _: "Entity" | (string & {}) },
    location: Vector | { _: "Vector" | (string & {}) },
  ): Promise<void>;
  moveSelectedEntities(
    delta: Vector | { _: "Vector" | (string & {}) },
    isAutoAdjustSection: boolean = true,
  ): Promise<void>;
  jumpMoveSelectedConnectableEntities(delta: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  moveEntitiesWithChildren(delta: Vector | { _: "Vector" | (string & {}) }, skipDashed = true): Promise<void>;
  moveWithChildren(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    delta: Vector | { _: "Vector" | (string & {}) },
    skipDashed = false,
  ): Promise<void>;
}

declare class EntityRenderer {
  sectionSortedZIndex: Promise<Section>[];
  extensionEntityRenderer: Promise<ExtensionEntityRenderer>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  sortSectionsByZIndex(): Promise<void>;
  tickNumber;
  renderAllSectionsBackground(viewRectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  renderAllSectionsBigTitle(viewRectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  shouldSkipEntity(
    entity: Entity | { _: "Entity" | (string & {}) },
    viewRectangle: Rectangle | { _: "Rectangle" | (string & {}) },
  ): Promise<boolean>;
  isBackgroundImageNode(entity: Entity | { _: "Entity" | (string & {}) }): Promise<boolean>;
  renderAllEntities(viewRectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  renderEntity(entity: Entity | { _: "Entity" | (string & {}) }): Promise<void>;
  renderEntityDebug(entity: Entity | { _: "Entity" | (string & {}) }): Promise<void>;
  renderConnectPoint(connectPoint: ConnectPoint | { _: "ConnectPoint" | (string & {}) }): Promise<void>;
  renderImageNode(imageNode: ImageNode | { _: "ImageNode" | (string & {}) }): Promise<void>;
  renderPenStroke(penStroke: PenStroke | { _: "PenStroke" | (string & {}) }): Promise<void>;
  renderEntityDetails(entity: Entity | { _: "Entity" | (string & {}) }): Promise<void>;
  _renderEntityDetails(entity: Entity | { _: "Entity" | (string & {}) }, limitLiens: number): Promise<void>;
  renderEntityTagShap(entity: Entity | { _: "Entity" | (string & {}) }): Promise<void>;
}

declare class Extension extends Tab {
  metadata: Promise<PrgMetadata>;
  readmeContent: Promise<string>;
  code: Promise<string>;
  iconBlobUrl: Promise<string | null>;
  iconRawData: Promise<Uint8Array | null>;
  iconFileName: Promise<string | null>;
  stage: Promise<any>[];
  _uri: Promise<URI>;
  _component: Promise<React.ComponentType | null>;
  constructor(uri: URI);
  get uri(): Promise<any>;
  init(): Promise<void>;
  getComponent(): Promise<React.ComponentType>;
  render(): Promise<React.ReactNode>;
  get icon(): Promise<any>;
  get title(): Promise<any>;
}

declare class ExtensionEntity extends ConnectableEntity {
  get geometryCenter(): Promise<Vector>;
  uuid: Promise<string>;
  extensionId;
  typeName;
  customData: any;
  collisionBox: Promise<CollisionBox>;
  isHiddenBySectionCollapse;
  _bitmapCache: Promise<ImageBitmap | null>;
  _isDirty;
  _isRendering;
  _renderFailed;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      uuid = crypto.randomUUID(),
      extensionId = "",
      typeName = "",
      customData = {},
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), new Vector(100, 80))]),
    }: {
      uuid?: string;
      extensionId?: string;
      typeName?: string;
      customData?: any;
      collisionBox?: CollisionBox;
    } = {},
  );
  get rectangle(): Promise<Rectangle>;
  get location(): Promise<Vector>;
  set location(v: Vector);
  move(delta: Vector | { _: "Vector" | (string & {}) }): void;
  moveTo(location: Vector | { _: "Vector" | (string & {}) }): void;
  markDirty(): Promise<void>;
  setCustomData(data: any): Promise<void>;
}

declare interface ExtensionEntityConfig {
  initialData: any;
  collisionBox: Promise<CollisionBox>;
}

declare class ExtensionEntityRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  render(entity: ExtensionEntity | { _: "ExtensionEntity" | (string & {}) }): Promise<void>;
  drawPendingBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): Promise<void>;
  drawErrorBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    extensionId: string,
    color: string,
  ): Promise<void>;
  drawCollisionBox(
    ctx: CanvasRenderingContext2D,
    entity: ExtensionEntity | { _: "ExtensionEntity" | (string & {}) },
    scale: number,
  ): Promise<void>;
  renderSelectionOutline(
    ctx: CanvasRenderingContext2D,
    entity: ExtensionEntity | { _: "ExtensionEntity" | (string & {}) },
    scale: number,
  ): Promise<void>;
  triggerWorkerRender(entity: ExtensionEntity | { _: "ExtensionEntity" | (string & {}) }): Promise<void>;
}

declare interface FileSystemProvider {
  read(uri: URI): Promise<Uint8Array>;
  readDir(uri: URI): Promise<DirEntry[]>;
  write(uri: URI, content: Uint8Array): Promise<void>;
  remove(uri: URI): Promise<void>;
  exists(uri: URI): Promise<boolean>;
  mkdir(uri: URI): Promise<void>;
  rename(oldUri: URI, newUri: URI): Promise<void>;
}

declare class GenerateFromFolder {
  constructor(project: Project | { _: "Project" | (string & {}) });
  generateFromFolder(folderPath: string): Promise<void>;
  generateTreeFromFolder(folderPath: string): Promise<void>;
  getColorByPath(path: string): Promise<Color>;
  fileExtColorMap: Promise<Record<string, string>>;
}

declare class GraphImporter extends BaseImporter {
  constructor(project: Project | { _: "Project" | (string & {}) });
  import(text: string, diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero()): void;
}

declare class GraphMethods {
  constructor(project: Project | { _: "Project" | (string & {}) });
  isTree(node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }, skipDashed = false): Promise<boolean>;
  getNodeDisplayName(node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): Promise<string>;
  validateTreeStructure(
    rootNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    skipDashed = false,
  ): Promise<TreeValidationResult>;
  nodeChildrenArray(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    skipDashed = false,
  ): Promise<ConnectableEntity>[];
  nodeParentArray(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    skipDashed = false,
  ): Promise<ConnectableEntity>[];
  edgeChildrenArray(node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): Promise<Edge>[];
  edgeParentArray(node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): Promise<Edge>[];
  getReversedEdgeDict(skipDashed = false): Promise<Record<string, string>>;
  isCurrentNodeInTreeStructAndNotRoot(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<boolean>;
  getRoots(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    skipDashed = false,
  ): Promise<ConnectableEntity>[];
  isConnected(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    target: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<boolean>;
  getSuccessorSet(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    isHaveSelf: boolean = true,
    skipDashed = false,
  ): Promise<ConnectableEntity>[];
  getOneStepSuccessorSet(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<ConnectableEntity>[];
  getEdgesBetween(
    node1: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    node2: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<Edge>[];
  getEdgeFromTwoEntity(
    fromNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<Edge | null>;
  getHyperEdgesByNode(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<MultiTargetUndirectedEdge>[];
  getOutgoingEdges(node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): Promise<Edge>[];
  getIncomingEdges(node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): Promise<Edge>[];
  getNodesConnectedByHyperEdges(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<ConnectableEntity>[];
  nodeChildrenArrayWithinSet(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    nodeSet: Set<string>,
  ): Promise<ConnectableEntity>[];
  nodeParentArrayWithinSet(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    nodeSet: Set<string>,
  ): Promise<ConnectableEntity>[];
  getTreeRootByNodes(nodes: ConnectableEntity[]): Promise<ConnectableEntity | null>;
  isTreeByNodes(nodes: ConnectableEntity[]): Promise<boolean>;
  isDAGByNodes(nodes: ConnectableEntity[]): Promise<boolean>;
}

declare class HistoryManager extends HistoryManagerAbs {
  memoryEfficient: Promise<HistoryManagerAbs>;
  timeEfficient: Promise<HistoryManagerAbs>;
  currentManager: Promise<HistoryManagerAbs>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  recordStep(): void;
  undo(): void;
  redo(): void;
  get(index: number): Promise<Record<string, any>>[];
  clearHistory(): void;
  switchMode(useTimeEfficient: boolean): void;
}

declare class ImageNode extends ConnectableEntity implements ResizeAble {
  isHiddenBySectionCollapse: Promise<boolean>;
  uuid: Promise<string>;
  collisionBox: Promise<CollisionBox>;
  attachmentId: Promise<string>;
  scale: Promise<number>;
  isBackground: Promise<boolean>;
  _isSelected: Promise<boolean>;
  get isSelected(): Promise<any>;
  set isSelected(value: boolean);
  bitmap: Promise<ImageBitmap | undefined>;
  state: Promise<"loading" | "success" | "notFound">;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      uuid = crypto.randomUUID() as string,
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), Vector.getZero())]),
      details = [],
      attachmentId = "",
      scale = 1,
      isBackground = false,
    },
    unknown = false,
  );
  scaleUpdate(scaleDiff: number): Promise<void>;
  get rectangle(): Promise<Rectangle>;
  get geometryCenter(): Promise<any>;
  move(delta: Vector | { _: "Vector" | (string & {}) }): void;
  moveTo(location: Vector | { _: "Vector" | (string & {}) }): void;
  reverseColors(): Promise<void>;
  swapRedBlueChannels(): Promise<void>;
  resizeHandle(delta: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  getResizeHandleRect(): Promise<Rectangle>;
}

declare class ImageRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  renderImageElement(
    source: Exclude<CanvasImageSource, VideoFrame | SVGElement>,
    location: Vector | { _: "Vector" | (string & {}) },
    scale: number = 1 / (window.devicePixelRatio || 1),
  ): Promise<void>;
  renderImageBitmap(
    bitmap: ImageBitmap | undefined,
    location: Vector | { _: "Vector" | (string & {}) },
    scale: number = 1 / (window.devicePixelRatio || 1),
  ): Promise<void>;
}

declare class InputElement {
  input(
    location: Vector | { _: "Vector" | (string & {}) },
    defaultValue: string,
    onChange: (value: string) => void = () => {},
    style: Partial<CSSStyleDeclaration> = {},
  ): Promise<string>;
  textarea(
    defaultValue: string,
    onChange: (value: string, element: HTMLTextAreaElement) => void = () => {},
    style: Partial<CSSStyleDeclaration> = {},
    selectAllWhenCreated = true,
  ): Promise<string>;
  addSuccessEffect(): Promise<void>;
  addFailEffect(withToast = true): Promise<void>;
  constructor(project: Project | { _: "Project" | (string & {}) });
}

declare class KeyBindHintEngine {
  constructor(project: Project | { _: "Project" | (string & {}) });
  ITEMS_PER_PAGE;
  currentPage;
  currentModifierCombo: Promise<string>;
  lastModifierCombo: Promise<string>;
  isShowingHint;
  hasOtherKeyPressed;
  hasModifierReleased;
  cachedKeyBinds: Promise<
    Array<{
      id: string;
      key: string;
      displayKey: string;
      title: string;
    }>
  >;
  getCurrentModifierCombo(): Promise<string>;
  isOnlyModifiersPressed(): Promise<boolean>;
  convertModifierComboForMatching(combo: string): Promise<string>;
  isKeyBindMatchModifier(key: string, modifierCombo: string): Promise<boolean>;
  getMatchingKeyBinds(modifierCombo: string): Promise<
    Array<{
      id: string;
      key: string;
      displayKey: string;
      title: string;
    }>
  >;
  getKeyBindTitle(id: string): Promise<string>;
  update(): Promise<void>;
  render(): Promise<void>;
}

declare type KeyBindIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

declare type KeyBindWhen = (project?: Project) => boolean | Promise<boolean>;

declare class KeyboardOnlyEngine {
  constructor(project: Project | { _: "Project" | (string & {}) });
  openning;
  setOpenning(value: boolean): Promise<void>;
  isOpenning(): Promise<void>;
  dispose(): Promise<void>;
  startEditNode;
  onKeyUp;
  onKeyDown;
  addSuccessEffect(): Promise<void>;
  addFailEffect(): Promise<void>;
}

declare class KeyboardOnlyGraphEngine {
  targetLocationController;
  virtualTargetLocation(): Promise<Vector>;
  tick(): Promise<void>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  isEnableVirtualCreate(): Promise<boolean>;
  _isCreating;
  _creatingFromUUID: Promise<string | null>;
  creatingFromUUID(): Promise<string | null>;
  isCreating(): Promise<boolean>;
  createStart(): void;
  lastPressTabTime;
  getPressTabTimeInterval(): Promise<number>;
  createFinished(): Promise<void>;
  moveVirtualTarget(delta: Vector | { _: "Vector" | (string & {}) }): void;
  createCancel(): void;
  startMovingDirection(dir: Direction): void;
  stopMovingDirection(dir: Direction): void;
  isTargetLocationHaveEntity(): Promise<boolean>;
}

declare class KeyboardOnlyTreeEngine {
  constructor(project: Project | { _: "Project" | (string & {}) });
  getNodePreDirection(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<"right" | "left" | "down" | "up">;
  preDirectionCacheMap: Promise<Map<string, "right" | "left" | "down" | "up">>;
  getGrowthLineStart(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    direction: "right" | "left" | "down" | "up",
  ): Promise<Vector>;
  getGrowthLineEnd(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    direction: "right" | "left" | "down" | "up",
  ): Promise<Vector>;
  findConnectTargetByGrowthLine(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    direction: "right" | "left" | "down" | "up",
  ): Promise<ConnectableEntity | null>;
  changePreDirection(nodes: ConnectableEntity[], direction: "right" | "left" | "down" | "up"): void;
  addNodeEffectByPreDirection(node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): void;
  onDeepGenerateNode(defaultText = "", selectAll = true): Promise<void>;
  onBroadGenerateNode(): Promise<void>;
  adjustTreeNode(
    entity: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    withEffect = true,
  ): Promise<void>;
  onDeleteCurrentNode(): Promise<void>;
  calculateNewNodeFontScaleLevel(
    parentNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    preDirection: "right" | "left" | "down" | "up",
  ): Promise<number>;
}

declare class LatexNode extends ConnectableEntity {
  uuid: Promise<string>;
  latexSource: Promise<string>;
  collisionBox: Promise<CollisionBox>;
  color: Promise<Color>;
  fontScaleLevel: Promise<number>;
  isHiddenBySectionCollapse: Promise<boolean>;
  image: Promise<HTMLImageElement>;
  svgOriginalSize: Promise<Vector>;
  state: Promise<"loading" | "success" | "error">;
  currentRenderedColorCss: Promise<string>;
  _isSelected: Promise<boolean>;
  get isSelected(): Promise<any>;
  set isSelected(value: boolean);
  get rectangle(): Promise<Rectangle>;
  get geometryCenter(): Promise<Vector>;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      uuid = crypto.randomUUID(),
      details = [],
      latexSource = "",
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), Vector.getZero())]),
      color = Color.Transparent.clone(),
      fontScaleLevel = 0,
    }: {
      uuid?: string;
      details?: any;
      latexSource?: string;
      collisionBox?: CollisionBox;
      color?: Color;
      fontScaleLevel?: number;
    },
  );
  getScale(): Promise<number>;
  increaseFontSize(anchorRate?: Vector | { _: "Vector" | (string & {}) }): void;
  decreaseFontSize(anchorRate?: Vector | { _: "Vector" | (string & {}) }): void;
  updateCollisionBoxByScale(anchorRate?: Vector | { _: "Vector" | (string & {}) }): void;
  _adjustLocationToKeepAnchor(
    oldRect: Rectangle | { _: "Rectangle" | (string & {}) },
    anchorRate: Vector | { _: "Vector" | (string & {}) },
  ): void;
  updateLatex(newLatex: string, colorCss?: string): Promise<void>;
  reRenderWithColor(colorCss: string): Promise<void>;
  renderLatexToImage(latex: string, colorCss: string = "#000000"): Promise<void>;
  move(delta: Vector | { _: "Vector" | (string & {}) }): void;
  moveTo(location: Vector | { _: "Vector" | (string & {}) }): void;
}

declare class LatexNodeRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  getTargetColorCss(node: LatexNode | { _: "LatexNode" | (string & {}) }): Promise<string>;
  render(node: LatexNode | { _: "LatexNode" | (string & {}) }): Promise<void>;
}

declare class LayoutManager {
  constructor(project: Project | { _: "Project" | (string & {}) });
  alignLeft(): Promise<void>;
  alignRight(): Promise<void>;
  alignTop(): Promise<void>;
  alignBottom(): Promise<void>;
  alignCenterHorizontal(): Promise<void>;
  alignCenterVertical(): Promise<void>;
  alignHorizontalSpaceBetween(): Promise<void>;
  alignVerticalSpaceBetween(): Promise<void>;
  alignLeftToRightNoSpace(): Promise<void>;
  alignTopToBottomNoSpace(): Promise<void>;
  layoutBySelected(layoutFunction: (entities: Entity[]) => void, isDeep: boolean): Promise<void>;
  adjustSelectedTextNodeWidth(mode: "maxWidth" | "minWidth" | "average"): Promise<void>;
  layoutToSquare(entities: Entity[]): Promise<void>;
  layoutToTightSquare(entities: Entity[]): Promise<void>;
}

declare class LineEdge extends Edge {
  uuid: Promise<string>;
  text: Promise<string>;
  color: Promise<Color>;
  lineType: Promise<string>;
  get collisionBox(): Promise<CollisionBox>;
  get shiftingIndex(): Promise<number>;
  set shiftingIndex(value: number);
  _shiftingIndex: Promise<number>;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      associationList = [] as ConnectableEntity[],
      text = "",
      uuid = crypto.randomUUID() as string,
      color = Color.Transparent,
      sourceRectangleRate = Vector.same(0.5),
      targetRectangleRate = Vector.same(0.5),
      lineType = "solid",
    },
    unknown = false,
  );
  fromTwoEntity(
    project: Project | { _: "Project" | (string & {}) },
    source: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    target: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<LineEdge>;
  rename(text: string): Promise<void>;
  get edgeWidth(): Promise<number>;
  get textFontSize(): Promise<number>;
  get textRectangle(): Promise<Rectangle>;
  get shiftingMidPoint(): Promise<Vector>;
  adjustSizeByText(): void;
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

declare class MarkdownExporter extends BaseExporter {
  export(textNode: TextNode | { _: "TextNode" | (string & {}) }): Promise<string>;
  getNodeMarkdown(node: TextNode | { _: "TextNode" | (string & {}) }, level: number): Promise<string>;
}

declare class MarkdownImporter extends BaseImporter {
  constructor(project: Project | { _: "Project" | (string & {}) });
  import(
    markdownText: string,
    diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero(),
    autoLayout = true,
  ): void;
}

declare interface MarkdownNode {
  title: Promise<string>;
  content: Promise<string>;
  children: Promise<MarkdownNode>[];
}

declare class MermaidExporter {
  constructor(project: Project | { _: "Project" | (string & {}) });
  export(entities: Entity[]): Promise<string>;
}

declare class MermaidImporter extends BaseImporter {
  constructor(project: Project | { _: "Project" | (string & {}) });
  import(text: string, diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero()): void;
  normalizeLine(line: string): Promise<string>;
  decodeMermaidText(value: string): Promise<string>;
  sanitizeLabel(raw: string | undefined): Promise<string | undefined>;
  parseNodeToken(token: string): Promise<MermaidNodeToken>;
}

declare class MouseInteraction {
  constructor(project: Project | { _: "Project" | (string & {}) });
  _hoverEdges: Promise<Edge>[];
  _hoverSections: Promise<Section>[];
  _hoverConnectPoints: Promise<ConnectPoint>[];
  _hoverMultiTargetEdges: Promise<MultiTargetUndirectedEdge>[];
  get hoverEdges(): Promise<Edge>[];
  get firstHoverEdge(): Promise<Edge | undefined>;
  get hoverSections(): Promise<Section>[];
  get hoverConnectPoints(): Promise<ConnectPoint>[];
  get firstHoverSection(): Promise<Section | undefined>;
  get hoverMultiTargetEdges(): Promise<MultiTargetUndirectedEdge>[];
  get firstHoverMultiTargetEdge(): Promise<MultiTargetUndirectedEdge | undefined>;
  updateByMouseMove(mouseWorldLocation: Vector | { _: "Vector" | (string & {}) }): void;
}

declare class MultiTargetEdgeMove {
  constructor(project: Project | { _: "Project" | (string & {}) });
  moveMultiTargetEdge(diffLocation: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
}

declare class MultiTargetUndirectedEdge extends ConnectableAssociation {
  uuid: Promise<string>;
  get collisionBox(): Promise<CollisionBox>;
  text: Promise<string>;
  color: Promise<Color>;
  rectRates: Promise<Vector>[];
  centerRate: Promise<Vector>;
  arrow: Promise<UndirectedEdgeArrowType>;
  renderType: Promise<MultiTargetUndirectedEdgeRenderType>;
  padding: Promise<number>;
  rename(text: string): Promise<void>;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      associationList = [] as ConnectableEntity[],
      text = "",
      uuid = crypto.randomUUID() as string,
      color = Color.Transparent,
      rectRates = associationList.map(() => Vector.same(0.5)),
      arrow = "none" as UndirectedEdgeArrowType,
      centerRate = Vector.same(0.5),
      padding = 10,
      renderType = "line" as MultiTargetUndirectedEdgeRenderType,
    }: {
      associationList?: ConnectableEntity[];
      text?: string;
      uuid?: string;
      color?: Color;
      rectRates?: Vector[];
      arrow?: UndirectedEdgeArrowType;
      centerRate?: Vector;
      padding?: number;
      renderType?: MultiTargetUndirectedEdgeRenderType;
    },
    unknown = false,
  );
  get centerLocation(): Promise<Vector>;
  get textRectangle(): Promise<Rectangle>;
  createFromSomeEntity(
    project: Project | { _: "Project" | (string & {}) },
    entities: ConnectableEntity[],
  ): Promise<void>;
  _isSelected: Promise<boolean>;
  get isSelected(): Promise<boolean>;
  set isSelected(value: boolean);
}

declare class MultiTargetUndirectedEdgeRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  render(edge: MultiTargetUndirectedEdge | { _: "MultiTargetUndirectedEdge" | (string & {}) }): Promise<void>;
  renderLineShape(
    edge: MultiTargetUndirectedEdge | { _: "MultiTargetUndirectedEdge" | (string & {}) },
    edgeColor: Color | { _: "Color" | (string & {}) },
    centerLocation: Vector | { _: "Vector" | (string & {}) },
  ): void;
  renderConvexShape(
    edge: MultiTargetUndirectedEdge | { _: "MultiTargetUndirectedEdge" | (string & {}) },
    edgeColor: Color | { _: "Color" | (string & {}) },
  ): void;
  renderCircle(
    edge: MultiTargetUndirectedEdge | { _: "MultiTargetUndirectedEdge" | (string & {}) },
    edgeColor: Color | { _: "Color" | (string & {}) },
  ): void;
}

declare class NodeAdder {
  constructor(project: Project | { _: "Project" | (string & {}) });
  addTextNodeByClick(
    clickWorldLocation: Vector | { _: "Vector" | (string & {}) },
    addToSections: Section[],
    selectCurrent = false,
    shouldRecordHistory = true,
    options?: {
      overrideFontScaleLevel?: number;
    },
  ): Promise<string>;
  addTextNodeFromCurrentSelectedNode(
    direction: Direction,
    addToSections: Section[],
    selectCurrent = false,
  ): Promise<string>;
  getAutoName(): Promise<string>;
  getAutoColor(): Promise<Color>;
  addConnectPoint(
    clickWorldLocation: Vector | { _: "Vector" | (string & {}) },
    addToSections: Section[],
  ): Promise<string>;
  addNodeGraphByText(text: string, diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero()): void;
  addNodeTreeByText(
    text: string,
    indention: number,
    diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero(),
  ): void;
  addNodeMermaidByText(text: string, diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero()): void;
  addNodeByMarkdown(
    markdownText: string,
    diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero(),
    autoLayout = true,
  ): Promise<void>;
  getIndentLevel(line: string, indention: number): Promise<number>;
}

declare class NodeConnector {
  constructor(project: Project | { _: "Project" | (string & {}) });
  isConnectable(
    fromNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<boolean>;
  connectConnectableEntity(
    fromNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    text: string = "",
    targetRectRate?: [number, number],
    sourceRectRate?: [number, number],
  ): void;
  connectEntityFast(
    fromNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    text: string = "",
  ): void;
  addCrEdge(
    fromNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): void;
  reverseEdges(edges: LineEdge[]): Promise<void>;
  changeEdgeTarget(
    edge: LineEdge | { _: "LineEdge" | (string & {}) },
    newTarget: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<void>;
  changeEdgeSource(
    edge: LineEdge | { _: "LineEdge" | (string & {}) },
    newSource: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<void>;
  changeSelectedEdgeTarget(newTarget: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): Promise<void>;
  changeSelectedEdgeSource(newSource: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) }): Promise<void>;
}

declare class PenStroke extends Entity {
  isAlignExcluded: Promise<boolean>;
  isHiddenBySectionCollapse: Promise<boolean>;
  collisionBox: Promise<CollisionBox>;
  uuid: Promise<string>;
  move(delta: Vector | { _: "Vector" | (string & {}) }): void;
  moveTo(location: Vector | { _: "Vector" | (string & {}) }): void;
  updateCollisionBoxBySegmentList(): Promise<void>;
  segments: Promise<PenStrokeSegment>[];
  color: Promise<Color>;
  getPath(): Promise<Vector>[];
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    { uuid = crypto.randomUUID() as string, segments = [] as PenStrokeSegment[], color = Color.White },
  );
  getCollisionBoxFromSegmentList(segmentList: PenStrokeSegment[]): Promise<CollisionBox>;
}

declare class PenStrokeSegment {
  location: Promise<Vector>;
  pressure: Promise<number>;
  constructor(location: Vector | { _: "Vector" | (string & {}) }, pressure: number);
}

declare class PlainTextExporter {
  constructor(project: Project | { _: "Project" | (string & {}) });
  export(nodes: Entity[]): Promise<string>;
}

declare interface PrgMetadata {
  version: Promise<string>;
  extension?: Promise<ExtensionMetadata>;
}

declare class Project extends Tab {
  latestVersion;
  _uri: Promise<URI>;
  _projectState: Promise<ProjectState>;
  _isSaving;
  stage: Promise<StageObject>[];
  tags: Promise<string>[];
  attachments;
  encoder;
  decoder;
  constructor(uri: URI);
  newDraft(): Promise<Project>;
  compareVersion(version1: string, version2: string): Promise<number>;
  checkAndConfirmUpgrade(currentVersion: string, latestVersion: string): Promise<boolean>;
  parseProjectFile(): Promise<{
    serializedStageObjects: any[];
    tags: string[];
    references: { sections: Record<string, string[]>; files: string[] };
    metadata: PrgMetadata;
    readme?: string;
  }>;
  init(): Promise<void>;
  get isDraft(): Promise<any>;
  get title(): Promise<string>;
  get icon(): Promise<any>;
  get uri(): Promise<any>;
  set uri(uri: URI);
  stash(): Promise<void>;
  save(): Promise<void>;
  references: Promise<{ sections: Record<string, string[]>; files: string[] }>;
  metadata: Promise<PrgMetadata>;
  readme?: Promise<string>;
  getFileContent(): Promise<void>;
  get stageHash(): Promise<any>;
  addAttachment(data: Blob): Promise<void>;
  set projectState(state: ProjectState);
  get projectState(): Promise<ProjectState>;
  set isSaving(isSaving: boolean);
  get isSaving(): Promise<boolean>;
  containerRef;
  loadService(service: { id?: string; new (...args: any[]): any }): Promise<void>;
  componentDidMount(): void;
  currentComponent: Promise<React.ComponentType | null>;
  getComponent(): Promise<React.ComponentType>;
  render(): Promise<React.ReactNode>;
  canvas: Promise<Canvas>;
  inputElement: Promise<InputElement>;
  controllerUtils: Promise<ControllerUtils>;
  autoComputeUtils: Promise<AutoComputeUtils>;
  renderUtils: Promise<RenderUtils>;
  worldRenderUtils: Promise<WorldRenderUtils>;
  historyManager: Promise<HistoryManager>;
  stageManager: Promise<StageManager>;
  camera: Promise<Camera>;
  effects: Promise<Effects>;
  autoCompute: Promise<AutoCompute>;
  rectangleSelect: Promise<RectangleSelect>;
  stageNodeRotate: Promise<StageNodeRotate>;
  complexityDetector: Promise<ComplexityDetector>;
  aiEngine: Promise<AIEngine>;
  copyEngine: Promise<CopyEngine>;
  autoLayout: Promise<AutoLayout>;
  autoLayoutFastTree: Promise<AutoLayoutFastTree>;
  layoutManager: Promise<LayoutManager>;
  autoAlign: Promise<AutoAlign>;
  mouseInteraction: Promise<MouseInteraction>;
  contentSearch: Promise<ContentSearch>;
  deleteManager: Promise<DeleteManager>;
  nodeAdder: Promise<NodeAdder>;
  entityMoveManager: Promise<EntityMoveManager>;
  stageUtils: Promise<StageUtils>;
  multiTargetEdgeMove: Promise<MultiTargetEdgeMove>;
  nodeConnector: Promise<NodeConnector>;
  stageObjectColorManager: Promise<StageObjectColorManager>;
  stageObjectSelectCounter: Promise<StageObjectSelectCounter>;
  sectionInOutManager: Promise<SectionInOutManager>;
  sectionPackManager: Promise<SectionPackManager>;
  sectionCollisionSolver: Promise<SectionCollisionSolver>;
  tagManager: Promise<TagManager>;
  syncAssociationManager: Promise<StageSyncAssociationManager>;
  keyboardOnlyEngine: Promise<KeyboardOnlyEngine>;
  keyboardOnlyGraphEngine: Promise<KeyboardOnlyGraphEngine>;
  keyboardOnlyTreeEngine: Promise<KeyboardOnlyTreeEngine>;
  selectChangeEngine: Promise<SelectChangeEngine>;
  textRenderer: Promise<TextRenderer>;
  imageRenderer: Promise<ImageRenderer>;
  referenceBlockRenderer: Promise<ReferenceBlockRenderer>;
  shapeRenderer: Promise<ShapeRenderer>;
  entityRenderer: Promise<EntityRenderer>;
  edgeRenderer: Promise<EdgeRenderer>;
  multiTargetUndirectedEdgeRenderer: Promise<MultiTargetUndirectedEdgeRenderer>;
  curveRenderer: Promise<CurveRenderer>;
  svgRenderer: Promise<SvgRenderer>;
  drawingControllerRenderer: Promise<DrawingControllerRenderer>;
  collisionBoxRenderer: Promise<CollisionBoxRenderer>;
  entityDetailsButtonRenderer: Promise<EntityDetailsButtonRenderer>;
  straightEdgeRenderer: Promise<StraightEdgeRenderer>;
  symmetryCurveEdgeRenderer: Promise<SymmetryCurveEdgeRenderer>;
  verticalPolyEdgeRenderer: Promise<VerticalPolyEdgeRenderer>;
  sectionRenderer: Promise<SectionRenderer>;
  svgNodeRenderer: Promise<SvgNodeRenderer>;
  latexNodeRenderer: Promise<LatexNodeRenderer>;
  textNodeRenderer: Promise<TextNodeRenderer>;
  urlNodeRenderer: Promise<UrlNodeRenderer>;
  backgroundRenderer: Promise<BackgroundRenderer>;
  searchContentHighlightRenderer: Promise<SearchContentHighlightRenderer>;
  renderer: Promise<Renderer>;
  controller: Promise<Controller>;
  stageExport: Promise<StageExport>;
  stageExportPng: Promise<StageExportPng>;
  stageExportSvg: Promise<StageExportSvg>;
  stageImport: Promise<StageImport>;
  generateFromFolder: Promise<GenerateFromFolder>;
  keyBindHintEngine: Promise<KeyBindHintEngine>;
  sectionMethods: Promise<SectionMethods>;
  graphMethods: Promise<GraphMethods>;
  stageStyleManager: Promise<StageStyleManager>;
  autoSaveBackup: Promise<AutoSaveBackupService>;
  referenceManager: Promise<ReferenceManager>;
}

declare namespace RecentFileManager {
  const store: Promise<Store>;
  declare type RecentFile = {
    uri: URI;
    /**
     * 上次保存或打开的时间戳
     */
    time: number;
  };
  function init(): Promise<void>;
  function addRecentFile(file: RecentFile): Promise<void>;
  function addRecentFileByUri(uri: URI): Promise<void>;
  function addRecentFilesByUris(uris: URI[]): Promise<void>;
  function removeRecentFileByUri(uri: URI): Promise<void>;
  function clearAllRecentFiles(): Promise<void>;
  function getRecentFiles(): Promise<RecentFile[]>;
  function validAndRefreshRecentFiles(): Promise<void>;
  function sortTimeRecentFiles(): Promise<void>;
  function clearRecentFiles(): Promise<void>;
}

declare class RectangleSelect {
  constructor(project: Project | { _: "Project" | (string & {}) });
  selectStartLocation;
  selectEndLocation;
  getSelectStartLocation(): Promise<Vector>;
  getSelectEndLocation(): Promise<Vector>;
  selectingRectangle: Promise<Rectangle | null>;
  limitSection: Promise<Section | null>;
  isSelectDirectionRight;
  getRectangle(): Promise<Rectangle | null>;
  shutDown(): Promise<void>;
  startSelecting(worldLocation: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  moveSelecting(newEndLocation: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  endSelecting(): Promise<void>;
  updateStageObjectByMove(): Promise<void>;
  isSelectWithEntity(entity: StageObject | { _: "StageObject" | (string & {}) }): Promise<void>;
  getSelectMode(): Promise<"contain" | "intersect">;
  getSelectMoveDistance(): Promise<number>;
}

declare class ReferenceBlockNode extends ConnectableEntity implements ResizeAble {
  isHiddenBySectionCollapse: Promise<boolean>;
  uuid: Promise<string>;
  collisionBox: Promise<CollisionBox>;
  fileName: Promise<string>;
  sectionName: Promise<string>;
  scale: Promise<number>;
  attachmentId: Promise<string>;
  _isSelected: Promise<boolean>;
  bitmap: Promise<ImageBitmap | undefined>;
  state: Promise<"loading" | "success" | "notFound">;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      uuid = crypto.randomUUID() as string,
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), new Vector(400, 200))]),
      fileName = "",
      sectionName = "",
      scale = 1,
      attachmentId = "",
      details = [],
    },
    unknown = false,
  );
  get isSelected(): Promise<any>;
  set isSelected(value: boolean);
  loadImageFromAttachment(): Promise<void>;
  generateScreenshot(): Promise<void>;
  updateCollisionBox(): Promise<void>;
  scaleUpdate(scaleDiff: number): Promise<void>;
  get rectangle(): Promise<Rectangle>;
  get geometryCenter(): Promise<any>;
  move(delta: Vector | { _: "Vector" | (string & {}) }): void;
  moveTo(location: Vector | { _: "Vector" | (string & {}) }): void;
  refresh(): Promise<void>;
  goToSource(): Promise<void>;
  focusSectionInProject(project: Project | { _: "Project" | (string & {}) }): Promise<void>;
  resizeHandle(delta: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  getResizeHandleRect(): Promise<Rectangle>;
}

declare class ReferenceBlockRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  render(referenceBlockNode: ReferenceBlockNode | { _: "ReferenceBlockNode" | (string & {}) }): Promise<void>;
  renderBrackets(
    rect: Rectangle | { _: "Rectangle" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
  ): Promise<void>;
  renderSourceSectionBorder(
    section: Section | { _: "Section" | (string & {}) },
    countNumber: number,
    color: Color | { _: "Color" | (string & {}) } = new Color(118, 78, 209),
  ): Promise<void>;
}

declare class ReferenceManager {
  constructor(project: Project | { _: "Project" | (string & {}) });
  referenceBlockTextParser(text: string): Promise<parserResult>;
  onClickReferenceNumber(clickLocation: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  buildSectionName2SectionMap(sectionNames: string[]): Promise<Record<string, Section>>;
  updateOneSectionReferenceInfo(recentFiles: RecentFileManager.RecentFile[], sectionName: string): Promise<void>;
  updateCurrentProjectReference(): Promise<void>;
  checkReferenceBlockInProject(
    project: Project | { _: "Project" | (string & {}) },
    fileName: string,
    sectionName: string,
  ): Promise<void>;
  insertRefDataToSourcePrgFile(fileName: string, sectionName: string): Promise<void>;
  jumpToReferenceLocation(fileName: string, referenceBlockNodeSectionName: string): Promise<void>;
  openSectionReferencePanel(section: Section | { _: "Section" | (string & {}) }): Promise<void>;
}

declare class Renderer {
  FONT_SIZE;
  NODE_PADDING;
  NODE_ROUNDED_RADIUS;
  w;
  h;
  renderedEdges: Promise<number>;
  timings: Promise<{ [key: string]: number }>;
  deltaTime;
  lastTime;
  frameCount;
  frameIndex;
  fps;
  resizeWindow(newW: number, newH: number): Promise<void>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  tick(): Promise<void>;
  tick_(): Promise<void>;
  renderViewElements(_viewRectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  renderZoomLevelStage(): Promise<void>;
  renderMainStageElements(viewRectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  renderStageElementsWithoutReactions(viewRectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  isOverView(
    viewRectangle: Rectangle | { _: "Rectangle" | (string & {}) },
    entity: StageObject | { _: "StageObject" | (string & {}) },
  ): Promise<boolean>;
  renderCenterPointer(): Promise<void>;
  renderHoverCollisionBox(): Promise<void>;
  renderSelectingRectangle(): Promise<void>;
  renderCuttingLine(): Promise<void>;
  renderConnectingLine(): Promise<void>;
  renderCrosshairOnHoverImage(): Promise<void>;
  renderKeyboardOnly(): Promise<void>;
  rendererLayerMovingLine(): Promise<void>;
  renderJumpLine(
    startLocation: Vector | { _: "Vector" | (string & {}) },
    endLocation: Vector | { _: "Vector" | (string & {}) },
  ): Promise<void>;
  renderWarningStageObjects(): Promise<void>;
  renderTags(): Promise<void>;
  renderEntities(viewRectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  renderEdges(viewRectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<void>;
  renderBackground(): Promise<void>;
  updateFPS(): Promise<void>;
  renderDebugDetails(): Promise<void>;
  renderSpecialKeys(): Promise<void>;
  transformWorld2View(location: Vector | { _: "Vector" | (string & {}) }): Promise<Vector>;
  transformWorld2View(rectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<Rectangle>;
  transformWorld2View(arg1: Vector | Rectangle): Promise<Vector | Rectangle>;
  transformView2World(location: Vector | { _: "Vector" | (string & {}) }): Promise<Vector>;
  transformView2World(rectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<Rectangle>;
  transformView2World(arg1: Vector | Rectangle): Promise<Vector | Rectangle>;
  getCoverWorldRectangle(): Promise<Rectangle>;
}

declare class RenderUtils {
  constructor(project: Project | { _: "Project" | (string & {}) });
  renderPixel(
    location: Vector | { _: "Vector" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
  ): Promise<void>;
  renderArrow(
    direction: Vector | { _: "Vector" | (string & {}) },
    location: Vector | { _: "Vector" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    size: number,
  ): Promise<void>;
}

declare interface ResizeAble {
  resizeHandle(delta: Vector | { _: "Vector" | (string & {}) }): void;
  getResizeHandleRect(): Promise<Rectangle>;
}

declare class SearchContentHighlightRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  render(frameTickIndex: number): Promise<void>;
}

declare class Section extends ConnectableEntity {
  _isSelected: Promise<boolean>;
  uuid: Promise<string>;
  _isEditingTitle: Promise<boolean>;
  _collisionBoxWhenCollapsed: Promise<CollisionBox>;
  _collisionBoxNormal: Promise<CollisionBox>;
  get isEditingTitle(): Promise<any>;
  set isEditingTitle(value: boolean);
  bigTitleCameraScale;
  get collisionBox(): Promise<CollisionBox>;
  collapsedCollisionBox(): Promise<CollisionBox>;
  color: Promise<Color>;
  text: Promise<string>;
  children: Promise<Entity>[];
  isCollapsed: Promise<boolean>;
  locked: Promise<boolean>;
  isHiddenBySectionCollapse;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      uuid = crypto.randomUUID() as string,
      text = "",
      collisionBox = new CollisionBox([new Rectangle(new Vector(0, 0), new Vector(0, 0))]),
      _collisionBoxNormal: collisionBoxNormal = undefined as CollisionBox | undefined,
      color = Color.Transparent,
      locked = false,
      isCollapsed = false,
      children = [] as Entity[],
      details = [] as Value,
    } = {},
    unknown = false,
  );
  fromEntities(project: Project | { _: "Project" | (string & {}) }, entities: Entity[]): Promise<Section>;
  rename(newName: string): Promise<void>;
  adjustLocationAndSize(): Promise<void>;
  adjustChildrenStateByCollapse(parentCollapsed = false): Promise<void>;
  get isSelected(): Promise<any>;
  set isSelected(value: boolean);
  get rectangle(): Promise<Rectangle>;
  get geometryCenter(): Promise<any>;
  move(delta: Vector | { _: "Vector" | (string & {}) }): void;
  collideWithOtherEntity(other: Entity | { _: "Entity" | (string & {}) }): void;
  moveTo(location: Vector | { _: "Vector" | (string & {}) }): void;
}

declare class SectionCollisionSolver {
  constructor(project: Project | { _: "Project" | (string & {}) });
  solveOverlaps(grownSection: Section | { _: "Section" | (string & {}) }, visited: Set<string> = new Set()): void;
  updateAncestorsAfterShift(entity: Entity | { _: "Entity" | (string & {}) }, visited: Set<string>): void;
  getSiblingsSections(section: Section | { _: "Section" | (string & {}) }): Promise<Section>[];
  computePushDelta(
    grownRect: Rectangle | { _: "Rectangle" | (string & {}) },
    siblingRect: Rectangle | { _: "Rectangle" | (string & {}) },
  ): Promise<Vector>;
  rawShiftEntityTree(
    entity: Entity | { _: "Entity" | (string & {}) },
    delta: Vector | { _: "Vector" | (string & {}) },
  ): void;
}

declare class SectionInOutManager {
  constructor(project: Project | { _: "Project" | (string & {}) });
  goInSection(entities: Entity[], section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  goInSections(entities: Entity[], sections: Section[]): Promise<void>;
  goOutSection(entities: Entity[], section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  entityDropParent(entity: Entity | { _: "Entity" | (string & {}) }): Promise<void>;
  sectionDropChild(
    section: Section | { _: "Section" | (string & {}) },
    entity: Entity | { _: "Entity" | (string & {}) },
  ): Promise<void>;
  convertSectionToTextNode(section: Section | { _: "Section" | (string & {}) }): Promise<void>;
}

declare class SectionMethods {
  constructor(project: Project | { _: "Project" | (string & {}) });
  getFatherSections(entity: Entity | { _: "Entity" | (string & {}) }): Promise<Section>[];
  isObjectBeLockedBySection(object: StageObject | { _: "StageObject" | (string & {}) }): Promise<boolean>;
  getFatherSectionsList(entity: Entity | { _: "Entity" | (string & {}) }): Promise<Section>[];
  getSectionsByInnerLocation(location: Vector | { _: "Vector" | (string & {}) }): Promise<Section>[];
  deeperSections(sections: Section[]): Promise<Section>[];
  shallowerSection(sections: Section[]): Promise<Section>[];
  shallowerNotSectionEntities(entities: Entity[]): Promise<Entity>[];
  isEntityInSection(
    entity: Entity | { _: "Entity" | (string & {}) },
    section: Section | { _: "Section" | (string & {}) },
  ): Promise<boolean>;
  isEntityInSection_fake(
    entity: Entity | { _: "Entity" | (string & {}) },
    section: Section | { _: "Section" | (string & {}) },
  ): Promise<boolean>;
  _isEntityInSection(
    entity: Entity | { _: "Entity" | (string & {}) },
    section: Section | { _: "Section" | (string & {}) },
    deep = 0,
  ): Promise<boolean>;
  isTreePack(rootNode: Section | { _: "Section" | (string & {}) }): Promise<void>;
  getSectionMaxDeep(section: Section | { _: "Section" | (string & {}) }): Promise<number>;
  getAllEntitiesInSelectedSectionsOrEntities(selectedEntities: Entity[]): Promise<Entity>[];
  getSortedSectionsByZ(sections: Section[]): Promise<Section>[];
}

declare class SectionPackManager {
  constructor(project: Project | { _: "Project" | (string & {}) });
  packSection(): void;
  modifyHiddenDfs(section: Section | { _: "Section" | (string & {}) }, isCollapsed: boolean): Promise<void>;
  unpackSection(): void;
  switchCollapse(): void;
  textNodeToSection(): void;
  textNodeTreeToSection(rootNode: TextNode | { _: "TextNode" | (string & {}) }): void;
  textNodeTreeToSectionNoDeep(rootNode: TextNode | { _: "TextNode" | (string & {}) }): void;
  targetTextNodeToSection(
    textNode: TextNode | { _: "TextNode" | (string & {}) },
    ignoreEdges: boolean = false,
    addConnectPoints: boolean = false,
  ): Promise<Section>;
  unpackSelectedSections(): Promise<void>;
  unpackSections(entities: Entity[]): Promise<void>;
  packEntityToSection(addEntities: Entity[]): Promise<void>;
  createSectionFromSelectionRectangle(): void;
  packSelectedEntitiesToSection(): void;
  getSmartSectionTitle(addEntities: Entity[]): Promise<string>;
}

declare class SectionRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  renderCollapsed(section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  renderNoCollapse(section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  renderBackgroundColor(section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  renderBigCoveredTitle(section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  renderTopTitle(section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  render(section: Section | { _: "Section" | (string & {}) }): void;
}

declare class SelectChangeEngine {
  lastSelectNodeByKeyboardUUID;
  constructor(project: Project | { _: "Project" | (string & {}) });
  selectUp(addSelect = false): Promise<void>;
  selectDown(addSelect = false): Promise<void>;
  selectLeft(addSelect = false): Promise<void>;
  selectRight(addSelect = false): Promise<void>;
  navigateInDirection(
    selectedNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    direction: Direction,
  ): Promise<ConnectableEntity | null>;
  getSameLevelCandidates(
    parentSection: Section | { _: "Section" | (string & {}) },
    excludeNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<ConnectableEntity>[];
  getTopLevelCandidates(
    excludeNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<ConnectableEntity>[];
  expandSelect(isKeepExpand = false, reversed: boolean = false): Promise<void>;
  afterSelect(
    selectedNodeRect: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    newSelectedConnectableEntity: ConnectableEntity | null,
    clearOldSelect = true,
  ): Promise<void>;
  getCurrentSelectedNode(): Promise<ConnectableEntity | null>;
  addEffect(
    selectedNodeRect: Rectangle | { _: "Rectangle" | (string & {}) },
    newSelectNodeRect: Rectangle | { _: "Rectangle" | (string & {}) },
  ): Promise<void>;
  getMostNearConnectableEntity(
    nodes: ConnectableEntity[],
    location: Vector | { _: "Vector" | (string & {}) },
  ): Promise<ConnectableEntity | null>;
  selectMostNearLocationNode(location: Vector | { _: "Vector" | (string & {}) }): Promise<ConnectableEntity | null>;
  collectNodesInStrip(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    direction: Direction,
    candidates: ConnectableEntity[],
  ): Promise<ConnectableEntity>[];
  getMostNearInStripByDh(
    nodes: ConnectableEntity[],
    nodeRect: Rectangle | { _: "Rectangle" | (string & {}) },
    direction: Direction,
  ): Promise<ConnectableEntity | null>;
  collectFanNodes(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    direction: Direction,
    candidates: ConnectableEntity[],
  ): Promise<ConnectableEntity>[];
  collectTopNodes(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    candidates?: ConnectableEntity[],
  ): Promise<ConnectableEntity>[];
  collectBottomNodes(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    candidates?: ConnectableEntity[],
  ): Promise<ConnectableEntity>[];
  collectLeftNodes(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    candidates?: ConnectableEntity[],
  ): Promise<ConnectableEntity>[];
  collectRightNodes(
    node: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    candidates?: ConnectableEntity[],
  ): Promise<ConnectableEntity>[];
}

declare namespace Serialized {
  declare type Vector = [number, number];
  declare type Color = [number, number, number, number];
  declare type StageObject = {
    uuid: string;
    type: string;
  };
  declare type Entity = StageObject & {
    location: Vector;
    details: string;
  };
  declare type TextNodeSizeAdjust = "auto" | "manual";
  declare type TextNode = Entity & {
    type: "core:text_node";
    size: Vector;
    text: string;
    color: Color;
    sizeAdjust: TextNodeSizeAdjust;
  };
  function isTextNode(obj: StageObject | { _: "StageObject" | (string & {}) }): obj is TextNode;
  declare type Section = Entity & {
    type: "core:section";
    size: Vector;
    text: string;
    color: Color;

    children: string[]; // uuid[]
    isHidden: boolean;
    isCollapsed: boolean;
  };
  function isSection(obj: StageObject | { _: "StageObject" | (string & {}) }): obj is Section;
  declare type ConnectPoint = Entity & {
    type: "core:connect_point";
  };
  function isConnectPoint(obj: StageObject | { _: "StageObject" | (string & {}) }): obj is ConnectPoint;
  declare type ImageNode = Entity & {
    path: string;
    size: Vector;
    scale: number;
    type: "core:image_node";
  };
  function isImageNode(obj: StageObject | { _: "StageObject" | (string & {}) }): obj is ImageNode;
  declare type UrlNode = Entity & {
    url: string;
    title: string;
    size: Vector;
    color: Color;
    type: "core:url_node";
  };
  function isUrlNode(obj: StageObject | { _: "StageObject" | (string & {}) }): obj is UrlNode;
  declare type PortalNode = Entity & {
    // 连接的文件
    portalFilePath: string;
    targetLocation: Vector;
    cameraScale: number;
    // 显示的可更改标题
    title: string;
    // 传送门的大小
    size: Vector;
    // 颜色
    color: Color;
    type: "core:portal_node";
  };
  function isPortalNode(obj: StageObject | { _: "StageObject" | (string & {}) }): obj is PortalNode;
  declare type PenStroke = Entity & {
    type: "core:pen_stroke";
    content: string;
    color: Color;
  };
  function isPenStroke(obj: StageObject | { _: "StageObject" | (string & {}) }): obj is PenStroke;
  declare type SvgNode = Entity & {
    type: "core:svg_node";
    content: string;
    size: Vector;
    color: Color;
    scale: number;
  };
  function isSvgNode(obj: StageObject | { _: "StageObject" | (string & {}) }): obj is SvgNode;
  declare type Association = StageObject & {
    text: string;
    color: Color;
  };
  declare type UndirectedEdgeArrowType = "inner" | "outer" | "none";
  declare type MultiTargetUndirectedEdgeRenderType = "line" | "convex";
  declare type MultiTargetUndirectedEdge = Association & {
    type: "core:multi_target_undirected_edge";
    targets: string[];
    arrow: UndirectedEdgeArrowType;
    rectRates: [number, number][]; // 默认中心 0.5, 0.5
    centerRate: [number, number]; // 默认中心 0.5, 0.5
    padding: number;
    renderType: MultiTargetUndirectedEdgeRenderType;
  };
  function isMultiTargetUndirectedEdge(
    obj: StageObject | { _: "StageObject" | (string & {}) },
  ): obj is MultiTargetUndirectedEdge;
  declare type Edge = Association & {
    source: string;
    target: string;
    sourceRectRate: [number, number]; // 默认中心 0.5, 0.5
    targetRectRate: [number, number]; // 默认中心 0.5, 0.5
  };
  function isEdge(obj: StageObject | { _: "StageObject" | (string & {}) }): obj is Edge;
  declare type LineEdge = Edge & {
    type: "core:line_edge";
    color: Color;
    text: string;
  };
  function isLineEdge(obj: StageObject | { _: "StageObject" | (string & {}) }): obj is LineEdge;
  function isCubicCatmullRomSplineEdge(
    obj: StageObject | { _: "StageObject" | (string & {}) },
  ): obj is CubicCatmullRomSplineEdge;
  declare type CubicCatmullRomSplineEdge = Edge & {
    type: "core:cublic_catmull_rom_spline_edge";
    text: string;
    controlPoints: Vector[];
    alpha: number;
    tension: number;
  };
  declare type CoreEntity = TextNode | Section | ConnectPoint | ImageNode | UrlNode | PenStroke | PortalNode | SvgNode;
  function isCoreEntity(obj: StageObject | { _: "StageObject" | (string & {}) }): obj is CoreEntity;
  declare type CoreAssociation = LineEdge | CubicCatmullRomSplineEdge | MultiTargetUndirectedEdge;
  declare type File = {
    version: typeof Project.latestVersion;
    entities: CoreEntity[];
    associations: CoreAssociation[];
    tags: string[];
  };
}

declare interface Service {
  tick(): void;
  dispose(): Promise<void | Promise<void>>;
}

declare type Settings = z.infer<typeof settingsSchema>;

declare class ShapeRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  renderCircle(
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    radius: number,
    color: Color | { _: "Color" | (string & {}) },
    strokeColor: Color | { _: "Color" | (string & {}) },
    strokeWidth: number,
  ): void;
  renderArc(
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    radius: number,
    angle1: number,
    angle2: number,
    strokeColor: Color | { _: "Color" | (string & {}) },
    strokeWidth: number,
  ): void;
  renderRectFromCenter(
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    width: number,
    height: number,
    color: Color | { _: "Color" | (string & {}) },
    strokeColor: Color | { _: "Color" | (string & {}) },
    strokeWidth: number,
    radius: number = 0,
  ): void;
  renderRect(
    rect: Rectangle | { _: "Rectangle" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    strokeColor: Color | { _: "Color" | (string & {}) },
    strokeWidth: number,
    radius: number = 0,
  ): Promise<void>;
  renderDashedRect(
    rect: Rectangle | { _: "Rectangle" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    strokeColor: Color | { _: "Color" | (string & {}) },
    strokeWidth: number,
    radius: number = 0,
    dashLength = 5,
  ): Promise<void>;
  renderRectWithShadow(
    rect: Rectangle | { _: "Rectangle" | (string & {}) },
    fillColor: Color | { _: "Color" | (string & {}) },
    strokeColor: Color | { _: "Color" | (string & {}) },
    strokeWidth: number,
    shadowColor: Color | { _: "Color" | (string & {}) },
    shadowBlur: number,
    shadowOffsetX: number = 0,
    shadowOffsetY: number = 0,
    radius: number = 0,
  ): Promise<void>;
  renderPolygonAndFill(
    points: Vector[],
    fillColor: Color | { _: "Color" | (string & {}) },
    strokeColor: Color | { _: "Color" | (string & {}) },
    strokeWidth: number,
    lineJoin: "round" | "bevel" = "round",
  ): void;
  renderTriangleFromCenter(
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    size: number,
    rotation: number,
    fillColor: Color | { _: "Color" | (string & {}) },
    strokeColor: Color | { _: "Color" | (string & {}) },
    strokeWidth: number,
  ): void;
  renderSquareFromCenter(
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    size: number,
    rotation: number,
    fillColor: Color | { _: "Color" | (string & {}) },
    strokeColor: Color | { _: "Color" | (string & {}) },
    strokeWidth: number,
  ): void;
  renderCircleTransition(
    viewLocation: Vector | { _: "Vector" | (string & {}) },
    radius: number,
    centerColor: Color | { _: "Color" | (string & {}) },
  ): Promise<void>;
  renderCameraShapeBorder(
    rect: Rectangle | { _: "Rectangle" | (string & {}) },
    borderColor: Color | { _: "Color" | (string & {}) },
    borderWidth: number,
  ): Promise<void>;
  renderResizeArrow(
    rect: Rectangle | { _: "Rectangle" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    strokeWidth: number,
  ): Promise<void>;
}

declare class StageExport {
  plainTextExporter: Promise<PlainTextExporter>;
  markdownExporter: Promise<MarkdownExporter>;
  tabExporter: Promise<TabExporter>;
  mermaidExporter: Promise<MermaidExporter>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  getPlainTextByEntities(nodes: Entity[]): Promise<void>;
  getMarkdownStringByTextNode(textNode: TextNode | { _: "TextNode" | (string & {}) }): Promise<void>;
  getTabStringByTextNode(textNode: TextNode | { _: "TextNode" | (string & {}) }): Promise<void>;
  getMermaidTextByEntities(entities: Entity[]): Promise<string>;
}

declare class StageExportPng {
  constructor(project: Project | { _: "Project" | (string & {}) });
  exportStage_(emitter: EventEmitter<EventMap>, signal: AbortSignal, sleepTime: number): Promise<void>;
  exportStage(signal: AbortSignal, sleepTime: number = 2): Promise<void>;
  generateCanvasNode(): Promise<HTMLCanvasElement>;
}

declare class StageExportSvg {
  constructor(project: Project | { _: "Project" | (string & {}) });
  svgConfig: Promise<SvgExportConfig>;
  exportContext: Promise<{
    outputDir: string;
    imageMap: Map<string, string>; // attachmentId -> relative file path
  } | null>;
  setConfig(config: SvgExportConfig): Promise<void>;
  dumpNode(node: TextNode | { _: "TextNode" | (string & {}) }): Promise<void>;
  dumpSection(section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  dumpSectionBase(section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  dumpEdge(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<React.ReactNode>;
  dumpEntityDetails(entity: Entity | { _: "Entity" | (string & {}) }): Promise<React.ReactNode>;
  getEntityDetailsDataAttribute(entity: Entity | { _: "Entity" | (string & {}) }): Promise<string | undefined>;
  dumpUrlNode(node: UrlNode | { _: "UrlNode" | (string & {}) }): Promise<void>;
  dumpImageNode(node: ImageNode | { _: "ImageNode" | (string & {}) }, svgConfigObject: SvgExportConfig): Promise<void>;
  getEntitiesOuterRectangle(entities: Entity[], padding: number): Promise<Rectangle>;
  dumpSelected(): Promise<React.ReactNode>;
  dumpStage(): Promise<React.ReactNode>;
  dumpStageToSVGString(): Promise<string>;
  dumpSelectedToSVGString(): Promise<string>;
  exportStageToSVGFile(filePath: string): Promise<void>;
  exportSelectedToSVGFile(filePath: string): Promise<void>;
}

declare class StageImport {
  graphImporter: Promise<GraphImporter>;
  treeImporter: Promise<TreeImporter>;
  mermaidImporter: Promise<MermaidImporter>;
  markdownImporter: Promise<MarkdownImporter>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  addNodeGraphByText(
    text: string,
    diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero(),
  ): Promise<void>;
  addNodeTreeByText(
    text: string,
    indention: number,
    diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero(),
  ): Promise<void>;
  addNodeTreeByTextFromNode(
    uuid: string,
    text: string,
    indention: number,
  ): Promise<{ success: boolean; error?: string; nodeCount?: number }>;
  addNodeMermaidByText(
    text: string,
    diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero(),
  ): Promise<void>;
  addNodeByMarkdown(
    markdownText: string,
    diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero(),
    autoLayout = true,
  ): Promise<void>;
}

declare class StageManager {
  constructor(project: Project | { _: "Project" | (string & {}) });
  get(uuid: string): Promise<void>;
  isEmpty(): Promise<boolean>;
  getTextNodes(): Promise<TextNode>[];
  getConnectableEntity(): Promise<ConnectableEntity>[];
  isEntityExists(uuid: string): Promise<boolean>;
  getSections(): Promise<Section>[];
  getImageNodes(): Promise<ImageNode>[];
  getConnectPoints(): Promise<ConnectPoint>[];
  getUrlNodes(): Promise<UrlNode>[];
  getPenStrokes(): Promise<PenStroke>[];
  getSvgNodes(): Promise<SvgNode>[];
  getLatexNodes(): Promise<LatexNode>[];
  getStageObjects(): Promise<StageObject>[];
  getEntities(): Promise<Entity>[];
  getEntitiesByUUIDs(uuids: string[]): Promise<Entity>[];
  isNoEntity(): Promise<boolean>;
  delete(stageObject: StageObject | { _: "StageObject" | (string & {}) }): Promise<void>;
  getAssociations(): Promise<Association>[];
  getEdges(): Promise<Edge>[];
  getLineEdges(): Promise<LineEdge>[];
  getCrEdges(): Promise<CubicCatmullRomSplineEdge>[];
  add(stageObject: StageObject | { _: "StageObject" | (string & {}) }): Promise<void>;
  updateReferences(): Promise<void>;
  getTextNodeByUUID(uuid: string): Promise<TextNode | null>;
  getConnectableEntityByUUID(uuid: string): Promise<ConnectableEntity | null>;
  isSectionByUUID(uuid: string): Promise<boolean>;
  getSectionByUUID(uuid: string): Promise<Section | null>;
  getCenter(): Promise<Vector>;
  getSize(): Promise<Vector>;
  getBoundingRectangle(): Promise<Rectangle>;
  findTextNodeByLocation(location: Vector | { _: "Vector" | (string & {}) }): Promise<TextNode | null>;
  findLineEdgeByLocation(location: Vector | { _: "Vector" | (string & {}) }): Promise<LineEdge | null>;
  findAssociationByLocation(location: Vector | { _: "Vector" | (string & {}) }): Promise<Association | null>;
  findSectionByLocation(location: Vector | { _: "Vector" | (string & {}) }): Promise<Section | null>;
  findImageNodeByLocation(location: Vector | { _: "Vector" | (string & {}) }): Promise<ImageNode | null>;
  findConnectableEntityByLocation(
    location: Vector | { _: "Vector" | (string & {}) },
  ): Promise<ConnectableEntity | null>;
  findEntityByLocation(location: Vector | { _: "Vector" | (string & {}) }): Promise<Entity | null>;
  findConnectPointByLocation(location: Vector | { _: "Vector" | (string & {}) }): Promise<ConnectPoint | null>;
  isHaveEntitySelected(): Promise<boolean>;
  getSelectedEntities(): Promise<Entity>[];
  getSelectedAssociations(): Promise<Association>[];
  getSelectedStageObjects(): Promise<StageObject>[];
  getBoundingBoxOfSelected(): Promise<Rectangle>;
  isEntityOnLocation(location: Vector | { _: "Vector" | (string & {}) }): Promise<boolean>;
  isAssociationOnLocation(location: Vector | { _: "Vector" | (string & {}) }): Promise<boolean>;
  deleteEntities(deleteNodes: Entity[]): Promise<void>;
  deleteSelectedStageObjects(): Promise<void>;
  deleteAssociation(deleteAssociation: Association): Promise<boolean>;
  deleteEdge(deleteEdge: Edge): Promise<boolean>;
  w;
  connectEntity(
    fromNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    isCrEdge: boolean = false,
  ): Promise<void>;
  connectMultipleEntities(
    fromNodes: ConnectableEntity[],
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    isCrEdge: boolean = false,
    sourceRectRate?: [number, number],
    targetRectRate?: [number, number],
  ): Promise<void>;
  reverseSelectedEdges(): Promise<void>;
  generateNodeTreeByText(text: string, indention: number = 4, location = this.project.camera.location): Promise<void>;
  generateNodeGraphByText(text: string, location = this.project.camera.location): Promise<void>;
  generateNodeMermaidByText(text: string, location = this.project.camera.location): Promise<void>;
  generateNodeByMarkdown(text: string, location = this.project.camera.location, autoLayout = true): Promise<void>;
  packEntityToSection(addEntities: Entity[]): Promise<void>;
  packEntityToSectionBySelected(): Promise<void>;
  goInSection(entities: Entity[], section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  goOutSection(entities: Entity[], section: Section | { _: "Section" | (string & {}) }): Promise<void>;
  packSelectedSection(): Promise<void>;
  unpackSelectedSection(): Promise<void>;
  sectionSwitchCollapse(): Promise<void>;
  connectEntityByCrEdge(
    fromNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
  ): Promise<void>;
  refreshAllStageObjects(): Promise<void>;
  refreshSelected(): Promise<void>;
  changeSelectedEdgeConnectLocation(direction: Direction | null, isSource: boolean = false): Promise<void>;
  changeEdgesConnectLocation(edges: Edge[], direction: Direction | null, isSource: boolean = false): Promise<void>;
  switchLineEdgeToCrEdge(): Promise<void>;
  switchEdgeToUndirectedEdge(): Promise<void>;
  switchUndirectedEdgeToEdge(): Promise<void>;
  addSelectedCREdgeControlPoint(): Promise<void>;
  addSelectedCREdgeTension(): Promise<void>;
  reduceSelectedCREdgeTension(): Promise<void>;
  setSelectedEdgeLineType(lineType: string): Promise<void>;
  selectAll(): Promise<void>;
  clearSelectAll(): Promise<void>;
}

declare class StageNodeRotate {
  constructor(project: Project | { _: "Project" | (string & {}) });
  moveEdges(
    lastMoveLocation: Vector | { _: "Vector" | (string & {}) },
    diffLocation: Vector | { _: "Vector" | (string & {}) },
  ): Promise<void>;
  rotateNodeDfs(
    rotateCenterNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    currentNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    degrees: number,
    visitedUUIDs: string[],
  ): void;
}

declare class StageObject {
  project: Promise<Project>;
  uuid: Promise<string>;
  collisionBox: Promise<CollisionBox>;
  get isPhysical(): Promise<boolean>;
  _isSelected: Promise<boolean>;
  get isSelected(): Promise<boolean>;
  set isSelected(value: boolean);
  _isSyncing: Promise<boolean>;
}

declare class StageObjectColorManager {
  constructor(project: Project | { _: "Project" | (string & {}) });
  setSelectedStageObjectColor(color: Color | { _: "Color" | (string & {}) }): Promise<void>;
  darkenNodeColor(): Promise<void>;
  lightenNodeColor(): Promise<void>;
}

declare class StageObjectSelectCounter {
  constructor(project: Project | { _: "Project" | (string & {}) });
  selectedStageObjectCount;
  selectedEntityCount;
  selectedAssociationCount;
  selectedEdgeCount;
  selectedCREdgeCount;
  selectedImageNodeCount;
  selectedTextNodeCount;
  selectedSectionCount;
  selectedMultiTargetUndirectedEdgeCount;
  lastUpdateTimestamp;
  update(): Promise<void>;
}

declare class StageStyleManager {
  currentStyle;
  constructor();
}

declare class StageSyncAssociationManager {
  constructor(project: Project | { _: "Project" | (string & {}) });
  createTwinsFromSelectedEntities(): void;
  getSyncAssociations(): Promise<SyncAssociation>[];
  getSyncAssociationsByMember(member: StageObject | { _: "StageObject" | (string & {}) }): Promise<SyncAssociation>[];
  getSyncSiblings(member: StageObject | { _: "StageObject" | (string & {}) }): Promise<StageObject>[];
  createTwinTextNode(source: TextNode | { _: "TextNode" | (string & {}) }): Promise<TextNode>;
  syncFrom(
    source: StageObject | { _: "StageObject" | (string & {}) },
    key: SyncableKey,
    syncingSet: Set<string> = new Set(),
  ): void;
  onStageObjectDeleted(deleted: StageObject | { _: "StageObject" | (string & {}) }): void;
}

declare class StageUtils {
  constructor(project: Project | { _: "Project" | (string & {}) });
  replaceAutoNameWithoutStage(template: string): Promise<string>;
  replaceAutoNameTemplate(
    currentName: string,
    targetStageObject: StageObject | { _: "StageObject" | (string & {}) },
  ): Promise<string>;
  isNameConflictWithTextNodes(name: string): Promise<boolean>;
  isNameConflictWithSections(name: string): Promise<boolean>;
}

declare class StraightEdgeRenderer extends EdgeRendererClass {
  constructor(project: Project | { _: "Project" | (string & {}) });
  getCuttingEffects(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<Effect>[];
  getConnectedEffects(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
    targetRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): Promise<Effect>[];
  renderLine(
    start: Vector | { _: "Vector" | (string & {}) },
    end: Vector | { _: "Vector" | (string & {}) },
    edge: LineEdge | { _: "LineEdge" | (string & {}) },
    width: number,
  ): void;
  renderNormalState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  getNormalStageSvg(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<React.ReactNode>;
  getCycleStageSvg(): Promise<React.ReactNode>;
  getShiftingStageSvg(): Promise<React.ReactNode>;
  renderArrowHead(
    edge: LineEdge | { _: "LineEdge" | (string & {}) },
    direction: Vector | { _: "Vector" | (string & {}) },
    endPoint = edge.bodyLine.end.clone(),
    size = 15,
  ): Promise<void>;
  shouldRenderTargetArrow(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<boolean>;
  renderShiftingState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  renderCycleState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  renderVirtualEdge(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    mouseLocation: Vector | { _: "Vector" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): void;
  renderVirtualConfirmedEdge(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    endNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
    targetRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): void;
}

declare class SvgNode extends ConnectableEntity implements ResizeAble {
  color: Promise<Color>;
  uuid: Promise<string>;
  scale: Promise<number>;
  collisionBox: Promise<CollisionBox>;
  attachmentId: Promise<string>;
  isHiddenBySectionCollapse: Promise<boolean>;
  originalSize: Promise<Vector>;
  image: Promise<HTMLImageElement>;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      uuid = crypto.randomUUID(),
      details = [],
      attachmentId = "",
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), Vector.getZero())]),
      scale = 1,
      color = Color.Transparent,
    },
  );
  get geometryCenter(): Promise<Vector>;
  scaleUpdate(scaleDiff: number): Promise<void>;
  move(delta: Vector | { _: "Vector" | (string & {}) }): void;
  moveTo(location: Vector | { _: "Vector" | (string & {}) }): void;
  changeColor(newColor: Color | { _: "Color" | (string & {}) }, mode: "fill" | "stroke" = "fill"): Promise<void>;
  resizeHandle(delta: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  getResizeHandleRect(): Promise<Rectangle>;
}

declare class SvgNodeRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  render(svgNode: SvgNode | { _: "SvgNode" | (string & {}) }): Promise<void>;
}

declare class SvgRenderer {
  svgCache: Promise<{ [key: string]: HTMLImageElement }>;
  constructor(project: Project | { _: "Project" | (string & {}) });
  renderSvgFromLeftTop(
    svg: string,
    location: Vector | { _: "Vector" | (string & {}) },
    width: number,
    height: number,
  ): void;
  renderSvgFromCenter(
    svg: string,
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    width: number,
    height: number,
  ): void;
  renderSvgFromLeftTopWithoutSize(
    svg: string,
    location: Vector | { _: "Vector" | (string & {}) },
    scaleNumber = 1,
  ): void;
  renderSvgFromCenterWithoutSize(svg: string, centerLocation: Vector | { _: "Vector" | (string & {}) }): void;
}

declare class SymmetryCurveEdgeRenderer extends EdgeRendererClass {
  constructor(project: Project | { _: "Project" | (string & {}) });
  shouldRenderTargetArrow(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<boolean>;
  getCuttingEffects(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<Effect>[];
  getConnectedEffects(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
    targetRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): Promise<Effect>[];
  renderNormalState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  renderShiftingState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  renderCycleState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  getNormalStageSvg(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<React.ReactNode>;
  getCycleStageSvg(): Promise<React.ReactNode>;
  getShiftingStageSvg(): Promise<React.ReactNode>;
  renderVirtualEdge(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    mouseLocation: Vector | { _: "Vector" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): void;
  renderVirtualConfirmedEdge(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    endNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
    targetRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): void;
  renderArrowCurve(
    curve: SymmetryCurve | { _: "SymmetryCurve" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width = 2,
    edge?: LineEdge | { _: "LineEdge" | (string & {}) },
  ): void;
  renderText(
    curve: SymmetryCurve | { _: "SymmetryCurve" | (string & {}) },
    edge: LineEdge | { _: "LineEdge" | (string & {}) },
  ): void;
}

declare type SyncableKey = "text" | "color" | "details";

declare class SyncAssociation extends Association {
  uuid: Promise<string>;
  keys: Promise<SyncableKey>[];
  associationList: Promise<StageObject>[];
  get collisionBox(): Promise<CollisionBox>;
  get isPhysical(): Promise<boolean>;
  _isSelected: Promise<boolean>;
  get isSelected(): Promise<boolean>;
  set isSelected(value: boolean);
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      uuid = crypto.randomUUID() as string,
      keys = ["text", "color", "details"] as SyncableKey[],
      associationList = [] as StageObject[],
      color = Color.Transparent,
    }: {
      uuid?: string;
      keys?: SyncableKey[];
      associationList?: StageObject[];
      color?: Color;
    },
    unknown = false,
  );
  applyFrom(source: StageObject | { _: "StageObject" | (string & {}) }): void;
}

declare class Tab extends React.Component<Record<string, never>, Record<string, never>> {
  eventEmitter;
  services;
  fileSystemProviders;
  tickableServices: Promise<Service>[];
  rafHandle;
  lastTickTime;
  getComponent(): Promise<React.ComponentType>;
  get title(): Promise<string>;
  get icon(): Promise<React.ComponentType<any> | null>;
  constructor(props: Record<string, never>);
  registerFileSystemProvider(scheme: string, provider: { new (...args: any[]): FileSystemProvider }): Promise<void>;
  get fs(): Promise<FileSystemProvider>;
  on(event: string | symbol, listener: (...args: any[]) => void): Promise<this>;
  emit(event: string | symbol, ...args: any[]): Promise<boolean>;
  removeAllListeners(event?: string | symbol): Promise<this>;
  loadService(service: { id?: string; new (...args: any[]): any }): Promise<void>;
  disposeService(serviceId: string): Promise<void>;
  getService<T extends keyof this & string>(serviceId: T): Promise<this[T]>;
  init(): Promise<void>;
  loop(): Promise<void>;
  pause(): Promise<void>;
  tick(): Promise<void>;
  dispose(): Promise<void>;
  get isRunning(): Promise<boolean>;
  render(): Promise<React.ReactNode>;
}

declare class TabExporter extends BaseExporter {
  export(textNode: TextNode | { _: "TextNode" | (string & {}) }): Promise<string>;
  getTabText(node: TextNode | { _: "TextNode" | (string & {}) }, level: number): Promise<string>;
}

declare class TagManager {
  constructor(project: Project | { _: "Project" | (string & {}) });
  tagSet: Promise<Set<string>>;
  reset(uuids: string[]): Promise<void>;
  addTag(uuid: string): Promise<void>;
  removeTag(uuid: string): Promise<void>;
  hasTag(uuid: string): Promise<boolean>;
  updateTags(): Promise<void>;
  moveUpTag(uuid: string): Promise<void>;
  moveDownTag(uuid: string): Promise<void>;
  changeTagBySelected(): Promise<void>;
  refreshTagNamesUI(): Promise<void>;
  moveCameraToTag(tagUUID: string): Promise<void>;
}

declare class TextNode extends ConnectableEntity implements ResizeAble {
  uuid: Promise<string>;
  text: Promise<string>;
  collisionBox: Promise<CollisionBox>;
  color: Promise<Color>;
  fontScaleLevel: Promise<number>;
  enableResizeCharCount;
  sizeAdjust: Promise<string>;
  _isSelected: Promise<boolean>;
  get isSelected(): Promise<any>;
  get rectangle(): Promise<Rectangle>;
  get geometryCenter(): Promise<any>;
  set isSelected(value: boolean);
  _isEditing: Promise<boolean>;
  get isEditing(): Promise<any>;
  set isEditing(value: boolean);
  isHiddenBySectionCollapse;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      uuid = crypto.randomUUID() as string,
      text = "",
      details = [],
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), Vector.getZero())]),
      color = Color.Transparent,
      sizeAdjust = "auto",
      fontScaleLevel = 0,
    }: {
      uuid?: string;
      text?: string;
      details?: Value;
      color?: Color;
      sizeAdjust?: "auto" | "manual";
      collisionBox?: CollisionBox;
      fontScaleLevel?: number;
    },
    unknown = false,
  );
  fontSizeCache: Promise<number>;
  getFontSize(): Promise<number>;
  getPadding(): Promise<number>;
  getBorderWidth(): Promise<number>;
  getBorderRadius(): Promise<number>;
  updateFontSizeCache(): void;
  setFontScaleLevel(level: number): Promise<void>;
  increaseFontSize(anchorRate?: Vector | { _: "Vector" | (string & {}) }): void;
  decreaseFontSize(anchorRate?: Vector | { _: "Vector" | (string & {}) }): void;
  _adjustLocationToKeepAnchor(
    oldRect: Rectangle | { _: "Rectangle" | (string & {}) },
    anchorRate: Vector | { _: "Vector" | (string & {}) },
  ): void;
  adjustSizeByText(): Promise<void>;
  adjustHeightByText(): Promise<void>;
  forceAdjustSizeByText(): Promise<void>;
  rename(text: string): Promise<void>;
  resizeHandle(delta: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  resizeWidthTo(width: number): Promise<void>;
  getResizeHandleRect(): Promise<Rectangle>;
  move(delta: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
  collideWithOtherEntity(other: Entity): void;
  moveTo(location: Vector | { _: "Vector" | (string & {}) }): Promise<void>;
}

declare class TextNodeRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  renderTextNode(node: TextNode | { _: "TextNode" | (string & {}) }): Promise<void>;
  renderKeyboardTreeHint(node: TextNode | { _: "TextNode" | (string & {}) }): void;
  renderLogicNodeWarningTrap(node: TextNode | { _: "TextNode" | (string & {}) }): Promise<void>;
  renderTextNodeTextLayer(node: TextNode | { _: "TextNode" | (string & {}) }): Promise<void>;
}

declare class TextRenderer {
  cache;
  constructor(project: Project | { _: "Project" | (string & {}) });
  hash(text: string, size: number): Promise<string>;
  getCache(text: string, size: number): Promise<void>;
  getCacheNearestSize(text: string, size: number): Promise<ImageBitmap | undefined>;
  buildCache(text: string, size: number, color: Color | { _: "Color" | (string & {}) }): Promise<CanvasImageSource>;
  renderText(
    text: string,
    location: Vector | { _: "Vector" | (string & {}) },
    size: number,
    color: Color | { _: "Color" | (string & {}) } = Color.White,
  ): void;
  renderTempText(
    text: string,
    location: Vector | { _: "Vector" | (string & {}) },
    size: number,
    color: Color | { _: "Color" | (string & {}) } = Color.White,
  ): void;
  renderTextFromCenter(
    text: string,
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    size: number,
    color: Color | { _: "Color" | (string & {}) } = Color.White,
  ): void;
  renderTempTextFromCenter(
    text: string,
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    size: number,
    color: Color | { _: "Color" | (string & {}) } = Color.White,
  ): void;
  renderTextInRectangle(
    text: string,
    rectangle: Rectangle | { _: "Rectangle" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
  ): void;
  getFontSizeByRectangleSize(text: string, rectangle: Rectangle | { _: "Rectangle" | (string & {}) }): Promise<Vector>;
  renderMultiLineText(
    text: string,
    location: Vector | { _: "Vector" | (string & {}) },
    fontSize: number,
    limitWidth: number,
    color: Color | { _: "Color" | (string & {}) } = Color.White,
    lineHeight: number = 1.2,
    limitLines: number = Infinity,
  ): void;
  renderTempMultiLineText(
    text: string,
    location: Vector | { _: "Vector" | (string & {}) },
    fontSize: number,
    limitWidth: number,
    color: Color | { _: "Color" | (string & {}) } = Color.White,
    lineHeight: number = 1.2,
    limitLines: number = Infinity,
  ): void;
  renderMultiLineTextFromCenterWithStroke(
    text: string,
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    size: number,
    fillColor: Color | { _: "Color" | (string & {}) },
    strokeColor: Color | { _: "Color" | (string & {}) },
    limitWidth: number = Infinity,
    lineHeight: number = 1.2,
  ): void;
  renderMultiLineTextFromCenter(
    text: string,
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    size: number,
    limitWidth: number,
    color: Color | { _: "Color" | (string & {}) },
    lineHeight: number = 1.2,
    limitLines: number = Infinity,
  ): void;
  renderTempMultiLineTextFromCenter(
    text: string,
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    size: number,
    limitWidth: number,
    color: Color | { _: "Color" | (string & {}) },
    lineHeight: number = 1.2,
    limitLines: number = Infinity,
  ): void;
  textArrayCache: Promise<LruCache<string, string[]>>;
  textToTextArrayWrapCache(text: string, fontSize: number, limitWidth: number): Promise<string>[];
  textToTextArray(text: string, fontSize: number, limitWidth: number): Promise<string>[];
  measureMultiLineTextSize(
    text: string,
    fontSize: number,
    limitWidth: number,
    lineHeight: number = 1.2,
  ): Promise<Vector>;
}

declare const transformedKeys;

declare class TreeImporter extends BaseImporter {
  constructor(project: Project | { _: "Project" | (string & {}) });
  import(
    text: string,
    indention: number,
    diffLocation: Vector | { _: "Vector" | (string & {}) } = Vector.getZero(),
  ): void;
  importFromNode(
    uuid: string,
    text: string,
    indention: number,
  ): Promise<{ success: boolean; error?: string; nodeCount?: number }>;
  getIndentLevel(line: string, indention: number): Promise<number>;
}

declare interface UIKeyBind {
  id: Promise<string>;
  key: Promise<string>;
  isEnabled: Promise<boolean>;
  onPress: Promise<(project?: Project) => void>;
  when: Promise<KeyBindWhen>;
  icon?: Promise<KeyBindIcon>;
  isContinuous?: Promise<boolean>;
  onRelease?: Promise<(project?: Project) => void>;
}

declare class UrlNode extends ConnectableEntity {
  uuid: Promise<string>;
  title: Promise<string>;
  url: Promise<string>;
  color: Promise<Color>;
  collisionBox: Promise<CollisionBox>;
  width: Promise<number>;
  height: Promise<number>;
  titleHeight: Promise<number>;
  _isEditingTitle: Promise<boolean>;
  isMouseHoverTitle: Promise<boolean>;
  isMouseHoverUrl: Promise<boolean>;
  get isEditingTitle(): Promise<any>;
  set isEditingTitle(value: boolean);
  get geometryCenter(): Promise<Vector>;
  get titleRectangle(): Promise<Rectangle>;
  get urlRectangle(): Promise<Rectangle>;
  get rectangle(): Promise<Rectangle>;
  move(delta: Vector | { _: "Vector" | (string & {}) }): void;
  moveTo(location: Vector | { _: "Vector" | (string & {}) }): void;
  isHiddenBySectionCollapse: Promise<boolean>;
  constructor(
    project: Project | { _: "Project" | (string & {}) },
    {
      uuid = crypto.randomUUID() as string,
      title = "",
      details = [],
      url = "",
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), new Vector(UrlNode.width, UrlNode.height))]),
      color = Color.Transparent,
    },
  );
  rename(title: string): void;
  adjustSizeByText(): Promise<void>;
}

declare class UrlNodeRenderer {
  constructor(project: Project | { _: "Project" | (string & {}) });
  render(urlNode: UrlNode | { _: "UrlNode" | (string & {}) }): void;
  renderHoverState(urlNode: UrlNode | { _: "UrlNode" | (string & {}) }): void;
}

declare class VerticalPolyEdgeRenderer extends EdgeRendererClass {
  constructor(project: Project | { _: "Project" | (string & {}) });
  getCuttingEffects(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<Effect>[];
  getConnectedEffects(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    toNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
    targetRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): Promise<Effect>[];
  getVerticalDirection(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<Vector>;
  fixedLength: Promise<number>;
  renderTest(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<void>;
  gaussianFunction(x: number): Promise<void>;
  renderNormalState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  renderShiftingState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  shouldRenderTargetArrow(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<boolean>;
  renderArrowHead(
    edge: LineEdge | { _: "LineEdge" | (string & {}) },
    direction: Vector | { _: "Vector" | (string & {}) },
    endPoint = edge.bodyLine.end.clone(),
  ): Promise<void>;
  renderCycleState(edge: LineEdge | { _: "LineEdge" | (string & {}) }): void;
  getNormalStageSvg(edge: LineEdge | { _: "LineEdge" | (string & {}) }): Promise<React.ReactNode>;
  getCycleStageSvg(): Promise<React.ReactNode>;
  getShiftingStageSvg(): Promise<React.ReactNode>;
  renderVirtualEdge(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    mouseLocation: Vector | { _: "Vector" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): void;
  renderVirtualConfirmedEdge(
    startNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    endNode: ConnectableEntity | { _: "ConnectableEntity" | (string & {}) },
    sourceRectangleRate?: Vector | { _: "Vector" | (string & {}) },
    targetRectangleRate?: Vector | { _: "Vector" | (string & {}) },
  ): void;
}

declare class WorldRenderUtils {
  constructor(project: Project | { _: "Project" | (string & {}) });
  renderCubicCatmullRomSpline(
    spline: CubicCatmullRomSpline | { _: "CubicCatmullRomSpline" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
  ): void;
  renderBezierCurve(
    curve: CubicBezierCurve | { _: "CubicBezierCurve" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
  ): void;
  renderSymmetryCurve(
    curve: SymmetryCurve | { _: "SymmetryCurve" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
  ): void;
  renderDashedSymmetryCurve(
    curve: SymmetryCurve | { _: "SymmetryCurve" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
    dashLength: number,
  ): void;
  renderDoubleSymmetryCurve(
    curve: SymmetryCurve | { _: "SymmetryCurve" | (string & {}) },
    color: Color | { _: "Color" | (string & {}) },
    width: number,
    gap: number,
  ): void;
  renderLaser(
    start: Vector | { _: "Vector" | (string & {}) },
    end: Vector | { _: "Vector" | (string & {}) },
    width: number,
    color: Color | { _: "Color" | (string & {}) },
  ): void;
  renderPrismaticBlock(
    centerLocation: Vector | { _: "Vector" | (string & {}) },
    radius: number,
    color: Color | { _: "Color" | (string & {}) },
    strokeColor: Color | { _: "Color" | (string & {}) },
    strokeWidth: number,
  ): void;
  renderRectangleFlash(
    rectangle: Rectangle | { _: "Rectangle" | (string & {}) },
    shadowColor: Color | { _: "Color" | (string & {}) },
    shadowBlur: number,
    roundedRadius = 0,
  ): Promise<void>;
  renderCuttingFlash(
    start: Vector | { _: "Vector" | (string & {}) },
    end: Vector | { _: "Vector" | (string & {}) },
    width: number,
    shadowColor: Color | { _: "Color" | (string & {}) },
  ): void;
}

// ── 扩展宿主 API ──

export declare function extensionHostApiFactory(extension: Extension | { _: "Extension" | (string & {}) }): {
  toast(message: string): Promise<void>;
  toast_success(message: string): Promise<void>;
  toast_error(message: string): Promise<void>;
  toast_warning(message: string): Promise<void>;
  dialog_confirm: typeof Dialog.confirm;
  dialog_input: typeof Dialog.input;
  dialog_copy: typeof Dialog.copy;
  dialog_buttons: typeof Dialog.buttons;
  fetch: typeof fetch;
  fetch_base64(url: string): Promise<Promise<string>>;
  fetch_json(url: string): Promise<Promise<unknown>>;
  fetch_binary(url: string): Promise<Promise<{ buffer: Uint8Array; mimeType: string }>>;
  shell_execute(
    program: string,
    args?: string[],
    stdin?: string,
  ): Promise<Promise<{ code: number | null; stdout: string; stderr: string }>>;
  settings_getOwn(key: string): Promise<any>;
  settings_setOwn(key: string, value: unknown): Promise<void>;
  settings_getGlobal(key: string): Promise<any>;
  settings_setGlobal(key: string, value: unknown): Promise<any>;
  keybinds_register(
    id: string,
    icon: KeyBindIcon,
    defaultKey: string,
    onPress: () => void,
    onRelease?: () => void,
    isContinuous?: boolean,
  ): Promise<void>;
  keybinds_unregisterAll(): Promise<void>;
  tabs_getAll(): Promise<Promise<Tab>[]>;
  tabs_getAllProjects(): Promise<Promise<Project>[]>;
  tabs_getCurrent(): Promise<Promise<Tab | null>>;
  tabs_getCurrentProject(): Promise<Promise<Project | null>>;
  entity_registerType(
    typeName: string,
    initialData: any,
    collisionBox: CollisionBox | { _: "CollisionBox" | (string & {}) },
    renderFn: (data: any) => Promise<ImageBitmap>,
  ): Promise<void>;
  entity_onClick(typeName: string, handler: (payload: ClickEventPayload) => void): Promise<void>;
  entity_create(typeName: string, data: any, location: { x: number; y: number }): Promise<Promise<ExtensionEntity>>;
};

declare global {
  const prg: ReturnType<typeof extensionHostApiFactory>;
  const Comlink: typeof import("comlink");
  interface Window {
    prg: ReturnType<typeof extensionHostApiFactory>;
    Comlink: typeof import("comlink");
  }
  interface DedicatedWorkerGlobalScope {
    prg: ReturnType<typeof extensionHostApiFactory>;
    Comlink: typeof import("comlink");
  }
}
