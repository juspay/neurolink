import type { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { createStreamChannel } from "../core/streamChannel.js";
import type { NeuroLink } from "../neurolink.js";
import type {
  EnhancedGenerateResult,
  TextGenerationOptions,
  Tool,
  ToolExecutionSummaryInternal,
  ValidationSchema,
  ZodUnknownSchema,
  SageMakerConfig,
  SageMakerModelConfig,
  StreamOptions,
  SageMakerAsLanguageModel,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { resolveRequestKind } from "../core/resolveRequestKind.js";
import { resolveToolExecutionRecords } from "../core/toolExecutionRecorder.js";
import { transformToolExecutions } from "../utils/transformationUtils.js";
import { convertZodToJsonSchema } from "../utils/schemaConversion.js";
import { withProviderRetry } from "../utils/providerRetry.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import {
  hasNativeDoGenerate,
  runNativeGenerateLoop,
} from "../core/nativeGenerateLoop.js";
import { withSpan } from "../telemetry/withSpan.js";
import { tracers } from "../telemetry/tracers.js";
// SageMaker-specific imports
import {
  getDefaultSageMakerEndpoint,
  getSageMakerConfig,
  getSageMakerModel,
  getSageMakerModelConfig,
} from "./sagemaker/config.js";
import { handleSageMakerError, SageMakerError } from "./sagemaker/errors.js";
import { SageMakerLanguageModel } from "./sagemaker/language-model.js";
import type { LanguageModel } from "../types/index.js";

/**
 * Amazon SageMaker Provider extending BaseProvider
 */
export class AmazonSageMakerProvider extends BaseProvider {
  // Kept as the concrete class so SageMaker-specific members
  // (testConnectivity, getModelCapabilities) stay typed; getAISDKModel()
  // narrows to the AI SDK handle shape at its boundary.
  private sagemakerModel: SageMakerLanguageModel;
  private sagemakerConfig: SageMakerConfig;
  private modelConfig: SageMakerModelConfig;

  constructor(
    modelName?: string,
    endpointName?: string,
    region?: string,
    neurolink?: NeuroLink,
    credentials?: {
      accessKeyId?: string;
      secretAccessKey?: string;
      sessionToken?: string;
      region?: string;
      endpoint?: string;
    },
  ) {
    super(modelName, "sagemaker" as AIProviderName, neurolink);

    try {
      // Load and validate configuration, then overlay per-request credentials
      // Credentials are passed in rather than overlaid afterwards, so they
      // are present when the config is validated.
      const baseConfig = getSageMakerConfig(credentials?.region ?? region, {
        ...(credentials?.region !== undefined && {
          region: credentials.region,
        }),
        ...(credentials?.accessKeyId !== undefined && {
          accessKeyId: credentials.accessKeyId,
        }),
        ...(credentials?.secretAccessKey !== undefined && {
          secretAccessKey: credentials.secretAccessKey,
        }),
        ...(credentials?.sessionToken !== undefined && {
          sessionToken: credentials.sessionToken,
        }),
        ...(credentials?.endpoint !== undefined && {
          endpoint: credentials.endpoint,
        }),
      });
      this.sagemakerConfig = {
        ...baseConfig,
        ...(credentials?.region !== undefined && {
          region: credentials.region,
        }),
        ...(credentials?.accessKeyId !== undefined && {
          accessKeyId: credentials.accessKeyId,
        }),
        ...(credentials?.secretAccessKey !== undefined && {
          secretAccessKey: credentials.secretAccessKey,
        }),
        ...(credentials?.sessionToken !== undefined && {
          sessionToken: credentials.sessionToken,
        }),
        ...(credentials?.endpoint !== undefined && {
          endpoint: credentials.endpoint,
        }),
      };
      this.modelConfig = getSageMakerModelConfig(
        endpointName || getDefaultSageMakerEndpoint(),
      );

      // Create the SageMaker LanguageModel implementation.
      // SageMakerLanguageModel implements SageMakerAsLanguageModel which is
      // structurally compatible with LanguageModelV2 (specificationVersion "v2",
      // modelId, provider, supportedUrls, doGenerate, doStream).
      this.sagemakerModel = new SageMakerLanguageModel(
        this.modelName,
        this.sagemakerConfig,
        this.modelConfig,
      );

      logger.debug("Amazon SageMaker Provider initialized", {
        modelName: this.modelName,
        endpointName: this.modelConfig.endpointName,
        region: this.sagemakerConfig.region,
        provider: this.providerName,
      });
    } catch (error) {
      logger.error("Failed to initialize SageMaker provider", {
        error: error instanceof Error ? error.message : String(error),
        modelName,
        endpointName,
      });

      throw handleSageMakerError(error);
    }
  }

  protected getProviderName(): AIProviderName {
    return "sagemaker" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getSageMakerModel();
  }

  protected getAISDKModel(): LanguageModel {
    // Same sanctioned two-step as construction previously used: the class
    // satisfies the structural SageMakerAsLanguageModel shape, which is
    // single-assertable to the AI SDK LanguageModel handle.
    const smModel: SageMakerAsLanguageModel = this.sagemakerModel;
    return smModel as LanguageModel;
  }

  /**
   * Native non-streaming generate.
   *
   * SageMaker's doGenerate makes one invokeEndpoint call and already returns
   * toolCalls; no streaming is involved, so the wire hazard that reverted the
   * first migration does not apply here. This supplies only the multi-step
   * iteration the ai package used to.
   *
   * NOT EXERCISED LIVE. This machine has no SageMaker endpoint or credentials.
   * The single-step shape is identical by construction — with no tool calls the
   * loop breaks after exactly one doGenerate carrying the same options the ai
   * loop passed. The multi-step branch is the new code and wants a real
   * endpoint before it is trusted.
   */
  override async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null> {
    await this.ensureModelLimits();
    const options = this.normalizeTextOptions(optionsOrPrompt);
    if (resolveRequestKind(options, this.modelName) !== "text") {
      return super.generate(options, analysisSchema);
    }
    this.validateOptions(options);
    const mergedTools = await this.getToolsForStream(options);
    const callerOwnsFallback =
      "disableInternalFallback" in options &&
      options.disableInternalFallback === true;
    // The native loop bypasses BaseProvider.executeGeneration, so the turn
    // budget has to be composed here or it stops existing for this provider.
    return this.runGenerateWithModelFallback(
      () =>
        this.withTurnTimeout(
          { ...options, tools: mergedTools },
          this.getDescriptorGenerateMs(),
          (timedOptions) => this.executeNativeGenerate(timedOptions),
        ),
      callerOwnsFallback,
    );
  }

  private async executeNativeGenerate(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const startTime = Date.now();
    // Middleware must wrap the model here. The native loop bypasses
    // BaseProvider.executeGeneration, and with it the only place middleware was
    // ever applied — a probe showed a caller's wrapGenerate running zero times
    // on every native provider while their onFinish still fired, because
    // onFinish had been special-cased and nothing else had.
    const model = await this.getAISDKModelWithMiddleware(options);
    if (!hasNativeDoGenerate(model)) {
      throw this.handleProviderError(
        new Error("sagemaker: model handle exposes no doGenerate()"),
      );
    }
    const doGenerate = model.doGenerate.bind(model);

    const shouldUseTools = !options.disableTools && this.supportsTools();
    const toolsRecord = shouldUseTools
      ? (options.tools as Record<string, Tool>) || {}
      : {};
    const v3Tools = Object.entries(toolsRecord).map(([name, t]) => {
      const tool = t as { description?: string; inputSchema?: unknown };
      return {
        type: "function" as const,
        name,
        description: tool.description ?? "",
        inputSchema: (tool.inputSchema
          ? convertZodToJsonSchema(tool.inputSchema as ZodUnknownSchema)
          : { type: "object", properties: {} }) as Record<string, unknown>,
      };
    });

    // Structured output was dropped entirely on this path: the schema never
    // reached the request, and nothing downstream re-imposed it, so a caller
    // asking for an object got whatever JSON coerceJsonToSchema could scrape
    // out of prose.
    const responseFormat = options.schema
      ? {
          type: "json" as const,
          schema: convertZodToJsonSchema(
            options.schema as ZodUnknownSchema,
          ) as Record<string, unknown>,
        }
      : undefined;

    const conversation = (await this.buildMessagesForStream(
      options as StreamOptions,
    )) as Array<Record<string, unknown>>;

    const toolExecutionSummaries: ToolExecutionSummaryInternal[] = [];
    const loop = await runNativeGenerateLoop(
      {
        doGenerate,
        conversation,
        ...(responseFormat ? { responseFormat } : {}),
        ...(v3Tools.length > 0 ? { tools: v3Tools } : {}),
        toolsRecord,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
        ...(options.temperature !== undefined
          ? { temperature: options.temperature }
          : {}),
        ...(options.abortSignal ? { abortSignal: options.abortSignal } : {}),
        ...(options.toolTimeoutMs !== undefined
          ? { toolTimeoutMs: options.toolTimeoutMs }
          : {}),
        runStep: (call) =>
          withProviderRetry<Record<string, unknown>>(
            call,
            undefined,
            "sagemaker generate",
          ).catch((err: unknown) => {
            throw this.handleProviderError(err);
          }),
      },
      toolExecutionSummaries,
    );

    const enhanced: EnhancedGenerateResult = {
      content: loop.text,
      provider: this.providerName,
      model: this.modelName,
      finishReason: loop.finishReason,
      usage: {
        input: loop.inputTokens,
        output: loop.outputTokens,
        total: loop.inputTokens + loop.outputTokens,
      },
      responseTime: Date.now() - startTime,
      toolsUsed: loop.toolsUsed,
      toolExecutions: resolveToolExecutionRecords(
        options,
        transformToolExecutions(toolExecutionSummaries),
      ),
      enhancedWithTools: loop.toolsUsed.length > 0,
    };
    return this.finalizeNativeGenerate(enhanced, options, startTime);
  }

  /**
   * Streaming was previously an `executeStream` override that unconditionally
   * threw "not yet fully implemented" — while `SageMakerLanguageModel.doStream`
   * sat one property access away, complete and working, with its own fallback
   * to a synthetic stream when the endpoint does not support true streaming.
   *
   * This adapts that AI-SDK-shaped result to `BaseProvider`'s `doStream` hook,
   * and the inherited default supplies `executeStream`. The two shapes differ:
   * the language model emits typed parts (`text-delta`, `finish`) on a
   * `ReadableStream`, while the hook wants text chunks plus promises for how
   * the turn ended. Those promises are resolved from the `finish` part by a
   * detached pump, so they settle whether or not the caller reads a chunk.
   */
  protected async doStream(options: StreamOptions): Promise<{
    stream: AsyncIterable<{ content: string }>;
    finishReason: Promise<string>;
    usage: Promise<{ inputTokens: number; outputTokens: number }>;
    warnings?: string[];
  }> {
    return withSpan(
      {
        name: "neurolink.provider.sagemaker.stream",
        tracer: tracers.stream,
        attributes: {
          "provider.name": "sagemaker",
          "model.name": this.modelName,
          "sagemaker.endpoint": this.modelConfig.endpointName,
          "sagemaker.region": this.sagemakerConfig.region,
        },
      },
      async () => {
        try {
          const messages = await this.buildMessagesForStream(options);
          const result = await this.sagemakerModel.doStream({
            prompt: messages,
            maxTokens: options.maxTokens,
            temperature: options.temperature,
          });

          // Settled from the `finish` part below. A turn that ends without one
          // — a truncated or errored stream — still settles, so a caller
          // awaiting either promise cannot hang.
          let settleFinishReason!: (reason: string) => void;
          let settleUsage!: (usage: {
            inputTokens: number;
            outputTokens: number;
          }) => void;
          const finishReason = new Promise<string>((resolve) => {
            settleFinishReason = resolve;
          });
          const usage = new Promise<{
            inputTokens: number;
            outputTokens: number;
          }>((resolve) => {
            settleUsage = resolve;
          });

          // The source is drained by a detached pump rather than lazily by the
          // consumer. Resolving `finishReason`/`usage` from inside a generator
          // ties them to somebody iterating it, and the inherited
          // `executeStream` chains analytics off exactly those promises — so a
          // caller that awaits `result.analytics` without consuming the stream
          // would wait forever. Pumping here means the turn completes, and
          // both promises settle, whether or not anyone reads a chunk.
          const channel = createStreamChannel<{ content: string }>();
          void (async () => {
            const reader = result.stream.getReader();
            let sawFinish = false;
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  break;
                }
                const part = value as {
                  type?: string;
                  textDelta?: string;
                  finishReason?: string;
                  usage?: {
                    inputTokens?: number;
                    outputTokens?: number;
                    promptTokens?: number;
                    completionTokens?: number;
                  };
                };
                if (part.type === "text-delta" && part.textDelta) {
                  channel.push({ content: part.textDelta });
                  continue;
                }
                if (part.type === "finish") {
                  sawFinish = true;
                  settleFinishReason(part.finishReason ?? "stop");
                  settleUsage({
                    inputTokens:
                      part.usage?.inputTokens ?? part.usage?.promptTokens ?? 0,
                    outputTokens:
                      part.usage?.outputTokens ??
                      part.usage?.completionTokens ??
                      0,
                  });
                }
              }
              channel.close();
            } catch (error) {
              channel.error(error);
            } finally {
              reader.releaseLock();
              // A stream that ended without a finish part — truncated or
              // errored — must still settle both promises, or the same hang
              // returns by a different route.
              if (!sawFinish) {
                settleFinishReason("unknown");
                settleUsage({ inputTokens: 0, outputTokens: 0 });
              }
            }
          })();

          return {
            stream: channel.iterable,
            finishReason,
            usage,
            warnings: (result.warnings ?? []).map(
              (warning) => warning.message ?? String(warning),
            ),
          };
        } catch (error) {
          throw this.handleProviderError(error);
        }
      },
    );
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof SageMakerError) {
      return error;
    }

    if (error instanceof Error && error.name === "TimeoutError") {
      return new SageMakerError(
        `SageMaker request timed out. Consider increasing timeout.`,
        {
          code: "NETWORK_ERROR",
          statusCode: 408,
          cause: error,
          endpoint: this.modelConfig.endpointName,
        },
      );
    }

    return handleSageMakerError(error, this.modelConfig.endpointName);
  }

  /**
   * Get SageMaker-specific provider information
   */
  public getSageMakerInfo(): {
    endpointName: string;
    modelType: string;
    region: string;
    configured: boolean;
  } {
    return {
      endpointName: this.modelConfig.endpointName,
      modelType: this.modelConfig.modelType || "custom",
      region: this.sagemakerConfig.region,
      configured: !!(
        this.sagemakerConfig.accessKeyId && this.sagemakerConfig.secretAccessKey
      ),
    };
  }

  /**
   * Test basic configuration
   */
  public async testConnection(): Promise<{
    connected: boolean;
    error?: string;
  }> {
    try {
      // Basic validation test
      if (
        !this.sagemakerConfig.accessKeyId ||
        !this.sagemakerConfig.secretAccessKey
      ) {
        return {
          connected: false,
          error: "AWS credentials not configured",
        };
      }

      if (
        !this.modelConfig.endpointName ||
        this.modelConfig.endpointName === "default-endpoint"
      ) {
        return {
          connected: false,
          error: "SageMaker endpoint not configured",
        };
      }

      // For now, just return that configuration looks valid
      return {
        connected: true,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Public method to get the AI SDK model for CLI and external usage
   */
  public async getModel(): Promise<LanguageModel> {
    return this.getAISDKModel();
  }

  /**
   * Test connectivity to the SageMaker endpoint
   */
  public async testConnectivity(): Promise<{
    success: boolean;
    error?: string;
  }> {
    const model = this.sagemakerModel;
    return model.testConnectivity
      ? await model.testConnectivity()
      : { success: false, error: "Test method not available" };
  }

  /**
   * Get model capabilities and information
   */
  public getModelCapabilities() {
    const model = this.sagemakerModel;
    return model.getModelCapabilities
      ? model.getModelCapabilities()
      : {
          capabilities: {
            streaming: true,
            toolCalling: true,
            structuredOutput: true,
            batchInference: true,
            supportedResponseFormats: ["text", "json_object"],
            supportedToolTypes: ["function"],
            maxBatchSize: 10,
          },
        };
  }
}

export default AmazonSageMakerProvider;
