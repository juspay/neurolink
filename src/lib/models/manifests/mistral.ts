import type { ProviderModelManifest } from "../../types/index.js";

export const mistralManifest: ProviderModelManifest = {
  defaultContextWindow: 128000,
  models: {
    "mistral-large-latest": {
      aliases: ["mistral-large", "mistral-flagship"],
      displayName: "Mistral Large",
      contextWindow: 131072,
      maxOutputTokens: 8192,
      pricingPerMTok: { input: 2, output: 6 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "mistral-small-latest": {
      aliases: ["mistral-small", "mistral-cheap"],
      displayName: "Mistral Small",
      contextWindow: 32768,
      maxOutputTokens: 8192,
      pricingPerMTok: { input: 0.2, output: 0.6 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "codestral-latest": {
      aliases: ["codestral", "mistral-code"],
      displayName: "Codestral",
      contextWindow: 32768,
      maxOutputTokens: 8192,
      pricingPerMTok: { input: 0.3, output: 0.9 },
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "pixtral-large": {
      aliases: ["pixtral", "mistral-vision"],
      displayName: "Pixtral Large",
      contextWindow: 131072,
      maxOutputTokens: 8192,
      // pricingPerMTok omitted: hasPricing() reports no verified rate
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
  },
};
