import type { ProviderModelManifest } from "../../types/index.js";

/**
 * OpenAI model manifest. contextWindow values come from
 * MODEL_CONTEXT_WINDOWS.openai (src/lib/constants/contextWindows.ts), which
 * disagrees with MODEL_REGISTRY.limits.maxContextTokens for several ids
 * (e.g. gpt-5: 400_000 here vs 256_000 there) — MODEL_CONTEXT_WINDOWS wins
 * as the more actively-maintained store. maxOutputTokens/aliases/capability
 * flags come from MODEL_REGISTRY (src/lib/models/modelRegistry.ts:30-984).
 * pricingPerMTok comes from PRICING.openai (src/lib/utils/pricing.ts).
 */
export const openaiManifest: ProviderModelManifest = {
  defaultContextWindow: 128_000,
  models: {
    "gpt-4o": {
      aliases: ["gpt4o", "gpt-4-omni", "openai-flagship"],
      displayName: "GPT-4 Omni",
      contextWindow: 128_000,
      maxOutputTokens: 4_096,
      pricingPerMTok: { input: 2.5, output: 10.0, cacheRead: 0.625 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4O]
      // (src/lib/models/modelRegistry.ts:30-73).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 9,
          creative: 8,
          analysis: 9,
          conversation: 9,
          reasoning: 9,
          translation: 8,
          summarization: 8,
        },
        category: "general",
      },
    },
    "gpt-4o-mini": {
      aliases: ["gpt4o-mini", "gpt-4-mini", "fastest", "cheap"],
      displayName: "GPT-4 Omni Mini",
      contextWindow: 128_000,
      maxOutputTokens: 16_384,
      pricingPerMTok: { input: 0.15, output: 0.6, cacheRead: 0.0375 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4O_MINI]
      // (src/lib/models/modelRegistry.ts:75-118).
      curated: {
        performance: { speed: "fast", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 7,
          analysis: 8,
          conversation: 8,
          reasoning: 8,
          translation: 8,
          summarization: 9,
        },
        category: "general",
      },
    },
    "gpt-5": {
      aliases: ["gpt5", "gpt-5-flagship", "openai-latest"],
      displayName: "GPT-5",
      contextWindow: 400_000,
      maxOutputTokens: 32_768,
      pricingPerMTok: { input: 1.25, output: 10.0, cacheRead: 0.3125 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5]
      // (src/lib/models/modelRegistry.ts:121-165).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 10,
          analysis: 10,
          conversation: 10,
          reasoning: 10,
          translation: 9,
          summarization: 9,
        },
        category: "reasoning",
      },
    },
    "gpt-5-mini": {
      aliases: ["gpt5-mini", "gpt-5-fast"],
      displayName: "GPT-5 Mini",
      contextWindow: 400_000,
      maxOutputTokens: 16_384,
      pricingPerMTok: { input: 0.25, output: 2.0, cacheRead: 0.0625 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5_MINI]
      // (src/lib/models/modelRegistry.ts:167-210).
      curated: {
        performance: { speed: "fast", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 8,
          analysis: 8,
          conversation: 9,
          reasoning: 8,
          translation: 8,
          summarization: 9,
        },
        category: "general",
      },
    },
    o3: {
      aliases: ["o3-reasoning", "o3-thinking"],
      displayName: "O3",
      contextWindow: 200_000,
      maxOutputTokens: 100_000,
      pricingPerMTok: { input: 2.0, output: 8.0, cacheRead: 0.5 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O3]
      // (src/lib/models/modelRegistry.ts:213-257).
      curated: {
        performance: { speed: "slow", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 8,
          analysis: 10,
          conversation: 7,
          reasoning: 10,
          translation: 7,
          summarization: 8,
        },
        category: "reasoning",
      },
    },
    "o3-mini": {
      aliases: ["o3-mini-reasoning"],
      displayName: "O3 Mini",
      contextWindow: 200_000,
      maxOutputTokens: 65_536,
      pricingPerMTok: { input: 1.1, output: 4.4, cacheRead: 0.275 },
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O3_MINI]
      // (src/lib/models/modelRegistry.ts:259-303).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 9,
          creative: 6,
          analysis: 9,
          conversation: 7,
          reasoning: 9,
          translation: 6,
          summarization: 7,
        },
        category: "reasoning",
      },
    },
    "gpt-5-nano": {
      aliases: ["gpt5-nano", "gpt-5-cheapest"],
      displayName: "GPT-5 Nano",
      contextWindow: 400_000,
      maxOutputTokens: 128_000,
      pricingPerMTok: { input: 0.05, output: 0.4, cacheRead: 0.0125 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5_NANO]
      // (src/lib/models/modelRegistry.ts:305-349).
      curated: {
        performance: { speed: "fast", quality: "medium", accuracy: "medium" },
        useCases: {
          coding: 6,
          creative: 6,
          analysis: 6,
          conversation: 8,
          reasoning: 6,
          translation: 7,
          summarization: 8,
        },
        category: "general",
      },
    },
    "gpt-5.2": {
      aliases: ["gpt52", "gpt-5.2-thinking", "openai-latest-reasoning"],
      displayName: "GPT-5.2 Thinking",
      contextWindow: 400_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: { input: 1.75, output: 14.0, cacheRead: 0.4375 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5_2]
      // (src/lib/models/modelRegistry.ts:352-396).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 10,
          analysis: 10,
          conversation: 9,
          reasoning: 10,
          translation: 9,
          summarization: 9,
        },
        category: "reasoning",
      },
    },
    "gpt-5.2-chat-latest": {
      aliases: ["gpt52-chat", "gpt-5.2-instant", "gpt52-fast"],
      displayName: "GPT-5.2 Instant",
      contextWindow: 128_000,
      maxOutputTokens: 32_000,
      // Inherits gpt-5.2's rate — matches findRates()'s existing prefix-match
      // resolution for this id today (no distinct PRICING.openai key exists).
      pricingPerMTok: { input: 1.75, output: 14.0, cacheRead: 0.4375 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5_2_CHAT_LATEST]
      // (src/lib/models/modelRegistry.ts:398-442).
      curated: {
        performance: { speed: "fast", quality: "high", accuracy: "high" },
        useCases: {
          coding: 9,
          creative: 9,
          analysis: 9,
          conversation: 10,
          reasoning: 9,
          translation: 9,
          summarization: 9,
        },
        category: "general",
      },
    },
    "gpt-5.2-pro": {
      aliases: ["gpt52-pro", "gpt-5.2-professional", "openai-science"],
      displayName: "GPT-5.2 Pro",
      contextWindow: 400_000,
      maxOutputTokens: 128_000,
      // Inherits gpt-5.2's rate — see gpt-5.2-chat-latest's comment above.
      pricingPerMTok: { input: 1.75, output: 14.0, cacheRead: 0.4375 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5_2_PRO]
      // (src/lib/models/modelRegistry.ts:444-488).
      curated: {
        performance: { speed: "slow", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 9,
          analysis: 10,
          conversation: 8,
          reasoning: 10,
          translation: 9,
          summarization: 9,
        },
        category: "reasoning",
      },
    },
    "gpt-4.1": {
      aliases: ["gpt-4.1", "gpt41", "million-context"],
      displayName: "GPT-4.1",
      contextWindow: 1_047_576,
      maxOutputTokens: 128_000,
      pricingPerMTok: { input: 2.0, output: 8.0, cacheRead: 0.5 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4_1]
      // (src/lib/models/modelRegistry.ts:491-534).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 8,
          analysis: 9,
          conversation: 8,
          reasoning: 9,
          translation: 8,
          summarization: 9,
        },
        category: "coding",
      },
    },
    "gpt-4.1-mini": {
      aliases: ["gpt-4.1-mini", "gpt41-mini"],
      displayName: "GPT-4.1 Mini",
      contextWindow: 1_047_576,
      maxOutputTokens: 128_000,
      pricingPerMTok: { input: 0.4, output: 1.6, cacheRead: 0.1 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4_1_MINI]
      // (src/lib/models/modelRegistry.ts:536-579).
      curated: {
        performance: { speed: "fast", quality: "high", accuracy: "high" },
        useCases: {
          coding: 9,
          creative: 7,
          analysis: 8,
          conversation: 8,
          reasoning: 8,
          translation: 8,
          summarization: 9,
        },
        category: "coding",
      },
    },
    "gpt-4.1-nano": {
      aliases: ["gpt-4.1-nano", "gpt41-nano"],
      displayName: "GPT-4.1 Nano",
      contextWindow: 1_047_576,
      maxOutputTokens: 128_000,
      pricingPerMTok: { input: 0.1, output: 0.4, cacheRead: 0.025 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4_1_NANO]
      // (src/lib/models/modelRegistry.ts:581-624).
      curated: {
        performance: { speed: "fast", quality: "medium", accuracy: "medium" },
        useCases: {
          coding: 7,
          creative: 6,
          analysis: 7,
          conversation: 7,
          reasoning: 7,
          translation: 7,
          summarization: 8,
        },
        category: "coding",
      },
    },
    "o3-pro": {
      aliases: ["o3-pro", "o3-professional"],
      displayName: "O3 Pro",
      contextWindow: 200_000,
      maxOutputTokens: 100_000,
      // Inherits o3's rate — matches findRates()'s existing prefix-match
      // resolution for this id today (no distinct PRICING.openai key exists).
      pricingPerMTok: { input: 2.0, output: 8.0, cacheRead: 0.5 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O3_PRO]
      // (src/lib/models/modelRegistry.ts:627-671).
      curated: {
        performance: { speed: "slow", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 7,
          analysis: 10,
          conversation: 6,
          reasoning: 10,
          translation: 6,
          summarization: 7,
        },
        category: "reasoning",
      },
    },
    "o4-mini": {
      aliases: ["o4-mini", "o4-fast"],
      displayName: "O4 Mini",
      contextWindow: 200_000,
      maxOutputTokens: 100_000,
      pricingPerMTok: { input: 1.1, output: 4.4, cacheRead: 0.275 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O4_MINI]
      // (src/lib/models/modelRegistry.ts:673-717).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 9,
          creative: 6,
          analysis: 9,
          conversation: 7,
          reasoning: 10,
          translation: 6,
          summarization: 7,
        },
        category: "reasoning",
      },
    },
    o1: {
      aliases: ["o1-full", "o1-premium"],
      displayName: "O1",
      contextWindow: 200_000,
      maxOutputTokens: 32_768,
      pricingPerMTok: { input: 15.0, output: 60.0, cacheRead: 3.75 },
      // DELIBERATE DEVIATION FROM task-3-brief.md (which specifies `true`):
      // set to `false` to mirror live behavior exactly. Today,
      // ProviderImageAdapter.supportsVision("openai", "o1") returns false —
      // VISION_CAPABILITIES.openai (providerImageAdapter.ts) has no "o1"
      // entry (o1-preview/o1-mini are also absent, but so is o1 itself) and
      // there is no "openai" key in VISION_FAMILY_RULES for a regex fallback
      // to catch it. This manifest's job in this PR is to be a faithful,
      // behavior-preserving replacement for the tables it will supersede
      // (Tasks 7-11 migrate the consumers; Task 14 proves behavior was
      // preserved) — that proof only holds if the manifest encodes what the
      // system actually does today, not what it should do.
      //
      // This is very likely a live bug, not a fact about o1: OpenAI's real
      // o1 (distinct from o1-preview/o1-mini) is believed to accept image
      // input, and MODEL_REGISTRY[OpenAIModels.O1].capabilities.vision is
      // itself `true` (modelRegistry.ts:726) — i.e. the existing hand-curated
      // registry already disagrees with VISION_CAPABILITIES.openai on this
      // exact point. Correcting VISION_CAPABILITIES.openai to add "o1" is a
      // separate, deliberately deferred change with its own commit and its
      // own test, not something to smuggle into a purely-additive data port.
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O1]
      // (src/lib/models/modelRegistry.ts:719-763).
      curated: {
        performance: { speed: "slow", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 7,
          analysis: 10,
          conversation: 6,
          reasoning: 10,
          translation: 6,
          summarization: 7,
        },
        category: "reasoning",
      },
    },
    "o1-mini": {
      aliases: ["o1-mini", "o1-budget"],
      displayName: "O1 Mini",
      contextWindow: 128_000,
      maxOutputTokens: 65_536,
      pricingPerMTok: { input: 0.55, output: 2.2, cacheRead: 0.1375 },
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O1_MINI]
      // (src/lib/models/modelRegistry.ts:810-853).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 5,
          analysis: 8,
          conversation: 6,
          reasoning: 8,
          translation: 5,
          summarization: 6,
        },
        category: "reasoning",
      },
    },
    "gpt-4": {
      aliases: ["gpt4", "gpt-4-base"],
      displayName: "GPT-4",
      contextWindow: 8_192,
      maxOutputTokens: 4_096,
      pricingPerMTok: { input: 30.0, output: 60.0 },
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4]
      // (src/lib/models/modelRegistry.ts:856-899).
      curated: {
        performance: { speed: "slow", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 8,
          analysis: 8,
          conversation: 8,
          reasoning: 8,
          translation: 8,
          summarization: 8,
        },
        category: "general",
      },
    },
    "gpt-4-turbo": {
      aliases: ["gpt4-turbo", "gpt-4-turbo-preview"],
      displayName: "GPT-4 Turbo",
      contextWindow: 128_000,
      maxOutputTokens: 4_096,
      pricingPerMTok: { input: 10.0, output: 30.0 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4_TURBO]
      // (src/lib/models/modelRegistry.ts:901-944).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 8,
          analysis: 9,
          conversation: 8,
          reasoning: 8,
          translation: 8,
          summarization: 8,
        },
        category: "general",
      },
    },
    "gpt-3.5-turbo": {
      aliases: ["gpt35", "gpt-3.5", "chatgpt"],
      displayName: "GPT-3.5 Turbo",
      contextWindow: 16_385,
      maxOutputTokens: 4_096,
      pricingPerMTok: { input: 0.5, output: 1.0 },
      vision: false,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_3_5_TURBO]
      // (src/lib/models/modelRegistry.ts:946-989).
      curated: {
        performance: { speed: "fast", quality: "medium", accuracy: "medium" },
        useCases: {
          coding: 6,
          creative: 6,
          analysis: 6,
          conversation: 7,
          reasoning: 5,
          translation: 7,
          summarization: 7,
        },
        category: "general",
      },
    },
  },
};
