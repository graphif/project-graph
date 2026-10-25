import { afterEach, describe, expect, it, vi } from "vitest";
import rootPackage from "../../../package.json" with { type: "json" };
import appPackage from "../../package.json" with { type: "json" };
import config, { appVersion } from "../../mygo.config";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("application version source", () => {
  it("keeps npm placeholders separate from the real desktop version", () => {
    expect(rootPackage.version).toBe("0.0.0");
    expect(appPackage.version).toBe("0.0.0");
    expect(appVersion).not.toBe("0.0.0");
    expect(config.version).toBe(appVersion);
    expect(config.identifier).toBe("dev.graphif.prg");
  });

  it("uses the same configured version for the CLI without an environment override", async () => {
    vi.stubEnv("PROJECT_GRAPH_CLI_VERSION", "99.0.0");
    const { default: cli } = await import("../../vite.cli.config");
    expect(cli.define?.__PROJECT_GRAPH_CLI_VERSION__).toBe(JSON.stringify(appVersion));
  });
});
