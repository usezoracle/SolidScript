import { defineChain } from "viem";
import { sepolia, mainnet, base, baseSepolia } from "viem/chains";

export const anvil = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

export const CHAINS = {
  anvil,
  sepolia,
  mainnet,
  base,
  "base-sepolia": baseSepolia,
};

export type KnownNetwork = keyof typeof CHAINS;

export function resolveChain(name: string) {
  const c = (CHAINS as Record<string, unknown>)[name];
  if (!c) throw new Error(`Unknown network "${name}". Known: ${Object.keys(CHAINS).join(", ")}`);
  return c;
}
