import { AIProviderName } from "../constants/enums.js";
import {
  GoogleAIModels,
  OpenAIModels,
  AnthropicModels,
  VertexModels,
  OllamaModels,
  LiteLLMModels,
  NvidiaNimModels,
  OpenRouterModels,
  CohereModels,
  VoyageModels,
  TypeSafeModels,
  LayaModels,
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
  NeurolinkCredentials,
  ProviderDescriptor,
  ProviderCatalogJson,
} from "../types/index.js";
import { DEFAULT_INFERENCE_KINDS } from "../types/index.js";

/**
 * Hand-maintained provider identity, credentials, defaults, and runtime
 * behavior classification for every provider EXCEPT the JSON-catalog
 * providers derived by buildCatalogDescriptors() below (see that
 * function's own doc). Pure data — no provider-class imports, no dynamic
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
  // HuggingFace migrated to the JSON catalog (catalog/huggingface.json) —
  // its descriptor is now derived by buildCatalogDescriptors() below.
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
  // Mistral migrated to the JSON catalog (catalog/mistral.json, which now
  // carries timeouts/autoSelectPriority/apiKeyFormat/setup.url matching
  // this removed block exactly) — its descriptor is derived by
  // buildCatalogDescriptors() below like deepseek's.
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
  // DeepSeek migrated to the JSON catalog (catalog/deepseek.json) — its
  // descriptor is now derived by buildCatalogDescriptors() below, with no
  // exclusion needed (unlike mistral): every field it derives matches this
  // block byte-for-byte (credentialsKey, envVars, defaultModel, toolSupport,
  // setupUrl), so removing the hand entry changes nothing observable.
  {
    name: AIProviderName.NVIDIA_NIM,
    aliases: ["nvidia", "nim"],
    credentialsKey: "nvidiaNim",
    envVars: {
      apiKey: "NVIDIA_NIM_API_KEY",
      baseURL: "NVIDIA_NIM_BASE_URL",
      model: "NVIDIA_NIM_MODEL",
    },
    defaultModel: NvidiaNimModels.GPT_OSS_20B,
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
  {
    name: AIProviderName.TYPESAFE,
    aliases: ["jev", "typesafe-ai"],
    credentialsKey: "typesafe",
    envVars: {
      apiKey: "TYPESAFE_API_KEY",
      // A Vercel AI Gateway key reaches the same model through a different
      // transport, so it satisfies this provider on its own. Listing it here
      // is what makes `resolveDefaultDecisionProvider()` — and therefore
      // "if somebody sets the key, we start using it" — true for gateway
      // users who never hold a TypeSafe key at all.
      fallbacks: ["AI_GATEWAY_API_KEY"],
      baseURL: "TYPESAFE_BASE_URL",
      model: "TYPESAFE_MODEL",
    },
    defaultModel: TypeSafeModels.JEV_LATEST,
    // Jev serves only the `decide` inference type. Declaring that here is
    // what keeps it out of every generation code path, rather than each of
    // those having to special-case the provider name.
    inferenceKinds: ["decide"],
    // It emits no text, so it cannot call tools and cannot answer a
    // "live-generate" health probe.
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    // Deliberately NO autoSelectPriority / autoSelectPreference /
    // defaultHealthSweepPriority: all three feed generation fallback chains,
    // and a text-less provider must never be reachable from them.
    timeouts: { decideMs: 5000 },
    setupUrl: "https://console.typesafe.ai/keys",
  },
  // Laya MUST stay after TypeSafe. resolveDefaultDecisionProvider() returns
  // the first configured DECISION_PROVIDERS entry, in this order, so a host
  // configured for both keeps Jev for every built-in consumer and reaches
  // Laya only by naming it. Reordering these two silently changes which model
  // routes, compacts and plans for every such host.
  {
    name: AIProviderName.LAYA,
    aliases: [],
    credentialsKey: "laya",
    envVars: {
      apiKey: "LAYA_API_KEY",
      baseURL: "LAYA_BASE_URL",
      // Laya has no built-in endpoint (it is self-hosted or behind a proxy),
      // so a key is useless without a base URL. Both are required for it to
      // count as configured, from the environment or credentials.laya.
      extraRequired: ["LAYA_BASE_URL"],
      model: "LAYA_MODEL",
    },
    defaultModel: LayaModels.TYPED_DECISIONS,
    // Serves only `decide`, like TypeSafe — the one declaration that keeps it
    // out of every generation code path.
    inferenceKinds: ["decide"],
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    // Deliberately NO autoSelectPriority / autoSelectPreference /
    // defaultHealthSweepPriority, for the same reason as TypeSafe above.
    timeouts: { decideMs: 5000 },
    // Laya's encoders cut the state off silently past their window (measured
    // live: a 60,000-character state answered 200 on 1,024 tokens). 768 is
    // the 1,024-token window minus the 256-token budget Laya reserves for a
    // question and its options; 320 is the English checkpoint's 512 minus
    // 192. `auto` may route to English, and an unlisted name (Laya's server
    // accepts aliases such as `en`) could be any checkpoint, so both get 320.
    // 64 is the question cap in Laya's own server. Non-ASCII rates were
    // measured live: Chinese is ~1.4 tokens per character on the English
    // tokenizer (typed-decisions, english) and ~0.56 on multilingual.
    decisionLimits: {
      maxStateTokens: 320,
      maxQuestions: 64,
      nonAsciiTokensPerChar: 1.5,
      models: {
        "typed-decisions": { maxStateTokens: 768 },
        multilingual: { maxStateTokens: 768, nonAsciiTokensPerChar: 0.6 },
        english: { maxStateTokens: 320 },
        auto: { maxStateTokens: 320 },
      },
    },
    setupUrl: "https://github.com/NandhaKishorM/laya",
  },
];

/**
 * Builds a ProviderDescriptor for every JSON-catalog provider. Every field
 * is derived from the catalog JSON (src/lib/providers/catalog/<id>.json),
 * never hand-typed.
 *
 * defaultModel prefers models.registryDefaultModel over models.default —
 * only mistral sets registryDefaultModel today (its long-shipped descriptor's
 * defaultModel was MISTRAL_LARGE_LATEST, while models.default is the smaller
 * mistral-small-2506 the OpenAI-compat runtime path actually defaults to via
 * MISTRAL_MODEL); every other provider's registryDefaultModel is absent, so
 * `?? entry.models.default` is a no-op for them.
 *
 * timeouts and autoSelectPriority are included only when the JSON sets
 * them — today only mistral does, preserving its pre-migration hand-typed
 * values.
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
  const fallbacks = entry.wire.apiKeyFallbackEnvVars?.length
    ? { fallbacks: [...entry.wire.apiKeyFallbackEnvVars] }
    : {};
  const envVars: ProviderDescriptor["envVars"] = entry.wire.baseURLTemplate
    ? {
        apiKey: catalogEnvVar(entry, "apiKey"),
        ...fallbacks,
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
        ...fallbacks,
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
    defaultModel: entry.models.registryDefaultModel ?? entry.models.default,
    // "none" (not an invented literal — it's the union's own
    // no-tool-support member, the same one
    // REPLICATE/VOYAGE/JINA/STABILITY/IDEOGRAM/RECRAFT use above) is
    // mancer's branch; "model-dependent" is huggingface's (matches
    // ProviderDescriptor.toolSupport's own union member, same value
    // Ollama's hand descriptor already uses).
    toolSupport:
      entry.capabilities.tools === "model-dependent"
        ? "model-dependent"
        : entry.capabilities.tools
          ? "native"
          : "none",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: entry.setup.url,
    ...(entry.setup.apiKeyFormat
      ? { apiKeyFormatPattern: new RegExp(entry.setup.apiKeyFormat) }
      : {}),
    ...(entry.timeouts ? { timeouts: entry.timeouts } : {}),
    ...(entry.autoSelectPriority !== undefined
      ? { autoSelectPriority: entry.autoSelectPriority }
      : {}),
  };
}

function buildCatalogDescriptors(): ProviderDescriptor[] {
  return getCatalogJsonEntries().map(buildCatalogDescriptor);
}

/**
 * Single source of truth for provider identity, credentials, defaults, and
 * runtime behavior classification — the hand-maintained providers plus the
 * JSON-catalog providers derived above.
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

/**
 * Providers that serve the `decide` inference type, derived from each
 * descriptor's `inferenceKinds`. A provider that declares nothing is a text
 * provider, so it is not here.
 */
