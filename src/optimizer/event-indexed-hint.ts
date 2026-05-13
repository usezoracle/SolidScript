import type { IRContract } from "../ir/types";
import type { OptimizationChange } from "./passes";

export function eventIndexedHint(contract: IRContract): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  for (const ev of contract.events) {
    const candidates = ev.params.filter((p) =>
      !p.indexed &&
      p.type.kind === "primitive" &&
      (p.type.name === "address" || p.type.name === "bytes32"),
    );
    for (const c of candidates.slice(0, 3 - ev.params.filter((p) => p.indexed).length)) {
      changes.push({
        pass: "event-indexed-hint",
        detail: `event ${ev.name}.${c.name} (${(c.type as any).name}) should likely be indexed`,
        applied: false,
      });
    }
  }
  return changes;
}
