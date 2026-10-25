import { authClient } from "./AuthClient";

// 账户使用官方默认服务；其他云功能仍由显式配置启用。
const hasApiBaseUrl = (import.meta.env.LR_API_BASE_URL ?? "").trim() !== "";

export namespace FeatureFlags {
  /**
   * 用户登录、注册以及所有和云服务有关的功能
   */
  export const USER = authClient !== null;
  /**
   * AI扩展节点等所有和AI有关的功能
   */
  export const AI = hasApiBaseUrl;
  export const TELEMETRY = hasApiBaseUrl;
}
