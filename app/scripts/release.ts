import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import semver from "semver";
import config from "../mygo.config";
import {
  assertAssets,
  assertDraft,
  releaseMarker,
  releaseNotes,
  releaseTargets,
  validateRelease,
} from "../src/application/release-policy";

const repository = "graphif/project-graph";
const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const phase = process.argv[2];
if (!["gate", "record", "verify", "publish"].includes(phase))
  throw new Error("Expected gate, record, verify or publish");
if (process.env.GITHUB_REPOSITORY !== repository || process.env.GITHUB_REF_TYPE !== "tag") {
  throw new Error("Release operations require a tag in the upstream repository");
}
if (process.env.LR_GITHUB_CLIENT_SECRET) throw new Error("Never embed an OAuth client secret in a desktop release");
const identity = validateRelease({
  version: config.version,
  identifier: config.identifier,
  tag: process.env.GITHUB_REF_NAME ?? "",
  sha: process.env.GITHUB_SHA ?? "",
  head: git("rev-parse", "HEAD"),
  tagCommit: git("rev-parse", "--verify", `${process.env.GITHUB_REF_NAME}^{commit}`),
  rootVersion: JSON.parse(read("package.json")).version,
  packageVersion: JSON.parse(read("app/package.json")).version,
  changelog: read("CHANGELOG.md"),
  publicKey: config.updates?.publicKey ?? "",
  files: [
    ...["app/mygo.config.ts", "app/go.mod", "app/go.sum", "bun.lock", ".bun-version", "CHANGELOG.md"].map(read),
    process.env.LR_API_BASE_URL ?? "",
    process.env.MACOS_SIGNING_IDENTITY ?? "",
  ],
});
if (config.updates?.github !== repository || config.updates.tagPrefix !== "v") {
  throw new Error("Release destination must match the configured upstream and tag prefix");
}

function requireEnvironment(names: readonly string[]) {
  for (const name of names) if (!process.env[name]?.trim()) throw new Error(`Missing required environment: ${name}`);
}

requireEnvironment(["GH_TOKEN", "LR_API_BASE_URL", "MACOS_SIGNING_IDENTITY"]);
const apiBase = `https://api.github.com/repos/${repository}`;
async function request(path: string, method = "GET", body?: unknown): Promise<Response> {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!response.ok && response.status !== 404)
    throw new Error(`GitHub API failed: ${method} ${path} (${response.status})`);
  return response;
}

interface Release {
  id: number;
  tag_name: string;
  draft: boolean;
  body: string | null;
  assets: { id: number; name: string; size: number }[];
}

// A deleted or moved remote tag must not be republished from an old checkout.
let tag = (await (await request(`/git/ref/tags/${encodeURIComponent(identity.tag)}`)).json()) as {
  object: { type: string; sha: string };
};
for (let depth = 0; tag.object?.type === "tag" && depth < 8; depth++) {
  tag = (await (await request(`/git/tags/${tag.object.sha}`)).json()) as typeof tag;
}
if (tag.object?.type !== "commit" || tag.object.sha !== identity.sha) throw new Error("Remote tag moved or is invalid");
const response = await request(`/releases/tags/${encodeURIComponent(identity.tag)}`);
const release: Release | undefined = response.status === 404 ? undefined : ((await response.json()) as Release);

if (phase === "gate") {
  requireEnvironment([
    "MYGO_UPDATER_PRIVATE_KEY",
    "WINDOWS_CERTIFICATE",
    "WINDOWS_CERTIFICATE_PASSWORD",
    "MACOS_CERTIFICATE",
    "MACOS_CERTIFICATE_PASSWORD",
    "APPLE_ID",
    "APPLE_TEAM_ID",
    "APPLE_APP_PASSWORD",
  ]);
  const api = new URL(process.env.LR_API_BASE_URL!);
  if (api.protocol !== "https:" || api.username || api.password)
    throw new Error("Release API base must be a public HTTPS URL");
  if (release) assertDraft(release, identity);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `sha=${identity.sha}\n`);
} else {
  if (!release) throw new Error("MyGo has not created the draft release");
  if (phase === "record") {
    if (!release.draft || release.tag_name !== identity.tag) throw new Error("Cannot annotate a published release");
    if ((release.body ?? "").includes("<!-- project-graph-release:")) assertDraft(release, identity);
    else {
      const updated = await request(`/releases/${release.id}`, "PATCH", {
        body: `${release.body ?? ""}\n\n${releaseMarker(identity)}`,
        prerelease: semver.prerelease(identity.version) !== null,
      });
      if (!updated.ok) throw new Error("Could not record draft provenance");
    }
  } else {
    assertDraft(release, identity);
    assertAssets(
      release.assets.map((asset) => asset.name),
      identity.version,
    );
    if (release.assets.some((asset) => asset.size <= 0)) throw new Error("Empty release asset");
    for (const target of releaseTargets) {
      const name = `update-${target.replace("/", "-")}.json`;
      const asset = release.assets.find((candidate) => candidate.name === name)!;
      // Draft assets need the authenticated asset endpoint, not public download URLs.
      const manifestResponse = await fetch(`${apiBase}/releases/assets/${asset.id}`, {
        headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: "application/octet-stream" },
      });
      if (!manifestResponse.ok) throw new Error(`Cannot read ${name}`);
      const manifest = (await manifestResponse.json()) as { version?: unknown };
      if (manifest.version !== identity.version) throw new Error(`Manifest version mismatch: ${name}`);
    }
    if (phase === "publish") {
      const published = await request(`/releases/${release.id}`, "PATCH", {
        draft: false,
        prerelease: semver.prerelease(identity.version) !== null,
        make_latest: semver.prerelease(identity.version) !== null ? "false" : "true",
        body: `${releaseNotes(read("CHANGELOG.md"), identity.version)}\n\n${releaseMarker(identity)}`,
      });
      if (!published.ok) throw new Error("Could not publish the verified draft");
    }
  }
}
console.log(`Release ${phase} passed: ${identity.tag} at ${identity.sha}`);
