/**
 * Claude Code client configurator.
 *
 * Moved verbatim out of `proxy.ts`, with one behaviour change: `detect()` is
 * new. This was the only writer that created its config file for a CLI that
 * may never have been installed.
 */

import { homedir } from "os";
import { join } from "path";
import { logger } from "../../lib/utils/logger.js";
import type { CliProxyClientConfigurator } from "../../lib/types/index.js";

/**
 * Resolved per call rather than at module load so `detect()` and `apply()`
 * agree when HOME changes — under test, and on the `--dev` isolation path.
 */
function getClaudeSettingsDir(): string {
  return join(homedir(), ".claude");
}

function getClaudeSettingsPath(): string {
  return join(getClaudeSettingsDir(), "settings.json");
}

/** Keys we manage in Claude Code's settings.env */
const PROXY_MANAGED_KEYS = ["ANTHROPIC_BASE_URL", "ENABLE_TOOL_SEARCH"];

export async function setClaudeProxySettings(baseUrl: string): Promise<void> {
  const fs = await import("fs");
  let settings: Record<string, unknown> = {};
  try {
    settings = JSON.parse(fs.readFileSync(getClaudeSettingsPath(), "utf8"));
  } catch {
    // file missing/invalid — create fresh settings object
  }

  const env = (settings.env ?? {}) as Record<string, string>;

  // Preserve original values so clearClaudeProxySettings can restore them.
  // Only snapshot once — subsequent calls should not overwrite the snapshot.
  const originals = ((settings as Record<string, unknown>)
    .__proxy_original_env ?? {}) as Record<string, string | null>;
  for (const key of PROXY_MANAGED_KEYS) {
    if (!(key in originals)) {
      originals[key] = key in env ? env[key] : null;
    }
  }
  (settings as Record<string, unknown>).__proxy_original_env = originals;

  env.ANTHROPIC_BASE_URL = baseUrl;
  env.ENABLE_TOOL_SEARCH = "true";
  settings.env = env;

  fs.writeFileSync(getClaudeSettingsPath(), JSON.stringify(settings, null, 2));
}

export async function clearClaudeProxySettings(
  expectedBaseUrl?: string,
): Promise<boolean> {
  const fs = await import("fs");
  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(fs.readFileSync(getClaudeSettingsPath(), "utf8"));
  } catch {
    return false;
  }

  const env = settings.env as Record<string, string> | undefined;
  if (!env) {
    return false;
  }

  if (
    expectedBaseUrl &&
    typeof env.ANTHROPIC_BASE_URL === "string" &&
    env.ANTHROPIC_BASE_URL !== expectedBaseUrl
  ) {
    // User switched to a different proxy URL; do not clobber.
    return false;
  }

  if (!("__proxy_original_env" in settings)) {
    // No snapshot means we cannot prove these keys are ours. Without this
    // guard the loop below reads every managed key as "did not exist before"
    // and deletes it — wiping a real user value. Leaving a stale proxy URL
    // behind is recoverable; destroying the user's own setting is not.
    // OpenCode and Qwen refuse for the same reason.
    logger.debug(
      "[proxy] Claude clear: no original-env snapshot found, leaving settings.env intact",
    );
    return false;
  }

  const hadBaseUrl = typeof env.ANTHROPIC_BASE_URL === "string";
  const hadToolSearch = env.ENABLE_TOOL_SEARCH === "true";

  // Restore original values if they were saved, otherwise delete the keys
  const originals = ((settings as Record<string, unknown>)
    .__proxy_original_env ?? {}) as Record<string, string | null>;
  for (const key of PROXY_MANAGED_KEYS) {
    const original = originals[key];
    if (original !== undefined && original !== null) {
      // Restore the value that existed before the proxy was started
      env[key] = original;
    } else {
      // Key did not exist before — remove it
      delete env[key];
    }
  }
  delete (settings as Record<string, unknown>).__proxy_original_env;

  if (Object.keys(env).length === 0) {
    delete settings.env;
  } else {
    settings.env = env;
  }

  fs.writeFileSync(getClaudeSettingsPath(), JSON.stringify(settings, null, 2));
  return hadBaseUrl || hadToolSearch;
}

export const claudeCodeConfigurator: CliProxyClientConfigurator = {
  id: "claude-code",
  displayName: "Claude Code",
  // New: previously this writer created ~/.claude/settings.json even when
  // Claude Code had never been installed. The other two writers already
  // probed; this one did not.
  detect: async () => {
    const fs = await import("fs");
    try {
      fs.accessSync(getClaudeSettingsDir());
      return true;
    } catch {
      return false;
    }
  },
  apply: async (proxyBaseUrl) => {
    await setClaudeProxySettings(proxyBaseUrl);
    return true;
  },
  restore: (proxyBaseUrl) => clearClaudeProxySettings(proxyBaseUrl),
};

export const __claudeCodeTestHooks = {
  getClaudeSettingsDir,
  getClaudeSettingsPath,
  setClaudeProxySettings,
  clearClaudeProxySettings,
};
