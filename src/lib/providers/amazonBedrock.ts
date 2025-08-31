import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type {
  ConverseCommandInput,
  ConverseCommandOutput,
  ConverseStreamCommandInput,
  ToolConfiguration,
  Message,
  ContentBlock,
  Tool as BedrockTool,
  ToolSpecification,
} from "@aws-sdk/client-bedrock-runtime";
import {
  BedrockClient,
  ListFoundationModelsCommand,
} from "@aws-sdk/client-bedrock";

import { BaseProvider } from "../core/baseProvider.js";
import type { AIProviderName, EnhancedGenerateResult } from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { TextGenerationOptions } from "../core/types.js";
import type { ToolDefinition, ToolArgs } from "../types/tools.js";
import type { JsonValue } from "../types/common.js";
import type { NeuroLink } from "../neurolink.js";
import { logger } from "../utils/logger.js";
import type { DocumentType } from "@smithy/types";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodType } from "zod";

interface BedrockToolUse {
  toolUseId: string;
  name: string;
  input: Record<string, unknown>;
}

interface BedrockToolResult {
  toolUseId: string;
  content: Array<{ text: string }>;
  status: string;
}

interface BedrockContentBlock {
  text?: string;
  toolUse?: BedrockToolUse;
  toolResult?: BedrockToolResult;
}

interface BedrockMessage {
  role: "user" | "assistant";
  content: BedrockContentBlock[];
}

export class AmazonBedrockProvider extends BaseProvider {
  private bedrockClient: BedrockRuntimeClient;
  private conversationHistory: BedrockMessage[] = [];

