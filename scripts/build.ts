import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const DIST = path.join(ROOT, "dist");

fs.rmSync(DIST, { recursive: true, force: true });

console.log("[1/3] bundling library + cli with bun…");
const bunBuild = spawnSync(
  "bun",
  [
    "build",
    "--target=node",
    "--format=esm",
    "--outdir=dist",
    "--external=solc",
    "--external=viem",
    "--external=viem/accounts",
    "--external=viem/chains",
    "--external=commander",
    "--external=picocolors",
    "--external=zod",
    "--external=typescript",
    "--external=@openzeppelin/contracts",
    "src/index.ts",
    "src/cli/index.ts",
  ],
  { cwd: ROOT, stdio: "inherit" },
);
if (bunBuild.status !== 0) process.exit(1);

console.log("[2/3] emitting .d.ts via tsc…");
const tsc = spawnSync(
  "bun",
  ["x", "tsc", "-p", "tsconfig.build.json", "--emitDeclarationOnly"],
  { cwd: ROOT, stdio: "inherit" },
);
if (tsc.status !== 0) {
  console.warn("⚠ tsc declaration emit failed (build continues — JS is bundled)");
}

console.log("[3/3] adding shebang + chmod…");
const cliPath = path.join(DIST, "cli", "index.js");
const content = fs.readFileSync(cliPath, "utf8");
if (!content.startsWith("#!")) {
  fs.writeFileSync(cliPath, "#!/usr/bin/env node\n" + content);
}
fs.chmodSync(cliPath, 0o755);

console.log("✓ build complete");
console.log("  ", path.join(DIST, "index.js"));
console.log("  ", cliPath);
