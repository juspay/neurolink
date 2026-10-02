// ============================================================================
// ENUMS
// ============================================================================

/**
 * Supported AI Provider Names
 */
export enum AIProviderName {
  BEDROCK = "bedrock",
  OPENAI = "openai",
  OPENAI_COMPATIBLE = "openai-compatible",
  OPENROUTER = "openrouter",
  VERTEX = "vertex",
  ANTHROPIC = "anthropic",
  AZURE = "azure",
  GOOGLE_AI = "google-ai",
  OLLAMA = "ollama",
  LITELLM = "litellm",
  SAGEMAKER = "sagemaker",
  NVIDIA_NIM = "nvidia-nim",
  LM_STUDIO = "lm-studio",
  LLAMACPP = "llamacpp",
  // ── BEGIN GENERATED(provider-members): provider catalog (pnpm run codegen:catalog) ──
  ABOVE_DEV = "above-dev",
  AI21 = "ai21",
  AIAND = "aiand",
  AIONLABS = "aionlabs",
  AMBIENT = "ambient",
  API_ROUTE = "api-route",
  ARCEE = "arcee",
  ATLAS_CLOUD = "atlas-cloud",
  AVIAN_IO = "avian-io",
  BAIDU_QIANFAN = "baidu-qianfan",
  BASETEN = "baseten",
  BEE_HEOSSI = "bee-heossi",
  BYTEPLUS_MODELARK = "byteplus-modelark",
  BYTEZ = "bytez",
  CEREBRAS = "cerebras",
  CHARM_HYPER = "charm-hyper",
  CHUTES = "chutes",
  CLOUDFLARE = "cloudflare",
  CRUSOE = "crusoe",
  DASHSCOPE = "dashscope",
  DEEPINFRA = "deepinfra",
  DEEPSEEK = "deepseek",
  EMPIRIOLABS = "empiriolabs",
  FEATHERLESS_AI = "featherless-ai",
  FIREWORKS = "fireworks",
  FRIENDLI = "friendli",
  GMICLOUD = "gmicloud",
  GRADIENTAI = "gradientai",
  GROQ = "groq",
  HETZNER_INFERENCE = "hetzner-inference",
  HUGGINGFACE = "huggingface",
  INCEPTION_LABS = "inception-labs",
  INCEPTRON = "inceptron",
  INCO = "inco",
  INFERENCE_NET = "inference-net",
  IO_INTELLIGENCE = "io-intelligence",
  KOSCOMPUTE = "koscompute",
  LEMONFOX_AI = "lemonfox-ai",
  LILAC = "lilac",
  LLMTECH = "llmtech",
  MANCER = "mancer",
  META_MODEL_API = "meta-model-api",
  MINIMAX = "minimax",
  MISTRAL = "mistral",
  MOARK = "moark",
  MODELSCOPE = "modelscope",
  MOONSHOT_AI = "moonshot-ai",
  MORPH = "morph",
  NEBIUS = "nebius",
  NEURALWATT = "neuralwatt",
  NOVITA = "novita",
  OVHCLOUD = "ovhcloud",
  PARASAIL = "parasail",
  PARETO_INFERENCE = "pareto-inference",
  PERPLEXITY = "perplexity",
  POOLSIDE = "poolside",
  PRIME_INTELLECT = "prime-intellect",
  REKA = "reka",
  SAKANA_AI = "sakana-ai",
  SAMBANOVA = "sambanova",
  SARVAM = "sarvam",
  SCALEWAY = "scaleway",
  SILICONFLOW = "siliconflow",
  STACKIT = "stackit",
  STEPFUN = "stepfun",
  SUBCONSCIOUS = "subconscious",
  SYNTHETIC = "synthetic",
  TELNYX = "telnyx",
  THINKING_MACHINES = "thinking-machines",
  TINFOIL = "tinfoil",
  TOGETHER_AI = "together-ai",
  UMANS_AI = "umans-ai",
  UPSTAGE = "upstage",
  VENICE_AI = "venice-ai",
  VISPARK = "vispark",
  VULTR_INFERENCE = "vultr-inference",
  WAFER = "wafer",
  WANDB_INFERENCE = "wandb-inference",
  XAI = "xai",
  Z_AI = "z-ai",
  // ── END GENERATED(provider-members) ──
  COHERE = "cohere",
  REPLICATE = "replicate",
  VOYAGE = "voyage",
  JINA = "jina",
  STABILITY = "stability",
  IDEOGRAM = "ideogram",
  RECRAFT = "recraft",
  /** TypeSafe (Jev) — serves the `decide` inference type only. */
  TYPESAFE = "typesafe",
  /** Laya (Convai, open weights) — serves the `decide` inference type only. */
  LAYA = "laya",
  /** XOR (Juspay, open weights) — serves the `decide` inference type only. */
  XOR = "xor",
  /**
   * Perplexity Decisions API (`pplx-decider-v1-27b`) — serves the `decide`
   * inference type only. Distinct from `PERPLEXITY`, the Sonar text provider.
   */
  PERPLEXITY_DECIDER = "perplexity-decider",
  AUTO = "auto",
}

/**
 * Popular Models for OpenRouter (300+ available at openrouter.ai/models)
 * OpenRouter uses 'provider/model' format
 */
export enum OpenRouterModels {
  // Anthropic Claude models
  CLAUDE_OPUS_4_6 = "anthropic/claude-opus-4.6",
  CLAUDE_SONNET_4_6 = "anthropic/claude-sonnet-4.6",
  CLAUDE_SONNET_4_5 = "anthropic/claude-sonnet-4.5",
  CLAUDE_HAIKU_4_5 = "anthropic/claude-haiku-4.5",
  CLAUDE_3_7_SONNET = "anthropic/claude-3.7-sonnet",
  // anthropic/claude-3-5-sonnet was retired by OpenRouter in late 2025 and
  // is no longer reachable through any of their endpoints, so the entry is
  // dropped here. Callers should switch to CLAUDE_3_7_SONNET (or a newer
  // 4.x entry above).
  CLAUDE_3_5_HAIKU = "anthropic/claude-3-5-haiku",
  CLAUDE_3_OPUS = "anthropic/claude-3-opus",
  // OpenAI models
  GPT_5_2 = "openai/gpt-5.2",
  GPT_5 = "openai/gpt-5",
  GPT_4O = "openai/gpt-4o",
  GPT_4O_MINI = "openai/gpt-4o-mini",
  GPT_4_TURBO = "openai/gpt-4-turbo",
  // Google models
  GEMINI_3_1_PRO_PREVIEW = "google/gemini-3.1-pro-preview",
  GEMINI_3_FLASH_PREVIEW = "google/gemini-3-flash-preview",
  GEMINI_2_5_FLASH = "google/gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE = "google/gemini-2.5-flash-lite",
  GEMINI_2_0_FLASH = "google/gemini-2.0-flash",
  // Meta Llama models
  LLAMA_3_1_70B = "meta-llama/llama-3.1-70b-instruct",
  LLAMA_3_1_8B = "meta-llama/llama-3.1-8b-instruct",
  // Mistral models
  MISTRAL_LARGE = "mistralai/mistral-large",
  MIXTRAL_8X7B = "mistralai/mixtral-8x7b-instruct",
  // DeepSeek models
  DEEPSEEK_R1 = "deepseek/deepseek-r1",
  // xAI models
  GROK_4_1_FAST = "xai/grok-4.1-fast",
}

/**
 * Supported Models for Amazon Bedrock
 */
export enum BedrockModels {
  // ============================================================================
  // ANTHROPIC CLAUDE MODELS
  // ============================================================================

  // Claude 4.6 Series (Latest - February 2026)
  CLAUDE_4_6_OPUS = "anthropic.claude-opus-4-6-v1",
  CLAUDE_4_6_SONNET = "anthropic.claude-sonnet-4-6",

  // Claude 4.5 Series (September-November 2025)
  CLAUDE_4_5_OPUS = "anthropic.claude-opus-4-5-20251101-v1:0",
  CLAUDE_4_5_SONNET = "anthropic.claude-sonnet-4-5-20250929-v1:0",
  CLAUDE_4_5_HAIKU = "anthropic.claude-haiku-4-5-20251001-v1:0",

  // Claude 4 Series (May-August 2025)
  CLAUDE_4_1_OPUS = "anthropic.claude-opus-4-1-20250805-v1:0",
  CLAUDE_4_SONNET = "anthropic.claude-sonnet-4-20250514-v1:0",

  // Claude 3.7 Series
  /** @deprecated Retired from Anthropic API. Use CLAUDE_4_6_SONNET instead. */
  CLAUDE_3_7_SONNET = "anthropic.claude-3-7-sonnet-20250219-v1:0",

  // Claude 3.5 Series
  /** @deprecated Retired from Anthropic API. Use CLAUDE_4_6_SONNET instead. */
  CLAUDE_3_5_SONNET = "anthropic.claude-3-5-sonnet-20241022-v1:0",
  /** @deprecated Retired from Anthropic API. Use CLAUDE_4_6_SONNET instead. */
  CLAUDE_3_5_HAIKU = "anthropic.claude-3-5-haiku-20241022-v1:0",

  // Claude 3 Series (Legacy support)
  /** @deprecated Retired from Anthropic API. Use CLAUDE_4_6_SONNET instead. */
  CLAUDE_3_SONNET = "anthropic.claude-3-sonnet-20240229-v1:0",
  /** @deprecated Retired from Anthropic API. Use CLAUDE_4_6_SONNET instead. */
  CLAUDE_3_HAIKU = "anthropic.claude-3-haiku-20240307-v1:0",

  // ============================================================================
  // AMAZON NOVA MODELS
  // ============================================================================

  // Nova Generation 1
  NOVA_PREMIER = "amazon.nova-premier-v1:0",
  NOVA_PRO = "amazon.nova-pro-v1:0",
  NOVA_LITE = "amazon.nova-lite-v1:0",
  NOVA_MICRO = "amazon.nova-micro-v1:0",

  // Nova Generation 2 (December 2025)
  NOVA_2_LITE = "amazon.nova-2-lite-v1:0",
  NOVA_2_SONIC = "amazon.nova-2-sonic-v1:0",

  // Nova Specialized Models
  NOVA_SONIC = "amazon.nova-sonic-v1:0",
  NOVA_CANVAS = "amazon.nova-canvas-v1:0",
  NOVA_REEL = "amazon.nova-reel-v1:0",
  NOVA_REEL_V1_1 = "amazon.nova-reel-v1:1",
  NOVA_MULTIMODAL_EMBEDDINGS = "amazon.nova-2-multimodal-embeddings-v1:0",

  // ============================================================================
  // AMAZON TITAN MODELS
  // ============================================================================

  // Titan Text Generation
  TITAN_TEXT_LARGE = "amazon.titan-tg1-large",

  // Titan Text Embeddings
  TITAN_EMBED_TEXT_V2 = "amazon.titan-embed-text-v2:0",
  TITAN_EMBED_TEXT_V1 = "amazon.titan-embed-text-v1",
  TITAN_EMBED_G1_TEXT_02 = "amazon.titan-embed-g1-text-02",

  // Titan Multimodal Embeddings
  TITAN_EMBED_IMAGE_V1 = "amazon.titan-embed-image-v1",

  // Titan Image Generation
  TITAN_IMAGE_GENERATOR_V2 = "amazon.titan-image-generator-v2:0",

  // ============================================================================
  // META LLAMA MODELS
  // ============================================================================

  // Llama 4 Series (2025)
  LLAMA_4_MAVERICK_17B = "meta.llama4-maverick-17b-instruct-v1:0",
  LLAMA_4_SCOUT_17B = "meta.llama4-scout-17b-instruct-v1:0",

  // Llama 3.3 Series
  LLAMA_3_3_70B = "meta.llama3-3-70b-instruct-v1:0",

  // Llama 3.2 Series (Multimodal)
  LLAMA_3_2_90B = "meta.llama3-2-90b-instruct-v1:0",
  LLAMA_3_2_11B = "meta.llama3-2-11b-instruct-v1:0",
  LLAMA_3_2_3B = "meta.llama3-2-3b-instruct-v1:0",
  LLAMA_3_2_1B = "meta.llama3-2-1b-instruct-v1:0",

  // Llama 3.1 Series
  LLAMA_3_1_405B = "meta.llama3-1-405b-instruct-v1:0",
  LLAMA_3_1_70B = "meta.llama3-1-70b-instruct-v1:0",
  LLAMA_3_1_8B = "meta.llama3-1-8b-instruct-v1:0",

  // Llama 3 Series (Legacy)
  LLAMA_3_70B = "meta.llama3-70b-instruct-v1:0",
  LLAMA_3_8B = "meta.llama3-8b-instruct-v1:0",

  // ============================================================================
  // MISTRAL AI MODELS
  // ============================================================================

  // Mistral Large Series
  MISTRAL_LARGE_3 = "mistral.mistral-large-3-675b-instruct",
  MISTRAL_LARGE_2407 = "mistral.mistral-large-2407-v1:0",
  MISTRAL_LARGE_2402 = "mistral.mistral-large-2402-v1:0",

  // Magistral & Ministral Series
  MAGISTRAL_SMALL_2509 = "mistral.magistral-small-2509",
  MINISTRAL_3_14B = "mistral.ministral-3-14b-instruct",
  MINISTRAL_3_8B = "mistral.ministral-3-8b-instruct",
  MINISTRAL_3_3B = "mistral.ministral-3-3b-instruct",

  // Mistral Base Series
  MISTRAL_7B = "mistral.mistral-7b-instruct-v0:2",
  MIXTRAL_8x7B = "mistral.mixtral-8x7b-instruct-v0:1",

  // Mistral Multimodal & Audio
  PIXTRAL_LARGE_2502 = "mistral.pixtral-large-2502-v1:0",
  VOXTRAL_SMALL_24B = "mistral.voxtral-small-24b-2507",
  VOXTRAL_MINI_3B = "mistral.voxtral-mini-3b-2507",

  // ============================================================================
  // OTHER MODELS
  // ============================================================================

  // Cohere Models
  COHERE_COMMAND_R_PLUS = "cohere.command-r-plus-v1:0",
  COHERE_COMMAND_R = "cohere.command-r-v1:0",

  // DeepSeek Models
  DEEPSEEK_R1 = "deepseek.r1-v1:0",
  DEEPSEEK_V3 = "deepseek.v3-v1:0",

  // Qwen Models
  QWEN_3_235B_A22B = "qwen.qwen3-235b-a22b-2507-v1:0",
  QWEN_3_CODER_480B_A35B = "qwen.qwen3-coder-480b-a35b-v1:0",
  QWEN_3_CODER_30B_A3B = "qwen.qwen3-coder-30b-a3b-v1:0",
  QWEN_3_32B = "qwen.qwen3-32b-v1:0",
  QWEN_3_NEXT_80B_A3B = "qwen.qwen3-next-80b-a3b",
  QWEN_3_VL_235B_A22B = "qwen.qwen3-vl-235b-a22b",

  // Google Gemma
  GEMMA_3_27B_IT = "google.gemma-3-27b-it",
  GEMMA_3_12B_IT = "google.gemma-3-12b-it",
  GEMMA_3_4B_IT = "google.gemma-3-4b-it",

  // AI21 Labs Models
  JAMBA_1_5_LARGE = "ai21.jamba-1-5-large-v1:0",
  JAMBA_1_5_MINI = "ai21.jamba-1-5-mini-v1:0",

  // ============================================================================
  // NEW PROVIDERS (February 2026)
  // ============================================================================

  // Writer Models
  WRITER_PALMYRA_X5 = "writer.palmyra-x5-v1:0",
  WRITER_PALMYRA_X4 = "writer.palmyra-x4-v1:0",

