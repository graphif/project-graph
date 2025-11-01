import { Dialog } from "@/components/ui/dialog";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { Settings } from "@/core/service/Settings";
import { Themes } from "@/core/service/Themes";
import { Entity } from "@/core/sprites/abstract/Entity";
import { TextNode } from "@/core/sprites/TextNode";
import { PenStrokeMethods } from "@/core/stage/stageManager/basicMethods/PenStrokeMethods";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { activeProjectAtom, store } from "@/state";
// import ColorWindow from "@/sub/ColorWindow";
import FindWindow from "@/sub/FindWindow";
// import KeyboardRecentFilesWindow from "@/sub/KeyboardRecentFilesWindow";
import { Project } from "@/core/Project";
import ColorWindow from "@/sub/ColorWindow";
import CommandPaletteWindow from "@/sub/CommandPaletteWindow";
import RecentFilesWindow from "@/sub/RecentFilesWindow";
import SettingsWindow from "@/sub/SettingsWindow";
import { Direction } from "@/types/directions";
import { openBrowserOrFile } from "@/utils/externalOpen";
import { isMac } from "@/utils/platform";
import { Color, Vector } from "@graphif/data-structures";
import { toast } from "sonner";
import { TextNodeSmartTools } from "../../dataManageService/textNodeSmartTools";
import { onNewDraft, onOpenFile } from "../../GlobalMenu";
import { KeyBinds } from "./KeyBinds";

/**
 * 快捷键注册函数
 */
export namespace KeyBindsRegistrar {
  /**
   * 注册所有快捷键
   */
  export async function registerKeyBinds() {
    // 开始注册快捷键
    await KeyBinds.create("test", "C-A-S-t", true, () =>
      Dialog.buttons("测试快捷键", "您按下了自定义的测试快捷键，这一功能是测试开发所用，可在设置中更改触发方式", [
        { id: "close", label: "关闭" },
      ]),
    );
    await KeyBinds.create("openCommandPalette", "C-S-p", true, () => {
      CommandPaletteWindow.open();
    });

    await KeyBinds.create("undo", "C-z", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.historyManager.undo();
    });

