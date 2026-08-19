import type { ProviderModelManifest } from "../../types/index.js";

export const ollamaManifest: ProviderModelManifest = {
  defaultContextWindow: 128000,
  models: {
    "llama4:latest": {
      aliases: ["llama4", "llama4-local"],
      displayName: "Llama 4",
      contextWindow: 131072,
      maxOutputTokens: 8192,
      // pricingPerMTok omitted: hasPricing() reports no verified rate
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "llama3.3:latest": {
      aliases: ["llama3.3", "llama3.3-local"],
      displayName: "Llama 3.3",
      contextWindow: 131072,
      maxOutputTokens: 8192,
      // pricingPerMTok omitted: hasPricing() reports no verified rate
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "llama3.2:latest": {
      aliases: ["llama3.2", "llama", "local", "offline"],
      displayName: "Llama 3.2 Latest",
      contextWindow: 131072,
      maxOutputTokens: 8192,
      // pricingPerMTok omitted: hasPricing() reports no verified rate
      vision: false,
      functionCalling: false,
      reasoning: true,
      jsonMode: false,
    },
    "deepseek-r1:70b": {
      aliases: ["deepseek-r1", "deepseek-reasoning", "local-reasoning"],
      displayName: "DeepSeek-R1 70B",
      contextWindow: 65536,
      maxOutputTokens: 8192,
      // pricingPerMTok omitted: hasPricing() reports no verified rate
      vision: false,
      functionCalling: false,
      reasoning: true,
      jsonMode: false,
    },
    "qwen3:72b": {
      aliases: ["qwen3", "qwen3-72b-local"],
      displayName: "Qwen 3 72B",
      contextWindow: 131072,
      maxOutputTokens: 8192,
      // pricingPerMTok omitted: hasPricing() reports no verified rate
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "mistral-large:latest": {
      aliases: ["mistral-large-local"],
      displayName: "Mistral Large (Local)",
      contextWindow: 131072,
      maxOutputTokens: 8192,
      // pricingPerMTok omitted: hasPricing() reports no verified rate
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
  },
};
