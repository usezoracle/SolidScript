import type { IRContract, IRStateVar } from "../ir/types";
import type { OptimizationChange } from "./passes";

const SLOT_SIZE_BITS = 256;

function bitSize(v: IRStateVar): number {
  if (v.type.kind !== "primitive") return SLOT_SIZE_BITS;
  switch (v.type.name) {
    case "bool": return 8;
    case "address": return 160;
    case "uint256":
    case "int256": return 256;
    case "bytes32": return 256;
    default: return 256;
  }
}

export function packSlots(contract: IRContract): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  const vars = contract.stateVars;
  if (vars.length < 2) return changes;

  const reordered: IRStateVar[] = [];
  const small: IRStateVar[] = [];
  const full: IRStateVar[] = [];

  for (const v of vars) {
    if (v.type.kind === "mapping" || v.type.kind === "array") {
      full.push(v);
      continue;
    }
    if (bitSize(v) < 256) small.push(v);
    else full.push(v);
  }

  if (small.length > 1) {
    let slotBits = 0;
    let slotsUsed = 0;
    let slotsBefore = small.length;
    for (const v of small) {
      const sz = bitSize(v);
      if (slotBits + sz > SLOT_SIZE_BITS) {
        slotsUsed += 1;
        slotBits = sz;
      } else {
        slotBits += sz;
      }
    }
    slotsUsed += 1;
    if (slotsUsed < slotsBefore) {
      changes.push({
        pass: "pack-slots",
        detail: `reordered ${small.length} small state vars into ${slotsUsed} slot(s) (was ${slotsBefore})`,
      });
      reordered.push(...small, ...full);
      contract.stateVars = [...reordered];
    }
  }

  return changes;
}
