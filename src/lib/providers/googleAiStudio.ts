import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { type LanguageModelV1, type Schema, streamText, type Tool } from "ai";
import {
  type AIProviderName,
  ErrorCategory,
  ErrorSeverity,
  GoogleAIModels,
} from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import {
  DEFAULT_MAX_STEPS,
  DEFAULT_TOOL_MAX_RETRIES,
} from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import type { UnknownRecord } from "../types/common.js";
import {
  AuthenticationError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/errors.js";
import type {
  EnhancedGenerateResult,
  TextGenerationOptions,
} from "../types/generateTypes.js";
import type {
  GenAIClient,
  GoogleGenAIClass,
  LiveServerMessage,
} from "../types/providers.js";
import type {
  AudioChunk,
  StreamOptions,
  StreamResult,
} from "../types/streamTypes.js";
import type { ZodUnknownSchema } from "../types/typeAliases.js";
import { ERROR_CODES, NeuroLinkError } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";
import { isGemini3Model } from "../utils/modelDetection.js";
import {
  convertZodToJsonSchema,
  inlineJsonSchema,
  isZodSchema,
} from "../utils/schemaConversion.js";
import { createNativeThinkingConfig } from "../utils/thinkingConfig.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";

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

// Environment variable setup
if (
  !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
  process.env.GOOGLE_AI_API_KEY
) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
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
  constructor(modelName?: string, sdk?: unknown) {
    super(
      modelName,
      "google-ai" as AIProviderName,
      sdk as NeuroLink | undefined,
    );
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
  public getAISDKModel(): LanguageModelV1 {
    const apiKey = this.getApiKey();
    const google = createGoogleGenerativeAI({ apiKey });
    return google(this.modelName);
  }

  public handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      throw new NetworkError(error.message, this.providerName);
    }

    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (message.includes("API_KEY_INVALID")) {
      throw new AuthenticationError(
        "Invalid Google AI API key. Please check your GOOGLE_AI_API_KEY environment variable.",
        this.providerName,
      );
    }

    if (message.includes("RATE_LIMIT_EXCEEDED")) {
      throw new RateLimitError(
        "Google AI rate limit exceeded. Please try again later.",
        this.providerName,
      );
    }

    throw new ProviderError(`Google AI error: ${message}`, this.providerName);
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
   * Estimate token count from text (simple character-based estimation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  // executeGenerate removed - BaseProvider handles all generation with tools
  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ZodUnknownSchema | Schema<unknown>,
  ): Promise<StreamResult> {
    // Check if this is a Gemini 3 model with tools - use native SDK for thought_signature
    const gemini3CheckModelName = options.model || this.modelName;

    // Check for tools from options AND from SDK (MCP tools)
    // Need to check early if we should route to native SDK
    const gemini3CheckShouldUseTools =
      !options.disableTools && this.supportsTools();
    const optionTools = options.tools || {};
    const sdkTools = gemini3CheckShouldUseTools ? await this.getAllTools() : {};
    const combinedToolCount =
      Object.keys(optionTools).length + Object.keys(sdkTools).length;
    const hasTools = gemini3CheckShouldUseTools && combinedToolCount > 0;

    if (isGemini3Model(gemini3CheckModelName) && hasTools) {
      // Merge SDK tools into options for native SDK path
      const mergedOptions = {
        ...options,
        tools: { ...sdkTools, ...optionTools },
      };
      logger.info(
        "[GoogleAIStudio] Routing Gemini 3 to native SDK for tool calling",
        {
          model: gemini3CheckModelName,
          optionToolCount: Object.keys(optionTools).length,
          sdkToolCount: Object.keys(sdkTools).length,
          totalToolCount: combinedToolCount,
        },
      );
      return this.executeNativeGemini3Stream(mergedOptions);
    }

    // Phase 1: if audio input present, bridge to Gemini Live (Studio) using @google/genai
    if (options.input?.audio) {
      return await this.executeAudioStreamViaGeminiLive(options);
    }
    this.validateStreamOptions(options);

    const startTime = Date.now();
    const apiKey = this.getApiKey();

    // Ensure environment variable is set for @ai-sdk/google
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    }

    const model = await this.getAISDKModelWithMiddleware(options);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      // Get tools consistently with generate method (include user-provided RAG tools)
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const baseTools = shouldUseTools ? await this.getAllTools() : {};
      const tools = shouldUseTools
        ? { ...baseTools, ...(options.tools || {}) }
        : {};

      // Build message array from options with multimodal support
      // Using protected helper from BaseProvider to eliminate code duplication
      const messages = await this.buildMessagesForStream(options);

      const result = await streamText({
        model,
        messages: messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens, // No default limit - unlimited unless specified
        tools,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        toolChoice: shouldUseTools ? "auto" : "none",
        abortSignal: timeoutController?.controller.signal,
        experimental_telemetry:
          this.telemetryHandler.getTelemetryConfig(options),
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

      timeoutController?.cleanup();

      // Transform string stream to content object stream using BaseProvider method
      const transformedStream = this.createTextStream(result);

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        result,
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
    const startTime = Date.now();
    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    const apiKey = this.getApiKey();
    const client = await createGoogleGenAIClient(apiKey);
    const modelName = options.model || this.modelName;

    logger.debug("[GoogleAIStudio] Using native @google/genai for Gemini 3", {
      model: modelName,
      hasTools: !!options.tools && Object.keys(options.tools).length > 0,
    });

    // Build contents from input
    const currentContents: Array<{
      role: string;
      parts: Array<{ text: string }>;
    }> = [{ role: "user", parts: [{ text: options.input.text }] }];

    // Convert tools
    let toolsConfig:
      | ReturnType<typeof this.buildNativeToolDeclarations>["toolsConfig"]
      | undefined;
    let executeMap = new Map<string, Tool["execute"]>();

    if (
      options.tools &&
      Object.keys(options.tools).length > 0 &&
      !options.disableTools
    ) {
      const result = this.buildNativeToolDeclarations(options.tools);
      toolsConfig = result.toolsConfig;
      executeMap = result.executeMap;

      logger.debug("[GoogleAIStudio] Converted tools for native SDK", {
        toolCount: toolsConfig[0].functionDeclarations.length,
        toolNames: toolsConfig[0].functionDeclarations.map((t) => t.name),
      });
    }

    const config = this.buildNativeConfig(options, toolsConfig);
    const maxSteps = this.computeMaxSteps(options.maxSteps);

    let finalText = "";
    let lastStepText = "";
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    let step = 0;
    const failedTools = new Map<string, { count: number; lastError: string }>();

    // Agentic loop for tool calling
    while (step < maxSteps) {
      step++;
      logger.debug(`[GoogleAIStudio] Native SDK step ${step}/${maxSteps}`);

      try {
        const stream = await client.models.generateContentStream({
          model: modelName,
          contents: currentContents,
          config,
        });

        const chunkResult = await this.collectStreamChunks(stream);
        totalInputTokens = Math.max(totalInputTokens, chunkResult.inputTokens);
        totalOutputTokens = Math.max(
          totalOutputTokens,
          chunkResult.outputTokens,
        );

        const stepText = this.extractTextFromParts(
          chunkResult.rawResponseParts,
        );

        // If no function calls, we're done
        if (chunkResult.stepFunctionCalls.length === 0) {
          finalText = stepText;
          break;
        }

        lastStepText = stepText;

        logger.debug(
          `[GoogleAIStudio] Executing ${chunkResult.stepFunctionCalls.length} function calls`,
        );

        // Add model response with ALL parts (including thoughtSignature) to history
        currentContents.push({
          role: "model",
          parts:
            chunkResult.rawResponseParts.length > 0
              ? (chunkResult.rawResponseParts as Array<{ text: string }>)
              : (chunkResult.stepFunctionCalls.map((fc) => ({
                  functionCall: fc,
                })) as unknown as Array<{ text: string }>),
        });

        const functionResponses = await this.executeNativeToolCalls(
          chunkResult.stepFunctionCalls,
          executeMap,
          failedTools,
          allToolCalls,
        );

        // Add function responses to history
        currentContents.push({
          role: "function",
          parts: functionResponses as unknown as Array<{ text: string }>,
        });
      } catch (error) {
        logger.error("[GoogleAIStudio] Native SDK error", error);
        throw this.handleProviderError(error);
      }
    }

    timeoutController?.cleanup();

    finalText = this.handleMaxStepsTermination(
      step,
      maxSteps,
      finalText,
      lastStepText,
    );

    const responseTime = Date.now() - startTime;

    // Create async iterable for streaming result
    async function* createTextStream(): AsyncIterable<{ content: string }> {
      yield { content: finalText };
    }

    return {
      stream: createTextStream(),
      provider: this.providerName,
      model: modelName,
      toolCalls: allToolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.args,
      })),
      analytics: Promise.resolve({
        provider: this.providerName,
        model: modelName,
        tokenUsage: {
          input: totalInputTokens,
          output: totalOutputTokens,
          total: totalInputTokens + totalOutputTokens,
        },
        requestDuration: responseTime,
        timestamp: new Date().toISOString(),
      }),
      metadata: {
        streamId: `native-${Date.now()}`,
        startTime,
        responseTime,
        totalToolExecutions: allToolCalls.length,
      },
    };
  }

  /**
   * Execute generate using native @google/genai SDK for Gemini 3 models
   * This bypasses @ai-sdk/google to properly handle thought_signature
   */
  private async executeNativeGemini3Generate(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const apiKey = this.getApiKey();
    const client = await createGoogleGenAIClient(apiKey);
    const modelName = options.model || this.modelName;

    logger.debug(
      "[GoogleAIStudio] Using native @google/genai for Gemini 3 generate",
      {
        model: modelName,
        hasTools: !!options.tools && Object.keys(options.tools).length > 0,
      },
    );

    // Build contents from input
    const promptText = options.prompt || options.input?.text || "";
    const currentContents: Array<{
      role: string;
      parts: unknown[];
    }> = [{ role: "user", parts: [{ text: promptText }] }];

    // Convert tools (merge SDK tools with options.tools)
    let toolsConfig:
      | ReturnType<typeof this.buildNativeToolDeclarations>["toolsConfig"]
      | undefined;
    let executeMap = new Map<string, Tool["execute"]>();

    const shouldUseTools = !options.disableTools;
    if (shouldUseTools) {
      const sdkTools = await this.getAllTools();
      const mergedTools = { ...sdkTools, ...(options.tools || {}) };

      if (Object.keys(mergedTools).length > 0) {
        const result = this.buildNativeToolDeclarations(mergedTools);
        toolsConfig = result.toolsConfig;
        executeMap = result.executeMap;

        logger.debug(
          "[GoogleAIStudio] Converted tools for native SDK generate",
          {
            toolCount: toolsConfig[0].functionDeclarations.length,
            toolNames: toolsConfig[0].functionDeclarations.map((t) => t.name),
          },
        );
      }
    }

    const config = this.buildNativeConfig(options, toolsConfig);

    const startTime = Date.now();
    const maxSteps = this.computeMaxSteps(options.maxSteps);

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
    const failedTools = new Map<string, { count: number; lastError: string }>();

    // Agentic loop for tool calling
    while (step < maxSteps) {
      step++;
      logger.debug(
        `[GoogleAIStudio] Native SDK generate step ${step}/${maxSteps}`,
      );

      try {
        const stream = await client.models.generateContentStream({
          model: modelName,
          contents: currentContents,
          config,
        });

        const chunkResult = await this.collectStreamChunks(stream);
        totalInputTokens = Math.max(totalInputTokens, chunkResult.inputTokens);
        totalOutputTokens = Math.max(
          totalOutputTokens,
          chunkResult.outputTokens,
        );

        const stepText = this.extractTextFromParts(
          chunkResult.rawResponseParts,
        );

        // If no function calls, we're done
        if (chunkResult.stepFunctionCalls.length === 0) {
          finalText = stepText;
          break;
        }

        lastStepText = stepText;

        logger.debug(
          `[GoogleAIStudio] Executing ${chunkResult.stepFunctionCalls.length} function calls in generate`,
        );

        // Add model response with ALL parts (including thoughtSignature) to history
        // This is critical for Gemini 3 - it requires thought signatures in subsequent turns
        currentContents.push({
          role: "model",
          parts:
            chunkResult.rawResponseParts.length > 0
              ? (chunkResult.rawResponseParts as Array<{ text: string }>)
              : (chunkResult.stepFunctionCalls.map((fc) => ({
                  functionCall: fc,
                })) as unknown as Array<{ text: string }>),
        });

        const functionResponses = await this.executeNativeToolCalls(
          chunkResult.stepFunctionCalls,
          executeMap,
          failedTools,
          allToolCalls,
          toolExecutions,
        );

        // Add function responses to history
        currentContents.push({
          role: "function",
          parts: functionResponses,
        });
      } catch (error) {
        logger.error("[GoogleAIStudio] Native SDK generate error", error);
        throw this.handleProviderError(error);
      }
    }

    finalText = this.handleMaxStepsTermination(
      step,
      maxSteps,
      finalText,
      lastStepText,
    );

    const responseTime = Date.now() - startTime;

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
    const sdkTools = shouldUseTools ? await this.getAllTools() : {};
    const hasTools =
      shouldUseTools &&
      (Object.keys(sdkTools).length > 0 ||
        (options.tools && Object.keys(options.tools).length > 0));

    if (isGemini3Model(modelName) && hasTools) {
      // Merge SDK tools into options for native SDK path
      const mergedOptions = {
        ...options,
        tools: { ...sdkTools, ...(options.tools || {}) },
      };
      logger.info(
        "[GoogleAIStudio] Routing Gemini 3 generate to native SDK for tool calling",
        {
          model: modelName,
          sdkToolCount: Object.keys(sdkTools).length,
          optionToolCount: Object.keys(options.tools || {}).length,
          totalToolCount:
            Object.keys(sdkTools).length +
            Object.keys(options.tools || {}).length,
        },
      );
      return this.executeNativeGemini3Generate(mergedOptions);
    }

    // Fall back to BaseProvider implementation
    return super.generate(optionsOrPrompt);
  }

  // ===================
  // NATIVE GEMINI 3 HELPER METHODS
  // ===================

  /**
   * Convert Vercel AI SDK tools to @google/genai FunctionDeclarations and an execute map.
   * Shared by executeNativeGemini3Stream and executeNativeGemini3Generate.
   */
  private buildNativeToolDeclarations(tools: Record<string, Tool>): {
    toolsConfig: Array<{
      functionDeclarations: Array<{
        name: string;
        description: string;
        parametersJsonSchema?: Record<string, unknown>;
      }>;
    }>;
    executeMap: Map<string, Tool["execute"]>;
  } {
    type FunctionDeclaration = {
      name: string;
      description: string;
      parametersJsonSchema?: Record<string, unknown>;
    };

    const functionDeclarations: FunctionDeclaration[] = [];
    const executeMap = new Map<string, Tool["execute"]>();

    for (const [name, tool] of Object.entries(tools)) {
      const decl: FunctionDeclaration = {
        name,
        description: tool.description || `Tool: ${name}`,
      };

      if (tool.parameters) {
        let rawSchema: Record<string, unknown>;

        if (isZodSchema(tool.parameters)) {
          rawSchema = convertZodToJsonSchema(
            tool.parameters as ZodUnknownSchema,
          ) as Record<string, unknown>;
        } else if (typeof tool.parameters === "object") {
          rawSchema = tool.parameters as Record<string, unknown>;
        } else {
          rawSchema = { type: "object", properties: {} };
        }

        decl.parametersJsonSchema = inlineJsonSchema(rawSchema);
        if (decl.parametersJsonSchema.$schema) {
          delete decl.parametersJsonSchema.$schema;
        }
      }

      functionDeclarations.push(decl);

      if (tool.execute) {
        executeMap.set(name, tool.execute);
      }
    }

    return { toolsConfig: [{ functionDeclarations }], executeMap };
  }

  /**
   * Build the native @google/genai config object shared by stream and generate.
   */
  private buildNativeConfig(
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      thinkingConfig?: StreamOptions["thinkingConfig"];
    },
    toolsConfig?: Array<{
      functionDeclarations: Array<{
        name: string;
        description: string;
        parametersJsonSchema?: Record<string, unknown>;
      }>;
    }>,
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {
      temperature: options.temperature ?? 1.0, // Gemini 3 requires 1.0 for tool calling
      maxOutputTokens: options.maxTokens,
    };

    if (toolsConfig) {
      config.tools = toolsConfig;
    }

    if (options.systemPrompt) {
      config.systemInstruction = options.systemPrompt;
    }

    // Add thinking config for Gemini 3
    const nativeThinkingConfig = createNativeThinkingConfig(
      options.thinkingConfig,
    );
    if (nativeThinkingConfig) {
      config.thinkingConfig = nativeThinkingConfig;
    }

    return config;
  }

  /**
   * Compute a safe, clamped maxSteps value.
   */
  private computeMaxSteps(rawMaxSteps?: number): number {
    const value = rawMaxSteps || DEFAULT_MAX_STEPS;
    return Number.isFinite(value) && value > 0
      ? Math.min(Math.floor(value), 100)
      : Math.min(DEFAULT_MAX_STEPS, 100);
  }

  /**
   * Process stream chunks to extract raw response parts, function calls, and usage metadata.
   * Shared by executeNativeGemini3Stream and executeNativeGemini3Generate.
   */
  private async collectStreamChunks(
    stream: AsyncIterable<{
      functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
      [key: string]: unknown;
    }>,
  ): Promise<{
    rawResponseParts: unknown[];
    stepFunctionCalls: Array<{ name: string; args: Record<string, unknown> }>;
    inputTokens: number;
    outputTokens: number;
  }> {
    const rawResponseParts: unknown[] = [];
    const stepFunctionCalls: Array<{
      name: string;
      args: Record<string, unknown>;
    }> = [];
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      // Extract raw parts from candidates FIRST
      // This avoids using chunk.text which triggers SDK warning when
      // non-text parts (thoughtSignature, functionCall) are present
      const chunkRecord = chunk as Record<string, unknown>;
      const candidates = chunkRecord.candidates as
        | Array<Record<string, unknown>>
        | undefined;
      const firstCandidate = candidates?.[0];
      const chunkContent = firstCandidate?.content as
        | Record<string, unknown>
        | undefined;
      if (chunkContent && Array.isArray(chunkContent.parts)) {
        rawResponseParts.push(...chunkContent.parts);
      }
      if (chunk.functionCalls) {
        stepFunctionCalls.push(...chunk.functionCalls);
      }

      // Accumulate usage metadata from chunks
      const usage = chunkRecord.usageMetadata as
        | { promptTokenCount?: number; candidatesTokenCount?: number }
        | undefined;
      if (usage) {
        inputTokens = Math.max(inputTokens, usage.promptTokenCount || 0);
        outputTokens = Math.max(outputTokens, usage.candidatesTokenCount || 0);
      }
    }

    return { rawResponseParts, stepFunctionCalls, inputTokens, outputTokens };
  }

  /**
   * Extract text from raw response parts. Used after collectStreamChunks.
   */
  private extractTextFromParts(rawResponseParts: unknown[]): string {
    return rawResponseParts
      .filter(
        (part): part is { text: string } =>
          typeof (part as Record<string, unknown>).text === "string",
      )
      .map((part) => part.text)
      .join("");
  }

  /**
   * Execute a batch of function calls with retry tracking and permanent failure detection.
   * Shared by executeNativeGemini3Stream and executeNativeGemini3Generate.
   *
   * Returns function responses for history and optional tool execution records for generate.
   */
  private async executeNativeToolCalls(
    stepFunctionCalls: Array<{ name: string; args: Record<string, unknown> }>,
    executeMap: Map<string, Tool["execute"]>,
    failedTools: Map<string, { count: number; lastError: string }>,
    allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }>,
    toolExecutions?: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }>,
  ): Promise<Array<{ functionResponse: { name: string; response: unknown } }>> {
    const functionResponses: Array<{
      functionResponse: { name: string; response: unknown };
    }> = [];

    for (const call of stepFunctionCalls) {
      allToolCalls.push({ toolName: call.name, args: call.args });

      // Check if this tool has already exceeded retry limit
      const failedInfo = failedTools.get(call.name);
      if (failedInfo && failedInfo.count >= DEFAULT_TOOL_MAX_RETRIES) {
        logger.warn(
          `[GoogleAIStudio] Tool "${call.name}" has exceeded retry limit (${DEFAULT_TOOL_MAX_RETRIES}), skipping execution`,
        );

        const errorOutput = {
          error: `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${failedInfo.count} times and will not be retried. Last error: ${failedInfo.lastError}. Please proceed without using this tool or inform the user that this functionality is unavailable.`,
          status: "permanently_failed",
          do_not_retry: true,
        };

        functionResponses.push({
          functionResponse: { name: call.name, response: errorOutput },
        });
        toolExecutions?.push({
          name: call.name,
          input: call.args,
          output: errorOutput,
        });
        continue;
      }

      const execute = executeMap.get(call.name);
      if (execute) {
        try {
          // AI SDK Tool execute requires (args, options) - provide minimal options
          const toolOptions = {
            toolCallId: `${call.name}-${Date.now()}`,
            messages: [],
            abortSignal: undefined as AbortSignal | undefined,
          };
          const result = await execute(call.args, toolOptions);
          functionResponses.push({
            functionResponse: { name: call.name, response: { result } },
          });
          toolExecutions?.push({
            name: call.name,
            input: call.args,
            output: result,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          // Track this failure
          const currentFailInfo = failedTools.get(call.name) || {
            count: 0,
            lastError: "",
          };
          currentFailInfo.count++;
          currentFailInfo.lastError = errorMessage;
          failedTools.set(call.name, currentFailInfo);

          logger.warn(
            `[GoogleAIStudio] Tool "${call.name}" failed (attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}): ${errorMessage}`,
          );

          // Determine if this is a permanent failure
          const isPermanentFailure =
            currentFailInfo.count >= DEFAULT_TOOL_MAX_RETRIES;

          const errorOutput = {
            error: isPermanentFailure
              ? `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${currentFailInfo.count} times with error: ${errorMessage}. This tool will not be retried. Please proceed without using this tool or inform the user that this functionality is unavailable.`
              : `TOOL_EXECUTION_ERROR: ${errorMessage}. Retry attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}.`,
            status: isPermanentFailure ? "permanently_failed" : "failed",
            do_not_retry: isPermanentFailure,
            retry_count: currentFailInfo.count,
            max_retries: DEFAULT_TOOL_MAX_RETRIES,
          };

          functionResponses.push({
            functionResponse: { name: call.name, response: errorOutput },
          });
          toolExecutions?.push({
            name: call.name,
            input: call.args,
            output: errorOutput,
          });
        }
      } else {
        // Tool not found is a permanent error
        const errorOutput = {
          error: `TOOL_NOT_FOUND: The tool "${call.name}" does not exist. Do not attempt to call this tool again.`,
          status: "permanently_failed",
          do_not_retry: true,
        };

        functionResponses.push({
          functionResponse: { name: call.name, response: errorOutput },
        });
        toolExecutions?.push({
          name: call.name,
          input: call.args,
          output: errorOutput,
        });
      }
    }

    return functionResponses;
  }

  /**
   * Handle maxSteps termination by producing a final text when the model
   * was still calling tools when the step limit was reached.
   */
  private handleMaxStepsTermination(
    step: number,
    maxSteps: number,
    finalText: string,
    lastStepText: string,
  ): string {
    if (step >= maxSteps && !finalText) {
      logger.warn(
        `[GoogleAIStudio] Tool call loop terminated after reaching maxSteps (${maxSteps}). ` +
          `Model was still calling tools. Using accumulated text from last step.`,
      );
      return (
        lastStepText ||
        `[Tool execution limit reached after ${maxSteps} steps. The model continued requesting tool calls beyond the limit.]`
      );
    }
    return finalText;
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
    type QueueItem =
      | { type: "audio"; audio: AudioChunk }
      | { type: "end" }
      | { type: "error"; error: unknown };
    const queue: QueueItem[] = [];
    let resolveNext:
      | ((value: IteratorResult<{ type: "audio"; audio: AudioChunk }>) => void)
      | null = null;
    let done = false;

    const push = (item: QueueItem) => {
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

  private getApiKey(): string {
    const apiKey =
      process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

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
