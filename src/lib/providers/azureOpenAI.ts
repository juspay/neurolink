/**
 * Azure OpenAI Provider
 *
 * Enterprise-grade OpenAI integration through Microsoft Azure.
 * Supports all OpenAI models with enhanced security and compliance.
 */

import type {
  AIProvider,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { GenerateResult } from "../types/generate-types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";
import { AIProviderName } from "../core/types.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import { evaluateResponse } from "../core/evaluation.js";
import { createAnalytics } from "../core/analytics.js";
// Note: AzureOpenAI uses custom API implementation, not AI SDK

// Azure OpenAI specific types
interface AzureOpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AzureOpenAIResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason: "stop" | "length" | "content_filter";
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AzureOpenAIStreamChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: "assistant";
      content?: string;
    };
    finish_reason?: "stop" | "length" | "content_filter";
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AzureOpenAIRequestBody {
  messages: AzureOpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  user?: string;
}

// Declare process for TypeScript
declare const process: {
  env: {
    AZURE_OPENAI_API_KEY?: string;
    AZURE_OPENAI_ENDPOINT?: string;
    AZURE_OPENAI_DEPLOYMENT_ID?: string;
    AZURE_OPENAI_API_VERSION?: string;
  };
};

export class AzureOpenAIProvider implements AIProvider {
  readonly name: AIProviderName = AIProviderName.AZURE;
  private apiKey: string;
  private endpoint: string;
  private deploymentId: string;
  private apiVersion: string;

  constructor() {
    this.apiKey = this.getApiKey();
    this.endpoint = this.getEndpoint();
    this.deploymentId = this.getDeploymentId();
    this.apiVersion =
      process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

    logger.debug(
      `[AzureOpenAIProvider] Initialized with endpoint: ${this.endpoint}, deployment: ${this.deploymentId}`,
    );
  }

