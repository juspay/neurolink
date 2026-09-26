/**
 * Grok Build client configurator.
 *
 * Grok Build (`grok`, xAI's terminal agent) is a Codex-shaped TOML client
 * that speaks three wire formats. Built-in `grok-4.6` / `grok-4.5` stay on
 * xAI (`cli-chat-proxy.grok.com`, Responses API, 500k window). This writer
 * does not remap those. It adds the proxy's advertised catalog as extra
 * picker entries so Grok can send Claude traffic through `/v1/messages`
 * (passthrough) and Gemini/OpenAI traffic through `/v1/chat/completions`
 * (translation), each with a `context_window` that Grok's own compaction
 * will honour — the proxy does not truncate.
 *
 * Snapshot lives in `~/.neurolink/`, following Codex, never inside
 * `config.toml`. Grok's TOML parser is not a closed schema, but putting
 * bookkeeping keys in the user's file is how OpenCode was bricked, and new
 * writers do not rely on tolerance.
 *
 * Adaptive thinking: Grok's global `default_reasoning_effort = "xhigh"`
 * becomes Anthropic `thinking.type = "adaptive"`. Haiku 4.5 rejects that
 * with 400. Only Claude Opus/Sonnet 4.6 and 5.x keep reasoning enabled.
 *
 * Ownership is decided by content, never by the block markers alone. Grok
 * rewrites config.toml on its own saves (`/settings`, `grok mcp add`, ...)
 * through a serializer that drops every comment, the markers included, and
 * splits the inline `extra_headers` into a `[model.<id>.extra_headers]`
 * sub-table (measured on Grok Build 1.0.40). A marker-only writer then kept
 * the unmarked tables and appended a second copy of every id on the next
 * proxy start, and TOML rejects a table declared twice, so Grok would not
 * start. What marks an entry as ours is the placeholder key, a credential
 * only the proxy accepts, and that survives Grok's rewrite.
 */

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { logger } from "../../lib/utils/logger.js";
import { getContextWindowSize } from "../../lib/constants/contextWindows.js";
import { DEFAULT_PROXY_MODEL_IDS } from "../../lib/constants/proxyModels.js";
import {
  defaultProxyConfigPath,
  parseProxyConfigString,
} from "../../lib/proxy/proxyConfig.js";
import type {
  CliGrokProxyModelSpec,
  CliGrokSnapshot,
  CliTomlSection,
  CliProxyClientApplyOptions,
  CliProxyClientConfigurator,
  ModelMapping,
} from "../../lib/types/index.js";
import {
  isUsableSnapshot,
  shouldCaptureSnapshot,
  writeFileAtomic,
} from "./snapshot.js";
import {
  dottedTableIds,
  findDuplicateTable,
  inlineTablePairs,
  maskTomlStrings,
  maskedStringValue,
  ownedLineCount,
  parseMaskedAssignment,
  readStringValue,
  splitTomlSections,
  tomlCodeLines,
} from "./tomlSections.js";

const GROK_BLOCK_BEGIN = "# >>> neurolink-proxy (managed) >>>";
const GROK_BLOCK_END = "# <<< neurolink-proxy (managed) <<<";
const GROK_BLOCK_NOTES = [
  "# Proxy catalog. Built-in grok-4.6 / grok-4.5 stay on xAI.",
  "# context_window is Grok's compaction limit and must be <= upstream.",
];
const GROK_MANAGED_COMMENT_LINES = new Set([
  GROK_BLOCK_BEGIN,
  GROK_BLOCK_END,
  ...GROK_BLOCK_NOTES,
]);
const PLACEHOLDER_KEY = "neurolink-proxy";
const ANTHROPIC_VERSION = "2023-06-01";

function getGrokConfigDir(): string {
  const env = process.env.GROK_HOME;
  return env !== undefined && env.trim().length > 0
    ? env.trim()
    : join(homedir(), ".grok");
}

function getGrokConfigPath(): string {
  return join(getGrokConfigDir(), "config.toml");
}

function getGrokSnapshotPath(): string {
  return join(homedir(), ".neurolink", "grok-proxy-snapshot.json");
}

function tomlKey(id: string): string {
  return /^[A-Za-z0-9_-]+$/.test(id) ? id : JSON.stringify(id);
}

