import { Dialog } from "@/components/ui/dialog";
import { Project, service } from "@/core/Project";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { RectangleSlideEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleSlideEffect";
import { ViewFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ViewFlashEffect";
import { ViewOutlineFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ViewOutlineFlashEffect";
import { Settings } from "@/core/service/Settings";
import { Themes } from "@/core/service/Themes";
import { StageStyle } from "@/core/service/feedbackService/stageStyle/stageStyle";
import { PenStrokeMethods } from "@/core/stage/stageManager/basicMethods/PenStrokeMethods";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { activeProjectAtom, store } from "@/state";
// import ColorWindow from "@/sub/ColorWindow";
import FindWindow from "@/sub/FindWindow";
import KeyboardRecentFilesWindow from "@/sub/KeyboardRecentFilesWindow";
import SettingsWindow from "@/sub/SettingsWindow";
import { Direction } from "@/types/directions";
import { openBrowserOrFile } from "@/utils/externalOpen";
import { isMac } from "@/utils/platform";
import { averageColors, Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";
import { v4 } from "uuid";
import { onNewDraft, onOpenFile } from "../../GlobalMenu";

/**
 * 快捷键注册函数
 */
@service("keyBindsRegistrar")
export class KeyBindsRegistrar {
  constructor(private readonly project: Project) {}

  /**
   * 注册所有快捷键
   */
  async registerKeyBinds() {
    // 开始注册快捷键
    await this.project.keyBinds.create("test", "C-A-S-t", () =>
      Dialog.buttons("测试快捷键", "您按下了自定义的测试快捷键，这一功能是测试开发所用，可在设置中更改触发方式", [
        { id: "close", label: "关闭" },
      ]),
    );

    await this.project.keyBinds.create("undo", "C-z", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.historyManager.undo();
    });

    await this.project.keyBinds.create("redo", "C-y", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.historyManager.redo();
    });

    // 危险操作，配置一个不容易触发的快捷键
    await this.project.keyBinds.create("reload", "C-f5", async () => {
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

    await this.project.keyBinds.create("checkoutClassroomMode", "F5", async () => {
      // F5 是PPT的播放快捷键
      Settings.isClassroomMode = !Settings.isClassroomMode;
    });

    await this.project.keyBinds.create("resetView", "F", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.camera.resetBySelected();
    });

    await this.project.keyBinds.create("resetCameraScale", "C-A-r", () => {
      this.project.camera.resetScale();
    });

    await this.project.keyBinds.create("CameraScaleZoomIn", "[", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.camera.zoomInByKeyboard();
    });

    await this.project.keyBinds.create("CameraScaleZoomOut", "]", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.camera.zoomOutByKeyboard();
    });

    if (isMac) {
      await this.project.keyBinds.create("CameraPageMoveUp", "S-i", () => {
        this.project.camera.pageMove(Direction.Up);
      });
      await this.project.keyBinds.create("CameraPageMoveDown", "S-k", () => {
        this.project.camera.pageMove(Direction.Down);
      });
      await this.project.keyBinds.create("CameraPageMoveLeft", "S-j", () => {
        this.project.camera.pageMove(Direction.Left);
      });
      await this.project.keyBinds.create("CameraPageMoveRight", "S-l", () => {
        this.project.camera.pageMove(Direction.Right);
      });
    } else {
      await this.project.keyBinds.create("CameraPageMoveUp", "pageup", () => {
        if (!this.project.keyboardOnlyEngine.isOpenning()) return;
        this.project.camera.pageMove(Direction.Up);
      });
      await this.project.keyBinds.create("CameraPageMoveDown", "pagedown", () => {
        if (!this.project.keyboardOnlyEngine.isOpenning()) return;
        this.project.camera.pageMove(Direction.Down);
      });
      await this.project.keyBinds.create("CameraPageMoveLeft", "home", () => {
        if (!this.project.keyboardOnlyEngine.isOpenning()) return;
        this.project.camera.pageMove(Direction.Left);
      });
      await this.project.keyBinds.create("CameraPageMoveRight", "end", () => {
        if (!this.project.keyboardOnlyEngine.isOpenning()) return;
        this.project.camera.pageMove(Direction.Right);
      });
    }

    await this.project.keyBinds.create("folderSection", "C-t", () => {
      this.project.stageManager.sectionSwitchCollapse();
    });

    await this.project.keyBinds.create("reverseEdges", "C-t", () => {
      this.project.stageManager.reverseSelectedEdges();
    });
    await this.project.keyBinds.create("reverseSelectedNodeEdge", "C-t", () => {
      this.project.stageManager.reverseSelectedNodeEdge();
    });

    await this.project.keyBinds.create("packEntityToSection", "C-g", () => {
      this.project.stageManager.packEntityToSectionBySelected();
    });
    await this.project.keyBinds.create("createUndirectedEdgeFromEntities", "S-g", () => {
      // 构建无向边
      const selectedNodes = this.project.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof ConnectableEntity);
      if (selectedNodes.length <= 1) {
        toast.error("至少选择两个可连接节点");
        return;
      }
      const multiTargetUndirectedEdge = MultiTargetUndirectedEdge.createFromSomeEntity(this.project, selectedNodes);
      this.project.stageManager.add(multiTargetUndirectedEdge);
    });

    await this.project.keyBinds.create("deleteSelectedStageObjects", isMac ? "backspace" : "delete", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.stageManager.deleteSelectedStageObjects();
    });

    await this.project.keyBinds.create("createTextNodeFromCameraLocation", "insert", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.camera.clearMoveCommander();
      this.project.camera.speed = Vector.getZero();
      this.project.controllerUtils.addTextNodeByLocation(this.project.camera.location, true);
    });
    await this.project.keyBinds.create("createTextNodeFromMouseLocation", "S-insert", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.camera.clearMoveCommander();
      this.project.camera.speed = Vector.getZero();
      this.project.controllerUtils.addTextNodeByLocation(
        this.project.renderer.transformView2World(MouseLocation.vector()),
        true,
      );
    });

    await this.project.keyBinds.create("createTextNodeFromSelectedTop", "A-arrowup", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Up, true);
    });

    await this.project.keyBinds.create("createTextNodeFromSelectedRight", "A-arrowright", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Right, true);
    });

    await this.project.keyBinds.create("createTextNodeFromSelectedLeft", "A-arrowleft", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Left, true);
    });

    await this.project.keyBinds.create("createTextNodeFromSelectedDown", "A-arrowdown", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.controllerUtils.addTextNodeFromCurrentSelectedNode(Direction.Down, true);
    });

    await this.project.keyBinds.create("selectUp", "arrowup", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.selectChangeEngine.selectUp();
    });
    await this.project.keyBinds.create("selectDown", "arrowdown", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.selectChangeEngine.selectDown();
    });
    await this.project.keyBinds.create("selectLeft", "arrowleft", () => {
      this.project.selectChangeEngine.selectLeft();
    });
    await this.project.keyBinds.create("selectRight", "arrowright", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.selectChangeEngine.selectRight();
    });
    await this.project.keyBinds.create("selectAdditionalUp", "S-arrowup", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.selectChangeEngine.selectUp(true);
    });
    await this.project.keyBinds.create("selectAdditionalDown", "S-arrowdown", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.selectChangeEngine.selectDown(true);
    });
    await this.project.keyBinds.create("selectAdditionalLeft", "S-arrowleft", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.selectChangeEngine.selectLeft(true);
    });
    await this.project.keyBinds.create("selectAdditionalRight", "S-arrowright", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.selectChangeEngine.selectRight(true);
    });

    await this.project.keyBinds.create("moveUpSelectedEntities", "C-arowup", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      const entities = this.project.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.y -= 100;
        this.project.effects.addEffect(
          RectangleSlideEffect.verticalSlide(
            rect,
            newRect,
            this.project.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      this.project.entityMoveManager.moveSelectedEntities(new Vector(0, -100));
    });

    await this.project.keyBinds.create("moveDownSelectedEntities", "C-arrowdown", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      const entities = this.project.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.y += 100;
        this.project.effects.addEffect(
          RectangleSlideEffect.verticalSlide(
            rect,
            newRect,
            this.project.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      this.project.entityMoveManager.moveSelectedEntities(new Vector(0, 100));
    });

    await this.project.keyBinds.create("moveLeftSelectedEntities", "C-arrowleft", () => {
      const entities = this.project.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.x -= 100;
        this.project.effects.addEffect(
          RectangleSlideEffect.horizontalSlide(
            rect,
            newRect,
            this.project.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      this.project.entityMoveManager.moveSelectedEntities(new Vector(-100, 0));
    });

    await this.project.keyBinds.create("moveRightSelectedEntities", "C-arrowright", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      const entities = this.project.stageManager.getEntities().filter((e) => e.isSelected);
      if (entities.length > 0) {
        const rect = entities[0].collisionBox.getRectangle();
        const newRect = rect.clone();
        newRect.location.x += 100;
        this.project.effects.addEffect(
          RectangleSlideEffect.horizontalSlide(
            rect,
            newRect,
            this.project.stageStyleManager.currentStyle.effects.successShadow,
          ),
        );
      }
      this.project.entityMoveManager.moveSelectedEntities(new Vector(100, 0));
    });
    await this.project.keyBinds.create("jumpMoveUpSelectedEntities", "C-A-arrowup", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(0, -100));
    });

    await this.project.keyBinds.create("jumpMoveDownSelectedEntities", "C-A-arrowdown", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(0, 100));
    });

    await this.project.keyBinds.create("jumpMoveLeftSelectedEntities", "C-A-arrowleft", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(-100, 0));
    });

    await this.project.keyBinds.create("jumpMoveRightSelectedEntities", "C-A-arrowright", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.entityMoveManager.jumpMoveSelectedConnectableEntities(new Vector(100, 0));
    });

    await this.project.keyBinds.create("editEntityDetails", "C-enter", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.controllerUtils.editNodeDetailsByKeyboard();
    });

    await this.project.keyBinds.create("openColorPanel", "F6", () => {
      toast.warning("2.0版本的颜色面板已被整合入右键菜单，请在右键菜单中打开");
      // ColorWindow.open();
    });
    await this.project.keyBinds.create("switchDebugShow", "F3", async () => {
      const currentValue = Settings.showDebug;
      Settings.showDebug = !currentValue;
    });

    await this.project.keyBinds.create("selectAll", "C-a", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.stageManager.selectAll();
      this.project.effects.addEffect(ViewOutlineFlashEffect.normal(Color.Green));
    });
    await this.project.keyBinds.create("textNodeToSection", "C-S-g", () => {
      this.project.sectionPackManager.textNodeToSection();
    });
    await this.project.keyBinds.create("unpackEntityFromSection", "C-S-g", () => {
      this.project.sectionPackManager.unpackSelectedSections();
    });
    await this.project.keyBinds.create("checkoutProtectPrivacy", "C-2", async () => {
      if (Settings.protectingPrivacy) {
        toast.info("您已退出隐私模式，再次按下此快捷键、或在设置中开启，可进入隐私模式");
      } else {
        toast.info("您已通过快捷键进入隐私模式，再次按下此快捷键、或在设置中关闭，可退出隐私模式");
      }
      Settings.protectingPrivacy = !Settings.protectingPrivacy;
    });
    await this.project.keyBinds.create("searchText", "C-f", () => {
      FindWindow.open();
    });
    await this.project.keyBinds.create("openTextNodeByContentExternal", "C-e", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      openBrowserOrFile(this.project);
    });

    await this.project.keyBinds.create("clickAppMenuSettingsButton", "S-!", () => {
      SettingsWindow.open("settings");
    });
    // await this.project.keyBinds.create("clickTagPanelButton", "S-@", () => {
    //   TagWindow.open();
    // });
    await this.project.keyBinds.create("clickAppMenuRecentFileButton", "S-#", () => {
      KeyboardRecentFilesWindow.open();
    });
    // await this.project.keyBinds.create("clickStartFilePanelButton", "S-$", () => {
    //   const button = document.getElementById("app-start-file-btn");
    //   const event = new MouseEvent("click", {
    //     bubbles: true,
    //     cancelable: true,
    //     view: window,
    //   });
    //   button?.dispatchEvent(event);
    //   setTimeout(() => {
    //     this.project.controller.pressingKeySet.clear();
    //   }, 200);
    // });
    await this.project.keyBinds.create("saveFile", "C-s", () => {
      const activeProject = store.get(activeProjectAtom);
      if (activeProject) {
        activeProject.save();
        activeProject.historyManager.clearHistory();
      }
    });
    await this.project.keyBinds.create("newDraft", "C-n", () => {
      onNewDraft();
    });
    await this.project.keyBinds.create("openFile", "C-o", () => {
      onOpenFile();
    });

    await this.project.keyBinds.create("checkoutWindowOpacityMode", "C-0", async () => {
      // 切换窗口透明度模式
      const currentValue = Settings.windowBackgroundAlpha;
      if (currentValue === 0) {
        Settings.windowBackgroundAlpha = 1;
      } else {
        Settings.windowBackgroundAlpha = 0;
      }
    });
    await this.project.keyBinds.create("windowOpacityAlphaIncrease", "C-A-S-+", async () => {
      const currentValue = Settings.windowBackgroundAlpha;
      if (currentValue === 1) {
        // 已经不能再大了
        this.project.effects.addEffect(
          ViewOutlineFlashEffect.short(this.project.stageStyleManager.currentStyle.effects.flash),
        );
      } else {
        Settings.windowBackgroundAlpha = Math.min(1, currentValue + 0.2);
      }
    });
    await this.project.keyBinds.create("windowOpacityAlphaDecrease", "C-A-S--", async () => {
      const currentValue = Settings.windowBackgroundAlpha;
      if (currentValue === 0) {
        // 已经不能再小了
        this.project.effects.addEffect(
          ViewOutlineFlashEffect.short(this.project.stageStyleManager.currentStyle.effects.flash),
        );
      } else {
        Settings.windowBackgroundAlpha = Math.max(0, currentValue - 0.2);
      }
    });

    // await this.project.keyBinds.create("penStrokeWidthIncrease", "=", async () => {
    //   if (Settings.mouseLeftMode === "draw") {
    //     const newWidth = this.project.controller.penStrokeDrawing.currentStrokeWidth + 4;
    //     this.project.controller.penStrokeDrawing.currentStrokeWidth = Math.max(1, Math.min(newWidth, 1000));
    //     toast(`画笔粗细: ${this.project.controller.penStrokeDrawing.currentStrokeWidth}px`);
    //   }
    // });
    // await this.project.keyBinds.create("penStrokeWidthDecrease", "-", async () => {
    //   if (Settings.mouseLeftMode === "draw") {
    //     const newWidth = this.project.controller.penStrokeDrawing.currentStrokeWidth - 4;
    //     this.project.controller.penStrokeDrawing.currentStrokeWidth = Math.max(1, Math.min(newWidth, 1000));
    //     toast(`画笔粗细: ${this.project.controller.penStrokeDrawing.currentStrokeWidth}px`);
    //   }
    // });

    await this.project.keyBinds.create("copy", "C-c", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.copyEngine.copy();
    });
    await this.project.keyBinds.create("paste", "C-v", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.copyEngine.paste();
    });

    await this.project.keyBinds.create("pasteWithOriginLocation", "C-S-v", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      // this.project.copyEngine.pasteWithOriginLocation();
      toast("todo");
    });

    await this.project.keyBinds.create("checkoutLeftMouseToSelectAndMove", "v v v", async () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      Settings.mouseLeftMode = "selectAndMove";
      toast("当前鼠标左键已经切换为框选/移动模式");
    });
    await this.project.keyBinds.create("checkoutLeftMouseToDrawing", "b b b", async () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      Settings.mouseLeftMode = "draw";
      toast("当前鼠标左键已经切换为画笔模式");
    });

    // 鼠标左键切换为连接模式
    // let lastMouseMode = "selectAndMove";
    await this.project.keyBinds.create("checkoutLeftMouseToConnectAndCutting", "c c c", async () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      Settings.mouseLeftMode = "connectAndCut";
      toast("当前鼠标左键已经切换为连接/切割模式");
    });

    // await this.project.keyBinds.create("checkoutLeftMouseToConnectAndCuttingOnlyPressed", "z", async () => {
    //   // lastMouseMode = Settings.mouseLeftMode;
    //   if (!this.project.keyboardOnlyEngine.isOpenning()) return;
    //   Stage.MouseModeManager.checkoutConnectAndCuttingHook();
    // })
    // // .up(async () => {
    // //   if (!this.project.keyboardOnlyEngine.isOpenning()) return;
    // //   Stage.MouseModeManager.checkoutSelectAndMoveHook();
    // // });

    await this.project.keyBinds.create("selectEntityByPenStroke", "C-w", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      PenStrokeMethods.selectEntityByPenStroke();
    });
    await this.project.keyBinds.create("expandSelectEntity", "C-w", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.selectChangeEngine.expandSelect(false, false);
    });
    await this.project.keyBinds.create("expandSelectEntityReversed", "C-S-w", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.selectChangeEngine.expandSelect(false, true);
    });
    await this.project.keyBinds.create("expandSelectEntityKeepLastSelected", "C-A-w", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.selectChangeEngine.expandSelect(true, false);
    });
    await this.project.keyBinds.create("expandSelectEntityReversedKeepLastSelected", "C-A-S-w", async () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.selectChangeEngine.expandSelect(true, true);
    });

    await this.project.keyBinds.create("generateNodeTreeWithDeepMode", "tab", async () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.keyboardOnlyTreeEngine.onDeepGenerateNode();
    });

    await this.project.keyBinds.create("masterBrakeControl", "pause", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      // 按下一次就清空动力
      this.project.camera.clearMoveCommander();
      this.project.camera.speed = Vector.getZero();
    });

    await this.project.keyBinds.create("masterBrakeCheckout", "space", async () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      // 看成汽车的手刹，按下一次就切换是否允许移动
      this.project.camera.clearMoveCommander();
      this.project.camera.speed = Vector.getZero();
      Settings.allowMoveCameraByWSAD = !Settings.allowMoveCameraByWSAD;
    });

    await this.project.keyBinds.create("generateNodeTreeWithBroadMode", "\\", async () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      this.project.keyboardOnlyTreeEngine.onBroadGenerateNode();
    });

    // (await this.project.keyBinds.create("generateNodeGraph", "`"))
    //   .down(() => {
    //     if (!this.project.keyboardOnlyEngine.isOpenning()) return;
    //     if (this.project.keyboardOnlyGraphEngine.isEnableVirtualCreate()) {
    //       this.project.keyboardOnlyGraphEngine.createStart();
    //     }
    //   })
    //   .up(() => {
    //     if (!this.project.keyboardOnlyEngine.isOpenning()) return;
    //     if (this.project.keyboardOnlyGraphEngine.isCreating()) {
    //       this.project.keyboardOnlyGraphEngine.createFinished();
    //     }
    //   });
    await this.project.keyBinds.create("generateNodeGraph", "`", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      if (this.project.keyboardOnlyGraphEngine.isCreating()) {
        this.project.keyboardOnlyGraphEngine.createFinished();
      } else {
        if (this.project.keyboardOnlyGraphEngine.isEnableVirtualCreate()) {
          this.project.keyboardOnlyGraphEngine.createStart();
        }
      }
    });
    await this.project.keyBinds.create("treeGraphAdjust", "A-S-f", () => {
      if (!this.project.keyboardOnlyEngine.isOpenning()) return;
      // 获取所有的选中节点
      const entities = this.project.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ConnectableEntity);
      // 调整所有节点的树形结构
      for (const entity of entities) {
        this.project.keyboardOnlyTreeEngine.adjustTreeNode(entity);
      }
    });

    // 以下是老秘籍键

    await this.project.keyBinds.create(
      "screenFlashEffect",
      "arrowup arrowup arrowdown arrowdown arrowleft arrowright arrowleft arrowright b a",
      () => {
        this.project.effects.addEffect(ViewFlashEffect.SaveFile());
      },
    );

    // 减小体积
    await this.project.keyBinds.create("alignNodesToInteger", "i n t j", () => {
      const entities = this.project.stageManager.getConnectableEntity();
      for (const entity of entities) {
        const leftTopLocation = entity.collisionBox.getRectangle().location;
        const IntLocation = new Vector(Math.round(leftTopLocation.x), Math.round(leftTopLocation.y));
        entity.moveTo(IntLocation);
      }
    });

    // 做计划的功能
    await this.project.keyBinds.create("toggleCheckmarkOnTextNodes", "o k k", () => {
      const selectedTextNodes = this.project.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof TextNode);
      for (const node of selectedTextNodes) {
        if (node.color.equals(new Color(59, 114, 60))) {
          node.rename(node.text.replace("✅ ", ""));
          node.color = Color.Transparent;
        } else {
          node.rename("✅ " + node.text);
          node.color = new Color(59, 114, 60);
        }
        this.project.controllerUtils.finishChangeTextNode(node);
      }
      this.project.stageManager.updateReferences();
    });

    // 反转选中图片的颜色
    await this.project.keyBinds.create("reverseImageColors", "r r r", () => {
      const selectedImageNodes: ImageNode[] = this.project.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof ImageNode);
      for (const node of selectedImageNodes) {
        node.reverseColors();
      }
      if (selectedImageNodes.length > 0) {
        toast(`已反转 ${selectedImageNodes.length} 张图片的颜色`);
      }
    });

    // 主题切换相关功能
    // 创建一个可以在非React环境中使用的setter函数
    const setTheme = (theme: string) => {
      // 直接使用Settings的原始set方法
      Settings.theme = theme;

      // 确保主题CSS立即应用到UI
      let styleEl = document.querySelector("#pg-theme");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "pg-theme";
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        :root {
          ${Themes.convertThemeToCSS(Themes.getThemeById(theme)?.content)}
        }
      `;

      // 手动更新StageStyleManager，确保Canvas层样式同步更新
      const stageStyleManager = this.project.getService("stageStyleManager");
      if (stageStyleManager) {
        stageStyleManager.currentStyle = StageStyle.styleFromTheme(theme);
      }

      // 触发项目重绘，确保Canvas立即更新
      this.project.loop();
    };

    await this.project.keyBinds.create("switchToDarkTheme", "b l a c k k", () => {
      toast.info("切换到暗黑主题");
      setTheme("dark");
    });

    await this.project.keyBinds.create("switchToLightTheme", "w h i t e e", () => {
      toast.info("切换到明亮主题");
      setTheme("light");
    });

    await this.project.keyBinds.create("switchToParkTheme", "p a r k k", () => {
      toast.info("切换到公园主题");
      setTheme("park");
    });

    await this.project.keyBinds.create("switchToMacaronTheme", "m k l m k l", () => {
      toast.info("切换到马卡龙主题");
      setTheme("macaron");
    });

    await this.project.keyBinds.create("switchToMorandiTheme", "m l d m l d", () => {
      toast.info("切换到莫兰迪主题");
      setTheme("morandi");
    });

    // 画笔相关快捷键
    await this.project.keyBinds.create("increasePenAlpha", "p s a + +", async () => {
      this.project.controller.penStrokeDrawing.changeCurrentStrokeColorAlpha(0.1);
    });

    await this.project.keyBinds.create("decreasePenAlpha", "p s a - -", async () => {
      this.project.controller.penStrokeDrawing.changeCurrentStrokeColorAlpha(-0.1);
    });

    // 对齐相关快捷键
    await this.project.keyBinds.create("alignTop", "8 8", () => {
      this.project.layoutManager.alignTop();
      this.project.stageManager.changeSelectedEdgeConnectLocation(Direction.Up, true);
      this.project.stageManager.changeSelectedEdgeConnectLocation(Direction.Down);
    });

    await this.project.keyBinds.create("alignBottom", "2 2", () => {
      this.project.layoutManager.alignBottom();
      this.project.stageManager.changeSelectedEdgeConnectLocation(Direction.Down, true);
      this.project.stageManager.changeSelectedEdgeConnectLocation(Direction.Up);
    });

    await this.project.keyBinds.create("alignLeft", "4 4", () => {
      this.project.layoutManager.alignLeft();
      this.project.stageManager.changeSelectedEdgeConnectLocation(Direction.Left, true);
      this.project.stageManager.changeSelectedEdgeConnectLocation(Direction.Right);
    });

    await this.project.keyBinds.create("alignRight", "6 6", () => {
      this.project.layoutManager.alignRight();
      this.project.stageManager.changeSelectedEdgeConnectLocation(Direction.Right, true);
      this.project.stageManager.changeSelectedEdgeConnectLocation(Direction.Left);
    });

    await this.project.keyBinds.create("alignHorizontalSpaceBetween", "4 6 4 6", () => {
      this.project.layoutManager.alignHorizontalSpaceBetween();
    });

    await this.project.keyBinds.create("alignVerticalSpaceBetween", "8 2 8 2", () => {
      this.project.layoutManager.alignVerticalSpaceBetween();
    });

    await this.project.keyBinds.create("alignCenterHorizontal", "5 4 6", () => {
      this.project.layoutManager.alignCenterHorizontal();
    });

    await this.project.keyBinds.create("alignCenterVertical", "5 8 2", () => {
      this.project.layoutManager.alignCenterVertical();
    });

    await this.project.keyBinds.create("alignLeftToRightNoSpace", "4 5 6", () => {
      this.project.layoutManager.alignLeftToRightNoSpace();
    });

    await this.project.keyBinds.create("alignTopToBottomNoSpace", "8 5 2", () => {
      this.project.layoutManager.alignTopToBottomNoSpace();
    });

    // 全连接
    await this.project.keyBinds.create("connectAllSelectedEntities", "- - a l l", () => {
      const selectedNodes = this.project.stageManager.getSelectedEntities();
      for (let i = 0; i < selectedNodes.length; i++) {
        for (let j = 0; j < selectedNodes.length; j++) {
          const fromNode = selectedNodes[i];
          const toNode = selectedNodes[j];
          if (fromNode === toNode) continue;
          if (fromNode instanceof ConnectableEntity && toNode instanceof ConnectableEntity) {
            this.project.stageManager.connectEntity(fromNode, toNode, false);
          }
        }
      }
    });

    // 向右连接
    await this.project.keyBinds.create("connectLeftToRight", "- - r i g h t", () => {
      const selectedNodes = this.project.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ConnectableEntity);
      if (selectedNodes.length <= 1) return;
      selectedNodes.sort((a, b) => a.collisionBox.getRectangle().location.x - b.collisionBox.getRectangle().location.x);
      for (let i = 0; i < selectedNodes.length - 1; i++) {
        const fromNode = selectedNodes[i];
        const toNode = selectedNodes[i + 1];
        if (fromNode === toNode) continue;
        this.project.stageManager.connectEntity(fromNode, toNode, false);
      }
    });

    await this.project.keyBinds.create("connectTopToBottom", "- - d o w n", () => {
      const selectedNodes = this.project.stageManager
        .getSelectedEntities()
        .filter((entity) => entity instanceof ConnectableEntity);
      if (selectedNodes.length <= 1) return;
      selectedNodes.sort((a, b) => a.collisionBox.getRectangle().location.y - b.collisionBox.getRectangle().location.y);
      for (let i = 0; i < selectedNodes.length - 1; i++) {
        const fromNode = selectedNodes[i];
        const toNode = selectedNodes[i + 1];
        if (fromNode === toNode) continue;
        this.project.stageManager.connectEntity(fromNode, toNode, false);
      }
    });

    await this.project.keyBinds.create("selectAllEdges", "+ e d g e", () => {
      const selectedEdges = this.project.stageManager.getAssociations();
      const viewRect = this.project.renderer.getCoverWorldRectangle();
      for (const edge of selectedEdges) {
        if (this.project.renderer.isOverView(viewRect, edge)) continue;
        edge.isSelected = true;
      }
    });

    await this.project.keyBinds.create("colorSelectedRed", "; r e d", () => {
      const selectedStageObject = this.project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          obj.color = new Color(239, 68, 68);
        }
      }
    });

    await this.project.keyBinds.create("increaseBrightness", "b .", () => {
      const selectedStageObject = this.project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
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

    await this.project.keyBinds.create("decreaseBrightness", "b ,", () => {
      const selectedStageObject = this.project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
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

    await this.project.keyBinds.create("gradientColor", "; ,", () => {
      const selectedStageObject = this.project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          if (obj.color.a === 0) continue;
          const oldColor = obj.color.clone();
          obj.color = new Color(Math.max(oldColor.a - 20, 0), Math.min(255, oldColor.g + 20), oldColor.b, oldColor.a);
        }
      }
    });

    await this.project.keyBinds.create("changeColorHueUp", "A-S-arrowup", () => {
      const selectedStageObject = this.project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          if (obj.color.a === 0) continue;
          const oldColor = obj.color.clone();
          obj.color = oldColor.changeHue(30);
        }
      }
    });
    await this.project.keyBinds.create("changeColorHueDown", "A-S-arrowdown", () => {
      const selectedStageObject = this.project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
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
    await this.project.keyBinds.create("changeColorHueMajorUp", "A-S-home", () => {
      const selectedStageObject = this.project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
      for (const obj of selectedStageObject) {
        if (obj instanceof TextNode) {
          if (obj.color.a === 0) continue;
          const oldColor = obj.color.clone();
          obj.color = oldColor.changeHue(90);
        }
      }
    });
    await this.project.keyBinds.create("changeColorHueMajorDown", "A-S-end", () => {
      const selectedStageObject = this.project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
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

    await this.project.keyBinds.create("toggleTextNodeSizeMode", "t t t", () => {
      const selectedTextNodes = this.project.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof TextNode);
      for (const node of selectedTextNodes) {
        if (node.sizeAdjust === "auto") {
          node.sizeAdjust = "manual";
          node.resizeHandle(Vector.getZero());
        } else if (node.sizeAdjust === "manual") {
          node.sizeAdjust = "auto";
          node.forceAdjustSizeByText();
        }
      }
    });

    await this.project.keyBinds.create("splitTextNodes", "k e i", () => {
      // 获取所有选中的文本节点
      const selectedTextNodes = this.project.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof TextNode);
      selectedTextNodes.forEach((node) => {
        node.isSelected = false;
      });
      setTimeout(() => {
        Dialog.input("请输入分割符（n代表一个换行符，t代表一个制表符）").then((userInput) => {
          if (userInput === undefined || userInput === "") return;
          userInput = userInput.replaceAll("n", "\n");
          userInput = userInput.replaceAll("t", "\t");
          for (const node of selectedTextNodes) {
            const text = node.text;
            const seps = [userInput];
            const escapedSeps = seps.map((sep) => sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
            const regex = new RegExp(escapedSeps.join("|"), "g");
            const splitedTextList = text.split(regex).filter((item) => item !== "");
            const putLocation = node.collisionBox.getRectangle().location.clone();
            const newNodes = [];
            for (const splitedText of splitedTextList) {
              const newTextNode = new TextNode(this.project, {
                uuid: v4(),
                text: splitedText,
                collisionBox: new CollisionBox([
                  new Rectangle(new Vector(putLocation.x, putLocation.y), new Vector(1, 1)),
                ]),
                color: node.color.clone(),
              });
              newNodes.push(newTextNode);
              this.project.stageManager.add(newTextNode);
              putLocation.y += 100;
            }
            newNodes.forEach((newNode) => {
              newNode.isSelected = true;
            });
            this.project.layoutManager.alignTopToBottomNoSpace();
            newNodes.forEach((newNode) => {
              newNode.isSelected = false;
            });
          }
          // 删除所有选中的文本节点
          this.project.stageManager.deleteEntities(selectedTextNodes);
        });
      });
    });

    await this.project.keyBinds.create("mergeTextNodes", "r u a", () => {
      let selectedTextNodes = this.project.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof TextNode);
      if (selectedTextNodes.length <= 1) {
        toast.error("rua的节点数量不能小于2");
        return;
      }
      selectedTextNodes = selectedTextNodes.sort(
        (a, b) => a.collisionBox.getRectangle().location.y - b.collisionBox.getRectangle().location.y,
      );
      let mergeText = "";
      let mergeDetails = "";
      for (const textNode of selectedTextNodes) {
        mergeText += textNode.text + "\n";
        mergeDetails += textNode.details;
      }
      mergeText = mergeText.trim();
      const leftTop = Rectangle.getBoundingRectangle(
        selectedTextNodes.map((node) => node.collisionBox.getRectangle()),
      ).leftTop;
      const avgColor = averageColors(selectedTextNodes.map((node) => node.color));
      const newTextNode = new TextNode(this.project, {
        uuid: v4(),
        text: mergeText,
        collisionBox: new CollisionBox([new Rectangle(new Vector(leftTop.x, leftTop.y), new Vector(400, 1))]),
        color: avgColor.clone(),
        sizeAdjust: "manual",
        details: mergeDetails,
      });
      this.project.stageManager.add(newTextNode);
      // 选中新的节点
      newTextNode.isSelected = true;
      this.project.stageManager.deleteEntities(selectedTextNodes);
    });

    await this.project.keyBinds.create("swapTextAndDetails", "e e e e e", () => {
      const selectedTextNodes = this.project.stageManager
        .getSelectedEntities()
        .filter((node) => node instanceof TextNode);
      for (const node of selectedTextNodes) {
        const details = node.details;
        const text = node.text;
        node.details = text;
        node.text = details;
        node.forceAdjustSizeByText();
      }
      this.project.historyManager.recordStep();
    });

    await this.project.keyBinds.create("switchStealthMode", "j a c k a l", () => {
      Settings.isStealthModeEnabled = !Settings.isStealthModeEnabled;
      toast(Settings.isStealthModeEnabled ? "已开启潜行模式" : "已关闭潜行模式");
    });
  }
}
