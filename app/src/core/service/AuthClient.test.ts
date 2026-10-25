import { afterEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn(() => ({})));
vi.mock("better-auth/client", () => ({ createAuthClient: createClient }));
vi.mock("@tauri-apps/plugin-http", () => ({ fetch: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  createClient.mockClear();
});

describe("account service configuration", () => {
  it.each([undefined, "", "   "])("uses the official account service when configuration is %s", async (value) => {
    vi.stubEnv("LR_API_BASE_URL", value);
    const { accountServiceBaseUrl, authClient } = await import("./AuthClient");
    const { FeatureFlags } = await import("./FeatureFlags");
    expect(accountServiceBaseUrl).toBe("https://hub.graphif.dev");
    expect(authClient).not.toBeNull();
    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({ baseURL: "https://hub.graphif.dev/api/auth" }));
    expect(FeatureFlags.USER).toBe(true);
    expect(FeatureFlags.TELEMETRY).toBe(false);
  });

  it("retains a configured service", async () => {
    vi.stubEnv("LR_API_BASE_URL", " https://accounts.example.com/// ");
    const { accountServiceBaseUrl } = await import("./AuthClient");
    expect(accountServiceBaseUrl).toBe("https://accounts.example.com");
  });

  it("rejects an invalid configured service without crashing module loading", async () => {
    vi.stubEnv("LR_API_BASE_URL", "invalid-url");
    const { authClient } = await import("./AuthClient");
    const { FeatureFlags } = await import("./FeatureFlags");
    expect(authClient).toBeNull();
    expect(FeatureFlags.USER).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });
});
