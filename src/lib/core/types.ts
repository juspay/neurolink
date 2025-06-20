import type { ZodType, ZodTypeDef } from "zod";
import type {
  StreamTextResult,
  ToolSet,
  Schema,
  GenerateTextResult,
  Tool,
} from "ai";

/**
 * Supported AI Provider Names
 */
export enum AIProviderName {
  BEDROCK = "bedrock",
  OPENAI = "openai",
  VERTEX = "vertex",
  ANTHROPIC = "anthropic",
  AZURE = "azure",
  GOOGLE_AI = "google-ai",
  HUGGINGFACE = "huggingface",
  OLLAMA = "ollama",
  MISTRAL = "mistral",
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
}

/**
 * Supported Models for Google Vertex AI
 */
export enum VertexModels {
  CLAUDE_4_0_SONNET = "claude-sonnet-4@20250514",
  GEMINI_2_5_FLASH = "gemini-2.5-flash-preview-05-20",
}

/**
 * Supported Models for Google AI Studio
 */
export enum GoogleAIModels {
  GEMINI_1_5_PRO_LATEST = "gemini-1.5-pro-latest",
  GEMINI_1_5_FLASH_LATEST = "gemini-1.5-flash-latest",
  GEMINI_2_0_FLASH_EXP = "gemini-2.0-flash-exp",
  GEMINI_1_0_PRO = "gemini-1.0-pro",
}

/**
 * Union type of all supported model names
 */
export type SupportedModelName =
  | BedrockModels
  | OpenAIModels
  | VertexModels
  | GoogleAIModels;

/**
 * Provider configuration specifying provider and its available models
 */
export interface ProviderConfig {
  provider: AIProviderName;
  models: SupportedModelName[];
}

/**
 * Options for AI requests with unified provider configuration
 */
export interface StreamingOptions {
  providers: ProviderConfig[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Text generation options interface
 */
export interface TextGenerationOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>;
  tools?: Record<string, Tool>; // Enable MCP tools integration
}

/**
 * Stream text options interface
 */
export interface StreamTextOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>;
  tools?: Record<string, Tool>; // Enable MCP tools integration
}

/**
 * AI Provider interface with flexible parameter support
 */
export interface AIProvider {
  streamText(
    optionsOrPrompt: StreamTextOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamTextResult<ToolSet, unknown> | null>;

  generateText(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateTextResult<ToolSet, unknown> | null>;
}

/**
 * Provider attempt result for iteration tracking
 */
export interface ProviderAttempt {
  provider: AIProviderName;
  model: SupportedModelName;
  success: boolean;
  error?: string;
  stack?: string;
}

/**
 * Default provider configurations
 */
export const DEFAULT_PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    provider: AIProviderName.BEDROCK,
    models: [BedrockModels.CLAUDE_3_7_SONNET, BedrockModels.CLAUDE_3_5_SONNET],
  },
  {
    provider: AIProviderName.VERTEX,
    models: [VertexModels.CLAUDE_4_0_SONNET, VertexModels.GEMINI_2_5_FLASH],
  },
  {
    provider: AIProviderName.OPENAI,
    models: [OpenAIModels.GPT_4O, OpenAIModels.GPT_4O_MINI],
  },
];
