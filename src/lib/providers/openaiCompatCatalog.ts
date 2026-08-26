import { AIProviderName } from "../constants/enums.js";
import {
  CerebrasModels,
  CloudflareModels,
  FireworksModels,
  GroqModels,
  MistralModels,
  PerplexityModels,
  TogetherAIModels,
  XaiModels,
} from "../constants/enums.js";
import type { OpenAICompatCatalogEntry } from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  ProviderError,
} from "../types/index.js";
import { DEFAULT_ERROR_RULES } from "../utils/errorClassifier.js";
import {
  createCerebrasConfig,
  createCloudflareConfig,
  createFireworksConfig,
  createGroqConfig,
  createMistralConfig,
  createPerplexityConfig,
  createTogetherAIConfig,
  createXaiConfig,
} from "../utils/providerConfig.js";

function buildCloudflareBaseURL(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
}

/**
 * Config-driven catalog of the 8 zero-quirk OpenAI-compatible providers.
 * Each entry fully replaces what used to be a hand-written
 * OpenAIChatCompletionsProvider subclass — see ConfiguredOpenAICompatProvider
 * for the class that reads these entries, and providerRegistry.ts for the
 * registration loop that consumes this array.
 *
 * `errorRules` mirrors each provider's LIVE `formatProviderError` rule array
 * (post plan-07/wave-2 migration), not the original hand-rolled ladder these
 * providers had when plan 05 was first drafted: every provider below now
 * keeps only its bespoke rule(s) — auth, plus Groq's model_decommissioned and
 * xAI's insufficient_quota — before spreading the SAME exported
 * `DEFAULT_ERROR_RULES` constant that the live subclasses spread (never an
 * inlined copy, so this catalog cannot drift from that table independently).
 * See plan-05/progress.md Ruling R4 for the full rationale.
 *
 * To add a new zero-quirk OpenAI-compatible provider: add one entry here.
 * Do NOT add a provider here if it needs any hook override beyond the 3
 * mandatory ones (getProviderName/getDefaultModel/formatProviderError) —
 * write a dedicated subclass instead (see deepseek.ts, azureOpenai.ts, and
 * Task 14's docs task for the deciding criteria).
 */