function displayNameFor(id: string): string {
  const base = id.replace(/-\d{8}$/, "");
  const pretty = base
    .split("-")
    .map((part) =>
      /^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ")
    .replace(/(\d) (\d)/g, "$1.$2");
  return `${pretty} (NeuroLink)`;
}

function providerForModelId(id: string): "anthropic" | "vertex" | "openai" {
  if (id.startsWith("claude-")) {
    return "anthropic";
  }
  if (id.startsWith("gemini-")) {
    return "vertex";
  }
  return "openai";
}

function providerFromMapping(
  provider: string,
  fallbackId: string,
): "anthropic" | "vertex" | "openai" {
  const normalized = provider.trim().toLowerCase();
  if (normalized === "anthropic" || normalized === "claude") {
    return "anthropic";
  }
  if (normalized === "openai") {
    return "openai";
  }
  if (
    normalized === "vertex" ||
    normalized === "google" ||
    normalized === "google-ai" ||
    normalized === "gemini"
  ) {
    return "vertex";
  }
  return providerForModelId(fallbackId);
}

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }
  return error.code === "ENOENT";
}

/**
 * Anthropic `thinking.type = "adaptive"` is what Grok emits for `xhigh`.
 * Measured: Haiku 4.5 returns 400 "adaptive thinking is not supported".
 * Opus/Sonnet 4.6 and the 5-series accept it.
 */
function supportsAdaptiveThinking(id: string): boolean {
  return (
    /^claude-(opus|sonnet)-4-6$/.test(id) || /^claude-(opus|sonnet)-5/.test(id)
  );
}

function classifyGrokProxyModel(
  id: string,
  mapping?: ModelMapping,
): CliGrokProxyModelSpec {
  const classifyId =
    mapping && mapping.to.trim().length > 0 ? mapping.to.trim() : id;
  const provider = mapping
    ? providerFromMapping(mapping.provider, classifyId)
    : providerForModelId(id);
  const windowProvider =
    mapping && mapping.provider.trim().length > 0
      ? mapping.provider.trim()
      : provider;
  const apiBackend = provider === "anthropic" ? "messages" : "chat_completions";
  const contextWindow = getContextWindowSize(windowProvider, classifyId);
  return {
    id,
    name: displayNameFor(id),
    apiBackend,
    contextWindow,
    maxCompletionTokens: contextWindow >= 1_000_000 ? 16_384 : 8_192,
    supportsReasoningEffort: supportsAdaptiveThinking(classifyId),
  };
}

async function loadRoutedMappings(
  configPath?: string,
): Promise<ModelMapping[]> {
  const resolvedPath = configPath ?? defaultProxyConfigPath();
  try {
    const config = await parseProxyConfigString(
      readFileSync(resolvedPath, "utf8"),
    );
    return (config.routing?.modelMappings ?? []).filter(
      (mapping) => mapping.from.trim().length > 0,
    );
  } catch {
    return [];
  }
}

async function loadRoutedModelIds(configPath?: string): Promise<string[]> {
  return (await loadRoutedMappings(configPath)).map((mapping) =>
    mapping.from.trim(),
  );
}

async function catalogGrokSpecs(
  configPath?: string,
): Promise<CliGrokProxyModelSpec[]> {
  const seen = new Set<string>();
  const specs: CliGrokProxyModelSpec[] = [];
  const routed = await loadRoutedMappings(configPath);
  const routedByFrom = new Map(
    routed.map((mapping) => [mapping.from.trim(), mapping]),
  );
  for (const id of [
    ...DEFAULT_PROXY_MODEL_IDS,
    ...routed.map((mapping) => mapping.from.trim()),
  ]) {
    if (id.startsWith("grok-") || seen.has(id)) {
      continue;
    }
    seen.add(id);
    specs.push(classifyGrokProxyModel(id, routedByFrom.get(id)));
  }
  return specs;
}

async function catalogModelIds(configPath?: string): Promise<string[]> {
  return (await catalogGrokSpecs(configPath)).map((spec) => spec.id);
}

function buildGrokModelBlock(
  spec: CliGrokProxyModelSpec,
  baseUrl: string,
): string {
  const lines = [
    `[model.${tomlKey(spec.id)}]`,
    `model = ${JSON.stringify(spec.id)}`,
    `name = ${JSON.stringify(spec.name)}`,
    `base_url = ${JSON.stringify(baseUrl)}`,
    `api_backend = ${JSON.stringify(spec.apiBackend)}`,
    `context_window = ${spec.contextWindow}`,
    `auto_compact_threshold_percent = 80`,
    `max_completion_tokens = ${spec.maxCompletionTokens}`,
    `supports_backend_search = false`,
  ];
  if (!spec.supportsReasoningEffort) {
    lines.push("supports_reasoning_effort = false");
  }
  if (spec.apiBackend === "messages") {
    lines.push(
      `extra_headers = { "x-api-key" = ${JSON.stringify(PLACEHOLDER_KEY)}, "anthropic-version" = ${JSON.stringify(ANTHROPIC_VERSION)} }`,
    );
  } else {
    lines.push(`api_key = ${JSON.stringify(PLACEHOLDER_KEY)}`);
  }
  return lines.join("\n");
}

