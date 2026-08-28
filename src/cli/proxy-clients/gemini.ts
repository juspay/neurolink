/**
 * Gemini CLI client configurator.
 *
 * Gemini CLI was reachable through the proxy long before this file existed —
 * `GOOGLE_GEMINI_BASE_URL` pointed at the proxy's `/v1beta` door works — but
 * nothing wrote it, so every user had to know that and export it by hand. The
 * proxy already serves the door (`geminiProxyRoutes`, `POST
 * /v1beta/models/{model}:generateContent`); this only closes the onboarding
 * gap.
 *
 * **Why a file and not an env script.** Copilot is configured through
 * `~/.neurolink/copilot-env.sh`, which the user must source from their shell
 * profile. On the machine this was developed against, nothing sourced it: the
 * writer reported success, `applyAllClients` counted it applied, and Copilot
 * had never once used the proxy. A file the CLI reads on its own has no such
 * silent-failure mode. Gemini CLI loads `~/.gemini/.env` (its own error text
 * says "set it in your environment or ~/.gemini/.env"), so that is what this
 * writes.
 *
 * The snapshot lives in `~/.neurolink/`, following `codex.ts`, never inside
 * the file being managed — see `openCode.ts` for what that cost.
 */

import { homedir } from "os";
import { join } from "path";
import { logger } from "../../lib/utils/logger.js";
import type {
  CliGeminiSnapshot,
  CliProxyClientConfigurator,
} from "../../lib/types/index.js";
import { isUsableSnapshot, writeFileAtomic } from "./snapshot.js";

/** Gemini CLI's config directory. Fixed; it has no XDG override. */
function getGeminiConfigDir(): string {
  return join(homedir(), ".gemini");
}

function getGeminiEnvPath(): string {
  return join(getGeminiConfigDir(), ".env");
}

function getGeminiSnapshotPath(): string {
  return join(homedir(), ".neurolink", "gemini-proxy-snapshot.json");
}

/** The two variables this writer owns. Every other line is the user's. */
const BASE_URL_VAR = "GOOGLE_GEMINI_BASE_URL";
const API_KEY_VAR = "GEMINI_API_KEY";

/**
 * The proxy's Gemini door needs no real credential — it terminates the
 * client's key and swaps in a pooled account — but Gemini CLI refuses to start
 * in API-key mode without *something* set, exactly as OpenCode's placeholder
 * does.
 */
const PLACEHOLDER_KEY = "neurolink-proxy";

/**
 * Rewrite the two managed variables, preserving every other line verbatim.
 *
 * A whole-file rewrite would be simpler and wrong: `.env` is the user's file,
 * it may hold unrelated keys for other tools, and comments and ordering are
 * theirs to keep.
 */
function upsertEnvVars(original: string, vars: Record<string, string>): string {
  let text = original;
  for (const [key, value] of Object.entries(vars)) {
    // Match an assignment at line start, tolerating `export ` and surrounding
    // spaces. Anchored per-line so a key mentioned inside a comment or another
    // value is not rewritten.
    const re = new RegExp(`^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=.*$`, "m");
    const line = `${key}=${value}`;
    // A function replacement, never a string: `String.replace` expands `$&`,
    // `$1` and friends inside a replacement *string*, so a proxy key
    // containing `$&` would be stored as the matched assignment instead of
    // itself. The callback form treats the value as literal.
    text = re.test(text)
      ? text.replace(re, () => line)
      : `${text.length > 0 && !text.endsWith("\n") ? `${text}\n` : text}${line}\n`;
  }
  return text;
}

/**
 * Read the managed variables' values out of an `.env` body.
 *
 * Restore needs the original *values*, not the original file: replaying a
 * whole snapshot would discard everything the user changed after apply().
 */
function readManagedVars(envText: string): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of [BASE_URL_VAR, API_KEY_VAR]) {
    const m = new RegExp(
      `^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=(.*)$`,
      "m",
    ).exec(envText);
    if (m) {
      out[key] = m[1] ?? "";
    }
  }
  return out;
}

