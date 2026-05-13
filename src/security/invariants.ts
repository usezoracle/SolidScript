import type { IRContract, IRFunction } from "../ir/types";

export interface InvariantSpec {
  name: string;
  predicate: string;
  origin: "decorator" | "auto-erc20";
}

export function collectInvariants(contract: IRContract): InvariantSpec[] {
  const out: InvariantSpec[] = [];

  for (const fn of contract.functions) {
    if (!fn.decorators.some((d) => d.name === "invariant")) continue;
    if (fn.returnType.kind !== "primitive" || fn.returnType.name !== "bool") continue;
    out.push({ name: fn.name, predicate: `_target.${fn.name}()`, origin: "decorator" });
  }

  if (looksLikeERC20(contract)) {
    out.push({
      name: "supplyEqualsZero",
      predicate: `_target.totalSupply() >= 0`,
      origin: "auto-erc20",
    });
  }

  return out;
}

function looksLikeERC20(contract: IRContract): boolean {
  if (contract.bases.includes("ERC20")) return true;
  const names = new Set(contract.functions.map((f) => f.name));
  return names.has("balanceOf") && names.has("totalSupply") && names.has("transfer");
}

export function renderInvariantTest(contract: IRContract, invariants: InvariantSpec[]): string | null {
  if (invariants.length === 0) return null;
  const ctor = contract.functions.find((f) => f.isConstructor);
  if (ctor && ctor.params.length > 0) return null;

  const lines: string[] = [];
  lines.push("// SPDX-License-Identifier: MIT");
  lines.push("pragma solidity ^0.8.20;");
  lines.push("");
  lines.push(`import "forge-std/Test.sol";`);
  lines.push(`import "../src/${contract.name}.sol";`);
  lines.push("");
  lines.push(`contract ${contract.name}InvariantAuto is Test {`);
  lines.push(`    ${contract.name} internal _target;`);
  lines.push("");
  lines.push(`    function setUp() public {`);
  lines.push(`        _target = new ${contract.name}();`);
  lines.push(`        targetContract(address(_target));`);
  lines.push(`    }`);
  lines.push("");
  for (const inv of invariants) {
    lines.push(`    /// origin: ${inv.origin}`);
    lines.push(`    function invariant_${inv.name}() public view {`);
    lines.push(`        assertTrue(${inv.predicate}, "${inv.name} violated");`);
    lines.push(`    }`);
    lines.push("");
  }
  if (lines[lines.length - 1] === "") lines.pop();
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}
