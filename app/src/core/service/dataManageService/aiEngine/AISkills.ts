import { dirname, homeDir, join } from "@tauri-apps/api/path";
import { exists, lstat, readDir, readFile } from "@tauri-apps/plugin-fs";
import { LazyStore } from "@tauri-apps/plugin-store";
import { tool, type ToolSet } from "ai";
import { parse as parseYaml } from "yaml";
import { URI } from "vscode-uri";
import z from "zod/v4";

export type AISkillScope = "user" | "project";

export type AISkill = {
  name: string;
  description: string;
  body: string;
  location: string;
  baseDir: string;
  scope: AISkillScope;
  resources: string[];
};

export type ActivatedSkillSnapshot = {
  name: string;
  description: string;
  body: string;
  sourcePath: string;
  baseDir: string;
  scope: AISkillScope;
  resources: string[];
};

type ParseSkillOptions = {
  location: string;
  baseDir: string;
  directoryName: string;
  scope: AISkillScope;
  resources: string[];
};

const MAX_SKILL_FILE_BYTES = 256 * 1024;
const MAX_RESOURCE_FILE_BYTES = 256 * 1024;
const MAX_LISTED_RESOURCES = 200;
const MAX_RESOURCE_DEPTH = 5;
const trustStore = new LazyStore("ai-skill-trust.json");
let trustStoreInit: Promise<void> | undefined;
let trustWriteQueue: Promise<void> = Promise.resolve();

async function getTrustStore(): Promise<LazyStore> {
  trustStoreInit ??= trustStore.init();
  await trustStoreInit;
  return trustStore;
}

function enqueueTrustWrite<T>(operation: (initializedStore: LazyStore) => Promise<T>): Promise<T> {
  const result = trustWriteQueue.then(
    async () => operation(await getTrustStore()),
    async () => operation(await getTrustStore()),
  );
  trustWriteQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function parseSkillMarkdown(content: string, options: ParseSkillOptions): AISkill {
  const normalized = content.replace(/^\uFEFF/, "");
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`Skill ${options.location} is missing valid YAML frontmatter`);

  let metadata: unknown;
  try {
    metadata = parseYaml(match[1]);
  } catch (error) {
    throw new Error(`Skill ${options.location} contains invalid YAML frontmatter`, { cause: error });
  }
  if (!metadata || typeof metadata !== "object") {
    throw new Error(`Skill ${options.location} frontmatter must be an object`);
  }
  const record = metadata as Record<string, unknown>;
  if (typeof record.description !== "string" || !record.description.trim()) {
    throw new Error(`Skill ${options.location} description is required`);
  }
  if (typeof record.name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.name)) {
    throw new Error(`Skill ${options.location} name must use lowercase letters, numbers, and hyphens`);
  }
  if (record.name.length > 64) throw new Error(`Skill ${options.location} name exceeds 64 characters`);
  if (record.name !== options.directoryName) {
    throw new Error(`Skill ${record.name} name must match its directory ${options.directoryName}`);
  }
  const body = match[2].trim();
  if (!body) throw new Error(`Skill ${record.name} instructions are empty`);

  return {
    name: record.name,
    description: record.description.trim(),
    body,
    location: options.location,
    baseDir: options.baseDir,
    scope: options.scope,
    resources: [...options.resources].sort(),
  };
}

export function mergeSkillCatalogs(userSkills: AISkill[], projectSkills: AISkill[]): Map<string, AISkill> {
  const result = new Map<string, AISkill>();
  for (const skill of [...userSkills].sort((left, right) => left.name.localeCompare(right.name))) {
    result.set(skill.name, skill);
  }
  for (const skill of [...projectSkills].sort((left, right) => left.name.localeCompare(right.name))) {
    result.set(skill.name, skill);
  }
  return result;
}

export function assertSkillResourceRelativePath(value: string): string {
  const normalized = value.trim().replace(/\\/g, "/");
  if (!normalized || normalized === "." || normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error("Skill resource path must be a non-empty relative path");
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Skill resource path must stay inside the skill directory");
  }
  return segments.join("/");
}

function decodeUtf8(bytes: Uint8Array, label: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(`${label} is not valid UTF-8 text`, { cause: error });
  }
}

async function listSkillResources(
  baseDir: string,
  relativeDir = "",
  depth = 0,
  output: string[] = [],
): Promise<string[]> {
  if (depth > MAX_RESOURCE_DEPTH || output.length >= MAX_LISTED_RESOURCES) return output;
  const currentDir = relativeDir ? await join(baseDir, ...relativeDir.split("/")) : baseDir;
  const entries = (await readDir(currentDir)).sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    if (output.length >= MAX_LISTED_RESOURCES) break;
    if (entry.isSymlink) continue;
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory) {
      await listSkillResources(baseDir, relativePath, depth + 1, output);
    } else if (entry.isFile && relativePath !== "SKILL.md") {
      output.push(relativePath);
    }
  }
  return output;
}

async function loadSkillsFromRoot(root: string, scope: AISkillScope): Promise<AISkill[]> {
  if (!(await exists(root))) return [];
  if ((await lstat(root)).isSymlink) throw new Error(`Skill root must not be a symbolic link: ${root}`);
  const entries = (await readDir(root)).sort((left, right) => left.name.localeCompare(right.name));
  const skills: AISkill[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory || entry.isSymlink) continue;
    const baseDir = await join(root, entry.name);
    const location = await join(baseDir, "SKILL.md");
    if (!(await exists(location))) continue;
    const bytes = await readFile(location);
    if (bytes.byteLength > MAX_SKILL_FILE_BYTES) {
      throw new Error(`Skill ${location} exceeds ${MAX_SKILL_FILE_BYTES} bytes`);
    }
    skills.push(
      parseSkillMarkdown(decodeUtf8(bytes, `Skill ${location}`), {
        location,
        baseDir,
        directoryName: entry.name,
        scope,
        resources: await listSkillResources(baseDir),
      }),
    );
  }
  return skills;
}

