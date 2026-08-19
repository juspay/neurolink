import type { ProviderModelManifest } from "../../types/index.js";

export const googleAiManifest: ProviderModelManifest = {
  defaultContextWindow: 1048576,
  models: {
    "gemini-2.5-pro": {
      aliases: ["gemini-pro", "google-flagship", "best-analysis"],
      displayName: "Gemini 2.5 Pro",
      contextWindow: 2097152,
      maxOutputTokens: 8192,
      pricingPerMTok: { input: 1.25, output: 10 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "gemini-2.5-flash": {
      aliases: ["gemini-flash", "google-fast", "best-value"],
      displayName: "Gemini 2.5 Flash",
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      pricingPerMTok: { input: 0.3, output: 2.5 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
  },
};
