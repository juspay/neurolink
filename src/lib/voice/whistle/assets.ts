/**
 * Whistle assets: the pinned manifest, where the files live, and the
 * first-use download.
 *
 * Three files make up the engine — the Cactus "needle" runtime (an Emscripten
 * build: `needle.js` + `needle.wasm`) and the Whistle speech model
 * (`whistle.cact`). They are fetched from pinned Hugging Face revisions on
 * first use, verified against a SHA-256, and written atomically (temp file +
 * rename), so an interrupted download never leaves a file that looks complete.
 *
 * Both upstream repositories are Apache-2.0.
 *
 * @module voice/whistle/assets
 */

import { createHash, randomBytes } from "node:crypto";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  STTCredentials,
  WhistleAsset,
  WhistleAssetPaths,
} from "../../types/index.js";
import { STT_ERROR_CODES } from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { STTError } from "../errors.js";
import { proxyAwareFetch } from "../../proxy/proxyFetch.js";

const NEEDLE_REVISION = "2ae11323dc000f5e70c49f7403efa6af12ba9e67";
const WHISTLE_REVISION = "b358ddadd89b7a713b5aa131f23032d3cca1b251";

/** Pinned files, in the order they are fetched. */
export const WHISTLE_ASSETS: readonly WhistleAsset[] = [
  {
    name: "needle.js",
    url: `https://huggingface.co/Cactus-Compute/needle3/resolve/${NEEDLE_REVISION}/wasm/needle.js`,
    sha256: "964681b2a5ec3c4db2f06e45a5b60c8981a7d4ab4cac16ef6bf5b1988657a5f1",
    bytes: 63_072,
  },
  {
    name: "needle.wasm",
    url: `https://huggingface.co/Cactus-Compute/needle3/resolve/${NEEDLE_REVISION}/wasm/needle.wasm`,
    sha256: "c43f48e11f302087250d1e406024956781cd2f02595a5e343b3d7ddd5ef707fa",
    bytes: 923_348,
  },
  {
    name: "whistle.cact",
    url: `https://huggingface.co/Cactus-Compute/whistle/resolve/${WHISTLE_REVISION}/whistle.cact`,
    sha256: "b6e02f048568ac5d01a2042556c658061e699acbc0aa2a1439f52f3d461dffeb",
    bytes: 16_919_407,
  },
];

/** Per-file download deadline; generous because the model is 17 MB. */
const DOWNLOAD_TIMEOUT_MS = 10 * 60_000;

/** One in-flight preparation per directory, shared by concurrent callers. */
const inFlight = new Map<string, Promise<WhistleAssetPaths>>();
/** Directories already verified in this process. */
const verified = new Map<string, WhistleAssetPaths>();

/**
 * Where Whistle keeps its files: `slice.modelDir` → `NEUROLINK_WHISTLE_DIR` →
 * `NEUROLINK_MODEL_DIR/whistle` → the copy shipped with the package
 * (`models/whistle`, when all three files are there) →
 * `~/.neurolink/models/whistle`, the only one a download ever writes to.
 */
export function resolveWhistleDir(slice?: STTCredentials["whistle"]): string {
  const explicit =
    slice?.modelDir?.trim() || process.env.NEUROLINK_WHISTLE_DIR?.trim();
  if (explicit) {
    return resolve(explicit);
  }
  const modelRoot = process.env.NEUROLINK_MODEL_DIR?.trim();
  if (modelRoot) {
    return resolve(modelRoot, "whistle");
  }
  const bundled = bundledWhistleDir();
  if (bundled && whistleAssetsPresent(bundled)) {
    return bundled;
  }
  return join(homedir(), ".neurolink", "models", "whistle");
}

let bundledDir: string | null | undefined;

/**
 * The package's own `models/whistle`, found by walking up from this module
 * to the directory holding NeuroLink's `package.json`. Works from the source
 * tree, from `dist/` and from the single-file bundles, since all of them sit
 * below the package root; `null` when nothing above looks like the package.
 */
