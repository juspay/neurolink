/**
 * Update State Persistence
 * Manages persistent state for the proxy auto-update feature.
 * Tracks check timestamps, suppressed versions, and update history.
 *
 * State file location: ~/.neurolink/update-state.json
 * Suppressed versions expire after 24 hours.
 */

import fs from "fs";
import os from "os";
import path from "path";
import type { UpdateState } from "../types/index.js";

// ============================================
// Constants
// ============================================

const STATE_FILENAME = "update-state.json";
const SUPPRESSION_TTL_MS = 86_400_000; // 24 hours

// ============================================
// Internal Helpers
// ============================================

/**
 * Resolve the path to the update state file.
 * Accepts an override for testing; defaults to ~/.neurolink/update-state.json.
 */
function resolveStatePath(overridePath?: string): string {
  if (overridePath) {
    return overridePath;
  }
  return path.join(os.homedir(), ".neurolink", STATE_FILENAME);
}

/**
 * Ensure the parent directory of the given file path exists.
 */
function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============================================
// Exported Functions
// ============================================

/**
 * Return an empty/initial UpdateState.
 */
export function getDefaultUpdateState(): UpdateState {
  return {
    lastCheckAt: new Date(0).toISOString(),
    lastCheckVersion: "",
    suppressedVersions: {},
    lastUpdateAt: null,
    lastUpdateVersion: null,
  };
}

/**
 * Load the update state from disk.
 * Returns null if the file does not exist.
 * Returns the default state if the file contains corrupt JSON.
 *
 * @param stateFilePath - Override path for testing (default: ~/.neurolink/update-state.json)
 */
export function loadUpdateState(stateFilePath?: string): UpdateState | null {
  const filePath = resolveStatePath(stateFilePath);
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content);
    // Minimal shape check — reject valid JSON that isn't an UpdateState
    // Note: typeof null === "object", so we check both
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.suppressedVersions !== "object" ||
      parsed.suppressedVersions === null ||
      Array.isArray(parsed.suppressedVersions) ||
      typeof parsed.lastCheckAt !== "string"
    ) {
      return getDefaultUpdateState();
    }
    return parsed as UpdateState;
  } catch {
    // Corrupt or unreadable JSON — return default state
    return getDefaultUpdateState();
  }
}

/**
 * Save the update state to disk.
 *
 * @param state - The UpdateState to persist
 * @param stateFilePath - Override path for testing (default: ~/.neurolink/update-state.json)
 */
export function saveUpdateState(
  state: UpdateState,
  stateFilePath?: string,
): void {
  const filePath = resolveStatePath(stateFilePath);
  ensureParentDir(filePath);
  // Atomic write: write to temp file then rename to prevent corruption on crash
  const tmpPath = filePath + ".tmp";
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
  fs.renameSync(tmpPath, filePath);
}

/**
 * Check whether a version is currently suppressed (i.e., suppressed AND within the 24-hour window).
 *
 * @param version - Semver version string to check
 * @param stateFilePath - Override path for testing
 */
export function isVersionSuppressed(
  version: string,
  stateFilePath?: string,
): boolean {
  const state = loadUpdateState(stateFilePath);
  if (!state) {
    return false;
  }
  const entry = state.suppressedVersions[version];
  if (!entry) {
    return false;
  }
  return Date.now() - Date.parse(entry.suppressedAt) < SUPPRESSION_TTL_MS;
}

/**
 * Add a version to the suppressed list and persist.
 *
 * @param version - Semver version string to suppress
 * @param reason - Human-readable reason for suppression
 * @param stateFilePath - Override path for testing
 */
export function suppressVersion(
  version: string,
  reason: string,
  stateFilePath?: string,
): void {
  const state = loadUpdateState(stateFilePath) ?? getDefaultUpdateState();
  state.suppressedVersions[version] = {
    suppressedAt: new Date().toISOString(),
    reason,
  };
  saveUpdateState(state, stateFilePath);
}

/**
 * Record a successful update: set lastUpdateAt and lastUpdateVersion, then persist.
 *
 * @param version - The version that was successfully installed
 * @param stateFilePath - Override path for testing
 */
export function recordSuccessfulUpdate(
  version: string,
  stateFilePath?: string,
): void {
  const state = loadUpdateState(stateFilePath) ?? getDefaultUpdateState();
  state.lastUpdateAt = new Date().toISOString();
  state.lastUpdateVersion = version;
  saveUpdateState(state, stateFilePath);
}

/**
 * Record an update check: set lastCheckAt and lastCheckVersion, then persist.
 *
 * @param latestVersion - The latest version found during the check
 * @param stateFilePath - Override path for testing
 */
export function recordCheck(
  latestVersion: string,
  stateFilePath?: string,
): void {
  const state = loadUpdateState(stateFilePath) ?? getDefaultUpdateState();
  state.lastCheckAt = new Date().toISOString();
  state.lastCheckVersion = latestVersion;
  saveUpdateState(state, stateFilePath);
}
