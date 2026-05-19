async function loadBedrockControl() {
  return await import(/* @vite-ignore */ "@aws-sdk/client-bedrock");
}
import type {
  Tool as BedrockTool,
  ContentBlock,
  ConverseCommandInput,
  ConverseCommandOutput,
  ConverseStreamCommandInput,
  Message,
  ToolConfiguration,
  ToolSpecification,
} from "@aws-sdk/client-bedrock-runtime";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
  ImageFormat,
} from "@aws-sdk/client-bedrock-runtime";
import type { DocumentType } from "@smithy/types";
import path from "path";
import type { AIProviderName } from "../constants/enums.js";
import { createAnalytics } from "../core/analytics.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import type { NeuroLink } from "../neurolink.js";
import type {
  JsonValue,
  StreamOptions,
  StreamResult,
  Tool,
  ToolArgs,
  ToolDefinition,
  ZodUnknownSchema,
  ToolWithLegacyParams,
  ToolParameterSchema,
  MessageContent,
  MultimodalChatMessage,
  EnhancedGenerateResult,
  TextGenerationOptions,
  BedrockContentBlock,
  BedrockMessage,
} from "../types/index.js";
import {
  AuthenticationError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { isAbortError, withTimeout } from "../utils/errorHandling.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { logger } from "../utils/logger.js";
import { calculateCost } from "../utils/pricing.js";
import { buildMultimodalMessagesArray } from "../utils/messageBuilder.js";
import { buildMultimodalOptions } from "../utils/multimodalOptionsBuilder.js";
import { convertZodToJsonSchema } from "../utils/schemaConversion.js";
import { type Span, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { tracers } from "../telemetry/index.js";

const bedrockTracer = tracers.provider;

// Bedrock-specific types now imported from ../types/providerSpecific.js

export class AmazonBedrockProvider extends BaseProvider {
  private bedrockClient: BedrockRuntimeClient;
  private conversationHistory: BedrockMessage[] = [];
  private region: string;

  /**
   * Parse the region segment from a Bedrock ARN.
   * Returns null when the input is not an ARN.
   *
   * Supports all AWS partitions:
   * - `arn:aws:bedrock:…`        (commercial)
   * - `arn:aws-cn:bedrock:…`     (China)
   * - `arn:aws-us-gov:bedrock:…` (GovCloud)
   */
  private static extractRegionFromArn(modelId?: string): string | null {
    if (!modelId) {
      return null;
    }
    const match = modelId.match(/^arn:aws[a-z0-9-]*:bedrock:([^:]+):/);
    return match?.[1] ?? null;
  }

  constructor(
    modelName?: string,
    neurolink?: NeuroLink,
    region?: string,
    credentials?: {
      accessKeyId?: string;
      secretAccessKey?: string;
      sessionToken?: string;
      region?: string;
    },
  ) {
    super(modelName, "bedrock" as AIProviderName, neurolink);

    // When the model is given as a Bedrock ARN (e.g. an inference profile
    // like `arn:aws:bedrock:us-east-1:123:inference-profile/foo`), Bedrock
    // requires the runtime client's region to match the region embedded
    // in the ARN — otherwise it returns "The provided model identifier is
    // invalid." Auto-extract so users don't have to keep AWS_REGION in
    // sync with their model ARN.
    const resolvedModel =
      modelName || process.env.BEDROCK_MODEL || this.modelName;
    const arnRegion = AmazonBedrockProvider.extractRegionFromArn(resolvedModel);
    this.region =
      credentials?.region ||
      region ||
      arnRegion ||
      process.env.AWS_REGION ||
      "us-east-1";

    logger.debug(
      "[AmazonBedrockProvider] Starting constructor with extensive logging for debugging",
    );

    // Log environment variables for debugging
    logger.debug(
      `[AmazonBedrockProvider] Environment check: AWS_REGION=${process.env.AWS_REGION || "undefined"}, AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID ? "SET" : "undefined"}, AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY ? "SET" : "undefined"}`,
    );

    try {
      // Create BedrockRuntimeClient with clean configuration like working Bedrock-MCP-Connector
      // Absolutely no proxy interference - let AWS SDK handle everything natively
      logger.debug(
        "[AmazonBedrockProvider] Creating BedrockRuntimeClient with clean configuration",
      );

      this.bedrockClient = new BedrockRuntimeClient({
        region: this.region,
        // Clean configuration - AWS SDK will handle credentials via:
        // 1. IAM roles (preferred in production)
        // 2. Environment variables
        // 3. AWS config files
        // 4. Instance metadata
        ...(credentials?.accessKeyId && credentials?.secretAccessKey
          ? {
              credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
                ...(credentials.sessionToken
                  ? { sessionToken: credentials.sessionToken }
                  : {}),
              },
            }
          : {}),
      });

      logger.debug(
        `[AmazonBedrockProvider] Successfully created BedrockRuntimeClient with model: ${this.modelName}, region: ${this.region}`,
      );
    } catch (error) {
      logger.error(
        `[AmazonBedrockProvider] CRITICAL: Failed to initialize BedrockRuntimeClient:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Perform initial health check to catch credential/connectivity issues early
   * This prevents the health check failure we saw in production logs
   */
  private async performInitialHealthCheck(): Promise<void> {
    const { BedrockClient, ListFoundationModelsCommand } =
      await loadBedrockControl();
    const bedrockClient = new BedrockClient({
      region: this.region,
    });

    try {
      logger.debug(
        "[AmazonBedrockProvider] Starting initial health check to validate credentials and connectivity",
      );

      // Try to list foundation models as a lightweight health check
      const command = new ListFoundationModelsCommand({});
      const startTime = Date.now();

      await bedrockClient.send(command);
      const responseTime = Date.now() - startTime;

      logger.debug(
        `[AmazonBedrockProvider] Health check PASSED - credentials valid, connectivity good, responseTime: ${responseTime}ms`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        `[AmazonBedrockProvider] Health check FAILED - this will cause production failures:`,
        {
          error: errorMessage,
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
          region: process.env.AWS_REGION || "us-east-1",
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        },
      );
      // Don't throw here - let the actual usage fail with better context
    } finally {
      try {
        bedrockClient.destroy();
      } catch {
        // Ignore destroy errors during cleanup
      }
    }
  }

  // Not using AI SDK approach in conversation management
  public getAISDKModel(): never {
    throw new Error("AmazonBedrockProvider does not use AI SDK models");
  }

  public getProviderName(): AIProviderName {
    return "bedrock" as AIProviderName;
  }

  public getDefaultModel(): string {
    return process.env.BEDROCK_MODEL || "anthropic.claude-sonnet-4-6";
  }

  /**
   * Get the default embedding model for Amazon Bedrock
   * @returns The default Bedrock embedding model name
   */
  protected getDefaultEmbeddingModel(): string {
    return (
      process.env.BEDROCK_EMBEDDING_MODEL ||
      process.env.AWS_EMBEDDING_MODEL ||
      "amazon.titan-embed-text-v2:0"
    );
  }

  // Override the main generate method to implement conversation management
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
  ): Promise<EnhancedGenerateResult | null> {
    logger.debug(
      "[AmazonBedrockProvider] generate() called with conversation management",
    );

    const generateStartTime = Date.now();
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    // Clear conversation history for new generation
    this.conversationHistory = [];

    // Check for multimodal input (images, PDFs, CSVs, files)
    // Cast to any to access multimodal properties (runtime check is safe)
    const input = options.input as unknown as StreamOptions["input"];
    const hasMultimodalInput = !!(
      input?.images?.length ||
      input?.content?.length ||
      input?.files?.length ||
      input?.csvFiles?.length ||
      input?.pdfFiles?.length
    );

    if (hasMultimodalInput) {
      logger.debug(
        `[AmazonBedrockProvider] Detected multimodal input in generate(), using multimodal message builder`,
        {
          hasImages: !!input?.images?.length,
          imageCount: input?.images?.length || 0,
          hasContent: !!input?.content?.length,
          contentCount: input?.content?.length || 0,
          hasFiles: !!input?.files?.length,
          fileCount: input?.files?.length || 0,
          hasCSVFiles: !!input?.csvFiles?.length,
          csvFileCount: input?.csvFiles?.length || 0,
          hasPDFFiles: !!input?.pdfFiles?.length,
          pdfFileCount: input?.pdfFiles?.length || 0,
        },
      );

      // Cast options to StreamOptions for multimodal processing
      const streamOptions = options as unknown as StreamOptions;
      const multimodalOptions = buildMultimodalOptions(
        streamOptions,
        this.providerName,
        this.modelName,
      );

      const multimodalMessages = await buildMultimodalMessagesArray(
        multimodalOptions,
        this.providerName,
        this.modelName,
      );

      // Convert to Bedrock format
      this.conversationHistory =
        this.convertToBedrockMessages(multimodalMessages);
    } else {
      logger.debug(
        `[AmazonBedrockProvider] Text-only input in generate(), using simple message builder`,
      );

      // Add user message to conversation - simple text-only case
      const userMessage: BedrockMessage = {
        role: "user",
        content: [{ text: options.prompt }],
      };
      this.conversationHistory.push(userMessage);
    }

    logger.debug(
      `[AmazonBedrockProvider] Starting conversation with ${this.conversationHistory.length} message(s)`,
    );

    // Start conversation loop and return enhanced result
    let text: string;
    let usage: { input: number; output: number; total: number };
    let finishReason: string | undefined;
    try {
      ({ text, usage, finishReason } = await this.conversationLoop(options));
    } catch (error) {
      // Emit failure generation:end so Pipeline B records the failed generation
      const failEmitter = this.neurolink?.getEventEmitter();
      if (failEmitter) {
        failEmitter.emit("generation:end", {
          provider: this.providerName,
          responseTime: Date.now() - generateStartTime,
          timestamp: Date.now(),
          result: {
            content: "",
            usage: { input: 0, output: 0, total: 0 },
            model: this.modelName || this.getDefaultModel(),
            provider: this.providerName,
            finishReason: "error",
          },
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }

    // Emit generation:end so Pipeline B (Langfuse) creates a GENERATION observation.
    // Bedrock bypasses the Vercel AI SDK so experimental_telemetry is never injected;
    // we emit the event manually to fill that gap.
    const generateEmitter = this.neurolink?.getEventEmitter();
    if (generateEmitter) {
      generateEmitter.emit("generation:end", {
        provider: this.providerName,
        responseTime: Date.now() - generateStartTime,
        timestamp: Date.now(),
        result: {
          content: text,
          usage,
          model: this.modelName || this.getDefaultModel(),
          provider: this.providerName,
          finishReason,
        },
        success: true,
      });
    }

    return {
      content: text, // CLI expects 'content' not 'text'
      usage,
      model: this.modelName || this.getDefaultModel(),
      provider: this.getProviderName(),
    };
  }

  private async conversationLoop(options: TextGenerationOptions): Promise<{
    text: string;
    usage: { input: number; output: number; total: number };
    finishReason?: string;
  }> {
    const maxIterations = 10; // Prevent infinite loops
    let iteration = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let lastFinishReason: string | undefined;

    while (iteration < maxIterations) {
      iteration++;
      logger.debug(
        `[AmazonBedrockProvider] Conversation iteration ${iteration}`,
      );

      try {
        logger.debug(`[AmazonBedrockProvider] About to call Bedrock API`);
        const response = await this.callBedrock(options);
        logger.debug(
          `[AmazonBedrockProvider] Received Bedrock response`,
          JSON.stringify(response, null, 2),
        );

        // Accumulate real token counts and capture the stop reason so
        // Pipeline B (Langfuse) gets correct usage and finishReason.
        totalInputTokens += response.usage?.inputTokens ?? 0;
        totalOutputTokens += response.usage?.outputTokens ?? 0;
        if (response.stopReason) {
          lastFinishReason = response.stopReason;
        }

        const result = await this.handleBedrockResponse(response);
        logger.debug(`[AmazonBedrockProvider] Handle response result:`, result);

        if (result.shouldContinue) {
          logger.debug(
            `[AmazonBedrockProvider] Continuing conversation loop...`,
          );
        } else {
          logger.debug(
            `[AmazonBedrockProvider] Conversation completed with final text`,
          );
          logger.debug(
            `[AmazonBedrockProvider] Returning final text: "${result.text}"`,
          );
          return {
            text: result.text || "",
            usage: {
              input: totalInputTokens,
              output: totalOutputTokens,
              total: totalInputTokens + totalOutputTokens,
            },
            finishReason: lastFinishReason,
          };
        }
      } catch (error) {
        logger.error(
          `[AmazonBedrockProvider] Error in conversation loop:`,
          error,
        );
        throw this.handleProviderError(error);
      }
    }

    throw new Error("Conversation loop exceeded maximum iterations");
  }

  private async callBedrock(options: TextGenerationOptions) {
    const startTime = Date.now();
    return bedrockTracer.startActiveSpan(
      "bedrock.generate",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "gen_ai.system": "aws.bedrock",
          "gen_ai.request.model": this.modelName || this.getDefaultModel(),
          "gen_ai.operation.name": "chat",
        },
      },
      async (generateSpan) => {
        logger.info(
          `[AmazonBedrockProvider] Starting Bedrock API call at ${new Date().toISOString()}`,
        );

        try {
          // Pre-call validation and logging
          let region = "unknown";
          try {
            region =
              typeof this.bedrockClient.config.region === "function"
                ? await this.bedrockClient.config.region()
                : (this.bedrockClient.config.region ?? "unknown");
          } catch {
            // Region lookup failed — not critical, only used for logging
          }
          logger.info(`[AmazonBedrockProvider] Client region: ${region}`);
          logger.info(
            `[AmazonBedrockProvider] Model: ${this.modelName || this.getDefaultModel()}`,
          );
          logger.info(
            `[AmazonBedrockProvider] Conversation history length: ${this.conversationHistory.length}`,
          );

          // Get all available tools
          const aiTools = await this.getAllTools();
          const allTools = this.convertAISDKToolsToToolDefinitions(aiTools);
          const toolConfig = this.formatToolsForBedrock(allTools);

          const commandInput: ConverseCommandInput = {
            modelId: this.modelName || this.getDefaultModel(),
            messages: this.convertToAWSMessages(this.conversationHistory),
            system: [
              {
                text:
                  options.systemPrompt ||
                  "You are a helpful assistant with access to external tools. Use tools when necessary to provide accurate information.",
              },
            ],
            inferenceConfig: {
              maxTokens: options.maxTokens, // No default limit - unlimited unless specified
              temperature: options.temperature || 0.7,
            },
          };

          if (toolConfig) {
            commandInput.toolConfig = toolConfig;
            logger.info(
              `[AmazonBedrockProvider] Tools configured: ${toolConfig.tools?.length || 0}`,
            );
          }

          // Log command details for debugging
          logger.info(`[AmazonBedrockProvider] Command input summary:`);
          logger.info(`  - Model ID: ${commandInput.modelId}`);
          logger.info(
            `  - Messages count: ${commandInput.messages?.length || 0}`,
          );
          logger.info(
            `  - System prompts: ${commandInput.system?.length || 0}`,
          );
          logger.info(
            `  - Max tokens: ${commandInput.inferenceConfig?.maxTokens}`,
          );
          logger.info(
            `  - Temperature: ${commandInput.inferenceConfig?.temperature}`,
          );

          logger.debug(
            `[AmazonBedrockProvider] Calling Bedrock with ${this.conversationHistory.length} messages and ${toolConfig?.tools?.length || 0} tools`,
          );

          // Create command and attempt API call
          const command = new ConverseCommand(commandInput);

          logger.debug("[Observability] Bedrock API request", {
            model: commandInput.modelId,
            region: region,
            messageCount: commandInput.messages?.length || 0,
            toolCount: commandInput.toolConfig?.tools?.length || 0,
            maxTokens: commandInput.inferenceConfig?.maxTokens,
          });

          const apiCallStartTime = Date.now();
          const response = await withTimeout(
            this.bedrockClient.send(command),
            120_000,
            new Error("Bedrock API call timed out"),
          );
          const apiCallDuration = Date.now() - apiCallStartTime;

          logger.debug("[Observability] Bedrock API response", {
            model: commandInput.modelId,
            durationMs: apiCallDuration,
            hasContent: !!response.output?.message?.content?.length,
            stopReason: response.stopReason,
            usage: response.usage
              ? {
                  inputTokens: response.usage.inputTokens,
                  outputTokens: response.usage.outputTokens,
                  totalTokens:
                    (response.usage.inputTokens || 0) +
                    (response.usage.outputTokens || 0),
                }
              : undefined,
          });

          logger.info(`[AmazonBedrockProvider] Bedrock API call successful`);
          logger.info(
            `[AmazonBedrockProvider] API call duration: ${apiCallDuration}ms`,
          );

          const totalDuration = Date.now() - startTime;
          logger.info(
            `[AmazonBedrockProvider] Total callBedrock duration: ${totalDuration}ms`,
          );

          generateSpan.setAttribute(
            "gen_ai.response.stop_reason",
            response.stopReason ?? "",
          );
          generateSpan.setAttribute(
            "gen_ai.usage.input_tokens",
            response.usage?.inputTokens ?? 0,
          );
          generateSpan.setAttribute(
            "gen_ai.usage.output_tokens",
            response.usage?.outputTokens ?? 0,
          );
          const cost = calculateCost(this.providerName, this.modelName, {
            input: response.usage?.inputTokens ?? 0,
            output: response.usage?.outputTokens ?? 0,
            total:
              (response.usage?.inputTokens ?? 0) +
              (response.usage?.outputTokens ?? 0),
          });
          if (cost && cost > 0) {
            generateSpan.setAttribute("neurolink.cost", cost);
          }
          generateSpan.setStatus({ code: SpanStatusCode.OK });
          generateSpan.end();
          return response;
        } catch (error) {
          const errorDuration = Date.now() - startTime;

          // Extract AWS metadata for structured logging
          const awsError =
            error && typeof error === "object"
              ? (error as Record<string, unknown>)
              : null;
          const metadata =
            awsError?.$metadata && typeof awsError.$metadata === "object"
              ? (awsError.$metadata as Record<string, unknown>)
              : null;

          logger.debug("[Observability] Bedrock API request failed", {
            model: this.modelName || this.getDefaultModel(),
            durationMs: errorDuration,
            error: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : undefined,
            httpStatus: metadata?.httpStatusCode,
            awsRequestId: metadata?.requestId,
            awsErrorCode: awsError?.Code,
          });

          logger.error(
            `[AmazonBedrockProvider] Bedrock API call failed after ${errorDuration}ms`,
          );

          if (error instanceof Error) {
            logger.error(
              `[AmazonBedrockProvider] Error: ${error.name} - ${error.message}`,
            );
          }

          if (metadata) {
            logger.error(`[AmazonBedrockProvider] AWS SDK metadata`, {
              httpStatus: metadata.httpStatusCode,
              requestId: metadata.requestId,
              attempts: metadata.attempts,
              totalRetryDelay: metadata.totalRetryDelay,
            });
          }

          generateSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          generateSpan.recordException(
            error instanceof Error ? error : new Error(String(error)),
          );
          generateSpan.end();
          throw error;
        }
      },
    ); // end bedrockTracer.startActiveSpan('bedrock.generate')
  }

  private async handleBedrockResponse(
    response: ConverseCommandOutput,
  ): Promise<{ shouldContinue: boolean; text?: string }> {
    logger.debug(
      `[AmazonBedrockProvider] Received response with stopReason: ${response.stopReason}`,
    );

    if (!response.output || !response.output.message) {
      throw new Error("Invalid response structure from Bedrock API");
    }

    const assistantMessage = response.output.message;
    const stopReason = response.stopReason;

    // Add assistant message to conversation history
    const bedrockAssistantMessage: BedrockMessage = {
      role: "assistant",
      content: (assistantMessage.content || []).map((item) => {
        const bedrockItem: BedrockContentBlock = {};
        if ("text" in item && item.text) {
          bedrockItem.text = item.text;
        }
        if ("toolUse" in item && item.toolUse) {
          bedrockItem.toolUse = {
            toolUseId: item.toolUse.toolUseId || "",
            name: item.toolUse.name || "",
            input: (item.toolUse.input as Record<string, unknown>) || {},
          };
        }
        if ("toolResult" in item && item.toolResult) {
          bedrockItem.toolResult = {
            toolUseId: item.toolResult.toolUseId || "",
            content: (item.toolResult.content || []).map((c) => ({
              text:
                typeof c === "object" && "text" in c
                  ? (c.text as string) || ""
                  : "",
            })),
            status: item.toolResult.status || "unknown",
          };
        }
        return bedrockItem;
      }),
    };
    this.conversationHistory.push(bedrockAssistantMessage);

    if (stopReason === "end_turn" || stopReason === "stop_sequence") {
      // Extract text from assistant message
      const textContent = bedrockAssistantMessage.content
        .filter((item: BedrockContentBlock) => item.text)
        .map((item: BedrockContentBlock) => item.text)
        .join(" ");

      return { shouldContinue: false, text: textContent };
    } else if (stopReason === "tool_use") {
      logger.debug(
        `[AmazonBedrockProvider] Tool use detected - executing tools immediately`,
      );

      // Execute all tool uses in the message
      const toolResults = [];

      for (const contentItem of bedrockAssistantMessage.content) {
        if (contentItem.toolUse) {
          logger.debug(
            `[AmazonBedrockProvider] Executing tool: ${contentItem.toolUse.name}`,
          );

          try {
            // Execute tool using BaseProvider's tool execution
            logger.debug(
              `[AmazonBedrockProvider] Debug toolUse.input:`,
              JSON.stringify(contentItem.toolUse.input, null, 2),
            );
            const toolResult = await this.executeSingleTool(
              contentItem.toolUse.name,
              contentItem.toolUse.input || {},
              contentItem.toolUse.toolUseId,
            );

            logger.debug(
              `[AmazonBedrockProvider] Tool execution successful: ${contentItem.toolUse.name}`,
            );

            toolResults.push({
              toolResult: {
                toolUseId: contentItem.toolUse.toolUseId,
                content: [{ text: String(toolResult) }],
                status: "success",
              },
            });
          } catch (error) {
            logger.error(
              `[AmazonBedrockProvider] Tool execution failed: ${contentItem.toolUse.name}`,
              error,
            );

            const errorMessage =
              error instanceof Error ? error.message : String(error);
            // Still create toolResult for failed tools to maintain 1:1 mapping with toolUse blocks
            toolResults.push({
              toolResult: {
                toolUseId: contentItem.toolUse.toolUseId,
                content: [
                  {
                    text: `Error executing tool ${contentItem.toolUse.name}: ${errorMessage}`,
                  },
                ],
                status: "error",
              },
            });
          }
        }
      }

      // Add tool results as user message
      if (toolResults.length > 0) {
        const userMessageWithToolResults: BedrockMessage = {
          role: "user",
          content: toolResults,
        };
        this.conversationHistory.push(userMessageWithToolResults);

        logger.debug(
          `[AmazonBedrockProvider] Added ${toolResults.length} tool results to conversation`,
        );
      }

      return { shouldContinue: true };
    } else if (stopReason === "max_tokens") {
      // Max tokens reached — return what we have rather than continuing,
      // since the model hit the configured limit.
      const textContent = bedrockAssistantMessage.content
        .filter((item: BedrockContentBlock) => item.text)
        .map((item: BedrockContentBlock) => item.text)
        .join(" ");

      return { shouldContinue: false, text: textContent };
    } else {
      logger.warn(
        `[AmazonBedrockProvider] Unrecognized stop reason "${stopReason}", ending conversation.`,
      );
      return { shouldContinue: false, text: "" };
    }
  }

  private convertToAWSMessages(bedrockMessages: BedrockMessage[]): Message[] {
    return bedrockMessages.map((msg) => ({
      role: msg.role,
      content: msg.content.map((item) => {
        if (item.text) {
          return {
            text: item.text,
          } as ContentBlock;
        }
        if (item.image) {
          return {
            image: item.image,
          } as ContentBlock;
        }
        if (item.document) {
          return {
            document: item.document,
          } as ContentBlock;
        }
        if (item.toolUse) {
          return {
            toolUse: {
              toolUseId: item.toolUse.toolUseId,
              name: item.toolUse.name,
              input: item.toolUse.input,
            },
          } as ContentBlock;
        }
        if (item.toolResult) {
          return {
            toolResult: {
              toolUseId: item.toolResult.toolUseId,
              content: item.toolResult.content,
              status: item.toolResult.status,
            },
          } as ContentBlock;
        }
        return { text: "" } as ContentBlock;
      }),
    }));
  }

  private async executeSingleTool(
    toolName: string,
    args: Record<string, unknown>,
    _toolUseId?: string,
  ): Promise<string> {
    return bedrockTracer.startActiveSpan(
      "bedrock.tool.execute",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "gen_ai.tool.name": toolName,
          "gen_ai.system": "aws.bedrock",
        },
      },
      async (span) => {
        try {
          logger.debug(
            `[AmazonBedrockProvider] Executing single tool: ${toolName}`,
            {
              args,
            },
          );

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

          // Apply robust parameter handling like Bedrock-MCP-Connector
          // Bedrock toolUse.input already contains the correct parameter structure
          const toolInput = args || {};

          // Add default parameters for common tools that Claude might call without required params
          if (toolName === "list_directory" && !toolInput.path) {
            toolInput.path = ".";
            logger.debug(
              `[AmazonBedrockProvider] Added default path '.' for list_directory tool`,
            );
          }

          logger.debug(
            `[AmazonBedrockProvider] Tool input parameters:`,
            toolInput,
          );

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
          logger.debug(`[AmazonBedrockProvider] Tool execution result:`, {
            toolName,
            result,
          });

          // Handle ToolResult type
          let finalResult: string;
          if (result && typeof result === "object" && "success" in result) {
            if (result.success && result.data !== undefined) {
              if (typeof result.data === "string") {
                finalResult = result.data;
              } else if (typeof result.data === "object") {
                finalResult = JSON.stringify(result.data, null, 2);
              } else {
                finalResult = String(result.data);
              }
            } else if (result.error) {
              const errorMessage =
                typeof result.error === "string"
                  ? result.error
                  : result.error.message || "Tool execution failed";
              throw new Error(errorMessage);
            } else {
              finalResult = "";
            }
          } else if (typeof result === "string") {
            // Fallback for non-ToolResult return types
            finalResult = result;
          } else if (typeof result === "object") {
            finalResult = JSON.stringify(result, null, 2);
          } else {
            finalResult = String(result);
          }

          span.setStatus({ code: SpanStatusCode.OK });
          return finalResult;
        } catch (error) {
          logger.error(`[AmazonBedrockProvider] Tool execution error:`, {
            toolName,
            error,
          });
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private convertAISDKToolsToToolDefinitions(
    aiTools: Record<string, Tool>,
  ): Record<string, ToolDefinition<ToolArgs, JsonValue>> {
    const result: Record<string, ToolDefinition<ToolArgs, JsonValue>> = {};

    for (const [name, tool] of Object.entries(aiTools)) {
      if ("description" in tool && tool.description) {
        // Extract schema from legacy `parameters` (AI SDK v3/v4) or current `inputSchema` (v6)
        const legacyTool = tool as ToolWithLegacyParams;
        const extractedParams: ToolParameterSchema | undefined =
          (legacyTool.parameters as ToolParameterSchema | undefined) ??
          (tool.inputSchema as ToolParameterSchema | undefined);
        result[name] = {
          description: tool.description,
          parameters: extractedParams,
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

  private formatToolsForBedrock(
    tools: Record<string, ToolDefinition<ToolArgs, JsonValue>>,
  ): ToolConfiguration | null {
    if (!tools || Object.keys(tools).length === 0) {
      return null;
    }

    const bedrockTools: BedrockTool[] = Object.entries(tools).map(
      ([name, tool]) => {
        // Handle Zod schema or plain object schema
        let schema: Record<string, unknown>;

        if (tool.parameters && typeof tool.parameters === "object") {
          // Check if it's a Zod schema
          if ("_def" in tool.parameters) {
            // It's a Zod schema, convert to JSON schema
            schema = convertZodToJsonSchema(
              tool.parameters as ZodUnknownSchema,
            ) as Record<string, unknown>;
          } else {
            // It's already a plain object schema
            schema = tool.parameters as Record<string, unknown>;
          }
        } else {
          schema = {
            type: "object",
            properties: {},
            required: [],
          };
        }

        // Ensure the schema always has type: "object" at the root level
        if (!schema.type || schema.type !== "object") {
          schema = {
            type: "object",
            properties: schema.properties || {},
            required: schema.required || [],
          };
        }

        const toolSpec: ToolSpecification = {
          name,
          description: tool.description,
          inputSchema: {
            json: schema as DocumentType,
          },
        };

        return {
          toolSpec,
        } as BedrockTool;
      },
    );

    logger.debug(
      `[AmazonBedrockProvider] Formatted ${bedrockTools.length} tools for Bedrock`,
    );

    return { tools: bedrockTools };
  }

  // Convert multimodal messages to Bedrock format
  private convertToBedrockMessages(
    messages: MultimodalChatMessage[],
  ): BedrockMessage[] {
    return messages.map((msg) => {
      const bedrockMessage: BedrockMessage = {
        role: msg.role === "system" ? "user" : msg.role,
        content: [],
      };

      if (typeof msg.content === "string") {
        bedrockMessage.content.push({ text: msg.content });
      } else {
        msg.content.forEach((contentItem: MessageContent) => {
          if (contentItem.type === "text" && contentItem.text) {
            bedrockMessage.content.push({ text: contentItem.text });
          } else if (contentItem.type === "image" && contentItem.image) {
            const imageData =
              typeof contentItem.image === "string"
                ? Buffer.from(
                    contentItem.image.replace(/^data:image\/\w+;base64,/, ""),
                    "base64",
                  )
                : contentItem.image;

            let format = contentItem.mimeType?.split("/")[1] || "png";
            if (format === "jpg") {
              format = "jpeg";
            }

            bedrockMessage.content.push({
              image: {
                format:
                  format === "jpeg"
                    ? ImageFormat.JPEG
                    : format === "png"
                      ? ImageFormat.PNG
                      : format === "gif"
                        ? ImageFormat.GIF
                        : ImageFormat.WEBP,
                source: {
                  bytes: imageData,
                },
              },
            });
          } else if (
            contentItem.type === "document" ||
            contentItem.type === "pdf" ||
            (contentItem.type === "file" &&
              contentItem.mimeType?.toLowerCase().startsWith("application/pdf"))
          ) {
            let docData: Buffer;
            if (typeof contentItem.data === "string") {
              const pdfString = contentItem.data.replace(
                /^data:application\/pdf;base64,/i,
                "",
              );
              docData = Buffer.from(pdfString, "base64");
            } else {
              docData = contentItem.data as Buffer;
            }

            // Extract basename and sanitize for Bedrock's filename requirements
            // Bedrock only allows: alphanumeric, whitespace, hyphens, parentheses, brackets
            // NOTE: Periods (.) are NOT allowed, so we remove the extension
            let filename =
              typeof contentItem.name === "string" && contentItem.name
                ? path.basename(contentItem.name)
                : "document-pdf";

            // Remove file extension
            filename = filename.replace(/\.[^.]+$/, "");

            // Replace all disallowed characters with hyphens
            // Bedrock constraint: only alphanumeric, whitespace, hyphens, parentheses, brackets allowed
            filename = filename.replace(/[^a-zA-Z0-9\s\-()[\]]/g, "-");

            // Clean up: remove multiple consecutive hyphens and trim
            filename = filename
              .replace(/-+/g, "-")
              .trim()
              .replace(/^-+|-+$/g, "");

            // Fallback if filename becomes empty after sanitization
            filename = filename || "document";

            bedrockMessage.content.push({
              document: {
                format: "pdf" as const,
                name: filename,
                source: {
                  bytes: docData,
                },
              },
            });
          }
        });
      }

      return bedrockMessage;
    });
  }

  // Bedrock-MCP-Connector compatibility
  getBedrockClient(): BedrockRuntimeClient {
    return this.bedrockClient;
  }

  protected async executeStream(options: StreamOptions): Promise<StreamResult> {
    logger.debug("[TRACE] executeStream ENTRY - starting streaming attempt");
    logger.info(
      "[AmazonBedrockProvider] Attempting real streaming with ConverseStreamCommand",
    );

    return bedrockTracer.startActiveSpan(
      "bedrock.stream",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "gen_ai.system": "aws.bedrock",
          "gen_ai.request.model": this.modelName || this.getDefaultModel(),
          "gen_ai.operation.name": "stream",
        },
      },
      async (streamSpan) => {
        try {
          logger.debug(
            "[TRACE] executeStream TRY block - about to call streamingConversationLoop",
          );
          // Clear conversation history for new streaming session
          this.conversationHistory = [];

          // Check for multimodal input (images, PDFs, CSVs, files)
          const hasMultimodalInput = !!(
            options.input?.images?.length ||
            options.input?.content?.length ||
            options.input?.files?.length ||
            options.input?.csvFiles?.length ||
            options.input?.pdfFiles?.length
          );

          if (hasMultimodalInput) {
            logger.debug(
              `[AmazonBedrockProvider] Detected multimodal input, using multimodal message builder`,
              {
                hasImages: !!options.input?.images?.length,
                imageCount: options.input?.images?.length || 0,
                hasContent: !!options.input?.content?.length,
                contentCount: options.input?.content?.length || 0,
                hasFiles: !!options.input?.files?.length,
                fileCount: options.input?.files?.length || 0,
                hasCSVFiles: !!options.input?.csvFiles?.length,
                csvFileCount: options.input?.csvFiles?.length || 0,
                hasPDFFiles: !!options.input?.pdfFiles?.length,
                pdfFileCount: options.input?.pdfFiles?.length || 0,
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

            // Convert to Bedrock format
            this.conversationHistory =
              this.convertToBedrockMessages(multimodalMessages);
          } else {
            logger.debug(
              `[AmazonBedrockProvider] Text-only input, using simple message builder`,
            );

            // Add user message to conversation - simple text-only case
            const userMessage: BedrockMessage = {
              role: "user",
              content: [{ text: options.input.text }],
            };
            this.conversationHistory.push(userMessage);
          }

          logger.debug(
            `[AmazonBedrockProvider] Starting streaming conversation with ${this.conversationHistory.length} message(s)`,
          );

          // Call the actual streaming implementation that already exists
          logger.debug(
            "[TRACE] executeStream - calling streamingConversationLoop NOW",
          );
          const result = await this.streamingConversationLoop(
            options,
            streamSpan,
          );
          logger.debug(
            "[TRACE] executeStream - streamingConversationLoop SUCCESS, returning result",
          );
          streamSpan.setStatus({ code: SpanStatusCode.OK });
          streamSpan.end();
          return result;
        } catch (error: unknown) {
          logger.debug(
            "[TRACE] executeStream CATCH - error caught from streamingConversationLoop",
          );
          const errorObj = error as Error;

          // Check if error is related to streaming permissions
          const isPermissionError =
            (errorObj as unknown as Record<string, unknown>)?.name ===
              "AccessDeniedException" ||
            (errorObj as unknown as Record<string, unknown>)?.name ===
              "UnauthorizedOperation" ||
            errorObj?.message?.includes(
              "bedrock:InvokeModelWithResponseStream",
            ) ||
            errorObj?.message?.includes("streaming") ||
            errorObj?.message?.includes("ConverseStream");

          logger.debug(
            "[TRACE] executeStream CATCH - checking if permission error",
          );
          logger.debug(
            `[TRACE] executeStream CATCH - isPermissionError=${isPermissionError}`,
          );

          if (isPermissionError) {
            logger.debug(
              "[TRACE] executeStream CATCH - PERMISSION ERROR DETECTED, starting fallback",
            );
            logger.warn(
              `[AmazonBedrockProvider] Streaming permissions not available, falling back to generate method: ${errorObj.message}`,
            );

            streamSpan.addEvent("stream.fallback_to_generate", {
              reason: errorObj.message,
            });

            // Fallback to generate method and convert to streaming format
            const generateResult = await this.generate({
              prompt: options.input.text,
              input: options.input,
              maxTokens: options.maxTokens,
              temperature: options.temperature,
              systemPrompt: options.systemPrompt,
            });

            if (!generateResult) {
              streamSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: "Generate method returned null result",
              });
              streamSpan.end();
              // eslint-disable-next-line preserve-caught-error
              throw new Error("Generate method returned null result");
            }

            streamSpan.setAttribute(
              "gen_ai.response.stop_reason",
              "fallback_end_turn",
            );
            streamSpan.setStatus({ code: SpanStatusCode.OK });
            streamSpan.end();

            // Convert generate result to streaming format.
            // Use whitespace-preserving split (matches BaseProvider's
            // executeFakeStreaming) so newlines, tabs, indentation, code
            // blocks, and markdown tables aren't collapsed to single spaces.
            const stream = new ReadableStream({
              start(controller) {
                const responseText = generateResult.content || "";
                const tokens = responseText.split(/(\s+)/);
                let buffer = "";
                for (let i = 0; i < tokens.length; i++) {
                  buffer += tokens[i];
                  const shouldYield =
                    i === tokens.length - 1 ||
                    buffer.length > 50 ||
                    /[.!?;,]\s*$/.test(buffer);
                  if (shouldYield && buffer.length > 0) {
                    controller.enqueue({ content: buffer });
                    buffer = "";
                  }
                }
                if (buffer.length > 0) {
                  controller.enqueue({ content: buffer });
                }
                controller.close();
              },
            });

            // Convert ReadableStream to AsyncIterable like streamingConversationLoop does
            const asyncIterable = {
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

            return {
              stream: asyncIterable,
              usage: { total: 0, input: 0, output: 0 },
              model: this.modelName || this.getDefaultModel(),
              provider: this.getProviderName(),
              metadata: {
                fallback: true,
              },
            };
          }

          // Re-throw non-permission errors
          streamSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message:
              errorObj instanceof Error ? errorObj.message : String(errorObj),
          });
          streamSpan.recordException(
            errorObj instanceof Error ? errorObj : new Error(String(errorObj)),
          );
          streamSpan.end();
          throw error;
        }
      },
    );
  }

  private async streamingConversationLoop(
    options: StreamOptions,
    streamSpan: Span,
  ): Promise<StreamResult> {
    logger.debug("[TRACE] streamingConversationLoop ENTRY");
    const startTime = Date.now();
    const maxIterations = options.maxSteps || DEFAULT_MAX_STEPS;
    let iteration = 0;

    // Shared counters updated by both the first-iteration inline loop and
    // the processStreamResponse loop. Read by the final generation:end emit
    // so Pipeline B (Langfuse) gets real token counts from Bedrock streams.
    let streamTotalInputTokens = 0;
    let streamTotalOutputTokens = 0;
    let streamLastStopReason: string | undefined;

    // The REAL issue: ReadableStream errors don't bubble up to the caller
    // So we need to make the first streaming call synchronously to test permissions
    try {
      logger.debug(
        "[TRACE] streamingConversationLoop - testing first streaming call",
      );
      const commandInput = await this.prepareStreamCommand(options);
      const command = new ConverseStreamCommand(commandInput);

      logger.debug("[Observability] Bedrock streaming API request", {
        model: commandInput.modelId,
        messageCount: commandInput.messages?.length || 0,
        toolCount: commandInput.toolConfig?.tools?.length || 0,
      });

      streamSpan.addEvent("stream.api_call", {
        "bedrock.message_count": commandInput.messages?.length || 0,
        "bedrock.tool_count": commandInput.toolConfig?.tools?.length || 0,
      });

      const streamStartTime = Date.now();
      const response = await withTimeout(
        this.bedrockClient.send(command),
        120_000,
        new Error("Bedrock streaming API call timed out"),
      );

      logger.debug(
        "[Observability] Bedrock streaming API connection established",
        {
          model: commandInput.modelId,
          durationMs: Date.now() - streamStartTime,
          hasStream: !!response.stream,
        },
      );

      // Process the first response immediately to avoid waste

      const stream = new ReadableStream({
        start: async (controller) => {
          logger.debug(
            "[TRACE] streamingConversationLoop - ReadableStream start() called",
          );
          try {
            // Process the first response we already have, tracking all event types
            let firstStopReason = "";
            if (response.stream) {
              const firstMessageContent: (BedrockContentBlock & {
                _inputBuffer?: string;
              })[] = [];
              let firstText = "";

              for await (const chunk of response.stream) {
                if (chunk.contentBlockStart) {
                  firstMessageContent.push({});
                }

                if (chunk.contentBlockDelta?.delta?.text) {
                  const textDelta = chunk.contentBlockDelta.delta.text;
                  firstText += textDelta;
                  controller.enqueue({ content: textDelta });
                }

                if (chunk.contentBlockStart?.start?.toolUse) {
                  const currentBlock =
                    firstMessageContent[firstMessageContent.length - 1];
                  currentBlock.toolUse = {
                    name: chunk.contentBlockStart.start.toolUse.name || "",
                    input: {},
                    toolUseId:
                      chunk.contentBlockStart.start.toolUse.toolUseId ||
                      `tool_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                  };
                }

                if (chunk.contentBlockDelta?.delta?.toolUse) {
                  const currentBlock =
                    firstMessageContent[firstMessageContent.length - 1];
                  if (!currentBlock.toolUse) {
                    currentBlock.toolUse = {
                      name: "",
                      input: {},
                      toolUseId: `tool_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                    };
                  }
                  const deltaInput =
                    chunk.contentBlockDelta.delta.toolUse.input;
                  if (!deltaInput) {
                    // no input delta
                  } else if (typeof deltaInput === "string") {
                    currentBlock._inputBuffer =
                      (currentBlock._inputBuffer || "") + deltaInput;
                  } else if (
                    typeof deltaInput === "object" &&
                    !Array.isArray(deltaInput)
                  ) {
                    const currentInput = currentBlock.toolUse.input || {};
                    currentBlock.toolUse.input = {
                      ...currentInput,
                      ...(deltaInput as Record<string, unknown>),
                    } as Record<string, unknown>;
                  }
                }

                if (chunk.contentBlockStop) {
                  const currentBlock =
                    firstMessageContent[firstMessageContent.length - 1];
                  if (currentBlock?.toolUse && currentBlock._inputBuffer) {
                    try {
                      currentBlock.toolUse.input = JSON.parse(
                        currentBlock._inputBuffer,
                      );
                    } catch {
                      currentBlock.toolUse.input = {};
                    }
                    delete currentBlock._inputBuffer;
                  }
                  if (firstText && currentBlock && !currentBlock.toolUse) {
                    currentBlock.text = firstText;
                  }
                  firstText = "";
                }

                if (chunk.messageStop) {
                  firstStopReason = chunk.messageStop.stopReason || "end_turn";
                  // Don't break — metadata chunk with usage comes after messageStop
                  continue;
                }

                // Accumulate usage from Bedrock metadata chunk for Pipeline B.
                // The metadata chunk is emitted after messageStop with aggregate usage.
                if (chunk.metadata?.usage) {
                  streamTotalInputTokens +=
                    chunk.metadata.usage.inputTokens ?? 0;
                  streamTotalOutputTokens +=
                    chunk.metadata.usage.outputTokens ?? 0;
                  // Stream is effectively complete after metadata chunk
                  break;
                }
              }

              if (firstStopReason) {
                streamLastStopReason = firstStopReason;
              }

              // Add first assistant message to conversation history
              const firstAssistantMessage: BedrockMessage = {
                role: "assistant",
                content: firstMessageContent,
              };
              this.conversationHistory.push(firstAssistantMessage);

              streamSpan.addEvent("stream.turn_complete", {
                iteration: 0,
                stop_reason: firstStopReason,
              });

              if (firstStopReason === "tool_use") {
                const toolNames = firstMessageContent
                  .flatMap((b) => (b.toolUse?.name ? [b.toolUse.name] : []))
                  .join(", ");
                streamSpan.addEvent("stream.tool_use", {
                  iteration: 0,
                  tool_names: toolNames,
                });
              }

              // Handle the stop reason from the first response
              const shouldContinue = await this.handleStreamStopReason(
                firstStopReason,
                firstAssistantMessage,
                controller,
                options,
              );
              if (!shouldContinue) {
                streamSpan.setAttribute(
                  "gen_ai.response.stop_reason",
                  firstStopReason,
                );
                // Close the controller so downstream `for await` exits;
                // see the close() comment near the bottom of this start()
                // function for the spec rationale.
                controller.close();
                return;
              }
            }

            // Continue with normal iterations if needed
            while (iteration < maxIterations) {
              iteration++;
              logger.debug(
                `[AmazonBedrockProvider] Streaming iteration ${iteration}`,
              );

              const commandInput = await this.prepareStreamCommand(options);
              const { stopReason, assistantMessage, usage } =
                await this.processStreamResponse(commandInput, controller);

              // Accumulate real usage from Bedrock metadata chunks.
              if (usage) {
                streamTotalInputTokens += usage.input;
                streamTotalOutputTokens += usage.output;
              }
              if (stopReason) {
                streamLastStopReason = stopReason;
              }

              streamSpan.addEvent("stream.turn_complete", {
                iteration,
                stop_reason: stopReason,
              });

              if (stopReason === "tool_use") {
                const toolNames = assistantMessage.content
                  .flatMap((b) => (b.toolUse?.name ? [b.toolUse.name] : []))
                  .join(", ");
                streamSpan.addEvent("stream.tool_use", {
                  iteration,
                  tool_names: toolNames,
                });
              }

              const shouldContinue = await this.handleStreamStopReason(
                stopReason,
                assistantMessage,
                controller,
                options,
              );
              if (!shouldContinue) {
                streamSpan.setAttribute(
                  "gen_ai.response.stop_reason",
                  stopReason,
                );
                break;
              }
            }

            if (iteration >= maxIterations) {
              streamSpan.setAttribute(
                "gen_ai.response.stop_reason",
                "max_iterations",
              );
              controller.error(
                new Error("Streaming conversation exceeded maximum iterations"),
              );
              return;
            }
            // CRITICAL: ReadableStream's start() returning does NOT auto-close
            // the controller per the WHATWG Streams spec. Without this, the
            // downstream `for await (const chunk of stream)` in
            // convertToAsyncIterable never sees `done: true` and the
            // consumer hangs forever — manifested as a 240s harness
            // PER_TEST_TIMEOUT_SKIP for `[bedrock] stream tokens`. The first-
            // iteration `return` path and the while-loop natural `break`
            // path both reach here, so closing once at the bottom covers
            // every non-error exit.
            controller.close();
          } catch (error) {
            logger.debug(
              "[TRACE] streamingConversationLoop - CATCH block hit in ReadableStream",
            );
            controller.error(error);
          }
        },
      });

      // Emit generation:end after the stream completes so Pipeline B (Langfuse)
      // creates a GENERATION observation. Bedrock bypasses the Vercel AI SDK so
      // experimental_telemetry is never injected; we emit the event manually.
      const streamEmitter = this.neurolink?.getEventEmitter();
      const streamAsyncIterable = this.convertToAsyncIterable(stream);
      const self = this;

      // Defer analytics resolution until the stream completes so we have
      // real token counts aggregated from Bedrock metadata chunks.
      let resolveAnalytics!: (
        value: ReturnType<typeof createAnalytics>,
      ) => void;
      const analyticsPromise = new Promise<ReturnType<typeof createAnalytics>>(
        (resolve) => {
          resolveAnalytics = resolve;
        },
      );

      const wrappedStreamIterable: AsyncIterable<{ content: string }> = {
        async *[Symbol.asyncIterator]() {
          let streamErrored = false;
          try {
            yield* streamAsyncIterable;
          } catch (error) {
            streamErrored = true;
            throw error;
          } finally {
            const aggregatedUsage = {
              input: streamTotalInputTokens,
              output: streamTotalOutputTokens,
              total: streamTotalInputTokens + streamTotalOutputTokens,
            };

            // Resolve analytics with accumulated token counts from Bedrock
            // metadata chunks so Pipeline A also reports real usage.
            resolveAnalytics(
              createAnalytics(
                self.providerName,
                self.modelName || self.getDefaultModel(),
                { usage: aggregatedUsage },
                Date.now() - startTime,
                {
                  requestId: `bedrock-stream-${Date.now()}`,
                  streamingMode: true,
                },
              ),
            );

            if (streamEmitter) {
              streamEmitter.emit("generation:end", {
                provider: self.providerName,
                responseTime: Date.now() - startTime,
                timestamp: Date.now(),
                result: {
                  content: "",
                  usage: aggregatedUsage,
                  model: self.modelName || self.getDefaultModel(),
                  provider: self.providerName,
                  finishReason: streamErrored ? "error" : streamLastStopReason,
                },
                success: !streamErrored,
              });
            }
          }
        },
      };

      return {
        stream: wrappedStreamIterable,
        usage: { total: 0, input: 0, output: 0 },
        model: this.modelName || this.getDefaultModel(),
        provider: this.getProviderName(),
        analytics: analyticsPromise,
        metadata: {
          startTime,
          streamId: `bedrock-${Date.now()}`,
        },
      };
    } catch (error: unknown) {
      logger.debug(
        "[TRACE] streamingConversationLoop - first streaming call FAILED, throwing",
      );
      throw error; // This will be caught by executeStream
    }
  }

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

  private async prepareStreamCommand(
    options: StreamOptions,
  ): Promise<ConverseStreamCommandInput> {
    // CRITICAL DEBUG: Log conversation history before conversion
    if (logger.shouldLog("debug")) {
      logger.debug(
        `[AmazonBedrockProvider] BEFORE conversion - conversationHistory length: ${this.conversationHistory.length}`,
      );
      this.conversationHistory.forEach((msg, index) => {
        logger.debug(
          `[AmazonBedrockProvider] Message ${index}: role=${msg.role}, content=${JSON.stringify(msg.content)}`,
        );
      });
    }

    // Get all available tools
    // BaseProvider.stream() pre-merges base tools + external tools into options.tools
    const aiTools =
      (options.tools as Record<string, Tool>) || (await this.getAllTools());
    const allTools = this.convertAISDKToolsToToolDefinitions(aiTools);
    const toolConfig = this.formatToolsForBedrock(allTools);

    const convertedMessages = this.convertToAWSMessages(
      this.conversationHistory,
    );
    if (logger.shouldLog("debug")) {
      logger.debug(
        `[AmazonBedrockProvider] AFTER conversion - messages length: ${convertedMessages.length}`,
      );
      convertedMessages.forEach((msg, index) => {
        logger.debug(
          `[AmazonBedrockProvider] Converted Message ${index}: role=${msg.role}, content=${JSON.stringify(msg.content)}`,
        );
      });
    }

    const commandInput: ConverseStreamCommandInput = {
      modelId: this.modelName || this.getDefaultModel(),
      messages: convertedMessages,
      system: [
        {
          text:
            options.systemPrompt ||
            "You are a helpful assistant with access to external tools. Use tools when necessary to provide accurate information.",
        },
      ],
      inferenceConfig: {
        maxTokens: options.maxTokens, // No default limit - unlimited unless specified
        temperature: options.temperature || 0.7,
      },
    };

    if (toolConfig) {
      commandInput.toolConfig = toolConfig;
    }

    logger.debug(
      `[AmazonBedrockProvider] Calling Bedrock streaming with ${this.conversationHistory.length} messages`,
    );

    // DEBUG: Log exact conversation structure being sent to Bedrock
    logger.debug(`[AmazonBedrockProvider] DEBUG - Conversation structure:`);
    this.conversationHistory.forEach((msg, index) => {
      logger.debug(
        `  Message ${index} (${msg.role}): ${msg.content.length} content items`,
      );
      msg.content.forEach((item, itemIndex) => {
        const keys = Object.keys(item);
        logger.debug(`    Content ${itemIndex}: ${keys.join(", ")}`);
      });
    });

    return commandInput;
  }

  private async processStreamResponse(
    commandInput: ConverseStreamCommandInput,
    controller: ReadableStreamDefaultController,
  ): Promise<{
    stopReason: string;
    assistantMessage: BedrockMessage;
    usage?: { input: number; output: number; total: number };
  }> {
    const command = new ConverseStreamCommand(commandInput);

    logger.debug(
      "[Observability] Bedrock streaming API request (continuation)",
      {
        model: commandInput.modelId,
        messageCount: commandInput.messages?.length || 0,
      },
    );

    const iterationStartTime = Date.now();
    const response = await withTimeout(
      this.bedrockClient.send(command),
      120_000,
      new Error("Bedrock streaming API call timed out"),
    );

    logger.debug(
      "[Observability] Bedrock streaming API connection established (continuation)",
      {
        model: commandInput.modelId,
        durationMs: Date.now() - iterationStartTime,
      },
    );

    if (!response.stream) {
      throw new Error("No stream returned from Bedrock");
    }

    const currentMessageContent: (BedrockContentBlock & {
      _inputBuffer?: string;
    })[] = [];
    let stopReason = "";
    let currentText = "";
    let streamUsage:
      | { input: number; output: number; total: number }
      | undefined;

    // Process streaming chunks
    for await (const chunk of response.stream) {
      if (chunk.contentBlockStart) {
        // Starting a new content block
        currentMessageContent.push({});
      }

      if (chunk.contentBlockDelta?.delta?.text) {
        // Text delta - stream it to user
        const textDelta = chunk.contentBlockDelta.delta.text;
        currentText += textDelta;

        controller.enqueue({
          content: textDelta,
        });
      }

      if (chunk.contentBlockStart?.start?.toolUse) {
        // Tool use block starting - initialize tool information
        const currentBlock =
          currentMessageContent[currentMessageContent.length - 1];
        currentBlock.toolUse = {
          name: chunk.contentBlockStart.start.toolUse.name || "",
          input: {}, // Initialize empty - will be populated by delta chunks
          toolUseId:
            chunk.contentBlockStart.start.toolUse.toolUseId ||
            `tool_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        };
      }

      if (chunk.contentBlockDelta?.delta?.toolUse) {
        // Tool use delta - accumulate tool information
        const currentBlock =
          currentMessageContent[currentMessageContent.length - 1];
        if (!currentBlock.toolUse) {
          currentBlock.toolUse = {
            name: "",
            input: {},
            toolUseId: `tool_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          };
        }
        // Accumulate JSON string fragments into _inputBuffer.
        // Bedrock sends toolUse.input as incremental JSON string fragments,
        // not pre-parsed objects. We buffer them and parse at contentBlockStop.
        if (chunk.contentBlockDelta.delta.toolUse.input) {
          const deltaInput = chunk.contentBlockDelta.delta.toolUse.input;
          if (typeof deltaInput === "string") {
            currentBlock._inputBuffer =
              (currentBlock._inputBuffer || "") + deltaInput;
          } else if (
            deltaInput &&
            typeof deltaInput === "object" &&
            !Array.isArray(deltaInput)
          ) {
            // Some SDK versions may deliver pre-parsed objects; merge directly
            const currentInput = currentBlock.toolUse.input || {};
            currentBlock.toolUse.input = {
              ...currentInput,
              ...(deltaInput as Record<string, unknown>),
            } as Record<string, unknown>;
          }
        }
      }

      if (chunk.contentBlockStop) {
        // Content block completed
        const currentBlock =
          currentMessageContent[currentMessageContent.length - 1];

        // Parse accumulated JSON input buffer for tool-use blocks
        if (currentBlock?.toolUse && currentBlock._inputBuffer) {
          try {
            currentBlock.toolUse.input = JSON.parse(currentBlock._inputBuffer);
          } catch {
            currentBlock.toolUse.input = {};
          }
          delete currentBlock._inputBuffer;
        }

        if (currentText && currentBlock && !currentBlock.toolUse) {
          // Only add text to blocks that don't have toolUse
          currentBlock.text = currentText;
        }
        currentText = "";
      }

      if (chunk.messageStop) {
        stopReason = chunk.messageStop.stopReason || "end_turn";
        // Don't break — metadata chunk with usage arrives after messageStop
        continue;
      }

      // Bedrock ConverseStream emits a metadata chunk at the end with
      // aggregate usage. Capture it for Pipeline B telemetry.
      if (chunk.metadata?.usage) {
        const input = chunk.metadata.usage.inputTokens ?? 0;
        const output = chunk.metadata.usage.outputTokens ?? 0;
        streamUsage = {
          input,
          output,
          total: chunk.metadata.usage.totalTokens ?? input + output,
        };
        // Stream is effectively complete after metadata chunk
        break;
      }
    }

    // Add assistant message to conversation history
    const assistantMessage: BedrockMessage = {
      role: "assistant",
      content: currentMessageContent,
    };
    this.conversationHistory.push(assistantMessage);

    return { stopReason, assistantMessage, usage: streamUsage };
  }

  private async handleStreamStopReason(
    stopReason: string,
    assistantMessage: BedrockMessage,
    controller: ReadableStreamDefaultController,
    options: StreamOptions,
  ): Promise<boolean> {
    if (stopReason === "end_turn" || stopReason === "stop_sequence") {
      // Conversation completed
      controller.close();
      return false;
    } else if (stopReason === "tool_use") {
      logger.debug(
        `[AmazonBedrockProvider] Tool use detected in streaming - executing tools`,
      );

      await this.executeStreamTools(assistantMessage.content, options);
      return true; // Continue conversation loop
    } else if (stopReason === "max_tokens") {
      // Max tokens reached — close the stream rather than continuing,
      // since the model hit the configured limit.
      controller.close();
      return false;
    } else {
      // Unknown stop reason - end conversation
      controller.close();
      return false;
    }
  }

  private async executeStreamTools(
    messageContent: BedrockContentBlock[],
    options: StreamOptions,
  ): Promise<void> {
    // Execute all tool uses in the message - ensure 1:1 mapping like Bedrock-MCP-Connector
    const toolResults = [];
    let toolUseCount = 0;

    // Track tool calls and results for storage (similar to Vertex onStepFinish)
    const toolCalls: Array<{
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

    // Count toolUse blocks first to ensure 1:1 mapping
    for (const contentItem of messageContent) {
      if (contentItem.toolUse) {
        toolUseCount++;
      }
    }

    logger.debug(
      `[AmazonBedrockProvider] Found ${toolUseCount} toolUse blocks in assistant message`,
    );

    for (const contentItem of messageContent) {
      if (contentItem.toolUse) {
        logger.debug(
          `[AmazonBedrockProvider] Executing tool: ${contentItem.toolUse.name}`,
        );

        // Track tool call
        toolCalls.push({
          type: "tool-call",
          toolCallId: contentItem.toolUse.toolUseId,
          toolName: contentItem.toolUse.name,
          args: contentItem.toolUse.input || {},
        });

        try {
          const toolResult = await this.executeSingleTool(
            contentItem.toolUse.name,
            contentItem.toolUse.input || {},
            contentItem.toolUse.toolUseId,
          );

          logger.debug(
            `[AmazonBedrockProvider] Tool execution successful: ${contentItem.toolUse.name}`,
          );

          // Track tool result for storage
          toolResultsForStorage.push({
            type: "tool-result",
            toolCallId: contentItem.toolUse.toolUseId,
            toolName: contentItem.toolUse.name,
            result: toolResult,
          });

          // Ensure exact structure matching Bedrock-MCP-Connector
          toolResults.push({
            toolResult: {
              toolUseId: contentItem.toolUse.toolUseId,
              content: [{ text: String(toolResult) }],
              status: "success",
            },
          });
        } catch (error) {
          logger.error(
            `[AmazonBedrockProvider] Tool execution failed: ${contentItem.toolUse.name}`,
            error,
          );

          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // Track failed tool result
          toolResultsForStorage.push({
            type: "tool-result",
            toolCallId: contentItem.toolUse.toolUseId,
            toolName: contentItem.toolUse.name,
            result: { error: errorMessage },
          });

          toolResults.push({
            toolResult: {
              toolUseId: contentItem.toolUse.toolUseId,
              content: [
                {
                  text: `Error executing tool ${contentItem.toolUse.name}: ${errorMessage}`,
                },
              ],
              status: "error",
            },
          });
        }
      }
    }

    logger.debug(
      `[AmazonBedrockProvider] Created ${toolResults.length} toolResult blocks for ${toolUseCount} toolUse blocks`,
    );

    // Validate 1:1 mapping before adding to conversation
    if (toolResults.length !== toolUseCount) {
      logger.error(
        `[AmazonBedrockProvider] Mismatch: ${toolResults.length} toolResults vs ${toolUseCount} toolUse blocks`,
      );
      throw new Error(
        `Tool mapping mismatch: ${toolResults.length} toolResults for ${toolUseCount} toolUse blocks`,
      );
    }

    // Add tool results as user message - exact structure like Bedrock-MCP-Connector
    if (toolResults.length > 0) {
      const userMessageWithToolResults: BedrockMessage = {
        role: "user",
        content: toolResults,
      };
      this.conversationHistory.push(userMessageWithToolResults);

      logger.debug(
        `[AmazonBedrockProvider] Added ${toolResults.length} tool results to conversation (1:1 mapping validated)`,
      );

      // Emit tool:end for each completed tool result so Pipeline B
      // captures telemetry for Bedrock-driven tool calls (gap S2).
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

      // Store tool execution for analytics and debugging (similar to Vertex onStepFinish)
      this.handleToolExecutionStorage(
        toolCalls,
        toolResultsForStorage,
        options,
        new Date(),
      ).catch((error: unknown) => {
        logger.warn("[AmazonBedrockProvider] Failed to store tool executions", {
          provider: this.providerName,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }

  /**
   * Health check for Amazon Bedrock service
   * Uses ListFoundationModels API to validate connectivity and permissions
   */
  async checkBedrockHealth(): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Create a separate BedrockClient for health checks (not BedrockRuntimeClient)
    // Use simple configuration like working example - no custom proxy handler
    const { BedrockClient, ListFoundationModelsCommand } =
      await loadBedrockControl();
    const healthCheckClient = new BedrockClient({
      region: process.env.AWS_REGION || "us-east-1",
    });

    try {
      logger.debug("[AmazonBedrockProvider] Starting health check...");

      const command = new ListFoundationModelsCommand({});
      const response = await healthCheckClient.send(command, {
        abortSignal: controller.signal,
      });

      const models = response.modelSummaries || [];
      const activeModels = models.filter(
        (model) => model.modelLifecycle?.status === "ACTIVE",
      );

      logger.debug(
        `[AmazonBedrockProvider] Health check passed - Found ${activeModels.length} active models out of ${models.length} total models`,
      );

      if (activeModels.length === 0) {
        throw new Error("No active foundation models available in the region");
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      const errorObj = error as Record<string, unknown>;

      if (isAbortError(error)) {
        throw new Error("Bedrock health check timed out after 10 seconds", {
          cause: error,
        });
      }

      const errorMessage =
        typeof errorObj.message === "string" ? errorObj.message : "";
      if (
        errorMessage.includes("UnauthorizedOperation") ||
        errorMessage.includes("AccessDenied")
      ) {
        throw new Error(
          "Bedrock access denied. Check your AWS credentials and IAM permissions for bedrock:ListFoundationModels",
          { cause: error },
        );
      }

      if (errorObj.code === "ECONNREFUSED" || errorObj.code === "ENOTFOUND") {
        throw new Error(
          "Unable to connect to Bedrock service. Check your network connectivity and AWS region configuration",
          { cause: error },
        );
      }

      logger.error("[AmazonBedrockProvider] Health check failed:", error);
      throw new Error(
        `Bedrock health check failed: ${errorMessage || "Unknown error"}`,
        { cause: error },
      );
    } finally {
      clearTimeout(timeoutId);
      try {
        healthCheckClient.destroy();
      } catch {
        // Ignore destroy errors during cleanup
      }
    }
  }

  protected formatProviderError(error: unknown): Error {
    // Handle AWS SDK specific errors
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("AccessDeniedException")) {
      return new AuthenticationError(
        "AWS Bedrock access denied. Check your credentials and permissions.",
        this.providerName,
      );
    }

    if (message.includes("ValidationException")) {
      return new ProviderError(
        `Validation error: ${message}`,
        this.providerName,
      );
    }

    // Check for AWS-specific throttling BEFORE generic mapping
    const errName = (error as { name?: string })?.name ?? "";
    const errCode = (error as { code?: string })?.code ?? "";
    if (
      errName === "ThrottlingException" ||
      errCode === "ThrottlingException"
    ) {
      return new RateLimitError(
        `Bedrock rate limit (throttled): ${error instanceof Error ? error.message : String(error)}`,
        "bedrock",
      );
    }

    return new ProviderError(
      `AWS Bedrock error: ${message}`,
      this.providerName,
    );
  }

  /**
   * Generate embeddings for text using Amazon Bedrock embedding models
   * Uses the native AWS SDK InvokeModel command for Titan embeddings
   * @param text - The text to embed
   * @param modelName - The embedding model to use (default: amazon.titan-embed-text-v2:0)
   * @returns Promise resolving to the embedding vector
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const embeddingModelName = modelName || "amazon.titan-embed-text-v2:0";

    logger.debug("Generating embedding", {
      provider: this.providerName,
      model: embeddingModelName,
      textLength: text.length,
    });

    try {
      const { InvokeModelCommand } =
        await import("@aws-sdk/client-bedrock-runtime");

      // Titan Embed models expect a specific input format
      const requestBody = JSON.stringify({
        inputText: text,
      });

      const command = new InvokeModelCommand({
        modelId: embeddingModelName,
        contentType: "application/json",
        accept: "application/json",
        body: requestBody,
      });

      const response = await withTimeout(
        this.bedrockClient.send(command),
        60_000,
        new Error("Bedrock embedding API call timed out"),
      );

      // Parse the response
      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body),
      ) as { embedding: number[] };

      if (!responseBody.embedding || !Array.isArray(responseBody.embedding)) {
        throw new Error("Invalid embedding response from Bedrock");
      }

      logger.debug("Embedding generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        embeddingDimension: responseBody.embedding.length,
      });

      return responseBody.embedding;
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
   * @param modelName - The embedding model to use (default: amazon.titan-embed-text-v2:0)
   * @returns Promise resolving to an array of embedding vectors
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    const embeddingModelName = modelName || "amazon.titan-embed-text-v2:0";

    logger.debug("Generating batch embeddings", {
      provider: this.providerName,
      model: embeddingModelName,
      count: texts.length,
    });

    try {
      const embeddings = await Promise.all(
        texts.map((text) => this.embed(text, embeddingModelName)),
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
}
