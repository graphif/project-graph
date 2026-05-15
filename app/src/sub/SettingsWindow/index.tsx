import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubWindow } from "@/core/service/SubWindow";
import { activeTabAtom, store } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Blocks, Brush, Command, HandHeart, Info, Keyboard, Palette, PanelRight, Settings, User } from "lucide-react";
import { useState } from "react";
import AboutTab from "./about";
import AccountTab from "./account";
import CreditsTab from "./credits";
import CustomizationTab from "./customization";
import ExtensionsTab from "./extensions";
import KeyBindsPage from "./keybinds";
import KeyBindsGlobalPage from "./keybindsGlobal";
import QuickSettingsTab from "./quick-settings";
import SettingsTab from "./settings";
import ThemesTab from "./themes";

type TabName = "settings" | "keybinds" | "customization" | "about" | "quickSettings" | "extensions" | "account";

export default function SettingsWindow({ defaultTab = "settings" }: { defaultTab?: TabName }) {
  const [currentTab, setCurrentTab] = useState<TabName>(defaultTab);

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab as any} className="h-full gap-0 overflow-hidden">
      <div className="flex">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings />
            设置
          </TabsTrigger>
          <TabsTrigger value="keybinds">
            <Keyboard />
            快捷键
          </TabsTrigger>
          <TabsTrigger value="keybindsGlobal">
            <Command />
            全局快捷键
          </TabsTrigger>
          <TabsTrigger value="customization">
            <Brush />
            个性化
          </TabsTrigger>
          <TabsTrigger value="themes">
            <Palette />
            主题
          </TabsTrigger>
          <TabsTrigger value="account">
            <User />
            账户
          </TabsTrigger>
          <TabsTrigger value="quickSettings">
            <PanelRight />
            快捷设置
          </TabsTrigger>
          <TabsTrigger value="extensions">
            <Blocks />
            扩展
          </TabsTrigger>
          <TabsTrigger value="about">
            <Info />
            关于
          </TabsTrigger>
          <TabsTrigger value="credits">
            <HandHeart />
            鸣谢
          </TabsTrigger>
        </TabsList>
        <div data-pg-drag-region className="h-full flex-1" />
      </div>
      <TabsContent value="settings" className="overflow-auto">
        <SettingsTab />
      </TabsContent>
      <TabsContent value="keybinds" className="overflow-auto">
        <KeyBindsPage />
      </TabsContent>
      <TabsContent value="keybindsGlobal" className="overflow-auto">
        <KeyBindsGlobalPage />
      </TabsContent>
      <TabsContent value="customization" className="overflow-auto">
        <CustomizationTab />
      </TabsContent>
      <TabsContent value="themes" className="overflow-auto">
        <ThemesTab />
      </TabsContent>
      <TabsContent value="account" className="overflow-auto">
        <AccountTab />
      </TabsContent>
      <TabsContent value="quickSettings" className="overflow-auto">
        <QuickSettingsTab />
      </TabsContent>
      <TabsContent value="extensions" className="overflow-auto">
        <ExtensionsTab />
      </TabsContent>
      <TabsContent value="about" className="overflow-auto">
        <AboutTab />
      </TabsContent>
      <TabsContent value="credits" className="overflow-auto">
        <CreditsTab />
      </TabsContent>
    </Tabs>
  );
}

// TODO: page参数
SettingsWindow.open = (tab: TabName = "settings") => {
  store.get(activeTabAtom)?.pause();
  SubWindow.create({
    children: <SettingsWindow defaultTab={tab} />,
    rect: Rectangle.inCenter(new Vector(innerWidth > 1653 ? 1240 : innerWidth * 0.75, innerHeight * 0.875)),
    titleBarOverlay: true,
  });
};