/**
 * `userModelIds` are ids the user defines themselves. Writing the proxy's
 * entry beside theirs would declare the table twice, so theirs wins.
 */
async function buildGrokManagedBlock(
  baseUrl: string,
  configPath?: string,
  userModelIds: ReadonlySet<string> = new Set(),
): Promise<string> {
  const catalog = await catalogGrokSpecs(configPath);
  for (const spec of catalog) {
    if (userModelIds.has(spec.id)) {
      logger.debug(
        `[proxy] Grok: config.toml already defines [model.${tomlKey(spec.id)}]; keeping it and skipping the proxy's entry`,
      );
    }
  }
  const body = catalog
    .filter((spec) => !userModelIds.has(spec.id))
    .map((spec) => buildGrokModelBlock(spec, baseUrl))
    .join("\n\n");
  return [
    GROK_BLOCK_BEGIN,
    ...GROK_BLOCK_NOTES,
    "",
    body,
    GROK_BLOCK_END,
    "",
  ].join("\n");
}

function modelEntryId(section: CliTomlSection): string | null {
  return section.path !== null &&
    section.path.length >= 2 &&
    section.path[0] === "model"
    ? section.path[1]
    : null;
}

/** Where a model entry carries the placeholder key, as a path within it. */
const PLACEHOLDER_KEY_PATHS: readonly (readonly string[])[] = [
  ["api_key"],
  ["extra_headers", "x-api-key"],
];

function isPlaceholderKey(
  path: readonly string[],
  value: string | undefined,
): boolean {
  return (
    value === PLACEHOLDER_KEY &&
    PLACEHOLDER_KEY_PATHS.some(
      (keyPath) =>
        keyPath.length === path.length &&
        keyPath.every((part, index) => path[index] === part),
    )
  );
}

/**
 * Whether a section of a model entry sends the placeholder key: `api_key` on
 * the model, or `x-api-key` in its `extra_headers`, spelled as a plain key, a
 * dotted key, an inline table or the sub-table Grok's own save writes. The
 * full key path must match, so a user's `legacy.api_key` is not the proxy's.
 */
function sectionSendsPlaceholderKey(section: CliTomlSection): boolean {
  const prefix = section.path?.slice(2) ?? [];
  return tomlCodeLines(section).some(({ line, statement }) => {
    if (!statement) {
      return false;
    }
    const { masked, strings } = maskTomlStrings(line);
    const assignment = parseMaskedAssignment(masked, strings);
    if (!assignment) {
      return false;
    }
    const path = [...prefix, ...assignment.path];
    return (
      isPlaceholderKey(path, maskedStringValue(assignment.value, strings)) ||
      inlineTablePairs(assignment.value, strings).some((pair) =>
        isPlaceholderKey(
          [...path, ...pair.path],
          maskedStringValue(pair.value, strings),
        ),
      )
    );
  });
}

/**
 * Which parts of a Grok config.toml the proxy owns.
 *
 * A model entry is a `[model.<id>]` table plus its `[model.<id>.*]`
 * sub-tables, wherever they sit: Grok's save keeps them together, hand edits
 * need not. It is the proxy's when it sends the placeholder key and is either
 * in the current catalog or still carries the exact name the proxy gave it,
 * which covers entries a later catalog dropped. A user's own model behind the
 * proxy, under their own name, is theirs. Keys and values are read as TOML,
 * never as raw text, so a string that merely mentions the placeholder cannot
 * make a user's table look like the proxy's. `remainder` is the text with
 * owned entries and the managed comment lines removed and every other byte
 * kept, so a missing, orphaned or doubled marker cannot make an apply delete
 * the user's content or leave an old copy of the catalog behind.
 */
