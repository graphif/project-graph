import { readFileSync } from "node:fs";
import { join } from "node:path";
import z from "zod/v4";
import {
  DEFAULT_FONT_FAMILY,
  MAC_DEFAULT_FONT_FAMILY,
  parseProjectToolSettings,
} from "@/core/service/ProjectToolSettingsSchema";
import { resolveProjectGraphAppDataDirectories } from "./ProjectGraphAppDataPath";

let availableSettings: Record<string, unknown> | undefined;

export const settingsSchema = z.object({});

function loadSettings(): Record<string, unknown> {
  if (availableSettings) return availableSettings;
  let savedSettings: Record<string, unknown> = {};
  for (const directory of resolveProjectGraphAppDataDirectories()) {
    try {
      const value: unknown = JSON.parse(readFileSync(join(directory, "settings.json"), "utf8"));
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Settings store");
      savedSettings = value as Record<string, unknown>;
      break;
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error;
    }
  }
  availableSettings = {
    ...parseProjectToolSettings(
      savedSettings,
      process.platform === "darwin" ? MAC_DEFAULT_FONT_FAMILY : DEFAULT_FONT_FAMILY,
    ),
    watch: () => () => {},
  };
  return availableSettings;
}

export const Settings = new Proxy({} as Record<string, unknown>, {
  get(_target, property) {
    const settings = loadSettings();
    if (typeof property === "string" && property in settings) return settings[property];
    throw new Error(`Closed Project Runtime Host did not acquire the Settings capability: ${String(property)}`);
  },
  set(_target, property, value) {
    const settings = loadSettings();
    if (typeof property !== "string" || !(property in settings)) {
      throw new Error(`Closed Project Runtime Host did not acquire the Settings capability: ${String(property)}`);
    }
    settings[property] = value;
    return true;
  },
});
