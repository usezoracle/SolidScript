import pc from "picocolors";
import { parseContractFiles } from "../parser/parse";
import { optimizeProgram } from "../optimizer/passes";
import { collectTsFiles } from "./parse";

export async function optimizeCommand(input: string): Promise<void> {
  const files = collectTsFiles(input);
  if (files.length === 0) {
    console.error(`No .ts files found at ${input}`);
    process.exit(1);
  }
  const { program } = parseContractFiles(files);
  const reports = optimizeProgram(program);
  for (const r of reports) {
    console.log(pc.bold(`${r.contract} — ${r.changes.length} suggestion(s)`));
    if (r.changes.length === 0) {
      console.log(pc.dim("  (no optimizations found)"));
      continue;
    }
    for (const c of r.changes) {
      console.log(`  ${pc.cyan(c.pass)}: ${c.detail}`);
    }
  }
}
