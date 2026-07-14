import { formatActivatedSkill, formatSkillCatalog, type AISkill, type ActivatedSkillSnapshot } from "./AISkills";

const MAX_SKILL_BODY_LENGTH = 256 * 1024;
const MAX_SKILL_RESOURCES = 200;

function isSafeResourcePath(value: string): boolean {
  if (!value || value.startsWith("/") || /^[a-zA-Z]:/.test(value) || value.includes("\\")) return false;
  return value.split("/").every((segment) => segment && segment !== "." && segment !== "..");
}

export function isActivatedSkillSnapshot(value: unknown): value is ActivatedSkillSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<ActivatedSkillSnapshot>;
  return (
    typeof snapshot.name === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(snapshot.name) &&
    snapshot.name.length <= 64 &&
    typeof snapshot.description === "string" &&
    snapshot.description.trim().length > 0 &&
    snapshot.description.length <= 4096 &&
    typeof snapshot.body === "string" &&
    snapshot.body.trim().length > 0 &&
    snapshot.body.length <= MAX_SKILL_BODY_LENGTH &&
    typeof snapshot.sourcePath === "string" &&
    snapshot.sourcePath.length > 0 &&
    snapshot.sourcePath.length <= 4096 &&
    typeof snapshot.baseDir === "string" &&
    snapshot.baseDir.length > 0 &&
    snapshot.baseDir.length <= 4096 &&
    (snapshot.scope === "user" || snapshot.scope === "project") &&
    Array.isArray(snapshot.resources) &&
    snapshot.resources.length <= MAX_SKILL_RESOURCES &&
    snapshot.resources.every((resource) => typeof resource === "string" && isSafeResourcePath(resource))
  );
}

export function filterActivatedSkillSnapshots(
  snapshots: ActivatedSkillSnapshot[],
  projectSkillsTrusted: boolean,
): ActivatedSkillSnapshot[] {
  return snapshots.filter(
    (snapshot) => isActivatedSkillSnapshot(snapshot) && (snapshot.scope === "user" || projectSkillsTrusted),
  );
}

export function buildSkillSystemContext(
  catalog: Map<string, AISkill>,
  activatedSkills: ActivatedSkillSnapshot[],
): string {
  const sections: string[] = [];
  const catalogContext = formatSkillCatalog(catalog);
  if (catalogContext) sections.push(catalogContext);

  const seen = new Set<string>();
  for (const snapshot of activatedSkills) {
    if (!isActivatedSkillSnapshot(snapshot) || seen.has(snapshot.name)) continue;
    seen.add(snapshot.name);
    sections.push(formatActivatedSkill(snapshot));
  }
  return sections.join("\n\n");
}