    await KeyBinds.create("redo", "C-y", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.historyManager.redo();
    });

    // 危险操作，配置一个不容易触发的快捷键
    await KeyBinds.create("reload", "C-f5", true, async () => {
      if (
        await Dialog.confirm(
          "危险操作：重新加载应用",
          "此快捷键用于在废档了或软件卡住了的情况下重启，您按下了重新加载应用快捷键，是否要重新加载应用？这会导致您丢失所有未保存的工作。",
          { destructive: true },
        )
      ) {
        window.location.reload();
      }
    });

    await KeyBinds.create("checkoutClassroomMode", "F5", true, async () => {
      // F5 是PPT的播放快捷键
      if (Settings.isClassroomMode) {
        toast.info("已经退出专注模式，点击一下更新状态");
      } else {
        toast.info("进入专注模式，点击一下更新状态");
      }
      Settings.isClassroomMode = !Settings.isClassroomMode;
    });

    await KeyBinds.create("resetView", "F", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.camera.resetBySelected();
    });

    await KeyBinds.create("resetCameraScale", "C-A-r", true, (project: Project) => {
      project.camera.resetScale();
    });

    await KeyBinds.create("CameraScaleZoomIn", "[", () => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.camera.zoomInByKeyboard();
    });

    await KeyBinds.create("CameraScaleZoomOut", "]", () => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.camera.zoomOutByKeyboard();
    });

    if (isMac) {
      await KeyBinds.create("CameraPageMoveUp", "S-i", true, (project: Project) => {
        project.camera.pageMove(Direction.Up);
      });
      await KeyBinds.create("CameraPageMoveDown", "S-k", true, (project: Project) => {
        project.camera.pageMove(Direction.Down);
      });
      await KeyBinds.create("CameraPageMoveLeft", "S-j", true, (project: Project) => {
        project.camera.pageMove(Direction.Left);
      });
      await KeyBinds.create("CameraPageMoveRight", "S-l", true, (project: Project) => {
        project.camera.pageMove(Direction.Right);
      });
    } else {
      await KeyBinds.create("CameraPageMoveUp", "pageup", true, (project: Project) => {
        if (!project.keyboardOnlyEngine.isOpenning()) return;
        project.camera.pageMove(Direction.Up);
      });
      await KeyBinds.create("CameraPageMoveDown", "pagedown", true, (project: Project) => {
        if (!project.keyboardOnlyEngine.isOpenning()) return;
        project.camera.pageMove(Direction.Down);
      });
      await KeyBinds.create("CameraPageMoveLeft", "home", true, (project: Project) => {
        if (!project.keyboardOnlyEngine.isOpenning()) return;
        project.camera.pageMove(Direction.Left);
      });
      await KeyBinds.create("CameraPageMoveRight", "end", true, (project: Project) => {
        if (!project.keyboardOnlyEngine.isOpenning()) return;
        project.camera.pageMove(Direction.Right);
      });
    }

    await KeyBinds.create("folderSection", "C-t", true, (project: Project) => {
      project.stageManager.sectionSwitchCollapse();
    });

    await KeyBinds.create("reverseEdges", "C-t", true, (project: Project) => {
      project.stageManager.reverseSelectedEdges();
    });
    await KeyBinds.create("reverseSelectedNodeEdge", "C-t", true, (project: Project) => {
      project.stageManager.reverseSelectedNodeEdge();
    });

    await KeyBinds.create("packEntityToSection", "C-g", true, (project: Project) => {
      project.stageManager.packEntityToSectionBySelected();
    });
    await KeyBinds.create("createUndirectedEdgeFromEntities", "S-g", true, (project: Project) => {
      // 构建无向边
      const selectedNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof Entity);
      if (selectedNodes.length <= 1) {
        toast.error("至少选择两个可连接节点");
        return;
      }
      const multiTargetUndirectedEdge = MultiTargetUndirectedEdge.createFromSomeEntity(project, selectedNodes);
      project.stageManager.add(multiTargetUndirectedEdge);
    });

    await KeyBinds.create("deleteSelectedStageObjects", isMac ? "backspace" : "delete", () => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.stageManager.deleteSelectedStageObjects();
    });

    await KeyBinds.create("createTextNodeFromCameraLocation", "insert", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.camera.clearMoveCommander();
      project.camera.speed = Vector.getZero();
      project.controllerUtils.addTextNodeByLocation(project.camera.location, true);
    });
    await KeyBinds.create("createTextNodeFromMouseLocation", "S-insert", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.camera.clearMoveCommander();
      project.camera.speed = Vector.getZero();
      project.controllerUtils.addTextNodeByLocation(project.renderer.transformView2World(MouseLocation.vector()), true);
    });

    await KeyBinds.create("createTextNodeFromSelectedTop", "A-arrowup", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Up, true);
    });

    await KeyBinds.create("createTextNodeFromSelectedRight", "A-arrowright", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Right, true);
    });

    await KeyBinds.create("createTextNodeFromSelectedLeft", "A-arrowleft", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Left, true);
    });

    await KeyBinds.create("createTextNodeFromSelectedDown", "A-arrowdown", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Down, true);
    });

    await KeyBinds.create("selectUp", "arrowup", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.selectChangeEngine.selectUp();
    });
    await KeyBinds.create("selectDown", "arrowdown", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.selectChangeEngine.selectDown();
    });
    await KeyBinds.create("selectLeft", "arrowleft", true, (project: Project) => {
      project.selectChangeEngine.selectLeft();
    });
    await KeyBinds.create("selectRight", "arrowright", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.selectChangeEngine.selectRight();
    });
    await KeyBinds.create("selectAdditionalUp", "S-arrowup", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.selectChangeEngine.selectUp(true);
    });
    await KeyBinds.create("selectAdditionalDown", "S-arrowdown", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.selectChangeEngine.selectDown(true);
    });
    await KeyBinds.create("selectAdditionalLeft", "S-arrowleft", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.selectChangeEngine.selectLeft(true);
    });
    await KeyBinds.create("selectAdditionalRight", "S-arrowright", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.selectChangeEngine.selectRight(true);
    });

    await KeyBinds.create("moveUpSelectedEntities", "C-arowup", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      const entities = project.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.y -= 100;
        project.effects.addEffect(
          RectangleSlideEffect.verticalSlide(
            rect,
            newRect,
            project.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      project.entityMoveManager.moveSelectedEntities(new Vector(0, -100));
    });

    await KeyBinds.create("moveDownSelectedEntities", "C-arrowdown", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      const entities = project.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.y += 100;
        project.effects.addEffect(
          RectangleSlideEffect.verticalSlide(
            rect,
            newRect,
            project.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      project.entityMoveManager.moveSelectedEntities(new Vector(0, 100));
    });

    await KeyBinds.create("moveLeftSelectedEntities", "C-arrowleft", true, (project: Project) => {
      const entities = project.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.x -= 100;
        project.effects.addEffect(
          RectangleSlideEffect.horizontalSlide(
            rect,
            newRect,
            project.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      project.entityMoveManager.moveSelectedEntities(new Vector(-100, 0));
    });

    await KeyBinds.create("moveRightSelectedEntities", "C-arrowright", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      const entities = project.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.x += 100;
        project.effects.addEffect(
          RectangleSlideEffect.horizontalSlide(
            rect,
            newRect,
            project.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      project.entityMoveManager.moveSelectedEntities(new Vector(100, 0));
    });
    await KeyBinds.create("jumpMoveUpSelectedEntities", "C-A-arrowup", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(0, -100));
    });

    await KeyBinds.create("jumpMoveDownSelectedEntities", "C-A-arrowdown", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(0, 100));
    });

    await KeyBinds.create("jumpMoveLeftSelectedEntities", "C-A-arrowleft", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(-100, 0));
    });

    await KeyBinds.create("jumpMoveRightSelectedEntities", "C-A-arrowright", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(100, 0));
    });

    await KeyBinds.create("editEntityDetails", "C-enter", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.controllerUtils.editNodeDetailsByKeyboard();
    });

    await KeyBinds.create("openColorPanel", "F6", true, () => {
      // toast.warning("2.0版本的颜色面板已被整合入右键菜单，请在右键菜单中打开");
      ColorWindow.open();
    });
    await KeyBinds.create("switchDebugShow", "F3", true, async () => {
      const currentValue = Settings.showDebug;
      Settings.showDebug = !currentValue;
    });

    await KeyBinds.create("selectAll", "C-a", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.stageManager.selectAll();
      toast.success(
        <div>
          <h2>已全选所有元素</h2>
          <p>
            {project.stageManager.getSelectedEntities().length}个实体+
            {project.stageManager.getSelectedAssociations().length}个关系=
            {project.stageManager.getSelectedStageObjects().length}个舞台对象
          </p>
        </div>,
      );
      project.effects.addEffect(ViewOutlineFlashEffect.normal(Color.Green.toNewAlpha(0.2)));
    });
    await KeyBinds.create("textNodeToSection", "C-S-g", true, (project: Project) => {
      project.sectionPackManager.textNodeToSection();
    });
    await KeyBinds.create("unpackEntityFromSection", "C-S-g", true, (project: Project) => {
      project.sectionPackManager.unpackSelectedSections();
    });
    await KeyBinds.create("checkoutProtectPrivacy", "C-2", true, async () => {
      if (Settings.protectingPrivacy) {
        toast.info("您已退出隐私模式，再次按下此快捷键、或在设置中开启，可进入隐私模式");
      } else {
        toast.info("您已通过快捷键进入隐私模式，再次按下此快捷键、或在设置中关闭，可退出隐私模式");
      }
      Settings.protectingPrivacy = !Settings.protectingPrivacy;
    });
    await KeyBinds.create("searchText", "C-f", true, () => {
      FindWindow.open();
    });
    await KeyBinds.create("openTextNodeByContentExternal", "C-e", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      openBrowserOrFile(project);
    });

    await KeyBinds.create("clickAppMenuSettingsButton", "S-!", () => {
      SettingsWindow.open("settings");
    });
    // await KeyBinds.create("clickTagPanelButton", "S-@", () => {
    //   TagWindow.open();
    // });
    await KeyBinds.create("clickAppMenuRecentFileButton", "S-#", () => {
      // KeyboardRecentFilesWindow.open();
      RecentFilesWindow.open();
    });
    // await KeyBinds.create("clickStartFilePanelButton", "S-$", (project: Project) => {
    //   const button = document.getElementById("app-start-file-btn");
    //   const event = new MouseEvent("click", {
    //     bubbles: true,
    //     cancelable: true,
    //     view: window,
    //   });
    //   button?.dispatchEvent(event);
    //   setTimeout(() => {
    //     project.controller.pressingKeySet.clear();
    //   }, 200);
    // });
    await KeyBinds.create("saveFile", "C-s", true, () => {
      const activeProject = store.get(activeProjectAtom);
      if (activeProject) {
        activeProject.save();
        if (Settings.clearHistoryWhenManualSave) {
          activeProject.historyManager.clearHistory();
        }
      }
    });
    await KeyBinds.create("newDraft", "C-n", true, () => {
      onNewDraft();
    });
    await KeyBinds.create("openFile", "C-o", true, () => {
      onOpenFile();
    });

    await KeyBinds.create("checkoutWindowOpacityMode", "C-0", true, async () => {
      // 切换窗口透明度模式
      const currentValue = Settings.windowBackgroundAlpha;
      if (currentValue === 0) {
        Settings.windowBackgroundAlpha = 1;
      } else {
        Settings.windowBackgroundAlpha = 0;
      }
    });
    await KeyBinds.create("windowOpacityAlphaIncrease", "C-A-S-+", async (project: Project) => {
      const currentValue = Settings.windowBackgroundAlpha;
      if (currentValue === 1) {
        // 已经不能再大了
        project.effects.addEffect(ViewOutlineFlashEffect.short(project.stageStyleManager.currentStyle.effects.flash));
      } else {
        Settings.windowBackgroundAlpha = Math.min(1, currentValue + 0.2);
      }
    });
    await KeyBinds.create("windowOpacityAlphaDecrease", "C-A-S--", true, async (project: Project) => {
      const currentValue = Settings.windowBackgroundAlpha;
      if (currentValue === 0) {
        // 已经不能再小了
        project.effects.addEffect(ViewOutlineFlashEffect.short(project.stageStyleManager.currentStyle.effects.flash));
      } else {
        Settings.windowBackgroundAlpha = Math.max(0, currentValue - 0.2);
      }
    });

    // await KeyBinds.create("penStrokeWidthIncrease", "=", async () => {
    //   if (Settings.mouseLeftMode === "draw") {
    //     const newWidth = project.controller.penStrokeDrawing.currentStrokeWidth + 4;
    //     project.controller.penStrokeDrawing.currentStrokeWidth = Math.max(1, Math.min(newWidth, 1000));
    //     toast(`画笔粗细: ${project.controller.penStrokeDrawing.currentStrokeWidth}px`);
    //   }
    // });
    // await KeyBinds.create("penStrokeWidthDecrease", "-", true, async (project: Project) => {
    //   if (Settings.mouseLeftMode === "draw") {
    //     const newWidth = project.controller.penStrokeDrawing.currentStrokeWidth - 4;
    //     project.controller.penStrokeDrawing.currentStrokeWidth = Math.max(1, Math.min(newWidth, 1000));
    //     toast(`画笔粗细: ${project.controller.penStrokeDrawing.currentStrokeWidth}px`);
    //   }
    // });

    await KeyBinds.create("copy", "C-c", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.copyEngine.copy();
    });
    await KeyBinds.create("paste", "C-v", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.copyEngine.paste();
    });

    await KeyBinds.create("pasteWithOriginLocation", "C-S-v", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      // project.copyEngine.pasteWithOriginLocation();
      toast("todo");
    });

    await KeyBinds.create("checkoutLeftMouseToSelectAndMove", "v v v", true, async (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      Settings.mouseLeftMode = "selectAndMove";
      toast("当前鼠标左键已经切换为框选/移动模式");
    });
    await KeyBinds.create("checkoutLeftMouseToDrawing", "b b b", true, async (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      Settings.mouseLeftMode = "draw";
      toast("当前鼠标左键已经切换为画笔模式");
    });

    // 鼠标左键切换为连接模式
    // let lastMouseMode = "selectAndMove";
    await KeyBinds.create("checkoutLeftMouseToConnectAndCutting", "c c c", true, async (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      Settings.mouseLeftMode = "connectAndCut";
      toast("当前鼠标左键已经切换为连接/切割模式");
    });

    // await KeyBinds.create("checkoutLeftMouseToConnectAndCuttingOnlyPressed", "z", true, async (project: Project) => {
    //   // lastMouseMode = Settings.mouseLeftMode;
    //   if (!project.keyboardOnlyEngine.isOpenning()) return;
    //   Stage.MouseModeManager.checkoutConnectAndCuttingHook();
    // })
    // // .up(async () => {
    // //   if (!project.keyboardOnlyEngine.isOpenning()) return;
    // //   Stage.MouseModeManager.checkoutSelectAndMoveHook();
    // // });

    await KeyBinds.create("selectEntityByPenStroke", "C-w", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      PenStrokeMethods.selectEntityByPenStroke();
    });
    await KeyBinds.create("expandSelectEntity", "C-w", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.selectChangeEngine.expandSelect(false, false);
    });
    await KeyBinds.create("expandSelectEntityReversed", "C-S-w", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.selectChangeEngine.expandSelect(false, true);
    });
    await KeyBinds.create("expandSelectEntityKeepLastSelected", "C-A-w", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.selectChangeEngine.expandSelect(true, false);
    });
    await KeyBinds.create("expandSelectEntityReversedKeepLastSelected", "C-A-S-w", true, async (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.selectChangeEngine.expandSelect(true, true);
    });

    await KeyBinds.create("generateNodeTreeWithDeepMode", "tab", true, async (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.keyboardOnlyTreeEngine.onDeepGenerateNode();
    });

    await KeyBinds.create("masterBrakeControl", "pause", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      // 按下一次就清空动力
      project.camera.clearMoveCommander();
      project.camera.speed = Vector.getZero();
    });

    await KeyBinds.create("masterBrakeCheckout", "space", true, async (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      // 看成汽车的手刹，按下一次就切换是否允许移动
      project.camera.clearMoveCommander();
      project.camera.speed = Vector.getZero();
      Settings.allowMoveCameraByWSAD = !Settings.allowMoveCameraByWSAD;
    });

    await KeyBinds.create("generateNodeTreeWithBroadMode", "\\", async () => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.keyboardOnlyTreeEngine.onBroadGenerateNode();
    });

    // (await KeyBinds.create("generateNodeGraph", "`"))
    //   .down(() => {
    //     if (!project.keyboardOnlyEngine.isOpenning()) return;
    //     if (project.keyboardOnlyGraphEngine.isEnableVirtualCreate()) {
    //       project.keyboardOnlyGraphEngine.createStart();
    //     }
    //   })
    //   .up(() => {
    //     if (!project.keyboardOnlyEngine.isOpenning()) return;
    //     if (project.keyboardOnlyGraphEngine.isCreating()) {
    //       project.keyboardOnlyGraphEngine.createFinished();
    //     }
    //   });
    await KeyBinds.create("generateNodeGraph", "`", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      if (project.keyboardOnlyGraphEngine.isCreating()) {
        project.keyboardOnlyGraphEngine.createFinished();
      } else {
        if (project.keyboardOnlyGraphEngine.isEnableVirtualCreate()) {
          project.keyboardOnlyGraphEngine.createStart();
        }
      }
    });

    await KeyBinds.create("createConnectPointWhenDragConnecting", "1", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      project.controller.nodeConnection.createConnectPointWhenConnect();
    });

    await KeyBinds.create("treeGraphAdjust", "A-S-f", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;
      // 获取所有的选中节点
      const entities = project.stageManager.getSelectedEntities().filter((entity) => entity instanceof Entity);
      // 调整所有节点的树形结构
      for (const entity of entities) {
        project.keyboardOnlyTreeEngine.adjustTreeNode(entity);
      }
    });

    // 以下是老秘籍键

    await KeyBinds.create(
      "screenFlashEffect",
      "arrowup arrowup arrowdown arrowdown arrowleft arrowright arrowleft arrowright b a",
      () => {
        project.effects.addEffect(ViewFlashEffect.SaveFile());
      },
    );

    // 减小体积
    await KeyBinds.create("alignNodesToInteger", "i n t j", true, (project: Project) => {
      const entities = project.stageManager.getConnectableEntity();
      for (const entity of entities) {
        const leftTopLocation = entity.collisionBox.getRectangle().location;
        const IntLocation = new Vector(Math.round(leftTopLocation.x), Math.round(leftTopLocation.y));
        entity.moveTo(IntLocation);
      }
    });

    // 做计划的功能
    await KeyBinds.create("toggleCheckmarkOnTextNodes", "o k k", true, (project: Project) => {
      TextNodeSmartTools.okk(project);
    });

    // 反转选中图片的颜色
    await KeyBinds.create("reverseImageColors", "r r r", true, (project: Project) => {
      const selectedImageNodes: ImageNode[] = project.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof ImageNode);
      for (const node of selectedImageNodes) {
        node.reverseColors();
      }
      if (selectedImageNodes.length > 0) {
        toast(`已反转 ${selectedImageNodes.length} 张图片的颜色`);
      }
    });

    await KeyBinds.create("switchToDarkTheme", "b l a c k k", true, () => {
      toast.info("切换到暗黑主题");
      Themes.applyThemeById("dark");
    });

    await KeyBinds.create("switchToLightTheme", "w h i t e e", true, () => {
      toast.info("切换到明亮主题");
      Themes.applyThemeById("light");
    });

    await KeyBinds.create("switchToParkTheme", "p a r k k", true, () => {
      toast.info("切换到公园主题");
      Themes.applyThemeById("park");
    });

    await KeyBinds.create("switchToMacaronTheme", "m k l m k l", true, () => {
      toast.info("切换到马卡龙主题");
      Themes.applyThemeById("macaron");
    });

    await KeyBinds.create("switchToMorandiTheme", "m l d m l d", true, () => {
      toast.info("切换到莫兰迪主题");
      Themes.applyThemeById("morandi");
    });

    // 画笔相关快捷键
    await KeyBinds.create("increasePenAlpha", "p s a + +", async (project: Project) => {
      project.controller.penStrokeDrawing.changeCurrentStrokeColorAlpha(0.1);
    });

    await KeyBinds.create("decreasePenAlpha", "p s a - -", true, async (project: Project) => {
      project.controller.penStrokeDrawing.changeCurrentStrokeColorAlpha(-0.1);
    });

    // 对齐相关快捷键
    await KeyBinds.create("alignTop", "8 8", true, (project: Project) => {
      project.layoutManager.alignTop();
      project.stageManager.changeSelectedEdgeConnectLocation(Direction.Up, true);
      project.stageManager.changeSelectedEdgeConnectLocation(Direction.Down);
    });

    await KeyBinds.create("alignBottom", "2 2", true, (project: Project) => {
      project.layoutManager.alignBottom();
      project.stageManager.changeSelectedEdgeConnectLocation(Direction.Down, true);
      project.stageManager.changeSelectedEdgeConnectLocation(Direction.Up);
    });

    await KeyBinds.create("alignLeft", "4 4", true, (project: Project) => {
      project.layoutManager.alignLeft();
      project.stageManager.changeSelectedEdgeConnectLocation(Direction.Left, true);
      project.stageManager.changeSelectedEdgeConnectLocation(Direction.Right);
    });

    await KeyBinds.create("alignRight", "6 6", true, (project: Project) => {
      project.layoutManager.alignRight();
      project.stageManager.changeSelectedEdgeConnectLocation(Direction.Right, true);
      project.stageManager.changeSelectedEdgeConnectLocation(Direction.Left);
    });

    await KeyBinds.create("alignHorizontalSpaceBetween", "4 6 4 6", true, (project: Project) => {
      project.layoutManager.alignHorizontalSpaceBetween();
    });

    await KeyBinds.create("alignVerticalSpaceBetween", "8 2 8 2", true, (project: Project) => {
      project.layoutManager.alignVerticalSpaceBetween();
    });

    await KeyBinds.create("alignCenterHorizontal", "5 4 6", true, (project: Project) => {
      project.layoutManager.alignCenterHorizontal();
    });

    await KeyBinds.create("alignCenterVertical", "5 8 2", true, (project: Project) => {
      project.layoutManager.alignCenterVertical();
    });

    await KeyBinds.create("alignLeftToRightNoSpace", "4 5 6", true, (project: Project) => {
      project.layoutManager.alignLeftToRightNoSpace();
    });

    await KeyBinds.create("alignTopToBottomNoSpace", "8 5 2", true, (project: Project) => {
      project.layoutManager.alignTopToBottomNoSpace();
    });

    // 全连接
    await KeyBinds.create("connectAllSelectedEntities", "- - a l l", true, (project: Project) => {
      const selectedNodes = project.stageManager.getSelectedEntities();
      for (let i = 0; i < selectedNodes.length; i++) {
        for (let j = 0; j < selectedNodes.length; j++) {
          const fromNode = selectedNodes[i];
          const toNode = selectedNodes[j];
          if (fromNode === toNode) continue;
          if (fromNode instanceof Entity && toNode instanceof Entity) {
            project.stageManager.connectEntity(fromNode, toNode, false);
          }
        }
      }
    });

    // 向右连接
    await KeyBinds.create("connectLeftToRight", "- - r i g h t", true, (project: Project) => {
      const selectedNodes = project.stageManager.getSelectedEntities().filter((entity) => entity instanceof Entity);
      if (selectedNodes.length <= 1) return;
      selectedNodes.sort((a, b) => a.collisionBox.getRectangle().location.x - b.collisionBox.getRectangle().location.x);
      for (let i = 0; i < selectedNodes.length - 1; i++) {
        const fromNode = selectedNodes[i];
        const toNode = selectedNodes[i + 1];
        if (fromNode === toNode) continue;
        project.stageManager.connectEntity(fromNode, toNode, false);
      }
    });

    await KeyBinds.create("connectTopToBottom", "- - d o w n", true, (project: Project) => {
      const selectedNodes = project.stageManager.getSelectedEntities().filter((entity) => entity instanceof Entity);
      if (selectedNodes.length <= 1) return;
      selectedNodes.sort((a, b) => a.collisionBox.getRectangle().location.y - b.collisionBox.getRectangle().location.y);
      for (let i = 0; i < selectedNodes.length - 1; i++) {
        const fromNode = selectedNodes[i];
        const toNode = selectedNodes[i + 1];
        if (fromNode === toNode) continue;
        project.stageManager.connectEntity(fromNode, toNode, false);
      }
    });

    await KeyBinds.create("selectAllEdges", "+ e d g e", (project: Project) => {
      const selectedEdges = project.stageManager.getAssociations();
      const viewRect = project.renderer.getCoverWorldRectangle();
      for (const edge of selectedEdges) {
        if (project.renderer.isOverView(viewRect, edge)) continue;
        edge.isSelected = true;
      }
    });

    await KeyBinds.create("colorSelectedRed", "; r e d", (project: Project) => {
      const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          obj.color = new Color(239, 68, 68);
        }
      }
    });

    await KeyBinds.create("increaseBrightness", "b .", (project: Project) => {
      const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          if (obj.color.a === 0) continue;
          obj.color = new Color(
            Math.min(255, obj.color.r + 20),
            Math.min(255, obj.color.b + 20),
            Math.min(255, obj.color.g + 20),
            obj.color.a,
          );
        }
      }
    });

    await KeyBinds.create("decreaseBrightness", "b ,", (project: Project) => {
      const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          if (obj.color.a === 0) continue;
          obj.color = new Color(
            Math.max(0, obj.color.r - 20),
            Math.max(0, obj.color.b - 20),
            Math.max(0, obj.color.g - 20),
            obj.color.a,
          );
        }
      }
    });

    await KeyBinds.create("gradientColor", "; ,", (project: Project) => {
      const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          if (obj.color.a === 0) continue;
          const oldColor = obj.color.clone();
          obj.color = new Color(Math.max(oldColor.a - 20, 0), Math.min(255, oldColor.g + 20), oldColor.b, oldColor.a);
        }
      }
    });

    await KeyBinds.create("changeColorHueUp", "A-S-arrowup", true, (project: Project) => {
      const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          if (obj.color.a === 0) continue;
          const oldColor = obj.color.clone();
          obj.color = oldColor.changeHue(30);
        }
      }
    });
    await KeyBinds.create("changeColorHueDown", "A-S-arrowdown", true, (project: Project) => {
      const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          if (obj.color.a === 0) continue;
          const oldColor = obj.color.clone();
          console.log(obj.color);
          obj.color = oldColor.changeHue(-30);
          console.log(obj.color);
        }
      }
    });
    await KeyBinds.create("changeColorHueMajorUp", "A-S-home", true, (project: Project) => {
      const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          if (obj.color.a === 0) continue;
          const oldColor = obj.color.clone();
          obj.color = oldColor.changeHue(90);
        }
      }
    });
    await KeyBinds.create("changeColorHueMajorDown", "A-S-end", true, (project: Project) => {
      const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          if (obj.color.a === 0) continue;
          const oldColor = obj.color.clone();
          console.log(obj.color);
          obj.color = oldColor.changeHue(-90);
          console.log(obj.color);
        }
      }
    });

    await KeyBinds.create("toggleTextNodeSizeMode", "t t t", true, (project: Project) => {
      TextNodeSmartTools.ttt(project);
    });

    await KeyBinds.create("splitTextNodes", "k e i", true, (project: Project) => {
      TextNodeSmartTools.kei(project);
    });

    await KeyBinds.create("mergeTextNodes", "r u a", true, (project: Project) => {
      TextNodeSmartTools.rua(project);
    });

    await KeyBinds.create("swapTextAndDetails", "e e e e e", true, (project: Project) => {
      TextNodeSmartTools.exchangeTextAndDetails(project);
    });

    await KeyBinds.create("switchStealthMode", "j a c k a l", true, () => {
      Settings.isStealthModeEnabled = !Settings.isStealthModeEnabled;
      toast(Settings.isStealthModeEnabled ? "已开启潜行模式" : "已关闭潜行模式");
    });

    // 去除选中文本节点开头的一个字符，并将移除的字符创建为新的文本节点放在左侧
    await KeyBinds.create("removeFirstCharFromSelectedTextNodes", "C-backspace", true, (project: Project) => {
      TextNodeSmartTools.removeFirstCharFromSelectedTextNodes(project);
    });

    // 去除选中文本节点结尾的一个字符，并将移除的字符创建为新的文本节点放在右侧
    await KeyBinds.create("removeLastCharFromSelectedTextNodes", "C-delete", true, (project: Project) => {
      TextNodeSmartTools.removeLastCharFromSelectedTextNodes(project);
    });

    // 交换两个选中实体的位置
    await KeyBinds.create("swapTwoSelectedEntitiesPositions", "S-r", true, (project: Project) => {
      if (!project.keyboardOnlyEngine.isOpenning()) return;

      const selectedEntities = project.stageManager.getSelectedEntities();
      // 只有当恰好选中两个实体时才执行交换
      if (selectedEntities.length !== 2) {
        return;
      }

      // 记录操作历史
      project.historyManager.recordStep();

      // 获取两个实体的碰撞箱外接矩形左上角位置
      const entity1 = selectedEntities[0];
      const entity2 = selectedEntities[1];

      const position1 = entity1.collisionBox.getRectangle().location.clone();
      const position2 = entity2.collisionBox.getRectangle().location.clone();

      // 交换两个实体的位置
      entity1.moveTo(position2);
      entity2.moveTo(position1);
    });
  }
}
