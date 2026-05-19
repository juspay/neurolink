import {
  type AIProviderName,
  ErrorCategory,
  ErrorSeverity,
  GoogleAIModels,
} from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import {
  IMAGE_GENERATION_MODELS,
  TOOL_STORAGE_TIMEOUT_MS,
} from "../core/constants.js";
import { processUnifiedFilesArray } from "../utils/messageBuilder.js";
import type { NeuroLink } from "../neurolink.js";
import {
  ATTR,
  tracers,
  withClientSpan,
  withClientStreamSpan,
  withSpan,
} from "../telemetry/index.js";
import type {
  AnalyticsData,
  UnknownRecord,
  ZodUnknownSchema,
  EnhancedGenerateResult,
  TextGenerationOptions,
  GenAIClient,
  GoogleGenAIClass,
  GoogleLiveAudioQueueItem,
  LiveServerMessage,
  AudioChunk,
  NativeToolsConfig,
  StreamOptions,
  StreamResult,
} from "../types/index.js";

import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { ERROR_CODES, NeuroLinkError } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { withTimeout } from "../utils/async/index.js";
import { estimateTokens } from "../utils/tokenEstimation.js";
import { transformToolExecutions } from "../utils/transformationUtils.js";
import {
  buildGeminiResponseSchema,
  buildNativeConfig,
  buildNativeToolDeclarations,
  collectStreamChunks,
  collectStreamChunksIncremental,
  computeMaxSteps,
  createTextChannel,
  buildUserPartsWithMultimodal,
  executeNativeToolCalls,
  extractTextFromParts,
  extractThoughtSignature,
  handleMaxStepsTermination,
  prependConversationMessages,
  pushModelResponseToHistory,
} from "./googleNativeGemini3.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type { LanguageModel, Schema, Tool } from "../types/index.js";

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
  // Include httpOptions with proxy fetch for corporate network support
  return new Ctor({
    apiKey,
    httpOptions: {
      fetch: createProxyFetch(),
    },
  });
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
   * AI SDK model instance — no longer used.
   * All models are routed through native @google/genai SDK directly.
   */
  public getAISDKModel(): LanguageModel {
    throw new NeuroLinkError({
      code: ERROR_CODES.INVALID_CONFIGURATION,
      message:
        "GoogleAIStudioProvider no longer uses @ai-sdk/google. All models use native @google/genai SDK.",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      retriable: false,
      context: { provider: this.providerName, model: this.modelName },
    });
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
    const statusCode =
      typeof errorRecord?.status === "number"
        ? errorRecord.status
        : typeof errorRecord?.statusCode === "number"
          ? errorRecord.statusCode
          : undefined;

    // Authentication errors
    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key") ||
      statusCode === 401
    ) {
      return new AuthenticationError(
        "Invalid Google AI API key. Please check your GOOGLE_AI_API_KEY environment variable.",
        this.providerName,
      );
    }

    // Rate limit errors
    if (
      message.includes("RATE_LIMIT_EXCEEDED") ||
      message.includes("rate limit") ||
      message.includes("429") ||
      statusCode === 429
    ) {
      return new RateLimitError(
        "Google AI rate limit exceeded. Please try again later.",
        this.providerName,
      );
    }

    // Model not found errors — gate on a 404 status when available; fall
    // back to literal phrase matching only when we have no status code at
    // all. Avoids misclassifying permission/validation errors that happen
    // to mention model resource paths (e.g. "...models/foo permission...").
    if (
      statusCode === 404 ||
      (statusCode === undefined &&
        (message.includes("model not found") ||
          message.includes("Model not found")))
    ) {
      return new InvalidModelError(
        `Model '${this.modelName}' not found. Please check the model name and ensure it is available.`,
        this.providerName,
      );
    }

    // Network connectivity errors
    if (
      message.includes("ECONNRESET") ||
      message.includes("ENOTFOUND") ||
      message.includes("ETIMEDOUT") ||
      message.includes("ECONNREFUSED") ||
      message.includes("network") ||
      message.includes("connection")
    ) {
      return new NetworkError(
        `Connection error: ${message}`,
        this.providerName,
      );
    }

    // Server errors (5xx)
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("server error") ||
      message.includes("Internal Server Error") ||
      (statusCode && statusCode >= 500 && statusCode < 600)
    ) {
      return new ProviderError(
        `Google AI server error: ${message}. Please try again later.`,
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
    const modelName = options.model || this.modelName;

    // Phase 1: if audio input present, bridge to Gemini Live (Studio) using @google/genai
    if (options.input?.audio) {
      return await this.executeAudioStreamViaGeminiLive(options);
    }

    // Structured output (analysisSchema, JSON format, or schema) is incompatible with tools on Gemini.
    const wantsStructuredOutput =
      analysisSchema || options.output?.format === "json" || options.schema;

    // Tool filter (a0269210): trust options.tools — caller (BaseProvider.stream)
    // already merged MCP/built-in tools with user tools and applied any
    // enabledToolNames filter. Re-attaching getAllTools() here would clobber
    // that filter and re-introduce filtered-out tools.
    const shouldUseTools =
      !options.disableTools && this.supportsTools() && !wantsStructuredOutput;
    const optionTools = options.tools || {};

    // Merge into options for native SDK path
    let mergedOptions = {
      ...options,
      tools: optionTools,
    };

    // Check for tools + JSON schema conflict (Gemini limitation)
    const wantsJsonOutput = options.output?.format === "json" || options.schema;
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

    const hasActiveTools =
      shouldUseTools &&
      !mergedOptions.disableTools &&
      mergedOptions.tools &&
      Object.keys(mergedOptions.tools).length > 0;

    if (hasActiveTools) {
      logger.info(
        "[GoogleAIStudio] Routing to native @google/genai SDK for tool calling",
        {
          model: modelName,
          totalToolCount: Object.keys(mergedOptions.tools ?? {}).length,
        },
      );
    }

    // Route ALL models through native @google/genai SDK (no more @ai-sdk/google dependency)
    return this.executeNativeGemini3Stream(mergedOptions);
  }

  /**
   * Execute stream using native @google/genai SDK
   * Uses @google/genai directly for all Gemini models (2.0, 2.5, 3.x)
   */
  private async executeNativeGemini3Stream(
    options: StreamOptions,
  ): Promise<StreamResult> {
    const modelName = options.model || this.modelName;

    return withClientStreamSpan(
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

          // Build contents from input. Prepend prior conversation turns so
          // multi-turn callers (memory, loop REPL, agent flows) actually
          // carry context — the previous build started fresh from the
          // current user input only, which silently dropped history.
          //
          // `buildUserPartsWithMultimodal` is the shared helper that also
          // attaches `input.images` and `input.pdfFiles` as `inlineData`
          // parts. The previous AI Studio path pushed only `{ text }` and
          // silently dropped both, which is why the model legitimately
          // reported "no image attached" on multimodal calls.
          const currentContents: Array<{
            role: string;
            parts: unknown[];
          }> = [];
          prependConversationMessages(
            currentContents,
            options.conversationMessages,
          );
          const userParts = await buildUserPartsWithMultimodal(
            options.input,
            options.input.text,
            "[GoogleAIStudio:stream]",
          );
          currentContents.push({
            role: "user",
            parts: userParts,
          });

          // Convert tools
          let toolsConfig: NativeToolsConfig | undefined;
          let executeMap = new Map<string, Tool["execute"]>();
          let originalNameMap = new Map<string, string>();

          if (
            options.tools &&
            Object.keys(options.tools).length > 0 &&
            !options.disableTools
          ) {
            const result = buildNativeToolDeclarations(options.tools);
            toolsConfig = result.toolsConfig;
            executeMap = result.executeMap;
            originalNameMap = result.originalNameMap;

            logger.debug("[GoogleAIStudio] Converted tools for native SDK", {
              toolCount: toolsConfig[0].functionDeclarations.length,
              toolNames: toolsConfig[0].functionDeclarations.map((t) => t.name),
            });
          }

          // Native JSON / schema enforcement: when no tools are being sent
          // (the AI Studio orchestrator above already force-disables tools
          // whenever JSON/schema output is requested), enforce the response
          // shape natively via responseMimeType / responseSchema. Without
          // this, JSON output was best-effort prompting only.
          const wantsNativeJson =
            !toolsConfig &&
            (options.output?.format === "json" || !!options.schema);
          const nativeResponseSchema =
            wantsNativeJson && options.schema
              ? buildGeminiResponseSchema(options.schema as ZodUnknownSchema)
              : undefined;

          const config = buildNativeConfig(
            {
              ...options,
              wantsJsonOutput: wantsNativeJson,
              responseSchema: nativeResponseSchema,
            },
            toolsConfig,
          );
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
          // Mirror the Vertex Gemini stream path: track tool executions so
          // the storage hook can persist real outputs and StreamResult can
          // surface toolsUsed/toolExecutions for tool-bearing turns.
          const toolExecutions: Array<{
            name: string;
            input: Record<string, unknown>;
            output: unknown;
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

                  const toolCallsBefore = allToolCalls.length;
                  const toolExecsBefore = toolExecutions.length;
                  const functionResponses = await executeNativeToolCalls(
                    "[GoogleAIStudio]",
                    chunkResult.stepFunctionCalls,
                    executeMap,
                    failedTools,
                    allToolCalls,
                    {
                      abortSignal: composedSignal,
                      originalNameMap,
                      toolExecutions,
                    },
                  );

                  // Persist this step's tool calls/results into conversation
                  // memory. Without this, tool_call / tool_result rows never
                  // reach Redis and the chat-history UI loses every tool
                  // invocation.
                  const stepToolCalls = allToolCalls.slice(toolCallsBefore);
                  const stepToolExecs = toolExecutions.slice(toolExecsBefore);
                  if (stepToolCalls.length > 0 || stepToolExecs.length > 0) {
                    const stepThoughtSig = extractThoughtSignature(
                      chunkResult.rawResponseParts,
                    );
                    withTimeout(
                      this.handleToolExecutionStorage(
                        stepToolCalls.map((tc, i) => ({
                          toolName: tc.toolName,
                          args: tc.args,
                          ...(i === 0 && stepThoughtSig
                            ? { thoughtSignature: stepThoughtSig }
                            : {}),
                          stepIndex: step,
                        })),
                        stepToolExecs.map((te) => ({
                          toolName: te.name,
                          output: te.output,
                          stepIndex: step,
                        })),
                        options,
                        new Date(),
                      ),
                      TOOL_STORAGE_TIMEOUT_MS,
                      "tool storage write timed out",
                    ).catch((error: unknown) => {
                      logger.warn(
                        "[GoogleAIStudio] Failed to store native tool executions",
                        {
                          error:
                            error instanceof Error
                              ? error.message
                              : String(error),
                        },
                      );
                    });
                  }

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

              channel.close();
            } catch (err) {
              channel.error(err);
              analyticsReject(err);
            } finally {
              timeoutController?.cleanup();
            }
          })();

          // Suppress unhandled-rejection warnings on loopPromise — errors are
          // forwarded to the channel and will surface when the caller iterates.
          loopPromise.catch(() => undefined);

          const result: StreamResult = {
            stream: channel.iterable,
            provider: this.providerName,
            model: modelName,
            toolCalls: allToolCalls,
            analytics: analyticsPromise,
            metadata,
          };
          // Surface tools-used + executions via getters so they resolve at
          // access time, after the background loop has populated the live
          // arrays. Same lazy pattern used for `structuredOutput` elsewhere.
          Object.defineProperty(result, "toolsUsed", {
            enumerable: true,
            configurable: true,
            get: () => allToolCalls.map((tc) => tc.toolName),
          });
          Object.defineProperty(result, "toolExecutions", {
            enumerable: true,
            configurable: true,
            get: () =>
              transformToolExecutions(
                toolExecutions,
              ) as unknown as StreamResult["toolExecutions"],
          });
          return result;
        } finally {
          // Timeout controller cleanup is managed inside the background loop
        }
      },
      (r) => r.stream,
      (r, wrapped) => ({ ...r, stream: wrapped }),
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
          // Prepend prior conversation turns so multi-turn generate calls
          // see history; otherwise the native generate path silently drops
          // every turn before the current prompt.
          //
          // `buildUserPartsWithMultimodal` also attaches inline image / PDF
          // parts. Without it the request body was text-only and the model
          // legitimately reported "no image / PDF attached".
          const currentContents: Array<{
            role: string;
            parts: unknown[];
          }> = [];
          prependConversationMessages(
            currentContents,
            options.conversationMessages,
          );
          const userParts = await buildUserPartsWithMultimodal(
            options.input,
            promptText,
            "[GoogleAIStudio:generate]",
          );
          currentContents.push({
            role: "user",
            parts: userParts,
          });

          // Convert tools (a0269210: trust options.tools — already merged + filtered upstream)
          let toolsConfig: NativeToolsConfig | undefined;
          let executeMap = new Map<string, Tool["execute"]>();
          let originalNameMap = new Map<string, string>();

          const shouldUseTools = !options.disableTools;
          if (shouldUseTools) {
            const tools = options.tools || {};

            if (Object.keys(tools).length > 0) {
              const result = buildNativeToolDeclarations(tools);
              toolsConfig = result.toolsConfig;
              executeMap = result.executeMap;
              originalNameMap = result.originalNameMap;

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

          // Native JSON / schema enforcement (generate path). Mirrors the
          // stream block above; only set when no tools are being sent
          // because Gemini cannot combine function calling with JSON mime.
          const wantsNativeJson =
            !toolsConfig &&
            (options.output?.format === "json" || !!options.schema);
          const nativeResponseSchema =
            wantsNativeJson && options.schema
              ? buildGeminiResponseSchema(options.schema as ZodUnknownSchema)
              : undefined;

          const config = buildNativeConfig(
            {
              ...options,
              wantsJsonOutput: wantsNativeJson,
              responseSchema: nativeResponseSchema,
            },
            toolsConfig,
          );

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

              const toolCallsBefore = allToolCalls.length;
              const toolExecsBefore = toolExecutions.length;
              const functionResponses = await executeNativeToolCalls(
                "[GoogleAIStudio]",
                chunkResult.stepFunctionCalls,
                executeMap,
                failedTools,
                allToolCalls,
                {
                  toolExecutions,
                  abortSignal: composedSignal,
                  originalNameMap,
                },
              );

              // Persist this step's tool calls/results into conversation memory.
              const stepToolCalls = allToolCalls.slice(toolCallsBefore);
              const stepToolExecs = toolExecutions.slice(toolExecsBefore);
              if (stepToolCalls.length > 0 || stepToolExecs.length > 0) {
                const stepThoughtSig = extractThoughtSignature(
                  chunkResult.rawResponseParts,
                );
                withTimeout(
                  this.handleToolExecutionStorage(
                    stepToolCalls.map((tc, i) => ({
                      toolName: tc.toolName,
                      args: tc.args,
                      ...(i === 0 && stepThoughtSig
                        ? { thoughtSignature: stepThoughtSig }
                        : {}),
                      stepIndex: step,
                    })),
                    stepToolExecs.map((te) => ({
                      toolName: te.name,
                      output: te.output,
                      stepIndex: step,
                    })),
                    options,
                    new Date(),
                  ),
                  TOOL_STORAGE_TIMEOUT_MS,
                  "tool storage write timed out",
                ).catch((error: unknown) => {
                  logger.warn(
                    "[GoogleAIStudio] Failed to store native generate tool executions",
                    {
                      error:
                        error instanceof Error ? error.message : String(error),
                    },
                  );
                });
              }

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

          // Build EnhancedGenerateResult and route through enhanceResult so
          // analytics / evaluation / tracing stay attached. The native AI
          // Studio generate path bypasses BaseProvider.generate(), so
          // skipping enhanceResult would silently drop those features.
          const baseResult: EnhancedGenerateResult = {
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
            toolExecutions: transformToolExecutions(toolExecutions),
            enhancedWithTools: allToolCalls.length > 0,
          };
          return this.enhanceResult(baseResult, options, startTime);
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

    // Image-generation models reject function-calling. Route them to
    // executeImageGeneration without merging tools. This must happen
    // BEFORE getToolsForStream to avoid leaking registered (MCP / built-in)
    // tools into the image API request, which trips
    // "Function calling is not enabled for this model".
    // startsWith (not includes) so a hypothetical text model whose ID
    // contains an image-model string as a substring isn't silently routed
    // to executeImageGeneration and stripped of tool support.
    const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
      modelName.toLowerCase().startsWith(m.toLowerCase()),
    );
    if (isImageModel) {
      logger.info(
        "[GoogleAIStudio] Routing image generation model to executeImageGeneration",
        { model: modelName },
      );
      return this.executeImageGeneration(options);
    }

    // TTS direct-synthesis mode: synthesise the input text directly (no LLM
    // call). BaseProvider.runGenerateInActiveContext does the same dispatch
    // — replicated here because AI Studio's override bypasses that path.
    if (options.tts?.enabled && !options.tts?.useAiResponse) {
      logger.info(
        "[GoogleAIStudio] Routing TTS direct-synthesis to handleDirectTTSSynthesis",
        { model: modelName },
      );
      return this.handleDirectTTSSynthesis(options, Date.now());
    }

    // Process the unified `input.files` array before routing to the
    // native SDK. BaseProvider.generate() runs this preprocessing via
    // buildMultimodalMessagesArray, but AI Studio's override skips it,
    // which would otherwise drop text-file content (and the
    // mimetype-hint contract) on the floor. Mutates options.input.text /
    // options.input.images / options.input.pdfFiles in place.
    if (options.input?.files && options.input.files.length > 0) {
      try {
        await processUnifiedFilesArray(
          options as Parameters<typeof processUnifiedFilesArray>[0],
          100 * 1024 * 1024,
          this.providerName,
        );
      } catch (fileError) {
        logger.warn(
          `[GoogleAIStudio] processUnifiedFilesArray threw, continuing without file content: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
        );
      }
    }

    // Merge registered (built-in / MCP) tools with caller-supplied tools.
    // AI Studio's generate() bypasses BaseProvider.generate(), so the
    // ToolsManager-driven merge that normally injects sdk.registerTool()
    // entries never runs here. Without this call, registered tools never
    // reach the native function-calling path.
    const baseTools = !options.disableTools
      ? await this.getToolsForStream(options)
      : {};
    let mergedOptions = {
      ...options,
      tools: baseTools,
    };

    // Check for tools + JSON schema conflict (Gemini limitation)
    const wantsJsonOutput = options.output?.format === "json" || options.schema;
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

    const hasActiveTools =
      !mergedOptions.disableTools &&
      mergedOptions.tools &&
      Object.keys(mergedOptions.tools).length > 0;

    if (hasActiveTools) {
      logger.info(
        "[GoogleAIStudio] Routing generate to native @google/genai SDK for tool calling",
        {
          model: modelName,
          totalToolCount: Object.keys(mergedOptions.tools ?? {}).length,
        },
      );
    }

    // Route ALL models through native @google/genai SDK (no more @ai-sdk/google dependency).
    // Emit Pipeline B `generation:end` so the observability listener
    // creates a `model.generation` span — AI Studio's native path bypasses
    // the AI SDK + experimental_telemetry plumbing the same way Vertex's
    // does, so the event has to be emitted manually.
    const generateStartTime = Date.now();
    const inputPrompt =
      (mergedOptions.input as { text?: string } | undefined)?.text ||
      (mergedOptions as { prompt?: string }).prompt ||
      "";
    try {
      // Wrap in `neurolink.executeGeneration` so the observability span
      // chain (Test: Generate Span Chain) sees a third inner span on the
      // native @google/genai path — Pipeline A providers get this from
      // GenerationHandler.executeGeneration; the native path bypasses
      // GenerationHandler so we add the span here.
      let result = await withSpan(
        {
          name: "neurolink.executeGeneration",
          tracer: tracers.provider,
          attributes: {
            [ATTR.GEN_AI_SYSTEM]: this.providerName,
            [ATTR.GEN_AI_MODEL]: modelName,
            "neurolink.path": "native.google-genai",
          },
        },
        async () => this.executeNativeGemini3Generate(mergedOptions),
      );
      // Pipe through TTS-of-AI-response when caller asks for it. No-op when
      // tts is disabled or useAiResponse is false.
      result = await this.synthesizeAIResponseIfNeeded(result, options);
      this.emitPipelineBGenerationEvent(
        modelName,
        result,
        generateStartTime,
        true,
        undefined,
        inputPrompt,
      );
      return result;
    } catch (error) {
      this.emitPipelineBGenerationEvent(
        modelName,
        null,
        generateStartTime,
        false,
        error,
        inputPrompt,
      );
      throw error;
    }
  }

  /**
   * Emit `generation:end` so the Pipeline B observability listener creates
   * a `model.generation` span for native Google AI Studio generate calls.
   * Without this hand-off the native path silently disappears from
   * Pipeline B exporters (Langfuse, custom OTEL collectors).
   */
  private emitPipelineBGenerationEvent(
    modelName: string,
    result: EnhancedGenerateResult | null,
    startTime: number,
    success: boolean,
    error?: unknown,
    prompt?: string,
  ): void {
    const emitter = this.neurolink?.getEventEmitter();
    if (!emitter) {
      return;
    }
    const usage =
      result?.usage && typeof result.usage === "object"
        ? result.usage
        : { input: 0, output: 0, total: 0 };
    // Mark on the result so the SDK-level runStandardGenerateRequest knows
    // this provider already emitted `generation:end` itself and skips its
    // own duplicate emission. Without this flag the public event listener
    // (and the observability test) would see two events per generate call.
    if (result && typeof result === "object") {
      (result as { _generationEndEmitted?: boolean })._generationEndEmitted =
        true;
    }
    emitter.emit("generation:end", {
      provider: this.providerName,
      responseTime: Date.now() - startTime,
      timestamp: Date.now(),
      // The Pipeline B listener reads `data.prompt` to populate the
      // `input` span attribute. Without this, the Observability Spans
      // test fails with "input capture not working".
      prompt: prompt || "",
      result: {
        content: result?.content || "",
        usage,
        model: modelName,
        provider: this.providerName,
        finishReason: success ? "stop" : "error",
      },
      success,
      ...(error
        ? { error: error instanceof Error ? error.message : String(error) }
        : {}),
    });
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
      const client = await createGoogleGenAIClient(apiKey);

      const result = await client.models.embedContent({
        model: embeddingModelName,
        contents: [text],
      });

      const embedding = result.embeddings?.[0]?.values;
      if (!embedding) {
        throw new ProviderError(
          "No embedding returned from Google AI",
          this.providerName,
        );
      }

      logger.debug("Embedding generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        embeddingDimension: embedding.length,
      });

      return embedding;
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
      const client = await createGoogleGenAIClient(apiKey);

      const result = await client.models.embedContent({
        model: embeddingModelName,
        contents: texts,
      });

      const embeddings = (result.embeddings || []).map(
        (e: { values?: number[] }) => e.values || [],
      );

      logger.debug("Batch embeddings generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        count: embeddings.length,
        embeddingDimension: embeddings[0]?.length,
      });

      return embeddings;
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
