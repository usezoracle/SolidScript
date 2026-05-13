import pc from "picocolors";
import { verifyCommand } from "./verify";
import { deployCommand } from "./deploy";

export interface SecureDeployOptions {
  network: string;
  args?: string[];
  artifacts?: string;
  contract: string;
  noFuzz?: boolean;
  noSmt?: boolean;
  noSlither?: boolean;
  noInvariants?: boolean;
  noPatterns?: boolean;
}

export async function secureDeployCommand(input: string, opts: SecureDeployOptions): Promise<void> {
  console.log(pc.bold("Stage 1/2 — verify (running all gates)"));
  const verify = await verifyCommand(input, opts);
  if (!verify.ok) {
    console.error(pc.red("\n✗ verification failed; refusing to deploy."));
    process.exit(1);
  }

  console.log("");
  console.log(pc.bold("Stage 2/2 — deploy"));
  await deployCommand(opts.contract, {
    network: opts.network,
    args: opts.args ?? [],
    artifacts: opts.artifacts,
  });
}
