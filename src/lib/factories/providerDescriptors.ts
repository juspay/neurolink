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
  PerplexityDeciderModels,
  CloudflareClefModels,
  JinaModels,
  StabilityModels,
  IdeogramModels,
  RecraftModels,
  ReplicateModels,
} from "../constants/enums.js";
import { API_KEY_FORMATS } from "../utils/providerConfig.js";
import {
  getCatalogJsonEntries,
  getDecideCatalogEntries,
  catalogCredentialsKey,
  catalogEnvVar,
} from "../providers/catalog/loader.js";
import type {
  DecideCatalogJson,
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
    decideOrder: 1,
    // It emits no text, so it cannot call tools and cannot answer a
    // "live-generate" health probe.
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    // Deliberately NO autoSelectPriority / autoSelectPreference /
    // defaultHealthSweepPriority: all three feed generation fallback chains,
    // and a text-less provider must never be reachable from them.
    timeouts: { decideMs: 5000 },
    // ADVISORY, not enforced: Jev's server refuses an over-limit request
    // itself (measured by bisection — a 33,002-token state accepted, 33,003
    // rejected), so this row exists for `decisionLimits()` to report, and the
    // pre-flight check skips it. Refusing locally would turn a measured server
    // ceiling into a client one that drifts from it silently. The number
    // mirrors TYPESAFE_MAX_STATE_TOKENS in providers/typesafe.ts (which
    // cannot be imported here without a provider → descriptor cycle); the
    // decide suite pins the two equal. No question COUNT cap has been
    // measured — 400 questions beside a near-ceiling state were accepted —
    // because TypeSafe bounds a request by tokens (TYPESAFE_MAX_REQUEST_TOKENS,
    // 64K on state plus all questions), not by count.
    decisionLimits: {
      maxStateTokens: 33_000,
      advisory: true,
    },
    setupUrl: "https://console.typesafe.ai/keys",
  },
  // Decision precedence is decideOrder, not position: typesafe 1, laya 2 and
  // xor 3 (from catalog/laya.json and catalog/xor.json), subq 4 (from
  // catalog/subq.json), perplexity-decider 5, cloudflare-clef 6,
  // openai-decisions 7 (catalog/openai-decisions.json) and scaledown 8
  // (catalog/scaledown.json).
  // resolveDefaultDecisionProvider() returns the first configured
  // DECISION_PROVIDERS entry in that order, so a host configured for several
  // keeps Jev for every built-in consumer and reaches the others only by
  // naming them. Renumbering silently changes which model routes, compacts
  // and plans for every such host.
  // perplexity-decider, cloudflare-clef and openai-decisions come after subq
  // because each shares its environment key with a text provider: a key set only
  // for that text provider must not displace a decision provider a host set up on
  // purpose. subq is ahead of them only because SUBQ_API_KEY belongs to no other
  // provider. scaledown is last by the owner's decision of 2026-10-15, not by
  // that rule: SCALEDOWN_API_KEY belongs to no other provider either, so an
  // ambient OPENAI_API_KEY, PERPLEXITY_API_KEY or Cloudflare pair outranks a
  // ScaleDown key a host set on purpose, and ScaleDown is reached by naming it.
  {
    name: AIProviderName.PERPLEXITY_DECIDER,
    aliases: [],
    credentialsKey: "perplexityDecider",
    envVars: {
      // The same key the `perplexity` text provider reads, so an ambient
      // PERPLEXITY_API_KEY configures this provider too. Its decideOrder (5)
      // sits after XOR's (3) and SubQ's (4), which have keys of their own, which
      // is what keeps that from displacing any other decision provider a host
      // has configured.
      apiKey: "PERPLEXITY_API_KEY",
      // Optional: the API is hosted at a public endpoint, so a key alone is
      // enough and there is no extraRequired.
      baseURL: "PERPLEXITY_DECIDER_BASE_URL",
      model: "PERPLEXITY_DECIDER_MODEL",
    },
    defaultModel: PerplexityDeciderModels.PPLX_DECIDER_V1_27B,
    // Serves only `decide`, like the other decision providers — the one
    // declaration that keeps it out of every generation code path, and out of
    // the way of the `perplexity` text provider.
    inferenceKinds: ["decide"],
    decideOrder: 5,
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    // Deliberately NO autoSelectPriority / autoSelectPreference /
    // defaultHealthSweepPriority, for the same reason as TypeSafe above.
    //
    // Measured live: 4s at 65,000 input tokens, 10s at 146,000 and 23s at
    // 251,000 (faster than linear: about 17,000, 15,000 and 11,000 tokens a
    // second), plus about 65 ms for each question after the first (128 minimal
    // questions took 8.9s). 10s is the allowance for the state and covers every
    // one the window below admits except log text or number arrays close to it;
    // the provider adds 100 ms a question on top, so a request at the
    // 128-question cap waits about 22.8s. A larger state passes a per-call
    // `timeoutMs`.
    timeouts: { decideMs: 10_000 },
    // The server reads 262,144 input tokens in all and answers an over-long
    // request with an explicit 400, never a silent truncation. The state, the
    // questions and the images were all measured to count toward it, an image at
    // one token for each 32 x 32 tile. The window below is deliberately lower: a
    // state of 100,000 tokens takes about 7s of the 10s above (interpolated from
    // those points), and a much larger one would outlast it and be retried into
    // the same wait. The estimate is about four characters per token. Measured
    // on 40,000-character samples: English prose 4.3, TypeScript 3.8, a minified
    // JSON catalog 3.4, log lines with timestamps and ids 1.35 and arrays of
    // numbers 1.2. Only the last two run low enough to pass the window and still
    // be refused by the server; JSON is under-counted by about 13%. A request
    // over the window fails locally as max_tokens_exceeded, which every consumer
    // treats as "carry on as before". 128 questions is the documented cap,
    // confirmed live.
    // Non-ASCII text is charged at the measured rate for CJK (0.46 tokens per
    // code point) and Devanagari (0.44), not for emoji (2.6), because an
    // over-charge silently shuts every non-Latin caller out while an
    // under-charge is caught by that 400.
    decisionLimits: {
      maxStateTokens: 100_000,
      maxQuestions: 128,
      nonAsciiTokensPerChar: 0.5,
      // Images only; the API has no video input. A ninth image in one request
      // is refused with a 400, and the 32 MiB body is the documented cap.
      media: { maxImages: 8, video: false, maxRequestBytes: 32 * 1024 * 1024 },
    },
    setupUrl: "https://console.perplexity.ai",
  },
  {
    name: AIProviderName.CLOUDFLARE_CLEF,
    aliases: [],
    credentialsKey: "cloudflareClef",
    envVars: {
      // The same token and account id the `cloudflare` text provider reads, so
      // ambient Workers AI settings configure this provider too. Its place in
      // the decision order (see the comment above) keeps that from displacing
      // TypeSafe, Laya, XOR or SubQ.
      apiKey: "CLOUDFLARE_API_KEY",
      // Cloudflare's own API is the endpoint, so a base URL is optional; but
      // the path carries the account id, so a token alone is useless. Both are
      // required for it to count as configured, from the environment or from
      // credentials.cloudflareClef.
      extraRequired: ["CLOUDFLARE_ACCOUNT_ID"],
      extraRequiredCredentialFields: { CLOUDFLARE_ACCOUNT_ID: "accountId" },
      baseURL: "CLOUDFLARE_CLEF_BASE_URL",
      model: "CLOUDFLARE_CLEF_MODEL",
    },
    defaultModel: CloudflareClefModels.CLEF,
    // Serves only `decide`, like the other decision providers — the one
    // declaration that keeps it out of every generation code path, and out of
    // the way of the `cloudflare` text provider.
    inferenceKinds: ["decide"],
    decideOrder: 6,
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    // Deliberately NO autoSelectPriority / autoSelectPreference /
    // defaultHealthSweepPriority, for the same reason as TypeSafe above.
    //
    // Measured 2026-10-03: 0.3 to 1.0 s for a small request, 1.1 s for 64 questions on
    // clef-flash and 1.3 s on clef, and 2.2 s at most for any of 60 requests
    // sent at once. On 2026-10-04, 64 questions took 1.5 s (flash) / 2.3 s (clef).
    // 5s covers a small request and keeps a fail-open consumer from waiting on a
    // stuck call. The state adds time, so the provider adds 250 ms for each full
    // 1,000 estimated state tokens (9s at the limit below). Measured 2026-10-07 at
    // about 0.2 s per 1,000 input tokens from 50,000 tokens up on both models
    // (clef-flash 4.9 s at 52,154 tokens, clef 11.8 s, clef-flash 19.2 s at
    // 86,819 and 30.9 s at 158,153), and 1.7 to 1.9 s at 20,954 tokens.
    timeouts: { decideMs: 5_000 },
    // On 2026-10-03 and 2026-10-04 the Workers AI endpoint ignored state text
    // past about 2,048 tokens (hosted service or model: unknown), and the local
    // limit was 1,500. On 2026-10-07 it no longer did: clef-flash read a fact at
    // the very end of a 190,153-token digit array and of an 86,819-token prose
    // state, and clef read a 52,154-token prose state, while clef answered
    // HTTP 529 (code 5012, "Clef inference failed") after 15 s for the digit
    // array. The limit is now 16,000 estimated tokens. The estimate runs 35%
    // over real tokens for prose and 14% under for a digit array, whose commas
    // cost a token each, so the limit is at most about 18,400 real tokens, 2.8
    // times less than the 52,154 clef read in full. It also bounds how long a
    // fail-open consumer can wait (the timeout above). The service changed twice
    // in four days, so live canaries 19.10 and 19.10b read a fact at the end of a
    // state at this limit on both models. Digits cost 1, ASCII symbols 0.75, BMP
    // non-ASCII 1.5 and astral characters 3: the rates now approximate real
    // tokens and no longer stand for a cut.
    // The 2026-10-04 follow-up on the old cut (logs, number lists, digit arrays
    // and compact JSON on both models; natural Chinese, Japanese, Korean and
    // Hindi prose and emoji-rich English on clef; a many-key object) is in the
    // guide; it explains where the rates come from, not what limit applies now.
    decisionLimits: {
      maxStateTokens: 16_000,
      maxQuestions: 64,
      nonAsciiTokensPerChar: 1.5,
      digitTokensPerChar: 1,
      symbolTokensPerChar: 0.75,
      astralTokensPerChar: 3,
      // Images only. Exactly four tiny images succeeded and five were refused
      // on both models. image/jpg also succeeded and is normalized to JPEG.
      // The 256,000-byte cap on the whole encoded body is NeuroLink's own and is
      // the same for both models. It is well below what the service takes with
      // images, since the 413/code 5021 gate does not count them (2026-10-24:
      // bodies of up to 1.17 MB, images included, passed it on clef-flash). It
      // is not below clef-flash's edge for the text: the estimate is the
      // characters of the JSON without `images`, over four, and the refusal is
      // past twice the window the message prints (24,576 for clef-flash, so
      // 196,608 characters; 65,536 for clef, so 524,288). That is checked on the
      // text alone, per model, in cloudflareClef.ts, 1,024 characters short of
      // the edge. A text that large is out of reach of the state limit below
      // except through the questions or control characters, which JSON writes
      // as up to six characters each, so the margin costs a caller nothing.
      // History: on 2026-10-04 both models accepted 520,000 text characters and
      // refused 525,000 with 413/code 5021 (the window was then 65,536 for both).
      // On 2026-10-03, clef-flash accepted 262,000 and refused 270,000. The
      // threshold had moved from 65,527 accepted / 67,527 refused to 130,026 /
      // 131,276 (clef) and 130,027 / 131,277 (flash) in a day, and the window
      // of clef-flash has since fallen to 24,576 (by 2026-10-20), which moved
      // its edge to 196,608. On 2026-10-05 both models accepted PNG bodies up
      // to 492,485 bytes and refused 532,505 (flash) and 532,499 (clef) with the
      // same 413, whose estimate (133,126) was the whole body over four, images
      // included, which they no longer are. The old 195/202 KB boundary is
      // historical. See the guide for exact model and date coverage.
      media: { maxImages: 4, video: false, maxRequestBytes: 256_000 },
    },
    setupUrl: "https://dash.cloudflare.com/profile/api-tokens",
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

/**
 * Builds the ProviderDescriptor of a JSON `decide` provider. It serves only
 * `decide`, so it declares no auto-select, preference or health-sweep rank:
 * those feed generation fallback chains a text-less provider must never join.
 */
export function buildDecideDescriptor(
  entry: DecideCatalogJson,
): ProviderDescriptor {
  const fallbacks = entry.wire.apiKeyFallbackEnvVars?.length
    ? { fallbacks: [...entry.wire.apiKeyFallbackEnvVars] }
    : {};
  return {
    name: entry.id as AIProviderName,
    aliases: entry.aliases,
    credentialsKey: catalogCredentialsKey(
      entry,
    ) as ProviderDescriptor["credentialsKey"],
    envVars: {
      apiKey: catalogEnvVar(entry, "apiKey"),
      ...fallbacks,
      baseURL: catalogEnvVar(entry, "baseURL"),
      // A key is useless without an endpoint when the provider has no built-in one.
      ...(entry.decide.baseURLRequired
        ? { extraRequired: [catalogEnvVar(entry, "baseURL")] }
        : {}),
      model: catalogEnvVar(entry, "model"),
    },
    defaultModel: entry.models.default,
    inferenceKinds: ["decide"],
    decideOrder: entry.decide.order,
    ...(entry.decide.ambientKeyGuard
      ? {
          ambientKeyGuard: {
            baseURLEnvVars: [...entry.decide.ambientKeyGuard.baseURLEnvVars],
            trustedOrigins: [...entry.decide.ambientKeyGuard.trustedOrigins],
            ...(entry.decide.ambientKeyGuard.credentialBaseURLs
              ? {
                  credentialBaseURLs:
                    entry.decide.ambientKeyGuard.credentialBaseURLs.map(
                      (credentialField) => ({ ...credentialField }),
                    ),
                }
              : {}),
          },
        }
      : {}),
    toolSupport: "none",
    localRuntime: false,
    healthCheck: "env-only",
    setupUrl: entry.setup.url,
    ...(entry.setup.apiKeyFormat
      ? { apiKeyFormatPattern: new RegExp(entry.setup.apiKeyFormat) }
      : {}),
    ...(entry.timeouts ? { timeouts: { ...entry.timeouts } } : {}),
    ...(entry.decisionLimits ? { decisionLimits: entry.decisionLimits } : {}),
  };
}

function buildCatalogDescriptors(): ProviderDescriptor[] {
  return [
    ...getCatalogJsonEntries().map(buildCatalogDescriptor),
    ...getDecideCatalogEntries().map(buildDecideDescriptor),
  ];
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

const servesDecide = (descriptor: ProviderDescriptor): boolean =>
  (descriptor.inferenceKinds ?? DEFAULT_INFERENCE_KINDS).includes("decide");

/**
 * Throws unless every descriptor that serves `decide` has its own finite
 * `decideOrder`. The order is the precedence of resolveDefaultDecisionProvider(),
 * so a missing or repeated number would make that choice depend on array position.
 */
export function assertUniqueDecideOrder(
  descriptors: readonly ProviderDescriptor[],
): void {
  const owners = new Map<number, string>();
  for (const descriptor of descriptors.filter(servesDecide)) {
    const order = descriptor.decideOrder;
    if (order === undefined || !Number.isFinite(order)) {
      throw new Error(
        `decision provider "${descriptor.name}" has no usable decideOrder`,
      );
    }
    const clash = owners.get(order);
    if (clash !== undefined) {
      throw new Error(
        `decideOrder ${order} is used by both "${clash}" and "${descriptor.name}"`,
      );
    }
    owners.set(order, descriptor.name);
  }
}

/** The descriptors that serve `decide`, lowest `decideOrder` first. */
export function orderDecisionProviders(
  descriptors: readonly ProviderDescriptor[],
): readonly ProviderDescriptor[] {
  const rank = (d: ProviderDescriptor): number =>
    d.decideOrder ?? Number.MAX_SAFE_INTEGER;
  return descriptors.filter(servesDecide).sort((a, b) => rank(a) - rank(b));
}

assertUniqueDecideOrder(PROVIDER_DESCRIPTORS);

/**
 * Providers that serve the `decide` inference type, derived from each
 * descriptor's `inferenceKinds` and sorted by `decideOrder`, lowest first. A
 * provider that declares nothing is a text provider, so it is not here.
 */
export const DECISION_PROVIDERS: readonly ProviderDescriptor[] =
  orderDecisionProviders(PROVIDER_DESCRIPTORS);

/**
 * The scheme, host and port of a base URL, lower-cased and without the default
 * port, or undefined when the text is not an http(s) URL. The path, query and a
 * trailing slash do not matter, and userinfo is not part of an origin, so
 * `https://api.openai.com@evil.test/v1` reads as `https://evil.test`.
 */
function originOf(text: string): string | undefined {
  try {
    const url = new URL(text.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Whether the guard lets a key found in the environment stand. It does not
 * when a listed base-URL variable, or a listed credentials field, is set to
 * something other than a trusted origin; an unparseable value is untrusted, a
 * blank or absent one is unset. A credentials field that is not text cannot be
 * read as a URL, so it is untrusted too.
 */
function ambientKeyTrusted(
  guard: NonNullable<ProviderDescriptor["ambientKeyGuard"]>,
  credentials: NeurolinkCredentials | undefined,
): boolean {
  const trusted = new Set(
    guard.trustedOrigins
      .map(originOf)
      .filter((origin): origin is string => origin !== undefined),
  );
  const standsFor = (value: unknown): boolean => {
    if (value === undefined || value === null) {
      return true;
    }
    if (typeof value !== "string") {
      return false;
    }
    if (value.trim() === "") {
      return true;
    }
    const origin = originOf(value);
    return origin !== undefined && trusted.has(origin);
  };
  const slices = credentials as
    | Record<string, Record<string, unknown> | undefined>
    | undefined;
  return (
    guard.baseURLEnvVars.every((name) => standsFor(process.env[name])) &&
    (guard.credentialBaseURLs ?? []).every(({ key, field }) =>
      standsFor(slices?.[key]?.[field]),
    )
  );
}

/**
 * Whether a decision provider is fully configured: its key and every
 * extraRequired variable are set, each either in the environment or in
 * `credentials` — the same config a caller passes to
 * `new NeuroLink({ credentials })` or per call. Whitespace counts as unset.
 *
 * A key found only in the environment does not count while the descriptor's
 * `ambientKeyGuard` finds that it belongs to something else, unless the host
 * routed the provider on purpose with its own base-URL variable or a
 * `credentials` base URL. A key in `credentials` always counts.
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

  const routedOnPurpose =
    inEnv(descriptor.envVars.baseURL) || isSet(slice?.baseURL);
  const envKeyStands =
    descriptor.ambientKeyGuard === undefined ||
    routedOnPurpose ||
    ambientKeyTrusted(descriptor.ambientKeyGuard, credentials);
  // `gatewayApiKey` is TypeSafe's config form of AI_GATEWAY_API_KEY.
  const hasKey =
    (envKeyStands &&
      [descriptor.envVars.apiKey, ...(descriptor.envVars.fallbacks ?? [])].some(
        inEnv,
      )) ||
    isSet(slice?.apiKey) ||
    isSet(slice?.gatewayApiKey);
  // A required base URL can also come from credentials.<key>.baseURL, and any
  // other required value the descriptor maps to a field of that slice.
  const hasRequired = (descriptor.envVars.extraRequired ?? []).every((name) => {
    const field = descriptor.envVars.extraRequiredCredentialFields?.[name];
    return (
      inEnv(name) ||
      (name === descriptor.envVars.baseURL && isSet(slice?.baseURL)) ||
      (field !== undefined && isSet(slice?.[field]))
    );
  });
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
 * Names of the decision providers that accept images, or, with `video` or
 * `audio`, the ones that accept that too: a hint that names a provider which
 * would refuse the same request is worse than none.
 */
export function listMediaDecisionProviders(needs?: {
  video?: boolean;
  audio?: boolean;
}): string[] {
  return DECISION_PROVIDERS.filter((descriptor) => {
    const media = descriptor.decisionLimits?.media;
    return (
      media !== undefined &&
      (!needs?.video || media.video) &&
      (!needs?.audio || media.audio !== undefined)
    );
  }).map((descriptor) => descriptor.name);
}

/** "a", "a or b", "a, b or c". */
function listOr(items: readonly string[]): string {
  return items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
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
    const guard = descriptor.ambientKeyGuard;
    const unlessRouted = descriptor.envVars.baseURL
      ? `, unless ${descriptor.envVars.baseURL} is set`
      : "";
    const named = guard
      ? [
          ...guard.baseURLEnvVars,
          ...(guard.credentialBaseURLs ?? []).map(
            ({ key, field }) => `credentials.${key}.${field}`,
          ),
        ]
      : [];
    const caveat = guard
      ? ` (ignored while ${listOr(named)} names a host outside ${listOr(guard.trustedOrigins)}${unlessRouted})`
      : "";
    return `${[keys.join(" or "), ...required].join(" and ")} for ${descriptor.name}${caveat}`;
  }).join(", or ");
}
