import { Tab } from "@/core/Tab";
import { atom, createStore } from "jotai";

export const store = createStore();

export const tabsAtom = atom<Tab[]>([]);
export const activeTabAtom = atom<Tab | undefined>(undefined);

export const isClassroomModeAtom = atom(false);
// export const isPrivacyModeAtom = atom(false);
export const nextProjectIdAtom = atom(1);
export const isWindowAlwaysOnTopAtom = atom<boolean>(false);

export const isWindowMaxsizedAtom = atom<boolean>(false);
// 窗口穿透点击相关
export const isClickThroughEnabledAtom = atom<boolean>(false);

export const isDevAtom = atom<boolean>(false);
