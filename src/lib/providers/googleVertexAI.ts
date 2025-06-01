import { createVertex, type GoogleVertexProviderSettings } from '@ai-sdk/google-vertex';

// Cache for anthropic module to avoid repeated imports
let _createVertexAnthropic: any = null;
let _anthropicImportAttempted = false;

// Function to dynamically import anthropic support
async function getCreateVertexAnthropic() {
  if (_anthropicImportAttempted) {
    return _createVertexAnthropic;
  }

  _anthropicImportAttempted = true;

  try {
    // Try to import the anthropic module - available in @ai-sdk/google-vertex ^2.2.0+
    const anthropicModule = await import('@ai-sdk/google-vertex/anthropic');
    _createVertexAnthropic = anthropicModule.createVertexAnthropic;
    console.log('[GoogleVertexAI] Anthropic module successfully loaded');
    return _createVertexAnthropic;
  } catch (error) {
    // Anthropic module not available
    console.warn('[GoogleVertexAI] Anthropic module not available. Install @ai-sdk/google-vertex ^2.2.0 for Anthropic model support.');
    return null;
  }
}
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
import type { AIProvider } from '../core/types.js';

// Default system context
const DEFAULT_SYSTEM_CONTEXT = {
  systemPrompt: 'You are a helpful AI assistant.'
};

// Configuration helpers
const getGCPVertexBreezeProjectId = (): string => {
  const projectId = process.env.GOOGLE_VERTEX_PROJECT;
  if (!projectId) {
    throw new Error('GOOGLE_VERTEX_PROJECT environment variable is not set');
  }
  return projectId;
};

const getGCPVertexBreezeLocation = (): string => {
  return process.env.GOOGLE_VERTEX_LOCATION || 'us-east5';
};

const getGoogleApplicationCredentials = (): string | undefined => {
  return process.env.GOOGLE_APPLICATION_CREDENTIALS;
};

const getVertexModelId = (): string => {
  return process.env.VERTEX_MODEL_ID || 'claude-sonnet-4@20250514';
};

const hasPrincipalAccountAuth = (): boolean => {
  return !!getGoogleApplicationCredentials();
};

// Vertex AI setup with Principal Account Authentication support
const createVertexSettings = (): GoogleVertexProviderSettings => {
  const functionTag = 'createVertexSettings';

  const baseSettings: GoogleVertexProviderSettings = {
    project: getGCPVertexBreezeProjectId(),
    location: getGCPVertexBreezeLocation()
  };

  // Check for principal account authentication first (recommended for production)
  if (hasPrincipalAccountAuth()) {
    const credentialsPath = getGoogleApplicationCredentials();

    console.log(`[${functionTag}] Principal account auth`, {
      credentialsPath: credentialsPath ? '[PROVIDED]' : '[NOT_PROVIDED]',
      authMethod: 'principal_account'
    });

    // For principal account auth, we don't need to provide explicit credentials
    // The google-auth-library will use GOOGLE_APPLICATION_CREDENTIALS automatically
    return baseSettings;
  }

  // Log warning if no valid authentication is available
  console.warn(`[${functionTag}] No valid auth`, {
    authMethod: 'none',
    hasPrincipalAccount: hasPrincipalAccountAuth()
  });

  // Return base settings and let it fail if no auth is available
  return baseSettings;
};

// Helper function to determine if a model is an Anthropic model
const isAnthropicModel = (modelName: string): boolean => {
  // Anthropic models in Vertex AI contain "claude" anywhere in the model name
  return modelName.toLowerCase().includes('claude');
};

// Lazy initialization cache
let _vertex: ReturnType<typeof createVertex> | null = null;
function getVertexInstance(): ReturnType<typeof createVertex> {
  if (!_vertex) {
    _vertex = createVertex(createVertexSettings());
  }
  return _vertex;
}

// Google Vertex AI class with enhanced error handling and Anthropic model support
export class GoogleVertexAI implements AIProvider {
  private modelName: string;

