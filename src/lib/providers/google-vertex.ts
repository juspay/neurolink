import {
  createVertex,
  type GoogleVertexProviderSettings,
} from "@ai-sdk/google-vertex";
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
    const anthropicModule = await import("@ai-sdk/google-vertex/anthropic");
    _createVertexAnthropic = anthropicModule.createVertexAnthropic;
    logger.debug("[GoogleVertexAI] Anthropic module successfully loaded");
    return _createVertexAnthropic;
  } catch (error) {
    // Anthropic module not available
    logger.warn(
      "[GoogleVertexAI] Anthropic module not available. Install @ai-sdk/google-vertex ^2.2.0 for Anthropic model support.",
    );
    return null;
  }
}

// Configuration helpers
const getVertexProjectId = (): string => {
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.VERTEX_PROJECT_ID ||
    process.env.GOOGLE_VERTEX_PROJECT;
  if (!projectId) {
    throw new Error(
      `❌ Google Vertex AI Provider Configuration Error\n\nMissing required environment variables: GOOGLE_CLOUD_PROJECT_ID or VERTEX_PROJECT_ID\n\n🔧 Step 1: Get Google Cloud Credentials\n1. Visit: https://console.cloud.google.com/\n2. Create or select a project\n3. Enable Vertex AI API\n4. Set up authentication\n\n🔧 Step 2: Set Environment Variables\nAdd to your .env file:\nGOOGLE_CLOUD_PROJECT_ID=your_project_id_here\nGOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json\n\n🔧 Step 3: Restart Application\nRestart your application to load the new environment variables.`,
    );
  }
  return projectId;
};

const getVertexLocation = (): string => {
  return (
    process.env.GOOGLE_CLOUD_LOCATION ||
    process.env.VERTEX_LOCATION ||
    process.env.GOOGLE_VERTEX_LOCATION ||
    "us-central1"
  );
};

const getDefaultVertexModel = (): string => {
  return process.env.VERTEX_MODEL || "gemini-1.5-pro";
};

const hasGoogleCredentials = (): boolean => {
  return !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    (process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
      process.env.GOOGLE_AUTH_PRIVATE_KEY)
  );
};

/**
 * Google Vertex AI Provider v2 - BaseProvider Implementation
 *
 * PHASE 3.5: Simple BaseProvider wrap around existing @ai-sdk/google-vertex implementation
 *
 * Features:
 * - Extends BaseProvider for shared functionality
 * - Preserves existing Google Cloud authentication
 * - Maintains Anthropic model support via dynamic imports
 * - Uses pre-initialized Vertex instance for efficiency
 * - Enhanced error handling with setup guidance
 */
export class GoogleVertexProvider extends BaseProvider {
  private vertex: any;
  private model: LanguageModelV1;
  private projectId: string;
  private location: string;
  private cachedAnthropicModel: LanguageModelV1 | null = null;

  constructor(modelName?: string) {
    super(modelName, "vertex" as AIProviderName);

    // Validate Google Cloud credentials
    if (!hasGoogleCredentials()) {
      throw new Error(
        `❌ Google Vertex AI Provider Configuration Error\n\nMissing Google Cloud authentication. One of the following is required:\n\n🔧 Option 1: Service Account Key File\nGOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json\n\n🔧 Option 2: Service Account Key (Base64)\nGOOGLE_SERVICE_ACCOUNT_KEY=base64_encoded_key\n\n🔧 Option 3: Individual Credentials\nGOOGLE_AUTH_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com\nGOOGLE_AUTH_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...\n\n🔧 Step 4: Restart Application\nRestart your application to load the new environment variables.`,
      );
    }

    // Initialize Google Cloud configuration
    this.projectId = getVertexProjectId();
    this.location = getVertexLocation();

    const vertexConfig: GoogleVertexProviderSettings = {
      project: this.projectId,
      location: this.location,
    };

    // Create Vertex provider instance
    this.vertex = createVertex(vertexConfig);

    // Pre-initialize model for efficiency
    this.model = this.vertex(this.modelName || getDefaultVertexModel());

    logger.debug("Google Vertex AI BaseProvider v2 initialized", {
      modelName: this.modelName,
      projectId: this.projectId,
      location: this.location,
      provider: this.providerName,
    });
  }

