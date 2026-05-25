import { Dialog } from "@/components/ui/dialog";
import { Project, ProjectState } from "@/core/Project";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { ViewFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ViewFlashEffect";
import { ViewOutlineFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ViewOutlineFlashEffect";
import { Settings } from "@/core/service/Settings";
import { SubWindow } from "@/core/service/SubWindow";
import { Themes } from "@/core/service/Themes";
import { PenStrokeMethods } from "@/core/stage/stageManager/basicMethods/PenStrokeMethods";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { activeTabAtom, isWindowMaxsizedAtom, store, tabsAtom } from "@/state";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { Image as TauriImage } from "@tauri-apps/api/image";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { writeImage, writeText } from "@tauri-apps/plugin-clipboard-manager";
// import ColorWindow from "@/sub/ColorWindow";
import FindWindow from "@/sub/FindWindow";
// import KeyboardRecentFilesWindow from "@/sub/KeyboardRecentFilesWindow";
import { LatexNode } from "@/core/stage/stageObject/entity/LatexNode";
import ColorPaletteWindow from "@/sub/ColorPaletteWindow";
import ColorWindow from "@/sub/ColorWindow";
import RecentFilesWindow from "@/sub/RecentFilesWindow";
import SettingsWindow from "@/sub/SettingsWindow";
import TagWindow from "@/sub/TagWindow";
import { Direction } from "@/types/directions";
import { openBrowserOrFile } from "@/utils/externalOpen";
import { exportImagesToProjectDirectory } from "@/utils/imageExport";
import { isMac } from "@/utils/platform";
import { Color, Vector } from "@graphif/data-structures";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween,
  AlignLeft,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceBetween,
  Aperture,
  ArrowDown,
  ArrowDownFromLine,
  ArrowDownToLine,
  ArrowDownUp,
  ArrowLeft,
  ArrowLeftFromLine,
  ArrowLeftRight,
  ArrowLeftToLine,
  ArrowRight,
  ArrowRightFromLine,
  ArrowRightToLine,
  ArrowUp,
  ArrowUpFromLine,
  ArrowUpToLine,
  Box,
  Brush,
  Camera,
  ChevronFirst,
  ChevronLast,
  ChevronsDown,
  ChevronsRightLeft,
  ChevronsUp,
  CircleCheck,
  CircleSlash,
  Clipboard,
  Code,
  Copy,
  CornerUpRight,
  Dot,
  Equal,
  Expand,
  ExternalLink,
  Eye,
  EyeOff,
  FilePlus,
  FileUp,
  FlaskConical,
  Focus,
  Folder,
  FolderPlus,
  Ghost,
  GitBranch,
  GraduationCap,
  Grip,
  History,
  Images,
  Layers,
  LayoutDashboard,
  LayoutPanelTop,
  Link,
  Lock,
  LucideProps,
  Maximize,
  Maximize2,
  Merge,
  Minimize,
  Minimize2,
  Moon,
  MousePointer,
  MoveDown,
  MoveHorizontal,
  MoveLeft,
  MoveRight,
  MoveUp,
  MoveUpRight,
  Network,
  Package,
  Palette,
  PenTool,
  Plus,
  Redo,
  RefreshCcw,
  RefreshCcwDot,
  RefreshCw,
  Repeat,
  Save,
  Scissors,
  Search,
  Settings as SettingsIcon,
  Shrink,
  Slash,
  Sparkle,
  Spline,
  Split,
  SquareDashedBottomCode,
  SquareDot,
  SquareRoundCorner,
  SquareSquare,
  Sun,
  Tag,
  Trash2,
  TreePine,
  Type,
  Undo,
  Wand2,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";
import { toast } from "sonner";
import { RecentFileManager } from "../../dataFileService/RecentFileManager";
import { ColorSmartTools } from "../../dataManageService/colorSmartTools";
import { ConnectNodeSmartTools } from "../../dataManageService/connectNodeSmartTools";
import { TextNodeSmartTools } from "../../dataManageService/textNodeSmartTools";
import { createFileAtCurrentProjectDir, onNewDraft, onOpenFile, openCurrentProjectFolder } from "../../GlobalMenu";

export type KeyBindWhen = (project?: Project) => boolean | Promise<boolean>;

interface KeyBindItem {
  id: string;
  defaultKey: string;
  onPress: (project?: Project) => void;
  onRelease?: (project?: Project) => void;
  when: KeyBindWhen;
  // 全局快捷键
  isGlobal?: boolean;
  // 是否是持续型快捷键
  isContinuous?: boolean;
  // 默认是否启用
  defaultEnabled?: boolean;
  icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
}

const whenAlways: KeyBindWhen = () => true;
const whenHasProject: KeyBindWhen = (project) => !!project;
const whenKeyboardOnlyOpen: KeyBindWhen = (project) => !!project && project.keyboardOnlyEngine.isOpenning();
const whenHasSelectedStageObjectsOrSelectionRectangle: KeyBindWhen = (project) =>
  !!project &&
  (project.stageManager.getSelectedStageObjects().length > 0 || project.rectangleSelect.getRectangle() !== null);
const whenHasSelectedEntities: KeyBindWhen = (project) =>
  !!project && project.stageManager.getSelectedEntities().length > 0;
const whenHasMultipleSelectedEntities: KeyBindWhen = (project) =>
  !!project && project.stageManager.getSelectedEntities().length >= 2;
const whenHasMultipleSelectedEntitiesOrOneSection: KeyBindWhen = (project) =>
  !!project &&
  (project.stageManager.getSelectedEntities().length >= 2 ||
    project.stageManager.getSelectedEntities().some((entity) => entity instanceof Section));
const whenHasSelectedConnectableEntities: KeyBindWhen = (project) =>
  !!project && project.stageManager.getSelectedEntities().some((entity) => entity instanceof ConnectableEntity);
const whenHasMultipleSelectedConnectableEntities: KeyBindWhen = (project) =>
  !!project &&
  project.stageManager.getSelectedEntities().filter((entity) => entity instanceof ConnectableEntity).length > 1;
const whenHasSelectedTextNodes: KeyBindWhen = (project) =>
  !!project && project.stageManager.getSelectedEntities().some((entity) => entity instanceof TextNode);
const whenHasSelectedReferenceBlockNodes: KeyBindWhen = (project) =>
  !!project && project.stageManager.getSelectedEntities().some((entity) => entity instanceof ReferenceBlockNode);
const whenHasSelectedSections: KeyBindWhen = (project) =>
  !!project && project.stageManager.getSelectedEntities().some((entity) => entity instanceof Section);
const whenHasSelectedImageNodes: KeyBindWhen = (project) =>
  !!project && project.stageManager.getSelectedEntities().some((entity) => entity instanceof ImageNode);
const whenHasSelectedLineEdges: KeyBindWhen = (project) =>
  !!project && project.stageManager.getLineEdges().some((edge) => edge.isSelected);
const whenHasSelectedMTUEdges: KeyBindWhen = (project) =>
  !!project &&
  project.stageManager
    .getSelectedAssociations()
    .some((association) => association instanceof MultiTargetUndirectedEdge);
const whenHasSelectedColorableStageObjects: KeyBindWhen = (project) =>
  !!project && project.stageManager.getSelectedStageObjects().some((object) => "color" in object);
const whenKeyboardOnlyOpenWithSelectedStageObjects: KeyBindWhen = (project) =>
  !!project && project.keyboardOnlyEngine.isOpenning() && project.stageManager.getSelectedStageObjects().length > 0;
const whenKeyboardOnlyOpenWithSelectedEntities: KeyBindWhen = (project) =>
  !!project && project.keyboardOnlyEngine.isOpenning() && project.stageManager.getSelectedEntities().length > 0;
const whenKeyboardOnlyOpenWithSelectedConnectableEntities: KeyBindWhen = (project) =>
  !!project &&
  project.keyboardOnlyEngine.isOpenning() &&
  project.stageManager.getSelectedEntities().some((entity) => entity instanceof ConnectableEntity);
const whenKeyboardOnlyOpenWithSelectedTextNodes: KeyBindWhen = (project) =>
  !!project &&
  project.keyboardOnlyEngine.isOpenning() &&
  project.stageManager.getSelectedEntities().some((entity) => entity instanceof TextNode);
const whenKeyboardOnlyOpenWithSelectedSections: KeyBindWhen = (project) =>
  !!project &&
  project.keyboardOnlyEngine.isOpenning() &&
  project.stageManager.getSelectedEntities().some((entity) => entity instanceof Section);

const whenGraphEngineCreating: KeyBindWhen = (project) =>
  !!project && project.keyboardOnlyEngine.isOpenning() && project.keyboardOnlyGraphEngine.isCreating();

export const allKeyBinds: KeyBindItem[] = [
  {
    id: "test",
    defaultKey: "C-A-S-t",
    icon: FlaskConical,
    when: whenAlways,
    onPress: () =>
      Dialog.buttons("测试快捷键", "您按下了自定义的测试快捷键，这一功能是测试开发所用，可在设置中更改触发方式", [
        { id: "close", label: "关闭" },
      ]),
  },

  /*------- 窗口管理 -------*/
  {
    id: "closeAllSubWindows",
    defaultKey: "Escape",
    icon: X,
    when: whenAlways,
    onPress: () => {
      if (!SubWindow.hasOpenWindows()) return;
      SubWindow.closeAll();
    },
  },
  {
    id: "toggleFullscreen",
    defaultKey: "C-F11",
    icon: Maximize,
    when: whenAlways,
    onPress: async () => {
      const window = getCurrentWindow();
      // 如果当前已经是最大化的状态，设置为非最大化
      if (await window.isMaximized()) {
        store.set(isWindowMaxsizedAtom, false);
      }
      // 切换全屏状态
      const isFullscreen = await window.isFullscreen();
      await window.setFullscreen(!isFullscreen);
    },
  },
  {
    id: "setWindowToMiniSize",
    defaultKey: "A-S-m",
    icon: Minimize,
    when: whenAlways,
    onPress: async () => {
      const window = getCurrentWindow();
      // 如果当前是最大化状态，先取消最大化
      if (await window.isMaximized()) {
        await window.unmaximize();
        store.set(isWindowMaxsizedAtom, false);
      }
      // 如果当前是全屏状态，先退出全屏
      if (await window.isFullscreen()) {
        await window.setFullscreen(false);
      }
      // 设置窗口大小为设置中的迷你窗口大小
      const width = Settings.windowCollapsingWidth;
      const height = Settings.windowCollapsingHeight;
      await window.setSize(new LogicalSize(width, height));
    },
  },

  /*------- 基础编辑 -------*/
  {
    id: "undo",
    defaultKey: "C-z",
    icon: Undo,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.historyManager.undo();
    },
  },
  {
    id: "redo",
    defaultKey: "C-y",
    icon: Redo,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.historyManager.redo();
    },
  },
  {
    id: "reload",
    defaultKey: "C-f5",
    icon: RefreshCw,
    when: whenAlways,
    onPress: async () => {
      if (
        await Dialog.confirm(
          "危险操作：重新加载应用",
          "此快捷键用于在废档了或软件卡住了的情况下重启，您按下了重新加载应用快捷键，是否要重新加载应用？这会导致您丢失所有未保存的工作。",
          { destructive: true },
        )
      ) {
        window.location.reload();
      }
    },

    defaultEnabled: false,
  },

  /*------- 课堂/专注模式 -------*/
  {
    id: "checkoutClassroomMode",
    defaultKey: "F5",
    icon: GraduationCap,
    when: whenAlways,
    onPress: async () => {
      if (Settings.isClassroomMode) {
        toast.info("已经退出专注模式，点击一下更新状态");
      } else {
        toast.info("进入专注模式，点击一下更新状态");
      }
      Settings.isClassroomMode = !Settings.isClassroomMode;
    },

    defaultEnabled: false,
  },

  /*------- 相机/视图 -------*/
  {
    id: "resetView",
    defaultKey: "F",
    icon: Focus,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.saveCameraState();
      project!.camera.resetBySelected();
    },
  },
  {
    id: "restoreCameraState",
    defaultKey: "S-F",
    icon: Camera,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.restoreCameraState();
    },
  },
  {
    id: "resetCameraScale",
    defaultKey: "C-A-r",
    icon: Aperture,
    when: whenHasProject,
    onPress: (project) => project!.camera.resetScale(),
  },
  {
    id: "CameraScaleZoomIn",
    defaultKey: "[",
    icon: ZoomIn,
    when: whenHasProject,
    isContinuous: true,
    onPress: (project) => {
      project!.camera.isStartZoomIn = true;
      project!.camera.addScaleFollowMouseLocationTime(1);
    },
    onRelease: (project) => {
      project!.camera.isStartZoomIn = false;
      project!.camera.addScaleFollowMouseLocationTime(5);
    },
  },
  {
    id: "CameraScaleZoomOut",
    defaultKey: "]",
    icon: ZoomOut,
    when: whenHasProject,
    isContinuous: true,
    onPress: (project) => {
      project!.camera.isStartZoomOut = true;
      project!.camera.addScaleFollowMouseLocationTime(1);
    },
    onRelease: (project) => {
      project!.camera.isStartZoomOut = false;
      project!.camera.addScaleFollowMouseLocationTime(5);
    },
  },
  {
    id: "CameraMoveUp",
    defaultKey: "w",
    icon: ArrowUp,
    when: whenHasProject,
    isContinuous: true,
    onPress: (project) => {
      project!.camera.accelerateCommander = project!.camera.accelerateCommander
        .add(new Vector(0, -1))
        .limitX(-1, 1)
        .limitY(-1, 1);
    },
    onRelease: (project) => {
      project!.camera.accelerateCommander = project!.camera.accelerateCommander
        .subtract(new Vector(0, -1))
        .limitX(-1, 1)
        .limitY(-1, 1);
    },
  },
  {
    id: "CameraMoveDown",
    defaultKey: "s",
    icon: ArrowDown,
    when: whenHasProject,
    isContinuous: true,
    onPress: (project) => {
      project!.camera.accelerateCommander = project!.camera.accelerateCommander
        .add(new Vector(0, 1))
        .limitX(-1, 1)
        .limitY(-1, 1);
    },
    onRelease: (project) => {
      project!.camera.accelerateCommander = project!.camera.accelerateCommander
        .subtract(new Vector(0, 1))
        .limitX(-1, 1)
        .limitY(-1, 1);
    },
  },
  {
    id: "CameraMoveLeft",
    defaultKey: "a",
    icon: ArrowLeft,
    when: whenHasProject,
    isContinuous: true,
    onPress: (project) => {
      project!.camera.accelerateCommander = project!.camera.accelerateCommander
        .add(new Vector(-1, 0))
        .limitX(-1, 1)
        .limitY(-1, 1);
    },
    onRelease: (project) => {
      project!.camera.accelerateCommander = project!.camera.accelerateCommander
        .subtract(new Vector(-1, 0))
        .limitX(-1, 1)
        .limitY(-1, 1);
    },
  },
  {
    id: "CameraMoveRight",
    defaultKey: "d",
    icon: ArrowRight,
    when: whenHasProject,
    isContinuous: true,
    onPress: (project) => {
      project!.camera.accelerateCommander = project!.camera.accelerateCommander
        .add(new Vector(1, 0))
        .limitX(-1, 1)
        .limitY(-1, 1);
    },
    onRelease: (project) => {
      project!.camera.accelerateCommander = project!.camera.accelerateCommander
        .subtract(new Vector(1, 0))
        .limitX(-1, 1)
        .limitY(-1, 1);
    },
  },
  /*------- 相机分页移动（Win） -------*/
  // 注意：实际运行时会根据 isMac 注册其一，这里两份都列出方便查阅
  {
    id: "CameraPageMoveUp",
    defaultKey: isMac ? "S-i" : "pageup",
    icon: ChevronsUp,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.pageMove(Direction.Up);
    },
  },
  {
    id: "CameraPageMoveDown",
    defaultKey: isMac ? "S-k" : "pagedown",
    icon: ChevronsDown,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.pageMove(Direction.Down);
    },
  },
  {
    id: "CameraPageMoveLeft",
    defaultKey: isMac ? "S-j" : "home",
    icon: ChevronFirst,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.pageMove(Direction.Left);
    },
  },
  {
    id: "CameraPageMoveRight",
    defaultKey: isMac ? "S-l" : "end",
    icon: ChevronLast,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.pageMove(Direction.Right);
    },
  },

  /*------- 章节/折叠/打包 -------*/
  {
    id: "folderSection",
    defaultKey: "C-t",
    icon: Folder,
    when: whenHasSelectedSections,
    onPress: (project) => project!.stageManager.sectionSwitchCollapse(),
  },
  {
    id: "packEntityToSection",
    defaultKey: "C-g",
    icon: Package,
    when: whenHasSelectedStageObjectsOrSelectionRectangle,
    onPress: (project) => {
      // 检查是否有框选框并且舞台上没有选中任何物体
      const rectangleSelect = project!.rectangleSelect;
      const hasActiveRectangle = rectangleSelect.getRectangle() !== null;
      const hasSelectedEntities = project!.stageManager.getEntities().some((entity) => entity.isSelected);
      const hasSelectedEdges = project!.stageManager.getAssociations().some((edge) => edge.isSelected);
      if (hasActiveRectangle && !hasSelectedEntities && !hasSelectedEdges) {
        // 如果有框选框且没有选中任何物体，则在框选区域创建Section
        project!.sectionPackManager.createSectionFromSelectionRectangle();
      } else {
        // 否则执行原来的打包功能
        project!.sectionPackManager.packSelectedEntitiesToSection();
      }
    },
  },
  {
    id: "toggleSectionLock",
    defaultKey: "C-l",
    icon: Lock,
    when: whenKeyboardOnlyOpenWithSelectedSections,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const selectedSections = project!.stageManager.getSelectedEntities().filter((it) => it instanceof Section);
      for (const section of selectedSections) {
        section.locked = !section.locked;
        project!.sectionRenderer.render(section);
      }
      // 记录历史步骤
      project!.historyManager.recordStep();
    },
    defaultEnabled: false,
  },

  /*------- 边反向 -------*/
  {
    id: "reverseEdges",
    defaultKey: "C-t",
    icon: Repeat,
    when: whenHasSelectedLineEdges,
    onPress: (project) => project!.stageManager.reverseSelectedEdges(),
  },
  /*------- 创建无向边 -------*/
  {
    id: "createUndirectedEdgeFromEntities",
    defaultKey: "S-g",
    icon: GitBranch,
    when: whenHasMultipleSelectedConnectableEntities,
    onPress: (project) => {
      const selectedNodes = project!.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof ConnectableEntity);
      if (selectedNodes.length <= 1) {
        toast.error("至少选择两个可连接节点");
        return;
      }
      const multiTargetUndirectedEdge = MultiTargetUndirectedEdge.createFromSomeEntity(project!, selectedNodes);
      project!.stageManager.add(multiTargetUndirectedEdge);
    },
  },
  {
    id: "createMTUEdgeConvex",
    defaultKey: "m t u c",
    icon: SquareRoundCorner,
    when: whenHasMultipleSelectedConnectableEntities,
    onPress: (project) => {
      const selectedNodes = project!.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof ConnectableEntity);
      if (selectedNodes.length <= 1) {
        toast.error("至少选择两个可连接节点");
        return;
      }
      const multiTargetUndirectedEdge = MultiTargetUndirectedEdge.createFromSomeEntity(project!, selectedNodes);
      multiTargetUndirectedEdge.renderType = "convex";
      project!.stageManager.add(multiTargetUndirectedEdge);
    },
  },

  /*------- 删除 -------*/
  {
    id: "deleteSelectedStageObjects",
    defaultKey: isMac ? "backspace" : "delete",
    icon: Trash2,
    when: whenKeyboardOnlyOpenWithSelectedStageObjects,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.stageManager.deleteSelectedStageObjects();
    },
  },

  /*------- 新建文本节点（多种方式） -------*/
  {
    id: "createTextNodeFromCameraLocation",
    defaultKey: "insert",
    icon: Plus,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.clearMoveCommander();
      project!.camera.speed = Vector.getZero();
      project!.controllerUtils.addTextNodeByLocation(project!.camera.location, true, true);
    },
  },
  {
    id: "createTextNodeFromMouseLocation",
    defaultKey: "S-insert",
    icon: Plus,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.clearMoveCommander();
      project!.camera.speed = Vector.getZero();
      project!.controllerUtils.addTextNodeByLocation(
        project!.renderer.transformView2World(MouseLocation.vector()),
        true,
        true,
      );
    },
  },
  {
    id: "createConnectPointFromMouseLocation",
    defaultKey: "S-.",
    icon: Dot,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.createConnectPoint(project!.renderer.transformView2World(MouseLocation.vector()));
    },
  },
  {
    id: "createTextNodeFromSelectedTop",
    defaultKey: "A-arrowup",
    icon: ArrowUp,
    when: whenKeyboardOnlyOpenWithSelectedConnectableEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Up, true);
    },
  },
  {
    id: "createTextNodeFromSelectedRight",
    defaultKey: "A-arrowright",
    icon: ArrowRight,
    when: whenKeyboardOnlyOpenWithSelectedConnectableEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Right, true);
    },
  },
  {
    id: "createTextNodeFromSelectedLeft",
    defaultKey: "A-arrowleft",
    icon: ArrowLeft,
    when: whenKeyboardOnlyOpenWithSelectedConnectableEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Left, true);
    },
  },
  {
    id: "createTextNodeFromSelectedDown",
    defaultKey: "A-arrowdown",
    icon: ArrowDown,
    when: whenKeyboardOnlyOpenWithSelectedConnectableEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Down, true);
    },
  },

  /*------- 选择（单选/多选） -------*/
  {
    id: "selectUp",
    defaultKey: "arrowup",
    icon: ArrowUp,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectUp();
    },
  },
  {
    id: "selectDown",
    defaultKey: "arrowdown",
    icon: ArrowDown,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectDown();
    },
  },
  {
    id: "selectLeft",
    defaultKey: "arrowleft",
    icon: ArrowLeft,
    when: whenHasProject,
    onPress: (project) => project!.selectChangeEngine.selectLeft(),
  },
  {
    id: "selectRight",
    defaultKey: "arrowright",
    icon: ArrowRight,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectRight();
    },
  },
  {
    id: "selectAdditionalUp",
    defaultKey: "S-arrowup",
    icon: ChevronsUp,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectUp(true);
    },
  },
  {
    id: "selectAdditionalDown",
    defaultKey: "S-arrowdown",
    icon: ChevronsDown,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectDown(true);
    },
  },
  {
    id: "selectAdditionalLeft",
    defaultKey: "S-arrowleft",
    icon: ChevronFirst,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectLeft(true);
    },
  },
  {
    id: "selectAdditionalRight",
    defaultKey: "S-arrowright",
    icon: ChevronLast,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectRight(true);
    },
  },

  /*------- 移动选中实体 -------*/
  {
    id: "moveUpSelectedEntities",
    defaultKey: "C-arrowup",
    icon: ArrowUp,
    when: whenKeyboardOnlyOpenWithSelectedEntities,
    isContinuous: true,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.continuousMoveKeyPress(new Vector(0, -1));
    },
    onRelease: (project) => {
      project!.entityMoveManager.continuousMoveKeyRelease(new Vector(0, -1));
    },
  },
  {
    id: "moveDownSelectedEntities",
    defaultKey: "C-arrowdown",
    icon: ArrowDown,
    when: whenKeyboardOnlyOpenWithSelectedEntities,
    isContinuous: true,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.continuousMoveKeyPress(new Vector(0, 1));
    },
    onRelease: (project) => {
      project!.entityMoveManager.continuousMoveKeyRelease(new Vector(0, 1));
    },
  },
  {
    id: "moveLeftSelectedEntities",
    defaultKey: "C-arrowleft",
    icon: ArrowLeft,
    when: whenKeyboardOnlyOpenWithSelectedEntities,
    isContinuous: true,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.continuousMoveKeyPress(new Vector(-1, 0));
    },
    onRelease: (project) => {
      project!.entityMoveManager.continuousMoveKeyRelease(new Vector(-1, 0));
    },
  },
  {
    id: "moveRightSelectedEntities",
    defaultKey: "C-arrowright",
    icon: ArrowRight,
    when: whenKeyboardOnlyOpenWithSelectedEntities,
    isContinuous: true,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.continuousMoveKeyPress(new Vector(1, 0));
    },
    onRelease: (project) => {
      project!.entityMoveManager.continuousMoveKeyRelease(new Vector(1, 0));
    },
  },

  /*------- 跳跃移动 -------*/
  {
    id: "jumpMoveUpSelectedEntities",
    defaultKey: "C-A-arrowup",
    icon: ChevronsUp,
    when: whenKeyboardOnlyOpenWithSelectedEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(0, -100));
    },
  },
  {
    id: "jumpMoveDownSelectedEntities",
    defaultKey: "C-A-arrowdown",
    icon: ChevronsDown,
    when: whenKeyboardOnlyOpenWithSelectedEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(0, 100));
    },
  },
  {
    id: "jumpMoveLeftSelectedEntities",
    defaultKey: "C-A-arrowleft",
    icon: ChevronFirst,
    when: whenKeyboardOnlyOpenWithSelectedEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(-100, 0));
    },
  },
  {
    id: "jumpMoveRightSelectedEntities",
    defaultKey: "C-A-arrowright",
    icon: ChevronLast,
    when: whenKeyboardOnlyOpenWithSelectedEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(100, 0));
    },
  },

  /*------- 编辑/详情 -------*/
  {
    id: "editEntityDetails",
    defaultKey: "C-enter",
    icon: PenTool,
    when: whenKeyboardOnlyOpenWithSelectedEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.editNodeDetailsByKeyboard();
    },
  },

  /*------- 面板/窗口 -------*/
  {
    id: "openColorPanel",
    defaultKey: "F6",
    icon: Palette,
    when: whenAlways,
    onPress: () => ColorWindow.open(),
  },
  {
    id: "openColorPaletteWindow",
    defaultKey: "S-F6",
    icon: Palette,
    when: whenAlways,
    onPress: () => ColorPaletteWindow.open(),
  },
  {
    id: "switchDebugShow",
    defaultKey: "F3",
    icon: Wand2,
    when: whenAlways,
    onPress: async () => {
      Settings.showDebug = !Settings.showDebug;
    },
  },
  {
    id: "selectAll",
    defaultKey: "C-a",
    icon: MousePointer,
    when: whenHasProject,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.stageManager.selectAll();
      toast.success(
        <div>
          <h2>已全选所有元素</h2>
          <p>
            {project!.stageManager.getSelectedEntities().length}个实体+
            {project!.stageManager.getSelectedAssociations().length}个关系=
            {project!.stageManager.getSelectedStageObjects().length}个舞台对象
          </p>
        </div>,
      );
      project!.effects.addEffect(ViewOutlineFlashEffect.normal(Color.Green.toNewAlpha(0.2)));
    },
  },

  /*------- 章节打包/解包 -------*/
  {
    id: "textNodeToSection",
    defaultKey: "C-S-g",
    icon: Box,
    when: whenHasSelectedTextNodes,
    onPress: (project) => project!.sectionPackManager.textNodeToSection(),
  },
  {
    id: "unpackEntityFromSection",
    defaultKey: "C-S-g",
    icon: Scissors,
    when: whenHasSelectedSections,
    onPress: (project) => project!.sectionPackManager.unpackSelectedSections(),
  },

  /*------- 隐私模式 -------*/
  {
    id: "checkoutProtectPrivacy",
    defaultKey: "C-2",
    icon: EyeOff,
    when: whenAlways,
    onPress: async () => {
      Settings.protectingPrivacy = !Settings.protectingPrivacy;
    },
  },

  /*------- 搜索/外部打开 -------*/
  {
    id: "searchText",
    defaultKey: "C-f",
    icon: Search,
    when: whenAlways,
    onPress: () => FindWindow.open(),
  },
  {
    id: "openTextNodeByContentExternal",
    defaultKey: "C-e",
    icon: ExternalLink,
    when: whenKeyboardOnlyOpenWithSelectedTextNodes,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project?.controller.pressingKeySet.clear(); // 防止打开prg文件时，ctrl+E持续按下
      openBrowserOrFile(project!);
    },
  },

  /*------- 顶部菜单窗口, UI操作 -------*/
  {
    id: "clickAppMenuSettingsButton",
    defaultKey: "S-!",
    icon: SettingsIcon,
    when: whenAlways,
    onPress: () => SettingsWindow.open("settings"),
  },
  {
    id: "clickAppMenuRecentFileButton",
    defaultKey: "S-#",
    icon: History,
    when: whenAlways,
    onPress: () => RecentFilesWindow.open(),
  },
  {
    id: "clickTagPanelButton",
    defaultKey: "S-@",
    icon: Tag,
    when: whenAlways,
    onPress: () => TagWindow.open(),
  },
  {
    id: "switchActiveProject",
    defaultKey: "C-tab",
    icon: Layers,
    when: whenHasProject,
    onPress: () => {
      //

      const tabs = store.get(tabsAtom);
      if (tabs.length <= 1) {
        toast.error("至少打开两个标签页才能切换");
        return;
      }
      const activeTab = store.get(activeTabAtom);
      const activeIndex = tabs.findIndex((t) => t === activeTab);
      const nextIndex = (activeIndex + 1) % tabs.length;
      store.set(activeTabAtom, tabs[nextIndex]);
    },
  },
  {
    id: "switchActiveProjectReversed",
    defaultKey: "C-S-tab",
    icon: Layers,
    when: whenHasProject,
    onPress: () => {
      const tabs = store.get(tabsAtom);
      if (tabs.length <= 1) {
        toast.error("至少打开两个标签页才能切换");
        return;
      }
      const activeTab = store.get(activeTabAtom);
      const activeIndex = tabs.findIndex((t) => t === activeTab);
      const mod = (n: number, m: number) => {
        return ((n % m) + m) % m;
      };
      const nextIndex = mod(activeIndex - 1, tabs.length);
      store.set(activeTabAtom, tabs[nextIndex]);
    },
  },
  {
    id: "closeCurrentProjectTab",
    defaultKey: "A-S-q",
    defaultEnabled: false,
    icon: X,
    when: whenHasProject,
    onPress: async () => {
      const tab = store.get(activeTabAtom);
      if (!tab) {
        toast.error("当前没有打开的标签页");
        return;
      }
      const tabs = store.get(tabsAtom);
      if (tab instanceof Project) {
        if (tab.projectState === ProjectState.Stashed) {
          toast("文件还没有保存，但已经暂存，在“最近打开的文件”中可恢复文件");
        } else if (tab.projectState === ProjectState.Unsaved) {
          const response = await Dialog.buttons("是否保存更改？", decodeURI(tab.uri.toString()), [
            { id: "cancel", label: "取消", variant: "ghost" },
            { id: "discard", label: "不保存", variant: "destructive" },
            { id: "save", label: "保存" },
          ]);
          if (response === "save") {
            await tab.save();
          } else if (response === "cancel") {
            return;
          }
        }
      }
      await tab.dispose();
      const result = tabs.filter((t) => t !== tab);
      const activeTabIndex = tabs.indexOf(tab);
      if (result.length > 0) {
        if (activeTabIndex === tabs.length - 1) {
          store.set(activeTabAtom, result[activeTabIndex - 1]);
        } else {
          store.set(activeTabAtom, result[activeTabIndex]);
        }
      } else {
        store.set(activeTabAtom, undefined);
      }
      store.set(tabsAtom, result);
    },
  },
  /*------- 导出操作 ------- */
  {
    id: "exportSelectedTreeStructureToPlainText",
    defaultKey: "S-e t p",
    icon: Type,
    when: whenHasSelectedTextNodes,
    onPress: () => {
      const tab = store.get(activeTabAtom);
      const activeProject = tab instanceof Project ? tab : undefined;
      const textNode = getOneSelectedTextNodeWhenExportingPlainText(activeProject);
      if (textNode) {
        const result = activeProject!.stageExport.getTabStringByTextNode(textNode);
        writeText(result);
        toast.success(`已将选中的树形结构纯文本格式复制到粘贴板`);
      }
    },
  },
  {
    id: "exportSelectedTreeStructureToMarkdown",
    defaultKey: "S-e t m",
    icon: Type,
    when: whenHasSelectedTextNodes,
    onPress: () => {
      const tab = store.get(activeTabAtom);
      const activeProject = tab instanceof Project ? tab : undefined;
      const textNode = getOneSelectedTextNodeWhenExportingPlainText(activeProject);
      if (textNode) {
        const result = activeProject!.stageExport.getMarkdownStringByTextNode(textNode);
        writeText(result);
        toast.success("已将选中的树形结构markdown格式复制到粘贴板");
      }
    },
  },
  {
    id: "exportSelectedNetStructureToPlainText",
    defaultKey: "S-e n p",
    icon: Network,
    when: whenHasSelectedEntities,
    onPress: () => {
      const tab = store.get(activeTabAtom);
      const activeProject = tab instanceof Project ? tab : undefined;
      if (!activeProject) {
        toast.warning("请先打开工程文件");
        return;
      }
      const entities = activeProject.stageManager.getEntities();
      const selectedEntities = entities.filter((entity) => entity.isSelected);
      const result = activeProject.stageExport.getPlainTextByEntities(selectedEntities);
      writeText(result);
      toast.success("已将选中的网状结构纯文本格式复制到粘贴板");
    },
  },
  {
    id: "exportSelectedNetStructureToMermaid",
    defaultKey: "S-e n m",
    icon: Network,
    when: whenHasSelectedEntities,
    onPress: () => {
      const tab = store.get(activeTabAtom);
      const activeProject = tab instanceof Project ? tab : undefined;
      if (!activeProject) {
        toast.warning("请先打开工程文件");
        return;
      }
      const selectedEntities = activeProject.stageManager.getSelectedEntities();
      const result = activeProject.stageExport.getMermaidTextByEntities(selectedEntities);
      writeText(result);
      toast.success("已将选中的网状结构mermaid格式复制到粘贴板");
    },
  },
  /*------- 文件操作 -------*/
  {
    id: "saveFile",
    defaultKey: "C-s",
    icon: Save,
    when: whenHasProject,
    onPress: () => {
      const tab = store.get(activeTabAtom);
      const activeProject = tab instanceof Project ? tab : undefined;
      if (activeProject) {
        activeProject.camera.clearMoveCommander();
        activeProject.save();
        if (Settings.clearHistoryWhenManualSave) {
          activeProject.historyManager.clearHistory();
        }
        RecentFileManager.addRecentFileByUri(activeProject.uri);
      }
    },
  },
  {
    id: "newDraft",
    defaultKey: "C-n",
    icon: FilePlus,
    when: whenAlways,
    onPress: () => onNewDraft(),
  },
  {
    id: "newFileAtCurrentProjectDir",
    defaultKey: "C-S-n",
    icon: FolderPlus,
    when: whenHasProject,
    onPress: () => {
      //
      const tab = store.get(activeTabAtom);
      const activeProject = tab instanceof Project ? tab : undefined;
      if (!activeProject) {
        toast.error("当前没有激活的项目，无法在当前工程文件目录下创建新文件");
        return;
      }
      if (activeProject.isDraft) {
        toast.error("当前为草稿状态，无法在当前工程文件目录下创建新文件");
        return;
      }
      createFileAtCurrentProjectDir(activeProject, async () => {});
    },

    defaultEnabled: false,
  },
  {
    id: "openFile",
    defaultKey: "C-o",
    icon: FileUp,
    when: whenAlways,
    onPress: () => onOpenFile(),
  },
  {
    id: "openCurrentProjectFileFolder",
    defaultKey: "C-S-l",
    icon: Folder,
    when: whenHasProject,
    onPress: () => {
      const tab = store.get(activeTabAtom);
      const activeProject = tab instanceof Project ? tab : undefined;
      if (!activeProject || activeProject.isDraft) {
        toast.error("当前没有可用的工程文件");
        return;
      }
      openCurrentProjectFolder(activeProject);
    },
  },

  /*------- 窗口透明度 -------*/
  {
    id: "checkoutWindowOpacityMode",
    defaultKey: "C-0",
    icon: Eye,
    when: whenAlways,
    onPress: async () => {
      Settings.windowBackgroundAlpha = Settings.windowBackgroundAlpha === 0 ? 1 : 0;
    },
  },
  {
    id: "windowOpacityAlphaIncrease",
    defaultKey: "C-A-S-+",
    icon: Sun,
    when: whenHasProject,
    onPress: async (project) => {
      const currentValue = Settings.windowBackgroundAlpha;
      if (currentValue === 1) {
        // 已经不能再大了
        project!.effects.addEffect(ViewOutlineFlashEffect.short(project!.stageStyleManager.currentStyle.effects.flash));
      } else {
        Settings.windowBackgroundAlpha = Math.min(1, currentValue + 0.2);
      }
    },
  },
  {
    id: "windowOpacityAlphaDecrease",
    defaultKey: "C-A-S--",
    icon: Moon,
    when: whenHasProject,
    onPress: async (project) => {
      const currentValue = Settings.windowBackgroundAlpha;
      if (currentValue === 0) {
        // 已经不能再小了
        project!.effects.addEffect(ViewOutlineFlashEffect.short(project!.stageStyleManager.currentStyle.effects.flash));
      } else {
        Settings.windowBackgroundAlpha = Math.max(0, currentValue - 0.2);
      }
    },
  },

  /*------- 复制粘贴 -------*/
  {
    id: "copy",
    defaultKey: "C-c",
    icon: Copy,
    when: whenKeyboardOnlyOpenWithSelectedStageObjects,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.copyEngine.copy();
    },
  },
  {
    id: "paste",
    defaultKey: "C-v",
    icon: Clipboard,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.copyEngine.paste();
    },
  },
  {
    id: "pasteWithOriginLocation",
    defaultKey: "C-S-v",
    icon: Clipboard,
    when: whenAlways,
    onPress: () => toast("todo"),
  },

  /*------- 鼠标模式切换 -------*/
  {
    id: "checkoutLeftMouseToSelectAndMove",
    defaultKey: "v v v",
    icon: MousePointer,
    when: whenKeyboardOnlyOpen,
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      Settings.mouseLeftMode = "selectAndMove";
      toast("当前鼠标左键已经切换为框选/移动模式");
    },
  },
  {
    id: "checkoutLeftMouseToDrawing",
    defaultKey: "b b b",
    icon: Brush,
    when: whenKeyboardOnlyOpen,
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      Settings.mouseLeftMode = "draw";
      toast("当前鼠标左键已经切换为画笔模式");
    },
  },
  {
    id: "checkoutLeftMouseToConnectAndCutting",
    defaultKey: "c c c",
    icon: Link,
    when: whenKeyboardOnlyOpen,
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      Settings.mouseLeftMode = "connectAndCut";
      toast("当前鼠标左键已经切换为连接/切割模式");
    },
  },

  /*------- 笔选/扩展选择 -------*/
  {
    id: "selectEntityByPenStroke",
    defaultKey: "C-w",
    icon: Brush,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      // 现在不生效了，不过也没啥用
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      PenStrokeMethods.selectEntityByPenStroke(project!);
    },
  },
  {
    id: "expandSelectEntity",
    defaultKey: "C-w",
    icon: Expand,
    when: whenKeyboardOnlyOpenWithSelectedStageObjects,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelect(false, false);
    },
  },
  {
    id: "expandSelectEntityReversed",
    defaultKey: "C-S-w",
    icon: Shrink,
    when: whenKeyboardOnlyOpenWithSelectedStageObjects,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelect(false, true);
    },
  },
  {
    id: "expandSelectEntityKeepLastSelected",
    defaultKey: "C-A-w",
    icon: Expand,
    when: whenKeyboardOnlyOpenWithSelectedStageObjects,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelect(true, false);
    },
  },
  {
    id: "expandSelectEntityReversedKeepLastSelected",
    defaultKey: "C-A-S-w",
    icon: Shrink,
    when: whenKeyboardOnlyOpenWithSelectedStageObjects,
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelect(true, true);
    },
  },

  /*------- 树/图 生成 -------*/
  {
    id: "generateNodeTreeWithDeepMode",
    defaultKey: "tab",
    icon: GitBranch,
    when: whenKeyboardOnlyOpen,
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.keyboardOnlyTreeEngine.onDeepGenerateNode();
    },
  },
  {
    id: "generateNodeTreeWithBroadMode",
    defaultKey: "\\",
    icon: GitBranch,
    when: whenKeyboardOnlyOpen,
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.keyboardOnlyTreeEngine.onBroadGenerateNode();
    },
  },
  {
    id: "generateNodeGraph",
    defaultKey: "`",
    icon: Network,
    when: whenKeyboardOnlyOpenWithSelectedConnectableEntities,
    isContinuous: true,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      if (project!.keyboardOnlyGraphEngine.isEnableVirtualCreate()) {
        project!.keyboardOnlyGraphEngine.createStart();
      }
    },
    onRelease: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.keyboardOnlyGraphEngine.createFinished();
    },
  },
  {
    id: "generateNodeGraphMoveUp",
    defaultKey: "i",
    icon: ArrowUp,
    when: whenGraphEngineCreating,
    isContinuous: true,
    onPress: (project) => project!.keyboardOnlyGraphEngine.startMovingDirection(Direction.Up),
    onRelease: (project) => project!.keyboardOnlyGraphEngine.stopMovingDirection(Direction.Up),
  },
  {
    id: "generateNodeGraphMoveDown",
    defaultKey: "k",
    icon: ArrowDown,
    when: whenGraphEngineCreating,
    isContinuous: true,
    onPress: (project) => project!.keyboardOnlyGraphEngine.startMovingDirection(Direction.Down),
    onRelease: (project) => project!.keyboardOnlyGraphEngine.stopMovingDirection(Direction.Down),
  },
  {
    id: "generateNodeGraphMoveLeft",
    defaultKey: "j",
    icon: ArrowLeft,
    when: whenGraphEngineCreating,
    isContinuous: true,
    onPress: (project) => project!.keyboardOnlyGraphEngine.startMovingDirection(Direction.Left),
    onRelease: (project) => project!.keyboardOnlyGraphEngine.stopMovingDirection(Direction.Left),
  },
  {
    id: "generateNodeGraphMoveRight",
    defaultKey: "l",
    icon: ArrowRight,
    when: whenGraphEngineCreating,
    isContinuous: true,
    onPress: (project) => project!.keyboardOnlyGraphEngine.startMovingDirection(Direction.Right),
    onRelease: (project) => project!.keyboardOnlyGraphEngine.stopMovingDirection(Direction.Right),
  },

  /*------- 手刹/刹车 -------*/
  // TODO: 这俩有点问题
  {
    id: "masterBrakeControl",
    defaultKey: "pause",
    icon: CircleSlash,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.clearMoveCommander();
      project!.camera.speed = Vector.getZero();
    },
  },
  {
    id: "masterBrakeCheckout",
    defaultKey: "space",
    icon: CircleSlash,
    when: whenKeyboardOnlyOpen,
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.clearMoveCommander();
      project!.camera.speed = Vector.getZero();
    },
  },

  /*------- 树形调整 -------*/
  {
    id: "treeGraphAdjust",
    defaultKey: "A-S-f",
    icon: Network,
    when: whenKeyboardOnlyOpenWithSelectedConnectableEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ConnectableEntity);
      for (const entity of entities) {
        project!.keyboardOnlyTreeEngine.adjustTreeNode(entity);
      }
      project?.controller.pressingKeySet.clear(); // 解决 mac 按下后容易卡键
    },
  },
  {
    id: "treeGraphAdjustSelectedAsRoot",
    defaultKey: "C-A-S-f",
    icon: Network,
    when: whenKeyboardOnlyOpenWithSelectedConnectableEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ConnectableEntity);
      for (const entity of entities) {
        // 直接以选中节点为根节点进行格式化，不查找整个树的根节点
        project!.autoAlign.autoLayoutSelectedFastTreeMode(entity);
      }
      project?.controller.pressingKeySet.clear(); // 解决 mac 按下后容易卡键
    },
  },
  {
    id: "treeReverseX",
    defaultKey: "t r x",
    icon: ArrowLeftRight,
    when: whenHasSelectedConnectableEntities,
    onPress: (project) => {
      const selectedRoot = project!.stageManager
        .getSelectedEntities()
        .find((entity) => entity instanceof ConnectableEntity);
      if (!selectedRoot) return;
      project!.autoLayoutFastTree.treeReverseX(selectedRoot);
      project!.historyManager.recordStep();
    },
  },
  {
    id: "treeReverseY",
    defaultKey: "t r y",
    icon: ArrowDownUp,
    when: whenHasSelectedConnectableEntities,
    onPress: (project) => {
      const selectedRoot = project!.stageManager
        .getSelectedEntities()
        .find((entity) => entity instanceof ConnectableEntity);
      if (!selectedRoot) return;
      project!.autoLayoutFastTree.treeReverseY(selectedRoot);
      project!.historyManager.recordStep();
    },
  },
  {
    id: "textNodeTreeToSection",
    defaultKey: "t r s",
    icon: LayoutPanelTop,
    when: whenHasSelectedTextNodes,
    onPress: (project) => {
      const textNodes = project!.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
      for (const textNode of textNodes) {
        project!.sectionPackManager.textNodeTreeToSection(textNode);
      }
    },
  },
  /*------- DAG调整 -------*/
  {
    id: "dagGraphAdjust",
    defaultKey: "A-S-d",
    icon: Network,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ConnectableEntity);
      if (entities.length >= 2) {
        if (project!.graphMethods.isDAGByNodes(entities)) {
          project!.autoLayout.autoLayoutDAG(entities);
        } else {
          toast.error("选中的节点不构成有向无环图（DAG）");
        }
        project?.controller.pressingKeySet.clear(); // 解决 mac 按下后容易卡键
      }
    },
  },
  {
    id: "setNodeTreeDirectionUp",
    defaultKey: "W W",
    icon: ArrowUp,
    when: whenKeyboardOnlyOpenWithSelectedConnectableEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager.getSelectedEntities().filter((node) => node instanceof ConnectableEntity);
      project?.keyboardOnlyTreeEngine.changePreDirection(entities, "up");
    },
  },
  {
    id: "setNodeTreeDirectionDown",
    defaultKey: "S S",
    icon: ArrowDown,
    when: whenKeyboardOnlyOpenWithSelectedConnectableEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager.getSelectedEntities().filter((node) => node instanceof ConnectableEntity);
      project?.keyboardOnlyTreeEngine.changePreDirection(entities, "down");
    },
  },
  {
    id: "setNodeTreeDirectionLeft",
    defaultKey: "A A",
    icon: ArrowLeft,
    when: whenKeyboardOnlyOpenWithSelectedConnectableEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager.getSelectedEntities().filter((node) => node instanceof ConnectableEntity);
      project?.keyboardOnlyTreeEngine.changePreDirection(entities, "left");
    },
  },
  {
    id: "setNodeTreeDirectionRight",
    defaultKey: "D D",
    icon: ArrowRight,
    when: whenKeyboardOnlyOpenWithSelectedConnectableEntities,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager.getSelectedEntities().filter((node) => node instanceof ConnectableEntity);
      project?.keyboardOnlyTreeEngine.changePreDirection(entities, "right");
    },
  },

  /*------- 彩蛋/秘籍键 -------*/
  {
    // TODO 不触发了
    id: "screenFlashEffect",
    defaultKey: "arrowup arrowup arrowdown arrowdown arrowleft arrowright arrowleft arrowright b a",
    icon: Zap,
    when: whenHasProject,
    onPress: (project) => project!.effects.addEffect(ViewFlashEffect.SaveFile(project!)),
  },
  {
    id: "alignNodesToInteger",
    defaultKey: "i n t j",
    icon: AlignLeft,
    when: whenHasProject,
    onPress: (project) => {
      const entities = project!.stageManager.getConnectableEntity();
      for (const entity of entities) {
        const leftTopLocation = entity.collisionBox.getRectangle().location;
        const IntLocation = new Vector(Math.round(leftTopLocation.x), Math.round(leftTopLocation.y));
        entity.moveTo(IntLocation);
      }
    },
  },
  {
    id: "toggleCheckmarkOnTextNodes",
    defaultKey: "o k k",
    icon: CircleCheck,
    when: whenHasSelectedTextNodes,
    onPress: () => TextNodeSmartTools.okk(),
  },
  {
    id: "toggleCheckErrorOnTextNodes",
    defaultKey: "e r r",
    icon: CircleSlash,
    when: whenHasSelectedTextNodes,
    onPress: () => TextNodeSmartTools.err(),
  },
  {
    id: "reverseImageColors",
    defaultKey: "r r r",
    icon: Zap,
    when: whenHasSelectedImageNodes,
    onPress: (project) => {
      const selectedImageNodes: ImageNode[] = project!.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof ImageNode);
      for (const node of selectedImageNodes) {
        node.reverseColors();
      }
      if (selectedImageNodes.length > 0) {
        toast(`已反转 ${selectedImageNodes.length} 张图片的颜色`);
      }
      project?.historyManager.recordStep();
    },
  },
  {
    id: "copySelectedImageToClipboard",
    defaultKey: "i c",
    icon: Clipboard,
    when: whenHasSelectedImageNodes,
    onPress: async (project) => {
      const selectedImageNodes = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ImageNode) as ImageNode[];
      if (selectedImageNodes.length === 0) {
        toast.error("请选中图片节点");
        return;
      }

      const imageNode = selectedImageNodes[0];
      const blob = project!.attachments.get(imageNode.attachmentId);
      if (!blob) {
        toast.error("无法获取图片数据");
        return;
      }

      try {
        const arrayBuffer = await blob.arrayBuffer();
        const tauriImage = await TauriImage.fromBytes(new Uint8Array(arrayBuffer));
        await writeImage(tauriImage);
        if (selectedImageNodes.length === 1) {
          toast.success("已将选中的图片复制到系统剪贴板");
        } else {
          toast.success(`已将第1张图片复制到系统剪贴板（共${selectedImageNodes.length}张）`);
        }
      } catch (error) {
        console.error("复制图片到剪贴板失败:", error);
        toast.error("复制图片到剪贴板失败");
      }
    },
  },
  {
    id: "swapSelectedImageRedBlueChannels",
    defaultKey: "i r b",
    icon: ArrowLeftRight,
    when: whenHasSelectedImageNodes,
    onPress: (project) => {
      const selectedImageNodes = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ImageNode) as ImageNode[];
      if (selectedImageNodes.length === 0) {
        toast.error("请选中图片节点");
        return;
      }
      for (const imageNode of selectedImageNodes) {
        imageNode.swapRedBlueChannels();
      }
      project!.historyManager.recordStep();
      toast.success(
        selectedImageNodes.length === 1
          ? "已对调图片的红蓝通道"
          : `已对调 ${selectedImageNodes.length} 张图片的红蓝通道`,
      );
    },
  },
  {
    id: "setSelectedImageAsBackground",
    defaultKey: "i b",
    icon: Images,
    when: whenHasSelectedImageNodes,
    onPress: (project) => {
      const selectedImageNodes = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ImageNode) as ImageNode[];
      if (selectedImageNodes.length === 0) {
        toast.error("请选中图片节点");
        return;
      }
      for (const imageNode of selectedImageNodes) {
        imageNode.isBackground = true;
      }
      project!.historyManager.recordStep();
      toast.success(
        selectedImageNodes.length === 1
          ? "已将图片转化为背景图片"
          : `已将 ${selectedImageNodes.length} 张图片转化为背景图片`,
      );
    },
  },
  {
    id: "unsetSelectedImageAsBackground",
    defaultKey: "i S-b",
    icon: SquareSquare,
    when: whenHasSelectedImageNodes,
    onPress: (project) => {
      const selectedImageNodes = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ImageNode) as ImageNode[];
      if (selectedImageNodes.length === 0) {
        toast.error("请选中图片节点");
        return;
      }
      for (const imageNode of selectedImageNodes) {
        imageNode.isBackground = false;
      }
      project!.historyManager.recordStep();
      toast.success(
        selectedImageNodes.length === 1 ? "已取消图片的背景化" : `已取消 ${selectedImageNodes.length} 张图片的背景化`,
      );
    },
  },
  {
    id: "saveSelectedImagesToProjectDirectory",
    defaultKey: "i s",
    icon: Save,
    when: whenHasSelectedImageNodes,
    onPress: async (project) => {
      if (project!.isDraft) {
        toast.error("请先保存项目后再导出图片");
        return;
      }

      const selectedImageNodes = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ImageNode) as ImageNode[];
      if (selectedImageNodes.length === 0) {
        toast.error("请选中图片节点");
        return;
      }

      const isBatch = selectedImageNodes.length > 1;
      const promptMessage = isBatch
        ? `请输入文件名（不含扩展名，将为 ${selectedImageNodes.length} 张图片添加数字后缀）`
        : "请输入文件名（不含扩展名，将自动添加扩展名）";
      const fileName = await Dialog.input("另存图片", promptMessage, {
        placeholder: "image",
      });
      if (!fileName) return;

      const invalidChars = /[/\\:*?"<>|]/;
      if (invalidChars.test(fileName)) {
        toast.error('文件名包含非法字符：/ \\ : * ? " < > |');
        return;
      }

      const { successCount, failedCount } = await exportImagesToProjectDirectory(
        selectedImageNodes,
        project!.uri.fsPath,
        project!.attachments,
        fileName,
      );
      if (successCount > 0 && failedCount === 0) {
        toast.success(`成功保存 ${successCount} 张图片`);
      } else if (successCount > 0 && failedCount > 0) {
        toast.warning(`成功保存 ${successCount} 张图片，${failedCount} 张失败`);
      } else {
        toast.error("保存失败，请检查文件名或文件权限");
      }
    },
  },

  /*------- 主题切换 -------*/
  {
    id: "switchToDarkTheme",
    defaultKey: "b l a c k k",
    icon: Moon,
    when: whenAlways,
    onPress: () => {
      toast.info("切换到暗黑主题");
      Settings.theme = "dark";
      Themes.applyThemeById("dark");
    },
  },
  {
    id: "switchToLightTheme",
    defaultKey: "w h i t e e",
    icon: Sun,
    when: whenAlways,
    onPress: () => {
      toast.info("切换到明亮主题");
      Settings.theme = "light";
      Themes.applyThemeById("light");
    },
  },
  {
    id: "switchToParkTheme",
    defaultKey: "p a r k k",
    icon: TreePine,
    when: whenAlways,
    onPress: () => {
      toast.info("切换到公园主题");
      Settings.theme = "park";
      Themes.applyThemeById("park");
    },
  },
  {
    id: "switchToMacaronTheme",
    defaultKey: "m k l m k l",
    icon: Palette,
    when: whenAlways,
    onPress: () => {
      toast.info("切换到马卡龙主题");
      Settings.theme = "macaron";
      Themes.applyThemeById("macaron");
    },
  },
  {
    id: "switchToMorandiTheme",
    defaultKey: "m l d m l d",
    icon: Palette,
    when: whenAlways,
    onPress: () => {
      toast.info("切换到莫兰迪主题");
      Settings.theme = "morandi";
      Themes.applyThemeById("morandi");
    },
  },

  /*------- 画笔透明度 -------*/
  {
    id: "increasePenAlpha",
    defaultKey: "p s a + +",
    icon: Sun,
    when: whenHasProject,
    onPress: async (project) => project!.controller.penStrokeDrawing.changeCurrentStrokeColorAlpha(0.1),
  },
  {
    id: "decreasePenAlpha",
    defaultKey: "p s a - -",
    icon: Moon,
    when: whenHasProject,
    onPress: async (project) => project!.controller.penStrokeDrawing.changeCurrentStrokeColorAlpha(-0.1),
  },
  {
    id: "resetPenStrokeColor",
    defaultKey: "p s c 0",
    icon: Slash,
    when: whenAlways,
    onPress: () => {
      Settings.autoFillPenStrokeColor = Color.Transparent.toArray();
    },
  },

  /*------- 对齐 -------*/
  {
    id: "alignTop",
    defaultKey: "8 8",
    icon: AlignStartHorizontal,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => {
      project!.layoutManager.alignTop();
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Up, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Down);
    },
  },
  {
    id: "alignBottom",
    defaultKey: "2 2",
    icon: AlignEndHorizontal,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => {
      project!.layoutManager.alignBottom();
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Down, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Up);
    },
  },
  {
    id: "alignLeft",
    defaultKey: "4 4",
    icon: AlignStartVertical,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => {
      project!.layoutManager.alignLeft();
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Left, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Right);
    },
  },
  {
    id: "alignRight",
    defaultKey: "6 6",
    icon: AlignEndVertical,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => {
      project!.layoutManager.alignRight();
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Right, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Left);
    },
  },
  {
    id: "alignHorizontalSpaceBetween",
    defaultKey: "4 6 4 6",
    icon: AlignHorizontalSpaceBetween,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => project!.layoutManager.alignHorizontalSpaceBetween(),
  },
  {
    id: "alignVerticalSpaceBetween",
    defaultKey: "8 2 8 2",
    icon: AlignVerticalSpaceBetween,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => project!.layoutManager.alignVerticalSpaceBetween(),
  },
  {
    id: "alignCenterHorizontal",
    defaultKey: "5 4 6",
    icon: AlignCenterHorizontal,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => project!.layoutManager.alignCenterHorizontal(),
  },
  {
    id: "alignCenterVertical",
    defaultKey: "5 8 2",
    icon: AlignCenterVertical,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => project!.layoutManager.alignCenterVertical(),
  },
  {
    id: "alignLeftToRightNoSpace",
    defaultKey: "4 5 6",
    icon: AlignHorizontalJustifyStart,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => project!.layoutManager.alignLeftToRightNoSpace(),
  },
  {
    id: "alignTopToBottomNoSpace",
    defaultKey: "8 5 2",
    icon: AlignVerticalJustifyStart,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => project!.layoutManager.alignTopToBottomNoSpace(),
  },
  {
    id: "adjustSelectedTextNodeWidthMin",
    defaultKey: "1 3 2",
    icon: ChevronsRightLeft,
    when: whenHasSelectedTextNodes,
    onPress: (project) => project!.layoutManager.adjustSelectedTextNodeWidth("minWidth"),
  },
  {
    id: "adjustSelectedTextNodeWidthAverage",
    defaultKey: "4 6 5",
    icon: MoveHorizontal,
    when: whenHasSelectedTextNodes,
    onPress: (project) => project!.layoutManager.adjustSelectedTextNodeWidth("average"),
  },
  {
    id: "adjustSelectedTextNodeWidthMax",
    defaultKey: "7 9 8",
    icon: Code,
    when: whenHasSelectedTextNodes,
    onPress: (project) => project!.layoutManager.adjustSelectedTextNodeWidth("maxWidth"),
  },
  {
    id: "layoutToSquare",
    defaultKey: "5 5",
    icon: Grip,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => project!.layoutManager.layoutToSquare(project!.stageManager.getSelectedEntities()),
  },
  {
    id: "layoutToTightSquare",
    defaultKey: "5 5 5",
    icon: LayoutDashboard,
    when: whenHasMultipleSelectedEntities,
    onPress: (project) => project!.layoutManager.layoutToTightSquare(project!.stageManager.getSelectedEntities()),
  },
  {
    id: "layoutToTightSquareDeep",
    defaultKey: "5 5 5 5",
    icon: SquareSquare,
    when: whenHasMultipleSelectedEntitiesOrOneSection,
    onPress: (project) => project!.layoutManager.layoutBySelected(project!.layoutManager.layoutToTightSquare, true),
  },

  /*------- 连接 -------*/
  {
    id: "createConnectPointWhenDragConnecting",
    defaultKey: "1",
    icon: Plus,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controller.nodeConnection.createConnectPointWhenConnect();
    },
  },
  {
    id: "connectAllSelectedEntities",
    defaultKey: "- - a l l",
    icon: Link,
    when: whenHasMultipleSelectedConnectableEntities,
    onPress: (project) => ConnectNodeSmartTools.connectAll(project!),
  },
  {
    id: "connectLeftToRight",
    defaultKey: "- - r i g h t",
    icon: Link,
    when: whenHasMultipleSelectedConnectableEntities,
    onPress: (project) => ConnectNodeSmartTools.connectRight(project!),
  },
  {
    id: "connectTopToBottom",
    defaultKey: "- - d o w n",
    icon: Link,
    when: whenHasMultipleSelectedConnectableEntities,
    onPress: (project) => ConnectNodeSmartTools.connectDown(project!),
  },

  /*------- 选择所有可见边 -------*/
  {
    id: "selectAllEdges",
    defaultKey: "+ e d g e",
    icon: MousePointer,
    when: whenHasProject,
    onPress: (project) => {
      const selectedEdges = project!.stageManager.getAssociations();
      const viewRect = project!.renderer.getCoverWorldRectangle();
      for (const edge of selectedEdges) {
        if (project!.renderer.isOverView(viewRect, edge)) continue;
        edge.isSelected = true;
      }
    },
  },
  /*------- 将选中的边切换为虚线 -------*/
  {
    id: "setSelectedEdgesToDashed",
    defaultKey: "S-t e d",
    icon: CircleSlash,
    when: whenHasSelectedLineEdges,
    onPress: (project) => {
      const selectedEdges = project!.stageManager.getLineEdges().filter((edge) => edge.isSelected);
      if (selectedEdges.length === 0) {
        return;
      }
      for (const edge of selectedEdges) {
        edge.lineType = "dashed";
      }
      project!.historyManager.recordStep();
    },
  },
  /*------- 将选中的边切换为实线 -------*/
  {
    id: "setSelectedEdgesToSolid",
    defaultKey: "S-t e s",
    icon: Link,
    when: whenHasSelectedLineEdges,
    onPress: (project) => {
      const selectedEdges = project!.stageManager.getLineEdges().filter((edge) => edge.isSelected);
      if (selectedEdges.length === 0) {
        return;
      }
      for (const edge of selectedEdges) {
        edge.lineType = "solid";
      }
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setSelectedEdgesToDouble",
    defaultKey: "S-t e b",
    icon: Equal,
    when: whenHasSelectedLineEdges,
    onPress: (project) => {
      project!.stageManager.setSelectedEdgeLineType("double");
      project!.historyManager.recordStep();
    },
  },
  {
    id: "switchEdgeToUndirectedEdge",
    defaultKey: "e t u",
    icon: Spline,
    when: whenHasSelectedLineEdges,
    onPress: (project) => {
      project!.stageManager.switchEdgeToUndirectedEdge();
      project!.historyManager.recordStep();
    },
  },
  {
    id: "switchUndirectedEdgeToEdge",
    defaultKey: "u t e",
    icon: MoveUpRight,
    when: whenHasSelectedMTUEdges,
    onPress: (project) => {
      project!.stageManager.switchUndirectedEdgeToEdge();
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setSelectedEdgeSourceConnectLocationUp",
    defaultKey: "e s 8",
    icon: ArrowUpFromLine,
    when: whenHasSelectedLineEdges,
    onPress: (project) => project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Up, true),
  },
  {
    id: "setSelectedEdgeSourceConnectLocationLeft",
    defaultKey: "e s 4",
    icon: ArrowLeftFromLine,
    when: whenHasSelectedLineEdges,
    onPress: (project) => project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Left, true),
  },
  {
    id: "setSelectedEdgeSourceConnectLocationCenter",
    defaultKey: "e s 5",
    icon: SquareDot,
    when: whenHasSelectedLineEdges,
    onPress: (project) => project!.stageManager.changeSelectedEdgeConnectLocation(null, true),
  },
  {
    id: "setSelectedEdgeSourceConnectLocationRight",
    defaultKey: "e s 6",
    icon: ArrowRightFromLine,
    when: whenHasSelectedLineEdges,
    onPress: (project) => project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Right, true),
  },
  {
    id: "setSelectedEdgeSourceConnectLocationDown",
    defaultKey: "e s 2",
    icon: ArrowDownFromLine,
    when: whenHasSelectedLineEdges,
    onPress: (project) => project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Down, true),
  },
  {
    id: "setSelectedEdgeTargetConnectLocationUp",
    defaultKey: "e t 8",
    icon: ArrowDownToLine,
    when: whenHasSelectedLineEdges,
    onPress: (project) => project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Up),
  },
  {
    id: "setSelectedEdgeTargetConnectLocationLeft",
    defaultKey: "e t 4",
    icon: ArrowRightToLine,
    when: whenHasSelectedLineEdges,
    onPress: (project) => project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Left),
  },
  {
    id: "setSelectedEdgeTargetConnectLocationCenter",
    defaultKey: "e t 5",
    icon: SquareDot,
    when: whenHasSelectedLineEdges,
    onPress: (project) => project!.stageManager.changeSelectedEdgeConnectLocation(null),
  },
  {
    id: "setSelectedEdgeTargetConnectLocationRight",
    defaultKey: "e t 6",
    icon: ArrowLeftToLine,
    when: whenHasSelectedLineEdges,
    onPress: (project) => project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Right),
  },
  {
    id: "setSelectedEdgeTargetConnectLocationDown",
    defaultKey: "e t 2",
    icon: ArrowUpToLine,
    when: whenHasSelectedLineEdges,
    onPress: (project) => project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Down),
  },
  {
    id: "setSelectedEdgeToRight",
    defaultKey: "6 6",
    icon: MoveRight,
    when: whenHasSelectedLineEdges,
    onPress: (project) => {
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Right, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Left);
    },
  },
  {
    id: "setSelectedEdgeToLeft",
    defaultKey: "4 4",
    icon: MoveLeft,
    when: whenHasSelectedLineEdges,
    onPress: (project) => {
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Left, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Right);
    },
  },
  {
    id: "setSelectedEdgeToUp",
    defaultKey: "8 8",
    icon: MoveUp,
    when: whenHasSelectedLineEdges,
    onPress: (project) => {
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Up, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Down);
    },
  },
  {
    id: "setSelectedEdgeToDown",
    defaultKey: "2 2",
    icon: MoveDown,
    when: whenHasSelectedLineEdges,
    onPress: (project) => {
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Down, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Up);
    },
  },
  {
    id: "setSelectedEdgeToCenter",
    defaultKey: "5 5",
    icon: SquareDot,
    when: whenHasSelectedLineEdges,
    onPress: (project) => {
      project!.stageManager.changeSelectedEdgeConnectLocation(null, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(null);
    },
  },
  {
    id: "setMTUEdgeArrowOuter",
    defaultKey: "m t u o",
    icon: Maximize2,
    when: whenHasSelectedMTUEdges,
    onPress: (project) => {
      const selectedMTUEdges = project!.stageManager
        .getSelectedAssociations()
        .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
      for (const edge of selectedMTUEdges) {
        edge.arrow = "outer";
      }
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setMTUEdgeArrowInner",
    defaultKey: "m t u i",
    icon: Minimize2,
    when: whenHasSelectedMTUEdges,
    onPress: (project) => {
      const selectedMTUEdges = project!.stageManager
        .getSelectedAssociations()
        .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
      for (const edge of selectedMTUEdges) {
        edge.arrow = "inner";
      }
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setMTUEdgeArrowNone",
    defaultKey: "m t u n",
    icon: Slash,
    when: whenHasSelectedMTUEdges,
    onPress: (project) => {
      const selectedMTUEdges = project!.stageManager
        .getSelectedAssociations()
        .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
      for (const edge of selectedMTUEdges) {
        edge.arrow = "none";
      }
      project!.historyManager.recordStep();
    },
  },
  {
    id: "switchMTUEdgeRenderType",
    defaultKey: "m t u r",
    icon: RefreshCcw,
    when: whenHasSelectedMTUEdges,
    onPress: (project) => {
      const selectedMTUEdges = project!.stageManager
        .getSelectedAssociations()
        .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
      for (const edge of selectedMTUEdges) {
        if (edge.renderType === "line") {
          edge.renderType = "convex";
        } else if (edge.renderType === "convex") {
          edge.renderType = "circle";
        } else if (edge.renderType === "circle") {
          edge.renderType = "line";
        }
      }
      project!.historyManager.recordStep();
    },
  },
  {
    id: "resetMTUEdgeEndpointLocations",
    defaultKey: "m t u 5",
    icon: AlignCenterHorizontal,
    when: whenHasSelectedMTUEdges,
    onPress: (project) => {
      const selectedMTUEdges = project!.stageManager
        .getSelectedAssociations()
        .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
      for (const edge of selectedMTUEdges) {
        edge.centerRate = Vector.same(0.5);
        edge.rectRates = edge.associationList.map(() => Vector.same(0.5));
      }
      project!.historyManager.recordStep();
    },
  },

  /*------- 快速着色 -------*/
  {
    id: "colorSelectedRed",
    defaultKey: "; r e d",
    icon: Palette,
    when: whenHasSelectedColorableStageObjects,
    onPress: (project) => {
      const selectedStageObject = project!.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          obj.color = new Color(239, 68, 68);
        }
      }
    },
  },
  {
    id: "resetSelectedStageObjectColor",
    defaultKey: "; 0",
    icon: Slash,
    when: whenHasSelectedColorableStageObjects,
    onPress: (project) => project!.stageObjectColorManager.setSelectedStageObjectColor(Color.Transparent),
  },
  {
    id: "setSelectedStageObjectSpecialTransparentColor",
    defaultKey: "; t 0",
    icon: Palette,
    when: whenHasSelectedColorableStageObjects,
    onPress: (project) => project!.stageObjectColorManager.setSelectedStageObjectColor(new Color(11, 45, 14, 0)),
  },
  {
    id: "increaseBrightness",
    defaultKey: "b .",
    icon: Sun,
    when: whenHasSelectedColorableStageObjects,
    onPress: (project) => ColorSmartTools.increaseBrightness(project!),
  },
  {
    id: "decreaseBrightness",
    defaultKey: "b ,",
    icon: Moon,
    when: whenHasSelectedColorableStageObjects,
    onPress: (project) => ColorSmartTools.decreaseBrightness(project!),
  },
  {
    id: "gradientColor",
    defaultKey: "; ,",
    icon: Palette,
    when: whenHasSelectedColorableStageObjects,
    onPress: (project) => ColorSmartTools.gradientColor(project!),
  },
  {
    id: "changeColorHueUp",
    defaultKey: "A-S-arrowup",
    icon: Sun,
    when: whenHasSelectedColorableStageObjects,
    onPress: (project) => ColorSmartTools.changeColorHueUp(project!),
  },
  {
    id: "changeColorHueDown",
    defaultKey: "A-S-arrowdown",
    icon: Moon,
    when: whenHasSelectedColorableStageObjects,
    onPress: (project) => ColorSmartTools.changeColorHueDown(project!),
  },
  {
    id: "changeColorHueMajorUp",
    defaultKey: "A-S-home",
    icon: Sun,
    when: whenHasSelectedColorableStageObjects,
    onPress: (project) => ColorSmartTools.changeColorHueMajorUp(project!),
  },
  {
    id: "changeColorHueMajorDown",
    defaultKey: "A-S-end",
    icon: Moon,
    when: whenHasSelectedColorableStageObjects,
    onPress: (project) => ColorSmartTools.changeColorHueMajorDown(project!),
  },

  /*------- 文本节点工具 -------*/
  {
    id: "toggleTextNodeSizeMode",
    defaultKey: "t t t",
    icon: Type,
    when: whenHasSelectedTextNodes,
    onPress: (project) => TextNodeSmartTools.ttt(project!),
  },
  {
    id: "splitTextNodes",
    defaultKey: "k e i",
    icon: Split,
    when: whenHasSelectedTextNodes,
    onPress: (project) => TextNodeSmartTools.kei(project!),
  },
  {
    id: "mergeTextNodes",
    defaultKey: "r u a",
    icon: Merge,
    when: whenHasSelectedTextNodes,
    onPress: (project) => TextNodeSmartTools.rua(project!),
  },
  {
    id: "swapTextAndDetails",
    defaultKey: "e e e e e",
    icon: Repeat,
    when: whenHasSelectedTextNodes,
    onPress: (project) => TextNodeSmartTools.exchangeTextAndDetails(project!),
  },
  {
    id: "createTwinTextNode",
    defaultKey: "S-y",
    icon: GitBranch,
    when: whenHasSelectedTextNodes,
    onPress: (project) => {
      project!.syncAssociationManager.createTwinsFromSelectedEntities();
    },
  },
  {
    id: "changeTextNodeToReferenceBlock",
    defaultKey: "r e f",
    icon: SquareDashedBottomCode,
    when: whenHasSelectedTextNodes,
    onPress: (project) => TextNodeSmartTools.changeTextNodeToReferenceBlock(project!),
  },
  {
    id: "refreshReferenceBlockNode",
    defaultKey: "r e f r",
    icon: RefreshCcwDot,
    when: whenHasSelectedReferenceBlockNodes,
    onPress: (project) => {
      project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ReferenceBlockNode)
        .filter((entity) => entity.isSelected)
        .forEach((entity) => entity.refresh());
    },
  },
  {
    id: "goToReferenceBlockSource",
    defaultKey: "r e f g",
    icon: CornerUpRight,
    when: whenHasSelectedReferenceBlockNodes,
    onPress: (project) => {
      project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ReferenceBlockNode)
        .filter((entity) => entity.isSelected)
        .forEach((entity) => entity.goToSource());
    },
  },

  /*------- 潜行模式 -------*/
  {
    id: "switchStealthMode",
    defaultKey: "j a c k a l",
    icon: Ghost,
    when: whenAlways,
    onPress: () => {
      Settings.isStealthModeEnabled = !Settings.isStealthModeEnabled;
      toast(Settings.isStealthModeEnabled ? "已开启潜行模式" : "已关闭潜行模式");
    },
  },

  /*------- 拆分字符 -------*/
  {
    id: "removeFirstCharFromSelectedTextNodes",
    defaultKey: "C-backspace",
    icon: Scissors,
    when: whenHasSelectedTextNodes,
    onPress: (project) => TextNodeSmartTools.removeFirstCharFromSelectedTextNodes(project!),
  },
  {
    id: "removeLastCharFromSelectedTextNodes",
    defaultKey: "C-delete",
    icon: Scissors,
    when: whenHasSelectedTextNodes,
    onPress: (project) => TextNodeSmartTools.removeLastCharFromSelectedTextNodes(project!),
  },

  /*------- 交换两实体位置 -------*/
  {
    id: "swapTwoSelectedEntitiesPositions",
    defaultKey: "S-r",
    icon: Repeat,
    when: whenKeyboardOnlyOpenWithSelectedEntities,
    onPress: (project) => {
      // 这个东西废了，直接触发了软件刷新
      // 这个东西没啥用，感觉得下掉
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const selectedEntities = project!.stageManager.getSelectedEntities();
      if (selectedEntities.length !== 2) return;
      project!.historyManager.recordStep();
      const [e1, e2] = selectedEntities;
      const p1 = e1.collisionBox.getRectangle().location.clone();
      const p2 = e2.collisionBox.getRectangle().location.clone();
      e1.moveTo(p2);
      e2.moveTo(p1);
    },
  },

  /*------- 字体大小调整 -------*/
  {
    id: "decreaseFontSize",
    defaultKey: "C--",
    icon: Shrink,
    when: whenKeyboardOnlyOpenWithSelectedTextNodes,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const selectedNodes = project!.stageManager.getSelectedEntities();
      const textNodes = selectedNodes.filter((node) => node instanceof TextNode) as TextNode[];
      const latexNodes = selectedNodes.filter((node) => node instanceof LatexNode) as LatexNode[];
      if (textNodes.length === 0 && latexNodes.length === 0) return;
      project!.historyManager.recordStep();
      for (const node of textNodes) {
        node.decreaseFontSize(TextNodeSmartTools.getAnchorRateForTextNode(project!, node));
      }
      for (const node of latexNodes) {
        node.decreaseFontSize();
      }
    },
  },
  {
    id: "increaseFontSize",
    defaultKey: "C-=",
    icon: Expand,
    when: whenKeyboardOnlyOpenWithSelectedTextNodes,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const selectedNodes = project!.stageManager.getSelectedEntities();
      const textNodes = selectedNodes.filter((node) => node instanceof TextNode) as TextNode[];
      const latexNodes = selectedNodes.filter((node) => node instanceof LatexNode) as LatexNode[];
      if (textNodes.length === 0 && latexNodes.length === 0) return;
      project!.historyManager.recordStep();
      for (const node of textNodes) {
        node.increaseFontSize(TextNodeSmartTools.getAnchorRateForTextNode(project!, node));
      }
      for (const node of latexNodes) {
        node.increaseFontSize();
      }
    },
  },

  /*------- 节点相关 -------*/
  {
    id: "graftNodeToTree",
    defaultKey: "q e",
    icon: GitBranch,
    when: whenHasSelectedConnectableEntities,
    onPress: (project) => {
      ConnectNodeSmartTools.insertNodeToTree(project!);
    },
  },
  {
    id: "removeNodeFromTree",
    defaultKey: "q r",
    icon: Scissors,
    when: whenHasSelectedConnectableEntities,
    onPress: (project) => {
      ConnectNodeSmartTools.removeNodeFromTree(project!);
    },
  },
  {
    id: "selectAtCrosshair",
    defaultKey: "q q",
    icon: Focus,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const worldLocation = project!.camera.location.clone();
      const entity = project!.stageManager.findEntityByLocation(worldLocation);
      if (entity) {
        if (!project!.sectionMethods.isObjectBeLockedBySection(entity)) {
          // 单一选择：先取消所有选中
          project!.stageManager.clearSelectAll();
          entity.isSelected = true;
        }
      }
    },
  },
  {
    id: "addSelectAtCrosshair",
    defaultKey: "S-q",
    icon: Focus,
    when: whenKeyboardOnlyOpen,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const worldLocation = project!.camera.location.clone();
      const entity = project!.stageManager.findEntityByLocation(worldLocation);
      if (entity) {
        if (!project!.sectionMethods.isObjectBeLockedBySection(entity)) {
          // 添加选择：切换选中状态
          entity.isSelected = !entity.isSelected;
        }
      }
    },
  },

  /*------- AI 操作相关 -------*/
  {
    id: "generateTreeBySelectedTextNodeTextWithAI",
    defaultKey: "g e n t t",
    icon: Sparkle,
    when: whenHasSelectedTextNodes,
    onPress: (project) => {
      if (project) TextNodeSmartTools.generateTreeBySelectedTextNodeTextWithAI(project);
    },
  },
  {
    id: "generateNetBySelectedTextNodeTextWithAI",
    defaultKey: "g e n n t",
    icon: Sparkle,
    when: whenHasSelectedTextNodes,
    onPress: (project) => {
      if (project) TextNodeSmartTools.generateNetBySelectedTextNodeTextWithAI(project);
    },
  },
  {
    id: "generateSummaryBySelectedTextNodeTextWithAI",
    defaultKey: "g e n s t",
    icon: Sparkle,
    when: whenHasSelectedTextNodes,
    onPress: (project) => {
      if (project) TextNodeSmartTools.generateSummaryBySelectedTextNodeTextWithAI(project);
    },
  },
  /*------- 字体相关 -------*/
  {
    id: "setFontFamily",
    defaultKey: "A-f",
    icon: Type,
    when: whenHasSelectedTextNodes,
    onPress: async (project) => {
      const selectedTextNodes = project!.stageManager
        .getSelectedEntities()
        .filter((n) => n instanceof TextNode) as TextNode[];

      const fontFamily = await Dialog.input("设置字体 (Font Family)", "输入 CSS font-family 值（留空恢复默认字体）", {
        defaultValue: selectedTextNodes[0]?.fontFamily ?? "",
      });
      if (fontFamily === undefined) return;

      for (const node of selectedTextNodes) {
        node.fontFamily = fontFamily;
        if (node.sizeAdjust === "auto") {
          node.forceAdjustSizeByText();
        } else if (node.sizeAdjust === "manual") {
          node.forceAdjustHeightByText();
        }
        project!.textNodeRenderer.renderTextNode(node);
      }
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setFontWeight",
    defaultKey: "A-w",
    icon: Type,
    when: whenHasSelectedTextNodes,
    onPress: async (project) => {
      const selectedTextNodes = project!.stageManager
        .getSelectedEntities()
        .filter((n) => n instanceof TextNode) as TextNode[];

      const fontWeight = await Dialog.input(
        "设置字重 (Font Weight)",
        "输入 CSS font-weight 值（如 bold、600，留空恢复 normal）",
        {
          defaultValue: selectedTextNodes[0]?.fontWeight ?? "",
        },
      );
      if (fontWeight === undefined) return;

      for (const node of selectedTextNodes) {
        node.fontWeight = fontWeight;
        if (node.sizeAdjust === "auto") {
          node.forceAdjustSizeByText();
        } else if (node.sizeAdjust === "manual") {
          node.forceAdjustHeightByText();
        }
        project!.textNodeRenderer.renderTextNode(node);
      }
      project!.historyManager.recordStep();
    },
  },
];

