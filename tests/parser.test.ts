import { describe, it, expect } from "bun:test";
import path from "node:path";
import { parseContractFiles } from "../src/parser/parse";

const ROOT = path.resolve(__dirname, "..");

describe("parser", () => {
  it("parses a class declaration", () => {
    const { program } = parseContractFiles([path.join(ROOT, "examples/counter/Counter.ts")]);
    expect(program.contracts).toHaveLength(1);
    const c = program.contracts[0]!;
    expect(c.name).toBe("Counter");
  });

  it("captures state vars with decorators", () => {
    const { program } = parseContractFiles([path.join(ROOT, "examples/counter/Counter.ts")]);
    const c = program.contracts[0]!;
    const count = c.stateVars.find((v) => v.name === "count")!;
    expect(count.type).toEqual({ kind: "primitive", name: "uint256" });
    expect(count.decorators.map((d) => d.name)).toContain("storage");
  });

  it("captures method decorators", () => {
    const { program } = parseContractFiles([path.join(ROOT, "examples/counter/Counter.ts")]);
    const c = program.contracts[0]!;
    const inc = c.functions.find((f) => f.name === "increment")!;
    expect(inc.decorators.map((d) => d.name)).toContain("onlyOwner");
  });

  it("captures inheritance and super-call args", () => {
    const { program } = parseContractFiles([path.join(ROOT, "examples/erc20-token/MyToken.ts")]);
    const c = program.contracts[0]!;
    expect(c.bases).toContain("ERC20");
    const ctor = c.functions.find((f) => f.isConstructor)!;
    expect(ctor.superCall?.baseName).toBe("ERC20");
    expect(ctor.superCall?.args).toHaveLength(2);
  });

  it("maps Map<Address, bigint> to a mapping IR type", () => {
    const { program } = parseContractFiles([path.join(ROOT, "examples/vault/Vault.ts")]);
    const c = program.contracts[0]!;
    const deposits = c.stateVars.find((v) => v.name === "deposits")!;
    expect(deposits.type).toEqual({
      kind: "mapping",
      key: { kind: "primitive", name: "address" },
      value: { kind: "primitive", name: "uint256" },
    });
  });

  it("initializes errors/events arrays on the contract IR", () => {
    const { program } = parseContractFiles([path.join(ROOT, "examples/counter/Counter.ts")]);
    const c = program.contracts[0]!;
    expect(Array.isArray(c.errors)).toBe(true);
    expect(Array.isArray(c.events)).toBe(true);
  });
});
