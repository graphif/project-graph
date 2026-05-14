export namespace FeatureFlags {
  /**
   * 用户登录、注册以及所有和云服务有关的功能
   */
  export const USER = "LR_API_BASE_URL" in import.meta.env;
  /**
   * AI扩展节点等所有和AI有关的功能
   */
  export const AI = "LR_API_BASE_URL" in import.meta.env;
  export const TELEMETRY = "LR_API_BASE_URL" in import.meta.env;
}
