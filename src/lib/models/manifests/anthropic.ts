import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Anthropic model manifest. Canonical ids match AnthropicModels
 * (src/lib/constants/enums.ts:524+) and MODEL_CONTEXT_WINDOWS.anthropic
 * (src/lib/constants/contextWindows.ts:160-182). maxOutputTokens values
 * come from getClaudeMaxOutputTokens (src/lib/utils/tokenLimits.ts) — the
 * regex ladder already authoritative for native Claude request paths.
 */
export const anthropicManifest: ProviderModelManifest = {
  defaultContextWindow: 200_000,
  familyRules: [
    {
      // claude-{opus,sonnet,haiku}-N (N>=4) and claude-{fable,mythos}-N —
      // mirrors CLAUDE_MODERN_VISION_FAMILIES
      // (src/lib/adapters/providerImageAdapter.ts:70-73). Applied to
      // gateway-shaped ids (e.g. "vertex_ai/claude-sonnet-5@20260203") that
      // don't exact- or prefix-match any entry below.
      pattern: /claude-(?:opus|sonnet|haiku)-(?:[4-9]|\d{2,})/i,
      patch: { vision: true },
    },
    {
      pattern: /claude-(?:fable|mythos)-\d/i,
      patch: { vision: true },
    },
  ],
  models: {
    "claude-sonnet-5": {
      aliases: ["sonnet-5", "claude-sonnet"],
      displayName: "Claude Sonnet 5",
      contextWindow: 1_000_000,
      maxOutputTokens: 64_000,
      // No pricingPerMTok DELIBERATELY: PRICING.anthropic carries real
      // rates for this id, and findRates() is manifest-first with a legacy
      // fallback — omitting the rate here defers to that table instead of
      // duplicating it, and keeps this entry out of the manifest-derived
      // MODEL_REGISTRY rows (which only admit priced entries).
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      samplingParams: false, // matches SAMPLING_PARAM_REJECTING_FAMILIES /sonnet[-_.]?5(?![0-9])/i
    },
    "claude-opus-4-6": {
      aliases: ["opus-4.6", "claude-opus-latest"],
      displayName: "Claude Opus 4.6",
      contextWindow: 1_000_000,
      maxOutputTokens: 32_000,
      pricingPerMTok: {
        input: 5.0,
        output: 25.0,
        cacheRead: 0.5,
        cacheWrite: 6.25,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-sonnet-4-6": {
      aliases: ["sonnet-4.6"],
      displayName: "Claude Sonnet 4.6",
      contextWindow: 1_000_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-opus-4-5-20251101": {
      aliases: ["claude-opus-4-5", "opus-4.5"],
      displayName: "Claude Opus 4.5",
      contextWindow: 200_000,
      maxOutputTokens: 32_000,
      pricingPerMTok: {
        input: 5.0,
        output: 25.0,
        cacheRead: 0.5,
        cacheWrite: 6.25,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[AnthropicModels.CLAUDE_OPUS_4_5]
      // (src/lib/models/modelRegistry.ts:1084-1133) so Task 9's equality test
      // holds for performance/useCases/category, not just pricing/limits.
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
    "claude-sonnet-4-5-20250929": {
      aliases: ["claude-sonnet-4-5", "sonnet-4.5"],
      displayName: "Claude Sonnet 4.5",
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[AnthropicModels.CLAUDE_SONNET_4_5]
      // (src/lib/models/modelRegistry.ts:1135-1179).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 9,
          analysis: 9,
          conversation: 9,
          reasoning: 10,
          translation: 8,
          summarization: 8,
        },
        category: "coding",
      },
    },
    "claude-haiku-4-5-20251001": {
      aliases: ["claude-haiku-4-5", "haiku-4.5", "claude-4-5-haiku"],
      displayName: "Claude 4.5 Haiku",
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: {
        input: 1.0,
        output: 5.0,
        cacheRead: 0.1,
        cacheWrite: 1.25,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[AnthropicModels.CLAUDE_4_5_HAIKU]
      // (src/lib/models/modelRegistry.ts:1181-1224).
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
    "claude-opus-4-1-20250805": {
      aliases: ["claude-opus-4-1", "opus-4.1"],
      displayName: "Claude Opus 4.1",
      contextWindow: 200_000,
      maxOutputTokens: 32_000,
      pricingPerMTok: {
        input: 15.0,
        output: 75.0,
        cacheRead: 1.5,
        cacheWrite: 18.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-opus-4-20250514": {
      aliases: ["claude-opus-4"],
      displayName: "Claude Opus 4",
      contextWindow: 200_000,
      maxOutputTokens: 32_000,
      pricingPerMTok: {
        input: 15.0,
        output: 75.0,
        cacheRead: 1.5,
        cacheWrite: 18.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-sonnet-4-20250514": {
      aliases: ["claude-sonnet-4"],
      displayName: "Claude Sonnet 4",
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-3-7-sonnet-20250219": {
      aliases: ["claude-3-7-sonnet"],
      displayName: "Claude 3.7 Sonnet",
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-3-5-sonnet-20241022": {
      aliases: ["claude-3-5-sonnet"],
      displayName: "Claude 3.5 Sonnet",
      contextWindow: 200_000,
      maxOutputTokens: 8_192,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[AnthropicModels.CLAUDE_3_5_SONNET]
      // (src/lib/models/modelRegistry.ts:1226-1275).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 9,
          analysis: 9,
          conversation: 9,
          reasoning: 10,
          translation: 8,
          summarization: 8,
        },
        category: "coding",
      },
    },
    "claude-3-5-haiku-20241022": {
      aliases: ["claude-3-5-haiku"],
      displayName: "Claude 3.5 Haiku",
      contextWindow: 200_000,
      maxOutputTokens: 8_192,
      pricingPerMTok: {
        input: 0.8,
        output: 4.0,
        cacheRead: 0.08,
        cacheWrite: 1.0,
      },
      // Deliberately false: the last non-vision Claude. Does not appear in
      // VISION_CAPABILITIES.anthropic and does not match the modern-family
      // regex (family word precedes the version digit for 3.x ids), see
      // providerImageAdapter.ts:66-68's comment.
      vision: false,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[AnthropicModels.CLAUDE_3_5_HAIKU]
      // (src/lib/models/modelRegistry.ts:1277-1320).
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
    "claude-3-opus-20240229": {
      aliases: ["claude-3-opus"],
      displayName: "Claude 3 Opus",
      contextWindow: 200_000,
      maxOutputTokens: 4_096,
      pricingPerMTok: {
        input: 15.0,
        output: 75.0,
        cacheRead: 1.5,
        cacheWrite: 18.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
    },
    "claude-3-sonnet-20240229": {
      aliases: ["claude-3-sonnet"],
      displayName: "Claude 3 Sonnet",
      contextWindow: 200_000,
      maxOutputTokens: 4_096,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
    },
    "claude-3-haiku-20240307": {
      aliases: ["claude-3-haiku"],
      displayName: "Claude 3 Haiku",
      contextWindow: 200_000,
      maxOutputTokens: 4_096,
      pricingPerMTok: {
        input: 0.25,
        output: 1.25,
        cacheRead: 0.025,
        cacheWrite: 0.3125,
      },
      vision: true,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
    },
  },
};
