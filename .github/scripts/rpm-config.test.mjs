import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./rpm-config.mjs", import.meta.url));

for (const [input, version, release] of [
  ["0.0.0-nightly.906", "0.0.0", "0.nightly.906"],
  ["0.0.0-nightly.907", "0.0.0", "0.nightly.907"],
  ["4.2.6-alpha1", "4.2.6", "0.alpha1"],
  ["4.2.6", "4.2.6", "1"],
  ["4.2.6-rc.1-foss+build.42", "4.2.6", "0.rc.1.foss"],
  ["4.2.6+build.42", "4.2.6", "1"],
]) {
  test(`RPM config for ${input}`, () => {
    const result = spawnSync(process.execPath, [script, input], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { version, bundle: { linux: { rpm: { release } } } });
    assert.doesNotMatch(version + release, /-/);
  });
}

test("missing or malformed versions fail instead of generating a bundle config", () => {
  for (const args of [[], ["invalid"], ["4.2.6-rc/1"]]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  }
});
