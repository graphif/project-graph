import { Dialog } from "@/components/ui/dialog";
import { Project } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { activeProjectAtom, projectsAtom, store } from "@/state";
import { Direction, directionToVector, reverseDirection } from "@/types/directions";
import { openBrowserOrFile } from "@/utils/externalOpen";
import { Color, Vector } from "@graphif/data-structures";
import { toast } from "sonner";
import { ColorSmartTools } from "../../dataManageService/colorSmartTools";
import { ConnectNodeSmartTools } from "../../dataManageService/connectNodeSmartTools";
import { TextNodeSmartTools } from "../../dataManageService/textNodeSmartTools";
import { RectangleSlideEffect } from "../../feedbackService/effectEngine/concrete/RectangleSlideEffect";
import { ViewOutlineFlashEffect } from "../../feedbackService/effectEngine/concrete/ViewOutlineFlashEffect";
import { onNewDraft } from "../../GlobalMenu";
import { Settings } from "../../Settings";
import { SubWindow } from "../../SubWindow";
import { MouseLocation } from "../MouseLocation";

export namespace Commands {
  const commands = new Map<string, (project?: Project, ...args: any[]) => void>();

  export function register(name: string, callback: (project?: Project, ...args: any[]) => void) {
    commands.set(name, callback);
  }

  export function execute(name: string, project?: Project, ...args: any[]) {
    const command = commands.get(name);
    if (command) {
      try {
        command(project, ...args);
      } catch (error) {
        toast.warning(`Error occurred while executing command ${name}: ${(error as Error).message}`);
      }
    } else {
      toast.warning(`Command ${name} not found`);
    }
  }

