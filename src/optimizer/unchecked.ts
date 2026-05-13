import type { IRContract, IRStatement } from "../ir/types";
import { walkExpr, walkStatements } from "./passes";
import type { OptimizationChange } from "./passes";

export function uncheckedArithmetic(contract: IRContract): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  for (const fn of contract.functions) {
    walkStatements(fn.body, (stmt) => {
      if (stmt.kind !== "for") return;
      if (!stmt.update) return;
      walkExpr(stmt.update, (e) => {
        if (e.kind === "unary" && (e.op === "++" || e.op === "--")) {
          changes.push({
            pass: "unchecked",
            detail: `loop counter ${e.op} in "${fn.name}" can be wrapped in unchecked { } since overflow is impossible by bound`,
          });
        }
      });
    });
  }
  return changes;
}
