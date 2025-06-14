import type { ZodType, ZodTypeDef } from "zod";
import type { StreamTextResult, ToolSet, Schema, GenerateTextResult } from "ai";
/**
 * Supported AI Provider Names
 */
export declare enum AIProviderName {
  BEDROCK = "bedrock",
  OPENAI = "openai",
  VERTEX = "vertex",
}
/**
 * Supported Models for Amazon Bedrock
 */
export declare enum BedrockModels {
  CLAUDE_3_SONNET = "anthropic.claude-3-sonnet-20240229-v1:0",
  CLAUDE_3_HAIKU = "anthropic.claude-3-haiku-20240307-v1:0",
  CLAUDE_3_5_SONNET = "anthropic.claude-3-5-sonnet-20240620-v1:0",
  CLAUDE_3_7_SONNET = "arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",
}
/**
 * Supported Models for OpenAI
 */
export declare enum OpenAIModels {
  GPT_4 = "gpt-4",
  GPT_4_TURBO = "gpt-4-turbo",
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini",
  GPT_3_5_TURBO = "gpt-3.5-turbo",
}
/**
 * Supported Models for Google Vertex AI
 */
export declare enum VertexModels {
  CLAUDE_4_0_SONNET = "claude-sonnet-4@20250514",
  GEMINI_2_5_FLASH = "gemini-2.5-flash-preview-05-20",
}
/**
 * Union type of all supported model names
 */
export type SupportedModelName = BedrockModels | OpenAIModels | VertexModels;
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
export declare const DEFAULT_PROVIDER_CONFIGS: ProviderConfig[];
