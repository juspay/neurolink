/**
 * Streaming response handling for Amazon SageMaker Provider (Phase 2)
 *
 * This module provides full streaming support with automatic protocol detection
 * and model-specific parsing for various SageMaker deployment patterns.
 */

import { ReadableStream } from "stream/web";
import type {
  SageMakerStreamChunk,
  SageMakerUsage,
  SageMakerConfig,
  StreamingCapability,
  StreamingParser,
} from "../../types/index.js";
import { handleSageMakerError, SageMakerError } from "./errors.js";
import { logger } from "../../utils/logger.js";
import { estimateTokens } from "../../utils/tokenEstimation.js";
import { createSageMakerDetector } from "./detection.js";
import { StreamingParserFactory } from "./parsers.js";

/**
 * Synthetic streaming delay in milliseconds for simulating real-time response
 */
const SYNTHETIC_STREAMING_DELAY_MS = 50;

/**
 * Create a SageMaker streaming response with automatic protocol detection
 *
 * @param responseStream - Raw response stream from SageMaker endpoint
 * @param endpointName - SageMaker endpoint name for capability detection
 * @param config - SageMaker configuration
 * @param options - Stream options and metadata
 * @returns Promise resolving to ReadableStream compatible with AI SDK
 */
export async function createSageMakerStream(
  responseStream: AsyncIterable<Uint8Array>,
  endpointName: string,
  config: SageMakerConfig,
  options: {
    prompt?: string;
    abortSignal?: AbortSignal;
    onChunk?: (chunk: SageMakerStreamChunk) => void;
    onComplete?: (usage: SageMakerUsage) => void;
    onError?: (error: Error) => void;
  } = {},
): Promise<ReadableStream<unknown>> {
  const detector = createSageMakerDetector(config);

  try {
    // Detect streaming capabilities for this endpoint
    logger.debug("Detecting streaming capabilities", { endpointName });
    const capability = await detector.detectStreamingCapability(endpointName);

    if (!capability.supported) {
      logger.info("Streaming not supported, falling back to synthetic stream", {
        endpointName,
        modelType: capability.modelType,
      });

      // Create synthetic stream from complete response
      return createSyntheticStreamFromResponse(responseStream, options);
    }

    logger.info("Creating streaming response", {
      endpointName,
      protocol: capability.protocol,
      modelType: capability.modelType,
      confidence: capability.confidence,
    });

    // Create appropriate parser for detected protocol
    const parser = StreamingParserFactory.createParser(capability.protocol);

    return createProtocolSpecificStream(
      responseStream,
      parser,
      capability,
      options,
    );
  } catch (error) {
    logger.error("Failed to create streaming response", {
      endpointName,
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to synthetic stream on error
    return createSyntheticStreamFromResponse(responseStream, options);
  }
}

/**
 * Create a protocol-specific streaming implementation
 */
async function createProtocolSpecificStream(
  responseStream: AsyncIterable<Uint8Array>,
  parser: StreamingParser,
  capability: StreamingCapability,
  options: {
    prompt?: string;
    abortSignal?: AbortSignal;
    onChunk?: (chunk: SageMakerStreamChunk) => void;
    onComplete?: (usage: SageMakerUsage) => void;
    onError?: (error: Error) => void;
  },
): Promise<ReadableStream<unknown>> {
  return new ReadableStream({
    async start(controller) {
      const reader = responseStream[Symbol.asyncIterator]();
      let accumulatedText = "";
      let finalUsage: SageMakerUsage | undefined;

      try {
        parser.reset();

        while (true) {
          // Check for abort signal
          if (options.abortSignal?.aborted) {
            // Clean up upstream iterator before throwing
            try {
              await reader.return?.();
            } catch {
              // Ignore cleanup errors, still propagate original abort
            }
            throw new SageMakerError("Stream aborted by user", {
              code: "NETWORK_ERROR",
              statusCode: 499,
              retryable: false,
            });
          }

          const { done, value } = await reader.next();

          if (done) {
            // Stream ended - send final chunk if needed
            if (!finalUsage && accumulatedText) {
              finalUsage = estimateTokenUsage(
                options.prompt ?? "",
                accumulatedText,
              );
            }

            const finalChunk = {
              type: "finish" as const,
              finishReason: "stop" as const,
              usage: toLanguageModelV2Usage(finalUsage),
            };

            controller.enqueue(finalChunk);
            options.onComplete?.(
              finalUsage || {
                promptTokens: 0,
                completionTokens: 0,
                total: 0,
              },
            );
            controller.close();
            break;
          }

          // Parse the chunk
          const chunks = parser.parse(value);

          for (const chunk of chunks) {
            // Accumulate text content
            if (chunk.content) {
              accumulatedText += chunk.content;
            }

            // Phase 2.3: Handle streaming tool calls
            if (chunk.toolCall) {
              const toolCallPart = {
                type: "tool-call-delta" as const,
                toolCallType: "function" as const,
                toolCallId: chunk.toolCall.id,
                toolName: chunk.toolCall.name || "",
                argsTextDelta: chunk.toolCall.argumentsDelta || "",
              };

              controller.enqueue(toolCallPart);
              options.onChunk?.(chunk);

              // If tool call is complete, send tool-call part
              if (chunk.toolCall.complete && chunk.toolCall.arguments) {
                const completedToolCall = {
                  type: "tool-call" as const,
                  toolCallType: "function" as const,
                  toolCallId: chunk.toolCall.id,
                  toolName: chunk.toolCall.name || "",
                  args: JSON.parse(chunk.toolCall.arguments),
                };

                controller.enqueue(completedToolCall);
              }

              continue;
            }

            // Phase 2.3: Handle streaming tool results
            if (chunk.toolResult) {
              const toolResultPart = {
                type: "tool-result" as const,
                toolCallId: chunk.toolResult.toolCallId,
                toolName: chunk.toolResult.toolName,
                result: chunk.toolResult.result,
                args: {}, // Tool args would be tracked separately
              };

              controller.enqueue(toolResultPart);
              options.onChunk?.(chunk);
              continue;
            }

            // Phase 2.3: Handle structured output streaming
            if (chunk.structuredOutput) {
              const structuredPart = {
                type: "object-delta" as const,
                objectDelta: chunk.structuredOutput.partialObject || {},
                objectPath: chunk.structuredOutput.currentPath || "",
                isComplete: chunk.structuredOutput.complete || false,
                validationErrors: chunk.structuredOutput.validationErrors || [],
              };

              controller.enqueue(structuredPart);
              options.onChunk?.(chunk);

              // If structured output is complete, send object part
              if (
                chunk.structuredOutput.complete &&
                chunk.structuredOutput.partialObject
              ) {
                const completedObject = {
                  type: "object" as const,
                  object: chunk.structuredOutput.partialObject,
                };

                controller.enqueue(completedObject);
              }

              continue;
            }

            // Regular text content
            if (chunk.content) {
              const streamPart = {
                type: "text-delta" as const,
                textDelta: chunk.content,
              };

              controller.enqueue(streamPart);
              options.onChunk?.(chunk);
            }

            // Check for completion
            if (parser.isComplete(chunk)) {
              finalUsage =
                parser.extractUsage(chunk) ||
                estimateTokenUsage(options.prompt ?? "", accumulatedText);

              const finalChunk = {
                type: "finish" as const,
                finishReason: chunk.finishReason || "stop",
                usage: toLanguageModelV2Usage(finalUsage),
              };

              controller.enqueue(finalChunk);
              options.onComplete?.(finalUsage);
              controller.close();
              return;
            }
          }
        }
      } catch (error) {
        const sagemakerError = handleSageMakerError(error);
        logger.error("Streaming error", {
          error: sagemakerError.message,
          modelType: capability.modelType,
          protocol: capability.protocol,
        });

        options.onError?.(sagemakerError);
        controller.error(sagemakerError);
      }
    },
  });
}

/**
 * Create a synthetic stream from complete response (fallback)
 */
async function createSyntheticStreamFromResponse(
  responseStream: AsyncIterable<Uint8Array>,
  options: {
    prompt?: string;
    onChunk?: (chunk: SageMakerStreamChunk) => void;
    onComplete?: (usage: SageMakerUsage) => void;
    onError?: (error: Error) => void;
  },
): Promise<ReadableStream<unknown>> {
  return new ReadableStream({
    async start(controller) {
      try {
        // Collect complete response
        const chunks: Uint8Array[] = [];
        const reader = responseStream[Symbol.asyncIterator]();

        while (true) {
          const { done, value } = await reader.next();
          if (done) {
            break;
          }
          chunks.push(value);
        }

        // Optimized concatenation: calculate total size first to avoid intermediate arrays
        // This prevents memory allocation overhead for large responses
        let totalSize = 0;
        for (const chunk of chunks) {
          totalSize += chunk.length;
        }

        // Pre-allocate buffer with exact size to avoid reallocations
        const completeData = new Uint8Array(totalSize);
        let offset = 0;

        // Direct memory copy without intermediate buffer creation
        for (const chunk of chunks) {
          completeData.set(chunk, offset);
          offset += chunk.length;
        }

        const responseText = new TextDecoder().decode(completeData);
        const parsedResponse = JSON.parse(responseText);

        // Extract text content
        const text =
          parsedResponse.generated_text ||
          parsedResponse.text ||
          parsedResponse.output ||
          parsedResponse[0]?.generated_text ||
          String(parsedResponse);

        // Create synthetic streaming by chunking the text
        const words = text.split(/\s+/);
        const chunkSize = Math.max(1, Math.floor(words.length / 10)); // ~10 chunks

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(" ");
          const deltaChunk = i === 0 ? chunk : " " + chunk;

          const streamPart = {
            type: "text-delta" as const,
            textDelta: deltaChunk,
          };

          controller.enqueue(streamPart);
          options.onChunk?.({
            content: deltaChunk,
            done: false,
          });

          // Add small delay to simulate streaming
          await new Promise((resolve) =>
            setTimeout(resolve, SYNTHETIC_STREAMING_DELAY_MS),
          );
        }

        // Final chunk with usage
        const usage = estimateTokenUsage(options.prompt || "", text);
        const finalChunk = {
          type: "finish" as const,
          finishReason: "stop" as const,
          usage: toLanguageModelV2Usage(usage),
        };

        controller.enqueue(finalChunk);
        options.onComplete?.(usage);
        controller.close();
      } catch (error) {
        const sagemakerError = handleSageMakerError(error);
        options.onError?.(sagemakerError);
        controller.error(sagemakerError);
      }
    },
  });
}

/**
 * Create a synthetic stream from complete text (for backward compatibility)
 */
export async function createSyntheticStream(
  text: string,
  usage: SageMakerUsage,
  options: {
    onChunk?: (chunk: SageMakerStreamChunk) => void;
    onComplete?: (usage: SageMakerUsage) => void;
  } = {},
): Promise<ReadableStream<unknown>> {
  return new ReadableStream({
    start(controller) {
      // Send the complete text as a single delta
      const streamPart = {
        type: "text-delta" as const,
        textDelta: text,
      };

      controller.enqueue(streamPart);
      options.onChunk?.({
        content: text,
        done: false,
      });

      // Send completion
      const finalChunk = {
        type: "finish" as const,
        finishReason: "stop" as const,
        usage: toLanguageModelV2Usage(usage),
      };

      controller.enqueue(finalChunk);
      options.onComplete?.(usage);
      controller.close();
    },
  });
}

/**
 * Map the internal SageMakerUsage shape to AI SDK v2 usage keys. Stream
 * finish parts previously carried promptTokens/completionTokens, but the
 * SDK's v2→v3 bridge reads inputTokens/outputTokens/totalTokens — every
 * streamed SageMaker turn resolved to undefined (zero) usage.
 */
function toLanguageModelV2Usage(usage: SageMakerUsage | undefined): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} {
  const inputTokens = usage?.promptTokens ?? 0;
  const outputTokens = usage?.completionTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage?.total || inputTokens + outputTokens,
  };
}

