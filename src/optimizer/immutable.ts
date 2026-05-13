import type { IRContract, IRStatement } from "../ir/types";
import { walkStatements } from "./passes";
import type { OptimizationChange } from "./passes";

export function immutablePass(contract: IRContract): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  const ctor = contract.functions.find((f) => f.isConstructor);
  if (!ctor) return changes;

  const assignedInCtor = new Set<string>();
  walkStatements(ctor.body, (stmt) => {
    if (stmt.kind === "expression" && stmt.expr.kind === "assign") {
      const lhs = stmt.expr.left;
      if (lhs.kind === "member" && lhs.object.kind === "this") {
        assignedInCtor.add(lhs.property);
      }
    }
  });

  const assignedElsewhere = new Set<string>();
  for (const fn of contract.functions) {
    if (fn.isConstructor) continue;
    walkStatements(fn.body, (stmt) => {
      if (stmt.kind === "expression" && stmt.expr.kind === "assign") {
        const lhs = stmt.expr.left;
        if (lhs.kind === "member" && lhs.object.kind === "this") {
          assignedElsewhere.add(lhs.property);
        }
      }
    });
  }

  for (const v of contract.stateVars) {
    if (v.type.kind !== "primitive") continue;
    if (v.mutability) continue;
    if (assignedInCtor.has(v.name) && !assignedElsewhere.has(v.name)) {
      v.mutability = "immutable";
      changes.push({
        pass: "immutable",
        detail: `state var "${v.name}" marked immutable (only set in constructor)`,
        applied: true,
      });
    }
  }

  return changes;
}
