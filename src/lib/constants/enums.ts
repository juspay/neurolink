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
  HUGGINGFACE = "huggingface",
  OLLAMA = "ollama",
  MISTRAL = "mistral",
  LITELLM = "litellm",
  SAGEMAKER = "sagemaker",
  AUTO = "auto",
}

/**
 * Popular Models for OpenRouter (300+ available at openrouter.ai/models)
 * OpenRouter uses 'provider/model' format
 */
export enum OpenRouterModels {
  // Anthropic Claude models
  CLAUDE_3_5_SONNET = "anthropic/claude-3-5-sonnet",
  CLAUDE_3_5_HAIKU = "anthropic/claude-3-5-haiku",
  CLAUDE_3_OPUS = "anthropic/claude-3-opus",
  // OpenAI models
  GPT_4O = "openai/gpt-4o",
  GPT_4O_MINI = "openai/gpt-4o-mini",
  GPT_4_TURBO = "openai/gpt-4-turbo",
  // Google models
  GEMINI_2_0_FLASH = "google/gemini-2.0-flash",
  GEMINI_1_5_PRO = "google/gemini-1.5-pro",
  // Meta Llama models
  LLAMA_3_1_70B = "meta-llama/llama-3.1-70b-instruct",
  LLAMA_3_1_8B = "meta-llama/llama-3.1-8b-instruct",
  // Mistral models
  MISTRAL_LARGE = "mistralai/mistral-large",
  MIXTRAL_8X7B = "mistralai/mixtral-8x7b-instruct",
}

/**
 * Supported Models for Amazon Bedrock
 */
export enum BedrockModels {
  // ============================================================================
  // ANTHROPIC CLAUDE MODELS
  // ============================================================================

  // Claude 4.5 Series (Latest - September-November 2025)
  CLAUDE_4_5_OPUS = "anthropic.claude-opus-4-5-20251124-v1:0",
  CLAUDE_4_5_SONNET = "anthropic.claude-sonnet-4-5-20250929-v1:0",
  CLAUDE_4_5_HAIKU = "anthropic.claude-haiku-4-5-20251001-v1:0",

  // Claude 4 Series (May-August 2025)
  CLAUDE_4_1_OPUS = "anthropic.claude-opus-4-1-20250805-v1:0",
  CLAUDE_4_SONNET = "anthropic.claude-sonnet-4-20250514-v1:0",

  // Claude 3.7 Series
  CLAUDE_3_7_SONNET = "anthropic.claude-3-7-sonnet-20250219-v1:0",

  // Claude 3.5 Series
  CLAUDE_3_5_SONNET = "anthropic.claude-3-5-sonnet-20241022-v1:0",
  CLAUDE_3_5_HAIKU = "anthropic.claude-3-5-haiku-20241022-v1:0",

  // Claude 3 Series (Legacy support)
  CLAUDE_3_SONNET = "anthropic.claude-3-sonnet-20240229-v1:0",
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
}

/**
 * Supported Models for OpenAI
 */
export enum OpenAIModels {
  // GPT-5.2 Series (Released December 11, 2025) - Latest flagship models
  GPT_5_2 = "gpt-5.2",
  GPT_5_2_CHAT_LATEST = "gpt-5.2-chat-latest",
  GPT_5_2_PRO = "gpt-5.2-pro",

  // GPT-5 Series (Released August 7, 2025)
  GPT_5 = "gpt-5",
  GPT_5_MINI = "gpt-5-mini",
  GPT_5_NANO = "gpt-5-nano",

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
  O1_PREVIEW = "o1-preview",
  O1_MINI = "o1-mini",

  // GPT-4 Series (Legacy)
  GPT_4 = "gpt-4",
  GPT_4_TURBO = "gpt-4-turbo",

  // Legacy Models
  GPT_3_5_TURBO = "gpt-3.5-turbo",
}

/**
 * Supported Models for Azure OpenAI
 * Note: Azure uses deployment names, these are model identifiers
 */
export enum AzureOpenAIModels {
  // GPT-5.1 Series (Latest - December 2025)
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
  // Claude 4.5 Series (Latest - December 2025)
  CLAUDE_4_5_OPUS = "claude-opus-4-5@20251124",
  CLAUDE_4_5_SONNET = "claude-sonnet-4-5@20250929",
  CLAUDE_4_5_HAIKU = "claude-haiku-4-5@20251001",

