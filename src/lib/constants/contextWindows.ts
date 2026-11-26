/**
 * Context Window Registry
 *
 * Accurate per-provider, per-model context window sizes (INPUT token limits).
 * These are distinct from OUTPUT token limits in tokens.ts.
 *
 * Sources:
 * - Anthropic: https://docs.anthropic.com/en/docs/about-claude/models
 * - OpenAI: https://platform.openai.com/docs/models
 * - Google: https://ai.google.dev/gemini-api/docs/models
 * - Others: Provider documentation as of Feb 2026
 */

import { DynamicModelProvider } from "../core/dynamicModels.js";
import { logger } from "../utils/logger.js";
import { resolveManifestEntryStrict } from "../models/manifestRegistry.js";
import { getCatalogJsonEntries } from "../providers/catalog/loader.js";
import { bedrockModelIdForLookup } from "./bedrockIdentifiers.js";
export { stripBedrockGeoPrefix } from "./bedrockIdentifiers.js";
import { getProviderRules } from "../providers/rules/registry.js";

// Per-model context windows and provider aliases live in
// src/lib/providers/rules/limits.json (`contextWindowNotes` keeps the reasons).
const LIMITS = loadLimits();
function loadLimits() {
  const { contextWindows, providerAliases } = getProviderRules("limits");
  if (!contextWindows || !providerAliases) {
    throw new Error('limits.json needs "contextWindows" and "providerAliases"');
  }
  return { contextWindows, providerAliases };
}

/**
 * Per-provider context window blocks for the 9 JSON-catalog providers
 * (cerebras, cloudflare, fireworks, groq, mistral, perplexity, sambanova,
 * together-ai, xai), derived from models.catalog[*].contextWindow +
 * defaultContextWindow — the catalog JSON (src/lib/providers/catalog/<id>.json)
 * is their single source of truth. A catalog model with no recorded
 * contextWindow (e.g. fireworks' current roster — none of its models have a
 * sourced value yet) is simply omitted here, same as it was never a key in
 * the pre-migration table either; the `_default` / prefix-match /
 * DEFAULT_CONTEXT_WINDOW fallback chain in getContextWindowSize() below
 * covers it exactly as it always has.
 */
const CATALOG_CONTEXT_WINDOWS: Record<
  string,
  Record<string, number>
> = Object.fromEntries(
  getCatalogJsonEntries().map((entry) => [
    entry.id,
    {
      _default: entry.models.defaultContextWindow,
      ...Object.fromEntries(
        Object.entries(entry.models.catalog).flatMap(([modelId, spec]) =>
          spec.contextWindow !== undefined
            ? [[modelId, spec.contextWindow] as const]
            : [],
        ),
      ),
    },
  ]),
);

/**
 * Per-model output-token ceilings for the JSON-catalog providers, derived
 * from models.catalog[*].maxOutputTokens and keyed by lowercased provider id
 * and alias. Each provider's map holds every model id as written plus its
 * lowercased form, so a lookup tries the exact spelling first.
 *
 * Deliberately NOT models.defaultMaxOutputTokens: for about 28 catalog
 * providers (groq, xai, together-ai, fireworks, perplexity, cloudflare,
 * mistral ...) that is a generic 4096 placeholder (see manifestRegistry.ts),
 * far below the real ceilings of their models. A model with no recorded
 * maxOutputTokens has no entry here, so it is never capped by a guess.
 */
const CATALOG_OUTPUT_CEILINGS: ReadonlyMap<
  string,
  ReadonlyMap<string, number>
> = new Map(
  getCatalogJsonEntries().flatMap((entry) => {
    const ceilings = Object.entries(entry.models.catalog).flatMap(
      ([modelId, spec]) =>
        spec.maxOutputTokens !== undefined &&
        Number.isFinite(spec.maxOutputTokens) &&
        spec.maxOutputTokens > 0
          ? [[modelId, spec.maxOutputTokens] as const]
          : [],
    );
    if (ceilings.length === 0) {
      return [];
    }
    // Lowercased spellings go in first so an exact id always overrides a
    // case-folded one; two ids differing only by case keep the smaller cap.
    const byModel = new Map<string, number>();
    for (const [modelId, ceiling] of ceilings) {
      const folded = modelId.toLowerCase();
      byModel.set(folded, Math.min(byModel.get(folded) ?? ceiling, ceiling));
    }
    for (const [modelId, ceiling] of ceilings) {
      byModel.set(modelId, ceiling);
    }
    return [entry.id, ...entry.aliases].map(
      (name) => [name.toLowerCase(), byModel] as const,
    );
  }),
);

