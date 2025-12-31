/**
 * Token Limit Constants for NeuroLink
 *
 * Centralized token configuration to replace magic numbers throughout the codebase.
 * Includes model-specific token limits, use-case optimized limits, and provider constraints.
 *
 * @fileoverview Token constants for AI model interactions
 * @author NeuroLink Team
 * @version 1.0.0
 */

/**
 * Standard token limit categories
 * General-purpose token limits for different use cases
 */
export const TOKEN_LIMITS = {
  /** Conservative limits (reliable across all models) */
  CONSERVATIVE: 4096, // 4K - Safe for all providers

  /** Standard limits (most modern models) */
  STANDARD: 8192, // 8K - Modern model standard

  /** High-capacity limits (premium models) */
  HIGH_CAPACITY: 16384, // 16K - High-capacity models

  /** Large context windows (specialized models) */
  LARGE_CONTEXT: 100000, // 100K - Large context models

  /** Ultra-large context windows (latest models) */
  ULTRA_LARGE_CONTEXT: 200000, // 200K - Ultra-large context

  /** Maximum context for any model */
  MAXIMUM_CONTEXT: 2097152, // 2M - Theoretical maximum
} as const;

/**
 * Use-case specific token limits
 * Optimized token limits for different application scenarios
 */
export const USE_CASE_TOKENS = {
  /** Quick evaluation tasks */
  EVALUATION: 500, // 500 - Keep evaluation fast

  /** Analysis operations */
  ANALYSIS: 800, // 800 - Analysis operations

  /** Summary generation */
  SUMMARY: 1000, // 1K - Summary generation

  /** Documentation generation */
  DOCUMENTATION: 12000, // 12K - Documentation generation

  /** Code generation */
  CODE_GENERATION: 4000, // 4K - Code generation tasks

  /** Creative writing */
  CREATIVE_WRITING: 6000, // 6K - Creative writing tasks

  /** Translation tasks */
  TRANSLATION: 2000, // 2K - Translation tasks

  /** Conversation responses */
  CONVERSATION: 2048, // 2K - Conversation responses

  /** Technical explanations */
  TECHNICAL_EXPLANATION: 3000, // 3K - Technical explanations

  /** Research tasks */
  RESEARCH: 8000, // 8K - Research and analysis
} as const;

/**
 * Provider-specific token limits
 * Safe token limits for each AI provider based on testing
 */