  // MiniMax Models
  MINIMAX_M2_1 = "minimax.minimax-m2.1",
  MINIMAX_M2 = "minimax.minimax-m2",

  // Moonshot AI (Kimi) Models
  KIMI_K2_THINKING = "moonshot.kimi-k2-thinking",
  KIMI_K2_5 = "moonshotai.kimi-k2.5",

  // NVIDIA Nemotron Models
  NVIDIA_NEMOTRON_NANO_3_30B = "nvidia.nemotron-nano-3-30b",
  NVIDIA_NEMOTRON_NANO_12B_V2 = "nvidia.nemotron-nano-12b-v2",
  NVIDIA_NEMOTRON_NANO_9B_V2 = "nvidia.nemotron-nano-9b-v2",

  // OpenAI Open Source Models (Apache 2.0)
  OPENAI_GPT_OSS_120B = "openai.gpt-oss-120b-1:0",
  OPENAI_GPT_OSS_20B = "openai.gpt-oss-20b-1:0",

  // Z.AI GLM Models
  GLM_4_7 = "zai.glm-4.7",
  GLM_4_7_FLASH = "zai.glm-4.7-flash",

  // Cohere Embedding & Reranking
  COHERE_EMBED_ENGLISH_V3 = "cohere.embed-english-v3",
  COHERE_EMBED_MULTILINGUAL_V3 = "cohere.embed-multilingual-v3",
  COHERE_EMBED_V4 = "cohere.embed-v4:0",
  COHERE_RERANK_V3_5 = "cohere.rerank-v3-5:0",

  // Amazon Rerank
  AMAZON_RERANK_V1 = "amazon.rerank-v1:0",

  // Mistral Devstral 2
  DEVSTRAL_2_123B = "mistral.devstral-2-123b",
}

/**
 * Supported Models for OpenAI
 */
export enum OpenAIModels {
  // GPT-6 Series (Released September 2026) - current flagship family, per
  // developers.openai.com/api/docs/models
  GPT_6_ASTRA = "gpt-6-astra",
  GPT_6_SOL = "gpt-6-sol",
  GPT_6_LUNA = "gpt-6-luna",

  // GPT-5.3 Series (Released February 2026) - Latest coding models
  GPT_5_3_CODEX = "gpt-5.3-codex",

  // GPT-5.4 Series (Released March 2026) - Latest flagship models
  GPT_5_4 = "gpt-5.4",
  GPT_5_4_MINI = "gpt-5.4-mini",
  GPT_5_4_NANO = "gpt-5.4-nano",
  GPT_5_4_PRO = "gpt-5.4-pro",

  // GPT-5.2 Series (Released December 11, 2025) - Flagship models
  GPT_5_2 = "gpt-5.2",
  GPT_5_2_CHAT_LATEST = "gpt-5.2-chat-latest",
  GPT_5_2_PRO = "gpt-5.2-pro",
  GPT_5_2_CODEX = "gpt-5.2-codex",

  // GPT-5.1 Series (Released October 2025)
  GPT_5_1 = "gpt-5.1",
  GPT_5_1_CHAT_LATEST = "gpt-5.1-chat-latest",
  GPT_5_1_CODEX = "gpt-5.1-codex",
  GPT_5_1_CODEX_MAX = "gpt-5.1-codex-max",
  GPT_5_1_CODEX_MINI = "gpt-5.1-codex-mini",

  // GPT-5 Series (Released August 7, 2025)
  GPT_5 = "gpt-5",
  GPT_5_MINI = "gpt-5-mini",
  GPT_5_NANO = "gpt-5-nano",
  GPT_5_PRO = "gpt-5-pro",
  GPT_5_CHAT_LATEST = "gpt-5-chat-latest",
  GPT_5_CODEX = "gpt-5-codex",

  // GPT Open Source (Apache 2.0 - January 2026, Responses API only)
  GPT_OSS_120B = "gpt-oss-120b",
  GPT_OSS_20B = "gpt-oss-20b",

  // GPT-4.1 Series (Released April 14, 2025)
  GPT_4_1 = "gpt-4.1",
  GPT_4_1_MINI = "gpt-4.1-mini",
  GPT_4_1_NANO = "gpt-4.1-nano",

  // GPT-4o Series
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini",

  // O-Series Reasoning Models
  O3 = "o3",
  O3_MINI = "o3-mini",
  O3_PRO = "o3-pro",
  O4_MINI = "o4-mini",
  O1 = "o1",
  /** @deprecated Turned off Jul 14, 2025. Use GPT_4_1 or O3. */
  O1_PREVIEW = "o1-preview",
  /** @deprecated Replaced by o3-mini. */
  O1_MINI = "o1-mini",

  // GPT-4 Series (Legacy)
  GPT_4 = "gpt-4",
  GPT_4_TURBO = "gpt-4-turbo",

  // Legacy Models
  GPT_3_5_TURBO = "gpt-3.5-turbo",

  // Image Generation Models — routed through executeImageGeneration()
  GPT_IMAGE_1 = "gpt-image-1",
  DALL_E_3 = "dall-e-3",
  DALL_E_2 = "dall-e-2",
}

/**
 * Supported Models for Azure OpenAI
 * Note: Azure uses deployment names, these are model identifiers
 */
export enum AzureOpenAIModels {
  // GPT-6 Series (September 2026) - current flagship family, confirmed on
  // Azure OpenAI (learn.microsoft.com/azure/ai-foundry/openai/concepts/models)
  GPT_6_ASTRA = "gpt-6-astra",
  GPT_6_SOL = "gpt-6-sol",
  GPT_6_LUNA = "gpt-6-luna",

  // GPT-5.6 Series (Azure-only as of Sep 2026 — retired from the OpenAI-direct
  // catalog, still documented on Azure OpenAI)
  GPT_5_6_SOL = "gpt-5.6-sol",
  GPT_5_6_TERRA = "gpt-5.6-terra",
  GPT_5_6_LUNA = "gpt-5.6-luna",

  // GPT-5.5 (Azure-only as of Sep 2026 — same situation as GPT-5.6 above)
  GPT_5_5 = "gpt-5.5",

  // GPT-5.2 Series (Latest - December 2025)
  GPT_5_2 = "gpt-5.2",
  GPT_5_2_CHAT = "gpt-5.2-chat",
  GPT_5_2_PRO = "gpt-5.2-pro",
  GPT_5_2_CODEX = "gpt-5.2-codex",

  // GPT-5.4 Series (March 2026)
  GPT_5_4 = "gpt-5.4",
  GPT_5_4_MINI = "gpt-5.4-mini",
  GPT_5_4_NANO = "gpt-5.4-nano",

  // GPT-5.1 Series (October 2025)
  GPT_5_1 = "gpt-5.1",
  GPT_5_1_CHAT = "gpt-5.1-chat",
  GPT_5_1_CODEX = "gpt-5.1-codex",
  GPT_5_1_CODEX_MINI = "gpt-5.1-codex-mini",
  GPT_5_1_CODEX_MAX = "gpt-5.1-codex-max",

  // GPT-5.0 Series
  GPT_5 = "gpt-5",
  GPT_5_MINI = "gpt-5-mini",
  GPT_5_NANO = "gpt-5-nano",
  GPT_5_CHAT = "gpt-5-chat",
  GPT_5_CODEX = "gpt-5-codex",
  GPT_5_PRO = "gpt-5-pro",
  /**
   * @deprecated No such model exists on Azure OpenAI. "Turbo" was a GPT-3.5 and
   * GPT-4 era suffix and was never carried into the GPT-5 family; the real
   * series is gpt-5 / gpt-5-mini / gpt-5-nano / gpt-5-chat / gpt-5-codex /
   * gpt-5-pro. Deploying this id fails. Kept only so existing code still
   * compiles — scheduled for removal in the next major. Use GPT_5 instead.
   */
  GPT_5_TURBO = "gpt-5-turbo",

  // O-Series Reasoning Models
  O4_MINI = "o4-mini",
  O3 = "o3",
  O3_MINI = "o3-mini",
  O3_PRO = "o3-pro",
  O1 = "o1",
  O1_MINI = "o1-mini",
  O1_PREVIEW = "o1-preview",
  CODEX_MINI = "codex-mini",

  // GPT-4.1 Series
  GPT_4_1 = "gpt-4.1",
  GPT_4_1_NANO = "gpt-4.1-nano",
  GPT_4_1_MINI = "gpt-4.1-mini",

  // GPT-4o Series (Multimodal)
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini",

  // GPT-4 Turbo & GPT-4
  GPT_4_TURBO = "gpt-4-turbo",
  GPT_4 = "gpt-4",
  GPT_4_32K = "gpt-4-32k",

  // GPT-3.5 Turbo (Legacy)
  GPT_3_5_TURBO = "gpt-35-turbo",
  GPT_3_5_TURBO_INSTRUCT = "gpt-35-turbo-instruct",
}

/**
 * Supported Models for Google Vertex AI
 */
export enum VertexModels {
  // Claude 4.6 Series (Latest - February 2026)
  CLAUDE_4_6_OPUS = "claude-opus-4-6",
  CLAUDE_4_6_SONNET = "claude-sonnet-4-6",

  // Claude 4.5 Series (September-November 2025)
  CLAUDE_4_5_OPUS = "claude-opus-4-5@20251101",
  CLAUDE_4_5_SONNET = "claude-sonnet-4-5@20250929",
  CLAUDE_4_5_HAIKU = "claude-haiku-4-5@20251001",

  // Claude 4 Series (May 2025)
  CLAUDE_4_0_SONNET = "claude-sonnet-4@20250514",
  CLAUDE_4_0_OPUS = "claude-opus-4@20250514",

  // Claude 3.7 Series (February 2025)
  /** @deprecated Retired from Anthropic API. Use CLAUDE_4_6_SONNET instead. */
  CLAUDE_3_7_SONNET = "claude-3-7-sonnet@20250219",

  // Claude 3.5 Series (Still supported)
  /** @deprecated Retired from Anthropic API. Use CLAUDE_4_6_SONNET instead. */
  CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20241022",
  /** @deprecated Retired from Anthropic API. Use CLAUDE_4_6_SONNET instead. */
  CLAUDE_3_5_HAIKU = "claude-3-5-haiku-20241022",

  // Claude 3 Series (Legacy support)
  /** @deprecated Retired from Anthropic API. Use CLAUDE_4_6_SONNET instead. */
  CLAUDE_3_SONNET = "claude-3-sonnet-20240229",
  /** @deprecated Retired from Anthropic API. Use CLAUDE_4_6_SONNET instead. */
  CLAUDE_3_OPUS = "claude-3-opus-20240229",
  /** @deprecated Retired from Anthropic API. Use CLAUDE_4_6_SONNET instead. */
  CLAUDE_3_HAIKU = "claude-3-haiku-20240307",

  // Gemini 3.1 Series (Released March 2026 — all require -preview suffix)
  GEMINI_3_1_PRO_PREVIEW = "gemini-3.1-pro-preview",
  GEMINI_3_1_FLASH_LITE_PREVIEW = "gemini-3.1-flash-lite-preview",
  GEMINI_3_1_FLASH_IMAGE_PREVIEW = "gemini-3.1-flash-image-preview",
  GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS = "gemini-3.1-pro-preview-customtools",

  // Gemini 3 Series (Preview)
  GEMINI_3_FLASH_PREVIEW = "gemini-3-flash-preview",
  GEMINI_3_PRO_IMAGE_PREVIEW = "gemini-3-pro-image-preview",
  /** @deprecated SHUT DOWN March 9, 2026. Migrate to GEMINI_3_1_PRO_PREVIEW. */
  GEMINI_3_PRO_PREVIEW = "gemini-3-pro-preview",

  // Gemini 2.5 Series (GA)
  GEMINI_2_5_PRO = "gemini-2.5-pro",
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE = "gemini-2.5-flash-lite",
  GEMINI_2_5_FLASH_IMAGE = "gemini-2.5-flash-image",

  // Gemini 2.0 Series (Deprecated - retiring Jun 2026)
  GEMINI_2_0_FLASH = "gemini-2.0-flash",
  GEMINI_2_0_FLASH_001 = "gemini-2.0-flash-001",
  GEMINI_2_0_FLASH_LITE = "gemini-2.0-flash-lite",

  // Gemini 1.5 Series (Retired - returns 404)
  /** @deprecated SHUT DOWN. Returns 404. Use GEMINI_2_5_FLASH or newer. */
  GEMINI_1_5_PRO = "gemini-1.5-pro-002",
  /** @deprecated SHUT DOWN. Returns 404. Use GEMINI_2_5_FLASH or newer. */
  GEMINI_1_5_FLASH = "gemini-1.5-flash-002",
}

/**
 * Supported Models for Google AI Studio
 */
export enum GoogleAIModels {
  // Gemini 3.1 Series (Released March 2026 — all require -preview suffix)
  GEMINI_3_1_PRO_PREVIEW = "gemini-3.1-pro-preview",
  GEMINI_3_1_FLASH_LITE_PREVIEW = "gemini-3.1-flash-lite-preview",
  GEMINI_3_1_FLASH_IMAGE_PREVIEW = "gemini-3.1-flash-image-preview",
  GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS = "gemini-3.1-pro-preview-customtools",

  // Gemini 3 Series (Preview)
  GEMINI_3_FLASH_PREVIEW = "gemini-3-flash-preview",
  GEMINI_3_PRO_IMAGE_PREVIEW = "gemini-3-pro-image-preview",
  /** @deprecated SHUT DOWN March 9, 2026. Migrate to GEMINI_3_1_PRO_PREVIEW. */
  GEMINI_3_PRO_PREVIEW = "gemini-3-pro-preview",

  // Gemini 2.5 Series (GA)
  GEMINI_2_5_PRO = "gemini-2.5-pro",
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE = "gemini-2.5-flash-lite",
  GEMINI_2_5_FLASH_IMAGE = "gemini-2.5-flash-image",
  GEMINI_2_5_FLASH_PREVIEW_TTS = "gemini-2.5-flash-preview-tts",
  GEMINI_2_5_PRO_PREVIEW_TTS = "gemini-2.5-pro-preview-tts",

  // Gemini 2.0 Series (Deprecated - retiring Jun 2026)
  /** @deprecated Retiring June 1, 2026. Use GEMINI_2_5_FLASH instead. */
  GEMINI_2_0_FLASH = "gemini-2.0-flash",
  GEMINI_2_0_FLASH_001 = "gemini-2.0-flash-001",
  GEMINI_2_0_FLASH_LITE = "gemini-2.0-flash-lite",
  GEMINI_2_0_FLASH_IMAGE = "gemini-2.0-flash-preview-image-generation",

  // Gemini 1.5 Series (Retired - returns 404)
  /** @deprecated SHUT DOWN. Returns 404. Use GEMINI_2_5_FLASH or newer. */
  GEMINI_1_5_PRO = "gemini-1.5-pro",
  /** @deprecated SHUT DOWN. Returns 404. Use GEMINI_2_5_FLASH or newer. */
  GEMINI_1_5_FLASH = "gemini-1.5-flash",

  // Embedding Models
  GEMINI_EMBEDDING = "gemini-embedding-001",
  GEMINI_EMBEDDING_2_PREVIEW = "gemini-embedding-2-preview",
  /** @deprecated SHUT DOWN Jan 14, 2026. Use GEMINI_EMBEDDING instead. */
  TEXT_EMBEDDING_004 = "text-embedding-004",
}

/**
 * Supported Models for Anthropic (Direct API)
 */
