import type { IRContract, IRExpression } from "../ir/types";
import type { OptimizationChange } from "./passes";
import { exprContains, walkStatements } from "./walk";

export function uncheckedLoop(contract: IRContract): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  for (const fn of contract.functions) {
    if (fn.isAssembly) continue;
    walkStatements(fn.body, (stmt) => {
      if (stmt.kind !== "for") return;
      if (stmt.uncheckedIncrement) return;
      if (!stmt.init || stmt.init.kind !== "let") return;
      if (!stmt.test || stmt.test.kind !== "binary") return;
      if (!stmt.update) return;

      const counterName = stmt.init.name;
      const testLeft = stmt.test.left;
      if (testLeft.kind !== "identifier" || testLeft.name !== counterName) return;
      if (![">", "<", "<=", ">="].includes(stmt.test.op)) return;

      const upd = stmt.update;
      const isIncrement =
        (upd.kind === "unary" && (upd.op === "++" || upd.op === "--") &&
          upd.operand.kind === "identifier" && upd.operand.name === counterName) ||
        (upd.kind === "assign" && upd.left.kind === "identifier" && upd.left.name === counterName &&
          (upd.op === "+=" || upd.op === "-="));
      if (!isIncrement) return;

      let reassigns = false;
      for (const inner of stmt.body) {
        if (inner.kind === "expression" && inner.expr.kind === "assign" &&
            inner.expr.left.kind === "identifier" && inner.expr.left.name === counterName) {
          reassigns = true;
        }
        if (inner.kind === "expression") {
          if (exprContains(inner.expr, (e) =>
            e.kind === "unary" && (e.op === "++" || e.op === "--") &&
            e.operand.kind === "identifier" && e.operand.name === counterName,
          )) reassigns = true;
        }
      }
      if (reassigns) return;

      stmt.uncheckedIncrement = true;
      changes.push({
        pass: "unchecked-loop",
        detail: `loop counter "${counterName}" in ${fn.name} wrapped in unchecked`,
        applied: true,
      });
    });
  }
  return changes;
}
