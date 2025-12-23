import { Dialog } from "@/components/ui/dialog";
import { Project, service } from "@/core/Project";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { RectangleSlideEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleSlideEffect";
import { ViewFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ViewFlashEffect";
import { ViewOutlineFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ViewOutlineFlashEffect";
import { Settings } from "@/core/service/Settings";
import { Themes } from "@/core/service/Themes";
import { PenStrokeMethods } from "@/core/stage/stageManager/basicMethods/PenStrokeMethods";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { activeProjectAtom, projectsAtom, store } from "@/state";
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
import { toast } from "sonner";
import { RecentFileManager } from "../../dataFileService/RecentFileManager";
import { ColorSmartTools } from "../../dataManageService/colorSmartTools";
import { ConnectNodeSmartTools } from "../../dataManageService/connectNodeSmartTools";
import { TextNodeSmartTools } from "../../dataManageService/textNodeSmartTools";
import { createFileAtCurrentProjectDir, onNewDraft, onOpenFile } from "../../GlobalMenu";

interface KeyBindItem {
  id: string;
  defaultKey: string;
  onPress: (project?: Project) => void;
  onRelease?: (project?: Project) => void;
  // 全局快捷键
  isGlobal?: boolean;
  // UI级别快捷键
  isUI?: boolean;
}

export const allKeyBinds: KeyBindItem[] = [
  {
    id: "test",
    defaultKey: "C-A-S-t",
    onPress: () =>
      Dialog.buttons("测试快捷键", "您按下了自定义的测试快捷键，这一功能是测试开发所用，可在设置中更改触发方式", [
        { id: "close", label: "关闭" },
      ]),
    isUI: true,
  },

  /*------- 基础编辑 -------*/
  {
    id: "undo",
    defaultKey: "C-z",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.historyManager.undo();
    },
  },
  {
    id: "redo",
    defaultKey: "C-y",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.historyManager.redo();
    },
  },
  {
    id: "reload",
    defaultKey: "C-f5",
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
    isUI: true,
  },

  /*------- 课堂/专注模式 -------*/
  {
    id: "checkoutClassroomMode",
    defaultKey: "F5",
    onPress: async () => {
      if (Settings.isClassroomMode) {
        toast.info("已经退出专注模式，点击一下更新状态");
      } else {
        toast.info("进入专注模式，点击一下更新状态");
      }
      Settings.isClassroomMode = !Settings.isClassroomMode;
    },
    isUI: true,
  },

  /*------- 相机/视图 -------*/
  {
    id: "resetView",
    defaultKey: "F",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.saveCameraState();
      project!.camera.resetBySelected();
    },
  },
  {
    id: "restoreCameraState",
    defaultKey: "S-F",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.restoreCameraState();
    },
  },
  {
    id: "resetCameraScale",
    defaultKey: "C-A-r",
    onPress: (project) => project!.camera.resetScale(),
  },
  {
    id: "CameraScaleZoomIn",
    defaultKey: "[",
    onPress: (project) => {
      // if (!project!.keyboardOnlyEngine.isOpenning()) return;
      // project!.camera.zoomInByKeyboardPress();
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
    onPress: (project) => {
      // if (!project!.keyboardOnlyEngine.isOpenning()) return;
      // project!.camera.zoomOutByKeyboardPress();
      project!.camera.isStartZoomOut = true;
      project!.camera.addScaleFollowMouseLocationTime(1);
    },
    onRelease: (project) => {
      project!.camera.isStartZoomOut = false;
      project!.camera.addScaleFollowMouseLocationTime(5);
    },
  },

  /*------- 相机分页移动（Win） -------*/
  // 注意：实际运行时会根据 isMac 注册其一，这里两份都列出方便查阅
  {
    id: "CameraPageMoveUp",
    defaultKey: isMac ? "S-i" : "pageup",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.pageMove(Direction.Up);
    },
  },
  {
    id: "CameraPageMoveDown",
    defaultKey: isMac ? "S-k" : "pagedown",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.pageMove(Direction.Down);
    },
  },
  {
    id: "CameraPageMoveLeft",
    defaultKey: isMac ? "S-j" : "home",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.pageMove(Direction.Left);
    },
  },
  {
    id: "CameraPageMoveRight",
    defaultKey: isMac ? "S-l" : "end",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.pageMove(Direction.Right);
    },
  },

  /*------- 章节/折叠/打包 -------*/
  {
    id: "folderSection",
    defaultKey: "C-t",
    onPress: (project) => project!.stageManager.sectionSwitchCollapse(),
  },
  {
    id: "packEntityToSection",
    defaultKey: "C-g",
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

  /*------- 边反向 -------*/
  {
    id: "reverseEdges",
    defaultKey: "C-t",
    onPress: (project) => project!.stageManager.reverseSelectedEdges(),
  },
  {
    id: "reverseSelectedNodeEdge",
    defaultKey: "C-t",
    onPress: (project) => project!.stageManager.reverseSelectedNodeEdge(),
  },

  /*------- 创建无向边 -------*/
  {
    id: "createUndirectedEdgeFromEntities",
    defaultKey: "S-g",
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.stageManager.deleteSelectedStageObjects();
    },
  },

  /*------- 新建文本节点（多种方式） -------*/
  {
    id: "createTextNodeFromCameraLocation",
    defaultKey: "insert",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.clearMoveCommander();
      project!.camera.speed = Vector.getZero();
      project!.controllerUtils.addTextNodeByLocation(project!.camera.location, true);
    },
  },
  {
    id: "createTextNodeFromMouseLocation",
    defaultKey: "S-insert",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.clearMoveCommander();
      project!.camera.speed = Vector.getZero();
      project!.controllerUtils.addTextNodeByLocation(
        project!.renderer.transformView2World(MouseLocation.vector()),
        true,
      );
    },
  },
  {
    id: "createTextNodeFromSelectedTop",
    defaultKey: "A-arrowup",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Up, true);
    },
  },
  {
    id: "createTextNodeFromSelectedRight",
    defaultKey: "A-arrowright",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Right, true);
    },
  },
  {
    id: "createTextNodeFromSelectedLeft",
    defaultKey: "A-arrowleft",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Left, true);
    },
  },
  {
    id: "createTextNodeFromSelectedDown",
    defaultKey: "A-arrowdown",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Down, true);
    },
  },

  /*------- 选择（单选/多选） -------*/
  {
    id: "selectUp",
    defaultKey: "arrowup",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectUp();
    },
  },
  {
    id: "selectDown",
    defaultKey: "arrowdown",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectDown();
    },
  },
  {
    id: "selectLeft",
    defaultKey: "arrowleft",
    onPress: (project) => project!.selectChangeEngine.selectLeft(),
  },
  {
    id: "selectRight",
    defaultKey: "arrowright",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectRight();
    },
  },
  {
    id: "selectAdditionalUp",
    defaultKey: "S-arrowup",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectUp(true);
    },
  },
  {
    id: "selectAdditionalDown",
    defaultKey: "S-arrowdown",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectDown(true);
    },
  },
  {
    id: "selectAdditionalLeft",
    defaultKey: "S-arrowleft",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectLeft(true);
    },
  },
  {
    id: "selectAdditionalRight",
    defaultKey: "S-arrowright",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.selectRight(true);
    },
  },

  /*------- 移动选中实体 -------*/
  {
    id: "moveUpSelectedEntities",
    defaultKey: "C-arrowup",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.y -= 100;
        project!.effects.addEffect(
          RectangleSlideEffect.verticalSlide(
            rect,
            newRect,
            project!.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      project!.entityMoveManager.moveSelectedEntities(new Vector(0, -100));
    },
  },
  {
    id: "moveDownSelectedEntities",
    defaultKey: "C-arrowdown",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.y += 100;
        project!.effects.addEffect(
          RectangleSlideEffect.verticalSlide(
            rect,
            newRect,
            project!.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      project!.entityMoveManager.moveSelectedEntities(new Vector(0, 100));
    },
  },
  {
    id: "moveLeftSelectedEntities",
    defaultKey: "C-arrowleft",
    onPress: (project) => {
      const entities = project!.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.x -= 100;
        project!.effects.addEffect(
          RectangleSlideEffect.horizontalSlide(
            rect,
            newRect,
            project!.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      project!.entityMoveManager.moveSelectedEntities(new Vector(-100, 0));
    },
  },
  {
    id: "moveRightSelectedEntities",
    defaultKey: "C-arrowright",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.x += 100;
        project!.effects.addEffect(
          RectangleSlideEffect.horizontalSlide(
            rect,
            newRect,
            project!.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      project!.entityMoveManager.moveSelectedEntities(new Vector(100, 0));
    },
  },

  /*------- 跳跃移动 -------*/
  {
    id: "jumpMoveUpSelectedEntities",
    defaultKey: "C-A-arrowup",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(0, -100));
    },
  },
  {
    id: "jumpMoveDownSelectedEntities",
    defaultKey: "C-A-arrowdown",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(0, 100));
    },
  },
  {
    id: "jumpMoveLeftSelectedEntities",
    defaultKey: "C-A-arrowleft",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(-100, 0));
    },
  },
  {
    id: "jumpMoveRightSelectedEntities",
    defaultKey: "C-A-arrowright",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(100, 0));
    },
  },

  /*------- 编辑/详情 -------*/
  {
    id: "editEntityDetails",
    defaultKey: "C-enter",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controllerUtils.editNodeDetailsByKeyboard();
    },
  },

  /*------- 面板/窗口 -------*/
  {
    id: "openColorPanel",
    defaultKey: "F6",
    onPress: () => ColorWindow.open(),
    isUI: true,
  },
  {
    id: "switchDebugShow",
    defaultKey: "F3",
    onPress: async () => {
      Settings.showDebug = !Settings.showDebug;
    },
    isUI: true,
  },
  {
    id: "selectAll",
    defaultKey: "C-a",
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
    onPress: (project) => project!.sectionPackManager.textNodeToSection(),
  },
  {
    id: "unpackEntityFromSection",
    defaultKey: "C-S-g",
    onPress: (project) => project!.sectionPackManager.unpackSelectedSections(),
  },

  /*------- 隐私模式 -------*/
  {
    id: "checkoutProtectPrivacy",
    defaultKey: "C-2",
    onPress: async () => {
      Settings.protectingPrivacy = !Settings.protectingPrivacy;
    },
    isUI: true,
  },

  /*------- 搜索/外部打开 -------*/
  {
    id: "searchText",
    defaultKey: "C-f",
    onPress: () => FindWindow.open(),
  },
  {
    id: "openTextNodeByContentExternal",
    defaultKey: "C-e",
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
    onPress: () => SettingsWindow.open("settings"),
    isUI: true,
  },
  {
    id: "clickAppMenuRecentFileButton",
    defaultKey: "S-#",
    onPress: () => RecentFilesWindow.open(),
    isUI: true,
  },
  {
    id: "clickTagPanelButton",
    defaultKey: "S-@",
    onPress: () => TagWindow.open(),
    isUI: true,
  },
  {
    id: "switchActiveProject",
    defaultKey: "C-tab",
    onPress: () => {
      //

      const projects = store.get(projectsAtom);
      if (projects.length <= 1) {
        toast.error("至少打开两个项目才能切换项目");
        return;
      }
      const activeProject = store.get(activeProjectAtom);
      if (!activeProject) {
        toast.error("当前没有活动项目，无法切换项目");
        return;
      }
      let activeProjectIndex = -1;
      for (const p of projects) {
        activeProjectIndex++;
        if (p === activeProject) {
          break;
        }
      }
      const nextActiveProjectIndex = (activeProjectIndex + 1) % projects.length;
      store.set(activeProjectAtom, projects[nextActiveProjectIndex]);
    },
    isUI: true,
  },
  {
    id: "switchActiveProjectReversed",
    defaultKey: "C-S-tab",
    onPress: () => {
      const projects = store.get(projectsAtom);
      if (projects.length <= 1) {
        toast.error("至少打开两个项目才能切换项目");
        return;
      }
      const activeProject = store.get(activeProjectAtom);
      if (!activeProject) {
        toast.error("当前没有活动项目，无法切换项目");
        return;
      }
      let activeProjectIndex = -1;
      for (const p of projects) {
        activeProjectIndex++;
        if (p === activeProject) {
          break;
        }
      }
      const mod = (n: number, m: number) => {
        return ((n % m) + m) % m;
      };
      const nextActiveProjectIndex = mod(activeProjectIndex - 1, projects.length);
      store.set(activeProjectAtom, projects[nextActiveProjectIndex]);
    },
    isUI: true,
  },

  /*------- 文件操作 -------*/
  {
    id: "saveFile",
    defaultKey: "C-s",
    onPress: () => {
      const activeProject = store.get(activeProjectAtom);
      if (activeProject) {
        activeProject.camera.clearMoveCommander();
        activeProject.save();
        if (Settings.clearHistoryWhenManualSave) {
          activeProject.historyManager.clearHistory();
        }
        RecentFileManager.addRecentFileByUri(activeProject.uri);
      }
    },
    isUI: true,
  },
  {
    id: "newDraft",
    defaultKey: "C-n",
    onPress: () => onNewDraft(),
    isUI: true,
  },
  {
    id: "newFileAtCurrentProjectDir",
    defaultKey: "C-S-n",
    onPress: () => {
      //
      const activeProject = store.get(activeProjectAtom);
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
    isUI: true,
  },
  {
    id: "openFile",
    defaultKey: "C-o",
    onPress: () => onOpenFile(),
    isUI: true,
  },

  /*------- 窗口透明度 -------*/
  {
    id: "checkoutWindowOpacityMode",
    defaultKey: "C-0",
    onPress: async () => {
      Settings.windowBackgroundAlpha = Settings.windowBackgroundAlpha === 0 ? 1 : 0;
    },
    isUI: true,
  },
  {
    id: "windowOpacityAlphaIncrease",
    defaultKey: "C-A-S-+",
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.copyEngine.copy();
    },
  },
  {
    id: "paste",
    defaultKey: "C-v",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.copyEngine.paste();
    },
  },
  {
    id: "pasteWithOriginLocation",
    defaultKey: "C-S-v",
    onPress: () => toast("todo"),
  },

  /*------- 鼠标模式切换 -------*/
  {
    id: "checkoutLeftMouseToSelectAndMove",
    defaultKey: "v v v",
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      Settings.mouseLeftMode = "selectAndMove";
      toast("当前鼠标左键已经切换为框选/移动模式");
    },
  },
  {
    id: "checkoutLeftMouseToDrawing",
    defaultKey: "b b b",
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      Settings.mouseLeftMode = "draw";
      toast("当前鼠标左键已经切换为画笔模式");
    },
  },
  {
    id: "checkoutLeftMouseToConnectAndCutting",
    defaultKey: "c c c",
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
    onPress: (project) => {
      // 现在不生效了，不过也没啥用
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      PenStrokeMethods.selectEntityByPenStroke();
    },
  },
  {
    id: "expandSelectEntity",
    defaultKey: "C-w",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelect(false, false);
    },
  },
  {
    id: "expandSelectEntityReversed",
    defaultKey: "C-S-w",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelect(false, true);
    },
  },
  {
    id: "expandSelectEntityKeepLastSelected",
    defaultKey: "C-A-w",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelect(true, false);
    },
  },
  {
    id: "expandSelectEntityReversedKeepLastSelected",
    defaultKey: "C-A-S-w",
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.selectChangeEngine.expandSelect(true, true);
    },
  },

  /*------- 树/图 生成 -------*/
  {
    id: "generateNodeTreeWithDeepMode",
    defaultKey: "tab",
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.keyboardOnlyTreeEngine.onDeepGenerateNode();
    },
  },
  {
    id: "generateNodeTreeWithBroadMode",
    defaultKey: "\\",
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.keyboardOnlyTreeEngine.onBroadGenerateNode();
    },
  },
  {
    id: "generateNodeGraph",
    defaultKey: "`",
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.clearMoveCommander();
      project!.camera.speed = Vector.getZero();
    },
  },
  {
    id: "masterBrakeCheckout",
    defaultKey: "space",
    onPress: async (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.camera.clearMoveCommander();
      project!.camera.speed = Vector.getZero();
      Settings.allowMoveCameraByWSAD = !Settings.allowMoveCameraByWSAD;
    },
  },

  /*------- 树形调整 -------*/
  {
    id: "treeGraphAdjust",
    defaultKey: "A-S-f",
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
  /*------- DAG调整 -------*/
  {
    id: "dagGraphAdjust",
    defaultKey: "A-S-d",
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
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ConnectableEntity);
      project?.keyboardOnlyTreeEngine.changePreDirection(entities, "up");
    },
  },
  {
    id: "setNodeTreeDirectionDown",
    defaultKey: "S S",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ConnectableEntity);
      project?.keyboardOnlyTreeEngine.changePreDirection(entities, "down");
    },
  },
  {
    id: "setNodeTreeDirectionLeft",
    defaultKey: "A A",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ConnectableEntity);
      project?.keyboardOnlyTreeEngine.changePreDirection(entities, "left");
    },
  },
  {
    id: "setNodeTreeDirectionRight",
    defaultKey: "D D",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      const entities = project!.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ConnectableEntity);
      project?.keyboardOnlyTreeEngine.changePreDirection(entities, "right");
    },
  },

  /*------- 彩蛋/秘籍键 -------*/
  {
    // TODO 不触发了
    id: "screenFlashEffect",
    defaultKey: "arrowup arrowup arrowdown arrowdown arrowleft arrowright arrowleft arrowright b a",
    onPress: (project) => project!.effects.addEffect(ViewFlashEffect.SaveFile()),
  },
  {
    id: "alignNodesToInteger",
    defaultKey: "i n t j",
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
    onPress: (project) => TextNodeSmartTools.okk(project!),
  },
  {
    id: "toggleCheckErrorOnTextNodes",
    defaultKey: "e r r",
    onPress: (project) => TextNodeSmartTools.err(project!),
  },
  {
    id: "reverseImageColors",
    defaultKey: "r r r",
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
    onPress: () => {
      toast.info("切换到暗黑主题");
      Settings.theme = "dark";
      Themes.applyThemeById("dark");
    },
    isUI: true,
  },
  {
    id: "switchToLightTheme",
    defaultKey: "w h i t e e",
    onPress: () => {
      toast.info("切换到明亮主题");
      Settings.theme = "light";
      Themes.applyThemeById("light");
    },
    isUI: true,
  },
  {
    id: "switchToParkTheme",
    defaultKey: "p a r k k",
    onPress: () => {
      toast.info("切换到公园主题");
      Settings.theme = "park";
      Themes.applyThemeById("park");
    },
    isUI: true,
  },
  {
    id: "switchToMacaronTheme",
    defaultKey: "m k l m k l",
    onPress: () => {
      toast.info("切换到马卡龙主题");
      Settings.theme = "macaron";
      Themes.applyThemeById("macaron");
    },
    isUI: true,
  },
  {
    id: "switchToMorandiTheme",
    defaultKey: "m l d m l d",
    onPress: () => {
      toast.info("切换到莫兰迪主题");
      Settings.theme = "morandi";
      Themes.applyThemeById("morandi");
    },
    isUI: true,
  },

  /*------- 画笔透明度 -------*/
  {
    id: "increasePenAlpha",
    defaultKey: "p s a + +",
    onPress: async (project) => project!.controller.penStrokeDrawing.changeCurrentStrokeColorAlpha(0.1),
  },
  {
    id: "decreasePenAlpha",
    defaultKey: "p s a - -",
    onPress: async (project) => project!.controller.penStrokeDrawing.changeCurrentStrokeColorAlpha(-0.1),
  },

  /*------- 对齐 -------*/
  {
    id: "alignTop",
    defaultKey: "8 8",
    onPress: (project) => {
      project!.layoutManager.alignTop();
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Up, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Down);
    },
  },
  {
    id: "alignBottom",
    defaultKey: "2 2",
    onPress: (project) => {
      project!.layoutManager.alignBottom();
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Down, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Up);
    },
  },
  {
    id: "alignLeft",
    defaultKey: "4 4",
    onPress: (project) => {
      project!.layoutManager.alignLeft();
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Left, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Right);
    },
  },
  {
    id: "alignRight",
    defaultKey: "6 6",
    onPress: (project) => {
      project!.layoutManager.alignRight();
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Right, true);
      project!.stageManager.changeSelectedEdgeConnectLocation(Direction.Left);
    },
  },
  {
    id: "alignHorizontalSpaceBetween",
    defaultKey: "4 6 4 6",
    onPress: (project) => project!.layoutManager.alignHorizontalSpaceBetween(),
  },
  {
    id: "alignVerticalSpaceBetween",
    defaultKey: "8 2 8 2",
    onPress: (project) => project!.layoutManager.alignVerticalSpaceBetween(),
  },
  {
    id: "alignCenterHorizontal",
    defaultKey: "5 4 6",
    onPress: (project) => project!.layoutManager.alignCenterHorizontal(),
  },
  {
    id: "alignCenterVertical",
    defaultKey: "5 8 2",
    onPress: (project) => project!.layoutManager.alignCenterVertical(),
  },
  {
    id: "alignLeftToRightNoSpace",
    defaultKey: "4 5 6",
    onPress: (project) => project!.layoutManager.alignLeftToRightNoSpace(),
  },
  {
    id: "alignTopToBottomNoSpace",
    defaultKey: "8 5 2",
    onPress: (project) => project!.layoutManager.alignTopToBottomNoSpace(),
  },

  /*------- 连接 -------*/
  {
    id: "createConnectPointWhenDragConnecting",
    defaultKey: "1",
    onPress: (project) => {
      if (!project!.keyboardOnlyEngine.isOpenning()) return;
      project!.controller.nodeConnection.createConnectPointWhenConnect();
    },
  },
  {
    id: "connectAllSelectedEntities",
    defaultKey: "- - a l l",
    onPress: (project) => ConnectNodeSmartTools.connectAll(project!),
  },
  {
    id: "connectLeftToRight",
    defaultKey: "- - r i g h t",
    onPress: (project) => ConnectNodeSmartTools.connectRight(project!),
  },
  {
    id: "connectTopToBottom",
    defaultKey: "- - d o w n",
    onPress: (project) => ConnectNodeSmartTools.connectDown(project!),
  },

  /*------- 选择所有可见边 -------*/
  {
    id: "selectAllEdges",
    defaultKey: "+ e d g e",
    onPress: (project) => {
      const selectedEdges = project!.stageManager.getAssociations();
      const viewRect = project!.renderer.getCoverWorldRectangle();
      for (const edge of selectedEdges) {
        if (project!.renderer.isOverView(viewRect, edge)) continue;
        edge.isSelected = true;
      }
    },
  },

  /*------- 快速着色 -------*/
  {
    id: "colorSelectedRed",
    defaultKey: "; r e d",
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
    onPress: (project) => ColorSmartTools.increaseBrightness(project!),
  },
  {
    id: "decreaseBrightness",
    defaultKey: "b ,",
    onPress: (project) => ColorSmartTools.decreaseBrightness(project!),
  },
  {
    id: "gradientColor",
    defaultKey: "; ,",
    onPress: (project) => ColorSmartTools.gradientColor(project!),
  },
  {
    id: "changeColorHueUp",
    defaultKey: "A-S-arrowup",
    onPress: (project) => ColorSmartTools.changeColorHueUp(project!),
  },
  {
    id: "changeColorHueDown",
    defaultKey: "A-S-arrowdown",
    onPress: (project) => ColorSmartTools.changeColorHueDown(project!),
  },
  {
    id: "changeColorHueMajorUp",
    defaultKey: "A-S-home",
    onPress: (project) => ColorSmartTools.changeColorHueMajorUp(project!),
  },
  {
    id: "changeColorHueMajorDown",
    defaultKey: "A-S-end",
    onPress: (project) => ColorSmartTools.changeColorHueMajorDown(project!),
  },

  /*------- 文本节点工具 -------*/
  {
    id: "toggleTextNodeSizeMode",
    defaultKey: "t t t",
    onPress: (project) => TextNodeSmartTools.ttt(project!),
  },
  {
    id: "splitTextNodes",
    defaultKey: "k e i",
    onPress: (project) => TextNodeSmartTools.kei(project!),
  },
  {
    id: "mergeTextNodes",
    defaultKey: "r u a",
    onPress: (project) => TextNodeSmartTools.rua(project!),
  },
  {
    id: "swapTextAndDetails",
    defaultKey: "e e e e e",
    onPress: (project) => TextNodeSmartTools.exchangeTextAndDetails(project!),
  },

  /*------- 潜行模式 -------*/
  {
    id: "switchStealthMode",
    defaultKey: "j a c k a l",
    onPress: () => {
      Settings.isStealthModeEnabled = !Settings.isStealthModeEnabled;
      toast(Settings.isStealthModeEnabled ? "已开启潜行模式" : "已关闭潜行模式");
    },
    isUI: true,
  },

  /*------- 拆分字符 -------*/
  {
    id: "removeFirstCharFromSelectedTextNodes",
    defaultKey: "C-backspace",
    onPress: (project) => TextNodeSmartTools.removeFirstCharFromSelectedTextNodes(project!),
  },
  {
    id: "removeLastCharFromSelectedTextNodes",
    defaultKey: "C-delete",
    onPress: (project) => TextNodeSmartTools.removeLastCharFromSelectedTextNodes(project!),
  },

  /*------- 交换两实体位置 -------*/
  {
    id: "swapTwoSelectedEntitiesPositions",
    defaultKey: "S-r",
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

  /*------- 节点相关 -------*/
  {
    id: "graftNodeToTree",
    defaultKey: "q e",
    onPress: (project) => {
      ConnectNodeSmartTools.insertNodeToTree(project!);
    },
  },
  {
    id: "removeNodeFromTree",
    defaultKey: "q r",
    onPress: (project) => {
      ConnectNodeSmartTools.removeNodeFromTree(project!);
    },
  },
];

/**
 * 快捷键注册函数
 * 现在所有非全局快捷键都由KeyBindsUI类在应用启动时统一注册
 * 这个东西现在没用了
 */
@service("keyBindsRegistrar")
export class KeyBindsRegistrar {
  constructor(private readonly project: Project) {}

  /**
   * 注册所有快捷键
   * 现在所有非全局快捷键都由KeyBindsUI类在应用启动时统一注册
   */
  async registerAllKeyBinds() {
    // 所有非全局快捷键都由KeyBindsUI类在应用启动时统一注册
    // 这里不再需要注册项目级快捷键
  }
}

export function getKeyBindTypeById(id: string): "global" | "ui" | "project" {
  for (const keyBind of allKeyBinds) {
    if (keyBind.id === id) {
      return keyBind.isGlobal ? "global" : keyBind.isUI ? "ui" : "project";
    }
  }
  return "project";
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
