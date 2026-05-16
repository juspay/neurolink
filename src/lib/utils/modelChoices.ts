/**
 * Centralized model choices for CLI commands
 * Derives choices from model enums to ensure consistency
 */

import {
  AIProviderName,
  OpenAIModels,
  AnthropicModels,
  GoogleAIModels,
  BedrockModels,
  VertexModels,
  MistralModels,
  OllamaModels,
  AzureOpenAIModels,
  LiteLLMModels,
  HuggingFaceModels,
  SageMakerModels,
  OpenRouterModels,
  DeepSeekModels,
  NvidiaNimModels,
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
import type { ModelChoice } from "../types/index.js";

/**
 * Top models per provider with descriptions for CLI prompts
 * These are curated lists of the most commonly used/recommended models
 */
const TOP_MODELS_CONFIG: Record<
  AIProviderName,
  { model: string; description: string }[]
> = {
  [AIProviderName.OPENAI]: [
    {
      model: OpenAIModels.GPT_4O,
      description: "Recommended - Latest multimodal model",
    },
    { model: OpenAIModels.GPT_4O_MINI, description: "Cost-effective, fast" },
    {
      model: OpenAIModels.GPT_5_2,
      description: "Latest flagship with deep reasoning",
    },
    { model: OpenAIModels.O3, description: "Advanced reasoning model" },
    { model: OpenAIModels.GPT_4_TURBO, description: "Previous generation" },
    {
      model: OpenAIModels.GPT_3_5_TURBO,
      description: "Legacy, most cost-effective",
    },
  ],
  [AIProviderName.ANTHROPIC]: [
    {
      model: AnthropicModels.CLAUDE_SONNET_4_5,
      description: "Recommended - Latest and most capable",
    },
    {
      model: AnthropicModels.CLAUDE_4_5_HAIKU,
      description: "Fast and cost-effective",
    },
    {
      model: AnthropicModels.CLAUDE_OPUS_4_5,
      description: "Most powerful for complex tasks",
    },
    {
      model: AnthropicModels.CLAUDE_3_5_SONNET,
      description: "Excellent reasoning and coding",
    },
    {
      model: AnthropicModels.CLAUDE_3_5_HAIKU,
      description: "Fast and economical",
    },
    {
      model: AnthropicModels.CLAUDE_3_OPUS,
      description: "Previous gen, powerful",
    },
  ],
  [AIProviderName.GOOGLE_AI]: [
    {
      model: GoogleAIModels.GEMINI_2_5_FLASH,
      description: "Recommended - Fast and efficient",
    },
    {
      model: GoogleAIModels.GEMINI_2_5_PRO,
      description: "Most capable, large context",
    },
    {
      model: GoogleAIModels.GEMINI_2_0_FLASH,
      description: "Stable production model",
    },
    {
      model: GoogleAIModels.GEMINI_3_PRO_PREVIEW,
      description: "Latest preview",
    },
    {
      model: GoogleAIModels.GEMINI_1_5_PRO,
      description: "Previous generation",
    },
    {
      model: GoogleAIModels.GEMINI_1_5_FLASH,
      description: "Legacy fast model",
    },
  ],
  [AIProviderName.VERTEX]: [
    {
      model: VertexModels.GEMINI_2_5_FLASH,
      description: "Recommended - Fast and efficient",
    },
    {
      model: VertexModels.GEMINI_2_5_PRO,
      description: "Most capable, large context",
    },
    { model: VertexModels.CLAUDE_4_5_SONNET, description: "Claude on Vertex" },
    {
      model: VertexModels.GEMINI_2_0_FLASH,
      description: "Stable production model",
    },
    { model: VertexModels.GEMINI_1_5_PRO, description: "Previous generation" },
    {
      model: VertexModels.CLAUDE_3_5_SONNET,
      description: "Claude 3.5 on Vertex",
    },
  ],
  [AIProviderName.BEDROCK]: [
    {
      model: BedrockModels.CLAUDE_4_5_SONNET,
      description: "Recommended - Latest Claude",
    },
    { model: BedrockModels.NOVA_PRO, description: "Amazon Nova balanced" },
    { model: BedrockModels.NOVA_LITE, description: "Fast and cost-effective" },
    { model: BedrockModels.CLAUDE_3_5_SONNET, description: "Excellent coding" },
    { model: BedrockModels.LLAMA_4_MAVERICK_17B, description: "Meta Llama 4" },
    { model: BedrockModels.MISTRAL_LARGE_3, description: "Mistral flagship" },
  ],
  [AIProviderName.AZURE]: [
    {
      model: AzureOpenAIModels.GPT_4O,
      description: "Recommended - Latest multimodal",
    },
    {
      model: AzureOpenAIModels.GPT_4O_MINI,
      description: "Cost-effective, fast",
    },
    { model: AzureOpenAIModels.GPT_5_1, description: "Latest flagship" },
    { model: AzureOpenAIModels.O3, description: "Advanced reasoning" },
    {
      model: AzureOpenAIModels.GPT_4_TURBO,
      description: "Previous generation",
    },
    { model: AzureOpenAIModels.GPT_3_5_TURBO, description: "Legacy model" },
  ],
  [AIProviderName.MISTRAL]: [
    {
      model: MistralModels.MISTRAL_LARGE_LATEST,
      description: "Recommended - Flagship model",
    },
    {
      model: MistralModels.MISTRAL_SMALL_LATEST,
      description: "Cost-effective",
    },
    {
      model: MistralModels.CODESTRAL_LATEST,
      description: "Specialized for code",
    },
    { model: MistralModels.PIXTRAL_LARGE, description: "Multimodal vision" },
    {
      model: MistralModels.MAGISTRAL_MEDIUM_LATEST,
      description: "Reasoning model",
    },
    { model: MistralModels.MISTRAL_NEMO, description: "Efficient base model" },
  ],
  [AIProviderName.OLLAMA]: [
    {
      model: OllamaModels.LLAMA4_LATEST,
      description: "Recommended - Latest Llama 4",
    },
    {
      model: OllamaModels.LLAMA3_3_LATEST,
      description: "High-performance local",
    },
    { model: OllamaModels.DEEPSEEK_R1_70B, description: "Advanced reasoning" },
    { model: OllamaModels.QWEN3_72B, description: "Multilingual reasoning" },
    { model: OllamaModels.MISTRAL_LARGE_LATEST, description: "Mistral local" },
    {
      model: OllamaModels.LLAMA3_2_LATEST,
      description: "Efficient local model",
    },
  ],
  [AIProviderName.LITELLM]: [
    { model: LiteLLMModels.OPENAI_GPT_4O, description: "OpenAI via LiteLLM" },
    {
      model: LiteLLMModels.ANTHROPIC_CLAUDE_SONNET_4_5,
      description: "Anthropic via LiteLLM",
    },
    { model: LiteLLMModels.GEMINI_2_5_PRO, description: "Google via LiteLLM" },
    {
      model: LiteLLMModels.GROQ_LLAMA_3_1_70B_VERSATILE,
      description: "Groq via LiteLLM",
    },
    { model: LiteLLMModels.MISTRAL_LARGE, description: "Mistral via LiteLLM" },
    {
      model: LiteLLMModels.VERTEX_GEMINI_2_5_PRO,
      description: "Vertex via LiteLLM",
    },
  ],
  [AIProviderName.HUGGINGFACE]: [
    {
      model: HuggingFaceModels.LLAMA_3_3_70B_INSTRUCT,
      description: "Recommended - Latest Llama",
    },
    {
      model: HuggingFaceModels.MISTRAL_LARGE_3_675B,
      description: "Mistral Large",
    },
    { model: HuggingFaceModels.DEEPSEEK_R1, description: "Advanced reasoning" },
    {
      model: HuggingFaceModels.QWEN_2_5_72B_INSTRUCT,
      description: "Qwen flagship",
    },
    { model: HuggingFaceModels.PHI_4, description: "Microsoft Phi-4" },
    { model: HuggingFaceModels.GEMMA_3_27B_IT, description: "Google Gemma 3" },
  ],
  [AIProviderName.SAGEMAKER]: [
    {
      model: SageMakerModels.LLAMA_4_MAVERICK_17B_128E,
      description: "Recommended - Llama 4",
    },
    { model: SageMakerModels.LLAMA_3_70B, description: "Meta Llama 3 70B" },
    { model: SageMakerModels.MISTRAL_SMALL_24B, description: "Mistral Small" },
    { model: SageMakerModels.MIXTRAL_8X7B, description: "Mixtral MoE" },
    { model: SageMakerModels.FALCON_3_10B, description: "Falcon 3" },
    { model: SageMakerModels.CODE_LLAMA_34B, description: "Code Llama" },
  ],
  [AIProviderName.OPENROUTER]: [
    {
      model: OpenRouterModels.CLAUDE_SONNET_4_5,
      description: "Anthropic via OpenRouter",
    },
    { model: OpenRouterModels.GPT_4O, description: "OpenAI via OpenRouter" },
    {
      model: OpenRouterModels.GEMINI_2_0_FLASH,
      description: "Google via OpenRouter",
    },
    { model: OpenRouterModels.LLAMA_3_1_70B, description: "Meta Llama" },
    {
      model: OpenRouterModels.MISTRAL_LARGE,
      description: "Mistral via OpenRouter",
    },
    { model: OpenRouterModels.MIXTRAL_8X7B, description: "Mixtral MoE" },
  ],
  [AIProviderName.OPENAI_COMPATIBLE]: [
    { model: "gpt-4o", description: "OpenAI-compatible model" },
    { model: "gpt-4o-mini", description: "Fast compatible model" },
    { model: "gpt-4-turbo", description: "Turbo compatible model" },
    { model: "gpt-3.5-turbo", description: "Legacy compatible model" },
  ],
  [AIProviderName.DEEPSEEK]: [
    { model: "deepseek-chat", description: "DeepSeek-V3 general chat" },
    {
      model: "deepseek-reasoner",
      description: "DeepSeek-R1 reasoning (slower, deeper)",
    },
  ],
  [AIProviderName.NVIDIA_NIM]: [
    {
      model: "meta/llama-3.3-70b-instruct",
      description: "Recommended - Llama 3.3 70B",
    },
    {
      model: "nvidia/llama-3.3-nemotron-super-49b-v1",
      description: "Nemotron Super (reasoning)",
    },
    {
      model: "deepseek-ai/deepseek-r1",
      description: "DeepSeek-R1 hosted on NIM",
    },
    {
      model: "meta/llama-3.2-90b-vision-instruct",
      description: "Llama 3.2 vision",
    },
    {
      model: "mistralai/mixtral-8x22b-instruct-v0.1",
      description: "Mixtral 8x22B",
    },
  ],
  [AIProviderName.LM_STUDIO]: [
    {
      model: "",
      description: "Auto-discover loaded model from /v1/models",
    },
  ],
  [AIProviderName.LLAMACPP]: [
    {
      model: "",
      description: "Use whatever model llama-server has loaded",
    },
  ],
  [AIProviderName.XAI]: [
    {
      model: XaiModels.GROK_3,
      description: "Recommended - Latest flagship Grok",
    },
    { model: XaiModels.GROK_3_MINI, description: "Faster + cheaper Grok 3" },
    {
      model: XaiModels.GROK_2_VISION_LATEST,
      description: "Multimodal (text + images)",
    },
    { model: XaiModels.GROK_2_LATEST, description: "Previous flagship" },
    { model: XaiModels.GROK_BETA, description: "Pre-release / experimental" },
  ],
  [AIProviderName.GROQ]: [
    {
      model: GroqModels.LLAMA_3_3_70B_VERSATILE,
      description: "Recommended - Production default; sub-100ms",
    },
    {
      model: GroqModels.LLAMA_3_1_8B_INSTANT,
      description: "Lowest latency tier",
    },
    {
      model: GroqModels.LLAMA_3_2_90B_VISION_PREVIEW,
      description: "Multimodal (vision)",
    },
    { model: GroqModels.GEMMA_2_9B_IT, description: "Google Gemma 2 9B" },
    {
      model: GroqModels.MIXTRAL_8X7B_32768,
      description: "Mistral 8x7B MoE, 32K context",
    },
  ],
  [AIProviderName.COHERE]: [
    {
      model: CohereModels.COMMAND_R_PLUS,
      description: "Recommended - Flagship RAG-tuned chat",
    },
    { model: CohereModels.COMMAND_R, description: "Smaller RAG-tuned chat" },
    { model: CohereModels.COMMAND_R7B, description: "Most compact" },
  ],
  [AIProviderName.TOGETHER_AI]: [
    {
      model: TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
      description: "Recommended - Llama 3.3 70B Turbo",
    },
    {
      model: TogetherAIModels.LLAMA_3_1_405B_INSTRUCT_TURBO,
      description: "Flagship 405B",
    },
    {
      model: TogetherAIModels.QWEN_2_5_72B_INSTRUCT_TURBO,
      description: "Qwen 2.5 72B Turbo",
    },
    {
      model: TogetherAIModels.DEEPSEEK_R1,
      description: "DeepSeek R1 reasoning",
    },
    {
      model: TogetherAIModels.MIXTRAL_8X22B_INSTRUCT,
      description: "Mistral 8x22B MoE",
    },
  ],
  [AIProviderName.FIREWORKS]: [
    {
      model: FireworksModels.DEEPSEEK_V4_PRO,
      description: "Recommended - DeepSeek V4 Pro",
    },
    { model: FireworksModels.GLM_5P1, description: "GLM 5.1 (Zhipu)" },
    { model: FireworksModels.KIMI_K2P6, description: "Kimi K2.6 (Moonshot)" },
    { model: FireworksModels.GPT_OSS_120B, description: "GPT-OSS 120B" },
  ],
  [AIProviderName.PERPLEXITY]: [
    {
      model: PerplexityModels.SONAR,
      description: "Recommended - Sonar with web grounding",
    },
    { model: PerplexityModels.SONAR_PRO, description: "Better reasoning" },
    {
      model: PerplexityModels.SONAR_REASONING,
      description: "Explicit reasoning traces",
    },
    {
      model: PerplexityModels.SONAR_REASONING_PRO,
      description: "Flagship reasoning + web",
    },
    {
      model: PerplexityModels.SONAR_DEEP_RESEARCH,
      description: "Long-form research with citations",
    },
  ],
  [AIProviderName.CLOUDFLARE]: [
    {
      model: CloudflareModels.LLAMA_3_3_70B_FAST,
      description: "Recommended - Llama 3.3 70B FP8 fast",
    },
    {
      model: CloudflareModels.LLAMA_3_1_70B_INSTRUCT,
      description: "Llama 3.1 70B",
    },
    {
      model: CloudflareModels.LLAMA_3_1_8B_FAST,
      description: "Llama 3.1 8B fast",
    },
    {
      model: CloudflareModels.LLAMA_3_2_11B_VISION,
      description: "Multimodal (vision)",
    },
  ],
  [AIProviderName.REPLICATE]: [
    {
      model: "meta/meta-llama-3-70b-instruct",
      description: "Recommended - Llama 3 70B Instruct (stable)",
    },
    {
      model: "meta/meta-llama-3.1-405b-instruct",
      description: "Llama 3.1 405B (flagship)",
    },
    {
      model: "mistralai/mixtral-8x7b-instruct-v0.1",
      description: "Mixtral 8x7B v0.1",
    },
    {
      model: "black-forest-labs/flux-1.1-pro",
      description: "FLUX 1.1 Pro (image-gen)",
    },
    {
      model: "stability-ai/stable-diffusion-3.5-large",
      description: "SD 3.5 Large (image-gen)",
    },
  ],
  [AIProviderName.VOYAGE]: [
    {
      model: VoyageModels.VOYAGE_3_5,
      description: "Recommended - General-purpose embeddings",
    },
    {
      model: VoyageModels.VOYAGE_3_LARGE,
      description: "Flagship — highest accuracy",
    },
    {
      model: VoyageModels.VOYAGE_CODE_3,
      description: "Code-tuned embeddings",
    },
    {
      model: VoyageModels.VOYAGE_MULTILINGUAL_2,
      description: "Multilingual embeddings",
    },
    {
      model: VoyageModels.VOYAGE_3_5_LITE,
      description: "Smaller / cheaper",
    },
  ],
  [AIProviderName.JINA]: [
    {
      model: JinaModels.JINA_EMBEDDINGS_V3,
      description: "Recommended - Multilingual flagship",
    },
    {
      model: JinaModels.JINA_EMBEDDINGS_V2_BASE_EN,
      description: "v2 base English",
    },
    {
      model: JinaModels.JINA_EMBEDDINGS_V2_BASE_CODE,
      description: "v2 base code",
    },
    {
      model: JinaModels.JINA_RERANKER_V2_BASE_MULTILINGUAL,
      description: "Reranker (multilingual)",
    },
    {
      model: JinaModels.JINA_COLBERT_V2,
      description: "Late-interaction retrieval",
    },
  ],
  [AIProviderName.STABILITY]: [
    {
      model: StabilityModels.STABLE_IMAGE_ULTRA,
      description: "Recommended - Flagship quality",
    },
    {
      model: StabilityModels.STABLE_IMAGE_CORE,
      description: "Fast tier",
    },
    { model: StabilityModels.SD_3_5_LARGE, description: "SD 3.5 Large" },
    {
      model: StabilityModels.SD_3_5_LARGE_TURBO,
      description: "SD 3.5 Large Turbo",
    },
    { model: StabilityModels.SD_3_5_MEDIUM, description: "SD 3.5 Medium" },
  ],
  [AIProviderName.IDEOGRAM]: [
    { model: IdeogramModels.IDEOGRAM_V3, description: "Recommended - V3" },
    { model: IdeogramModels.IDEOGRAM_V2, description: "V2" },
    { model: IdeogramModels.IDEOGRAM_V2_TURBO, description: "V2 Turbo (fast)" },
    { model: IdeogramModels.IDEOGRAM_V1, description: "V1" },
  ],
  [AIProviderName.RECRAFT]: [
    {
      model: RecraftModels.RECRAFT_V3,
      description: "Recommended - Raster V3",
    },
    {
      model: RecraftModels.RECRAFT_V3_SVG,
      description: "Vector / SVG output",
    },
    { model: RecraftModels.RECRAFT_V2, description: "V2" },
  ],
  [AIProviderName.AUTO]: [],
};

/**
 * Default models per provider (first choice/recommended)
 */
export const DEFAULT_MODELS: Record<string, string> = {
  [AIProviderName.OPENAI]: OpenAIModels.GPT_4O,
  [AIProviderName.ANTHROPIC]: AnthropicModels.CLAUDE_SONNET_4_5,
  [AIProviderName.GOOGLE_AI]: GoogleAIModels.GEMINI_2_5_FLASH,
  [AIProviderName.VERTEX]: VertexModels.GEMINI_2_5_FLASH,
  [AIProviderName.BEDROCK]: BedrockModels.CLAUDE_4_5_SONNET,
  [AIProviderName.AZURE]: AzureOpenAIModels.GPT_4O,
  [AIProviderName.MISTRAL]: MistralModels.MISTRAL_LARGE_LATEST,
  [AIProviderName.OLLAMA]: OllamaModels.LLAMA4_LATEST,
  [AIProviderName.LITELLM]: LiteLLMModels.OPENAI_GPT_4O,
  [AIProviderName.HUGGINGFACE]: HuggingFaceModels.LLAMA_3_3_70B_INSTRUCT,
  [AIProviderName.SAGEMAKER]: SageMakerModels.LLAMA_4_MAVERICK_17B_128E,
  [AIProviderName.OPENROUTER]: OpenRouterModels.CLAUDE_SONNET_4_5,
  [AIProviderName.OPENAI_COMPATIBLE]: "gpt-4o",
  [AIProviderName.DEEPSEEK]: DeepSeekModels.DEEPSEEK_CHAT,
  [AIProviderName.NVIDIA_NIM]: NvidiaNimModels.LLAMA_3_3_70B_INSTRUCT,
  // LM Studio + llama.cpp auto-discover their loaded model from /v1/models;
  // an empty default is the documented signal to use that path.
  [AIProviderName.LM_STUDIO]: "",
  [AIProviderName.LLAMACPP]: "",
  [AIProviderName.XAI]: XaiModels.GROK_3,
  [AIProviderName.GROQ]: GroqModels.LLAMA_3_3_70B_VERSATILE,
  [AIProviderName.COHERE]: CohereModels.COMMAND_R_PLUS,
  [AIProviderName.TOGETHER_AI]: TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
  [AIProviderName.FIREWORKS]: FireworksModels.DEEPSEEK_V4_PRO,
  [AIProviderName.PERPLEXITY]: PerplexityModels.SONAR,
  [AIProviderName.CLOUDFLARE]: CloudflareModels.LLAMA_3_3_70B_FAST,
  [AIProviderName.REPLICATE]: "meta/meta-llama-3-70b-instruct",
  [AIProviderName.VOYAGE]: VoyageModels.VOYAGE_3_5,
  [AIProviderName.JINA]: JinaModels.JINA_EMBEDDINGS_V3,
  [AIProviderName.STABILITY]: StabilityModels.STABLE_IMAGE_ULTRA,
  [AIProviderName.IDEOGRAM]: IdeogramModels.IDEOGRAM_V3,
  [AIProviderName.RECRAFT]: RecraftModels.RECRAFT_V3,
};

/**
 * Model enum mappings for getAllModels
 */
const MODEL_ENUMS: Record<AIProviderName, Record<string, string> | null> = {
  [AIProviderName.OPENAI]: OpenAIModels,
  [AIProviderName.ANTHROPIC]: AnthropicModels,
  [AIProviderName.GOOGLE_AI]: GoogleAIModels,
  [AIProviderName.VERTEX]: VertexModels,
  [AIProviderName.BEDROCK]: BedrockModels,
  [AIProviderName.AZURE]: AzureOpenAIModels,
  [AIProviderName.MISTRAL]: MistralModels,
  [AIProviderName.OLLAMA]: OllamaModels,
  [AIProviderName.LITELLM]: LiteLLMModels,
  [AIProviderName.HUGGINGFACE]: HuggingFaceModels,
  [AIProviderName.SAGEMAKER]: SageMakerModels,
  [AIProviderName.OPENROUTER]: OpenRouterModels,
  [AIProviderName.OPENAI_COMPATIBLE]: null,
  [AIProviderName.DEEPSEEK]: DeepSeekModels,
  [AIProviderName.NVIDIA_NIM]: NvidiaNimModels,
  [AIProviderName.LM_STUDIO]: null,
  [AIProviderName.LLAMACPP]: null,
  [AIProviderName.XAI]: XaiModels,
  [AIProviderName.GROQ]: GroqModels,
  [AIProviderName.COHERE]: CohereModels,
  [AIProviderName.TOGETHER_AI]: TogetherAIModels,
  [AIProviderName.FIREWORKS]: FireworksModels,
  [AIProviderName.PERPLEXITY]: PerplexityModels,
  [AIProviderName.CLOUDFLARE]: CloudflareModels,
  [AIProviderName.REPLICATE]: ReplicateModels,
  [AIProviderName.VOYAGE]: VoyageModels,
  [AIProviderName.JINA]: JinaModels,
  [AIProviderName.STABILITY]: StabilityModels,
  [AIProviderName.IDEOGRAM]: IdeogramModels,
  [AIProviderName.RECRAFT]: RecraftModels,
  [AIProviderName.AUTO]: null,
};

/**
 * Get top model choices for a provider (for CLI prompts)
 * Returns models formatted for inquirer list prompts
 *
 * @param provider - The AI provider to get models for
 * @param limit - Maximum number of models to return (default: 5)
 * @returns Array of ModelChoice objects for CLI prompts
 */
export function getTopModelChoices(
  provider: AIProviderName,
  limit = 5,
): ModelChoice[] {
  const config = TOP_MODELS_CONFIG[provider];
  if (!config || config.length === 0) {
    return [];
  }

  const choices = config.slice(0, limit).map((item) => ({
    // Empty-string entries are auto-discovery sentinels for LM Studio /
    // llama.cpp. Surface them with a friendly label so the CLI doesn't show a
    // blank row, but keep `value: ""` so it matches `DEFAULT_MODELS` (which
    // also uses `""`) and any caller that preselects the active choice via
    // the default model still resolves to this entry.
    name:
      item.model.length > 0
        ? `${item.model} (${item.description})`
        : `Auto-discover loaded model (${item.description})`,
    value: item.model,
    description: item.description,
  }));

  // Always add custom option at the end
  choices.push({
    name: "Custom model (enter manually)",
    value: "custom",
    description: "Enter a custom model name",
  });

  return choices;
}

/**
 * Get all available models for a provider
 * Returns all values from the provider's model enum
 *
 * @param provider - The AI provider to get models for
 * @returns Array of model identifier strings
 */
export function getAllModels(provider: AIProviderName): string[] {
  const modelEnum = MODEL_ENUMS[provider];
  if (!modelEnum) {
    return [];
  }
  return Object.values(modelEnum);
}

/**
 * Get available provider choices for CLI
 * Returns all provider names except AUTO
 *
 * @returns Array of provider name strings
 */
export function getProviderChoices(): string[] {
  return Object.values(AIProviderName).filter((p) => p !== AIProviderName.AUTO);
}

/**
 * Get all provider choices including AUTO
 *
 * @returns Array of all provider name strings
 */
export function getAllProviderChoices(): string[] {
  return Object.values(AIProviderName);
}

/**
 * Get the default model for a provider
 *
 * @param provider - The AI provider
 * @returns Default model string for the provider
 */
export function getDefaultModel(provider: AIProviderName): string | undefined {
  return DEFAULT_MODELS[provider];
}

/**
 * Check if a model is valid for a given provider
 *
 * @param provider - The AI provider
 * @param model - The model identifier to check
 * @returns true if the model exists in the provider's model enum
 */
export function isValidModel(provider: AIProviderName, model: string): boolean {
  const models = getAllModels(provider);
  if (models.length === 0) {
    // For providers without strict model lists (like openai-compatible), allow any model
    return true;
  }
  return models.includes(model);
}

/**
 * Get model choices formatted for inquirer prompts with a specific default
 *
 * @param provider - The AI provider
 * @param currentModel - Current/existing model to mark as default
 * @param limit - Maximum number of models to return
 * @returns Array of ModelChoice objects with the current model marked
 */
export function getModelChoicesWithDefault(
  provider: AIProviderName,
  currentModel?: string,
  limit = 5,
): ModelChoice[] {
  const choices = getTopModelChoices(provider, limit);

  if (currentModel && !choices.some((c) => c.value === currentModel)) {
    // Insert current model at the top if not already in the list
    choices.unshift({
      name: `${currentModel} (current)`,
      value: currentModel,
      description: "Currently configured model",
    });
  } else if (currentModel) {
    // Mark the current model in the list
    const idx = choices.findIndex((c) => c.value === currentModel);
    if (idx !== -1) {
      choices[idx].name = `${choices[idx].name.replace(/\)$/, ", current)")}`;
    }
  }

  return choices;
}

/**
 * Get a flat list of popular models across all providers
 * Useful for model suggestions and auto-complete
 *
 * @returns Array of { provider, model, description } objects
 */
export function getPopularModelsAcrossProviders(): {
  provider: AIProviderName;
  model: string;
  description: string;
}[] {
  const popularModels: {
    provider: AIProviderName;
    model: string;
    description: string;
  }[] = [];

  for (const [provider, config] of Object.entries(TOP_MODELS_CONFIG)) {
    if (config && config.length > 0) {
      // Take top 2 from each provider, ignoring blank auto-discovery sentinels.
      // (Auto-discovery is surfaced separately by `getTopModelChoices` for
      // LM Studio / llama.cpp; we don't want it to appear in the cross-
      // provider popular-models list as an empty value.)
      config
        .filter((item) => item.model.length > 0)
        .slice(0, 2)
        .forEach((item) => {
          popularModels.push({
            provider: provider as AIProviderName,
            model: item.model,
            description: item.description,
          });
        });
    }
  }

  return popularModels;
}
