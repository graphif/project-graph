import { RecentFileManager } from "./RecentFileManager";
import { onOpenFile } from "../GlobalMenu";
import { URI } from "vscode-uri";
import { exists } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { Project } from "@/core/Project";

interface DeepLinkParams {
  path: string;
  location?: { x: number; y: number };
  zoom?: number;
  target?: string;
}

async function normalizeFilePath(rawPath: string): Promise<string | null> {
  let path = rawPath;
  try {
    path = decodeURIComponent(path);
  } catch {
    // keep raw
  }

  // Windows: /D:/path → D:/path
  if (/^\/[A-Za-z]:/.test(path)) {
    path = path.slice(1);
  }
  // Windows: missing colon D/path → D:/path
  const missingColon = /^([A-Za-z])\/(.*)$/;
  if (missingColon.test(path)) {
    const match = path.match(missingColon)!;
    path = match[1] + ":" + "/" + match[2];
  }

  if (!path) return null;

  // Absolute path: check existence
  if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) {
    if (await exists(path)) {
      return path;
    }
    return null;
  }

  // Relative/filename: search recent files
  const recentFiles = await RecentFileManager.getRecentFiles();
  const fileName = path.toLowerCase().endsWith(".prg") ? path : path + ".prg";
  for (const file of recentFiles) {
    if (file.uri.fsPath.toLowerCase().endsWith("/" + fileName.toLowerCase())) {
      return file.uri.fsPath;
    }
  }
  return null;
}

function parseProjectGraphUrl(url: string): DeepLinkParams | null {
  if (!url.startsWith("project-graph://")) return null;

  const withoutScheme = url.slice("project-graph://".length);
  const qIndex = withoutScheme.indexOf("?");
  const rawPath = qIndex === -1 ? withoutScheme : withoutScheme.slice(0, qIndex);
  const queryString = qIndex === -1 ? "" : withoutScheme.slice(qIndex + 1);

  const params = new URLSearchParams(queryString);
  const result: DeepLinkParams = { path: rawPath };

  const target = params.get("target");
  if (target) {
    result.target = target;
    return result;
  }

  const locationStr = params.get("location");
  if (locationStr) {
    const parts = locationStr.split(",");
    if (parts.length === 2) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (!isNaN(x) && !isNaN(y)) {
        result.location = { x, y };
      }
    }
  }

  const zoomStr = params.get("zoom");
  if (zoomStr) {
    const z = parseFloat(zoomStr);
    if (!isNaN(z)) {
      result.zoom = z;
    }
  }

  return result;
}

function applyCameraParams(project: Project, params: DeepLinkParams) {
  if (params.target) {
    const entity = project.stageManager.getEntities().find((e) => e.uuid === params.target);
    if (entity) {
      const rect = entity.collisionBox.getRectangle();
      project.camera.resetByRectangle(rect);
      return;
    }
    toast.warning("未找到 UUID 为 " + params.target + " 的实体");
    return;
  }

  if (params.location) {
    project.camera.location.x = params.location.x;
    project.camera.location.y = params.location.y;
    project.camera.targetLocationByScale.x = params.location.x;
    project.camera.targetLocationByScale.y = params.location.y;
  }

  if (params.zoom !== undefined) {
    project.camera.currentScale = params.zoom;
    project.camera.targetScale = params.zoom;
  } else if (params.location && params.zoom === undefined) {
    project.camera.currentScale = 1;
    project.camera.targetScale = 1;
  }
}

export async function handleDeepLink(urls: string[]) {
  for (const url of urls) {
    if (!url.startsWith("project-graph://")) continue;

    const params = parseProjectGraphUrl(url);
    if (!params) continue;

    if (!params.path) {
      // Just launch the app, no file to open
      continue;
    }

    const resolvedPath = await normalizeFilePath(params.path);
    if (!resolvedPath) {
      toast.error("文件不存在: " + params.path);
      continue;
    }

    const project = await onOpenFile(URI.file(resolvedPath), "DeepLink");
    if (project) {
      applyCameraParams(project, params);
    }
  }
}
