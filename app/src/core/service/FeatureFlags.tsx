// 空串/未配置都视为未启用，避免「key 存在即开」与取值逻辑自相矛盾
const hasApiBaseUrl = (import.meta.env.LR_API_BASE_URL ?? "").trim() !== "";

export namespace FeatureFlags {
  /**
   * 用户登录、注册以及所有和云服务有关的功能
   */
  export const USER = hasApiBaseUrl;
  /**
   * AI扩展节点等所有和AI有关的功能
   */
  export const AI = hasApiBaseUrl;
  export const TELEMETRY = hasApiBaseUrl;
}
