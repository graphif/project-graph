// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

vi.mock("@/core/service/feedbackService/SoundService", () => ({ SoundService: {} }));
vi.mock("@radix-ui/react-menubar", () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
  Content: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
    <div {...props} ref={ref} data-state="open" style={{ animation: "none" }} />
  )),
}));

import { MenubarContent } from "./menubar";

it("waits for placement on each mount before revealing the menu", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      await act(async () => root.render(<MenubarContent>Menu</MenubarContent>));
      const menu = container.querySelector<HTMLElement>('[data-slot="menubar-content"]')!;
      expect(menu.dataset.pgMenuPositioned).toBe("false");
      await act(async () => {
        menu.style.animation = "";
      });
      expect(menu.dataset.pgMenuPositioned).toBe("true");
      await act(async () => root.render(null));
    }
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
