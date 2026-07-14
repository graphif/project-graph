import { isMac } from "@/utils/platform";
import { LazyStore } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import z from "zod";
import i18next from "i18next";

type GlobalMenuNode = {
  type: string;
  id: string;
  label?: string;
  icon?: string;
  visible?: boolean;
  children?: GlobalMenuNode[];
};

function cloneGlobalMenuNode<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function mergeGlobalMenuConfig(current: GlobalMenuNode[], defaults: GlobalMenuNode[]): GlobalMenuNode[] {
  const merged = cloneGlobalMenuNode(current);
  for (const defaultItem of defaults) {
    const currentItem = merged.find((item) => item.id === defaultItem.id);
    if (!currentItem) {
      merged.push(cloneGlobalMenuNode(defaultItem));
      continue;
    }
    if (currentItem.children && defaultItem.children) {
      currentItem.children = mergeGlobalMenuConfig(currentItem.children, defaultItem.children);
    }
  }
  return merged;
}

export const settingsSchema = z.object({
  language: z
    .union([z.literal("en"), z.literal("zh_CN"), z.literal("zh_TW"), z.literal("zh_TWC"), z.literal("id")])
    .default("zh_CN"),
  isClassroomMode: z.boolean().default(false),
  showQuickSettingsToolbar: z.boolean().default(true),
  showRecentFilesThumbnails: z.boolean().default(true),
  windowBackgroundAlpha: z.number().min(0).max(1).default(0.9),
  windowBackgroundOpacityAfterOpenClickThrough: z.number().min(0).max(1).default(0),
  windowBackgroundOpacityAfterCloseClickThrough: z.number().min(0).max(1).default(0.5),
  isRenderCenterPointer: z.boolean().default(false),
  centerCrosshairColor: z.tuple([z.number(), z.number(), z.number()]).default([255, 255, 255]),
  centerCrosshairShape: z
    .union([
      z.literal("crossDot"),
      z.literal("tightCross"),
      z.literal("xShape"),
      z.literal("circleDot"),
      z.literal("iBeam"),
    ])
    .default("crossDot"),
  centerCrosshairAlpha: z.number().min(0).max(1).default(0.5),
  showBackgroundHorizontalLines: z.boolean().default(true),
  showBackgroundVerticalLines: z.boolean().default(true),
  showBackgroundDots: z.boolean().default(false),
  showBackgroundCartesian: z.boolean().default(true),
  enableTagTextNodesBigDisplay: z.boolean().default(true),
  showTextNodeBorder: z.boolean().default(true),
  showTreeDirectionHint: z.boolean().default(true),
  lineStyle: z.union([z.literal("straight"), z.literal("bezier"), z.literal("vertical")]).default("straight"),
  hideArrowWhenPointingToConnectPoint: z.boolean().default(true),
  sectionBitTitleRenderType: z.union([z.literal("none"), z.literal("top"), z.literal("cover")]).default("cover"),
  nodeDetailsPanel: z.union([z.literal("small"), z.literal("vditor")]).default("vditor"),
  alwaysShowDetails: z.boolean().default(false),
  entityDetailsFontSize: z.number().int().min(18).max(36).default(18),
  entityDetailsLinesLimit: z.number().int().min(1).max(200).default(4),
  entityDetailsWidthLimit: z.number().int().min(200).max(2000).default(200),
  showDebug: z.boolean().default(false),
  protectingPrivacy: z.boolean().default(false),
  protectingPrivacyMode: z.union([z.literal("secretWord"), z.literal("caesar")]).default("secretWord"),
  windowCollapsingWidth: z.number().int().min(50).max(2000).default(300),
  windowCollapsingHeight: z.number().int().min(25).max(2000).default(300),
  limitCameraInCycleSpace: z.boolean().default(false),
  historySize: z.number().int().min(1).max(5000).default(150),
  autoRefreshStageByMouseAction: z.boolean().default(true),
  isPauseRenderWhenManipulateOvertime: z.boolean().default(false),
  renderOverTimeWhenNoManipulateTime: z.number().int().min(1).max(10).default(5),
  ignoreTextNodeTextRenderLessThanFontSize: z.number().min(1).max(15).default(5),
  sectionBigTitleThresholdRatio: z.number().min(0).max(1).default(0.15),
  sectionBigTitleCameraScaleThreshold: z.number().min(0.01).max(1).default(0.45),
  sectionBigTitleOpacity: z.number().min(0).max(1).default(0.5),
  hideSectionContentsWhenBigTitleActive: z.boolean().default(false),
  sectionBackgroundFillMode: z.union([z.literal("full"), z.literal("titleOnly")]).default("titleOnly"),
  sectionInitBorderStyle: z.union([z.literal("solid"), z.literal("dashed"), z.literal("none")]).default("solid"),
  autoEnterSectionEditMode: z.boolean().default(true),
  cacheTextAsBitmap: z.boolean().default(false),
  textCacheSize: z.number().default(100),
  textScalingBehavior: z
    .union([z.literal("temp"), z.literal("nearestCache"), z.literal("cacheEveryTick")])
    .default("temp"),
  antialiasing: z
    .union([z.literal("disabled"), z.literal("low"), z.literal("medium"), z.literal("high")])
    .default("low"),
  textIntegerLocationAndSizeRender: z.boolean().default(false),
  compatibilityMode: z.boolean().default(false),
  isEnableEntityCollision: z.boolean().default(false),
  isEnableSectionCollision: z.boolean().default(false),
  autoNamerTemplate: z.string().default("..."),
  autoNamerSectionTemplate: z.string().default("Section_{{i}}"),
  autoNamerDetailsTemplate: z.string().default(""),
  autoNamerTreeNodeTemplate: z.string().default("Node_{{i}}"),
  autoSaveWhenClose: z.boolean().default(false),
  autoSave: z.boolean().default(false),
  autoSaveInterval: z.number().int().min(1).max(60).default(10),
  autoBackup: z.boolean().default(true),
  autoBackupInterval: z.number().int().min(60).max(6000).default(600),
  autoBackupLimitCount: z.number().int().min(1).max(500).default(10),
  autoBackupCustomPath: z.string().default(""),
  autoBackupCustomPath2: z.string().default(""),
  autoBackupStrategy: z
    .union([z.literal("default"), z.literal("sideBySide"), z.literal("subfolder")])
    .default("default"),
  enableDragEdgeRotateStructure: z.boolean().default(true),
  enableCtrlWheelRotateStructure: z.boolean().default(false),
  aiApiBaseUrl: z.string().default("https://generativelanguage.googleapis.com/v1beta/openai/"),
  aiApiKey: z.string().default(""),
  aiModel: z.string().default("gemini-2.5-flash"),
  aiContextWindow: z.number().int().nonnegative().default(0),
  aiShowTokenCount: z.boolean().default(false),
  aiAutoApproveMcpTools: z.boolean().default(false),
  mouseRightDragBackground: z.union([z.literal("cut"), z.literal("moveCamera")]).default("cut"),
  enableSpaceKeyMouseLeftDrag: z.boolean().default(true),
  enableDragAutoAlign: z.boolean().default(false),
  reverseTreeMoveMode: z.boolean().default(false),
  mouseWheelMode: z
    .union([z.literal("zoom"), z.literal("move"), z.literal("moveX"), z.literal("none"), z.literal("zoomUI")])
    .default("zoom"),
  mouseWheelModeReverse: z.boolean().default(false),
  mouseWheelWithShiftMode: z
    .union([z.literal("zoom"), z.literal("move"), z.literal("moveX"), z.literal("none"), z.literal("zoomUI")])
    .default("moveX"),
  mouseWheelWithShiftModeReverse: z.boolean().default(false),
  mouseWheelWithCtrlMode: z
    .union([z.literal("zoom"), z.literal("move"), z.literal("moveX"), z.literal("none"), z.literal("zoomUI")])
    .default("none"),
  mouseWheelWithCtrlModeReverse: z.boolean().default(false),
  mouseWheelWithAltMode: z
    .union([z.literal("zoom"), z.literal("move"), z.literal("moveX"), z.literal("none"), z.literal("zoomUI")])
    .default("none"),
  mouseWheelWithAltModeReverse: z.boolean().default(false),
  uiScalePercent: z.number().min(25).max(200).default(100),
  doubleClickMiddleMouseButton: z.union([z.literal("adjustCamera"), z.literal("none")]).default("adjustCamera"),
  doubleClickMiddleMouseButtonOnEntity: z.union([z.literal("openUrl"), z.literal("none")]).default("openUrl"),
  mouseSideWheelMode: z
    .union([
      z.literal("zoom"),
      z.literal("move"),
      z.literal("moveX"),
      z.literal("none"),
      z.literal("cameraMoveToMouse"),
      z.literal("adjustWindowOpacity"),
      z.literal("adjustPenStrokeWidth"),
    ])
    .default("cameraMoveToMouse"),
  macMouseWheelIsSmoothed: z.boolean().default(false),
  enableWindowsTouchPad: z.boolean().default(true),
  autoAdjustLineEndpointsByMouseTrack: z.boolean().default(true),
  macTrackpadAndMouseWheelDifference: z
    .union([z.literal("trackpadIntAndWheelFloat"), z.literal("tarckpadFloatAndWheelInt")])
    .default("trackpadIntAndWheelFloat"),
  macTrackpadScaleSensitivity: z.number().min(0).max(1).multipleOf(0.001).default(0.5),
  macEnableControlToCut: z.boolean().default(false),
  allowGlobalHotKeys: z.boolean().default(true),
  cameraFollowsSelectedNodeOnArrowKeys: z.boolean().default(false),
  arrowKeySelectOnlyInViewport: z.boolean().default(false),
  moveAmplitude: z.number().min(0).max(10).default(2),
  moveFriction: z.number().min(0).max(1).default(0.1),
  scaleExponent: z.number().min(0).max(1).default(0.11),
  cameraZoomInLimitBehavior: z.union([z.literal("macro"), z.literal("micro"), z.literal("reset")]).default("micro"),
  cameraZoomOutLimitBehavior: z.union([z.literal("macro"), z.literal("micro"), z.literal("reset")]).default("macro"),
  cameraResetViewPaddingRate: z.number().min(1).max(2).default(1.5),
  cameraResetMaxScale: z.number().min(0.1).max(10).multipleOf(0.1).default(3),
  scaleCameraByMouseLocation: z.boolean().default(true),
  cameraKeyboardScaleRate: z.number().min(0).max(3).default(0.2),
  rectangleSelectWhenRight: z.union([z.literal("intersect"), z.literal("contain")]).default("intersect"),
  rectangleSelectWhenLeft: z.union([z.literal("intersect"), z.literal("contain")]).default("contain"),
  enableRightClickConnect: z.boolean().default(true),
  rightClickConnectEdgeType: z.union([z.literal("normal"), z.literal("arc")]).default("arc"),
  defaultEdgeLineType: z.union([z.literal("solid"), z.literal("dashed"), z.literal("double")]).default("solid"),
  defaultEdgeArrowType: z
    .union([
      z.literal("default"),
      z.literal("hollow-triangle"),
      z.literal("filled-triangle"),
      z.literal("hollow-diamond"),
      z.literal("filled-diamond"),
    ])
    .default("default"),
  textNodeStartEditMode: z
    .union([
      z.literal("enter"),
      z.literal("ctrlEnter"),
      z.literal("altEnter"),
      z.literal("shiftEnter"),
      z.literal("space"),
    ])
    .default("enter"),
  textNodeContentLineBreak: z
    .union([z.literal("enter"), z.literal("ctrlEnter"), z.literal("altEnter"), z.literal("shiftEnter")])
    .default("shiftEnter"),
  textNodeExitEditMode: z
    .union([z.literal("enter"), z.literal("ctrlEnter"), z.literal("altEnter"), z.literal("shiftEnter")])
    .default("enter"),
  textNodeExitEditModeOnWheel: z.boolean().default(true),
  textNodeSelectAllWhenStartEditByMouseClick: z.boolean().default(true),
  textNodeSelectAllWhenStartEditByKeyboard: z.boolean().default(false),
  textNodeBackspaceDeleteWhenEmpty: z.boolean().default(false),
  textNodeBigContentThresholdWhenPaste: z.number().int().min(1).max(1000).default(20),
  textNodePasteSizeAdjustMode: z
    .union([z.literal("auto"), z.literal("manual"), z.literal("autoByLength")])
    .default("autoByLength"),
  clipboardPasteMode: z.union([z.literal("auto"), z.literal("webview"), z.literal("tauri")]).default("auto"),
  resizePastedImages: z.boolean().default(true),
  maxPastedImageSize: z.number().int().min(256).max(8192).default(1920),
  compressImageToWebp: z.boolean().default(true),
  webpQuality: z.number().min(0.01).max(1).default(0.85),
  compressImageToBlackAndWhite: z.boolean().default(false),
  blackAndWhiteThreshold: z.number().min(0).max(1).default(0.5),
  wrapImageInGroup: z.boolean().default(false),
  textNodeManualDefaultCharWidth: z.number().int().min(3).max(60).default(10),
  allowAddCycleEdge: z.boolean().default(false),
  enableDragNodeShakeDetachFromEdge: z.boolean().default(false),
  autoLayoutWhenTreeGenerate: z.boolean().default(true),
  enableTreeGenerateConnectByProbe: z.boolean().default(true),
  treeGenerateInheritParentColor: z.boolean().default(false),
  textNodeAutoFormatTreeWhenInput: z.boolean().default(false),
  treeGenerateCameraBehavior: z
    .union([z.literal("none"), z.literal("moveToNewNode"), z.literal("resetToTree")])
    .default("moveToNewNode"),
  enableTabGenerateNodeInInput: z.boolean().default(true),
  enableBackslashGenerateNodeInInput: z.boolean().default(false),
  gamepadDeadzone: z.number().min(0).max(1).default(0.1),
  showGrid: z.boolean().default(true),
  maxFps: z.number().default(60),
  maxFpsUnfocused: z.number().default(30),
  effectsPerferences: z.record(z.string(), z.boolean()).default({}),
  autoFillNodeColor: z.tuple([z.number(), z.number(), z.number(), z.number()]).default([0, 0, 0, 0]),
  autoFillNodeColorEnable: z.boolean().default(true),
  autoFillPenStrokeColor: z.tuple([z.number(), z.number(), z.number(), z.number()]).default([0, 0, 0, 0]),
  autoFillPenStrokeColorEnable: z.boolean().default(true),
  colorPanelMouseEnterPreview: z.boolean().default(false),
  autoFillEdgeColor: z.tuple([z.number(), z.number(), z.number(), z.number()]).default([0, 0, 0, 0]),
  autoOpenPath: z.string().default(""), // 废弃
  generateTextNodeByStringTabCount: z.number().default(4),
  enableCollision: z.boolean().default(true),
  enableDragAlignToGrid: z.boolean().default(false),
  mouseLeftMode: z
    .union([z.literal("selectAndMove"), z.literal("draw"), z.literal("connectAndCut")])
    .default("selectAndMove"),
  doubleClickEmptySpaceAction: z.union([z.literal("createTextNode"), z.literal("none")]).default("createTextNode"),
  soundEnabled: z.boolean().default(true),
  cuttingLineStartSoundFile: z.string().default(""),
  connectLineStartSoundFile: z.string().default(""),
  connectFindTargetSoundFile: z.string().default(""),
  cuttingLineReleaseSoundFile: z.string().default(""),
  alignAndAttachSoundFile: z.string().default(""),
  packEntityToSectionSoundFile: z.string().default(""),
  treeGenerateDeepSoundFile: z.string().default(""),
  treeGenerateBroadSoundFile: z.string().default(""),
  treeAdjustSoundFile: z.string().default(""),
  viewAdjustSoundFile: z.string().default(""),
  entityJumpSoundFile: z.string().default(""),
  associationAdjustSoundFile: z.string().default(""),
  uiButtonEnterSoundFile: z.string().default(""),
  uiButtonClickSoundFile: z.string().default(""),
  uiSwitchButtonOnSoundFile: z.string().default(""),
  uiSwitchButtonOffSoundFile: z.string().default(""),
  githubToken: z.string().default(""),
  githubUser: z.string().default(""),
  theme: z.string().default("dark-blue"),
  themeMode: z.union([z.literal("light"), z.literal("dark")]).default("dark"),
  lightTheme: z.string().default("morandi"),
  darkTheme: z.string().default("dark"),
  telemetry: z.boolean().default(true),
  historyManagerMode: z.union([z.literal("memoryEfficient"), z.literal("timeEfficient")]).default("timeEfficient"),
  isStealthModeEnabled: z.boolean().default(false),
  stealthModeScopeRadius: z.number().int().min(10).max(500).default(150),
  stealthModeReverseMask: z.boolean().default(false),
  stealthModeMaskShape: z
    .union([z.literal("circle"), z.literal("square"), z.literal("topLeft"), z.literal("smartContext")])
    .default("circle"),
  clearHistoryWhenManualSave: z.boolean().default(true),
  soundPitchVariationRange: z.number().int().min(0).max(1200).default(150),
  autoImportTxtFileWhenOpenPrg: z.boolean().default(false),
  imageImportOrder: z.union([z.literal("mtime"), z.literal("path")]).default("mtime"),
  enableAutoEdgeWidth: z.boolean().default(true),
  enableCollisionBoxAutoWidth: z.boolean().default(true),
  newNodeScaleByCamera: z.boolean().default(false),
  newNodeScaleByCameraOffset: z.number().int().min(-5).max(5).default(-1),
  showKeyBindHint: z.boolean().default(true),
  showEditModeHint: z.boolean().default(true),
  textNodeEditModeOutlineOpacity: z.number().min(0).max(1).default(0.5),
  contextMenuConfig: z
    .array(
      z.object({
        type: z.union([
          z.literal("item"),
          z.literal("separator"),
          z.literal("sub"),
          z.literal("group"),
          z.literal("setColorForSelected"),
          z.literal("setPenStrokeColor"),
        ]),
        id: z.string(),
        label: z.string().optional(),
        icon: z.string().optional(),
        visible: z.boolean().default(true),
        children: z.array(z.any()).optional(),
        layout: z.union([z.literal("row"), z.literal("grid")]).optional(),
        cols: z.number().optional(),
      }),
    )
    .default([
      {
        type: "group",
        id: "clipboard-group",
        layout: "row",
        children: [
          { type: "item", id: "copy", icon: "Copy" },
          { type: "item", id: "paste", icon: "Clipboard" },
          { type: "item", id: "deleteSelectedStageObjects", icon: "Trash" },
          { type: "item", id: "undo", icon: "Undo" },
          { type: "item", id: "changeTagBySelected", icon: "Tag" },
        ],
      },
      {
        type: "group",
        id: "align-group",
        layout: "grid",
        cols: 3,
        children: [
          { type: "item", id: "alignTop", icon: "AlignStartHorizontal" },
          { type: "item", id: "alignTopToBottomNoSpace", icon: "AlignVerticalJustifyStart" },
          { type: "separator", id: "sep-1" },
          { type: "item", id: "alignCenterHorizontal", icon: "AlignCenterHorizontal" },
          { type: "item", id: "alignVerticalSpaceBetween", icon: "AlignVerticalSpaceBetween" },
          { type: "item", id: "layoutToSquare", icon: "Grip" },
          { type: "item", id: "alignBottom", icon: "AlignEndHorizontal" },
          { type: "item", id: "layoutToTightSquare", icon: "LayoutDashboard" },
          { type: "separator", id: "sep-2" },
        ],
      },
      {
        type: "group",
        id: "align-group-2",
        layout: "grid",
        cols: 3,
        children: [
          { type: "item", id: "alignLeft", icon: "AlignStartVertical" },
          { type: "item", id: "alignCenterVertical", icon: "AlignCenterVertical" },
          { type: "item", id: "alignRight", icon: "AlignEndVertical" },
          { type: "item", id: "alignLeftToRightNoSpace", icon: "AlignHorizontalJustifyStart" },
          { type: "item", id: "alignHorizontalSpaceBetween", icon: "AlignHorizontalSpaceBetween" },
          { type: "separator", id: "sep-3" },
          { type: "item", id: "adjustSelectedTextNodeWidthMin", icon: "ChevronsRightLeft" },
          { type: "item", id: "adjustSelectedTextNodeWidthAverage", icon: "MoveHorizontal" },
          { type: "item", id: "adjustSelectedTextNodeWidthMax", icon: "Code" },
        ],
      },
      {
        type: "group",
        id: "tree-group",
        layout: "grid",
        cols: 6,
        children: [
          { type: "item", id: "treeGraphAdjust", icon: "Network" },
          { type: "item", id: "treeReverseX", icon: "ArrowLeftRight" },
          { type: "item", id: "treeReverseY", icon: "ArrowDownUp" },
          { type: "item", id: "textNodeTreeToSection", icon: "LayoutPanelTop" },
          { type: "item", id: "textNodeTreeToSectionNoDeep", icon: "PanelsTopLeft" },
          { type: "item", id: "layoutToTightSquareDeep", icon: "SquareSquare" },
        ],
      },
      {
        type: "group",
        id: "dag-group",
        layout: "grid",
        cols: 1,
        children: [{ type: "item", id: "dagGraphAdjust", icon: "Workflow" }],
      },
      {
        type: "setColorForSelected",
        id: "changeColor",
        label: "更改颜色",
        icon: "Palette",
      },
      { type: "item", id: "packEntityToSection", icon: "Box" },
      { type: "item", id: "createUndirectedEdgeFromEntities", icon: "Asterisk" },
      { type: "item", id: "createMTUEdgeConvex", icon: "SquareRoundCorner" },
      { type: "item", id: "createTextNodeFromMouseLocation", icon: "TextSelect" },
      { type: "item", id: "createConnectPointFromMouseLocation", icon: "Dot" },
      { type: "item", id: "increaseFontSize", label: "放大字体", icon: "Maximize2" },
      { type: "item", id: "decreaseFontSize", label: "缩小字体", icon: "Minimize2" },
      { type: "item", id: "toggleTextNodeSizeMode", label: "切换换行模式", icon: "ListEnd" },
      {
        type: "sub",
        id: "text-node-tools",
        label: "文本节点 巧妙操作",
        icon: "Rabbit",
        children: [
          { type: "item", id: "mergeTextNodes", label: "ruá成一个", icon: "SquaresUnite" },
          { type: "item", id: "splitTextNodes", label: "kēi成多个", icon: "SquareSplitHorizontal" },
          { type: "item", id: "swapTextAndDetails", label: "详略交换", icon: "Repeat2" },
          { type: "item", id: "removeFirstCharFromSelectedTextNodes", label: "削头", icon: "ArrowLeftFromLine" },
          { type: "item", id: "removeLastCharFromSelectedTextNodes", label: "剃尾", icon: "ArrowRightFromLine" },
          { type: "item", id: "toggleCheckmarkOnTextNodes", label: "打勾勾", icon: "Check" },
          { type: "item", id: "createTwinTextNode", label: "创建孪生节点", icon: "RefreshCcwDot" },
          { type: "item", id: "textNodeToSection", icon: "Package" },
          {
            type: "sub",
            id: "connect-tools",
            label: "连接相关",
            icon: "Network",
            children: [
              { type: "item", id: "graftNodeToTree", label: "嫁接到连线中", icon: "GitPullRequestCreateArrow" },
              { type: "item", id: "removeNodeFromTree", label: "从连线中摘除", icon: "ArrowLeftFromLine" },
              { type: "item", id: "connectTopToBottom", label: "向下连一串", icon: "MoveDown" },
              { type: "item", id: "connectLeftToRight", label: "向右连一串", icon: "MoveRight" },
              { type: "item", id: "connectAllSelectedEntities", label: "全连接", icon: "Asterisk" },
            ],
          },
          {
            type: "sub",
            id: "color-tools",
            label: "颜色相关",
            icon: "PaintBucket",
            children: [
              { type: "item", id: "increaseBrightness", label: "增加亮度", icon: "Sun" },
              { type: "item", id: "decreaseBrightness", label: "降低亮度", icon: "SunDim" },
              { type: "item", id: "changeColorHueUp", label: "增加色相值", icon: "ChevronUp" },
              { type: "item", id: "changeColorHueDown", label: "降低色相值", icon: "ChevronDown" },
              { type: "item", id: "changeColorHueMajorUp", label: "大幅度增加色相值", icon: "MoveUp" },
              { type: "item", id: "changeColorHueMajorDown", label: "大幅度降低色相值", icon: "MoveDown" },
            ],
          },
          {
            type: "sub",
            id: "text-node-other-tools",
            label: "其他",
            icon: "Ellipsis",
            children: [
              {
                type: "item",
                id: "changeTextNodeToReferenceBlock",
                label: "将选中的文本节点转换为引用块",
                icon: "SquareDashedBottomCode",
              },
            ],
          },
        ],
      },
      { type: "item", id: "openTextNodeByContentExternal", label: "将内容视为路径并打开", icon: "ExternalLink" },
      { type: "item", id: "editUrlNodeLink", label: "编辑URL节点的链接", icon: "Link" },
      { type: "item", id: "folderSection", icon: "Package" },
      { type: "item", id: "toggleSectionLock", label: "锁定/解锁 section 框", icon: "Lock" },
      {
        type: "sub",
        id: "section-border-style",
        label: "分组框边框样式",
        icon: "SquareDashed",
        children: [
          { type: "item", id: "setSectionBorderSolid", label: "实线", icon: "Square" },
          { type: "item", id: "setSectionBorderDashed", label: "虚线", icon: "SquareDashed" },
          { type: "item", id: "setSectionBorderNone", label: "无边框", icon: "Slash" },
        ],
      },
      { type: "item", id: "refreshReferenceBlockNode", label: "刷新引用块", icon: "RefreshCcwDot" },
      { type: "item", id: "goToReferenceBlockSource", label: "进入该引用块所在的源头位置", icon: "CornerUpRight" },
      { type: "item", id: "switchEdgeToUndirectedEdge", label: "转换为无向边", icon: "Spline" },
      { type: "item", id: "switchEdgeToArcEdge", label: "转换为弧形边", icon: "Radius" },
      {
        type: "sub",
        id: "edge-line-type",
        label: "线条类型",
        icon: "ArrowRightFromLine",
        children: [
          { type: "item", id: "setSelectedEdgesToSolid", label: "实线", icon: "Slash" },
          { type: "item", id: "setSelectedEdgesToDashed", label: "虚线", icon: "Ellipsis" },
          { type: "item", id: "setSelectedEdgesToDouble", label: "双实线", icon: "Equal" },
        ],
      },
      {
        type: "sub",
        id: "edge-arrow-type",
        label: "箭头类型",
        icon: "ArrowRight",
        children: [
          { type: "item", id: "setSelectedEdgesArrowDefault", label: "默认箭头", icon: "ArrowRight" },
          { type: "item", id: "setSelectedEdgesArrowHollowTriangle", label: "空心三角", icon: "Triangle" },
          { type: "item", id: "setSelectedEdgesArrowFilledTriangle", label: "实心三角", icon: "Play" },
          { type: "item", id: "setSelectedEdgesArrowHollowDiamond", label: "空心菱形", icon: "Diamond" },
          { type: "item", id: "setSelectedEdgesArrowFilledDiamond", label: "实心菱形", icon: "Gem" },
        ],
      },
      {
        type: "group",
        id: "edge-source-connect-location-group",
        layout: "grid",
        cols: 3,
        children: [
          { type: "separator", id: "edge-source-connect-location-sep-1" },
          { type: "item", id: "setSelectedEdgeSourceConnectLocationUp", icon: "ArrowUpFromLine" },
          { type: "separator", id: "edge-source-connect-location-sep-2" },
          { type: "item", id: "setSelectedEdgeSourceConnectLocationLeft", icon: "ArrowLeftFromLine" },
          { type: "item", id: "setSelectedEdgeSourceConnectLocationCenter", icon: "SquareDot" },
          { type: "item", id: "setSelectedEdgeSourceConnectLocationRight", icon: "ArrowRightFromLine" },
          { type: "separator", id: "edge-source-connect-location-sep-3" },
          { type: "item", id: "setSelectedEdgeSourceConnectLocationDown", icon: "ArrowDownFromLine" },
          { type: "separator", id: "edge-source-connect-location-sep-4" },
        ],
      },
      {
        type: "group",
        id: "edge-target-connect-location-group",
        layout: "grid",
        cols: 3,
        children: [
          { type: "separator", id: "edge-target-connect-location-sep-1" },
          { type: "item", id: "setSelectedEdgeTargetConnectLocationUp", icon: "ArrowDownToLine" },
          { type: "separator", id: "edge-target-connect-location-sep-2" },
          { type: "item", id: "setSelectedEdgeTargetConnectLocationLeft", icon: "ArrowRightToLine" },
          { type: "item", id: "setSelectedEdgeTargetConnectLocationCenter", icon: "SquareDot" },
          { type: "item", id: "setSelectedEdgeTargetConnectLocationRight", icon: "ArrowLeftToLine" },
          { type: "separator", id: "edge-target-connect-location-sep-3" },
          { type: "item", id: "setSelectedEdgeTargetConnectLocationDown", icon: "ArrowUpToLine" },
          { type: "separator", id: "edge-target-connect-location-sep-4" },
        ],
      },
      {
        type: "sub",
        id: "mtu-edge-arrow",
        label: "切换无向边箭头",
        icon: "ArrowUpRight",
        children: [
          { type: "item", id: "setMTUEdgeArrowOuter", icon: "Maximize2" },
          { type: "item", id: "setMTUEdgeArrowInner", icon: "Minimize2" },
          { type: "item", id: "setMTUEdgeArrowNone", icon: "Slash" },
        ],
      },
      { type: "item", id: "switchMTUEdgeRenderType", icon: "RefreshCcw" },
      { type: "item", id: "resetMTUEdgeEndpointLocations", label: "重置端点位置到中心", icon: "AlignCenterHorizontal" },
      { type: "item", id: "switchUndirectedEdgeToEdge", icon: "MoveUpRight" },
      {
        type: "setPenStrokeColor",
        id: "pen-stroke-color",
        label: "改变画笔颜色",
        icon: "Palette",
      },
      { type: "item", id: "copySelectedImageToClipboard", label: "复制图片到系统剪贴板", icon: "Clipboard" },
      { type: "item", id: "swapSelectedImageRedBlueChannels", label: "对调图片红蓝通道", icon: "ArrowLeftRight" },
      { type: "item", id: "compressImage", label: "压缩图片", icon: "Shrink" },
      { type: "item", id: "setSelectedImageAsBackground", label: "转化为背景图片", icon: "Images" },
      { type: "item", id: "unsetSelectedImageAsBackground", label: "取消背景化", icon: "SquareSquare" },
      { type: "item", id: "saveSelectedImagesToProjectDirectory", label: "另存图片到当前prg所在目录下", icon: "Save" },
    ] as any),
  disabledExtensions: z.array(z.string()).default([]),
  extensionSettings: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  defaultFontFamily: z
    .string()
    .default(
      isMac
        ? "PingFang SC, PingFang TC, -apple-system"
        : "-apple-system, BlinkMacSystemFont, MiSans, system-ui, sans-serif",
    ),
  hideCursorInPenMode: z.boolean().default(false),
  penPressureCurve: z
    .union([
      z.literal("fixed"),
      z.literal("linear"),
      z.literal("sqrt"),
      z.literal("cbrt"),
      z.literal("quadratic"),
      z.literal("cubic"),
    ])
    .default("linear"),
  globalMenuConfig: z
    .array(
      z.object({
        type: z.union([
          z.literal("topMenu"),
          z.literal("item"),
          z.literal("separator"),
          z.literal("sub"),
          z.literal("recentFiles"),
          z.literal("versionInfo"),
          z.literal("unstableVersionBanner"),
          z.literal("devMenu"),
          z.literal("featureFlagsList"),
        ]),
        id: z.string(),
        label: z.string().optional(),
        icon: z.string().optional(),
        visible: z.boolean().optional(),
        children: z.array(z.any()).optional(),
      }),
    )
    .default([
      // ===================== 文件 =====================
      {
        type: "topMenu",
        id: "file",
        icon: "File",
        children: [
          { type: "item", id: "newDraft", icon: "FilePlus" },
          { type: "item", id: "newPrgAtCurrentDir", icon: "FilePlus" },
          { type: "item", id: "openFile", icon: "FolderOpen" },
          { type: "item", id: "upgradeOldJson", icon: "FileInput" },
          { type: "item", id: "openCurrentProjectFileFolder", icon: "FolderOpen" },
          {
            type: "sub",
            id: "recentFilesSub",
            icon: "FileClock",
            children: [{ type: "recentFiles", id: "recentFilesEntries" }],
          },
          { type: "item", id: "clickAppMenuRecentFileButton", icon: "LayoutGrid" },
          { type: "separator", id: "sep-file-1" },
          { type: "item", id: "saveFile", icon: "Save" },
          { type: "item", id: "saveAs", icon: "FileDown" },
          { type: "item", id: "manualBackup", icon: "Archive" },
          { type: "item", id: "openCustomBackupFolder", icon: "FolderClock" },
          { type: "item", id: "openDefaultBackupFolder", icon: "FolderClock" },
          { type: "separator", id: "sep-file-2" },
          {
            type: "sub",
            id: "importSub",
            icon: "FileInput",
            children: [
              { type: "item", id: "importFromFolder", icon: "FolderTree" },
              { type: "item", id: "importTreeFromFolder", icon: "FolderTree" },
              { type: "item", id: "generateKeyboardLayout", icon: "Keyboard" },
              { type: "item", id: "importImages", icon: "Images" },
              { type: "item", id: "importSvg", icon: "Images" },
              { type: "item", id: "importTextFile", icon: "FileText" },
            ],
          },
          {
            type: "sub",
            id: "exportSub",
            icon: "FileOutput",
            children: [
              {
                type: "sub",
                id: "exportSvgSub",
                icon: "FileCode",
                children: [
                  { type: "item", id: "exportSvgAll", icon: "FileDigit" },
                  { type: "item", id: "exportSvgSelected", icon: "MousePointer2" },
                ],
              },
              {
                type: "sub",
                id: "exportPngSub",
                icon: "FileImage",
                children: [
                  { type: "item", id: "exportPngLegacy", icon: "FileImage" },
                  { type: "item", id: "exportPngSelected", icon: "MousePointer2" },
                ],
              },
              {
                type: "sub",
                id: "exportPlainTextSub",
                icon: "TextQuote",
                children: [
                  { type: "item", id: "exportSelectedNetStructureToPlainText", icon: "VectorSquare" },
                  { type: "item", id: "exportSelectedTreeStructureToPlainText", icon: "Network" },
                  { type: "item", id: "exportSelectedTreeStructureToMarkdown", icon: "Network" },
                  { type: "item", id: "exportSelectedNetStructureToMermaid", icon: "SquareSquare" },
                ],
              },
              {
                type: "sub",
                id: "exportPrgDeepLinkSub",
                icon: "Link",
                children: [
                  { type: "item", id: "exportCurrentViewPrgDeepLink", icon: "View" },
                  { type: "item", id: "exportSelectedEntityPrgDeepLink", icon: "MousePointer2" },
                  { type: "item", id: "exportCurrentFilePrgDeepLink", icon: "Link" },
                ],
              },
            ],
          },
          { type: "separator", id: "sep-file-3" },
          { type: "item", id: "openAttachmentsWindow", icon: "Paperclip" },
          { type: "item", id: "clickTagPanelButton", icon: "Tag" },
          { type: "item", id: "openReferencesWindow", icon: "Link" },
          { type: "item", id: "openColorManagerWindow", icon: "Palette" },
          { type: "item", id: "openBackgroundManagerWindow", icon: "Images" },
        ],
      },
      // ===================== 视野 =====================
      {
        type: "topMenu",
        id: "view",
        icon: "View",
        children: [
          { type: "item", id: "resetViewAll", icon: "View" },
          { type: "item", id: "resetView", icon: "SquareDashedMousePointer" },
          { type: "item", id: "resetCameraScale", icon: "Scaling" },
          { type: "item", id: "moveViewToOrigin", icon: "MapPin" },
          { type: "separator", id: "sep-view-1" },
          { type: "item", id: "stopDrifting", icon: "OctagonX" },
          { type: "item", id: "focusRandomEntity", icon: "Dices" },
        ],
      },
      // ===================== 操作 =====================
      {
        type: "topMenu",
        id: "actions",
        icon: "Axe",
        children: [
          { type: "item", id: "searchText", icon: "Search" },
          { type: "item", id: "updateReferences", icon: "RefreshCcwDot" },
          { type: "separator", id: "sep-actions-0" },
          { type: "item", id: "undo", icon: "Undo" },
          { type: "item", id: "redo", icon: "Redo" },
          { type: "item", id: "releaseKeys", icon: "Keyboard" },
          { type: "item", id: "closeAllSubWindows", icon: "X" },
          { type: "separator", id: "sep-actions-1" },
          {
            type: "sub",
            id: "generateSub",
            icon: "Sparkles",
            children: [
              { type: "item", id: "generateNodeTreeByText", icon: "Network" },
              { type: "item", id: "generateNodeTreeByMarkdown", icon: "Network" },
              { type: "item", id: "generateNodeGraphByText", icon: "GitCompareArrows" },
              { type: "item", id: "generateNodeMermaidByText", icon: "GitCompareArrows" },
            ],
          },
          { type: "item", id: "openLogicNodePanel", icon: "Workflow" },
          { type: "item", id: "openLogicNodeDocs", icon: "BookOpen" },
          { type: "separator", id: "sep-actions-2" },
          { type: "item", id: "clearStage", icon: "Radiation" },
        ],
      },
      // ===================== 设置 =====================
      {
        type: "topMenu",
        id: "settings",
        icon: "Settings",
        children: [
          { type: "item", id: "clickAppMenuSettingsButton", icon: "Settings" },
          {
            type: "sub",
            id: "autoSettingsSub",
            icon: "Rabbit",
            children: [
              { type: "item", id: "autoNamerTemplate", icon: "Type" },
              { type: "item", id: "autoNamerSectionTemplate", icon: "Type" },
              { type: "item", id: "autoNamerDetailsTemplate", icon: "Type" },
              { type: "item", id: "autoNamerTreeNodeTemplate", icon: "Type" },
              { type: "item", id: "autoFillNodeColorToggle", icon: "Palette" },
              { type: "item", id: "autoFillNodeColorSet", icon: "Palette" },
            ],
          },
          { type: "item", id: "openAppearanceSettings", icon: "Palette" },
          { type: "item", id: "resetAllKeyBinds", icon: "Radiation" },
          { type: "item", id: "openConfigFolder", icon: "FolderCog" },
          { type: "item", id: "openCacheFolder", icon: "FolderOpen" },
        ],
      },
      // ===================== AI =====================
      {
        type: "topMenu",
        id: "ai",
        icon: "Bot",
        children: [
          { type: "item", id: "openAIPanel", icon: "ExternalLink" },
          { type: "item", id: "openAITools", icon: "Wrench" },
        ],
      },
      {
        type: "topMenu",
        id: "window",
        icon: "AppWindow",
        children: [
          { type: "item", id: "toggleFullscreen", icon: "Fullscreen" },
          { type: "item", id: "checkoutClassroomMode", icon: "Airplay" },
          { type: "item", id: "checkoutProtectPrivacy", icon: "VenetianMask" },
          {
            type: "sub",
            id: "backgroundGridSub",
            icon: "LayoutGrid",
            children: [
              { type: "item", id: "toggleBackgroundHorizontalLines", icon: "Rows4" },
              { type: "item", id: "toggleBackgroundVerticalLines", icon: "Columns4" },
              { type: "item", id: "toggleBackgroundDots", icon: "Grip" },
              { type: "item", id: "toggleBackgroundCartesian", icon: "Move3d" },
            ],
          },
          {
            type: "sub",
            id: "windowOpacitySub",
            icon: "PictureInPicture2",
            children: [
              { type: "item", id: "checkoutWindowOpacityMode", icon: "PictureInPicture2" },
              { type: "item", id: "windowOpacityAlphaDecrease", icon: "PictureInPicture2" },
              { type: "item", id: "windowOpacityAlphaIncrease", icon: "PictureInPicture2" },
            ],
          },
          { type: "item", id: "switchDebugShow", icon: "Bug" },
          {
            type: "sub",
            id: "stealthModeSub",
            icon: "CircleDot",
            children: [
              { type: "item", id: "switchStealthMode", icon: "CircleDot" },
              { type: "item", id: "toggleStealthModeReverseMask", icon: "CircleDot" },
              { type: "item", id: "stealthModeScopeRadiusIncrease", icon: "CirclePlus" },
              { type: "item", id: "stealthModeScopeRadiusDecrease", icon: "CircleMinus" },
            ],
          },
        ],
      },
      // ===================== 扩展 =====================
      {
        type: "topMenu",
        id: "extensions",
        icon: "Blocks",
        children: [
          { type: "item", id: "openExtensionsWindow", icon: "Blocks" },
          { type: "item", id: "openPluginMarket", icon: "Store" },
          { type: "item", id: "openExtensionFolder", icon: "FolderOpen" },
        ],
      },
      // ===================== 关于 =====================
      {
        type: "topMenu",
        id: "about",
        icon: "CircleAlert",
        children: [
          { type: "item", id: "openAboutWindow", icon: "MessageCircleWarning" },
          {
            type: "sub",
            id: "tutorialSub",
            icon: "BookOpenText",
            children: [
              { type: "item", id: "downloadTutorialMain", icon: "FileBadge" },
              { type: "item", id: "downloadTutorialShortcutKeys", icon: "FileSpreadsheet" },
              { type: "item", id: "downloadTutorialLogicNodes", icon: "FileBox" },
              { type: "item", id: "openOfficialDocs", icon: "Globe" },
            ],
          },
          {
            type: "sub",
            id: "videoTutorialSub",
            icon: "Tv",
            children: [
              { type: "item", id: "watchBilibiliVideo2", icon: "Tv" },
              { type: "item", id: "watchBilibiliVideo1_6Basic", icon: "Tv" },
              { type: "item", id: "watchBilibiliVideo1_6Advanced", icon: "Tv" },
              { type: "item", id: "watchBilibiliVideo1_0", icon: "Tv" },
              { type: "item", id: "watchBilibiliVideoPyQtUpdated", icon: "Tv" },
              { type: "item", id: "watchBilibiliVideoPyQt", icon: "Tv" },
            ],
          },
          { type: "item", id: "showUpgradeGuide", icon: "Dumbbell" },
        ],
      },
      // ===================== 不稳定版本 (运行时动态显示/隐藏) =====================
      {
        type: "topMenu",
        id: "unstable",
        icon: "MessageCircleWarning",
        visible: false,
        children: [
          { type: "versionInfo", id: "versionInfoText" },
          { type: "separator", id: "sep-unstable-1" },
          {
            type: "sub",
            id: "devSub",
            icon: "TestTube2",
            children: [
              { type: "item", id: "devOpenTestWindow", icon: "FlaskConical" },
              { type: "item", id: "devSerializeTest", icon: "Code" },
              { type: "item", id: "devTriggerBug", icon: "Bug" },
              { type: "item", id: "devReload", icon: "RefreshCw" },
              { type: "item", id: "devGetDeviceId", icon: "Fingerprint" },
              { type: "item", id: "devFeatureFlags", icon: "Flag" },
              { type: "item", id: "devNodeDetails", icon: "LayoutPanelTop" },
              { type: "item", id: "devCreateTestTab", icon: "FilePlus" },
              { type: "item", id: "devLogStage", icon: "Terminal" },
              { type: "item", id: "devLogSelectedDetails", icon: "FileText" },
              { type: "item", id: "devCreateExampleExtension", icon: "Package" },
              { type: "item", id: "devOutputMarkdown", icon: "FileText" },
              { type: "item", id: "devOnboarding", icon: "BookOpen" },
              { type: "item", id: "devCreate100Nodes", icon: "Plus" },
            ],
          },
        ],
      },
    ]),
});

