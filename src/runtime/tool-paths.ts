/**
 * Tool resolver — turns `npm install solidscript` into a self-contained
 * toolchain. Native binaries (forge, anvil) auto-download to ~/.solidscript/bin/
 * on first use. Python tools (slither, mythril) fall back to Docker if
 * Docker is installed.
 *
 * Order of resolution for any tool:
 *   1. ~/.solidscript/bin/<tool>       (auto-downloaded native)
 *   2. system PATH                     (user-installed)
 *   3. docker fallback                 (if image is pullable)
 *   4. clear error with install hint
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import https from "node:https";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { extract as tarExtract } from "node:zlib";

const BIN_DIR = path.join(os.homedir(), ".solidscript", "bin");

export interface ToolResolution {
  /** absolute path to a runnable binary, OR a docker invocation prefix */
  cmd: string;
  /** args to prepend (for docker runs); usually empty for native */
  argPrefix: string[];
  /** "native" | "system-path" | "docker" */
  via: "native" | "system-path" | "docker";
  /** human-readable for logging */
  description: string;
}

const PLATFORM = detectPlatform();

type Platform = "darwin-arm64" | "darwin-x64" | "linux-x64" | "linux-arm64";

function detectPlatform(): Platform | null {
  const a = process.arch;
  if (process.platform === "darwin" && a === "arm64") return "darwin-arm64";
  if (process.platform === "darwin" && a === "x64") return "darwin-x64";
  if (process.platform === "linux" && a === "x64") return "linux-x64";
  if (process.platform === "linux" && a === "arm64") return "linux-arm64";
  return null;
}

interface FoundryAsset {
  url: string;
  binaries: string[];
}

const FOUNDRY_VERSION = "stable";

function foundryAsset(plat: Platform): FoundryAsset {
  const tag: Record<Platform, string> = {
    "darwin-arm64": "darwin_arm64",
    "darwin-x64": "darwin_amd64",
    "linux-x64": "linux_amd64",
    "linux-arm64": "linux_arm64",
  };
  return {
    url: `https://github.com/foundry-rs/foundry/releases/download/${FOUNDRY_VERSION}/foundry_${FOUNDRY_VERSION}_${tag[plat]}.tar.gz`,
    binaries: ["forge", "anvil", "cast", "chisel"],
  };
}

function ensureBinDir(): void {
  fs.mkdirSync(BIN_DIR, { recursive: true, mode: 0o755 });
}

function cachedBin(name: string): string | null {
  const p = path.join(BIN_DIR, name);
  if (fs.existsSync(p)) return p;
  return null;
}

function whichOnPath(name: string): string | null {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [name], { encoding: "utf8" });
  if (r.status === 0) {
    const out = (r.stdout || "").split("\n")[0]?.trim();
    if (out && fs.existsSync(out)) return out;
  }
  return null;
}

function dockerInstalled(): boolean {
  const r = spawnSync("docker", ["--version"], { encoding: "utf8" });
  return r.status === 0;
}

function dockerImagePresent(image: string): boolean {
  const r = spawnSync("docker", ["image", "inspect", image], { encoding: "utf8" });
  return r.status === 0;
}

async function downloadAndExtractFoundry(): Promise<void> {
  if (!PLATFORM) throw new Error(`unsupported platform: ${process.platform}/${process.arch}`);
  ensureBinDir();
  const asset = foundryAsset(PLATFORM);
  const tgzPath = path.join(BIN_DIR, "foundry.tar.gz");

  process.stderr.write(`[solidscript] downloading foundry for ${PLATFORM} from ${asset.url}\n`);
  await downloadFile(asset.url, tgzPath);

  process.stderr.write(`[solidscript] extracting…\n`);
  const r = spawnSync("tar", ["-xzf", tgzPath, "-C", BIN_DIR], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("tar extract failed");
  fs.unlinkSync(tgzPath);

  for (const bin of asset.binaries) {
    const p = path.join(BIN_DIR, bin);
    if (fs.existsSync(p)) fs.chmodSync(p, 0o755);
  }
  process.stderr.write(`[solidscript] installed: ${asset.binaries.filter((b) => fs.existsSync(path.join(BIN_DIR, b))).join(", ")}\n`);
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const handle = (u: string) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          handle(res.headers.location as string);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      }).on("error", (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    };
    handle(url);
  });
}

