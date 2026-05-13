import { describe, it, expect } from "bun:test";
import path from "node:path";
import { parseContractFiles } from "../src/parser/parse";
import { emitProgram } from "../src/emitter/emit";

const ROOT = path.resolve(__dirname, "..");

function buildOne(file: string): string {
  const { program } = parseContractFiles([path.join(ROOT, file)]);
  const emitted = emitProgram(program);
  return emitted[0]!.solidity;
}

describe("emitter", () => {
  it("emits SPDX + pragma header", () => {
    const sol = buildOne("examples/counter/Counter.ts");
    expect(sol).toContain("// SPDX-License-Identifier: MIT");
    expect(sol).toMatch(/pragma solidity \^0\.8\.\d+;/);
  });

  it("auto-imports Ownable for @onlyOwner", () => {
    const sol = buildOne("examples/counter/Counter.ts");
    expect(sol).toContain("@openzeppelin/contracts/access/Ownable.sol");
    expect(sol).toMatch(/contract Counter is .*Ownable/);
  });

  it("translates Map.set to indexed assignment", () => {
    const sol = buildOne("examples/vault/Vault.ts");
    expect(sol).toContain("deposits[msg.sender] = ");
  });

  it("emits onlyOwner modifier on @onlyOwner method", () => {
    const sol = buildOne("examples/counter/Counter.ts");
    expect(sol).toMatch(/function increment\(\) public onlyOwner/);
  });

  it("emits chained super() as base constructor call", () => {
    const sol = buildOne("examples/erc20-token/MyToken.ts");
    expect(sol).toMatch(/constructor\([^)]*\) ERC20\("MyToken", "MTK"\)/);
  });

  it("emits @payable as payable", () => {
    const sol = buildOne("examples/vault/Vault.ts");
    expect(sol).toContain("function deposit() public payable");
  });
});