function inspectGrokConfig(
  text: string,
  catalogIds: ReadonlySet<string>,
): {
  remainder: string;
  managedBaseUrls: readonly string[];
  userModelIds: ReadonlySet<string>;
} {
  const sections = splitTomlSections(text);
  // Models the user defines without a [model.<id>] table of their own.
  const definedElsewhere = new Set([
    ...dottedTableIds(sections, "model"),
    ...sections.flatMap((section) => {
      const id = section.arrayTable ? modelEntryId(section) : null;
      return id !== null && section.path?.length === 2 ? [id] : [];
    }),
  ]);
  const ids = sections.map((section) =>
    section.arrayTable ? null : modelEntryId(section),
  );
  const isModelTable = (index: number): boolean =>
    ids[index] !== null && sections[index].path?.length === 2;
  const tableFor = (index: number): number => {
    if (ids[index] === null || isModelTable(index)) {
      return index;
    }
    const sameModel = (candidate: number): boolean =>
      isModelTable(candidate) && ids[candidate] === ids[index];
    const before = sections.findLastIndex(
      (_, candidate) => candidate < index && sameModel(candidate),
    );
    const after = sections.findIndex(
      (_, candidate) => candidate > index && sameModel(candidate),
    );
    return before !== -1 ? before : after !== -1 ? after : index;
  };
  const entryOf = sections.map((_, index) => tableFor(index));
  const ownedEntries = new Set(
    entryOf.filter((entry) => {
      const id = ids[entry];
      if (id === null) {
        return false;
      }
      const sendsPlaceholder = sections.some(
        (section, index) =>
          entryOf[index] === entry &&
          ids[index] !== null &&
          sectionSendsPlaceholderKey(section),
      );
      if (!sendsPlaceholder) {
        return false;
      }
      // A sub-table left without its table carries no name to check; it is
      // the proxy's unless the model is defined some other way.
      if (!isModelTable(entry)) {
        return !definedElsewhere.has(id);
      }
      return (
        catalogIds.has(id) ||
        readStringValue(sections[entry], "name") === displayNameFor(id)
      );
    }),
  );
  const owned = sections.map(
    (_, index) => ids[index] !== null && ownedEntries.has(entryOf[index]),
  );
  const userModelIds = new Set([
    ...definedElsewhere,
    ...sections.flatMap((section, index) => {
      const id = modelEntryId(section);
      return id !== null && !owned[index] ? [id] : [];
    }),
  ]);
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
            ownedLineCount(section, GROK_MANAGED_COMMENT_LINES),
          )
        : section.lines,
    )
    .filter((line) => !GROK_MANAGED_COMMENT_LINES.has(line.trim()))
    .join("");
  return { remainder, managedBaseUrls, userModelIds };
}

async function readGrokSnapshot(): Promise<CliGrokSnapshot | null> {
  const fs = await import("fs");
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(getGrokSnapshotPath(), "utf8"));
  } catch {
    return null;
  }
  if (!isUsableSnapshot(parsed, "originalExisted")) {
    logger.debug(
      "[proxy] Grok: ignoring a malformed snapshot rather than treating it as empty",
    );
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const originalExisted = record.originalExisted;
  const writtenBaseUrl = record.writtenBaseUrl;
  if (typeof originalExisted !== "boolean") {
    return null;
  }
  if (typeof writtenBaseUrl !== "string") {
    return null;
  }
  return { originalExisted, writtenBaseUrl };
}

