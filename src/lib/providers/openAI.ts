import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type LanguageModelV1, type Tool } from "ai";
import type { ValidationSchema } from "../types/typeAliases.js";
import { AIProviderName } from "../types/index.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/errors.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import type { UnknownRecord } from "../types/common.js";
import type { NeuroLink } from "../neurolink.js";
import {
  validateApiKey,
  createOpenAIConfig,
  getProviderModel,
} from "../utils/providerConfig.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import { buildMessagesArray } from "../utils/messageBuilder.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import { isZodSchema } from "../utils/schemaConversion.js";

// Configuration helpers - now using consolidated utility
const getOpenAIApiKey = (): string => {
  return validateApiKey(createOpenAIConfig());
};

const getOpenAIModel = (): string => {
  return getProviderModel("OPENAI_MODEL", "gpt-4o");
};

/**
 * OpenAI Provider v2 - BaseProvider Implementation
 * Migrated to use factory pattern with exact Google AI provider pattern
 */
export class OpenAIProvider extends BaseProvider {
  private model: LanguageModelV1;

  constructor(modelName?: string, neurolink?: NeuroLink) {
    super(modelName || getOpenAIModel(), AIProviderName.OPENAI, neurolink);

    // Initialize OpenAI provider with proxy support
    const openai = createOpenAI({
      apiKey: getOpenAIApiKey(),
      fetch: createProxyFetch(),
    });

    // Initialize model
    this.model = openai(this.modelName);

    logger.debug("OpenAIProvider constructor called", {
      model: this.modelName,
      provider: this.providerName,
      supportsTools: this.supportsTools(),
      className: this.constructor.name,
    });
  }

  // ===================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================

  /**
   * Check if this provider supports tool/function calling
   */
  supportsTools(): boolean {
    return true; // Re-enable tools now that we understand the issue
  }

  public getProviderName(): AIProviderName {
    return AIProviderName.OPENAI;
  }