export type Settings = z.infer<typeof settingsSchema>;

const listeners: Partial<Record<string, ((value: any) => void)[]>> = {};

const store = new LazyStore("settings.json");
console.log("pre store.init");
await store.init();
console.log("post store.init");

// store加载完成后，推送所有listeners初始值
// for (const key in listeners) {
//   if (Object.prototype.hasOwnProperty.call(listeners, key)) {
//     // 取store中的值，如果没有则用默认值
//     let value = await store.get(key);
//     if (value === undefined) {
//       value = settingsSchema._def.shape()[key as keyof Settings]._def.defaultValue();
//     }
//     listeners[key]?.forEach((cb) => cb(value));
//   }
// }
const defaultSettings = settingsSchema.parse({});
const savedSettings: Settings = { ...defaultSettings };
const pendingSettingsLoadErrorKeys = new Set<string>();
const pendingSettingsLoadErrorValues = new Map<string, unknown>();
let hasFlushedSettingsLoadErrors = false;

const rawSettings = Object.fromEntries(await store.entries());
// console.log(rawSettings);
for (const [rawKey, rawValue] of Object.entries(rawSettings)) {
  if (!(rawKey in settingsSchema.shape)) {
    continue;
  }
  const settingSchema = settingsSchema.shape[rawKey as keyof typeof settingsSchema.shape];
  const result = settingSchema.safeParse(rawValue);
  if (result.success) {
    (savedSettings as Record<string, unknown>)[rawKey] = result.data;
    continue;
  }
  console.error(`设置项 ${rawKey} 格式错误，将使用默认值`, result.error);
  pendingSettingsLoadErrorKeys.add(rawKey);
  pendingSettingsLoadErrorValues.set(rawKey, rawValue);
}