  protected getProviderName(): AIProviderName {
    return "vertex" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultVertexModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for Google Vertex
   * Handles both Google and Anthropic models
   */
  protected async getAISDKModel(): Promise<LanguageModelV1> {
    // Check if this is an Anthropic model
    if (this.modelName && this.modelName.includes("claude")) {
      // Return cached Anthropic model if available
      if (this.cachedAnthropicModel) {
        return this.cachedAnthropicModel;
      }

      // Create and cache new Anthropic model
      const anthropicModel = await this.createAnthropicModel(this.modelName);
      if (anthropicModel) {
        this.cachedAnthropicModel = anthropicModel;
        return anthropicModel;
      }
      // Fall back to regular model if Anthropic not available
      logger.warn(
        `Anthropic model ${this.modelName} requested but not available, falling back to Google model`,
      );
    }

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
        `Google Vertex AI request timed out. Consider increasing timeout or using a lighter model.`,
        this.defaultTimeout,
      );
    }

    if (error.message?.includes("PERMISSION_DENIED")) {
      return new Error(
        `❌ Google Vertex AI Permission Denied\n\nYour Google Cloud credentials don't have permission to access Vertex AI.\n\n🔧 Required Steps:\n1. Ensure your service account has Vertex AI User role\n2. Check if Vertex AI API is enabled in your project\n3. Verify your project ID is correct\n4. Confirm your location/region has Vertex AI available`,
      );
    }

    if (error.message?.includes("NOT_FOUND")) {
      return new Error(
        `❌ Google Vertex AI Model Not Found\n\n${error.message}\n\n🔧 Check:\n1. Model name is correct (e.g., 'gemini-1.5-pro')\n2. Model is available in your region (${this.location})\n3. Your project has access to the model\n4. Model supports your request parameters`,
      );
    }

    if (error.message?.includes("QUOTA_EXCEEDED")) {
      return new Error(
        `❌ Google Vertex AI Quota Exceeded\n\n${error.message}\n\n🔧 Solutions:\n1. Check your Vertex AI quotas in Google Cloud Console\n2. Request quota increase if needed\n3. Try a different model or reduce request frequency\n4. Consider using a different region`,
      );
    }

    if (error.message?.includes("INVALID_ARGUMENT")) {
      return new Error(
        `❌ Google Vertex AI Invalid Request\n\n${error.message}\n\n🔧 Check:\n1. Request parameters are within model limits\n2. Input text is properly formatted\n3. Temperature and other settings are valid\n4. Model supports your request type`,
      );
    }

    return new Error(
      `❌ Google Vertex AI Provider Error\n\n${error.message || "Unknown error occurred"}\n\n🔧 Troubleshooting:\n1. Check Google Cloud credentials and permissions\n2. Verify project ID and location settings\n3. Ensure Vertex AI API is enabled\n4. Check network connectivity`,
    );
  }

  private validateStreamOptions(options: StreamOptions): void {
    if (!options.input?.text?.trim()) {
      throw new Error("Prompt is required for streaming");
    }

    if (
      options.maxTokens &&
      (options.maxTokens < 1 || options.maxTokens > 8192)
    ) {
      throw new Error(
        "maxTokens must be between 1 and 8192 for Google Vertex AI",
      );
    }

    if (
      options.temperature &&
      (options.temperature < 0 || options.temperature > 2)
    ) {
      throw new Error("temperature must be between 0 and 2");
    }
  }

  /**
   * Check if Anthropic models are available
   * @returns Promise<boolean> indicating if Anthropic support is available
   */
  async hasAnthropicSupport(): Promise<boolean> {
    const createVertexAnthropic = await getCreateVertexAnthropic();
    return createVertexAnthropic !== null;
  }

  /**
   * Create an Anthropic model instance if available
   * @param modelName Anthropic model name (e.g., 'claude-3-sonnet@20240229')
   * @returns LanguageModelV1 instance or null if not available
   */
  async createAnthropicModel(
    modelName: string,
  ): Promise<LanguageModelV1 | null> {
    const createVertexAnthropic = await getCreateVertexAnthropic();
    if (!createVertexAnthropic) {
      return null;
    }

    const vertexAnthropic = createVertexAnthropic({
      project: this.projectId,
      location: this.location,
    });

    return vertexAnthropic(modelName);
  }
}

export default GoogleVertexProvider;
