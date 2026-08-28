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
  CohereModels,
  VoyageModels,
  JinaModels,
  StabilityModels,
  IdeogramModels,
  RecraftModels,
  ReplicateModels,
} from "../constants/enums.js";
import { API_KEY_FORMATS } from "../utils/providerConfig.js";
import {
  getCatalogJsonEntries,
  catalogCredentialsKey,
  catalogEnvVar,
} from "../providers/catalog/loader.js";
import type {
  ProviderDescriptor,
  ProviderCatalogJson,
} from "../types/index.js";

/**
 * Hand-maintained provider identity, credentials, defaults, and runtime
 * behavior classification for every provider EXCEPT the 8 JSON-catalog
 * providers derived by buildCatalogDescriptors() below (see
 * PROVIDER_DESCRIPTORS's own doc for why Mistral, a 9th catalog provider,
 * stays here too). Pure data — no provider-class imports, no dynamic
 * import(), no side effects beyond building the two derived lookup maps
 * below. Order follows the AIProviderName enum declaration order
 * (enums.ts:8-40) so this file stays easy to diff against it.
 */
const HAND_DESCRIPTORS: readonly ProviderDescriptor[] = [
  {
    name: AIProviderName.BEDROCK,
    defaultHealthSweepPriority: 5,
    autoSelectPreference: 7,
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
    defaultHealthSweepPriority: 4,
    autoSelectPreference: 3,
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
    defaultHealthSweepPriority: 1,
    autoSelectPreference: 5,
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
    defaultHealthSweepPriority: 3,
    autoSelectPreference: 4,
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
    defaultHealthSweepPriority: 6,
    autoSelectPreference: 8,
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
    defaultHealthSweepPriority: 2,
    autoSelectPreference: 6,
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
    defaultHealthSweepPriority: 8,
    autoSelectPreference: 2,
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
    defaultHealthSweepPriority: 7,
    autoSelectPreference: 1,
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

/**
 * Builds ProviderDescriptor entries for 8 of the 9 JSON-catalog providers —
 * cerebras, cloudflare, fireworks, groq, perplexity, sambanova, together-ai,
 * xai. Every field is derived from the catalog JSON
 * (src/lib/providers/catalog/<id>.json), never hand-typed.
 *
 * Mistral is the 9th catalog provider but is deliberately excluded here and
 * stays in HAND_DESCRIPTORS above: its JSON setup.url
 * ("https://console.mistral.ai/") diverges from the long-shipped descriptor
 * setupUrl ("https://console.mistral.ai/api-keys" — a real value conflict,
 * not missing enrichment), its envVars has no `model` key the JSON would
 * otherwise add, and it carries 3 fields (timeouts, autoSelectPriority,
 * apiKeyFormatPattern) no JSON field produces. Deriving it would either
 * silently change setupUrl or require as many per-field overrides as the
 * hand entry itself — so it is left alone.
 */
function buildCatalogDescriptor(
  entry: ProviderCatalogJson,
): ProviderDescriptor {
  // Cloudflare is the only catalog provider whose wire config is a
  // baseURLTemplate + extra credential (accountId) rather than a plain
  // baseURL env var — mirrors loader.ts's buildCatalogEntries()
  // computedBaseURL.envVar formula exactly. Duplicated intentionally, the
  // same way loader.ts itself duplicates toCamelCase from
  // tools/codegen-catalog.ts (src/ must not import from tools/).
  const envVars: ProviderDescriptor["envVars"] = entry.wire.baseURLTemplate
    ? {
        apiKey: catalogEnvVar(entry, "apiKey"),
        extraRequired: [
          `${entry.id.toUpperCase().replace(/-/g, "_")}_${(
            entry.wire.extraCredentials?.[0] ?? "accountId"
          )
            .replace(/([A-Z])/g, "_$1")
            .toUpperCase()}`,
        ],
        model: catalogEnvVar(entry, "model"),
      }
    : {
        apiKey: catalogEnvVar(entry, "apiKey"),
        baseURL: catalogEnvVar(entry, "baseURL"),
        model: catalogEnvVar(entry, "model"),
      };
  return {
    name: entry.id as AIProviderName,
    aliases: entry.aliases,
    credentialsKey: catalogCredentialsKey(
      entry,
    ) as ProviderDescriptor["credentialsKey"],
    envVars,
    defaultModel: entry.models.default,
    // All 9 catalog providers currently have capabilities.tools: true, so
    // this is runtime-identical today either way. "none" (not an invented
    // literal — it's the union's own no-tool-support member, the same one
    // REPLICATE/VOYAGE/JINA/STABILITY/IDEOGRAM/RECRAFT use above) is the
    // correct false-branch if a future catalog provider ships tools: false.
    toolSupport: entry.capabilities.tools ? "native" : "none",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: entry.setup.url,
    ...(entry.setup.apiKeyFormat
      ? { apiKeyFormatPattern: new RegExp(entry.setup.apiKeyFormat) }
      : {}),
  };
}

function buildCatalogDescriptors(): ProviderDescriptor[] {
  return getCatalogJsonEntries()
    .filter((entry) => entry.id !== "mistral")
    .map(buildCatalogDescriptor);
}

/**
 * Single source of truth for provider identity, credentials, defaults, and
 * runtime behavior classification — the hand-maintained providers plus the
 * 8 JSON-catalog providers derived above.
 */
export const PROVIDER_DESCRIPTORS: readonly ProviderDescriptor[] = [
  ...HAND_DESCRIPTORS,
  ...buildCatalogDescriptors(),
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
