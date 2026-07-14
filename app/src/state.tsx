import { isResourceTab, ResourceTab, Tab } from "@/core/Tab";
import { atom, createStore } from "jotai";

export const store = createStore();

export const tabsAtom = atom<Tab[]>([]);
export const activeTabAtom = atom<Tab | undefined>(undefined);
const lastActiveDockedTabAtom = atom<Tab | undefined>(undefined);
export const activeDockedTabAtom = atom(
  (get) => {
    const activeTab = get(activeTabAtom);
    if (activeTab?.layout === "docked") return activeTab;
    const dockedTabs = get(tabsAtom).filter((tab) => tab.layout === "docked");
    const lastActive = get(lastActiveDockedTabAtom);
    return lastActive && dockedTabs.includes(lastActive) ? lastActive : dockedTabs.at(-1);
  },
  (_get, set, tab: Tab | undefined) => set(lastActiveDockedTabAtom, tab),
);
export const resourceTabsAtom = atom((get) => get(tabsAtom).filter(isResourceTab));
const lastActiveResourceTabAtom = atom<ResourceTab | undefined>(undefined);
export const activeResourceTabAtom = atom(
  (get) => {
    const activeTab = get(activeTabAtom);
    if (activeTab && isResourceTab(activeTab)) return activeTab;
    const resources = get(resourceTabsAtom);
    const lastActive = get(lastActiveResourceTabAtom);
    return lastActive && resources.includes(lastActive) ? lastActive : resources.at(-1);
  },
  (_get, set, tab: ResourceTab | undefined) => set(lastActiveResourceTabAtom, tab),
);

export const isClassroomModeAtom = atom(false);
// export const isPrivacyModeAtom = atom(false);
export const nextProjectIdAtom = atom(1);
export const isWindowAlwaysOnTopAtom = atom<boolean>(false);

export const isWindowMaxsizedAtom = atom<boolean>(false);
// 窗口穿透点击相关
export const isClickThroughEnabledAtom = atom<boolean>(false);

export const isDevAtom = atom<boolean>(false);

// 认证相关
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const currentUserAtom = atom<AuthUser | null>(null);
export const isAuthLoadingAtom = atom(true);

export const commandPaletteVisibleAtom = atom(false);
