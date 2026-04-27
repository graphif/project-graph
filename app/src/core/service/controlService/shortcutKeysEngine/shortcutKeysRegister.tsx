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
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { activeTabAtom, isWindowMaxsizedAtom, store, tabsAtom } from "@/state";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
// import ColorWindow from "@/sub/ColorWindow";
import FindWindow from "@/sub/FindWindow";
// import KeyboardRecentFilesWindow from "@/sub/KeyboardRecentFilesWindow";
import ColorWindow from "@/sub/ColorWindow";
import RecentFilesWindow from "@/sub/RecentFilesWindow";
import SettingsWindow from "@/sub/SettingsWindow";
import TagWindow from "@/sub/TagWindow";
import { Direction } from "@/types/directions";
import { openBrowserOrFile } from "@/utils/externalOpen";
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
  ArrowLeft,
  ArrowRight,
  ArrowUp,
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
  GitCompare,
  GraduationCap,
  History,
  Layers,
  Link,
  Lock,
  LucideProps,
  Maximize,
  Merge,
  Minimize,
  Moon,
  MousePointer,
  MoveHorizontal,
  Network,
  Package,
  Palette,
  PenTool,
  Plus,
  Redo,
  RefreshCw,
  Repeat,
  Save,
  Scissors,
  Search,
  Settings as SettingsIcon,
  Shrink,
  Split,
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

interface KeyBindItem {
  id: string;
  defaultKey: string;
  onPress: (project?: Project) => void;
  onRelease?: (project?: Project) => void;
  // 全局快捷键
  isGlobal?: boolean;
  // 是否是持续型快捷键
  isContinuous?: boolean;
  // 默认是否启用
  defaultEnabled?: boolean;
  icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
}

