import type { Config } from "./src/config/schema";

const config: Config = {
  compiler: {
    version: "0.8.20",
    optimizer: { enabled: true, runs: 200 },
  },
  networks: {
    anvil: {
      rpcUrl: "http://127.0.0.1:8545",
      chainId: 31337,
      privateKeyEnv: "ANVIL_PRIVATE_KEY",
    },
    sepolia: {
      rpcUrl: "https://rpc.sepolia.org",
      chainId: 11155111,
      privateKeyEnv: "SEPOLIA_PRIVATE_KEY",
    },
  },
  outDir: "out",
};

export default config;
