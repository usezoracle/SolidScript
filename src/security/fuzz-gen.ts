import type { IRContract, IRFunction, IRParam, IRType } from "../ir/types";
import { resolveContract } from "../mapper/decorators";
import { solidityType } from "../mapper/types";

export interface FuzzHarness {
  filename: string;
  solidity: string;
}

export function generateFuzzHarness(contract: IRContract): FuzzHarness | null {
  const resolution = resolveContract(contract);
  const ctor = contract.functions.find((f) => f.isConstructor);
  if (ctor && ctor.params.length > 0) return null;

  const publicFns = contract.functions.filter((fn) =>
    !fn.isConstructor && !fn.isAssembly &&
    !fn.decorators.some((d) => d.name === "internal" || d.name === "private"),
  );

  if (publicFns.length === 0) return null;

  const invariantFns = publicFns.filter((fn) =>
    fn.decorators.some((d) => d.name === "invariant") ||
    autoInvariantFor(contract, fn) !== undefined,
  );

  const lines: string[] = [];
  lines.push("// SPDX-License-Identifier: MIT");
  lines.push("pragma solidity ^0.8.20;");
  lines.push("");
  lines.push(`import "forge-std/Test.sol";`);
  lines.push(`import "../src/${contract.name}.sol";`);
  lines.push("");
  lines.push(`contract ${contract.name}FuzzAuto is Test {`);
  lines.push(`    ${contract.name} internal _target;`);
  lines.push("");
  lines.push(`    function setUp() public {`);
  lines.push(`        _target = new ${contract.name}();`);
  lines.push(`    }`);
  lines.push("");

  for (const fn of publicFns) {
    if (isStateChangingTakingNoUserInput(fn)) continue;
    lines.push(...fuzzMethod(contract, fn, invariantFns));
    lines.push("");
  }

  for (const fn of invariantFns) {
    lines.push(...invariantMethod(contract, fn));
    lines.push("");
  }

  if (lines[lines.length - 1] === "") lines.pop();
  lines.push("}");
  lines.push("");

  return { filename: `${contract.name}.fuzz.t.sol`, solidity: lines.join("\n") };
}

function isStateChangingTakingNoUserInput(fn: IRFunction): boolean {
  return fn.params.length === 0;
}

function fuzzMethod(_contract: IRContract, fn: IRFunction, invariants: IRFunction[]): string[] {
  const paramSig = fn.params.map((p) => `${solidityFuzzType(p.type)} ${p.name}`).join(", ");
  const callArgs = fn.params.map((p) => p.name).join(", ");
  const cap = fn.name.charAt(0).toUpperCase() + fn.name.slice(1);
  const lines: string[] = [];
  lines.push(`    function testFuzz_${cap}(${paramSig}) public {`);
  for (const p of fn.params) {
    if (p.type.kind === "primitive" && p.type.name === "address") {
      lines.push(`        vm.assume(${p.name} != address(0));`);
    }
  }
  const isView = fn.decorators.some((d) => d.name === "view" || d.name === "pure");
  if (isView) {
    lines.push(`        _target.${fn.name}(${callArgs});`);
  } else {
    lines.push(`        try _target.${fn.name}(${callArgs}) {} catch {}`);
  }
  for (const inv of invariants) {
    lines.push(`        assertTrue(this.${inv.name}_invariant(), "${inv.name} invariant violated");`);
  }
  lines.push(`    }`);
  return lines;
}

function invariantMethod(contract: IRContract, fn: IRFunction): string[] {
  const lines: string[] = [];
  const auto = autoInvariantFor(contract, fn);
  if (auto) {
    lines.push(`    function ${fn.name}_invariant() public view returns (bool) {`);
    lines.push(`        return ${auto};`);
    lines.push(`    }`);
  } else {
    lines.push(`    function ${fn.name}_invariant() public view returns (bool) {`);
    lines.push(`        return _target.${fn.name}();`);
    lines.push(`    }`);
  }
  return lines;
}

function autoInvariantFor(_contract: IRContract, _fn: IRFunction): string | undefined {
  return undefined;
}

function solidityFuzzType(t: IRType): string {
  return solidityType(t, "memory");
}
