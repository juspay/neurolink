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
 * Supported Models for Amazon Bedrock
 */
export enum BedrockModels {
  CLAUDE_3_SONNET = "anthropic.claude-3-sonnet-20240229-v1:0",
  CLAUDE_3_HAIKU = "anthropic.claude-3-haiku-20240307-v1:0",
  CLAUDE_3_5_SONNET = "anthropic.claude-3-5-sonnet-20240620-v1:0",
  CLAUDE_3_7_SONNET = "arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",
}

/**
 * Supported Models for OpenAI
 */
export enum OpenAIModels {
  GPT_4 = "gpt-4",
  GPT_4_TURBO = "gpt-4-turbo",
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini",
  GPT_3_5_TURBO = "gpt-3.5-turbo",
  O1_PREVIEW = "o1-preview",
  O1_MINI = "o1-mini",
}

/**
 * Supported Models for Google Vertex AI
 */
export enum VertexModels {
  // Claude 4 Series (Latest - May 2025)
  CLAUDE_4_0_SONNET = "claude-sonnet-4@20250514",
  CLAUDE_4_0_OPUS = "claude-opus-4@20250514",

  // Claude 3.5 Series (Still supported)
  CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20241022",
  CLAUDE_3_5_HAIKU = "claude-3-5-haiku-20241022",

  // Claude 3 Series (Legacy support)
  CLAUDE_3_SONNET = "claude-3-sonnet-20240229",
  CLAUDE_3_OPUS = "claude-3-opus-20240229",
  CLAUDE_3_HAIKU = "claude-3-haiku-20240307",

  // Gemini 2.5 Series (Latest - 2025)
  GEMINI_2_5_PRO = "gemini-2.5-pro",
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE = "gemini-2.5-flash-lite",

  // Gemini 2.0 Series
  GEMINI_2_0_FLASH_001 = "gemini-2.0-flash-001",

  // Gemini 1.5 Series (Legacy support)
  GEMINI_1_5_PRO = "gemini-1.5-pro",
  GEMINI_1_5_FLASH = "gemini-1.5-flash",
}

/**
 * Supported Models for Google AI Studio
 */
export enum GoogleAIModels {
  // Gemini 2.5 Series (Latest - 2025)
  GEMINI_2_5_PRO = "gemini-2.5-pro",
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE = "gemini-2.5-flash-lite",

  // Gemini 2.0 Series
  GEMINI_2_0_FLASH_001 = "gemini-2.0-flash-001",

  // Gemini 1.5 Series (Legacy support)
  GEMINI_1_5_PRO = "gemini-1.5-pro",
  GEMINI_1_5_FLASH = "gemini-1.5-flash",
  GEMINI_1_5_FLASH_LITE = "gemini-1.5-flash-lite",
}

/**
 * Supported Models for Anthropic (Direct API)
 */
export enum AnthropicModels {
  // Claude 3.5 Series (Latest)
  CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20241022",
  CLAUDE_3_5_HAIKU = "claude-3-5-haiku-20241022",

  // Claude 3 Series (Legacy support)
  CLAUDE_3_SONNET = "claude-3-sonnet-20240229",
  CLAUDE_3_OPUS = "claude-3-opus-20240229",
  CLAUDE_3_HAIKU = "claude-3-haiku-20240307",
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