/**
 * The output-token ceiling a JSON-catalog provider declares for one model, or
 * undefined when the provider is not a catalog provider, the model is not
 * listed, or the listing records no maxOutputTokens for it. Never falls back
 * to the provider-wide default (see {@link CATALOG_OUTPUT_CEILINGS}).
 */
export function getCatalogOutputCeiling(
  provider: string,
  model?: string,
): number | undefined {
  // getSafeMaxTokens has always tolerated a missing provider, so this lookup
  // must too (callers outside the typed option normalisers can pass one).
  if (!model || typeof provider !== "string") {
    return undefined;
  }
  const ceilings = CATALOG_OUTPUT_CEILINGS.get(provider.toLowerCase());
  return ceilings?.get(model) ?? ceilings?.get(model.toLowerCase());
}

/** Default context window when provider/model is unknown */
export const DEFAULT_CONTEXT_WINDOW = 128_000;

/** Maximum output reserve when maxTokens not specified */
export const MAX_DEFAULT_OUTPUT_RESERVE = 64_000;

/** Default output reserve ratio (35% of context) */
export const DEFAULT_OUTPUT_RESERVE_RATIO = 0.35;

/**
 * Per-provider, per-model context window sizes.
 * The "_default" key is the fallback for unknown models within a provider.
 */
export const MODEL_CONTEXT_WINDOWS: Record<string, Record<string, number>> = {
  ...LIMITS.contextWindows,
  ...CATALOG_CONTEXT_WINDOWS,
};

/**
 * Map of provider aliases to canonical MODEL_CONTEXT_WINDOWS keys.
 *
 * Callers reach `getContextWindowSize` via the unnormalized form on
 * `options.provider` (e.g. CLI `--provider lmstudio`, alias `llama.cpp`),
 * and `ProviderFactory.normalizeProviderName` runs only at instantiation —
 * its output never reaches budget calculations. Without this normalization
 * those alias forms miss the table and fall back to `DEFAULT_CONTEXT_WINDOW`,
 * understating the budget for LM Studio / llama.cpp / NVIDIA NIM.
 *
 * The keys here are the result of stripping non-alpha characters, so
 * `lm-studio` -> `lmstudio`, `nvidia-nim` -> `nvidianim`, `llama.cpp` -> `llamacpp`.
 */
const PROVIDER_ALIAS_MAP: Record<string, string> = LIMITS.providerAliases;

function normalizeProviderForLookup(provider: string): string {
  const stripped = provider.toLowerCase().replace(/[^a-z]/g, "");
  // On alias miss, return the *stripped* key — not the raw input — so case /
  // separator variants ("OpenAI", "open-ai", "Vertex AI") still find their
  // table entry under the lowercase canonical key instead of falling through
  // to DEFAULT_CONTEXT_WINDOW.
  return PROVIDER_ALIAS_MAP[stripped] ?? stripped;
}

/**
 * Runtime-discovered context windows, keyed `${provider}:${model}`.
 *
 * Populated asynchronously by providers that can discover real per-model
 * limits at runtime (e.g. the LiteLLM provider reads `max_input_tokens` from
 * the proxy's `/model/info`), and read synchronously by
 * {@link getContextWindowSize} — the same async-populate/sync-read contract as
 * the DynamicModelProvider registry. Keys use the RAW provider string callers
 * pass into budget calculations (see the alias-map comment above: normalized
 * provider names never reach these lookups).
 */
const RUNTIME_CONTEXT_WINDOWS = new Map<string, number>();

/**
 * Register a runtime-discovered context window for a provider/model pair.
 * Later registrations overwrite earlier ones (rediscovery refreshes values).
 * Non-positive/non-finite windows are ignored so a malformed discovery source
 * can never shrink a budget to zero.
 */
export function registerRuntimeContextWindow(
  provider: string,
  model: string,
  contextWindow: number,
): void {
  if (!Number.isFinite(contextWindow) || contextWindow <= 0) {
    return;
  }
  RUNTIME_CONTEXT_WINDOWS.set(`${provider}:${model}`, contextWindow);
}

/** Test hook: clear runtime-discovered windows (state is module-global). */
export function clearRuntimeContextWindows(): void {
  RUNTIME_CONTEXT_WINDOWS.clear();
}