// Model states below track Anthropic's own status table at
// platform.claude.com/docs/en/about-claude/model-deprecations. Those dates
// cover Anthropic-operated platforms only — Amazon Bedrock and Google Cloud
// set their own retirement schedules, so BedrockModels/VertexModels entries
// are NOT retired just because the direct-API twin is.
export enum AnthropicModels {
  // Claude 5 Series (mid 2026). MODEL_CONTEXT_WINDOWS.anthropic
  // (src/lib/constants/contextWindows.ts) already carries the 1M window
  // these ids resolve to.
  CLAUDE_OPUS_5 = "claude-opus-5",
  CLAUDE_SONNET_5 = "claude-sonnet-5",
  CLAUDE_FABLE_5 = "claude-fable-5",

  // Claude 5.5 / 5.1 Series (September 2026) — confirmed on
  // platform.claude.com/docs/en/about-claude/models/overview
  CLAUDE_OPUS_5_5 = "claude-opus-5-5",
  CLAUDE_SONNET_5_5 = "claude-sonnet-5-5",
  CLAUDE_FABLE_5_1 = "claude-fable-5-1",

  // Claude 4.7 / 4.8 Series
  CLAUDE_OPUS_4_8 = "claude-opus-4-8",
  CLAUDE_OPUS_4_7 = "claude-opus-4-7",

  // Claude 4.6 Series (February 2026)
  CLAUDE_OPUS_4_6 = "claude-opus-4-6",
  CLAUDE_SONNET_4_6 = "claude-sonnet-4-6",

  // Claude 4.5 Series (September-November 2025)
  CLAUDE_OPUS_4_5 = "claude-opus-4-5-20251101",
  CLAUDE_SONNET_4_5 = "claude-sonnet-4-5-20250929",
  CLAUDE_4_5_HAIKU = "claude-haiku-4-5-20251001",

  // Claude 4.1 Series (Legacy)
  /** @deprecated Retired from the Claude API on August 5, 2026. Use CLAUDE_OPUS_4_8 instead. */
  CLAUDE_OPUS_4_1 = "claude-opus-4-1-20250805",

  // Claude 4.0 Series (Legacy)
  /** @deprecated Retired from the Claude API on June 15, 2026. Use CLAUDE_OPUS_4_8 instead. */
  CLAUDE_OPUS_4_0 = "claude-opus-4-20250514",
  /** @deprecated Retired from the Claude API on June 15, 2026. Use CLAUDE_SONNET_4_6 instead. */
  CLAUDE_SONNET_4_0 = "claude-sonnet-4-20250514",

  // Claude 3.7 Series (Legacy)
  /** @deprecated Retired from Anthropic API. Use CLAUDE_SONNET_4_6 instead. */
  CLAUDE_SONNET_3_7 = "claude-3-7-sonnet-20250219",

  // Claude 3.5 Series (Legacy)
  /** @deprecated Retired from Anthropic API. Use CLAUDE_SONNET_4_6 instead. */
  CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20241022",
  /** @deprecated Retired from Anthropic API. Use CLAUDE_SONNET_4_6 instead. */
  CLAUDE_3_5_HAIKU = "claude-3-5-haiku-20241022",

  // Claude 3 Series (Legacy - Deprecated)
  /** @deprecated Retired from Anthropic API. Use CLAUDE_SONNET_4_6 instead. */
  CLAUDE_3_SONNET = "claude-3-sonnet-20240229",
  /** @deprecated Retired from Anthropic API. Use CLAUDE_SONNET_4_6 instead. */
  CLAUDE_3_OPUS = "claude-3-opus-20240229",
  /** @deprecated Retired from Anthropic API. Use CLAUDE_SONNET_4_6 instead. */
  CLAUDE_3_HAIKU = "claude-3-haiku-20240307",
}

/**
 * Supported Models for Ollama (Local)
 * All models can be run locally without requiring API keys or cloud services
 */
export enum OllamaModels {
  // Llama 4 Series - Multimodal with vision and tool capabilities
  LLAMA4_SCOUT = "llama4:scout",
  LLAMA4_MAVERICK = "llama4:maverick",
  LLAMA4_LATEST = "llama4:latest",

  // Llama 3.3 Series - High-performance models
  LLAMA3_3_LATEST = "llama3.3:latest",
  LLAMA3_3_70B = "llama3.3:70b",

  // Llama 3.2 Series - Optimized for edge and mobile deployment
  LLAMA3_2_LATEST = "llama3.2:latest",
  LLAMA3_2_3B = "llama3.2:3b",
  LLAMA3_2_1B = "llama3.2:1b",

  // Llama 3.1 Series - Open models rivaling proprietary models
  LLAMA3_1_8B = "llama3.1:8b",
  LLAMA3_1_70B = "llama3.1:70b",
  LLAMA3_1_405B = "llama3.1:405b",

  // Qwen 3 Series - Advanced reasoning and multilingual support
  QWEN3_4B = "qwen3:4b",
  QWEN3_8B = "qwen3:8b",
  QWEN3_14B = "qwen3:14b",
  QWEN3_32B = "qwen3:32b",
  QWEN3_72B = "qwen3:72b",

  // Qwen 2.5 Series - Enhanced coding and mathematics
  QWEN2_5_3B = "qwen2.5:3b",
  QWEN2_5_7B = "qwen2.5:7b",
  QWEN2_5_14B = "qwen2.5:14b",
  QWEN2_5_32B = "qwen2.5:32b",
  QWEN2_5_72B = "qwen2.5:72b",

  // Qwen Reasoning Model
  QWQ_32B = "qwq:32b",
  QWQ_LATEST = "qwq:latest",

  // DeepSeek-R1 Series - State-of-the-art reasoning models
  DEEPSEEK_R1_1_5B = "deepseek-r1:1.5b",
  DEEPSEEK_R1_7B = "deepseek-r1:7b",
  DEEPSEEK_R1_8B = "deepseek-r1:8b",
  DEEPSEEK_R1_14B = "deepseek-r1:14b",
  DEEPSEEK_R1_32B = "deepseek-r1:32b",
  DEEPSEEK_R1_70B = "deepseek-r1:70b",

  // DeepSeek-V3 Series - Mixture of Experts model
  DEEPSEEK_V3_671B = "deepseek-v3:671b",
  DEEPSEEK_V3_LATEST = "deepseek-v3:latest",

  // Mistral AI Series - Efficient general-purpose models
  MISTRAL_LATEST = "mistral:latest",
  MISTRAL_7B = "mistral:7b",
  MISTRAL_SMALL_LATEST = "mistral-small:latest",
  MISTRAL_NEMO_LATEST = "mistral-nemo:latest",
  MISTRAL_LARGE_LATEST = "mistral-large:latest",

  // Google Gemma Series - Efficient edge and cloud models
  GEMMA3_LATEST = "gemma3:latest",
  GEMMA2_2B = "gemma2:2b",
  GEMMA2_9B = "gemma2:9b",
  GEMMA2_27B = "gemma2:27b",

  // Microsoft Phi Series - Compact, efficient models
  PHI4_LATEST = "phi4:latest",
  PHI4_14B = "phi4:14b",
  PHI3_MINI = "phi3:mini",
  PHI3_3_8B = "phi3:3.8b",
  PHI3_MEDIUM = "phi3:medium",
  PHI3_14B = "phi3:14b",

  // Vision-Language Models
  LLAVA_7B = "llava:7b",
  LLAVA_13B = "llava:13b",
  LLAVA_34B = "llava:34b",
  LLAVA_LLAMA3_8B = "llava-llama3:8b",

  // Code-Specialized Models
  CODELLAMA_7B = "codellama:7b",
  CODELLAMA_13B = "codellama:13b",
  CODELLAMA_34B = "codellama:34b",
  CODELLAMA_70B = "codellama:70b",
  QWEN2_5_CODER_7B = "qwen2.5-coder:7b",
  QWEN2_5_CODER_32B = "qwen2.5-coder:32b",
  STARCODER2_3B = "starcoder2:3b",
  STARCODER2_7B = "starcoder2:7b",
  STARCODER2_15B = "starcoder2:15b",

  // Mixture of Experts Models
  MIXTRAL_8X7B = "mixtral:8x7b",
  MIXTRAL_8X22B = "mixtral:8x22b",

  // Enterprise Models
  COMMAND_R_PLUS = "command-r-plus:104b",

  // Z.AI GLM-5 - Flagship reasoning model (February 2026)
  GLM_5_LATEST = "glm-5:latest",

  // Kimi-K2.5 - Moonshot AI multimodal agentic model
  KIMI_K2_5_LATEST = "kimi-k2.5:latest",

  // Qwen 3.5 - Multimodal native agents (February 2026)
  QWEN3_5_LATEST = "qwen3.5:latest",

  // Qwen3-Coder - Coding-focused agentic model
  QWEN3_CODER_LATEST = "qwen3-coder:latest",
  QWEN3_CODER_30B = "qwen3-coder:30b",

  // DeepSeek-V3.2 - Enhanced reasoning
  DEEPSEEK_V3_2_LATEST = "deepseek-v3.2:latest",

  // NVIDIA Nemotron 3 Nano - Hybrid MoE, 1M context
  NEMOTRON_3_NANO_LATEST = "nemotron-3-nano:latest",
  NEMOTRON_3_NANO_30B = "nemotron-3-nano:30b",

  // SmolLM3 - Compact dual-mode reasoning (HuggingFace)
  SMOLLM3_3B = "smollm3:3b",

  // GPT-OSS - Open-source GPT (Apache 2.0)
  GPT_OSS_LATEST = "gpt-oss:latest",
}

/**
 * Common Models for LiteLLM Proxy
 * LiteLLM supports 100+ models through unified proxy interface
 * Models use provider-specific prefixes (e.g., "openai/", "anthropic/")
 */
export enum LiteLLMModels {
  // OpenAI via LiteLLM
  OPENAI_GPT_5 = "openai/gpt-5",
  OPENAI_GPT_4O = "openai/gpt-4o",
  OPENAI_GPT_4O_MINI = "openai/gpt-4o-mini",
  OPENAI_GPT_4_TURBO = "openai/gpt-4-turbo",
  OPENAI_GPT_4 = "openai/gpt-4",
  OPENAI_GPT_3_5_TURBO = "openai/gpt-3.5-turbo",

  // Anthropic via LiteLLM
  ANTHROPIC_CLAUDE_SONNET_4_5 = "anthropic/claude-sonnet-4-5-20250929",
  ANTHROPIC_CLAUDE_OPUS_4_1 = "anthropic/claude-opus-4-1-20250805",
  ANTHROPIC_CLAUDE_3_5_SONNET = "anthropic/claude-3-5-sonnet-20240620",
  ANTHROPIC_CLAUDE_3_HAIKU = "anthropic/claude-3-haiku-20240307",

  // Google Vertex AI via LiteLLM
  VERTEX_GEMINI_2_5_PRO = "vertex_ai/gemini-2.5-pro",
  VERTEX_GEMINI_1_5_PRO = "vertex_ai/gemini-1.5-pro",
  VERTEX_GEMINI_1_5_FLASH = "vertex_ai/gemini-1.5-flash",

  // Google AI Studio (Gemini) via LiteLLM
  GEMINI_2_5_PRO = "gemini/gemini-2.5-pro",
  GEMINI_2_0_FLASH = "gemini/gemini-2.0-flash",
  GEMINI_1_5_PRO = "gemini/gemini-1.5-pro",
  GEMINI_1_5_FLASH = "gemini/gemini-1.5-flash",

  // Groq via LiteLLM
  GROQ_LLAMA_3_1_70B_VERSATILE = "groq/llama-3.1-70b-versatile",
  GROQ_LLAMA_3_1_8B_INSTANT = "groq/llama-3.1-8b-instant",
  GROQ_LLAMA_3_2_11B_VISION = "groq/llama-3.2-11b-vision-preview",
  GROQ_MIXTRAL_8X7B = "groq/mixtral-8x7b-32768",

  // Together AI via LiteLLM
  TOGETHER_LLAMA_2_70B_CHAT = "together_ai/togethercomputer/llama-2-70b-chat",
  TOGETHER_MIXTRAL_8X7B = "together_ai/mistralai/Mixtral-8x7B-Instruct-v0.1",
  TOGETHER_CODELLAMA_34B = "together_ai/codellama/CodeLlama-34b-Instruct-hf",

  // DeepInfra via LiteLLM
  DEEPINFRA_LLAMA_3_70B = "deepinfra/meta-llama/Meta-Llama-3-70B-Instruct",
  DEEPINFRA_LLAMA_2_70B = "deepinfra/meta-llama/Llama-2-70b-chat-hf",
  DEEPINFRA_MISTRAL_7B = "deepinfra/mistralai/Mistral-7B-Instruct-v0.1",

  // Mistral AI via LiteLLM
  MISTRAL_LARGE = "mistral/mistral-large-latest",
  MISTRAL_SMALL = "mistral/mistral-small-latest",
  MISTRAL_MAGISTRAL_MEDIUM = "mistral/magistral-medium-2506",

  // AWS Bedrock via LiteLLM
  BEDROCK_CLAUDE_3_5_SONNET = "bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0",
  BEDROCK_CLAUDE_3_HAIKU = "bedrock/anthropic.claude-3-haiku-20240307-v1:0",

  // OpenAI GPT-5.2 via LiteLLM
  OPENAI_GPT_5_2 = "openai/gpt-5.2",
  OPENAI_GPT_5_2_CODEX = "openai/gpt-5.2-codex",

  // Anthropic Claude 4.6 via LiteLLM
  ANTHROPIC_CLAUDE_OPUS_4_6 = "anthropic/claude-opus-4-6",
  ANTHROPIC_CLAUDE_SONNET_4_6 = "anthropic/claude-sonnet-4-6",

  // Google Gemini 3 via LiteLLM
  GEMINI_3_1_PRO = "gemini/gemini-3.1-pro-preview",

  // xAI via LiteLLM
  XAI_GROK_4_1_FAST = "xai/grok-4.1-fast",

  // Perplexity AI via LiteLLM
  PERPLEXITY_SONAR_PRO = "perplexity/sonar-pro",
  PERPLEXITY_SONAR_REASONING_PRO = "perplexity/sonar-reasoning-pro",
}

/**
 * Supported Models for AWS SageMaker JumpStart
 * https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-foundation-models-latest.html
 */
export enum SageMakerModels {
  // Meta Llama 4 Series (Latest - 2025)
  LLAMA_4_SCOUT_17B_16E = "meta-llama-4-scout-17b-16e-instruct",
  LLAMA_4_MAVERICK_17B_128E = "meta-llama-4-maverick-17b-128e-instruct",
  LLAMA_4_MAVERICK_17B_128E_FP8 = "meta-llama-4-maverick-17b-128e-instruct-fp8",

  // Meta Llama 3 Series
  LLAMA_3_8B = "meta-llama-3-8b-instruct",
  LLAMA_3_70B = "meta-llama-3-70b-instruct",

  // Meta Code Llama Series
  CODE_LLAMA_7B = "meta-code-llama-7b",
  CODE_LLAMA_13B = "meta-code-llama-13b",
  CODE_LLAMA_34B = "meta-code-llama-34b",

  // Mistral AI Models
  MISTRAL_SMALL_24B = "mistral-small-24b-instruct-2501",
  MISTRAL_7B_INSTRUCT = "mistral-7b-instruct-v0.3",
  MIXTRAL_8X7B = "mistral-mixtral-8x7b-instruct-v0.1",
  MIXTRAL_8X22B = "mistral-mixtral-8x22b-instruct-v0.1",

  // Falcon Models
  FALCON_3_7B = "tii-falcon-3-7b-instruct",
  FALCON_3_10B = "tii-falcon-3-10b-instruct",
  FALCON_40B = "tii-falcon-40b-instruct",
  FALCON_180B = "tii-falcon-180b",

  // NVIDIA Nemotron 3 Nano (February 2026)
  NEMOTRON_3_NANO_30B = "nvidia-nemotron-3-nano-30b",

  // Qwen3 VL - Vision-language
  QWEN3_VL_8B = "qwen3-vl-8b-instruct",
}

