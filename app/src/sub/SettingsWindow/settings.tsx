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
import { settingsSchema } from "@/core/service/Settings";
import Fuse from "fuse.js";
import {
  AppWindowMac,
  ArrowUpRight,
  Bot,
  Box,
  Brain,
  Bug,
  Camera,
  ChevronRight,
  Clock,
  Cpu,
  Eye,
  File,
  Folder,
  Gamepad,
  Layers,
  MemoryStick,
  Mouse,
  Network,
  PictureInPicture,
  ReceiptText,
  Save,
  Search,
  Sparkle,
  SquareDashedMousePointer,
  Text,
  TextSelect,
  Touchpad,
  Workflow,
  Wrench,
  Zap,
  ZoomIn,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function SettingsTab() {
  const { t } = useTranslation("settings");
  const [currentCategory, setCurrentCategory] = useState("search");
  const [currentGroup, setCurrentGroup] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResult, setSearchResult] = useState<string[]>([]);
  const fuse = useRef<Fuse<{ key: string; i18n: { title: string; description: string } }>>(null);

  useEffect(() => {
    fuse.current = new Fuse(
      Object.keys(settingsSchema._def.shape()).map(
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

  return (
    <div className="flex h-full">
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
      <div className="mx-auto flex w-2/3 flex-col overflow-auto">
        {currentCategory === "search" ? (
          <>
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索..."
              autoFocus
            />
            {searchResult.length === 0 && (
              <>
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
              </>
            )}
            {searchResult.map((it) => (
              <SettingField key={it} settingKey={it as any} />
            ))}
          </>
        ) : (
          currentCategory &&
          currentGroup &&
          // @ts-expect-error fuck ts
          categories[currentCategory][currentGroup]?.map((key) => <SettingField key={key} settingKey={key} />)
        )}
      </div>
    </div>
  );
}

const categories = {
  visual: {
    basic: [
      "language",
      "isClassroomMode",
      "windowBackgroundAlpha",
      "windowBackgroundOpacityAfterOpenClickThrough",
      "windowBackgroundOpacityAfterCloseClickThrough",
    ],
    background: [
      "isRenderCenterPointer",
      "showBackgroundHorizontalLines",
      "showBackgroundVerticalLines",
      "showBackgroundDots",
      "showBackgroundCartesian",
      "isStealthModeEnabled",
      "stealthModeScopeRadius",
      "stealthModeReverseMask",
    ],
    node: ["enableTagTextNodesBigDisplay", "showTextNodeBorder"],
    edge: ["lineStyle"],
    section: [
      "sectionBitTitleRenderType",
      "sectionBigTitleThresholdRatio",
      "sectionBigTitleCameraScaleThreshold",
      "sectionBigTitleOpacity",
    ],
    entityDetails: [
      "nodeDetailsPanel",
      "alwaysShowDetails",
      "entityDetailsFontSize",
      "entityDetailsLinesLimit",
      "entityDetailsWidthLimit",
    ],
    debug: ["showDebug", "protectingPrivacy", "protectingPrivacyMode"],
    miniWindow: ["windowCollapsingWidth", "windowCollapsingHeight"],
    experimental: ["limitCameraInCycleSpace", "cameraCycleSpaceSizeX", "cameraCycleSpaceSizeY"],
  },
  automation: {
    autoNamer: ["autoNamerTemplate", "autoNamerSectionTemplate"],
    autoSave: ["autoSaveWhenClose", "autoSave", "autoSaveInterval"],
    autoBackup: ["autoBackup", "autoBackupInterval", "autoBackupLimitCount", "autoBackupCustomPath"],
    autoImport: ["autoImportTxtFileWhenOpenPrg"],
  },
  control: {
    mouse: [
      "mouseRightDragBackground",
      "mouseLeftMode",
      "enableSpaceKeyMouseLeftDrag",
      "enableDragAutoAlign",
      "mouseWheelMode",
      "mouseWheelWithShiftMode",
      "mouseWheelWithCtrlMode",
      "mouseWheelWithAltMode",
      "doubleClickMiddleMouseButton",
      "mouseSideWheelMode",
      "macMouseWheelIsSmoothed",
      "macEnableControlToCut",
      "enableCtrlWheelRotateStructure",
    ],
    touchpad: ["enableWindowsTouchPad", "macTrackpadAndMouseWheelDifference", "macTrackpadScaleSensitivity"],
    cameraMove: [
      "allowMoveCameraByWSAD",
      "cameraFollowsSelectedNodeOnArrowKeys",
      "cameraKeyboardMoveReverse",
      "moveAmplitude",
      "moveFriction",
    ],
    cameraZoom: [
      "scaleExponent",
      "cameraResetViewPaddingRate",
      "cameraResetMaxScale",
      "scaleCameraByMouseLocation",
      "cameraKeyboardScaleRate",
    ],
    rectangleSelect: ["rectangleSelectWhenRight", "rectangleSelectWhenLeft"],
    textNode: [
      "textNodeStartEditMode",
      "textNodeContentLineBreak",
      "textNodeExitEditMode",
      "textNodeSelectAllWhenStartEditByMouseClick",
      "textNodeSelectAllWhenStartEditByKeyboard",
      "textNodeBackspaceDeleteWhenEmpty",
    ],
    edge: [
      "allowAddCycleEdge",
      "autoAdjustLineEndpointsByMouseTrack",
      "enableRightClickConnect",
      "enableDragEdgeRotateStructure",
    ],
    generateNode: [
      "autoLayoutWhenTreeGenerate",
      "enableBackslashGenerateNodeInInput",
      "textNodeAutoFormatTreeWhenExitEdit",
      "treeGenerateCameraBehavior",
    ],
    gamepad: ["gamepadDeadzone"],
  },
  performance: {
    memory: ["historySize", "clearHistoryWhenManualSave", "historyManagerMode"],
    cpu: ["autoRefreshStageByMouseAction"],
    render: [
      "isPauseRenderWhenManipulateOvertime",
      "renderOverTimeWhenNoManipulateTime",
      "scaleExponent",
      "ignoreTextNodeTextRenderLessThanCameraScale",
      "cacheTextAsBitmap",
      "textCacheSize",
      "textScalingBehavior",
      "textIntegerLocationAndSizeRender",
      "antialiasing",
    ],
    experimental: ["compatibilityMode", "isEnableEntityCollision"],
  },
  ai: {
    api: ["aiApiBaseUrl", "aiApiKey", "aiModel", "aiShowTokenCount"],
  },
};

const categoryIcons = {
  ai: {
    icon: Brain,
    api: Network,
  },
  automation: {
    icon: Bot,
    autoNamer: Text,
    autoSave: Save,
    autoBackup: Folder,
    autoImport: File,
  },
  control: {
    icon: Wrench,
    mouse: Mouse,
    touchpad: Touchpad,
    cameraMove: Camera,
    cameraZoom: ZoomIn,
    rectangleSelect: SquareDashedMousePointer,
    textNode: TextSelect,
    edge: ArrowUpRight,
    generateNode: Network,
    gamepad: Gamepad,
  },
  performance: {
    icon: Zap,
    memory: MemoryStick,
    cpu: Cpu,
    render: Clock,
    experimental: Sparkle,
  },
  visual: {
    icon: Eye,
    basic: AppWindowMac,
    background: Layers,
    node: Workflow,
    edge: ArrowUpRight,
    section: Box,
    entityDetails: ReceiptText,
    debug: Bug,
    miniWindow: PictureInPicture,
    experimental: Sparkle,
  },
};
