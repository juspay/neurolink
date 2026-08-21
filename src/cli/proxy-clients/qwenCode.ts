/**
 * Qwen Code client configurator.
 *
 * Qwen Code is OpenAI-compatible: its `cli.js` reads `OPENAI_BASE_URL` and
 * `OPENAI_API_KEY`, and its settings file carries the same pair under
 * `security.auth`. It therefore needs no new proxy route — it points at the
 * existing `/v1/chat/completions` door.
 *
 * Settings shape verified against a real `~/.qwen/settings.json` (`$version` 2)
 * from `@qwen-code/qwen-code@0.17.0`:
 *
 *   {
 *     "security": { "auth": {
 *       "selectedType": "openai", "apiKey": "...", "baseUrl": "https://..."
 *     } },
 *     "model": { "name": "..." },
 *     "$version": 2
 *   }
 */

import { homedir } from "os";
import { join } from "path";
import { logger } from "../../lib/utils/logger.js";
import type {
  CliProxyClientConfigurator,
  CliQwenSettings,
} from "../../lib/types/index.js";

/**
 * Resolved per call rather than at module load so `detect()` and `apply()`
 * agree when HOME changes — under test, and on the `--dev` isolation path.
 */
function getQwenConfigDir(): string {
  return join(homedir(), ".qwen");
}

function getQwenSettingsPath(): string {
  return join(getQwenConfigDir(), "settings.json");
}

/**
 * Key under which the user's pre-existing `security.auth` block is stashed,
 * inside the settings file itself. Persisting it there (rather than in memory)
 * means a restore still works after a crash, or from a different process —
 * the same approach the Claude and OpenCode writers take.
 */
const QWEN_ORIGINAL_KEY = "__proxy_original_qwen_auth";

function readQwenSettings(fs: typeof import("fs")): CliQwenSettings | null {
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(getQwenSettingsPath(), "utf8"),
    );
    return parsed !== null && typeof parsed === "object"
      ? (parsed as CliQwenSettings)
      : null;
  } catch {
    return null;
  }
}

export async function setQwenProxySettings(
  baseUrl: string,
  proxyKey?: string,
): Promise<boolean> {
  const fs = await import("fs");
  try {
    fs.accessSync(getQwenConfigDir());
  } catch {
    // Qwen Code not installed — report the skip so no caller prints a success
    // message for work that did not happen.
    return false;
  }

  const settings = readQwenSettings(fs) ?? {};
  const security = (settings.security ?? {}) as Record<string, unknown>;
  const auth = (security.auth ?? {}) as Record<string, unknown>;

  // Snapshot only on first touch. A second apply() must not overwrite the
  // snapshot with our own block, which would lose the user's real config on
  // the next restore.
  if (!(QWEN_ORIGINAL_KEY in settings)) {
    settings[QWEN_ORIGINAL_KEY] =
      "auth" in security ? JSON.parse(JSON.stringify(auth)) : null;
  }

  auth.selectedType = "openai";
  auth.baseUrl = baseUrl;
  auth.apiKey = proxyKey || "neurolink-proxy";
  security.auth = auth;
  settings.security = security;

  fs.writeFileSync(getQwenSettingsPath(), JSON.stringify(settings, null, 2));
  return true;
}

export async function clearQwenProxySettings(
  expectedBaseUrl?: string,
): Promise<boolean> {
  const fs = await import("fs");
  const settings = readQwenSettings(fs);
  if (!settings) {
    return false;
  }

  const security = settings.security as Record<string, unknown> | undefined;
  const auth = security?.auth as Record<string, unknown> | undefined;
  if (!security || !auth) {
    return false;
  }

  // The user may have pointed Qwen somewhere else since the proxy started.
  // Never clobber a base URL we did not write.
  if (
    expectedBaseUrl &&
    typeof auth.baseUrl === "string" &&
    auth.baseUrl !== expectedBaseUrl
  ) {
    return false;
  }

  if (!(QWEN_ORIGINAL_KEY in settings)) {
    // No snapshot means we cannot prove this block is ours. Leaving a stale
    // proxy URL behind is recoverable; destroying a real credential is not.
    logger.debug(
      "[proxy] Qwen clear: no original-auth snapshot found, leaving security.auth intact",
    );
    return false;
  }

  const snapshot = settings[QWEN_ORIGINAL_KEY];
  if (snapshot === null) {
    delete security.auth;
  } else {
    security.auth = snapshot;
  }
  delete settings[QWEN_ORIGINAL_KEY];
  settings.security = security;

  fs.writeFileSync(getQwenSettingsPath(), JSON.stringify(settings, null, 2));
  return true;
}

export const qwenCodeConfigurator: CliProxyClientConfigurator = {
  id: "qwen-code",
  displayName: "Qwen Code",
  detect: async () => {
    const fs = await import("fs");
    try {
      fs.accessSync(getQwenConfigDir());
      return true;
    } catch {
      return false;
    }
  },
  // Qwen speaks OpenAI Chat Completions, so it points at the /v1 door rather
  // than the proxy root.
  apply: (proxyBaseUrl) => setQwenProxySettings(`${proxyBaseUrl}/v1`),
  restore: (proxyBaseUrl) => clearQwenProxySettings(`${proxyBaseUrl}/v1`),
};

export const __qwenCodeTestHooks = {
  getQwenConfigDir,
  getQwenSettingsPath,
  setQwenProxySettings,
  clearQwenProxySettings,
};