/**
 * API Versions for various providers
 */
export enum APIVersions {
  // Azure OpenAI API versions
  AZURE_LATEST = "2025-04-01-preview",
  AZURE_STABLE = "2024-10-21",
  AZURE_LEGACY = "2023-12-01-preview",

  // OpenAI API versions
  OPENAI_CURRENT = "v1",
  OPENAI_BETA = "v1-beta",

  // Google AI API versions
  GOOGLE_AI_CURRENT = "v1",
  GOOGLE_AI_BETA = "v1beta",

  // Anthropic API versions
  ANTHROPIC_CURRENT = "2023-06-01",

  // Other provider versions can be added here
}

// Error categories for proper handling
export enum ErrorCategory {
  VALIDATION = "validation",
  TIMEOUT = "timeout",
  NETWORK = "network",
  RESOURCE = "resource",
  PERMISSION = "permission",
  CONFIGURATION = "configuration",
  EXECUTION = "execution",
  SYSTEM = "system",
  /**
   * Caller-initiated cancellation via AbortSignal. Distinct from system errors
   * — represents a user/control-plane decision, not a SDK or provider failure.
   * Consumers can branch on this category to differentiate "user cancelled"
   * from "server error" without resorting to message-string matching.
   */
  ABORT = "abort",
}

// Error severity levels
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// ============================================================================
// CLAUDE SUBSCRIPTION ENUMS
// ============================================================================

// Note: ClaudeSubscriptionTier and AnthropicAuthMethod are defined as type
// aliases in types/subscriptionTypes.ts (canonical definitions).
// The type aliases support all 6 tier values: free, pro, max, max_5, max_20, api.

/**
 * Beta features available for Anthropic API
 *
 * @description Beta feature flags that can be enabled for enhanced functionality:
 * - CLAUDE_CODE: Claude Code beta features for development workflows
 * - INTERLEAVED_THINKING: Enables interleaved thinking in responses
 * - FINE_GRAINED_STREAMING: Fine-grained tool streaming for better UX
 */
export enum AnthropicBetaFeature {
  CLAUDE_CODE = "claude-code-20250219",
  INTERLEAVED_THINKING = "interleaved-thinking-2025-05-14",
  FINE_GRAINED_STREAMING = "fine-grained-tool-streaming-2025-05-14",
}

/**
 * Selected NVIDIA NIM Models
 * Full catalog: https://build.nvidia.com/models
 * Note: NIM hosts hundreds of models; pass arbitrary IDs via --model.
 */
export enum NvidiaNimModels {
  // NVIDIA retired a large part of this list upstream on 2026-08-26 —
  // llama-3.3-70b, llama-3.1-70b, llama-3.2-90b-vision, the deepseek-r1
  // distill and gemma-3-27b all answer "no longer available" now. The members
  // are kept so existing callers still compile, but the provider default
  // below must point at something live: gpt-oss-20b is on the current roster
  // and was probed for text, streaming, tool calling and structured output.
  GPT_OSS_20B = "openai/gpt-oss-20b",
  // Meta Llama
  LLAMA_3_3_70B_INSTRUCT = "meta/llama-3.3-70b-instruct",
  LLAMA_3_1_405B_INSTRUCT = "meta/llama-3.1-405b-instruct",
  LLAMA_3_1_70B_INSTRUCT = "meta/llama-3.1-70b-instruct",
  LLAMA_3_2_90B_VISION = "meta/llama-3.2-90b-vision-instruct",
  LLAMA_3_2_11B_VISION = "meta/llama-3.2-11b-vision-instruct",
  // NVIDIA Nemotron (reasoning)
  NEMOTRON_SUPER_49B = "nvidia/llama-3.3-nemotron-super-49b-v1",
  NEMOTRON_NANO_8B = "nvidia/llama-3.1-nemotron-nano-8b-v1",
  NEMOTRON_70B_INSTRUCT = "nvidia/llama-3.1-nemotron-70b-instruct",
  // DeepSeek hosted on NIM
  DEEPSEEK_R1 = "deepseek-ai/deepseek-r1",
  DEEPSEEK_R1_DISTILL_LLAMA_70B = "deepseek-ai/deepseek-r1-distill-llama-70b",
  // Mistral / Mixtral
  MIXTRAL_8X22B_INSTRUCT = "mistralai/mixtral-8x22b-instruct-v0.1",
  MIXTRAL_8X7B_INSTRUCT = "mistralai/mixtral-8x7b-instruct-v0.1",
  // Microsoft Phi
  PHI_4 = "microsoft/phi-4",
  // Google Gemma
  GEMMA_3_27B_IT = "google/gemma-3-27b-it",
  // Z.AI GLM
  GLM_4_5 = "z-ai/glm4.5",
}

/**
 * LM Studio loads any GGUF model the user has downloaded.
 * Default: empty string → triggers /v1/models auto-discovery.
 */
export enum LMStudioModels {
  /** Sentinel value — triggers auto-discovery from /v1/models */
  AUTO_DISCOVER = "",
}

/**
 * llama.cpp serves a single model loaded at server startup.
 * Default: empty string → uses whatever is loaded.
 */
export enum LlamaCppModels {
  /** Sentinel value — uses the model loaded by the llama-server process */
  AUTO_DISCOVER = "",
}

/**
 * Cohere Command + Embed models.
 * @see https://docs.cohere.com/docs/models
 *
 * Note: bare aliases `command-r` and `command-r-plus` were retired on
 * September 15, 2025. Use the dated variants instead.
 */
export enum CohereModels {
  /** Command A (March 2025) — current flagship chat model */
  COMMAND_A = "command-a-03-2025",
  /** Command A Reasoning (Aug 2025) — explicit reasoning traces */
  COMMAND_A_REASONING = "command-a-reasoning-08-2025",
  /** Command R+ dated (Aug 2024) — last supported R+ variant */
  COMMAND_R_PLUS = "command-r-plus-08-2024",
  /** Command R dated (Aug 2024) — last supported R variant */
  COMMAND_R = "command-r-08-2024",
  /** Command R7B (Dec 2024) — most compact */
  COMMAND_R7B = "command-r7b-12-2024",
  /** Embed v3 multilingual */
  EMBED_MULTILINGUAL_V3 = "embed-multilingual-v3.0",
  /** Embed v3 English */
  EMBED_ENGLISH_V3 = "embed-english-v3.0",
  /** Rerank v3 multilingual */
  RERANK_MULTILINGUAL_V3 = "rerank-multilingual-v3.0",
  /** Rerank v3 English */
  RERANK_ENGLISH_V3 = "rerank-english-v3.0",
}

/**
 * Voyage AI embedding models — top-tier RAG embedders.
 * @see https://docs.voyageai.com/docs/embeddings
 */
export enum VoyageModels {
  /** Voyage 4 — latest general-purpose flagship */
  VOYAGE_4 = "voyage-4",
  /** Voyage 4 Large — largest / highest quality */
  VOYAGE_4_LARGE = "voyage-4-large",
  /** Voyage 4 Lite — smaller / cheaper */
  VOYAGE_4_LITE = "voyage-4-lite",
  /** Voyage Code 4 — code-tuned */
  VOYAGE_CODE_4 = "voyage-code-4",
  /** Voyage 3.5 — latest general-purpose (default) */
  VOYAGE_3_5 = "voyage-3.5",
  /** Voyage 3.5 Lite — smaller / cheaper */
  VOYAGE_3_5_LITE = "voyage-3.5-lite",
  /** Voyage 3 Large — flagship size */
  VOYAGE_3_LARGE = "voyage-3-large",
  /** Voyage Code 3 — code-tuned */
  VOYAGE_CODE_3 = "voyage-code-3",
  /** Voyage Finance 2 — domain-tuned */
  VOYAGE_FINANCE_2 = "voyage-finance-2",
  /** Voyage Law 2 — domain-tuned */
  VOYAGE_LAW_2 = "voyage-law-2",
  /** Voyage Multilingual 2 */
  VOYAGE_MULTILINGUAL_2 = "voyage-multilingual-2",
}

/**
 * Jina AI embedding + reranking models.
 * @see https://jina.ai/embeddings/
 */
export enum JinaModels {
  /** Jina Embeddings v3 — flagship multilingual (default) */
  JINA_EMBEDDINGS_V3 = "jina-embeddings-v3",
  /** Jina Embeddings v2 base English */
  JINA_EMBEDDINGS_V2_BASE_EN = "jina-embeddings-v2-base-en",
  /** Jina Embeddings v2 small English */
  JINA_EMBEDDINGS_V2_SMALL_EN = "jina-embeddings-v2-small-en",
  /** Jina Embeddings v2 base code */
  JINA_EMBEDDINGS_V2_BASE_CODE = "jina-embeddings-v2-base-code",
  /** Jina Embeddings v2 base multilingual */
  JINA_EMBEDDINGS_V2_BASE_MULTILINGUAL = "jina-embeddings-v2-base-zh",
  /** Jina ColBERT v2 — late-interaction retrieval */
  JINA_COLBERT_V2 = "jina-colbert-v2",
  /** Jina Reranker v2 base multilingual */
  JINA_RERANKER_V2_BASE_MULTILINGUAL = "jina-reranker-v2-base-multilingual",
  /** Jina Reranker v1 turbo English */
  JINA_RERANKER_V1_TURBO_EN = "jina-reranker-v1-turbo-en",
}

/**
 * Stability AI image generation models (api.stability.ai).
 * @see https://platform.stability.ai/docs/api-reference
 */
export enum StabilityModels {
  /** Stable Image Ultra — flagship quality (default) */
  STABLE_IMAGE_ULTRA = "stable-image-ultra",
  /** Stable Image Core — fast tier */
  STABLE_IMAGE_CORE = "stable-image-core",
  /** Stable Diffusion 3.5 Large */
  SD_3_5_LARGE = "sd3.5-large",
  /** Stable Diffusion 3.5 Large Turbo */
  SD_3_5_LARGE_TURBO = "sd3.5-large-turbo",
  /** Stable Diffusion 3.5 Medium */
  SD_3_5_MEDIUM = "sd3.5-medium",
}

/**
 * Ideogram image generation models.
 * @see https://docs.ideogram.ai/api-reference/api-reference/post-v-1-ideogram-v-3-generate
 */
export enum IdeogramModels {
  /** Ideogram V3 — latest with strong typography (default) */
  IDEOGRAM_V3 = "V_3",
  /** Ideogram V2 */
  IDEOGRAM_V2 = "V_2",
  /** Ideogram V2 Turbo — fast tier */
  IDEOGRAM_V2_TURBO = "V_2_TURBO",
  /** Ideogram V1 */
  IDEOGRAM_V1 = "V_1",
}

/**
 * Recraft image generation models — vector / illustration focus.
 * @see https://www.recraft.ai/docs
 */
export enum RecraftModels {
  /** Recraft V3 — flagship raster (default) */
  RECRAFT_V3 = "recraftv3",
  /** Recraft V3 SVG — vector output */
  RECRAFT_V3_SVG = "recraftv3-svg",
  /** Recraft V2 */
  RECRAFT_V2 = "recraftv2",
}

/**
 * Replicate hosted models (LLMs only — image / video / avatar / music
 * accessed via dedicated handlers).
 *
 * Replicate accepts arbitrary `owner/name` or `owner/name:version`; this
 * enum lists popular LLM defaults. Pass any model id via `--model`.
 *
 * @see https://replicate.com/explore
 */
export enum ReplicateModels {
  /** Meta Llama 3.1 405B Instruct */
  LLAMA_3_1_405B_INSTRUCT = "meta/meta-llama-3.1-405b-instruct",
  /** Meta Llama 3 70B Instruct (stable; the meta-llama-3.1-70b variant was retired upstream) */
  LLAMA_3_70B_INSTRUCT = "meta/meta-llama-3-70b-instruct",
  /** Meta Llama 3 8B Instruct */
  LLAMA_3_8B_INSTRUCT = "meta/meta-llama-3-8b-instruct",
  /** Mistral 7B Instruct v0.2 */
  MISTRAL_7B_INSTRUCT_V02 = "mistralai/mistral-7b-instruct-v0.2",
  /** Mixtral 8x7B Instruct v0.1 */
  MIXTRAL_8X7B_INSTRUCT_V01 = "mistralai/mixtral-8x7b-instruct-v0.1",
}

// ============================================================================
// ANTHROPIC OAUTH CONSTANTS
// ============================================================================

/**
 * Buffer time in milliseconds before token expiry to trigger refresh
 *
 * @description Tokens are refreshed 5 minutes before expiry to prevent
 * authentication failures during ongoing operations
 */
export const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

// ── BEGIN GENERATED(models-enums): provider catalog (pnpm run codegen:catalog) ──
export enum AboveDevModels {
  DEEPSEEK_V4_1_FLASH = "deepseek-v4.1-flash",
  DEEPSEEK_V4_PRO = "deepseek-v4-pro",
  GLM_5_2 = "glm-5.2",
  GLM_5_3_FLASH = "glm-5.3-flash",
  GLM_5_2_FAST = "glm-5.2-fast",
  QWEN3_8_MAX = "qwen3.8-max",
  MIMO_V2_6_PRO = "mimo-v2.6-pro",
  MIMO_V2_6_FLASH = "mimo-v2.6-flash",
  MIMO_V2_6_PRO_ULTRASPEED = "mimo-v2.6-pro-ultraspeed",
}

export enum Ai21Models {
  JAMBA_LARGE = "jamba-large",
  JAMBA_MINI = "jamba-mini",
  JAMBA_LARGE_1_7_2025_07 = "jamba-large-1.7-2025-07",
  JAMBA_MINI_2_2026_01 = "jamba-mini-2-2026-01",
  JAMBA_LARGE_1_7 = "jamba-large-1.7",
  JAMBA_MINI_2 = "jamba-mini-2",
}

export enum AiandModels {
  OPENAI_GPT_OSS_120B = "openai/gpt-oss-120b",
  ZAI_ORG_GLM_5_3 = "zai-org/glm-5.3",
  ZAI_ORG_GLM_5_2 = "zai-org/glm-5.2",
  DEEPSEEK_AI_DEEPSEEK_V4_PRO = "deepseek-ai/deepseek-v4-pro",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH = "deepseek-ai/deepseek-v4-flash",
  MOONSHOTAI_KIMI_K3 = "moonshotai/kimi-k3",
  MOONSHOTAI_KIMI_K2_7_CODE = "moonshotai/kimi-k2.7-code",
  QWEN_QWEN3_8_27B = "qwen/qwen3.8-27b",
  QWEN_QWEN3_6_27B = "qwen/qwen3.6-27b",
  MOTIF_TECHNOLOGIES_MOTIF_3 = "motif-technologies/motif-3",
  GOOGLE_GEMMA_4_31B_IT = "google/gemma-4-31b-it",
}

export enum AionlabsModels {
  AION_LABS_AION_3_5 = "aion-labs/aion-3.5",
  AION_LABS_AION_3_5_MINI = "aion-labs/aion-3.5-mini",
  AION_LABS_AION_3_0 = "aion-labs/aion-3.0",
  AION_LABS_AION_3_0_MINI = "aion-labs/aion-3.0-mini",
  AION_LABS_AION_2_0 = "aion-labs/aion-2.0",
  AION_LABS_AION_RP_LLAMA_3_1_8B = "aion-labs/aion-rp-llama-3.1-8b",
}

export enum AmbientModels {
  AMBIENT_LARGE = "ambient/large",
  Z_AI_GLM_5_2 = "z-ai/glm-5.2",
  QWEN_QWEN3_6_27B = "qwen/qwen3.6-27b",
  QWEN_QWEN3_8_27B = "qwen/qwen3.8-27b",
}

