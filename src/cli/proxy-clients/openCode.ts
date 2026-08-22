/**
 * OpenCode client configurator.
 *
 * Moved verbatim out of `proxy.ts` so that adding a CLI means adding a file
 * here rather than editing a 5,000-line command module in seven places.
 */

import { homedir } from "os";
import { join } from "path";
import { logger } from "../../lib/utils/logger.js";
import type { CliProxyClientConfigurator } from "../../lib/types/index.js";
import {
  cloneForSnapshot,
  isProxyOwnedValue,
  shouldCaptureSnapshot,
  writeFileAtomic,
} from "./snapshot.js";

function getOpenCodeConfigDir(): string {
  // OpenCode resolves this with the unmodified `xdg-basedir` package —
  // `XDG_CONFIG_HOME || ~/.config` — on every platform, macOS included. There
  // is deliberately no darwin branch here: `~/Library/Application Support/
  // opencode` is not a path OpenCode reads. (The similar-looking literal in
  // OpenCode's binary is `systemManagedConfigDir()`, an MDM policy directory
  // at the filesystem root with no $HOME prefix.)
  return join(
    process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
    "opencode",
  );
}

function getOpenCodeConfigPath(): string {
  return join(getOpenCodeConfigDir(), "opencode.json");
}

/**
 * Key under which we persist the snapshot of the user's pre-existing
 * `provider.neurolink` config inside `opencode.json` itself. Persisting (rather
 * than relying on in-process state) means restoration still works even if the
 * proxy crashes or shutdown handlers run in a different process.
 *
 * Mirrors the Claude pattern (`__proxy_original_env` inside Claude's settings).
 */
const OPENCODE_ORIGINAL_KEY = "__proxy_original_neurolink";

/**
 * What this writer last wrote into provider.neurolink. Lets apply() tell its
 * own block from one the user substituted while the proxy was not running.
 */
const OPENCODE_WRITTEN_KEY = "__proxy_written_neurolink";

export async function setOpenCodeProxySettings(
  baseUrl: string,
  proxyKey?: string,
): Promise<boolean> {
  const fs = await import("fs");

  const configDir = getOpenCodeConfigDir();
  try {
    fs.accessSync(configDir);
  } catch {
    // OpenCode not installed — config directory does not exist. Report the
    // skip so the caller does not print a success message for work that did
    // not happen.
    return false;
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(fs.readFileSync(getOpenCodeConfigPath(), "utf8"));
  } catch {
    // file missing/invalid — create fresh config object
    config = { provider: {} };
  }

  const provider = (config.provider ?? {}) as Record<string, unknown>;

  // Persist a snapshot of the user's pre-existing provider.neurolink. Repeat
  // apply() calls must not overwrite it with the proxy's own block — but a
  // block the user wrote while the proxy was gone must replace it. See
  // shouldCaptureSnapshot.
  const currentBlock = "neurolink" in provider ? provider.neurolink : undefined;
  if (
    shouldCaptureSnapshot({
      hasSnapshot: OPENCODE_ORIGINAL_KEY in config,
      written: config[OPENCODE_WRITTEN_KEY],
      current: currentBlock,
    })
  ) {
    config[OPENCODE_ORIGINAL_KEY] =
      currentBlock === undefined ? null : cloneForSnapshot(currentBlock);
  }

  const block = {
    id: "neurolink",
    name: "NeuroLink Proxy",
    npm: "@ai-sdk/openai-compatible",
    env: [],
    models: {},
    options: {
      baseURL: baseUrl,
      apiKey: proxyKey || "neurolink-proxy",
    },
  };
  provider.neurolink = block;
  config[OPENCODE_WRITTEN_KEY] = cloneForSnapshot(block);

  config.provider = provider;
  await writeFileAtomic(
    getOpenCodeConfigPath(),
    JSON.stringify(config, null, 2),
  );
  return true;
}

