import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  CircleGauge,
  LayoutPanelLeft,
  Menu as MenuIcon,
  Palette,
  PanelTop,
  SlidersHorizontal,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Fragment, useState } from "react";
import ThemesTab from "../themes";
import ContextMenuPage from "./context-menu";
import EffectsPage from "./effects";
import GlobalMenuPage from "./global-menu";
import PieMenuPage from "./pie-menu";
import QuickSettingsTab from "./quick-settings";
import SoundEffectsPage from "./sounds";
import WindowOpenModesPage from "./window-open-modes";

export default function CustomizationTab() {
  const [currentCategory, setCurrentCategory] = useState("effects");

  // @ts-expect-error fuck ts
  const Component = currentCategory && currentCategory in categories ? categories[currentCategory].component : Fragment;
  return (
    <div className="flex h-full">
      <Sidebar className="h-full overflow-auto">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {Object.entries(categories).map(([k, v]) => (
                  <SidebarMenuItem key={k}>
                    <SidebarMenuButton asChild onClick={() => setCurrentCategory(k)} isActive={currentCategory === k}>
                      <div>
                        <v.icon className="size-4" />
                        <span>{v.name}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="mx-auto flex w-full flex-col overflow-auto">
        <Component />
      </div>
    </div>
  );
}

const categories = {
  themes: {
    name: "主题",
    icon: Palette,
    component: ThemesTab,
  },
  effects: {
    name: "特效",
    icon: Sparkles,
    component: EffectsPage,
  },
  sounds: {
    name: "音效",
    icon: Volume2,
    component: SoundEffectsPage,
  },
  contextMenu: {
    name: "右键菜单",
    icon: MenuIcon,
    component: ContextMenuPage,
  },
  globalMenu: {
    name: "菜单栏",
    icon: PanelTop,
    component: GlobalMenuPage,
  },
  pieMenu: {
    name: "饼状菜单",
    icon: CircleGauge,
    component: PieMenuPage,
  },
  quickSettings: {
    name: "快捷设置",
    icon: SlidersHorizontal,
    component: QuickSettingsTab,
  },
  windowOpenModes: {
    name: "窗口打开方式",
    icon: LayoutPanelLeft,
    component: WindowOpenModesPage,
  },
};
