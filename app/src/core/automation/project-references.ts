import type { Project } from "@/core/project";
import type { AIObjectReferenceRegistry } from "@/core/service/data-manage-service/ai-engine/ai-object-reference-registry";

/** Keep one persisted reference registry per open project. */
export function prepareProjectReferences(project: Project): Promise<AIObjectReferenceRegistry> {
  return project.aiEngine.prepareProjectReferences(project);
}
