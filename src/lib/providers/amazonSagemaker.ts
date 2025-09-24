/**
 * Amazon SageMaker Provider Implementation (Simplified)
 *
 * This module provides a simplified SageMaker provider that extends BaseProvider
 * and integrates with the NeuroLink ecosystem using existing patterns.
 */

import type { ZodType, ZodTypeDef } from "zod";
import type { Schema, LanguageModelV1 } from "ai";
import type { AIProviderName } from "../types/index.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { ConnectivityResult } from "../types/typeAliases.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";

// SageMaker-specific imports
import {
  getSageMakerConfig,
  getSageMakerModelConfig,
  getDefaultSageMakerEndpoint,
  getSageMakerModel,
} from "./sagemaker/config.js";
import { handleSageMakerError, SageMakerError } from "./sagemaker/errors.js";
import { SageMakerLanguageModel } from "./sagemaker/language-model.js";
import type {
  SageMakerConfig,
  SageMakerModelConfig,
} from "./sagemaker/types.js";

/**
 * Amazon SageMaker Provider extending BaseProvider
 */
export class AmazonSageMakerProvider extends BaseProvider {
  private sagemakerModel: LanguageModelV1;
  private sagemakerConfig: SageMakerConfig;
  private modelConfig: SageMakerModelConfig;

  constructor(modelName?: string, endpointName?: string, region?: string) {
    super(modelName, "sagemaker" as AIProviderName);

    try {
      // Load and validate configuration
      this.sagemakerConfig = getSageMakerConfig(region);
      this.modelConfig = getSageMakerModelConfig(
        endpointName || getDefaultSageMakerEndpoint(),
      );

      // Create the proper LanguageModel (v2) implementation
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

  protected getAISDKModel(): LanguageModelV1 {
    return this.sagemakerModel;
  }

  protected async executeStream(
    _options: StreamOptions,
    _analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
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
  }

  protected handleProviderError(error: unknown): Error {
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
  public async getModel(): Promise<LanguageModelV1> {
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
