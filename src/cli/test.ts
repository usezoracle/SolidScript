import path from "node:path";
import pc from "picocolors";
import { runForgeTests } from "../test-runner/forge-bridge";

export interface TestOptions {
  pattern?: string;
  tests?: string;
  contracts?: string;
  root?: string;
}

export async function testCommand(opts: TestOptions): Promise<void> {
  const tests = opts.tests ?? "tests/contracts";
  const contracts = opts.contracts ?? "examples";
  console.log(pc.bold(`running forge tests from ${tests} (contracts: ${contracts})`));
  const result = await runForgeTests({
    testsGlob: tests,
    contractsGlob: contracts,
    pattern: opts.pattern,
    root: opts.root,
  });
  process.exit(result.exitCode);
}
