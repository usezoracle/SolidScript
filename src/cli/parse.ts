import fs from "node:fs";
import path from "node:path";
import { parseContractFiles } from "../parser/parse";

export async function parseCommand(input: string): Promise<void> {
  const files = collectTsFiles(input);
  if (files.length === 0) {
    console.error(`No .ts files found at ${input}`);
    process.exit(1);
  }
  const { program, diagnostics } = parseContractFiles(files);
  for (const d of diagnostics) {
    console.error(`${d.loc.file}:${d.loc.line}:${d.loc.column} — ${d.message}`);
  }
  process.stdout.write(JSON.stringify(program, null, 2) + "\n");
}

export function collectTsFiles(input: string): string[] {
  const abs = path.resolve(input);
  if (!fs.existsSync(abs)) return [];
  const stat = fs.statSync(abs);
  if (stat.isFile()) return abs.endsWith(".ts") ? [abs] : [];
  return walk(abs);
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}
