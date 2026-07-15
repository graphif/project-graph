import { describe, expect, it } from "vitest";
import { buildSkillSystemContext, filterActivatedSkillSnapshots, isActivatedSkillSnapshot } from "./AISkillSession";
import type { AISkill, ActivatedSkillSnapshot } from "./AISkills";

function makeSkill(name: string): AISkill {
  return {
    name,
    description: `${name} description`,
    body: `${name} current instructions`,
    location: `C:/skills/${name}/SKILL.md`,
    baseDir: `C:/skills/${name}`,
    scope: "user",
    resources: [],
  };
}

function makeSnapshot(name: string): ActivatedSkillSnapshot {
  return {
    name,
    description: `${name} description`,
    body: `${name} saved instructions`,
    sourcePath: `C:/skills/${name}/SKILL.md`,
    baseDir: `C:/skills/${name}`,
    scope: "user",
    resources: ["references/guide.md"],
  };
}

describe("Agent Skills session state", () => {
  it("validates persisted skill snapshots", () => {
    expect(isActivatedSkillSnapshot(makeSnapshot("review-code"))).toBe(true);
    expect(isActivatedSkillSnapshot({ ...makeSnapshot("review-code"), resources: [7] })).toBe(false);
    expect(isActivatedSkillSnapshot({ ...makeSnapshot("review-code"), body: "" })).toBe(false);
    expect(isActivatedSkillSnapshot({ ...makeSnapshot("review-code"), body: "x".repeat(256 * 1024 + 1) })).toBe(false);
    expect(isActivatedSkillSnapshot({ ...makeSnapshot("review-code"), resources: ["../secret.txt"] })).toBe(false);
  });

  it("keeps saved instructions independent from the current skill file", () => {
    const catalog = new Map([["review-code", makeSkill("review-code")]]);
    const context = buildSkillSystemContext(catalog, [makeSnapshot("review-code")]);

    expect(context).toContain("review-code saved instructions");
    expect(context).not.toContain("review-code current instructions");
    expect(context.match(/<skill_content name="review-code">/g)).toHaveLength(1);
  });

  it("deduplicates malformed stored snapshots by skill name", () => {
    const snapshot = makeSnapshot("review-code");
    const context = buildSkillSystemContext(new Map(), [snapshot, { ...snapshot, body: "duplicate" }]);

    expect(context.match(/<skill_content name="review-code">/g)).toHaveLength(1);
    expect(context).toContain("review-code saved instructions");
    expect(context).not.toContain("duplicate");
  });

  it("excludes project skill snapshots after project trust is revoked", () => {
    const userSkill = makeSnapshot("user-skill");
    const projectSkill = { ...makeSnapshot("project-skill"), scope: "project" as const };

    expect(filterActivatedSkillSnapshots([userSkill, projectSkill], false)).toEqual([userSkill]);
    expect(filterActivatedSkillSnapshots([userSkill, projectSkill], true)).toEqual([userSkill, projectSkill]);
  });
});