/**
 * Runtime-discovered window for an exact provider/model pair, or undefined.
 *
 * Unlike {@link getContextWindowSize} this NEVER falls back to static table
 * values. Callers use it to distinguish "the serving infrastructure told us
 * the real window" (safe to hard-enforce: clamp max_tokens, fail fast) from
 * "static guess" (advisory only — hard-enforcing a guessed window would
 * falsely reject requests that the real deployment accepts).
 */
export function getRuntimeContextWindow(
  provider: string,
  model?: string,
): number | undefined {
  if (!model) {
    return undefined;
  }
  return RUNTIME_CONTEXT_WINDOWS.get(`${provider}:${model}`);
}

/**
 * Runtime-discovered output-token ceilings, keyed `${provider}:${model}` —
 * the `max_output_tokens` the serving infrastructure advertises for a model
 * (e.g. LiteLLM `/model/info`). Same async-populate/sync-read contract as
 * {@link registerRuntimeContextWindow}. Consumed by `getSafeMaxTokens` so
 * requested maxTokens is clamped to the deployed model's real cap instead of
 * a static per-provider table value.
 */
const RUNTIME_OUTPUT_CEILINGS = new Map<string, number>();

/**
 * Register a runtime-discovered output-token ceiling for a provider/model
 * pair. Later registrations overwrite earlier ones (rediscovery refreshes
 * values). Non-positive/non-finite ceilings are ignored so a malformed
 * discovery source can never shrink an output budget to zero.
 */
export function registerRuntimeOutputCeiling(
  provider: string,
  model: string,
  maxOutputTokens: number,
): void {
  if (!Number.isFinite(maxOutputTokens) || maxOutputTokens <= 0) {
    return;
  }
  RUNTIME_OUTPUT_CEILINGS.set(`${provider}:${model}`, maxOutputTokens);
}

/**
 * Runtime-discovered output ceiling for an exact provider/model pair, or
 * undefined when the serving infrastructure has not advertised one.
 */
export function getRuntimeOutputCeiling(
  provider: string,
  model?: string,
): number | undefined {
  if (!model) {
    return undefined;
  }
  return RUNTIME_OUTPUT_CEILINGS.get(`${provider}:${model}`);
}

/** Remove a model ceiling that discovery no longer advertises as valid. */
export function clearRuntimeOutputCeiling(
  provider: string,
  model: string,
): void {
  RUNTIME_OUTPUT_CEILINGS.delete(`${provider}:${model}`);
}

/** Test hook: clear runtime-discovered output ceilings (state is module-global). */
export function clearRuntimeOutputCeilings(): void {
  RUNTIME_OUTPUT_CEILINGS.clear();
}

/**
 * Resolve context window size for a provider/model combination.
 *
 * Priority:
 *  0. Dynamic model registry (DynamicModelProvider) — resolves cross-provider
 *     models (e.g. Claude on Vertex) that the static table cannot handle
 *  0.5 Runtime-discovered windows (registerRuntimeContextWindow) — real
 *      per-model limits fetched from the serving infrastructure (LiteLLM
 *      `/model/info`)
 *  1. Manifest exact/alias match ONLY (resolveManifestEntryStrict — no prefix, see
 *     src/lib/models/manifestRegistry.ts) — the emerging single source of
 *     truth for per-model metadata. Deliberately consulted for a REAL match
 *     only (never the manifest's synthesized/generic default): most provider
 *     manifests are still "minimal" stubs holding nothing but a provider-wide
 *     default (e.g. vertex.ts, together-ai.ts) and none of the per-model
 *     overrides — including Vertex's Claude "claude-" prefix catch-all below,
 *     which exists specifically to stop an unlisted Claude-on-Vertex model
 *     from inheriting Gemini's 1,048,576 default — that still live only in
 *     MODEL_CONTEXT_WINDOWS. Falling back to a manifest-wide default here
 *     would silently drop that coverage. When a manifest DOES carry a real
 *     entry for this model, it wins even if it disagrees with the legacy
 *     table (e.g. Mistral's manifest supersedes the coarser, older
 *     MODEL_CONTEXT_WINDOWS.mistral values).
 *  2. Exact model match under provider in static registry
 *  3. Prefix match under provider in static registry
 *  3.5 Bedrock only: a published model-bearing ARN is resolved again from
 *      step 0 using its model/profile id; a `<geography>.<vendor>.<model>`
 *      profile is then resolved without its geography. Every step above saw
 *      the original id, so its explicit row or discovered window still wins.
 *      Opaque/application profile identifiers keep the provider default.
 *  4. Provider's _default in static registry
 *  5. Global DEFAULT_CONTEXT_WINDOW
 */
