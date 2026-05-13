import type { SourceLocation } from "../ir/types";

export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  rule: string;
  severity: Severity;
  message: string;
  loc?: SourceLocation;
  fix?: string;
}

export function formatDiagnostic(d: Diagnostic): string {
  const where = d.loc ? `${d.loc.file}:${d.loc.line}:${d.loc.column}` : "<unknown>";
  const fix = d.fix ? `\n    suggestion: ${d.fix}` : "";
  return `${where} [${d.severity}] ${d.rule}: ${d.message}${fix}`;
}
