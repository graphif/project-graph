import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

export type ProjectGraphCliRuntimeStubs = {
  settings: string;
  renderer: string;
  detailsManager: string;
  fileSystemProvider: string;
  soundService: string;
  http: string;
  modelImageEncoder: string;
};

export const projectGraphCliRuntimeStubDescriptors: readonly {
  matcher: string | RegExp;
  stubKey: keyof ProjectGraphCliRuntimeStubs;
}[] = [
  { matcher: "@/core/service/Settings", stubKey: "settings" },
  { matcher: /^(?:.*\/)?core\/service\/Settings(?:\.tsx)?(?:\?.*)?$/, stubKey: "settings" },
  { matcher: /^(?:.*\/)?Settings$/, stubKey: "settings" },
  { matcher: "@/core/render/canvas2d/renderer", stubKey: "renderer" },
  { matcher: /^(?:.*\/)?core\/render\/canvas2d\/renderer(?:\.tsx)?$/, stubKey: "renderer" },
  { matcher: /^(?:.*\/)?stageObject\/tools\/entityDetailsManager$/, stubKey: "detailsManager" },
  { matcher: "../tools/entityDetailsManager", stubKey: "detailsManager" },
  {
    matcher: /^(?:.*\/)?core\/fileSystemProvider\/FileSystemProviderFile(?:\.tsx)?$/,
    stubKey: "fileSystemProvider",
  },
  { matcher: "@/core/fileSystemProvider/FileSystemProviderFile", stubKey: "fileSystemProvider" },
  {
    matcher: /^(?:.*\/)?core\/service\/feedbackService\/SoundService(?:\.tsx)?$/,
    stubKey: "soundService",
  },
  { matcher: /^(?:.*\/)?feedbackService\/SoundService$/, stubKey: "soundService" },
  { matcher: "@/core/service/feedbackService/SoundService", stubKey: "soundService" },
  { matcher: "@tauri-apps/plugin-http", stubKey: "http" },
  {
    matcher: /^(?:.*\/)?core\/service\/dataManageService\/aiEngine\/ModelImageEncoder(?:\.tsx)?$/,
    stubKey: "modelImageEncoder",
  },
  { matcher: "@/core/service/dataManageService/aiEngine/ModelImageEncoder", stubKey: "modelImageEncoder" },
];

export function resolveProjectGraphCliRuntimeStubs(baseUrl: string): ProjectGraphCliRuntimeStubs {
  return {
    settings: fileURLToPath(new URL("./ClosedProjectSettings.ts", baseUrl)),
    renderer: fileURLToPath(new URL("./ClosedProjectRenderer.ts", baseUrl)),
    detailsManager: fileURLToPath(new URL("./ClosedProjectDetailsManager.ts", baseUrl)),
    fileSystemProvider: fileURLToPath(new URL("./ClosedProjectFileSystemProvider.ts", baseUrl)),
    soundService: fileURLToPath(new URL("./ClosedProjectSoundService.ts", baseUrl)),
    http: fileURLToPath(new URL("./ClosedProjectHttp.ts", baseUrl)),
    modelImageEncoder: fileURLToPath(new URL("./ClosedProjectModelImageEncoder.ts", baseUrl)),
  };
}

export function projectGraphCliRuntimeCompatibilityPlugin(stubs: ProjectGraphCliRuntimeStubs): Plugin {
  return {
    name: "project-graph-cli-runtime-compatibility",
    enforce: "pre",
    resolveId(id) {
      const descriptor = projectGraphCliRuntimeStubDescriptors.find(({ matcher }) =>
        typeof matcher === "string" ? id === matcher : matcher.test(id),
      );
      if (descriptor) return stubs[descriptor.stubKey];
      return id === "virtual:original-class-name" ? `\0${id}` : undefined;
    },
    load(id) {
      return id === "\0virtual:original-class-name"
        ? "export const getOriginalNameOf = value => value.name"
        : undefined;
    },
  };
}
