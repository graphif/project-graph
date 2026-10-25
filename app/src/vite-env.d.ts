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

declare module "@mapbox/tiny-sdf" {
  export interface TinySDFOptions {
    fontSize?: number;
    buffer?: number;
    radius?: number;
    cutoff?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    fontStyle?: string;
  }

  export interface TinySDFGlyph {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    glyphWidth: number;
    glyphHeight: number;
    glyphTop: number;
    glyphLeft: number;
    glyphAdvance: number;
  }

  export default class TinySDF {
    constructor(options?: TinySDFOptions);
    draw(char: string): TinySDFGlyph;
  }
}

