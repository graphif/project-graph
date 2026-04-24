import { Project } from "@/core/Project";
import { Button } from "@/components/ui/button";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { Dialog } from "@/components/ui/dialog";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { useKeyBind } from "@/core/service/controlService/shortcutKeysEngine/useKeyBind";
import { ColorSmartTools } from "@/core/service/dataManageService/colorSmartTools";
import { ConnectNodeSmartTools } from "@/core/service/dataManageService/connectNodeSmartTools";
import { TextNodeSmartTools } from "@/core/service/dataManageService/textNodeSmartTools";
import { ColorManager } from "@/core/service/feedbackService/ColorManager";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { activeTabAtom, contextMenuTooltipWordsAtom } from "@/state";
import ColorPaletteWindow from "@/sub/ColorPaletteWindow";
import ColorWindow from "@/sub/ColorWindow";
import { Direction } from "@/types/directions";
import { parseEmacsKey } from "@/utils/emacs";
import { KeyBindsUI, type UIKeyBind } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { openBrowserOrFile } from "@/utils/externalOpen";
import { exportImagesToProjectDirectory } from "@/utils/imageExport";
import { Color, Vector } from "@graphif/data-structures";
import { Image as TauriImage } from "@tauri-apps/api/image";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { useAtom } from "jotai";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceBetween,
  ArrowDownUp,
  ArrowLeftFromLine,
  ArrowLeftRight,
  ArrowRightFromLine,
  ArrowUpRight,
  ArrowUpToLine,
  Asterisk,
  Box,
  Check,
  ChevronDown,
  ChevronsRightLeft,
  ChevronUp,
  Clipboard,
  Code,
  Copy,
  CornerUpRight,
  Dot,
  Ellipsis,
  Equal,
  ExternalLink,
  GitPullRequestCreateArrow,
  Grip,
  Images,
  LayoutDashboard,
  LayoutPanelTop,
  ListEnd,
  Lock,
  Maximize2,
  Minimize2,
  MoveDown,
  MoveHorizontal,
  MoveRight,
  MoveUp,
  MoveUpRight,
  Network,
  Package,
  PaintBucket,
  Palette,
  Rabbit,
  RefreshCcw,
  RefreshCcwDot,
  Repeat2,
  Save,
  Slash,
  Spline,
  SquareDashedBottomCode,
  SquareDot,
  SquareRoundCorner,
  SquareSplitHorizontal,
  SquareSquare,
  SquaresUnite,
  Sun,
  SunDim,
  TextSelect,
  Trash,
  Undo,
  Workflow,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import tailwindColors from "tailwindcss/colors";
import KeyTooltip from "./key-tooltip";

const Content = ContextMenuContent;
const Item = ContextMenuItem;
const Sub = ContextMenuSub;
const SubTrigger = ContextMenuSubTrigger;
const SubContent = ContextMenuSubContent;
// const Separator = ContextMenuSeparator;

/**
 * 右键菜单
 * @returns
 */