export enum ApiRouteModels {
  CLAUDE_SONNET_4_6 = "claude-sonnet-4-6",
  CLAUDE_HAIKU_4_5 = "claude-haiku-4-5",
  DEEPSEEK_V4_FLASH = "deepseek-v4-flash",
  DEEPSEEK_V4_PRO = "deepseek-v4-pro",
  GEMINI_3_8_FLASH = "gemini-3.8-flash",
  QWEN3_8_FLASH = "qwen3.8-flash",
  KIMI_K2_7_CODE = "kimi-k2.7-code",
  GLM_5_3_FLASH = "glm-5.3-flash",
}

export enum ArceeModels {
  TRINITY_LARGE_THINKING = "trinity-large-thinking",
  DEEPSEEK_DEEPSEEK_V4_FLASH_LATEST = "deepseek/deepseek-v4-flash-latest",
  ZAI_ORG_GLM_5_3_FLASH = "zai-org/glm-5.3-flash",
  THINKINGMACHINES_INKLING_SMALL = "thinkingmachines/inkling-small",
  DEEPSEEK_DEEPSEEK_V4_PRO_0813 = "deepseek/deepseek-v4-pro-0813",
  DEEPSEEK_DEEPSEEK_V4_PRO = "deepseek/deepseek-v4-pro",
  ZAI_ORG_GLM_5_2 = "zai-org/glm-5.2",
  ZAI_ORG_GLM_5_3 = "zai-org/glm-5.3",
  MOONSHOTAI_KIMI_K3 = "moonshotai/kimi-k3",
  DEEPSEEK_DEEPSEEK_V4_1_FLASH = "deepseek/deepseek-v4.1-flash",
}

export enum AtlasCloudModels {
  DEEPSEEK_AI_DEEPSEEK_V3_2 = "deepseek-ai/deepseek-v3.2",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH = "deepseek-ai/deepseek-v4-flash",
  ZAI_ORG_GLM_5_3 = "zai-org/glm-5.3",
  QWEN_QWEN3_235B_A22B_INSTRUCT_2507 = "Qwen/Qwen3-235B-A22B-Instruct-2507",
  DEEPSEEK_AI_DEEPSEEK_V4_PRO = "deepseek-ai/deepseek-v4-pro",
  ZAI_ORG_GLM_5_1 = "zai-org/glm-5.1",
  MINIMAXAI_MINIMAX_M2_7 = "minimaxai/minimax-m2.7",
  MOONSHOTAI_KIMI_K2_6 = "moonshotai/kimi-k2.6",
  QWEN_QWEN3_5_397B_A17B = "qwen/qwen3.5-397b-a17b",
  QWEN_QWEN3_5_27B = "qwen/qwen3.5-27b",
}

export enum AvianIoModels {
  DEEPSEEK_DEEPSEEK_V4_PRO_0813 = "deepseek/deepseek-v4-pro-0813",
  DEEPSEEK_DEEPSEEK_V4_FLASH = "deepseek/deepseek-v4-flash",
  DEEPSEEK_DEEPSEEK_V3_2 = "deepseek/deepseek-v3.2",
  Z_AI_GLM_5_2 = "z-ai/glm-5.2",
  DEEPSEEK_DEEPSEEK_V4_PRO = "deepseek/deepseek-v4-pro",
  MINIMAX_MINIMAX_M2_5 = "minimax/minimax-m2.5",
  Z_AI_GLM_5 = "z-ai/glm-5",
  Z_AI_GLM_5_1 = "z-ai/glm-5.1",
  MOONSHOTAI_KIMI_K2_5 = "moonshotai/kimi-k2.5",
  MOONSHOTAI_KIMI_K2_6 = "moonshotai/kimi-k2.6",
  XIAOMI_MIMO_V2_6_FLASH = "xiaomi/mimo-v2.6-flash",
  XIAOMI_MIMO_V2_6_PRO = "xiaomi/mimo-v2.6-pro",
}

export enum BaiduQianfanModels {
  ERNIE_5_1 = "ernie-5.1",
  ERNIE_5_0 = "ernie-5.0",
  ERNIE_4_5_TURBO_128K = "ernie-4.5-turbo-128k",
  ERNIE_4_5_TURBO_32K = "ernie-4.5-turbo-32k",
  ERNIE_4_5_TURBO_VL = "ernie-4.5-turbo-vl",
  DEEPSEEK_V4_PRO = "deepseek-v4-pro",
  DEEPSEEK_V4_PRO_0813 = "deepseek-v4-pro-0813",
  DEEPSEEK_V4_FLASH_0731 = "deepseek-v4-flash-0731",
  GLM_5_3 = "glm-5.3",
  GLM_5_2 = "glm-5.2",
  GLM_5_1 = "glm-5.1",
  QWEN3_5_397B_A17B = "qwen3.5-397b-a17b",
}

export enum BasetenModels {
  OPENAI_GPT_OSS_120B = "openai/gpt-oss-120b",
  ZAI_ORG_GLM_4_7 = "zai-org/GLM-4.7",
  MOONSHOTAI_KIMI_K2_6 = "moonshotai/Kimi-K2.6",
  DEEPSEEK_AI_DEEPSEEK_V4_PRO = "deepseek-ai/DeepSeek-V4-Pro",
  NVIDIA_NVIDIA_NEMOTRON_3_ULTRA_550B_A55B = "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B",
  ZAI_ORG_GLM_5_2 = "zai-org/GLM-5.2",
  MOONSHOTAI_KIMI_K2_7_CODE = "moonshotai/Kimi-K2.7-Code",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH_0731 = "deepseek-ai/DeepSeek-V4-Flash-0731",
  THINKINGMACHINES_INKLING = "thinkingmachines/inkling",
  ZAI_ORG_GLM_5_2_FAST = "zai-org/GLM-5.2-Fast",
  MOONSHOTAI_KIMI_K3 = "moonshotai/Kimi-K3",
  THINKINGMACHINES_INKLING_SMALL = "thinkingmachines/inkling-small",
  DEEPSEEK_AI_DEEPSEEK_V4_PRO_0813 = "deepseek-ai/DeepSeek-V4-Pro-0813",
  ZAI_ORG_GLM_5_3_FLASH = "zai-org/GLM-5.3-Flash",
  ZAI_ORG_GLM_5_3 = "zai-org/GLM-5.3",
  ZAI_ORG_GLM_5_3_FAST = "zai-org/GLM-5.3-Fast",
}

export enum BeeHeossiModels {
  BEE_CELL = "bee-cell",
  BEE_CELL_20260710_R1 = "bee-cell-20260710-r1",
  BEE_BROOD = "bee-brood",
  BEE_BROOD_20260710_R1 = "bee-brood-20260710-r1",
  BEE_COMB = "bee-comb",
  BEE_COMB_20260710_R1 = "bee-comb-20260710-r1",
  BEE_COMB_20260827_R1 = "bee-comb-20260827-r1",
  BEE_BUZZ = "bee-buzz",
  BEE_BUZZ_20260710_R1 = "bee-buzz-20260710-r1",
  BEE_HIVE = "bee-hive",
  BEE_HIVE_20260710_R1 = "bee-hive-20260710-r1",
  BEE_SWARM = "bee-swarm",
  BEE_SWARM_20260710_R1 = "bee-swarm-20260710-r1",
}

export enum ByteplusModelarkModels {
  SEED_2_0_PRO_260328 = "seed-2-0-pro-260328",
  DOLA_SEED_2_1_TURBO_260628 = "dola-seed-2-1-turbo-260628",
  SEED_2_0_LITE_260428 = "seed-2-0-lite-260428",
  SEED_2_0_MINI_260428 = "seed-2-0-mini-260428",
  SEED_2_0_LITE_260228 = "seed-2-0-lite-260228",
  SEED_2_0_MINI_260215 = "seed-2-0-mini-260215",
  SEED_2_0_CODE_PREVIEW_260328 = "seed-2-0-code-preview-260328",
  GLM_5_3_FLASH_260828 = "glm-5-3-flash-260828",
  GLM_5_2_260617 = "glm-5-2-260617",
  DEEPSEEK_V4_1_FLASH_260910 = "deepseek-v4-1-flash-260910",
  DEEPSEEK_V4_PRO_GA_260813 = "deepseek-v4-pro-ga-260813",
  DEEPSEEK_V4_FLASH_GA_260731 = "deepseek-v4-flash-ga-260731",
}

export enum BytezModels {
  QWEN_QWEN3_4B = "Qwen/Qwen3-4B",
  QWEN_QWEN3_1_7B = "Qwen/Qwen3-1.7B",
}

export enum CerebrasModels {
  GPT_OSS_120B = "gpt-oss-120b",
  GEMMA_4_31B = "gemma-4-31b",
}

export enum CharmHyperModels {
  DEEPSEEK_V4_PRO = "deepseek-v4-pro",
  DEEPSEEK_V4_1_FLASH = "deepseek-v4.1-flash",
  DEEPSEEK_V4_FLASH = "deepseek-v4-flash",
  DEEPSEEK_V4_PRO_0813 = "deepseek-v4-pro-0813",
  DEEPSEEK_V4_FLASH_0731 = "deepseek-v4-flash-0731",
  KIMI_K3 = "kimi-k3",
  KIMI_K2_THINKING = "kimi-k2-thinking",
  KIMI_K2_7_CODE = "kimi-k2.7-code",
  GLM_5_3 = "glm-5.3",
  GLM_5_3_FLASH = "glm-5.3-flash",
  GLM_5_2 = "glm-5.2",
  MINIMAX_M3 = "minimax-m3",
  MINIMAX_M2_7 = "minimax-m2.7",
  INKLING = "inkling",
  QWEN3_8_MAX = "qwen3.8-max",
  QWEN3_8_FLASH = "qwen3.8-flash",
  QWEN3_8_27B = "qwen3.8-27b",
  QWEN3_8_2_4T_A95B = "qwen3.8-2.4t-a95b",
  QWEN3_7_MAX = "qwen3.7-max",
  QWEN3_7_PLUS = "qwen3.7-plus",
  QWEN3_7_FLASH = "qwen3.7-flash",
  GPT_OSS_120B = "gpt-oss-120b",
  GEMMA_4_26B_A4B_IT = "gemma-4-26b-a4b-it",
}

export enum ChutesModels {
  MOONSHOTAI_KIMI_K2_6_TEE = "moonshotai/Kimi-K2.6-TEE",
  MOONSHOTAI_KIMI_K3_TEE = "moonshotai/Kimi-K3-TEE",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH_0731_TEE = "deepseek-ai/DeepSeek-V4-Flash-0731-TEE",
  ZAI_ORG_GLM_5_2_TEE = "zai-org/GLM-5.2-TEE",
  QWEN_QWEN3_5_397B_A17B_TEE = "Qwen/Qwen3.5-397B-A17B-TEE",
  QWEN_QWEN3_6_27B_TEE = "Qwen/Qwen3.6-27B-TEE",
  QWEN_QWEN3_8_27B_TEE = "Qwen/Qwen3.8-27B-TEE",
  QWEN_QWEN3_235B_A22B_THINKING_2507_TEE = "Qwen/Qwen3-235B-A22B-Thinking-2507-TEE",
  DEEPSEEK_AI_DEEPSEEK_V3_2_TEE = "deepseek-ai/DeepSeek-V3.2-TEE",
  ZAI_ORG_GLM_5_1_TEE = "zai-org/GLM-5.1-TEE",
  GOOGLE_GEMMA_4_31B_TURBO_TEE = "google/gemma-4-31B-turbo-TEE",
  QWEN_QWEN3_32B_TEE = "Qwen/Qwen3-32B-TEE",
  UNSLOTH_MISTRAL_NEMO_INSTRUCT_2407_TEE = "unsloth/Mistral-Nemo-Instruct-2407-TEE",
  NEMOTRON_3_NANO_OMNI_30B_TEE = "Nemotron-3-Nano-Omni-30B-TEE",
}

export enum CloudflareModels {
  LLAMA_3_3_70B_FAST = "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  LLAMA_3_1_70B_INSTRUCT = "@cf/meta/llama-3.1-70b-instruct",
  LLAMA_3_1_8B_FAST = "@cf/meta/llama-3.1-8b-instruct-fast",
  LLAMA_3_2_11B_VISION = "@cf/meta/llama-3.2-11b-vision-instruct",
  MISTRAL_7B_INSTRUCT_V0_2 = "@cf/mistral/mistral-7b-instruct-v0.2",
  QWEN_1P5_14B_CHAT_AWQ = "@cf/qwen/qwen1.5-14b-chat-awq",
  GEMMA_2B_IT_LORA = "@cf/google/gemma-2b-it-lora",
}

export enum CrusoeModels {
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH = "deepseek-ai/DeepSeek-V4-Flash",
  DEEPSEEK_AI_DEEPSEEK_V4_PRO = "deepseek-ai/DeepSeek-V4-Pro",
  OPENAI_GPT_OSS_120B = "openai/gpt-oss-120b",
  ZAI_GLM_5_3 = "zai/GLM-5.3",
  MOONSHOTAI_KIMI_K2_6 = "moonshotai/Kimi-K2.6",
  GOOGLE_GEMMA_4_31B_IT = "google/gemma-4-31b-it",
  NVIDIA_NEMOTRON_3_NANO_30B_A3B = "nvidia/Nemotron-3-Nano-30B-A3B",
  NVIDIA_NEMOTRON_3_SUPER_120B_A12B = "nvidia/Nemotron-3-Super-120B-A12B",
  NVIDIA_NEMOTRON_3_NANO_OMNI_REASONING_30B_A3B = "nvidia/Nemotron-3-Nano-Omni-Reasoning-30B-A3B",
  NVIDIA_NEMOTRON_3_5_LIGHTNING_30B_A3B = "nvidia/nemotron-3.5-lightning-30b-a3b",
  QWEN_QWEN3_8_27B = "qwen/Qwen3.8-27B",
  ZAI_GLM_5_3_FLASH = "zai/GLM-5.3-Flash",
}

export enum DashscopeModels {
  QWEN3_8_MAX = "qwen3.8-max",
  QWEN3_8_FLASH = "qwen3.8-flash",
  QWEN3_7_PLUS = "qwen3.7-plus",
  QWEN3_8_MAX_0902 = "qwen3.8-max-0902",
  QWEN3_7_FLASH = "qwen3.7-flash",
  DEEPSEEK_V4_PRO = "deepseek-v4-pro",
  DEEPSEEK_V4_FLASH = "deepseek-v4-flash",
  KIMI_K3 = "kimi-k3",
}

export enum DeepinfraModels {
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH_0731 = "deepseek-ai/DeepSeek-V4-Flash-0731",
  DEEPSEEK_AI_DEEPSEEK_V4_PRO_0813 = "deepseek-ai/DeepSeek-V4-Pro-0813",
  OPENAI_GPT_OSS_120B = "openai/gpt-oss-120b",
  MOONSHOTAI_KIMI_K3 = "moonshotai/Kimi-K3",
  ZAI_ORG_GLM_5_2 = "zai-org/GLM-5.2",
  ANTHROPIC_CLAUDE_HAIKU_4_5 = "anthropic/claude-haiku-4-5",
  QWEN_QWEN3_14B = "Qwen/Qwen3-14B",
  META_LLAMA_LLAMA_4_SCOUT_17B_16E_INSTRUCT = "meta-llama/Llama-4-Scout-17B-16E-Instruct",
}

export enum DeepSeekModels {
  DEEPSEEK_CHAT = "deepseek-chat",
  DEEPSEEK_REASONER = "deepseek-reasoner",
  DEEPSEEK_FLASH = "deepseek-flash",
  DEEPSEEK_V4_PRO = "deepseek-v4-pro",
}