  constructor(modelName?: string, neurolink?: NeuroLink) {
    super(modelName, "bedrock" as AIProviderName, neurolink);

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
        region: process.env.AWS_REGION || "us-east-1",
        // Clean configuration - AWS SDK will handle credentials via:
        // 1. IAM roles (preferred in production)
        // 2. Environment variables
        // 3. AWS config files
        // 4. Instance metadata
      });

      logger.debug(
        `[AmazonBedrockProvider] Successfully created BedrockRuntimeClient with model: ${this.modelName}, region: ${process.env.AWS_REGION || "us-east-1"}`,
      );

      // Immediate health check to catch credential issues early
      this.performInitialHealthCheck();
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
    const bedrockClient = new BedrockClient({
      region: process.env.AWS_REGION || "us-east-1",
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
  protected getAISDKModel(): never {
    throw new Error("AmazonBedrockProvider does not use AI SDK models");
  }

  protected getProviderName(): AIProviderName {
    return "bedrock" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return (
      process.env.BEDROCK_MODEL || "anthropic.claude-3-sonnet-20240229-v1:0"
    );
  }

  // Override the main generate method to implement conversation management
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
  ): Promise<EnhancedGenerateResult | null> {
    logger.debug(
      "[AmazonBedrockProvider] generate() called with conversation management",
    );

    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    // Clear conversation history for new generation
    this.conversationHistory = [];

    // Add user message to conversation
    const userMessage: BedrockMessage = {
      role: "user",
      content: [{ text: options.prompt }],
    };
    this.conversationHistory.push(userMessage);

    logger.debug(
      `[AmazonBedrockProvider] Starting conversation with prompt: ${options.prompt}`,
    );

    // Start conversation loop and return enhanced result
    const text = await this.conversationLoop(options);

    return {
      content: text, // CLI expects 'content' not 'text'
      usage: { total: 0, input: 0, output: 0 },
      model: this.modelName || this.getDefaultModel(),
      provider: this.getProviderName(),
    };
  }

  private async conversationLoop(
    options: TextGenerationOptions,
  ): Promise<string> {
    const maxIterations = 10; // Prevent infinite loops
    let iteration = 0;

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

        const result = await this.handleBedrockResponse(response);
        logger.debug(`[AmazonBedrockProvider] Handle response result:`, result);

        if (result.shouldContinue) {
          logger.debug(
            `[AmazonBedrockProvider] Continuing conversation loop...`,
          );
          continue;
        } else {
          logger.debug(
            `[AmazonBedrockProvider] Conversation completed with final text`,
          );
          logger.debug(
            `[AmazonBedrockProvider] Returning final text: "${result.text}"`,
          );
          return result.text || "";
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
    logger.info(
      `🚀 [AmazonBedrockProvider] Starting Bedrock API call at ${new Date().toISOString()}`,
    );

    try {
      // Pre-call validation and logging
      const region =
        typeof this.bedrockClient.config.region === "function"
          ? await this.bedrockClient.config.region()
          : this.bedrockClient.config.region;
      logger.info(`🔧 [AmazonBedrockProvider] Client region: ${region}`);
      logger.info(
        `🔧 [AmazonBedrockProvider] Model: ${this.modelName || this.getDefaultModel()}`,
      );
      logger.info(
        `🔧 [AmazonBedrockProvider] Conversation history length: ${this.conversationHistory.length}`,
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
          maxTokens: options.maxTokens || 4096,
          temperature: options.temperature || 0.7,
        },
      };

      if (toolConfig) {
        commandInput.toolConfig = toolConfig;
        logger.info(
          `🛠️ [AmazonBedrockProvider] Tools configured: ${toolConfig.tools?.length || 0}`,
        );
      }

      // Log command details for debugging
      logger.info(`📋 [AmazonBedrockProvider] Command input summary:`);
      logger.info(`  - Model ID: ${commandInput.modelId}`);
      logger.info(`  - Messages count: ${commandInput.messages?.length || 0}`);
      logger.info(`  - System prompts: ${commandInput.system?.length || 0}`);
      logger.info(`  - Max tokens: ${commandInput.inferenceConfig?.maxTokens}`);
      logger.info(
        `  - Temperature: ${commandInput.inferenceConfig?.temperature}`,
      );

      logger.debug(
        `[AmazonBedrockProvider] Calling Bedrock with ${this.conversationHistory.length} messages and ${toolConfig?.tools?.length || 0} tools`,
      );

      // Create command and attempt API call
      const command = new ConverseCommand(commandInput);
      logger.info(
        `⏳ [AmazonBedrockProvider] Sending ConverseCommand to Bedrock...`,
      );

      const apiCallStartTime = Date.now();
      const response = await this.bedrockClient.send(command);
      const apiCallDuration = Date.now() - apiCallStartTime;

      logger.info(`✅ [AmazonBedrockProvider] Bedrock API call successful!`);
      logger.info(
        `⏱️ [AmazonBedrockProvider] API call duration: ${apiCallDuration}ms`,
      );
      logger.info(`📊 [AmazonBedrockProvider] Response metadata:`);
      logger.info(`  - Stop reason: ${response.stopReason}`);
      logger.info(`  - Usage tokens: ${JSON.stringify(response.usage || {})}`);
      logger.info(`  - Metrics: ${JSON.stringify(response.metrics || {})}`);

      const totalDuration = Date.now() - startTime;
      logger.info(
        `🎯 [AmazonBedrockProvider] Total callBedrock duration: ${totalDuration}ms`,
      );

      return response;
    } catch (error) {
      const errorDuration = Date.now() - startTime;
      logger.error(
        `❌ [AmazonBedrockProvider] Bedrock API call failed after ${errorDuration}ms`,
      );
      logger.error(`🔍 [AmazonBedrockProvider] Error details:`);

      if (error instanceof Error) {
        logger.error(`  - Error name: ${error.name}`);
        logger.error(`  - Error message: ${error.message}`);
        logger.error(`  - Error stack: ${error.stack}`);
      }

      // Log AWS SDK specific error details
      if (error && typeof error === "object") {
        const awsError = error as Record<string, unknown>;
        if (awsError.$metadata && typeof awsError.$metadata === "object") {
          const metadata = awsError.$metadata as Record<string, unknown>;
          logger.error(`🏭 [AmazonBedrockProvider] AWS SDK metadata:`);
          logger.error(`  - HTTP status: ${metadata.httpStatusCode}`);
          logger.error(`  - Request ID: ${metadata.requestId}`);
          logger.error(`  - Attempts: ${metadata.attempts}`);
          logger.error(`  - Total retry delay: ${metadata.totalRetryDelay}`);
        }

        if (awsError.Code) {
          logger.error(`  - AWS Error Code: ${awsError.Code}`);
        }

        if (awsError.Type) {
          logger.error(`  - AWS Error Type: ${awsError.Type}`);
        }

        if (awsError.Fault) {
          logger.error(`  - AWS Fault: ${awsError.Fault}`);
        }
      }

      // Log environment details for debugging
      logger.error(`🌍 [AmazonBedrockProvider] Environment diagnostics:`);
      logger.error(`  - AWS_REGION: ${process.env.AWS_REGION || "not set"}`);
      logger.error(`  - AWS_PROFILE: ${process.env.AWS_PROFILE || "not set"}`);
      logger.error(
        `  - AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? "set" : "not set"}`,
      );
      logger.error(
        `  - AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? "set" : "not set"}`,
      );
      logger.error(
        `  - AWS_SESSION_TOKEN: ${process.env.AWS_SESSION_TOKEN ? "set" : "not set"}`,
      );

      throw error;
    }
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
      // Handle max tokens by continuing conversation
      const userMessage: BedrockMessage = {
        role: "user",
        content: [{ text: "Please continue." }],
      };
      this.conversationHistory.push(userMessage);

      return { shouldContinue: true };
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
    logger.debug(`[AmazonBedrockProvider] Executing single tool: ${toolName}`, {
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

      logger.debug(`[AmazonBedrockProvider] Tool input parameters:`, toolInput);

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
      logger.error(`[AmazonBedrockProvider] Tool execution error:`, {
        toolName,
        error,
      });
      throw error;
    }
  }

  private convertAISDKToolsToToolDefinitions(
    aiTools: Record<string, import("ai").Tool>,
  ): Record<string, ToolDefinition<ToolArgs, JsonValue>> {
    const result: Record<string, ToolDefinition<ToolArgs, JsonValue>> = {};

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
            schema = zodToJsonSchema(tool.parameters as ZodType) as Record<
              string,
              unknown
            >;
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

  // Bedrock-MCP-Connector compatibility
  getBedrockClient(): BedrockRuntimeClient {
    return this.bedrockClient;
  }

  protected async executeStream(options: StreamOptions): Promise<StreamResult> {
    logger.debug("🟢 [TRACE] executeStream ENTRY - starting streaming attempt");
    logger.info(
      "🚀 [AmazonBedrockProvider] Attempting real streaming with ConverseStreamCommand",
    );

    try {
      logger.debug(
        "🟢 [TRACE] executeStream TRY block - about to call streamingConversationLoop",
      );
      // CRITICAL FIX: Initialize conversation history like generate() does
      // Clear conversation history for new streaming session
      this.conversationHistory = [];

      // Add user message to conversation - exactly like generate() does
      const userMessage: BedrockMessage = {
        role: "user",
        content: [{ text: options.input.text }],
      };
      this.conversationHistory.push(userMessage);

      logger.debug(
        `[AmazonBedrockProvider] Starting streaming conversation with prompt: ${options.input.text}`,
      );

      // Call the actual streaming implementation that already exists
      logger.debug(
        "🟢 [TRACE] executeStream - calling streamingConversationLoop NOW",
      );
      const result = await this.streamingConversationLoop(options);
      logger.debug(
        "🟢 [TRACE] executeStream - streamingConversationLoop SUCCESS, returning result",
      );
      return result;
    } catch (error: unknown) {
      logger.debug(
        "🔴 [TRACE] executeStream CATCH - error caught from streamingConversationLoop",
      );
      const errorObj = error as Error;

      // Check if error is related to streaming permissions
      const isPermissionError =
        (errorObj as unknown as Record<string, unknown>)?.name ===
          "AccessDeniedException" ||
        (errorObj as unknown as Record<string, unknown>)?.name ===
          "UnauthorizedOperation" ||
        errorObj?.message?.includes("bedrock:InvokeModelWithResponseStream") ||
        errorObj?.message?.includes("streaming") ||
        errorObj?.message?.includes("ConverseStream");

      logger.debug(
        "🔴 [TRACE] executeStream CATCH - checking if permission error",
      );
      logger.debug(
        `🔴 [TRACE] executeStream CATCH - isPermissionError=${isPermissionError}`,
      );

      if (isPermissionError) {
        logger.debug(
          "🟡 [TRACE] executeStream CATCH - PERMISSION ERROR DETECTED, starting fallback",
        );
        logger.warn(
          `[AmazonBedrockProvider] Streaming permissions not available, falling back to generate method: ${errorObj.message}`,
        );

        // Fallback to generate method and convert to streaming format
        const generateResult = await this.generate({
          prompt: options.input.text,
        });

        if (!generateResult) {
          throw new Error("Generate method returned null result");
        }

        // Convert generate result to streaming format
        const stream = new ReadableStream({
          start(controller) {
            // Split the response into chunks for pseudo-streaming
            const responseText = generateResult.content || "";
            const chunks = responseText.split(" ");

            chunks.forEach((word: string, _index: number) => {
              controller.enqueue({ content: word + " " });
            });

            controller.enqueue({ content: "" });
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
      throw error;
    }
  }

  private async streamingConversationLoop(
    options: StreamOptions,
  ): Promise<StreamResult> {
    logger.debug("🟦 [TRACE] streamingConversationLoop ENTRY");
    const maxIterations = 10;
    let iteration = 0;

    // The REAL issue: ReadableStream errors don't bubble up to the caller
    // So we need to make the first streaming call synchronously to test permissions
    try {
      logger.debug(
        "🟦 [TRACE] streamingConversationLoop - testing first streaming call",
      );
      const commandInput = await this.prepareStreamCommand(options);
      const command = new ConverseStreamCommand(commandInput);
      const response = await this.bedrockClient.send(command);
      logger.debug(
        "🟦 [TRACE] streamingConversationLoop - first streaming call SUCCESS",
      );

      // Process the first response immediately to avoid waste

      const stream = new ReadableStream({
        start: async (controller) => {
          logger.debug(
            "🟦 [TRACE] streamingConversationLoop - ReadableStream start() called",
          );
          try {
            // Process the first response we already have
            if (response.stream) {
              for await (const chunk of response.stream) {
                if (chunk.contentBlockDelta?.delta?.text) {
                  controller.enqueue({
                    content: chunk.contentBlockDelta.delta.text,
                  });
                }
                if (chunk.messageStop) {
                  controller.close();
                  return;
                }
              }
            }

            // Continue with normal iterations if needed
            while (iteration < maxIterations) {
              iteration++;
              logger.debug(
                `[AmazonBedrockProvider] Streaming iteration ${iteration}`,
              );

              const commandInput = await this.prepareStreamCommand(options);
              const { stopReason, assistantMessage } =
                await this.processStreamResponse(commandInput, controller);

              const shouldContinue = await this.handleStreamStopReason(
                stopReason,
                assistantMessage,
                controller,
              );
              if (!shouldContinue) {
                break;
              }
            }

            if (iteration >= maxIterations) {
              controller.error(
                new Error("Streaming conversation exceeded maximum iterations"),
              );
            }
          } catch (error) {
            logger.debug(
              "🔴 [TRACE] streamingConversationLoop - CATCH block hit in ReadableStream",
            );
            controller.error(error);
          }
        },
      });

      return {
        stream: this.convertToAsyncIterable(stream),
        usage: { total: 0, input: 0, output: 0 },
        model: this.modelName || this.getDefaultModel(),
        provider: this.getProviderName(),
      };
    } catch (error: unknown) {
      logger.debug(
        "🔴 [TRACE] streamingConversationLoop - first streaming call FAILED, throwing",
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
    logger.info(
      `🔍 [AmazonBedrockProvider] BEFORE conversion - conversationHistory length: ${this.conversationHistory.length}`,
    );
    this.conversationHistory.forEach((msg, index) => {
      logger.info(
        `🔍 [AmazonBedrockProvider] Message ${index}: role=${msg.role}, content=${JSON.stringify(msg.content)}`,
      );
    });

    // Get all available tools
    const aiTools = await this.getAllTools();
    const allTools = this.convertAISDKToolsToToolDefinitions(aiTools);
    const toolConfig = this.formatToolsForBedrock(allTools);

    const convertedMessages = this.convertToAWSMessages(
      this.conversationHistory,
    );
    logger.info(
      `🔍 [AmazonBedrockProvider] AFTER conversion - messages length: ${convertedMessages.length}`,
    );
    convertedMessages.forEach((msg, index) => {
      logger.info(
        `🔍 [AmazonBedrockProvider] Converted Message ${index}: role=${msg.role}, content=${JSON.stringify(msg.content)}`,
      );
    });

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
        maxTokens: options.maxTokens || 4096,
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
  ): Promise<{ stopReason: string; assistantMessage: BedrockMessage }> {
    const command = new ConverseStreamCommand(commandInput);
    const response = await this.bedrockClient.send(command);

    if (!response.stream) {
      throw new Error("No stream returned from Bedrock");
    }

    const currentMessageContent: BedrockContentBlock[] = [];
    let stopReason = "";
    let currentText = "";

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
        // Use robust parameter merging like Bedrock-MCP-Connector
        if (chunk.contentBlockDelta.delta.toolUse.input) {
          // Merge parameters more robustly to avoid missing required parameters
          const deltaInput = chunk.contentBlockDelta.delta.toolUse.input;
          if (typeof deltaInput === "string") {
            currentBlock.toolUse.input = { value: deltaInput };
          } else if (
            deltaInput &&
            typeof deltaInput === "object" &&
            !Array.isArray(deltaInput)
          ) {
            // Ensure both objects are properly typed before spreading
            const currentInput = currentBlock.toolUse.input || {};
            const newInput = deltaInput;
            currentBlock.toolUse.input = {
              ...currentInput,
              ...(newInput as Record<string, JsonValue>),
            } as Record<string, unknown>;
          }
        }
      }

      if (chunk.contentBlockStop) {
        // Content block completed
        const currentBlock =
          currentMessageContent[currentMessageContent.length - 1];
        if (currentText && currentBlock && !currentBlock.toolUse) {
          // Only add text to blocks that don't have toolUse
          currentBlock.text = currentText;
        }
        currentText = "";
      }

      if (chunk.messageStop) {
        stopReason = chunk.messageStop.stopReason || "end_turn";
        break;
      }
    }

    // Add assistant message to conversation history
    const assistantMessage: BedrockMessage = {
      role: "assistant",
      content: currentMessageContent,
    };
    this.conversationHistory.push(assistantMessage);

    return { stopReason, assistantMessage };
  }

  private async handleStreamStopReason(
    stopReason: string,
    assistantMessage: BedrockMessage,
    controller: ReadableStreamDefaultController,
  ): Promise<boolean> {
    if (stopReason === "end_turn" || stopReason === "stop_sequence") {
      // Conversation completed
      controller.close();
      return false;
    } else if (stopReason === "tool_use") {
      logger.debug(
        `🛠️ [AmazonBedrockProvider] Tool use detected in streaming - executing tools`,
      );

      await this.executeStreamTools(assistantMessage.content);
      return true; // Continue conversation loop
    } else if (stopReason === "max_tokens") {
      // Handle max tokens by continuing conversation
      const userMessage: BedrockMessage = {
        role: "user",
        content: [{ text: "Please continue." }],
      };
      this.conversationHistory.push(userMessage);
      return true; // Continue conversation loop
    } else {
      // Unknown stop reason - end conversation
      controller.close();
      return false;
    }
  }

  private async executeStreamTools(
    messageContent: BedrockContentBlock[],
  ): Promise<void> {
    // Execute all tool uses in the message - ensure 1:1 mapping like Bedrock-MCP-Connector
    const toolResults = [];
    let toolUseCount = 0;

    // Count toolUse blocks first to ensure 1:1 mapping
    for (const contentItem of messageContent) {
      if (contentItem.toolUse) {
        toolUseCount++;
      }
    }

    logger.debug(
      `🔍 [AmazonBedrockProvider] Found ${toolUseCount} toolUse blocks in assistant message`,
    );

    for (const contentItem of messageContent) {
      if (contentItem.toolUse) {
        logger.debug(
          `🔧 [AmazonBedrockProvider] Executing tool: ${contentItem.toolUse.name}`,
        );

        try {
          const toolResult = await this.executeSingleTool(
            contentItem.toolUse.name,
            contentItem.toolUse.input || {},
            contentItem.toolUse.toolUseId,
          );

          logger.debug(
            `✅ [AmazonBedrockProvider] Tool execution successful: ${contentItem.toolUse.name}`,
          );

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
            `❌ [AmazonBedrockProvider] Tool execution failed: ${contentItem.toolUse.name}`,
            error,
          );

          const errorMessage =
            error instanceof Error ? error.message : String(error);
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
      `📊 [AmazonBedrockProvider] Created ${toolResults.length} toolResult blocks for ${toolUseCount} toolUse blocks`,
    );

    // Validate 1:1 mapping before adding to conversation
    if (toolResults.length !== toolUseCount) {
      logger.error(
        `❌ [AmazonBedrockProvider] Mismatch: ${toolResults.length} toolResults vs ${toolUseCount} toolUse blocks`,
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
        `📤 [AmazonBedrockProvider] Added ${toolResults.length} tool results to conversation (1:1 mapping validated)`,
      );
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
    const healthCheckClient = new BedrockClient({
      region: process.env.AWS_REGION || "us-east-1",
    });

    try {
      logger.debug("🔍 [AmazonBedrockProvider] Starting health check...");

      const command = new ListFoundationModelsCommand({});
      const response = await healthCheckClient.send(command, {
        abortSignal: controller.signal,
      });

      const models = response.modelSummaries || [];
      const activeModels = models.filter(
        (model) => model.modelLifecycle?.status === "ACTIVE",
      );

      logger.debug(
        `✅ [AmazonBedrockProvider] Health check passed - Found ${activeModels.length} active models out of ${models.length} total models`,
      );

      if (activeModels.length === 0) {
        throw new Error("No active foundation models available in the region");
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      const errorObj = error as Record<string, unknown>;

      if (errorObj.name === "AbortError") {
        throw new Error("Bedrock health check timed out after 10 seconds");
      }

      const errorMessage =
        typeof errorObj.message === "string" ? errorObj.message : "";
      if (
        errorMessage.includes("UnauthorizedOperation") ||
        errorMessage.includes("AccessDenied")
      ) {
        throw new Error(
          "Bedrock access denied. Check your AWS credentials and IAM permissions for bedrock:ListFoundationModels",
        );
      }

      if (errorObj.code === "ECONNREFUSED" || errorObj.code === "ENOTFOUND") {
        throw new Error(
          "Unable to connect to Bedrock service. Check your network connectivity and AWS region configuration",
        );
      }

      logger.error("❌ [AmazonBedrockProvider] Health check failed:", error);
      throw new Error(
        `Bedrock health check failed: ${errorMessage || "Unknown error"}`,
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

  protected handleProviderError(error: unknown): Error {
    // Handle AWS SDK specific errors
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("AccessDeniedException")) {
      return new Error(
        "AWS Bedrock access denied. Check your credentials and permissions.",
      );
    }

    if (message.includes("ValidationException")) {
      return new Error(`AWS Bedrock validation error: ${message}`);
    }

    return new Error(`AWS Bedrock error: ${message}`);
  }
}
