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
} from "../constants/enums.js";

/**
 * Model choice for CLI prompts (inquirer format)
 */
export interface ModelChoice {
  name: string;
  value: string;
  description?: string;
}

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
      model: OpenRouterModels.CLAUDE_3_5_SONNET,
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
  [AIProviderName.OPENROUTER]: OpenRouterModels.CLAUDE_3_5_SONNET,
  [AIProviderName.OPENAI_COMPATIBLE]: "gpt-4o",
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
    name: `${item.model} (${item.description})`,
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
      // Take top 2 from each provider
      config.slice(0, 2).forEach((item) => {
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
