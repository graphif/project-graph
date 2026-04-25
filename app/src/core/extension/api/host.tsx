import { Dialog } from "@/components/ui/dialog";
import { Settings } from "@/core/service/Settings";
import { fetch } from "@tauri-apps/plugin-http";
import { toast } from "sonner";

export function extensionHostApiFactory(extensionName: string) {
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
      return Settings.extensionSettings[extensionName]?.[key];
    },
    async settings_setOwn(key: string, value: unknown) {
      const current = Settings.extensionSettings[extensionName] ?? {};
      Settings.extensionSettings = {
        ...Settings.extensionSettings,
        [extensionName]: {
          ...current,
          [key]: value,
        },
      };
    },
    async settings_getGlobal(key: string) {
      if (key === "aiApiKey") {
        throw new Error("出于安全考虑，扩展无法访问 aiApiKey 设置项");
      }
      if (
        await Dialog.confirm(
          `${extensionName} 请求访问全局设置: ${key}`,
          `此设置项的值为 ${(Settings as any)[key]}，是否允许访问？`,
        )
      ) {
        return (Settings as any)[key];
      } else {
        throw new Error("用户拒绝访问全局设置");
      }
    },
    async settings_setGlobal(key: string, value: unknown) {
      if (key === "aiApiBaseUrl") {
        throw new Error("出于安全考虑，扩展无法修改 aiApiBaseUrl 设置项");
      }
      if (
        await Dialog.confirm(
          `${extensionName} 请求修改全局设置: ${key}`,
          `当前值为 ${(Settings as any)[key]}，修改后值为 ${value}，是否允许修改？`,
        )
      ) {
        (Settings as any)[key] = value;
      } else {
        throw new Error("用户拒绝修改全局设置");
      }
    },
  };
}
