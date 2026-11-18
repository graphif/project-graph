// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Store } from "@/platform/store";
import { Onboarding } from "./onboarding";
import type { OnboardingState } from "./onboarding-state";

const mocks = vi.hoisted(() => ({
  persist: vi.fn().mockResolvedValue(undefined),
  detect: vi
    .fn()
    .mockResolvedValue({ status: "not-detected", installations: [], dataDirectories: [], errors: [], running: false }),
  show: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
  close: undefined as (() => Promise<void>) | undefined,
  applyTheme: vi.fn(),
  refresh: vi.fn().mockResolvedValue(undefined),
  importAll: vi.fn(),
}));
vi.mock("@/core/service/settings", () => ({
  Settings: { language: "en", theme: "test-dark", uiScalePercent: 100 },
  persistSettings: mocks.persist,
  refreshSettings: mocks.refresh,
}));
vi.mock("@/core/service/themes", () => ({
  Themes: {
    builtinThemes: [
      { metadata: { id: "light", name: "Light", type: "light" } },
      { metadata: { id: "dark", name: "Dark", type: "dark" } },
    ],
    getThemeById: (id: string) => ({ metadata: { id, type: id === "light" ? "light" : "dark" } }),
    applyThemeById: mocks.applyTheme,
  },
}));
vi.mock("@/generated/mygo", () => ({ Migration: { detect: mocks.detect, importAll: mocks.importAll } }));
vi.mock("@/platform/dialogs", () => ({ open: vi.fn() }));
vi.mock("@/platform/shell", () => ({ open: vi.fn() }));
vi.mock("@/platform/window", () => ({
  getCurrentWindow: () => ({
    show: mocks.show,
    destroy: mocks.destroy,
    onCloseRequested: async (callback: () => Promise<void>) => {
      mocks.close = callback;
      return () => {
        mocks.close = undefined;
      };
    },
  }),
}));

