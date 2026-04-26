import { Dialog } from "@/components/ui/dialog";
import { Settings } from "@/core/service/Settings";
import { fetch } from "@tauri-apps/plugin-http";
import { toast } from "sonner";
import { Extension } from "../Extension";
import { ExtensionKeyBindManager } from "../ExtensionKeyBindManager";

export function extensionHostApiFactory(extension: Extension) {
  const extensionName = extension.metadata.extension?.name || "未知扩展";
  const extensionId = extension.metadata.extension?.id || "unknown";

  return {
    //region toast
    async toast(message: string) {
      toast(
        <div className="flex flex-col gap-0.5">
          <p>{message}</p>
          <p className="text-xs opacity-50">来自扩展: {extensionName}</p>
        </div>,
      );
    },
    async toast_success(message: string) {
      toast.success(
        <div className="flex flex-col gap-0.5">
          <p>{message}</p>
          <p className="text-xs opacity-50">来自扩展: {extensionName}</p>
        </div>,
      );
    },
    async toast_error(message: string) {
      toast.error(
        <div className="flex flex-col gap-0.5">
          <p>{message}</p>
          <p className="text-xs opacity-50">来自扩展: {extensionName}</p>
        </div>,
      );
    },
    async toast_warning(message: string) {
      toast.warning(
        <div className="flex flex-col gap-0.5">
          <p>{message}</p>
          <p className="text-xs opacity-50">来自扩展: {extensionName}</p>
        </div>,
      );
    },

    //region dialog
    dialog_confirm: ((title, description = "", options?) =>
      Dialog.confirm(title, `${description}\n(来自扩展: ${extensionName})`, options)) satisfies typeof Dialog.confirm,
    dialog_input: ((title, description = "", options?) =>
      Dialog.input(title, `${description}\n(来自扩展: ${extensionName})`, options)) satisfies typeof Dialog.input,
    dialog_copy: ((title, description = "", value) =>
      Dialog.copy(title, `${description}\n(来自扩展: ${extensionName})`, value)) satisfies typeof Dialog.copy,
    dialog_buttons: ((title, description = "", buttons) =>
      Dialog.buttons(title, `${description}\n(来自扩展: ${extensionName})`, buttons)) satisfies typeof Dialog.buttons,

    //region 网络请求
    fetch,

    //region 设置
    async settings_getOwn(key: string) {
      return Settings.extensionSettings[extensionId]?.[key];
    },
    async settings_setOwn(key: string, value: unknown) {
      const current = Settings.extensionSettings[extensionId] ?? {};
      Settings.extensionSettings = {
        ...Settings.extensionSettings,
        [extensionId]: {
          ...current,
          [key]: value,
        },
      };
    },
    async settings_getGlobal(key: string) {
      if (key === "aiApiKey") {
        throw new Error("出于安全考虑，扩展无法访问 aiApiKey 设置项");
      }
      return (Settings as any)[key];
    },
    async settings_setGlobal(key: string, value: unknown) {
      if (key === "aiApiBaseUrl") {
        throw new Error("出于安全考虑，扩展无法修改 aiApiBaseUrl 设置项");
      }
      return ((Settings as any)[key] = value);
    },

    //region 快捷键
    async keybinds_register(
      id: string,
      defaultKey: string,
      onPress: () => void,
      onRelease?: () => void,
      isContinuous?: boolean,
    ) {
      return ExtensionKeyBindManager.register(extensionId, id, defaultKey, onPress, onRelease, isContinuous);
    },
    async keybinds_unregisterAll() {
      return ExtensionKeyBindManager.unregisterAll(extensionId);
    },
  };
}
