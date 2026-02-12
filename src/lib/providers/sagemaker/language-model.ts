/**
 * SageMaker Language Model Implementation
 *
 * This module implements the LanguageModelV1 interface for Amazon SageMaker
 * integration with the Vercel AI SDK.
 */

import { randomUUID } from "crypto";
import type {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1StreamPart,
} from "ai";

import { SageMakerRuntimeClient } from "./client.js";
import { handleSageMakerError } from "./errors.js";
import { estimateTokenUsage, createSageMakerStream } from "./streaming.js";
import type {
  SageMakerConfig,
  SageMakerModelConfig,
} from "../../types/providers.js";
import type { ConnectivityResult } from "../../types/typeAliases.js";
import { createAdaptiveSemaphore } from "./adaptive-semaphore.js";
import { logger } from "../../utils/logger.js";
import type { UnknownRecord } from "../../types/common.js";

/**
 * Interface for SageMaker tool call results
 */
type SageMakerToolCall = {
  type: "function";
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

/**
 * Base synthetic streaming delay in milliseconds for simulating real-time response
 * Can be configured via SAGEMAKER_BASE_STREAMING_DELAY_MS environment variable
 */
const BASE_SYNTHETIC_STREAMING_DELAY_MS = process.env
  .SAGEMAKER_BASE_STREAMING_DELAY_MS
  ? parseInt(process.env.SAGEMAKER_BASE_STREAMING_DELAY_MS, 10)
  : 50;

/**
 * Maximum synthetic streaming delay in milliseconds to prevent excessively slow streaming
 * Can be configured via SAGEMAKER_MAX_STREAMING_DELAY_MS environment variable
 */
const MAX_SYNTHETIC_STREAMING_DELAY_MS = process.env
  .SAGEMAKER_MAX_STREAMING_DELAY_MS
  ? parseInt(process.env.SAGEMAKER_MAX_STREAMING_DELAY_MS, 10)
  : 200;

/**
 * Calculate adaptive delay based on text size to avoid slow streaming for large texts
 * Smaller texts get longer delays for realistic feel, larger texts get shorter delays for performance
 */
function calculateAdaptiveDelay(
  textLength: number,
  chunkCount: number,
): number {
  // Base calculation: smaller delay for larger texts
  const adaptiveDelay = Math.max(
    10, // Minimum 10ms delay
    Math.min(
      MAX_SYNTHETIC_STREAMING_DELAY_MS,
      BASE_SYNTHETIC_STREAMING_DELAY_MS * (1000 / Math.max(textLength, 100)),
    ),
  );

  // Further reduce delay if there are many chunks to process
  if (chunkCount > 20) {
    return Math.max(10, adaptiveDelay * 0.5); // Half delay for many chunks
  } else if (chunkCount > 10) {
    return Math.max(15, adaptiveDelay * 0.7); // Reduced delay for moderate chunks
  }

  return adaptiveDelay;
}

/**
 * Create an async iterator for text chunks with adaptive delay between chunks
 * Used for synthetic streaming simulation with performance optimization for large texts
 */
async function* createTextChunkIterator(text?: string): AsyncGenerator<string> {
  if (!text) {
    return; // No text to emit
  }

  const words = text.split(/\s+/);
  const chunkSize = Math.max(1, Math.floor(words.length / 10));
  const totalChunks = Math.ceil(words.length / chunkSize);

  // Calculate adaptive delay based on text size and chunk count
  const adaptiveDelay = calculateAdaptiveDelay(text.length, totalChunks);

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    const deltaText = i === 0 ? chunk : " " + chunk;

    // Add adaptive delay between chunks for realistic streaming simulation
    // Delay is shorter for larger texts to improve performance
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, adaptiveDelay));
    }

    yield deltaText;
  }
}

/**
 * Batch processing concurrency constants
 */
const DEFAULT_INITIAL_CONCURRENCY = 5;
const DEFAULT_MAX_CONCURRENCY = 10;
const DEFAULT_MIN_CONCURRENCY = 1;