export async function clearOpenCodeProxySettings(
  expectedBaseUrl?: string,
): Promise<boolean> {
  const fs = await import("fs");
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(fs.readFileSync(getOpenCodeConfigPath(), "utf8"));
  } catch {
    return false;
  }

  const provider = config.provider as Record<string, unknown> | undefined;
  if (!provider || !("neurolink" in provider)) {
    return false;
  }

  // Check if our proxy URL matches before removing
  const existing = provider.neurolink as Record<string, unknown> | undefined;
  if (expectedBaseUrl && existing) {
    const options = existing.options as Record<string, unknown> | undefined;
    if (options && typeof options.baseURL === "string") {
      if (options.baseURL !== expectedBaseUrl) {
        // User configured a different URL; do not clobber
        return false;
      }
    }
  }

  const hadNeurolink = "neurolink" in provider;

  // Restore from the snapshot persisted at first set(), regardless of process
  // identity. Only delete provider.neurolink when the snapshot says the user
  // explicitly had no entry before — never on an "undefined" snapshot, since
  // that would mean the snapshot was lost and we cannot prove the entry is ours.
  if (OPENCODE_ORIGINAL_KEY in config) {
    // Only restore what we can prove is ours. The base-URL check above lets
    // through a block still pointing at the proxy that the user has edited
    // beside the URL; reverting that discards a deliberate change.
    if (
      isProxyOwnedValue({
        written: config[OPENCODE_WRITTEN_KEY],
        current: existing,
      })
    ) {
      const snapshot = (config as Record<string, unknown>)[
        OPENCODE_ORIGINAL_KEY
      ];
      if (snapshot === null) {
        // User had no provider.neurolink before the proxy started — safe to remove.
        delete provider.neurolink;
      } else {
        provider.neurolink = snapshot;
      }
    } else {
      logger.debug(
        "[proxy] OpenCode clear: provider.neurolink was edited after the proxy wrote it, leaving it intact",
      );
    }
    delete (config as Record<string, unknown>)[OPENCODE_ORIGINAL_KEY];
    delete (config as Record<string, unknown>)[OPENCODE_WRITTEN_KEY];
  } else {
    // No snapshot present — refuse to delete to avoid destroying a config
    // the proxy may not own (e.g. a user wrote their own `neurolink` block
    // before the snapshot key was introduced, or this is being cleared from
    // a process that never ran set()).
    logger.debug(
      "[proxy] OpenCode clear: no original-provider snapshot found, leaving provider.neurolink intact",
    );
    return false;
  }

  config.provider = provider;
  await writeFileAtomic(
    getOpenCodeConfigPath(),
    JSON.stringify(config, null, 2),
  );
  return hadNeurolink;
}

/**
 * Test-only export (CLAUDE.md rule 15 determinism exception). The OpenCode
 * client writers resolve paths from the environment and are only reachable
 * from `proxy start` / `proxy setup`, neither of which can be driven against a
 * throwaway HOME without starting a real server. Consumed by
 * test/continuous-test-suite-proxy.ts.
 */
export const __openCodeTestHooks = {
  getOpenCodeConfigDir,
  getOpenCodeConfigPath,
  setOpenCodeProxySettings,
  clearOpenCodeProxySettings,
};

export const openCodeConfigurator: CliProxyClientConfigurator = {
  id: "opencode",
  displayName: "OpenCode",
  detect: async () => {
    const fs = await import("fs");
    try {
      fs.accessSync(getOpenCodeConfigDir());
      return true;
    } catch {
      return false;
    }
  },
  // OpenCode speaks OpenAI Chat Completions, so it points at the /v1 door
  // rather than the proxy root. The suffix belongs to the client, not the
  // caller — every call site used to have to remember it.
  apply: (proxyBaseUrl) => setOpenCodeProxySettings(`${proxyBaseUrl}/v1`),
  restore: (proxyBaseUrl) => clearOpenCodeProxySettings(`${proxyBaseUrl}/v1`),
};
