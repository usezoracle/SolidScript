import type { IRContract, IRExpression } from "../ir/types";
import type { OptimizationChange } from "./passes";
import { walkExpr } from "./walk";

export function storageCache(contract: IRContract): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  const stateNames = new Set(contract.stateVars.map((v) => v.name));

  for (const fn of contract.functions) {
    if (fn.isAssembly) continue;
    const reads = new Map<string, number>();
    for (const stmt of fn.body) {
      collectReads(stmt as any, stateNames, reads);
    }
    for (const [name, count] of reads) {
      if (count >= 2) {
        changes.push({
          pass: "storage-cache",
          detail: `state "${name}" read ${count}× in ${fn.name}; consider caching locally (~${(count - 1) * 100} gas saved)`,
          applied: false,
        });
      }
    }
  }
  return changes;
}

function collectReads(node: any, stateNames: Set<string>, reads: Map<string, number>): void {
  if (!node) return;
  if (typeof node !== "object") return;

  if (isThisMember(node) && stateNames.has(node.property)) {
    reads.set(node.property, (reads.get(node.property) ?? 0) + 1);
  }

  for (const key of Object.keys(node)) {
    const v = (node as any)[key];
    if (Array.isArray(v)) {
      for (const item of v) collectReads(item, stateNames, reads);
    } else if (v && typeof v === "object") {
      collectReads(v, stateNames, reads);
    }
  }
}

function isThisMember(e: any): e is { kind: "member"; object: { kind: "this" }; property: string } {
  return e && e.kind === "member" && e.object && e.object.kind === "this";
}
