import { describe, expect, it, vi } from "vitest";
import {
  assertSkillResourceRelativePath,
  createSkillTools,
  formatSkillCatalog,
  mergeSkillCatalogs,
  parseSkillMarkdown,
  type AISkill,
} from "./AISkills";

const validSkill = `---
name: create-setting-item
description: Add a setting to Project Graph.
---

# Instructions

Follow the project setting conventions.
`;

function makeSkill(name: string, scope: "user" | "project"): AISkill {
  return {
    name,
    description: `${scope} ${name}`,
    body: "instructions",
    location: `C:/skills/${scope}/${name}/SKILL.md`,
    baseDir: `C:/skills/${scope}/${name}`,
    scope,
    resources: [],
  };
}

describe("Agent Skills parsing", () => {
  it("parses required frontmatter and strips it from the body", () => {
    const skill = parseSkillMarkdown(validSkill, {
      location: "C:/skills/create-setting-item/SKILL.md",
      baseDir: "C:/skills/create-setting-item",
      directoryName: "create-setting-item",
      scope: "user",
      resources: ["references/settings.md"],
    });

    expect(skill.name).toBe("create-setting-item");
    expect(skill.description).toBe("Add a setting to Project Graph.");
    expect(skill.body).toBe("# Instructions\n\nFollow the project setting conventions.");
    expect(skill.resources).toEqual(["references/settings.md"]);
  });

  it("rejects invalid frontmatter instead of silently ignoring the skill", () => {
    expect(() =>
      parseSkillMarkdown("---\nname: Invalid Name\n---\nbody", {
        location: "C:/skills/invalid/SKILL.md",
        baseDir: "C:/skills/invalid",
        directoryName: "invalid",
        scope: "user",
        resources: [],
      }),
    ).toThrow(/description/i);
  });

  it("rejects a name that differs from its directory", () => {
    expect(() =>
      parseSkillMarkdown(validSkill, {
        location: "C:/skills/other/SKILL.md",
        baseDir: "C:/skills/other",
        directoryName: "other",
        scope: "user",
        resources: [],
      }),
    ).toThrow(/directory/i);
  });
});

describe("Agent Skills catalog", () => {
  it("lets project skills override user skills deterministically", () => {
    const catalog = mergeSkillCatalogs([makeSkill("shared", "user")], [makeSkill("shared", "project")]);
    expect(catalog.get("shared")?.scope).toBe("project");
  });

  it("escapes skill metadata in the system catalog", () => {
    const skill = { ...makeSkill("review-code", "user"), description: "Review <code> & notes" };
    expect(formatSkillCatalog(new Map([[skill.name, skill]]))).toContain("Review &lt;code&gt; &amp; notes");
  });

  it("activates each skill only once per session", async () => {
    const activatedSkills: any[] = [];
    const onActivate = vi.fn(async () => undefined);
    const tools = createSkillTools({
      catalog: new Map([["review-code", makeSkill("review-code", "user")]]),
      activatedSkills,
      onActivate,
    });
    const activate = (tools.activate_skill as any).execute;

    await expect(activate({ name: "review-code" })).resolves.toContain("<skill_content");
    await expect(activate({ name: "review-code" })).resolves.toContain("already active");
    expect(onActivate).toHaveBeenCalledOnce();
    expect(activatedSkills).toHaveLength(1);
  });
});

describe("Agent Skills resources", () => {
  it("accepts normalized relative paths", () => {
    expect(assertSkillResourceRelativePath("references/guide.md")).toBe("references/guide.md");
  });

  it.each(["../secret.txt", "references/../../secret.txt", "/etc/passwd", "C:\\secret.txt", "", "."])(
    "rejects an unsafe resource path: %s",
    (path) => {
      expect(() => assertSkillResourceRelativePath(path)).toThrow(/resource path/i);
    },
  );
});
