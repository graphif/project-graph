import { mockIPC } from "@tauri-apps/api/mocks";

export function enableMockApp() {
  mockIPC((cmd) => {
    switch (cmd) {
      case "plugin:app|version": {
        return "0.0.0-web";
      }
    }
  });
}
