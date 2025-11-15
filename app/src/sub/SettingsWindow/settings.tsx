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
import { settingsSchema } from "@/core/service/Settings";
import Fuse from "fuse.js";
import {
  ArrowUpRight,
  Bot,
  Box,
  Brain,
  Bug,
  Camera,
  ChevronRight,
  Clock,
  Eye,
  Folder,
  Gamepad,
  Layers,
  MemoryStick,
  Mouse,
  Network,
  PictureInPicture,
  ReceiptText,
  Save,
  Sparkle,
  SquareDashedMousePointer,
  Text,
  TextSelect,
  Touchpad,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function SettingsTab() {
  const { t } = useTranslation("settings");
  const [currentCategory, setCurrentCategory] = useState("quick");
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

  const isFlatArray = Array.isArray(categories[currentCategory as keyof typeof categories]);
  const isInSearch = searchKeyword.length > 0;

  return (
    <div className="flex h-full">
      <Sidebar className="h-full overflow-auto">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {Object.entries(categories).map(([category, value]) => {
                  // @ts-expect-error fuck ts
                  const CategoryIcon = categoryIcons[category].icon;
                  const isFlat = Array.isArray(value);

                  if (isFlat) {
                    return (
                      <SidebarMenuItem key={category}>
                        <SidebarMenuButton
                          asChild
                          isActive={category === currentCategory && !isInSearch}
                          onClick={() => {
                            setCurrentCategory(category);
                            setCurrentGroup("");
                          }}
                        >
                          <a href="#">
                            <CategoryIcon />
                            <span>{t(`categories.${category}.title`)}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <Collapsible key={category} defaultOpen className="group/collapsible">
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <CollapsibleTrigger>
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
        {currentCategory === "quick" && (
          <div className="border-b p-4">
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索所有设置..."
              autoFocus
            />
          </div>
        )}
        {isInSearch ? (
          searchResult.map((it) => <SettingField key={it} settingKey={it as any} />)
        ) : (
          <>
            {isFlatArray
              ? // @ts-expect-error fuck ts
                (categories[currentCategory] as string[]).map((key) => <SettingField key={key} settingKey={key} />)
              : currentCategory &&
                currentGroup &&
                // @ts-expect-error fuck ts
                categories[currentCategory][currentGroup]?.map((key) => <SettingField key={key} settingKey={key} />)}
          </>
        )}
      </div>
    </div>
  );
}

const categories = {
  // ⭐ 常用快速设置 - 平铺，真正「快速」
  quick: [
    "language",
    "windowBackgroundAlpha",
    "maxFps",
    "textResolution",
    "powerPreference",
    "antialias",
    "mouseTrail",
  ],

  // 🎨 视觉与显示 - 图表外观相关
  visual: {
    background: [
      "showBackgroundHorizontalLines",
      "showBackgroundVerticalLines",
      "showBackgroundDots",
      "showBackgroundCartesian",
      "isStealthModeEnabled",
      "stealthModeScopeRadius",
    ],
    node: ["enableTagTextNodesBigDisplay", "showTextNodeBorder"],
    edge: ["lineStyle"],
    section: ["sectionBitTitleRenderType"],
    entityDetails: [
      "nodeDetailsPanel",
      "alwaysShowDetails",
      "entityDetailsFontSize",
      "entityDetailsLinesLimit",
      "entityDetailsWidthLimit",
    ],
    miniWindow: ["windowCollapsingWidth", "windowCollapsingHeight"],
    debug: ["showDebug", "protectingPrivacy"],
  },

  // 🖱️ 交互与操作 - 用户最常调的
  interaction: {
    mouse: [
      "mouseRightDragBackground",
      "mouseLeftMode",
      "enableDragAutoAlign",
      "mouseWheelMode",
      "mouseWheelWithShiftMode",
      "mouseWheelWithCtrlMode",
      "mouseWheelWithAltMode",
      "doubleClickMiddleMouseButton",
      "mouseSideWheelMode",
      "macMouseWheelIsSmoothed",
    ],
    touchpad: ["enableWindowsTouchPad", "macTrackpadAndMouseWheelDifference", "macTrackpadScaleSensitivity"],
    camera: [
      "allowMoveCameraByWSAD",
      "cameraFollowsSelectedNodeOnArrowKeys",
      "cameraKeyboardMoveReverse",
      "moveAmplitude",
      "moveFriction",
      "scaleExponent",
      "cameraResetViewPaddingRate",
      "scaleCameraByMouseLocation",
      "cameraKeyboardScaleRate",
      "limitCameraInCycleSpace",
      "cameraCycleSpaceSizeX",
      "cameraCycleSpaceSizeY",
    ],
    selection: ["rectangleSelectWhenRight", "rectangleSelectWhenLeft"],
    textEditing: [
      "textNodeStartEditMode",
      "textNodeContentLineBreak",
      "textNodeExitEditMode",
      "textNodeSelectAllWhenStartEditByMouseClick",
      "textNodeSelectAllWhenStartEditByKeyboard",
    ],
    connector: ["allowAddCycleEdge", "autoAdjustLineEndpointsByMouseTrack", "enableRightClickConnect"],
    nodeGeneration: ["autoLayoutWhenTreeGenerate"],
    gamepad: ["gamepadDeadzone"],
  },

  // ⚡ 性能与优化
  performance: {
    rendering: [
      "isPauseRenderWhenManipulateOvertime",
      "renderOverTimeWhenNoManipulateTime",
      "ignoreTextNodeTextRenderLessThanCameraScale",
      "textIntegerLocationAndSizeRender",
      "powerPreference",
      "textResolution",
      "maxFps",
      "minFps",
      "isEnableEntityCollision",
      "autoRefreshStageByMouseAction",
      "antialias",
    ],
    memory: ["historySize", "clearHistoryWhenManualSave"],
  },

  // 💾 数据与备份
  data: {
    autoSave: ["autoSaveWhenClose"],
    autoBackup: ["autoBackup", "autoBackupInterval", "autoBackupLimitCount"],
  },

  // 🤖 自动化与AI
  automation: {
    autoNamer: ["autoNamerTemplate", "autoNamerSectionTemplate"],
    ai: ["aiApiBaseUrl", "aiApiKey", "aiModel", "aiShowTokenCount"],
  },
};

const categoryIcons = {
  quick: {
    icon: Sparkle,
  },
  visual: {
    icon: Eye,
    background: Layers,
    node: Workflow,
    edge: ArrowUpRight,
    section: Box,
    entityDetails: ReceiptText,
    debug: Bug,
    miniWindow: PictureInPicture,
  },
  interaction: {
    icon: Wrench,
    mouse: Mouse,
    touchpad: Touchpad,
    camera: Camera,
    selection: SquareDashedMousePointer,
    textEditing: TextSelect,
    connector: ArrowUpRight,
    nodeGeneration: Network,
    gamepad: Gamepad,
  },
  performance: {
    icon: Zap,
    rendering: Clock,
    memory: MemoryStick,
  },
  data: {
    icon: Folder,
    autoSave: Save,
    autoBackup: Folder,
  },
  automation: {
    icon: Bot,
    autoNamer: Text,
    ai: Brain,
  },
};
