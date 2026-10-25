import { Native, events } from "@/generated/mygo";

const listeners = new Map<string, () => void>();
let stop: (() => void) | undefined;

export async function register(shortcut: string, callback: (event: { state: "Pressed" }) => Promise<void>) {
  stop ??= events.shortcutPressed.on((key) => listeners.get(key)?.());
  listeners.set(shortcut, () => {
    void callback({ state: "Pressed" });
  });
  try {
    await Native.registerShortcut(shortcut);
  } catch (error) {
    listeners.delete(shortcut);
    throw error;
  }
}
export async function unregister(shortcut: string) {
  await Native.unregisterShortcut(shortcut);
  listeners.delete(shortcut);
}
export async function unregisterAll() {
  await Native.unregisterAllShortcuts();
  listeners.clear();
  stop?.();
  stop = undefined;
}
export const isRegistered = Native.isShortcutRegistered;
