import { describe, expect, it } from "vitest";
import { parseProjectToolSettings } from "./ProjectToolSettingsSchema";

describe("Project tool Settings schema", () => {
  it("keeps valid saved values and falls back per key for stale values", () => {
    expect(
      parseProjectToolSettings(
        {
          historySize: "invalid",
          isEnableEntityCollision: true,
          moveFriction: 2,
          unknownSetting: "ignored",
        },
        "test-font",
      ),
    ).toMatchObject({
      defaultFontFamily: "test-font",
      historySize: 150,
      isEnableEntityCollision: true,
      moveFriction: 0.1,
    });
  });
});