export const PROVIDER_TOKEN_LIMITS = {
  /** Anthropic model limits */
  ANTHROPIC: {
    // Claude 4.5 Series (September-November 2025)
    "claude-sonnet-4-5-20250929": 8192,
    "claude-opus-4-5-20251101": 8192,
    "claude-haiku-4-5-20251001": 8192,
    // Claude 3.5 Series
    "claude-3-5-sonnet-20241022": 4096,
    "claude-3-5-haiku-20241022": 4096,
    // Claude 3 Series
    "claude-3-haiku-20240307": 4096,
    "claude-3-opus-20240229": 4096,
    "claude-3-sonnet-20240229": 4096,
    default: 4096, // Conservative default for Anthropic
  },

  /** OpenAI model limits */
  OPENAI: {
    "gpt-4o": 16384,
    "gpt-4o-mini": 16384,
    "gpt-3.5-turbo": 4096,
    "gpt-4": 8192,
    "gpt-4-turbo": 4096,
    "o1-preview": 8192,
    "o1-mini": 8192,
    default: 8192, // OpenAI generally supports higher limits
  },

  /** Google AI model limits */
  GOOGLE_AI: {
    // Gemini 3 Series (Preview - November 2025)
    "gemini-3-pro-preview": 8192,
    "gemini-3-pro-preview-11-2025": 8192,
    "gemini-3-pro-latest": 8192,
    // Gemini 3 Flash Series
    "gemini-3-flash": 65536,
    "gemini-3-flash-preview": 65536,
    "gemini-3-flash-latest": 65536,
    // Gemini 2.5 Series
    "gemini-2.5-pro": 8192,
    "gemini-2.5-flash": 8192,
    "gemini-2.5-flash-lite": 8192,
    // Gemini 2.0 Series
    "gemini-2.0-flash-001": 8192,
    "gemini-2.0-flash-lite": 8192,
    // Gemini 1.5 Series (Legacy)
    "gemini-1.5-pro": 8192,
    "gemini-1.5-flash": 8192,
    "gemini-1.5-flash-lite": 8192,
    default: 4096, // Conservative default due to 500 errors at high limits
  },

  /** Google Vertex AI model limits */
  VERTEX: {
    // Gemini 3 Series (Preview - November 2025)
    "gemini-3-pro-preview": 8192,
    "gemini-3-pro-preview-11-2025": 8192,
    "gemini-3-pro-latest": 8192,
    // Gemini 3 Flash Series
    "gemini-3-flash": 65536,
    "gemini-3-flash-preview": 65536,
    "gemini-3-flash-latest": 65536,
    // Gemini 2.5 Series
    "gemini-2.5-pro": 8192,
    "gemini-2.5-flash": 8192,
    "gemini-2.5-flash-lite": 8192,
    // Gemini 2.0 Series
    "gemini-2.0-flash-001": 8192,
    "gemini-2.0-flash-lite": 8192,
    // Gemini 1.5 Series (Legacy)
    "gemini-1.5-pro": 8192,
    "gemini-1.5-flash": 8192,
    // Claude 4.5 Series (September-November 2025)
    "claude-sonnet-4-5@20250929": 8192,
    "claude-opus-4-5@20251124": 8192,
    "claude-haiku-4-5@20251001": 8192,
    // Claude 4 Series (May 2025)
    "claude-sonnet-4@20250514": 4096,
    "claude-opus-4@20250514": 4096,
    // Claude 3.5 Series
    "claude-3-5-sonnet-20241022": 4096,
    "claude-3-5-haiku-20241022": 4096,
    // Claude 3 Series
    "claude-3-sonnet-20240229": 4096,
    "claude-3-haiku-20240307": 4096,
    "claude-3-opus-20240229": 4096,
    default: 4096,
  },

  /** AWS Bedrock model limits */
  BEDROCK: {
    // Claude 4.5 Series (September-November 2025)
    "anthropic.claude-sonnet-4-5-20250929-v1:0": 8192,
    "anthropic.claude-opus-4-5-20251101-v1:0": 8192,
    "anthropic.claude-haiku-4-5-20251001-v1:0": 8192,
    // Claude 3.7 Series
    "us.anthropic.claude-3-7-sonnet-20250219-v1:0": 4096,
    // Claude 3.5 Series
    "anthropic.claude-3-5-sonnet-20241022-v1:0": 4096,
    "anthropic.claude-3-5-haiku-20241022-v1:0": 4096,
    // Claude 3 Series
    "anthropic.claude-3-sonnet-20240229-v1:0": 4096,
    "anthropic.claude-3-haiku-20240307-v1:0": 4096,
    "anthropic.claude-3-opus-20240229-v1:0": 4096,
    default: 4096,
  },

  /** Azure OpenAI model limits */
  AZURE: {
    "gpt-4o": 16384,
    "gpt-4o-mini": 16384,
    "gpt-4": 8192,
    "gpt-35-turbo": 4096,
    default: 8192,
  },

  /** Ollama model limits (local) */
  OLLAMA: {
    "llama3.2:latest": 8192,
    llama2: 4096,
    codellama: 8192,
    mistral: 4096,
    default: 8192, // Ollama typically supports higher limits
  },

  /** Hugging Face model limits */
  HUGGINGFACE: {
    default: 2048, // Conservative default for HuggingFace
  },

  /** Mistral model limits */
  MISTRAL: {
    "mistral-small-latest": 4096,
    "mistral-medium-latest": 4096,
    "mistral-large-latest": 8192,
    default: 4096,
  },

  /** LiteLLM proxy limits */
  LITELLM: {
    default: 4096, // Conservative default
  },

  /** Safe default across all providers */
  DEFAULT: 4096,
} as const;

