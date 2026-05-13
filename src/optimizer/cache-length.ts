import type { IRContract, IRStatement } from "../ir/types";
import { walkStatements } from "./passes";
import type { OptimizationChange } from "./passes";

export function cacheLength(contract: IRContract): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  for (const fn of contract.functions) {
    walkStatements(fn.body, (stmt) => {
      if (stmt.kind !== "for") return;
      if (!stmt.test || stmt.test.kind !== "binary") return;
      const right = stmt.test.right;
      if (right.kind === "member" && right.property === "length") {
        changes.push({
          pass: "cache-length",
          detail: `for-loop in "${fn.name}" reads .length each iteration; cache before loop`,
        });
      }
    });
  }
  return changes;
}