// 检查菜单配置中是否存在指定 id 的节点（用于版本升级时的配置重置判断）
function hasMenuId(nodes: GlobalMenuNode[], id: string): boolean {
  for (const node of nodes) {
    if (node.id === id) return true;
    if (node.children && hasMenuId(node.children, id)) return true;
  }
  return false;
}

const mergedGlobalMenuConfig = mergeGlobalMenuConfig(
  savedSettings.globalMenuConfig as GlobalMenuNode[],
  defaultSettings.globalMenuConfig as GlobalMenuNode[],
);
// 检查是否缺少 extensions 顶级菜单（旧版本用户升级后需要重置以保证顺序正确）
const globalMenuNeedsReset = !hasMenuId(mergedGlobalMenuConfig, "extensions");
const finalGlobalMenuConfig = globalMenuNeedsReset
  ? (defaultSettings.globalMenuConfig as GlobalMenuNode[])
  : mergedGlobalMenuConfig;
if (JSON.stringify(finalGlobalMenuConfig) !== JSON.stringify(savedSettings.globalMenuConfig)) {
  savedSettings.globalMenuConfig = finalGlobalMenuConfig as Settings["globalMenuConfig"];
  await store.set("globalMenuConfig", finalGlobalMenuConfig);
  await store.save();
}

