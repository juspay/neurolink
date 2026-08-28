/**
 * OpenCode client configurator.
 *
 * Moved verbatim out of `proxy.ts` so that adding a CLI means adding a file
 * here rather than editing a 5,000-line command module in seven places.
 *
 * Two defects made every config this writer produced unusable, and both are
 * fixed here. They are recorded because each was invisible to the tests that
 * were supposed to cover this file.
 *
 * 1. The snapshot lived in `opencode.json` itself, under two `__proxy_*` keys
 *    at the top level. OpenCode validates its config against a closed schema
 *    and rejects unknown top-level keys outright:
 *
 *      Error: Configuration is invalid at ~/.config/opencode/opencode.json
 *      ↳ Unrecognized keys: "__proxy_original_neurolink", "__proxy_written_neurolink"
 *
 *    Every `opencode` invocation failed at startup — not just proxied ones —
 *    so auto-configuration bricked the CLI it was meant to onboard. The
 *    snapshot now lives beside Codex's, in `~/.neurolink/`, which is what
 *    `codex.ts` has always done. Claude Code and Qwen embed a snapshot the
 *    same way and survive it only because their schemas ignore unknown keys;
 *    that is tolerance, not permission, and new writers should not rely on it.
 *
 * 2. `models` was written as `{}`. OpenCode resolves `--model provider/id`
 *    against that map and never calls `/v1/models`, so an empty map meant
 *    every id was unknown:
 *
 *      ProviderModelNotFoundError: providerID "neurolink", suggestions: []
 *
 *    Fixing only the keys exposed this one immediately underneath.
 *
 * Configs written by the previous version are repaired in place: both apply()
 * and restore() adopt a legacy in-file snapshot before deleting the keys, so
 * an existing broken config heals on the next `proxy start` without losing the
 * user's original provider block.
 */