  // Claude 4 Series (May 2025)
  CLAUDE_4_0_SONNET = "claude-sonnet-4@20250514",
  CLAUDE_4_0_OPUS = "claude-opus-4@20250514",

  // Claude 3.7 Series (February 2025)
  CLAUDE_3_7_SONNET = "claude-3-7-sonnet@20250219",

  // Claude 3.5 Series (Still supported)
  CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20241022",
  CLAUDE_3_5_HAIKU = "claude-3-5-haiku-20241022",

  // Claude 3 Series (Legacy support)
  CLAUDE_3_SONNET = "claude-3-sonnet-20240229",
  CLAUDE_3_OPUS = "claude-3-opus-20240229",
  CLAUDE_3_HAIKU = "claude-3-haiku-20240307",

  // Gemini 3 Series (Preview)
  /** Gemini 3 Pro - Base model with adaptive thinking */
  GEMINI_3_PRO = "gemini-3-pro",
  /** Gemini 3 Pro Preview - Versioned preview (November 2025) */
  GEMINI_3_PRO_PREVIEW_11_2025 = "gemini-3-pro-preview-11-2025",
  /** Gemini 3 Pro Latest - Auto-updated alias (always points to latest preview) */
  GEMINI_3_PRO_LATEST = "gemini-3-pro-latest",
  /** Gemini 3 Pro Preview - Generic preview (legacy) */
  GEMINI_3_PRO_PREVIEW = "gemini-3-pro-preview",
  /** Gemini 3 Flash - Base model with adaptive thinking */
  GEMINI_3_FLASH = "gemini-3-flash",
  /** Gemini 3 Flash Preview - Versioned preview */
  GEMINI_3_FLASH_PREVIEW = "gemini-3-flash-preview",
  /** Gemini 3 Flash Latest - Auto-updated alias (always points to latest preview) */
  GEMINI_3_FLASH_LATEST = "gemini-3-flash-latest",

  // Gemini 2.5 Series (Latest - 2025)
  GEMINI_2_5_PRO = "gemini-2.5-pro",
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE = "gemini-2.5-flash-lite",
  GEMINI_2_5_FLASH_IMAGE = "gemini-2.5-flash-image",

  // Gemini 2.0 Series
  GEMINI_2_0_FLASH = "gemini-2.0-flash",
  GEMINI_2_0_FLASH_001 = "gemini-2.0-flash-001",
  /** Gemini 2.0 Flash Lite - GA, production-ready, cost-optimized */
  GEMINI_2_0_FLASH_LITE = "gemini-2.0-flash-lite",

  // Gemini 1.5 Series (Legacy support)
  GEMINI_1_5_PRO = "gemini-1.5-pro-002",
  GEMINI_1_5_FLASH = "gemini-1.5-flash-002",
}

/**
 * Supported Models for Google AI Studio
 */
export enum GoogleAIModels {
  // Gemini 3 Series
  GEMINI_3_PRO_PREVIEW = "gemini-3-pro-preview",
  GEMINI_3_PRO_IMAGE_PREVIEW = "gemini-3-pro-image-preview",
  GEMINI_3_FLASH = "gemini-3-flash",
  GEMINI_3_FLASH_PREVIEW = "gemini-3-flash-preview",

  // Gemini 2.5 Series
  GEMINI_2_5_PRO = "gemini-2.5-pro",
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE = "gemini-2.5-flash-lite",
  GEMINI_2_5_FLASH_IMAGE = "gemini-2.5-flash-image",
  GEMINI_2_5_FLASH_LIVE = "gemini-2.5-flash-native-audio-preview-09-2025",

  // Gemini 2.0 Series
  GEMINI_2_0_FLASH = "gemini-2.0-flash",
  GEMINI_2_0_FLASH_001 = "gemini-2.0-flash-001",
  GEMINI_2_0_FLASH_LITE = "gemini-2.0-flash-lite",
  GEMINI_2_0_FLASH_IMAGE = "gemini-2.0-flash-preview-image-generation",

  // Gemini 1.5 Series (Legacy)
  GEMINI_1_5_PRO = "gemini-1.5-pro",
  GEMINI_1_5_FLASH = "gemini-1.5-flash",

