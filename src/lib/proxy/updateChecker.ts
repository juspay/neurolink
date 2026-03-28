/**
 * Proxy auto-update version checker.
 *
 * Queries the npm registry for the latest published version of
 * `@juspay/neurolink` and compares it against the currently running version.
 * Designed to be non-blocking and failure-tolerant — any error (network,
 * timeout, parse) silently returns `updateAvailable: false`.
 */

import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "../utils/logger.js";

const execFile = promisify(execFileCb);

/** Timeout (ms) for the `npm view` child process. */
const NPM_VIEW_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Semver helpers (no external dependency)
// ---------------------------------------------------------------------------

interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse a version string of the form `major.minor.patch` into numeric
 * components. Returns `null` when the string does not match.
 */
function parseSemVer(version: string): SemVer | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/**
 * Returns `true` when `latest` is strictly greater than `current`.
 *
 * Both arguments must be valid semver strings; returns `false` on any
 * parse failure so the caller never sees a spurious "update available".
 */
function isNewerVersion(current: string, latest: string): boolean {
  const cur = parseSemVer(current);
  const lat = parseSemVer(latest);
  if (!cur || !lat) {
    return false;
  }

  if (lat.major !== cur.major) {
    return lat.major > cur.major;
  }
  if (lat.minor !== cur.minor) {
    return lat.minor > cur.minor;
  }
  return lat.patch > cur.patch;
}

// ---------------------------------------------------------------------------
// Core check
// ---------------------------------------------------------------------------

/**
 * Query npm for the latest version of `@juspay/neurolink` and compare it
 * against {@link currentVersion}.
 *
 * On **any** failure the function resolves (never rejects) with
 * `{ updateAvailable: false, latestVersion: currentVersion }`.
 */
export async function checkForUpdate(
  currentVersion: string,
): Promise<UpdateCheckResult> {
  const fail: UpdateCheckResult = {
    currentVersion,
    latestVersion: currentVersion,
    updateAvailable: false,
  };

  try {
    logger.debug("[UpdateChecker] Checking for updates", { currentVersion });

    const { stdout } = await execFile(
      "npm",
      ["view", "@juspay/neurolink", "version", "--json"],
      { timeout: NPM_VIEW_TIMEOUT_MS },
    );

    // `npm view ... --json` wraps the value in double-quotes, e.g. `"9.32.0"`
    const parsed: unknown = JSON.parse(stdout);

    if (typeof parsed !== "string") {
      logger.warn("[UpdateChecker] Unexpected npm output type", {
        type: typeof parsed,
      });
      return fail;
    }

    const latestVersion = parsed.trim();

    if (!parseSemVer(latestVersion)) {
      logger.warn("[UpdateChecker] Failed to parse latest version", {
        latestVersion,
      });
      return fail;
    }

    const updateAvailable = isNewerVersion(currentVersion, latestVersion);

    logger.debug("[UpdateChecker] Version check complete", {
      currentVersion,
      latestVersion,
      updateAvailable,
    });

    return { currentVersion, latestVersion, updateAvailable };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("[UpdateChecker] Update check failed", { error: message });
    return fail;
  }
}
