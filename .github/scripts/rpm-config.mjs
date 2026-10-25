const version = process.argv[2];
const match = /^(\d+\.\d+\.\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(version ?? "");
if (!match) {
  throw new Error(`Expected an app version, received: ${version}`);
}

const [, baseVersion, prerelease] = match;
// RPM forbids '-' in Version/Release; release 0 sorts prereleases before the stable release 1.
const release = prerelease ? `0.${prerelease.replaceAll("-", ".")}` : "1";
console.log(JSON.stringify({ version: baseVersion, bundle: { linux: { rpm: { release } } } }));
