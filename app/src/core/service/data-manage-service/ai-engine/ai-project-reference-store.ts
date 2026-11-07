import type { Project } from "@/core/Project";
import type { AIObjectReferenceSnapshot } from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import { References } from "@/platform/desktop";
import { URI } from "vscode-uri";

type ProjectReferenceStoreProject = Pick<Project, "canonicalProjectPath" | "uri">;

const writeQueues = new Map<string, Promise<void>>();

function projectIdentity(project: ProjectReferenceStoreProject) {
  const legacyProjectUri = project.uri.toString();
  const projectUri = project.canonicalProjectPath
    ? URI.file(project.canonicalProjectPath).toString()
    : legacyProjectUri;
  return {
    projectUri,
    ...(projectUri === legacyProjectUri ? {} : { legacyProjectUri }),
  };
}

export namespace AIProjectReferenceStore {
  export function load(project: ProjectReferenceStoreProject): Promise<AIObjectReferenceSnapshot | null> {
    const { projectUri, legacyProjectUri } = projectIdentity(project);
    return References.load(projectUri, legacyProjectUri ?? "") as Promise<AIObjectReferenceSnapshot | null>;
  }

  export function save(project: ProjectReferenceStoreProject, references: AIObjectReferenceSnapshot): Promise<void> {
    const { projectUri } = projectIdentity(project);
    const previousWrite = writeQueues.get(projectUri) ?? Promise.resolve();
    const persist = () => References.save(projectUri, references);
    const write = previousWrite.then(persist, persist);
    writeQueues.set(projectUri, write);
    const removeCompletedWrite = () => {
      if (writeQueues.get(projectUri) === write) writeQueues.delete(projectUri);
    };
    void write.then(removeCompletedWrite, removeCompletedWrite);
    return write;
  }
}
