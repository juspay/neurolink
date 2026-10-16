/**
 * Shared plumbing for the model files NeuroLink ships or fetches on first
 * use (Whistle's runtime and model, the Silero VAD model): where the
 * package's own `models/` directory is, whether a file on disk is the pinned
 * one, and a verified atomic download. Each model keeps its own manifest and
 * directory rules; this module only ever looks at one file at a time.
 *
 * @module voice/modelAssets
 */

import { createHash, randomBytes } from "node:crypto";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LocalModelAsset } from "../types/index.js";
import { logger } from "../utils/logger.js";

/** Per-file download deadline; generous because Whistle's model is 17 MB. */
export const MODEL_DOWNLOAD_TIMEOUT_MS = 10 * 60_000;

let modelsDir: string | null | undefined;

/**
 * The package's own `models` directory, found by walking up from this module
 * to the directory holding NeuroLink's `package.json`. Works from the source
 * tree, from `dist/` and from the single-file bundles, since all of them sit
 * below the package root; `null` when nothing above looks like the package.
 */
export function packageModelsDir(): string | null {
  if (modelsDir !== undefined) {
    return modelsDir;
  }
  modelsDir = null;
  let dir: string;
  try {
    dir = dirname(fileURLToPath(import.meta.url));
  } catch {
    return modelsDir;
  }
  for (let depth = 0; depth < 8; depth += 1) {
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        const parsed = JSON.parse(readFileSync(manifest, "utf8")) as {
          name?: unknown;
        };
        if (parsed.name === "@juspay/neurolink") {
          modelsDir = join(dir, "models");
          return modelsDir;
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
  return modelsDir;
}

/** Whether the file at `path` is `asset`: size first (cheap), then the SHA-256. */
export async function checkModelFile(
  path: string,
  asset: LocalModelAsset,
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
  return (await hashModelFile(path)) === asset.sha256 ? "ok" : "corrupt";
}

export function hashModelFile(path: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolvePromise(hash.digest("hex")));
  });
}

/**
 * Fetches `asset` into `dir`, verifying the SHA-256 before anything is
 * written and writing atomically (temp file + rename), so an interrupted
 * download never leaves a file that looks complete. `label` prefixes the log.
 */
export async function downloadModelAsset(
  asset: LocalModelAsset,
  dir: string,
  label: string,
): Promise<void> {
  const response = await fetch(asset.url, {
    signal: AbortSignal.timeout(MODEL_DOWNLOAD_TIMEOUT_MS),
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
  logger.debug(`[${label}] ${asset.name} verified and saved to ${target}`);
}
