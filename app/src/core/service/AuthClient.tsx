import { FeatureFlags } from "@/core/service/FeatureFlags";
import { fetch } from "@tauri-apps/plugin-http";
import { createAuthClient } from "better-auth/client";

export const authClient = FeatureFlags.USER
  ? createAuthClient({
      baseURL: `${import.meta.env.LR_API_BASE_URL}/api/auth`,
      plugins: [],
      fetchOptions: {
        customFetchImpl: fetch,
      },
    })
  : null;