export default function MyContextMenuContent() {
  const [tab] = useAtom(activeTabAtom);
  const p = tab instanceof Project ? tab : undefined;
  const [contextMenuTooltipWords] = useAtom(contextMenuTooltipWordsAtom);
  const { t } = useTranslation("contextMenu");

  const toggleTextNodeSizeModeKey = useKeyBind("toggleTextNodeSizeMode");
  const mergeTextNodesKey = useKeyBind("mergeTextNodes");
  const splitTextNodesKey = useKeyBind("splitTextNodes");
  const swapTextAndDetailsKey = useKeyBind("swapTextAndDetails");
  const removeFirstCharKey = useKeyBind("removeFirstCharFromSelectedTextNodes");
  const removeLastCharKey = useKeyBind("removeLastCharFromSelectedTextNodes");
  const toggleCheckmarkKey = useKeyBind("toggleCheckmarkOnTextNodes");
  const textNodeToSectionKey = useKeyBind("textNodeToSection");
  const increaseFontSizeKey = useKeyBind("increaseFontSize");
  const decreaseFontSizeKey = useKeyBind("decreaseFontSize");

  const graftNodeToTreeKey = useKeyBind("graftNodeToTree");
  const removeNodeFromTreeKey = useKeyBind("removeNodeFromTree");
  const connectTopToBottomKey = useKeyBind("connectTopToBottom");
  const connectLeftToRightKey = useKeyBind("connectLeftToRight");
  const connectAllSelectedEntitiesKey = useKeyBind("connectAllSelectedEntities");

  const increaseBrightnessKey = useKeyBind("increaseBrightness");
  const decreaseBrightnessKey = useKeyBind("decreaseBrightness");
  const changeColorHueUpKey = useKeyBind("changeColorHueUp");
  const changeColorHueDownKey = useKeyBind("changeColorHueDown");
  const changeColorHueMajorUpKey = useKeyBind("changeColorHueMajorUp");
  const changeColorHueMajorDownKey = useKeyBind("changeColorHueMajorDown");

  if (!p) return <></>;

  const isSelectedTreeRoots = () => {
    const selectedEntities = p.stageManager.getSelectedEntities();
    if (selectedEntities.length === 0) return false;
    return selectedEntities.every((entity) => {
      return entity instanceof ConnectableEntity && p.graphMethods.isTree(entity);
    });
  };

  // 简化判断，只要选中了两个及以上的节点就显示按钮
  const hasMultipleSelectedEntities = () => {
    const selectedEntities = p.stageManager.getSelectedEntities();
    return selectedEntities.length >= 2 && selectedEntities.every((entity) => entity instanceof ConnectableEntity);
  };

  return (
    <Content>
      {/* 第一行 Ctrl+c/v/x del */}
      <Item className="bg-transparent! gap-0 p-0">
        <KeyTooltip keyId="copy">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              p.copyEngine.copy();
            }}
          >
            <Copy />
          </Button>
        </KeyTooltip>
        <KeyTooltip keyId="paste">
          <Button variant="ghost" size="icon" onClick={() => p.copyEngine.paste()}>
            <Clipboard />
          </Button>
        </KeyTooltip>
        {p.stageManager.getSelectedStageObjects().length > 0 && (
          <KeyTooltip keyId="deleteSelectedStageObjects">
            <Button variant="ghost" size="icon" onClick={() => p.stageManager.deleteSelectedStageObjects()}>
              <Trash className="text-destructive" />
            </Button>
          </KeyTooltip>
        )}
        <KeyTooltip keyId="undo">
          <Button variant="ghost" size="icon" onClick={() => p.historyManager.undo()}>
            <Undo />
          </Button>
        </KeyTooltip>

        {/* 先不放cut，感觉不常用，可能还很容易出bug */}
        {/* <KeyTooltip keyId="cut">
          <Button variant="ghost" size="icon" onClick={() => p.copyEngine.cut()}>
            <Scissors />
          </Button>
        </KeyTooltip> */}
      </Item>

      {/* 对齐面板 */}
      <Item className="bg-transparent! gap-0 p-0">
        {p.stageManager.getSelectedEntities().length >= 2 && (
          <div className="grid grid-cols-3 grid-rows-3">
            <ContextMenuTooltip keyId="alignTop">
              <Button variant="ghost" size="icon" className="size-6" onClick={() => p.layoutManager.alignTop()}>
                <AlignStartHorizontal />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="alignTopToBottomNoSpace">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignTopToBottomNoSpace()}
              >
                <AlignVerticalJustifyStart />
              </Button>
            </ContextMenuTooltip>
            <div />
            <ContextMenuTooltip keyId="alignCenterHorizontal">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignCenterHorizontal()}
              >
                <AlignCenterHorizontal />
              </Button>
            </ContextMenuTooltip>

            <ContextMenuTooltip keyId="alignVerticalSpaceBetween">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignVerticalSpaceBetween()}
              >
                <AlignVerticalSpaceBetween />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="layoutToSquare">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.layoutToSquare(p.stageManager.getSelectedEntities())}
              >
                <Grip />
              </Button>
            </ContextMenuTooltip>

            <ContextMenuTooltip keyId="alignBottom">
              <Button variant="ghost" size="icon" className="size-6" onClick={() => p.layoutManager.alignBottom()}>
                <AlignEndHorizontal />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="layoutToTightSquare">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.layoutToTightSquare(p.stageManager.getSelectedEntities())}
              >
                <LayoutDashboard />
              </Button>
            </ContextMenuTooltip>
            <div />
          </div>
        )}
        {p.stageManager.getSelectedEntities().length >= 2 && (
          <div className="grid grid-cols-3 grid-rows-3">
            <ContextMenuTooltip keyId="alignLeft">
              <Button variant="ghost" size="icon" className="size-6" onClick={() => p.layoutManager.alignLeft()}>
                <AlignStartVertical />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="alignCenterVertical">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignCenterVertical()}
              >
                <AlignCenterVertical />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="alignRight">
              <Button variant="ghost" size="icon" className="size-6" onClick={() => p.layoutManager.alignRight()}>
                <AlignEndVertical />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="alignLeftToRightNoSpace">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignLeftToRightNoSpace()}
              >
                <AlignHorizontalJustifyStart />
              </Button>
            </ContextMenuTooltip>

            <ContextMenuTooltip keyId="alignHorizontalSpaceBetween">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignHorizontalSpaceBetween()}
              >
                <AlignHorizontalSpaceBetween />
              </Button>
            </ContextMenuTooltip>

            <div />

            <ContextMenuTooltip keyId="adjustSelectedTextNodeWidthMin">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.adjustSelectedTextNodeWidth("minWidth")}
              >
                <ChevronsRightLeft />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="adjustSelectedTextNodeWidthAverage">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.adjustSelectedTextNodeWidth("average")}
              >
                <MoveHorizontal />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="adjustSelectedTextNodeWidthMax">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.adjustSelectedTextNodeWidth("maxWidth")}
              >
                <Code />
              </Button>
            </ContextMenuTooltip>
          </div>
        )}
      </Item>
      {/* 树形面板 */}
      {isSelectedTreeRoots() && (
        <Item className="bg-transparent! gap-0 p-0">
          <ContextMenuTooltip keyId="treeGraphAdjust">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() =>
                p.autoAlign.autoLayoutSelectedFastTreeMode(p.stageManager.getSelectedEntities()[0] as ConnectableEntity)
              }
            >
              <Network className="-rotate-90" />
            </Button>
          </ContextMenuTooltip>
          <ContextMenuTooltip keyId="treeReverseX">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() =>
                p.autoLayoutFastTree.treeReverseX(p.stageManager.getSelectedEntities()[0] as ConnectableEntity)
              }
            >
              <ArrowLeftRight />
            </Button>
          </ContextMenuTooltip>
          <ContextMenuTooltip keyId="treeReverseY">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() =>
                p.autoLayoutFastTree.treeReverseY(p.stageManager.getSelectedEntities()[0] as ConnectableEntity)
              }
            >
              <ArrowDownUp />
            </Button>
          </ContextMenuTooltip>
          <ContextMenuTooltip keyId="textNodeTreeToSection">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => {
                const textNodes = p.stageManager.getSelectedEntities().filter((it) => it instanceof TextNode);
                for (const textNode of textNodes) {
                  p.sectionPackManager.textNodeTreeToSection(textNode);
                }
              }}
            >
              <LayoutPanelTop />
            </Button>
          </ContextMenuTooltip>
          <ContextMenuTooltip keyId="layoutToTightSquareDeep">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => p.layoutManager.layoutBySelected(p.layoutManager.layoutToTightSquare, true)}
            >
              <SquareSquare />
            </Button>
          </ContextMenuTooltip>
        </Item>
      )}

      {/* DAG面板 */}
      {hasMultipleSelectedEntities() && (
        <Item className="bg-transparent! gap-0 p-0">
          <ContextMenuTooltip keyId="dagGraphAdjust">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => {
                const selectedEntities = p.stageManager
                  .getSelectedEntities()
                  .filter((entity) => entity instanceof ConnectableEntity);
                if (p.graphMethods.isDAGByNodes(selectedEntities)) {
                  p.autoLayout.autoLayoutDAG(selectedEntities);
                } else {
                  toast.error("选中的节点不构成有向无环图（DAG）");
                }
              }}
            >
              <Workflow />
            </Button>
          </ContextMenuTooltip>
        </Item>
      )}

      <p className="pl-1 text-xs opacity-50">{contextMenuTooltipWords || "暂无提示"}</p>

      {/* 存在选中实体 */}
      {p.stageManager.getSelectedStageObjects().length > 0 &&
        p.stageManager.getSelectedStageObjects().some((it) => "color" in it) && (
          <>
            {/* 更改更简单的颜色 */}
            <ColorLine />
            {/* 更改更详细的颜色 */}
            <Sub>
              <SubTrigger>
                <Palette />
                {t("changeColor")}
              </SubTrigger>
              <SubContent>
                <Item onClick={() => p.stageObjectColorManager.setSelectedStageObjectColor(Color.Transparent)}>
                  <Slash />
                  {t("resetColor")}
                </Item>
                <Item className="bg-transparent! grid grid-cols-11 gap-0">
                  {Object.values(tailwindColors)
                    .filter((it) => typeof it !== "string")
                    .slice(4)
                    .flatMap((it) => Object.values(it).map(Color.fromCss))
                    .map((color, index) => (
                      <div
                        key={index}
                        className="hover:outline-accent-foreground size-4 -outline-offset-2 hover:outline-2"
                        style={{ backgroundColor: color.toString() }}
                        onMouseEnter={() => p.stageObjectColorManager.setSelectedStageObjectColor(color)}
                      />
                    ))}
                </Item>
                <Item onClick={() => p.stageObjectColorManager.setSelectedStageObjectColor(new Color(11, 45, 14, 0))}>
                  改为强制特殊透明色
                </Item>
                <Item
                  onClick={() => {
                    ColorWindow.open();
                  }}
                >
                  打开调色板
                </Item>
                <Item
                  onClick={() => {
                    ColorPaletteWindow.open();
                  }}
                >
                  打开舞台颜色分布表
                </Item>
              </SubContent>
            </Sub>
          </>
        )}
      {/* 存在两个及以上选中实体 */}
      {p.stageManager.getSelectedEntities().length >= 2 && (
        <>
          <Item onClick={() => p.stageManager.packEntityToSectionBySelected()}>
            <Box />
            {t("packToSection")}
          </Item>
          <Item
            onClick={() => {
              const selectedNodes = p.stageManager
                .getSelectedEntities()
                .filter((node) => node instanceof ConnectableEntity);
              if (selectedNodes.length <= 1) {
                toast.error("至少选择两个可连接节点");
                return;
              }
              const edge = MultiTargetUndirectedEdge.createFromSomeEntity(p, selectedNodes);
              p.stageManager.add(edge);
            }}
          >
            <Asterisk />
            {t("createMTUEdgeLine")}
          </Item>
          <Item
            onClick={() => {
              const selectedNodes = p.stageManager
                .getSelectedEntities()
                .filter((node) => node instanceof ConnectableEntity);
              if (selectedNodes.length <= 1) {
                toast.error("至少选择两个可连接节点");
                return;
              }
              const edge = MultiTargetUndirectedEdge.createFromSomeEntity(p, selectedNodes);
              edge.renderType = "convex";
              p.stageManager.add(edge);
            }}
          >
            <SquareRoundCorner />
            {t("createMTUEdgeConvex")}
          </Item>
        </>
      )}
      {/* 没有选中实体，提示用户可以创建实体 */}
      {p.stageManager.getSelectedStageObjects().length === 0 && (
        <>
          <Item
            onClick={() =>
              p.controllerUtils.addTextNodeByLocation(
                p.renderer.transformView2World(MouseLocation.vector()),
                true,
                true,
              )
            }
          >
            <TextSelect />
            {t("createTextNode")}
          </Item>
          <Item
            onClick={() => p.controllerUtils.createConnectPoint(p.renderer.transformView2World(MouseLocation.vector()))}
          >
            <Dot />
            {t("createConnectPoint")}
          </Item>
        </>
      )}
      {/* 存在选中 TextNode */}
      {p.stageManager.getSelectedEntities().filter((it) => it instanceof TextNode).length > 0 && (
        <>
          <Item
            onClick={() => {
              const selectedTextNodes = p.stageManager.getSelectedEntities().filter((it) => it instanceof TextNode);
              for (const textNode of selectedTextNodes) {
                textNode.increaseFontSize();
              }
              p.historyManager.recordStep();
            }}
          >
            <Maximize2 />
            放大字体
            {increaseFontSizeKey && <ContextMenuShortcut>[{increaseFontSizeKey}]</ContextMenuShortcut>}
          </Item>
          <Item
            onClick={() => {
              const selectedTextNodes = p.stageManager.getSelectedEntities().filter((it) => it instanceof TextNode);
              for (const textNode of selectedTextNodes) {
                textNode.decreaseFontSize();
              }
              p.historyManager.recordStep();
            }}
          >
            <Minimize2 />
            缩小字体
            {decreaseFontSizeKey && <ContextMenuShortcut>[{decreaseFontSizeKey}]</ContextMenuShortcut>}
          </Item>
          <Item onClick={() => TextNodeSmartTools.ttt(p)}>
            <ListEnd />
            切换换行模式
            {toggleTextNodeSizeModeKey && <ContextMenuShortcut>[{toggleTextNodeSizeModeKey}]</ContextMenuShortcut>}
          </Item>
          <Sub>
            <SubTrigger>
              <Rabbit />
              文本节点 巧妙操作
            </SubTrigger>
            <SubContent>
              <Item onClick={() => TextNodeSmartTools.rua(p)}>
                <SquaresUnite />
                ruá成一个
                {mergeTextNodesKey && <ContextMenuShortcut>[{mergeTextNodesKey}]</ContextMenuShortcut>}
              </Item>
              <Item onClick={() => TextNodeSmartTools.kei(p)}>
                <SquareSplitHorizontal />
                kēi成多个
                {splitTextNodesKey && <ContextMenuShortcut>[{splitTextNodesKey}]</ContextMenuShortcut>}
              </Item>
              <Item onClick={() => TextNodeSmartTools.exchangeTextAndDetails(p)}>
                <Repeat2 />
                详略交换
                {swapTextAndDetailsKey && <ContextMenuShortcut>[{swapTextAndDetailsKey}]</ContextMenuShortcut>}
              </Item>
              <Item onClick={() => TextNodeSmartTools.removeFirstCharFromSelectedTextNodes(p)}>
                <ArrowLeftFromLine />
                削头
                {removeFirstCharKey && <ContextMenuShortcut>[{removeFirstCharKey}]</ContextMenuShortcut>}
              </Item>
              <Item onClick={() => TextNodeSmartTools.removeLastCharFromSelectedTextNodes(p)}>
                <ArrowRightFromLine />
                剃尾
                {removeLastCharKey && <ContextMenuShortcut>[{removeLastCharKey}]</ContextMenuShortcut>}
              </Item>

              <Item onClick={() => TextNodeSmartTools.okk(p)}>
                <Check />
                打勾勾
                {toggleCheckmarkKey && <ContextMenuShortcut>[{toggleCheckmarkKey}]</ContextMenuShortcut>}
              </Item>

              <Item
                onClick={() => {
                  const selectedTextNodes = p.stageManager.getSelectedEntities().filter((it) => it instanceof TextNode);
                  for (const textNode of selectedTextNodes) {
                    p.syncAssociationManager.createTwinTextNode(textNode);
                  }
                }}
              >
                <RefreshCcwDot />
                创建孪生节点
              </Item>

              <Item
                onClick={() =>
                  p.stageManager
                    .getSelectedEntities()
                    .filter((it) => it instanceof TextNode)
                    .map((it) => p.sectionPackManager.targetTextNodeToSection(it, false, true))
                }
              >
                <Package />
                {t("convertToSection")}
                {textNodeToSectionKey && <ContextMenuShortcut>[{textNodeToSectionKey}]</ContextMenuShortcut>}
              </Item>
              <Sub>
                <SubTrigger>
                  <Network />
                  连接相关
                </SubTrigger>
                <SubContent>
                  <Item onClick={() => ConnectNodeSmartTools.insertNodeToTree(p)}>
                    <GitPullRequestCreateArrow />
                    嫁接到连线中
                    {graftNodeToTreeKey && <ContextMenuShortcut>[{graftNodeToTreeKey}]</ContextMenuShortcut>}
                  </Item>
                  <Item onClick={() => ConnectNodeSmartTools.removeNodeFromTree(p)}>
                    <ArrowLeftFromLine />
                    从连线中摘除
                    {removeNodeFromTreeKey && <ContextMenuShortcut>[{removeNodeFromTreeKey}]</ContextMenuShortcut>}
                  </Item>
                  <Item onClick={() => ConnectNodeSmartTools.connectDown(p)}>
                    <MoveDown />
                    向下连一串
                    {connectTopToBottomKey && <ContextMenuShortcut>[{connectTopToBottomKey}]</ContextMenuShortcut>}
                  </Item>
                  <Item onClick={() => ConnectNodeSmartTools.connectRight(p)}>
                    <MoveRight />
                    向右连一串
                    {connectLeftToRightKey && <ContextMenuShortcut>[{connectLeftToRightKey}]</ContextMenuShortcut>}
                  </Item>
                  <Item onClick={() => ConnectNodeSmartTools.connectAll(p)}>
                    <Asterisk />
                    全连接
                    {connectAllSelectedEntitiesKey && (
                      <ContextMenuShortcut>[{connectAllSelectedEntitiesKey}]</ContextMenuShortcut>
                    )}
                  </Item>
                </SubContent>
              </Sub>
              <Sub>
                <SubTrigger>
                  <PaintBucket />
                  颜色相关
                </SubTrigger>
                <SubContent>
                  <Item onClick={() => ColorSmartTools.increaseBrightness(p)}>
                    <Sun />
                    增加亮度
                    {increaseBrightnessKey && <ContextMenuShortcut>[{increaseBrightnessKey}]</ContextMenuShortcut>}
                  </Item>
                  <Item onClick={() => ColorSmartTools.decreaseBrightness(p)}>
                    <SunDim />
                    降低亮度
                    {decreaseBrightnessKey && <ContextMenuShortcut>[{decreaseBrightnessKey}]</ContextMenuShortcut>}
                  </Item>
                  <Item onClick={() => ColorSmartTools.changeColorHueUp(p)}>
                    <ChevronUp />
                    增加色相值
                    {changeColorHueUpKey && <ContextMenuShortcut>[{changeColorHueUpKey}]</ContextMenuShortcut>}
                  </Item>
                  <Item onClick={() => ColorSmartTools.changeColorHueDown(p)}>
                    <ChevronDown />
                    降低色相值
                    {changeColorHueDownKey && <ContextMenuShortcut>[{changeColorHueDownKey}]</ContextMenuShortcut>}
                  </Item>
                  <Item onClick={() => ColorSmartTools.changeColorHueMajorUp(p)}>
                    <MoveUp />
                    大幅度增加色相值
                    {changeColorHueMajorUpKey && (
                      <ContextMenuShortcut>[{changeColorHueMajorUpKey}]</ContextMenuShortcut>
                    )}
                  </Item>
                  <Item onClick={() => ColorSmartTools.changeColorHueMajorDown(p)}>
                    <MoveDown />
                    大幅度降低色相值
                    {changeColorHueMajorDownKey && (
                      <ContextMenuShortcut>[{changeColorHueMajorDownKey}]</ContextMenuShortcut>
                    )}
                  </Item>
                </SubContent>
              </Sub>
              <Sub>
                <SubTrigger>
                  <Ellipsis />
                  其他
                </SubTrigger>
                <SubContent>
                  <Item onClick={() => TextNodeSmartTools.changeTextNodeToReferenceBlock(p)}>
                    <SquareDashedBottomCode />
                    将选中的文本节点转换为引用块
                  </Item>
                </SubContent>
              </Sub>
            </SubContent>
          </Sub>

          <Item onClick={() => openBrowserOrFile(p)}>
            <ExternalLink />
            将内容视为路径并打开
          </Item>
        </>
      )}
      {/* 存在选中 Section */}
      {p.stageManager.getSelectedEntities().filter((it) => it instanceof Section).length > 0 && (
        <>
          <Item onClick={() => p.stageManager.sectionSwitchCollapse()}>
            <Package />
            {t("toggleSectionCollapse")}
          </Item>
          <Item
            onClick={() => {
              const selectedSections = p.stageManager.getSelectedEntities().filter((it) => it instanceof Section);
              for (const section of selectedSections) {
                section.locked = !section.locked;
                p.sectionRenderer.render(section);
              }
              // 记录历史步骤
              p.historyManager.recordStep();
            }}
          >
            <Lock />
            锁定/解锁 section 框
          </Item>
        </>
      )}
      {/* 存在选中 引用块 */}
      {p.stageManager.getSelectedEntities().filter((it) => it instanceof ReferenceBlockNode).length > 0 && (
        <>
          <Item
            onClick={() => {
              p.stageManager
                .getSelectedEntities()
                .filter((it) => it instanceof ReferenceBlockNode)
                .filter((it) => it.isSelected)
                .forEach((it) => {
                  it.refresh();
                });
            }}
          >
            <RefreshCcwDot />
            刷新引用块
          </Item>
          <Item
            onClick={() => {
              p.stageManager
                .getSelectedEntities()
                .filter((it) => it instanceof ReferenceBlockNode)
                .filter((it) => it.isSelected)
                .forEach((it) => {
                  it.goToSource();
                });
            }}
          >
            <CornerUpRight />
            进入该引用块所在的源头位置
          </Item>
        </>
      )}
      {/* 存在选中的 Edge */}
      {p.stageManager.getSelectedAssociations().filter((it) => it instanceof Edge).length > 0 && (
        <>
          <Item
            onClick={() => {
              p.stageManager.switchEdgeToUndirectedEdge();
              p.historyManager.recordStep();
            }}
          >
            <Spline />
            转换为无向边
          </Item>
          <Sub>
            <SubTrigger>
              <ArrowRightFromLine />
              线条类型
            </SubTrigger>
            <SubContent>
              <Item
                onClick={() => {
                  p.stageManager.setSelectedEdgeLineType("solid");
                  p.historyManager.recordStep();
                }}
              >
                <Slash />
                实线
              </Item>
              <Item
                onClick={() => {
                  p.stageManager.setSelectedEdgeLineType("dashed");
                  p.historyManager.recordStep();
                }}
              >
                <Ellipsis />
                虚线
              </Item>
              <Item
                onClick={() => {
                  p.stageManager.setSelectedEdgeLineType("double");
                  p.historyManager.recordStep();
                }}
              >
                <Equal />
                双实线
              </Item>
            </SubContent>
          </Sub>
          <Item className="bg-transparent! gap-0 p-0">
            <div className="grid grid-cols-3 grid-rows-3">
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Up, true)}
              >
                <ArrowRightFromLine className="-rotate-90" />
              </Button>
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Left, true)}
              >
                <ArrowRightFromLine className="-rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(null, true)}
              >
                <SquareDot />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Right, true)}
              >
                <ArrowRightFromLine />
              </Button>
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Down, true)}
              >
                <ArrowRightFromLine className="rotate-90" />
              </Button>
              <div></div>
            </div>
            <div className="grid grid-cols-3 grid-rows-3">
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Up)}
              >
                <ArrowUpToLine className="rotate-180" />
              </Button>
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Left)}
              >
                <ArrowUpToLine className="rotate-90" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(null)}
              >
                <SquareDot />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Right)}
              >
                <ArrowUpToLine className="-rotate-90" />
              </Button>
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Down)}
              >
                <ArrowUpToLine />
              </Button>
              <div></div>
            </div>
          </Item>
        </>
      )}

      {/* 存在选中的 MTUEdge */}
      {p.stageManager.getSelectedAssociations().filter((it) => it instanceof MultiTargetUndirectedEdge).length > 0 && (
        <>
          <Sub>
            <SubTrigger>
              <ArrowUpRight />
              {t("switchMTUEdgeArrow")}
            </SubTrigger>
            <SubContent>
              <Item
                onClick={() => {
                  const selectedMTUEdges = p.stageManager
                    .getSelectedAssociations()
                    .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
                  for (const multi_target_undirected_edge of selectedMTUEdges) {
                    multi_target_undirected_edge.arrow = "outer";
                  }
                  p.historyManager.recordStep();
                }}
              >
                <Maximize2 />
                {t("mtuEdgeArrowOuter")}
              </Item>
              <Item
                onClick={() => {
                  const selectedMTUEdges = p.stageManager
                    .getSelectedAssociations()
                    .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
                  for (const multi_target_undirected_edge of selectedMTUEdges) {
                    multi_target_undirected_edge.arrow = "inner";
                  }
                  p.historyManager.recordStep();
                }}
              >
                <Minimize2 />
                {t("mtuEdgeArrowInner")}
              </Item>
              <Item
                onClick={() => {
                  const selectedMTUEdges = p.stageManager
                    .getSelectedAssociations()
                    .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
                  for (const multi_target_undirected_edge of selectedMTUEdges) {
                    multi_target_undirected_edge.arrow = "none";
                  }
                  p.historyManager.recordStep();
                }}
              >
                <Slash />
                {t("mtuEdgeArrowNone")}
              </Item>
            </SubContent>
          </Sub>

          <Item
            onClick={() => {
              const selectedMTUEdge = p.stageManager
                .getSelectedAssociations()
                .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
              for (const multi_target_undirected_edge of selectedMTUEdge) {
                if (multi_target_undirected_edge.renderType === "line") {
                  multi_target_undirected_edge.renderType = "convex";
                } else if (multi_target_undirected_edge.renderType === "convex") {
                  multi_target_undirected_edge.renderType = "circle";
                } else if (multi_target_undirected_edge.renderType === "circle") {
                  multi_target_undirected_edge.renderType = "line";
                }
              }
              p.historyManager.recordStep();
            }}
          >
            <RefreshCcw />
            {t("switchMTUEdgeRenderType")}
          </Item>

          <Item
            onClick={() => {
              // 重置所有选中无向边的端点位置到中心
              const selectedMTUEdges = p.stageManager
                .getSelectedAssociations()
                .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
              for (const multi_target_undirected_edge of selectedMTUEdges) {
                // 重置中心位置到中心
                multi_target_undirected_edge.centerRate = Vector.same(0.5);
                // 重置每个节点的连接点位置到中心
                multi_target_undirected_edge.rectRates = multi_target_undirected_edge.associationList.map(() =>
                  Vector.same(0.5),
                );
              }
              p.historyManager.recordStep();
            }}
          >
            <AlignCenterHorizontal />
            重置端点位置到中心
          </Item>

          <Item
            onClick={() => {
              p.stageManager.switchUndirectedEdgeToEdge();
              p.historyManager.recordStep();
            }}
          >
            <MoveUpRight />
            {t("convertToDirectedEdge")}
          </Item>
        </>
      )}

      {/* 涂鸦模式增加修改画笔颜色 */}
      {Settings.mouseLeftMode === "draw" && (
        <Sub>
          <SubTrigger>
            <Palette />
            改变画笔颜色
          </SubTrigger>
          <SubContent>
            <Item
              onClick={() => {
                Settings.autoFillPenStrokeColor = Color.Transparent.toArray();
              }}
            >
              <Slash />
              {t("resetColor")}
            </Item>
            <Item className="bg-transparent! grid grid-cols-11 gap-0">
              {Object.values(tailwindColors)
                .filter((it) => typeof it !== "string")
                .flatMap((it) => Object.values(it).map(Color.fromCss))
                .map((color, index) => (
                  <div
                    key={index}
                    className="hover:outline-accent-foreground size-4 -outline-offset-2 hover:outline-2"
                    style={{ backgroundColor: color.toString() }}
                    onMouseEnter={() => (Settings.autoFillPenStrokeColor = color.toArray())}
                  />
                ))}
            </Item>
          </SubContent>
        </Sub>
      )}

      {/* 存在选中 ImageNode */}
      {p.stageManager.getSelectedEntities().filter((it) => it instanceof ImageNode).length > 0 && (
        <>
          <Item
            onClick={async () => {
              // 获取所有选中的 ImageNode
              const selectedImageNodes = p.stageManager
                .getSelectedEntities()
                .filter((it) => it instanceof ImageNode) as ImageNode[];

              if (selectedImageNodes.length === 0) {
                toast.error("请选中图片节点");
                return;
              }

              // 复制第一张图片到剪贴板（如果有多张图片，只复制第一张）
              const imageNode = selectedImageNodes[0];
              const blob = p.attachments.get(imageNode.attachmentId);
              if (blob) {
                try {
                  const arrayBuffer = await blob.arrayBuffer();
                  const tauriImage = await TauriImage.fromBytes(new Uint8Array(arrayBuffer));
                  await writeImage(tauriImage);
                  if (selectedImageNodes.length === 1) {
                    toast.success("已将选中的图片复制到系统剪贴板");
                  } else {
                    toast.success(`已将第1张图片复制到系统剪贴板（共${selectedImageNodes.length}张）`);
                  }
                } catch (error) {
                  console.error("复制图片到剪贴板失败:", error);
                  toast.error("复制图片到剪贴板失败");
                }
              } else {
                toast.error("无法获取图片数据");
              }
            }}
          >
            <Clipboard />
            复制图片到系统剪贴板
          </Item>
          <Item
            onClick={() => {
              // 获取所有选中的 ImageNode
              const selectedImageNodes = p.stageManager
                .getSelectedEntities()
                .filter((it) => it instanceof ImageNode) as ImageNode[];

              if (selectedImageNodes.length === 0) {
                toast.error("请选中图片节点");
                return;
              }

              // 对每张图片进行红蓝通道对调
              for (const imageNode of selectedImageNodes) {
                imageNode.swapRedBlueChannels();
              }

              // 记录历史步骤
              p.historyManager.recordStep();

              // 显示提示信息
              if (selectedImageNodes.length === 1) {
                toast.success("已对调图片的红蓝通道");
              } else {
                toast.success(`已对调 ${selectedImageNodes.length} 张图片的红蓝通道`);
              }
            }}
          >
            <ArrowLeftRight />
            对调图片红蓝通道
          </Item>
          <Item
            onClick={() => {
              // 获取所有选中的 ImageNode
              const selectedImageNodes = p.stageManager
                .getSelectedEntities()
                .filter((it) => it instanceof ImageNode) as ImageNode[];

              if (selectedImageNodes.length === 0) {
                toast.error("请选中图片节点");
                return;
              }

              // 将选中的图片转化为背景图片
              for (const imageNode of selectedImageNodes) {
                imageNode.isBackground = true;
              }

              // 记录历史步骤
              p.historyManager.recordStep();

              // 显示提示信息
              if (selectedImageNodes.length === 1) {
                toast.success("已将图片转化为背景图片");
              } else {
                toast.success(`已将 ${selectedImageNodes.length} 张图片转化为背景图片`);
              }
            }}
          >
            <Images />
            转化为背景图片
          </Item>
          <Item
            onClick={() => {
              // 获取所有选中的 ImageNode
              const selectedImageNodes = p.stageManager
                .getSelectedEntities()
                .filter((it) => it instanceof ImageNode) as ImageNode[];

              if (selectedImageNodes.length === 0) {
                toast.error("请选中图片节点");
                return;
              }

              // 取消背景化
              for (const imageNode of selectedImageNodes) {
                imageNode.isBackground = false;
              }

              // 记录历史步骤
              p.historyManager.recordStep();

              // 显示提示信息
              if (selectedImageNodes.length === 1) {
                toast.success("已取消图片的背景化");
              } else {
                toast.success(`已取消 ${selectedImageNodes.length} 张图片的背景化`);
              }
            }}
          >
            <SquareSquare />
            取消背景化
          </Item>
          <Item
            onClick={async () => {
              // 检查是否是草稿模式
              if (p.isDraft) {
                toast.error("请先保存项目后再导出图片");
                return;
              }

              // 获取所有选中的 ImageNode
              const selectedImageNodes = p.stageManager
                .getSelectedEntities()
                .filter((it) => it instanceof ImageNode) as ImageNode[];

              if (selectedImageNodes.length === 0) {
                toast.error("请选中图片节点");
                return;
              }

              // 根据图片数量决定提示信息
              const isBatch = selectedImageNodes.length > 1;
              const promptMessage = isBatch
                ? `请输入文件名（不含扩展名，将为 ${selectedImageNodes.length} 张图片添加数字后缀）`
                : `请输入文件名（不含扩展名，将自动添加扩展名）`;

              // 弹出输入框 - 只弹出一次
              const fileName = await Dialog.input("另存图片", promptMessage, {
                placeholder: "image",
              });

              if (!fileName) {
                return; // 用户取消
              }

              // 验证文件名是否合法
              const invalidChars = /[/\\:*?"<>|]/;
              if (invalidChars.test(fileName)) {
                toast.error('文件名包含非法字符：/ \\ : * ? " < > |');
                return;
              }

              // 调用工具函数导出图片
              const { successCount, failedCount } = await exportImagesToProjectDirectory(
                selectedImageNodes,
                p.uri.fsPath,
                p.attachments,
                fileName,
              );

              // 显示结果提示
              if (successCount > 0 && failedCount === 0) {
                toast.success(`成功保存 ${successCount} 张图片`);
              } else if (successCount > 0 && failedCount > 0) {
                toast.warning(`成功保存 ${successCount} 张图片，${failedCount} 张失败`);
              } else {
                toast.error(`保存失败，请检查文件名或文件权限`);
              }
            }}
          >
            <Save />
            另存图片到当前prg所在目录下
          </Item>
        </>
      )}
    </Content>
  );
}

