import { describe, it, expect } from "bun:test";
import path from "node:path";
import { parseContractFiles } from "../src/parser/parse";
import { validateProgram } from "../src/validator/rules";

const ROOT = path.resolve(__dirname, "..");

describe("validator", () => {
  it("clean ERC20 has no errors", () => {
    const { program } = parseContractFiles([path.join(ROOT, "examples/erc20-token/MyToken.ts")]);
    const diagnostics = validateProgram(program);
    const errors = diagnostics.filter((d) => d.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("clean Vault has no errors", () => {
    const { program } = parseContractFiles([path.join(ROOT, "examples/vault/Vault.ts")]);
    const diagnostics = validateProgram(program);
    const errors = diagnostics.filter((d) => d.severity === "error");
    expect(errors).toHaveLength(0);
  });
});
