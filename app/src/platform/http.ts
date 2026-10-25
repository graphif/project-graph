import { fetch as mygoFetch } from "@mygo-plugins/fetch";
import { isMyGo } from "mygo-runtime";

export const fetch: typeof globalThis.fetch = async (input, init) => {
  if (isMyGo()) return mygoFetch(input, init);
  throw new Error("Desktop host missing: HTTP requires MyGo or an explicit CLI fetch implementation.");
};
