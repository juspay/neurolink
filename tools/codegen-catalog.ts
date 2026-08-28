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
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as prettier from "prettier";
import { parseProviderCatalogJson } from "../src/lib/providers/catalog/schema.js";
import type { ProviderCatalogJson } from "../src/lib/types/index.js";

const CATALOG_DIR = "src/lib/providers/catalog";

const checkMode = process.argv.includes("--check");
let stale = false;

function toConstantCase(id: string): string {
  return id.toUpperCase().replace(/-/g, "_");
}
function toPascalCase(id: string): string {
  return id
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}
// Digits are matched alongside letters so a schema-legal id like
// "provider-2" collapses to "provider2" rather than keeping the hyphen and
// emitting an invalid binding ("provider-2Json") / property ("provider-2?").
function toCamelCase(id: string): string {
  return id.replace(/-([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
}
// Resolves the NeurolinkCredentials key for an entry — respects a
// credentialsKey override (required where the derived camelCase would
// rename a pre-existing public credential field; see together-ai).
function credentialsKeyFor(e: ProviderCatalogJson): string {
  return e.credentialsKey ?? toCamelCase(e.id);
}
function toModelConstant(modelId: string): string {
  const n = modelId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (n === "") return "MODEL";
  return /^[0-9]/.test(n) ? `M_${n}` : n;
}

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
// so each surviving id is counted back against the source text. Model ids
// only ever appear as KEYS (`"id":`); `topModels`/`fallbacks` list them as
// array values (`"id",`), which this pattern deliberately does not match.
function assertNoDuplicateModelKeys(text: string, file: string): void {
  const catalog: unknown = (
    JSON.parse(text) as { models?: { catalog?: unknown } }
  ).models?.catalog;
  if (typeof catalog !== "object" || catalog === null) {
    return;
  }
  for (const id of Object.keys(catalog)) {
    const needle = `${JSON.stringify(id)}:`;
    let count = 0;
    let at = text.indexOf(needle);
    while (at !== -1) {
      count += 1;
      at = text.indexOf(needle, at + needle.length);
    }
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
    readFileSync(join(CATALOG_DIR, "provider-catalog.schema.json"), "utf8"),
  );
  const propsAt = (node: unknown): Record<string, unknown> | undefined => {
    const p = (node as { properties?: unknown } | undefined)?.properties;
    return typeof p === "object" && p !== null
      ? (p as Record<string, unknown>)
      : undefined;
  };
  const check = (value: unknown, node: unknown, path: string): void => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
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

function loadEntries(): ProviderCatalogJson[] {
  const files = readdirSync(CATALOG_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".schema.json"))
    .sort();
  return files.map((f) => {
    const text = readFileSync(join(CATALOG_DIR, f), "utf8");
    assertNoDuplicateModelKeys(text, f);
    const raw: unknown = JSON.parse(text);
    assertMirrorCoversFields(raw, f);
    const entry = parseProviderCatalogJson(raw, f);
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

const entries = loadEntries();

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
  for (const e of entries) {
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

// 1. Aggregation index
const indexLines = [
  "// GENERATED FILE — do not edit. Regenerate with `pnpm run codegen:catalog`.",
  "// Source of truth: the per-provider JSON files in this directory.",
  // The import attribute is required under NodeNext module resolution
  // (tsconfig.cli.json) and is accepted (ignored) under bundler resolution
  // (the main SDK build), so a single emitted form satisfies both.
  ...entries.map(
    (e) =>
      `import ${toCamelCase(e.id)}Json from "./${e.id}.json" with { type: "json" };`,
  ),
  'import type { ProviderCatalogJson } from "../../types/index.js";',
  "",
  "export const CATALOG_JSON_ENTRIES: ProviderCatalogJson[] = [",
  ...entries.map((e) => `  ${toCamelCase(e.id)}Json as ProviderCatalogJson,`),
  "];",
  "",
  "export const CATALOG_PROVIDER_IDS = [",
  ...entries.map((e) => `  ${JSON.stringify(e.id)},`),
  "] as const;",
  "",
];
await emit(join(CATALOG_DIR, "index.generated.ts"), indexLines.join("\n"));

// 2. Type unions
const typeLines = [
  "// GENERATED FILE — do not edit. Regenerate with `pnpm run codegen:catalog`.",
  `export type CatalogProviderName = ${entries.map((e) => JSON.stringify(e.id)).join(" | ")};`,
  `export type CatalogCredentialKey = ${entries.map((e) => JSON.stringify(credentialsKeyFor(e))).join(" | ")};`,
  "",
];
await emit("src/lib/types/providerCatalog.generated.ts", typeLines.join("\n"));

// 3. enums.ts gets TWO tagged regions: "provider-members" (inside the
// AIProviderName enum body) and "models-enums" (top level, end of file).
const providerMemberLines = entries
  .map((e) => `  ${toConstantCase(e.id)} = ${JSON.stringify(e.id)},`)
  .join("\n");
const modelsEnumBlocks = entries
  .map((e) => {
    const members = Object.entries(e.models.catalog)
      .map(
        ([modelId, spec]) =>
          `  ${spec.enumMember ?? toModelConstant(modelId)} = ${JSON.stringify(modelId)},`,
      )
      .join("\n");
    const enumName = e.enumTypeName ?? `${toPascalCase(e.id)}Models`;
    return `export enum ${enumName} {\n${members}\n}`;
  })
  .join("\n\n");
await replaceRegionWith(
  "src/lib/constants/enums.ts",
  "provider-members",
  providerMemberLines,
);
await replaceRegionWith(
  "src/lib/constants/enums.ts",
  "models-enums",
  modelsEnumBlocks,
);

// 4. credentials keys
const credentialLines = entries
  .map((e) => {
    const extras = (e.wire.extraCredentials ?? [])
      .map((c) => ` ${c}?: string;`)
      .join("");
    return `  ${credentialsKeyFor(e)}?: { apiKey?: string; baseURL?: string;${extras} };`;
  })
  .join("\n");
await replaceRegionWith(
  "src/lib/types/providers.ts",
  "credentials",
  credentialLines,
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
