/**
 * Pure rendering for tools/codegen-catalog.ts, split out so a test can render a
 * mix of chat and decide entries without touching the repo's generated files.
 */
import { isDecideCatalogEntry } from "../src/lib/providers/catalog/schema.js";
import type {
  CatalogEntry,
  DecideCatalogJson,
  ProviderCatalogJson,
} from "../src/lib/types/index.js";

export function toConstantCase(id: string): string {
  return id.toUpperCase().replace(/-/g, "_");
}
export function toPascalCase(id: string): string {
  return id
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}
// Digits are matched alongside letters so a schema-legal id like "provider-2"
// collapses to "provider2" rather than keeping the hyphen and emitting an
// invalid binding ("provider-2Json") / property ("provider-2?").
export function toCamelCase(id: string): string {
  return id.replace(/-([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
}
// Resolves the NeurolinkCredentials key for an entry — respects a
// credentialsKey override (required where the derived camelCase would
// rename a pre-existing public credential field; see together-ai).
export function credentialsKeyFor(e: CatalogEntry): string {
  return e.credentialsKey ?? toCamelCase(e.id);
}
export function toModelConstant(modelId: string): string {
  const n = modelId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (n === "") return "MODEL";
  return /^[0-9]/.test(n) ? `M_${n}` : n;
}

// The lines of a descriptors file the codegen counts as a hand-written decide
// order. Only a bare number followed by a comma matches: a row written any
// other way (`5 as const,`, a variable) is invisible to the collision check,
// which is why a test compares this list with the descriptors themselves.
export function handWrittenDecideOrders(source: string): number[] {
  return [...source.matchAll(/^\s*decideOrder:\s*(\d+),/gm)].map((m) =>
    Number(m[1]),
  );
}

export function splitCatalogEntries(entries: readonly CatalogEntry[]): {
  chat: ProviderCatalogJson[];
  decide: DecideCatalogJson[];
} {
  return {
    chat: entries.filter(
      (e): e is ProviderCatalogJson => !isDecideCatalogEntry(e),
    ),
    decide: entries.filter(isDecideCatalogEntry),
  };
}

export function renderIndexSource(entries: readonly CatalogEntry[]): string {
  const { chat, decide } = splitCatalogEntries(entries);
  return [
    "// GENERATED FILE — do not edit. Regenerate with `pnpm run codegen:catalog`.",
    "// Source of truth: the per-provider JSON files in this directory.",
    // The import attribute is required under NodeNext module resolution
    // (tsconfig.cli.json) and is accepted (ignored) under bundler resolution
    // (the main SDK build), so a single emitted form satisfies both.
    ...entries.map(
      (e) =>
        `import ${toCamelCase(e.id)}Json from "./${e.id}.json" with { type: "json" };`,
    ),
    'import { isDecideCatalogEntry, parseCatalogEntry } from "./schema.js";',
    'import type { DecideCatalogJson, ProviderCatalogJson } from "../../types/index.js";',
    "",
    "const asDecideEntry = (raw: unknown): DecideCatalogJson => {",
    "  const entry = parseCatalogEntry(raw);",
    "  if (!isDecideCatalogEntry(entry)) {",
    '    throw new Error("a catalog file listed as a decide entry parsed as a chat entry");',
    "  }",
    "  return entry;",
    "};",
    "",
    "export const CATALOG_JSON_ENTRIES: ProviderCatalogJson[] = [",
    ...chat.map((e) => `  ${toCamelCase(e.id)}Json as ProviderCatalogJson,`),
    "];",
    "",
    "export const CATALOG_PROVIDER_IDS = [",
    ...chat.map((e) => `  ${JSON.stringify(e.id)},`),
    "] as const;",
    "",
    "export const DECIDE_CATALOG_JSON_ENTRIES: DecideCatalogJson[] = [",
    ...decide.map((e) => `  ${toCamelCase(e.id)}Json,`),
    "].map(asDecideEntry);",
    "",
    "export const DECIDE_CATALOG_PROVIDER_IDS = [",
    ...decide.map((e) => `  ${JSON.stringify(e.id)},`),
    "] as const;",
    "",
  ].join("\n");
}

export function renderTypeUnionsSource(
  entries: readonly CatalogEntry[],
): string {
  return [
    "// GENERATED FILE — do not edit. Regenerate with `pnpm run codegen:catalog`.",
    `export type CatalogProviderName = ${entries.map((e) => JSON.stringify(e.id)).join(" | ")};`,
    `export type CatalogCredentialKey = ${entries.map((e) => JSON.stringify(credentialsKeyFor(e))).join(" | ")};`,
    "",
  ].join("\n");
}

export function renderProviderMemberLines(
  entries: readonly CatalogEntry[],
): string {
  return entries
    .map((e) => `  ${toConstantCase(e.id)} = ${JSON.stringify(e.id)},`)
    .join("\n");
}

export function renderModelsEnumBlocks(
  entries: readonly CatalogEntry[],
): string {
  return entries
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
}

export function renderCredentialLines(
  entries: readonly CatalogEntry[],
): string {
  return entries
    .map((e) => {
      const extras = (e.wire.extraCredentials ?? [])
        .map((c) => ` ${c}?: string;`)
        .join("");
      return `  ${credentialsKeyFor(e)}?: { apiKey?: string; baseURL?: string;${extras} };`;
    })
    .join("\n");
}
