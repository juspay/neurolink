/**
 * CLI helper: parse --classifier-* flags into a ClassifierRouterConfig.
 *
 * Side-effect-free so it can be unit-tested without a running NeuroLink
 * instance. Mirrors the `--tool-routing-*` flag parser.
 */

import fs from "node:fs";
import type {
  CliClassifierRouterFlags,
  ClassifierRouterConfig,
  ClassifierRouterPoolMember,
  ClassifierStrategyKind,
} from "../../lib/types/index.js";
import { logger } from "../../lib/utils/logger.js";

// Trust model: --classifier-pool is a local, user-supplied CLI flag. The
// invoking user already holds the process's OS permissions, so absolute and
// home-dir config paths are fully supported — there is no cross-trust boundary
// to enforce (a local CLI reading a path its own operator passed is not a
// path-traversal vector). The caps below are a robustness guard against
// accidentally pointing at a huge file (e.g. a log or binary), not a security
// boundary.
const MAX_POOL_INPUT_BYTES = 1_000_000; // 1 MB
const MAX_POOL_ENTRIES = 1_000;

/**
 * Build a {@link ClassifierRouterConfig} from the parsed CLI flags.
 *
 * Returns `undefined` when `--classifier-router` is absent or false, so callers
 * can skip the setter entirely with a simple truthiness check.
 *
 * `--classifier-pool` is parsed permissively:
 * - If the value is an existing file path, the file is read and JSON-parsed.
 * - Otherwise the value is treated as an inline JSON string.
 * - On any parse error a warning is logged and the pool is left empty.
 */
export function buildClassifierRouterConfigFromCli(
  flags: CliClassifierRouterFlags & Record<string, unknown>,
): ClassifierRouterConfig | undefined {
  if (!flags.classifierRouter) {
    return undefined;
  }

  const strategy: ClassifierStrategyKind =
    flags.classifierStrategy === "llm" ? "llm" : "heuristic";

  const pool =
    typeof flags.classifierPool === "string" &&
    flags.classifierPool.trim() !== ""
      ? parsePoolFlag(flags.classifierPool)
      : [];

  if (pool.length === 0) {
    logger.warn(
      "[classifier-router] --classifier-router is enabled but --classifier-pool is empty/missing; model routing is a no-op until a pool is provided.",
    );
  }

  const config: ClassifierRouterConfig = {
    enabled: true,
    classifier: strategy,
    pool,
  };

  if (flags.classifierTimeout !== undefined) {
    const t = flags.classifierTimeout as number;
    if (Number.isFinite(t) && t > 0) {
      config.timeoutMs = t;
    } else {
      logger.warn(
        `[classifier-router] --classifier-timeout value ${String(t)} is not a positive finite number; ignoring (SDK default applies).`,
      );
    }
  }

  const hasProvider = typeof flags.classifierModelProvider === "string";
  const hasModel = typeof flags.classifierModelName === "string";
  const hasRegion = typeof flags.classifierModelRegion === "string";
  if (hasProvider || hasModel || hasRegion) {
    config.classifierModel = {
      ...(hasProvider && {
        provider: flags.classifierModelProvider as string,
      }),
      ...(hasModel && { model: flags.classifierModelName as string }),
      ...(hasRegion && { region: flags.classifierModelRegion as string }),
    };
  }

  return config;
}

/**
 * Parse the `--classifier-pool` value (file path first, then inline JSON).
 * Logs a warning and returns `[]` on any error (fail open).
 */
function parsePoolFlag(value: string): ClassifierRouterPoolMember[] {
  try {
    const resolved = fs.existsSync(value) ? value : null;

    if (resolved !== null) {
      const { size } = fs.statSync(resolved);
      if (size > MAX_POOL_INPUT_BYTES) {
        logger.warn(
          `[classifier-router] --classifier-pool file exceeds ${MAX_POOL_INPUT_BYTES} bytes (got ${size}); ignoring.`,
        );
        return [];
      }
    } else if (Buffer.byteLength(value, "utf8") > MAX_POOL_INPUT_BYTES) {
      logger.warn(
        `[classifier-router] --classifier-pool inline JSON exceeds ${MAX_POOL_INPUT_BYTES} bytes; ignoring.`,
      );
      return [];
    }

    const jsonText = resolved ? fs.readFileSync(resolved, "utf8") : value;
    const parsed: unknown = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      logger.warn(
        "[classifier-router] --classifier-pool must be a JSON array; ignoring.",
      );
      return [];
    }

    // Validate loosely — every member must at least name a provider.
    const valid = parsed.filter(
      (entry): entry is ClassifierRouterPoolMember =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).provider === "string",
    );

    if (valid.length !== parsed.length) {
      logger.warn(
        `[classifier-router] ${parsed.length - valid.length} pool member(s) skipped — each must have a string "provider" field.`,
      );
    }

    if (valid.length > MAX_POOL_ENTRIES) {
      logger.warn(
        `[classifier-router] --classifier-pool has ${valid.length} entries; truncating to ${MAX_POOL_ENTRIES}.`,
      );
      return valid.slice(0, MAX_POOL_ENTRIES);
    }

    return valid;
  } catch (err) {
    logger.warn(
      `[classifier-router] Failed to parse --classifier-pool: ${(err as Error).message}. Using empty pool (fail open).`,
    );
    return [];
  }
}
