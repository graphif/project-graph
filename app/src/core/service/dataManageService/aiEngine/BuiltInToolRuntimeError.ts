import type { AIObjectReferenceErrorCode } from "./AIObjectReferenceRegistry";
import { classifyBuiltInToolException } from "./BuiltInToolRegistry";

const messages: Record<AIObjectReferenceErrorCode, string> = {
  invalid_ref_format: "Project Object Reference format is invalid.",
  unknown_ref: "Project Object Reference does not exist.",
  stale_ref: "Project Object Reference points to a deleted object.",
  wrong_ref_kind: "Project Object Reference has the wrong object kind.",
};

export function classifyBuiltInToolRuntimeError(error: unknown):
  | {
      code: AIObjectReferenceErrorCode;
      message: string;
      details: { ref: string };
    }
  | undefined {
  const classified = classifyBuiltInToolException(error);
  if (!classified) return undefined;
  return {
    code: classified.code,
    message: messages[classified.code],
    details: { ref: classified.ref },
  };
}
