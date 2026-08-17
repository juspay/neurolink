import type {
  Tool as BedrockTool,
  ContentBlock,
  Message,
  ToolConfiguration,
  ToolSpecification,
} from "@aws-sdk/client-bedrock-runtime";
import {
  BedrockRuntimeClient,
  ImageFormat,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { DocumentType } from "@smithy/types";
import path from "path";
import type { AIProviderName } from "../../constants/enums.js";
import { createAnalytics } from "../../core/analytics.js";
import { BaseProvider } from "../../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../../core/constants.js";
import { runAgenticLoop } from "../../core/loopEngine.js";
import { createBedrockLoopAdapter } from "./loopAdapter.js";
import type { NeuroLink } from "../../neurolink.js";
import type {
  AgenticLoopStepRequest,
  AgenticLoopUsage,
  EmbedInput,
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
  BedrockMessage,
  ProviderErrorRule,
} from "../../types/index.js";
import {
  AuthenticationError,
  ProviderError,
  RateLimitError,
} from "../../types/index.js";
import { classifyProviderError } from "../../utils/errorClassifier.js";
import { isAbortError, withTimeout } from "../../utils/errorHandling.js";
import { logger } from "../../utils/logger.js";
import { resolveSamplingParams } from "../../models/modelRegistry.js";
import { buildMultimodalMessagesArray } from "../../utils/messageBuilder.js";
import { buildMultimodalOptions } from "../../utils/multimodalOptionsBuilder.js";
import { convertZodToJsonSchema } from "../../utils/schemaConversion.js";
import { type Span, SpanKind, SpanStatusCode } from "@opentelemetry/api";

import { bedrockTracer } from "./constants.js";
import { loadBedrockControl } from "./utils.js";

/**
 * The only image formats Nova Multimodal Embeddings accepts.
 *
 * An allowlist rather than a derivation from the mimetype, because every
 * shortcut here produces a value Nova rejects for some ordinary input:
 * splitting on "/" yields `svg+xml` for an SVG and `jpeg; charset=binary`
 * when the mimetype carries parameters, and normalising `jpeg` to `jpg` —
 * the natural-looking direction — turns the single most common input into
 * the one spelling that is not on this list.
 */
const NOVA_IMAGE_FORMATS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * Nova's format name for `mimeType`, or undefined when Nova has no name for it.
 *
 * Deliberately not defaulting to png. The RAG image path accepts bmp, tiff and
 * avif, none of which Nova names, so a default would hand AWS a BMP labelled as
 * a PNG — bytes and declared format disagreeing, with no error and no way for
 * the caller to tell it happened. An unnamed format is surfaced to the caller
 * instead; see the throw at the call site.
 */
function novaImageFormat(mimeType?: string): string | undefined {
  const normalized = (mimeType ?? "").split(";").at(0)?.trim().toLowerCase();
  return NOVA_IMAGE_FORMATS[normalized ?? ""];
}

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
    // Narrow to the StreamOptions input shape to access multimodal
    // properties (runtime check is safe)
    const input = options.input as StreamOptions["input"];
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
      const streamOptions = options as StreamOptions;
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
    let rawFinishReason: string | undefined;
    try {
      ({ text, usage, finishReason, rawFinishReason } =
        await this.conversationLoop(options));
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
      ...(finishReason !== undefined && { finishReason }),
      ...(rawFinishReason !== undefined && { rawFinishReason }),
    };
  }

  private async conversationLoop(options: TextGenerationOptions): Promise<{
    text: string;
    usage: {
      input: number;
      output: number;
      total: number;
      cacheReadTokens?: number;
      cacheCreationTokens?: number;
    };
    finishReason?: string;
    rawFinishReason?: string;
  }> {
    // The step cap is now the same `maxSteps || DEFAULT_MAX_STEPS` the
    // streaming path has always used. It used to be a hardcoded 10 that
    // ignored the caller's maxSteps entirely, and reaching it threw — which
    // then propagated into NeuroLink's provider-level retry and ran the whole
    // turn twice more, so a runaway tool loop cost thirty billed calls. The
    // engine stops at the cap and returns what the turn produced.
    const maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    const tools = await this.resolveTurnTools(
      options.tools,
      options.disableTools,
    );
    const toolConfig = this.formatToolsForBedrock(tools);
    const sampling = resolveSamplingParams(
      this.providerName,
      this.modelName || this.getDefaultModel(),
      { temperature: options.temperature ?? 0.7 },
      "bedrock.converse",
    );

    const adapter = createBedrockLoopAdapter({
      client: this.bedrockClient,
      streaming: false,
      region: this.region,
      maxSteps,
      buildCommandInput: (conversation) => ({
        modelId: this.modelName || this.getDefaultModel(),
        messages: this.convertToAWSMessages(conversation),
        system: [
          {
            text:
              options.systemPrompt ||
              "You are a helpful assistant with access to external tools. Use tools when necessary to provide accurate information.",
          },
        ],
        inferenceConfig: {
          maxTokens: options.maxTokens,
          ...(sampling.temperature !== undefined && {
            temperature: sampling.temperature,
          }),
        },
        ...(toolConfig ? { toolConfig } : {}),
      }),
    });

    try {
      const { resultPromise } = runAgenticLoop(
        adapter,
        this.conversationHistory,
        {
          tools: this.toEngineTools(tools),
          abortSignal: options.abortSignal,
        },
      );
      const result = await resultPromise;
      this.conversationHistory = result.conversation;

      const input = result.usage.inputTokens;
      const output = result.usage.outputTokens;
      const cacheRead = result.usage.cacheReadTokens ?? 0;
      const cacheWrite = result.usage.cacheWriteTokens ?? 0;
      return {
        text: result.text || "",
        usage: {
          input,
          output,
          // Cache reads/writes are billed tokens reported separately from
          // inputTokens — the total must include them.
          total: input + cacheRead + cacheWrite + output,
          ...(cacheRead > 0 && { cacheReadTokens: cacheRead }),
          ...(cacheWrite > 0 && { cacheCreationTokens: cacheWrite }),
        },
        // The MAPPED reason, matching the streaming path and every AI-SDK
        // backed provider. This path previously surfaced Bedrock's raw value,
        // so a turn stopped at the step cap reported "tool_use" here while
        // the same turn reported "tool-calls" when streamed. The raw value is
        // kept alongside rather than dropped.
        finishReason: result.finishReason,
        rawFinishReason: result.rawStopReason,
      };
    } catch (error) {
      logger.error(
        `[AmazonBedrockProvider] Error in conversation loop:`,
        error,
      );
      throw this.handleProviderError(error);
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

  /**
   * `tools` is passed in rather than re-resolved from `getAllTools()`. That
   * call returns only the provider's own registry, so resolving here meant a
   * tool the caller passed to generate/stream could never execute — the
   * streaming path advertised it to the model and then failed every call to
   * it with "Tool not found", and the generate path never advertised it at
   * all. The turn's full merged tool set is resolved once by the caller and
   * handed down.
   */
  private async executeSingleTool(
    tools: Record<string, ToolDefinition<ToolArgs, JsonValue>>,
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

  /**
   * Resolve the turn's tools once: whatever the caller passed, else the
   * provider's own registry. `BaseProvider.stream()` has already merged base
   * tools into `options.tools` by the time it reaches the streaming path;
   * the generate path has no such pre-merge, so it falls back here.
   */
  private async resolveTurnTools(
    optionTools: unknown,
    disableTools?: boolean,
  ): Promise<Record<string, ToolDefinition<ToolArgs, JsonValue>>> {
    // `generate()` reaches conversationLoop() without going through
    // BaseProvider's tool preparation, so `options.tools` is undefined there
    // and the getAllTools() fallback would hand the model the whole registry
    // even when the caller asked for no tools at all.
    if (disableTools) {
      return {};
    }
    const aiTools =
      (optionTools as Record<string, Tool> | undefined) ??
      (await this.getAllTools());
    return this.convertAISDKToolsToToolDefinitions(aiTools);
  }

  /**
   * Present the resolved tools in the shape `runAgenticLoop` dispatches
   * through. Execution still goes through `executeSingleTool`, so the tool
   * span, the parameter defaults and the ToolResult unwrapping are unchanged
   * — only which tools are reachable changes.
   */
  private toEngineTools(
    tools: Record<string, ToolDefinition<ToolArgs, JsonValue>>,
  ): Record<
    string,
    { execute: (args: Record<string, unknown>) => Promise<unknown> }
  > {
    const engineTools: Record<
      string,
      { execute: (args: Record<string, unknown>) => Promise<unknown> }
    > = {};
    for (const name of Object.keys(tools)) {
      engineTools[name] = {
        execute: (args: Record<string, unknown>) =>
          this.executeSingleTool(tools, name, args),
      };
    }
    return engineTools;
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
            errorObj?.name === "AccessDeniedException" ||
            errorObj?.name === "UnauthorizedOperation" ||
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
              // The generate() fallback already computed real usage — a
              // hardcoded zero object here threw it away.
              usage: generateResult.usage,
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
    const startTime = Date.now();
    const maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;

    // Resolved once for the whole turn. Bedrock has no mid-turn tool
    // discovery, so nothing here would need re-resolving per step.
    const tools = await this.resolveTurnTools(
      options.tools,
      options.disableTools,
    );
    const toolConfig = this.formatToolsForBedrock(tools);
    const sampling = resolveSamplingParams(
      this.providerName,
      this.modelName || this.getDefaultModel(),
      { temperature: options.temperature ?? 0.7 },
      "bedrock.converseStream",
    );

    const baseAdapter = createBedrockLoopAdapter({
      client: this.bedrockClient,
      streaming: true,
      region: this.region,
      maxSteps,
      buildCommandInput: (conversation) => ({
        modelId: this.modelName || this.getDefaultModel(),
        messages: this.convertToAWSMessages(conversation),
        system: [
          {
            text:
              options.systemPrompt ||
              "You are a helpful assistant with access to external tools. Use tools when necessary to provide accurate information.",
          },
        ],
        inferenceConfig: {
          maxTokens: options.maxTokens,
          ...(sampling.temperature !== undefined && {
            temperature: sampling.temperature,
          }),
        },
        ...(toolConfig ? { toolConfig } : {}),
      }),
    });

    // executeStream() falls back to non-streaming generate() when the first
    // call fails on permissions, and that only works if the failure reaches it
    // synchronously. The engine runs the turn in the background, so the first
    // successful send reports separately.
    //
    // Success is the ONLY thing signalled here. The engine wraps every
    // executeStep in withProviderRetry, so rejecting on a failed attempt
    // would settle this promise on attempt one and never un-settle it: a
    // retryable 429 would be reported as a dead turn even though the engine's
    // own retry went on to succeed, and this method would throw while that
    // retried — and billed — turn kept running in the background with its
    // output discarded, with the fallback generate() billed on top. A
    // terminal failure is taken from the turn's settled outcome instead,
    // which by definition is reached only after the engine has stopped
    // retrying.
    let firstStepSucceeded = false;
    let firstStepSent!: () => void;
    const firstStep = new Promise<void>((resolve) => {
      firstStepSent = () => {
        firstStepSucceeded = true;
        resolve();
      };
    });

    const adapter = {
      ...baseAdapter,
      executeStep: async (
        request: AgenticLoopStepRequest,
        channel: { push(chunk: { content: string }): void },
        signal: AbortSignal,
      ) => {
        const stepResult = await baseAdapter.executeStep(
          request,
          channel,
          signal,
        );
        firstStepSent();
        return stepResult;
      },
    };

    streamSpan.addEvent("stream.api_call", {
      "bedrock.tool_count": toolConfig?.tools?.length ?? 0,
    });

    const { stream, resultPromise } = runAgenticLoop(
      adapter,
      this.conversationHistory,
      {
        tools: this.toEngineTools(tools),
        abortSignal: options.abortSignal,
      },
    );

    // The stream surfaces the same failure, so this settled view exists only
    // so the turn's outcome can be read without a second unhandled rejection.
    const settled = resultPromise.then(
      (result) => ({ result, error: undefined as unknown }),
      (error: unknown) => ({ result: undefined, error }),
    );

    // A turn that ends without ever completing a step — an abort before the
    // first request, or a failure the engine gave up retrying — would leave
    // `firstStep` pending forever, so the settled outcome releases the wait
    // too.
    await Promise.race([firstStep, settled]);
    if (!firstStepSucceeded) {
      // The turn ended before any send succeeded. Surface its error here so
      // executeStream's permission fallback still sees it synchronously.
      const outcome = await settled;
      if (outcome.error) {
        throw outcome.error;
      }
    }

    const streamEmitter = this.neurolink?.getEventEmitter();
    const self = this;
    const metadata: NonNullable<StreamResult["metadata"]> = {
      startTime,
      streamId: `bedrock-${Date.now()}`,
    };

    let resolveAnalytics!: (value: ReturnType<typeof createAnalytics>) => void;
    const analyticsPromise = new Promise<ReturnType<typeof createAnalytics>>(
      (resolve) => {
        resolveAnalytics = resolve;
      },
    );

    const usageFromOutcome = (
      usage: AgenticLoopUsage | undefined,
    ): {
      input: number;
      output: number;
      total: number;
      cacheReadTokens?: number;
      cacheCreationTokens?: number;
    } => {
      const input = usage?.inputTokens ?? 0;
      const output = usage?.outputTokens ?? 0;
      const cacheRead = usage?.cacheReadTokens ?? 0;
      const cacheWrite = usage?.cacheWriteTokens ?? 0;
      return {
        input,
        output,
        // Cache reads/writes are billed tokens reported separately from
        // inputTokens — the total must include them.
        total: input + cacheRead + cacheWrite + output,
        ...(cacheRead > 0 && { cacheReadTokens: cacheRead }),
        ...(cacheWrite > 0 && { cacheCreationTokens: cacheWrite }),
      };
    };

    // Bind analytics to the turn ending, not to the consumer draining the
    // stream. A caller that awaits `result.analytics` without iterating
    // `result.stream` would otherwise wait forever, because the generator
    // body — and its finally block — never runs. Resolving twice is
    // harmless; the first call wins.
    void settled.then((outcome) => {
      resolveAnalytics(
        createAnalytics(
          this.providerName,
          this.modelName || this.getDefaultModel(),
          { usage: usageFromOutcome(outcome.result?.usage) },
          Date.now() - startTime,
          {
            requestId: `bedrock-stream-${Date.now()}`,
            streamingMode: true,
          },
        ),
      );
    });

    const wrappedStreamIterable: AsyncIterable<{ content: string }> = {
      async *[Symbol.asyncIterator]() {
        let streamErrored = false;
        try {
          yield* stream;
        } catch (error) {
          streamErrored = true;
          throw error;
        } finally {
          const outcome = await settled;
          if (outcome.error) {
            streamErrored = true;
          }
          const aggregatedUsage = usageFromOutcome(outcome.result?.usage);

          if (outcome.result) {
            self.conversationHistory = outcome.result.conversation;
            metadata.finishReason = outcome.result.finishReason;
            metadata.rawFinishReason = outcome.result.rawStopReason;
            streamSpan.setAttribute(
              "gen_ai.response.stop_reason",
              outcome.result.rawStopReason ?? "unknown",
            );
          }

          // Analytics is resolved off `settled` above, so it lands whether or
          // not anyone drains the stream.

          // Bedrock bypasses the Vercel AI SDK, so experimental_telemetry is
          // never injected and generation:end is emitted by hand for
          // Pipeline B (Langfuse).
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
                finishReason: streamErrored
                  ? "error"
                  : outcome.result?.rawStopReason,
              },
              success: !streamErrored,
            });
          }
        }
      },
    };

    return {
      stream: wrappedStreamIterable,
      // No usage key here on purpose: the real aggregate resolves through
      // `analytics` after the stream drains. A literal zero object is truthy
      // and would block every downstream usage fallback.
      model: this.modelName || this.getDefaultModel(),
      provider: this.getProviderName(),
      analytics: analyticsPromise,
      metadata,
    };
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
        (model: { modelLifecycle?: { status?: string } }) =>
          model.modelLifecycle?.status === "ACTIVE",
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
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) => /AccessDeniedException/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "AWS Bedrock access denied. Check your credentials and permissions.",
      },
      {
        // Checked before the generic ValidationException fallback — a
        // throttling error can be shaped like a validation error in some
        // AWS SDK error message templates, but .name/.code are authoritative.
        match: (ctx) =>
          ctx.errorName === "ThrottlingException" ||
          ctx.errorCode === "ThrottlingException",
        errorClass: RateLimitError,
        message: (ctx) => `Bedrock rate limit (throttled): ${ctx.message}`,
      },
      {
        match: (ctx) => /ValidationException/i.test(ctx.message),
        errorClass: ProviderError,
        message: (ctx) => `Validation error: ${ctx.message}`,
      },
      {
        match: () => true,
        errorClass: ProviderError,
        message: (ctx) => `AWS Bedrock error: ${ctx.message}`,
      },
    ];
    // this.providerName resolves to the literal "bedrock" (getProviderName()
    // returns it directly, and the constructor only overrides providerName
    // when an explicit providerName is passed in) — verified matches the
    // pre-migration hardcoded "bedrock" literal in the throttling branch, so
    // a single classifyProviderError call using this.providerName for every
    // rule (rather than a per-rule literal) is not a behavior change.
    return classifyProviderError(
      error,
      rules,
      this.providerName,
      this.modelName,
    );
  }

  /**
   * Generate embeddings for text or multi-modal input using Amazon Bedrock.
   * Supports both text-only models (Titan Embed Text) and multi-modal models
   * (Titan Embed Image, Nova Multimodal Embeddings).
   *
   * @param input - Text string or EmbedInput with text/image/mimeType
   * @param modelName - The embedding model to use (default: amazon.titan-embed-text-v2:0)
   * @returns Promise resolving to the embedding vector
   */
  async embed(
    input: string | EmbedInput,
    modelName?: string,
  ): Promise<number[]> {
    // Normalize input to EmbedInput shape
    const embedInput = typeof input === "string" ? { text: input } : input;

    const embeddingModelName = modelName || this.getDefaultEmbeddingModel();
    const isNovaModel =
      embeddingModelName.includes("nova") &&
      embeddingModelName.includes("multimodal");
    const isMultiModalModel =
      embeddingModelName.includes("image") ||
      embeddingModelName.includes("multimodal") ||
      embeddingModelName === "amazon.titan-embed-image-v1" ||
      isNovaModel;

    logger.debug("Generating embedding", {
      provider: this.providerName,
      model: embeddingModelName,
      hasText: typeof embedInput.text === "string",
      hasImage: embedInput.image !== undefined,
      isMultiModalModel,
    });

    try {
      // Build request body based on model type
      let requestBody: string;

      if (embedInput.image && !isMultiModalModel) {
        throw new ProviderError(
          `${this.providerName} model ${embeddingModelName} does not support image embeddings`,
          this.providerName,
        );
      }

      if (isNovaModel) {
        // Nova Multimodal Embeddings uses SINGLE_EMBEDDING + singleEmbeddingParams
        // for BOTH text-only and image requests. Nova requires exactly one
        // modality per request — combined image+text is rejected explicitly
        // rather than silently dropping one of them.
        if (embedInput.image && embedInput.text) {
          throw new ProviderError(
            `${this.providerName} model ${embeddingModelName} does not support combined image+text embeddings; provide exactly one of image or text`,
            this.providerName,
          );
        }

        const singleEmbeddingParams: Record<string, unknown> = {
          embeddingPurpose: "GENERIC_RETRIEVAL",
        };

        if (embedInput.image) {
          const imageBuffer = Buffer.isBuffer(embedInput.image)
            ? embedInput.image
            : Buffer.from(embedInput.image, "base64");

          const imageFormat = novaImageFormat(embedInput.mimeType);
          if (imageFormat === undefined) {
            throw new ProviderError(
              `${this.providerName} model ${embeddingModelName} does not support image format ` +
                `'${embedInput.mimeType ?? "unknown"}'; supported formats are ` +
                `${Object.keys(NOVA_IMAGE_FORMATS).join(", ")}`,
              this.providerName,
            );
          }

          singleEmbeddingParams.image = {
            detailLevel: "STANDARD_IMAGE",
            format: imageFormat,
            source: {
              bytes: imageBuffer.toString("base64"),
            },
          };
        }

        if (embedInput.text) {
          singleEmbeddingParams.text = {
            value: embedInput.text,
            truncationMode: "NONE",
          };
        }

        requestBody = JSON.stringify({
          taskType: "SINGLE_EMBEDDING",
          singleEmbeddingParams,
        });
      } else if (embedInput.image) {
        // Titan Multimodal Embeddings expects inputImage as a base64 string
        const imageBuffer = Buffer.isBuffer(embedInput.image)
          ? embedInput.image
          : Buffer.from(embedInput.image, "base64");

        requestBody = JSON.stringify({
          inputText: embedInput.text ?? "",
          inputImage: imageBuffer.toString("base64"),
        });
      } else {
        // Text-only embedding (Titan Embed Text)
        requestBody = JSON.stringify({
          inputText: embedInput.text ?? "",
        });
      }

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

      // Parse the response — Titan returns `embedding`, Nova returns `embeddings[0].embedding`
      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body),
      ) as {
        embedding?: unknown;
        embeddings?: Array<{ embedding?: unknown }>;
      };

      const embedding = isNovaModel
        ? responseBody.embeddings?.at(0)?.embedding
        : responseBody.embedding;

      if (!Array.isArray(embedding)) {
        throw new Error("Invalid embedding response from Bedrock");
      }

      logger.debug("Embedding generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        embeddingDimension: embedding.length,
      });

      return embedding as number[];
    } catch (error) {
      logger.error("Embedding generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: embeddingModelName,
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
    const embeddingModelName = modelName || this.getDefaultEmbeddingModel();

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