/**
 * Extract REAL token usage from a complete (non-streaming) SageMaker
 * response body when the endpoint reports it. Covers the OpenAI-compatible
 * shape (vLLM / TGI-OpenAI: usage.prompt_tokens/completion_tokens), the
 * generic input_tokens/output_tokens shape, and the HuggingFace TGI shape
 * (details.tokens.input/generated). Returns undefined when no real counts
 * are present so callers can fall back to estimateTokenUsage.
 */
export function parseUsageFromResponseBody(
  body: Record<string, unknown> | Array<Record<string, unknown>>,
): SageMakerUsage | undefined {
  // TGI-style endpoints wrap the response in an array
  // ([{ generated_text, details: { tokens } }]) — normalize to the first
  // item so those endpoints get real usage instead of the char estimate.
  const responseBody = Array.isArray(body) ? body[0] : body;
  if (!responseBody || typeof responseBody !== "object") {
    return undefined;
  }
  const usageRecord = (responseBody.usage ?? responseBody.tokens) as
    | Record<string, unknown>
    | undefined;
  if (usageRecord && typeof usageRecord === "object") {
    const promptTokens =
      Number(usageRecord.prompt_tokens ?? usageRecord.input_tokens) || 0;
    const completionTokens =
      Number(usageRecord.completion_tokens ?? usageRecord.output_tokens) || 0;
    if (promptTokens > 0 || completionTokens > 0) {
      return {
        promptTokens,
        completionTokens,
        total:
          Number(usageRecord.total_tokens) || promptTokens + completionTokens,
      };
    }
  }
  const details = responseBody.details as Record<string, unknown> | undefined;
  const tokens = details?.tokens as Record<string, unknown> | undefined;
  if (tokens && typeof tokens === "object") {
    const promptTokens = Number(tokens.input) || 0;
    const completionTokens = Number(tokens.generated) || 0;
    if (promptTokens > 0 || completionTokens > 0) {
      return {
        promptTokens,
        completionTokens,
        total: Number(tokens.total) || promptTokens + completionTokens,
      };
    }
  }
  return undefined;
}

/**
 * Estimate token usage from text content
 *
 * @param prompt - Input prompt text
 * @param completion - Generated completion text
 * @returns Estimated usage information
 */
export function estimateTokenUsage(
  prompt: string,
  completion: string,
): SageMakerUsage {
  const promptTokens = estimateTokens(prompt, "sagemaker");
  const completionTokens = estimateTokens(completion, "sagemaker");

  return {
    promptTokens,
    completionTokens,
    total: promptTokens + completionTokens,
  };
}
