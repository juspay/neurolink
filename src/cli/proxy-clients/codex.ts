/**
 * Codex (ChatGPT) client configurator.
 *
 * Moved verbatim out of `proxy.ts`. Codex is the writer the other two should
 * have copied: it probes for an installed CLI and reports whether it wrote.
 */

import { homedir } from "os";
import { join } from "path";
import { logger } from "../../lib/utils/logger.js";
import type {
  CliProxyClientConfigurator,
  CliTomlSection,
} from "../../lib/types/index.js";
import { writeFileAtomic } from "./snapshot.js";
import {
  dottedTableIds,
  findDuplicateTable,
  ownedLineCount,
  readStringValue,
  splitTomlSections,
} from "./tomlSections.js";

//
// Points the Codex CLI at the proxy by managing `~/.codex/config.toml`:
//   - appends a marker-delimited `[model_providers.neurolink]` table
//   - flips the top-level `model_provider` to "neurolink"
// The original `model_provider` value is snapshotted to a sidecar JSON so the
// restore works even across process crashes. All edits are guarded and wrapped
// so a failure never aborts proxy start/stop. Codex talks the Responses API to
// the proxy's /backend-api/codex path.

/**
 * Resolved per call rather than at module load so `detect()` and `apply()`
 * agree when HOME changes — under test, and on the `--dev` isolation path.
 */
function getCodexConfigPath(): string {
  return join(homedir(), ".codex", "config.toml");
}

function getCodexSnapshotPath(): string {
  return join(homedir(), ".neurolink", "codex-proxy-snapshot.json");
}
const CODEX_BLOCK_BEGIN = "# >>> neurolink-proxy (managed) >>>";
const CODEX_BLOCK_END = "# <<< neurolink-proxy (managed) <<<";
const CODEX_MANAGED_COMMENT_LINES = new Set([
  CODEX_BLOCK_BEGIN,
  CODEX_BLOCK_END,
]);
const CODEX_PROVIDER_ID = "neurolink";
const CODEX_PROVIDER_NAME = "NeuroLink Proxy";
const CODEX_PROVIDER_LINE_RE = /^[ \t]*model_provider[ \t]*=.*$/m;
const CODEX_MODEL_LINE_RE = /^[ \t]*model[ \t]*=.*$/m;
const CODEX_MANAGED_SELECTOR_RE =
  /^[ \t]*model_provider[ \t]*=[ \t]*"neurolink"[ \t]*$\n?/m;

/**
 * What of a Codex config.toml the proxy owns, found by content rather than
 * by the block markers. Codex's own saves keep comments (measured on
 * codex-cli 0.155.1), but a hand edit or another tool need not, and a
 * marker-only writer then appended a second `[model_providers.neurolink]`,
 * which Codex cannot parse. The proxy's provider is that table carrying the
 * name the proxy writes, with any sub-tables under it. `foreign` is set when
 * a `neurolink` provider exists that the proxy did not write: another name, a
 * dotted-key or array definition. Writing ours beside it would declare the
 * table twice. `remainder` keeps every byte the proxy does not own, including
 * comments the user wrote after its table.
 */
function inspectCodexConfig(text: string): {
  remainder: string;
  managedBaseUrls: readonly string[];
  foreign: boolean;
} {
  const sections = splitTomlSections(text);
  const isProvider = (section: CliTomlSection): boolean =>
    section.path !== null &&
    section.path.length >= 2 &&
    section.path[0] === "model_providers" &&
    section.path[1] === CODEX_PROVIDER_ID;
  const tables = sections.filter(
    (section) =>
      isProvider(section) && !section.arrayTable && section.path?.length === 2,
  );
  const ours = (section: CliTomlSection): boolean =>
    readStringValue(section, "name") === CODEX_PROVIDER_NAME;
  const foreign =
    tables.some((table) => !ours(table)) ||
    sections.some((section) => isProvider(section) && section.arrayTable) ||
    dottedTableIds(sections, "model_providers").includes(CODEX_PROVIDER_ID);
  const owned = sections.map(
    (section) =>
      isProvider(section) &&
      !section.arrayTable &&
      (section.path?.length === 2 ? ours(section) : !foreign),
  );
  const managedBaseUrls = [
    ...new Set(
      sections.flatMap((section, index) => {
        const url = owned[index]
          ? readStringValue(section, "base_url")
          : undefined;
        return url === undefined ? [] : [url];
      }),
    ),
  ];
  const remainder = sections
    .flatMap((section, index) =>
      owned[index]
        ? section.lines.slice(
            ownedLineCount(section, CODEX_MANAGED_COMMENT_LINES),
          )
        : section.lines,
    )
    .filter((line) => !CODEX_MANAGED_COMMENT_LINES.has(line.trim()))
    .join("");
  return { remainder, managedBaseUrls, foreign };
}

