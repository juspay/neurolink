import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import type { AmazonBedrockProvider as BedrockProviderType } from "@ai-sdk/amazon-bedrock";
import type { ZodUnknownSchema } from "../types/typeAliases.js";
import { streamText, Output, type Schema, type LanguageModelV1 } from "ai";
import type {
  AIProviderName,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import {
  validateApiKey,
  createAWSAccessKeyConfig,
  createAWSSecretConfig,
  getAWSRegion,
  getAWSSessionToken,
} from "../utils/providerConfig.js";
import { buildMessagesArray } from "../utils/messageBuilder.js";

// Configuration helpers
const getBedrockModelId = (): string => {
  return (
    process.env.BEDROCK_MODEL ||
    process.env.BEDROCK_MODEL_ID ||
    "arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"
  );
};

// Configuration helpers - now using consolidated utility
const getAWSAccessKeyId = (): string => {
  return validateApiKey(createAWSAccessKeyConfig());
};

const getAWSSecretAccessKey = (): string => {
  return validateApiKey(createAWSSecretConfig());
};

// Note: getAWSRegion and getAWSSessionToken are now directly imported from consolidated utility

const getAppEnvironment = (): string => {
  return process.env.PUBLIC_APP_ENVIRONMENT || "production";
};

/**
 * Amazon Bedrock Provider v2 - BaseProvider Implementation
 *
 * PHASE 3.3: Simple BaseProvider wrap around existing @ai-sdk/amazon-bedrock implementation
 *
 * Features:
 * - Extends BaseProvider for shared functionality
 * - Preserves existing AWS credential configuration
 * - Maintains inference profile ARN support
 * - Uses pre-initialized Bedrock instance for efficiency
 * - Enhanced error handling with setup guidance
 */
export class AmazonBedrockProvider extends BaseProvider {
  private bedrock: BedrockProviderType;
  private model: LanguageModelV1;

  constructor(modelName?: string) {
    super(modelName, "bedrock" as AIProviderName);

    // Initialize AWS configuration
    const awsConfig: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      sessionToken?: string;
    } = {
      accessKeyId: getAWSAccessKeyId(),
      secretAccessKey: getAWSSecretAccessKey(),
      region: getAWSRegion(),
    };

    // Add session token for development environment
    if (getAppEnvironment() === "dev") {
      const sessionToken = getAWSSessionToken();
      if (sessionToken) {
        awsConfig.sessionToken = sessionToken;
      }
    }

    // Create Bedrock provider instance
    this.bedrock = createAmazonBedrock(awsConfig);

    // Pre-initialize model for efficiency
    this.model = this.bedrock(this.modelName || getBedrockModelId());

    logger.debug("Amazon Bedrock BaseProvider v2 initialized", {
      modelName: this.modelName,
      region: awsConfig.region,
      hasSessionToken: !!awsConfig.sessionToken,
      provider: this.providerName,
    });
  }

  protected getProviderName(): AIProviderName {
    return "bedrock" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getBedrockModelId();
  }

  /**
   * Returns the Vercel AI SDK model instance for AWS Bedrock
   */
  protected getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodUnknownSchema | Schema<unknown>,
  ): Promise<StreamResult> {
    try {
      this.validateStreamOptions(options);

      // Build message array from options
      const messages = buildMessagesArray(options);

      const result = await streamText({
        model: this.model,
        messages: messages,
        maxTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        temperature: options.temperature,
      });

      return {
        stream: (async function* () {
          for await (const chunk of result.textStream) {
            yield { content: chunk };
          }
        })(),
        provider: this.providerName,
        model: this.modelName,
      };
    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  protected handleProviderError(error: unknown): Error {
    if (error instanceof Error && error.name === "TimeoutError") {
      return new TimeoutError(
        `Amazon Bedrock request timed out. Consider increasing timeout or using a lighter model.`,
        this.defaultTimeout,
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("InvalidRequestException")) {
      return new Error(
        `❌ Amazon Bedrock Request Error\n\nThe request was invalid: ${errorMessage}\n\n🔧 Common Solutions:\n1. Check your model ID format\n2. Verify your request parameters\n3. Ensure your AWS account has Bedrock access`,
      );
    }

    if (errorMessage.includes("AccessDeniedException")) {
      return new Error(
        `❌ Amazon Bedrock Access Denied\n\nYour AWS credentials don't have permission to access Bedrock.\n\n🔧 Required Steps:\n1. Ensure your IAM user has bedrock:InvokeModel permission\n2. Check if Bedrock is available in your region\n3. Verify model access is enabled in Bedrock console`,
      );
    }

    if (errorMessage.includes("ValidationException")) {
      return new Error(
        `❌ Amazon Bedrock Validation Error\n\n${errorMessage}\n\n🔧 Check:\n1. Model ID format (should be ARN or model identifier)\n2. Request parameters are within limits\n3. Region configuration is correct`,
      );
    }

    return new Error(
      `❌ Amazon Bedrock Provider Error\n\n${errorMessage || "Unknown error occurred"}\n\n🔧 Troubleshooting:\n1. Check AWS credentials and permissions\n2. Verify model availability\n3. Check network connectivity`,
    );
  }
}

export default AmazonBedrockProvider;