export async function setGrokProxySettings(
  baseUrl: string,
  options?: CliProxyClientApplyOptions,
): Promise<boolean> {
  const fs = await import("fs");
  try {
    fs.accessSync(getGrokConfigDir());
  } catch {
    return false;
  }

  let original: string | null;
  try {
    original = fs.readFileSync(getGrokConfigPath(), "utf8");
  } catch (error) {
    if (!isMissingFileError(error)) {
      logger.warn(
        "[proxy] Grok: unable to read config.toml; leaving it untouched",
      );
      return false;
    }
    original = null;
  }

  const existingSnapshot = await readGrokSnapshot();
  if (existingSnapshot === null && fs.existsSync(getGrokSnapshotPath())) {
    logger.warn(
      "[proxy] Grok: snapshot file is unreadable; leaving config.toml untouched rather than overwriting with no way back",
    );
    return false;
  }

  const currentBlock = original
    ? original.includes(GROK_BLOCK_BEGIN)
      ? original.slice(
          original.indexOf(GROK_BLOCK_BEGIN),
          original.indexOf(GROK_BLOCK_END) === -1
            ? original.length
            : original.indexOf(GROK_BLOCK_END) + GROK_BLOCK_END.length,
        )
      : undefined
    : undefined;

  const inspected =
    original === null
      ? null
      : inspectGrokConfig(
          original,
          new Set(await catalogModelIds(options?.configPath)),
        );
  const block = await buildGrokManagedBlock(
    baseUrl,
    options?.configPath,
    inspected?.userModelIds,
  );
  const remainder = inspected?.remainder ?? "";
  const next =
    remainder.trim().length === 0
      ? block
      : `${remainder.replace(/\s*$/, "\n")}\n${block}`;

  // Grok refuses to load or save a config it cannot parse. Writing into one
  // would only bury the user's own error under ours.
  const duplicate = findDuplicateTable(next);
  if (duplicate !== undefined) {
    logger.warn(
      `[proxy] Grok: config.toml declares [${duplicate}] more than once; leaving it untouched`,
    );
    return false;
  }

  if (
    existingSnapshot === null ||
    shouldCaptureSnapshot({
      hasSnapshot: existingSnapshot !== null,
      written: existingSnapshot?.writtenBaseUrl,
      current: inspected?.managedBaseUrls[0] ?? currentBlock,
    })
  ) {
    fs.mkdirSync(join(homedir(), ".neurolink"), { recursive: true });
    await writeFileAtomic(
      getGrokSnapshotPath(),
      JSON.stringify(
        {
          originalExisted:
            existingSnapshot?.originalExisted ?? original !== null,
          writtenBaseUrl: baseUrl,
        } satisfies CliGrokSnapshot,
        null,
        2,
      ),
      0o600,
    );
  }

  // Every proxy start applies; an update starts one. Rewriting a file that
  // already matches only widens the window for racing Grok's own saves.
  if (next !== original) {
    await writeFileAtomic(
      getGrokConfigPath(),
      next,
      original === null ? 0o600 : undefined,
    );
  }
  return true;
}

export async function clearGrokProxySettings(
  expectedBaseUrl?: string,
): Promise<boolean> {
  const fs = await import("fs");
  let current: string;
  try {
    current = fs.readFileSync(getGrokConfigPath(), "utf8");
  } catch {
    return false;
  }

  const inspected = inspectGrokConfig(
    current,
    new Set(await catalogModelIds()),
  );
  if (inspected.remainder === current) {
    return false;
  }

  // Another proxy's block is left alone. One entry the user repointed does
  // not make the rest foreign, whichever entry happens to come first.
  const configuredUrls = inspected.managedBaseUrls;
  if (
    expectedBaseUrl &&
    configuredUrls.length > 0 &&
    !configuredUrls.includes(expectedBaseUrl)
  ) {
    logger.debug(
      "[proxy] Grok clear: base URL is not the one we wrote, leaving it intact",
    );
    return false;
  }

  const snapshot = await readGrokSnapshot();
  if (snapshot === null) {
    logger.warn(
      "[proxy] Grok clear: no usable snapshot, leaving config.toml untouched rather than stripping a block we cannot prove we own",
    );
    return false;
  }

  const remainder = inspected.remainder.replace(/\s*$/, "\n");
  if (!snapshot.originalExisted && remainder.trim().length === 0) {
    fs.rmSync(getGrokConfigPath(), { force: true });
  } else {
    await writeFileAtomic(getGrokConfigPath(), remainder);
  }

  try {
    fs.rmSync(getGrokSnapshotPath(), { force: true });
  } catch {
    // next apply overwrites
  }
  return true;
}

export const grokConfigurator: CliProxyClientConfigurator = {
  id: "grok",
  displayName: "Grok Build",
  detect: async () => {
    const fs = await import("fs");
    try {
      fs.accessSync(getGrokConfigDir());
      return true;
    } catch {
      return false;
    }
  },
  // Grok appends `/messages` or `/chat/completions` to `base_url`, so it
  // takes the `/v1` door rather than the proxy root.
  apply: (proxyBaseUrl, options) =>
    setGrokProxySettings(`${proxyBaseUrl}/v1`, options),
  restore: (proxyBaseUrl) => clearGrokProxySettings(`${proxyBaseUrl}/v1`),
};

/** Test-only export (CLAUDE.md rule 15 determinism exception). See openCode.ts. */
export const __grokTestHooks = {
  getGrokConfigDir,
  getGrokConfigPath,
  getGrokSnapshotPath,
  setGrokProxySettings,
  clearGrokProxySettings,
  classifyGrokProxyModel,
  loadRoutedModelIds,
  catalogModelIds,
  buildGrokManagedBlock,
};
