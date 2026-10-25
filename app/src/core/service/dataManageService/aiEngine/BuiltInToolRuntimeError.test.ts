import { describe, expect, it } from "vitest";
import { AIObjectReferenceError, type AIObjectReferenceErrorCode } from "./AIObjectReferenceRegistry";
import { classifyBuiltInToolRuntimeError } from "./BuiltInToolRuntimeError";

describe("built-in tool runtime errors", () => {
  it.each([
    ["invalid_ref_format", "Project Object Reference format is invalid."],
    ["unknown_ref", "Project Object Reference does not exist."],
    ["stale_ref", "Project Object Reference points to a deleted object."],
    ["wrong_ref_kind", "Project Object Reference has the wrong object kind."],
  ] satisfies Array<[AIObjectReferenceErrorCode, string]>)("maps %s without losing its reference", (code, message) => {
    expect(classifyBuiltInToolRuntimeError(new AIObjectReferenceError(code, "n7", "source message"))).toEqual({
      code,
      message,
      details: { ref: "n7" },
    });
  });
});
