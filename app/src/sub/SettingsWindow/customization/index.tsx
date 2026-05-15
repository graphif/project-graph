import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Menu as MenuIcon, SlidersHorizontal, Sparkles, Volume2 } from "lucide-react";
import { Fragment, useState } from "react";
import ContextMenuPage from "./context-menu";
import EffectsPage from "./effects";
import QuickSettingsTab from "./quick-settings";
import SoundEffectsPage from "./sounds";

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
      <div className="mx-auto flex w-full flex-col overflow-auto p-4">
        <Component />
      </div>
    </div>
  );
}

const categories = {
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
  quickSettings: {
    name: "快捷设置",
    icon: SlidersHorizontal,
    component: QuickSettingsTab,
  },
};