  // Embedding Models
  GEMINI_EMBEDDING = "gemini-embedding-001",
  TEXT_EMBEDDING_004 = "text-embedding-004",
}

/**
 * Supported Models for Anthropic (Direct API)
 */
export enum AnthropicModels {
  // Claude 4.5 Series (Latest - September-November 2025)
  CLAUDE_OPUS_4_5 = "claude-opus-4-5-20251101",
  CLAUDE_SONNET_4_5 = "claude-sonnet-4-5-20250929",
  CLAUDE_4_5_HAIKU = "claude-haiku-4-5-20251001",

  // Claude 4.1 Series (Legacy)
  CLAUDE_OPUS_4_1 = "claude-opus-4-1-20250805",

  // Claude 4.0 Series (Legacy)
  CLAUDE_OPUS_4_0 = "claude-opus-4-20250514",
  CLAUDE_SONNET_4_0 = "claude-sonnet-4-20250514",

  // Claude 3.7 Series (Legacy)
  CLAUDE_SONNET_3_7 = "claude-3-7-sonnet-20250219",

  // Claude 3.5 Series (Legacy)
  CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20241022",
  CLAUDE_3_5_HAIKU = "claude-3-5-haiku-20241022",

  // Claude 3 Series (Legacy - Deprecated)
  CLAUDE_3_SONNET = "claude-3-sonnet-20240229",
  CLAUDE_3_OPUS = "claude-3-opus-20240229",
  CLAUDE_3_HAIKU = "claude-3-haiku-20240307",
}

/**
 * Supported Models for Mistral AI
 */
export enum MistralModels {
  // Mistral Large (Latest)
  MISTRAL_LARGE_LATEST = "mistral-large-latest",
  MISTRAL_LARGE_2512 = "mistral-large-2512",

  // Mistral Medium
  MISTRAL_MEDIUM_LATEST = "mistral-medium-latest",
  MISTRAL_MEDIUM_2508 = "mistral-medium-2508",

  // Mistral Small
  MISTRAL_SMALL_LATEST = "mistral-small-latest",
  MISTRAL_SMALL_2506 = "mistral-small-2506",

  // Magistral (Reasoning)
  MAGISTRAL_MEDIUM_LATEST = "magistral-medium-latest",
  MAGISTRAL_SMALL_LATEST = "magistral-small-latest",

  // Ministral (Edge Models)
  MINISTRAL_14B_2512 = "ministral-14b-2512",
  MINISTRAL_8B_2512 = "ministral-8b-2512",
  MINISTRAL_3B_2512 = "ministral-3b-2512",

  // Codestral (Code Generation)
  CODESTRAL_LATEST = "codestral-latest",
  CODESTRAL_2508 = "codestral-2508",
  CODESTRAL_EMBED = "codestral-embed",

  // Devstral (Software Development)
  DEVSTRAL_MEDIUM_LATEST = "devstral-medium-latest",
  DEVSTRAL_SMALL_LATEST = "devstral-small-latest",

  // Pixtral (Multimodal/Vision)
  PIXTRAL_LARGE = "pixtral-large",
  PIXTRAL_12B = "pixtral-12b",

  // Voxtral (Audio)
  VOXTRAL_SMALL_LATEST = "voxtral-small-latest",
  VOXTRAL_MINI_LATEST = "voxtral-mini-latest",

  // Specialized Models
  MISTRAL_NEMO = "mistral-nemo",
  MISTRAL_EMBED = "mistral-embed",
  MISTRAL_MODERATION_LATEST = "mistral-moderation-latest",
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

  // Perplexity AI via LiteLLM
  PERPLEXITY_SONAR_PRO = "perplexity/sonar-pro",
  PERPLEXITY_SONAR_REASONING_PRO = "perplexity/sonar-reasoning-pro",
}

/**
 * Supported Models for Hugging Face Inference API
 */
export enum HuggingFaceModels {
  // Meta Llama 3.3
  LLAMA_3_3_70B_INSTRUCT = "meta-llama/Llama-3.3-70B-Instruct",

  // Meta Llama 3.2
  LLAMA_3_2_1B = "meta-llama/Llama-3.2-1B",
  LLAMA_3_2_3B_INSTRUCT = "meta-llama/Llama-3.2-3B-Instruct",

