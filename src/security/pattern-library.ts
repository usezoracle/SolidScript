import crypto from "node:crypto";
import type { IRContract } from "../ir/types";
import { resolveContract } from "../mapper/decorators";

const KNOWN_SAFE_BASES = new Set([
  "ERC20",
  "ERC721",
  "Ownable",
  "ReentrancyGuard",
  "Pausable",
  "AccessControl",
]);

const KNOWN_SAFE_IMPORTS = [
  "@openzeppelin/contracts/",
  "forge-std/",
];

export interface PatternCheckResult {
  contract: string;
  ok: boolean;
  findings: string[];
}

export function checkPatterns(contract: IRContract): PatternCheckResult {
  const findings: string[] = [];
  const resolution = resolveContract(contract);

  for (const base of resolution.inheritedContracts) {
    if (!KNOWN_SAFE_BASES.has(base)) {
      findings.push(`inherits unknown base "${base}" — not in pattern library`);
    }
  }

  for (const imp of resolution.imports) {
    if (!KNOWN_SAFE_IMPORTS.some((p) => imp.startsWith(p))) {
      findings.push(`imports "${imp}" — not in pattern library`);
    }
  }

  return {
    contract: contract.name,
    ok: findings.length === 0,
    findings,
  };
}

export function hashBytecode(hex: string): string {
  const clean = hex.replace(/^0x/, "");
  return crypto.createHash("sha256").update(Buffer.from(clean, "hex")).digest("hex");
}
