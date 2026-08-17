import { AIProviderName } from "../constants/enums.js";
import {
  GoogleAIModels,
  OpenAIModels,
  AnthropicModels,
  VertexModels,
  MistralModels,
  OllamaModels,
  LiteLLMModels,
  HuggingFaceModels,
  DeepSeekModels,
  NvidiaNimModels,
  OpenRouterModels,
  XaiModels,
  GroqModels,
  CohereModels,
  TogetherAIModels,
  FireworksModels,
  PerplexityModels,
  CloudflareModels,
  VoyageModels,
  JinaModels,
  StabilityModels,
  IdeogramModels,
  RecraftModels,
  ReplicateModels,
} from "../constants/enums.js";
import { API_KEY_FORMATS } from "../utils/providerConfig.js";
import type { ProviderDescriptor } from "../types/index.js";

/**
 * Single source of truth for provider identity, credentials, defaults, and
 * runtime behavior classification. Pure data — no provider-class imports,
 * no dynamic import(), no side effects beyond building the two derived
 * lookup maps below. Order follows the AIProviderName enum declaration
 * order (enums.ts:8-40) so this file stays easy to diff against it.
 */
export const PROVIDER_DESCRIPTORS: readonly ProviderDescriptor[] = [
  {
    name: AIProviderName.BEDROCK,
    aliases: ["aws"],
    credentialsKey: "bedrock",
    envVars: {
      apiKey: "AWS_ACCESS_KEY_ID",
      extraRequired: ["AWS_SECRET_ACCESS_KEY"],
      model: "BEDROCK_MODEL",
    },
    defaultModel: "",
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://console.aws.amazon.com/iam/",
    timeouts: { generateMs: 45_000, streamMs: 120_000 },
    autoSelectPriority: 7,
    apiKeyFormatPattern: API_KEY_FORMATS.bedrock,
    // Falls back to the AWS SDK's own default credential chain (shared
    // profile, IAM role) when these env vars are absent — see field JSDoc.
    credentialsResolvedExternally: true,
  },
  {
    name: AIProviderName.OPENAI,
    aliases: ["gpt", "chatgpt"],
    credentialsKey: "openai",
    envVars: { apiKey: "OPENAI_API_KEY", baseURL: "OPENAI_BASE_URL" },
    defaultModel: OpenAIModels.GPT_4O_MINI,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "models-probe",
    setupUrl: "https://platform.openai.com/api-keys",
    timeouts: { generateMs: 30_000, streamMs: 120_000 },
    autoSelectPriority: 5,
    apiKeyFormatPattern: API_KEY_FORMATS.openai,
  },
  {
    name: AIProviderName.OPENAI_COMPATIBLE,
    aliases: ["vllm", "compatible"],
    credentialsKey: "openaiCompatible",
    envVars: {
      apiKey: "OPENAI_COMPATIBLE_API_KEY",
      baseURL: "OPENAI_COMPATIBLE_BASE_URL",
      model: "OPENAI_COMPATIBLE_MODEL",
    },
    defaultModel: "",
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
  },
  {
    name: AIProviderName.OPENROUTER,
    aliases: ["or"],
    credentialsKey: "openrouter",
    envVars: {
      apiKey: "OPENROUTER_API_KEY",
      baseURL: "OPENROUTER_BASE_URL",
      model: "OPENROUTER_MODEL",
    },
    defaultModel: OpenRouterModels.CLAUDE_SONNET_4_5,
    toolSupport: "model-dependent",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://openrouter.ai/keys",
  },
  {
    name: AIProviderName.VERTEX,
    aliases: ["googleVertex"],
    credentialsKey: "vertex",
    envVars: {
      // "apiKey" here names the primary identity env var, not a secret —
      // Vertex's real auth is the extraRequired file-or-individual-creds
      // check below. See checkVertexAuthentication() in providerHealth.ts.
      apiKey: "GOOGLE_CLOUD_PROJECT_ID",
      fallbacks: [
        "VERTEX_PROJECT_ID",
        "GOOGLE_VERTEX_PROJECT",
        "GOOGLE_CLOUD_PROJECT",
      ],
      extraRequired: ["GOOGLE_APPLICATION_CREDENTIALS"],
      // GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK is checked with higher
      // priority than GOOGLE_APPLICATION_CREDENTIALS by the real gating
      // logic (hasGoogleCredentials() in googleVertex/client.ts and
      // googleVertex/utils.ts) — corrected here vs. the plan snippet, which
      // omitted it. GOOGLE_AUTH_CLIENT_EMAIL and GOOGLE_AUTH_PRIVATE_KEY are
      // nested together because hasGoogleCredentials() only accepts them as
      // a pair — either alone is not valid auth, unlike the other flat
      // entries here which are each independently sufficient.
      extraRequiredFallbacks: [
        "GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK",
        "GOOGLE_SERVICE_ACCOUNT_KEY",
        ["GOOGLE_AUTH_CLIENT_EMAIL", "GOOGLE_AUTH_PRIVATE_KEY"],
      ],
    },
    defaultModel: VertexModels.CLAUDE_4_6_SONNET,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://console.cloud.google.com/",
    timeouts: { generateMs: 60_000, streamMs: 120_000 },
    autoSelectPriority: 3,
    // OR-of-multiple-auth-paths (file / individual fields / base64 key) —
    // not a flat AND-list of required env vars. See field JSDoc.
    credentialsResolvedExternally: true,
  },
  {
    name: AIProviderName.ANTHROPIC,
    aliases: ["claude"],
    credentialsKey: "anthropic",
    envVars: {
      apiKey: "ANTHROPIC_API_KEY",
      fallbacks: [
        "ANTHROPIC_OAUTH_TOKEN",
        "CLAUDE_OAUTH_TOKEN",
        "ANTHROPIC_OAUTH_ACCESS_TOKEN",
      ],
      baseURL: "ANTHROPIC_BASE_URL",
    },
    defaultModel: AnthropicModels.CLAUDE_SONNET_4_6,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://console.anthropic.com/settings/keys",
    timeouts: { generateMs: 60_000, streamMs: 120_000 },
    autoSelectPriority: 6,
    apiKeyFormatPattern: API_KEY_FORMATS.anthropic,
  },
  {
    name: AIProviderName.AZURE,
    aliases: ["azureOpenai"],
    credentialsKey: "azure",
    envVars: {
      apiKey: "AZURE_OPENAI_API_KEY",
      extraRequired: ["AZURE_OPENAI_ENDPOINT"],
      model: "AZURE_MODEL",
      modelFallbacks: [
        "AZURE_OPENAI_MODEL",
        "AZURE_OPENAI_DEPLOYMENT",
        "AZURE_OPENAI_DEPLOYMENT_ID",
      ],
    },
    defaultModel: "gpt-4o-mini",
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://portal.azure.com/",
    timeouts: { generateMs: 30_000, streamMs: 120_000 },
    autoSelectPriority: 8,
    apiKeyFormatPattern: API_KEY_FORMATS.azure,
  },
  {
    name: AIProviderName.GOOGLE_AI,
    aliases: ["googleAiStudio", "google", "gemini", "google-ai-studio"],
    credentialsKey: "googleAiStudio",
    envVars: {
      apiKey: "GOOGLE_AI_API_KEY",
      fallbacks: ["GOOGLE_GENERATIVE_AI_API_KEY"],
      baseURL: "GOOGLE_AI_BASE_URL",
    },
    defaultModel: GoogleAIModels.GEMINI_2_5_FLASH,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://aistudio.google.com/apikey",
    timeouts: { generateMs: 30_000, streamMs: 120_000 },
    autoSelectPriority: 4,
    apiKeyFormatPattern: API_KEY_FORMATS["google-ai"],
  },
  {
    name: AIProviderName.HUGGINGFACE,
    aliases: ["hf"],
    credentialsKey: "huggingFace",
    envVars: {
      // Only HF_TOKEN is an actual accepted fallback — confirmed against
      // createHuggingFaceConfig() in providerConfig.ts, which is the only
      // place the huggingFace/client.ts provider resolves its key from.
      // The plan snippet additionally listed HUGGINGFACE_API_TOKEN and
      // HF_API_TOKEN, but neither is read anywhere in the codebase; removed.
      apiKey: "HUGGINGFACE_API_KEY",
      fallbacks: ["HF_TOKEN"],
      baseURL: "HUGGINGFACE_BASE_URL",
      model: "HUGGINGFACE_MODEL",
    },
    defaultModel: HuggingFaceModels.QWEN_2_5_72B_INSTRUCT,
    toolSupport: "model-dependent",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://huggingface.co/settings/tokens",
    timeouts: { generateMs: 120_000, streamMs: 120_000 },
    autoSelectPriority: 10,
    apiKeyFormatPattern: API_KEY_FORMATS.huggingface,
  },
  {
    name: AIProviderName.OLLAMA,
    aliases: ["local"],
    credentialsKey: "ollama",
    envVars: {
      baseURL: "OLLAMA_BASE_URL",
      baseURLFallbacks: ["OLLAMA_API_BASE"],
      model: "OLLAMA_MODEL",
      optional: true,
    },
    defaultModel: OllamaModels.LLAMA3_2_LATEST,
    toolSupport: "model-dependent",
    localRuntime: true,
    healthCheck: "models-probe",
    setupUrl: "https://ollama.com/download",
    timeouts: { generateMs: 300_000, streamMs: 120_000 },
    autoSelectPriority: 2,
  },
  {
    name: AIProviderName.MISTRAL,
    aliases: [],
    credentialsKey: "mistral",
    envVars: { apiKey: "MISTRAL_API_KEY", baseURL: "MISTRAL_BASE_URL" },
    defaultModel: MistralModels.MISTRAL_LARGE_LATEST,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://console.mistral.ai/api-keys",
    timeouts: { generateMs: 45_000, streamMs: 120_000 },
    autoSelectPriority: 9,
    apiKeyFormatPattern: API_KEY_FORMATS.mistral,
  },
  {
    name: AIProviderName.LITELLM,
    aliases: [],
    credentialsKey: "litellm",
    envVars: {
      apiKey: "LITELLM_API_KEY",
      baseURL: "LITELLM_BASE_URL",
      model: "LITELLM_MODEL",
      optional: true,
    },
    defaultModel: LiteLLMModels.OPENAI_GPT_4O_MINI,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "models-probe",
    setupUrl: "https://docs.litellm.ai/docs/proxy/quick_start",
    timeouts: { generateMs: 300_000, streamMs: 120_000 },
    autoSelectPriority: 1,
    // Documented zero-config local proxy — see field JSDoc.
    credentialsResolvedExternally: true,
  },
  {
    name: AIProviderName.SAGEMAKER,
    aliases: ["aws-sagemaker"],
    credentialsKey: "sagemaker",
    envVars: {
      apiKey: "AWS_ACCESS_KEY_ID",
      extraRequired: ["AWS_SECRET_ACCESS_KEY"],
      model: "SAGEMAKER_MODEL",
      modelFallbacks: [
        "SAGEMAKER_MODEL_NAME",
        "SAGEMAKER_DEFAULT_ENDPOINT",
        "SAGEMAKER_ENDPOINT_NAME",
      ],
      baseURL: "SAGEMAKER_ENDPOINT",
    },
    defaultModel: "sagemaker-model",
    toolSupport: "native",
    localRuntime: false,
    // Deliberate: SageMaker has no models-list endpoint, so a live
    // minimal generate() call is the only real reachability check
    // (mirrors providerUtils.isProviderAvailable()'s legacy fallback).
    healthCheck: "live-generate",
    setupUrl: "https://console.aws.amazon.com/iam/",
    apiKeyFormatPattern: API_KEY_FORMATS.aws,
  },
  {
    name: AIProviderName.DEEPSEEK,
    aliases: ["ds"],
    credentialsKey: "deepseek",
    envVars: {
      apiKey: "DEEPSEEK_API_KEY",
      baseURL: "DEEPSEEK_BASE_URL",
      model: "DEEPSEEK_MODEL",
    },
    defaultModel: DeepSeekModels.DEEPSEEK_CHAT,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    name: AIProviderName.NVIDIA_NIM,
    aliases: ["nvidia", "nim"],
    credentialsKey: "nvidiaNim",
    envVars: {
      apiKey: "NVIDIA_NIM_API_KEY",
      baseURL: "NVIDIA_NIM_BASE_URL",
      model: "NVIDIA_NIM_MODEL",
    },
    defaultModel: NvidiaNimModels.LLAMA_3_3_70B_INSTRUCT,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://build.nvidia.com/settings/api-keys",
  },
  {
    name: AIProviderName.LM_STUDIO,
    aliases: ["lmstudio", "lms"],
    credentialsKey: "lmStudio",
    envVars: {
      baseURL: "LM_STUDIO_BASE_URL",
      model: "LM_STUDIO_MODEL",
      optional: true,
    },
    defaultModel: "",
    toolSupport: "native",
    localRuntime: true,
    healthCheck: "env-only",
    setupUrl: "https://lmstudio.ai/",
  },
  {
    name: AIProviderName.LLAMACPP,
    aliases: ["llama.cpp", "llama-cpp"],
    credentialsKey: "llamacpp",
    envVars: {
      baseURL: "LLAMACPP_BASE_URL",
      model: "LLAMACPP_MODEL",
      optional: true,
    },
    defaultModel: "",
    toolSupport: "native",
    localRuntime: true,
    healthCheck: "env-only",
    setupUrl: "https://github.com/ggerganov/llama.cpp",
  },
  {
    name: AIProviderName.XAI,
    aliases: ["grok"],
    credentialsKey: "xai",
    envVars: {
      apiKey: "XAI_API_KEY",
      baseURL: "XAI_BASE_URL",
      model: "XAI_MODEL",
    },
    defaultModel: XaiModels.GROK_3,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://console.x.ai/",
  },
  {
    name: AIProviderName.GROQ,
    aliases: [],
    credentialsKey: "groq",
    envVars: {
      apiKey: "GROQ_API_KEY",
      baseURL: "GROQ_BASE_URL",
      model: "GROQ_MODEL",
    },
    defaultModel: GroqModels.LLAMA_3_3_70B_VERSATILE,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://console.groq.com/keys",
  },
  {
    name: AIProviderName.COHERE,
    aliases: [],
    credentialsKey: "cohere",
    envVars: {
      apiKey: "COHERE_API_KEY",
      baseURL: "COHERE_BASE_URL",
      model: "COHERE_MODEL",
    },
    defaultModel: CohereModels.COMMAND_R_PLUS,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://dashboard.cohere.com/api-keys",
  },
  {
    name: AIProviderName.TOGETHER_AI,
    aliases: ["together"],
    credentialsKey: "together",
    envVars: {
      apiKey: "TOGETHER_API_KEY",
      baseURL: "TOGETHER_BASE_URL",
      model: "TOGETHER_MODEL",
    },
    defaultModel: TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://api.together.xyz/settings/api-keys",
  },
  {
    name: AIProviderName.FIREWORKS,
    aliases: [],
    credentialsKey: "fireworks",
    envVars: {
      apiKey: "FIREWORKS_API_KEY",
      baseURL: "FIREWORKS_BASE_URL",
      model: "FIREWORKS_MODEL",
    },
    defaultModel: FireworksModels.DEEPSEEK_V4_PRO,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://fireworks.ai/account/api-keys",
  },
  {
    name: AIProviderName.PERPLEXITY,
    aliases: ["pplx"],
    credentialsKey: "perplexity",
    envVars: {
      apiKey: "PERPLEXITY_API_KEY",
      baseURL: "PERPLEXITY_BASE_URL",
      model: "PERPLEXITY_MODEL",
    },
    defaultModel: PerplexityModels.SONAR,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://www.perplexity.ai/settings/api",
  },
  {
    name: AIProviderName.CLOUDFLARE,
    aliases: ["workers-ai", "cf-ai"],
    credentialsKey: "cloudflare",
    envVars: {
      apiKey: "CLOUDFLARE_API_KEY",
      extraRequired: ["CLOUDFLARE_ACCOUNT_ID"],
      model: "CLOUDFLARE_MODEL",
    },
    defaultModel: CloudflareModels.LLAMA_3_3_70B_FAST,
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://dash.cloudflare.com/profile/api-tokens",
  },
  {
    name: AIProviderName.REPLICATE,
    aliases: [],
    credentialsKey: "replicate",
    // NOTE: Replicate's NeurolinkCredentials shape uses non-standard field
    // names (apiToken not apiKey, baseUrl not baseURL) — envVars below
    // still describes the *environment variable* names, which follow the
    // usual convention; only the credentials object's field names differ.
    envVars: { apiKey: "REPLICATE_API_TOKEN", model: "REPLICATE_MODEL" },
    defaultModel: ReplicateModels.LLAMA_3_70B_INSTRUCT,
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://replicate.com/account/api-tokens",
  },
  {
    name: AIProviderName.VOYAGE,
    aliases: ["voyage-ai"],
    credentialsKey: "voyage",
    envVars: {
      apiKey: "VOYAGE_API_KEY",
      baseURL: "VOYAGE_BASE_URL",
      model: "VOYAGE_MODEL",
    },
    defaultModel: VoyageModels.VOYAGE_3_5,
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://dash.voyageai.com/api-keys",
  },
  {
    name: AIProviderName.JINA,
    aliases: ["jina-ai"],
    credentialsKey: "jina",
    envVars: {
      apiKey: "JINA_API_KEY",
      baseURL: "JINA_BASE_URL",
      model: "JINA_MODEL",
    },
    defaultModel: JinaModels.JINA_EMBEDDINGS_V3,
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://jina.ai/?sui=apikey",
  },
  {
    name: AIProviderName.STABILITY,
    aliases: ["stability-ai", "sd"],
    credentialsKey: "stability",
    envVars: {
      apiKey: "STABILITY_API_KEY",
      baseURL: "STABILITY_BASE_URL",
      model: "STABILITY_MODEL",
    },
    defaultModel: StabilityModels.STABLE_IMAGE_ULTRA,
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://platform.stability.ai/account/keys",
  },
  {
    name: AIProviderName.IDEOGRAM,
    aliases: [],
    credentialsKey: "ideogram",
    envVars: {
      apiKey: "IDEOGRAM_API_KEY",
      baseURL: "IDEOGRAM_BASE_URL",
      model: "IDEOGRAM_MODEL",
    },
    defaultModel: IdeogramModels.IDEOGRAM_V3,
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://developer.ideogram.ai/",
  },
  {
    name: AIProviderName.RECRAFT,
    aliases: [],
    credentialsKey: "recraft",
    envVars: {
      apiKey: "RECRAFT_API_KEY",
      baseURL: "RECRAFT_BASE_URL",
      model: "RECRAFT_MODEL",
    },
    defaultModel: RecraftModels.RECRAFT_V3,
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: "https://www.recraft.ai/api",
  },
];

/** O(1) canonical-name → descriptor lookup. */
export const PROVIDER_DESCRIPTORS_BY_NAME: ReadonlyMap<
  AIProviderName,
  ProviderDescriptor
> = new Map(PROVIDER_DESCRIPTORS.map((d) => [d.name, d]));

/**
 * O(1) alias → canonical-name lookup, covering both `aliases` and each
 * descriptor's own lowercased `name`. Replaces the O(n) linear scan in
 * ProviderFactory.normalizeProviderName().
 */
export const PROVIDER_ALIAS_INDEX: ReadonlyMap<string, AIProviderName> =
  new Map(
    PROVIDER_DESCRIPTORS.flatMap((d) => [
      [d.name.toLowerCase(), d.name] as const,
      ...d.aliases.map((alias) => [alias.toLowerCase(), d.name] as const),
    ]),
  );
