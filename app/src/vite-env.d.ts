/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />
/// <reference types="@modyfi/vite-plugin-yaml/modules" />
/// <reference types="unplugin-original-class-name/client" />

interface ImportMetaEnv {
  LR_GITHUB_CLIENT_SECRET?: string;
  LR_API_BASE_URL?: string;
  /** 协作服务 HTTP 根地址；缺省时从 LR_API_BASE_URL 推导（localhost:3000→3100） */
  LR_COLLAB_BASE_URL?: string;
  LR_FRAME?: string;
  LR_VITEST?: "true";
  LR_TURNSTILE_SITE_KEY?: string;
}

interface Window {
  ipc_bridge: any
}