async function getSkillRoot(baseDir: string): Promise<string> {
  const agentsDir = await join(baseDir, ".agents");
  if ((await exists(agentsDir)) && (await lstat(agentsDir)).isSymlink) {
    throw new Error(`Skill directory must not be a symbolic link: ${agentsDir}`);
  }
  return join(agentsDir, "skills");
}

export namespace AISkillTrustStore {
  export async function isProjectTrusted(projectUri: string): Promise<boolean> {
    const initializedStore = await getTrustStore();
    return (await initializedStore.get<unknown>(`project:${projectUri}:trusted`)) === true;
  }

  export async function setProjectTrusted(projectUri: string, trusted: boolean): Promise<void> {
    await enqueueTrustWrite(async (initializedStore) => {
      await initializedStore.set(`project:${projectUri}:trusted`, trusted);
      await initializedStore.save();
    });
  }
}

export async function discoverSkills(projectUri: string): Promise<Map<string, AISkill>> {
  const userRoot = await getSkillRoot(await homeDir());
  const userSkills = await loadSkillsFromRoot(userRoot, "user");
  const uri = URI.parse(projectUri);
  if (uri.scheme !== "file" || !(await AISkillTrustStore.isProjectTrusted(projectUri))) {
    return mergeSkillCatalogs(userSkills, []);
  }
  const projectRoot = await getSkillRoot(await dirname(uri.fsPath));
  return mergeSkillCatalogs(userSkills, await loadSkillsFromRoot(projectRoot, "project"));
}

export function createActivatedSkillSnapshot(skill: AISkill): ActivatedSkillSnapshot {
  return {
    name: skill.name,
    description: skill.description,
    body: skill.body,
    sourcePath: skill.location,
    baseDir: skill.baseDir,
    scope: skill.scope,
    resources: [...skill.resources],
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatActivatedSkill(snapshot: ActivatedSkillSnapshot): string {
  const resourceLines = snapshot.resources.map((resource) => `    <file>${escapeXml(resource)}</file>`).join("\n");
  const resources = resourceLines ? `\n  <skill_resources>\n${resourceLines}\n  </skill_resources>` : "";
  return `<skill_content name="${snapshot.name}">\n${snapshot.body}\n\nSkill directory: ${escapeXml(snapshot.baseDir)}\nRelative paths are resolved from this directory.${resources}\n</skill_content>`;
}

export function formatSkillCatalog(catalog: Map<string, AISkill>): string {
  if (catalog.size === 0) return "";
  const entries = [...catalog.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((skill) => `  <skill name="${skill.name}">${escapeXml(skill.description)}</skill>`)
    .join("\n");
  return `<available_skills>\n${entries}\n</available_skills>\nWhen a task matches a skill, call activate_skill before proceeding.`;
}

async function readSkillResource(skill: AISkill, relativePath: string): Promise<string> {
  const normalized = assertSkillResourceRelativePath(relativePath);
  if (!skill.resources.includes(normalized)) throw new Error(`Skill resource does not exist: ${normalized}`);
  let current = skill.baseDir;
  for (const segment of normalized.split("/")) {
    current = await join(current, segment);
    if ((await lstat(current)).isSymlink)
      throw new Error(`Skill resource path contains a symbolic link: ${normalized}`);
  }
  const bytes = await readFile(current);
  if (bytes.byteLength > MAX_RESOURCE_FILE_BYTES) {
    throw new Error(`Skill resource ${normalized} exceeds ${MAX_RESOURCE_FILE_BYTES} bytes`);
  }
  return decodeUtf8(bytes, `Skill resource ${normalized}`);
}

export function createSkillTools(options: {
  catalog: Map<string, AISkill>;
  activatedSkills: ActivatedSkillSnapshot[];
  onActivate(snapshot: ActivatedSkillSnapshot): Promise<void>;
}): ToolSet {
  if (options.catalog.size === 0) return {};
  const names = [...options.catalog.keys()].sort() as [string, ...string[]];
  const skillNameSchema = z.enum(names);
  const activeNames = new Set(options.activatedSkills.map((skill) => skill.name));
  return {
    activate_skill: tool({
      description: "Load the full instructions for an available Agent Skill before following that workflow.",
      inputSchema: z.object({ name: skillNameSchema }),
      execute: async ({ name }) => {
        if (activeNames.has(name)) return `Skill ${name} is already active in this session.`;
        const skill = options.catalog.get(name);
        if (!skill) throw new Error(`Skill does not exist: ${name}`);
        const snapshot = createActivatedSkillSnapshot(skill);
        await options.onActivate(snapshot);
        options.activatedSkills.push(snapshot);
        activeNames.add(name);
        return formatActivatedSkill(snapshot);
      },
    }),
    read_skill_resource: tool({
      description: "Read one UTF-8 text resource from an Agent Skill that is already active in this session.",
      inputSchema: z.object({
        skill: skillNameSchema,
        relativePath: z.string().min(1).max(1024),
      }),
      execute: async ({ skill: name, relativePath }) => {
        if (!activeNames.has(name)) throw new Error(`Skill ${name} must be activated before reading its resources`);
        const skill = options.catalog.get(name);
        if (!skill) throw new Error(`Skill does not exist: ${name}`);
        return readSkillResource(skill, relativePath);
      },
    }),
  };
}
