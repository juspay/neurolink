import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import type { ZodType, ZodTypeDef } from 'zod';
import {
  streamText,
  generateText,
  Output,
  type StreamTextResult,
  type ToolSet,
  type Schema,
  type GenerateTextResult,
  type LanguageModelV1
} from 'ai';
import type { AIProvider, TextGenerationOptions, StreamTextOptions } from '../core/types.js';
import { logger } from '../utils/logger.js';

// Default system context
const DEFAULT_SYSTEM_CONTEXT = {
  systemPrompt: 'You are a helpful AI assistant.'
};

// Configuration helpers
const getBedrockModelId = (): string => {
  return process.env.BEDROCK_MODEL ||
         process.env.BEDROCK_MODEL_ID ||
         'arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0';
};

const getAWSAccessKeyId = (): string => {
  const keyId = process.env.AWS_ACCESS_KEY_ID;
  if (!keyId) {
    throw new Error('AWS_ACCESS_KEY_ID environment variable is not set');
  }
  return keyId;
};

const getAWSSecretAccessKey = (): string => {
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!secretKey) {
    throw new Error('AWS_SECRET_ACCESS_KEY environment variable is not set');
  }
  return secretKey;
};

const getAWSRegion = (): string => {
  return process.env.AWS_REGION || 'us-east-2';
};

const getAWSSessionToken = (): string | undefined => {
  return process.env.AWS_SESSION_TOKEN;
};

const getAppEnvironment = (): string => {
  return process.env.PUBLIC_APP_ENVIRONMENT || 'dev';
};

// Amazon Bedrock class with enhanced error handling using createAmazonBedrock
export class AmazonBedrock implements AIProvider {
  private modelName: string;
  private model: LanguageModelV1;
  private bedrock: ReturnType<typeof createAmazonBedrock>;

