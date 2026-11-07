import { createHash } from "node:crypto";
import semver from "semver";

export const releaseTargets = ["linux/amd64", "windows/amd64", "darwin/arm64", "darwin/amd64"] as const;

export interface ReleaseIdentity {
  version: string;
  tag: string;
  sha: string;
  fingerprint: string;
}

export function releaseNotes(changelog: string, version: string): string {
  const lines = changelog.split(/\r?\n/);
  const heading = lines.findIndex((line) => {
    const match = /^## (?:\[([^\]]+)\]|(\S+))(?:\s.*)?$/.exec(line);
    return (match?.[1] ?? match?.[2]) === version;
  });
  if (heading < 0) throw new Error(`CHANGELOG.md has no exact section for ${version}`);
  const end = lines.findIndex((line, index) => index > heading && /^## /.test(line));
  const notes = lines
    .slice(heading + 1, end < 0 ? undefined : end)
    .join("\n")
    .trim();
  if (!notes) throw new Error("Release notes must not be empty");
  return notes;
}

export function validateRelease(input: {
  version: unknown;
  identifier: unknown;
  tag: string;
  sha: string;
  head: string;
  tagCommit: string;
  rootVersion: string;
  packageVersion: string;
  changelog: string;
  publicKey: string;
  files: readonly string[];
}): ReleaseIdentity {
  const { version, tag, sha } = input;
  if (typeof version !== "string" || semver.valid(version) !== version || version === "0.0.0") {
    throw new Error("Configuration must contain a canonical non-placeholder SemVer");
  }
  if (tag !== `v${version}`) throw new Error("Tag and configuration version do not match exactly");
  if (!/^[a-f0-9]{40}$/.test(sha) || input.head !== sha || input.tagCommit !== sha) {
    throw new Error("Tag, checkout and triggering commit must be identical");
  }
  if (input.identifier !== "dev.graphif.prg") throw new Error("Unexpected application identifier");
  if (input.rootVersion !== "0.0.0" || input.packageVersion !== "0.0.0") {
    throw new Error("Application package versions must remain 0.0.0");
  }
  if (!input.publicKey.trim()) throw new Error("A real MyGo updater public key must be configured");
  releaseNotes(input.changelog, version);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ version, tag, sha, key: input.publicKey, targets: releaseTargets, files: input.files }))
    .digest("hex");
  return { version, tag, sha, fingerprint };
}

const markerPattern = /<!-- project-graph-release:([A-Za-z0-9+/=]+) -->/g;

export function releaseMarker(identity: ReleaseIdentity): string {
  return `<!-- project-graph-release:${Buffer.from(JSON.stringify(identity)).toString("base64")} -->`;
}

export function assertDraft(
  release: { tag_name: string; draft: boolean; body: string | null },
  identity: ReleaseIdentity,
): void {
  if (!release.draft || release.tag_name !== identity.tag) throw new Error("Published releases cannot be replaced");
  const markers = [...(release.body ?? "").matchAll(markerPattern)];
  if (markers.length !== 1 || markers[0][0] !== releaseMarker(identity)) {
    throw new Error("Draft provenance is missing or differs; refusing to reuse it");
  }
}

export function assertAssets(names: readonly string[], version: string): void {
  if (new Set(names).size !== names.length) throw new Error("Duplicate release assets");
  const required = ["install.sh"];
  for (const target of releaseTargets) {
    const [os, arch] = target.split("/");
    required.push(`update-${os}-${arch}.json`, `project-graph-${version}-${os}-${arch}.tar.gz`);
    if (os === "linux") required.push(`project-graph_${version}_${arch}.deb`);
    if (os === "windows") required.push(`Project Graph Setup ${version} ${arch}.exe`);
    if (os === "darwin") required.push(`Project Graph ${version} ${arch}.dmg`);
  }
  const missing = required.filter((name) => !names.includes(name));
  if (missing.length) throw new Error(`Missing release assets: ${missing.join(", ")}`);
}
