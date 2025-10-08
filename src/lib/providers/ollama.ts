import type { AIProviderName } from "../types/index.js";
import type {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1StreamPart,
} from "ai";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { ZodUnknownSchema } from "../types/typeAliases.js";
import type { Schema } from "ai";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { modelConfig } from "../core/modelConfiguration.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import { TimeoutError } from "../utils/timeout.js";
import { buildMultimodalMessagesArray } from "../utils/messageBuilder.js";
import { buildMultimodalOptions } from "../utils/multimodalOptionsBuilder.js";
import type {
  MultimodalChatMessage,
  MessageContent,
} from "../types/conversation.js";
import type {
  OllamaMessage,
  OllamaToolCall,
  OllamaToolResult,
} from "../types/providers.js";
import type { ToolArgs } from "../types/tools.js";
import type { JsonValue } from "../types/common.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { createAnalytics } from "../core/analytics.js";

// Model version constants (configurable via environment)
const DEFAULT_OLLAMA_MODEL = "llama3.1:8b";
const FALLBACK_OLLAMA_MODEL = "llama3.2:latest"; // Used when primary model fails

// Configuration helpers
const getOllamaBaseUrl = (): string => {
  return process.env.OLLAMA_BASE_URL || "http://localhost:11434";
};

// Create AbortController with timeout for better compatibility
const createAbortSignalWithTimeout = (timeoutMs: number): AbortSignal => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Clear timeout if signal is aborted through other means
  controller.signal.addEventListener("abort", () => {
    clearTimeout(timeoutId);
  });

  return controller.signal;
};

const getDefaultOllamaModel = (): string => {
  return process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
};

const getOllamaTimeout = (): number => {
  return parseInt(process.env.OLLAMA_TIMEOUT || "60000", 10);
};

// Create proxy-aware fetch instance
const proxyFetch = createProxyFetch();

