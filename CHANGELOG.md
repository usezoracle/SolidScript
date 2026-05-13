# Changelog

All notable changes to SolidScript follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-05-13

### Changed
- `solidscript.config.example.ts` renamed to `solidscript.config.example.mjs` to match what `solidscript init` writes
- `package.json` metadata filled in (author, repository URL, homepage, bugs)
- Docs updated to reflect the 9-gate pipeline (Mythril added as Gate 4 in 0.2.0; stale 8-gate references corrected throughout)

### Removed
- Dev-internal `SECURITY_SYSTEM_REPORT.md` (content folded into `docs/details.md` §8)
- Stray `contracts/TrillionToken.ts` artifact at repo root
- Working dev `solidscript.config.ts` — the `.example.mjs` is the template users copy

### Added
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, this `CHANGELOG.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS`
- `LANDING.md` — structured marketing-page content for the website

### Fixed
- `tests/fixtures/RequireToError.ts` moved to `tests/contracts/` (consolidated test-contracts under a single folder); test import updated

## [0.2.0] - 2026-05-12

### Added
- **Mythril gate** as Gate 4 of the verify pipeline (symbolic execution, opt-in via `--deep`)
- **`solidscript doctor --fix`** — auto-fetches Foundry binaries to `~/.solidscript/bin/` and pulls Slither/Mythril Docker images, making the toolchain self-contained after one command
- **Tool resolver** (`src/runtime/tool-paths.ts`) — every spawn site goes through a unified resolver with native + Docker fallback
- **OpenZeppelin v5 bundled** as a regular dependency (was peer dep in 0.1.x; now `npm install solidscript` brings it automatically)
- **Library entry point** at `src/index.ts` — programmatic API (`parseContractFiles`, `emitProgram`, `validateProgram`, `optimizeProgram`, `compileSolidity`, plus all IR types)
- **Etherscan v2 multichain verification** — one API key works for Base, Optimism, Arbitrum, Polygon, ZkSync, Ethereum, every testnet
- **Browser-wallet deploy** (`--browser` flag, default when no `--wallet`) — local HTTP bridge at `localhost:7654`, signs via MetaMask/Rabby/Coinbase Wallet
- **User-level config** at `~/.solidscript/config.json` (mode 0600) — `solidscript config set etherscan-key …` subcommand
- **GitHub Actions CI** — test matrix (node 18/20/22) + pack-smoke + security gates; release workflow on `v*` tag
- **`docs/details.md`** (14-section guide), **`docs/openapi.yaml`** (browser-deploy HTTP surface), **`docs/cli-commands.yaml`** (auto-generated CLI manifest)

### Changed
- Build pipeline switched from `tsc` to Bun's bundler — produces a tighter dist
- CLI shebang `#!/usr/bin/env bun` → `#!/usr/bin/env node` so the published package works under any Node-based runtime
- `solidscript init` now writes `solidscript.config.mjs` instead of `.ts` (Node ESM can load `.mjs` directly without a TS runtime)
- `solidscript verify` consolidated `--no-fuzz`, `--no-smt`, etc. into a single `--skip <gates>` flag
- `solidscript deploy` smart defaults: auto-`--browser` when no `--wallet` given, auto-verify when `etherscan-key` configured

### Fixed
- `attestation.ts:readSolidscriptVersion()` now resolves SolidScript's own `package.json` via `import.meta.url` (was reading the user's project `package.json`)
- Custom-errors pass no longer produces double-negation (`if (!!emergencyMode)` → `if (emergencyMode)`)
- Unary operator emit wraps its operand in parens when needed (`!x >= y` → `!(x >= y)`)
- TS-only `Number(i)` / `BigInt(i)` casts stripped during parsing (don't leak into Solidity)
- `CheckedAddress` and `Bytes32` branded TS types alias to `address`/`bytes32` in generated Solidity
- `@invariant` decorator implies `view` mutability
- View-mutation rule no longer false-positives on local variable reassignment

## [0.1.0] - 2026-05-12

Initial public commit. TypeScript → Solidity transpiler with 8-gate security pipeline (gate 4 added in 0.2.0), forge bridge, examples, plugin API, attestation bundle, source maps, gasdiff, audit-pack, multi-chain deploy. See README and `docs/details.md` for the full feature surface.
