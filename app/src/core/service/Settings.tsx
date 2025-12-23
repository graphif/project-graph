import { LazyStore } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";

export const settingsSchema = z.object({
  language: z.union([z.literal("en"), z.literal("zh_CN"), z.literal("zh_TW")]).default("zh_CN"),
  isClassroomMode: z.boolean().default(false),
  windowBackgroundAlpha: z.number().min(0).max(1).default(0.9),
  windowBackgroundOpacityAfterOpenClickThrough: z.number().min(0).max(1).default(0),
  windowBackgroundOpacityAfterCloseClickThrough: z.number().min(0).max(1).default(0.5),
  isRenderCenterPointer: z.boolean().default(false),
  showBackgroundHorizontalLines: z.boolean().default(true),
  showBackgroundVerticalLines: z.boolean().default(true),
  showBackgroundDots: z.boolean().default(false),
  showBackgroundCartesian: z.boolean().default(true),
  enableTagTextNodesBigDisplay: z.boolean().default(true),
  showTextNodeBorder: z.boolean().default(true),
  lineStyle: z.union([z.literal("straight"), z.literal("bezier"), z.literal("vertical")]).default("straight"),
  sectionBitTitleRenderType: z.union([z.literal("none"), z.literal("top"), z.literal("cover")]).default("cover"),
  nodeDetailsPanel: z.union([z.literal("small"), z.literal("vditor")]).default("vditor"),
  alwaysShowDetails: z.boolean().default(false),
  entityDetailsFontSize: z.number().min(18).max(36).int().default(18),
  entityDetailsLinesLimit: z.number().min(1).max(200).int().default(4),
  entityDetailsWidthLimit: z.number().min(200).max(2000).int().default(200),
  showDebug: z.boolean().default(false),
  protectingPrivacy: z.boolean().default(false),
  protectingPrivacyMode: z.union([z.literal("secretWord"), z.literal("caesar")]).default("secretWord"),
  windowCollapsingWidth: z.number().min(50).max(2000).int().default(300),
  windowCollapsingHeight: z.number().min(25).max(2000).int().default(300),
  limitCameraInCycleSpace: z.boolean().default(false),
  cameraCycleSpaceSizeX: z.number().min(1000).max(10000).int().default(1000),
  cameraCycleSpaceSizeY: z.number().min(1000).max(10000).int().default(1000),
  historySize: z.number().min(1).max(5000).int().default(150),
  autoRefreshStageByMouseAction: z.boolean().default(true),
  isPauseRenderWhenManipulateOvertime: z.boolean().default(false),
  renderOverTimeWhenNoManipulateTime: z.number().min(1).max(10).int().default(5),
  ignoreTextNodeTextRenderLessThanCameraScale: z.number().min(0.01).max(0.3).default(0.065),
  sectionBigTitleThresholdRatio: z.number().min(0).max(1).default(0.15),
  sectionBigTitleCameraScaleThreshold: z.number().min(0.01).max(1).default(0.25),
  sectionBigTitleOpacity: z.number().min(0).max(1).default(0.5),
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
  autoNamerTemplate: z.string().default("..."),
  autoNamerSectionTemplate: z.string().default("Section_{{i}}"),
  autoSaveWhenClose: z.boolean().default(false),
  autoSave: z.boolean().default(true),
  autoSaveInterval: z.number().min(1).max(60).int().default(10),
  autoBackup: z.boolean().default(true),
  autoBackupInterval: z.number().min(60).max(6000).int().default(600),
  autoBackupLimitCount: z.number().min(1).max(500).int().default(10),
  autoBackupCustomPath: z.string().default(""),
  enableDragEdgeRotateStructure: z.boolean().default(true),
  enableCtrlWheelRotateStructure: z.boolean().default(false),
  aiApiBaseUrl: z.string().default("https://generativelanguage.googleapis.com/v1beta/openai/"),
  aiApiKey: z.string().default(""),
  aiModel: z.string().default("gemini-2.5-flash"),
  aiShowTokenCount: z.boolean().default(false),
  mouseRightDragBackground: z.union([z.literal("cut"), z.literal("moveCamera")]).default("cut"),
  enableSpaceKeyMouseLeftDrag: z.boolean().default(true),
  enableDragAutoAlign: z.boolean().default(true),
  mouseWheelMode: z
    .union([z.literal("zoom"), z.literal("move"), z.literal("moveX"), z.literal("none")])
    .default("zoom"),
  mouseWheelWithShiftMode: z
    .union([z.literal("zoom"), z.literal("move"), z.literal("moveX"), z.literal("none")])
    .default("moveX"),
  mouseWheelWithCtrlMode: z
    .union([z.literal("zoom"), z.literal("move"), z.literal("moveX"), z.literal("none")])
    .default("move"),
  mouseWheelWithAltMode: z
    .union([z.literal("zoom"), z.literal("move"), z.literal("moveX"), z.literal("none")])
    .default("none"),
  doubleClickMiddleMouseButton: z.union([z.literal("adjustCamera"), z.literal("none")]).default("adjustCamera"),
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
  allowMoveCameraByWSAD: z.boolean().default(false),
  allowGlobalHotKeys: z.boolean().default(true),
  cameraFollowsSelectedNodeOnArrowKeys: z.boolean().default(false),
  cameraKeyboardMoveReverse: z.boolean().default(false),
  moveAmplitude: z.number().min(0).max(10).default(2),
  moveFriction: z.number().min(0).max(1).default(0.1),
  scaleExponent: z.number().min(0).max(1).default(0.11),
  cameraResetViewPaddingRate: z.number().min(1).max(2).default(1.5),
  cameraResetMaxScale: z.number().min(0.1).max(10).multipleOf(0.1).default(3),
  scaleCameraByMouseLocation: z.boolean().default(true),
  cameraKeyboardScaleRate: z.number().min(0).max(3).default(0.2),
  rectangleSelectWhenRight: z.union([z.literal("intersect"), z.literal("contain")]).default("intersect"),
  rectangleSelectWhenLeft: z.union([z.literal("intersect"), z.literal("contain")]).default("contain"),
  enableRightClickConnect: z.boolean().default(true),
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
  textNodeSelectAllWhenStartEditByMouseClick: z.boolean().default(true),
  textNodeSelectAllWhenStartEditByKeyboard: z.boolean().default(false),
  textNodeBackspaceDeleteWhenEmpty: z.boolean().default(false),
  allowAddCycleEdge: z.boolean().default(false),
  autoLayoutWhenTreeGenerate: z.boolean().default(true),
  textNodeAutoFormatTreeWhenExitEdit: z.boolean().default(false),
  treeGenerateCameraBehavior: z
    .union([z.literal("none"), z.literal("moveToNewNode"), z.literal("resetToTree")])
    .default("moveToNewNode"),
  enableBackslashGenerateNodeInInput: z.boolean().default(false),
  gamepadDeadzone: z.number().min(0).max(1).default(0.1),
  showGrid: z.boolean().default(true),
  maxFps: z.number().default(60),
  maxFpsUnfocused: z.number().default(30),
  effectsPerferences: z.record(z.boolean()).default({}),
  autoFillNodeColor: z.tuple([z.number(), z.number(), z.number(), z.number()]).default([0, 0, 0, 0]),
  autoFillNodeColorEnable: z.boolean().default(true),
  autoFillPenStrokeColor: z.tuple([z.number(), z.number(), z.number(), z.number()]).default([0, 0, 0, 0]),
  autoFillPenStrokeColorEnable: z.boolean().default(true),
  autoFillEdgeColor: z.tuple([z.number(), z.number(), z.number(), z.number()]).default([0, 0, 0, 0]),
  autoOpenPath: z.string().default(""), // 废弃
  generateTextNodeByStringTabCount: z.number().default(4),
  enableCollision: z.boolean().default(true),
  enableDragAlignToGrid: z.boolean().default(false),
  mouseLeftMode: z
    .union([z.literal("selectAndMove"), z.literal("draw"), z.literal("connectAndCut")])
    .default("selectAndMove"),
  soundEnabled: z.boolean().default(true),
  cuttingLineStartSoundFile: z.string().default(""),
  connectLineStartSoundFile: z.string().default(""),
  connectFindTargetSoundFile: z.string().default(""),
  cuttingLineReleaseSoundFile: z.string().default(""),
  alignAndAttachSoundFile: z.string().default(""),
  uiButtonEnterSoundFile: z.string().default(""),
  uiButtonClickSoundFile: z.string().default(""),
  uiSwitchButtonOnSoundFile: z.string().default(""),
  uiSwitchButtonOffSoundFile: z.string().default(""),
  githubToken: z.string().default(""),
  githubUser: z.string().default(""),
  theme: z.string().default("dark-blue"),
  telemetry: z.boolean().default(true),
  historyManagerMode: z.union([z.literal("memoryEfficient"), z.literal("timeEfficient")]).default("timeEfficient"),
  isStealthModeEnabled: z.boolean().default(false),
  stealthModeScopeRadius: z.number().min(10).max(500).int().default(150),
  stealthModeReverseMask: z.boolean().default(false),
  clearHistoryWhenManualSave: z.boolean().default(true),
  soundPitchVariationRange: z.number().min(0).max(1200).int().default(150),
  autoImportTxtFileWhenOpenPrg: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;

const listeners: Partial<Record<string, ((value: any) => void)[]>> = {};

const store = new LazyStore("settings.json");
await store.init();

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
let savedSettings = settingsSchema.parse({});
try {
  console.log(Object.fromEntries(await store.entries()));
  savedSettings = settingsSchema.parse(Object.fromEntries(await store.entries()));
} catch (e) {
  if (e instanceof z.ZodError) {
    console.error(e);
    toast.error(`设置文件格式错误\n${JSON.stringify(e.issues)}`);
  }
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
