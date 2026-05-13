import { describe, it, expect } from "bun:test";
import path from "node:path";
import { parseContractFiles } from "../src/parser/parse";
import { optimizeProgram } from "../src/optimizer/passes";
import { emitProgram } from "../src/emitter/emit";

const ROOT = path.resolve(__dirname, "..");

describe("optimizer — mutating passes", () => {
  it("zero-init-strip removes redundant `= 0n` from Vault.totalDeposits", () => {
    const { program } = parseContractFiles([path.join(ROOT, "examples/vault/Vault.ts")]);
    optimizeProgram(program);
    const sol = emitProgram(program)[0]!.solidity;
    expect(sol).not.toMatch(/totalDeposits = 0;/);
    expect(sol).toContain("uint256 public totalDeposits;");
  });

  it("constant marks Counter.count as not constant (it is mutated)", () => {
    const { program } = parseContractFiles([path.join(ROOT, "examples/counter/Counter.ts")]);
    optimizeProgram(program);
    const v = program.contracts[0]!.stateVars.find((v) => v.name === "count")!;
    expect(v.mutability).toBeUndefined();
  });

  it("custom-errors converts `require(x, \"msg\")` to revert", () => {
    const { program } = parseContractFiles([path.join(ROOT, "tests/fixtures/RequireToError.ts")]);
    optimizeProgram(program);
    const c = program.contracts[0]!;
    expect(c.errors.length).toBeGreaterThanOrEqual(1);
    const sol = emitProgram(program)[0]!.solidity;
    expect(sol).toContain("error ");
    expect(sol).toContain("revert ");
  });
});
