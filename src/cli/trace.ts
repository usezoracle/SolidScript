import fs from "node:fs";
import path from "node:path";
import type { SourceMap } from "../sourcemaps/emit";

export interface TraceOptions {
  input?: string;
  sourcemapDir?: string;
}

export async function traceCommand(opts: TraceOptions): Promise<void> {
  const smDir = path.resolve(opts.sourcemapDir ?? "out/sol");
  const maps = loadSourceMaps(smDir);

  const text = opts.input
    ? fs.readFileSync(opts.input, "utf8")
    : await readStdin();

  const re = /(\w+\.sol)(?::|#)(\d+)(?:-(\d+))?/g;
  const rewritten = text.replace(re, (match, file: string, lineStr: string, _end?: string) => {
    const line = parseInt(lineStr, 10);
    const map = maps.find((m) => m.solFile === file);
    if (!map) return match;
    const entry = [...map.entries].reverse().find((e) => e.solLine <= line);
    if (!entry) return match;
    const tsBase = path.basename(map.tsFile);
    return `${tsBase}:${entry.tsLine} (was ${match})`;
  });

  process.stdout.write(rewritten);
}

function loadSourceMaps(dir: string): SourceMap[] {
  if (!fs.existsSync(dir)) return [];
  const out: SourceMap[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".sourcemap.json")) continue;
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(dir, entry), "utf8")));
    } catch { /* skip */ }
  }
  return out;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
    if (process.stdin.isTTY) resolve("");
  });
}
