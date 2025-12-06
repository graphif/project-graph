import { globSync, readFileSync } from "fs";

const src = process.argv[2];

const explicitDeps = new Set<string>();
for (const path of globSync(`${src}/**/*.{ts,tsx,css,pcss}`)) {
  const content = readFileSync(path, "utf-8");
  const matches = content.matchAll(/^@?import (?:.+ from )?"((?:@[a-z0-9-.]+\/)?[a-z0-9-.]+)(?:\/[a-z0-9-.]+)*";$/gm);
  for (const [, dep] of matches) {
    if (dep === ".") continue;
    explicitDeps.add(dep);
  }
}

const deps = new Map<string, string>();
const packageJson = JSON.parse(readFileSync(`${src}/package.json`, "utf-8"));
for (const depType of ["dependencies", "devDependencies", "peerDependencies"]) {
  for (const [dep, version] of Object.entries<string>(packageJson[depType] || {})) {
    deps.set(dep, version);
  }
}

const implicitDeps = new Set<string>();
for (const dep of deps.keys()) {
  if (!explicitDeps.has(dep)) {
    implicitDeps.add(dep);
  }
}

// explicit放进dependencies，implicit放进devDependencies，字母排序
packageJson.dependencies = {};
packageJson.devDependencies = {};
for (const dep of Array.from(explicitDeps).sort()) {
  if (deps.has(dep)) {
    packageJson.dependencies[dep] = deps.get(dep);
  }
}
for (const dep of Array.from(implicitDeps).sort()) {
  if (deps.has(dep)) {
    packageJson.devDependencies[dep] = deps.get(dep);
  }
}

// Write back to package.json
import { writeFileSync } from "fs";
writeFileSync(`${src}/package.json`, JSON.stringify(packageJson, null, 2) + "\n", "utf-8");
