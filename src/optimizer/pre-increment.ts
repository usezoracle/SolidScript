import type { IRContract, IRExpression } from "../ir/types";
import type { OptimizationChange } from "./passes";
import { walkStatements } from "./walk";

export function preIncrement(contract: IRContract): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  for (const fn of contract.functions) {
    if (fn.isAssembly) continue;
    walkStatements(fn.body, (stmt) => {
      if (stmt.kind === "expression" && stmt.expr.kind === "unary" && !stmt.expr.prefix &&
          (stmt.expr.op === "++" || stmt.expr.op === "--")) {
        stmt.expr.prefix = true;
        changes.push({
          pass: "pre-increment",
          detail: `postfix ${stmt.expr.op} → prefix in ${fn.name}`,
          applied: true,
        });
      }
      if (stmt.kind === "for" && stmt.update && stmt.update.kind === "unary" && !stmt.update.prefix &&
          (stmt.update.op === "++" || stmt.update.op === "--")) {
        stmt.update.prefix = true;
        changes.push({
          pass: "pre-increment",
          detail: `for-loop update postfix → prefix in ${fn.name}`,
          applied: true,
        });
      }
    });
  }
  return changes;
}