let root: Root;
let container: HTMLDivElement;
const initial: OnboardingState = {
  version: 2,
  step: 0,
  completedAt: null,
  draft: { language: "en", theme: "test-dark", uiScalePercent: 100 },
};

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.persist.mockResolvedValue(undefined);
  mocks.applyTheme.mockReturnValue({});
  mocks.detect.mockResolvedValue({
    status: "not-detected",
    installations: [],
    dataDirectories: [],
    errors: [],
    running: false,
  });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  });
  await i18next.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        onboarding: {
          next: "Next",
          back: "Back",
          continue: "Continue",
          finish: "Finish",
          close: "Close",
          welcome: { title: "Welcome" },
          migration: {
            title: "Migration",
            subtitle: "Migration subtitle",
            import: "Transfer",
            importing: "Transferring",
            imported: "Transferred",
            skip: "Skip transfer",
          },
          appearance: {
            title: "Appearance",
            subtitle: "Appearance subtitle",
            theme: "Theme",
            scale: "Scale",
            preview: "Preview",
            light: "Light",
            dark: "Dark",
          },
          ready: { title: "Ready" },
        },
      },
    },
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function click(label: string) {
  const button = [...container.querySelectorAll("button")].find((element) => element.textContent === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  await act(async () => button.click());
}

function storage() {
  return { set: vi.fn().mockResolvedValue(undefined) } as unknown as Store;
}

describe("first-launch UI gate", () => {
  it("keeps the migration page in the four-page sequence and focuses each heading", async () => {
    const store = storage();
    const complete = vi.fn();
    await act(async () => root.render(<Onboarding storage={store} initial={initial} onComplete={complete} />));
    expect(container.querySelector("h1")?.textContent).toBe("Welcome");
    await click("Next");
    expect(container.querySelector("h1")?.textContent).toBe("Migration");
    expect(document.activeElement).toBe(container.querySelector("h1"));
    await click("Skip transfer");
    expect(container.querySelector("h1")?.textContent).toBe("Appearance");
    await click("Next");
    expect(container.querySelector("h1")?.textContent).toBe("Ready");
    expect(complete).not.toHaveBeenCalled();
    expect(store.set).toHaveBeenLastCalledWith("state", {
      ...initial,
      step: 3,
      draft: { ...initial.draft, theme: "dark" },
    });
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("does not advance after a failed draft write and allows retry", async () => {
    const store = storage();
    vi.mocked(store.set).mockRejectedValueOnce(new Error("disk full"));
    await act(async () => root.render(<Onboarding storage={store} initial={initial} onComplete={vi.fn()} />));
    await click("Next");
    expect(container.querySelector("h1")?.textContent).toBe("Welcome");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("disk full");
    await click("Next");
    expect(container.querySelector("h1")?.textContent).toBe("Migration");
  });

  it("requires durable settings and completion writes before releasing the gate", async () => {
    const store = storage();
    const complete = vi.fn();
    mocks.persist.mockRejectedValueOnce(new Error("settings write failed"));
    await act(async () =>
      root.render(<Onboarding storage={store} initial={{ ...initial, step: 3 }} onComplete={complete} />),
    );
    await click("Finish");
    expect(complete).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
    expect(container.textContent).toContain("settings write failed");
    vi.mocked(store.set).mockRejectedValueOnce(new Error("marker write failed"));
    await click("Finish");
    expect(complete).not.toHaveBeenCalled();
    expect(container.textContent).toContain("marker write failed");
    await click("Finish");
    expect(mocks.persist).toHaveBeenLastCalledWith(
      expect.objectContaining({ language: "en", themeMode: "dark", darkTheme: "dark" }),
    );
    expect(store.set).toHaveBeenLastCalledWith("state", expect.objectContaining({ completedAt: expect.any(String) }));
    expect(complete).toHaveBeenCalledOnce();
  });

  it("blocks window close while committing and unregisters the gate handler on exit", async () => {
    const store = storage();
    let resolve!: () => void;
    vi.mocked(store.set).mockReturnValueOnce(
      new Promise<void>((done) => {
        resolve = done;
      }),
    );
    await act(async () => root.render(<Onboarding storage={store} initial={initial} onComplete={vi.fn()} />));
    await click("Next");
    await act(async () => {
      await mocks.close?.();
    });
    expect(mocks.destroy).not.toHaveBeenCalled();
    await act(async () => {
      resolve();
    });
    await act(async () => {
      await mocks.close?.();
    });
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });

  it("detects automatically, transfers in one click, and remembers success when returning", async () => {
    mocks.detect.mockResolvedValue({ dataDirectories: ["old-data", "old-local-data"], errors: [], running: false });
    const report = { imported: 12, completedAt: "2026-11-07T00:00:00Z" };
    mocks.importAll.mockResolvedValue(report);
    const store = storage();
    await act(async () =>
      root.render(<Onboarding storage={store} initial={{ ...initial, step: 1 }} onComplete={vi.fn()} />),
    );
    expect(mocks.detect).toHaveBeenCalledOnce();
    expect(mocks.importAll).not.toHaveBeenCalled();
    expect(container.querySelector("select")).toBeNull();
    await click("Transfer");
    expect(mocks.importAll).toHaveBeenCalledExactlyOnceWith();
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(store.set).toHaveBeenLastCalledWith("state", expect.objectContaining({ migration: report }));
    expect(container.textContent).toContain("Transferred");
    await click("Next");
    await click("Back");
    expect(container.textContent).toContain("Transferred");
    expect(mocks.importAll).toHaveBeenCalledOnce();
  });

  it("locks navigation and window close during transfer, then allows retry after failure", async () => {
    mocks.detect.mockResolvedValue({ dataDirectories: ["old-data"], errors: [], running: false });
    let reject!: (reason: Error) => void;
    mocks.importAll.mockReturnValueOnce(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    await act(async () =>
      root.render(<Onboarding storage={storage()} initial={{ ...initial, step: 1 }} onComplete={vi.fn()} />),
    );
    await click("Transfer");
    expect([...container.querySelectorAll("button")].every((button) => button.disabled)).toBe(true);
    await act(async () => {
      await mocks.close?.();
    });
    expect(mocks.destroy).not.toHaveBeenCalled();
    await act(async () => reject(new Error("disk full")));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("disk full");
    mocks.importAll.mockResolvedValue({ imported: 1, completedAt: "2026-11-07T00:00:00Z" });
    await click("Transfer");
    expect(container.textContent).toContain("Transferred");
  });

  it("requires the old application to close before allowing transfer", async () => {
    mocks.detect.mockResolvedValue({ dataDirectories: ["old-data"], errors: [], running: true });
    await act(async () =>
      root.render(<Onboarding storage={storage()} initial={{ ...initial, step: 1 }} onComplete={vi.fn()} />),
    );
    expect([...container.querySelectorAll("button")].some((button) => button.textContent === "Transfer")).toBe(false);
    await click("Skip transfer");
    expect(mocks.importAll).not.toHaveBeenCalled();
    expect(container.querySelector("h1")?.textContent).toBe("Appearance");
  });
});