export const DECISION_PROVIDERS: readonly ProviderDescriptor[] =
  PROVIDER_DESCRIPTORS.filter((d) =>
    (d.inferenceKinds ?? DEFAULT_INFERENCE_KINDS).includes("decide"),
  );

/**
 * Whether a decision provider is fully configured: its key and every
 * extraRequired variable are set, each either in the environment or in
 * `credentials` — the same config a caller passes to
 * `new NeuroLink({ credentials })` or per call. Whitespace counts as unset.
 */
function isDecisionProviderConfigured(
  descriptor: ProviderDescriptor,
  credentials: NeurolinkCredentials | undefined,
): boolean {
  const isSet = (value: unknown): boolean =>
    typeof value === "string" && value.trim() !== "";
  const inEnv = (name: string | undefined): boolean =>
    name !== undefined && isSet(process.env[name]);
  const slice = descriptor.credentialsKey
    ? (credentials as Record<string, Record<string, unknown> | undefined>)?.[
        descriptor.credentialsKey
      ]
    : undefined;

  // `gatewayApiKey` is TypeSafe's config form of AI_GATEWAY_API_KEY.
  const hasKey =
    [descriptor.envVars.apiKey, ...(descriptor.envVars.fallbacks ?? [])].some(
      inEnv,
    ) ||
    isSet(slice?.apiKey) ||
    isSet(slice?.gatewayApiKey);
  // A required base URL can also come from credentials.<key>.baseURL.
  const hasRequired = (descriptor.envVars.extraRequired ?? []).every(
    (name) =>
      inEnv(name) ||
      (name === descriptor.envVars.baseURL && isSet(slice?.baseURL)),
  );
  return hasKey && hasRequired;
}

