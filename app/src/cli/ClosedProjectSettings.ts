import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_FONT_FAMILY,
  MAC_DEFAULT_FONT_FAMILY,
  parseProjectToolSettings,
} from "@/core/service/ProjectToolSettingsSchema";

let availableSettings: Record<string, unknown> | undefined;

function loadSettings(): Record<string, unknown> {
  if (availableSettings) return availableSettings;
  const path = join(homedir(), "Library", "Application Support", "liren.project-graph", "settings.json");
  let savedSettings: Record<string, unknown> = {};
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Settings store");
    savedSettings = value as Record<string, unknown>;
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error;
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