export function getKeyBindTypeById(id: string): "global" | "software" {
  for (const keyBind of allKeyBinds) {
    if (keyBind.id === id) {
      return keyBind.isGlobal ? "global" : "software";
    }
  }
  return "software";
}

export function isKeyBindHasRelease(id: string) {
  for (const keyBind of allKeyBinds) {
    if (keyBind.id === id) {
      if (keyBind.onRelease) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 获取唯一选中的文本节点，用于导出纯文本时。
 * 如果不符合情况就提前弹窗错误，并返回null
 * @param activeProject
 * @returns
 */
function getOneSelectedTextNodeWhenExportingPlainText(activeProject: Project | undefined): TextNode | null {
  if (!activeProject) {
    toast.warning("请先打开工程文件");
    return null;
  }
  const entities = activeProject.stageManager.getEntities();
  const selectedEntities = entities.filter((entity) => entity.isSelected);
  if (selectedEntities.length === 0) {
    toast.warning("没有选中节点");
    return null;
  } else if (selectedEntities.length === 1) {
    const result = selectedEntities[0];
    if (!(result instanceof TextNode)) {
      toast.warning("必须选中文本节点，而不是其他类型的节点");
      return null;
    }
    const validationResult = activeProject.graphMethods.validateTreeStructure(result, true);
    if (!validationResult.isValid) {
      toast.warning("树结构验证失败，无法导出");
      return null;
    }
    return result;
  } else {
    toast.warning(`只能选择一个节点，你选中了${selectedEntities.length}个节点`);
    return null;
  }
}