export function bundledWhistleDir(): string | null {
  if (bundledDir !== undefined) {
    return bundledDir;
  }
  bundledDir = null;
  let dir: string;
  try {
    dir = dirname(fileURLToPath(import.meta.url));
  } catch {
    return bundledDir;
  }
  for (let depth = 0; depth < 8; depth += 1) {
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        const parsed = JSON.parse(readFileSync(manifest, "utf8")) as {
          name?: unknown;
        };
        if (parsed.name === "@juspay/neurolink") {
          bundledDir = join(dir, "models", "whistle");
          return bundledDir;
        }
      } catch {
        // Not a manifest we can read; keep walking up.
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return bundledDir;
}

/**
 * Whether missing files may be fetched: on unless `slice.autoDownload` is
 * `false` or `NEUROLINK_WHISTLE_AUTO_DOWNLOAD` is `0` / `false` / `off` / `no`.
 */
export function whistleAutoDownloadEnabled(
  slice?: STTCredentials["whistle"],
): boolean {
  if (slice?.autoDownload !== undefined) {
    return slice.autoDownload;
  }
  const env = process.env.NEUROLINK_WHISTLE_AUTO_DOWNLOAD?.trim().toLowerCase();
  return !(env === "0" || env === "false" || env === "off" || env === "no");
}

/** Cheap presence check (no hashing): all three files exist in `dir`. */
export function whistleAssetsPresent(dir: string): boolean {
  return WHISTLE_ASSETS.every((asset) => existsSync(join(dir, asset.name)));
}

/**
 * Make sure all three files are in `dir` and match their pinned hashes,
 * downloading what is missing when allowed. Concurrent calls for the same
 * directory share one preparation.
 */
export function ensureWhistleAssets(
  dir: string,
  autoDownload: boolean,
): Promise<WhistleAssetPaths> {
  const done = verified.get(dir);
  if (done) {
    return Promise.resolve(done);
  }
  const pending = inFlight.get(dir);
  if (pending) {
    return pending;
  }
  const job = prepare(dir, autoDownload)
    .then((paths) => {
      verified.set(dir, paths);
      return paths;
    })
    .finally(() => {
      inFlight.delete(dir);
    });
  inFlight.set(dir, job);
  return job;
}

async function prepare(
  dir: string,
  autoDownload: boolean,
): Promise<WhistleAssetPaths> {
  const missing: WhistleAsset[] = [];
  const corrupt: WhistleAsset[] = [];
  for (const asset of WHISTLE_ASSETS) {
    const state = await checkFile(join(dir, asset.name), asset);
    if (state === "missing") {
      missing.push(asset);
    } else if (state === "corrupt") {
      corrupt.push(asset);
    }
  }
  const needed = [...missing, ...corrupt];
  if (needed.length > 0) {
    if (!autoDownload) {
      throw assetsUnavailable(
        dir,
        corrupt.length > 0
          ? `${corrupt.map((a) => a.name).join(", ")} in ${dir} does not match its pinned SHA-256, and automatic download is off`
          : "automatic download is off (NEUROLINK_WHISTLE_AUTO_DOWNLOAD=0 or autoDownload: false)",
      );
    }
    const total = needed.reduce((sum, a) => sum + a.bytes, 0);
    logger.info(
      `[whistle] downloading Whistle (${Math.max(1, Math.round(total / 1_000_000))} MB) to ${dir} — first use only`,
    );
    try {
      await mkdir(dir, { recursive: true });
      for (const asset of needed) {
        await download(asset, dir);
      }
    } catch (error) {
      if (error instanceof STTError) {
        throw error;
      }
      throw assetsUnavailable(
        dir,
        `the download failed (${error instanceof Error ? error.message : String(error)})`,
        error instanceof Error ? error : undefined,
      );
    }
  }
  return {
    "needle.js": join(dir, "needle.js"),
    "needle.wasm": join(dir, "needle.wasm"),
    "whistle.cact": join(dir, "whistle.cact"),
  };
}

async function checkFile(
  path: string,
  asset: WhistleAsset,
): Promise<"ok" | "missing" | "corrupt"> {
  try {
    const info = await stat(path);
    if (!info.isFile()) {
      return "missing";
    }
    if (info.size !== asset.bytes) {
      return "corrupt";
    }
  } catch {
    return "missing";
  }
  return (await hashFile(path)) === asset.sha256 ? "ok" : "corrupt";
}

function hashFile(path: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolvePromise(hash.digest("hex")));
  });
}

async function download(asset: WhistleAsset, dir: string): Promise<void> {
  const response = await proxyAwareFetch(asset.url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`${asset.name}: HTTP ${response.status}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  const digest = createHash("sha256").update(body).digest("hex");
  if (digest !== asset.sha256) {
    throw new Error(
      `${asset.name}: SHA-256 mismatch (expected ${asset.sha256}, got ${digest})`,
    );
  }
  const target = join(dir, asset.name);
  const temp = join(
    dir,
    `.${asset.name}.${process.pid}.${randomBytes(4).toString("hex")}.part`,
  );
  try {
    await writeFile(temp, body);
    await rename(temp, target);
  } catch (error) {
    await rm(temp, { force: true }).catch(() => undefined);
    throw error;
  }
  logger.debug(`[whistle] ${asset.name} verified and saved to ${target}`);
}

/** The friendly "here is exactly what to put where" error. */
/** The three files, where they go and where they come from — the body of every "unusable" message. */
export function describeWhistleAssets(dir: string, reason: string): string {
  const width = Math.max(...WHISTLE_ASSETS.map((a) => a.name.length));
  const lines = WHISTLE_ASSETS.map(
    (a) => `  ${join(dir, a.name).padEnd(dir.length + 1 + width)}  ←  ${a.url}`,
  );
  return (
    `Whistle (the built-in local speech-to-text engine) needs three files, and ${reason}.\n` +
    `Place them here:\n${lines.join("\n")}\n` +
    "Or point NEUROLINK_WHISTLE_DIR (or credentials.stt.whistle.modelDir) at a directory that has them " +
    "(a full install of @juspay/neurolink ships a copy in its models/whistle directory), " +
    "or configure a cloud STT provider."
  );
}

function assetsUnavailable(
  dir: string,
  reason: string,
  originalError?: Error,
): STTError {
  return new STTError({
    code: STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
    message: describeWhistleAssets(dir, reason),
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.HIGH,
    retriable: false,
    context: {
      provider: "whistle",
      modelDir: dir,
      files: WHISTLE_ASSETS.map((a) => ({ name: a.name, url: a.url })),
    },
    originalError,
  });
}