import { createHash } from "crypto";
import { homedir } from "os";
import { join } from "path";
import { logger } from "../../lib/utils/logger.js";
import type {
  CliOpenCodeSnapshot,
  CliProxyClientConfigurator,
} from "../../lib/types/index.js";
import { DEFAULT_PROXY_MODEL_IDS } from "../../lib/constants/proxyModels.js";
import {
  cloneForSnapshot,
  isProxyOwnedValue,
  isUsableSnapshot,
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
 * Where the snapshot of the user's pre-existing `provider.neurolink` lives.
 *
 * Outside `opencode.json`, for the reason in the file header. Persisting it on
 * disk (rather than in process memory) means restoration still works when the
 * proxy crashes or shutdown runs in a different process — the property the
 * in-file version was reaching for.
 */
function getOpenCodeSnapshotPath(): string {
  // Scoped to the config directory, not just HOME. `getOpenCodeConfigPath()`
  // resolves through XDG_CONFIG_HOME, so two XDG roots under one HOME are two
  // independent OpenCode installs — and a single shared snapshot file made the
  // second apply() overwrite the first's saved original. Clearing the first
  // root then restored the second root's block onto it, or deleted a real
  // provider entry outright. Measured before this fix: root A came back
  // holding root B's block.
  const slug = createHash("sha256")
    .update(getOpenCodeConfigDir())
    .digest("hex")
    .slice(0, 12);
  return join(homedir(), ".neurolink", `opencode-proxy-snapshot-${slug}.json`);
}

/**
 * The unscoped path used before snapshots were scoped per config directory.
 *
 * Read-only, and only as a fallback: a real user has exactly one config dir, so
 * adopting their existing snapshot is correct. Writes always go to the scoped
 * path, so the ambiguity cannot be reintroduced.
 */
function getLegacyOpenCodeSnapshotPath(): string {
  return join(homedir(), ".neurolink", "opencode-proxy-snapshot.json");
}

/**
 * Top-level keys written by the pre-fix version of this writer. Present only
 * in configs it already corrupted; removed on sight.
 */
const LEGACY_ORIGINAL_KEY = "__proxy_original_neurolink";
const LEGACY_WRITTEN_KEY = "__proxy_written_neurolink";

/**
 * Remove the legacy in-file snapshot keys.
 *
 * @returns the legacy snapshot if one was found, so the caller can migrate it
 * to the external file rather than discard the user's original provider block.
 */
function takeLegacySnapshot(config: Record<string, unknown>): {
  /** True when a key was removed, so the caller knows to flush the config. */
  removed: boolean;
  /** Non-null only when the record is complete enough to restore from. */
  snapshot: CliOpenCodeSnapshot | null;
} {
  const hasOriginal = LEGACY_ORIGINAL_KEY in config;
  const removed = hasOriginal || LEGACY_WRITTEN_KEY in config;
  if (!removed) {
    return { removed: false, snapshot: null };
  }
  // Both keys go, always — leaving either behind keeps OpenCode unstartable.
  // But only a record that actually carries `original` may be restored from.
  // A file with just the written key proves the proxy wrote something; it does
  // NOT prove the user had no provider block, and treating it as `original:
  // null` made restore delete a real one.
  const snapshot: CliOpenCodeSnapshot | null = hasOriginal
    ? {
        original: config[LEGACY_ORIGINAL_KEY],
        written: config[LEGACY_WRITTEN_KEY],
      }
    : null;
  delete config[LEGACY_ORIGINAL_KEY];
  delete config[LEGACY_WRITTEN_KEY];
  logger.debug(
    "[proxy] OpenCode: migrated in-file snapshot keys out of opencode.json",
  );
  return { removed, snapshot };
}

async function readSnapshotFile(
  filePath: string,
): Promise<CliOpenCodeSnapshot | null> {
  const fs = await import("fs");
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
  // A snapshot missing `original` is malformed, not a record of "the user had
  // no provider block". Restore distinguishes those by deleting in the second
  // case, so returning `{}` here would destroy a real provider.neurolink.
  if (!isUsableSnapshot(parsed, "original")) {
    logger.debug(
      "[proxy] OpenCode: ignoring a malformed snapshot rather than treating it as empty",
    );
    return null;
  }
  return parsed as CliOpenCodeSnapshot;
}

/**
 * Resolve the snapshot for the ACTIVE config directory, most specific first.
 *
 * The unscoped file is shared by every XDG root on the machine, so it must
 * never outrank a record that belongs to this config in particular. Preferring
 * it let one root adopt another root's `original` and restore the wrong
 * provider block.
 */
async function resolveOpenCodeSnapshot(
  inFileLegacy: CliOpenCodeSnapshot | null,
): Promise<{
  snapshot: CliOpenCodeSnapshot | null;
  /** Which store supplied it — restore may only delete the one it consumed. */
  source: "scoped" | "in-file" | "unscoped" | null;
}> {
  // An in-file legacy record outranks everything, because its presence means
  // more than "here is a snapshot": the config still carries `__proxy_*` keys,
  // so the previous migration did not complete. That record is the only one
  // that predates the proxy, and on a migration run it is guaranteed to
  // disagree with a scoped snapshot — the old writer's block has `models: {}`
  // while the new writer's `written` carries the full map, so valuesMatch() is
  // always false and shouldCaptureSnapshot() re-captures. Re-capturing there
  // adopts the proxy's OWN block as the user's "original" and discards the
  // real one, silently and permanently.
  //
  // Reachable whenever apply() wrote the scoped snapshot and then failed to
  // write opencode.json: applyAllClients() catches per-client errors, so the
  // retry runs against a config still holding the legacy keys.
  if (inFileLegacy !== null) {
    return { snapshot: inFileLegacy, source: "in-file" };
  }
  const scoped = await readSnapshotFile(getOpenCodeSnapshotPath());
  if (scoped !== null) {
    return { snapshot: scoped, source: "scoped" };
  }
  const unscoped = await readSnapshotFile(getLegacyOpenCodeSnapshotPath());
  return unscoped === null
    ? { snapshot: null, source: null }
    : { snapshot: unscoped, source: "unscoped" };
}

async function writeOpenCodeSnapshot(snap: CliOpenCodeSnapshot): Promise<void> {
  const fs = await import("fs");
  fs.mkdirSync(join(homedir(), ".neurolink"), { recursive: true });
  // 0o600: the snapshot holds whatever the user's own provider block held,
  // which for a custom endpoint includes its API key.
  await writeFileAtomic(
    getOpenCodeSnapshotPath(),
    JSON.stringify(snap, null, 2),
    0o600,
  );
}

/**
 * The models map written into `provider.neurolink`.
 *
 * OpenCode needs every selectable id present here; see DEFAULT_PROXY_MODEL_IDS
 * for why an empty map is fatal rather than merely unhelpful.
 */
function buildModelsMap(): Record<string, { name: string }> {
  const models: Record<string, { name: string }> = {};
  for (const id of DEFAULT_PROXY_MODEL_IDS) {
    models[id] = { name: id };
  }
  return models;
}

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

  // Repair a config written by the pre-fix version before doing anything else.
  // The legacy snapshot is the only record of the user's original block, so it
  // is adopted rather than dropped when no external snapshot exists yet.
  const { snapshot: legacySnapshot } = takeLegacySnapshot(config);

  const provider = (config.provider ?? {}) as Record<string, unknown>;

  // Persist a snapshot of the user's pre-existing provider.neurolink. Repeat
  // apply() calls must not overwrite it with the proxy's own block — but a
  // block the user wrote while the proxy was gone must replace it. See
  // shouldCaptureSnapshot.
  const currentBlock = "neurolink" in provider ? provider.neurolink : undefined;
  let { snapshot } = await resolveOpenCodeSnapshot(legacySnapshot);
  if (
    shouldCaptureSnapshot({
      hasSnapshot: snapshot !== null,
      written: snapshot?.written,
      current: currentBlock,
    })
  ) {
    snapshot = {
      original:
        currentBlock === undefined ? null : cloneForSnapshot(currentBlock),
    };
  }

  const block = {
    id: "neurolink",
    name: "NeuroLink Proxy",
    npm: "@ai-sdk/openai-compatible",
    env: [],
    models: buildModelsMap(),
    options: {
      baseURL: baseUrl,
      apiKey: proxyKey || "neurolink-proxy",
    },
  };
  provider.neurolink = block;
  config.provider = provider;

  await writeOpenCodeSnapshot({
    original: snapshot?.original ?? null,
    written: cloneForSnapshot(block),
  });
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

  // Always strip legacy keys, even on a path that returns false below: leaving
  // them behind keeps OpenCode unusable, which is the whole defect.
  const { removed: legacyStripped, snapshot: legacySnapshot } =
    takeLegacySnapshot(config);
  const flushLegacy = async (): Promise<void> => {
    if (legacyStripped) {
      config.provider = config.provider ?? {};
      await writeFileAtomic(
        getOpenCodeConfigPath(),
        JSON.stringify(config, null, 2),
      );
    }
  };

  const provider = config.provider as Record<string, unknown> | undefined;
  if (!provider || !("neurolink" in provider)) {
    await flushLegacy();
    return false;
  }

  // Check if our proxy URL matches before removing
  const existing = provider.neurolink as Record<string, unknown> | undefined;
  if (expectedBaseUrl && existing) {
    const options = existing.options as Record<string, unknown> | undefined;
    if (options && typeof options.baseURL === "string") {
      if (options.baseURL !== expectedBaseUrl) {
        // User configured a different URL; do not clobber
        await flushLegacy();
        return false;
      }
    }
  }

  const hadNeurolink = "neurolink" in provider;

  // Restore from the snapshot persisted at first set(), regardless of process
  // identity. Only delete provider.neurolink when the snapshot says the user
  // explicitly had no entry before — never on a missing snapshot, since that
  // would mean the snapshot was lost and we cannot prove the entry is ours.
  const { snapshot, source: snapshotSource } =
    await resolveOpenCodeSnapshot(legacySnapshot);
  if (snapshot !== null) {
    // Only restore what we can prove is ours. The base-URL check above lets
    // through a block still pointing at the proxy that the user has edited
    // beside the URL; reverting that discards a deliberate change.
    if (
      isProxyOwnedValue({
        written: snapshot.written,
        current: existing,
      })
    ) {
      if (snapshot.original === null || snapshot.original === undefined) {
        // User had no provider.neurolink before the proxy started — safe to remove.
        delete provider.neurolink;
      } else {
        provider.neurolink = snapshot.original;
      }
    } else {
      logger.debug(
        "[proxy] OpenCode clear: provider.neurolink was edited after the proxy wrote it, leaving it intact",
      );
    }
    // Deletion is deferred until after the config write below. Removing the
    // recovery data first means a failed write leaves opencode.json still
    // pointing at the proxy with nothing left to restore from — the one
    // ordering that turns a recoverable error into permanent loss.
  } else {
    // No snapshot present — refuse to delete to avoid destroying a config
    // the proxy may not own (e.g. a user wrote their own `neurolink` block
    // before the snapshot existed, or this is being cleared from a process
    // that never ran set()).
    logger.debug(
      "[proxy] OpenCode clear: no original-provider snapshot found, leaving provider.neurolink intact",
    );
    await flushLegacy();
    return false;
  }

  config.provider = provider;
  await writeFileAtomic(
    getOpenCodeConfigPath(),
    JSON.stringify(config, null, 2),
  );

  // Only now, and only the store we actually consumed. The unscoped file is
  // shared by every XDG root on this machine: deleting it because *this* root
  // restored from its own scoped snapshot would take away another root's only
  // record of its original provider block.
  try {
    if (snapshotSource === "scoped") {
      fs.rmSync(getOpenCodeSnapshotPath(), { force: true });
    } else if (snapshotSource === "unscoped") {
      fs.rmSync(getLegacyOpenCodeSnapshotPath(), { force: true });
    }
    // "in-file" needs no deletion: takeLegacySnapshot already removed the keys
    // and the config write above persisted their absence.
  } catch {
    // A snapshot we cannot delete is harmless: the next apply() overwrites it.
  }
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
  getOpenCodeSnapshotPath,
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