/**
 * Context window sizes for different models
 * Maximum input token limits (separate from output limits)
 */
export const CONTEXT_WINDOWS = {
  /** Small context models */
  SMALL: 4096, // 4K - Small context

  /** Medium context models */
  MEDIUM: 32768, // 32K - Medium context

  /** Large context models */
  LARGE: 128000, // 128K - Large context

  /** Ultra-large context models */
  ULTRA_LARGE: 1048576, // 1M - Ultra-large context

  /** Maximum theoretical context */
  MAXIMUM: 2097152, // 2M - Maximum context
} as const;

/**
 * Model-specific token limits with input/output breakdown
 * For models that require explicit input and output token limits
 */
export const MODEL_TOKEN_LIMITS = {
  /** Gemini 3 Flash Series */
  "gemini-3-flash": { input: 1000000, output: 65536 },
  "gemini-3-flash-preview": { input: 1000000, output: 65536 },
  "gemini-3-flash-latest": { input: 1000000, output: 65536 },
} as const;

/**
 * Token estimation utilities
 * Rough estimates for token counting without full tokenization
 */
export const TOKEN_ESTIMATION = {
  /** Average characters per token (English) */
  CHARS_PER_TOKEN: 4, // 4 chars - English average

  /** Average words per token */
  WORDS_PER_TOKEN: 0.75, // 0.75 words - English average

  /** Code characters per token (more compact) */
  CODE_CHARS_PER_TOKEN: 3, // 3 chars - Code is more compact

  /** Safety margin for token estimates */
  SAFETY_MARGIN: 0.8, // 80% - Safety margin for estimates
} as const;

/**
 * Token utility functions
 */
