import { Dialog } from "@/components/ui/dialog";
import { Project, ProjectState } from "@/core/Project";
import { AssetsRepository } from "@/core/service/AssetsRepository";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { ViewFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ViewFlashEffect";
import { ViewOutlineFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ViewOutlineFlashEffect";
import { Settings } from "@/core/service/Settings";
import { SubWindow } from "@/core/service/SubWindow";
import { Themes } from "@/core/service/Themes";
import { PenStrokeMethods } from "@/core/stage/stageManager/basicMethods/PenStrokeMethods";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { TestTab } from "@/core/TestTab";
import { activeTabAtom, commandPaletteVisibleAtom, isWindowMaxsizedAtom, store, tabsAtom } from "@/state";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { Image as TauriImage } from "@tauri-apps/api/image";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { writeImage, writeText } from "@tauri-apps/plugin-clipboard-manager";
// import ColorWindow from "@/sub/ColorWindow";
import EditUrlNodeLinkWindow from "@/sub/EditUrlNodeLinkWindow";
import FindWindow from "@/sub/FindWindow";
// import KeyboardRecentFilesWindow from "@/sub/KeyboardRecentFilesWindow";
import { LatexNode } from "@/core/stage/stageObject/entity/LatexNode";
import AIToolsWindow from "@/sub/AIToolsWindow";
import AIWindow from "@/sub/AIWindow";
import AttachmentsWindow from "@/sub/AttachmentsWindow";
import LogicNodePanel from "@/sub/AutoComputeWindow";
import BackgroundManagerWindow from "@/sub/BackgroundManagerWindow";
import ColorPaletteWindow from "@/sub/ColorPaletteWindow";
import ColorWindow, { ColorManagerPanel } from "@/sub/ColorWindow";
import ExportPngWindow from "@/sub/ExportPngWindow";
import GenerateNodeTree, {
  GenerateNodeGraph,
  GenerateNodeMermaid,
  GenerateNodeTreeByMarkdown,
} from "@/sub/GenerateNodeWindow";
import NewExportPngWindow from "@/sub/NewExportPngWindow";
import NodeDetailsWindow from "@/sub/NodeDetailsWindow";
import OnboardingWindow from "@/sub/OnboardingWindow";
import RecentFilesWindow from "@/sub/RecentFilesWindow";
import ReferencesWindow from "@/sub/ReferencesWindow";
import SettingsWindow from "@/sub/SettingsWindow";
import TagWindow from "@/sub/TagWindow";
import TestWindow from "@/sub/TestWindow";
import { openTextImportWindow } from "@/sub/TextImportWindow";
import { Direction } from "@/types/directions";
import { openBrowserOrFile } from "@/utils/externalOpen";
import { exportImagesToProjectDirectory } from "@/utils/imageExport";
import { getDeviceId } from "@/utils/otherApi";
import { isMac } from "@/utils/platform";
import { Color, Vector } from "@graphif/data-structures";
import { serialize } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import { Encoder } from "@msgpack/msgpack";
import { appCacheDir, appDataDir, dataDir, join, tempDir } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { exists, mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import i18next from "i18next";
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
  AppWindow,
  Archive,
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
  Axe,
  Blocks,
  BookOpen,
  BookOpenText,
  Bot,
  Box,
  Brush,
  Bug,
  Camera,
  ChevronFirst,
  ChevronLast,
  ChevronsDown,
  ChevronsRightLeft,
  ChevronsUp,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleMinus,
  CirclePlus,
  CircleSlash,
  Clipboard,
  Code,
  Columns4,
  Command,
  Copy,
  CornerUpRight,
  Diamond,
  Dices,
  Dot,
  Dumbbell,
  Equal,
  Expand,
  ExternalLink,
  Eye,
  EyeOff,
  FileBadge,
  FileBox,
  FileClock,
  FileCode,
  FileDigit,
  FileDown,
  File as FileIcon,
  FileImage,
  FileInput,
  FileOutput,
  FilePlus,
  FileSpreadsheet,
  FileText,
  FileUp,
  Fingerprint,
  Flag,
  FlaskConical,
  Focus,
  Folder,
  FolderClock,
  FolderCog,
  FolderOpen,
  FolderPlus,
  FolderTree,
  Gem,
  Ghost,
  GitBranch,
  GitCompareArrows,
  Globe,
  GraduationCap,
  Grip,
  History,
  Images,
  Keyboard,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutPanelTop,
  Link,
  Lock,
  LucideProps,
  MapPin,
  Maximize,
  Maximize2,
  Merge,
  MessageCircleWarning,
  Minimize,
  Minimize2,
  Moon,
  MousePointer,
  MousePointer2,
  Move3d,
  MoveDown,
  MoveHorizontal,
  MoveLeft,
  MoveRight,
  MoveUp,
  MoveUpRight,
  Network,
  OctagonX,
  Package,
  Palette,
  Paperclip,
  PenTool,
  PictureInPicture2,
  Play,
  Plus,
  Rabbit,
  Radiation,
  Radius,
  Redo,
  RefreshCcw,
  RefreshCcwDot,
  RefreshCw,
  Repeat,
  Rows4,
  Save,
  Scissors,
  Search,
  Settings as SettingsIcon,
  Shrink,
  Slash,
  Sparkles,
  Spline,
  Split,
  Square,
  SquareDashed,
  SquareDashedBottomCode,
  SquareDot,
  SquareRoundCorner,
  SquareSquare,
  Store,
  Sun,
  Tag,
  Terminal,
  TextQuote,
  Trash2,
  TreePine,
  Triangle,
  Tv,
  Type,
  Undo,
  View,
  Wand2,
  Workflow,
  Wrench,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import {
  createCurrentFileDeepLink,
  createCurrentViewDeepLink,
  createSelectedEntityDeepLink,
} from "../../dataFileService/DeepLinkHandler";
import { RecentFileManager } from "../../dataFileService/RecentFileManager";
import { generateKeyboardLayout } from "../../dataGenerateService/generateFromFolderEngine/GenerateFromFolderEngine";
import { ColorSmartTools } from "../../dataManageService/colorSmartTools";
import { ConnectNodeSmartTools } from "../../dataManageService/connectNodeSmartTools";
import { DragFileIntoStageEngine } from "../../dataManageService/dragFileIntoStageEngine/dragFileIntoStageEngine";
import { TextNodeSmartTools } from "../../dataManageService/textNodeSmartTools";
import {
  createFileAtCurrentProjectDir,
  onNewDraft,
  onOpenFile,
  onUpgradeOldJson,
  openCurrentProjectFolder,
} from "../../GlobalMenu";
import { KeyBindsUI } from "./KeyBindsUI";

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
const whenHasNonDraftProject: KeyBindWhen = (project) => !!project && !project.isDraft;
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
const whenHasSelectedUrlNodes: KeyBindWhen = (project) =>
  !!project && project.stageManager.getSelectedEntities().some((entity) => entity instanceof UrlNode);
const whenHasSelectedLineEdges: KeyBindWhen = (project) =>
  !!project && project.stageManager.getLineEdges().some((edge) => edge.isSelected);
const whenHasSelectedEdgeWithLineType: KeyBindWhen = (project) =>
  !!project &&
  (project.stageManager.getLineEdges().some((edge) => edge.isSelected) ||
    project.stageManager.getArcEdges().some((edge) => edge.isSelected) ||
    project.stageManager
      .getSelectedAssociations()
      .some((association) => association instanceof MultiTargetUndirectedEdge));
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

function showDraftCannotExportDeepLinkDialog() {
  return Dialog.buttons(
    "草稿不能保存",
    "当前项目还是草稿，没有绝对路径，不能导出 prg 协议链接。请先保存为 .prg 文件。",
    [{ id: "ok", label: "确定" }] as const,
  );
}

async function exportDeepLinkWithDialog(
  project: Project | undefined,
  description: string,
  urlFactory: (project: Project) => string | null,
) {
  if (!project) {
    toast.warning("请先打开工程文件");
    return;
  }
  if (project.isDraft) {
    await showDraftCannotExportDeepLinkDialog();
    return;
  }
  const url = urlFactory(project);
  if (!url) return;
  await Dialog.copy("导出 prg 协议链接", description, url);
}

export const allKeyBinds: KeyBindItem[] = [
  {
    id: "test",
    defaultKey: "C-A-S-t",
    icon: FlaskConical,
    when: whenAlways,
    onPress: () => toast("您按下了自定义的测试快捷键，这一功能是测试开发所用，可在设置中更改触发方式"),
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
    id: "toggleWindowMaximize",
    defaultKey: "C-S-F11",
    icon: Maximize2,
    when: whenAlways,
    onPress: async () => {
      const window = getCurrentWindow();
      await window.toggleMaximize();
      store.set(isWindowMaxsizedAtom, await window.isMaximized());
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
    id: "cameraCenterOnSelection",
    defaultKey: "q f",
    icon: Focus,
    when: whenHasProject,
    onPress: (project) => {
      const entities = project!.stageManager.getSelectedEntities();
      if (entities.length === 0) {
        project!.camera.bombMove(Vector.getZero());
      } else {
        const rects = entities.map((e) => e.collisionBox.getRectangle());
        const boundingRect = Rectangle.getBoundingRectangle(rects);
        project!.camera.bombMove(boundingRect.center);
      }
    },
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
    onPress: async (project) => {
      // 检查是否有框选框并且舞台上没有选中任何物体
      const rectangleSelect = project!.rectangleSelect;
      const hasActiveRectangle = rectangleSelect.getRectangle() !== null;
      const hasSelectedEntities = project!.stageManager.getEntities().some((entity) => entity.isSelected);
      const hasSelectedEdges = project!.stageManager.getAssociations().some((edge) => edge.isSelected);
      if (hasActiveRectangle && !hasSelectedEntities && !hasSelectedEdges) {
        const section = project!.sectionPackManager.createSectionFromSelectionRectangle();
        if (section) {
          project!.stageManager.clearSelectAll();
          for (const edge of project!.stageManager.getAssociations()) {
            edge.isSelected = false;
          }
          section.isSelected = true;
          if (Settings.autoEnterSectionEditMode) {
            project!.controllerUtils.editSectionTitle(section);
          }
        }
      } else {
        // 否则执行原来的打包功能，并自动进入编辑状态
        const section = await project!.sectionPackManager.packSelectedEntitiesToSection();
        if (section) {
          project!.stageManager.clearSelectAll();
          for (const edge of project!.stageManager.getAssociations()) {
            edge.isSelected = false;
          }
          section.isSelected = true;
          if (Settings.autoEnterSectionEditMode) {
            project!.controllerUtils.editSectionTitle(section);
          }
        }
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
  /*------- 分组框边框样式 -------*/
  {
    id: "setSectionBorderSolid",
    defaultKey: "",
    icon: Square,
    when: whenHasSelectedSections,
    onPress: (project) => {
      const selectedSections = project!.stageManager.getSelectedEntities().filter((it) => it instanceof Section);
      for (const section of selectedSections) {
        section.borderStyle = "solid";
        project!.sectionRenderer.render(section);
      }
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setSectionBorderDashed",
    defaultKey: "",
    icon: SquareDashed,
    when: whenHasSelectedSections,
    onPress: (project) => {
      const selectedSections = project!.stageManager.getSelectedEntities().filter((it) => it instanceof Section);
      for (const section of selectedSections) {
        section.borderStyle = "dashed";
        project!.sectionRenderer.render(section);
      }
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setSectionBorderNone",
    defaultKey: "",
    icon: Slash,
    when: whenHasSelectedSections,
    onPress: (project) => {
      const selectedSections = project!.stageManager.getSelectedEntities().filter((it) => it instanceof Section);
      for (const section of selectedSections) {
        section.borderStyle = "none";
        project!.sectionRenderer.render(section);
      }
      project!.historyManager.recordStep();
    },
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
  {
    id: "editUrlNodeLink",
    defaultKey: "",
    icon: Link,
    when: whenHasSelectedUrlNodes,
    onPress: (project) => {
      if (!project) return;
      const urlNodes = project.stageManager
        .getSelectedEntities()
        .filter((entity): entity is UrlNode => entity instanceof UrlNode);
      if (urlNodes.length === 0) return;
      EditUrlNodeLinkWindow.open(urlNodes[0].url, (newUrl) => {
        urlNodes[0].url = newUrl;
      });
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
  {
    id: "exportCurrentViewPrgDeepLink",
    defaultKey: "",
    icon: View,
    when: whenHasProject,
    onPress: async (project) => {
      await exportDeepLinkWithDialog(project, "当前视野位置的 prg 协议链接如下。", (activeProject) =>
        createCurrentViewDeepLink(activeProject),
      );
    },
  },
  {
    id: "exportSelectedEntityPrgDeepLink",
    defaultKey: "",
    icon: MousePointer2,
    when: whenHasProject,
    onPress: async (project) => {
      if (!project) {
        toast.warning("请先打开工程文件");
        return;
      }
      const selectedEntities = project.stageManager.getSelectedEntities();
      if (selectedEntities.length === 0) {
        toast.warning("请先选中一个物体");
        return;
      }
      if (selectedEntities.length > 1) {
        toast.warning("只能导出一个选中物体的链接，请只选中一个物体");
        return;
      }
      await exportDeepLinkWithDialog(project, "当前选中物体的 prg 协议链接如下。", (activeProject) =>
        createSelectedEntityDeepLink(activeProject),
      );
    },
  },
  {
    id: "exportCurrentFilePrgDeepLink",
    defaultKey: "",
    icon: Link,
    when: whenHasProject,
    onPress: async (project) => {
      await exportDeepLinkWithDialog(project, "当前文件的 prg 协议链接如下。", (activeProject) =>
        createCurrentFileDeepLink(activeProject),
      );
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
  {
    id: "changeTagBySelected",
    defaultKey: "t a g g",
    icon: Tag,
    when: whenHasSelectedStageObjectsOrSelectionRectangle,
    onPress: (project) => project!.tagManager.changeTagBySelected(),
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
  {
    id: "expandSelectEntityWithEdge",
    defaultKey: "e C-w",
    icon: Link,
    when: whenKeyboardOnlyOpenWithSelectedStageObjects,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelectWithEdge(false, false);
    },
  },
  {
    id: "expandSelectEntityReversedWithEdge",
    defaultKey: "e C-S-w",
    icon: Link,
    when: whenKeyboardOnlyOpenWithSelectedStageObjects,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelectWithEdge(false, true);
    },
  },
  {
    id: "expandSelectEntityKeepLastSelectedWithEdge",
    defaultKey: "e C-A-w",
    icon: Link,
    when: whenKeyboardOnlyOpenWithSelectedStageObjects,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelectWithEdge(true, false);
    },
  },
  {
    id: "expandSelectEntityReversedKeepLastSelectedWithEdge",
    defaultKey: "e C-A-S-w",
    icon: Link,
    when: whenKeyboardOnlyOpenWithSelectedStageObjects,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelectWithEdge(true, true);
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
    id: "generateNodeTreeWithDeepModeEditEdge",
    defaultKey: "e tab",
    icon: GitBranch,
    when: whenKeyboardOnlyOpen,
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.keyboardOnlyTreeEngine.onDeepGenerateNode("", true, true);
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
    id: "treeGraphAdjustSelectedAsRootToLeft",
    defaultKey: "t 4 4",
    icon: MoveLeft,
    when: whenHasSelectedConnectableEntities,
    onPress: (project) => {
      project!.keyboardOnlyTreeEngine.adjustSelectedSubtreesDirection(Direction.Left);
      project!.historyManager.recordStep();
    },
  },
  {
    id: "treeGraphAdjustSelectedAsRootToRight",
    defaultKey: "t 6 6",
    icon: MoveRight,
    when: whenHasSelectedConnectableEntities,
    onPress: (project) => {
      project!.keyboardOnlyTreeEngine.adjustSelectedSubtreesDirection(Direction.Right);
      project!.historyManager.recordStep();
    },
  },
  {
    id: "treeGraphAdjustSelectedAsRootToUp",
    defaultKey: "t 8 8",
    icon: MoveUp,
    when: whenHasSelectedConnectableEntities,
    onPress: (project) => {
      project!.keyboardOnlyTreeEngine.adjustSelectedSubtreesDirection(Direction.Up);
      project!.historyManager.recordStep();
    },
  },
  {
    id: "treeGraphAdjustSelectedAsRootToDown",
    defaultKey: "t 2 2",
    icon: MoveDown,
    when: whenHasSelectedConnectableEntities,
    onPress: (project) => {
      project!.keyboardOnlyTreeEngine.adjustSelectedSubtreesDirection(Direction.Down);
      project!.historyManager.recordStep();
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
    defaultKey: "d t r s",
    icon: LayoutPanelTop,
    when: whenHasSelectedTextNodes,
    onPress: (project) => {
      const textNodes = project!.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
      for (const textNode of textNodes) {
        project!.sectionPackManager.textNodeTreeToSection(textNode);
      }
    },
  },
  {
    id: "textNodeTreeToSectionNoDeep",
    defaultKey: "t r s",
    icon: LayoutPanelTop,
    when: whenHasSelectedTextNodes,
    onPress: (project) => {
      const textNodes = project!.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
      for (const textNode of textNodes) {
        project!.sectionPackManager.textNodeTreeToSectionNoDeep(textNode);
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
  {
    id: "compressImage",
    defaultKey: "i S-c",
    icon: Shrink,
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
        imageNode.compressImage();
      }
      project!.historyManager.recordStep();
      toast.success(selectedImageNodes.length === 1 ? "已压缩图片" : `已压缩 ${selectedImageNodes.length} 张图片`);
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
    when: whenHasSelectedEdgeWithLineType,
    onPress: (project) => {
      project!.stageManager.setSelectedEdgeLineType("dashed");
      project!.historyManager.recordStep();
    },
  },
  /*------- 将选中的边切换为实线 -------*/
  {
    id: "setSelectedEdgesToSolid",
    defaultKey: "S-t e s",
    icon: Link,
    when: whenHasSelectedEdgeWithLineType,
    onPress: (project) => {
      project!.stageManager.setSelectedEdgeLineType("solid");
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setSelectedEdgesToDouble",
    defaultKey: "S-t e b",
    icon: Equal,
    when: whenHasSelectedEdgeWithLineType,
    onPress: (project) => {
      project!.stageManager.setSelectedEdgeLineType("double");
      project!.historyManager.recordStep();
    },
  },
  /*------- 箭头类型 -------*/
  {
    id: "setSelectedEdgesArrowDefault",
    defaultKey: "S-a e d",
    icon: ArrowRight,
    when: whenHasSelectedEdgeWithLineType,
    onPress: (project) => {
      project!.stageManager.setSelectedEdgeArrowType("default");
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setSelectedEdgesArrowHollowTriangle",
    defaultKey: "S-a e h t",
    icon: Triangle,
    when: whenHasSelectedEdgeWithLineType,
    onPress: (project) => {
      project!.stageManager.setSelectedEdgeArrowType("hollow-triangle");
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setSelectedEdgesArrowFilledTriangle",
    defaultKey: "S-a e f t",
    icon: Play,
    when: whenHasSelectedEdgeWithLineType,
    onPress: (project) => {
      project!.stageManager.setSelectedEdgeArrowType("filled-triangle");
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setSelectedEdgesArrowHollowDiamond",
    defaultKey: "S-a e h d",
    icon: Diamond,
    when: whenHasSelectedEdgeWithLineType,
    onPress: (project) => {
      project!.stageManager.setSelectedEdgeArrowType("hollow-diamond");
      project!.historyManager.recordStep();
    },
  },
  {
    id: "setSelectedEdgesArrowFilledDiamond",
    defaultKey: "S-a e f d",
    icon: Gem,
    when: whenHasSelectedEdgeWithLineType,
    onPress: (project) => {
      project!.stageManager.setSelectedEdgeArrowType("filled-diamond");
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
    id: "switchEdgeToArcEdge",
    defaultKey: "e t a",
    icon: Radius,
    when: whenHasSelectedLineEdges,
    onPress: (project) => {
      project!.stageManager.switchEdgeToArcEdge();
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
    icon: Sparkles,
    when: whenHasSelectedTextNodes,
    onPress: (project) => {
      if (project) TextNodeSmartTools.generateTreeBySelectedTextNodeTextWithAI(project);
    },
  },
  {
    id: "generateNetBySelectedTextNodeTextWithAI",
    defaultKey: "g e n n t",
    icon: Sparkles,
    when: whenHasSelectedTextNodes,
    onPress: (project) => {
      if (project) TextNodeSmartTools.generateNetBySelectedTextNodeTextWithAI(project);
    },
  },
  {
    id: "generateSummaryBySelectedTextNodeTextWithAI",
    defaultKey: "g e n s t",
    icon: Sparkles,
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

  {
    id: "newPrgAtCurrentDir",
    defaultKey: "",
    icon: FilePlus,
    when: whenHasNonDraftProject,
    onPress: (project) => createFileAtCurrentProjectDir(project, async () => {}),
  },
  {
    id: "upgradeOldJson",
    defaultKey: "",
    icon: FileInput,
    when: whenAlways,
    onPress: () => onUpgradeOldJson(),
  },
  {
    id: "saveAs",
    defaultKey: "",
    icon: FileDown,
    when: whenHasProject,
    onPress: async (project) => {
      const p = project!;
      const path = await save({
        title: i18next.t("file.saveAs", { ns: "globalMenu" }),
        filters: [{ name: "Project Graph", extensions: ["prg"] }],
      });
      if (!path) return;
      p.uri = URI.file(path);
      await RecentFileManager.addRecentFileByUri(p.uri);
      await p.save();
    },
  },
  {
    id: "manualBackup",
    defaultKey: "",
    icon: Archive,
    when: whenHasProject,
    onPress: async (project) => {
      await project!.autoSaveBackup.manualBackup();
    },
  },
  {
    id: "openCustomBackupFolder",
    defaultKey: "",
    icon: FolderClock,
    when: whenAlways,
    onPress: async () => {
      if (Settings.autoBackupCustomPath && Settings.autoBackupCustomPath.trim()) {
        await shellOpen(Settings.autoBackupCustomPath.trim());
      } else {
        toast.error("未设置自定义备份路径");
      }
    },
  },
  {
    id: "openDefaultBackupFolder",
    defaultKey: "",
    icon: FolderClock,
    when: whenAlways,
    onPress: async () => {
      shellOpen(await appCacheDir());
    },
  },
  {
    id: "importFromFolder",
    defaultKey: "",
    icon: FolderTree,
    when: whenHasProject,
    onPress: async (project) => {
      const path = await open({ title: "打开文件夹", directory: true, multiple: false, filters: [] });
      if (!path) return;
      project!.generateFromFolder.generateFromFolder(path);
    },
  },
  {
    id: "importTreeFromFolder",
    defaultKey: "",
    icon: FolderTree,
    when: whenHasProject,
    onPress: async (project) => {
      const path = await open({ title: "打开文件夹", directory: true, multiple: false, filters: [] });
      if (!path || typeof path !== "string") return;
      project!.generateFromFolder.generateTreeFromFolder(path);
    },
  },
  {
    id: "generateKeyboardLayout",
    defaultKey: "",
    icon: Keyboard,
    when: whenHasProject,
    onPress: async (project) => {
      await generateKeyboardLayout(project!);
      toast.success("键盘布局图已生成");
    },
  },
  {
    id: "importImages",
    defaultKey: "",
    icon: Images,
    when: whenHasProject,
    onPress: async (project) => {
      const pathList = await open({
        title: "打开文件",
        directory: false,
        multiple: true,
        filters: [{ name: "图片文件", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });
      if (!pathList) return;
      const mimeMap: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
      };
      for (const path of pathList) {
        const ext = path.split(".").pop()?.toLowerCase() ?? "png";
        DragFileIntoStageEngine.handleDropImage(project!, path, mimeMap[ext] ?? "image/png");
      }
    },
  },
  {
    id: "importSvg",
    defaultKey: "",
    icon: Images,
    when: whenHasProject,
    onPress: async (project) => {
      const pathList = await open({
        title: "打开文件",
        directory: false,
        multiple: true,
        filters: [{ name: "*", extensions: ["svg"] }],
      });
      if (!pathList) return;
      for (const path of pathList) DragFileIntoStageEngine.handleDropSvg(project!, path);
    },
  },
  {
    id: "importTextFile",
    defaultKey: "",
    icon: FileText,
    when: whenHasProject,
    onPress: () => {
      openTextImportWindow();
    },
  },
  {
    id: "exportSvgAll",
    defaultKey: "",
    icon: FileDigit,
    when: whenHasProject,
    onPress: async (project) => {
      const path = await save({
        title: i18next.t("file.exportAsSVG", { ns: "globalMenu" }),
        filters: [{ name: "Scalable Vector Graphics", extensions: ["svg"] }],
      });
      if (!path) return;
      await project!.stageExportSvg.exportStageToSVGFile(path);
    },
  },
  {
    id: "exportSvgSelected",
    defaultKey: "",
    icon: MousePointer2,
    when: whenHasProject,
    onPress: async (project) => {
      const path = await save({
        title: i18next.t("file.exportAsSVG", { ns: "globalMenu" }),
        filters: [{ name: "Scalable Vector Graphics", extensions: ["svg"] }],
      });
      if (!path) return;
      await project!.stageExportSvg.exportSelectedToSVGFile(path);
    },
  },
  {
    id: "exportPngLegacy",
    defaultKey: "",
    icon: FileImage,
    when: whenAlways,
    onPress: () => {
      ExportPngWindow.open();
    },
  },
  {
    id: "exportPngSelected",
    defaultKey: "",
    icon: MousePointer2,
    when: whenHasProject,
    onPress: (project) => {
      if (project!.stageManager.getSelectedEntities().length === 0) {
        toast.warning("没有选中任何内容");
        return;
      }
      NewExportPngWindow.open("selected");
    },
  },
  {
    id: "openAttachmentsWindow",
    defaultKey: "",
    icon: Paperclip,
    when: whenHasProject,
    onPress: () => {
      AttachmentsWindow.open();
    },
  },
  {
    id: "openReferencesWindow",
    defaultKey: "",
    icon: Link,
    when: whenHasNonDraftProject,
    onPress: (project) => {
      if (!project || project.isDraft) return;
      ReferencesWindow.open(project.uri);
    },
  },
  {
    id: "openColorManagerWindow",
    defaultKey: "",
    icon: Palette,
    when: whenHasProject,
    onPress: () => {
      ColorManagerPanel.open();
    },
  },
  {
    id: "openBackgroundManagerWindow",
    defaultKey: "",
    icon: Images,
    when: whenHasProject,
    onPress: () => {
      BackgroundManagerWindow.open();
    },
  },
  // ===================== 仅作为 sub 菜单的「触发器」存在 =====================
  {
    id: "recentFilesSub",
    defaultKey: "",
    icon: FileClock,
    when: whenAlways,
    onPress: () => {},
  },
  {
    id: "importSub",
    defaultKey: "",
    icon: FileInput,
    when: whenAlways,
    onPress: () => {},
  },
  {
    id: "exportSub",
    defaultKey: "",
    icon: FileOutput,
    when: whenHasProject,
    onPress: () => {},
  },
  {
    id: "exportSvgSub",
    defaultKey: "",
    icon: FileCode,
    when: whenAlways,
    onPress: () => {},
  },
  {
    id: "exportPngSub",
    defaultKey: "",
    icon: FileImage,
    when: whenAlways,
    onPress: () => {},
  },
  {
    id: "exportPlainTextSub",
    defaultKey: "",
    icon: TextQuote,
    when: whenAlways,
    onPress: () => {},
  },
  // ===================== 顶层 topMenu 触发器 =====================
  {
    id: "file",
    defaultKey: "",
    icon: FileIcon,
    when: whenAlways,
    onPress: () => {},
  },
  {
    id: "view",
    defaultKey: "",
    icon: View,
    when: whenHasProject,
    onPress: () => {},
  },
  {
    id: "actions",
    defaultKey: "",
    icon: Axe,
    when: whenHasProject,
    onPress: () => {},
  },
  {
    id: "settings",
    defaultKey: "",
    icon: SettingsIcon,
    when: whenAlways,
    onPress: () => {},
  },
  {
    id: "ai",
    defaultKey: "",
    icon: Bot,
    when: whenHasProject,
    onPress: () => {},
  },
  {
    id: "window",
    defaultKey: "",
    icon: AppWindow,
    when: whenAlways,
    onPress: () => {},
  },
  {
    id: "about",
    defaultKey: "",
    icon: CircleAlert,
    when: whenAlways,
    onPress: () => {},
  },
  {
    id: "unstable",
    defaultKey: "",
    icon: MessageCircleWarning,
    when: whenAlways,
    onPress: () => {},
  },
  // ===================== View 菜单 =====================
  {
    id: "resetViewAll",
    defaultKey: "",
    icon: View,
    when: whenHasProject,
    onPress: (project) => {
      project!.camera.reset();
    },
  },
  {
    id: "moveViewToOrigin",
    defaultKey: "",
    icon: MapPin,
    when: whenHasProject,
    onPress: (project) => {
      project!.camera.resetLocationToZero();
    },
  },
  {
    id: "stopDrifting",
    defaultKey: "",
    icon: OctagonX,
    when: whenHasProject,
    onPress: (project) => {
      project!.camera.clearMoveCommander();
      project!.camera.speed = Vector.getZero();
    },
  },
  {
    id: "focusRandomEntity",
    defaultKey: "",
    icon: Dices,
    when: whenHasProject,
    onPress: (project) => {
      const entities = project!.stage.filter((e) => e instanceof Entity);
      if (entities.length === 0) return;
      const randomEntity = entities[Math.floor(Math.random() * entities.length)];
      project!.stageManager.clearSelectAll();
      randomEntity.isSelected = true;
      project!.camera.resetBySelected();
    },
  },
  // ===================== Actions 菜单 =====================
  {
    id: "updateReferences",
    defaultKey: "",
    icon: RefreshCcwDot,
    when: whenHasProject,
    onPress: (project) => {
      project!.stageManager.updateReferences();
    },
  },
  {
    id: "releaseKeys",
    defaultKey: "",
    icon: Keyboard,
    when: whenHasProject,
    onPress: (project) => {
      project!.controller.pressingKeySet.clear();
    },
  },
  {
    id: "generateNodeTreeByText",
    defaultKey: "",
    icon: Network,
    when: whenHasProject,
    onPress: () => {
      GenerateNodeTree.open();
    },
  },
  {
    id: "generateNodeTreeByMarkdown",
    defaultKey: "",
    icon: Network,
    when: whenHasProject,
    onPress: () => {
      GenerateNodeTreeByMarkdown.open();
    },
  },
  {
    id: "generateNodeGraphByText",
    defaultKey: "",
    icon: GitCompareArrows,
    when: whenHasProject,
    onPress: () => {
      GenerateNodeGraph.open();
    },
  },
  {
    id: "generateNodeMermaidByText",
    defaultKey: "",
    icon: GitCompareArrows,
    when: whenHasProject,
    onPress: () => {
      GenerateNodeMermaid.open();
    },
  },
  {
    id: "openLogicNodePanel",
    defaultKey: "",
    icon: Workflow,
    when: whenHasProject,
    onPress: () => {
      LogicNodePanel.open();
    },
  },
  {
    id: "openLogicNodeDocs",
    defaultKey: "",
    icon: BookOpen,
    when: whenAlways,
    onPress: async () => {
      const result = await Dialog.confirm("详见官网文档：自动计算引擎 部分 即将打开网页，是否继续");
      if (result) {
        shellOpen("https://graphif.dev/docs/app/features/feature/compute-engine");
      }
    },
  },
  {
    id: "clearStage",
    defaultKey: "",
    icon: Radiation,
    when: whenHasProject,
    onPress: async (project) => {
      if (
        await Dialog.confirm(
          i18next.t("actions.confirmClearStage", { ns: "globalMenu" }),
          i18next.t("actions.irreversible", { ns: "globalMenu" }),
          { destructive: true },
        )
      ) {
        project!.stage = [];
      }
    },
  },
  // ===================== Actions 菜单 — 生成子菜单触发器 =====================
  {
    id: "generateSub",
    defaultKey: "",
    icon: Sparkles,
    when: whenHasProject,
    onPress: () => {},
  },
  // ===================== Settings 菜单 =====================
  {
    id: "openAppearanceSettings",
    defaultKey: "",
    icon: Palette,
    when: whenAlways,
    onPress: () => SettingsWindow.open("customization"),
  },
  {
    id: "resetAllKeyBinds",
    defaultKey: "",
    icon: Radiation,
    when: whenAlways,
    onPress: async () => {
      if (
        await Dialog.confirm("确认重置全部快捷键", "此操作会将所有快捷键恢复为默认值，无法撤销。\n\n是否继续？", {
          destructive: true,
        })
      ) {
        try {
          await KeyBindsUI.resetAllKeyBinds();
          toast.success("所有快捷键已重置为默认值");
        } catch (error) {
          toast.error("重置快捷键失败");
          console.error("重置快捷键失败:", error);
        }
      }
    },
  },
  {
    id: "openConfigFolder",
    defaultKey: "",
    icon: FolderCog,
    when: whenAlways,
    onPress: async () => {
      shellOpen(await join(await dataDir(), "liren.project-graph"));
    },
  },
  {
    id: "openCacheFolder",
    defaultKey: "",
    icon: FolderOpen,
    when: whenAlways,
    onPress: async () => {
      const path = await join(await appCacheDir());
      if (!(await exists(path))) {
        await mkdir(path, { recursive: true });
      }
      shellOpen(path);
    },
  },
  // ===================== Settings — 自动化操作子菜单 =====================
  {
    id: "autoSettingsSub",
    defaultKey: "",
    icon: Rabbit,
    when: whenAlways,
    onPress: () => {},
  },
  // ===================== Extensions 菜单 =====================
  {
    id: "openExtensionsWindow",
    defaultKey: "",
    icon: Blocks,
    when: whenAlways,
    onPress: () => SettingsWindow.open("extensions"),
  },
  {
    id: "openPluginMarket",
    defaultKey: "",
    icon: Store,
    when: whenAlways,
    onPress: () => {
      shellOpen(`${import.meta.env.LR_API_BASE_URL}/ext/marketplace`);
    },
  },
  {
    id: "openExtensionFolder",
    defaultKey: "",
    icon: FolderOpen,
    when: whenAlways,
    onPress: async () => {
      const extensionsDir = await join(await appDataDir(), "extensions");
      if (!(await exists(extensionsDir))) {
        await mkdir(extensionsDir, { recursive: true });
      }
      shellOpen(extensionsDir);
    },
  },
  // ===================== AI 菜单 =====================
  {
    id: "openAIPanel",
    defaultKey: "",
    icon: ExternalLink,
    when: whenHasProject,
    onPress: () => {
      AIWindow.open();
    },
  },
  {
    id: "openAITools",
    defaultKey: "",
    icon: Wrench,
    when: whenHasProject,
    onPress: () => {
      AIToolsWindow.open();
    },
  },
  // ===================== Window 菜单 =====================
  {
    id: "toggleBackgroundHorizontalLines",
    defaultKey: "",
    icon: Rows4,
    when: whenHasProject,
    onPress: () => {
      Settings.showBackgroundHorizontalLines = !Settings.showBackgroundHorizontalLines;
    },
  },
  {
    id: "toggleBackgroundVerticalLines",
    defaultKey: "",
    icon: Columns4,
    when: whenHasProject,
    onPress: () => {
      Settings.showBackgroundVerticalLines = !Settings.showBackgroundVerticalLines;
    },
  },
  {
    id: "toggleBackgroundDots",
    defaultKey: "",
    icon: Grip,
    when: whenHasProject,
    onPress: () => {
      Settings.showBackgroundDots = !Settings.showBackgroundDots;
    },
  },
  {
    id: "toggleBackgroundCartesian",
    defaultKey: "",
    icon: Move3d,
    when: whenHasProject,
    onPress: () => {
      Settings.showBackgroundCartesian = !Settings.showBackgroundCartesian;
    },
  },
  {
    id: "toggleStealthModeReverseMask",
    defaultKey: "",
    icon: CircleDot,
    when: whenHasProject,
    onPress: () => {
      Settings.stealthModeReverseMask = !Settings.stealthModeReverseMask;
    },
  },
  {
    id: "stealthModeScopeRadiusIncrease",
    defaultKey: "",
    icon: CirclePlus,
    when: whenHasProject,
    onPress: () => {
      Settings.stealthModeScopeRadius = Math.max(10, Math.min(500, Settings.stealthModeScopeRadius + 50));
    },
  },
  {
    id: "stealthModeScopeRadiusDecrease",
    defaultKey: "",
    icon: CircleMinus,
    when: whenHasProject,
    onPress: () => {
      Settings.stealthModeScopeRadius = Math.max(10, Math.min(500, Settings.stealthModeScopeRadius - 50));
    },
  },
  // ===================== Window — 背景设置子菜单触发器 =====================
  {
    id: "backgroundGridSub",
    defaultKey: "",
    icon: LayoutGrid,
    when: whenHasProject,
    onPress: () => {},
  },
  // ===================== Window — 窗口透明度子菜单触发器 =====================
  {
    id: "windowOpacitySub",
    defaultKey: "",
    icon: PictureInPicture2,
    when: whenHasProject,
    onPress: () => {},
  },
  // ===================== Window — 狙击镜子菜单触发器 =====================
  {
    id: "stealthModeSub",
    defaultKey: "",
    icon: CircleDot,
    when: whenHasProject,
    onPress: () => {},
  },
  // ===================== About 菜单 =====================
  {
    id: "openAboutWindow",
    defaultKey: "",
    icon: MessageCircleWarning,
    when: whenAlways,
    onPress: () => SettingsWindow.open("about"),
  },
  {
    id: "openOfficialDocs",
    defaultKey: "",
    icon: Globe,
    when: whenAlways,
    onPress: () => {
      shellOpen("https://project-graph.top/docs/app/features/feature/camera");
    },
  },
  // ===================== About — 图文教程子菜单触发器 =====================
  {
    id: "tutorialSub",
    defaultKey: "",
    icon: BookOpenText,
    when: whenAlways,
    onPress: () => {},
  },
  // ===================== About — 视频教程子菜单触发器 =====================
  {
    id: "videoTutorialSub",
    defaultKey: "",
    icon: Tv,
    when: whenAlways,
    onPress: () => {},
  },
  // ===================== Settings — AI自动计算配置子菜单触发器 =====================
  {
    id: "autoSettingsSub",
    defaultKey: "",
    icon: Wand2,
    when: whenAlways,
    onPress: () => {},
  },
  // ===================== Settings — 自动命名模板 =====================
  {
    id: "autoNamerTemplate",
    defaultKey: "",
    icon: Type,
    when: whenAlways,
    onPress: () => {
      Dialog.input("设置自动命名", "填入参数写法详见设置页面", {
        defaultValue: Settings.autoNamerTemplate,
      }).then((result) => {
        if (!result) return;
        Settings.autoNamerTemplate = result;
      });
    },
  },
  {
    id: "autoNamerSectionTemplate",
    defaultKey: "",
    icon: Type,
    when: whenAlways,
    onPress: () => {
      Dialog.input("设置自动框命名", "填入参数写法详见设置页面", {
        defaultValue: Settings.autoNamerSectionTemplate,
      }).then((result) => {
        if (!result) return;
        Settings.autoNamerSectionTemplate = result;
      });
    },
  },
  {
    id: "autoNamerDetailsTemplate",
    defaultKey: "",
    icon: Type,
    when: whenAlways,
    onPress: () => {
      Dialog.input("设置创建节点时自动填入的详细信息", "留空则不填入任何内容", {
        defaultValue: Settings.autoNamerDetailsTemplate,
      }).then((result) => {
        if (result === undefined) return;
        Settings.autoNamerDetailsTemplate = result;
      });
    },
  },
  {
    id: "autoNamerTreeNodeTemplate",
    defaultKey: "",
    icon: Type,
    when: whenAlways,
    onPress: () => {
      Dialog.input("设置Tab键生长节点时的初始名称", "填入参数写法详见设置页面", {
        defaultValue: Settings.autoNamerTreeNodeTemplate,
      }).then((result) => {
        if (!result) return;
        Settings.autoNamerTreeNodeTemplate = result;
      });
    },
  },
  // ===================== Settings — 自动填色 =====================
  {
    id: "autoFillNodeColorToggle",
    defaultKey: "",
    icon: Palette,
    when: whenAlways,
    onPress: () => {
      Dialog.confirm("确认改变？", Settings.autoFillNodeColorEnable ? "即将关闭" : "即将开启").then(() => {
        Settings.autoFillNodeColorEnable = !Settings.autoFillNodeColorEnable;
      });
    },
  },
  {
    id: "autoFillNodeColorSet",
    defaultKey: "",
    icon: Palette,
    when: whenAlways,
    onPress: () => {
      Dialog.input(
        "设置自动上色",
        "填入颜色数组式代码[r, g, b, a]，其中a为不透明度，取之范围在0-1之间，例如纯红色[255, 0, 0, 1]",
        {
          defaultValue: JSON.stringify(new Color(...Settings.autoFillNodeColor).toArray()),
        },
      ).then((result) => {
        if (!result) return;
        const colorArray: [number, number, number, number] = JSON.parse(result);
        if (colorArray.length !== 4) {
          toast.error("颜色数组长度必须为4");
          return;
        }
        const color = new Color(...colorArray);
        if (color.a < 0 || color.a > 1) {
          toast.error("颜色不透明度必须在0-1之间");
          return;
        }
        Settings.autoFillNodeColor = colorArray;
      });
    },
  },
  // ===================== About — 图文教程下载 =====================
  {
    id: "downloadTutorialMain",
    defaultKey: "",
    icon: FileBadge,
    when: whenAlways,
    onPress: () => {
      toast.promise(
        async () => {
          const u8a = await AssetsRepository.fetchFile("tutorials/tutorial-main-3.2.prg");
          const dir = await tempDir();
          const path = await join(dir, `tutorial-${crypto.randomUUID()}.prg`);
          await writeFile(path, u8a);
          await onOpenFile(URI.file(path), "功能说明书");
        },
        {
          loading: "正在下载功能说明书文件",
          success: "下载完成",
          error: "下载失败，请检查网络或联系开发者",
        },
      );
    },
  },
  {
    id: "downloadTutorialShortcutKeys",
    defaultKey: "",
    icon: FileSpreadsheet,
    when: whenAlways,
    onPress: () => {
      toast.promise(
        async () => {
          const u8a = await AssetsRepository.fetchFile("tutorials/tutorial-shortcut-keys-3.2.prg");
          const dir = await tempDir();
          const path = await join(dir, `tutorial-${crypto.randomUUID()}.prg`);
          await writeFile(path, u8a);
          await onOpenFile(URI.file(path), "快捷键文档");
        },
        {
          loading: "正在下载快捷键文档",
          success: "下载完成",
          error: "下载失败，请检查网络或联系开发者",
        },
      );
    },
  },
  {
    id: "downloadTutorialLogicNodes",
    defaultKey: "",
    icon: FileBox,
    when: whenAlways,
    onPress: () => {
      toast.promise(
        async () => {
          const u8a = await AssetsRepository.fetchFile("tutorials/tutorial-logic-nodes-2.9.prg");
          const dir = await tempDir();
          const path = await join(dir, `tutorial-${crypto.randomUUID()}.prg`);
          await writeFile(path, u8a);
          await onOpenFile(URI.file(path), "逻辑节点文档");
        },
        {
          loading: "正在下载逻辑节点文档",
          success: "下载完成",
          error: "下载失败，请检查网络或联系开发者",
        },
      );
    },
  },
  // ===================== About — 升级指南 =====================
  {
    id: "showUpgradeGuide",
    defaultKey: "",
    icon: Dumbbell,
    when: whenAlways,
    onPress: () => {
      Dialog.confirm(
        "2.0使用提示",
        [
          "1. 底部工具栏移动至右键菜单（在空白处右键，因为在节点上右键是点击式连线）",
          "2. 文件从json升级为了prg文件，能够内置图片了，打开旧版本json文件时会自动转为prg文件",
          "3. 快捷键与秘籍键合并了",
          "4. 节点详细信息不是markdown格式了",
          "5. 标签面板暂时关闭了，后续会用更高级的功能代替",
        ].join("\n"),
      );
    },
  },
  // ===================== About — 视频教程（Bilibili） =====================
  {
    id: "watchBilibiliVideo2",
    defaultKey: "",
    icon: Tv,
    when: whenAlways,
    onPress: () => {
      shellOpen("https://www.bilibili.com/video/BV1y2xdzUEXa");
    },
  },
  {
    id: "watchBilibiliVideo1_6Basic",
    defaultKey: "",
    icon: Tv,
    when: whenAlways,
    onPress: () => {
      shellOpen("https://www.bilibili.com/video/BV19B5WzyEiZ");
    },
  },
  {
    id: "watchBilibiliVideo1_6Advanced",
    defaultKey: "",
    icon: Tv,
    when: whenAlways,
    onPress: () => {
      shellOpen("https://www.bilibili.com/video/BV1MM5WzKESm");
    },
  },
  {
    id: "watchBilibiliVideo1_0",
    defaultKey: "",
    icon: Tv,
    when: whenAlways,
    onPress: () => {
      shellOpen("https://www.bilibili.com/video/BV1W4k7YqEgU");
    },
  },
  {
    id: "watchBilibiliVideoPyQtUpdated",
    defaultKey: "",
    icon: Tv,
    when: whenAlways,
    onPress: () => {
      shellOpen("https://www.bilibili.com/video/BV1VVpEe4EXG");
    },
  },
  {
    id: "watchBilibiliVideoPyQt",
    defaultKey: "",
    icon: Tv,
    when: whenAlways,
    onPress: () => {
      shellOpen("https://www.bilibili.com/video/BV1hmHKeDE9D");
    },
  },
  // ===================== Unstable — 开发者工具 =====================
  {
    id: "devOpenTestWindow",
    defaultKey: "",
    icon: FlaskConical,
    when: whenAlways,
    onPress: () => {
      TestWindow.open();
    },
  },
  {
    id: "devSerializeTest",
    defaultKey: "",
    icon: Code,
    when: whenHasProject,
    onPress: (project) => {
      const tn1 = new TextNode(project!, { text: "tn1" });
      const tn2 = new TextNode(project!, { text: "tn2" });
      const le = LineEdge.fromTwoEntity(project!, tn1, tn2);
      console.log(serialize([tn1, tn2, le]));
    },
  },
  {
    id: "devTriggerBug",
    defaultKey: "",
    icon: Bug,
    when: whenHasProject,
    onPress: (project) => {
      project!.renderer.tick = function () {
        throw new Error("test");
      };
    },
  },
  {
    id: "devReload",
    defaultKey: "",
    icon: RefreshCw,
    when: whenAlways,
    onPress: () => {
      window.location.reload();
    },
  },
  {
    id: "devGetDeviceId",
    defaultKey: "",
    icon: Fingerprint,
    when: whenAlways,
    onPress: async () => {
      toast(await getDeviceId());
    },
  },
  {
    id: "devFeatureFlags",
    defaultKey: "",
    icon: Flag,
    when: whenAlways,
    onPress: () => {},
  },
  {
    id: "devNodeDetails",
    defaultKey: "",
    icon: LayoutPanelTop,
    when: whenAlways,
    onPress: () => {
      NodeDetailsWindow.open();
    },
  },
  {
    id: "devCreateTestTab",
    defaultKey: "",
    icon: FilePlus,
    when: whenAlways,
    onPress: async () => {
      const testTab = new TestTab();
      await testTab.init();
      store.set(tabsAtom, [...store.get(tabsAtom), testTab]);
      store.set(activeTabAtom, testTab);
    },
  },
  {
    id: "devLogStage",
    defaultKey: "",
    icon: Terminal,
    when: whenHasProject,
    onPress: (project) => {
      console.log(project!.stage);
    },
  },
  {
    id: "devLogSelectedDetails",
    defaultKey: "",
    icon: FileText,
    when: whenHasProject,
    onPress: (project) => {
      const selectedEntity = project!.stageManager.getSelectedEntities();
      for (const entity of selectedEntity) {
        console.log(entity.details);
      }
    },
  },
  {
    id: "devCreateExampleExtension",
    defaultKey: "",
    icon: Package,
    when: whenAlways,
    onPress: async () => {
      const metadata = {
        version: "2.0.0",
        extension: {
          id: "com.example.hello-world",
          name: "示例扩展",
          description: "这是一个用于演示的示例扩展包",
          version: "1.0.0",
          author: "Author <author@example.com>",
        },
      };
      const encoder = new Encoder();
      const uwriter = new Uint8ArrayWriter();
      const writer = new ZipWriter(uwriter);
      await writer.add("metadata.msgpack", new Uint8ArrayReader(encoder.encode(metadata)));
      await writer.add(
        "extension.js",
        new Uint8ArrayReader(new TextEncoder().encode("console.log('Hello from extension!');")),
      );
      await writer.add(
        "README.md",
        new Uint8ArrayReader(
          new TextEncoder().encode("# 示例扩展\n\n这是一个示例扩展，用于演示 .prg 文件的扩展识别功能。"),
        ),
      );
      await writer.close();
      const content = await uwriter.getData();
      const path = await save({
        filters: [{ name: "Project Graph Extension", extensions: ["prg"] }],
        defaultPath: "example-extension.prg",
      });
      if (path) {
        await writeFile(path, content);
        toast.success("示例扩展已创建");
      }
    },
  },
  {
    id: "devOutputMarkdown",
    defaultKey: "",
    icon: FileText,
    when: whenHasProject,
    onPress: (project) => {
      const selectedEntity = project!.stageManager.getSelectedEntities();
      for (const entity of selectedEntity) {
        console.log(entity.detailsManager.getBeSearchingText());
      }
    },
  },
  {
    id: "devOnboarding",
    defaultKey: "",
    icon: BookOpen,
    when: whenAlways,
    onPress: () => {
      OnboardingWindow.open();
    },
  },
  {
    id: "devCreate100Nodes",
    defaultKey: "",
    icon: Plus,
    when: whenHasProject,
    onPress: (project) => {
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 200 - 100;
        const y = Math.random() * 200 - 100;
        const node = new TextNode(project!, { text: `节点${i + 1}` });
        node.moveTo(new Vector(x, y));
        project!.stage.push(node);
      }
    },
  },
  {
    id: "toggleCommandPalette",
    defaultKey: "C-k",
    icon: Command,
    when: whenAlways,
    onPress: () => {
      store.set(commandPaletteVisibleAtom, !store.get(commandPaletteVisibleAtom));
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