export async function resolveTool(name: "forge" | "anvil" | "cast" | "chisel" | "slither" | "myth"): Promise<ToolResolution> {
  if (name === "forge" || name === "anvil" || name === "cast" || name === "chisel") {
    const cached = cachedBin(name);
    if (cached) return { cmd: cached, argPrefix: [], via: "native", description: `~/.solidscript/bin/${name}` };
    const onPath = whichOnPath(name);
    if (onPath) return { cmd: onPath, argPrefix: [], via: "system-path", description: onPath };
    await downloadAndExtractFoundry();
    const after = cachedBin(name);
    if (after) return { cmd: after, argPrefix: [], via: "native", description: `~/.solidscript/bin/${name}` };
    throw new Error(`failed to install ${name} from Foundry release`);
  }

  if (name === "slither") {
    const onPath = whichOnPath("slither");
    if (onPath) return { cmd: onPath, argPrefix: [], via: "system-path", description: onPath };
    if (dockerInstalled()) {
      const image = "trailofbits/eth-security-toolbox";
      if (!dockerImagePresent(image)) {
        process.stderr.write(`[solidscript] pulling ${image} (one-time)…\n`);
        const pull = spawnSync("docker", ["pull", image], { stdio: "inherit" });
        if (pull.status !== 0) throw new Error(`docker pull ${image} failed`);
      }
      return {
        cmd: "docker",
        argPrefix: ["run", "--rm", "-v", `${process.cwd()}:/work`, "-w", "/work", "--entrypoint", "slither", image],
        via: "docker",
        description: `docker:${image}`,
      };
    }
    throw new Error("slither not available: install via `brew install slither-analyzer` or install Docker so we can run trailofbits/eth-security-toolbox");
  }

  if (name === "myth") {
    const onPath = whichOnPath("myth");
    if (onPath) return { cmd: onPath, argPrefix: [], via: "system-path", description: onPath };
    if (dockerInstalled()) {
      const image = "mythril/myth";
      if (!dockerImagePresent(image)) {
        process.stderr.write(`[solidscript] pulling ${image} (one-time)…\n`);
        const pull = spawnSync("docker", ["pull", image], { stdio: "inherit" });
        if (pull.status !== 0) throw new Error(`docker pull ${image} failed`);
      }
      return {
        cmd: "docker",
        argPrefix: ["run", "--rm", "-v", `${process.cwd()}:/work`, "-w", "/work", image],
        via: "docker",
        description: `docker:${image}`,
      };
    }
    throw new Error("mythril not available: install via `pipx install mythril` or install Docker so we can run mythril/myth");
  }

  throw new Error(`unknown tool: ${name}`);
}

export function toolStatus(name: "forge" | "anvil" | "slither" | "myth"): { ok: boolean; via?: string; hint?: string } {
  if (name === "forge" || name === "anvil") {
    const cached = cachedBin(name);
    if (cached) return { ok: true, via: `~/.solidscript/bin/${name}` };
    const onPath = whichOnPath(name);
    if (onPath) return { ok: true, via: onPath };
    return { ok: false, hint: `auto-downloaded on first use, or run \`solidscript doctor --fix\`` };
  }
  if (name === "slither" || name === "myth") {
    const tool = name === "slither" ? "slither" : "myth";
    const onPath = whichOnPath(tool);
    if (onPath) return { ok: true, via: onPath };
    if (dockerInstalled()) {
      const image = name === "slither" ? "trailofbits/eth-security-toolbox" : "mythril/myth";
      if (dockerImagePresent(image)) return { ok: true, via: `docker:${image}` };
      return { ok: false, hint: `Docker present; run \`solidscript doctor --fix\` to pull ${image}` };
    }
    return { ok: false, hint: `install Docker (recommended) OR \`${name === "slither" ? "brew install slither-analyzer" : "pipx install mythril"}\`` };
  }
  return { ok: false };
}

export async function prefetchAll(): Promise<{ ok: string[]; failed: Array<{ tool: string; error: string }> }> {
  const ok: string[] = [];
  const failed: Array<{ tool: string; error: string }> = [];
  for (const tool of ["forge", "anvil", "slither", "myth"] as const) {
    try {
      const r = await resolveTool(tool);
      ok.push(`${tool} (${r.via}: ${r.description})`);
    } catch (e: any) {
      failed.push({ tool, error: e.message ?? String(e) });
    }
  }
  return { ok, failed };
}
