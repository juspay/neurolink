import type { ZodType } from "zod";
import type { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import type { NeuroLink } from "../neurolink.js";
import type {
  SageMakerConfig,
  SageMakerModelConfig,
  StreamOptions,
  StreamResult,
  ConnectivityResult,
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
import type { LanguageModel, Schema } from "../types/index.js";

/**
 * Amazon SageMaker Provider extending BaseProvider
 */
export class AmazonSageMakerProvider extends BaseProvider {
  private sagemakerModel: LanguageModel;
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
      const baseConfig = getSageMakerConfig(credentials?.region ?? region);
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
      const smModel: SageMakerAsLanguageModel = new SageMakerLanguageModel(
        this.modelName,
        this.sagemakerConfig,
        this.modelConfig,
      );
      this.sagemakerModel = smModel as LanguageModel;

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
    return this.sagemakerModel;
  }

  protected async executeStream(
    _options: StreamOptions,
    _analysisSchema?: ZodType | Schema<unknown>,
  ): Promise<StreamResult> {
    return withSpan(
      {
        name: "neurolink.provider.sagemaker.stream",
        tracer: tracers.stream,
        attributes: {
          "provider.name": "sagemaker",
          "model.name": this.modelName,
          "sagemaker.endpoint": this.modelConfig.endpointName,
          "sagemaker.region": this.sagemakerConfig.region,
          "sagemaker.not_implemented": true,
        },
      },
      async () => {
        try {
          // For now, throw an error indicating this is not yet implemented
          throw new SageMakerError(
            "SageMaker streaming not yet fully implemented. Coming in next phase.",
            {
              code: "MODEL_ERROR",
              statusCode: 501,
              endpoint: this.modelConfig.endpointName,
            },
          );
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
    const model = this.sagemakerModel as unknown as {
      testConnectivity?: () => Promise<ConnectivityResult>;
    };
    return model.testConnectivity
      ? await model.testConnectivity()
      : { success: false, error: "Test method not available" };
  }

  /**
   * Get model capabilities and information
   */
  public getModelCapabilities() {
    const model = this.sagemakerModel as unknown as {
      getModelCapabilities?: () => {
        capabilities: {
          streaming: boolean;
          toolCalling: boolean;
          structuredOutput: boolean;
          batchInference: boolean;
          supportedResponseFormats: string[];
          supportedToolTypes: string[];
          maxBatchSize: number;
        };
      };
    };
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
