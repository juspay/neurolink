/**
 * The Silero VAD model file: the pinned revision, where it lives and the
 * first-use download. The same rules as Whistle's assets, for one file
 * instead of three: an explicit directory, then `NEUROLINK_VAD_DIR`, then
 * `NEUROLINK_MODEL_DIR/silero-vad`, then the copy shipped with the package
 * (`models/silero-vad`), then `~/.neurolink/models/silero-vad`, the only
 * directory a download ever writes to.
 *
 * Upstream: `snakers4/silero-vad`, MIT.
 *
 * @module voice/vad/assets
 */

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type { LocalModelAsset, STTVadOptions } from "../../types/index.js";
import { STT_ERROR_CODES } from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { STTError } from "../errors.js";
import {
  checkModelFile,
  downloadModelAsset,
  packageModelsDir,
} from "../modelAssets.js";

const SILERO_VAD_REVISION = "bfdc0193023f121ea5b3cc7b176dbed570a68a59";

/** The pinned model: Silero VAD v6.2, 2.3 MB, 8 and 16 kHz. */
export const SILERO_VAD_ASSET: LocalModelAsset = {
  name: "silero_vad.onnx",
  url: `https://raw.githubusercontent.com/snakers4/silero-vad/${SILERO_VAD_REVISION}/src/silero_vad/data/silero_vad.onnx`,
  sha256: "1a153a22f4509e292a94e67d6f9b85e8deb25b4988682b7e174c65279d8788e3",
  bytes: 2_327_524,
};

/** One in-flight preparation per directory, shared by concurrent callers. */
const inFlight = new Map<string, Promise<string>>();
/** Directories already verified in this process. */
const verified = new Map<string, string>();

/**
 * Where the model lives: `options.modelDir` → `NEUROLINK_VAD_DIR` →
 * `NEUROLINK_MODEL_DIR/silero-vad` → the copy shipped with the package →
 * `~/.neurolink/models/silero-vad`.
 */
export function resolveVadDir(options?: STTVadOptions): string {
  const explicit =
    options?.modelDir?.trim() || process.env.NEUROLINK_VAD_DIR?.trim();
  if (explicit) {
    return resolve(explicit);
  }
  const modelRoot = process.env.NEUROLINK_MODEL_DIR?.trim();
  if (modelRoot) {
    return resolve(modelRoot, "silero-vad");
  }
  const root = packageModelsDir();
  if (root) {
    const bundled = join(root, "silero-vad");
    if (vadModelPresent(bundled)) {
      return bundled;
    }
  }
  return join(homedir(), ".neurolink", "models", "silero-vad");
}

/**
 * Whether a missing model may be fetched: on unless `options.autoDownload`
 * is `false` or `NEUROLINK_VAD_AUTO_DOWNLOAD` is `0` / `false` / `off` / `no`.
 */
export function vadAutoDownloadEnabled(options?: STTVadOptions): boolean {
  if (options?.autoDownload !== undefined) {
    return options.autoDownload;
  }
  const env = process.env.NEUROLINK_VAD_AUTO_DOWNLOAD?.trim().toLowerCase();
  return !(env === "0" || env === "false" || env === "off" || env === "no");
}

/** Cheap presence check (no hashing). */
export function vadModelPresent(dir: string): boolean {
  return existsSync(join(dir, SILERO_VAD_ASSET.name));
}

/**
 * Makes sure the model is in `dir` and matches its pinned hash, downloading
 * it when missing and allowed. Resolves to the model's path. Concurrent
 * calls for the same directory share one preparation.
 */
export function ensureVadModel(
  dir: string,
  autoDownload: boolean,
): Promise<string> {
  const done = verified.get(dir);
  if (done) {
    return Promise.resolve(done);
  }
  const pending = inFlight.get(dir);
  if (pending) {
    return pending;
  }
  const job = prepare(dir, autoDownload)
    .then((path) => {
      verified.set(dir, path);
      return path;
    })
    .finally(() => {
      inFlight.delete(dir);
    });
  inFlight.set(dir, job);
  return job;
}

async function prepare(dir: string, autoDownload: boolean): Promise<string> {
  const path = join(dir, SILERO_VAD_ASSET.name);
  const state = await checkModelFile(path, SILERO_VAD_ASSET);
  if (state !== "ok") {
    if (!autoDownload) {
      throw modelUnavailable(
        dir,
        state === "corrupt"
          ? `${SILERO_VAD_ASSET.name} in ${dir} does not match its pinned SHA-256, and automatic download is off`
          : "automatic download is off (NEUROLINK_VAD_AUTO_DOWNLOAD=0 or autoDownload: false)",
      );
    }
    logger.info(
      `[silero-vad] downloading the Silero VAD model (${Math.max(1, Math.round(SILERO_VAD_ASSET.bytes / 1_000_000))} MB) to ${dir} — first use only`,
    );
    try {
      await mkdir(dir, { recursive: true });
      await downloadModelAsset(SILERO_VAD_ASSET, dir, "silero-vad");
    } catch (error) {
      if (error instanceof STTError) {
        throw error;
      }
      throw modelUnavailable(
        dir,
        `the download failed (${error instanceof Error ? error.message : String(error)})`,
        error instanceof Error ? error : undefined,
      );
    }
  }
  return path;
}

/** The "here is exactly what to put where" body of every "unusable" message. */
export function describeVadModel(dir: string, reason: string): string {
  return (
    `The Silero speech detector needs its model file, and ${reason}.\n` +
    `Place it here:\n  ${join(dir, SILERO_VAD_ASSET.name)}  ←  ${SILERO_VAD_ASSET.url}\n` +
    "Or point NEUROLINK_VAD_DIR (or streaming.vad.modelDir) at a directory that has it " +
    "(a full install of @juspay/neurolink ships a copy in its models/silero-vad directory), " +
    'or set streaming.vad.engine (NEUROLINK_STT_VAD) to "energy" to stream without it.'
  );
}

function modelUnavailable(
  dir: string,
  reason: string,
  originalError?: Error,
): STTError {
  return new STTError({
    code: STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
    message: describeVadModel(dir, reason),
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.HIGH,
    retriable: false,
    context: {
      provider: "silero-vad",
      modelDir: dir,
      files: [{ name: SILERO_VAD_ASSET.name, url: SILERO_VAD_ASSET.url }],
    },
    originalError,
  });
}
