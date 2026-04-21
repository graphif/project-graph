import { Random } from "@/core/algorithm/random";
import { Project, service } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { SyncAssociationRenderer } from "@/core/render/canvas2d/utilsRenderer/SyncAssociationRenderer";
import {
  getLogicNodeRenderName,
  LogicNodeNameEnum,
  LogicNodeNameToRenderNameMap,
} from "@/core/service/dataGenerateService/autoComputeEngine/logicNodeNameEnum";
import { Settings } from "@/core/service/Settings";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Color, colorInvert, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { formatKeyBindSequenceToString } from "@/utils/keyDisplay";
import { getTextSize } from "@/utils/font";
import i18next from "i18next";

@service("textNodeRenderer")
export class TextNodeRenderer {
  // 初始化时监听设置变化
  constructor(private readonly project: Project) {}

  renderTextNode(node: TextNode) {
    // 检查是否是逻辑节点
    const isLogicNode = this.project.autoComputeUtils.isNameIsLogicNode(node.text);

    // 节点身体矩形
    let fillColor = node.color;
    let renderedFontSize = node.getFontSize() * this.project.camera.currentScale;
    if (renderedFontSize < Settings.ignoreTextNodeTextRenderLessThanFontSize && fillColor.a === 0) {
      const color = this.project.stageStyleManager.currentStyle.StageObjectBorder.clone();
      color.a = 0.2;
      fillColor = color;
    }
    const borderColor = Settings.showTextNodeBorder
      ? this.project.stageStyleManager.currentStyle.StageObjectBorder
      : Color.Transparent;

    // 渲染节点背景（逻辑节点和非逻辑节点都使用相同的背景）
    this.project.shapeRenderer.renderRect(
      new Rectangle(
        this.project.renderer.transformWorld2View(node.rectangle.location),
        node.rectangle.size.multiply(this.project.camera.currentScale),
      ),
      fillColor,
      borderColor,
      2 * this.project.camera.currentScale,
      Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale,
    );

    // 如果是逻辑节点，在内部边缘绘制标记
    if (isLogicNode) {
      this.renderLogicNodeWarningTrap(node);
    }

    // 视野缩放过小就不渲染内部文字
    renderedFontSize = node.getFontSize() * this.project.camera.currentScale;
    if (renderedFontSize > Settings.ignoreTextNodeTextRenderLessThanFontSize) {
      this.renderTextNodeTextLayer(node);
    }

    if (node.isSelected) {
      // 在外面增加一个框
      this.project.collisionBoxRenderer.render(
        node.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
      // 改变大小的拖拽
      if (node.sizeAdjust === "manual") {
        const resizeHandleRect = node.getResizeHandleRect();
        const viewResizeHandleRect = this.project.renderer.transformWorld2View(resizeHandleRect);
        this.project.shapeRenderer.renderRect(
          viewResizeHandleRect,
          this.project.stageStyleManager.currentStyle.CollideBoxSelected,
          this.project.stageStyleManager.currentStyle.StageObjectBorder,
          2 * this.project.camera.currentScale,
          8 * this.project.camera.currentScale,
        );
        // 渲染箭头指示
        this.project.shapeRenderer.renderResizeArrow(
          viewResizeHandleRect,
          this.project.stageStyleManager.currentStyle.StageObjectBorder,
          2 * this.project.camera.currentScale,
        );
      }
      // 渲染键盘树形模式方向提示（仅在键盘操作模式下且非编辑状态时显示）
      if (this.project.keyboardOnlyEngine.isOpenning() && !node.isEditing && Settings.showTreeDirectionHint) {
        this.renderKeyboardTreeHint(node);
      }

      // 渲染孪生同步关系的星形虚线（以选中节点为中心，连向所有孪生兄弟的中心）
      SyncAssociationRenderer.renderSyncLines(this.project, node);
    }
    if (node.isAiGenerating) {
      const borderColor = this.project.stageStyleManager.currentStyle.CollideBoxSelected.clone();
      borderColor.a = Random.randomFloat(0.2, 1);
      // 在外面增加一个框
      this.project.shapeRenderer.renderRect(
        new Rectangle(
          this.project.renderer.transformWorld2View(node.rectangle.location),
          node.rectangle.size.multiply(this.project.camera.currentScale),
        ),
        node.color,
        borderColor,
        Random.randomFloat(1, 10) * this.project.camera.currentScale,
        Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale,
      );
    }
    // 用户不建议放大标签，所以这里注释掉了，但又有用户觉得这个也挺好，所以加个设置项
    if (Settings.enableTagTextNodesBigDisplay) {
      // TODO：标签待做，这里先注释掉
      // if (this.project.stageManager.TagOptions.getTagUUIDs().includes(node.uuid)) {
      //   if (this.project.camera.currentScale < 0.25) {
      //     const scaleRate = 5;
      //     const rect = node.collisionBox.getRectangle();
      //     const rectBgc =
      //       node.color.a === 0 ? this.project.stageStyleManager.currentStyle.Background.clone() : node.color.clone();
      //     rectBgc.a = 0.5;
      //     this.project.shapeRenderer.renderRectFromCenter(
      //       this.project.renderer.transformWorld2View(rect.center),
      //       rect.width * scaleRate * this.project.camera.currentScale,
      //       rect.height * scaleRate * this.project.camera.currentScale,
      //       rectBgc,
      //       this.project.stageStyleManager.currentStyle.StageObjectBorder,
      //       2 * this.project.camera.currentScale,
      //       Renderer.NODE_ROUNDED_RADIUS * scaleRate * this.project.camera.currentScale,
      //     );
      //     this.project.textRenderer.renderTextFromCenter(
      //       node.text,
      //       this.project.renderer.transformWorld2View(rect.center),
      //       Renderer.FONT_SIZE * scaleRate * this.project.camera.currentScale,
      //       this.project.stageStyleManager.currentStyle.StageObjectBorder,
      //     );
      //   }
      // }
    }
  }

  /**
   * 渲染键盘树形模式下的方向提示：
   * - 当前预测生长方向：显示 "tab→/←/↑/↓"（绿色高亮）
   * - 其余三个方向：显示对应的方向切换快捷键，颜色较淡
   * - 广度生长：显示反斜杠快捷键
   * 布局要求：
   * - 顶部和底部提示：居中对齐，标题和快捷键分两行显示
   * - 左侧提示：文字右侧紧贴节点左侧，标题和快捷键分两行显示
   * - 右侧提示：文字左侧紧贴节点右侧，标题和快捷键分两行显示
   * - 标题字体很小，快捷键字体稍大
   */
  private renderKeyboardTreeHint(node: TextNode): void {
    const direction = this.project.keyboardOnlyTreeEngine.getNodePreDirection(node);
    const rect = node.collisionBox.getRectangle();
    const GAP = 25;

    const tabColor = this.project.stageStyleManager.currentStyle.CollideBoxSelected.clone();
    tabColor.a = 0.8;
    const hintColor = this.project.stageStyleManager.currentStyle.StageObjectBorder.clone();
    hintColor.a = 0.45;

    // 从 KeyBindsUI 获取实际的快捷键
    const allUIKeyBinds = KeyBindsUI.getAllUIKeyBinds();
    const getKeyById = (id: string): string => {
      const keyBind = allUIKeyBinds.find((kb) => kb.id === id);
      return keyBind ? formatKeyBindSequenceToString(keyBind.key, "+", ",") : id;
    };

    // 获取快捷键标题
    const getKeyTitle = (id: string): string => {
      return i18next.t(`${id}.title`, { ns: "keyBinds", defaultValue: "" });
    };

    const tabKey = getKeyById("generateNodeTreeWithDeepMode");
    const backslashKey = getKeyById("generateNodeTreeWithBroadMode");

    // 字体大小设置
    const titleFontSize = 8; // 标题字体很小
    const keyFontSizeActive = 14; // 当前方向快捷键字体
    const keyFontSizeInactive = 10; // 非当前方向快捷键字体

    // 获取进入编辑模式的快捷键设置
    const startEditMode = Settings.textNodeStartEditMode;
    const startEditKeyMap: Record<string, string> = {
      enter: "Enter",
      ctrlEnter: "Ctrl + Enter",
      altEnter: "Alt + Enter",
      shiftEnter: "Shift + Enter",
      space: "Space",
    };
    const startEditKey = startEditKeyMap[startEditMode] || "Enter";
    const startEditTitle = i18next.t("editModeHint.startEditTitle", { ns: "common", defaultValue: "" });

    // 渲染进入编辑模式提示（在顶部更上方）
    const editModeGap = GAP + 35; // 比顶部提示更上方
    const editModeBasePos = rect.topCenter.add(new Vector(0, -editModeGap));
    const editModeViewPos = this.project.renderer.transformWorld2View(editModeBasePos);
    const editModeColor = hintColor;

    // 渲染标题（第一行）
    if (startEditTitle) {
      const editModeTitlePos = editModeViewPos.subtract(
        new Vector(0, keyFontSizeInactive * this.project.camera.currentScale),
      );
      this.project.textRenderer.renderTextFromCenter(
        startEditTitle,
        editModeTitlePos,
        titleFontSize * this.project.camera.currentScale,
        editModeColor,
      );
    }
    // 渲染快捷键（第二行）
    const doubleClickText = i18next.t("editModeHint.doubleClick", { ns: "common", defaultValue: "双击" });
    const orText = i18next.t("editModeHint.or", { ns: "common", defaultValue: "或" });
    const editModeKeyText = `${doubleClickText} ${orText} ${startEditKey}`;
    this.project.textRenderer.renderTextFromCenter(
      editModeKeyText,
      editModeViewPos,
      keyFontSizeInactive * this.project.camera.currentScale,
      editModeColor,
    );

    // 顶部提示：居中对齐，分两行
    const upKey = direction === "up" ? `${tabKey}↑` : getKeyById("setNodeTreeDirectionUp");
    const upTitle = getKeyTitle(direction === "up" ? "generateNodeTreeWithDeepMode" : "setNodeTreeDirectionUp");
    const upKeyFontSize = direction === "up" ? keyFontSizeActive : keyFontSizeInactive;
    const upColor = direction === "up" ? tabColor : hintColor;
    const upBasePos = rect.topCenter.add(new Vector(0, -GAP));
    const upViewPos = this.project.renderer.transformWorld2View(upBasePos);

    // 渲染标题（第一行）
    if (upTitle) {
      const upTitlePos = upViewPos.subtract(new Vector(0, upKeyFontSize * this.project.camera.currentScale));
      this.project.textRenderer.renderTextFromCenter(
        upTitle,
        upTitlePos,
        titleFontSize * this.project.camera.currentScale,
        upColor,
      );
    }
    // 渲染快捷键（第二行）
    this.project.textRenderer.renderTextFromCenter(
      upKey,
      upViewPos,
      upKeyFontSize * this.project.camera.currentScale,
      upColor,
    );

    // 底部提示：居中对齐，分两行
    const downKey = direction === "down" ? `${tabKey}↓` : getKeyById("setNodeTreeDirectionDown");
    const downTitle = getKeyTitle(direction === "down" ? "generateNodeTreeWithDeepMode" : "setNodeTreeDirectionDown");
    const downKeyFontSize = direction === "down" ? keyFontSizeActive : keyFontSizeInactive;
    const downColor = direction === "down" ? tabColor : hintColor;
    const downBasePos = rect.bottomCenter.add(new Vector(0, GAP));
    const downViewPos = this.project.renderer.transformWorld2View(downBasePos);

    // 渲染标题（第一行）
    if (downTitle) {
      this.project.textRenderer.renderTextFromCenter(
        downTitle,
        downViewPos,
        titleFontSize * this.project.camera.currentScale,
        downColor,
      );
    }
    // 渲染快捷键（第二行，在标题下方）
    const downKeyPos = downViewPos.add(new Vector(0, titleFontSize * this.project.camera.currentScale));
    this.project.textRenderer.renderTextFromCenter(
      downKey,
      downKeyPos,
      downKeyFontSize * this.project.camera.currentScale,
      downColor,
    );

    // 左侧提示：文字右侧紧贴节点左侧，分两行
    const leftKey = direction === "left" ? `${tabKey}←` : getKeyById("setNodeTreeDirectionLeft");
    const leftTitle = getKeyTitle(direction === "left" ? "generateNodeTreeWithDeepMode" : "setNodeTreeDirectionLeft");
    const leftKeyFontSize = direction === "left" ? keyFontSizeActive : keyFontSizeInactive;
    const leftColor = direction === "left" ? tabColor : hintColor;
    const leftBasePos = rect.leftCenter.add(new Vector(-GAP, 0));
    const leftViewPos = this.project.renderer.transformWorld2View(leftBasePos);

    // 计算快捷键文字尺寸
    const leftKeySize = getTextSize(leftKey, leftKeyFontSize * this.project.camera.currentScale);
    const leftTitleSize = leftTitle
      ? getTextSize(leftTitle, titleFontSize * this.project.camera.currentScale)
      : { x: 0, y: 0 };

    // 渲染标题（第一行，在快捷键上方）
    if (leftTitle) {
      const leftTitlePos = leftViewPos.subtract(new Vector(leftTitleSize.x, leftKeySize.y / 2 + leftTitleSize.y));
      this.project.textRenderer.renderText(
        leftTitle,
        leftTitlePos,
        titleFontSize * this.project.camera.currentScale,
        leftColor,
      );
    }
    // 渲染快捷键（第二行）
    const leftKeyPos = leftViewPos.subtract(new Vector(leftKeySize.x, leftKeySize.y / 2));
    this.project.textRenderer.renderText(
      leftKey,
      leftKeyPos,
      leftKeyFontSize * this.project.camera.currentScale,
      leftColor,
    );

    // 右侧提示：文字左侧紧贴节点右侧，分两行
    const rightKey = direction === "right" ? `${tabKey}→` : getKeyById("setNodeTreeDirectionRight");
    const rightTitle = getKeyTitle(
      direction === "right" ? "generateNodeTreeWithDeepMode" : "setNodeTreeDirectionRight",
    );
    const rightKeyFontSize = direction === "right" ? keyFontSizeActive : keyFontSizeInactive;
    const rightColor = direction === "right" ? tabColor : hintColor;
    const rightBasePos = rect.rightCenter.add(new Vector(GAP, 0));
    const rightViewPos = this.project.renderer.transformWorld2View(rightBasePos);

    // 计算快捷键文字尺寸
    const rightKeySize = getTextSize(rightKey, rightKeyFontSize * this.project.camera.currentScale);
    const rightTitleSize = rightTitle
      ? getTextSize(rightTitle, titleFontSize * this.project.camera.currentScale)
      : { x: 0, y: 0 };

    // 渲染标题（第一行，在快捷键上方）
    if (rightTitle) {
      const rightTitlePos = rightViewPos.subtract(new Vector(0, rightKeySize.y / 2 + rightTitleSize.y));
      this.project.textRenderer.renderText(
        rightTitle,
        rightTitlePos,
        titleFontSize * this.project.camera.currentScale,
        rightColor,
      );
    }
    // 渲染快捷键（第二行）
    const rightKeyPos = rightViewPos.subtract(new Vector(0, rightKeySize.y / 2));
    this.project.textRenderer.renderText(
      rightKey,
      rightKeyPos,
      rightKeyFontSize * this.project.camera.currentScale,
      rightColor,
    );

    // 反斜杠（\）广度生长：渲染在节点的左下角，远离四个方向提示
    const parents = this.project.graphMethods.nodeParentArray(node);
    if (parents.length === 1) {
      // 将提示渲染在节点左下角，间距较小以贴近节点
      const CORNER_GAP_X = 15;
      const CORNER_GAP_Y = 15;
      // 渲染在节点左下角
      const previewLocation = rect.leftBottom.add(new Vector(-CORNER_GAP_X, CORNER_GAP_Y));
      const previewViewPos = this.project.renderer.transformWorld2View(previewLocation);

      // 获取反斜杠快捷键的标题
      const backslashTitle = getKeyTitle("generateNodeTreeWithBroadMode");
      const backslashKeySize = getTextSize(backslashKey, keyFontSizeInactive * this.project.camera.currentScale);
      const backslashTitleSize = backslashTitle
        ? getTextSize(backslashTitle, titleFontSize * this.project.camera.currentScale)
        : { x: 0, y: 0 };

      // 渲染标题（第一行）
      if (backslashTitle) {
        const backslashTitlePos = previewViewPos.subtract(
          new Vector(backslashTitleSize.x, backslashKeySize.y / 2 + backslashTitleSize.y),
        );
        this.project.textRenderer.renderText(
          backslashTitle,
          backslashTitlePos,
          titleFontSize * this.project.camera.currentScale,
          hintColor,
        );
      }
      // 渲染快捷键（第二行）
      const backslashKeyPos = previewViewPos.subtract(new Vector(backslashKeySize.x, backslashKeySize.y / 2));
      this.project.textRenderer.renderText(
        backslashKey,
        backslashKeyPos,
        keyFontSizeInactive * this.project.camera.currentScale,
        hintColor,
      );
    }
  }

  /**
   * 为逻辑节点在内部边缘绘制「」标记
   */
  private renderLogicNodeWarningTrap(node: TextNode) {
    const scale = this.project.camera.currentScale;
    const nodeViewRect = new Rectangle(
      this.project.renderer.transformWorld2View(node.rectangle.location),
      node.rectangle.size.multiply(scale),
    );

    // 使用样式管理器中的边框颜色
    const markerColor = this.project.stageStyleManager.currentStyle.effects.successShadow.toNewAlpha(0.5);
    const lineWidth = 6 * scale;

    // 计算内边缘的位置（距离边界有一定间距）
    const padding = 10 * scale;
    const innerLeft = nodeViewRect.left + padding;
    const innerRight = nodeViewRect.right - padding;
    const innerTop = nodeViewRect.top + padding;
    const innerBottom = nodeViewRect.bottom - padding;
    const middleX = (innerLeft + innerRight) / 2;

    // 左侧标记「
    // |
    this.project.curveRenderer.renderSolidLine(
      new Vector(innerLeft, innerTop),
      new Vector(innerLeft, innerBottom),
      markerColor,
      lineWidth,
    );
    // 绘制左侧横线
    this.project.curveRenderer.renderSolidLine(
      new Vector(innerLeft, innerTop),
      new Vector(middleX, innerTop),
      markerColor,
      lineWidth,
    );

    // 右侧标记」
    // |
    this.project.curveRenderer.renderSolidLine(
      new Vector(innerRight, innerTop),
      new Vector(innerRight, innerBottom),
      markerColor,
      lineWidth,
    );
    // 绘制右侧横线
    this.project.curveRenderer.renderSolidLine(
      new Vector(innerRight, innerBottom),
      new Vector(middleX, innerBottom),
      markerColor,
      lineWidth,
    );
  }

  /**
   * 画节点文字层信息
   * @param node
   */
  private renderTextNodeTextLayer(node: TextNode) {
    // 编辑状态
    if (node.isEditing) {
      // 编辑状态下，在节点顶部显示"正在编辑模式"，底部显示换行和退出提示
      const hintColor = this.project.stageStyleManager.currentStyle.StageObjectBorder.clone();
      hintColor.a = 0.5;
      const titleColor = this.project.stageStyleManager.currentStyle.CollideBoxSelected.clone();
      titleColor.a = 0.8;

      // 快捷键映射
      const keyMap: Record<string, string> = {
        enter: "Enter",
        ctrlEnter: "Ctrl + Enter",
        altEnter: "Alt + Enter",
        shiftEnter: "Shift + Enter",
      };

      // 读取设置
      const lineBreakKey = keyMap[Settings.textNodeContentLineBreak] || "Shift + Enter";
      const exitEditKey = keyMap[Settings.textNodeExitEditMode] || "Enter";

      // 获取翻译
      const editingModeTitle = i18next.t("editModeHint.editingMode", { ns: "common", defaultValue: "正在编辑模式" });
      const lineBreakTitle = i18next.t("editModeHint.lineBreak", { ns: "common", defaultValue: "换行" });
      const exitEditTitle = i18next.t("editModeHint.exitEdit", { ns: "common", defaultValue: "退出编辑模式" });
      const orText = i18next.t("editModeHint.or", { ns: "common", defaultValue: "或" });

      const titleFontSize = 10;
      const keyFontSize = 12;

      // 顶部显示"正在编辑模式"
      this.project.textRenderer.renderTextFromCenter(
        editingModeTitle,
        this.project.renderer.transformWorld2View(node.rectangle.topCenter.add(new Vector(0, -15))),
        titleFontSize * this.project.camera.currentScale,
        titleColor,
      );

      // 底部第一行：换行提示
      const lineBreakText = `${lineBreakKey} ${lineBreakTitle}`;
      this.project.textRenderer.renderTextFromCenter(
        lineBreakText,
        this.project.renderer.transformWorld2View(node.rectangle.bottomCenter.add(new Vector(0, 20))),
        keyFontSize * this.project.camera.currentScale,
        hintColor,
      );

      // 底部第二行：退出编辑模式提示
      const exitEditText = `Esc ${orText} ${exitEditKey} ${exitEditTitle}`;
      this.project.textRenderer.renderTextFromCenter(
        exitEditText,
        this.project.renderer.transformWorld2View(node.rectangle.bottomCenter.add(new Vector(0, 35))),
        keyFontSize * this.project.camera.currentScale,
        hintColor,
      );
      return;
    }

    const fontSize = node.getFontSize() * this.project.camera.currentScale;

    if (node.text === undefined) {
      this.project.textRenderer.renderTextFromCenter(
        "undefined",
        this.project.renderer.transformWorld2View(node.rectangle.center),
        fontSize,
        node.color.a === 1
          ? colorInvert(node.color)
          : colorInvert(this.project.stageStyleManager.currentStyle.Background),
      );
    } else if (this.project.autoComputeUtils.isNameIsLogicNode(node.text)) {
      // 检查下是不是逻辑节点
      let isFindLogicName = false;
      for (const key of Object.keys(LogicNodeNameToRenderNameMap)) {
        if (node.text === key) {
          isFindLogicName = true;
          const logicNodeName = key as LogicNodeNameEnum;
          this.project.textRenderer.renderTextFromCenter(
            getLogicNodeRenderName(logicNodeName),
            this.project.renderer.transformWorld2View(node.rectangle.center),
            fontSize,
            node.color.a === 1
              ? colorInvert(node.color)
              : colorInvert(this.project.stageStyleManager.currentStyle.Background),
          );
        }
      }
      if (!isFindLogicName) {
        // 未知的逻辑节点，可能是版本过低
        this.project.textRenderer.renderTextFromCenter(
          node.text,
          this.project.renderer.transformWorld2View(node.rectangle.center),
          fontSize,
          node.color.a === 1
            ? colorInvert(node.color)
            : colorInvert(this.project.stageStyleManager.currentStyle.Background),
        );
        this.project.shapeRenderer.renderRect(
          new Rectangle(
            this.project.renderer.transformWorld2View(
              node.rectangle.location.add(new Vector(Random.randomInt(-5, 5), Random.randomInt(-5, 5))),
            ),
            node.rectangle.size.multiply(this.project.camera.currentScale),
          ),
          node.color,
          new Color(255, 0, 0, 0.5),
          Random.randomFloat(1, 10) * this.project.camera.currentScale,
          Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale,
        );
      }
    } else {
      this.project.textRenderer.renderMultiLineText(
        node.text,
        this.project.renderer.transformWorld2View(
          node.rectangle.location.add(Vector.same(node.getPadding())).add(new Vector(0, node.getFontSize() / 4)),
        ),
        fontSize,
        // Infinity,
        node.sizeAdjust === "manual"
          ? (node.rectangle.size.x - node.getPadding() * 2) * this.project.camera.currentScale
          : Infinity,
        node.color.a === 1
          ? colorInvert(node.color)
          : colorInvert(this.project.stageStyleManager.currentStyle.Background),
        1.5,
      );
    }
  }
}
