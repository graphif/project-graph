import { Project, service } from "@/core/project";
import { AIObjectReferenceRegistry } from "./ai-object-reference-registry";
import { AIProjectReferenceStore } from "./ai-project-reference-store";

/** Compatibility service for persisted object references; model execution lives outside the app. */
@service("aiEngine")
export class AIEngine {
  private references: AIObjectReferenceRegistry | undefined;
  private referencesInitialization: Promise<AIObjectReferenceRegistry> | undefined;

  getProjectReferences(project: Project) {
    this.references ??= new AIObjectReferenceRegistry(project);
    return this.references;
  }

  prepareProjectReferences(project: Project): Promise<AIObjectReferenceRegistry> {
    const references = this.getProjectReferences(project);
    this.referencesInitialization ??= AIProjectReferenceStore.load(project).then((snapshot) => {
      if (snapshot) references.restoreSnapshot(snapshot);
      return references;
    });
    return this.referencesInitialization;
  }
}
