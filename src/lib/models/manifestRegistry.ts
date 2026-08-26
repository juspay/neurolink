import type {
  ProviderModelManifest,
  ProviderModelManifestEntry,
} from "../types/index.js";
import { PROVIDER_MAX_TOKENS } from "../core/constants.js";
import { anthropicManifest } from "./manifests/anthropic.js";
import { openaiManifest } from "./manifests/openai.js";
import { azureManifest } from "./manifests/azure.js";
import { bedrockManifest } from "./manifests/bedrock.js";
import { ollamaManifest } from "./manifests/ollama.js";
import { mistralManifest } from "./manifests/mistral.js";
import { googleAiManifest } from "./manifests/google-ai.js";
import { openaiCompatibleManifest } from "./manifests/openai-compatible.js";
import { openrouterManifest } from "./manifests/openrouter.js";
import { vertexManifest } from "./manifests/vertex.js";
import { huggingfaceManifest } from "./manifests/huggingface.js";
import { litellmManifest } from "./manifests/litellm.js";
import { sagemakerManifest } from "./manifests/sagemaker.js";
import { deepseekManifest } from "./manifests/deepseek.js";
import { nvidiaNimManifest } from "./manifests/nvidia-nim.js";
import { lmStudioManifest } from "./manifests/lm-studio.js";
import { llamacppManifest } from "./manifests/llamacpp.js";
import { xaiManifest } from "./manifests/xai.js";
import { groqManifest } from "./manifests/groq.js";
import { cerebrasManifest } from "./manifests/cerebras.js";
import { cohereManifest } from "./manifests/cohere.js";
import { togetherAiManifest } from "./manifests/together-ai.js";
import { fireworksManifest } from "./manifests/fireworks.js";
import { perplexityManifest } from "./manifests/perplexity.js";
import { cloudflareManifest } from "./manifests/cloudflare.js";
import { replicateManifest } from "./manifests/replicate.js";
import { voyageManifest } from "./manifests/voyage.js";
import { jinaManifest } from "./manifests/jina.js";
import { stabilityManifest } from "./manifests/stability.js";
import { ideogramManifest } from "./manifests/ideogram.js";
import { recraftManifest } from "./manifests/recraft.js";

/**
 * Every provider's model manifest, keyed by the exact AIProviderName enum
 * value (kebab-case) — e.g. "google-ai", "nvidia-nim". Manifests are pure
 * data with zero heavy dependencies, so they are imported statically here
 * (Critical Rule 1's dynamic-import mandate targets providerRegistry.ts's
 * *provider* factories, which pull in real SDK clients — not this).
 */
export const MANIFEST_REGISTRY: Record<string, ProviderModelManifest> = {
  anthropic: anthropicManifest,
  openai: openaiManifest,
  azure: azureManifest,
  bedrock: bedrockManifest,
  ollama: ollamaManifest,
  mistral: mistralManifest,
  "google-ai": googleAiManifest,
  "openai-compatible": openaiCompatibleManifest,
  openrouter: openrouterManifest,
  vertex: vertexManifest,
  huggingface: huggingfaceManifest,
  litellm: litellmManifest,
  sagemaker: sagemakerManifest,
  deepseek: deepseekManifest,
  "nvidia-nim": nvidiaNimManifest,
  "lm-studio": lmStudioManifest,
  llamacpp: llamacppManifest,
  xai: xaiManifest,
  groq: groqManifest,
  cerebras: cerebrasManifest,
  cohere: cohereManifest,
  "together-ai": togetherAiManifest,
  fireworks: fireworksManifest,
  perplexity: perplexityManifest,
  cloudflare: cloudflareManifest,
  replicate: replicateManifest,
  voyage: voyageManifest,
  jina: jinaManifest,
  stability: stabilityManifest,
  ideogram: ideogramManifest,
  recraft: recraftManifest,
};

export function getManifestForProvider(
  provider: string,
): ProviderModelManifest | undefined {
  return MANIFEST_REGISTRY[provider];
}

export function getAllManifestProviders(): string[] {
  return Object.keys(MANIFEST_REGISTRY);
}

/**
 * Apply every matching family rule's patch, in declaration order, on top of
 * a base entry. Later rules win on overlapping fields (last patch applied
 * wins), matching the "later registrations overwrite earlier ones" idiom
 * used elsewhere in this subsystem (see registerRuntimeContextWindow's
 * docblock, src/lib/constants/contextWindows.ts).
 */
function applyFamilyRules(
  manifest: ProviderModelManifest,
  model: string,
  base: ProviderModelManifestEntry,
): ProviderModelManifestEntry {
  if (!manifest.familyRules) {
    return base;
  }
  let result = base;
  for (const rule of manifest.familyRules) {
    if (rule.pattern.test(model)) {
      result = { ...result, ...rule.patch };
    }
  }
  return result;
}

