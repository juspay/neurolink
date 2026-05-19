import type { AIProviderName } from "../constants/enums.js";
import { createAnalytics } from "../core/analytics.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { modelConfig } from "../core/modelConfiguration.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  JsonValue,
  MessageContent,
  MultimodalChatMessage,
  OllamaAsLanguageModel,
  OllamaHttpError,
  OllamaMessage,
  OllamaToolCall,
  OllamaToolResult,
  StreamOptions,
  StreamResult,
  Tool,
  ToolArgs,
  ZodUnknownSchema,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { buildMultimodalMessagesArray } from "../utils/messageBuilder.js";
import { buildMultimodalOptions } from "../utils/multimodalOptionsBuilder.js";
import { estimateTokens } from "../utils/tokenEstimation.js";
import {
  InvalidModelError,
  NetworkError,
  ProviderError,
} from "../types/index.js";
import { tracers, ATTR, withClientStreamSpan } from "../telemetry/index.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { TimeoutError } from "../utils/timeout.js";
import type { LanguageModel, Schema } from "../types/index.js";

// Model version constants (configurable via environment)
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const FALLBACK_OLLAMA_MODEL = "llama3.2:latest"; // Used when primary model fails

// Configuration helpers
const getOllamaBaseUrl = (): string => {
  return process.env.OLLAMA_BASE_URL || "http://localhost:11434";
};

const isOpenAICompatibleMode = (): boolean => {
  // Enable OpenAI-compatible API mode (/v1/chat/completions) instead of native Ollama API (/api/generate)
  // Useful for Ollama deployments that only support OpenAI-compatible routes (e.g., breezehq.dev)
  return process.env.OLLAMA_OPENAI_COMPATIBLE === "true";
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
  // Increased default timeout to 240000ms (4 minutes) to support slower native API responses
  // especially for larger models like aliafshar/gemma3-it-qat-tools:latest (12.2B parameters)
  return parseInt(process.env.OLLAMA_TIMEOUT || "240000", 10);
};

function isOllamaHttpError(error: unknown): error is OllamaHttpError {
  return (
    error instanceof ProviderError &&
    typeof (error as { statusCode?: unknown }).statusCode === "number" &&
    typeof (error as { responseBody?: unknown }).responseBody === "string"
  );
}

async function createOllamaHttpError(
  response: Response,
): Promise<OllamaHttpError> {
  let responseBody = "";
  try {
    responseBody = (await response.text()).trim();
  } catch {
    // Ignore unreadable bodies
  }

  const suffix = responseBody ? ` - ${responseBody.slice(0, 500)}` : "";
  const error = new ProviderError(
    `Ollama API error: ${response.status} ${response.statusText}${suffix}`,
    "ollama",
  ) as OllamaHttpError;
  error.statusCode = response.status;
  error.statusText = response.statusText;
  error.responseBody = responseBody;
  return error;
}

// Create proxy-aware fetch instance
const proxyFetch = createProxyFetch();

// Custom LanguageModel implementation for Ollama
class OllamaLanguageModel implements OllamaAsLanguageModel {
  /**
   * Specification version for the AI SDK LanguageModel interface.
   * Uses "v2" for structural compatibility with AI SDK v6's `LanguageModelV2`.
   * The AI SDK checks this field to determine which interface version to use.
   */
  readonly specificationVersion = "v2" as const;
  readonly provider = "ollama";
  readonly modelId: string;
  readonly maxTokens?: number;
  readonly supportsStreaming = true;
  readonly defaultObjectGenerationMode = "json" as const;

  /**
   * Supported URL patterns by media type.
   * Ollama runs locally and does not natively download URLs, so this is empty.
   * Required by the LanguageModelV2 interface.
   */
  readonly supportedUrls: Record<string, RegExp[]> = {};

  private baseUrl: string;
  private timeout: number;