  public getDefaultModel(): string {
    return getOpenAIModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for OpenAI
   */
  public getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  /**
   * OpenAI-specific tool validation and filtering
   * Filters out tools that might cause streaming issues
   */
  private validateAndFilterToolsForOpenAI(
    tools: Record<string, Tool>,
  ): Record<string, Tool> {
    const validTools: Record<string, Tool> = {};

    for (const [name, tool] of Object.entries(tools)) {
      try {
        // Basic validation - ensure tool has required structure
        if (tool && typeof tool === "object") {
          // Check if tool has description (required by OpenAI)
          if (tool.description && typeof tool.description === "string") {
            // Keep the original tool structure - AI SDK will handle Zod schema conversion internally
            const processedTool = { ...tool };

            // Validate that Zod schemas are properly structured for AI SDK processing
            if (tool.parameters && isZodSchema(tool.parameters)) {
              logger.debug(
                `OpenAI: Tool ${name} has Zod schema - AI SDK will handle conversion`,
              );

              // Basic validation that the Zod schema has the required structure
              this.validateZodSchema(name, tool.parameters);
            }

            // Include the tool with original Zod schema for AI SDK processing
            if (this.isValidToolStructure(processedTool)) {
              validTools[name] = processedTool;
            } else {
              logger.warn(
                `OpenAI: Filtering out tool with invalid structure: ${name}`,
                {
                  parametersType: typeof processedTool.parameters,
                  hasDescription: !!processedTool.description,
                  hasExecute: !!processedTool.execute,
                },
              );
            }
          } else {
            logger.warn(
              `OpenAI: Filtering out tool without description: ${name}`,
            );
          }
        } else {
          logger.warn(`OpenAI: Filtering out invalid tool: ${name}`);
        }
      } catch (error) {
        logger.warn(`OpenAI: Error validating tool ${name}:`, error);
      }
    }

    return validTools;
  }

  /**
   * Validate Zod schema structure
   */
  private validateZodSchema(toolName: string, schema: unknown): void {
    try {
      const zodSchema = schema as {
        _def?: { typeName?: string };
      };
      if (zodSchema._def && zodSchema._def.typeName) {
        logger.debug(`OpenAI: Zod schema for ${toolName} appears valid`, {
          typeName: zodSchema._def.typeName,
        });
      } else {
        logger.warn(
          `OpenAI: Zod schema for ${toolName} missing typeName - may cause issues`,
        );
      }
    } catch (zodValidationError) {
      logger.warn(
        `OpenAI: Zod schema validation failed for ${toolName}:`,
        zodValidationError,
      );
      // Continue anyway - let AI SDK handle it
    }
  }

  /**
   * Validate tool structure for OpenAI compatibility
   * More lenient validation to avoid filtering out valid tools
   */
  private isValidToolStructure(tool: unknown): boolean {
    if (!tool || typeof tool !== "object") {
      return false;
    }

    const toolObj = tool as Record<string, unknown>;

    // Ensure tool has description and execute function
    if (!toolObj.description || typeof toolObj.description !== "string") {
      return false;
    }

    if (!toolObj.execute || typeof toolObj.execute !== "function") {
      return false;
    }

    return this.isValidToolParameters(toolObj.parameters);
  }

  /**
   * Validate tool parameters for OpenAI compatibility
   * Ensures the tool has either valid Zod schema or valid JSON schema
   */
  private isValidToolParameters(parameters: unknown): boolean {
    if (!parameters) {
      // For OpenAI, tools without parameters need an empty object schema
      return true;
    }

    // Check if it's a Zod schema - these are valid
    if (isZodSchema(parameters)) {
      return true;
    }

    // Check if it's a JSON schema
    if (typeof parameters !== "object" || parameters === null) {
      return false;
    }

    const params = parameters as Record<string, unknown>;

    // If it's a JSON schema, it should have type "object" for OpenAI
    if (params.type && params.type !== "object") {
      return false;
    }

    // OpenAI requires schemas to have properties field, even if empty
    // If there's no properties field, the schema is incomplete
    if (params.type === "object" && !params.properties) {
      logger.warn(`Tool parameter schema missing properties field:`, params);
      return false;
    }

    // If properties exist, they should be an object
    if (params.properties && typeof params.properties !== "object") {
      return false;
    }

    // If required exists, it should be an array
    if (params.required && !Array.isArray(params.required)) {
      return false;
    }

    return true;
  }

  public handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      throw new NetworkError(error.message, this.providerName);
    }

