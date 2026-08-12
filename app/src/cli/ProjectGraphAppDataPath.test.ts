import { describe, expect, it } from "vitest";
import { resolveProjectGraphAppDataDirectories } from "./ProjectGraphAppDataPath";

describe("Project Graph app-data paths", () => {
  it("matches the Tauri bundle-identifier path on macOS", () => {
    expect(resolveProjectGraphAppDataDirectories("darwin", {}, "/Users/alice")).toEqual([
      "/Users/alice/Library/Application Support/liren.project-graph",
    ]);
  });

  it("uses roaming app data on Windows and retains the former macOS-style fallback", () => {
    expect(
      resolveProjectGraphAppDataDirectories(
        "win32",
        { APPDATA: "C:\\Users\\alice\\AppData\\Roaming" },
        "C:\\Users\\alice",
      ),
    ).toEqual([
      "C:\\Users\\alice\\AppData\\Roaming\\liren.project-graph",
      "C:\\Users\\alice\\Library\\Application Support\\liren.project-graph",
    ]);
  });

  it("uses XDG data on Linux and retains the former macOS-style fallback", () => {
    expect(resolveProjectGraphAppDataDirectories("linux", { XDG_DATA_HOME: "/data/alice" }, "/home/alice")).toEqual([
      "/data/alice/liren.project-graph",
      "/home/alice/Library/Application Support/liren.project-graph",
    ]);
  });
});