  constructor(modelId: string, baseUrl: string, timeout: number) {
    this.modelId = modelId;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  private estimateTokenCount(text: string): number {
    return estimateTokens(text, "ollama");
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

  async doGenerate(
    options: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Vercel AI SDK passes messages via options.messages (same as stream mode)
    // Check options.messages first, then fall back to options.prompt for backward compatibility
    const messages =
      (options as { messages?: Array<{ role: string; content: unknown }> })
        .messages ||
      (options as { prompt?: Array<{ role: string; content: unknown }> })
        .prompt ||
      [];

    // Check if we should use OpenAI-compatible API
    const useOpenAIMode = isOpenAICompatibleMode();

    if (useOpenAIMode) {
      // OpenAI-compatible mode: Use /v1/chat/completions
      const requestBody = {
        model: this.modelId,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: false,
      };

      if (logger.shouldLog("debug")) {
        logger.debug(
          "[OllamaLanguageModel] Using OpenAI-compatible API with messages:",
          JSON.stringify(messages, null, 2),
        );
      }

      const response = await proxyFetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: createAbortSignalWithTimeout(this.timeout),
      });

      if (!response.ok) {
        throw await createOllamaHttpError(response);
      }

      const data = await response.json();

      logger.debug(
        "[OllamaLanguageModel] OpenAI API Response:",
        JSON.stringify(data, null, 2),
      );

      const text = data.choices?.[0]?.message?.content || "";
      const usage = data.usage || {};
      const promptTokens =
        usage.prompt_tokens ??
        this.estimateTokenCount(JSON.stringify(messages));
      const completionTokens =
        usage.completion_tokens ?? this.estimateTokenCount(text);

      return {
        content: text ? [{ type: "text", text }] : [],
        text,
        usage: {
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          promptTokens,
          completionTokens,
          totalTokens: usage.total_tokens ?? promptTokens + completionTokens,
        },
        finishReason: data.choices?.[0]?.finish_reason ?? "stop",
        warnings: [],
        request: {
          body: JSON.stringify(requestBody),
        },
        response: {
          id: data.id,
          modelId: data.model,
          timestamp: new Date(),
          headers: {},
          body: data,
        },
        rawCall: {
          rawPrompt: messages,
          rawSettings: {
            model: this.modelId,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
          },
        },
        rawResponse: {
          headers: {},
        },
      };
    } else {
      // Native Ollama mode: Use /api/generate
      const prompt = this.convertMessagesToPrompt(messages);

      logger.debug(
        "[OllamaLanguageModel] Using native API with prompt:",
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
        throw await createOllamaHttpError(response);
      }

      const data = await response.json();

      logger.debug(
        "[OllamaLanguageModel] Native API Response:",
        JSON.stringify(data, null, 2),
      );

      const text = String(data.response ?? "");
      const promptTokens =
        data.prompt_eval_count ?? this.estimateTokenCount(prompt);
      const completionTokens = data.eval_count ?? this.estimateTokenCount(text);
      const requestBody = {
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
      };

      return {
        content: text ? [{ type: "text", text }] : [],
        text,
        usage: {
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason: data.done_reason ?? "stop",
        warnings: [],
        request: {
          body: JSON.stringify(requestBody),
        },
        response: {
          id: data.created_at,
          modelId: this.modelId,
          timestamp: data.created_at ? new Date(data.created_at) : new Date(),
          headers: {},
          body: data,
        },
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
  }

  async doStream(options: Record<string, unknown>): Promise<{
    stream: ReadableStream<Record<string, unknown>>;
    rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
    rawResponse?: { headers?: Record<string, string> };
    request?: { body?: string };
    warnings?: Array<{ type: "other"; message: string }>;
  }> {
    const messages =
      (options as { messages?: Array<{ role: string; content: unknown }> })
        .messages || [];

    // Check if we should use OpenAI-compatible API
    const useOpenAIMode = isOpenAICompatibleMode();

    if (useOpenAIMode) {
      // OpenAI-compatible mode: Use /v1/chat/completions
      const requestUrl = `${this.baseUrl}/v1/chat/completions`;
      const requestBody = {
        model: this.modelId,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
      };

      logger.debug(
        "[OllamaLanguageModel] doStream: Using OpenAI-compatible API",
        {
          url: requestUrl,
          baseUrl: this.baseUrl,
          modelId: this.modelId,
          requestBody: JSON.stringify(requestBody),
        },
      );

      const response = await proxyFetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: createAbortSignalWithTimeout(this.timeout),
      });

      logger.debug("[OllamaLanguageModel] doStream: Response received", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        throw await createOllamaHttpError(response);
      }

      const self = this;
      return {
        stream: new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of self.parseOpenAIStreamResponse(
                response,
                messages,
              )) {
                controller.enqueue(chunk);
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        }),
        rawCall: {
          rawPrompt: messages,
          rawSettings: {
            model: this.modelId,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
          },
        },
        rawResponse: {
          headers: {},
        },
      };
    } else {
      // Native Ollama mode: Use /api/generate
      const prompt = this.convertMessagesToPrompt(messages);
      const requestUrl = `${this.baseUrl}/api/generate`;
      const requestBody = {
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
      };

      logger.debug("[OllamaLanguageModel] doStream: Using native API", {
        url: requestUrl,
        baseUrl: this.baseUrl,
        modelId: this.modelId,
        requestBody: JSON.stringify(requestBody),
      });

      const response = await proxyFetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: createAbortSignalWithTimeout(this.timeout),
      });

      logger.debug("[OllamaLanguageModel] doStream: Response received", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        throw await createOllamaHttpError(response);
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
          rawPrompt: messages,
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
  }

  private async *parseStreamResponse(
    response: Response,
  ): AsyncGenerator<Record<string, unknown>> {
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
                      this.estimateTokenCount(data.context || ""),
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

  private async *parseOpenAIStreamResponse(
    response: Response,
    messages: Array<{ role: string; content: unknown }>,
  ): AsyncGenerator<Record<string, unknown>> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    // Estimate prompt tokens from messages (matches non-streaming behavior)
    const totalPromptTokens = this.estimateTokenCount(JSON.stringify(messages));
    // Accumulate full completion text; estimate tokens once at the end to avoid
    // per-chunk rounding inflation that occurs when estimateTokenCount is called
    // on every delta and the results are summed.
    let completionText = "";

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
          const trimmed = line.trim();
          if (trimmed === "" || trimmed === "data: [DONE]") {
            continue;
          }

          if (trimmed.startsWith("data: ")) {
            try {
              const jsonStr = trimmed.slice(6); // Remove "data: " prefix
              const data = JSON.parse(jsonStr);

              // Extract content delta
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                yield {
                  type: "text-delta",
                  textDelta: content,
                };
                completionText += content;
              }

              // Check for finish
              const finishReason = data.choices?.[0]?.finish_reason;
              if (finishReason === "stop") {
                // Prefer server-reported usage; fall back to a single estimate over
                // the full accumulated text (avoids per-chunk rounding inflation).
                const promptTokens =
                  data.usage?.prompt_tokens || totalPromptTokens;
                const completionTokens =
                  data.usage?.completion_tokens ||
                  this.estimateTokenCount(completionText);

                yield {
                  type: "finish",
                  finishReason: "stop",
                  usage: {
                    promptTokens,
                    completionTokens,
                  },
                };
                return;
              }
            } catch (error) {
              logger.error("Error parsing OpenAI stream response", {
                error,
                line: trimmed,
              });
            }
          }
        }
      }

      // If loop exits without explicit finish, yield final finish
      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: totalPromptTokens,
          completionTokens: this.estimateTokenCount(completionText),
        },
      };
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

  constructor(modelName?: string, credentials?: { baseURL?: string }) {
    super(modelName, "ollama" as AIProviderName);

    this.baseUrl = credentials?.baseURL ?? getOllamaBaseUrl();
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
   * Returns the Vercel AI SDK model instance for Ollama.
   *
   * OllamaLanguageModel implements OllamaAsLanguageModel which is structurally
   * compatible with LanguageModelV2 (specificationVersion "v2", modelId, provider,
   * supportedUrls, doGenerate, doStream).
   */
  protected getAISDKModel(): LanguageModel {
    const model: OllamaAsLanguageModel = this.ollamaModel;
    return model as LanguageModel;
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

    // Only disable tools if we have positive evidence the model doesn't support them
    // If toolCapableModels config is empty, assume tools are supported (don't make assumptions)
    if (toolCapableModels.length === 0) {
      logger.debug("Ollama tool calling enabled", {
        model: this.modelName,
        reason: "No tool-capable config defined, assuming tools supported",
        baseUrl: this.baseUrl,
      });
      return true;
    }

    // Config exists - check if current model matches tool-capable model patterns
    const isToolCapable = toolCapableModels.some((capableModel) =>
      modelName.includes(capableModel.toLowerCase()),
    );

    if (isToolCapable) {
      logger.debug("Ollama tool calling enabled", {
        model: this.modelName,
        reason: "Model in tool-capable list",
        baseUrl: this.baseUrl,
        configuredModels: toolCapableModels.length,
      });
      return true;
    }

    // Config exists and model is NOT in list - disable tools
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
    return withClientStreamSpan(
      {
        name: "neurolink.provider.stream",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: "ollama",
          [ATTR.GEN_AI_MODEL]: this.modelName || FALLBACK_OLLAMA_MODEL,
          [ATTR.GEN_AI_OPERATION]: "stream",
          [ATTR.NL_HAS_TOOLS]: true,
          [ATTR.NL_STREAM_MODE]: true,
        },
      },
      async (span) => {
        const startTime = Date.now();
        const maxIterations = options.maxSteps || DEFAULT_MAX_STEPS;
        let iteration = 0;

        // Get all available tools (direct + MCP + external)
        // BaseProvider.stream() pre-merges base tools + external tools into options.tools
        const allTools =
          (options.tools as Record<string, Tool>) || (await this.getAllTools());
        // Convert tools to Ollama format
        const ollamaTools = this.convertToolsToOllamaFormat(allTools);

        span.setAttribute(ATTR.NL_TOOL_COUNT, ollamaTools.length);

        // Validate that PDFs are not provided
        if (options.input?.pdfFiles && options.input.pdfFiles.length > 0) {
          throw this.handleProviderError(
            new Error(
              "PDF inputs are not supported by OllamaProvider. " +
                "Please remove PDFs or use a supported provider (OpenAI, Anthropic, Google Vertex AI, etc.).",
            ),
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
            content: options.input.text ?? "",
          });
        }

        // Capture instance references before the stream for use in the finally block.
        const ollamaNeurolink = this.neurolink;
        const ollamaProviderName = this.providerName;
        const ollamaModelName = this.modelName || FALLBACK_OLLAMA_MODEL;

        // Conversation loop for multi-step tool execution
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let lastFinishReason: string | undefined;
        let ollamaStreamErrored = false;
        const stream = new ReadableStream({
          start: async (controller) => {
            try {
              while (iteration < maxIterations) {
                logger.debug(
                  `[OllamaProvider] Conversation iteration ${iteration + 1}/${maxIterations}`,
                );

                // Make API request — request usage in stream_options so
                // Pipeline B gets real token counts for Langfuse cost dashboards.
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
                      stream_options: { include_usage: true },
                      temperature: options.temperature,
                      max_tokens: options.maxTokens,
                    }),
                    signal: createAbortSignalWithTimeout(this.timeout),
                  },
                );

                if (!response.ok) {
                  throw this.handleProviderError(
                    await createOllamaHttpError(response),
                  );
                }

                // Process response stream
                const { content, toolCalls, finishReason, usage } =
                  await this.processOllamaResponse(response, controller);

                // Accumulate usage across iterations for Pipeline B
                if (usage) {
                  totalInputTokens += usage.input;
                  totalOutputTokens += usage.output;
                }
                if (finishReason) {
                  lastFinishReason = finishReason;
                }

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
                  span.setAttribute(
                    ATTR.GEN_AI_FINISH_REASON,
                    finishReason || "stop",
                  );
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
                  for (const tc of toolCalls) {
                    span.addEvent("tool_call", {
                      [ATTR.GEN_AI_TOOL_NAME]: tc.function.name,
                    });
                  }
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
                } else if (finishReason === "length") {
                  // Max tokens reached, continue conversation
                  logger.debug(
                    `[OllamaProvider] Max tokens reached, continuing`,
                  );
                  conversationHistory.push({
                    role: "user",
                    content: "Please continue.",
                  });
                  iteration++;
                } else {
                  // Unknown finish reason, end conversation
                  logger.warn(
                    `[OllamaProvider] Unknown finish reason: ${finishReason}`,
                  );
                  span.setAttribute(ATTR.GEN_AI_FINISH_REASON, finishReason);
                  controller.close();
                  break;
                }
              }

              if (iteration >= maxIterations) {
                ollamaStreamErrored = true;
                controller.error(
                  new Error(
                    `Ollama conversation exceeded maximum iterations (${maxIterations})`,
                  ),
                );
              }
            } catch (error) {
              ollamaStreamErrored = true;
              controller.error(error);
            } finally {
              // Resolve analytics with accumulated token counts so Pipeline A
              // and Pipeline B both get real usage data from Ollama.
              const aggregatedUsage = {
                input: totalInputTokens,
                output: totalOutputTokens,
                total: totalInputTokens + totalOutputTokens,
              };
              resolveAnalytics(
                createAnalytics(
                  this.providerName,
                  this.modelName || FALLBACK_OLLAMA_MODEL,
                  { usage: aggregatedUsage },
                  Date.now() - startTime,
                  {
                    requestId: `ollama-stream-${Date.now()}`,
                    streamingMode: true,
                    iterations: iteration,
                  },
                ),
              );
              // Emit generation:end so Pipeline B (Langfuse) creates a GENERATION
              // observation. Ollama bypasses the Vercel AI SDK so
              // experimental_telemetry is never injected; we emit manually.
              const ollamaEmitter = ollamaNeurolink?.getEventEmitter();
              if (ollamaEmitter) {
                // Collect accumulated text from conversation history
                const accumulatedContent = conversationHistory
                  .filter((m) => m.role === "assistant")
                  .map((m) => m.content)
                  .join("");
                ollamaEmitter.emit("generation:end", {
                  provider: ollamaProviderName,
                  responseTime: Date.now() - startTime,
                  timestamp: Date.now(),
                  result: {
                    content: accumulatedContent,
                    usage: aggregatedUsage,
                    model: ollamaModelName,
                    provider: ollamaProviderName,
                    finishReason: ollamaStreamErrored
                      ? "error"
                      : (lastFinishReason ?? "stop"),
                  },
                  success: !ollamaStreamErrored,
                });
              }
            }
          },
        });

        // Defer analytics resolution until the stream's start callback finishes.
        // This ensures responseTime and iteration reflect the actual completed values
        // rather than values captured before the tool-loop executes.
        let resolveAnalytics!: (
          value: ReturnType<typeof createAnalytics>,
        ) => void;
        const analyticsPromise = new Promise<
          ReturnType<typeof createAnalytics>
        >((resolve) => {
          resolveAnalytics = resolve;
        });

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
      },
      (r) => r.stream,
      (r, wrapped) => ({ ...r, stream: wrapped }),
    );
  }

  /**
   * Execute streaming without tools using the generate API
   * Fallback for non-tool scenarios or when chat API is unavailable
   */
  private async executeStreamWithoutTools(
    options: StreamOptions,
    _analysisSchema?: ZodUnknownSchema | Schema<unknown>,
  ): Promise<StreamResult> {
    return withClientStreamSpan(
      {
        name: "neurolink.provider.stream",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: "ollama",
          [ATTR.GEN_AI_MODEL]: this.modelName || FALLBACK_OLLAMA_MODEL,
          [ATTR.GEN_AI_OPERATION]: "stream",
          [ATTR.NL_HAS_TOOLS]: false,
          [ATTR.NL_STREAM_MODE]: true,
        },
      },
      async () => {
        // Validate that PDFs are not provided
        if (options.input?.pdfFiles && options.input.pdfFiles.length > 0) {
          throw this.handleProviderError(
            new Error(
              "PDF inputs are not supported by OllamaProvider. " +
                "Please remove PDFs or use a supported provider (OpenAI, Anthropic, Google Vertex AI, etc.).",
            ),
          );
        }

        // Check for multimodal input
        const hasMultimodalInput = !!(
          options.input?.images?.length ||
          options.input?.content?.length ||
          options.input?.files?.length ||
          options.input?.csvFiles?.length
        );

        const useOpenAIMode = isOpenAICompatibleMode();

        if (useOpenAIMode) {
          // OpenAI-compatible mode: Use /v1/chat/completions with messages
          logger.debug(`Ollama (OpenAI mode): Building messages for streaming`);

          const messages: Array<{ role: string; content: string }> = [];

          if (options.systemPrompt) {
            messages.push({ role: "system", content: options.systemPrompt });
          }

          if (hasMultimodalInput) {
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

            // Convert multimodal messages to text (OpenAI-compatible mode doesn't support images in /v1/chat/completions for Ollama)
            const content = multimodalMessages
              .map((msg) =>
                typeof msg.content === "string" ? msg.content : "",
              )
              .join("\n");

            messages.push({ role: "user", content });
          } else {
            messages.push({ role: "user", content: options.input.text ?? "" });
          }

          const requestUrl = `${this.baseUrl}/v1/chat/completions`;
          const requestBody = {
            model: this.modelName || FALLBACK_OLLAMA_MODEL,
            messages,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            stream: true,
          };

          logger.debug(`[Ollama OpenAI Mode] About to fetch:`, {
            url: requestUrl,
            baseUrl: this.baseUrl,
            modelName: this.modelName,
            requestBody: JSON.stringify(requestBody),
          });

          const response = await proxyFetch(requestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: createAbortSignalWithTimeout(this.timeout),
          });

          logger.debug(`[Ollama OpenAI Mode] Response received:`, {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
          });

          if (!response.ok) {
            throw this.handleProviderError(
              await createOllamaHttpError(response),
            );
          }

          // Transform to async generator for OpenAI-compatible format
          const self = this;
          const transformedStream = async function* () {
            const generator = self.createOpenAIStream(response);
            for await (const chunk of generator) {
              yield chunk;
            }
          };

          return {
            stream: transformedStream(),
            provider: self.providerName,
            model: self.modelName,
          };
        } else {
          // Native Ollama mode: Use /api/generate
          let prompt = options.input.text;
          let images: string[] | undefined;

          if (hasMultimodalInput) {
            logger.debug(`Ollama (native mode): Detected multimodal input`, {
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
              .map((msg) =>
                typeof msg.content === "string" ? msg.content : "",
              )
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

          const requestUrl = `${this.baseUrl}/api/generate`;

          logger.debug(`[Ollama Native Mode] About to fetch:`, {
            url: requestUrl,
            baseUrl: this.baseUrl,
            modelName: this.modelName,
            requestBody: JSON.stringify(requestBody),
          });

          const response = await proxyFetch(requestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: createAbortSignalWithTimeout(this.timeout),
          });

          logger.debug(`[Ollama Native Mode] Response received:`, {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
          });

          if (!response.ok) {
            throw this.handleProviderError(
              await createOllamaHttpError(response),
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
      },
      (r) => r.stream,
      (r, wrapped) => ({ ...r, stream: wrapped }),
    );
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
    usage?: { input: number; output: number; total: number };
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
    let finalUsage:
      | { input: number; output: number; total: number }
      | undefined;

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
              // OpenAI-compatible usage chunk (Ollama may include usage
              // in the final chunk when stream_options.include_usage is set,
              // or as a standalone chunk with empty choices).
              const parsedUsage = (
                parsed as {
                  usage?: {
                    prompt_tokens?: number;
                    completion_tokens?: number;
                    total_tokens?: number;
                  };
                }
              ).usage;
              if (parsedUsage) {
                const input = parsedUsage.prompt_tokens ?? 0;
                const output = parsedUsage.completion_tokens ?? 0;
                finalUsage = {
                  input,
                  output,
                  total: parsedUsage.total_tokens ?? input + output,
                };
              }
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
      usage: finalUsage,
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
    aiTools: Record<string, Tool>,
  ): Record<
    string,
    import("../types/index.js").ToolDefinition<ToolArgs, JsonValue>
  > {
    const result: Record<
      string,
      import("../types/index.js").ToolDefinition<ToolArgs, JsonValue>
    > = {};

    for (const [name, tool] of Object.entries(aiTools)) {
      if ("description" in tool && tool.description) {
        // AI SDK v6 uses `inputSchema`; legacy tools may still use `parameters`
        const toolSchema:
          | import("../types/index.js").ToolParameterSchema
          | undefined =
          "inputSchema" in tool
            ? (tool.inputSchema as import("../types/index.js").ToolParameterSchema)
            : "parameters" in tool
              ? ((tool as Record<string, unknown>)
                  .parameters as import("../types/index.js").ToolParameterSchema)
              : undefined;
        result[name] = {
          description: tool.description,
          parameters: toolSchema,
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
          const errorMessage =
            typeof result.error === "string"
              ? result.error
              : result.error.message || "Tool execution failed";
          throw new Error(errorMessage);
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
      let args: Record<string, unknown>;
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

    // Emit tool:end for each completed tool result so Pipeline B
    // captures telemetry for Ollama-driven tool calls (gap S2).
    emitToolEndFromStepFinish(
      this.neurolink?.getEventEmitter(),
      toolResultsForStorage.map((tr) => {
        const hasError =
          tr.result && typeof tr.result === "object" && "error" in tr.result;
        return {
          toolName: tr.toolName,
          result: tr.result,
          error: hasError
            ? String((tr.result as Record<string, unknown>).error)
            : undefined,
        };
      }),
    );

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

  private async *createOpenAIStream(
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
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === "data: [DONE]") {
            continue;
          }

          if (trimmedLine.startsWith("data: ")) {
            try {
              const jsonStr = trimmedLine.slice(6); // Remove "data: " prefix
              const data = JSON.parse(jsonStr);
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                yield { content };
              }
              if (data.choices?.[0]?.finish_reason) {
                return;
              }
            } catch (error) {
              logger.error("Error parsing OpenAI stream response", {
                error,
                line: trimmedLine,
              });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new TimeoutError(
        `Ollama request timed out. The model might be loading or the request is too complex.`,
        this.timeout,
      );
    }

    if (
      (error as Error).message?.includes("ECONNREFUSED") ||
      (error as Error).message?.includes("fetch failed")
    ) {
      return new NetworkError(
        `❌ Ollama Service Not Running\n\nCannot connect to Ollama at ${this.baseUrl}\n\n🔧 Steps to Fix:\n1. Install Ollama: https://ollama.ai/\n2. Start Ollama service: 'ollama serve'\n3. Verify it's running: 'curl ${this.baseUrl}/api/version'\n4. Try again`,
        this.providerName,
      );
    }

    if (
      (error as Error).message?.includes("model") &&
      (error as Error).message?.includes("not found")
    ) {
      return new InvalidModelError(
        `❌ Ollama Model Not Found\n\nModel '${this.modelName}' is not available locally.\n\n🔧 Install Model:\n1. Run: ollama pull ${this.modelName}\n2. Or try a different model:\n   - ollama pull ${FALLBACK_OLLAMA_MODEL}\n   - ollama pull mistral:latest\n   - ollama pull codellama:latest\n\n🔧 List Available Models:\nollama list`,
        this.providerName,
      );
    }

    const errMsg = (error as Error).message ?? "";
    const httpStatus = isOllamaHttpError(error) ? error.statusCode : undefined;
    const responseBody = isOllamaHttpError(error) ? error.responseBody : "";
    if (
      httpStatus === 404 &&
      (responseBody.toLowerCase().includes("model") ||
        responseBody.toLowerCase().includes("not found") ||
        errMsg.toLowerCase().includes("model") ||
        errMsg.toLowerCase().includes("not found"))
    ) {
      return new InvalidModelError(
        `❌ Ollama Returned HTTP 404\n\nThis usually means the configured model '${this.modelName}' is not installed locally, although a bad base URL or incompatible API mode can also cause it.\n\n🔧 Check:\n1. Verify the model exists: 'ollama list'\n2. Pull it if missing: 'ollama pull ${this.modelName}'\n3. Verify the service is healthy: 'curl ${this.baseUrl}/api/version'\n4. If you use OpenAI-compatible mode, confirm the base URL serves /v1/chat/completions`,
        this.providerName,
      );
    }

    if (httpStatus === 404) {
      return new ProviderError(
        `❌ Ollama Endpoint Returned HTTP 404\n\nThe configured base URL (${this.baseUrl}) did not serve the expected Ollama endpoint for model '${this.modelName}'. This is usually a configuration or API-mode mismatch rather than a missing model.\n\n🔧 Check:\n1. Verify the base URL: ${this.baseUrl}\n2. For native Ollama mode, confirm /api/generate exists\n3. For OpenAI-compatible mode, confirm /v1/chat/completions exists\n4. If the model is missing, the response body should explicitly say so`,
        this.providerName,
      );
    }

    return new ProviderError(
      `❌ Ollama Provider Error\n\n${(error as Error).message || "Unknown error occurred"}\n\n🔧 Troubleshooting:\n1. Check if Ollama service is running\n2. Verify model is installed: 'ollama list'\n3. Check network connectivity to ${this.baseUrl}\n4. Review Ollama logs for details`,
      this.providerName,
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
          { cause: error },
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
