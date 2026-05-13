import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { loadConfig } from "../config/load";
import { compileSolidity } from "../compiler/solc";

export interface CompileOptions {
  out?: string;
}

export async function compileCommand(input: string, opts: CompileOptions): Promise<void> {
  const config = await loadConfig();
  const absIn = path.resolve(input);
  if (!fs.existsSync(absIn)) {
    console.error(`Not found: ${absIn}`);
    process.exit(1);
  }
  const solFiles = collectSolFiles(absIn);
  if (solFiles.length === 0) {
    console.error(`No .sol files found at ${absIn}`);
    process.exit(1);
  }
  const result = compileSolidity({ solFiles, config });
  const { artifacts, errors } = result;
  for (const e of errors) console.error(pc.red(e));
  if (errors.length > 0) process.exit(1);

  const outDir = path.resolve(opts.out ?? path.join(config.outDir, "artifacts"));
  fs.mkdirSync(outDir, { recursive: true });
  for (const a of artifacts) {
    const f = path.join(outDir, `${a.contractName}.json`);
    fs.writeFileSync(f, JSON.stringify(a, null, 2), "utf8");
    console.log(pc.green(`compiled ${a.contractName} → ${f}`));
  }
  fs.writeFileSync(path.join(outDir, "solc-input.json"), result.standardJsonInput, "utf8");
}

function collectSolFiles(p: string): string[] {
  const stat = fs.statSync(p);
  if (stat.isFile()) return p.endsWith(".sol") ? [p] : [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, entry.name);
    if (entry.isDirectory()) out.push(...collectSolFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".sol")) out.push(full);
  }
  return out;
}
