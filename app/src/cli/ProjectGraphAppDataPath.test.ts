import { describe, expect, it } from "vitest";
import {
  resolveProjectGraphAppDataDirectories,
  resolveProjectGraphOwnershipDirectory,
  resolveProjectOwnershipArtifactPaths,
} from "./ProjectGraphAppDataPath";

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

  it("stores Project ownership under the native per-user app-data directory", () => {
    expect(resolveProjectGraphOwnershipDirectory("darwin", {}, "/Users/alice")).toBe(
      "/Users/alice/Library/Application Support/liren.project-graph/project-ownership",
    );
    expect(
      resolveProjectGraphOwnershipDirectory(
        "win32",
        { APPDATA: "C:\\Users\\alice\\AppData\\Roaming" },
        "C:\\Users\\alice",
      ),
    ).toBe("C:\\Users\\alice\\AppData\\Roaming\\liren.project-graph\\project-ownership");
    expect(resolveProjectGraphOwnershipDirectory("linux", { XDG_DATA_HOME: "/data/alice" }, "/home/alice")).toBe(
      "/data/alice/liren.project-graph/project-ownership",
    );
  });

  it("uses the canonical Project Path hash as the artifact key on Unix", () => {
    expect(resolveProjectOwnershipArtifactPaths("/projects/graph.prg", "/app-data/project-ownership", "linux")).toEqual(
      {
        ownershipLock:
          "/app-data/project-ownership/624b76f040538e5c4bab3f62f4111c955343dec3ede76c976f50ca8ac300a62e.lock",
        connectableOwnerLock:
          "/app-data/project-ownership/624b76f040538e5c4bab3f62f4111c955343dec3ede76c976f50ca8ac300a62e.connectable.lock",
        connectableOwnerRecord:
          "/app-data/project-ownership/624b76f040538e5c4bab3f62f4111c955343dec3ede76c976f50ca8ac300a62e.connectable",
      },
    );
  });

  it("normalizes a Windows verbatim canonical path and hashes its UTF-16 representation", () => {
    expect(
      resolveProjectOwnershipArtifactPaths(
        "\\\\?\\C:\\Projects\\Graph.prg",
        "C:\\AppData\\liren.project-graph\\project-ownership",
        "win32",
      ),
    ).toEqual({
      ownershipLock:
        "C:\\AppData\\liren.project-graph\\project-ownership\\3ba5afbf87609293ab5fdd2921a3bbc7663d526d3ec657bd394ddc097efc7d68.lock",
      connectableOwnerLock:
        "C:\\AppData\\liren.project-graph\\project-ownership\\3ba5afbf87609293ab5fdd2921a3bbc7663d526d3ec657bd394ddc097efc7d68.connectable.lock",
      connectableOwnerRecord:
        "C:\\AppData\\liren.project-graph\\project-ownership\\3ba5afbf87609293ab5fdd2921a3bbc7663d526d3ec657bd394ddc097efc7d68.connectable",
    });
  });
});
