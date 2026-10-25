import { beforeEach, describe, expect, it, vi } from "vitest";

const dialogs = vi.hoisted(() => ({ open: vi.fn(), save: vi.fn() }));
vi.mock("mygo-runtime", () => ({ isMyGo: () => true }));
vi.mock("@/generated/mygo", () => ({ Dialogs: dialogs }));

import { open, save } from "./dialogs";

beforeEach(() => vi.clearAllMocks());

describe("native file dialogs", () => {
  it("normalizes options and preserves single/multiple selection", async () => {
    dialogs.open.mockResolvedValue(["C:/one.prg", "C:/two.prg"]);
    expect(await open()).toBe("C:/one.prg");
    expect(dialogs.open).toHaveBeenCalledWith({
      title: "",
      defaultPath: "",
      directory: false,
      multiple: false,
      filters: [],
    });
    expect(await open({ multiple: true })).toEqual(["C:/one.prg", "C:/two.prg"]);
  });

  it("maps canceled open/save to null without turning failures into cancel", async () => {
    dialogs.open.mockResolvedValue([]);
    dialogs.save.mockResolvedValue("");
    expect(await open({ multiple: true })).toBeNull();
    expect(await save()).toBeNull();
    dialogs.save.mockRejectedValue(new Error("native dialog failed"));
    await expect(save()).rejects.toThrow("native dialog failed");
  });
});
