import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { Diagnostic, Severity } from "../validator/diagnostics";
import type { SourceMap } from "../sourcemaps/emit";
import { resolveOZRoot } from "../compiler/solc";
import { resolveTool, toolStatus } from "../runtime/tool-paths";

export interface SlitherFinding {
  rule: string;
  severity: Severity;
  message: string;
  solFile: string;
  solLine: number;
}

export interface SlitherResult {
  ok: boolean;
  installed: boolean;
  findings: SlitherFinding[];
  diagnostics: Diagnostic[];
  raw?: unknown;
  error?: string;
}

export function slitherInstalled(): boolean {
  return toolStatus("slither").ok;
}

export async function runSlither(solFiles: string[], sourcemaps: SourceMap[]): Promise<SlitherResult> {
  let tool: Awaited<ReturnType<typeof resolveTool>>;
  try {
    tool = await resolveTool("slither");
  } catch (e: any) {
    return { ok: false, installed: false, findings: [], diagnostics: [], error: e.message ?? String(e) };
  }

  const ozRoot = resolveOZRoot();
  const remaps = ozRoot ? `@openzeppelin/contracts/=${ozRoot}/` : "";

  const findings: SlitherFinding[] = [];
  const diagnostics: Diagnostic[] = [];
  let raw: unknown;

  for (const file of solFiles) {
    const args = [...tool.argPrefix, file, "--json", "-"];
    if (remaps) args.push("--solc-remaps", remaps);
    args.push("--exclude-informational", "--exclude-low");
    const proc = spawnSync(tool.cmd, args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });

    let parsed: any;
    try {
      parsed = JSON.parse(proc.stdout || "{}");
    } catch {
      continue;
    }
    raw = parsed;

    const detectors = parsed?.results?.detectors ?? [];
    for (const d of detectors) {
      const el = (d.elements ?? [])[0];
      const sm = el?.source_mapping;
      if (!sm) continue;
      const solFile = path.basename(sm.filename_used ?? file);
      const solLine = (sm.lines ?? [0])[0] ?? 0;
      const sevMap: Record<string, Severity> = {
        "High": "error",
        "Medium": "warning",
        "Low": "info",
        "Informational": "info",
      };
      const severity = sevMap[d.impact] ?? "warning";

      findings.push({ rule: d.check, severity, message: d.description.split("\n")[0], solFile, solLine });

      const mapping = sourcemaps.find((s) => s.solFile === solFile);
      const entry = mapping?.entries.slice().reverse().find((e) => e.solLine <= solLine);
      const loc = mapping && entry
        ? { file: mapping.tsFile, line: entry.tsLine, column: 1 }
        : { file: solFile, line: solLine, column: 1 };

      diagnostics.push({
        rule: `slither/${d.check}`,
        severity,
        message: d.description.split("\n")[0],
        loc,
      });
    }
  }

  return { ok: true, installed: true, findings, diagnostics, raw };
}