/**
 * Resolve a model against a provider's manifest WITHOUT ever falling back to
 * the provider's `_default` entry. Used by callers that need to insert their
 * own special-case fallback (cross-provider pricing, proxy pass-through)
 * between "no real match" and "give up" — see resolveManifestEntry's
 * docblock for why the split exists.
 *
 * Resolution order: exact canonical id, then a declared alias, then
 * longest-prefix match (for tagged/gateway-shaped ids like Ollama's
 * "llama3.2:latest" or OpenRouter's "openai/gpt-4o"), then undefined.
 * Family rules are applied on top of whichever entry matched.
 */
/**
 * Like resolveManifestEntryExact but WITHOUT the longest-prefix fallback:
 * exact canonical id or declared alias only. For consumers where a prefix
 * hit can steal precedence from a more-specific legacy row — boolean
 * capability checks above all (a manifest "gpt-4" prefix match must never
 * shadow the legacy table's explicit "gpt-4-vision-preview" vision row).
 * Family rules still apply to a real match.
 */
export function resolveManifestEntryStrict(
  provider: string,
  model: string,
): ProviderModelManifestEntry | undefined {
  const manifest = MANIFEST_REGISTRY[provider];
  if (!manifest) {
    return undefined;
  }
  const exact = manifest.models[model];
  if (exact) {
    return applyFamilyRules(manifest, model, exact);
  }
  const aliasMatch = Object.entries(manifest.models).find(
    ([canonicalId, entry]) =>
      canonicalId !== "_default" && entry.aliases.includes(model),
  );
  if (aliasMatch) {
    return applyFamilyRules(manifest, model, aliasMatch[1]);
  }
  return undefined;
}

export function resolveManifestEntryExact(
  provider: string,
  model: string,
): ProviderModelManifestEntry | undefined {
  const manifest = MANIFEST_REGISTRY[provider];
  if (!manifest) {
    return undefined;
  }
  const exact = manifest.models[model];
  if (exact) {
    return applyFamilyRules(manifest, model, exact);
  }
  const aliasMatch = Object.entries(manifest.models).find(
    ([canonicalId, entry]) =>
      canonicalId !== "_default" && entry.aliases.includes(model),
  );
  if (aliasMatch) {
    return applyFamilyRules(manifest, model, aliasMatch[1]);
  }
  const sortedKeys = Object.keys(manifest.models)
    .filter((k) => k !== "_default")
    .sort((a, b) => b.length - a.length);
  const prefixKey = sortedKeys.find((k) => model.startsWith(k));
  if (prefixKey) {
    return applyFamilyRules(manifest, model, manifest.models[prefixKey]);
  }
  return undefined;
}

/**
 * Provider-specific output-token ceiling used to synthesize a `_default`
 * entry when a manifest declares no explicit one (currently every
 * MODEL_REGISTRY-generated manifest — azure, bedrock, ollama, mistral,
 * google-ai — since `generateFullManifest` only emits real model ids).
 * Mirrors the same table + fallback chain the minimal-manifest generator
 * already uses (scripts/generate-remaining-manifests.ts), so a provider
 * with no PROVIDER_MAX_TOKENS entry still gets an honest ceiling instead of
 * `undefined`. Clamped against the manifest's own `defaultContextWindow` —
 * an output ceiling can never legitimately exceed total context.
 */
function defaultMaxOutputTokens(
  provider: string,
  defaultContextWindow: number,
): number {
  const providerLimits = PROVIDER_MAX_TOKENS[
    provider as keyof typeof PROVIDER_MAX_TOKENS
  ] as { default?: number } | number | undefined;
  const rawMax =
    typeof providerLimits === "number"
      ? providerLimits
      : (providerLimits?.default ?? PROVIDER_MAX_TOKENS.default);
  return Math.min(rawMax, defaultContextWindow);
}

/**
 * Resolve a model against a provider's manifest, falling back to the
 * provider's `_default` entry (synthesized from `PROVIDER_MAX_TOKENS`,
 * clamped to `defaultContextWindow`, when no explicit `_default` model
 * entry exists) when no real model matches. Family rules are tested
 * against the ORIGINAL model string even on the `_default` path, so an
 * unmatched gateway-shaped id still gets patched.
 */
export function resolveManifestEntry(
  provider: string,
  model: string,
): ProviderModelManifestEntry | undefined {
  const exact = resolveManifestEntryExact(provider, model);
  if (exact) {
    return exact;
  }
  const manifest = MANIFEST_REGISTRY[provider];
  if (!manifest) {
    return undefined;
  }
  const defaultEntry: ProviderModelManifestEntry = manifest.models._default ?? {
    aliases: [],
    contextWindow: manifest.defaultContextWindow,
    maxOutputTokens: defaultMaxOutputTokens(
      provider,
      manifest.defaultContextWindow,
    ),
    vision: false,
    functionCalling: false,
  };
  return applyFamilyRules(manifest, model, defaultEntry);
}