  constructor(modelName?: string | null) {
    const functionTag = 'AmazonBedrock.constructor';
    this.modelName = modelName || getBedrockModelId();

    try {
      logger.debug(`[${functionTag}] Function called`, {
        modelName: this.modelName,
        envBedrockModel: process.env.BEDROCK_MODEL,
        envBedrockModelId: process.env.BEDROCK_MODEL_ID,
        fallbackModel: 'arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0'
      });

      // Configure AWS credentials for custom Bedrock instance
      const awsConfig: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        sessionToken?: string;
      } = {
        accessKeyId: getAWSAccessKeyId(),
        secretAccessKey: getAWSSecretAccessKey(),
        region: getAWSRegion()
      };

      logger.debug(`[${functionTag}] AWS config validation`, {
        hasAccessKeyId: !!awsConfig.accessKeyId,
        hasSecretAccessKey: !!awsConfig.secretAccessKey,
        region: awsConfig.region || 'MISSING',
        accessKeyIdLength: awsConfig.accessKeyId?.length || 0,
        hasSessionToken: !!process.env.AWS_SESSION_TOKEN
      });

      // Add session token for development environment
      if (getAppEnvironment() === 'dev') {
        const sessionToken = getAWSSessionToken();
        if (sessionToken) {
          awsConfig.sessionToken = sessionToken;
          logger.debug(`[${functionTag}] Session token added`, {
            environment: 'dev'
          });
        } else {
          logger.warn(`[${functionTag}] Session token missing`, {
            environment: 'dev'
          });
        }
      }

      logger.debug(`[${functionTag}] AWS config created`, {
        region: awsConfig.region,
        hasSessionToken: !!awsConfig.sessionToken
      });

      logger.debug(`[${functionTag}] Bedrock provider creating`, {
        modelName: this.modelName
      });

      // Create custom Bedrock provider instance with environment-based configuration
      this.bedrock = createAmazonBedrock(awsConfig);

      logger.debug(`[${functionTag}] Bedrock provider initialized`, {
        modelName: this.modelName
      });

      logger.debug(`[${functionTag}] Model instance creating`, {
        modelName: this.modelName
      });

      this.model = this.bedrock(this.modelName);

      logger.debug(`[${functionTag}] Model instance created`, {
        modelName: this.modelName
      });

      logger.debug(`[${functionTag}] Function result`, {
        modelName: this.modelName,
        region: awsConfig.region,
        hasSessionToken: !!awsConfig.sessionToken,
        success: true
      });

      logger.debug(`[${functionTag}] Initialization completed`, {
        modelName: this.modelName,
        region: awsConfig.region,
        hasSessionToken: !!awsConfig.sessionToken
      });
    } catch (err) {
      logger.error(`[${functionTag}] Initialization failed`, {
        message: 'Error in initializing Amazon Bedrock',
        modelName: this.modelName,
        region: getAWSRegion(),
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      throw err;
    }
  }

  async streamText(
    optionsOrPrompt: StreamTextOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>
  ): Promise<StreamTextResult<ToolSet, unknown> | null> {
    const functionTag = 'AmazonBedrock.streamText';
    const provider = 'bedrock';
    let chunkCount = 0;

    try {
      // Parse parameters - support both string and options object
      const options = typeof optionsOrPrompt === 'string'
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

      const {
        prompt,
        temperature = 0.7,
        maxTokens = 500,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema
      } = options;

      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;

      logger.debug(`[${functionTag}] Stream request started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length,
        temperature,
        maxTokens
      });

      const streamOptions = {
        model: this.model,
        prompt: prompt,
        system: systemPrompt,
        temperature,
        maxTokens,

        onError: (event: { error: unknown }) => {
          const error = event.error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;

          logger.error(`[${functionTag}] Stream text error`, {
            provider,
            modelName: this.modelName,
            region: getAWSRegion(),
            error: errorMessage,
            stack: errorStack,
            promptLength: prompt.length,
            chunkCount
          });
        },

        onFinish: (event: {
          finishReason: string;
          usage: Record<string, unknown>;
          text?: string;
        }) => {
          logger.debug(`[${functionTag}] Stream text finished`, {
            provider,
            modelName: this.modelName,
            region: getAWSRegion(),
            finishReason: event.finishReason,
            usage: event.usage,
            totalChunks: chunkCount,
            promptLength: prompt.length,
            responseLength: event.text?.length || 0
          });
        },

        onChunk: (event: { chunk: { type: string; text?: string } }) => {
          chunkCount++;
          logger.debug(`[${functionTag}] Stream text chunk`, {
            provider,
            modelName: this.modelName,
            chunkNumber: chunkCount,
            chunkLength: event.chunk.text?.length || 0,
            chunkType: event.chunk.type
          });
        }
      } as Parameters<typeof streamText>[0];

      if (finalSchema) {
        streamOptions.experimental_output = Output.object({ schema: finalSchema });
      }

      // Direct streamText call - let the real error bubble up
      const result = streamText(streamOptions);

      logger.debug(`[${functionTag}] Stream text call successful`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length
      });

      return result;
    } catch (err) {
      logger.error(`[${functionTag}] Exception`, {
        provider,
        modelName: this.modelName,
        region: getAWSRegion(),
        message: 'Error in streaming text',
        err: String(err)
      });
      throw err; // Re-throw error to trigger fallback
    }
  }

  async generateText(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>
  ): Promise<GenerateTextResult<ToolSet, unknown> | null> {
    const functionTag = 'AmazonBedrock.generateText';
    const provider = 'bedrock';

    try {
      // Parse parameters - support both string and options object
      const options = typeof optionsOrPrompt === 'string'
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

      const {
        prompt,
        temperature = 0.7,
        maxTokens = 500,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema
      } = options;

      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;

      logger.debug(`[${functionTag}] Generate text started`, {
        provider,
        modelName: this.modelName,
        region: getAWSRegion(),
        promptLength: prompt.length,
        temperature,
        maxTokens
      });

      const generateOptions = {
        model: this.model,
        prompt: prompt,
        system: systemPrompt,
        temperature,
        maxTokens
      } as Parameters<typeof generateText>[0];

      if (finalSchema) {
        generateOptions.experimental_output = Output.object({ schema: finalSchema });
      }

      const result = await generateText(generateOptions);

      logger.debug(`[${functionTag}] Generate text completed`, {
        provider,
        modelName: this.modelName,
        usage: result.usage,
        finishReason: result.finishReason,
        responseLength: result.text?.length || 0
      });

      return result;
    } catch (err) {
      logger.error(`[${functionTag}] Exception`, {
        provider,
        modelName: this.modelName,
        message: 'Error in generating text',
        err: String(err)
      });
      throw err; // Re-throw error to trigger fallback instead of returning null
    }
  }
}
