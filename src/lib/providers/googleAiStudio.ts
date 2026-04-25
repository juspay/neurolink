import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  embed,
  embedMany,
  type LanguageModel,
  type Schema,
  stepCountIs,
  streamText,
  type Tool,
} from "ai";
import {
  type AIProviderName,
  ErrorCategory,
  ErrorSeverity,
  GoogleAIModels,
} from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import {
  markStreamProviderEmittedGenerationEnd,
  type NeuroLink,
} from "../neurolink.js";
import { SpanStatusCode } from "@opentelemetry/api";
import { ATTR, tracers, withClientSpan } from "../telemetry/index.js";
import type {
  AnalyticsData,
  UnknownRecord,
  ZodUnknownSchema,
  EnhancedGenerateResult,
  TextGenerationOptions,
  GenAIClient,
  GoogleGenAIClass,
  LiveServerMessage,
  AudioChunk,
  GoogleLiveAudioQueueItem,
  NativeToolsConfig,
  StreamOptions,
  StreamResult,
  StreamToolCall,
  StreamToolResult,
} from "../types/index.js";

import {
  AuthenticationError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { ERROR_CODES, NeuroLinkError } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";
import { isGemini3Model } from "../utils/modelDetection.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { estimateTokens } from "../utils/tokenEstimation.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import {
  buildNativeConfig,
  buildNativeToolDeclarations,
  collectStreamChunks,
  collectStreamChunksIncremental,
  computeMaxSteps,
  createTextChannel,
  executeNativeToolCalls,
  extractTextFromParts,
  handleMaxStepsTermination,
  pushModelResponseToHistory,
  sanitizeToolsForGemini,
} from "./googleNativeGemini3.js";
import { toAnalyticsStreamResult } from "./providerTypeUtils.js";

// Google AI Live API types now imported from ../types/providerSpecific.js

// Import proper types for multimodal message handling

// Create Google GenAI client
async function createGoogleGenAIClient(apiKey: string): Promise<GenAIClient> {
  const mod: unknown = await import("@google/genai");
  const ctor = (mod as Record<string, unknown>).GoogleGenAI as unknown;
  if (!ctor) {
    throw new NeuroLinkError({
      code: ERROR_CODES.INVALID_CONFIGURATION,
      message: "@google/genai does not export GoogleGenAI",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      retriable: false,
      context: { module: "@google/genai", expectedExport: "GoogleGenAI" },
    });
  }
  const Ctor = ctor as GoogleGenAIClass;
  return new Ctor({ apiKey });
}

/**
 * Google AI Studio provider implementation using BaseProvider
 * Migrated from original GoogleAIStudio class to new factory pattern
 *
 * @important Structured Output Limitation
 * Google Gemini models cannot combine function calling (tools) with structured
 * output (JSON schema). When using schemas with output.format: "json", you MUST
 * set disableTools: true.
 *
 * Error without disableTools:
 * "Function calling with a response mime type: 'application/json' is unsupported"
 *
 * This is a Google API limitation documented at:
 * https://ai.google.dev/gemini-api/docs/function-calling
 *
 * @example
 * ```typescript
 * // ✅ Correct usage with schemas
 * const provider = new GoogleAIStudioProvider("gemini-2.5-flash");
 * const result = await provider.generate({
 *   input: { text: "Analyze data" },
 *   schema: MySchema,
 *   output: { format: "json" },
 *   disableTools: true  // Required
 * });
 * ```
 *
 * @note Gemini 3 Pro Preview (November 2025) will support combining tools + schemas
 * @note "Too many states for serving" errors can occur with complex schemas + tools.
 *       Solution: Simplify schema or use disableTools: true
 */
export class GoogleAIStudioProvider extends BaseProvider {
  private credentials?: { apiKey?: string };

  constructor(
    modelName?: string,
    sdk?: unknown,
    credentials?: { apiKey?: string },
  ) {
    super(
      modelName,
      "google-ai" as AIProviderName,
      sdk as NeuroLink | undefined,
    );
    this.credentials = credentials;
    logger.debug("GoogleAIStudioProvider initialized", {
      model: this.modelName,
      provider: this.providerName,
      sdkProvided: !!sdk,
    });
  }
  // ===================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================

  public getProviderName(): AIProviderName {
    return "google-ai" as AIProviderName;
  }

  public getDefaultModel(): string {
    return process.env.GOOGLE_AI_MODEL || GoogleAIModels.GEMINI_2_5_FLASH;
  }

  /**
   * 🔧 PHASE 2: Return AI SDK model instance for tool calling
   */
  public getAISDKModel(): LanguageModel {
    const apiKey = this.getApiKey();
    const google = createGoogleGenerativeAI({ apiKey });
    return google(this.modelName);
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(error.message, this.providerName);
    }

    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (message.includes("API_KEY_INVALID")) {
      return new AuthenticationError(
        "Invalid Google AI API key. Please check your GOOGLE_AI_API_KEY environment variable.",
        this.providerName,
      );
    }

    if (message.includes("RATE_LIMIT_EXCEEDED")) {
      return new RateLimitError(
        "Google AI rate limit exceeded. Please try again later.",
        this.providerName,
      );
    }

    return new ProviderError(`Google AI error: ${message}`, this.providerName);
  }

  /**
   * Overrides the BaseProvider's image generation method to implement it for Google AI.
   * This method calls the Google AI API to generate an image from a prompt.
   * @param options The generation options containing the prompt.
   * @returns A promise that resolves to the generation result, including the image data.
   */
  protected async executeImageGeneration(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const prompt = options.prompt || options.input?.text || "";
    const imageModelName = options.model || this.modelName;
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    logger.info("🎨 Starting Google AI Studio image generation", {
      model: imageModelName,
      prompt: prompt.substring(0, 100),
      provider: this.providerName,
    });

    // Use the @google/genai client for image generation
    let client: GenAIClient;
    try {
      client = await createGoogleGenAIClient(apiKey);
    } catch {
      throw new AuthenticationError(
        "Missing '@google/genai'. Install with: npm install @google/genai",
        this.providerName,
      );
    }

    try {
      // Build content array with multimodal support
      const imageParts = await Promise.all(
        (options.input?.images || []).map(async (image) => {
          // Handle ImageWithAltText objects
          if (typeof image === "object" && "url" in image) {
            const imageUrl = image.url as string;
            if (imageUrl.startsWith("http")) {
              const response = await fetch(imageUrl);
              if (!response.ok) {
                throw new Error(
                  `Failed to fetch image from ${imageUrl}: ${response.status} ${response.statusText}`,
                );
              }
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const mimeType = this.detectImageType(buffer);
              logger.debug(
                `Downloaded and detected image MIME type: ${mimeType}`,
              );
              return {
                inlineData: {
                  mimeType,
                  data: buffer.toString("base64"),
                },
              };
            }
            // Base64 URL in ImageWithAltText
            const buffer = Buffer.from(imageUrl as string, "base64");
            const mimeType = this.detectImageType(buffer);
            return {
              inlineData: {
                mimeType,
                data: buffer.toString("base64"),
              },
            };
          }
          // Handle string URLs
          if (typeof image === "string" && image.startsWith("http")) {
            const response = await fetch(image);
            if (!response.ok) {
              throw new Error(
                `Failed to fetch image from ${image}: ${response.status} ${response.statusText}`,
              );
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType = this.detectImageType(buffer);
            logger.debug(
              `Downloaded and detected image MIME type: ${mimeType}`,
            );
            return {
              inlineData: {
                mimeType,
                data: buffer.toString("base64"),
              },
            };
          }
          // Handle Buffer or base64 string
          const buffer = Buffer.isBuffer(image)
            ? image
            : typeof image === "string"
              ? Buffer.from(image, "base64")
              : Buffer.from(""); // Fallback for unexpected types
          const mimeType = this.detectImageType(buffer);
          logger.debug(`Detected image MIME type: ${mimeType}`);
          return {
            inlineData: {
              mimeType,
              data: buffer.toString("base64"),
            },
          };
        }),
      );

      const contents = [
        {
          role: "user",
          parts: [{ text: prompt }, ...imageParts],
        },
      ];

      // Configure for image generation
      const generateConfig = {
        responseModalities: ["IMAGE", "TEXT"] as ("TEXT" | "IMAGE" | "AUDIO")[], // This is the key setting for image generation
      };

      logger.debug("Starting image generation request", {
        model: imageModelName,
        contentParts: contents[0].parts.length,
        responseModalities: generateConfig.responseModalities,
      });

      // Try streaming approach first
      let imageData: string | null = null;
      let textContent = "";

      try {
        // Await the Promise to get the AsyncIterable
        const stream = await client.models.generateContentStream({
          model: imageModelName,
          contents: contents,
          config: generateConfig,
        });

        // Process the stream
        for await (const chunk of stream) {
          logger.debug("Received chunk", {
            hasCandidate: !!chunk.candidates?.[0],
            hasContent: !!chunk.candidates?.[0]?.content,
            hasParts: !!chunk.candidates?.[0]?.content?.parts,
          });

          const candidate = chunk.candidates?.[0];
          if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
              // Check for image data
              if ("inlineData" in part && part.inlineData?.data) {
                const foundImageData = part.inlineData.data;
                imageData = foundImageData;
                const mimeType = part.inlineData.mimeType || "image/png";

                logger.info("Image generation successful", {
                  model: imageModelName,
                  mimeType,
                  dataLength: foundImageData.length,
                  responseTime: Date.now() - startTime,
                });

                const result: EnhancedGenerateResult = {
                  content: `Generated image using ${imageModelName} (${mimeType})`,
                  imageOutput: {
                    base64: foundImageData,
                  },
                  provider: this.providerName,
                  model: imageModelName,
                  usage: {
                    input: this.estimateTokenCount(prompt),
                    output: 0,
                    total: this.estimateTokenCount(prompt),
                  },
                };

                return await this.enhanceResult(result, options, startTime);
              }

              // Check for text content
              if ("text" in part && part.text) {
                textContent += part.text;
                logger.debug("Received text content", {
                  text: part.text.substring(0, 100),
                });
              }
            }
          }
        }
      } catch (streamError) {
        logger.debug("Streaming failed, trying non-streaming approach", {
          error:
            streamError instanceof Error
              ? streamError.message
              : String(streamError),
        });
      }

      // If no image was found, try non-streaming approach
      if (!imageData) {
        logger.debug("Trying non-streaming approach");

        const response = await client.models.generateContent({
          model: imageModelName,
          contents: contents,
          config: generateConfig,
        });

        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if ("inlineData" in part && part.inlineData?.data) {
              const foundImageData = part.inlineData.data;
              imageData = foundImageData;
              const mimeType = part.inlineData.mimeType || "image/png";

              logger.info("Image generation successful (non-streaming)", {
                model: imageModelName,
                mimeType,
                dataLength: foundImageData.length,
                responseTime: Date.now() - startTime,
              });

              const result: EnhancedGenerateResult = {
                content: `Generated image using ${imageModelName} (${mimeType})`,
                imageOutput: {
                  base64: foundImageData,
                },
                provider: this.providerName,
                model: imageModelName,
                usage: {
                  input: this.estimateTokenCount(prompt),
                  output: 0,
                  total: this.estimateTokenCount(prompt),
                },
              };

              return await this.enhanceResult(result, options, startTime);
            }

            if ("text" in part && part.text) {
              textContent += part.text;
            }
          }
        }
      }

      // If we reach here, no image was generated
      logger.warn("No image data found in response", {
        model: imageModelName,
        prompt: prompt.substring(0, 100),
        hasTextContent: !!textContent,
        textContent: textContent.substring(0, 200),
      });

      throw new ProviderError(
        textContent ||
          `Image generation completed but no image data was returned. This may indicate an issue with the model "${imageModelName}" or the prompt: "${prompt}". Please try again or use a different model.`,
        this.providerName,
      );
    } catch (error) {
      logger.error("Image generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: imageModelName,
        prompt: prompt.substring(0, 100),
      });

      throw this.handleProviderError(error);
    }
  }

  /**
   * Detect image MIME type from buffer
   */
  private detectImageType(buffer: Buffer): string {
    // Check PNG signature
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return "image/png";
    }

    // Check JPEG signature
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return "image/jpeg";
    }

    // Check WebP signature
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return "image/webp";
    }

    // Check GIF signature
    if (
      buffer.length >= 6 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46
    ) {
      return "image/gif";
    }

    // Default to PNG if unknown
    return "image/png";
  }

  /**
   * Estimate token count from text using centralized estimation with provider multipliers
   */
  private estimateTokenCount(text: string): number {
    return estimateTokens(text, "google-ai");
  }

  // executeGenerate removed - BaseProvider handles all generation with tools
  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodUnknownSchema | Schema<unknown>,
  ): Promise<StreamResult> {
    // Check if this is a Gemini 3 model with tools - use native SDK for thought_signature
    const gemini3CheckModelName = options.model || this.modelName;

    // Structured output (analysisSchema, JSON format, or schema) is incompatible with tools on Gemini.
    // Compute once and reuse in both the native Gemini 3 gate and the streamText fallback path.
    const wantsStructuredOutput =
      analysisSchema || options.output?.format === "json" || options.schema;

    // Check for tools from options AND from SDK (MCP tools)
    // Need to check early if we should route to native SDK
    const gemini3CheckShouldUseTools =
      !options.disableTools && this.supportsTools() && !wantsStructuredOutput;
    const tools = options.tools || {};

    const hasTools =
      gemini3CheckShouldUseTools && Object.keys(tools).length > 0;

    if (isGemini3Model(gemini3CheckModelName) && hasTools) {
      // Merge SDK tools into options for native SDK path
      let mergedOptions = {
        ...options,
        tools: tools,
      };

      // Check for tools + JSON schema conflict (Gemini limitation)
      const wantsJsonOutput =
        options.output?.format === "json" || options.schema;
      if (
        wantsJsonOutput &&
        mergedOptions.tools &&
        Object.keys(mergedOptions.tools).length > 0 &&
        !mergedOptions.disableTools
      ) {
        logger.warn(
          "[GoogleAIStudio] Gemini does not support tools and JSON schema output simultaneously. Disabling tools for this request.",
        );
        mergedOptions = { ...mergedOptions, disableTools: true, tools: {} };
      }

      // Only route to native path if tools are still active after conflict check
      const hasActiveTools =
        !mergedOptions.disableTools &&
        mergedOptions.tools &&
        Object.keys(mergedOptions.tools).length > 0;
      if (hasActiveTools) {
        logger.info(
          "[GoogleAIStudio] Routing Gemini 3 to native SDK for tool calling",
          {
            model: gemini3CheckModelName,
            totalToolCount: Object.keys(mergedOptions.tools ?? {}).length,
          },
        );
        return this.executeNativeGemini3Stream(mergedOptions);
      }
      // Fall through to standard stream path using merged options (tools disabled for schema)
      options = mergedOptions;
    }

    // Phase 1: if audio input present, bridge to Gemini Live (Studio) using @google/genai
    if (options.input?.audio) {
      return await this.executeAudioStreamViaGeminiLive(options);
    }
    this.validateStreamOptions(options);

    const startTime = Date.now();

    const model = await this.getAISDKModelWithMiddleware(options);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      // Get tools consistently with generate method (include user-provided RAG tools)
      // wantsStructuredOutput already computed before the Gemini 3 native-routing gate
      if (
        wantsStructuredOutput &&
        !options.disableTools &&
        this.supportsTools()
      ) {
        logger.warn(
          "[GoogleAIStudio] Structured output active — disabling tools (Gemini limitation).",
        );
      }
      const shouldUseTools =
        !options.disableTools && this.supportsTools() && !wantsStructuredOutput;
      const filteredTools: Record<string, Tool> = shouldUseTools
        ? (options.tools ?? {})
        : {};
      // Sanitize tool schemas for Gemini proto compatibility (converts anyOf/oneOf unions to string)
      let tools: Record<string, Tool> | undefined;
      if (Object.keys(filteredTools).length > 0) {
        const sanitized = sanitizeToolsForGemini(filteredTools);
        if (sanitized.dropped.length > 0) {
          logger.warn(
            `[GoogleAIStudio] Dropped ${sanitized.dropped.length} incompatible tool(s): ${sanitized.dropped.join(", ")}`,
          );
        }
        tools =
          Object.keys(sanitized.tools).length > 0 ? sanitized.tools : undefined;
      } else {
        tools = undefined;
      }

      // Build message array from options with multimodal support
      // Using protected helper from BaseProvider to eliminate code duplication
      const messages = await this.buildMessagesForStream(options);

      const collectedToolCalls: StreamToolCall[] = [];
      const collectedToolResults: StreamToolResult[] = [];

      const result = await streamText({
        model,
        messages: messages,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens, // No default limit - unlimited unless specified
        tools,
        stopWhen: stepCountIs(options.maxSteps || DEFAULT_MAX_STEPS),
        toolChoice: resolveToolChoice(options, tools, shouldUseTools),
        abortSignal: composeAbortSignals(
          options.abortSignal,
          timeoutController?.controller.signal,
        ),
        experimental_telemetry:
          this.telemetryHandler.getTelemetryConfig(options),
        experimental_repairToolCall: this.getToolCallRepairFn(options),
        // Gemini 3: use thinkingLevel via providerOptions
        // Gemini 2.5: use thinkingBudget via providerOptions
        ...(options.thinkingConfig?.enabled && {
          providerOptions: {
            google: {
              thinkingConfig: {
                ...(options.thinkingConfig.thinkingLevel && {
                  thinkingLevel: options.thinkingConfig.thinkingLevel,
                }),
                ...(options.thinkingConfig.budgetTokens &&
                  !options.thinkingConfig.thinkingLevel && {
                    thinkingBudget: options.thinkingConfig.budgetTokens,
                  }),
                includeThoughts: true,
              },
            },
          },
        }),
        onStepFinish: ({ toolCalls, toolResults }) => {
          for (const toolCall of toolCalls) {
            collectedToolCalls.push({
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              args:
                (toolCall as { args?: Record<string, unknown> }).args ??
                (toolCall as { input?: Record<string, unknown> }).input ??
                (toolCall as { parameters?: Record<string, unknown> })
                  .parameters ??
                {},
            });
          }

          for (const toolResult of toolResults) {
            const rawToolResult = toolResult as {
              output?: unknown;
              result?: unknown;
              error?: string;
              toolCallId?: string;
            };
            collectedToolResults.push({
              toolName: toolResult.toolName,
              status: rawToolResult.error ? "failure" : "success",
              output:
                ((rawToolResult.output ??
                  rawToolResult.result) as StreamToolResult["output"]) ??
                undefined,
              error: rawToolResult.error,
              id: rawToolResult.toolCallId ?? toolResult.toolName,
            });
          }

          // Emit tool:end for each completed tool result so Pipeline B
          // captures telemetry for AI-SDK-driven tool calls (gap S2).
          emitToolEndFromStepFinish(
            this.neurolink?.getEventEmitter(),
            toolResults as Array<{
              toolName: string;
              output?: unknown;
              result?: unknown;
              error?: string;
            }>,
          );

          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn(
              "[GoogleAiStudioProvider] Failed to store tool executions",
              {
                provider: this.providerName,
                error: error instanceof Error ? error.message : String(error),
              },
            );
          });
        },
      });

      // Defer timeout cleanup until the stream completes or errors.
      // Guard against NoOutputGeneratedError becoming an unhandled rejection.
      Promise.resolve(result.text)
        .catch((err: unknown) => {
          logger.debug(
            "Stream text promise rejected (expected for empty streams)",
            {
              error: err instanceof Error ? err.message : String(err),
            },
          );
        })
        .finally(() => timeoutController?.cleanup());

      // Transform string stream to content object stream using BaseProvider method
      const transformedStream = this.createTextStream(result);

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        toAnalyticsStreamResult(result),
        Date.now() - startTime,
        {
          requestId: `google-ai-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        ...(shouldUseTools && {
          toolCalls: collectedToolCalls,
          toolResults: collectedToolResults,
        }),
        analytics: analyticsPromise,
        metadata: {
          startTime,
          streamId: `google-ai-${Date.now()}`,
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  /**
   * Execute stream using native @google/genai SDK for Gemini 3 models
   * This bypasses @ai-sdk/google to properly handle thought_signature
   */
  private async executeNativeGemini3Stream(
    options: StreamOptions,
  ): Promise<StreamResult> {
    const modelName = options.model || this.modelName;

    return withClientSpan(
      {
        name: "neurolink.provider.stream",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: "google-ai",
          [ATTR.GEN_AI_MODEL]: modelName,
          [ATTR.GEN_AI_OPERATION]: "stream",
          [ATTR.NL_PROVIDER]: this.providerName,
        },
      },
      async (span) => {
        const startTime = Date.now();
        const timeout = this.getTimeout(options);
        const timeoutController = createTimeoutController(
          timeout,
          this.providerName,
          "stream",
        );

        try {
          const apiKey = this.getApiKey();
          const client = await createGoogleGenAIClient(apiKey);

          logger.debug(
            "[GoogleAIStudio] Using native @google/genai for Gemini 3",
            {
              model: modelName,
              hasTools:
                !!options.tools && Object.keys(options.tools).length > 0,
            },
          );

          // Build contents from input
          const currentContents: Array<{
            role: string;
            parts: unknown[];
          }> = [{ role: "user", parts: [{ text: options.input.text }] }];

          // Convert tools
          let toolsConfig: NativeToolsConfig | undefined;
          let executeMap = new Map<string, Tool["execute"]>();

          if (
            options.tools &&
            Object.keys(options.tools).length > 0 &&
            !options.disableTools
          ) {
            const result = buildNativeToolDeclarations(options.tools);
            toolsConfig = result.toolsConfig;
            executeMap = result.executeMap;

            logger.debug("[GoogleAIStudio] Converted tools for native SDK", {
              toolCount: toolsConfig[0].functionDeclarations.length,
              toolNames: toolsConfig[0].functionDeclarations.map((t) => t.name),
            });
          }

          const config = buildNativeConfig(options, toolsConfig);
          const maxSteps = computeMaxSteps(options.maxSteps);

          // Compose abort signal from user signal + timeout
          const composedSignal = composeAbortSignals(
            options.abortSignal,
            timeoutController?.controller.signal,
          );

          // Create a push-based text channel so the caller receives tokens as
          // they arrive from the network rather than after full buffering.
          const channel = createTextChannel();

          // Shared mutable state updated by the background agentic loop.
          const allToolCalls: Array<{
            toolName: string;
            args: Record<string, unknown>;
          }> = [];

          // analyticsResolvers lets the background loop settle the analytics
          // promise once token counts are known (after the loop completes).
          let analyticsResolve!: (value: AnalyticsData) => void;
          let analyticsReject!: (reason: unknown) => void;
          const analyticsPromise = new Promise<AnalyticsData>((res, rej) => {
            analyticsResolve = res;
            analyticsReject = rej;
          });

          // Shared metadata object mutated by the background loop so the
          // returned object reflects the final values after stream completion.
          const metadata = {
            streamId: `native-${Date.now()}`,
            startTime,
            responseTime: 0,
            totalToolExecutions: 0,
          };

          // Run the agentic loop in the background without awaiting it here,
          // so we can return the StreamResult (with channel.iterable) immediately.
          const loopPromise = (async () => {
            let lastStepText = "";
            let totalInputTokens = 0;
            let totalOutputTokens = 0;
            let step = 0;
            let completedWithFinalAnswer = false;
            const failedTools = new Map<
              string,
              { count: number; lastError: string }
            >();

            try {
              // Agentic loop for tool calling
              while (step < maxSteps) {
                if (composedSignal?.aborted) {
                  throw composedSignal.reason instanceof Error
                    ? composedSignal.reason
                    : new Error("Request aborted");
                }
                step++;
                logger.debug(
                  `[GoogleAIStudio] Native SDK step ${step}/${maxSteps}`,
                );

                try {
                  const rawStream = await client.models.generateContentStream({
                    model: modelName,
                    contents: currentContents,
                    config,
                    ...(composedSignal
                      ? { httpOptions: { signal: composedSignal } }
                      : {}),
                  });

                  // For every step, use incremental collection so text parts
                  // are pushed to the channel as they arrive.  For intermediate
                  // steps (those that produce function calls) we still need the
                  // complete rawResponseParts for pushModelResponseToHistory,
                  // which collectStreamChunksIncremental provides at stream end.
                  const chunkResult = await collectStreamChunksIncremental(
                    rawStream,
                    channel,
                  );
                  totalInputTokens += chunkResult.inputTokens;
                  totalOutputTokens += chunkResult.outputTokens;

                  const stepText = extractTextFromParts(
                    chunkResult.rawResponseParts,
                  );

                  // If no function calls, this was the final step — channel
                  // already received all text parts incrementally.
                  if (chunkResult.stepFunctionCalls.length === 0) {
                    completedWithFinalAnswer = true;
                    break;
                  }

                  lastStepText = stepText;

                  // Record tool call events on the span
                  for (const fc of chunkResult.stepFunctionCalls) {
                    span.addEvent("gen_ai.tool_call", {
                      "tool.name": fc.name as string,
                      "tool.step": step,
                    });
                  }

                  logger.debug(
                    `[GoogleAIStudio] Executing ${chunkResult.stepFunctionCalls.length} function calls`,
                  );

                  // Add model response with ALL parts (including thoughtSignature) to history
                  pushModelResponseToHistory(
                    currentContents,
                    chunkResult.rawResponseParts,
                    chunkResult.stepFunctionCalls,
                  );

                  const functionResponses = await executeNativeToolCalls(
                    "[GoogleAIStudio]",
                    chunkResult.stepFunctionCalls,
                    executeMap,
                    failedTools,
                    allToolCalls,
                    { abortSignal: composedSignal },
                  );

                  // Add function responses to history — the @google/genai SDK
                  // only accepts "user" and "model" as valid roles in contents.
                  // Function/tool responses must use role: "user" (matching the
                  // SDK's own automaticFunctionCalling implementation).
                  currentContents.push({
                    role: "user",
                    parts: functionResponses as unknown[],
                  });
                } catch (error) {
                  logger.error("[GoogleAIStudio] Native SDK error", error);
                  throw this.handleProviderError(error);
                }
              }

              // Handle max-steps termination: if the model was still calling
              // tools when we hit the limit, push a synthetic final message.
              const hitStepLimitWithoutFinalAnswer =
                step >= maxSteps && !completedWithFinalAnswer;
              if (hitStepLimitWithoutFinalAnswer) {
                const fallback = handleMaxStepsTermination(
                  "[GoogleAIStudio]",
                  step,
                  maxSteps,
                  "", // finalText is empty — model didn't stop on its own
                  lastStepText,
                );
                if (fallback) {
                  channel.push(fallback);
                }
              }

              const responseTime = Date.now() - startTime;

              // Update shared metadata so the returned object reflects final values.
              metadata.responseTime = responseTime;
              metadata.totalToolExecutions = allToolCalls.length;

              // Set token usage and finish reason on the span
              span.setAttribute(ATTR.GEN_AI_INPUT_TOKENS, totalInputTokens);
              span.setAttribute(ATTR.GEN_AI_OUTPUT_TOKENS, totalOutputTokens);
              span.setAttribute(
                ATTR.GEN_AI_FINISH_REASON,
                hitStepLimitWithoutFinalAnswer ? "max_steps" : "stop",
              );

              analyticsResolve({
                provider: this.providerName,
                model: modelName,
                tokenUsage: {
                  input: totalInputTokens,
                  output: totalOutputTokens,
                  total: totalInputTokens + totalOutputTokens,
                },
                requestDuration: responseTime,
                timestamp: new Date().toISOString(),
              });

              // Emit generation:end so Pipeline B (Langfuse) creates a GENERATION
              // observation. The native @google/genai stream path bypasses the Vercel
              // AI SDK so experimental_telemetry is never injected; we emit manually.
              const nativeStreamEmitter = this.neurolink?.getEventEmitter();
              if (nativeStreamEmitter) {
                // Curator P2-4 dedup: flag the per-stream context attached
                // to options so the orchestration skips its own emit.
                markStreamProviderEmittedGenerationEnd(
                  options as unknown as Parameters<
                    typeof markStreamProviderEmittedGenerationEnd
                  >[0],
                );
                nativeStreamEmitter.emit("generation:end", {
                  provider: this.providerName,
                  responseTime,
                  timestamp: Date.now(),
                  result: {
                    content: "",
                    usage: {
                      input: totalInputTokens,
                      output: totalOutputTokens,
                      total: totalInputTokens + totalOutputTokens,
                    },
                    model: modelName,
                    provider: this.providerName,
                    finishReason: hitStepLimitWithoutFinalAnswer
                      ? "max_steps"
                      : "stop",
                  },
                  success: true,
                });
              }

              channel.close();
            } catch (err) {
              // Propagate error to OTel span so traces show ERROR status
              span.recordException(
                err instanceof Error ? err : new Error(String(err)),
              );
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: err instanceof Error ? err.message : String(err),
              });
              // Emit failure generation:end so Pipeline B records the failed stream
              const errorEmitter = this.neurolink?.getEventEmitter();
              if (errorEmitter) {
                // Curator P2-4 dedup: flag the per-stream context attached
                // to options so the orchestration skips its own emit.
                markStreamProviderEmittedGenerationEnd(
                  options as unknown as Parameters<
                    typeof markStreamProviderEmittedGenerationEnd
                  >[0],
                );
                errorEmitter.emit("generation:end", {
                  provider: this.providerName,
                  responseTime: Date.now() - startTime,
                  timestamp: Date.now(),
                  result: {
                    content: "",
                    usage: {
                      input: totalInputTokens,
                      output: totalOutputTokens,
                      total: totalInputTokens + totalOutputTokens,
                    },
                    model: modelName,
                    provider: this.providerName,
                    finishReason: "error",
                  },
                  success: false,
                  error: err instanceof Error ? err.message : String(err),
                });
              }
              channel.error(err);
              analyticsReject(err);
            } finally {
              timeoutController?.cleanup();
            }
          })();

          // Suppress unhandled-rejection warnings on loopPromise — errors are
          // forwarded to the channel and will surface when the caller iterates.
          loopPromise.catch(() => undefined);

          return {
            stream: channel.iterable,
            provider: this.providerName,
            model: modelName,
            toolCalls: allToolCalls,
            analytics: analyticsPromise,
            metadata,
          };
        } finally {
          // Timeout controller cleanup is managed inside the background loop
        }
      },
    );
  }

  /**
   * Execute generate using native @google/genai SDK for Gemini 3 models
   * This bypasses @ai-sdk/google to properly handle thought_signature
   */
  private async executeNativeGemini3Generate(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const modelName = options.model || this.modelName;

    return withClientSpan(
      {
        name: "neurolink.provider.generate",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: "google-ai",
          [ATTR.GEN_AI_MODEL]: modelName,
          [ATTR.GEN_AI_OPERATION]: "generate",
          [ATTR.NL_PROVIDER]: this.providerName,
        },
      },
      async (span) => {
        const startTime = Date.now();
        const timeout = this.getTimeout(options);
        const timeoutController = createTimeoutController(
          timeout,
          this.providerName,
          "generate",
        );

        try {
          const apiKey = this.getApiKey();
          const client = await createGoogleGenAIClient(apiKey);

          logger.debug(
            "[GoogleAIStudio] Using native @google/genai for Gemini 3 generate",
            {
              model: modelName,
              hasTools:
                !!options.tools && Object.keys(options.tools).length > 0,
            },
          );

          // Build contents from input
          // Prefer input.text over prompt — processCSVFilesForNativeSDK enriches
          // input.text with inlined CSV data, so using prompt first would discard it.
          const promptText = options.input?.text || options.prompt || "";
          const currentContents: Array<{
            role: string;
            parts: unknown[];
          }> = [{ role: "user", parts: [{ text: promptText }] }];

          // Convert tools (merge SDK tools with options.tools)
          let toolsConfig: NativeToolsConfig | undefined;
          let executeMap = new Map<string, Tool["execute"]>();

          const shouldUseTools = !options.disableTools;
          if (shouldUseTools) {
            const tools = options.tools || {};

            if (Object.keys(tools).length > 0) {
              const result = buildNativeToolDeclarations(tools);
              toolsConfig = result.toolsConfig;
              executeMap = result.executeMap;

              logger.debug(
                "[GoogleAIStudio] Converted tools for native SDK generate",
                {
                  toolCount: toolsConfig[0].functionDeclarations.length,
                  toolNames: toolsConfig[0].functionDeclarations.map(
                    (t) => t.name,
                  ),
                },
              );
            }
          }

          const config = buildNativeConfig(options, toolsConfig);

          const composedSignal = composeAbortSignals(
            options.abortSignal,
            timeoutController?.controller.signal,
          );
          const maxSteps = computeMaxSteps(options.maxSteps);

          let finalText = "";
          let lastStepText = "";
          let totalInputTokens = 0;
          let totalOutputTokens = 0;
          const allToolCalls: Array<{
            toolName: string;
            args: Record<string, unknown>;
          }> = [];
          const toolExecutions: Array<{
            name: string;
            input: Record<string, unknown>;
            output: unknown;
          }> = [];
          let step = 0;
          const failedTools = new Map<
            string,
            { count: number; lastError: string }
          >();

          // Agentic loop for tool calling
          while (step < maxSteps) {
            if (composedSignal?.aborted) {
              throw composedSignal.reason instanceof Error
                ? composedSignal.reason
                : new Error("Request aborted");
            }
            step++;
            logger.debug(
              `[GoogleAIStudio] Native SDK generate step ${step}/${maxSteps}`,
            );

            try {
              const stream = await client.models.generateContentStream({
                model: modelName,
                contents: currentContents,
                config,
                ...(composedSignal
                  ? { httpOptions: { signal: composedSignal } }
                  : {}),
              });

              const chunkResult = await collectStreamChunks(stream);
              totalInputTokens += chunkResult.inputTokens;
              totalOutputTokens += chunkResult.outputTokens;

              const stepText = extractTextFromParts(
                chunkResult.rawResponseParts,
              );

              // If no function calls, we're done
              if (chunkResult.stepFunctionCalls.length === 0) {
                finalText = stepText;
                break;
              }

              lastStepText = stepText;

              // Record tool call events on the span
              for (const fc of chunkResult.stepFunctionCalls) {
                span.addEvent("gen_ai.tool_call", {
                  "tool.name": fc.name as string,
                  "tool.step": step,
                });
              }

              logger.debug(
                `[GoogleAIStudio] Executing ${chunkResult.stepFunctionCalls.length} function calls in generate`,
              );

              // Add model response with ALL parts (including thoughtSignature) to history
              // This is critical for Gemini 3 - it requires thought signatures in subsequent turns
              pushModelResponseToHistory(
                currentContents,
                chunkResult.rawResponseParts,
                chunkResult.stepFunctionCalls,
              );

              const functionResponses = await executeNativeToolCalls(
                "[GoogleAIStudio]",
                chunkResult.stepFunctionCalls,
                executeMap,
                failedTools,
                allToolCalls,
                { toolExecutions, abortSignal: composedSignal },
              );

              // Add function responses to history — the @google/genai SDK
              // only accepts "user" and "model" as valid roles in contents.
              // Function/tool responses must use role: "user" (matching the
              // SDK's own automaticFunctionCalling implementation).
              currentContents.push({
                role: "user",
                parts: functionResponses,
              });
            } catch (error) {
              logger.error("[GoogleAIStudio] Native SDK generate error", error);
              throw this.handleProviderError(error);
            }
          }

          finalText = handleMaxStepsTermination(
            "[GoogleAIStudio]",
            step,
            maxSteps,
            finalText,
            lastStepText,
          );

          const responseTime = Date.now() - startTime;

          // Set token usage and finish reason on the span
          span.setAttribute(ATTR.GEN_AI_INPUT_TOKENS, totalInputTokens);
          span.setAttribute(ATTR.GEN_AI_OUTPUT_TOKENS, totalOutputTokens);
          span.setAttribute(
            ATTR.GEN_AI_FINISH_REASON,
            step >= maxSteps ? "max_steps" : "stop",
          );

          // Emit generation:end so Pipeline B (Langfuse) creates a GENERATION
          // observation. The native @google/genai path bypasses the Vercel AI SDK
          // so experimental_telemetry is never injected; we emit the event manually.
          const nativeGenerateEmitter = this.neurolink?.getEventEmitter();
          if (nativeGenerateEmitter) {
            nativeGenerateEmitter.emit("generation:end", {
              provider: this.providerName,
              responseTime,
              timestamp: Date.now(),
              result: {
                content: finalText,
                usage: {
                  input: totalInputTokens,
                  output: totalOutputTokens,
                  total: totalInputTokens + totalOutputTokens,
                },
                model: modelName,
                provider: this.providerName,
                finishReason: step >= maxSteps ? "max_steps" : "stop",
              },
              success: true,
            });
          }

          // Build EnhancedGenerateResult
          return {
            content: finalText,
            provider: this.providerName,
            model: modelName,
            usage: {
              input: totalInputTokens,
              output: totalOutputTokens,
              total: totalInputTokens + totalOutputTokens,
            },
            responseTime,
            toolsUsed: allToolCalls.map((tc) => tc.toolName),
            toolExecutions: toolExecutions,
            enhancedWithTools: allToolCalls.length > 0,
          };
        } finally {
          timeoutController?.cleanup();
        }
      },
    );
  }

  /**
   * Override generate to route Gemini 3 models with tools to native SDK
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
  ): Promise<EnhancedGenerateResult | null> {
    // Normalize options
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const modelName = options.model || this.modelName;

    // Check if we should use native SDK for Gemini 3 with tools
    const shouldUseTools = !options.disableTools && this.supportsTools();
    const hasTools =
      shouldUseTools && options.tools && Object.keys(options.tools).length > 0;

    if (isGemini3Model(modelName) && hasTools) {
      // Merge SDK tools into options for native SDK path
      let mergedOptions = {
        ...options,
        tools: options.tools,
      };

      // Check for tools + JSON schema conflict (Gemini limitation)
      const wantsJsonOutput =
        options.output?.format === "json" || options.schema;
      if (
        wantsJsonOutput &&
        mergedOptions.tools &&
        Object.keys(mergedOptions.tools).length > 0 &&
        !mergedOptions.disableTools
      ) {
        logger.warn(
          "[GoogleAIStudio] Gemini does not support tools and JSON schema output simultaneously. Disabling tools for this request.",
        );
        mergedOptions = { ...mergedOptions, disableTools: true, tools: {} };
      }

      // Only route to native path if tools are still active after conflict check
      const hasActiveTools =
        !mergedOptions.disableTools &&
        mergedOptions.tools &&
        Object.keys(mergedOptions.tools).length > 0;
      if (hasActiveTools) {
        logger.info(
          "[GoogleAIStudio] Routing Gemini 3 generate to native SDK for tool calling",
          {
            model: modelName,
            totalToolCount: Object.keys(mergedOptions.tools ?? {}).length,
          },
        );
        return this.executeNativeGemini3Generate(mergedOptions);
      }
      // Fall through to standard generate path using merged options (tools disabled for schema)
      return super.generate(mergedOptions);
    }

    // Fall back to BaseProvider implementation
    return super.generate(options);
  }

  // ===================
  // HELPER METHODS
  // ===================
  private async executeAudioStreamViaGeminiLive(
    options: StreamOptions,
  ): Promise<StreamResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    // Dynamic import to avoid hard dependency unless audio streaming is used
    let client: GenAIClient;
    try {
      client = await createGoogleGenAIClient(apiKey);
    } catch {
      throw new AuthenticationError(
        "Missing '@google/genai'. Install with: pnpm add @google/genai",
        this.providerName,
      );
    }

    const model =
      this.modelName ||
      process.env.GOOGLE_VOICE_AI_MODEL ||
      "gemini-2.5-flash-preview-native-audio-dialog";

    // Simple async queue for yielding audio events to the outer AsyncIterable
    const queue: GoogleLiveAudioQueueItem[] = [];
    let resolveNext:
      | ((value: IteratorResult<{ type: "audio"; audio: AudioChunk }>) => void)
      | null = null;
    let done = false;

    const push = (item: GoogleLiveAudioQueueItem) => {
      if (done) {
        return;
      }
      if (item.type === "audio") {
        if (resolveNext) {
          const fn = resolveNext;
          resolveNext = null;
          fn({ value: { type: "audio", audio: item.audio }, done: false });
          return;
        }
      }
      queue.push(item);
    };

    const session = await client.live.connect({
      model,
      callbacks: {
        onopen: () => {
          // no-op
        },
        onmessage: async (message: LiveServerMessage) => {
          try {
            const audio =
              message?.serverContent?.modelTurn?.parts?.[0]?.inlineData;
            if (audio?.data) {
              const buf = Buffer.from(String(audio.data), "base64");
              const chunk: AudioChunk = {
                data: buf,
                sampleRateHz: 24000,
                channels: 1,
                encoding: "PCM16LE",
              };
              push({ type: "audio", audio: chunk });
            }
            if (message?.serverContent?.interrupted) {
              // allow consumer to handle; no special action required here
            }
          } catch (e) {
            push({ type: "error", error: e });
          }
        },
        onerror: (e: { message?: string }) => {
          push({ type: "error", error: e });
        },
        onclose: (_e: { code?: number; reason?: string }) => {
          push({ type: "end" });
        },
      },
      config: {
        responseModalities: ["AUDIO"] as ("TEXT" | "IMAGE" | "AUDIO")[],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } },
        },
      },
    });

    // Feed upstream audio frames concurrently
    (async () => {
      try {
        const spec = options.input?.audio;
        if (!spec) {
          logger.debug(
            "[GeminiLive] No audio spec found on input; skipping upstream send",
          );
          return;
        }
        for await (const frame of spec.frames) {
          // Zero-length frame acts as a 'flush' control signal
          if (!frame || (frame as Buffer).byteLength === 0) {
            try {
              if (session.sendInput) {
                await session.sendInput({ event: "flush" });
              } else if (session.sendRealtimeInput) {
                await session.sendRealtimeInput({ event: "flush" });
              }
            } catch (err) {
              logger.debug("[GeminiLive] flush control failed (non-fatal)", {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            continue;
          }
          // Convert PCM16LE buffer to base64 and wrap in genai Blob-like object
          const base64 = (frame as Buffer).toString("base64");
          const mimeType = `audio/pcm;rate=${spec.sampleRateHz || 16000}`;
          await session.sendRealtimeInput?.({
            media: { data: base64, mimeType },
          });
        }
        // Best-effort flush signal if supported
        try {
          if (session.sendInput) {
            await session.sendInput({ event: "flush" });
          } else if (session.sendRealtimeInput) {
            await session.sendRealtimeInput({ event: "flush" });
          }
        } catch (err) {
          logger.debug("[GeminiLive] final flush failed (non-fatal)", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } catch (e) {
        push({ type: "error", error: e });
      }
    })().catch(() => {
      // ignore
    });

    // AsyncIterable for stream events
    const asyncIterable = {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<
            IteratorResult<{ type: "audio"; audio: AudioChunk }>
          > {
            if (queue.length > 0) {
              const item = queue.shift();
              if (!item) {
                return {
                  value: undefined as unknown as {
                    type: "audio";
                    audio: AudioChunk;
                  },
                  done: true,
                };
              }
              if (item.type === "audio") {
                return {
                  value: { type: "audio", audio: item.audio },
                  done: false,
                };
              }
              if (item.type === "end") {
                done = true;
                return {
                  value: undefined as unknown as {
                    type: "audio";
                    audio: AudioChunk;
                  },
                  done: true,
                };
              }
              if (item.type === "error") {
                done = true;
                throw item.error instanceof Error
                  ? item.error
                  : new Error(String(item.error));
              }
            }
            if (done) {
              return {
                value: undefined as unknown as {
                  type: "audio";
                  audio: AudioChunk;
                },
                done: true,
              };
            }
            return await new Promise<
              IteratorResult<{ type: "audio"; audio: AudioChunk }>
            >((resolve) => {
              resolveNext = resolve;
            });
          },
        };
      },
    } as AsyncIterable<{ type: "audio"; audio: AudioChunk }>;

    return {
      stream: asyncIterable,
      provider: this.providerName,
      model: model,
      metadata: {
        startTime,
        streamId: `google-ai-audio-${Date.now()}`,
      },
    };
  }

  protected getDefaultEmbeddingModel(): string {
    return (
      process.env.GOOGLE_AI_EMBEDDING_MODEL ||
      process.env.GOOGLE_EMBEDDING_MODEL ||
      "gemini-embedding-001"
    );
  }

  /**
   * Generate embeddings for text using Google AI Studio embedding models
   * @param text - The text to embed
   * @param modelName - The embedding model to use (default: gemini-embedding-001)
   * @returns Promise resolving to the embedding vector
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const embeddingModelName =
      modelName || this.getDefaultEmbeddingModel() || "gemini-embedding-001";

    logger.debug("Generating embedding", {
      provider: this.providerName,
      model: embeddingModelName,
      textLength: text.length,
    });

    try {
      const apiKey = this.getApiKey();
      const google = createGoogleGenerativeAI({ apiKey });

      const embeddingModel = google.textEmbeddingModel(embeddingModelName);

      const result = await embed({
        model: embeddingModel,
        value: text,
      });

      logger.debug("Embedding generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        embeddingDimension: result.embedding.length,
      });

      return result.embedding;
    } catch (error) {
      logger.error("Embedding generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: embeddingModelName,
        textLength: text.length,
      });

      throw this.handleProviderError(error);
    }
  }

  /**
   * Generate embeddings for multiple texts in a single batch
   * @param texts - The texts to embed
   * @param modelName - The embedding model to use (default: gemini-embedding-001)
   * @returns Promise resolving to an array of embedding vectors
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    const embeddingModelName =
      modelName || this.getDefaultEmbeddingModel() || "gemini-embedding-001";

    logger.debug("Generating batch embeddings", {
      provider: this.providerName,
      model: embeddingModelName,
      count: texts.length,
    });

    try {
      const apiKey = this.getApiKey();
      const google = createGoogleGenerativeAI({ apiKey });

      const embeddingModel = google.textEmbeddingModel(embeddingModelName);

      const result = await embedMany({
        model: embeddingModel,
        values: texts,
      });

      logger.debug("Batch embeddings generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        count: result.embeddings.length,
        embeddingDimension: result.embeddings[0]?.length,
      });

      return result.embeddings;
    } catch (error) {
      logger.error("Batch embedding generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: embeddingModelName,
        count: texts.length,
      });

      throw this.handleProviderError(error);
    }
  }

  private getApiKey(): string {
    const apiKey =
      this.credentials?.apiKey ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      throw new AuthenticationError(
        "GOOGLE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set",
        this.providerName,
      );
    }

    return apiKey;
  }
}

export default GoogleAIStudioProvider;
