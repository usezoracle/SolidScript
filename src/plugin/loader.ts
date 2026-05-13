import path from "node:path";
import fs from "node:fs";
import { setPluginRegistry, type SolidScriptPlugin } from "./api";

export async function loadPlugins(pluginPaths: string[], cwd: string = process.cwd()): Promise<SolidScriptPlugin[]> {
  const plugins: SolidScriptPlugin[] = [];
  for (const raw of pluginPaths) {
    const resolved = resolvePlugin(raw, cwd);
    if (!resolved) {
      console.warn(`plugin not found: ${raw}`);
      continue;
    }
    const mod = await import(resolved);
    const candidate = (mod.default ?? mod) as SolidScriptPlugin;
    if (!candidate || !candidate.name) {
      console.warn(`plugin at ${resolved} does not export a SolidScriptPlugin`);
      continue;
    }
    plugins.push(candidate);
  }
  setPluginRegistry({ plugins });
  return plugins;
}

function resolvePlugin(raw: string, cwd: string): string | undefined {
  if (raw.startsWith(".") || raw.startsWith("/")) {
    const abs = path.resolve(cwd, raw);
    if (fs.existsSync(abs)) return abs;
    for (const ext of [".ts", ".js", ".mjs"]) {
      if (fs.existsSync(abs + ext)) return abs + ext;
    }
    return undefined;
  }
  return raw;
}