export enum EmpiriolabsModels {
  GLM_5_3 = "glm-5-3",
  GLM_5_3_FLASH = "glm-5-3-flash",
  GLM_5_2 = "glm-5-2",
  KIMI_K3 = "kimi-k3",
  QWEN3_7_MAX = "qwen3-7-max",
  MINIMAX_M2_7_HIGHSPEED = "minimax-m2-7-highspeed",
}

export enum FeatherlessAiModels {
  UNSLOTH_LLAMA_3_3_70B_INSTRUCT = "unsloth/Llama-3.3-70B-Instruct",
  META_LLAMA_LLAMA_3_3_70B_INSTRUCT = "meta-llama/Llama-3.3-70B-Instruct",
  SAO10K_L3_3_70B_EURYALE_V2_3 = "Sao10K/L3.3-70B-Euryale-v2.3",
  EVA_UNIT_01_EVA_LLAMA_3_33_70B_V0_0 = "EVA-UNIT-01/EVA-LLaMA-3.33-70B-v0.0",
  EVA_UNIT_01_EVA_LLAMA_3_33_70B_V0_1 = "EVA-UNIT-01/EVA-LLaMA-3.33-70B-v0.1",
  KARAKARAWITCH_LLAMA_MIRAIFANFARE_3_3_70B = "KaraKaraWitch/Llama-MiraiFanfare-3.3-70B",
  HUIHUI_AI_LLAMA_3_3_70B_INSTRUCT_ABLITERATED = "huihui-ai/Llama-3.3-70B-Instruct-abliterated",
  RECURSAL_QRWKV6_32B_INSTRUCT_PREVIEW_V0_1 = "recursal/QRWKV6-32B-Instruct-Preview-v0.1",
  RWKV_V6_FINCH_14B_HF = "RWKV/v6-Finch-14B-HF",
  RWKV_EAGLEX_7B_CHAT_V0_5_PTH = "RWKV/EagleX-7B-Chat-V0.5-pth",
  RECURSAL_EAGLEX_1_7T_CHAT = "recursal/EagleX_1-7T_Chat",
  RECURSAL_EAGLEX_1_7T = "recursal/EagleX_1-7T",
}

export enum FireworksModels {
  KIMI_K2P6 = "accounts/fireworks/models/kimi-k2p6",
  GPT_OSS_120B = "accounts/fireworks/models/gpt-oss-120b",
  KIMI_K3 = "accounts/fireworks/models/kimi-k3",
  QWEN3P8_MAX = "accounts/fireworks/models/qwen3p8-max",
  GLM_5P3 = "accounts/fireworks/models/glm-5p3",
  MINIMAX_M3 = "accounts/fireworks/models/minimax-m3",
  DEEPSEEK_V4_FLASH_0731 = "accounts/fireworks/models/deepseek-v4-flash-0731",
  DEEPSEEK_V4_PRO = "accounts/fireworks/models/deepseek-v4-pro",
  GLM_5P1 = "accounts/fireworks/models/glm-5p1",
  GLM_5 = "accounts/fireworks/models/glm-5",
  KIMI_K2P5 = "accounts/fireworks/models/kimi-k2p5",
  LLAMA_V3P2_90B_VISION_INSTRUCT = "accounts/fireworks/models/llama-v3p2-90b-vision-instruct",
  LLAMA_V3P2_11B_VISION_INSTRUCT = "accounts/fireworks/models/llama-v3p2-11b-vision-instruct",
  PHI_3_VISION_128K_INSTRUCT = "accounts/fireworks/models/phi-3-vision-128k-instruct",
}

export enum FriendliModels {
  ZAI_ORG_GLM_5_3 = "zai-org/GLM-5.3",
  ZAI_ORG_GLM_5_3_FLASH = "zai-org/GLM-5.3-Flash",
  ZAI_ORG_GLM_5_2 = "zai-org/GLM-5.2",
  ZAI_ORG_GLM_5_1 = "zai-org/GLM-5.1",
  GOOGLE_GEMMA_4_31B_IT = "google/gemma-4-31B-it",
  DEEPSEEK_AI_DEEPSEEK_V3_2 = "deepseek-ai/DeepSeek-V3.2",
  MINIMAXAI_MINIMAX_M2_5 = "MiniMaxAI/MiniMax-M2.5",
}

export enum GmicloudModels {
  MINIMAXAI_MINIMAX_M3 = "MiniMaxAI/MiniMax-M3",
}

export enum GradientaiModels {
  LLAMA_4_MAVERICK = "llama-4-maverick",
  DEEPSEEK_V4_1_FLASH = "deepseek-v4.1-flash",
  DEEPSEEK_V4_PRO_0813 = "deepseek-v4-pro-0813",
  DEEPSEEK_V4_FLASH_0731 = "deepseek-v4-flash-0731",
  DEEPSEEK_3_2 = "deepseek-3.2",
  GLM_5_2 = "glm-5.2",
  KIMI_K2_6 = "kimi-k2.6",
  KIMI_K3 = "kimi-k3",
  GLM_5_3_FLASH = "glm-5.3-flash",
  MIMO_V2_5_PRO = "mimo-v2.5-pro",
  NEMOTRON_3_ULTRA_550B = "nemotron-3-ultra-550b",
  GEMMA_4_31B_IT = "gemma-4-31B-it",
}

export enum GroqModels {
  GPT_OSS_120B = "openai/gpt-oss-120b",
  GPT_OSS_20B = "openai/gpt-oss-20b",
  QWEN_3_8_27B = "qwen/qwen3.8-27b",
  QWEN_3_6_27B = "qwen/qwen3.6-27b",
  COMPOUND = "groq/compound",
  COMPOUND_MINI = "groq/compound-mini",
  ALLAM_2_7B = "allam-2-7b",
  LLAMA_3_3_70B_VERSATILE = "llama-3.3-70b-versatile",
  LLAMA_3_1_8B_INSTANT = "llama-3.1-8b-instant",
  GEMMA_2_9B_IT = "gemma2-9b-it",
  MIXTRAL_8X7B_32768 = "mixtral-8x7b-32768",
  LLAMA_GUARD_3_8B = "llama-guard-3-8b",
  LLAMA_3_2_90B_VISION_PREVIEW = "llama-3.2-90b-vision-preview",
  LLAMA_3_2_11B_VISION_PREVIEW = "llama-3.2-11b-vision-preview",
}

export enum HetznerInferenceModels {
  QWEN_QWEN3_6_35B_A3B_FP8 = "Qwen/Qwen3.6-35B-A3B-FP8",
  QWEN3_8_27B = "Qwen3.8-27B",
}

export enum HuggingFaceModels {
  LLAMA_3_3_70B_INSTRUCT = "meta-llama/Llama-3.3-70B-Instruct",
  LLAMA_3_2_1B = "meta-llama/Llama-3.2-1B",
  LLAMA_3_2_3B_INSTRUCT = "meta-llama/Llama-3.2-3B-Instruct",
  LLAMA_3_1_8B = "meta-llama/Llama-3.1-8B",
  LLAMA_3_1_8B_INSTRUCT = "meta-llama/Llama-3.1-8B-Instruct",
  LLAMA_3_1_70B_INSTRUCT = "meta-llama/Llama-3.1-70B-Instruct",
  LLAMA_3_1_405B_INSTRUCT = "meta-llama/Llama-3.1-405B-Instruct",
  LLAMA_3_8B_INSTRUCT = "meta-llama/Meta-Llama-3-8B-Instruct",
  LLAMA_3_70B_INSTRUCT = "meta-llama/Meta-Llama-3-70B-Instruct",
  MISTRAL_LARGE_3_675B = "mistralai/Mistral-Large-3-675B-Instruct-2512",
  MISTRAL_SMALL_3_1_24B = "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
  MISTRAL_SMALL_24B = "mistralai/Mistral-Small-24B-Instruct-2501",
  MISTRAL_7B_INSTRUCT = "mistralai/Mistral-7B-Instruct-v0.2",
  MIXTRAL_8X7B_INSTRUCT = "mistralai/Mixtral-8x7B-Instruct-v0.1",
  DEVSTRAL_2 = "mistralai/Devstral-2",
  QWEN_2_5_7B = "Qwen/Qwen2.5-7B",
  QWEN_2_5_32B = "Qwen/Qwen2.5-32B",
  QWEN_2_5_72B_INSTRUCT = "Qwen/Qwen2.5-72B-Instruct",
  QWEN_2_5_CODER_7B = "Qwen/Qwen2.5-Coder-7B",
  QWEN_2_5_CODER_32B_INSTRUCT = "Qwen/Qwen2.5-Coder-32B-Instruct",
  QWQ_32B = "Qwen/QwQ-32B",
  QWEN_2_5_VL_32B = "Qwen/Qwen2.5-VL-32B-Instruct",
  DEEPSEEK_R1 = "deepseek-ai/DeepSeek-R1",
  DEEPSEEK_V3 = "deepseek-ai/DeepSeek-V3",
  DEEPSEEK_V3_1 = "deepseek-ai/DeepSeek-V3.1",
  DEEPSEEK_V3_2_EXP = "deepseek-ai/DeepSeek-V3.2-Exp",
  PHI_4 = "microsoft/phi-4",
  PHI_4_REASONING = "microsoft/Phi-4-reasoning",
  PHI_4_MINI_INSTRUCT = "microsoft/Phi-4-mini-instruct",
  PHI_4_MINI_REASONING = "microsoft/Phi-4-mini-reasoning",
  PHI_3_MINI_128K_INSTRUCT = "microsoft/Phi-3-mini-128k-instruct",
  PHI_3_VISION_128K_INSTRUCT = "microsoft/Phi-3-vision-128k-instruct",
  GEMMA_3_270M = "google/gemma-3-270m",
  GEMMA_3_1B_IT = "google/gemma-3-1b-it",
  GEMMA_3_4B_IT = "google/gemma-3-4b-it",
  GEMMA_3_12B_IT = "google/gemma-3-12b-it",
  GEMMA_3_27B_IT = "google/gemma-3-27b-it",
  GEMMA_2_9B = "google/gemma-2-9b",
  GEMMA_2_27B = "google/gemma-2-27b",
  GEMMA_2B = "google/gemma-2b",
  GEMMA_7B = "google/gemma-7b",
  FALCON_40B_INSTRUCT = "tiiuae/falcon-40b-instruct",
  FALCON_180B_CHAT = "tiiuae/falcon-180B-chat",
  STARCODER2_15B = "bigcode/starcoder2-15b",
  CODELLAMA_34B_INSTRUCT = "codellama/CodeLlama-34b-Instruct-hf",
  BLOOM_7B1 = "bigscience/bloom-7b1",
  BLOOM_1B3 = "bigscience/bloom-1b3",
  GLM_5 = "zai-org/GLM-5",
  QWEN_3_5_397B_A17B = "Qwen/Qwen3.5-397B-A17B",
  NEMOTRON_3_NANO_30B = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16",
  SMOLLM3_3B = "HuggingFaceTB/SmolLM3-3B",
  FALCON_3_7B_INSTRUCT = "tiiuae/Falcon3-7B-Instruct",
  FALCON_3_10B_INSTRUCT = "tiiuae/Falcon3-10B-Instruct",
}

export enum InceptionLabsModels {
  MERCURY_2 = "mercury-2",
}

export enum InceptronModels {
  ZAI_ORG_GLM_5_3 = "zai-org/GLM-5.3",
  MOONSHOTAI_KIMI_K2_6 = "moonshotai/Kimi-K2.6",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH_0731 = "deepseek-ai/DeepSeek-V4-Flash-0731",
  ZAI_ORG_GLM_5_2 = "zai-org/GLM-5.2",
  MOONSHOTAI_KIMI_K2_7_CODE = "moonshotai/Kimi-K2.7-Code",
  ZAI_ORG_GLM_5_3_FLASH = "zai-org/GLM-5.3-Flash",
}

export enum IncoModels {
  GLM_5_3 = "glm-5.3",
  DEEPSEEK_V4_1_FLASH = "deepseek-v4.1-flash",
  KIMI_K3 = "kimi-k3",
  GLM_5_3_FLASH = "glm-5.3-flash",
  MINIMAX_M3 = "minimax-m3",
  GLM_5_3_FAST = "glm-5.3:fast",
  KIMI_K3_FAST = "kimi-k3:fast",
  DEEPSEEK_V4_1_FLASH_FAST = "deepseek-v4.1-flash:fast",
  GLM_5_3_FLASH_FAST = "glm-5.3-flash:fast",
  MINIMAX_M3_FAST = "minimax-m3:fast",
}

export enum InferenceNetModels {
  GLM_5_2 = "glm-5.2",
  GLM_5_3 = "glm-5.3",
  GLM_5_3_FLASH = "glm-5.3-flash",
  LLAMA_3_3_70B_INSTRUCT = "llama-3.3-70b-instruct",
  DEEPSEEK_V3_2 = "deepseek-v3.2",
  GPT_4_1_MINI = "gpt-4.1-mini",
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  CLAUDE_HAIKU_4_5 = "claude-haiku-4-5",
}

export enum IoIntelligenceModels {
  ZAI_ORG_GLM_5_3_FLASH = "zai-org/GLM-5.3-Flash",
  ZAI_ORG_GLM_5_3 = "zai-org/GLM-5.3",
  QWEN_QWEN3_8_27B = "Qwen/Qwen3.8-27B",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH_0731 = "deepseek-ai/DeepSeek-V4-Flash-0731",
  MOONSHOTAI_KIMI_K3 = "moonshotai/Kimi-K3",
  XIAOMIMIMO_MIMO_V2_5 = "XiaomiMiMo/MiMo-V2.5",
  ZAI_ORG_GLM_5_2 = "zai-org/GLM-5.2",
  MOONSHOTAI_KIMI_K2_7_CODE = "moonshotai/Kimi-K2.7-Code",
  QWEN_QWEN3_6_35B_A3B = "Qwen/Qwen3.6-35B-A3B",
  QWEN_QWEN3_6_27B = "Qwen/Qwen3.6-27B",
  MINIMAXAI_MINIMAX_M2_7 = "MiniMaxAI/MiniMax-M2.7",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH = "deepseek-ai/DeepSeek-V4-Flash",
  DEEPSEEK_AI_DEEPSEEK_V4_PRO = "deepseek-ai/DeepSeek-V4-Pro",
  MOONSHOTAI_KIMI_K2_6 = "moonshotai/Kimi-K2.6",
  ZAI_ORG_GLM_5_1 = "zai-org/GLM-5.1",
  MINIMAXAI_MINIMAX_M2_5 = "MiniMaxAI/MiniMax-M2.5",
  MOONSHOTAI_KIMI_K2_5 = "moonshotai/Kimi-K2.5",
  ZAI_ORG_GLM_5 = "zai-org/GLM-5",
  DEEPSEEK_AI_DEEPSEEK_V3_2 = "deepseek-ai/DeepSeek-V3.2",
  MOONSHOTAI_KIMI_K2_THINKING = "moonshotai/Kimi-K2-Thinking",
  ZAI_ORG_GLM_4_5_AIR = "zai-org/GLM-4.5-Air",
  GOOGLE_GEMMA_4_26B_A4B_IT = "google/gemma-4-26b-a4b-it",
  ZAI_ORG_GLM_4_7_FLASH = "zai-org/GLM-4.7-Flash",
  ZAI_ORG_GLM_4_7 = "zai-org/GLM-4.7",
  MOONSHOTAI_KIMI_K2_INSTRUCT_0905 = "moonshotai/Kimi-K2-Instruct-0905",
  OPENAI_GPT_OSS_120B = "openai/gpt-oss-120b",
  DEEPSEEK_AI_DEEPSEEK_R1_0528 = "deepseek-ai/DeepSeek-R1-0528",
  ZAI_ORG_GLM_4_6 = "zai-org/GLM-4.6",
  QWEN_QWEN3_NEXT_80B_A3B_INSTRUCT = "Qwen/Qwen3-Next-80B-A3B-Instruct",
  INTEL_QWEN3_CODER_480B_A35B_INSTRUCT_INT4_MIXED_AR = "Intel/Qwen3-Coder-480B-A35B-Instruct-int4-mixed-ar",
  META_LLAMA_LLAMA_4_MAVERICK_17B_128E_INSTRUCT_FP8 = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  MISTRALAI_MISTRAL_NEMO_INSTRUCT_2407 = "mistralai/Mistral-Nemo-Instruct-2407",
  OPENAI_GPT_OSS_20B = "openai/gpt-oss-20b",
  META_LLAMA_LLAMA_3_3_70B_INSTRUCT = "meta-llama/Llama-3.3-70B-Instruct",
}

