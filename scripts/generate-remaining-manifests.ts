#!/usr/bin/env npx tsx
/**
 * One-time generator for the 28 model manifests not hand-authored in Tasks
 * 2-3. Reads only exported symbols from the pre-migration model-metadata
 * stores (MODEL_REGISTRY, getContextWindowSize, ProviderImageAdapter,
 * PROVIDER_MAX_TOKENS) — see Task 5's design note for why the private
 * PRICING/VISION_CAPABILITIES tables aren't imported directly. Run once;
 * the output files are committed and hand-editable afterward like Tasks 2-3.
 *
 * calculateCost is imported from utils/pricing.js, NOT models/modelRegistry.js
 * — both modules export a same-named function, but only pricing.ts's version
 * is the actual cost calculator that reads the PRICING table hasPricing()
 * gates on. Reading modelRegistry.js's calculateCost here would read a
 * different store than the one hasPricing() just checked, producing
 * internally-inconsistent data in exactly the cases the gate exists to catch.
 */
import { writeFileSync } from "node:fs";
import { AIProviderName } from "../src/lib/constants/enums.js";
import { getModelsByProvider } from "../src/lib/models/modelRegistry.js";
import { calculateCost, hasPricing } from "../src/lib/utils/pricing.js";
import { getContextWindowSize } from "../src/lib/constants/contextWindows.js";
import { ProviderImageAdapter } from "../src/lib/adapters/providerImageAdapter.js";
import { PROVIDER_MAX_TOKENS } from "../src/lib/core/constants.js";

const FULL_PROVIDERS = [
  AIProviderName.AZURE,
  AIProviderName.BEDROCK,
  AIProviderName.OLLAMA,
  AIProviderName.MISTRAL,
  AIProviderName.GOOGLE_AI,
] as const;

const MINIMAL_PROVIDERS = [
  AIProviderName.OPENAI_COMPATIBLE,
  AIProviderName.OPENROUTER,
  AIProviderName.VERTEX,
  AIProviderName.HUGGINGFACE,
  AIProviderName.LITELLM,
  AIProviderName.SAGEMAKER,
  AIProviderName.DEEPSEEK,
  AIProviderName.NVIDIA_NIM,
  AIProviderName.LM_STUDIO,
  AIProviderName.LLAMACPP,
  AIProviderName.XAI,
  AIProviderName.GROQ,
  AIProviderName.COHERE,
  AIProviderName.TOGETHER_AI,
  AIProviderName.FIREWORKS,
  AIProviderName.PERPLEXITY,
  AIProviderName.CLOUDFLARE,
  AIProviderName.REPLICATE,
  AIProviderName.VOYAGE,
  AIProviderName.JINA,
  AIProviderName.STABILITY,
  AIProviderName.IDEOGRAM,
  AIProviderName.RECRAFT,
] as const;

function toCamel(provider: string): string {
  return provider.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function quoteKey(key: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function generateFullManifest(provider: AIProviderName): string {
  const models = getModelsByProvider(provider);
  const entries = models
    .map((m) => {
      const priced = hasPricing(provider, m.id);
      // usage.total is required by TokenUsage's type but unused by
      // calculateCost's body (src/lib/utils/pricing.ts:750-779) — it only
      // reads .input/.output/.cacheReadTokens/.cacheCreationTokens. Probing
      // with 1_000_000 units on one side and 0 on the other isolates each
      // per-token rate scaled back up to a per-million-token price.
      const inputRate = priced
        ? calculateCost(provider, m.id, {
            input: 1_000_000,
            output: 0,
            total: 1_000_000,
          })
        : undefined;
      const outputRate = priced
        ? calculateCost(provider, m.id, {
            input: 0,
            output: 1_000_000,
            total: 1_000_000,
          })
        : undefined;
      const pricing =
        priced && inputRate !== undefined && outputRate !== undefined
          ? `{ input: ${inputRate}, output: ${outputRate} }`
          : undefined;
      const vision = ProviderImageAdapter.supportsVision(provider, m.id);
      return `    ${quoteKey(m.id)}: {
      aliases: ${JSON.stringify(m.aliases)},
      displayName: ${JSON.stringify(m.name)},
      contextWindow: ${m.limits.maxContextTokens},
      maxOutputTokens: ${m.limits.maxOutputTokens},
      ${pricing ? `pricingPerMTok: ${pricing},` : "// pricingPerMTok omitted: hasPricing() reports no verified rate"}
      vision: ${vision},
      functionCalling: ${m.capabilities.functionCalling},
      reasoning: ${m.capabilities.reasoning},
      jsonMode: ${m.capabilities.jsonMode},
    },`;
    })
    .join("\n");
  const defaultWindow = getContextWindowSize(provider);
  return `import type { ProviderModelManifest } from "../../types/index.js";

export const ${toCamel(provider)}Manifest: ProviderModelManifest = {
  defaultContextWindow: ${defaultWindow},
  models: {
${entries}
  },
};
`;
}

function generateMinimalManifest(provider: AIProviderName): string {
  const defaultWindow = getContextWindowSize(provider);
  const providerLimits = PROVIDER_MAX_TOKENS[
    provider as keyof typeof PROVIDER_MAX_TOKENS
  ] as { default?: number } | number | undefined;
  const rawMaxOutput =
    typeof providerLimits === "number"
      ? providerLimits
      : (providerLimits?.default ?? PROVIDER_MAX_TOKENS.default);
  // An output ceiling can never legitimately exceed total context — most
  // MINIMAL_PROVIDERS aren't in PROVIDER_MAX_TOKENS's explicit 9-provider
  // list, so they fall to its flat 64000 default regardless of how small
  // their real context window is. Clamp rather than let the two diverge.
  const maxOutput = Math.min(rawMaxOutput, defaultWindow);
  return `import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Minimal manifest: ${provider} has no MODEL_REGISTRY entries today, so
 * only the provider-wide fallback is known. Named models can be added here
 * incrementally without touching any consumer — see Task 5 of the model
 * metadata consolidation plan.
 */
export const ${toCamel(provider)}Manifest: ProviderModelManifest = {
  defaultContextWindow: ${defaultWindow},
  models: {
    _default: {
      aliases: [],
      contextWindow: ${defaultWindow},
      maxOutputTokens: ${maxOutput},
      vision: false,
      functionCalling: false,
    },
  },
};
`;
}

for (const provider of FULL_PROVIDERS) {
  writeFileSync(
    `src/lib/models/manifests/${provider}.ts`,
    generateFullManifest(provider),
  );
  console.log(`wrote src/lib/models/manifests/${provider}.ts`);
}

for (const provider of MINIMAL_PROVIDERS) {
  writeFileSync(
    `src/lib/models/manifests/${provider}.ts`,
    generateMinimalManifest(provider),
  );
  console.log(`wrote src/lib/models/manifests/${provider}.ts`);
}