  /**
   * Initializes a new instance of GoogleVertexAI
   * @param modelName - Optional model name to override the default from config
   */
  constructor(modelName?: string | null) {
    const functionTag = 'GoogleVertexAI.constructor';
    this.modelName = modelName || getVertexModelId();

    try {
      console.log(`[${functionTag}] Initialization started`, {
        modelName: this.modelName,
        isAnthropic: isAnthropicModel(this.modelName)
      });

      const hasPrincipal = hasPrincipalAccountAuth();

      console.log(`[${functionTag}] Authentication validation`, {
        hasPrincipalAccountAuth: hasPrincipal,
        projectId: getGCPVertexBreezeProjectId() || 'MISSING',
        location: getGCPVertexBreezeLocation() || 'MISSING'
      });

      if (hasPrincipal) {
        console.log(`[${functionTag}] Auth method selected`, {
          authMethod: 'principal_account',
          hasGoogleApplicationCredentials: !!getGoogleApplicationCredentials()
        });
      } else {
        console.warn(`[${functionTag}] Auth method missing`, {
          authMethod: 'none',
          hasPrincipalAccountAuth: hasPrincipal
        });
      }

      console.log(`[${functionTag}] Initialization completed`, {
        modelName: this.modelName,
        isAnthropic: isAnthropicModel(this.modelName),
        authMethod: hasPrincipalAccountAuth() ? 'principal_account' : 'none',
        success: true
      });
    } catch (err) {
      console.error(`[${functionTag}] Initialization failed`, {
        message: 'Error in initializing Google Vertex AI',
        modelName: this.modelName,
        isAnthropic: isAnthropicModel(this.modelName),
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
    }
  }

  /**
   * Gets the appropriate model instance (Google or Anthropic)
   * @private
   */
  private async getModel(): Promise<LanguageModelV1> {
    if (isAnthropicModel(this.modelName)) {
      console.log('GoogleVertexAI.getModel - Anthropic model selected', {
        modelName: this.modelName
      });

      const createVertexAnthropic = await getCreateVertexAnthropic();
      if (!createVertexAnthropic) {
        throw new Error(
          `Anthropic model "${this.modelName}" requested but @ai-sdk/google-vertex/anthropic is not available. ` +
          'Please install @ai-sdk/google-vertex ^2.2.0 or use a Google model instead.'
        );
      }

      const vertexAnthropic = createVertexAnthropic(createVertexSettings());
      return vertexAnthropic(this.modelName);
    }
    const vertex = getVertexInstance();
    return vertex(this.modelName);
  }

  /**
   * Processes text using streaming approach with enhanced error handling callbacks
   * @param prompt - The input text prompt to analyze
   * @param analysisSchema - Optional Zod schema or Schema object for output validation
   * @returns Promise resolving to StreamTextResult or null if operation fails
   */
  async streamText(
    prompt: string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>
  ): Promise<StreamTextResult<ToolSet, unknown> | null> {
    const functionTag = 'GoogleVertexAI.streamText';
    const provider = 'vertex';
    let chunkCount = 0;

    try {
      console.log(`[${functionTag}] Stream request started`, {
        provider,
        modelName: this.modelName,
        isAnthropic: isAnthropicModel(this.modelName),
        promptLength: prompt.length,
        hasSchema: !!analysisSchema
      });

      const model = await this.getModel();

      const streamOptions = {
        model: model,
        prompt: prompt,
        system: DEFAULT_SYSTEM_CONTEXT.systemPrompt,

        onError: (event: { error: unknown }) => {
          const error = event.error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;

          console.error(`[${functionTag}] Stream text error`, {
            provider,
            modelName: this.modelName,
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
          console.log(`[${functionTag}] Stream text finished`, {
            provider,
            modelName: this.modelName,
            finishReason: event.finishReason,
            usage: event.usage,
            totalChunks: chunkCount,
            promptLength: prompt.length,
            responseLength: event.text?.length || 0
          });
        },

        onChunk: (event: { chunk: { type: string; text?: string } }) => {
          chunkCount++;
          console.debug(`[${functionTag}] Stream text chunk`, {
            provider,
            modelName: this.modelName,
            chunkNumber: chunkCount,
            chunkLength: event.chunk.text?.length || 0,
            chunkType: event.chunk.type
          });
        }
      } as Parameters<typeof streamText>[0];

      if (analysisSchema) {
        streamOptions.experimental_output = Output.object({ schema: analysisSchema });
      }

      const result = streamText(streamOptions);
      return result;
    } catch (err) {
      console.error(`[${functionTag}] Exception`, {
        provider,
        modelName: this.modelName,
        message: 'Error in streaming text',
        err: String(err),
        promptLength: prompt.length
      });
      return null;
    }
  }

  /**
   * Processes text using non-streaming approach with optional schema validation
   * @param prompt - The input text prompt to analyze
   * @param analysisSchema - Optional Zod schema or Schema object for output validation
   * @returns Promise resolving to GenerateTextResult or null if operation fails
   */
  async generateText(
    prompt: string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>
  ): Promise<GenerateTextResult<ToolSet, unknown> | null> {
    const functionTag = 'GoogleVertexAI.generateText';
    const provider = 'vertex';

    try {
      console.log(`[${functionTag}] Generate request started`, {
        provider,
        modelName: this.modelName,
        isAnthropic: isAnthropicModel(this.modelName),
        promptLength: prompt.length
      });

      const model = await this.getModel();

      const generateOptions = {
        model: model,
        prompt: prompt,
        system: DEFAULT_SYSTEM_CONTEXT.systemPrompt
      } as Parameters<typeof generateText>[0];

      if (analysisSchema) {
        generateOptions.experimental_output = Output.object({ schema: analysisSchema });
      }

      console.log(`[${functionTag}] Generate text started`, {
        provider,
        modelName: this.modelName,
        isAnthropic: isAnthropicModel(this.modelName),
        promptLength: prompt.length
      });

      const result = await generateText(generateOptions);

      console.log(`[${functionTag}] Generate text completed`, {
        provider,
        modelName: this.modelName,
        usage: result.usage,
        finishReason: result.finishReason
      });

      return result;
    } catch (err) {
      console.error(`[${functionTag}] Exception`, {
        provider,
        modelName: this.modelName,
        message: 'Error in generating text',
        err: String(err)
      });
      return null;
    }
  }
}