const mergedContextMenuConfig = mergeGlobalMenuConfig(
  savedSettings.contextMenuConfig as GlobalMenuNode[],
  defaultSettings.contextMenuConfig as GlobalMenuNode[],
);
// 检查是否缺少 edge-arrow-type 子菜单（旧版本用户）
// 若缺少，说明是旧配置，直接重置为默认值以保证顺序正确
const contextMenuNeedsReset = !hasMenuId(mergedContextMenuConfig, "edge-arrow-type");
const finalContextMenuConfig = contextMenuNeedsReset
  ? (defaultSettings.contextMenuConfig as GlobalMenuNode[])
  : mergedContextMenuConfig;
if (JSON.stringify(finalContextMenuConfig) !== JSON.stringify(savedSettings.contextMenuConfig)) {
  savedSettings.contextMenuConfig = finalContextMenuConfig as Settings["contextMenuConfig"];
  await store.set("contextMenuConfig", finalContextMenuConfig);
  await store.save();
}

export async function flushSettingsLoadErrors() {
  if (hasFlushedSettingsLoadErrors || pendingSettingsLoadErrorKeys.size === 0) {
    return;
  }
  hasFlushedSettingsLoadErrors = true;
  const invalidKeys = Array.from(pendingSettingsLoadErrorKeys);
  const invalidSettingTitles = invalidKeys.map((key) => {
    const title = i18next.t(`${key}.title`, { ns: "settings", defaultValue: key });
    const displayTitle = title === `${key}.title` ? key : title;
    const invalidValue = JSON.stringify(pendingSettingsLoadErrorValues.get(key));
    return `"${displayTitle}"\n当前值：${invalidValue ?? String(pendingSettingsLoadErrorValues.get(key))}`;
  });
  if (invalidKeys.length === 1) {
    await Dialog.confirm("设置项不兼容", `设置项 ${invalidSettingTitles[0]} 与当前版本不兼容，已使用默认值。`);
  } else {
    await Dialog.confirm(
      "部分设置项不兼容",
      `有 ${invalidKeys.length} 个设置项与当前版本不兼容，已使用默认值：\n${invalidSettingTitles.join("\n")}`,
    );
  }

  for (const key of invalidKeys) {
    await store.set(key, defaultSettings[key as keyof Settings]);
  }
  await store.save();
  pendingSettingsLoadErrorKeys.clear();
  pendingSettingsLoadErrorValues.clear();
}

