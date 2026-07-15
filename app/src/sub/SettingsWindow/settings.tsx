import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SettingField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { SoundService } from "@/core/service/feedbackService/SoundService";
import { Settings, settingsSchema } from "@/core/service/Settings";
import { useVirtualizer } from "@tanstack/react-virtual";
import Fuse from "fuse.js";
import {
  Bot,
  Brain,
  Bug,
  ChevronRight,
  Cpu,
  Eye,
  FolderSync,
  Gamepad2,
  Gpu,
  Image,
  Import,
  Layers,
  MemoryStick,
  Mouse,
  MoveUpRight,
  Network,
  Pen,
  PictureInPicture,
  Proportions,
  RectangleHorizontal,
  Save,
  Scan,
  ScanSearch,
  ScanText,
  Search,
  Sparkle,
  SplinePointer,
  SquareDashedMousePointer,
  SquareDashedTopSolid,
  SquareFunction,
  TextCursorInput,
  TextQuote,
  Touchpad,
  Unplug,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const SETTING_FIELD_ESTIMATE_SIZE = 88;

function SettingFieldVirtualList({ keys }: { keys: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: keys.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => SETTING_FIELD_ESTIMATE_SIZE,
    overscan: 6,
    getItemKey: (index) => keys[index] ?? index,
  });

  const keysIdentity = keys.join("\0");
  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 });
  }, [keysIdentity]);

  return (
    <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const key = keys[virtualItem.index];
          if (!key) return null;
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <SettingField settingKey={key as keyof Settings} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsTab() {
  const { t } = useTranslation("settings");
  const [currentCategory, setCurrentCategory] = useState("search");
  const [currentGroup, setCurrentGroup] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResult, setSearchResult] = useState<string[]>([]);
  const fuse = useRef<Fuse<{ key: string; i18n: { title: string; description: string } }>>(null);

  useEffect(() => {
    fuse.current = new Fuse(
      Object.keys(settingsSchema.shape).map(
        (key) =>
          ({
            key,
            i18n: t(key, { returnObjects: true }),
          }) as any,
      ),
      { keys: ["key", "i18n.title", "i18n.description"], useExtendedSearch: true },
    );
  }, []);
  useEffect(() => {
    if (!fuse.current) return;
    const result = fuse.current.search(searchKeyword).map((it) => it.item.key);
    setSearchResult(result);
  }, [searchKeyword, fuse]);

  const groupKeys = useMemo(() => {
    if (currentCategory === "search" || !currentCategory || !currentGroup) return [] as string[];
    // @ts-expect-error fuck ts
    return (categories[currentCategory][currentGroup] ?? []) as string[];
  }, [currentCategory, currentGroup]);

  return (
    <div className="flex h-full min-h-0">
      <Sidebar className="h-full overflow-auto">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={currentCategory === "search"}
                    onClick={() => setCurrentCategory("search")}
                  >
                    <div>
                      <Search />
                      <span>搜索</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {Object.entries(categories).map(([category, value]) => {
                  // @ts-expect-error fuck ts
                  const CategoryIcon = categoryIcons[category].icon;
                  return (
                    <Collapsible key={category} defaultOpen className="group/collapsible">
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <CollapsibleTrigger
                            onMouseEnter={() => {
                              SoundService.play.mouseEnterButton();
                            }}
                            onMouseDown={() => {
                              SoundService.play.mouseClickButton();
                            }}
                          >
                            <CategoryIcon />
                            <span>{t(`categories.${category}.title`)}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </CollapsibleTrigger>
                        </SidebarMenuButton>
                        <SidebarMenuSub>
                          <CollapsibleContent>
                            {Object.entries(value).map(([group]) => {
                              // @ts-expect-error fuck ts
                              const GroupIcon = categoryIcons[category][group];
                              return (
                                <SidebarMenuSubItem key={group}>
                                  <SidebarMenuSubButton
                                    onMouseEnter={() => {
                                      SoundService.play.mouseEnterButton();
                                    }}
                                    onMouseDown={() => {
                                      SoundService.play.mouseClickButton();
                                    }}
                                    asChild
                                    isActive={category === currentCategory && group === currentGroup}
                                    onClick={() => {
                                      setCurrentCategory(category);
                                      setCurrentGroup(group);
                                    }}
                                  >
                                    <a href="#">
                                      <GroupIcon />
                                      <span>{t(`categories.${category}.${group}`)}</span>
                                    </a>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </CollapsibleContent>
                        </SidebarMenuSub>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="mx-auto flex min-h-0 w-2/3 flex-col">
        {currentCategory === "search" ? (
          <>
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索..."
              autoFocus
              className="shrink-0"
            />
            {searchResult.length === 0 ? (
              <div className="flex flex-col">
                <span className="h-4"></span>
                <span>直接输入: 模糊匹配</span>
                <span>空格分割: “与”</span>
                <span>竖线分割: “或”</span>
                <span>=: 精确匹配</span>
                <span>&apos;: 包含</span>
                <span>!: 反向匹配</span>
                <span>^: 匹配开头</span>
                <span>!^: 反向匹配开头</span>
                <span>$: 匹配结尾</span>
                <span>!$: 反向匹配结尾</span>
              </div>
            ) : (
              <SettingFieldVirtualList keys={searchResult} />
            )}
          </>
        ) : (
          groupKeys.length > 0 && <SettingFieldVirtualList keys={groupKeys} />
        )}
      </div>
    </div>
  );
}

export const categories = {
  visual: {
    basic: [
      "language",
      "isClassroomMode",
      "viewerMode",
      "showQuickSettingsToolbar",
      "showRecentFilesThumbnails",
      "showKeyBindHint",
      "windowBackgroundAlpha",
      "windowBackgroundOpacityAfterOpenClickThrough",
      "windowBackgroundOpacityAfterCloseClickThrough",
      "uiScalePercent",
    ],
    background: [
      "isRenderCenterPointer",
      "centerCrosshairColor",
      "centerCrosshairShape",
      "centerCrosshairAlpha",
      "showBackgroundHorizontalLines",
      "showBackgroundVerticalLines",
      "showBackgroundDots",
      "showBackgroundCartesian",
      "isStealthModeEnabled",
      "stealthModeScopeRadius",
      "stealthModeReverseMask",
      "stealthModeMaskShape",
    ],
    node: [
      "enableTagTextNodesBigDisplay",
      "showTextNodeBorder",
      "showTreeDirectionHint",
      "showEditModeHint",
      "textNodeEditModeOutlineOpacity",
      "colorPanelMouseEnterPreview",
      "defaultFontFamily",
    ],
    section: [
      "sectionBitTitleRenderType",
      "sectionBigTitleThresholdRatio",
      "sectionBigTitleCameraScaleThreshold",
      "sectionBigTitleOpacity",
      "hideSectionContentsWhenBigTitleActive",
      "sectionBackgroundFillMode",
      "sectionInitBorderStyle",
    ],
    edge: ["lineStyle", "hideArrowWhenPointingToConnectPoint", "enableAutoEdgeWidth"],
    selectedState: ["enableCollisionBoxAutoWidth"],
    entityDetails: [
      "nodeDetailsPanel",
      "alwaysShowDetails",
      "entityDetailsFontSize",
      "entityDetailsLinesLimit",
      "entityDetailsWidthLimit",
    ],
    debug: ["showDebug", "protectingPrivacy", "protectingPrivacyMode"],
    experimental: ["windowCollapsingWidth", "windowCollapsingHeight"],
  },
  automation: {
    autoNamer: [
      "autoNamerTemplate",
      "autoNamerSectionTemplate",
      "autoNamerDetailsTemplate",
      "autoNamerTreeNodeTemplate",
    ],
    autoSave: ["autoSaveWhenClose", "autoSave", "autoSaveInterval"],
    autoBackup: [
      "autoBackup",
      "autoBackupInterval",
      "autoBackupLimitCount",
      "autoBackupStrategy",
      "autoBackupCustomPath",
      "autoBackupCustomPath2",
    ],
    autoImport: ["autoImportTxtFileWhenOpenPrg", "imageImportOrder"],
  },
  control: {
    mouse: [
      "mouseRightDragBackground",
      "mouseLeftMode",
      "doubleClickEmptySpaceAction",
      "enableSpaceKeyMouseLeftDrag",
      "enableDragAutoAlign",
      "reverseTreeMoveMode",
      "mouseWheelMode",
      "mouseWheelModeReverse",
      "mouseWheelWithShiftMode",
      "mouseWheelWithShiftModeReverse",
      "mouseWheelWithCtrlMode",
      "mouseWheelWithCtrlModeReverse",
      "mouseWheelWithAltMode",
      "mouseWheelWithAltModeReverse",
      "doubleClickMiddleMouseButton",
      "doubleClickMiddleMouseButtonOnEntity",
      "mouseSideWheelMode",
      "macMouseWheelIsSmoothed",
      "macEnableControlToCut",
      "enableCtrlWheelRotateStructure",
    ],
    touchpad: ["enableWindowsTouchPad", "macTrackpadAndMouseWheelDifference", "macTrackpadScaleSensitivity"],
    pen: ["hideCursorInPenMode", "penPressureCurve"],
    cameraMove: ["moveAmplitude", "moveFriction"],
    cameraZoom: [
      "scaleExponent",
      "cameraZoomInLimitBehavior",
      "cameraZoomOutLimitBehavior",
      "cameraResetViewPaddingRate",
      "cameraResetMaxScale",
      "scaleCameraByMouseLocation",
      "cameraKeyboardScaleRate",
    ],
    objectSelect: [
      "rectangleSelectWhenRight",
      "rectangleSelectWhenLeft",
      "cameraFollowsSelectedNodeOnArrowKeys",
      "arrowKeySelectOnlyInViewport",
    ],
    textNode: [
      "textNodeStartEditMode",
      "textNodeContentLineBreak",
      "textNodeExitEditMode",
      "textNodeExitEditModeOnWheel",
      "textNodeSelectAllWhenStartEditByMouseClick",
      "textNodeSelectAllWhenStartEditByKeyboard",
      "textNodeBackspaceDeleteWhenEmpty",
      "textNodeBigContentThresholdWhenPaste",
      "textNodePasteSizeAdjustMode",
      "textNodeManualDefaultCharWidth",
      "newNodeScaleByCamera",
      "newNodeScaleByCameraOffset",
    ],
    section: ["isEnableSectionCollision", "autoEnterSectionEditMode"],
    edge: [
      "allowAddCycleEdge",
      "enableDragNodeShakeDetachFromEdge",
      "autoAdjustLineEndpointsByMouseTrack",
      "enableRightClickConnect",
      "rightClickConnectEdgeType",
      "defaultEdgeLineType",
      "defaultEdgeArrowType",
      "enableDragEdgeRotateStructure",
    ],
    generateNode: [
      "autoLayoutWhenTreeGenerate",
      "enableTreeGenerateConnectByProbe",
      "treeGenerateInheritParentColor",
      "enableTabGenerateNodeInInput",
      "enableBackslashGenerateNodeInInput",
      "textNodeAutoFormatTreeWhenInput",
      "treeGenerateCameraBehavior",
    ],
    gamepad: ["gamepadDeadzone"],
    image: [
      "resizePastedImages",
      "maxPastedImageSize",
      "compressImageToWebp",
      "webpQuality",
      "compressImageToBlackAndWhite",
      "blackAndWhiteThreshold",
      "wrapImageInGroup",
      "clipboardPasteMode",
    ],
  },
  performance: {
    memory: ["historySize", "clearHistoryWhenManualSave", "historyManagerMode"],
    cpu: ["autoRefreshStageByMouseAction", "maxFps", "maxFpsUnfocused"],
    render: [
      "isPauseRenderWhenManipulateOvertime",
      "renderOverTimeWhenNoManipulateTime",
      "scaleExponent",
      "ignoreTextNodeTextRenderLessThanFontSize",
      "cacheTextAsBitmap",
      "textCacheSize",
      "textScalingBehavior",
      "textIntegerLocationAndSizeRender",
      "antialiasing",
    ],
    experimental: ["compatibilityMode", "isEnableEntityCollision"],
  },
  ai: {
    api: ["aiApiBaseUrl", "aiApiKey", "aiModel", "aiContextWindow", "aiShowTokenCount", "aiAutoApproveMcpTools"],
    ocr: ["enableOCR"],
  },
};

export const categoryIcons = {
  ai: {
    icon: Brain,
    api: Unplug,
    ocr: ScanText,
  },
  automation: {
    icon: Bot,
    autoNamer: SquareFunction,
    autoSave: Save,
    autoBackup: FolderSync,
    autoImport: Import,
  },
  control: {
    icon: Wrench,
    pen: Pen,
    mouse: Mouse,
    touchpad: Touchpad,
    cameraMove: Scan,
    cameraZoom: ScanSearch,
    objectSelect: SquareDashedMousePointer,
    textNode: TextCursorInput,
    section: SquareDashedTopSolid,
    edge: SplinePointer,
    generateNode: Network,
    image: Image,
    gamepad: Gamepad2,
  },
  performance: {
    icon: Zap,
    memory: MemoryStick,
    cpu: Cpu,
    render: Gpu,
    experimental: Sparkle,
  },
  visual: {
    icon: Eye,
    basic: Proportions,
    background: Layers,
    node: RectangleHorizontal,
    edge: MoveUpRight,
    section: SquareDashedTopSolid,
    selectedState: SquareDashedMousePointer,
    entityDetails: TextQuote,
    debug: Bug,
    miniWindow: PictureInPicture,
    experimental: Sparkle,
  },
};
