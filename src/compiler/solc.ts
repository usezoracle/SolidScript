import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import type { Config } from "../config/schema";

export interface CompiledArtifact {
  contractName: string;
  abi: unknown[];
  bytecode: string;
  deployedBytecode: string;
}

export interface SMTCheckerFinding {
  severity: "warning" | "error";
  message: string;
  file?: string;
  line?: number;
}

export interface CompileResult {
  artifacts: CompiledArtifact[];
  errors: string[];
  warnings: string[];
  smtFindings: SMTCheckerFinding[];
  standardJsonInput: string;
}

export interface CompileInput {
  solFiles: string[];
  config: Config;
  modelCheck?: boolean;
}

export function compileSolidity({ solFiles, config, modelCheck = false }: CompileInput): CompileResult {
  const sources: Record<string, { content: string }> = {};
  for (const f of solFiles) {
    sources[path.basename(f)] = { content: fs.readFileSync(f, "utf8") };
  }

  const settings: any = {
    optimizer: {
      enabled: config.compiler.optimizer.enabled,
      runs: config.compiler.optimizer.runs,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
      },
    },
  };

  if (modelCheck) {
    settings.modelChecker = {
      engine: "chc",
      targets: ["assert", "underflow", "overflow", "divByZero", "balance", "popEmptyArray"],
      timeout: 15000,
      invariants: ["contract"],
      showUnproved: true,
      contracts: Object.fromEntries(Object.keys(sources).map((f) => [f, []])),
    };
  }

  const input = { language: "Solidity", sources, settings };
  const inputJson = JSON.stringify(input);

  const output = JSON.parse(
    solc.compile(inputJson, { import: importResolver }),
  );

  const errors: string[] = [];
  const warnings: string[] = [];
  const smtFindings: SMTCheckerFinding[] = [];
  if (output.errors) {
    for (const e of output.errors) {
      const msg = e.formattedMessage ?? e.message;
      if (e.errorCode && String(e.errorCode).startsWith("64")) {
        const loc = e.sourceLocation ?? {};
        smtFindings.push({
          severity: e.severity === "error" ? "error" : "warning",
          message: msg,
          file: loc.file,
          line: lineFromOffset(sources[loc.file]?.content, loc.start),
        });
      } else if (e.severity === "error") {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }
  }

  const artifacts: CompiledArtifact[] = [];
  if (output.contracts) {
    for (const file of Object.keys(output.contracts)) {
      for (const contractName of Object.keys(output.contracts[file])) {
        const c = output.contracts[file][contractName];
        if (!c.abi || !c.evm) continue;
        artifacts.push({
          contractName,
          abi: c.abi,
          bytecode: "0x" + c.evm.bytecode.object,
          deployedBytecode: "0x" + c.evm.deployedBytecode.object,
        });
      }
    }
  }

  return { artifacts, errors, warnings, smtFindings, standardJsonInput: inputJson };
}

function lineFromOffset(content: string | undefined, offset: number | undefined): number | undefined {
  if (!content || typeof offset !== "number") return undefined;
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}

function importResolver(importPath: string): { contents: string } | { error: string } {
  for (const c of resolveImportCandidates(importPath)) {
    if (fs.existsSync(c)) return { contents: fs.readFileSync(c, "utf8") };
  }
  return { error: `File not found: ${importPath}` };
}

export function resolveImportCandidates(importPath: string): string[] {
  const out = new Set<string>();
  out.add(path.join("node_modules", importPath));
  out.add(path.join(process.cwd(), "node_modules", importPath));
  try {
    const selfDir = path.dirname(new URL(import.meta.url).pathname);
    const upTwo = path.resolve(selfDir, "..", "..");
    const upThree = path.resolve(selfDir, "..", "..", "..");
    out.add(path.join(upTwo, "node_modules", importPath));
    out.add(path.join(upThree, "node_modules", importPath));
    out.add(path.join(upTwo, importPath));
    out.add(path.join(upThree, importPath));
  } catch { /* ignore */ }
  return Array.from(out);
}

export function resolveOZRoot(): string | null {
  for (const c of resolveImportCandidates("@openzeppelin/contracts/package.json")) {
    if (fs.existsSync(c)) return path.dirname(c);
  }
  return null;
}