  // Meta Llama 3.1
  LLAMA_3_1_8B = "meta-llama/Llama-3.1-8B",
  LLAMA_3_1_70B_INSTRUCT = "meta-llama/Llama-3.1-70B-Instruct",
  LLAMA_3_1_405B_INSTRUCT = "meta-llama/Llama-3.1-405B-Instruct",

  // Meta Llama 3.0
  LLAMA_3_8B_INSTRUCT = "meta-llama/Meta-Llama-3-8B-Instruct",
  LLAMA_3_70B_INSTRUCT = "meta-llama/Meta-Llama-3-70B-Instruct",

  // Mistral Large
  MISTRAL_LARGE_3_675B = "mistralai/Mistral-Large-3-675B-Instruct-2512",

  // Mistral Small
  MISTRAL_SMALL_3_1_24B = "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
  MISTRAL_SMALL_24B = "mistralai/Mistral-Small-24B-Instruct-2501",

  // Mistral
  MISTRAL_7B_INSTRUCT = "mistralai/Mistral-7B-Instruct-v0.2",
  MIXTRAL_8X7B_INSTRUCT = "mistralai/Mixtral-8x7B-Instruct-v0.1",

  // Mistral Devstral
  DEVSTRAL_2 = "mistralai/Devstral-2",

  // Qwen 2.5
  QWEN_2_5_7B = "Qwen/Qwen2.5-7B",
  QWEN_2_5_32B = "Qwen/Qwen2.5-32B",
  QWEN_2_5_72B_INSTRUCT = "Qwen/Qwen2.5-72B-Instruct",

  // Qwen 2.5 Coder
  QWEN_2_5_CODER_7B = "Qwen/Qwen2.5-Coder-7B",
  QWEN_2_5_CODER_32B_INSTRUCT = "Qwen/Qwen2.5-Coder-32B-Instruct",

  // Qwen QwQ
  QWQ_32B = "Qwen/QwQ-32B",

  // Qwen 2.5 VL (Multimodal)
  QWEN_2_5_VL_32B = "Qwen/Qwen2.5-VL-32B-Instruct",

  // DeepSeek
  DEEPSEEK_R1 = "deepseek-ai/DeepSeek-R1",
  DEEPSEEK_V3 = "deepseek-ai/DeepSeek-V3",
  DEEPSEEK_V3_1 = "deepseek-ai/DeepSeek-V3.1",
  DEEPSEEK_V3_2_EXP = "deepseek-ai/DeepSeek-V3.2-Exp",

  // Microsoft Phi
  PHI_4 = "microsoft/phi-4",
  PHI_4_REASONING = "microsoft/Phi-4-reasoning",
  PHI_4_MINI_INSTRUCT = "microsoft/Phi-4-mini-instruct",
  PHI_4_MINI_REASONING = "microsoft/Phi-4-mini-reasoning",
  PHI_3_MINI_128K_INSTRUCT = "microsoft/Phi-3-mini-128k-instruct",
  PHI_3_VISION_128K_INSTRUCT = "microsoft/Phi-3-vision-128k-instruct",

  // Google Gemma 3
  GEMMA_3_270M = "google/gemma-3-270m",
  GEMMA_3_1B_IT = "google/gemma-3-1b-it",
  GEMMA_3_4B_IT = "google/gemma-3-4b-it",
  GEMMA_3_12B_IT = "google/gemma-3-12b-it",
  GEMMA_3_27B_IT = "google/gemma-3-27b-it",

  // Google Gemma 2
  GEMMA_2_9B = "google/gemma-2-9b",
  GEMMA_2_27B = "google/gemma-2-27b",

  // Google Gemma 1
  GEMMA_2B = "google/gemma-2b",
  GEMMA_7B = "google/gemma-7b",

  // Falcon
  FALCON_40B_INSTRUCT = "tiiuae/falcon-40b-instruct",
  FALCON_180B_CHAT = "tiiuae/falcon-180B-chat",

  // Code Models
  STARCODER2_15B = "bigcode/starcoder2-15b",
  CODELLAMA_34B_INSTRUCT = "codellama/CodeLlama-34b-Instruct-hf",

  // BLOOM
  BLOOM_7B1 = "bigscience/bloom-7b1",
  BLOOM_1B3 = "bigscience/bloom-1b3",
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
}

// Error severity levels
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}