  register("test", () => {
    Dialog.buttons("测试快捷键", "您按下了自定义的测试快捷键，这一功能是测试开发所用，可在设置中更改触发方式", [
      { id: "close", label: "关闭" },
    ]);
  });
  register("openWindow", async (_project, windowClass: string | { open: (...args: any[]) => void }) => {
    if (typeof windowClass === "string") {
      const modules = import.meta.glob("@/sub/**/*.tsx", { eager: true });
      // 匹配SomeWindow.tsx或SomeWindow/index.tsx
      const matchedModule = Object.entries(modules).find(([path]) => {
        const regex = new RegExp(`/${windowClass}(\\.tsx|/index\\.tsx)$`);
        return regex.test(path);
      });
      if (matchedModule) {
        const module = matchedModule[1] as any;
        if (module && typeof module.default.open === "function") {
          module.default.open();
        } else {
          toast.error(`模块 ${windowClass} 中没有找到可用的 open 方法`);
        }
      } else {
        toast.error(`未找到窗口类 ${windowClass} 对应的模块`);
      }
    } else {
      windowClass.open();
    }
  });
  register("closeAllWindows", () => {
    SubWindow.closeAll();
  });
  register("toggleSetting", (_project, settingKey: keyof typeof Settings) => {
    if (typeof settingKey === "undefined") {
      throw new Error("settingKey parameter is required for toggleSetting command");
    }
    // @ts-expect-error ...
    Settings[settingKey] = !Settings[settingKey];
    toast.info(`设置 ${settingKey} 已切换为 ${Settings[settingKey]}`);
  });
  register("setSetting", (_project, settingKey: keyof typeof Settings, value: any) => {
    if (typeof settingKey === "undefined") {
      throw new Error("settingKey parameter is required for setSetting command");
    }
    // @ts-expect-error ...
    Settings[settingKey] = value;
    toast.info(`设置 ${settingKey} 已设置为 ${Settings[settingKey]}`);
  });
  register("undo", (project) => {
    project!.historyManager.undo();
  });
  register("redo", (project) => {
    project!.historyManager.redo();
  });
  register("copy", (project) => {
    project!.copyEngine.copy();
  });
  register("cut", (project) => {
    project!.copyEngine.cut();
  });
  register("paste", (project) => {
    project!.copyEngine.paste();
  });
  register("resetView", (project) => {
    project!.camera.saveCameraState();
    project!.camera.resetBySelected();
  });
  register("restoreCameraState", (project) => {
    project!.camera.restoreCameraState();
  });
  register("resetCameraScale", (project) => {
    project!.camera.restoreCameraState();
  });
  register("turnCameraPage", (project, direction: Direction) => {
    if (typeof direction === "undefined") {
      throw new Error("Direction parameter is required for turnCameraPage command");
    }
    project!.camera.pageMove(direction);
  });
  register("toggleSectionCollapse", (project) => {
    project!.stageManager.sectionSwitchCollapse();
  });
  register("packEntitiesToSection", (project) => {
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
  });
  register("toggleSectionLock", (project) => {
    const selectedSections = project!.stageManager.getSelectedEntities().filter((it) => it instanceof Section);
    for (const section of selectedSections) {
      section.locked = !section.locked;
      project!.sectionRenderer.render(section);
    }
    // 记录历史步骤
    project!.historyManager.recordStep();
  });
  register("reverseSelectedEdges", (project) => {
    project!.stageManager.reverseSelectedEdges();
  });
  register("reverseSelectedNodeEdge", (project) => {
    project!.stageManager.reverseSelectedNodeEdge();
  });
  register("createUndirectedEdgeFromEntities", (project) => {
    const selectedNodes = project!.stageManager
      .getSelectedEntities()
      .filter((node) => node instanceof ConnectableEntity);
    if (selectedNodes.length <= 1) {
      toast.error("至少选择两个可连接节点");
      return;
    }
    const multiTargetUndirectedEdge = MultiTargetUndirectedEdge.createFromSomeEntity(project!, selectedNodes);
    project!.stageManager.add(multiTargetUndirectedEdge);
  });
  register("deleteSelectedStageObjects", (project) => {
    project!.stageManager.deleteSelectedStageObjects();
  });
  register("createTextNodeFromCameraLocation", (project) => {
    project!.camera.clearMoveCommander();
    project!.camera.speed = Vector.getZero();
    project!.controllerUtils.addTextNodeByLocation(project!.camera.location, true, true);
  });
  register("createTextNodeFromMouseLocation", (project) => {
    project!.camera.clearMoveCommander();
    project!.camera.speed = Vector.getZero();
    project!.controllerUtils.addTextNodeByLocation(
      project!.renderer.transformView2World(MouseLocation.vector()),
      true,
      true,
    );
  });
  register("createTextNodeFromSelectedByDirection", (project, direction: Direction) => {
    if (typeof direction === "undefined") {
      throw new Error("Direction parameter is required for createTextNodeFromSelectedByDirection command");
    }
    project!.controllerUtils.addTextNodeFromCurrentSelectedNode(direction, true);
  });
  register("selectByDirection", (project, direction: Direction, additional: boolean) => {
    if (typeof direction === "undefined") {
      throw new Error("Direction parameter is required for selectByDirection command");
    }
    switch (direction) {
      case Direction.Up:
        project!.selectChangeEngine.selectUp(additional);
        break;
      case Direction.Down:
        project!.selectChangeEngine.selectDown(additional);
        break;
      case Direction.Left:
        project!.selectChangeEngine.selectLeft(additional);
        break;
      case Direction.Right:
        project!.selectChangeEngine.selectRight(additional);
        break;
    }
  });
  register("moveSelectedEntitiesByDirection", (project, direction: Direction) => {
    if (typeof direction === "undefined") {
      throw new Error("Direction parameter is required for moveSelectedEntitiesByDirection command");
    }
    const entities = project!.stageManager.getEntities().filter((e) => e.isSelected);
    if (entities.length > 0) {
      const rect = entities[0].collisionBox.getRectangle();
      const newRect = rect.clone();
      newRect.location.add(directionToVector(direction, 100));
      project!.effects.addEffect(
        direction === Direction.Up || direction === Direction.Down
          ? RectangleSlideEffect.verticalSlide(
              rect,
              newRect,
              project!.stageStyleManager.currentStyle.effects.successShadow,
            )
          : RectangleSlideEffect.horizontalSlide(
              rect,
              newRect,
              project!.stageStyleManager.currentStyle.effects.successShadow,
            ),
      );
    }
    project!.entityMoveManager.moveSelectedEntities(directionToVector(direction, 100));
  });
  register("jumpMoveSelectedEntitiesByDirection", (project, direction: Direction) => {
    if (typeof direction === "undefined") {
      throw new Error("Direction parameter is required for jumpMoveSelectedEntities command");
    }
    project!.entityMoveManager.jumpMoveSelectedConnectableEntities(directionToVector(direction, 100));
  });
  register("editEntityDetails", (project) => {
    project!.controllerUtils.editNodeDetailsByKeyboard();
  });
  register("selectAll", (project) => {
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
  });
  register("textNodeToSection", (project) => {
    project!.sectionPackManager.textNodeToSection();
  });
  register("unpackEntityFromSection", (project) => {
    project!.sectionPackManager.unpackSelectedSections();
  });
  register("openTextNodeByContentExternal", (project) => {
    project?.controller.pressingKeySet.clear(); // 防止打开prg文件时，ctrl+E持续按下
    openBrowserOrFile(project!);
  });
  register("cycleActiveProject", (_project, reverse: boolean = false) => {
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
    let activeProjectIndex = projects.indexOf(activeProject);
    if (activeProjectIndex === -1) {
      toast.error("当前活动项目不在项目列表中，无法切换项目");
      return;
    }
    if (reverse) {
      activeProjectIndex = (activeProjectIndex - 1 + projects.length) % projects.length;
    } else {
      activeProjectIndex = (activeProjectIndex + 1) % projects.length;
    }
    store.set(activeProjectAtom, projects[activeProjectIndex]);
  });
  register("closeCurrentProject", async (project) => {
    const projects = store.get(projectsAtom);
    await project!.dispose();
    const result = projects.filter((p) => p.prid !== project!.prid);
    const activeProjectIndex = projects.findIndex((p) => p.prid === project!.prid);
    if (result.length > 0) {
      if (activeProjectIndex === projects.length - 1) {
        store.set(activeProjectAtom, result[activeProjectIndex - 1]);
      } else {
        store.set(activeProjectAtom, result[activeProjectIndex]);
      }
    } else {
      store.set(activeProjectAtom, undefined);
    }
    store.set(projectsAtom, result);
  });
  register("newDraft", () => {
    onNewDraft();
  });
  register("expandSelectEntity", (project, keep: boolean, reverse: boolean) => {
    if (typeof keep === "undefined" || typeof reverse === "undefined") {
      throw new Error("keep and reverse parameters are required for expandSelectEntity command");
    }
    project!.selectChangeEngine.expandSelect(keep, reverse);
  });
  register("generateNodeTreeWithDeepMode", (project) => {
    project!.keyboardOnlyTreeEngine.onDeepGenerateNode();
  });
  register("generateNodeTreeWithBroadMode", (project) => {
    project!.keyboardOnlyTreeEngine.onBroadGenerateNode();
  });
  register("generateNodeGraph", (project) => {
    if (project!.keyboardOnlyGraphEngine.isCreating()) {
      project!.keyboardOnlyGraphEngine.createFinished();
    } else {
      if (project!.keyboardOnlyGraphEngine.isEnableVirtualCreate()) {
        project!.keyboardOnlyGraphEngine.createStart();
      }
    }
  });
  register("treeGraphAdjust", (project, selectedAsRoot: boolean) => {
    const entities = project!.stageManager
      .getSelectedEntities()
      .filter((entity) => entity instanceof ConnectableEntity);
    if (selectedAsRoot) {
      for (const entity of entities) {
        project!.autoAlign.autoLayoutSelectedFastTreeMode(entity);
      }
    } else {
      for (const entity of entities) {
        project!.keyboardOnlyTreeEngine.adjustTreeNode(entity);
      }
    }
    project?.controller.pressingKeySet.clear(); // 解决 mac 按下后容易卡键
  });
  register("dagGraphAdjust", (project) => {
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
  });
  register("gravityLayout", (project) => {
    project!.autoLayout.gravityLayoutTick();
  });
  register("setNodeTreeDirection", (project, direction: Direction) => {
    const entities = project!.stageManager
      .getSelectedEntities()
      .filter((entity) => entity instanceof ConnectableEntity);
    project?.keyboardOnlyTreeEngine.changePreDirection(entities, direction);
  });
  register("alignNodesToInteger", (project) => {
    const entities = project!.stageManager.getConnectableEntity();
    for (const entity of entities) {
      const leftTopLocation = entity.collisionBox.getRectangle().location;
      const IntLocation = new Vector(Math.round(leftTopLocation.x), Math.round(leftTopLocation.y));
      entity.moveTo(IntLocation);
    }
  });
  register("toggleCheckmarkOnTextNode", (project) => {
    TextNodeSmartTools.okk(project!);
  });
  register("toggleCheckErrorOnTextNode", (project) => {
    TextNodeSmartTools.err(project!);
  });
  register("reverseImageColor", (project) => {
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
  });
  register("adjustPenAlpha", (project, delta: number) => {
    project!.controller.penStrokeDrawing.changeCurrentStrokeColorAlpha(delta);
  });
  register("alignByDirection", (project, direction: Direction) => {
    switch (direction) {
      case Direction.Up:
        project!.layoutManager.alignTop();
        break;
      case Direction.Down:
        project!.layoutManager.alignBottom();
        break;
      case Direction.Left:
        project!.layoutManager.alignLeft();
        break;
      case Direction.Right:
        project!.layoutManager.alignRight();
        break;
    }
    const reversedDirection = reverseDirection(direction);
    project!.stageManager.changeSelectedEdgeConnectLocation(direction, true);
    project!.stageManager.changeSelectedEdgeConnectLocation(reversedDirection);
  });
  register("alignHorizontalSpaceBetween", (project) => {
    project!.layoutManager.alignHorizontalSpaceBetween();
  });
  register("alignVerticalSpaceBetween", (project) => {
    project!.layoutManager.alignVerticalSpaceBetween();
  });
  register("alignCenterHorizontal", (project) => {
    project!.layoutManager.alignCenterHorizontal();
  });
  register("alignCenterVertical", (project) => {
    project!.layoutManager.alignCenterVertical();
  });
  register("alignLeftToRightNoSpace", (project) => {
    project!.layoutManager.alignLeftToRightNoSpace();
  });
  register("alignTopToBottomNoSpace", (project) => {
    project!.layoutManager.alignTopToBottomNoSpace();
  });
  register("createConnectPointWhenDragConnecting", (project) => {
    project!.controller.nodeConnection.createConnectPointWhenConnect();
  });
  register("connectAllSelectedEntities", (project) => {
    ConnectNodeSmartTools.connectAll(project!);
  });
  register("connectLeftToRight", (project) => {
    ConnectNodeSmartTools.connectRight(project!);
  });
  register("connectTopToBottom", (project) => {
    ConnectNodeSmartTools.connectDown(project!);
  });
  register("selectAllEdges", (project) => {
    const selectedEdges = project!.stageManager.getAssociations();
    const viewRect = project!.renderer.getCoverWorldRectangle();
    for (const edge of selectedEdges) {
      if (project!.renderer.isOverView(viewRect, edge)) continue;
      edge.isSelected = true;
    }
  });
  register("colorSelectedRed", (project) => {
    const selectedStageObject = project!.stageManager.getStageObjects().filter((obj) => obj.isSelected);
    for (const obj of selectedStageObject) {
      if (obj instanceof TextNode) {
        obj.color = new Color(239, 68, 68);
      }
    }
  });
  register("adjustBrightness", (project, delta: number) => {
    ColorSmartTools.adjustBrightness(project!, delta);
  });
  register("gradientColor", (project) => {
    ColorSmartTools.gradientColor(project!);
  });
  register("adjustHue", (project, delta: number) => {
    ColorSmartTools.adjustHue(project!, delta);
  });
  register("toggleTextNodeSizeMode", (project) => {
    TextNodeSmartTools.ttt(project!);
  });
  register("splitTextNode", (project) => {
    TextNodeSmartTools.kei(project!);
  });
  register("mergeTextNodes", (project) => {
    TextNodeSmartTools.rua(project!);
  });
  register("swapTextAndDetails", (project) => {
    TextNodeSmartTools.exchangeTextAndDetails(project!);
  });
  register("removeFirstCharFromSelectedTextNodes", (project) => {
    TextNodeSmartTools.removeFirstCharFromSelectedTextNodes(project!);
  });
  register("removeLastCharFromSelectedTextNodes", (project) => {
    TextNodeSmartTools.removeLastCharFromSelectedTextNodes(project!);
  });
  register("adjustFontSizeLevel", (project, delta: number) => {
    const selectedTextNodes = project!.stageManager
      .getSelectedEntities()
      .filter((node) => node instanceof TextNode) as TextNode[];
    if (selectedTextNodes.length === 0) return;
    project!.historyManager.recordStep();
    for (const node of selectedTextNodes) {
      node.adjustFontScaleLevel(delta, TextNodeSmartTools.getAnchorRateForTextNode(project!, node));
    }
  });
  register("insertNodeToTree", (project) => {
    ConnectNodeSmartTools.insertNodeToTree(project!);
  });
  register("removeNodeFromTree", (project) => {
    ConnectNodeSmartTools.removeNodeFromTree(project!);
  });
  register("selectAtCrosshair", (project, keep: boolean) => {
    const worldLocation = project!.camera.location.clone();
    const entity = project!.stageManager.findEntityByLocation(worldLocation);
    if (entity) {
      if (!project!.sectionMethods.isObjectBeLockedBySection(entity)) {
        if (keep) {
          entity.isSelected = !entity.isSelected;
        } else {
          // 单一选择：先取消所有选中
          project!.stageManager.clearSelectAll();
          entity.isSelected = true;
        }
      }
    }
  });
}