/**
 * Remove the selector the proxy injected. Only the preamble holds top-level
 * keys: a profile's own `model_provider = "neurolink"` is the user's.
 */
function stripCodexSelector(text: string): string {
  return editTomlPreamble(text, (preamble) =>
    CODEX_MANAGED_SELECTOR_RE.test(preamble)
      ? preamble.replace(CODEX_MANAGED_SELECTOR_RE, "")
      : null,
  );
}

/**
 * Apply a top-level TOML key edit, confined to the document preamble.
 *
 * In TOML every key after a `[table]` header belongs to that table. A
 * document-wide regex therefore happily rewrites `model_provider` inside
 * `[model_providers.foo]`, which sets a table key instead of the top-level
 * selector: Codex keeps using its original provider while the command reports
 * success. Only the text before the first header can hold top-level keys.
 */
function editTomlPreamble(
  text: string,
  edit: (preamble: string) => string | null,
): string {
  const headerMatch = /^[ \t]*\[/m.exec(text);
  const boundary = headerMatch ? headerMatch.index : text.length;
  const preamble = text.slice(0, boundary);
  const edited = edit(preamble);
  return edited === null ? text : edited + text.slice(boundary);
}

function buildCodexProviderBlock(baseUrl: string): string {
  return [
    CODEX_BLOCK_BEGIN,
    `[model_providers.${CODEX_PROVIDER_ID}]`,
    `name = "${CODEX_PROVIDER_NAME}"`,
    `base_url = "${baseUrl}/backend-api/codex"`,
    'wire_api = "responses"',
    "requires_openai_auth = true",
    CODEX_BLOCK_END,
    "",
  ].join("\n");
}

export async function setCodexProxySettings(baseUrl: string): Promise<boolean> {
  try {
    const fs = await import("fs");
    if (!fs.existsSync(getCodexConfigPath())) {
      // Codex not installed / never configured — skip silently.
      return false;
    }
    const original = fs.readFileSync(getCodexConfigPath(), "utf8");
    const inspected = inspectCodexConfig(original);
    if (inspected.foreign) {
      logger.warn(
        "[proxy] Codex: config.toml already defines a neurolink provider the proxy did not write; leaving it untouched",
      );
      return false;
    }

    let text = stripCodexSelector(inspected.remainder);
    // Set the selector: replace an existing top-level model_provider or insert
    // one right after the top-level `model = ...` line (stays before any table).
    let selectorPlaced = false;
    text = editTomlPreamble(text, (preamble) => {
      if (CODEX_PROVIDER_LINE_RE.test(preamble)) {
        selectorPlaced = true;
        return preamble.replace(
          CODEX_PROVIDER_LINE_RE,
          'model_provider = "neurolink"',
        );
      }
      if (CODEX_MODEL_LINE_RE.test(preamble)) {
        selectorPlaced = true;
        return preamble.replace(
          CODEX_MODEL_LINE_RE,
          (line) => `${line}\nmodel_provider = "neurolink"`,
        );
      }
      return null;
    });
    if (!selectorPlaced) {
      text = `model_provider = "neurolink"\n${text}`;
    }
    const next = `${text.replace(/\s*$/, "\n")}\n${buildCodexProviderBlock(baseUrl)}`;

    // Codex will not load a config that declares a table twice. Writing into
    // one would only bury the user's own error under ours.
    const duplicate = findDuplicateTable(next);
    if (duplicate !== undefined) {
      logger.warn(
        `[proxy] Codex: config.toml declares [${duplicate}] more than once; leaving it untouched`,
      );
      return false;
    }

    // Snapshot the user's original selector once (survives crashes/restarts).
    if (!fs.existsSync(getCodexSnapshotPath())) {
      // Same preamble boundary the edit paths use. Matching document-wide would
      // capture a `model_provider` belonging to a table — a legacy
      // `[profiles.<name>]` block, say — and the restore would then write that
      // profile's provider back as the top-level selector.
      let providerMatch: RegExpMatchArray | null = null;
      editTomlPreamble(original, (preamble) => {
        providerMatch = preamble.match(CODEX_PROVIDER_LINE_RE);
        return null;
      });
      // Ignore a stale managed selector line if present in the original.
      const originalProviderLine =
        providerMatch && !/"neurolink"/.test(providerMatch[0])
          ? providerMatch[0]
          : null;
      fs.mkdirSync(join(homedir(), ".neurolink"), { recursive: true });
      await writeFileAtomic(
        getCodexSnapshotPath(),
        JSON.stringify({ originalProviderLine }, null, 2),
        0o600,
      );
    }

    // Every proxy start applies. Rewriting a file that already matches only
    // widens the window for racing Codex's own saves.
    if (next !== original) {
      await writeFileAtomic(getCodexConfigPath(), next);
    }
    return true;
  } catch (error) {
    logger.debug(
      `[proxy] Codex client config not updated: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}

export async function clearCodexProxySettings(
  expectedBaseUrl?: string,
): Promise<boolean> {
  try {
    const fs = await import("fs");
    if (!fs.existsSync(getCodexConfigPath())) {
      return false;
    }
    const original = fs.readFileSync(getCodexConfigPath(), "utf8");
    const inspected = inspectCodexConfig(original);

    // The managed table records its owner in `base_url`. Without this check a
    // second proxy shutting down on another port would strip the table that
    // the still-running proxy installed, and restore the snapshot selector on
    // top — silently taking Codex off the live proxy. Mirrors the Claude and
    // OpenCode clear paths.
    if (
      expectedBaseUrl &&
      inspected.managedBaseUrls.length > 0 &&
      !inspected.managedBaseUrls.includes(
        `${expectedBaseUrl}/backend-api/codex`,
      )
    ) {
      return false;
    }

    let text = stripCodexSelector(inspected.remainder);

    // Restore the user's original selector line if we snapshotted one.
    let restored: string | null = null;
    if (fs.existsSync(getCodexSnapshotPath())) {
      try {
        const snap = JSON.parse(
          fs.readFileSync(getCodexSnapshotPath(), "utf8"),
        ) as { originalProviderLine?: string | null };
        restored = snap.originalProviderLine ?? null;
      } catch {
        restored = null;
      }
    }
    if (restored) {
      const restoredLine = restored;
      let restorePlaced = false;
      text = editTomlPreamble(text, (preamble) => {
        if (CODEX_PROVIDER_LINE_RE.test(preamble)) {
          restorePlaced = true;
          return preamble.replace(CODEX_PROVIDER_LINE_RE, restoredLine);
        }
        if (CODEX_MODEL_LINE_RE.test(preamble)) {
          restorePlaced = true;
          return preamble.replace(
            CODEX_MODEL_LINE_RE,
            (line) => `${line}\n${restoredLine}`,
          );
        }
        return null;
      });
      if (!restorePlaced) {
        text = `${restoredLine}\n${text}`;
      }
    }

    if (text === original) {
      // Nothing managed remains, so the snapshot can no longer describe the
      // user's current selector. Keeping it would let a later clear restore a
      // value the user has since changed by hand.
      try {
        fs.rmSync(getCodexSnapshotPath(), { force: true });
      } catch {
        // best-effort
      }
      return false;
    }
    await writeFileAtomic(getCodexConfigPath(), text.replace(/\s*$/, "\n"));
    try {
      fs.rmSync(getCodexSnapshotPath(), { force: true });
    } catch {
      // best-effort
    }
    return true;
  } catch (error) {
    logger.debug(
      `[proxy] Codex client config not cleared: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}

export const codexConfigurator: CliProxyClientConfigurator = {
  id: "codex",
  displayName: "Codex",
  detect: async () => {
    const fs = await import("fs");
    return fs.existsSync(getCodexConfigPath());
  },
  // setCodexProxySettings appends "/backend-api/codex" itself, so this takes
  // the bare origin.
  apply: (proxyBaseUrl) => setCodexProxySettings(proxyBaseUrl),
  restore: (proxyBaseUrl) => clearCodexProxySettings(proxyBaseUrl),
};

export const __codexClientTestHooks = {
  getCodexConfigPath,
  getCodexSnapshotPath,
  setCodexProxySettings,
  clearCodexProxySettings,
};
