import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { Diagnostic, Severity } from "../validator/diagnostics";
import type { SourceMap } from "../sourcemaps/emit";
import { resolveOZRoot } from "../compiler/solc";
import { resolveTool, toolStatus } from "../runtime/tool-paths";

export interface MythrilFinding {
  swcId?: string;
  title: string;
  severity: Severity;
  description: string;
  function?: string;
  solFile: string;
  solLine: number;
}

export interface MythrilResult {
  ok: boolean;
  installed: boolean;
  findings: MythrilFinding[];
  diagnostics: Diagnostic[];
  raw?: unknown;
  error?: string;
}

export interface MythrilOptions {
  /** seconds; mythril is slow — default 90s per contract */
  timeout?: number;
  /** Solidity solc version override (e.g. "0.8.20") */
  solcVersion?: string;
}

export function mythrilInstalled(): boolean {
  return toolStatus("myth").ok;
}

export async function runMythril(solFiles: string[], sourcemaps: SourceMap[], opts: MythrilOptions = {}): Promise<MythrilResult> {
  let tool: Awaited<ReturnType<typeof resolveTool>>;
  try {
    tool = await resolveTool("myth");
  } catch (e: any) {
    return { ok: false, installed: false, findings: [], diagnostics: [], error: e.message ?? String(e) };
  }

  const ozRoot = resolveOZRoot();
  const remapArg = ozRoot ? `@openzeppelin/contracts/=${ozRoot}/` : "";
  const timeout = String(opts.timeout ?? 90);

  const findings: MythrilFinding[] = [];
  const diagnostics: Diagnostic[] = [];
  let raw: unknown;

  for (const file of solFiles) {
    const args = [
      ...tool.argPrefix,
      "analyze",
      file,
      "--solv", opts.solcVersion ?? "0.8.20",
      "--execution-timeout", timeout,
      "-o", "jsonv2",
    ];

    const proc = spawnSync(tool.cmd, args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
    let parsed: any;
    try { parsed = JSON.parse(proc.stdout || "[]"); } catch { continue; }
    raw = parsed;

    const reports = Array.isArray(parsed) ? parsed : [parsed];
    for (const report of reports) {
      const issues = report?.issues ?? [];
      for (const iss of issues) {
        const sevMap: Record<string, Severity> = {
          "High": "error",
          "Medium": "warning",
          "Low": "info",
        };
        const severity = sevMap[iss.severity] ?? "warning";
        const solFile = path.basename(iss?.locations?.[0]?.sourceMap?.split(":")?.[2] ?? file);
        const solLine = iss?.locations?.[0]?.line ?? iss?.lineno ?? 0;

        findings.push({
          swcId: iss["swc-id"] ?? iss.swcID,
          title: iss.title ?? iss.name ?? "issue",
          severity,
          description: iss.description?.head ?? iss.description ?? "",
          function: iss.function,
          solFile,
          solLine,
        });

        const mapping = sourcemaps.find((s) => s.solFile === solFile);
        const entry = mapping?.entries.slice().reverse().find((e) => e.solLine <= solLine);
        const loc = mapping && entry
          ? { file: mapping.tsFile, line: entry.tsLine, column: 1 }
          : { file: solFile, line: solLine, column: 1 };

        diagnostics.push({
          rule: `mythril/${iss["swc-id"] ?? iss.swcID ?? "issue"}`,
          severity,
          message: `${iss.title ?? "issue"}: ${(iss.description?.head ?? iss.description ?? "").split("\n")[0]}`,
          loc,
        });
      }
    }
  }

  return { ok: true, installed: true, findings, diagnostics, raw };
}