export enum KoscomputeModels {
  QWEN_QWEN3_8_27B = "qwen/qwen3.8-27b",
}

export enum LemonfoxAiModels {
  DEEPSEEK_V4_FLASH = "deepseek-v4-flash",
  MIMO_V2_5_PRO = "mimo-v2.5-pro",
}

export enum LilacModels {
  MOONSHOTAI_KIMI_K2_6 = "moonshotai/kimi-k2.6",
  MINIMAXAI_MINIMAX_M3 = "minimaxai/minimax-m3",
  ZAI_ORG_GLM_5_2 = "zai-org/glm-5.2",
  GOOGLE_GEMMA_4_31B_IT = "google/gemma-4-31b-it",
}

export enum LlmtechModels {
  NVIDIA_QWEN3_8_27B_NVFP4 = "nvidia/Qwen3.8-27B-NVFP4",
}

export enum MancerModels {
  MYTHOMAX = "mythomax",
  DEEPSEEK_V4_FLASH = "deepseek-v4-flash",
  DEEPSEEK_V4_FLASH_0731 = "deepseek-v4-flash-0731",
  MYTHOLITE = "mytholite",
  REMM_SLERP = "remm-slerp",
  MAGNUM_72B_V4 = "magnum-72b-v4",
  GLM_4_7 = "glm-4.7",
  GPT_OSS_120B = "gpt-oss-120b",
  WEAVER_ALPHA = "weaver-alpha",
  DANS_PE_1_3_24B = "dans-pe-1.3-24b",
}

export enum MetaModelApiModels {
  MUSE_SPARK_1_3 = "muse-spark-1.3",
  MUSE_SPARK_1_2 = "muse-spark-1.2",
  MUSE_SPARK_1_1 = "muse-spark-1.1",
  MUSE_SPARK_1_3_CONTRIBUTOR = "muse-spark-1.3-contributor",
  MUSE_SPARK_1_2_CONTRIBUTOR = "muse-spark-1.2-contributor",
}

export enum MinimaxModels {
  MINIMAX_M3 = "MiniMax-M3",
  MINIMAX_M3_1_FLASH_PREVIEW = "MiniMax-M3.1-Flash-Preview",
  MINIMAX_M2_7 = "MiniMax-M2.7",
  MINIMAX_M2_7_HIGHSPEED = "MiniMax-M2.7-highspeed",
  MINIMAX_M2_5 = "MiniMax-M2.5",
  MINIMAX_M2_5_HIGHSPEED = "MiniMax-M2.5-highspeed",
  MINIMAX_M2_1 = "MiniMax-M2.1",
  MINIMAX_M2_1_HIGHSPEED = "MiniMax-M2.1-highspeed",
  MINIMAX_M2 = "MiniMax-M2",
}

export enum MistralModels {
  MISTRAL_LARGE_LATEST = "mistral-large-latest",
  MISTRAL_LARGE_2512 = "mistral-large-2512",
  MISTRAL_MEDIUM_LATEST = "mistral-medium-latest",
  MISTRAL_MEDIUM_2508 = "mistral-medium-2508",
  MISTRAL_SMALL_LATEST = "mistral-small-latest",
  MISTRAL_SMALL_2506 = "mistral-small-2506",
  MAGISTRAL_MEDIUM_LATEST = "magistral-medium-latest",
  MAGISTRAL_SMALL_LATEST = "magistral-small-latest",
  MINISTRAL_14B_2512 = "ministral-14b-2512",
  MINISTRAL_8B_2512 = "ministral-8b-2512",
  MINISTRAL_3B_2512 = "ministral-3b-2512",
  CODESTRAL_LATEST = "codestral-latest",
  CODESTRAL_2508 = "codestral-2508",
  CODESTRAL_EMBED = "codestral-embed",
  DEVSTRAL_MEDIUM_LATEST = "devstral-medium-latest",
  DEVSTRAL_SMALL_LATEST = "devstral-small-latest",
  PIXTRAL_LARGE = "pixtral-large",
  PIXTRAL_12B = "pixtral-12b",
  VOXTRAL_SMALL_LATEST = "voxtral-small-latest",
  VOXTRAL_MINI_LATEST = "voxtral-mini-latest",
  DEVSTRAL_2 = "devstral-2512",
  DEVSTRAL_SMALL_2 = "devstral-small-2512",
  MAGISTRAL_MEDIUM_2509 = "magistral-medium-2509",
  MAGISTRAL_SMALL_2509 = "magistral-small-2509",
  VOXTRAL_MINI_TRANSCRIBE_2 = "voxtral-mini-2602",
  MISTRAL_OCR_3 = "mistral-ocr-2512",
  MISTRAL_OCR_LATEST = "mistral-ocr-latest",
  MISTRAL_NEMO = "mistral-nemo",
  MISTRAL_EMBED = "mistral-embed",
  MISTRAL_MODERATION_LATEST = "mistral-moderation-latest",
  MISTRAL_SMALL_4 = "mistral-small-2603",
  MISTRAL_SMALL_CREATIVE = "mistral-small-creative",
}

export enum MoarkModels {
  QWEN3_8B = "Qwen3-8B",
  QWEN3_4B = "Qwen3-4B",
  ERNIE_4_5_TURBO = "ERNIE-4.5-Turbo",
  GLM_5_3 = "GLM-5.3",
  KIMI_K3 = "kimi-k3",
  DEEPSEEK_V4_PRO_0813 = "DeepSeek-V4-Pro-0813",
}

export enum ModelscopeModels {
  QWEN_QWEN3_5_35B_A3B = "Qwen/Qwen3.5-35B-A3B",
  QWEN_QWEN3_5_27B = "Qwen/Qwen3.5-27B",
  DEEPSEEK_AI_DEEPSEEK_V4_PRO_0813 = "deepseek-ai/DeepSeek-V4-Pro-0813",
  ZHIPUAI_GLM_5_2 = "ZhipuAI/GLM-5.2",
  QWEN_QWEN3_5_397B_A17B = "Qwen/Qwen3.5-397B-A17B",
  QWEN_QWEN3_5_122B_A10B = "Qwen/Qwen3.5-122B-A10B",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH_0731 = "deepseek-ai/DeepSeek-V4-Flash-0731",
  MINIMAX_MINIMAX_M3 = "MiniMax/MiniMax-M3",
  STEPFUN_AI_STEP_3_7_FLASH = "stepfun-ai/Step-3.7-Flash",
  QWEN_QWEN3_8_27B = "Qwen/Qwen3.8-27B",
  MISTRALAI_MISTRAL_LARGE_INSTRUCT_2407 = "mistralai/Mistral-Large-Instruct-2407",
  QWEN_QWEN3_8_FLASH_NEXT = "Qwen/Qwen3.8-Flash-Next",
}

export enum MoonshotAiModels {
  KIMI_K3 = "kimi-k3",
  KIMI_K2_7_CODE = "kimi-k2.7-code",
  KIMI_K2_7_CODE_HIGHSPEED = "kimi-k2.7-code-highspeed",
  KIMI_K2_6 = "kimi-k2.6",
}

export enum MorphModels {
  MORPH_V3_LARGE = "morph-v3-large",
  MORPH_V3_FAST = "morph-v3-fast",
}

export enum NebiusModels {
  QWEN_QWEN3_235B_A22B_INSTRUCT_2507 = "Qwen/Qwen3-235B-A22B-Instruct-2507",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH_0731 = "deepseek-ai/DeepSeek-V4-Flash-0731",
  OPENAI_GPT_OSS_120B = "openai/gpt-oss-120b",
  QWEN_QWEN3_30B_A3B_INSTRUCT_2507 = "Qwen/Qwen3-30B-A3B-Instruct-2507",
  NOUSRESEARCH_HERMES_4_405B = "NousResearch/Hermes-4-405B",
  NVIDIA_NEMOTRON_3_5_LIGHTNING = "nvidia/Nemotron-3_5-Lightning",
  OPENBMB_MINICPM_V_4_5 = "openbmb/MiniCPM-V-4_5",
}

export enum NeuralwattModels {
  GLM_5_3 = "glm-5.3",
  GLM_5_3_FLASH = "glm-5.3-flash",
  QWEN_3_8_27B = "qwen-3.8-27b",
  QWEN3_6_35B = "qwen3.6-35b",
  KIMI_K2_7_CODE = "kimi-k2.7-code",
  KIMI_K3 = "kimi-k3",
  DEEPSEEK_V4_1_FLASH = "deepseek-v4.1-flash",
  GEMMA_4_31B = "gemma-4-31b",
}

export enum NovitaModels {
  META_LLAMA_LLAMA_3_3_70B_INSTRUCT = "meta-llama/llama-3.3-70b-instruct",
  ZAI_ORG_GLM_5_3_FLASH = "zai-org/glm-5.3-flash",
  DEEPSEEK_DEEPSEEK_V3_0324 = "deepseek/deepseek-v3-0324",
  QWEN_QWEN_2_5_72B_INSTRUCT = "qwen/qwen-2.5-72b-instruct",
  GOOGLE_GEMMA_3_27B_IT = "google/gemma-3-27b-it",
}

export enum OvhcloudModels {
  GPT_OSS_120B = "gpt-oss-120b",
  GPT_OSS_20B = "gpt-oss-20b",
  QWEN3_6_27B = "Qwen3.6-27B",
  QWEN3_8_27B = "Qwen3.8-27B",
  QWEN3_5_397B_A17B = "Qwen3.5-397B-A17B",
  QWEN3_5_9B = "Qwen3.5-9B",
  META_LLAMA_3_3_70B_INSTRUCT = "Meta-Llama-3_3-70B-Instruct",
  QWEN2_5_VL_72B_INSTRUCT = "Qwen2.5-VL-72B-Instruct",
  QWEN3_CODER_30B_A3B_INSTRUCT = "Qwen3-Coder-30B-A3B-Instruct",
  MISTRAL_SMALL_3_2_24B_INSTRUCT_2506 = "Mistral-Small-3.2-24B-Instruct-2506",
  MISTRAL_7B_INSTRUCT_V0_3 = "Mistral-7B-Instruct-v0.3",
  MISTRAL_NEMO_INSTRUCT_2407 = "Mistral-Nemo-Instruct-2407",
  QWEN3GUARD_GEN_8B = "Qwen3Guard-Gen-8B",
  QWEN3GUARD_GEN_0_6B = "Qwen3Guard-Gen-0.6B",
}

export enum ParasailModels {
  PARASAIL_LLAMA_33_70B_FP8 = "parasail-llama-33-70b-fp8",
  PARASAIL_LLAMA_4_MAVERICK_INSTRUCT_FP8 = "parasail-llama-4-maverick-instruct-fp8",
  PARASAIL_GPT_OSS_120B = "parasail-gpt-oss-120b",
  PARASAIL_GPT_OSS_20B = "parasail-gpt-oss-20b",
  PARASAIL_DEEPSEEK_V4_FLASH = "parasail-deepseek-v4-flash",
  PARASAIL_DEEPSEEK_V4_PRO = "parasail-deepseek-v4-pro",
  PARASAIL_KIMI_K3 = "parasail-kimi-k3",
  PARASAIL_GLM_52 = "parasail-glm-52",
  PARASAIL_QWEN3P5_35B_A3B = "parasail-qwen3p5-35b-a3b",
  PARASAIL_QWEN25_VL_72B_INSTRUCT = "parasail-qwen25-vl-72b-instruct",
  PARASAIL_GEMMA3_27B_IT = "parasail-gemma3-27b-it",
  PARASAIL_MINIMAX_M3 = "parasail-minimax-m3",
}

export enum ParetoInferenceModels {
  Z_AI_GLM_5_3_FLASH = "z-ai/glm-5.3-flash",
}

export enum PerplexityModels {
  SONAR = "sonar",
  SONAR_PRO = "sonar-pro",
  SONAR_REASONING = "sonar-reasoning",
  SONAR_REASONING_PRO = "sonar-reasoning-pro",
  SONAR_DEEP_RESEARCH = "sonar-deep-research",
}

export enum PoolsideModels {
  POOLSIDE_LAGUNA_S_2_1 = "poolside/laguna-s-2.1",
}

export enum PrimeIntellectModels {
  OPENAI_GPT_4_1_MINI = "openai/gpt-4.1-mini",
  OPENAI_GPT_4_1 = "openai/gpt-4.1",
  ANTHROPIC_CLAUDE_SONNET_4_5 = "anthropic/claude-sonnet-4.5",
  META_LLAMA_LLAMA_3_3_70B_INSTRUCT = "meta-llama/llama-3.3-70b-instruct",
  GOOGLE_GEMINI_2_5_FLASH = "google/gemini-2.5-flash",
  QWEN_QWEN3_235B_A22B_INSTRUCT_2507 = "Qwen/Qwen3-235B-A22B-Instruct-2507",
  Z_AI_GLM_5_3 = "z-ai/glm-5.3",
  OPENAI_GPT_5_4_MINI = "openai/gpt-5.4-mini",
  OPENAI_GPT_OSS_120B = "openai/gpt-oss-120b",
  DEEPSEEK_DEEPSEEK_V4_FLASH = "deepseek/deepseek-v4-flash",
  ANTHROPIC_CLAUDE_HAIKU_4_5 = "anthropic/claude-haiku-4.5",
  QWEN_QWEN3_5_122B_A10B = "Qwen/Qwen3.5-122B-A10B",
}

export enum RekaModels {
  REKA_FLASH = "reka-flash",
  REKA_EDGE = "reka-edge",
  REKA_EDGE_2603 = "reka-edge-2603",
}

export enum SakanaAiModels {
  FUGU = "fugu",
  FUGU_ULTRA = "fugu-ultra",
  FUGU_ULTRA_V2_0 = "fugu-ultra-v2.0",
  FUGU_ULTRA_V1_1 = "fugu-ultra-v1.1",
  FUGU_ULTRA_V1_0 = "fugu-ultra-v1.0",
  FUGU_MAX = "fugu-max",
  FUGU_MAX_V1_0 = "fugu-max-v1.0",
  SAKANA_NAMAZU = "sakana-namazu",
  SAKANA_NAMAZU_V1_0 = "sakana-namazu-v1.0",
}

export enum SambanovaModels {
  META_LLAMA_3_3_70B_INSTRUCT = "Meta-Llama-3.3-70B-Instruct",
  GPT_OSS_120B = "gpt-oss-120b",
  DEEPSEEK_V3_1 = "DeepSeek-V3.1",
  DEEPSEEK_V3_2 = "DeepSeek-V3.2",
  MINIMAX_M2_7 = "MiniMax-M2.7",
  MINIMAX_M3 = "MiniMax-M3",
  GEMMA_4_31B_IT = "gemma-4-31B-it",
}

export enum SarvamModels {
  SARVAM_105B = "sarvam-105b",
  SARVAM_105B_CONVERSATIONS = "sarvam-105b-conversations",
}