export const OPENAI_COMPAT_CATALOG: readonly OpenAICompatCatalogEntry[] = [
  {
    providerName: AIProviderName.CEREBRAS,
    aliases: ["cerebras"],
    apiKeyEnvVar: "CEREBRAS_API_KEY",
    baseURLEnvVar: "CEREBRAS_BASE_URL",
    defaultBaseURL: "https://api.cerebras.ai/v1",
    configOptions: createCerebrasConfig(),
    modelEnvVar: "CEREBRAS_MODEL",
    defaultModel: CerebrasModels.LLAMA_3_3_70B,
    registryDefaultModel: CerebrasModels.LLAMA_3_3_70B,
    registryDefaultModelChecksEnvVar: true,
    fallbackModelName: CerebrasModels.LLAMA_3_1_8B,
    fallbackModels: [
      CerebrasModels.LLAMA_3_3_70B,
      CerebrasModels.LLAMA_3_1_8B,
      CerebrasModels.QWEN_3_32B,
      CerebrasModels.GPT_OSS_120B,
    ],
    errorRules: [
      {
        // Probed live 2026-08-26: a bad key gets HTTP 401 with body
        // {"message":"Wrong API Key","type":"invalid_request_error",
        //  "param":"api_key","code":"wrong_api_key"}.
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /wrong_api_key|Wrong API Key|invalid_api_key/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Cerebras API key. Check CEREBRAS_API_KEY. Get one at https://cloud.cerebras.ai",
      },
      ...DEFAULT_ERROR_RULES,
    ],
  },
  {
    providerName: AIProviderName.GROQ,
    aliases: ["groq"],
    apiKeyEnvVar: "GROQ_API_KEY",
    baseURLEnvVar: "GROQ_BASE_URL",
    defaultBaseURL: "https://api.groq.com/openai/v1",
    configOptions: createGroqConfig(),
    modelEnvVar: "GROQ_MODEL",
    defaultModel: GroqModels.LLAMA_3_3_70B_VERSATILE,
    registryDefaultModel: GroqModels.LLAMA_3_3_70B_VERSATILE,
    registryDefaultModelChecksEnvVar: true,
    fallbackModelName: GroqModels.LLAMA_3_1_8B_INSTANT,
    fallbackModels: [
      GroqModels.LLAMA_3_3_70B_VERSATILE,
      GroqModels.LLAMA_3_1_8B_INSTANT,
      GroqModels.GEMMA_2_9B_IT,
      GroqModels.MIXTRAL_8X7B_32768,
      GroqModels.LLAMA_3_2_90B_VISION_PREVIEW,
      GroqModels.LLAMA_3_2_11B_VISION_PREVIEW,
    ],
    // Groq's pre-migration subclass intercepted TimeoutError itself and
    // returned a plain ProviderError, ahead of classifyProviderError's own
    // non-overridable TimeoutError -> NetworkError default. Expressed here
    // as data — see OpenAICompatCatalogEntry.timeoutErrorClass and
    // ConfiguredOpenAICompatProvider.formatProviderError, which consults
    // this field before ever delegating to the shared classifier. No other
    // entry in this catalog sets it, so every other provider still gets
    // the classifier's unmodified default.
    timeoutErrorClass: ProviderError,
    errorRules: [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication|invalid_api_key/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Groq API key. Check GROQ_API_KEY. Get one at https://console.groq.com/keys",
      },
      {
        match: (ctx) => /model_decommissioned/i.test(ctx.message),
        errorClass: InvalidModelError,
        message: (ctx) =>
          `Groq model '${ctx.modelName}' was decommissioned. Pick a current model from https://console.groq.com/docs/models.`,
      },
      ...DEFAULT_ERROR_RULES,
    ],
  },
  {
    providerName: AIProviderName.XAI,
    aliases: ["xai", "grok"],
    apiKeyEnvVar: "XAI_API_KEY",
    baseURLEnvVar: "XAI_BASE_URL",
    defaultBaseURL: "https://api.x.ai/v1",
    configOptions: createXaiConfig(),
    modelEnvVar: "XAI_MODEL",
    defaultModel: XaiModels.GROK_3,
    registryDefaultModel: XaiModels.GROK_3,
    registryDefaultModelChecksEnvVar: true,
    fallbackModelName: XaiModels.GROK_3_MINI,
    fallbackModels: [
      XaiModels.GROK_3,
      XaiModels.GROK_3_MINI,
      XaiModels.GROK_2_LATEST,
      XaiModels.GROK_2_VISION_LATEST,
      XaiModels.GROK_BETA,
    ],
    errorRules: [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication|invalid_api_key/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid xAI API key. Please check your XAI_API_KEY environment variable. Get one at https://console.x.ai/",
      },
      {
        match: (ctx) => /insufficient_quota|quota exceeded/i.test(ctx.message),
        errorClass: ProviderError,
        message:
          "xAI account has insufficient quota. Top up at https://console.x.ai/",
      },
      ...DEFAULT_ERROR_RULES,
    ],
  },
  {
    providerName: AIProviderName.TOGETHER_AI,
    aliases: ["together-ai", "together"],
    apiKeyEnvVar: "TOGETHER_API_KEY",
    baseURLEnvVar: "TOGETHER_BASE_URL",
    defaultBaseURL: "https://api.together.xyz/v1",
    configOptions: createTogetherAIConfig(),
    modelEnvVar: "TOGETHER_MODEL",
    defaultModel: TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
    registryDefaultModel: TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
    registryDefaultModelChecksEnvVar: true,
    fallbackModelName: TogetherAIModels.LLAMA_3_1_8B_INSTRUCT_TURBO,
    fallbackModels: [
      TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
      TogetherAIModels.LLAMA_3_1_405B_INSTRUCT_TURBO,
      TogetherAIModels.LLAMA_3_1_70B_INSTRUCT_TURBO,
      TogetherAIModels.LLAMA_3_1_8B_INSTRUCT_TURBO,
      TogetherAIModels.MIXTRAL_8X22B_INSTRUCT,
      TogetherAIModels.QWEN_2_5_72B_INSTRUCT_TURBO,
      TogetherAIModels.DEEPSEEK_R1,
      TogetherAIModels.DEEPSEEK_V3,
    ],
    errorRules: [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Together AI API key. Get one at https://api.together.xyz/settings/api-keys",
      },
      ...DEFAULT_ERROR_RULES,
    ],
  },
  {
    providerName: AIProviderName.FIREWORKS,
    aliases: ["fireworks"],
    apiKeyEnvVar: "FIREWORKS_API_KEY",
    baseURLEnvVar: "FIREWORKS_BASE_URL",
    defaultBaseURL: "https://api.fireworks.ai/inference/v1",
    configOptions: createFireworksConfig(),
    modelEnvVar: "FIREWORKS_MODEL",
    defaultModel: FireworksModels.DEEPSEEK_V4_PRO,
    registryDefaultModel: FireworksModels.DEEPSEEK_V4_PRO,
    registryDefaultModelChecksEnvVar: true,
    fallbackModelName: FireworksModels.DEEPSEEK_V4_PRO,
    fallbackModels: [
      FireworksModels.DEEPSEEK_V4_PRO,
      FireworksModels.GLM_5P1,
      FireworksModels.GLM_5,
      FireworksModels.KIMI_K2P6,
      FireworksModels.KIMI_K2P5,
      FireworksModels.GPT_OSS_120B,
    ],
    errorRules: [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Fireworks API key. Get one at https://fireworks.ai/account/api-keys",
      },
      ...DEFAULT_ERROR_RULES,
    ],
  },
  {
    providerName: AIProviderName.PERPLEXITY,
    aliases: ["perplexity", "pplx"],
    apiKeyEnvVar: "PERPLEXITY_API_KEY",
    baseURLEnvVar: "PERPLEXITY_BASE_URL",
    defaultBaseURL: "https://api.perplexity.ai",
    configOptions: createPerplexityConfig(),
    modelEnvVar: "PERPLEXITY_MODEL",
    defaultModel: PerplexityModels.SONAR,
    registryDefaultModel: PerplexityModels.SONAR,
    registryDefaultModelChecksEnvVar: true,
    // Perplexity's live class does NOT override getFallbackModelName() — it
    // inherits the base class default "gpt-3.5-turbo". Preserved here
    // verbatim, not "fixed" to a Perplexity model — that's a real,
    // pre-existing quirk this plan is not authorized to change.
    fallbackModelName: "gpt-3.5-turbo",
    fallbackModels: [
      PerplexityModels.SONAR,
      PerplexityModels.SONAR_PRO,
      PerplexityModels.SONAR_REASONING,
      PerplexityModels.SONAR_REASONING_PRO,
      PerplexityModels.SONAR_DEEP_RESEARCH,
    ],
    errorRules: [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Perplexity API key. Get one at https://www.perplexity.ai/settings/api",
      },
      ...DEFAULT_ERROR_RULES,
    ],
  },
  {
    providerName: AIProviderName.MISTRAL,
    aliases: ["mistral"],
    apiKeyEnvVar: "MISTRAL_API_KEY",
    baseURLEnvVar: "MISTRAL_BASE_URL",
    defaultBaseURL: "https://api.mistral.ai/v1",
    configOptions: createMistralConfig(),
    modelEnvVar: "MISTRAL_MODEL",
    defaultModel: MistralModels.MISTRAL_SMALL_2506,
    // The one documented registry-vs-class default-model quirk (see this
    // plan's "Design reference" section): the registry passes the bare
    // literal MISTRAL_LARGE_LATEST with no env-var check, while
    // MistralProvider.getDefaultModel() checks MISTRAL_MODEL and defaults to
    // MISTRAL_SMALL_2506. Preserved exactly, not reconciled.
    registryDefaultModel: MistralModels.MISTRAL_LARGE_LATEST,
    registryDefaultModelChecksEnvVar: false,
    fallbackModelName: MistralModels.MISTRAL_SMALL_2506,
    fallbackModels: [
      MistralModels.MISTRAL_SMALL_2506,
      MistralModels.MISTRAL_LARGE_LATEST,
    ],
    errorRules: [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /API_KEY_INVALID|Invalid API key|Unauthorized/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Mistral API key. Please check your MISTRAL_API_KEY environment variable.",
      },
      ...DEFAULT_ERROR_RULES,
    ],
  },
  {
    providerName: AIProviderName.CLOUDFLARE,
    aliases: ["cloudflare", "workers-ai", "cf-ai"],
    apiKeyEnvVar: "CLOUDFLARE_API_KEY",
    computedBaseURL: {
      envVar: "CLOUDFLARE_ACCOUNT_ID",
      missingValueMessage:
        "CLOUDFLARE_ACCOUNT_ID is required (or pass credentials.cloudflare.accountId). Get the account id from https://dash.cloudflare.com/",
      build: buildCloudflareBaseURL,
    },
    configOptions: createCloudflareConfig(),
    modelEnvVar: "CLOUDFLARE_MODEL",
    defaultModel: CloudflareModels.LLAMA_3_3_70B_FAST,
    registryDefaultModel: CloudflareModels.LLAMA_3_3_70B_FAST,
    registryDefaultModelChecksEnvVar: true,
    fallbackModelName: CloudflareModels.LLAMA_3_1_8B_FAST,
    fallbackModels: [
      CloudflareModels.LLAMA_3_3_70B_FAST,
      CloudflareModels.LLAMA_3_1_70B_INSTRUCT,
      CloudflareModels.LLAMA_3_1_8B_FAST,
      CloudflareModels.LLAMA_3_2_11B_VISION,
      CloudflareModels.MISTRAL_7B_INSTRUCT_V0_2,
      CloudflareModels.QWEN_1P5_14B_CHAT_AWQ,
    ],
    errorRules: [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Cloudflare API key. Use a token with Workers AI Read+Write scope. Get one at https://dash.cloudflare.com/profile/api-tokens",
      },
      ...DEFAULT_ERROR_RULES,
    ],
  },
];
