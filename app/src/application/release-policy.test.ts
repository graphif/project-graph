import { describe, expect, it } from "vitest";
import { assertAssets, assertDraft, releaseMarker, releaseNotes, validateRelease } from "./release-policy";

const input = {
  version: "4.2.6-alpha1",
  identifier: "dev.graphif.prg",
  tag: "v4.2.6-alpha1",
  sha: "a".repeat(40),
  head: "a".repeat(40),
  tagCommit: "a".repeat(40),
  rootVersion: "0.0.0",
  packageVersion: "0.0.0",
  changelog: "# Changes\n\n## 4.2.6-alpha1\n\n- Desktop migration\n\n## 4.2.5\nOld changes",
  publicKey: "test-only-key",
  files: ["config", "lock", "go toolchain"],
};

describe("release gate", () => {
  it("preserves the complete prerelease version and exact notes", () => {
    expect(validateRelease(input).version).toBe("4.2.6-alpha1");
    expect(releaseNotes(input.changelog, input.version)).toBe("- Desktop migration");
    expect(releaseNotes("## [4.2.6-alpha1] - 2026-10-26\n- OK", input.version)).toBe("- OK");
  });

  it.each([
    { version: "0.0.0", tag: "v0.0.0" },
    { version: "04.2.6" },
    { tag: "v4.2.6" },
    { sha: "main" },
    { head: "b".repeat(40) },
    { tagCommit: "b".repeat(40) },
    { identifier: "liren.project-graph" },
    { rootVersion: "4.2.6" },
    { packageVersion: "4.2.6" },
    { publicKey: " " },
    { changelog: "## 4.2.6\n- Wrong version" },
    { changelog: "## 4.2.6-alpha1\n\n## 4.2.5\n- Not these notes" },
  ])("rejects inconsistent publication input: %j", (changes) => {
    expect(() => validateRelease({ ...input, ...changes })).toThrow();
  });

  it("only reuses the same draft with exactly one matching provenance marker", () => {
    const identity = validateRelease(input);
    const release = { tag_name: identity.tag, draft: true, body: `Notes\n${releaseMarker(identity)}` };
    expect(() => assertDraft(release, identity)).not.toThrow();
    expect(() => assertDraft({ ...release, draft: false }, identity)).toThrow("cannot be replaced");
    expect(() => assertDraft({ ...release, body: "" }, identity)).toThrow("provenance");
    expect(() => assertDraft({ ...release, body: release.body + releaseMarker(identity) }, identity)).toThrow();
    for (const changes of [{ files: ["changed lock"] }, { publicKey: "rotated-key" }]) {
      expect(() => assertDraft(release, validateRelease({ ...input, ...changes }))).toThrow("provenance");
    }
  });

  it("requires installers and full updates for every declared architecture", () => {
    const version = input.version;
    const names = [
      "install.sh",
      ...["linux-amd64", "windows-amd64", "darwin-arm64", "darwin-amd64"].flatMap((target) => [
        `update-${target}.json`,
        `project-graph-${version}-${target}.tar.gz`,
      ]),
      `project-graph_${version}_amd64.deb`,
      `Project Graph Setup ${version} amd64.exe`,
      `Project Graph ${version} arm64.dmg`,
      `Project Graph ${version} amd64.dmg`,
    ];
    expect(() => assertAssets(names, version)).not.toThrow();
    expect(() => assertAssets(names.slice(1), version)).toThrow("install.sh");
    expect(() => assertAssets([...names, names[0]], version)).toThrow("Duplicate");
  });
});
