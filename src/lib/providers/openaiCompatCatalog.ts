import { buildCatalogEntries } from "./catalog/loader.js";
import type { OpenAICompatCatalogEntry } from "../types/index.js";

/**
 * Config-driven catalog of the 9 zero-quirk OpenAI-compatible providers.
 * Each entry fully replaces what used to be a hand-written
 * OpenAIChatCompletionsProvider subclass — see ConfiguredOpenAICompatProvider
 * for the class that reads these entries, and providerRegistry.ts for the
 * registration loop that consumes this array.
 *
 * The entries themselves are derived from the JSON catalog
 * (src/lib/providers/catalog/<id>.json) via buildCatalogEntries() — that
 * JSON is now the single source of truth for these 9 providers' identity,
 * models, error rules and wire config. See
 * src/lib/providers/catalog/loader.ts for the derivation logic and
 * docs/superpowers/plans/2026-08-28-provider-json-catalog-spec.md for the
 * authoring format.
 *
 * To add a new zero-quirk OpenAI-compatible provider: add one JSON file
 * under src/lib/providers/catalog/ (see provider-catalog.schema.json) and
 * run `pnpm run codegen:catalog`. Do NOT add a provider here if it needs
 * any hook override beyond the 3 mandatory ones
 * (getProviderName/getDefaultModel/formatProviderError) — write a
 * dedicated subclass instead (see deepseek.ts, azureOpenai.ts).
 */
export const OPENAI_COMPAT_CATALOG: readonly OpenAICompatCatalogEntry[] =
  buildCatalogEntries();
