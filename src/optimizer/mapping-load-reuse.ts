import type { IRContract } from "../ir/types";
import type { OptimizationChange } from "./passes";

export function mappingLoadReuse(contract: IRContract): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  const mappingNames = new Set(
    contract.stateVars.filter((v) => v.type.kind === "mapping").map((v) => v.name),
  );

  for (const fn of contract.functions) {
    if (fn.isAssembly) continue;
    const accesses = new Map<string, number>();
    countMappingAccesses(fn.body, mappingNames, accesses);
    for (const [key, count] of accesses) {
      if (count >= 2) {
        changes.push({
          pass: "mapping-load-reuse",
          detail: `mapping read "${key}" appears ${count}× in ${fn.name}; cache once to save ~${(count - 1) * 100} gas`,
          applied: false,
        });
      }
    }
  }
  return changes;
}

function countMappingAccesses(node: any, mappingNames: Set<string>, counts: Map<string, number>): void {
  if (!node || typeof node !== "object") return;
  if (node.kind === "index") {
    const obj = node.object;
    if (obj && obj.kind === "member" && obj.object && obj.object.kind === "this" && mappingNames.has(obj.property)) {
      const key = `${obj.property}[${renderIndex(node.index)}]`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  for (const k of Object.keys(node)) {
    const v = (node as any)[k];
    if (Array.isArray(v)) for (const it of v) countMappingAccesses(it, mappingNames, counts);
    else if (v && typeof v === "object") countMappingAccesses(v, mappingNames, counts);
  }
}

function renderIndex(e: any): string {
  if (!e) return "?";
  if (e.kind === "identifier") return e.name;
  if (e.kind === "member" && e.object && e.object.kind === "identifier") return `${e.object.name}.${e.property}`;
  if (e.kind === "literal") return e.value;
  return "?";
}
