import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, Output, type Schema, type LanguageModelV1 } from "ai";
import type {
  AIProviderName,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";
import { BaseProvider } from "../core/base-provider.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";

// Configuration helpers
const getBedrockModelId = (): string => {
  return (
    process.env.BEDROCK_MODEL ||
    process.env.BEDROCK_MODEL_ID ||
    "arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"
  );
};

const getAWSAccessKeyId = (): string => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  if (!accessKeyId) {
    throw new Error(
      `❌ AWS Bedrock Provider Configuration Error\n\nMissing required environment variables: AWS_ACCESS_KEY_ID\n\n🔧 Step 1: Get AWS Credentials\n1. Visit: https://console.aws.amazon.com/iam/\n2. Create IAM user with Bedrock permissions\n3. Generate access key\n\n🔧 Step 2: Set Environment Variables\nAdd to your .env file:\nAWS_ACCESS_KEY_ID=your_access_key_here\nAWS_SECRET_ACCESS_KEY=your_secret_key_here\nAWS_REGION=us-east-1\n\n🔧 Step 3: Restart Application\nRestart your application to load the new environment variables.`,
    );
  }
  return accessKeyId;
};

const getAWSSecretAccessKey = (): string => {
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!secretAccessKey) {
    throw new Error(
      `❌ AWS Bedrock Provider Configuration Error\n\nMissing required environment variables: AWS_SECRET_ACCESS_KEY\n\n🔧 Step 1: Get AWS Credentials\n1. Visit: https://console.aws.amazon.com/iam/\n2. Create IAM user with Bedrock permissions\n3. Generate access key\n\n🔧 Step 2: Set Environment Variables\nAdd to your .env file:\nAWS_ACCESS_KEY_ID=your_access_key_here\nAWS_SECRET_ACCESS_KEY=your_secret_key_here\nAWS_REGION=us-east-1\n\n🔧 Step 3: Restart Application\nRestart your application to load the new environment variables.`,
    );
  }
  return secretAccessKey;
};

const getAWSRegion = (): string => {
  return process.env.AWS_REGION || "us-east-1";
};

const getAWSSessionToken = (): string | undefined => {
  return process.env.AWS_SESSION_TOKEN;
};

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
  private bedrock: any;
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
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    try {
      this.validateStreamOptions(options);

      const result = await streamText({
        model: this.model,
        prompt: options.input.text,
        system: options.systemPrompt,
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

  protected handleProviderError(error: any): Error {
    if (error.name === "TimeoutError") {
      return new TimeoutError(
        `Amazon Bedrock request timed out. Consider increasing timeout or using a lighter model.`,
        this.defaultTimeout,
      );
    }

    if (error.message?.includes("InvalidRequestException")) {
      return new Error(
        `❌ Amazon Bedrock Request Error\n\nThe request was invalid: ${error.message}\n\n🔧 Common Solutions:\n1. Check your model ID format\n2. Verify your request parameters\n3. Ensure your AWS account has Bedrock access`,
      );
    }

    if (error.message?.includes("AccessDeniedException")) {
      return new Error(
        `❌ Amazon Bedrock Access Denied\n\nYour AWS credentials don't have permission to access Bedrock.\n\n🔧 Required Steps:\n1. Ensure your IAM user has bedrock:InvokeModel permission\n2. Check if Bedrock is available in your region\n3. Verify model access is enabled in Bedrock console`,
      );
    }

    if (error.message?.includes("ValidationException")) {
      return new Error(
        `❌ Amazon Bedrock Validation Error\n\n${error.message}\n\n🔧 Check:\n1. Model ID format (should be ARN or model identifier)\n2. Request parameters are within limits\n3. Region configuration is correct`,
      );
    }

    return new Error(
      `❌ Amazon Bedrock Provider Error\n\n${error.message || "Unknown error occurred"}\n\n🔧 Troubleshooting:\n1. Check AWS credentials and permissions\n2. Verify model availability\n3. Check network connectivity`,
    );
  }

  private validateStreamOptions(options: StreamOptions): void {
    if (!options.input?.text?.trim()) {
      throw new Error("Prompt is required for streaming");
    }

    if (
      options.maxTokens &&
      (options.maxTokens < 1 || options.maxTokens > 4096)
    ) {
      throw new Error(
        "maxTokens must be between 1 and 4096 for Amazon Bedrock",
      );
    }

    if (
      options.temperature &&
      (options.temperature < 0 || options.temperature > 1)
    ) {
      throw new Error("temperature must be between 0 and 1");
    }
  }
}

export default AmazonBedrockProvider;
