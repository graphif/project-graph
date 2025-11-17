import { FeatureFlags } from "@/core/service/FeatureFlags";
import { getDeviceId } from "@/utils/otherApi";
import { fetch } from "@tauri-apps/plugin-http";
import { Settings } from "./Settings";

export namespace Telemetry {
  let deviceId = "";

  /**
   *
   * @param event 字符串，原则上不能塞入动态的参数，如文件名、路径、日期、时间等
   * @param data 任意对象类型
   * @returns
   */
  export async function event(event: string, data: any = {}) {
    if (import.meta.env.DEV) return; // 本地开发模式就不发了
    if (!FeatureFlags.TELEMETRY) return;
    if (!Settings.telemetry) return;
    if (!deviceId) {
      deviceId = await getDeviceId();
    }
    try {
      await fetch(import.meta.env.LR_API_BASE_URL + "/api/telemetry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event,
          user: deviceId,
          data,
        }),
      });
    } catch (e) {
      console.warn(e);
    }
  }
}
