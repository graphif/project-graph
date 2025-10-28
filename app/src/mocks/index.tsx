import { isTauri } from "@tauri-apps/api/core";
import { enableMockApp } from "./app";
import { enableMockOs } from "./os";
import { enableMockStore } from "./store";
import { enableMockWindow } from "./window";

export function enableMock() {
  if (isTauri()) return;
  enableMockOs();
  enableMockApp();
  enableMockWindow();
  enableMockStore();
}
