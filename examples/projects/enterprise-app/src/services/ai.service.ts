import { NeuroLink } from "@juspay/neurolink";
import { neurolinkConfig } from "../config/neurolink.config.js";

/**
 * Message format for conversation context
 */
export type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/**
 * Options for generate method
 */
export type GenerateOptions = {
  provider?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  messages?: ConversationMessage[];
  systemPrompt?: string;
};

/**
 * Options for stream method
 */
export type StreamOptions = {
  provider?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  messages?: ConversationMessage[];
  systemPrompt?: string;
  onChunk?: (chunk: string) => void;
};

/**
 * Options for tool-enabled generation
 */
export type ToolGenerateOptions = GenerateOptions & {
  tools: string[];
  maxToolCalls?: number;
};

/**
 * Result from generate operations
 */
export type GenerateResult = {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
  }>;
  finishReason?: string;
};

/**
 * Enterprise AI Service that wraps NeuroLink SDK
 * Provides a simplified interface for AI operations with enterprise configuration
 */
export class AIService {
  private neurolink: NeuroLink;
  private defaultProvider: string;
  private defaultModel: string;

  constructor(options?: { provider?: string; model?: string }) {
    this.defaultProvider =
      options?.provider || process.env.DEFAULT_AI_PROVIDER || "openai";
    this.defaultModel =
      options?.model || process.env.DEFAULT_AI_MODEL || "gpt-4o";

    this.neurolink = new NeuroLink({
      provider: this.defaultProvider,
      model: this.defaultModel,
      ...neurolinkConfig,
    });
  }

  /**
   * Get the underlying NeuroLink instance for advanced operations
   */
  getNeuroLink(): NeuroLink {
    return this.neurolink;
  }

  /**
   * Generate a response from the AI model
   */
  async generate(
    prompt: string,
    options: GenerateOptions = {},
  ): Promise<GenerateResult> {
    const result = await this.neurolink.generate({
      prompt,
      provider: options.provider || this.defaultProvider,
      model: options.model || this.defaultModel,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      messages: options.messages,
      systemPrompt: options.systemPrompt,
    });

    return {
      text: result.text || "",
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens || 0,
            completionTokens: result.usage.completionTokens || 0,
            totalTokens: result.usage.totalTokens || 0,
          }
        : undefined,
      toolCalls: result.toolCalls,
      finishReason: result.finishReason,
    };
  }

  /**
   * Stream a response from the AI model
   */
  async stream(
    prompt: string,
    options: StreamOptions = {},
  ): Promise<AsyncIterable<string>> {
    const response = await this.neurolink.stream({
      prompt,
      provider: options.provider || this.defaultProvider,
      model: options.model || this.defaultModel,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      messages: options.messages,
      systemPrompt: options.systemPrompt,
    });

    return response;
  }

  /**
   * Generate a response with tool calling capabilities
   */
  async generateWithTools(
    prompt: string,
    options: ToolGenerateOptions,
  ): Promise<GenerateResult> {
    const result = await this.neurolink.generate({
      prompt,
      provider: options.provider || this.defaultProvider,
      model: options.model || this.defaultModel,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      messages: options.messages,
      systemPrompt: options.systemPrompt,
      tools: options.tools,
      maxToolCalls: options.maxToolCalls,
    });

    return {
      text: result.text || "",
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens || 0,
            completionTokens: result.usage.completionTokens || 0,
            totalTokens: result.usage.totalTokens || 0,
          }
        : undefined,
      toolCalls: result.toolCalls,
      finishReason: result.finishReason,
    };
  }

  /**
   * Generate with conversation context
   */
  async chat(
    message: string,
    conversationHistory: ConversationMessage[],
    options: GenerateOptions = {},
  ): Promise<GenerateResult> {
    return this.generate(message, {
      ...options,
      messages: conversationHistory,
    });
  }

  /**
   * Generate a structured JSON response
   */
  async generateStructured<T>(
    prompt: string,
    schema: Record<string, any>,
    options: GenerateOptions = {},
  ): Promise<T> {
    const result = await this.neurolink.generate({
      prompt,
      provider: options.provider || this.defaultProvider,
      model: options.model || this.defaultModel,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      messages: options.messages,
      systemPrompt: options.systemPrompt,
      structuredOutput: {
        schema,
        name: "response",
      },
    });

    // Parse the JSON response
    try {
      return JSON.parse(result.text || "{}") as T;
    } catch {
      throw new Error(`Failed to parse structured response: ${result.text}`);
    }
  }

  /**
   * Add an external MCP server for tool integration
   */
  async addMCPServer(
    name: string,
    config: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
    },
  ): Promise<void> {
    await this.neurolink.addExternalMCPServer(name, {
      command: config.command,
      args: config.args,
      env: config.env,
      transport: "stdio",
    });
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    // Clean up any MCP connections or other resources
    // The NeuroLink SDK handles internal cleanup
  }
}

// Default singleton instance for simple usage
export const aiService = new AIService();

export default aiService;
