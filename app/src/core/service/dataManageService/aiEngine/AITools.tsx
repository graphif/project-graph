import type { Project } from "@/core/Project";
import {
  AIObjectReferenceError,
  AIObjectReferenceRegistry,
} from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import { encode } from "@toon-format/toon";
import { tool, type ToolSet } from "ai";
import z from "zod/v4";
import { builtInToolCatalog, invokeBuiltInTool, type BuiltInToolExecutionContext } from "./BuiltInToolRegistry";

export namespace AITools {
  export type ToolDefinition = {
    name: string;
    description: string;
    parameters: z.ZodObject;
  };

  export const tools: ToolDefinition[] = builtInToolCatalog.map((definition) => ({
    name: definition.name,
    description: definition.description,
    parameters: definition.inputSchema,
  }));

  export function createTools(project: Project, references: AIObjectReferenceRegistry): ToolSet {
    return Object.fromEntries(
      builtInToolCatalog.map((definition) => [
        definition.name,
        tool({
          description: definition.description,
          inputSchema: definition.inputSchema as any,
          execute: async (data: any, executionOptions?: BuiltInToolExecutionContext) => {
            try {
              const result = await invokeBuiltInTool(definition.name, data, project, references, {
                abortSignal: executionOptions?.abortSignal,
              });
              return result ? encode(result) : "ok";
            } catch (error) {
              if (error instanceof AIObjectReferenceError) {
                return encode({
                  success: false,
                  error: { code: error.code, ref: error.ref, message: error.message },
                });
              }
              throw error;
            }
          },
          ...(definition.toModelOutput
            ? {
                toModelOutput: ({ output }: { output: any }) => definition.toModelOutput!(output),
              }
            : {}),
        }),
      ]),
    ) as ToolSet;
  }
}
