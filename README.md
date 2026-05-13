# SolidScript

> **Write smart contracts in TypeScript. Ship audited Solidity.**

```ts
import { Address, onlyOwner, msg } from "solidscript";
import { ERC20 } from "solidscript/standards";

export class MyToken extends ERC20 {
  constructor(initialSupply: bigint) {
    super("MyToken", "MTK");
    this._mint(msg.sender, initialSupply);
  }

  @onlyOwner
  mint(to: Address, amount: bigint): void {
    this._mint(to, amount);
  }
}
```

→ deployed on Base Sepolia with source verified on BaseScan, in three commands.

## Install — one command, then one fix

```bash
npm install solidscript        # or bun add / yarn add / pnpm add
npx solidscript doctor --fix   # ONE-TIME: downloads forge/anvil + pulls slither/mythril Docker images
```

That's it. After `doctor --fix` you have a self-contained toolchain — solc, forge, anvil, slither, mythril all resolved automatically. No `brew`, no `pipx`, no `foundryup`.

### What's bundled vs auto-fetched

| Tool | Where it comes from |
|---|---|
| solc (JS) | bundled in the npm install — works immediately |
| @openzeppelin/contracts | bundled as a regular dependency |
| TypeScript parser, viem, etc | bundled |
| **forge + anvil** | auto-downloaded to `~/.solidscript/bin/` on first use (or by `doctor --fix`). Pulled from Foundry's official GitHub release for your platform. |
| **slither** | runs via Docker (`trailofbits/eth-security-toolbox`) if Docker is installed; falls back to native `slither` on PATH; fails with install hint otherwise |
| **mythril** | runs via Docker (`mythril/myth`) if Docker is installed; falls back to native `myth` on PATH |

If you don't have Docker, install it once (`brew install --cask docker`) — it removes the need to ever touch Python for Slither/Mythril.

## 60-second quickstart

```bash
mkdir my-token && cd my-token
npm init -y
npm install solidscript

npx solidscript doctor --fix                      # fetches forge/anvil, pulls Slither+Mythril Docker images
npx solidscript init                              # scaffold contracts/ + config

# write your contract in contracts/Counter.ts
npx solidscript build contracts                   # TS → Solidity
npx solidscript verify contracts --skip fuzz      # 8-gate security pipeline
npx solidscript compile out/sol                   # ABI + bytecode

# deploy via your browser wallet (no keys on disk)
npx solidscript deploy Counter -n base-sepolia
```

## What makes this different

- **8-gate security pipeline gates every deploy** — native validator (secure mode), solc, SMTChecker (Z3), Slither, pattern library, auto-generated fuzz harnesses, auto-derived invariant tests, reproducible-build attestation
- **Browser-wallet signing first-class** — no private keys on disk; MetaMask/Rabby/Coinbase Wallet handles the signature
- **Auto-verify on every Etherscan-family explorer** — Base, Optimism, Arbitrum, Polygon, Eth, every testnet — one API key via Etherscan v2 multichain
- **OpenZeppelin v5 + 13 optimizer passes built in** — custom errors auto-derived, `Ownable(msg.sender)` auto-injected, immutables auto-detected
- **Source maps from `.sol` back to `.ts`** — forge stack traces rewrite to your TypeScript line numbers via `solidscript trace`

## Documentation

- **[docs/details.md](./docs/details.md)** — full user guide (14 sections, written for non-Solidity devs)
- **[docs/cli-commands.yaml](./docs/cli-commands.yaml)** — every command and flag, machine-readable
- **[docs/openapi.yaml](./docs/openapi.yaml)** — OpenAPI 3.0 spec for the browser-deploy HTTP surface
- **[docs/api/](./docs/api/)** — TypeDoc reference for the library API (generated via `bun run docs:typedoc`)

## Commands at a glance

| Command | What it does |
|---|---|
| `solidscript doctor` | Check your environment (node, solc, slither, forge, OZ) |
| `solidscript init [dir]` | Scaffold a new project (contracts/, config, scripts) |
| `solidscript build <input>` | Transpile TS → Solidity (optimizer on by default) |
| `solidscript validate <input>` | Static checks (15 native rules) |
| `solidscript verify <input>` | Full 8-gate security pipeline |
| `solidscript compile <input>` | solc compile → ABI + bytecode |
| `solidscript deploy <Contract> -n <network>` | Deploy (browser wallet by default, auto-verifies on Etherscan if key configured) |
| `solidscript secure-deploy <input> -c <Contract> -n <network>` | Refuse to deploy unless 8 gates pass |
| `solidscript verify-source <Contract> -n <network>` | Submit source to Etherscan v2 multichain |
| `solidscript audit <input>` | Native rules + Slither |
| `solidscript audit-pack <input>` | Per-contract bundle for auditor handoff |
| `solidscript gasdiff <input>` | Bytecode size: unoptimized vs optimized |
| `solidscript test` | Forge tests + auto-generated fuzz |
| `solidscript trace` | Rewrite `.sol:line` → `.ts:line` in stack traces |

## Library API

```ts
import {
  parseContractFiles,
  emitProgram,
  validateProgram,
  optimizeProgram,
  compileSolidity,
} from "solidscript";

const { program } = parseContractFiles(["./contracts/MyToken.ts"]);
optimizeProgram(program);
const emitted = emitProgram(program);
console.log(emitted[0].solidity);
```

## License

MIT — see [LICENSE](./LICENSE).