export enum ScalewayModels {
  MISTRAL_SMALL_3_2_24B_INSTRUCT_2506 = "mistral-small-3.2-24b-instruct-2506",
  LLAMA_3_3_70B_INSTRUCT = "llama-3.3-70b-instruct",
  QWEN3_235B_A22B_INSTRUCT_2507 = "qwen3-235b-a22b-instruct-2507",
  GEMMA_4_26B_A4B_IT = "gemma-4-26b-a4b-it",
  QWEN3_6_35B_A3B = "qwen3.6-35b-a3b",
  QWEN3_8_27B = "qwen3.8-27b",
  QWEN3_5_397B_A17B = "qwen3.5-397b-a17b",
  DEEPSEEK_V4_FLASH_0731 = "deepseek-v4-flash-0731",
  GLM_5_2 = "glm-5.2",
  MISTRAL_MEDIUM_3_5_128B = "mistral-medium-3.5-128b",
  GPT_OSS_120B = "gpt-oss-120b",
}

export enum SiliconflowModels {
  DEEPSEEK_AI_DEEPSEEK_V4_PRO = "deepseek-ai/DeepSeek-V4-Pro",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH = "deepseek-ai/DeepSeek-V4-Flash",
  DEEPSEEK_AI_DEEPSEEK_V3_2 = "deepseek-ai/DeepSeek-V3.2",
  ZAI_ORG_GLM_5_1 = "zai-org/GLM-5.1",
  ZAI_ORG_GLM_5 = "zai-org/GLM-5",
  MOONSHOTAI_KIMI_K2_6 = "moonshotai/Kimi-K2.6",
  MOONSHOTAI_KIMI_K2_5 = "moonshotai/Kimi-K2.5",
  QWEN_QWEN3_6_27B = "Qwen/Qwen3.6-27B",
  QWEN_QWEN3_6_35B_A3B = "Qwen/Qwen3.6-35B-A3B",
  QWEN_QWEN3_32B = "Qwen/Qwen3-32B",
  QWEN_QWEN3_VL_32B_INSTRUCT = "Qwen/Qwen3-VL-32B-Instruct",
  GOOGLE_GEMMA_4_31B_IT = "google/gemma-4-31B-it",
}

export enum StackitModels {
  QWEN_QWEN3_VL_235B_A22B_INSTRUCT_FP8 = "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8",
  CORTECS_LLAMA_3_3_70B_INSTRUCT_FP8_DYNAMIC = "cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic",
  OPENAI_GPT_OSS_120B = "openai/gpt-oss-120b",
  QWEN_QWEN3_8_27B = "Qwen/Qwen3.8-27B",
  GOOGLE_GEMMA_4_31B_IT = "google/gemma-4-31B-it",
  OPENAI_GPT_OSS_20B = "openai/gpt-oss-20b",
}

export enum StepfunModels {
  STEP_5_PREVIEW = "step-5-preview",
  STEP_3_7_FLASH = "step-3.7-flash",
  STEP_3_5_FLASH = "step-3.5-flash",
  STEP_3_5_FLASH_2603 = "step-3.5-flash-2603",
  STEP_1O_TURBO_VISION = "step-1o-turbo-vision",
}

export enum SubconsciousModels {
  SUBCONSCIOUS_GLM_5_3_MARATHON = "subconscious/glm-5.3-marathon",
  SUBCONSCIOUS_DEEPSEEK_V4_1_FLASH_MARATHON = "subconscious/deepseek-v4.1-flash-marathon",
  SUBCONSCIOUS_TIM_QWEN3_6_27B = "subconscious/tim-qwen3.6-27b",
}

export enum SyntheticModels {
  SYN_LARGE_TEXT = "syn:large:text",
  SYN_SMALL_TEXT = "syn:small:text",
  SYN_LARGE_VISION = "syn:large:vision",
  SYN_SMALL_VISION = "syn:small:vision",
  HF_ZAI_ORG_GLM_5_3_FLASH = "hf:zai-org/GLM-5.3-Flash",
  HF_OPENAI_GPT_OSS_120B = "hf:openai/gpt-oss-120b",
  HF_NVIDIA_NVIDIA_NEMOTRON_3_SUPER_120B_A12B_NVFP4 = "hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4",
  HF_DEEPSEEK_AI_DEEPSEEK_V4_1_FLASH = "hf:deepseek-ai/DeepSeek-V4.1-Flash",
  HF_MOONSHOTAI_KIMI_K3 = "hf:moonshotai/Kimi-K3",
  HF_QWEN_QWEN3_8_27B = "hf:Qwen/Qwen3.8-27B",
  HF_ZAI_ORG_GLM_4_7_FLASH = "hf:zai-org/GLM-4.7-Flash",
}

export enum TelnyxModels {
  ZAI_ORG_GLM_5_3_FLASH = "zai-org/GLM-5.3-Flash",
  ZAI_ORG_GLM_5_3 = "zai-org/GLM-5.3",
  DEEPSEEK_AI_DEEPSEEK_V4_1_FLASH = "deepseek-ai/DeepSeek-V4.1-Flash",
  MOONSHOTAI_KIMI_K3 = "moonshotai/Kimi-K3",
  MOONSHOTAI_KIMI_K2_6 = "moonshotai/Kimi-K2.6",
  ZAI_ORG_GLM_5_2 = "zai-org/GLM-5.2",
  MINIMAXAI_MINIMAX_M3_MXFP8 = "MiniMaxAI/MiniMax-M3-MXFP8",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH_0731 = "deepseek-ai/DeepSeek-V4-Flash-0731",
  QWEN_QWEN3_8_27B = "Qwen/Qwen3.8-27B",
}

export enum ThinkingMachinesModels {
  MOONSHOTAI_KIMI_K2_6 = "moonshotai/Kimi-K2.6",
  QWEN_QWEN3_8_27B = "Qwen/Qwen3.8-27B",
  QWEN_QWEN3_6_35B_A3B = "Qwen/Qwen3.6-35B-A3B",
  QWEN_QWEN3_5_397B_A17B = "Qwen/Qwen3.5-397B-A17B",
  QWEN_QWEN3_5_9B = "Qwen/Qwen3.5-9B",
  QWEN_QWEN3_5_4B = "Qwen/Qwen3.5-4B",
  QWEN_QWEN3_8B = "Qwen/Qwen3-8B",
  OPENAI_GPT_OSS_120B = "openai/gpt-oss-120b",
  OPENAI_GPT_OSS_20B = "openai/gpt-oss-20b",
  DEEPSEEK_AI_DEEPSEEK_V3_1 = "deepseek-ai/DeepSeek-V3.1",
  ZAI_ORG_GLM_5_3_PEFT_262144 = "zai-org/GLM-5.3:peft:262144",
  NVIDIA_NVIDIA_NEMOTRON_3_SUPER_120B_A12B_BF16 = "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16",
}

export enum TinfoilModels {
  KIMI_K3 = "kimi-k3",
  GPT_OSS_120B = "gpt-oss-120b",
  GEMMA4_31B = "gemma4-31b",
  LLAMA3_3_70B = "llama3-3-70b",
  GLM_5_3 = "glm-5-3",
  GLM_5_3_FLASH = "glm-5-3-flash",
  DEEPSEEK_V4_1_FLASH = "deepseek-v4-1-flash",
}

export enum TogetherAIModels {
  LLAMA_3_3_70B_INSTRUCT_TURBO = "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  LLAMA_3_1_405B_INSTRUCT_TURBO = "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
  LLAMA_3_1_70B_INSTRUCT_TURBO = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
  LLAMA_3_1_8B_INSTRUCT_TURBO = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
  MIXTRAL_8X22B_INSTRUCT = "mistralai/Mixtral-8x22B-Instruct-v0.1",
  MIXTRAL_8X7B_INSTRUCT = "mistralai/Mixtral-8x7B-Instruct-v0.1",
  QWEN_2_5_72B_INSTRUCT_TURBO = "Qwen/Qwen2.5-72B-Instruct-Turbo",
  QWEN_2_5_CODER_32B = "Qwen/Qwen2.5-Coder-32B-Instruct",
  DEEPSEEK_R1 = "deepseek-ai/DeepSeek-R1",
  DEEPSEEK_V3 = "deepseek-ai/DeepSeek-V3",
  GEMMA_2_27B_IT = "google/gemma-2-27b-it",
  WIZARDLM_2_8X22B = "microsoft/WizardLM-2-8x22B",
}

export enum UmansAiModels {
  UMANS_CODER = "umans-coder",
  UMANS_GLM_5_3 = "umans-glm-5.3",
  UMANS_DEEPSEEK_V4_FLASH_0731 = "umans-deepseek-v4-flash-0731",
  UMANS_KIMI_K3 = "umans-kimi-k3",
  UMANS_GLM_5_3_FLASH = "umans-glm-5.3-flash",
  UMANS_DEEPSEEK_V4_1_FLASH = "umans-deepseek-v4.1-flash",
  UMANS_FLASH = "umans-flash",
}

export enum UpstageModels {
  SOLAR_PRO4 = "solar-pro4",
  SOLAR_PRO4_260806 = "solar-pro4-260806",
  SOLAR_PRO3 = "solar-pro3",
  SOLAR_PRO3_260323 = "solar-pro3-260323",
  SOLAR_PRO2 = "solar-pro2",
  SOLAR_PRO2_251215 = "solar-pro2-251215",
  SOLAR_MINI = "solar-mini",
  SOLAR_MINI_250422 = "solar-mini-250422",
  SYN_PRO = "syn-pro",
  SYN_PRO_251021 = "syn-pro-251021",
}

export enum VeniceAiModels {
  ZAI_ORG_GLM_5_2 = "zai-org-glm-5-2",
  ZAI_ORG_GLM_5 = "zai-org-glm-5",
  ZAI_ORG_GLM_5_1 = "zai-org-glm-5-1",
  DEEPSEEK_V4_PRO_0813 = "deepseek-v4-pro-0813",
  KIMI_K3 = "kimi-k3",
  KIMI_K2_6 = "kimi-k2-6",
  QWEN3_VL_235B_A22B = "qwen3-vl-235b-a22b",
  VENICE_UNCENSORED_1_2 = "venice-uncensored-1-2",
  GROK_4_7 = "grok-4-7",
  CLAUDE_OPUS_4_8 = "claude-opus-4-8",
}

export enum VisparkModels {
  VISPARK_VISION_LARGE = "vispark/vision-large",
  VISPARK_VISION_MEDIUM = "vispark/vision-medium",
  VISPARK_VISION_SMALL = "vispark/vision-small",
}

export enum VultrInferenceModels {
  GLM_5_2 = "glm-5.2",
  DEEPSEEK_V4_1_FLASH = "deepseek-v4.1-flash",
  QWEN3_8_FLASH_NEXT = "qwen3.8-flash-next",
  MIMO_V2_6_FLASH_RL = "mimo-v2.6-flash-rl",
  DEEPSEEK_V4_FLASH_0731 = "deepseek-v4-flash-0731",
  GLM_5_3 = "glm-5.3",
  GLM_5_3_FLASH = "glm-5.3-flash",
  GLM_5_X_MENTHOL = "glm-5.x-menthol",
  LAGUNA_S_2_1 = "laguna-s-2.1",
  MIMO_V2_6_PRO_RL = "mimo-v2.6-pro-rl",
  MINIMAX_M3 = "minimax-m3",
  MUSE_GLIMMER_30B = "muse-glimmer-30b",
}

export enum WaferModels {
  GLM_5_3 = "GLM-5.3",
  DEEPSEEK_V4_PRO = "DeepSeek-V4-Pro",
  KIMI_K3 = "Kimi-K3",
  GLM_5_2 = "GLM-5.2",
  QWEN3_8_27B = "Qwen3.8-27B",
  GLM_5_3_FLASH = "GLM-5.3-Flash",
  DEEPSEEK_V4_1_FLASH = "DeepSeek-V4.1-Flash",
  DEEPSEEK_V4_FLASH_0731_FAST = "DeepSeek-V4-Flash-0731-Fast",
}

export enum WandbInferenceModels {
  OPENAI_GPT_OSS_120B = "openai/gpt-oss-120b",
  DEEPSEEK_AI_DEEPSEEK_V4_FLASH_0731 = "deepseek-ai/DeepSeek-V4-Flash-0731",
  META_LLAMA_LLAMA_3_3_70B_INSTRUCT = "meta-llama/Llama-3.3-70B-Instruct",
  OPENAI_GPT_OSS_20B = "openai/gpt-oss-20b",
  META_LLAMA_LLAMA_3_1_8B_INSTRUCT = "meta-llama/Llama-3.1-8B-Instruct",
  ZAI_ORG_GLM_5_2 = "zai-org/GLM-5.2",
  DEEPSEEK_AI_DEEPSEEK_V4_PRO_0813 = "deepseek-ai/DeepSeek-V4-Pro-0813",
  GOOGLE_GEMMA_4_26B_A4B_IT = "google/gemma-4-26B-A4B-it",
  QWEN_QWEN3_8_27B = "Qwen/Qwen3.8-27B",
  MOONSHOTAI_KIMI_K2_6 = "moonshotai/Kimi-K2.6",
  DEEPSEEK_AI_DEEPSEEK_V4_1_FLASH = "deepseek-ai/DeepSeek-V4.1-Flash",
  IBM_GRANITE_GRANITE_4_2_8B = "ibm-granite/granite-4.2-8b",
}

export enum XaiModels {
  GROK_4_7 = "grok-4.7",
  GROK_4_6 = "grok-4.6",
  GROK_4_5 = "grok-4.5",
  GROK_4_3 = "grok-4.3",
  GROK_3 = "grok-3",
  GROK_3_MINI = "grok-3-mini",
  GROK_2_LATEST = "grok-2-latest",
  GROK_2_VISION_LATEST = "grok-2-vision-latest",
  GROK_BETA = "grok-beta",
}

export enum ZAiModels {
  GLM_5_3 = "glm-5.3",
  GLM_5_3_FLASH = "glm-5.3-flash",
  GLM_5_3_FLASHX = "glm-5.3-flashx",
  GLM_5_2 = "glm-5.2",
  GLM_5_1 = "glm-5.1",
  GLM_5 = "glm-5",
  GLM_4_7 = "glm-4.7",
  GLM_4_6 = "glm-4.6",
  GLM_4_5 = "glm-4.5",
  GLM_4_5_AIR = "glm-4.5-air",
  GLM_4_7_FLASHX = "glm-4.7-flashx",
  GLM_4_7_FLASH = "glm-4.7-flash",
}
// ── END GENERATED(models-enums) ──

/**
 * TypeSafe decision models. Hand-written: TypeSafe is a Tier-3 provider, so
 * it is not in the provider catalog and codegen never touches this.
 *
 * `jev-preview` currently resolves to the same build as `jev-latest`; both
 * report themselves as a pinned version (e.g. `jev-1.13.0`) in the response.
 */
export enum TypeSafeModels {
  JEV_LATEST = "jev-latest",
  JEV_PREVIEW = "jev-preview",
}

/**
 * Laya checkpoints. Hand-written: Laya is a Tier-3 provider, so it is not in
 * the provider catalog and codegen never touches this.
 *
 * `auto` sends no model, which lets Laya's own router pick a checkpoint by
 * the detected language of the state.
 */
export enum LayaModels {
  TYPED_DECISIONS = "typed-decisions",
  ENGLISH = "english",
  MULTILINGUAL = "multilingual",
  AUTO = "auto",
}

/**
 * XOR decision models. Hand-written: XOR is a Tier-3 provider, so it is not in
 * the provider catalog and codegen never touches this.
 */
export enum XorModels {
  XOR_1_1 = "xor-1.1",
}

/**
 * Perplexity decision models. Hand-written: the Decisions API is a Tier-3
 * provider, so it is not in the provider catalog and codegen never touches
 * this. The API serves one model and answers 400 to a missing or unknown one.
 */
export enum PerplexityDeciderModels {
  PPLX_DECIDER_V1_27B = "pplx-decider-v1-27b",
}