export function getContextWindowSize(provider: string, model?: string): number {
  const canonical = normalizeProviderForLookup(provider);
  // Step 0: Check dynamic model registry first.
  // This resolves cases where the runtime provider differs from the model's
  // origin (e.g. Claude running via Vertex would hit Vertex's Gemini default
  // in the static table). The dynamic registry knows the actual model metadata.
  if (model) {
    try {
      const dynamicProvider = DynamicModelProvider.getInstance();
      const modelConfig = dynamicProvider.resolveModel(provider, model);
      if (modelConfig?.contextWindow) {
        logger.debug(
          `[ContextWindow] Resolved via dynamic registry: provider=${provider}, model=${model}, contextWindow=${modelConfig.contextWindow}`,
        );
        return modelConfig.contextWindow;
      }
    } catch {
      // Dynamic registry not initialized yet — fall through to static lookup
    }
  }

  // Step 0.5: Runtime-discovered window for this exact provider/model.
  if (model) {
    const discovered =
      RUNTIME_CONTEXT_WINDOWS.get(`${provider}:${model}`) ??
      (canonical === "bedrock"
        ? RUNTIME_CONTEXT_WINDOWS.get(`${canonical}:${model}`)
        : undefined);
    if (discovered !== undefined) {
      return discovered;
    }
  }

  // Static fallback chain — normalize aliases first so "lmstudio" / "llama.cpp" /
  // "nvidianim" find their canonical entries instead of falling back to default.
  // Step 1: Manifest real-entry lookup (exact id, alias, or longest-prefix —
  // see resolveManifestEntryStrict's docblock). Tries the alias-normalized
  // provider key first, then the raw provider string, mirroring the
  // `MODEL_CONTEXT_WINDOWS[canonical] ?? MODEL_CONTEXT_WINDOWS[provider]`
  // double-lookup below — MANIFEST_REGISTRY is keyed by the same hyphenated
  // AIProviderName forms (e.g. "together-ai") that normalizeProviderForLookup
  // strips and PROVIDER_ALIAS_MAP doesn't cover, so callers passing the raw
  // enum value still resolve. Only a genuine match short-circuits; a miss
  // falls straight through to the untouched legacy cascade below.
  if (model) {
    const manifestEntry =
      resolveManifestEntryStrict(canonical, model) ??
      resolveManifestEntryStrict(provider, model);
    if (manifestEntry) {
      return manifestEntry.contextWindow;
    }
  }

  const providerWindows =
    MODEL_CONTEXT_WINDOWS[canonical] ?? MODEL_CONTEXT_WINDOWS[provider];
  if (!providerWindows) {
    return DEFAULT_CONTEXT_WINDOW;
  }
  if (model && providerWindows[model] !== undefined) {
    return providerWindows[model];
  }
  // Try partial match (model name may be a prefix)
  if (model) {
    for (const [key, value] of Object.entries(providerWindows)) {
      if (key !== "_default" && model.startsWith(key)) {
        return value;
      }
    }
  }
  const lookupModel =
    canonical === "bedrock" && model
      ? bedrockModelIdForLookup(model)
      : undefined;
  if (lookupModel !== undefined) {
    return getContextWindowSize(provider, lookupModel);
  }
  return providerWindows._default ?? DEFAULT_CONTEXT_WINDOW;
}

/**
 * Calculate output token reserve for a given context window.
 *
 * Returns the *real* token count that will be reserved for output so callers
 * (`getAvailableInputTokens`, `BudgetChecker`, conversation-memory pruning, file
 * summarisation) compute input budget against the actual outgoing maxTokens.
 *
 * @param contextWindow - Total context window size
 * @param maxTokens - Explicit maxTokens from user config (if set)
 * @returns Number of tokens reserved for output (matches what's sent upstream)
 */
export function getOutputReserve(
  contextWindow: number,
  maxTokens?: number,
): number {
  if (maxTokens !== undefined && maxTokens > 0) {
    return maxTokens;
  }
  return Math.min(
    MAX_DEFAULT_OUTPUT_RESERVE,
    Math.ceil(contextWindow * DEFAULT_OUTPUT_RESERVE_RATIO),
  );
}

/**
 * Calculate available input tokens for a given provider/model.
 *
 * available = contextWindow - outputReserve
 */
export function getAvailableInputTokens(
  provider: string,
  model?: string,
  maxTokens?: number,
): number {
  const contextWindow = getContextWindowSize(provider, model);
  const outputReserve = getOutputReserve(contextWindow, maxTokens);
  return contextWindow - outputReserve;
}