/** Remove the managed variables, leaving the rest of the file untouched. */
function removeEnvVars(original: string, keys: string[]): string {
  let text = original;
  for (const key of keys) {
    const re = new RegExp(
      `^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=.*(?:\\r?\\n|$)`,
      "m",
    );
    text = text.replace(re, "");
  }
  return text;
}

async function readGeminiSnapshot(): Promise<CliGeminiSnapshot | null> {
  const fs = await import("fs");
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(getGeminiSnapshotPath(), "utf8"));
  } catch {
    return null;
  }
  // Without `originalEnv` there is nothing to write back, and the restore path
  // would hand `undefined` to writeFileAtomic and throw — which
  // restoreAllClients catches, leaving the user pointed at a dead proxy with
  // no visible failure.
  if (!isUsableSnapshot(parsed, "originalEnv")) {
    logger.debug(
      "[proxy] Gemini: ignoring a malformed snapshot rather than treating it as empty",
    );
    return null;
  }
  const originalEnv = (parsed as { originalEnv: unknown }).originalEnv;
  if (originalEnv !== null && typeof originalEnv !== "string") {
    logger.debug("[proxy] Gemini: snapshot originalEnv has the wrong type");
    return null;
  }
  return parsed as CliGeminiSnapshot;
}

export async function setGeminiProxySettings(
  baseUrl: string,
  proxyKey?: string,
): Promise<boolean> {
  const fs = await import("fs");

  try {
    fs.accessSync(getGeminiConfigDir());
  } catch {
    // Gemini CLI not installed. Report the skip rather than creating a config
    // directory for a CLI the user does not have.
    return false;
  }

  let original: string | null;
  try {
    original = fs.readFileSync(getGeminiEnvPath(), "utf8");
  } catch {
    original = null;
  }

  // "No usable snapshot" is not the same as "no snapshot file", and the
  // difference is the user's API key. A file that exists but cannot be parsed
  // used to satisfy the existence check, so apply() skipped recording, wrote
  // the placeholder over the real key, and restore later found nothing to put
  // back and simply removed the variable — the key was gone with no record of
  // it anywhere. Refuse to touch .env instead: returning false is the
  // configurator contract for "nothing was written", so the caller reports a
  // skip rather than a success.
  const existingSnapshot = await readGeminiSnapshot();
  if (existingSnapshot === null && fs.existsSync(getGeminiSnapshotPath())) {
    logger.warn(
      "[proxy] Gemini: snapshot file is unreadable; leaving .env untouched rather than overwriting credentials with no way back",
    );
    return false;
  }

  // Snapshot once — but only while the existing record still describes the
  // file. If restore ran and could not delete the snapshot, or the user edited
  // a managed variable afterwards, the stored record is stale: reusing it would
  // make the NEXT restore write yesterday's values over today's. Re-capture
  // whenever what is on disk is not what we last wrote.
  const currentManaged = readManagedVars(original ?? "");
  const lastWritten = existingSnapshot?.written;
  const snapshotIsStale =
    existingSnapshot !== null &&
    (lastWritten === undefined ||
      currentManaged[BASE_URL_VAR] !== lastWritten.baseUrl ||
      currentManaged[API_KEY_VAR] !== lastWritten.apiKey);
  if (snapshotIsStale) {
    logger.debug(
      "[proxy] Gemini: stored snapshot no longer matches .env; re-capturing",
    );
  }
  if (existingSnapshot === null || snapshotIsStale) {
    fs.mkdirSync(join(homedir(), ".neurolink"), { recursive: true });
    // 0o600: a pre-existing .env routinely holds the user's real API key.
    await writeFileAtomic(
      getGeminiSnapshotPath(),
      JSON.stringify(
        {
          originalEnv: original,
          written: { baseUrl, apiKey: proxyKey || PLACEHOLDER_KEY },
        } satisfies CliGeminiSnapshot,
        null,
        2,
      ),
      0o600,
    );
  }

  const next = upsertEnvVars(original ?? "", {
    [BASE_URL_VAR]: baseUrl,
    [API_KEY_VAR]: proxyKey || PLACEHOLDER_KEY,
  });
  // 0o600 on create: this file carries credentials. An existing file keeps its
  // own mode, which is writeFileAtomic's documented behaviour.
  await writeFileAtomic(
    getGeminiEnvPath(),
    next,
    original === null ? 0o600 : undefined,
  );
  return true;
}

