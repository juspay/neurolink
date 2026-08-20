import type { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { createStreamChannel } from "../core/streamChannel.js";
import type { NeuroLink } from "../neurolink.js";
import type {
  SageMakerConfig,
  SageMakerModelConfig,
  StreamOptions,
  SageMakerAsLanguageModel,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
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