/**
 * The decision provider to use when a caller names none: the first
 * DECISION_PROVIDERS entry that is fully configured, from the environment or
 * from `credentials`.
 *
 * This is where "if somebody configures it, we start using it" is
 * implemented. Returns undefined when none is configured, which every
 * internal consumer treats as "carry on exactly as before".
 */
export function resolveDefaultDecisionProvider(
  credentials?: NeurolinkCredentials,
): string | undefined {
  return DECISION_PROVIDERS.find((descriptor) =>
    isDecisionProviderConfigured(descriptor, credentials),
  )?.name;
}

/**
 * The variables that would configure each decision provider, one clause per
 * provider in precedence order, e.g. "TYPESAFE_API_KEY or AI_GATEWAY_API_KEY
 * for typesafe, or LAYA_API_KEY and LAYA_BASE_URL for laya". Derived from
 * DECISION_PROVIDERS so a new decision provider appears in every "nothing is
 * configured" message without anyone editing one.
 */
export function describeDecisionProviderKeys(): string {
  return DECISION_PROVIDERS.map((descriptor) => {
    const keys = [
      descriptor.envVars.apiKey,
      ...(descriptor.envVars.fallbacks ?? []),
    ].filter((name): name is string => typeof name === "string" && name !== "");
    const required = descriptor.envVars.extraRequired ?? [];
    return `${[keys.join(" or "), ...required].join(" and ")} for ${descriptor.name}`;
  }).join(", or ");
}