  private getApiKey(): string {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("AZURE_OPENAI_API_KEY environment variable is required");
    }
    return apiKey;
  }

  private getEndpoint(): string {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    if (!endpoint) {
      throw new Error("AZURE_OPENAI_ENDPOINT environment variable is required");
    }
    return endpoint.replace(/\/$/, ""); // Remove trailing slash
  }

  private getDeploymentId(): string {
    const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
    if (!deploymentId) {
      throw new Error(
        "AZURE_OPENAI_DEPLOYMENT_ID environment variable is required",
      );
    }
    return deploymentId;
  }

  private getApiUrl(stream: boolean = false): string {
    return `${this.endpoint}/openai/deployments/${this.deploymentId}/chat/completions?api-version=${this.apiVersion}`;
  }

  private async makeRequest(
    body: AzureOpenAIRequestBody,
    stream: boolean = false,
    signal?: AbortSignal,
  ): Promise<Response> {
    const url = this.getApiUrl(stream);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "api-key": this.apiKey,
    };

    logger.debug(
      `[AzureOpenAIProvider.makeRequest] ${stream ? "Streaming" : "Non-streaming"} request to deployment: ${this.deploymentId}`,
    );
    logger.debug(
      `[AzureOpenAIProvider.makeRequest] Max tokens: ${body.max_tokens || "default"}, Temperature: ${body.temperature || "default"}`,
    );

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal, // Add abort signal for timeout support
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        `[AzureOpenAIProvider.makeRequest] API error ${response.status}: ${errorText}`,
      );
      throw new Error(
        `Azure OpenAI API error ${response.status}: ${errorText}`,
      );
    }

    return response;
  }

  /**
   * PRIMARY METHOD: Stream content using AI (recommended for new code)
   * Future-ready for multi-modal capabilities with current text focus
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: any,
  ): Promise<StreamResult> {
    const functionTag = "AzureOpenAIProvider.stream";
    const startTime = Date.now();

    // Parse parameters - support both string and options object
    const options =
      typeof optionsOrPrompt === "string"
        ? { input: { text: optionsOrPrompt } }
        : optionsOrPrompt;

    // Validate input
    if (
      !options?.input?.text ||
      typeof options.input.text !== "string" ||
      options.input.text.trim() === ""
    ) {
      throw new Error(
        "Stream options must include input.text as a non-empty string",
      );
    }

    // Convert StreamOptions for internal use
    const convertedOptions = {
      prompt: options.input.text,
      provider: options.provider,
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      systemPrompt: options.systemPrompt,
      timeout: options.timeout,
    };

    // Prepare Azure OpenAI messages
    const messages: AzureOpenAIMessage[] = [];
    if (convertedOptions.systemPrompt) {
      messages.push({
        role: "system",
        content: convertedOptions.systemPrompt,
      });
    }
    messages.push({
      role: "user",
      content: convertedOptions.prompt,
    });

    const requestBody: AzureOpenAIRequestBody = {
      messages,
      temperature: convertedOptions.temperature ?? 0.7,
      max_tokens: convertedOptions.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: true,
    };

    // Create timeout controller if timeout is specified
    const timeoutController = createTimeoutController(
      convertedOptions.timeout,
      this.name,
      "stream",
    );

    try {
      const response = await this.makeRequest(
        requestBody,
        true,
        timeoutController?.controller.signal,
      );

      // Clean up timeout if successful
      timeoutController?.cleanup();

      // Return an async iterable for streaming chunks
      const streamIterable = this.createAsyncIterable(
        response.body!,
        timeoutController?.controller.signal,
      );

      // Compose the StreamResult object
      return {
        stream: streamIterable,
        provider: this.name,
        model: convertedOptions.model,
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw error;
    }
  }

  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    schema?: any,
  ): Promise<any> {
    const functionTag = "AzureOpenAIProvider.generate";
    const provider = "azure";
    const startTime = Date.now();

    logger.debug(`[${functionTag}] Starting text generation`);

    // Parse parameters with backward compatibility
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const {
      prompt,
      temperature = 0.7,
      maxTokens = DEFAULT_MAX_TOKENS,
      systemPrompt = "You are a helpful AI assistant.",
      timeout = getDefaultTimeout(provider, "generate"),
    } = options;

    logger.debug(
      `[${functionTag}] Prompt: "${prompt.substring(0, 100)}...", Temperature: ${temperature}, Max tokens: ${maxTokens}, Timeout: ${timeout}`,
    );

    const messages: AzureOpenAIMessage[] = [];

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    messages.push({
      role: "user",
      content: prompt,
    });

    const requestBody: AzureOpenAIRequestBody = {
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    // Create timeout controller if timeout is specified
    const timeoutController = createTimeoutController(
      timeout,
      provider,
      "generate",
    );

    try {
      const response = await this.makeRequest(
        requestBody,
        false,
        timeoutController?.controller.signal,
      );
      const data: AzureOpenAIResponse = await response.json();

      // Clean up timeout if successful
      timeoutController?.cleanup();

      logger.debug(
        `[${functionTag}] Success. Generated ${data.usage.completion_tokens} tokens`,
      );

      const content = data.choices[0]?.message?.content || "";

      const result: any = {
        content,
        provider: this.name,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        finishReason: data.choices[0]?.finish_reason || "stop",
      };

      // Add analytics if enabled
      if (options.enableAnalytics) {
        result.analytics = {
          provider: this.name,
          model: data.model,
          tokens: result.usage,
          responseTime: Date.now() - startTime,
          context: options.context,
        };
      }

      // Add evaluation if enabled
      if (options.enableEvaluation) {
        result.evaluation = await evaluateResponse(
          options.prompt,
          content,
          options.context,
        );
      }

      return result;
    } catch (error) {
      // Always cleanup timeout
      timeoutController?.cleanup();

      // Log timeout errors specifically
      if (error instanceof TimeoutError) {
        logger.error(`[${functionTag}] Timeout error`, {
          provider,
          timeout: error.timeout,
          message: error.message,
        });
      } else if ((error as any)?.name === "AbortError") {
        // Convert AbortError to TimeoutError
        const timeoutError = new TimeoutError(
          `${provider} generate operation timed out after ${timeout}`,
          timeoutController?.timeoutMs || 0,
          provider,
          "generate",
        );
        logger.error(`[${functionTag}] Timeout error`, {
          provider,
          timeout: timeoutController?.timeoutMs,
          message: timeoutError.message,
        });
        throw timeoutError;
      } else {
        logger.error(`[${functionTag}] Error:`, error);
      }
      throw error;
    }
  }

  private async *createAsyncIterable(
    body: ReadableStream<Uint8Array>,
    signal?: AbortSignal,
  ): AsyncGenerator<{ content: string }, void, unknown> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        // Check if aborted
        if (signal?.aborted) {
          throw new Error("AbortError");
        }

        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") {
            continue;
          }
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data.trim() === "[DONE]") {
              continue;
            }

            try {
              const chunk: AzureOpenAIStreamChunk = JSON.parse(data);

              // Extract text content from chunk
              if (chunk.choices?.[0]?.delta?.content) {
                yield { content: chunk.choices[0].delta.content };
              }
            } catch (parseError) {
              logger.warn(
                "[AzureOpenAIProvider.createAsyncIterable] Failed to parse chunk:",
                parseError,
              );
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async testConnection(): Promise<{
    success: boolean;
    error?: string;
    responseTime?: number;
  }> {
    logger.debug(
      "[AzureOpenAIProvider.testConnection] Testing connection to Azure OpenAI",
    );

    const startTime = Date.now();

    try {
      await this.generate({
        prompt: "Hello",
        maxTokens: 5,
      });

      const responseTime = Date.now() - startTime;
      logger.debug(
        `[AzureOpenAIProvider.testConnection] Connection test successful (${responseTime}ms)`,
      );

      return {
        success: true,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(
        `[AzureOpenAIProvider.testConnection] Connection test failed (${responseTime}ms):`,
        error,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime,
      };
    }
  }

  isConfigured(): boolean {
    try {
      this.getApiKey();
      this.getEndpoint();
      this.getDeploymentId();
      return true;
    } catch {
      return false;
    }
  }

  getRequiredConfig(): string[] {
    return [
      "AZURE_OPENAI_API_KEY",
      "AZURE_OPENAI_ENDPOINT",
      "AZURE_OPENAI_DEPLOYMENT_ID",
    ];
  }

  getOptionalConfig(): string[] {
    return ["AZURE_OPENAI_API_VERSION"];
  }

  getModels(): string[] {
    return [
      "gpt-4",
      "gpt-4-turbo",
      "gpt-4-32k",
      "gpt-35-turbo",
      "gpt-35-turbo-16k",
    ];
  }

  supportsStreaming(): boolean {
    return true;
  }

  supportsSchema(): boolean {
    return true; // Azure OpenAI supports JSON mode and function calling
  }

  getCapabilities(): string[] {
    return [
      "text-generation",
      "streaming",
      "conversation",
      "system-prompts",
      "json-mode",
      "function-calling",
      "enterprise-security",
      "content-filtering",
    ];
  }

  async gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: any,
  ): Promise<EnhancedGenerateResult | null> {
    return this.generate(optionsOrPrompt, analysisSchema);
  }
}
