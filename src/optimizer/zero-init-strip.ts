import type { IRContract } from "../ir/types";
import type { OptimizationChange } from "./passes";

export function zeroInitStrip(contract: IRContract): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  for (const v of contract.stateVars) {
    if (!v.initializer) continue;
    if (v.initializer.kind !== "literal") continue;
    if (v.type.kind !== "primitive") continue;

    const isZero =
      (v.initializer.literalType === "bigint" && v.initializer.value === "0") ||
      (v.initializer.literalType === "number" && v.initializer.value === "0") ||
      (v.initializer.literalType === "boolean" && v.initializer.value === "false");

    if (!isZero) continue;
    if (v.mutability === "constant") continue;

    delete v.initializer;
    changes.push({
      pass: "zero-init-strip",
      detail: `state var "${v.name}" zero-initializer stripped (default)`,
      applied: true,
    });
  }
  return changes;
}
