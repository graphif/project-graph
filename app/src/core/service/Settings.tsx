import { isMac } from "@/utils/platform";
import { LazyStore } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import z from "zod";
import i18next from "i18next";

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
  aiShowTokenCount: z.boolean().default(false),
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
  treeGenerateInheritParentColor: z.boolean().default(false),
  textNodeAutoFormatTreeWhenExitEdit: z.boolean().default(false),
  treeGenerateCameraBehavior: z
    .union([z.literal("none"), z.literal("moveToNewNode"), z.literal("resetToTree")])
    .default("moveToNewNode"),
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
        cols: 5,
        children: [
          { type: "item", id: "treeGraphAdjust", icon: "Network" },
          { type: "item", id: "treeReverseX", icon: "ArrowLeftRight" },
          { type: "item", id: "treeReverseY", icon: "ArrowDownUp" },
          { type: "item", id: "textNodeTreeToSection", icon: "LayoutPanelTop" },
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
