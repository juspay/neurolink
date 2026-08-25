import type { ProviderModelManifest } from "../../types/index.js";

export const azureManifest: ProviderModelManifest = {
  defaultContextWindow: 128000,
  models: {
    "gpt-5.1": {
      aliases: ["azure-gpt-5.1", "gpt51-azure", "azure-flagship"],
      displayName: "GPT-5.1 (Azure)",
      contextWindow: 300000,
      maxOutputTokens: 64000,
      pricingPerMTok: { input: 0.625, output: 5 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "gpt-5.1-chat": {
      aliases: ["azure-gpt-5.1-chat", "gpt51-chat-azure"],
      displayName: "GPT-5.1 Chat (Azure)",
      contextWindow: 300000,
      maxOutputTokens: 32000,
      pricingPerMTok: { input: 0.625, output: 5 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "gpt-5.1-codex": {
      aliases: ["azure-gpt-5.1-codex", "gpt51-codex-azure", "azure-code"],
      displayName: "GPT-5.1 Codex (Azure)",
      contextWindow: 300000,
      maxOutputTokens: 64000,
      pricingPerMTok: { input: 1.25, output: 10 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "gpt-5.1-codex-mini": {
      aliases: ["azure-gpt-5.1-codex-mini", "gpt51-codex-mini-azure"],
      displayName: "GPT-5.1 Codex Mini (Azure)",
      contextWindow: 200000,
      maxOutputTokens: 32000,
      pricingPerMTok: { input: 1.25, output: 10 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "gpt-5.1-codex-max": {
      aliases: [
        "azure-gpt-5.1-codex-max",
        "gpt51-codex-max-azure",
        "azure-enterprise",
      ],
      displayName: "GPT-5.1 Codex Max (Azure)",
      contextWindow: 500000,
      maxOutputTokens: 128000,
      pricingPerMTok: { input: 1.25, output: 10 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "gpt-5-pro": {
      aliases: ["azure-gpt-5-pro", "gpt5-pro-azure"],
      displayName: "GPT-5 Pro (Azure)",
      contextWindow: 256000,
      maxOutputTokens: 64000,
      pricingPerMTok: { input: 1.25, output: 10 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "gpt-5-turbo": {
      aliases: ["azure-gpt-5-turbo", "gpt5-turbo-azure"],
      displayName: "GPT-5 Turbo (Azure)",
      contextWindow: 200000,
      maxOutputTokens: 32768,
      pricingPerMTok: { input: 1.25, output: 10 },
      // Azure publishes no such model (the registry row is deprecated for
      // exactly that reason, modelRegistry.ts ~2550), and vision was
      // deliberately removed from VISION_CAPABILITIES for it — this entry
      // was generated from the registry BEFORE that fix and must not
      // re-advertise a capability an undeployable id cannot have.
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
  },
};