function ContextMenuTooltip({ keyId, children = <></> }: { keyId: string; children: ReactNode }) {
  const [keySeq, setKeySeq] = useState<ReturnType<typeof parseEmacsKey>[number][]>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setContextMenuTooltipWords] = useAtom(contextMenuTooltipWordsAtom);
  const { t } = useTranslation("keyBinds");

  useEffect(() => {
    // 立即获取当前快捷键配置
    const updateKeySeq = (keyBind: UIKeyBind | undefined) => {
      if (keyBind) {
        const keyStr = keyBind.key;
        const parsed = parseEmacsKey(keyStr);
        if (parsed.length > 0) {
          setKeySeq(parsed);
        } else {
          setKeySeq(undefined);
        }
      } else {
        setKeySeq(undefined);
      }
    };

    // 初始获取
    const currentKeyBind = KeyBindsUI.getUIKeyBind(keyId);
    updateKeySeq(currentKeyBind);

    // 监听快捷键变化
    const unsubscribe = KeyBindsUI.onKeyBindChange(keyId, updateKeySeq);

    return () => {
      unsubscribe();
    };
  }, [keyId]);

  const onMouseEnter = () => {
    const title = t(`${keyId}.title`);
    let keyTips = "";
    if (keySeq) {
      keyTips = keySeq
        .map((seq) => {
          let res = "";
          if (seq.control) {
            res += "Ctrl+";
          }
          if (seq.meta) {
            res += "Meta+";
          }
          if (seq.shift) {
            res += "Shift+";
          }
          if (seq.alt) {
            res += "Alt+";
          }
          return res + seq.key.toUpperCase();
        })
        .join(",");
    } else {
      keyTips = "未绑定快捷键";
    }
    setContextMenuTooltipWords(`${title} [${keyTips}]`);
  };

  const onMouseLeave = () => {
    setContextMenuTooltipWords("");
  };

  return (
    <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {children}
    </span>
  );
}

const ColorLine: React.FC = () => {
  const [currentColors, setCurrentColors] = useState<Color[]>([]);
  const [tab] = useAtom(activeTabAtom);
  const project = tab instanceof Project ? tab : undefined;

  useEffect(() => {
    ColorManager.getUserEntityFillColors().then((colors) => {
      setCurrentColors(colors);
    });
  }, []);

  const handleChangeColor = (color: Color) => {
    project?.stageObjectColorManager.setSelectedStageObjectColor(color);
  };

  return (
    <div className="flex max-w-64 overflow-x-auto">
      {currentColors.map((color) => {
        return (
          <div
            className="hover:outline-accent-foreground size-4 cursor-pointer -outline-offset-2 hover:outline-2"
            key={color.toString()}
            style={{
              backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
            }}
            onClick={() => {
              handleChangeColor(color);
            }}
          />
        );
      })}
    </div>
  );
};
