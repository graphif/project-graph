import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSubWindow } from "@/core/subWindowOpen";
import { ComponentTabContext } from "@/core/Tab";
import { activeTabAtom, store } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Blocks, Brush, HandHeart, Info, Keyboard, Settings, User } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAtomValue } from "jotai";
import AboutTab from "./about";
import AccountTab from "./account";
import CreditsTab from "./credits";
import CustomizationTab from "./customization";
import QuickSettingsTab from "./customization/quick-settings";
import ExtensionsTab from "./extensions";
import KeyBindsPage from "./keybinds";
import SettingsTab from "./settings";

type TabName = "settings" | "linuxRuntime" | "keybinds" | "customization" | "about" | "extensions" | "account";

export default function SettingsWindow({ defaultTab = "settings" }: { defaultTab?: TabName }) {
  const [currentTab, setCurrentTab] = useState<TabName>(defaultTab);
  const owner = useContext(ComponentTabContext);
  const activeTab = useAtomValue(activeTabAtom);
  const [navigationHost, setNavigationHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setNavigationHost(document.getElementById("pg-titlebar-navigation"));
  }, []);
  const portalHost = owner?.layout === "docked" && activeTab === owner ? navigationHost : null;
  const navigation = (
    <div className="scrollbar-hide h-full max-w-full min-w-0 overflow-x-auto rounded-full">
      <TabsList
        variant="capsule"
        className="w-max [&_[data-slot=tabs-indicator]]:rounded-full [&_[role=tab]]:shrink-0 [&_[role=tab]]:rounded-full"
      >
        <TabsTrigger value="settings">
          <Settings />
          设置
        </TabsTrigger>
        <TabsTrigger value="keybinds">
          <Keyboard />
          快捷键
        </TabsTrigger>
        <TabsTrigger value="customization">
          <Brush />
          个性化
        </TabsTrigger>
        <TabsTrigger value="account">
          <User />
          账户
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
    </div>
  );

  return (
    <Tabs
      data-pg-settings-view
      value={currentTab}
      onValueChange={setCurrentTab as any}
      className="h-full gap-0 overflow-hidden"
    >
      {portalHost ? createPortal(navigation, portalHost) : <div className="flex h-10 shrink-0">{navigation}</div>}
      <TabsContent value="settings" className="min-h-0 overflow-hidden">
        <SettingsTab />
      </TabsContent>
      <TabsContent value="keybinds" className="min-h-0 overflow-hidden">
        <KeyBindsPage />
      </TabsContent>
      <TabsContent value="customization" className="overflow-auto">
        <CustomizationTab />
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
  createSubWindow("SettingsWindow", {
    icon: Settings,
    title: "设置",
    children: <SettingsWindow defaultTab={tab} />,
    rect: Rectangle.inCenter(new Vector(innerWidth > 1653 ? 1240 : innerWidth * 0.75, innerHeight * 0.875)),
    titleBarOverlay: true,
  });
};