// Custom LanguageModelV1 implementation for Ollama
class OllamaLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";
  readonly provider = "ollama";
  readonly modelId: string;
  readonly maxTokens?: number;
  readonly supportsStreaming = true;
  readonly defaultObjectGenerationMode = "json" as const;

  private baseUrl: string;
  private timeout: number;

  constructor(modelId: string, baseUrl: string, timeout: number) {
    this.modelId = modelId;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private convertMessagesToPrompt(
    messages: Array<{ role: string; content: unknown }>,
  ): string {
    return messages
      .map((msg: { role: string; content: unknown }) => {
        if (typeof msg.content === "string") {
          return `${msg.role}: ${msg.content}`;
        }
        return `${msg.role}: ${JSON.stringify(msg.content)}`;
      })
      .join("\n");
  }

  async doGenerate(options: LanguageModelV1CallOptions): Promise<{
    text?: string;
    reasoning?:
      | string
      | Array<
          | { type: "text"; text: string; signature?: string }
          | { type: "redacted"; data: string }
        >;
    files?: Array<{ data: string | Uint8Array; mimeType: string }>;
    logprobs?: Array<{
      token: string;
      logprob: number;
      topLogprobs: Array<{ token: string; logprob: number }>;
    }>;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens?: number;
    };
    finishReason:
      | "stop"
      | "length"
      | "content-filter"
      | "tool-calls"
      | "error"
      | "unknown";
    response?: {
      id?: string;
      timestamp?: Date;
      modelId?: string;
    };
    warnings?: Array<{ type: "other"; message: string }>;
    rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
    rawResponse?: { headers?: Record<string, string> };
    request?: { body?: string };
  }> {
    const messages =
      (options as { messages?: Array<{ role: string; content: unknown }> })
        .messages || [];
    const prompt = this.convertMessagesToPrompt(messages);

    // Debug: Log what's being sent to Ollama
    logger.debug(
      "[OllamaLanguageModel] Messages:",
      JSON.stringify(messages, null, 2),
    );
    logger.debug(
      "[OllamaLanguageModel] Converted Prompt:",
      JSON.stringify(prompt),
    );

    const response = await proxyFetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelId,
        prompt,
        stream: false,
        system: messages.find(
          (m: { role: string; content: unknown }) => m.role === "system",
        )?.content,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      }),
      signal: createAbortSignalWithTimeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Debug: Log Ollama API response to understand empty content issue
    logger.debug(
      "[OllamaLanguageModel] API Response:",
      JSON.stringify(data, null, 2),
    );

    return {
      text: data.response,
      usage: {
        promptTokens: data.prompt_eval_count ?? this.estimateTokens(prompt),
        completionTokens:
          data.eval_count ?? this.estimateTokens(String(data.response ?? "")),
        totalTokens:
          (data.prompt_eval_count ?? this.estimateTokens(prompt)) +
          (data.eval_count ?? this.estimateTokens(String(data.response ?? ""))),
      },
      finishReason: "stop",
      rawCall: {
        rawPrompt: prompt,
        rawSettings: {
          model: this.modelId,
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      },
      rawResponse: {
        headers: {},
      },
    };
  }

  async doStream(options: LanguageModelV1CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV1StreamPart>;
    rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
    rawResponse?: { headers?: Record<string, string> };
    request?: { body?: string };
    warnings?: Array<{ type: "other"; message: string }>;
  }> {
    const messages =
      (options as { messages?: Array<{ role: string; content: unknown }> })
        .messages || [];
    const prompt = this.convertMessagesToPrompt(messages);

    const response = await proxyFetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelId,
        prompt,
        stream: true,
        system: messages.find(
          (m: { role: string; content: unknown }) => m.role === "system",
        )?.content,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      }),
      signal: createAbortSignalWithTimeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`,
      );
    }

    const self = this;
    return {
      stream: new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of self.parseStreamResponse(response)) {
              controller.enqueue(chunk);
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      }),
      rawCall: {
        rawPrompt: prompt,
        rawSettings: {
          model: this.modelId,
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      },
      rawResponse: {
        headers: {},
      },
    };
  }

  private async *parseStreamResponse(
    response: Response,
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                yield {
                  type: "text-delta",
                  textDelta: data.response,
                };
              }
              if (data.done) {
                yield {
                  type: "finish",
                  finishReason: "stop",
                  usage: {
                    promptTokens:
                      data.prompt_eval_count ||
                      this.estimateTokens(data.context || ""),
                    completionTokens: data.eval_count || 0,
                  },
                };
                return;
              }
            } catch (error) {
              logger.error("Error parsing Ollama stream response", {
                error,
              });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * Ollama Provider v2 - BaseProvider Implementation
 *
 * PHASE 3.7: BaseProvider wrap around existing custom Ollama implementation
 *
 * Features:
 * - Extends BaseProvider for shared functionality
 * - Preserves custom OllamaLanguageModel implementation
 * - Local model management and health checking
 * - Enhanced error handling with Ollama-specific guidance
 */
export class OllamaProvider extends BaseProvider {
  private ollamaModel: OllamaLanguageModel;
  private baseUrl: string;
  private timeout: number;

  constructor(modelName?: string) {
    super(modelName, "ollama" as AIProviderName);

    this.baseUrl = getOllamaBaseUrl();
    this.timeout = getOllamaTimeout();

    // Initialize Ollama model
    this.ollamaModel = new OllamaLanguageModel(
      this.modelName || getDefaultOllamaModel(),
      this.baseUrl,
      this.timeout,
    );

    logger.debug("Ollama BaseProvider v2 initialized", {
      modelName: this.modelName,
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      provider: this.providerName,
    });
  }

  protected getProviderName(): AIProviderName {
    return "ollama" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultOllamaModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for Ollama
   * The OllamaLanguageModel implements LanguageModelV1 interface properly
   */
  protected getAISDKModel(): LanguageModelV1 {
    return this.ollamaModel;
  }

  /**
   * Ollama Tool Calling Support (Enhanced 2025)
   *
   * Uses configurable model list from ModelConfiguration instead of hardcoded values.
   * Tool-capable models can be configured via OLLAMA_TOOL_CAPABLE_MODELS environment variable.
   *
   * **Configuration Options:**
   * - Environment variable: OLLAMA_TOOL_CAPABLE_MODELS (comma-separated list)
   * - Configuration file: providers.ollama.modelBehavior.toolCapableModels
   * - Fallback: Default list of known tool-capable models
   *
   * **Implementation Features:**
   * - Direct Ollama API integration (/v1/chat/completions)
   * - Automatic tool schema conversion to Ollama format
   * - Streaming tool calls with incremental response parsing
   * - Model compatibility validation and fallback handling
   *
   * @returns true for supported models, false for unsupported models
   */
  supportsTools(): boolean {
    const modelName = (this.modelName ?? getDefaultOllamaModel()).toLowerCase();

    // Get tool-capable models from configuration
    const ollamaConfig = modelConfig.getProviderConfiguration("ollama");
    const toolCapableModels =
      (ollamaConfig?.modelBehavior?.toolCapableModels as string[]) || [];

    // Check if current model matches tool-capable model patterns
    const isToolCapable = toolCapableModels.some((capableModel) =>
      modelName.includes(capableModel),
    );

    if (isToolCapable) {
      logger.debug("Ollama tool calling enabled", {
        model: this.modelName,
        reason: "Model supports function calling",
        baseUrl: this.baseUrl,
        configuredModels: toolCapableModels.length,
      });
      return true;
    }

    // Log why tools are disabled for transparency
    logger.debug("Ollama tool calling disabled", {
      model: this.modelName,
      reason: "Model not in tool-capable list",
      suggestion:
        "Consider using llama3.1:8b-instruct, mistral:7b-instruct, or hermes3:8b for tool calling",
      availableToolModels: toolCapableModels.slice(0, 3), // Show first 3 for brevity
    });

    return false;
  }

  /**
   * Extract images from multimodal messages for Ollama API
   * Returns array of base64-encoded images
   */
  private extractImagesFromMessages(
    messages: MultimodalChatMessage[],
  ): string[] {
    const images: string[] = [];

    for (const msg of messages) {
      if (Array.isArray(msg.content)) {
        for (const content of msg.content) {
          const typedContent = content as MessageContent;
          if (typedContent.type === "image" && typedContent.image) {
            const imageData =
              typeof typedContent.image === "string"
                ? typedContent.image.replace(/^data:image\/\w+;base64,/, "")
                : Buffer.from(typedContent.image).toString("base64");
            images.push(imageData);
          }
        }
      }
    }

    return images;
  }

  /**
   * Convert multimodal messages to Ollama chat format
   * Extracts text content and handles images separately
   */
  private convertToOllamaMessages(
    messages: MultimodalChatMessage[],
  ): OllamaMessage[] {
    return messages.map((msg) => {
      let textContent = "";
      const images: string[] = [];

      if (typeof msg.content === "string") {
        textContent = msg.content;
      } else if (Array.isArray(msg.content)) {
        for (const content of msg.content) {
          const typedContent = content as MessageContent;
          if (typedContent.type === "text" && typedContent.text) {
            textContent += typedContent.text;
          } else if (typedContent.type === "image" && typedContent.image) {
            const imageData =
              typeof typedContent.image === "string"
                ? typedContent.image.replace(/^data:image\/\w+;base64,/, "")
                : Buffer.from(typedContent.image).toString("base64");
            images.push(imageData);
          }
        }
      }

      const ollamaMsg: OllamaMessage = {
        role: (msg.role === "system" ? "system" : msg.role) as
          | "system"
          | "user"
          | "assistant"
          | "tool",
        content: textContent,
      };

      if (images.length > 0) {
        ollamaMsg.images = images;
      }

      return ollamaMsg;
    });
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodUnknownSchema | Schema<unknown>,
  ): Promise<StreamResult> {
    try {
      this.validateStreamOptions(options);
      await this.checkOllamaHealth();

      // Check if tools are supported and provided
      const modelSupportsTools = this.supportsTools();
      const hasTools = options.tools && Object.keys(options.tools).length > 0;

      if (modelSupportsTools && hasTools) {
        // Use chat API with tools for tool-capable models
        return this.executeStreamWithTools(options, analysisSchema);
      } else {
        // Use generate API for non-tool scenarios
        return this.executeStreamWithoutTools(options, analysisSchema);
      }
    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  /**
   * Execute streaming with Ollama's function calling support
   * Uses conversation loop to handle multi-step tool execution
   */
  private async executeStreamWithTools(
    options: StreamOptions,
    _analysisSchema?: ZodUnknownSchema | Schema<unknown>,
  ): Promise<StreamResult> {
    const startTime = Date.now();
    const maxIterations = options.maxSteps || DEFAULT_MAX_STEPS;
    let iteration = 0;

    // Get all available tools (direct + MCP + external)
    const allTools = await this.getAllTools();
    // Convert tools to Ollama format
    const ollamaTools = this.convertToolsToOllamaFormat(allTools);

    // Validate that PDFs are not provided
    if (options.input?.pdfFiles && options.input.pdfFiles.length > 0) {
      throw new Error(
        "PDF inputs are not supported by OllamaProvider. " +
          "Please remove PDFs or use a supported provider (OpenAI, Anthropic, Google Vertex AI, etc.).",
      );
    }

    // Initialize conversation history
    const conversationHistory: OllamaMessage[] = [];

    // Build initial messages
    const hasMultimodalInput = !!(
      options.input?.images?.length ||
      options.input?.content?.length ||
      options.input?.files?.length ||
      options.input?.csvFiles?.length
    );

    if (hasMultimodalInput) {
      logger.debug(
        `Ollama: Detected multimodal input, using multimodal message builder`,
        {
          hasImages: !!options.input?.images?.length,
          imageCount: options.input?.images?.length || 0,
        },
      );

      const multimodalOptions = buildMultimodalOptions(
        options,
        this.providerName,
        this.modelName,
      );

      const multimodalMessages = await buildMultimodalMessagesArray(
        multimodalOptions,
        this.providerName,
        this.modelName,
      );

      conversationHistory.push(
        ...this.convertToOllamaMessages(multimodalMessages),
      );
    } else {
      if (options.systemPrompt) {
        conversationHistory.push({
          role: "system",
          content: options.systemPrompt,
        });
      }
      conversationHistory.push({
        role: "user",
        content: options.input.text,
      });
    }

    // Conversation loop for multi-step tool execution
    const stream = new ReadableStream({
      start: async (controller) => {
        try {
          while (iteration < maxIterations) {
            logger.debug(
              `[OllamaProvider] Conversation iteration ${iteration + 1}/${maxIterations}`,
            );

            // Make API request
            const response = await proxyFetch(
              `${this.baseUrl}/v1/chat/completions`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: this.modelName || FALLBACK_OLLAMA_MODEL,
                  messages: conversationHistory,
                  tools: ollamaTools,
                  tool_choice: "auto",
                  stream: true,
                  temperature: options.temperature,
                  max_tokens: options.maxTokens,
                }),
                signal: createAbortSignalWithTimeout(this.timeout),
              },
            );

            if (!response.ok) {
              throw new Error(
                `Ollama API error: ${response.status} ${response.statusText}`,
              );
            }

            // Process response stream
            const { content, toolCalls, finishReason } =
              await this.processOllamaResponse(response, controller);

            // Add assistant message to history
            const assistantMessage: OllamaMessage = {
              role: "assistant",
              content: content || "",
            };

            if (toolCalls && toolCalls.length > 0) {
              assistantMessage.tool_calls = toolCalls;
            }

            conversationHistory.push(assistantMessage);

            // Check finish reason
            if (finishReason === "stop" || !finishReason) {
              // Conversation complete
              controller.close();
              break;
            } else if (
              finishReason === "tool_calls" &&
              toolCalls &&
              toolCalls.length > 0
            ) {
              // Execute tools
              logger.debug(
                `[OllamaProvider] Executing ${toolCalls.length} tools`,
              );
              const toolResults = await this.executeOllamaTools(
                toolCalls,
                options,
              );

              // Add tool results to conversation
              const toolMessage: OllamaMessage = {
                role: "tool",
                content: JSON.stringify(toolResults),
              };
              conversationHistory.push(toolMessage);

              iteration++;
              continue; // Next iteration
            } else if (finishReason === "length") {
              // Max tokens reached, continue conversation
              logger.debug(`[OllamaProvider] Max tokens reached, continuing`);
              conversationHistory.push({
                role: "user",
                content: "Please continue.",
              });
              iteration++;
              continue;
            } else {
              // Unknown finish reason, end conversation
              logger.warn(
                `[OllamaProvider] Unknown finish reason: ${finishReason}`,
              );
              controller.close();
              break;
            }
          }

          if (iteration >= maxIterations) {
            controller.error(
              new Error(
                `Ollama conversation exceeded maximum iterations (${maxIterations})`,
              ),
            );
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Create analytics promise
    const analyticsPromise = Promise.resolve(
      createAnalytics(
        this.providerName,
        this.modelName || FALLBACK_OLLAMA_MODEL,
        { usage: { input: 0, output: 0, total: 0 } },
        Date.now() - startTime,
        {
          requestId: `ollama-stream-${Date.now()}`,
          streamingMode: true,
          iterations: iteration,
          note: "Token usage not available from Ollama streaming responses",
        },
      ),
    );

    return {
      stream: this.convertToAsyncIterable(stream),
      provider: this.providerName,
      model: this.modelName || FALLBACK_OLLAMA_MODEL,
      analytics: analyticsPromise,
      metadata: {
        startTime,
        streamId: `ollama-${Date.now()}`,
      },
    };
  }

  /**
   * Execute streaming without tools using the generate API
   * Fallback for non-tool scenarios or when chat API is unavailable
   */
  private async executeStreamWithoutTools(
    options: StreamOptions,
    _analysisSchema?: ZodUnknownSchema | Schema<unknown>,
  ): Promise<StreamResult> {
    // Validate that PDFs are not provided
    if (options.input?.pdfFiles && options.input.pdfFiles.length > 0) {
      throw new Error(
        "PDF inputs are not supported by OllamaProvider. " +
          "Please remove PDFs or use a supported provider (OpenAI, Anthropic, Google Vertex AI, etc.).",
      );
    }

    // Check for multimodal input
    const hasMultimodalInput = !!(
      options.input?.images?.length ||
      options.input?.content?.length ||
      options.input?.files?.length ||
      options.input?.csvFiles?.length
    );

    let prompt = options.input.text;
    let images: string[] | undefined;

    if (hasMultimodalInput) {
      logger.debug(`Ollama (generate API): Detected multimodal input`, {
        hasImages: !!options.input?.images?.length,
        imageCount: options.input?.images?.length || 0,
      });

      const multimodalOptions = buildMultimodalOptions(
        options,
        this.providerName,
        this.modelName,
      );

      const multimodalMessages = await buildMultimodalMessagesArray(
        multimodalOptions,
        this.providerName,
        this.modelName,
      );

      // Extract text from messages for prompt
      prompt = multimodalMessages
        .map((msg) => (typeof msg.content === "string" ? msg.content : ""))
        .join("\n");

      // Extract images
      images = this.extractImagesFromMessages(multimodalMessages);
    }

    const requestBody: Record<string, unknown> = {
      model: this.modelName || FALLBACK_OLLAMA_MODEL,
      prompt,
      system: options.systemPrompt,
      stream: true,
      options: {
        temperature: options.temperature,
        num_predict: options.maxTokens,
      },
    };

    if (images && images.length > 0) {
      requestBody.images = images;
    }

    const response = await proxyFetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: createAbortSignalWithTimeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`,
      );
    }

    // Transform to async generator to match other providers
    const self = this;
    const transformedStream = async function* () {
      const generator = self.createOllamaStream(response);
      for await (const chunk of generator) {
        yield chunk;
      }
    };

    return {
      stream: transformedStream(),
      provider: this.providerName,
      model: this.modelName,
    };
  }

  /**
   * Convert AI SDK tools format to Ollama's function calling format
   */
  private convertToolsToOllamaFormat(tools: unknown): unknown[] {
    if (!tools || typeof tools !== "object") {
      return [];
    }

    const toolsArray = Array.isArray(tools) ? tools : Object.values(tools);

    return toolsArray.map(
      (tool: {
        name?: string;
        description?: string;
        parameters?: unknown;
        function?: {
          name?: string;
          description?: string;
          parameters?: unknown;
        };
      }) => ({
        type: "function",
        function: {
          name: tool.name || tool.function?.name,
          description: tool.description || tool.function?.description,
          parameters: tool.parameters ||
            tool.function?.parameters || {
              type: "object",
              properties: {},
              required: [],
            },
        },
      }),
    );
  }

  /**
   * Parse tool calls from Ollama API response
   */
  private parseToolCalls(rawToolCalls: unknown): OllamaToolCall[] {
    if (!Array.isArray(rawToolCalls)) {
      return [];
    }

    return rawToolCalls
      .map((call: unknown) => {
        const callObj = call as {
          id?: string;
          type?: string;
          function?: {
            name?: string;
            arguments?: string;
          };
        };

        if (!callObj.function?.name) {
          return null;
        }

        return {
          id:
            callObj.id ||
            `tool_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          type: "function" as const,
          function: {
            name: callObj.function.name,
            arguments: callObj.function.arguments || "{}",
          },
        };
      })
      .filter((call): call is OllamaToolCall => call !== null);
  }

  /**
   * Process Ollama streaming response and stream content to controller
   * Returns aggregated content, tool calls, and finish reason
   */
  private async processOllamaResponse(
    response: Response,
    controller: ReadableStreamDefaultController,
  ): Promise<{
    content?: string;
    toolCalls?: OllamaToolCall[];
    finishReason?: string;
  }> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body from Ollama");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let aggregatedContent = "";
    let aggregatedToolCalls: OllamaToolCall[] = [];
    let finalFinishReason: string | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() && line.startsWith("data: ")) {
            const dataLine = line.slice(6); // Remove "data: " prefix
            if (dataLine === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(dataLine);
              const processed = this.processOllamaStreamData(parsed);

              if (!processed) {
                continue;
              }

              // Stream content to controller
              if (processed.content) {
                aggregatedContent += processed.content;
                controller.enqueue({
                  content: processed.content,
                });
              }

              // Collect tool calls
              if (processed.toolCalls && processed.toolCalls.length > 0) {
                aggregatedToolCalls = [
                  ...aggregatedToolCalls,
                  ...processed.toolCalls,
                ];
              }

              // Update finish reason
              if (processed.finishReason) {
                finalFinishReason = processed.finishReason;
              }
            } catch (parseError) {
              logger.warn(
                `[OllamaProvider] Failed to parse stream chunk: ${dataLine}`,
                { error: parseError },
              );
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: aggregatedContent || undefined,
      toolCalls:
        aggregatedToolCalls.length > 0 ? aggregatedToolCalls : undefined,
      finishReason: finalFinishReason,
    };
  }

  /**
   * Process individual stream data chunk from Ollama
   */
  private processOllamaStreamData(data: unknown): {
    content?: string;
    toolCalls?: OllamaToolCall[];
    finishReason?: string;
    shouldReturn?: boolean;
  } | null {
    const dataRecord = data as Record<string, unknown>;
    const choices = dataRecord.choices as
      | Array<{
          delta?: Record<string, unknown>;
          finish_reason?: string;
          message?: { tool_calls?: unknown[] };
        }>
      | undefined;
    const delta = choices?.[0]?.delta;
    const finishReason = choices?.[0]?.finish_reason;
    let content = "";

    if (delta?.content && typeof delta.content === "string") {
      content += delta.content;
    }

    // Return tool calls for execution instead of formatting as text
    if (delta?.tool_calls) {
      const toolCalls = this.parseToolCalls(delta.tool_calls);
      return {
        toolCalls,
        finishReason,
        shouldReturn: !!finishReason,
      };
    }

    // Also check for tool calls in the message field (some responses include it there)
    if (choices?.[0]?.message?.tool_calls) {
      const toolCalls = this.parseToolCalls(choices[0].message.tool_calls);
      return {
        toolCalls,
        finishReason,
        shouldReturn: !!finishReason,
      };
    }

    const shouldReturn = !!finishReason;

    return content
      ? { content, finishReason, shouldReturn }
      : { finishReason, shouldReturn };
  }

  /**
   * Create stream generator for Ollama chat API with tool call support
   */
  private async *createOllamaChatStream(
    response: Response,
    _tools?: unknown,
  ): AsyncGenerator<{ content: string }> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() && line.startsWith("data: ")) {
            const dataLine = line.slice(6); // Remove "data: " prefix
            if (dataLine === "[DONE]") {
              return;
            }

            try {
              const data = JSON.parse(dataLine);
              const result = this.processOllamaStreamData(data);

              if (result?.content) {
                yield { content: result.content };
              }

              if (result?.shouldReturn) {
                return;
              }
            } catch (error) {
              logger.error("Error parsing Ollama stream response", {
                error,
              });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Format tool calls for display when tools aren't executed directly
   */
  private formatToolCallForDisplay(
    toolCalls: Array<{
      function?: {
        name?: string;
        arguments?: string;
      };
    }>,
  ): string {
    if (!toolCalls || toolCalls.length === 0) {
      return "";
    }

    const descriptions = toolCalls.map(
      (call: {
        function?: {
          name?: string;
          arguments?: string;
        };
      }) => {
        const functionName = call.function?.name || "unknown_function";
        let args = {};
        if (call.function?.arguments) {
          try {
            args = JSON.parse(call.function.arguments);
          } catch (error) {
            // If arguments are malformed, preserve for debugging while marking as invalid
            logger.warn?.(
              "Malformed tool call arguments: " + call.function.arguments,
            );
            args = {
              _malformed: true,
              _originalArguments: call.function.arguments,
              _error: error instanceof Error ? error.message : String(error),
            };
          }
        }
        return `\n[Tool Call: ${functionName}(${JSON.stringify(args)})]`;
      },
    );

    return descriptions.join("");
  }

  /**
   * Convert AI SDK tools to ToolDefinition format
   */
  private convertAISDKToolsToToolDefinitions(
    aiTools: Record<string, import("ai").Tool>,
  ): Record<
    string,
    import("../types/tools.js").ToolDefinition<ToolArgs, JsonValue>
  > {
    const result: Record<
      string,
      import("../types/tools.js").ToolDefinition<ToolArgs, JsonValue>
    > = {};

    for (const [name, tool] of Object.entries(aiTools)) {
      if ("description" in tool && tool.description) {
        result[name] = {
          description: tool.description,
          parameters: "parameters" in tool ? tool.parameters : undefined,
          execute: async (params: ToolArgs) => {
            if ("execute" in tool && tool.execute) {
              const result = await tool.execute(params as ToolArgs, {
                toolCallId: `tool_${Date.now()}`,
                messages: [],
              });
              return {
                success: true,
                data: result,
              };
            }
            throw new Error(`Tool ${name} has no execute method`);
          },
        };
      }
    }

    return result;
  }

  /**
   * Execute a single tool and return the result
   */
  private async executeSingleTool(
    toolName: string,
    args: Record<string, unknown>,
    _toolCallId?: string,
  ): Promise<string> {
    logger.debug(`[OllamaProvider] Executing single tool: ${toolName}`, {
      args,
    });

    try {
      // Use BaseProvider's tool execution mechanism
      const aiTools = await this.getAllTools();
      const tools = this.convertAISDKToolsToToolDefinitions(aiTools);

      if (!tools[toolName]) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      const tool = tools[toolName];
      if (!tool || !tool.execute) {
        throw new Error(`Tool ${toolName} does not have execute method`);
      }

      const toolInput = args || {};

      // Convert Record<string, unknown> to ToolArgs by filtering out non-JsonValue types
      const toolArgs: ToolArgs = {};
      for (const [key, value] of Object.entries(toolInput)) {
        // Only include values that are JsonValue compatible
        if (
          value === null ||
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          (typeof value === "object" && value !== null)
        ) {
          toolArgs[key] = value as JsonValue;
        }
      }

      const result = await tool.execute(toolArgs);
      logger.debug(`[OllamaProvider] Tool execution result:`, {
        toolName,
        result,
      });

      // Handle ToolResult type
      if (result && typeof result === "object" && "success" in result) {
        if (result.success && result.data !== undefined) {
          if (typeof result.data === "string") {
            return result.data;
          } else if (typeof result.data === "object") {
            return JSON.stringify(result.data, null, 2);
          } else {
            return String(result.data);
          }
        } else if (result.error) {
          throw new Error(result.error.message || "Tool execution failed");
        }
      }

      // Fallback for non-ToolResult return types
      if (typeof result === "string") {
        return result;
      } else if (typeof result === "object") {
        return JSON.stringify(result, null, 2);
      } else {
        return String(result);
      }
    } catch (error) {
      logger.error(`[OllamaProvider] Tool execution error:`, {
        toolName,
        error,
      });
      throw error;
    }
  }

  /**
   * Execute tools and format results for Ollama API
   * Similar to Bedrock's executeStreamTools but for Ollama format
   */
  private async executeOllamaTools(
    toolCalls: OllamaToolCall[],
    options: StreamOptions,
  ): Promise<OllamaToolResult[]> {
    const toolResults: OllamaToolResult[] = [];
    const toolCallsForStorage: Array<{
      type: string;
      toolCallId: string;
      toolName: string;
      args: unknown;
    }> = [];
    const toolResultsForStorage: Array<{
      type: string;
      toolCallId: string;
      toolName: string;
      result: unknown;
    }> = [];

    logger.debug(`[OllamaProvider] Executing ${toolCalls.length} tool calls`);

    for (const call of toolCalls) {
      logger.debug(`[OllamaProvider] Executing tool: ${call.function.name}`);

      // Parse arguments
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments);
      } catch (error) {
        logger.error(
          `[OllamaProvider] Failed to parse tool arguments: ${call.function.arguments}`,
          { error },
        );
        args = {};
      }

      // Track tool call for storage
      toolCallsForStorage.push({
        type: "tool-call",
        toolCallId: call.id,
        toolName: call.function.name,
        args,
      });

      try {
        // Execute tool using existing tool framework
        const result = await this.executeSingleTool(
          call.function.name,
          args,
          call.id,
        );

        logger.debug(
          `[OllamaProvider] Tool execution successful: ${call.function.name}`,
        );

        // Track result for storage
        toolResultsForStorage.push({
          type: "tool-result",
          toolCallId: call.id,
          toolName: call.function.name,
          result,
        });

        // Format for Ollama API
        toolResults.push({
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        logger.error(
          `[OllamaProvider] Tool execution failed: ${call.function.name}`,
          { error },
        );

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Track failed result
        toolResultsForStorage.push({
          type: "tool-result",
          toolCallId: call.id,
          toolName: call.function.name,
          result: { error: errorMessage },
        });

        // Format error for Ollama API
        toolResults.push({
          tool_call_id: call.id,
          content: JSON.stringify({ error: errorMessage }),
        });
      }
    }

    // Store tool executions (similar to Bedrock)
    this.handleToolExecutionStorage(
      toolCallsForStorage,
      toolResultsForStorage,
      options,
      new Date(),
    ).catch((error: unknown) => {
      logger.warn("[OllamaProvider] Failed to store tool executions", {
        provider: this.providerName,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return toolResults;
  }

  /**
   * Convert ReadableStream to AsyncIterable for compatibility with StreamResult interface
   */
  private convertToAsyncIterable(
    stream: ReadableStream,
  ): AsyncIterable<{ content: string }> {
    return {
      async *[Symbol.asyncIterator]() {
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            yield value;
          }
        } finally {
          reader.releaseLock();
        }
      },
    };
  }

  /**
   * Create stream generator for Ollama generate API (non-tool mode)
   */
  private async *createOllamaStream(
    response: Response,
  ): AsyncGenerator<{ content: string }> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                yield { content: data.response };
              }
              if (data.done) {
                return;
              }
            } catch (error) {
              logger.error("Error parsing Ollama stream response", {
                error,
              });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  protected handleProviderError(error: unknown): Error {
    if ((error as Error).name === "TimeoutError") {
      return new TimeoutError(
        `Ollama request timed out. The model might be loading or the request is too complex.`,
        this.defaultTimeout,
      );
    }

    if (
      (error as Error).message?.includes("ECONNREFUSED") ||
      (error as Error).message?.includes("fetch failed")
    ) {
      return new Error(
        `❌ Ollama Service Not Running\n\nCannot connect to Ollama at ${this.baseUrl}\n\n🔧 Steps to Fix:\n1. Install Ollama: https://ollama.ai/\n2. Start Ollama service: 'ollama serve'\n3. Verify it's running: 'curl ${this.baseUrl}/api/version'\n4. Try again`,
      );
    }

    if (
      (error as Error).message?.includes("model") &&
      (error as Error).message?.includes("not found")
    ) {
      return new Error(
        `❌ Ollama Model Not Found\n\nModel '${this.modelName}' is not available locally.\n\n🔧 Install Model:\n1. Run: ollama pull ${this.modelName}\n2. Or try a different model:\n   - ollama pull ${FALLBACK_OLLAMA_MODEL}\n   - ollama pull mistral:latest\n   - ollama pull codellama:latest\n\n🔧 List Available Models:\nollama list`,
      );
    }

    if ((error as Error).message?.includes("404")) {
      return new Error(
        `❌ Ollama API Endpoint Not Found\n\nThe API endpoint might have changed or Ollama version is incompatible.\n\n🔧 Check:\n1. Ollama version: 'ollama --version'\n2. Update Ollama to latest version\n3. Verify API is available: 'curl ${this.baseUrl}/api/version'`,
      );
    }

    return new Error(
      `❌ Ollama Provider Error\n\n${(error as Error).message || "Unknown error occurred"}\n\n🔧 Troubleshooting:\n1. Check if Ollama service is running\n2. Verify model is installed: 'ollama list'\n3. Check network connectivity to ${this.baseUrl}\n4. Review Ollama logs for details`,
    );
  }

  /**
   * Check if Ollama service is healthy and accessible
   */
  private async checkOllamaHealth(): Promise<void> {
    try {
      // Use traditional AbortController for better compatibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await proxyFetch(`${this.baseUrl}/api/version`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama health check failed: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
        throw new Error(
          `❌ Ollama Service Not Running\n\nCannot connect to Ollama service.\n\n🔧 Start Ollama:\n1. Run: ollama serve\n2. Or start Ollama app\n3. Verify: curl ${this.baseUrl}/api/version`,
        );
      }
      throw error;
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await proxyFetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((model: { name: string }) => model.name) || [];
    } catch (error) {
      logger.warn("Failed to fetch Ollama models:", error);
      return [];
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    const models = await this.getAvailableModels();
    return models.includes(modelName);
  }

  /**
   * Get recommendations for tool-calling capable Ollama models
   * Provides guidance for users who want to use function calling locally
   */
  static getToolCallingRecommendations(): {
    recommended: string[];
    performance: Record<
      string,
      { speed: number; quality: number; size: string }
    >;
    notes: Record<string, string>;
    installation: Record<string, string>;
  } {
    return {
      recommended: [
        "llama3.1:8b-instruct",
        "mistral:7b-instruct-v0.3",
        "hermes3:8b-llama3.1",
        "codellama:34b-instruct",
        "firefunction-v2:70b",
      ],
      performance: {
        "llama3.1:8b-instruct": { speed: 3, quality: 3, size: "4.6GB" },
        "mistral:7b-instruct-v0.3": { speed: 3, quality: 2, size: "4.1GB" },
        "hermes3:8b-llama3.1": { speed: 3, quality: 3, size: "4.6GB" },
        "codellama:34b-instruct": { speed: 1, quality: 3, size: "19GB" },
        "firefunction-v2:70b": { speed: 1, quality: 3, size: "40GB" },
      },
      notes: {
        "llama3.1:8b-instruct":
          "Best balance of speed, quality, and tool calling capability",
        "mistral:7b-instruct-v0.3":
          "Lightweight with reliable function calling",
        "hermes3:8b-llama3.1": "Specialized for tool execution and reasoning",
        "codellama:34b-instruct":
          "Excellent for code-related tool calling, requires more resources",
        "firefunction-v2:70b":
          "Optimized specifically for function calling, requires high-end hardware",
      },
      installation: {
        "llama3.1:8b-instruct": "ollama pull llama3.1:8b-instruct",
        "mistral:7b-instruct-v0.3": "ollama pull mistral:7b-instruct-v0.3",
        "hermes3:8b-llama3.1": "ollama pull hermes3:8b-llama3.1",
        "codellama:34b-instruct": "ollama pull codellama:34b-instruct",
        "firefunction-v2:70b": "ollama pull firefunction-v2:70b",
      },
    };
  }
}

export default OllamaProvider;