    const errorObj = error as UnknownRecord;
    const message =
      errorObj?.message && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";
    const errorType =
      errorObj?.type && typeof errorObj.type === "string"
        ? errorObj.type
        : undefined;

    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key") ||
      errorType === "invalid_api_key"
    ) {
      throw new AuthenticationError(
        "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.",
        this.providerName,
      );
    }

    if (message.includes("rate limit") || errorType === "rate_limit_error") {
      throw new RateLimitError(
        "OpenAI rate limit exceeded. Please try again later.",
        this.providerName,
      );
    }

    if (message.includes("model_not_found")) {
      throw new InvalidModelError(
        `Model not found: ${this.modelName}`,
        this.providerName,
      );
    }

    // Generic provider error
    throw new ProviderError(`OpenAI error: ${message}`, this.providerName);
  }

  /**
   * executeGenerate method removed - generation is now handled by BaseProvider.
   * For details on the changes and migration steps, refer to the BaseProvider documentation
   * and the migration guide in the project repository.
   */

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const startTime = Date.now();
    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      // Get tools consistently with generate method
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const allTools = shouldUseTools ? await this.getAllTools() : {};

      // OpenAI-specific fix: Validate tools format and filter out problematic ones
      let tools = this.validateAndFilterToolsForOpenAI(allTools);

      // OpenAI max tools limit - configurable via environment variable
      const MAX_TOOLS = parseInt(process.env.OPENAI_MAX_TOOLS || "150", 10);
      if (Object.keys(tools).length > MAX_TOOLS) {
        logger.warn(
          `OpenAI: Too many tools (${Object.keys(tools).length}), limiting to ${MAX_TOOLS} tools`,
        );
        const toolEntries = Object.entries(tools);
        tools = Object.fromEntries(toolEntries.slice(0, MAX_TOOLS));
      }

      // Count tools with Zod schemas for debugging
      const zodToolsCount = Object.values(allTools).filter(
        (tool) =>
          tool &&
          typeof tool === "object" &&
          tool.parameters &&
          isZodSchema(tool.parameters),
      ).length;

      logger.info("OpenAI streaming tools", {
        shouldUseTools,
        allToolsCount: Object.keys(allTools).length,
        filteredToolsCount: Object.keys(tools).length,
        zodToolsCount,
        toolNames: Object.keys(tools),
        filteredOutTools: Object.keys(allTools).filter((name) => !tools[name]),
      });

      // Build message array from options
      const messages = buildMessagesArray(options);

      // Debug the actual request being sent to OpenAI
      logger.debug(`OpenAI: streamText request parameters:`, {
        modelName: this.modelName,
        messagesCount: messages.length,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        toolsCount: Object.keys(tools).length,
        toolChoice:
          shouldUseTools && Object.keys(tools).length > 0 ? "auto" : "none",
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        firstToolExample:
          Object.keys(tools).length > 0
            ? {
                name: Object.keys(tools)[0],
                description: tools[Object.keys(tools)[0]]?.description,
                parametersType: typeof tools[Object.keys(tools)[0]]?.parameters,
              }
            : "no-tools",
      });

      const model = await this.getAISDKModelWithMiddleware(options); // This is where network connection happens!
      const result = await streamText({
        model,
        messages: messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens, // No default limit - unlimited unless specified
        tools,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        toolChoice:
          shouldUseTools && Object.keys(tools).length > 0 ? "auto" : "none",
        abortSignal: timeoutController?.controller.signal,
        onStepFinish: ({ toolCalls, toolResults }) => {
          logger.info("Tool execution completed", { toolResults, toolCalls });

          // Handle tool execution storage
          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
          ).catch((error: unknown) => {
            logger.warn("[OpenAIProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
      });

      timeoutController?.cleanup();

      // Debug the actual result structure
      logger.debug(`OpenAI: streamText result structure:`, {
        resultKeys: Object.keys(result),
        hasTextStream: !!result.textStream,
        hasToolCalls: !!result.toolCalls,
        hasToolResults: !!result.toolResults,
        resultType: typeof result,
      });

      // Transform string stream to content object stream using fullStream
      const transformedStream = async function* () {
        try {
          logger.debug(`OpenAI: Starting stream transformation`, {
            hasTextStream: !!result.textStream,
            hasFullStream: !!result.fullStream,
            resultKeys: Object.keys(result),
            toolsEnabled: shouldUseTools,
            toolsCount: Object.keys(tools).length,
          });

          let chunkCount = 0;
          let contentYielded = 0;
          // Try fullStream first (handles both text and tool calls), fallback to textStream
          const streamToUse = result.fullStream || result.textStream;
          if (!streamToUse) {
            logger.error("OpenAI: No stream available in result", {
              resultKeys: Object.keys(result),
            });
            return;
          }

          logger.debug(`OpenAI: Stream source selected:`, {
            usingFullStream: !!result.fullStream,
            usingTextStream: !!result.textStream && !result.fullStream,
            streamSourceType: result.fullStream ? "fullStream" : "textStream",
          });

          for await (const chunk of streamToUse) {
            chunkCount++;
            logger.debug(`OpenAI: Processing chunk ${chunkCount}:`, {
              chunkType: typeof chunk,
              chunkValue:
                typeof chunk === "string"
                  ? (chunk as string).substring(0, 50)
                  : "not-string",
              chunkKeys:
                chunk && typeof chunk === "object"
                  ? Object.keys(chunk)
                  : "not-object",
              hasText: chunk && typeof chunk === "object" && "text" in chunk,
              hasTextDelta:
                chunk && typeof chunk === "object" && "textDelta" in chunk,
              hasType: chunk && typeof chunk === "object" && "type" in chunk,
              chunkTypeValue:
                chunk && typeof chunk === "object" && "type" in chunk
                  ? (chunk as { type: unknown }).type
                  : "no-type",
            });

            let contentToYield: string | null = null;

            // Handle different chunk types from fullStream
            if (chunk && typeof chunk === "object") {
              // Log the full chunk structure for debugging (debug mode only)
              if (process.env.NEUROLINK_DEBUG === "true") {
                logger.debug(`OpenAI: Full chunk structure:`, {
                  chunkKeys: Object.keys(chunk),
                  fullChunk: JSON.stringify(chunk).substring(0, 500),
                });
              }

              if ("type" in chunk && chunk.type === "error") {
                // Handle error chunks when tools are enabled
                const errorChunk = chunk as {
                  type: "error";
                  error: Record<string, unknown>;
                };
                logger.error(`OpenAI: Error chunk received:`, {
                  errorType: errorChunk.type,
                  errorDetails: errorChunk.error,
                  fullChunk: JSON.stringify(chunk),
                });

                // Throw a more descriptive error for tool-related issues
                const errorMessage =
                  errorChunk.error &&
                  typeof errorChunk.error === "object" &&
                  "message" in errorChunk.error
                    ? String(errorChunk.error.message)
                    : "OpenAI API error when tools are enabled";
                throw new Error(
                  `OpenAI streaming error with tools: ${errorMessage}. Try disabling tools with --disableTools`,
                );
              } else if (
                "type" in chunk &&
                chunk.type === "text-delta" &&
                "textDelta" in chunk
              ) {
                // Text delta from fullStream
                contentToYield = chunk.textDelta as string;
                logger.debug(`OpenAI: Found text-delta:`, {
                  textDelta: contentToYield,
                });
              } else if ("text" in chunk) {
                // Direct text chunk
                contentToYield = chunk.text as string;
                logger.debug(`OpenAI: Found direct text:`, {
                  text: contentToYield,
                });
              } else {
                // Log unhandled chunks in debug mode only
                if (process.env.NEUROLINK_DEBUG === "true") {
                  logger.debug(`OpenAI: Unhandled object chunk:`, {
                    chunkKeys: Object.keys(chunk),
                    chunkType: chunk.type || "no-type",
                    fullChunk: JSON.stringify(chunk).substring(0, 500),
                  });
                }
              }
            } else if (typeof chunk === "string") {
              // Direct string chunk from textStream
              contentToYield = chunk;
              logger.debug(`OpenAI: Found string chunk:`, {
                content: contentToYield,
              });
            } else {
              logger.warn(`OpenAI: Unhandled chunk type:`, {
                type: typeof chunk,
                value: String(chunk).substring(0, 100),
              });
            }

            if (contentToYield) {
              contentYielded++;
              logger.debug(`OpenAI: Yielding content ${contentYielded}:`, {
                content: contentToYield.substring(0, 50),
                length: contentToYield.length,
              });
              yield { content: contentToYield };
            }
          }

          logger.debug(`OpenAI: Stream transformation completed`, {
            totalChunks: chunkCount,
            contentYielded,
            success: contentYielded > 0,
          });

          if (contentYielded === 0) {
            logger.warn(
              `OpenAI: No content was yielded from stream despite processing ${chunkCount} chunks`,
            );
          }
        } catch (streamError) {
          logger.error(`OpenAI: Stream transformation error:`, streamError);
          throw streamError;
        }
      };

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        result,
        Date.now() - startTime,
        {
          requestId: `openai-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream(),
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: {
          startTime,
          streamId: `openai-${Date.now()}`,
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }
}

// Export for factory registration
export default OpenAIProvider;
