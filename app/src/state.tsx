import { atom, createStore } from "jotai";
import { Project } from "@/core/Project";
/**
 * 全局状态管理
 */

export const store = createStore();

export const projectsAtom = atom<Project[]>([]);
export const activeProjectAtom = atom<Project | undefined>(undefined);
export const isClassroomModeAtom = atom(false);
// export const isPrivacyModeAtom = atom(false);
export const nextProjectIdAtom = atom(1);
export const contextMenuTooltipWordsAtom = atom<string>("");
export const isWindowAlwaysOnTopAtom = atom<boolean>(false);

export const isWindowMaxsizedAtom = atom<boolean>(false);
// 窗口穿透点击相关
export const isClickThroughEnabledAtom = atom<boolean>(false);
// 开启窗口穿透点击之前的窗口不透明度
export const windowOpacityBeforeClickThroughAtom = atom<number>(1);
// 开启窗口穿透点击之前，窗口是否置于顶层
export const windowIsAlwaysTopBeforeClickThroughAtom = atom<boolean>(false);
