import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivatedSkillSnapshot } from "./AISkills";

const stores = vi.hoisted(() => new Map<string, Map<string, unknown>>());

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    private readonly values: Map<string, unknown>;

    constructor(name: string) {
      this.values = stores.get(name) ?? new Map<string, unknown>();
      stores.set(name, this.values);
    }

    async init() {}
    async get(key: string) {
      return this.values.get(key);
    }
    async set(key: string, value: unknown) {
      this.values.set(key, structuredClone(value));
    }
    async delete(key: string) {
      return this.values.delete(key);
    }
    async save() {}
  },
}));

import { AIChatSessionStore } from "./AIChatSessionStore";

function makeSnapshot(body = "saved instructions"): ActivatedSkillSnapshot {
  return {
    name: "review-code",
    description: "Review code",
    body,
    sourcePath: "C:/skills/review-code/SKILL.md",
    baseDir: "C:/skills/review-code",
    scope: "user",
    resources: [],
  };
}

describe("AIChatSessionStore Agent Skills snapshots", () => {
  beforeEach(() => {
    for (const values of stores.values()) values.clear();
  });

  it("persists activated skills in the current chat session", async () => {
    const projectUri = "file:///C:/projects/example/project.prg";
    const state = await AIChatSessionStore.initializeProject(projectUri);

    await AIChatSessionStore.activateSkill(projectUri, state.activeSession.id, makeSnapshot());

    await expect(AIChatSessionStore.getActivatedSkills(projectUri, state.activeSession.id)).resolves.toEqual([
      makeSnapshot(),
    ]);
  });

  it("keeps the first snapshot when the same skill is activated twice", async () => {
    const projectUri = "file:///C:/projects/example/project.prg";
    const state = await AIChatSessionStore.initializeProject(projectUri);
    await AIChatSessionStore.activateSkill(projectUri, state.activeSession.id, makeSnapshot("first"));

    await AIChatSessionStore.activateSkill(projectUri, state.activeSession.id, makeSnapshot("second"));

    const snapshots = await AIChatSessionStore.getActivatedSkills(projectUri, state.activeSession.id);
    expect(snapshots).toEqual([makeSnapshot("first")]);
  });
});