export const TokenUtils = {
  /**
   * Get safe token limit for a specific provider and model
   * @param provider - Provider name
   * @param model - Model name (optional)
   * @returns Safe token limit for the provider/model
   */
  getProviderTokenLimit: (provider: string, model?: string): number => {
    const normalizedProvider = provider.toLowerCase().replace(/[-_]/g, "");

    let providerLimits: Record<string, number>;

    switch (normalizedProvider) {
      case "anthropic":
        providerLimits = PROVIDER_TOKEN_LIMITS.ANTHROPIC;
        break;
      case "openai":
        providerLimits = PROVIDER_TOKEN_LIMITS.OPENAI;
        break;
      case "googleai":
        providerLimits = PROVIDER_TOKEN_LIMITS.GOOGLE_AI;
        break;
      case "vertex":
        providerLimits = PROVIDER_TOKEN_LIMITS.VERTEX;
        break;
      case "bedrock":
        providerLimits = PROVIDER_TOKEN_LIMITS.BEDROCK;
        break;
      case "azure":
        providerLimits = PROVIDER_TOKEN_LIMITS.AZURE;
        break;
      case "ollama":
        providerLimits = PROVIDER_TOKEN_LIMITS.OLLAMA;
        break;
      case "huggingface":
        providerLimits = PROVIDER_TOKEN_LIMITS.HUGGINGFACE;
        break;
      case "mistral":
        providerLimits = PROVIDER_TOKEN_LIMITS.MISTRAL;
        break;
      case "litellm":
        providerLimits = PROVIDER_TOKEN_LIMITS.LITELLM;
        break;
      default:
        return PROVIDER_TOKEN_LIMITS.DEFAULT;
    }

    if (model && providerLimits[model]) {
      return providerLimits[model];
    }

    return providerLimits.default || PROVIDER_TOKEN_LIMITS.DEFAULT;
  },

  /**
   * Get token limit for specific use case
   * @param useCase - Use case type
   * @returns Appropriate token limit
   */
  getUseCaseTokenLimit: (useCase: keyof typeof USE_CASE_TOKENS): number => {
    return USE_CASE_TOKENS[useCase] || TOKEN_LIMITS.STANDARD;
  },

  /**
   * Estimate token count from text
   * @param text - Input text
   * @param isCode - Whether the text is code (more compact tokenization)
   * @returns Estimated token count
   */
  estimateTokenCount: (text: string, isCode = false): number => {
    const charsPerToken = isCode
      ? TOKEN_ESTIMATION.CODE_CHARS_PER_TOKEN
      : TOKEN_ESTIMATION.CHARS_PER_TOKEN;

    const estimatedTokens = Math.ceil(text.length / charsPerToken);

    // Apply safety margin
    return Math.ceil(estimatedTokens / TOKEN_ESTIMATION.SAFETY_MARGIN);
  },

  /**
   * Check if text exceeds token limit
   * @param text - Input text
   * @param limit - Token limit to check against
   * @param isCode - Whether the text is code
   * @returns True if text exceeds limit
   */
  exceedsTokenLimit: (text: string, limit: number, isCode = false): boolean => {
    const estimatedTokens = TokenUtils.estimateTokenCount(text, isCode);
    return estimatedTokens > limit;
  },

  /**
   * Get appropriate token limit category
   * @param estimatedTokens - Estimated token count
   * @returns Token limit category
   */
  getTokenLimitCategory: (
    estimatedTokens: number,
  ): keyof typeof TOKEN_LIMITS => {
    if (estimatedTokens <= TOKEN_LIMITS.CONSERVATIVE) {
      return "CONSERVATIVE";
    }
    if (estimatedTokens <= TOKEN_LIMITS.STANDARD) {
      return "STANDARD";
    }
    if (estimatedTokens <= TOKEN_LIMITS.HIGH_CAPACITY) {
      return "HIGH_CAPACITY";
    }
    if (estimatedTokens <= TOKEN_LIMITS.LARGE_CONTEXT) {
      return "LARGE_CONTEXT";
    }
    return "ULTRA_LARGE_CONTEXT";
  },

  /**
   * Truncate text to fit within token limit
   * @param text - Input text
   * @param tokenLimit - Maximum tokens allowed
   * @param isCode - Whether the text is code
   * @returns Truncated text
   */
  truncateToTokenLimit: (
    text: string,
    tokenLimit: number,
    isCode = false,
  ): string => {
    const charsPerToken = isCode
      ? TOKEN_ESTIMATION.CODE_CHARS_PER_TOKEN
      : TOKEN_ESTIMATION.CHARS_PER_TOKEN;

    // Apply safety margin
    const maxChars = Math.floor(
      tokenLimit * charsPerToken * TOKEN_ESTIMATION.SAFETY_MARGIN,
    );

    if (text.length <= maxChars) {
      return text;
    }

    // Truncate and add ellipsis
    return text.substring(0, maxChars - 3) + "...";
  },
} as const;

// Legacy compatibility exports from existing constants
export const DEFAULT_MAX_TOKENS = TOKEN_LIMITS.STANDARD;
export const DEFAULT_EVALUATION_MAX_TOKENS = USE_CASE_TOKENS.EVALUATION;
export const DEFAULT_ANALYSIS_MAX_TOKENS = USE_CASE_TOKENS.ANALYSIS;
export const DEFAULT_DOCUMENTATION_MAX_TOKENS = USE_CASE_TOKENS.DOCUMENTATION;

// Provider-specific safe defaults (from existing PROVIDER_MAX_TOKENS)
export const ANTHROPIC_SAFE = PROVIDER_TOKEN_LIMITS.ANTHROPIC.default;
export const OPENAI_STANDARD = PROVIDER_TOKEN_LIMITS.OPENAI.default;
export const GOOGLE_STANDARD = PROVIDER_TOKEN_LIMITS.GOOGLE_AI.default;
