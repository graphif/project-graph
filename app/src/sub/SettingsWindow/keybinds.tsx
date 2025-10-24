import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import KeyBind from "@/components/ui/key-bind";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { allKeyBinds } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
import { activeProjectAtom } from "@/state";
import Fuse from "fuse.js";
import { useAtom } from "jotai";
import {
  AppWindow,
  Brush,
  FileQuestion,
  Fullscreen,
  Image,
  Keyboard,
  MousePointer,
  Move,
  Network,
  PanelsTopLeft,
  RotateCw,
  Scan,
  Search as SearchIcon,
  SendToBack,
  Spline,
  Split,
  SquareDashed,
  SquareMenu,
  SunMoon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function KeyBindsPage() {
  const [activeProject] = useAtom(activeProjectAtom);
  const [data, setData] = useState<[string, string][]>([]);
  const [currentGroup, setCurrentGroup] = useState<string>("search");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResult, setSearchResult] = useState<string[]>([]);
  const fuse = useRef<Fuse<{ key: string; value: string; i18n: { title: string; description: string } }>>(null);

  const { t } = useTranslation("keyBinds");
  const { t: t2 } = useTranslation("keyBindsGroup");

  useEffect(() => {
    if (activeProject) {
      activeProject.keyBinds.entries().then((entries) => {
        setData(entries);
      });
    }
  }, [activeProject]);

  useEffect(() => {
    (async () => {
      fuse.current = new Fuse(
        (await activeProject?.keyBinds.entries())!.map(
          ([key, value]) =>
            ({
              key,
              value,
              i18n: t(key, { returnObjects: true }),
            }) as any,
        ),
        { keys: ["key", "value", "i18n.title", "i18n.description"], useExtendedSearch: true },
      );
    })();
  }, [data, t]);

  // 搜索逻辑
  useEffect(() => {
    if (!fuse.current || !searchKeyword) {
      setSearchResult([]);
      return;
    }
    const result = fuse.current.search(searchKeyword).map((it) => it.item.key);
    setSearchResult(result);
  }, [searchKeyword]);

  const getUnGroupedKeys = () => {
    return data
      .filter((item) => {
        return !shortcutKeysGroups.some((group) => group.keys.includes(item[0]));
      })
      .map((item) => item[0]);
  };

  const allGroups = [
    ...shortcutKeysGroups.map((group) => ({
      title: group.title,
      icon: group.icon,
      keys: group.keys,
      isOther: false,
    })),
    {
      title: "otherKeys",
      icon: <FileQuestion />,
      keys: getUnGroupedKeys(),
      isOther: true,
    },
  ];

  // 渲染快捷键项
  const renderKeyFields = (keys: string[]) =>
    keys.map((id) => (
      <Field
        key={id}
        icon={<Keyboard />}
        title={t(`${id}.title`, { defaultValue: id })}
        description={t(`${id}.description`, { defaultValue: "" })}
        className="border-accent border-b"
      >
        <RotateCw
          className="text-panel-details-text h-4 w-4 cursor-pointer opacity-0 transition-all hover:rotate-180 group-hover/field:opacity-100"
          onClick={() => {
            const defaultValue = allKeyBinds.find((kb) => kb.id === id)?.defaultKey;
            if (defaultValue) {
              setData((data) => data.map((item) => (item[0] === id ? [id, defaultValue] : item)));
              activeProject?.keyBinds.set(id, defaultValue);
              Dialog.confirm(
                `已重置为 '${defaultValue}'，但需要刷新页面后生效`,
                "切换左侧选项卡即可更新页面显示，看到效果。",
              );
            }
          }}
        />
        <KeyBind
          defaultValue={data.find((item) => item[0] === id)?.[1]}
          onChange={(value) => {
            setData((data) =>
              data.map((item) => {
                if (item[0] === id) {
                  return [id, value];
                }
                return item;
              }),
            );
            activeProject?.keyBinds.set(id, value);
          }}
        />
      </Field>
    ));

  return activeProject ? (
    <div className="flex h-full">
      <Sidebar className="h-full overflow-auto">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={currentGroup === "search"}
                    onClick={() => setCurrentGroup("search")}
                  >
                    <div>
                      <SearchIcon />
                      <span>搜索</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {allGroups.map((group) => (
                  <SidebarMenuItem key={group.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentGroup === group.title}
                      onClick={() => setCurrentGroup(group.title)}
                    >
                      <div>
                        {group.icon}
                        <span>{t2(`${group.title}.title`)}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="mx-auto flex w-2/3 flex-col overflow-auto">
        {currentGroup === "search" ? (
          <>
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索..."
              autoFocus
            />
            {searchKeyword === "" && (
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
            {searchResult.length > 0
              ? renderKeyFields(searchResult)
              : searchKeyword !== "" && <span>没有匹配的快捷键</span>}
          </>
        ) : currentGroup ? (
          <>
            {t2(`${currentGroup}.description`, { defaultValue: "" })}
            {renderKeyFields(allGroups.find((g) => g.title === currentGroup)?.keys ?? [])}
          </>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <span>请选择左侧分组</span>
          </div>
        )}
      </div>
    </div>
  ) : (
    <Field color="warning" title="需要先打开一个工程文件才能编辑快捷键设置" />
  );
}
type ShortcutKeysGroup = {
  title: string;
  icon: React.ReactNode;
  keys: string[];
};

const shortcutKeysGroups: ShortcutKeysGroup[] = [
  {
    title: "basic",
    icon: <Keyboard />,
    keys: [
      "saveFile",
      "openFile",
      "newDraft",
      "undo",
      "redo",
      "selectAll",
      "searchText",
      "copy",
      "paste",
      "pasteWithOriginLocation",
      "deleteSelectedStageObjects",
    ],
  },
  {
    title: "camera",
    icon: <Fullscreen />,
    keys: [
      "resetView",
      "resetCameraScale",
      "masterBrakeCheckout",
      "masterBrakeControl",
      "CameraScaleZoomIn",
      "CameraScaleZoomOut",
      "CameraPageMoveUp",
      "CameraPageMoveDown",
      "CameraPageMoveLeft",
      "CameraPageMoveRight",
    ],
  },
  {
    title: "app",
    icon: <AppWindow />,
    keys: ["switchDebugShow", "exitSoftware", "checkoutProtectPrivacy", "reload"],
  },
  {
    title: "ui",
    icon: <PanelsTopLeft />,
    keys: [
      "checkoutClassroomMode",
      "checkoutWindowOpacityMode",
      "windowOpacityAlphaIncrease",
      "windowOpacityAlphaDecrease",
      "openColorPanel",
      "clickAppMenuSettingsButton",
      "clickTagPanelButton",
      "clickAppMenuRecentFileButton",
      "clickStartFilePanelButton",
    ],
  },
  {
    title: "draw",
    icon: <Brush />,
    keys: ["selectEntityByPenStroke", "penStrokeWidthIncrease", "penStrokeWidthDecrease"],
  },
  {
    title: "select",
    icon: <Scan />,
    keys: [
      "selectUp",
      "selectDown",
      "selectLeft",
      "selectRight",
      "selectAdditionalUp",
      "selectAdditionalDown",
      "selectAdditionalLeft",
      "selectAdditionalRight",
    ],
  },
  {
    title: "expandSelect",
    icon: <Split className="rotate-90" />,
    keys: [
      "expandSelectEntity",
      "expandSelectEntityReversed",
      "expandSelectEntityKeepLastSelected",
      "expandSelectEntityReversedKeepLastSelected",
    ],
  },
  {
    title: "moveEntity",
    icon: <Move />,
    keys: [
      "moveUpSelectedEntities",
      "moveDownSelectedEntities",
      "moveLeftSelectedEntities",
      "moveRightSelectedEntities",
      "jumpMoveUpSelectedEntities",
      "jumpMoveDownSelectedEntities",
      "jumpMoveLeftSelectedEntities",
      "jumpMoveRightSelectedEntities",
    ],
  },
  {
    title: "generateTextNodeInTree",
    icon: <Network className="-rotate-90" />,
    keys: ["generateNodeTreeWithDeepMode", "generateNodeTreeWithBroadMode", "generateNodeGraph", "treeGraphAdjust"],
  },
  {
    title: "generateTextNodeRoundedSelectedNode",
    icon: <SendToBack />,
    keys: [
      "createTextNodeFromSelectedTop",
      "createTextNodeFromSelectedDown",
      "createTextNodeFromSelectedLeft",
      "createTextNodeFromSelectedRight",
    ],
  },
  {
    title: "aboutTextNode",
    icon: <SquareMenu />,
    keys: [
      "createTextNodeFromCameraLocation",
      "createTextNodeFromMouseLocation",
      "toggleTextNodeSizeMode",
      "splitTextNodes",
      "mergeTextNodes",
      "swapTextAndDetails",
    ],
  },
  {
    title: "section",
    icon: <SquareDashed />,
    keys: ["folderSection", "packEntityToSection", "unpackEntityFromSection", "textNodeToSection"],
  },
  {
    title: "leftMouseModeCheckout",
    icon: <MousePointer />,
    keys: [
      "checkoutLeftMouseToSelectAndMove",
      "checkoutLeftMouseToDrawing",
      "checkoutLeftMouseToConnectAndCutting",
      "checkoutLeftMouseToConnectAndCuttingOnlyPressed",
    ],
  },
  {
    title: "edge",
    icon: <Spline />,
    keys: [
      "reverseEdges",
      "reverseSelectedNodeEdge",
      "createUndirectedEdgeFromEntities",
      "connectAllSelectedEntities",
      "connectLeftToRight",
      "connectTopToBottom",
      "selectAllEdges",
      "createConnectPointWhenDragConnecting",
    ],
  },
  {
    title: "themes",
    icon: <SunMoon />,
    keys: [
      "switchToDarkTheme",
      "switchToLightTheme",
      "switchToParkTheme",
      "switchToMacaronTheme",
      "switchToMorandiTheme",
    ],
  },
  {
    title: "align",
    icon: <Spline />,
    keys: [
      "alignTop",
      "alignBottom",
      "alignLeft",
      "alignRight",
      "alignHorizontalSpaceBetween",
      "alignVerticalSpaceBetween",
      "alignCenterHorizontal",
      "alignCenterVertical",
      "alignLeftToRightNoSpace",
      "alignTopToBottomNoSpace",
    ],
  },
  { title: "image", icon: <Image />, keys: ["reverseImageColors"] },
];
