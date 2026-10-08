#!/usr/bin/env tsx
/**
 * Provider-catalog codegen. Reads src/lib/providers/catalog/*.json,
 * validates each against the zod schema, and machine-writes every
 * compile-time artifact the catalog needs:
 *   1. src/lib/providers/catalog/index.generated.ts  (aggregation index)
 *   2. src/lib/types/providerCatalog.generated.ts    (type unions)
 *   3. marked region in src/lib/constants/enums.ts   (AIProviderName members + <Name>Models enums)
 *   4. marked region in src/lib/types/providers.ts   (NeurolinkCredentials keys)
 *
 * Idempotent: a second run produces byte-identical output. `--check`
 * exits 1 (writing nothing) if any output is stale — used by pre-commit
 * and CI so generated code can never drift from the JSON.
 *
 * `--validate-only` runs every check and writes nothing. `--dir <path>`
 * reads the entries from that directory instead of the real catalog; it is
 * legal only together with `--validate-only`, because the generated files
 * always describe the real catalog directory.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as prettier from "prettier";
import {
  isDecideCatalogEntry,
  parseCatalogEntry,
} from "../src/lib/providers/catalog/schema.js";
import type { CatalogEntry } from "../src/lib/types/index.js";
import {
  credentialsKeyFor,
  handWrittenDecideOrders,
  renderCredentialLines,
  renderIndexSource,
  renderModelsEnumBlocks,
  renderProviderMemberLines,
  renderTypeUnionsSource,
  toConstantCase,
  toModelConstant,
  toPascalCase,
} from "./codegen-catalog-render.js";

const REAL_CATALOG_DIR = "src/lib/providers/catalog";

const args = process.argv.slice(2);
const checkMode = args.includes("--check");
const validateOnly = args.includes("--validate-only");
const misspelledDir = args.find(
  (arg) => arg.startsWith("--dir") && arg !== "--dir",
);
if (misspelledDir !== undefined) {
  // Ignoring it would validate the real catalog and report success.
  throw new Error(
    `unknown flag ${JSON.stringify(misspelledDir)}: use --dir <path>, not --dir=<path>`,
  );
}
const dirFlagAt = args.indexOf("--dir");
const dirArg = dirFlagAt === -1 ? undefined : args[dirFlagAt + 1];
if (
  dirFlagAt !== -1 &&
  (dirArg === undefined || dirArg.startsWith("--") || dirArg.trim() === "")
) {
  throw new Error("--dir needs a directory argument");
}
if (dirArg !== undefined && !validateOnly) {
  // The generated files always describe the real catalog directory.
  throw new Error("--dir is only allowed together with --validate-only");
}
const CATALOG_DIR = dirArg ?? REAL_CATALOG_DIR;
let stale = false;

// `enumTypeName` becomes an `enum <Name> {}` declaration, which needs a
// BindingIdentifier — reserved words are legal PropertyNames (fine for
// `enumMember`) but not legal BindingIdentifiers, so `enum class {}` is a
// syntax error the IDENTIFIER_PATTERN regex alone doesn't catch.
const RESERVED_WORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
  "await",
]);

// Extracts the source text between the `{` immediately following
// `startMarker` and its matching `}`, via brace-depth counting (not a
// single indexOf("}")) — both NeurolinkCredentials and AIProviderName
// contain nested `{`/`}` pairs (multi-field credential slices) that would
// otherwise close the match early.
function extractBracedBody(
  content: string,
  startMarker: string,
  filePath: string,
): string {
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(`could not find "${startMarker}" in ${filePath}`);
  }
  const braceStart = content.indexOf("{", startIdx);
  if (braceStart === -1) {
    throw new Error(
      `could not find opening brace after "${startMarker}" in ${filePath}`,
    );
  }
  let depth = 0;
  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        return content.slice(braceStart + 1, i);
      }
    }
  }
  throw new Error(`unterminated brace after "${startMarker}" in ${filePath}`);
}

// Removes a marked region from an already-extracted body, so the generated
// entries inside it never appear as "pre-existing" when cross-checked
// against themselves.
function stripRegion(body: string, tag: string): string {
  const begin = `// ── BEGIN GENERATED(${tag}): provider catalog (pnpm run codegen:catalog) ──`;
  const end = `// ── END GENERATED(${tag}) ──`;
  const beginIdx = body.indexOf(begin);
  const endIdx = body.indexOf(end);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    return body;
  }
  return body.slice(0, beginIdx) + body.slice(endIdx + end.length);
}

// Top-level object-type property keys only (2-space indent) — deliberately
// excludes nested fields (e.g. `vertex`'s `projectId`, 4-space indent) so a
// nested field name can never be mistaken for a NeurolinkCredentials key.
function extractTopLevelKeys(body: string): Set<string> {
  const keys = new Set<string>();
  const re = /^ {2}([A-Za-z_$][A-Za-z0-9_$]*)\??:/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

// Both member names AND string values: two AIProviderName members with
// different names but the same value compile fine under TypeScript (object
// enums don't reject duplicate values), so tsc alone would not catch a
// value collision the way it catches a duplicate member name.
function extractEnumMembers(body: string): {
  names: Set<string>;
  values: Set<string>;
} {
  const names = new Set<string>();
  const values = new Set<string>();
  const re = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*"((?:[^"\\]|\\.)*)"/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    names.add(m[1]);
    values.add(m[2]);
  }
  return { names, values };
}

// `JSON.parse` resolves a duplicate object key by silently keeping the last
// occurrence, so a model id typed twice inside one file's `models.catalog`
// would lose an entry before any collision check below ever sees it — those
// checks all run on the already-deduplicated parsed object. The catalog map
// is the realistic place for this (dozens of hand-typed ids per provider),
// so its keys are read back from the source text. They are read by position,
// not by searching the whole text: a decide file repeats every catalog id as
// a key of `decisionLimits.models`, and that is not a duplicate. The text is
// already known to be valid JSON, so strings, brackets and commas are enough
// to tell a key from a value and to find the object at `models` -> `catalog`.
function catalogMapKeysInSource(text: string): string[] {
  type Open = {
    readonly bracket: "{" | "[";
    readonly name: string | undefined;
  };
  const keys: string[] = [];
  const open: Open[] = [];
  let lastKey: string | undefined;
  let expectKey = false;
  for (let at = 0; at < text.length; at += 1) {
    const ch = text[at];
    if (ch === '"') {
      let end = at + 1;
      while (end < text.length && text[end] !== '"') {
        end += text[end] === "\\" ? 2 : 1;
      }
      const inner = open[open.length - 1];
      if (inner?.bracket === "{" && expectKey) {
        lastKey = JSON.parse(text.slice(at, end + 1)) as string;
        expectKey = false;
        if (
          open.length === 3 &&
          open[1].name === "models" &&
          inner.name === "catalog"
        ) {
          keys.push(lastKey);
        }
      }
      at = end;
    } else if (ch === "{" || ch === "[") {
      const parent = open[open.length - 1];
      open.push({
        bracket: ch,
        name: parent?.bracket === "{" ? lastKey : undefined,
      });
      expectKey = ch === "{";
    } else if (ch === "}" || ch === "]") {
      open.pop();
      expectKey = false;
    } else if (ch === ",") {
      expectKey = open[open.length - 1]?.bracket === "{";
    }
  }
  return keys;
}

function assertNoDuplicateModelKeys(text: string, file: string): void {
  const catalog: unknown = (
    JSON.parse(text) as { models?: { catalog?: unknown } }
  ).models?.catalog;
  if (typeof catalog !== "object" || catalog === null) {
    return;
  }
  const counts = new Map<string, number>();
  for (const id of catalogMapKeysInSource(text)) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const [id, count] of counts) {
    if (count > 1) {
      throw new Error(
        `catalog file ${file} defines the model key ${JSON.stringify(id)} ${count} times — JSON.parse would silently keep only the last one`,
      );
    }
  }
}

// The editor mirror (provider-catalog.schema.json) is hand-maintained and
// only powers red squiggles, so it drifts silently: zod accepts a field the
// mirror has never heard of and an author's editor calls a valid file
// invalid. Rather than duplicating zod's shape, this asserts the weaker
// property that actually bites — every key the REAL catalog files use is
// declared in the mirror. Objects with author-defined keys (the catalog map
// itself, pricing, instruction arrays) are walked by shape, not by name.
function assertMirrorCoversFields(raw: unknown, file: string): void {
  const mirror: unknown = JSON.parse(
    readFileSync(
      join(REAL_CATALOG_DIR, "provider-catalog.schema.json"),
      "utf8",
    ),
  );
  const propsAt = (node: unknown): Record<string, unknown> | undefined => {
    const p = (node as { properties?: unknown } | undefined)?.properties;
    return typeof p === "object" && p !== null
      ? (p as Record<string, unknown>)
      : undefined;
  };
  const check = (value: unknown, node: unknown, path: string): void => {
    if (Array.isArray(value)) {
      const items = (node as { items?: unknown } | undefined)?.items;
      value.forEach((item, index) => {
        check(item, items, `${path.replace(/\.$/, "")}[${index}].`);
      });
      return;
    }
    if (typeof value !== "object" || value === null) {
      return;
    }
    const declared = propsAt(node);
    if (!declared) {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "$schema") {
        continue;
      }
      if (!(key in declared)) {
        throw new Error(
          `${file} uses "${path}${key}" but provider-catalog.schema.json does not declare it — the editor mirror would flag a valid catalog file as invalid`,
        );
      }
      check(child, declared[key], `${path}${key}.`);
    }
  };
  check(raw, mirror, "");
  // models.catalog keys are model ids (author-defined); their VALUES have a
  // fixed shape the mirror declares under additionalProperties.
  const specNode = (
    (propsAt(propsAt(mirror)?.models)?.catalog ?? {}) as {
      additionalProperties?: unknown;
    }
  ).additionalProperties;
  const catalogMap = (raw as { models?: { catalog?: unknown } }).models
    ?.catalog;
  if (typeof catalogMap === "object" && catalogMap !== null) {
    for (const [modelId, spec] of Object.entries(catalogMap)) {
      check(spec, specNode, `models.catalog[${modelId}].`);
    }
  }
}

function parseJsonFile(text: string, file: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `catalog file ${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function loadEntries(): CatalogEntry[] {
  const files = readdirSync(CATALOG_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".schema.json"))
    .sort();
  if (files.length === 0) {
    throw new Error(`no catalog files found in ${CATALOG_DIR}`);
  }
  return files.map((f) => {
    const text = readFileSync(join(CATALOG_DIR, f), "utf8");
    const raw = parseJsonFile(text, f);
    assertNoDuplicateModelKeys(text, f);
    assertMirrorCoversFields(raw, f);
    const entry = parseCatalogEntry(raw, f);
    if (`${entry.id}.json` !== f) {
      throw new Error(
        `catalog file name must match its id: ${f} vs ${entry.id}`,
      );
    }
    return entry;
  });
}

// Generated output must be prettier-clean as emitted — formatting it through
// the project's own resolved config (rather than hand-tuning string templates
// to match prettier's heuristics) is the only way that stays true as the
// catalog grows, since prettier's wrapping decisions (e.g. short arrays
// collapsing to one line) are content-length-dependent.
async function formatLike(path: string, content: string): Promise<string> {
  const config = await prettier.resolveConfig(path);
  return prettier.format(content, { ...config, filepath: path });
}

async function emit(path: string, content: string): Promise<void> {
  const formatted = await formatLike(path, content);
  const current = ((): string | null => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return null;
    }
  })();
  if (current === formatted) return;
  if (checkMode) {
    console.error(`stale generated output: ${path}`);
    stale = true;
    return;
  }
  writeFileSync(path, formatted);
  console.log(`wrote ${path}`);
}

async function replaceRegionWith(
  path: string,
  tag: string,
  generated: string,
): Promise<void> {
  const begin = `// ── BEGIN GENERATED(${tag}): provider catalog (pnpm run codegen:catalog) ──`;
  const end = `// ── END GENERATED(${tag}) ──`;
  const current = readFileSync(path, "utf8");
  const beginIdx = current.indexOf(begin);
  const endIdx = current.indexOf(end);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    throw new Error(`marked region "${tag}" not found in ${path}`);
  }
  const next =
    current.slice(0, beginIdx + begin.length) +
    "\n" +
    generated +
    "\n" +
    current.slice(endIdx);
  const formatted = await formatLike(path, next);
  if (formatted === current) return;
  if (checkMode) {
    console.error(`stale generated region "${tag}" in ${path}`);
    stale = true;
    return;
  }
  writeFileSync(path, formatted);
  console.log(`updated region "${tag}" in ${path}`);
}

const DESCRIPTORS_PATH = "src/lib/factories/providerDescriptors.ts";

// decide.order is the precedence of resolveDefaultDecisionProvider(), so two
// providers sharing one would make the winner depend on file order. The
// hand-written rows carry the same number as `decideOrder: <n>,` and count too.
function assertDecideOrderUnique(list: readonly CatalogEntry[]): void {
  const handWritten = new Set(
    handWrittenDecideOrders(readFileSync(DESCRIPTORS_PATH, "utf8")),
  );
  const owners = new Map<number, string>();
  for (const e of list.filter(isDecideCatalogEntry)) {
    const order = e.decide.order;
    if (handWritten.has(order)) {
      throw new Error(
        `decide order collision: provider "${e.id}" declares decide.order ${order}, which a hand-written row in ${DESCRIPTORS_PATH} already uses`,
      );
    }
    const clash = owners.get(order);
    if (clash !== undefined) {
      throw new Error(
        `decide order collision: providers "${clash}" and "${e.id}" both declare decide.order ${order}`,
      );
    }
    owners.set(order, e.id);
  }
}

// Ids and aliases share one case-insensitive namespace, because that is how
// PROVIDER_ALIAS_INDEX resolves them: a clash would let the later entry win.
function assertAliasesUnique(list: readonly CatalogEntry[]): void {
  const owners = new Map<string, string>();
  for (const e of list) {
    for (const name of [e.id, ...e.aliases]) {
      const key = name.trim().toLowerCase();
      if (key === "") {
        throw new Error(
          `provider "${e.id}" has a blank alias: an empty name would resolve to it`,
        );
      }
      const clash = owners.get(key);
      if (clash !== undefined && clash !== e.id) {
        throw new Error(
          `alias collision: "${name}" is claimed by both "${clash}" and "${e.id}" (names compare case-insensitively)`,
        );
      }
      owners.set(key, e.id);
    }
  }
}

const entries = loadEntries();
assertAliasesUnique(entries);
assertDecideOrderUnique(entries);

// Collision + identifier checks — fail loudly BEFORE writing any TypeScript.
{
  const seen = new Map<string, string>();
  for (const e of entries) {
    const camel = credentialsKeyFor(e);
    const clash = seen.get(camel);
    if (clash) {
      throw new Error(
        `credential-key collision: ids "${clash}" and "${e.id}" both derive "${camel}"`,
      );
    }
    seen.set(camel, e.id);
    const memberSeen = new Set<string>();
    for (const [modelId, spec] of Object.entries(e.models.catalog)) {
      // Belt-and-suspenders on top of the JSON.stringify() escaping below:
      // models.catalog keys carry no format constraint in the schema, so a
      // control character here (unlike a quote, which JSON.stringify makes
      // safe) would still round-trip into a technically-valid but unusable
      // enum value. Reject it at the source with a clean message instead.
      // Matching control characters is the point of this guard.
      // eslint-disable-next-line no-control-regex -- deliberate
      if (/[\x00-\x1f]/.test(modelId)) {
        throw new Error(
          `invalid model id for ${e.id}: contains a control character`,
        );
      }
      const member = spec.enumMember ?? toModelConstant(modelId);
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(member)) {
        throw new Error(
          `invalid enum member "${member}" for ${e.id}/${modelId}`,
        );
      }
      if (memberSeen.has(member)) {
        throw new Error(
          `enum-member collision in ${e.id}: two models derive "${member}" — set enumMember on one`,
        );
      }
      memberSeen.add(member);
    }
  }
  const enumNames = new Set<string>();
  for (const e of entries) {
    const enumName = e.enumTypeName ?? `${toPascalCase(e.id)}Models`;
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(enumName)) {
      throw new Error(
        `invalid enum type name "${enumName}" for provider ${e.id}`,
      );
    }
    if (RESERVED_WORDS.has(enumName)) {
      throw new Error(
        `enum type name "${enumName}" for provider ${e.id} is a reserved word — "enum ${enumName} {}" is not valid TypeScript`,
      );
    }
    if (enumNames.has(enumName)) {
      throw new Error(
        `enum type name collision: "${enumName}" derived twice — set enumTypeName on one provider`,
      );
    }
    enumNames.add(enumName);
  }

  // Cross-check against the PRE-EXISTING hand-written surface, not just the
  // catalog entries against each other. A future catalog JSON could reuse an
  // id already claimed by one of the legacy hand-written providers:
  //  - In AIProviderName (an actual enum), a duplicate member name is a hard
  //    tsc "duplicate identifier" error — loud, but genuinely late. A
  //    duplicate VALUE under a different member name is not: TypeScript
  //    does not reject two enum members sharing a string value, so that half
  //    needs an explicit check.
  //  - In NeurolinkCredentials (a `type X = {...}` object-type literal), tsc
  //    does not flag duplicate keys in an object-type literal at all — the
  //    later one silently wins, silently discarding a legacy provider's real
  //    credential shape (e.g. Cloudflare's accountId). No compiler error, no
  //    lint error, no test failure without this check.
  const providersPath = "src/lib/types/providers.ts";
  const existingCredentialKeys = extractTopLevelKeys(
    stripRegion(
      extractBracedBody(
        readFileSync(providersPath, "utf8"),
        "export type NeurolinkCredentials = {",
        providersPath,
      ),
      "credentials",
    ),
  );
  const enumsPath = "src/lib/constants/enums.ts";
  const existingProviderMembers = extractEnumMembers(
    stripRegion(
      extractBracedBody(
        readFileSync(enumsPath, "utf8"),
        "export enum AIProviderName {",
        enumsPath,
      ),
      "provider-members",
    ),
  );
  const existingEnumNames = new Set(
    [
      ...stripRegion(readFileSync(enumsPath, "utf8"), "models-enums").matchAll(
        /^export enum ([A-Za-z_$][A-Za-z0-9_$]*)\s*\{/gm,
      ),
    ].map((m) => m[1]),
  );
  for (const e of entries) {
    const enumName = e.enumTypeName ?? `${toPascalCase(e.id)}Models`;
    if (existingEnumNames.has(enumName)) {
      throw new Error(
        `enum type name collision: "${enumName}" (from provider "${e.id}") is already declared outside the generated region in ${enumsPath}: delete the hand-written enum or set enumTypeName`,
      );
    }
    const camel = credentialsKeyFor(e);
    if (existingCredentialKeys.has(camel)) {
      throw new Error(
        `credential-key collision: generated key "${camel}" (from provider "${e.id}") already exists as a hand-written NeurolinkCredentials property outside the generated region in ${providersPath}`,
      );
    }
    const memberName = toConstantCase(e.id);
    if (existingProviderMembers.names.has(memberName)) {
      throw new Error(
        `AIProviderName member collision: generated member "${memberName}" (from provider "${e.id}") already exists as a hand-written member outside the generated region in ${enumsPath}`,
      );
    }
    if (existingProviderMembers.values.has(e.id)) {
      throw new Error(
        `AIProviderName value collision: generated value "${e.id}" already exists as a hand-written member's value outside the generated region in ${enumsPath} — distinct member names sharing a value compile fine, so tsc would not catch this`,
      );
    }
  }
}

if (validateOnly) {
  console.log(
    `codegen:catalog validate-only passed — ${entries.length} providers`,
  );
  process.exit(0);
}

// Emit every generated artifact. Chat and decide entries share the enum,
// credentials and type-union regions; only the index keeps them apart.
await emit(join(CATALOG_DIR, "index.generated.ts"), renderIndexSource(entries));
await emit(
  "src/lib/types/providerCatalog.generated.ts",
  renderTypeUnionsSource(entries),
);
await replaceRegionWith(
  "src/lib/constants/enums.ts",
  "provider-members",
  renderProviderMemberLines(entries),
);
await replaceRegionWith(
  "src/lib/constants/enums.ts",
  "models-enums",
  renderModelsEnumBlocks(entries),
);
await replaceRegionWith(
  "src/lib/types/providers.ts",
  "credentials",
  renderCredentialLines(entries),
);

if (checkMode && stale) {
  console.error(
    "Generated catalog output is stale. Run: pnpm run codegen:catalog",
  );
  process.exit(1);
}
console.log(
  `codegen:catalog ${checkMode ? "check passed" : "complete"} — ${entries.length} providers`,
);
