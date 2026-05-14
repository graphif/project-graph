import { FeatureFlags } from "@/core/service/FeatureFlags";
import { createStore } from "@/utils/store";
import { Store } from "@tauri-apps/plugin-store";

export interface StoredSession {
  user: {
    id: string;
    email: string;
    name?: string;
    emailVerified?: boolean;
    image?: string;
  };
  token: string;
}

export namespace UserState {
  let store: Store;

  export async function init() {
    if (!FeatureFlags.USER) {
      return;
    }
    store = await createStore("user.json");
  }

  export async function getSession(): Promise<StoredSession | null> {
    if (!FeatureFlags.USER) {
      return null;
    }
    return (await store.get<StoredSession>("session")) ?? null;
  }
  export async function setSession(session: StoredSession) {
    if (!FeatureFlags.USER) {
      return;
    }
    await store.set("session", session);
  }
  export async function clearSession() {
    if (!FeatureFlags.USER) {
      return;
    }
    await store.delete("session");
  }

  /** @deprecated 改用 getSession/setSession */
  export async function getToken() {
    const session = await getSession();
    return session?.token ?? "";
  }
  /** @deprecated 改用 setSession */
  export async function setToken(token: string) {
    if (!FeatureFlags.USER) return;
    const existing = await getSession();
    if (existing) {
      await setSession({ ...existing, token });
    } else {
      await setSession({ user: { id: "", email: "" }, token });
    }
  }
}
