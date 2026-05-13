import type { IRContract } from "../ir/types";
import { walkStatements } from "./passes";
import type { OptimizationChange } from "./passes";

export function constantPass(contract: IRContract): OptimizationChange[] {
  const changes: OptimizationChange[] = [];

  const assignedAnywhere = new Set<string>();
  for (const fn of contract.functions) {
    walkStatements(fn.body, (stmt) => {
      if (stmt.kind === "expression" && stmt.expr.kind === "assign") {
        const lhs = stmt.expr.left;
        if (lhs.kind === "member" && lhs.object.kind === "this") {
          assignedAnywhere.add(lhs.property);
        }
      }
    });
  }

  for (const v of contract.stateVars) {
    if (v.type.kind !== "primitive") continue;
    if (v.mutability) continue;
    if (!v.initializer) continue;
    if (v.initializer.kind !== "literal") continue;
    if (assignedAnywhere.has(v.name)) continue;
    v.mutability = "constant";
    changes.push({
      pass: "constant",
      detail: `state var "${v.name}" marked constant (literal init, never reassigned)`,
      applied: true,
    });
  }
  return changes;
}
