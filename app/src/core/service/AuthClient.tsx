import { fetch } from "@tauri-apps/plugin-http";
import { createAuthClient } from "better-auth/client";

export const accountServiceBaseUrl = ((import.meta.env.LR_API_BASE_URL ?? "").trim() || "https://hub.graphif.dev").replace(
  /\/+$/,
  "",
);

// better-auth 要求绝对 URL，非法配置不能让模块加载同步抛错。
function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const authClient =
  isValidHttpUrl(accountServiceBaseUrl)
    ? createAuthClient({
        baseURL: `${accountServiceBaseUrl}/api/auth`,
        plugins: [],
        fetchOptions: {
          customFetchImpl: fetch,
        },
      })
    : null;
