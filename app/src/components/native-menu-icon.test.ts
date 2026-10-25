import { afterEach, describe, expect, it, vi } from "vitest";

const createImage = vi.hoisted(() => vi.fn().mockResolvedValue({ close: async () => {} }));
vi.mock("@tauri-apps/api/image", () => ({ Image: { new: createImage } }));

import { nativeMenuIcon } from "./native-menu-icon";

afterEach(() => vi.unstubAllGlobals());

describe("native menu labels", () => {
  it.each(["file", "view", "actions", "settings", "ai", "window", "extensions", "about"] as const)(
    "renders the %s Lucide icon and title at Retina resolution",
    async (id) => {
      let svg = "";
      const context = {
        font: "",
        fillStyle: "",
        textBaseline: "",
        measureText: () => ({ width: 30 }),
        scale: vi.fn(),
        drawImage: vi.fn(),
        fillText: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray(104 * 36 * 4) }),
      };
      const canvas = { width: 0, height: 0, getContext: () => context };
      vi.stubGlobal("document", { createElement: () => canvas });
      vi.stubGlobal("window", {
        Image: class {
          set src(value: string) {
            svg = decodeURIComponent(value);
          }
          async decode() {}
        },
      });
      await nativeMenuIcon(id, "菜单");
      expect(svg).toContain(
        {
          file: "lucide-file",
          view: "lucide-view",
          actions: "lucide-axe",
          extensions: "lucide-blocks",
          settings: "lucide-settings",
          ai: "lucide-bot",
          window: "lucide-app-window",
          about: "lucide-circle-alert",
        }[id],
      );
      expect(svg).toContain('stroke="white"');
      expect(context.fillStyle).toBe("white");
      expect(context.scale).toHaveBeenCalledWith(2, 2);
      expect(context.fillText).toHaveBeenCalledWith("菜单", 22, 9);
      expect(createImage).toHaveBeenLastCalledWith(expect.any(Uint8Array), 104, 36);
    },
  );
});