export const Settings = new Proxy<
  Settings & {
    watch: (key: keyof Settings, callback: (value: any) => void) => () => void;
    use: <T extends keyof Settings>(key: T) => [Settings[T], (newValue: Settings[T]) => void];
  }
>(
  {
    ...savedSettings,
    watch: () => () => {},
    use: () => [undefined as any, () => {}],
  },
  {
    set: (target, key, value, receiver) => {
      if (typeof key === "symbol") {
        throw new Error(`不能设置symbol属性: ${String(key)}`);
      }
      if (!(key in target)) {
        throw new Error(`没有这个设置项: ${key}`);
      }
      store.set(key, value);
      listeners[key]?.forEach((cb) => cb(value));
      return Reflect.set(target, key, value, receiver);
    },
    get: (target, key, receiver) => {
      switch (key) {
        case "watch": {
          return (key: keyof Settings, callback: (value: any) => void) => {
            if (!listeners[key]) {
              listeners[key] = [];
            }
            listeners[key].push(callback);
            callback(target[key]);
            return () => {
              listeners[key] = listeners[key]?.filter((cb) => cb !== callback);
            };
          };
        }
        case "use": {
          return <T extends keyof Settings>(key: T) => {
            const [value, setValue] = useState(target[key]);
            useEffect(() => {
              if (!listeners[key]) {
                listeners[key] = [];
              }
              listeners[key].push(setValue);
              return () => {
                listeners[key] = listeners[key]?.filter((cb) => cb !== setValue);
              };
            }, []);
            return [
              value,
              (newValue: Settings[T]) => {
                console.log(newValue);
                store.set(key, newValue);
                listeners[key]?.forEach((cb) => cb(newValue));
              },
            ];
          };
        }
        default: {
          return Reflect.get(target, key, receiver);
        }
      }
    },
  },
);
