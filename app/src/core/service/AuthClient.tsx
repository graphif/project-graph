import { fetch } from "@tauri-apps/plugin-http";
import { createAuthClient } from "better-auth/client";

const apiBaseUrl = (import.meta.env.LR_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

// better-auth 要求绝对 URL，值缺失/非法时降级为 null，而不是让模块加载同步抛错
function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const authClient =
  apiBaseUrl && isValidHttpUrl(apiBaseUrl)
    ? createAuthClient({
        baseURL: `${apiBaseUrl}/api/auth`,
        plugins: [],
        fetchOptions: {
          customFetchImpl: fetch,
        },
      })
    : null;
