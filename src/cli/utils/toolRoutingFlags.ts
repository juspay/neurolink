/**
 * CLI helper: parse --tool-routing-* flags into a ToolRoutingConfig.
 *
 * This module is intentionally side-effect-free so it can be unit-tested
 * without a running NeuroLink instance.
 */

import fs from "node:fs";
import type {
  CliToolRoutingFlags,
  ToolRoutingConfig,
} from "../../lib/types/index.js";
import { logger } from "../../lib/utils/logger.js";

/**
 * Build a {@link ToolRoutingConfig} from the parsed CLI flags.
 *
 * Returns `undefined` when `--tool-routing` is absent or false, so callers
 * can skip the setter entirely with a simple truthiness check — behaviour is
 * identical to routing being disabled.
 *
 * `--tool-routing-servers` is parsed permissively:
 * - If the value looks like an existing file path, the file is read and JSON-parsed.
 * - Otherwise the value is treated as an inline JSON string.
 * - On any parse error a warning is logged and `servers` is omitted (fail open).
 */
export function buildToolRoutingConfigFromCli(
  flags: CliToolRoutingFlags & Record<string, unknown>,
): ToolRoutingConfig | undefined {
  if (!flags.toolRouting) {
    return undefined;
  }

  const config: ToolRoutingConfig = { enabled: true };

  if (flags.toolRoutingTimeout !== undefined) {
    const t = flags.toolRoutingTimeout as number;
    if (Number.isFinite(t) && t > 0) {
      config.timeoutMs = t;
    } else {
      logger.warn(
        `[tool-routing] --tool-routing-timeout value ${String(t)} is not a positive finite number; ignoring (SDK default applies).`,
      );
    }
  }

  const hasRouterProvider = typeof flags.toolRoutingRouterProvider === "string";
  const hasRouterModel = typeof flags.toolRoutingRouterModel === "string";
  const hasRouterRegion = typeof flags.toolRoutingRouterRegion === "string";

  if (hasRouterProvider || hasRouterModel || hasRouterRegion) {
    config.routerModel = {
      ...(hasRouterProvider && {
        provider: flags.toolRoutingRouterProvider as string,
      }),
      ...(hasRouterModel && {
        model: flags.toolRoutingRouterModel as string,
      }),
      ...(hasRouterRegion && {
        region: flags.toolRoutingRouterRegion as string,
      }),
    };
  }

  if (
    Array.isArray(flags.toolRoutingAlwaysInclude) &&
    flags.toolRoutingAlwaysInclude.length > 0
  ) {
    config.alwaysIncludeServerIds = flags.toolRoutingAlwaysInclude as string[];
  }

  if (
    typeof flags.toolRoutingServers === "string" &&
    flags.toolRoutingServers.trim() !== ""
  ) {
    config.servers = parseServersFlag(flags.toolRoutingServers);
  }

  return config;
}

// Trust model: --tool-routing-servers is a local, user-supplied CLI flag.
// The invoking user already holds the process's OS permissions, so absolute
// and home-dir config paths are fully supported — there is no cross-trust-
// boundary to enforce.  The caps below are a robustness guard against
// accidentally pointing at a huge file (e.g. a log or binary) that would
// silently OOM the process or stall the CLI, not a security boundary.
const MAX_SERVERS_INPUT_BYTES = 1_000_000; // 1 MB
const MAX_SERVERS_ENTRIES = 1_000;

/**
 * Parse the `--tool-routing-servers` value.
 *
 * Tries file-path first (if the string exists on disk), then inline JSON.
 * Logs a warning and returns `undefined` on any error (fail open).
 */
function parseServersFlag(value: string): ToolRoutingConfig["servers"] {
  try {
    // File-path branch: resolve relative to cwd, check existence.
    const resolved = fs.existsSync(value) ? value : null;

    if (resolved !== null) {
      const { size } = fs.statSync(resolved);
      if (size > MAX_SERVERS_INPUT_BYTES) {
        logger.warn(
          `[tool-routing] --tool-routing-servers file exceeds ${MAX_SERVERS_INPUT_BYTES} bytes (got ${size}); ignoring to avoid excessive memory use.`,
        );
        return undefined;
      }
    } else if (Buffer.byteLength(value, "utf8") > MAX_SERVERS_INPUT_BYTES) {
      logger.warn(
        `[tool-routing] --tool-routing-servers inline JSON exceeds ${MAX_SERVERS_INPUT_BYTES} bytes; ignoring to avoid excessive memory use.`,
      );
      return undefined;
    }

    const jsonText = resolved ? fs.readFileSync(resolved, "utf8") : value;
    const parsed: unknown = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      logger.warn(
        "[tool-routing] --tool-routing-servers must be a JSON array; ignoring.",
      );
      return undefined;
    }

    // Validate shape loosely — only keep entries with id + description strings.
    const valid = parsed.filter(
      (entry): entry is { id: string; description: string } =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).id === "string" &&
        typeof (entry as Record<string, unknown>).description === "string",
    );

    if (valid.length !== parsed.length) {
      logger.warn(
        `[tool-routing] ${parsed.length - valid.length} server descriptor(s) skipped — each must have string "id" and "description" fields.`,
      );
    }

    if (valid.length > MAX_SERVERS_ENTRIES) {
      logger.warn(
        `[tool-routing] --tool-routing-servers contains ${valid.length} entries; truncating to ${MAX_SERVERS_ENTRIES} to prevent pathological inputs.`,
      );
      return valid.slice(0, MAX_SERVERS_ENTRIES);
    }

    return valid.length > 0 ? valid : undefined;
  } catch (err) {
    logger.warn(
      `[tool-routing] Failed to parse --tool-routing-servers: ${(err as Error).message}. Omitting servers (fail open).`,
    );
    return undefined;
  }
}