export const allKeyBinds: KeyBindItem[] = [
  {
    id: "test",
    defaultKey: "C-A-S-t",
    icon: FlaskConical,
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
    onPress: () => {
      if (!SubWindow.hasOpenWindows()) return;
      SubWindow.closeAll();
    },
  },
  {
    id: "toggleFullscreen",
    defaultKey: "C-F11",
    icon: Maximize,
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.historyManager.undo();
    },
  },
  {
    id: "redo",
    defaultKey: "C-y",
    icon: Redo,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.historyManager.redo();
    },
  },
  {
    id: "reload",
    defaultKey: "C-f5",
    icon: RefreshCw,
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.restoreCameraState();
    },
  },
  {
    id: "resetCameraScale",
    defaultKey: "C-A-r",
    icon: Aperture,
    onPress: (project) => project!.camera.resetScale(),
  },
  {
    id: "CameraScaleZoomIn",
    defaultKey: "[",
    icon: ZoomIn,
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.pageMove(Direction.Up);
    },
  },
  {
    id: "CameraPageMoveDown",
    defaultKey: isMac ? "S-k" : "pagedown",
    icon: ChevronsDown,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.pageMove(Direction.Down);
    },
  },
  {
    id: "CameraPageMoveLeft",
    defaultKey: isMac ? "S-j" : "home",
    icon: ChevronFirst,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.pageMove(Direction.Left);
    },
  },
  {
    id: "CameraPageMoveRight",
    defaultKey: isMac ? "S-l" : "end",
    icon: ChevronLast,
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
    onPress: (project) => project!.stageManager.sectionSwitchCollapse(),
  },
  {
    id: "packEntityToSection",
    defaultKey: "C-g",
    icon: Package,
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
    onPress: (project) => project!.stageManager.reverseSelectedEdges(),
  },
  {
    id: "reverseSelectedNodeEdge",
    defaultKey: "C-t",
    icon: GitCompare,
    onPress: (project) => project!.stageManager.reverseSelectedNodeEdge(),
  },

  /*------- 创建无向边 -------*/
  {
    id: "createUndirectedEdgeFromEntities",
    defaultKey: "S-g",
    icon: GitBranch,
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

  /*------- 删除 -------*/
  {
    id: "deleteSelectedStageObjects",
    defaultKey: isMac ? "backspace" : "delete",
    icon: Trash2,
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
    id: "createTextNodeFromSelectedTop",
    defaultKey: "A-arrowup",
    icon: ArrowUp,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Up, true);
    },
  },
  {
    id: "createTextNodeFromSelectedRight",
    defaultKey: "A-arrowright",
    icon: ArrowRight,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Right, true);
    },
  },
  {
    id: "createTextNodeFromSelectedLeft",
    defaultKey: "A-arrowleft",
    icon: ArrowLeft,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Left, true);
    },
  },
  {
    id: "createTextNodeFromSelectedDown",
    defaultKey: "A-arrowdown",
    icon: ArrowDown,
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectUp();
    },
  },
  {
    id: "selectDown",
    defaultKey: "arrowdown",
    icon: ArrowDown,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectDown();
    },
  },
  {
    id: "selectLeft",
    defaultKey: "arrowleft",
    icon: ArrowLeft,
    onPress: (project) => project!.selectChangeEngine.selectLeft(),
  },
  {
    id: "selectRight",
    defaultKey: "arrowright",
    icon: ArrowRight,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectRight();
    },
  },
  {
    id: "selectAdditionalUp",
    defaultKey: "S-arrowup",
    icon: ChevronsUp,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectUp(true);
    },
  },
  {
    id: "selectAdditionalDown",
    defaultKey: "S-arrowdown",
    icon: ChevronsDown,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectDown(true);
    },
  },
  {
    id: "selectAdditionalLeft",
    defaultKey: "S-arrowleft",
    icon: ChevronFirst,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectLeft(true);
    },
  },
  {
    id: "selectAdditionalRight",
    defaultKey: "S-arrowright",
    icon: ChevronLast,
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(0, -100));
    },
  },
  {
    id: "jumpMoveDownSelectedEntities",
    defaultKey: "C-A-arrowdown",
    icon: ChevronsDown,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(0, 100));
    },
  },
  {
    id: "jumpMoveLeftSelectedEntities",
    defaultKey: "C-A-arrowleft",
    icon: ChevronFirst,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(-100, 0));
    },
  },
  {
    id: "jumpMoveRightSelectedEntities",
    defaultKey: "C-A-arrowright",
    icon: ChevronLast,
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
    onPress: () => ColorWindow.open(),
  },
  {
    id: "switchDebugShow",
    defaultKey: "F3",
    icon: Wand2,
    onPress: async () => {
      Settings.showDebug = !Settings.showDebug;
    },
  },
  {
    id: "selectAll",
    defaultKey: "C-a",
    icon: MousePointer,
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
    onPress: (project) => project!.sectionPackManager.textNodeToSection(),
  },
  {
    id: "unpackEntityFromSection",
    defaultKey: "C-S-g",
    icon: Scissors,
    onPress: (project) => project!.sectionPackManager.unpackSelectedSections(),
  },

  /*------- 隐私模式 -------*/
  {
    id: "checkoutProtectPrivacy",
    defaultKey: "C-2",
    icon: EyeOff,
    onPress: async () => {
      Settings.protectingPrivacy = !Settings.protectingPrivacy;
    },
  },

  /*------- 搜索/外部打开 -------*/
  {
    id: "searchText",
    defaultKey: "C-f",
    icon: Search,
    onPress: () => FindWindow.open(),
  },
  {
    id: "openTextNodeByContentExternal",
    defaultKey: "C-e",
    icon: ExternalLink,
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
    onPress: () => SettingsWindow.open("settings"),
  },
  {
    id: "clickAppMenuRecentFileButton",
    defaultKey: "S-#",
    icon: History,
    onPress: () => RecentFilesWindow.open(),
  },
  {
    id: "clickTagPanelButton",
    defaultKey: "S-@",
    icon: Tag,
    onPress: () => TagWindow.open(),
  },
  {
    id: "switchActiveProject",
    defaultKey: "C-tab",
    icon: Layers,
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
    onPress: () => onNewDraft(),
  },
  {
    id: "newFileAtCurrentProjectDir",
    defaultKey: "C-S-n",
    icon: FolderPlus,
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
    onPress: () => onOpenFile(),
  },
  {
    id: "openCurrentProjectFileFolder",
    defaultKey: "C-S-l",
    icon: Folder,
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
    onPress: async () => {
      Settings.windowBackgroundAlpha = Settings.windowBackgroundAlpha === 0 ? 1 : 0;
    },
  },
  {
    id: "windowOpacityAlphaIncrease",
    defaultKey: "C-A-S-+",
    icon: Sun,
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.copyEngine.copy();
    },
  },
  {
    id: "paste",
    defaultKey: "C-v",
    icon: Clipboard,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.copyEngine.paste();
    },
  },
  {
    id: "pasteWithOriginLocation",
    defaultKey: "C-S-v",
    icon: Clipboard,
    onPress: () => toast("todo"),
  },

  /*------- 鼠标模式切换 -------*/
  {
    id: "checkoutLeftMouseToSelectAndMove",
    defaultKey: "v v v",
    icon: MousePointer,
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelect(false, false);
    },
  },
  {
    id: "expandSelectEntityReversed",
    defaultKey: "C-S-w",
    icon: Shrink,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelect(false, true);
    },
  },
  {
    id: "expandSelectEntityKeepLastSelected",
    defaultKey: "C-A-w",
    icon: Expand,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelect(true, false);
    },
  },
  {
    id: "expandSelectEntityReversedKeepLastSelected",
    defaultKey: "C-A-S-w",
    icon: Shrink,
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
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.keyboardOnlyTreeEngine.onDeepGenerateNode();
    },
  },
  {
    id: "generateNodeTreeWithBroadMode",
    defaultKey: "\\",
    icon: GitBranch,
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.keyboardOnlyTreeEngine.onBroadGenerateNode();
    },
  },
  {
    id: "generateNodeGraph",
    defaultKey: "`",
    icon: Network,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      if (project!.keyboardOnlyGraphEngine.isCreating()) {
        project!.keyboardOnlyGraphEngine.createFinished();
      } else {
        if (project!.keyboardOnlyGraphEngine.isEnableVirtualCreate()) {
          project!.keyboardOnlyGraphEngine.createStart();
        }
      }
    },
  },

  /*------- 手刹/刹车 -------*/
  // TODO: 这俩有点问题
  {
    id: "masterBrakeControl",
    defaultKey: "pause",
    icon: CircleSlash,
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
  /*------- DAG调整 -------*/
  {
    id: "dagGraphAdjust",
    defaultKey: "A-S-d",
    icon: Network,
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
    id: "gravityLayout",
    defaultKey: "g",
    icon: Sun,
    onPress: (project) => {
      project?.autoLayout.setGravityLayoutStart();
    },
    onRelease: (project) => {
      project?.autoLayout.setGravityLayoutEnd();
    },
  },
  {
    id: "setNodeTreeDirectionUp",
    defaultKey: "W W",
    icon: ArrowUp,
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
    onPress: (project) => project!.effects.addEffect(ViewFlashEffect.SaveFile(project!)),
  },
  {
    id: "alignNodesToInteger",
    defaultKey: "i n t j",
    icon: AlignLeft,
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
    onPress: (project) => TextNodeSmartTools.okk(project!),
  },
  {
    id: "toggleCheckErrorOnTextNodes",
    defaultKey: "e r r",
    icon: CircleSlash,
    onPress: (project) => TextNodeSmartTools.err(project!),
  },
  {
    id: "reverseImageColors",
    defaultKey: "r r r",
    icon: Zap,
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

  /*------- 主题切换 -------*/
  {
    id: "switchToDarkTheme",
    defaultKey: "b l a c k k",
    icon: Moon,
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
    onPress: async (project) => project!.controller.penStrokeDrawing.changeCurrentStrokeColorAlpha(0.1),
  },
  {
    id: "decreasePenAlpha",
    defaultKey: "p s a - -",
    icon: Moon,
    onPress: async (project) => project!.controller.penStrokeDrawing.changeCurrentStrokeColorAlpha(-0.1),
  },

  /*------- 对齐 -------*/
  {
    id: "alignTop",
    defaultKey: "8 8",
    icon: AlignStartHorizontal,
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
    onPress: (project) => project!.layoutManager.alignHorizontalSpaceBetween(),
  },
  {
    id: "alignVerticalSpaceBetween",
    defaultKey: "8 2 8 2",
    icon: AlignVerticalSpaceBetween,
    onPress: (project) => project!.layoutManager.alignVerticalSpaceBetween(),
  },
  {
    id: "alignCenterHorizontal",
    defaultKey: "5 4 6",
    icon: AlignCenterHorizontal,
    onPress: (project) => project!.layoutManager.alignCenterHorizontal(),
  },
  {
    id: "alignCenterVertical",
    defaultKey: "5 8 2",
    icon: AlignCenterVertical,
    onPress: (project) => project!.layoutManager.alignCenterVertical(),
  },
  {
    id: "alignLeftToRightNoSpace",
    defaultKey: "4 5 6",
    icon: AlignHorizontalJustifyStart,
    onPress: (project) => project!.layoutManager.alignLeftToRightNoSpace(),
  },
  {
    id: "alignTopToBottomNoSpace",
    defaultKey: "8 5 2",
    icon: AlignVerticalJustifyStart,
    onPress: (project) => project!.layoutManager.alignTopToBottomNoSpace(),
  },
  {
    id: "adjustSelectedTextNodeWidthMin",
    defaultKey: "1 3 2",
    icon: ChevronsRightLeft,
    onPress: (project) => project!.layoutManager.adjustSelectedTextNodeWidth("minWidth"),
  },
  {
    id: "adjustSelectedTextNodeWidthAverage",
    defaultKey: "4 6 5",
    icon: MoveHorizontal,
    onPress: (project) => project!.layoutManager.adjustSelectedTextNodeWidth("average"),
  },
  {
    id: "adjustSelectedTextNodeWidthMax",
    defaultKey: "7 9 8",
    icon: Code,
    onPress: (project) => project!.layoutManager.adjustSelectedTextNodeWidth("maxWidth"),
  },

  /*------- 连接 -------*/
  {
    id: "createConnectPointWhenDragConnecting",
    defaultKey: "1",
    icon: Plus,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controller.nodeConnection.createConnectPointWhenConnect();
    },
  },
  {
    id: "connectAllSelectedEntities",
    defaultKey: "- - a l l",
    icon: Link,
    onPress: (project) => ConnectNodeSmartTools.connectAll(project!),
  },
  {
    id: "connectLeftToRight",
    defaultKey: "- - r i g h t",
    icon: Link,
    onPress: (project) => ConnectNodeSmartTools.connectRight(project!),
  },
  {
    id: "connectTopToBottom",
    defaultKey: "- - d o w n",
    icon: Link,
    onPress: (project) => ConnectNodeSmartTools.connectDown(project!),
  },

  /*------- 选择所有可见边 -------*/
  {
    id: "selectAllEdges",
    defaultKey: "+ e d g e",
    icon: MousePointer,
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

  /*------- 快速着色 -------*/
  {
    id: "colorSelectedRed",
    defaultKey: "; r e d",
    icon: Palette,
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
    id: "increaseBrightness",
    defaultKey: "b .",
    icon: Sun,
    onPress: (project) => ColorSmartTools.increaseBrightness(project!),
  },
  {
    id: "decreaseBrightness",
    defaultKey: "b ,",
    icon: Moon,
    onPress: (project) => ColorSmartTools.decreaseBrightness(project!),
  },
  {
    id: "gradientColor",
    defaultKey: "; ,",
    icon: Palette,
    onPress: (project) => ColorSmartTools.gradientColor(project!),
  },
  {
    id: "changeColorHueUp",
    defaultKey: "A-S-arrowup",
    icon: Sun,
    onPress: (project) => ColorSmartTools.changeColorHueUp(project!),
  },
  {
    id: "changeColorHueDown",
    defaultKey: "A-S-arrowdown",
    icon: Moon,
    onPress: (project) => ColorSmartTools.changeColorHueDown(project!),
  },
  {
    id: "changeColorHueMajorUp",
    defaultKey: "A-S-home",
    icon: Sun,
    onPress: (project) => ColorSmartTools.changeColorHueMajorUp(project!),
  },
  {
    id: "changeColorHueMajorDown",
    defaultKey: "A-S-end",
    icon: Moon,
    onPress: (project) => ColorSmartTools.changeColorHueMajorDown(project!),
  },

  /*------- 文本节点工具 -------*/
  {
    id: "toggleTextNodeSizeMode",
    defaultKey: "t t t",
    icon: Type,
    onPress: (project) => TextNodeSmartTools.ttt(project!),
  },
  {
    id: "splitTextNodes",
    defaultKey: "k e i",
    icon: Split,
    onPress: (project) => TextNodeSmartTools.kei(project!),
  },
  {
    id: "mergeTextNodes",
    defaultKey: "r u a",
    icon: Merge,
    onPress: (project) => TextNodeSmartTools.rua(project!),
  },
  {
    id: "swapTextAndDetails",
    defaultKey: "e e e e e",
    icon: Repeat,
    onPress: (project) => TextNodeSmartTools.exchangeTextAndDetails(project!),
  },
  {
    id: "createTwinTextNode",
    defaultKey: "S-y",
    icon: GitBranch,
    onPress: (project) => {
      const selectedTextNodes = project!.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof TextNode) as TextNode[];
      for (const textNode of selectedTextNodes) {
        project!.syncAssociationManager.createTwinTextNode(textNode);
      }
    },
  },

  /*------- 潜行模式 -------*/
  {
    id: "switchStealthMode",
    defaultKey: "j a c k a l",
    icon: Ghost,
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
    onPress: (project) => TextNodeSmartTools.removeFirstCharFromSelectedTextNodes(project!),
  },
  {
    id: "removeLastCharFromSelectedTextNodes",
    defaultKey: "C-delete",
    icon: Scissors,
    onPress: (project) => TextNodeSmartTools.removeLastCharFromSelectedTextNodes(project!),
  },

  /*------- 交换两实体位置 -------*/
  {
    id: "swapTwoSelectedEntitiesPositions",
    defaultKey: "S-r",
    icon: Repeat,
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const selectedTextNodes = project!.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof TextNode) as TextNode[];
      if (selectedTextNodes.length === 0) return;
      project!.historyManager.recordStep();
      for (const node of selectedTextNodes) {
        node.decreaseFontSize(TextNodeSmartTools.getAnchorRateForTextNode(project!, node));
      }
    },
  },
  {
    id: "increaseFontSize",
    defaultKey: "C-=",
    icon: Expand,
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const selectedTextNodes = project!.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof TextNode) as TextNode[];
      if (selectedTextNodes.length === 0) return;
      project!.historyManager.recordStep();
      for (const node of selectedTextNodes) {
        node.increaseFontSize(TextNodeSmartTools.getAnchorRateForTextNode(project!, node));
      }
    },
  },

  /*------- 节点相关 -------*/
  {
    id: "graftNodeToTree",
    defaultKey: "q e",
    icon: GitBranch,
    onPress: (project) => {
      ConnectNodeSmartTools.insertNodeToTree(project!);
    },
  },
  {
    id: "removeNodeFromTree",
    defaultKey: "q r",
    icon: Scissors,
    onPress: (project) => {
      ConnectNodeSmartTools.removeNodeFromTree(project!);
    },
  },
  {
    id: "selectAtCrosshair",
    defaultKey: "q q",
    icon: Focus,
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