export async function clearGeminiProxySettings(
  expectedBaseUrl?: string,
): Promise<boolean> {
  const fs = await import("fs");

  let current: string;
  try {
    current = fs.readFileSync(getGeminiEnvPath(), "utf8");
  } catch {
    return false;
  }

  const configured = new RegExp(
    `^[ \\t]*(?:export[ \\t]+)?${BASE_URL_VAR}[ \\t]*=[ \\t]*(.*)$`,
    "m",
  ).exec(current);
  if (!configured) {
    return false;
  }
  if (expectedBaseUrl && configured[1]?.trim() !== expectedBaseUrl) {
    // Pointed somewhere else — the user's choice, not ours to revert.
    logger.debug(
      "[proxy] Gemini clear: base URL is not the one we wrote, leaving it intact",
    );
    return false;
  }

  const snapshot = await readGeminiSnapshot();
  if (snapshot === null) {
    // No record of what was here before. Stripping the managed variables looks
    // tidy and is destructive: GEMINI_API_KEY may hold the user's real key,
    // and once removed there is nothing left to restore it from. Leaving a
    // stale base URL behind costs the user a failed request they can diagnose;
    // deleting a credential costs them something they cannot get back. Report
    // the skip instead — false is the contract for "nothing was written".
    logger.warn(
      "[proxy] Gemini clear: no usable snapshot, leaving .env untouched rather than removing variables we cannot restore",
    );
    return false;
  }

  if (snapshot.originalEnv === null) {
    // The user had no .env before the proxy created one. Remove it, unless the
    // user has since added lines of their own — then keep theirs.
    const remainder = removeEnvVars(current, [
      BASE_URL_VAR,
      API_KEY_VAR,
    ]).trim();
    if (remainder.length === 0) {
      fs.rmSync(getGeminiEnvPath(), { force: true });
    } else {
      await writeFileAtomic(getGeminiEnvPath(), `${remainder}\n`);
    }
  } else {
    // Undo our two variables against the CURRENT file rather than writing the
    // snapshot over it. Anything the user changed or added after apply() is
    // theirs and must survive; replaying the whole snapshot would silently
    // discard it. Restoring each managed variable in place also keeps its
    // original position, so an untouched file round-trips byte-for-byte.
    const originalValues = readManagedVars(snapshot.originalEnv);
    let next = current;
    for (const key of [BASE_URL_VAR, API_KEY_VAR]) {
      const originalValue = originalValues[key];
      next =
        originalValue === undefined
          ? removeEnvVars(next, [key])
          : upsertEnvVars(next, { [key]: originalValue });
    }
    await writeFileAtomic(getGeminiEnvPath(), next);
  }

  try {
    fs.rmSync(getGeminiSnapshotPath(), { force: true });
  } catch {
    // Harmless: the next apply() overwrites it.
  }
  return true;
}

/** Test-only export (CLAUDE.md rule 15 determinism exception). See openCode.ts. */
export const __geminiTestHooks = {
  getGeminiConfigDir,
  getGeminiEnvPath,
  getGeminiSnapshotPath,
  setGeminiProxySettings,
  clearGeminiProxySettings,
  upsertEnvVars,
  removeEnvVars,
};

export const geminiConfigurator: CliProxyClientConfigurator = {
  id: "gemini-cli",
  displayName: "Gemini CLI",
  detect: async () => {
    const fs = await import("fs");
    try {
      fs.accessSync(getGeminiConfigDir());
      return true;
    } catch {
      return false;
    }
  },
  // Gemini CLI appends `/v1beta/models/...` itself, so it takes the bare
  // origin — unlike OpenCode and Qwen, which need the `/v1` suffix.
  apply: (proxyBaseUrl) => setGeminiProxySettings(proxyBaseUrl),
  restore: (proxyBaseUrl) => clearGeminiProxySettings(proxyBaseUrl),
};