/**
 * SageMaker Language Model implementing LanguageModelV1 interface
 *
 * Token Limit Behavior:
 * - When maxTokens is undefined, SageMaker uses the model's default token limits
 * - When maxTokens is specified, it sets max_new_tokens parameter explicitly
 * - This aligns with the unlimited-by-default token policy across all providers
 */
export class SageMakerLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";
  readonly provider = "sagemaker";
  readonly modelId: string;
  readonly supportsStreaming = true;
  readonly defaultObjectGenerationMode = "json" as const;

  private client: SageMakerRuntimeClient;
  private config: SageMakerConfig;
  private modelConfig: SageMakerModelConfig;

  constructor(
    modelId: string,
    config: SageMakerConfig,
    modelConfig: SageMakerModelConfig,
  ) {
    this.modelId = modelId;
    this.config = config;
    this.modelConfig = modelConfig;
    this.client = new SageMakerRuntimeClient(config);

    logger.debug("SageMaker Language Model initialized", {
      modelId: this.modelId,
      endpointName: this.modelConfig.endpointName,
      provider: this.provider,
      specificationVersion: this.specificationVersion,
    });
  }

  /**
   * Generate text synchronously using SageMaker endpoint
   */
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
    warnings?: Array<{
      type: "other";
      message: string;
    }>;
    rawCall: {
      rawPrompt: unknown;
      rawSettings: Record<string, unknown>;
    };
    rawResponse?: {
      headers?: Record<string, string>;
    };
    request?: {
      body?: string;
    };
  }> {
    const startTime = Date.now();

    try {
      const promptText = this.extractPromptText(options);

      logger.debug("SageMaker doGenerate called", {
        endpointName: this.modelConfig.endpointName,
        promptLength: promptText.length,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      });

      // Convert AI SDK options to SageMaker request format
      const sagemakerRequest = this.convertToSageMakerRequest(options);

      // Invoke SageMaker endpoint
      const response = await this.client.invokeEndpoint({
        EndpointName: this.modelConfig.endpointName,
        Body: JSON.stringify(sagemakerRequest),
        ContentType: "application/json",
        Accept: "application/json",
      });

      // Parse SageMaker response
      const responseBody = JSON.parse(new TextDecoder().decode(response.Body));
      const generatedText = this.extractTextFromResponse(responseBody);

      // Extract tool calls if present (Phase 4 enhancement)
      const toolCalls = this.extractToolCallsFromResponse(responseBody);

      // Calculate token usage
      const usage = estimateTokenUsage(promptText, generatedText);

      // Determine finish reason based on response content
      let finishReason:
        | "stop"
        | "length"
        | "content-filter"
        | "tool-calls"
        | "error"
        | "unknown" = "stop";
      if (toolCalls && toolCalls.length > 0) {
        finishReason = "tool-calls";
      } else if (responseBody.finish_reason) {
        finishReason = this.mapSageMakerFinishReason(
          responseBody.finish_reason,
        );
      }

      const duration = Date.now() - startTime;
      logger.debug("SageMaker doGenerate completed", {
        duration,
        outputLength: generatedText.length,
        usage,
        toolCallsCount: toolCalls?.length || 0,
        finishReason,
      });

      const result: {
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
        warnings?: Array<{ type: "other"; message: string }>;
        rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
        rawResponse?: { headers?: Record<string, string> };
        request?: { body?: string };
        toolCalls?: SageMakerToolCall[];
        object?: unknown;
      } = {
        text: generatedText,
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.total,
        },
        finishReason,
        rawCall: {
          rawPrompt: options.prompt,
          rawSettings: {
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            topP: options.topP,
            endpointName: this.modelConfig.endpointName,
          },
        },
        rawResponse: {
          headers: {
            "content-type": response.ContentType || "application/json",
            "invoked-variant": response.InvokedProductionVariant || "",
          },
        },
        request: {
          body: JSON.stringify(sagemakerRequest),
        },
      };

      // Add tool calls to result if present
      if (toolCalls && toolCalls.length > 0) {
        result.toolCalls = toolCalls;
      }

      // Add structured data if response format was specified (Phase 4)
      const responseFormat = (sagemakerRequest as UnknownRecord)
        .response_format;
      if (
        responseFormat &&
        ((responseFormat as UnknownRecord).type === "json_object" ||
          (responseFormat as UnknownRecord).type === "json_schema")
      ) {
        try {
          const parsedData = JSON.parse(generatedText);
          result.object = parsedData;

          logger.debug("Extracted structured data from response", {
            responseFormat: (responseFormat as UnknownRecord).type,
            hasObject: !!result.object,
          });
        } catch (parseError) {
          logger.warn("Failed to parse structured response as JSON", {
            error:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
            responseText: generatedText.substring(0, 200),
          });
          // Keep the text response as fallback
        }
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("SageMaker doGenerate failed", {
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      throw handleSageMakerError(error, this.modelConfig.endpointName);
    }
  }

  /**
   * Generate text with streaming using SageMaker endpoint
   */
  async doStream(options: LanguageModelV1CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV1StreamPart>;
    rawCall: {
      rawPrompt: unknown;
      rawSettings: Record<string, unknown>;
    };
    rawResponse?: {
      headers?: Record<string, string>;
    };
    request?: {
      body?: string;
    };
    warnings?: Array<{
      type: "other";
      message: string;
    }>;
  }> {
    try {
      const promptText = this.extractPromptText(options);

      logger.debug("SageMaker doStream called", {
        endpointName: this.modelConfig.endpointName,
        promptLength: promptText.length,
      });

      // Phase 2: Full streaming implementation with automatic detection
      const sagemakerRequest = this.convertToSageMakerRequest(options);

      // Add streaming parameter if model supports it
      const requestWithStreaming = {
        ...sagemakerRequest,
        parameters: {
          ...(typeof sagemakerRequest.parameters === "object" &&
          sagemakerRequest.parameters !== null
            ? sagemakerRequest.parameters
            : {}),
          stream: true, // Will be validated by detection system
        },
      };

      logger.debug("Attempting streaming generation", {
        endpointName: this.modelConfig.endpointName,
        hasStreamingFlag: true,
      });

      try {
        // First, try to invoke with streaming
        const response = await this.client.invokeEndpointWithStreaming({
          EndpointName: this.modelConfig.endpointName,
          Body: JSON.stringify(requestWithStreaming),
          ContentType: this.modelConfig.contentType || "application/json",
          Accept: this.modelConfig.accept || "application/json",
        });

        // Create intelligent streaming response
        const stream = await createSageMakerStream(
          response.Body,
          this.modelConfig.endpointName,
          this.config,
          {
            prompt: promptText,
            onChunk: (chunk) => {
              logger.debug("Streaming chunk received", {
                contentLength: chunk.content?.length || 0,
                done: chunk.done,
              });
            },
            onComplete: (usage) => {
              logger.debug("Streaming completed", {
                usage,
                endpointName: this.modelConfig.endpointName,
              });
            },
            onError: (error) => {
              logger.error("Streaming error", {
                error: error.message,
                endpointName: this.modelConfig.endpointName,
              });
            },
          },
        );

        return {
          stream: stream as ReadableStream<LanguageModelV1StreamPart>,
          rawCall: {
            rawPrompt: sagemakerRequest,
            rawSettings: this.modelConfig as unknown as Record<string, unknown>,
          },
          rawResponse: {
            headers: {
              "Content-Type": response.ContentType || "application/json",
              "X-Invoked-Production-Variant":
                response.InvokedProductionVariant || "unknown",
            },
          },
        };
      } catch (streamingError) {
        logger.warn("Streaming failed, falling back to non-streaming", {
          endpointName: this.modelConfig.endpointName,
          error:
            streamingError instanceof Error
              ? streamingError.message
              : String(streamingError),
        });

        // Fallback: Generate normally and create synthetic stream
        const result = await this.doGenerate(options);

        // Create synthetic stream from complete result using async iterator pattern
        const syntheticStream = new ReadableStream<LanguageModelV1StreamPart>({
          async start(controller) {
            try {
              // Create async iterator for text chunks
              const textChunks = createTextChunkIterator(result.text);

              // Process chunks with async iterator pattern
              for await (const deltaText of textChunks) {
                controller.enqueue({
                  type: "text-delta",
                  textDelta: deltaText,
                });
              }

              // Emit completion
              controller.enqueue({
                type: "finish",
                finishReason: result.finishReason as
                  | "stop"
                  | "length"
                  | "content-filter"
                  | "tool-calls"
                  | "error"
                  | "unknown",
                usage: result.usage,
              });
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });

        return {
          stream: syntheticStream,
          rawCall: result.rawCall,
          rawResponse: result.rawResponse,
          request: result.request,
          warnings: [
            ...(result.warnings || []),
            {
              type: "other" as const,
              message: "Streaming not supported, using synthetic stream",
            },
          ],
        };
      }
    } catch (error) {
      logger.error("SageMaker doStream failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      throw handleSageMakerError(error, this.modelConfig.endpointName);
    }
  }

  /**
   * Convert AI SDK options to SageMaker request format
   */
  private convertToSageMakerRequest(
    options: LanguageModelV1CallOptions,
  ): UnknownRecord {
    const promptText = this.extractPromptText(options);

    // Enhanced SageMaker request format with tool support (Phase 4)
    const request: UnknownRecord = {
      inputs: promptText,
      parameters: {
        // Only include max_new_tokens if explicitly specified; let SageMaker use model defaults otherwise
        ...(options.maxTokens !== undefined
          ? { max_new_tokens: options.maxTokens }
          : {}),
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        stop: options.stopSequences || [],
      },
    };

    // Add tool support if tools are present
    const tools = (options as UnknownRecord).tools;
    if (tools && Array.isArray(tools) && tools.length > 0) {
      request.tools = this.convertToolsToSageMakerFormat(tools);

      // Add tool choice if specified
      const toolChoice = (options as UnknownRecord).toolChoice as UnknownRecord;
      if (toolChoice) {
        request.tool_choice =
          this.convertToolChoiceToSageMakerFormat(toolChoice);
      }

      logger.debug("Added tool support to SageMaker request", {
        toolCount: tools.length,
        toolChoice: toolChoice,
      });
    }

    // Add structured output support (Phase 4)
    const responseFormat = (options as UnknownRecord)
      .responseFormat as UnknownRecord;
    if (responseFormat) {
      request.response_format =
        this.convertResponseFormatToSageMakerFormat(responseFormat);

      logger.debug("Added structured output support to SageMaker request", {
        responseFormat: (responseFormat as UnknownRecord).type,
      });
    }

    logger.debug("Converted to SageMaker request format", {
      inputLength: promptText.length,
      parameters: request.parameters,
      hasTools: !!request.tools,
    });

    return request;
  }

  /**
   * Convert Vercel AI SDK tools to SageMaker format
   */
  private convertToolsToSageMakerFormat(
    tools: UnknownRecord[],
  ): UnknownRecord[] {
    return tools.map((tool) => {
      if (tool.type === "function") {
        return {
          type: "function",
          function: {
            name: (tool.function as UnknownRecord).name,
            description: (tool.function as UnknownRecord).description || "",
            parameters: (tool.function as UnknownRecord).parameters || {},
          },
        };
      }
      return tool; // Pass through other tool types
    });
  }

  /**
   * Convert Vercel AI SDK tool choice to SageMaker format
   */
  private convertToolChoiceToSageMakerFormat(
    toolChoice: UnknownRecord,
  ): UnknownRecord {
    if (typeof toolChoice === "string") {
      return toolChoice; // 'auto', 'none', etc.
    }

    if (toolChoice?.type === "function") {
      return {
        type: "function",
        function: {
          name: (toolChoice.function as UnknownRecord).name,
        },
      };
    }

    return toolChoice;
  }

  /**
   * Convert Vercel AI SDK response format to SageMaker format (Phase 4)
   */
  private convertResponseFormatToSageMakerFormat(
    responseFormat: UnknownRecord,
  ): UnknownRecord {
    if (responseFormat.type === "json_object") {
      return {
        type: "json_object",
        schema: responseFormat.schema || undefined,
      };
    }

    if (responseFormat.type === "json_schema") {
      return {
        type: "json_schema",
        json_schema: {
          name:
            (responseFormat.json_schema as UnknownRecord)?.name || "response",
          description:
            (responseFormat.json_schema as UnknownRecord)?.description ||
            "Generated response",
          schema: (responseFormat.json_schema as UnknownRecord)?.schema || {},
        },
      };
    }

    // Default to text
    return {
      type: "text",
    };
  }

  /**
   * Extract text content from AI SDK prompt format
   */
  private extractPromptText(options: LanguageModelV1CallOptions): string {
    // Check for messages first (like Ollama)
    const messages = (options as UnknownRecord).messages;
    if (messages && Array.isArray(messages)) {
      return messages
        .filter((msg: UnknownRecord) => msg.role && msg.content)
        .map((msg: UnknownRecord) => {
          if (typeof msg.content === "string") {
            return `${msg.role}: ${msg.content}`;
          }
          return `${msg.role}: ${JSON.stringify(msg.content)}`;
        })
        .join("\n");
    }

    // Fallback to prompt property
    const prompt = (options as UnknownRecord).prompt;
    if (typeof prompt === "string") {
      return prompt;
    }

    if (Array.isArray(prompt)) {
      return prompt
        .filter((msg: UnknownRecord) => msg.role && msg.content)
        .map((msg: UnknownRecord) => {
          if (typeof msg.content === "string") {
            return `${msg.role}: ${msg.content}`;
          }
          return `${msg.role}: ${JSON.stringify(msg.content)}`;
        })
        .join("\n");
    }

    return String(prompt);
  }

  /**
   * Extract generated text from SageMaker response
   */
  private extractTextFromResponse(responseBody: UnknownRecord): string {
    // Handle common SageMaker response formats
    if (typeof responseBody === "string") {
      return responseBody;
    }

    if (responseBody.generated_text) {
      return responseBody.generated_text as string;
    }

    if (responseBody.outputs) {
      return responseBody.outputs as string;
    }

    if (responseBody.text) {
      return responseBody.text as string;
    }

    if (Array.isArray(responseBody) && responseBody[0]?.generated_text) {
      return responseBody[0].generated_text;
    }

    // Handle response with tool calls
    if (responseBody.choices && Array.isArray(responseBody.choices)) {
      const choice = responseBody.choices[0];
      if (choice?.message?.content) {
        return choice.message.content;
      }
    }

    // Fallback: stringify the entire response
    return JSON.stringify(responseBody);
  }

  /**
   * Extract tool calls from SageMaker response (Phase 4)
   */
  private extractToolCallsFromResponse(
    responseBody: UnknownRecord,
  ): SageMakerToolCall[] | undefined {
    // Handle OpenAI-compatible format (common for many SageMaker models)
    if (responseBody.choices && Array.isArray(responseBody.choices)) {
      const choice = responseBody.choices[0];
      if (choice?.message?.tool_calls) {
        return choice.message.tool_calls.map(
          (toolCall: UnknownRecord): SageMakerToolCall => ({
            type: "function",
            id: String(toolCall.id || `call_${randomUUID()}`),
            function: {
              name: String((toolCall.function as UnknownRecord).name),
              arguments: String((toolCall.function as UnknownRecord).arguments),
            },
          }),
        );
      }
    }

    // Handle custom SageMaker tool call format
    if (responseBody.tool_calls && Array.isArray(responseBody.tool_calls)) {
      return responseBody.tool_calls as SageMakerToolCall[];
    }

    // Handle Anthropic-style tool use
    if (responseBody.content && Array.isArray(responseBody.content)) {
      const toolUses = responseBody.content.filter(
        (item: UnknownRecord) => item.type === "tool_use",
      );
      if (toolUses.length > 0) {
        return toolUses.map(
          (toolUse: UnknownRecord): SageMakerToolCall => ({
            type: "function",
            id: String(toolUse.id || `call_${randomUUID()}`),
            function: {
              name: String(toolUse.name),
              arguments: JSON.stringify(toolUse.input || {}),
            },
          }),
        );
      }
    }

    return undefined;
  }

  /**
   * Map SageMaker finish reason to standardized format
   */
  private mapSageMakerFinishReason(
    sagemakerReason: string,
  ): "stop" | "length" | "content-filter" | "tool-calls" | "error" | "unknown" {
    switch (sagemakerReason?.toLowerCase()) {
      case "stop":
      case "end_turn":
      case "stop_sequence":
        return "stop";
      case "length":
      case "max_tokens":
      case "max_length":
        return "length";
      case "content_filter":
      case "content_filtered":
        return "content-filter";
      case "tool_calls":
      case "function_call":
        return "tool-calls";
      case "error":
        return "error";
      default:
        return "unknown";
    }
  }

  /**
   * Get model configuration summary for debugging
   */
  public getModelInfo() {
    return {
      modelId: this.modelId,
      provider: this.provider,
      specificationVersion: this.specificationVersion,
      endpointName: this.modelConfig.endpointName,
      modelType: this.modelConfig.modelType,
      region: this.config.region,
    };
  }

  /**
   * Test basic connectivity to the SageMaker endpoint
   */
  async testConnectivity(): Promise<ConnectivityResult> {
    try {
      // Use the same pattern as Ollama - pass messages directly
      const result = await this.doGenerate({
        inputFormat: "messages" as const,
        mode: { type: "regular" as const },
        prompt: [
          { role: "user" as const, content: [{ type: "text", text: "Hello" }] },
        ],
        maxTokens: 10,
      });

      return {
        success: !!result.text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Batch inference support (Phase 4)
   * Process multiple prompts in a single request for efficiency
   */
  async doBatchGenerate(
    prompts: string[],
    options?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    },
  ): Promise<
    Array<{
      text: string;
      usage: {
        promptTokens: number;
        completionTokens: number;
        total: number;
      };
      finishReason:
        | "stop"
        | "length"
        | "content-filter"
        | "tool-calls"
        | "error"
        | "unknown";
    }>
  > {
    try {
      logger.debug("SageMaker batch generate called", {
        batchSize: prompts.length,
        endpointName: this.modelConfig.endpointName,
      });

      // Advanced parallel processing with dynamic concurrency and error handling
      const results = await this.processPromptsInParallel(prompts, options);

      logger.debug("SageMaker batch generate completed", {
        batchSize: prompts.length,
        successCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error("SageMaker batch generate failed", {
        error: error instanceof Error ? error.message : String(error),
        batchSize: prompts.length,
      });

      throw handleSageMakerError(error, this.modelConfig.endpointName);
    }
  }

  /**
   * Process prompts in parallel with advanced concurrency control and error handling
   */
  private async processPromptsInParallel(
    prompts: string[],
    options?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    },
  ): Promise<
    Array<{
      text: string;
      usage: {
        promptTokens: number;
        completionTokens: number;
        total: number;
      };
      finishReason:
        | "stop"
        | "length"
        | "content-filter"
        | "tool-calls"
        | "error"
        | "unknown";
    }>
  > {
    // Dynamic concurrency based on batch size and endpoint capacity
    const INITIAL_CONCURRENCY = Math.min(
      this.modelConfig.initialConcurrency ?? DEFAULT_INITIAL_CONCURRENCY,
      prompts.length,
    );
    const MAX_CONCURRENCY =
      this.modelConfig.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
    const MIN_CONCURRENCY =
      this.modelConfig.minConcurrency ?? DEFAULT_MIN_CONCURRENCY;

    const results: Array<{
      text: string;
      usage: {
        promptTokens: number;
        completionTokens: number;
        total: number;
      };
      finishReason:
        | "stop"
        | "length"
        | "content-filter"
        | "tool-calls"
        | "error"
        | "unknown";
      index: number;
    }> = new Array(prompts.length);

    const errors: Array<{ index: number; error: Error }> = [];

    // Use adaptive semaphore utility for concurrency control
    const semaphore = createAdaptiveSemaphore(
      INITIAL_CONCURRENCY,
      MAX_CONCURRENCY,
      MIN_CONCURRENCY,
    );

    // Process each prompt with adaptive concurrency
    const processPrompt = async (
      prompt: string,
      index: number,
    ): Promise<void> => {
      await semaphore.acquire();

      const startTime = Date.now();
      try {
        const result = await this.doGenerate({
          inputFormat: "messages" as const,
          mode: { type: "regular" as const },
          prompt: [
            {
              role: "user" as const,
              content: [{ type: "text", text: prompt }],
            },
          ],
          maxTokens: options?.maxTokens,
          temperature: options?.temperature,
          topP: options?.topP,
        });

        const duration = Date.now() - startTime;

        results[index] = {
          text: result.text || "",
          usage: {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            total:
              result.usage.totalTokens ??
              result.usage.promptTokens + result.usage.completionTokens,
          },
          finishReason: result.finishReason,
          index,
        };

        // Record successful completion for adaptive concurrency adjustment
        semaphore.recordSuccess(duration);
      } catch (error) {
        errors.push({
          index,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // Record error for adaptive concurrency adjustment
        const duration = Date.now() - startTime;
        semaphore.recordError(duration);

        // Create error result
        results[index] = {
          text: "",
          usage: { promptTokens: 0, completionTokens: 0, total: 0 },
          finishReason: "error",
          index,
        };
      } finally {
        semaphore.release();
      }
    };

    // Start all requests with concurrency control
    const allPromises = prompts.map((prompt, index) =>
      processPrompt(prompt, index),
    );

    // Wait for all requests to complete
    await Promise.all(allPromises);

    // Log final statistics using semaphore metrics
    const metrics = semaphore.getMetrics();
    logger.debug("Parallel batch processing completed", {
      totalPrompts: prompts.length,
      successCount: metrics.completedCount,
      errorCount: metrics.errorCount,
      finalConcurrency: metrics.currentConcurrency,
      errorRate: metrics.errorCount / prompts.length,
      averageResponseTime: metrics.averageResponseTime,
    });

    // If we have too many errors, log them for debugging
    if (errors.length > 0) {
      logger.warn("Batch processing encountered errors", {
        errorCount: errors.length,
        sampleErrors: errors.slice(0, 3).map((e) => ({
          index: e.index,
          message: e.error.message,
        })),
      });
    }

    // Return results in original order (already sorted by index)
    return results.map(({ text, usage, finishReason }) => ({
      text,
      usage,
      finishReason,
    }));
  }

  /**
   * Enhanced model information with batch capabilities
   */
  public getModelCapabilities() {
    return {
      ...this.getModelInfo(),
      capabilities: {
        streaming: true,
        toolCalling: true,
        structuredOutput: true,
        batchInference: true,
        supportedResponseFormats: ["text", "json_object", "json_schema"],
        supportedToolTypes: ["function"],
        maxBatchSize: 100, // Increased limit with parallel processing
        adaptiveConcurrency: true,
        errorRecovery: true,
      },
    };
  }
}

export default SageMakerLanguageModel;
