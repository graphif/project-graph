import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom, store } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Brush, Info, Keyboard, Loader2, Palette, SettingsIcon, User } from "lucide-react";
import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import AboutTab from "./about";
import AppearanceTab from "./appearance";
import CreditsTab from "./credits";
import KeyBindsPage from "./keybinds";
import SettingsTab from "./settings";
import ThemesTab from "./themes";

const tabs = [
  { value: "settings", icon: SettingsIcon },
  { value: "keybinds", icon: Keyboard },
  { value: "appearance", icon: Brush },
  { value: "themes", icon: Palette },
  { value: "about", icon: Info },
  { value: "credits", icon: User },
] as const;
type TabName = (typeof tabs)[number]["value"];

export default function SettingsWindow({ defaultTab = "settings" }: { defaultTab?: TabName }) {
  const [currentTab, setCurrentTab] = useState<TabName>(defaultTab);
  const { t } = useTranslation("settings");

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab as any} className="h-full gap-0 overflow-hidden">
      <div className="flex">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon />
              {t(`tabs.${tab.value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <div data-pg-drag-region className="h-full flex-1" />
      </div>
      <TabsContent value="settings" className="overflow-auto">
        <SettingsTab />
      </TabsContent>
      <TabsContent value="keybinds" className="overflow-auto">
        <KeyBindsPage />
      </TabsContent>
      <TabsContent value="appearance" className="overflow-auto">
        <AppearanceTab />
      </TabsContent>
      <TabsContent value="themes" className="overflow-auto">
        <ThemesTab />
      </TabsContent>
      <TabsContent value="about" className="overflow-auto">
        <AboutTab />
      </TabsContent>
      <TabsContent value="credits" className="overflow-auto">
        <Suspense
          fallback={
            <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-4 p-4">
              <Loader2 className="animate-spin" />
              正在加载数据
            </div>
          }
        >
          <CreditsTab />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}

// TODO: page参数
SettingsWindow.open = (tab: TabName = "settings") => {
  store.get(activeProjectAtom)?.pause();
  SubWindow.create({
    children: <SettingsWindow defaultTab={tab} />,
    rect: Rectangle.inCenter(new Vector(innerWidth > 1653 ? 1240 : innerWidth * 0.75, innerHeight * 0.875)),
    titleBarOverlay: true,
  });
};
