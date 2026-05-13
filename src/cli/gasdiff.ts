import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { parseContractFiles } from "../parser/parse";
import { emitProgram } from "../emitter/emit";
import { optimizeProgram } from "../optimizer/passes";
import { compileSolidity } from "../compiler/solc";
import { loadConfig } from "../config/load";
import { collectTsFiles } from "./parse";

export async function gasdiffCommand(input: string): Promise<void> {
  const files = collectTsFiles(input);
  if (files.length === 0) {
    console.error(`No .ts files found at ${input}`);
    process.exit(1);
  }
  const config = await loadConfig();
  const tmpDir = path.resolve("out/.gasdiff");
  const unoptDir = path.join(tmpDir, "unopt");
  const optDir = path.join(tmpDir, "opt");
  fs.mkdirSync(unoptDir, { recursive: true });
  fs.mkdirSync(optDir, { recursive: true });

  const { program } = parseContractFiles(files);
  const cloned = structuredClone(program);

  const unoptEmitted = emitProgram(cloned);
  for (const c of unoptEmitted) fs.writeFileSync(path.join(unoptDir, `${c.name}.sol`), c.solidity, "utf8");

  optimizeProgram(program);
  const optEmitted = emitProgram(program);
  for (const c of optEmitted) fs.writeFileSync(path.join(optDir, `${c.name}.sol`), c.solidity, "utf8");

  const unoptSols = unoptEmitted.map((c) => path.join(unoptDir, `${c.name}.sol`));
  const optSols = optEmitted.map((c) => path.join(optDir, `${c.name}.sol`));

  const unoptResult = compileSolidity({ solFiles: unoptSols, config });
  const optResult = compileSolidity({ solFiles: optSols, config });

  if (unoptResult.errors.length > 0 || optResult.errors.length > 0) {
    console.error(pc.red("compile errors prevent gasdiff"));
    for (const e of [...unoptResult.errors, ...optResult.errors]) console.error(e);
    process.exit(1);
  }

  console.log(pc.bold("contract            unopt(B)   opt(B)   Δ(B)    Δ(%)"));
  let totalUnopt = 0, totalOpt = 0;
  for (const a of optResult.artifacts) {
    const u = unoptResult.artifacts.find((x) => x.contractName === a.contractName);
    if (!u) continue;
    if (!program.contracts.some((c) => c.name === a.contractName)) continue;
    const unoptSz = bytesOf(u.deployedBytecode);
    const optSz = bytesOf(a.deployedBytecode);
    totalUnopt += unoptSz;
    totalOpt += optSz;
    const delta = optSz - unoptSz;
    const pct = unoptSz === 0 ? 0 : (delta / unoptSz) * 100;
    const sign = delta <= 0 ? pc.green : pc.red;
    console.log(
      `${a.contractName.padEnd(18)} ${pad(unoptSz, 8)} ${pad(optSz, 8)} ${sign(pad(delta, 7))} ${sign(pct.toFixed(2).padStart(7) + "%")}`,
    );
  }
  if (totalUnopt > 0) {
    const totalDelta = totalOpt - totalUnopt;
    const totalPct = (totalDelta / totalUnopt) * 100;
    console.log(pc.bold(`${"total".padEnd(18)} ${pad(totalUnopt, 8)} ${pad(totalOpt, 8)} ${pad(totalDelta, 7)} ${totalPct.toFixed(2).padStart(7)}%`));
  }
}

function bytesOf(hex: string): number {
  return Math.max(0, (hex.replace(/^0x/, "").length) / 2);
}
function pad(n: number, w: number): string {
  return String(n).padStart(w);
}
