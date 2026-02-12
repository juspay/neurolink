import {
  createVertex,
  type GoogleVertexProviderSettings,
} from "@ai-sdk/google-vertex";
import {
  createVertexAnthropic,
  type GoogleVertexAnthropicProviderSettings,
} from "@ai-sdk/google-vertex/anthropic";
import {
  type LanguageModel,
  type LanguageModelV1,
  Output,
  type Schema,
  streamText,
  type Tool,
} from "ai";
import dns from "dns";
import fs from "fs";
import os from "os";
import path from "path";
import type { ZodType, ZodTypeDef } from "zod";
import {
  type AIProviderName,
  ErrorCategory,
  ErrorSeverity,
} from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import {
  DEFAULT_MAX_STEPS,
  DEFAULT_TOOL_MAX_RETRIES,
  GLOBAL_LOCATION_MODELS,
} from "../core/constants.js";
import { ModelConfigurationManager } from "../core/modelConfiguration.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type { UnknownRecord } from "../types/common.js";
import { AuthenticationError, ProviderError } from "../types/errors.js";
import type {
  EnhancedGenerateResult,
  TextGenerationOptions,
} from "../types/generateTypes.js";
import type { GenAIClient, GoogleGenAIClass } from "../types/providers.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { ZodUnknownSchema } from "../types/typeAliases.js";
import { ERROR_CODES, NeuroLinkError } from "../utils/errorHandling.js";
import { FileDetector } from "../utils/fileDetector.js";
import { logger } from "../utils/logger.js";
import { isGemini3Model } from "../utils/modelDetection.js";
import {
  createGoogleAuthConfig,
  createVertexProjectConfig,
  validateApiKey,
} from "../utils/providerConfig.js";
import {
  convertZodToJsonSchema,
  inlineJsonSchema,
} from "../utils/schemaConversion.js";
import {
  createNativeThinkingConfig,
  type ThinkingConfig,
} from "../utils/thinkingConfig.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";

// Import proper types for multimodal message handling

// Enhanced Anthropic support with direct imports
// Using the dual provider architecture from Vercel AI SDK
const hasAnthropicSupport = (): boolean => {
  try {
    // Verify the anthropic module is available
    return typeof createVertexAnthropic === "function";
  } catch {
    return false;
  }
};

// Configuration helpers - now using consolidated utility
const getVertexProjectId = (): string => {
  return validateApiKey(createVertexProjectConfig());
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
  // Use gemini-2.5-flash as default - latest and best price-performance model
  // Override with VERTEX_MODEL environment variable if needed
  return process.env.VERTEX_MODEL || "gemini-2.5-flash";
};

const hasGoogleCredentials = (): boolean => {
  return !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    (process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
      process.env.GOOGLE_AUTH_PRIVATE_KEY)
  );
};

// Enhanced Vertex settings creation with authentication fallback and proxy support
const createVertexSettings = async (
  region?: string,
): Promise<GoogleVertexProviderSettings> => {
  const location = region || getVertexLocation();
  const project = getVertexProjectId();

  const baseSettings: GoogleVertexProviderSettings = {
    project,
    location,
    fetch: createProxyFetch(),
  };

  // Special handling for global endpoint
  // Google's global endpoint uses aiplatform.googleapis.com (no region prefix)
  // instead of {region}-aiplatform.googleapis.com
  if (location === "global") {
    baseSettings.baseURL = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google`;
    logger.debug("[GoogleVertexProvider] Using global endpoint", {
      baseURL: baseSettings.baseURL,
      location,
      project,
    });
  }

  // 🎯 OPTION 2: Create credentials file from environment variables at runtime
  // This solves the problem where GOOGLE_APPLICATION_CREDENTIALS exists in ZSHRC locally
  // but the file doesn't exist on production servers

  // First, try to create credentials file from individual environment variables
  const requiredEnvVarsForFile = {
    type: process.env.GOOGLE_AUTH_TYPE,
    project_id: process.env.GOOGLE_AUTH_BREEZE_PROJECT_ID,
    private_key: process.env.GOOGLE_AUTH_PRIVATE_KEY,
    client_email: process.env.GOOGLE_AUTH_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_AUTH_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_AUTH_URI,
    token_uri: process.env.GOOGLE_AUTH_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_AUTH_CLIENT_CERT_URL,
    universe_domain: process.env.GOOGLE_AUTH_UNIVERSE_DOMAIN,
  };

  // If we have the essential fields, create a runtime credentials file
  if (
    requiredEnvVarsForFile.client_email &&
    requiredEnvVarsForFile.private_key
  ) {
    try {
      // Build complete service account credentials object
      const serviceAccountCredentials = {
        type: requiredEnvVarsForFile.type || "service_account",
        project_id: requiredEnvVarsForFile.project_id || getVertexProjectId(),
        private_key: requiredEnvVarsForFile.private_key.replace(/\\n/g, "\n"),
        client_email: requiredEnvVarsForFile.client_email,
        client_id: requiredEnvVarsForFile.client_id || "",
        auth_uri:
          requiredEnvVarsForFile.auth_uri ||
          "https://accounts.google.com/o/oauth2/auth",
        token_uri:
          requiredEnvVarsForFile.token_uri ||
          "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          requiredEnvVarsForFile.auth_provider_x509_cert_url ||
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: requiredEnvVarsForFile.client_x509_cert_url || "",
        universe_domain:
          requiredEnvVarsForFile.universe_domain || "googleapis.com",
      };

      // Create temporary credentials file
      const tmpDir = os.tmpdir();
      const credentialsFileName = `google-credentials-${Date.now()}-${Math.random().toString(36).substring(2, 11)}.json`;
      const credentialsFilePath = path.join(tmpDir, credentialsFileName);

      fs.writeFileSync(
        credentialsFilePath,
        JSON.stringify(serviceAccountCredentials, null, 2),
      );

      // Set the environment variable to point to our runtime-created file
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsFilePath;

      // Now continue with the normal flow - check if the file exists
      const fileExists = fs.existsSync(credentialsFilePath);
      if (fileExists) {
        return baseSettings;
      }
    } catch {
      // Silent error handling for runtime credentials file creation
    }
  }

  // 🎯 OPTION 1: Check for principal account authentication (Accept any valid GOOGLE_APPLICATION_CREDENTIALS file (service account OR ADC))
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK) {
    const credentialsPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK;

    // Check if the credentials file exists
    let fileExists = false;
    try {
      fileExists = fs.existsSync(credentialsPath);
    } catch {
      fileExists = false;
    }

    if (fileExists) {
      return baseSettings;
    }
  } else {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      // Check if the credentials file exists
      let fileExists = false;
      try {
        fileExists = fs.existsSync(credentialsPath);
      } catch {
        fileExists = false;
      }

      if (fileExists) {
        return baseSettings;
      }
    }
  }

  // Fallback to explicit credentials for development and production
  // Enhanced to check ALL required fields from the .env file configuration
  const requiredEnvVars = {
    type: process.env.GOOGLE_AUTH_TYPE,
    project_id: process.env.GOOGLE_AUTH_BREEZE_PROJECT_ID,
    private_key: process.env.GOOGLE_AUTH_PRIVATE_KEY,
    client_email: process.env.GOOGLE_AUTH_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_AUTH_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_AUTH_URI,
    token_uri: process.env.GOOGLE_AUTH_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_AUTH_CLIENT_CERT_URL,
    universe_domain: process.env.GOOGLE_AUTH_UNIVERSE_DOMAIN,
  };

  // Check if we have the minimal required fields (client_email and private_key are essential)
  if (requiredEnvVars.client_email && requiredEnvVars.private_key) {
    logger.debug("Using explicit service account credentials authentication", {
      authMethod: "explicit_service_account_credentials",
      hasType: !!requiredEnvVars.type,
      hasProjectId: !!requiredEnvVars.project_id,
      hasClientEmail: !!requiredEnvVars.client_email,
      hasPrivateKey: !!requiredEnvVars.private_key,
      hasClientId: !!requiredEnvVars.client_id,
      hasAuthUri: !!requiredEnvVars.auth_uri,
      hasTokenUri: !!requiredEnvVars.token_uri,
      hasAuthProviderCertUrl: !!requiredEnvVars.auth_provider_x509_cert_url,
      hasClientCertUrl: !!requiredEnvVars.client_x509_cert_url,
      hasUniverseDomain: !!requiredEnvVars.universe_domain,
      credentialsCompleteness: "using_individual_env_vars_as_fallback",
    });

    // Build complete service account credentials object
    const serviceAccountCredentials = {
      type: requiredEnvVars.type || "service_account",
      project_id: requiredEnvVars.project_id || getVertexProjectId(),
      private_key: requiredEnvVars.private_key.replace(/\\n/g, "\n"),
      client_email: requiredEnvVars.client_email,
      client_id: requiredEnvVars.client_id || "",
      auth_uri:
        requiredEnvVars.auth_uri || "https://accounts.google.com/o/oauth2/auth",
      token_uri:
        requiredEnvVars.token_uri || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url:
        requiredEnvVars.auth_provider_x509_cert_url ||
        "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: requiredEnvVars.client_x509_cert_url || "",
      universe_domain: requiredEnvVars.universe_domain || "googleapis.com",
    };

    return {
      ...baseSettings,
      googleAuthOptions: {
        credentials: serviceAccountCredentials,
      },
    };
  }

  // Log comprehensive warning if no valid authentication is available
  logger.warn("No valid authentication found for Google Vertex AI", {
    authMethod: "none",
    authenticationAttempts: {
      principalAccountFile: {
        envVarSet: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        filePath: process.env.GOOGLE_APPLICATION_CREDENTIALS || "NOT_SET",
        fileExists: false, // We already checked above
      },
      explicitCredentials: {
        hasClientEmail: !!requiredEnvVars.client_email,
        hasPrivateKey: !!requiredEnvVars.private_key,
        hasProjectId: !!requiredEnvVars.project_id,
        hasType: !!requiredEnvVars.type,
        missingFields: Object.entries(requiredEnvVars)
          .filter(([_key, value]) => !value)
          .map(([key]) => key),
      },
    },
    troubleshooting: [
      "1. Ensure GOOGLE_APPLICATION_CREDENTIALS points to an existing file, OR",
      "2. Set individual environment variables: GOOGLE_AUTH_CLIENT_EMAIL and GOOGLE_AUTH_PRIVATE_KEY",
    ],
  });
  return baseSettings;
};

// Create Anthropic-specific Vertex settings with the same authentication and proxy support
const createVertexAnthropicSettings = async (
  region?: string,
): Promise<GoogleVertexAnthropicProviderSettings> => {
  const baseVertexSettings = await createVertexSettings(region);

  // GoogleVertexAnthropicProviderSettings extends GoogleVertexProviderSettings
  // so we can use the same settings with proper typing
  return {
    project: baseVertexSettings.project,
    location: baseVertexSettings.location,
    fetch: baseVertexSettings.fetch,
    ...(baseVertexSettings.googleAuthOptions && {
      googleAuthOptions: baseVertexSettings.googleAuthOptions,
    }),
  } as GoogleVertexAnthropicProviderSettings;
};

// Helper function to determine if a model is an Anthropic model
const isAnthropicModel = (modelName: string): boolean => {
  return modelName.toLowerCase().includes("claude");
};

/**
 * Google Vertex AI Provider v2 - BaseProvider Implementation
 *
 * Features:
 * - Extends BaseProvider for shared functionality
 * - Preserves existing Google Cloud authentication
 * - Maintains Anthropic model support via dynamic imports
 * - Fresh model creation for each request
 * - Enhanced error handling with setup guidance
 * - Tool registration and context management
 *
 * @important Structured Output Limitation (Gemini Models Only)
 * Google Gemini models on Vertex AI cannot combine function calling (tools) with
 * structured output (JSON schema). When using schemas, you MUST set disableTools: true.
 *
 * Error without disableTools:
 * "Function calling with a response mime type: 'application/json' is unsupported"
 *
 * This limitation ONLY affects Gemini models. Anthropic Claude models via Vertex
 * AI do NOT have this limitation and support both tools + schemas simultaneously.
 *
 * @example Gemini models with schemas
 * ```typescript
 * const provider = new GoogleVertexProvider("gemini-2.5-flash");
 * const result = await provider.generate({
 *   input: { text: "Analyze data" },
 *   schema: MySchema,
 *   output: { format: "json" },
 *   disableTools: true  // Required for Gemini models
 * });
 * ```
 *
 * @example Claude models (no limitation)
 * ```typescript
 * const provider = new GoogleVertexProvider("claude-3-5-sonnet-20241022");
 * const result = await provider.generate({
 *   input: { text: "Analyze data" },
 *   schema: MySchema,
 *   output: { format: "json" }
 *   // No disableTools needed - Claude supports both
 * });
 * ```
 *
 * @note Gemini 3 Pro Preview (November 2025) will support combining tools + schemas
 * @see https://cloud.google.com/vertex-ai/docs/generative-ai/learn/models
 */
export class GoogleVertexProvider extends BaseProvider {
  private projectId: string;
  private location: string;
  private registeredTools: Map<
    string,
    {
      description: string;
      parameters: ZodType<unknown>;
      execute: (params: Record<string, unknown>) => Promise<unknown>;
    }
  > = new Map();
  private toolContext: Record<string, unknown> = {};

  // Memory-managed cache for model configuration lookups to avoid repeated calls
  // Uses WeakMap for automatic cleanup and bounded LRU for recently used models
  private static modelConfigCache: Map<string, unknown> = new Map();
  private static modelConfigCacheTime = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 50; // Prevent memory leaks by limiting cache size

  // Memory-managed cache for maxTokens handling decisions to optimize streaming performance
  private static maxTokensCache: Map<string, boolean> = new Map();
  private static maxTokensCacheTime = 0;

  constructor(
    modelName?: string,
    _providerName?: string,
    sdk?: unknown,
    region?: string,
  ) {
    super(modelName, "vertex" as AIProviderName, sdk as NeuroLink | undefined);

    // Validate Google Cloud credentials - now using consolidated utility
    if (!hasGoogleCredentials()) {
      validateApiKey(createGoogleAuthConfig());
    }

    // Initialize Google Cloud configuration
    this.projectId = getVertexProjectId();
    this.location = region || getVertexLocation();

    logger.debug("[GoogleVertexProvider] Constructor initialized", {
      regionParam: region,
      resolvedLocation: this.location,
      projectId: this.projectId,
    });

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
   * Get the default embedding model for Google Vertex
   * @returns The default Vertex AI embedding model name
   */
  protected getDefaultEmbeddingModel(): string {
    return (
      process.env.VERTEX_EMBEDDING_MODEL ||
      process.env.GOOGLE_EMBEDDING_MODEL ||
      "text-embedding-004"
    );
  }

  /**
   * Returns the Vercel AI SDK model instance for Google Vertex
   * Creates fresh model instances for each request
   */
  protected async getAISDKModel(): Promise<LanguageModel> {
    const model = await this.getModel();
    return model as LanguageModel;
  }

  /**
   * Initialize model creation tracking
   */
  private initializeModelCreationLogging(): {
    modelCreationId: string;
    modelCreationStartTime: number;
    modelCreationHrTimeStart: bigint;
    modelName: string;
  } {
    const modelCreationId = `vertex-model-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const modelCreationStartTime = Date.now();
    const modelCreationHrTimeStart = process.hrtime.bigint();
    const modelName = this.modelName || getDefaultVertexModel();

    return {
      modelCreationId,
      modelCreationStartTime,
      modelCreationHrTimeStart,
      modelName,
    };
  }

  /**
   * Check if model is Anthropic-based and attempt creation
   */
  private async attemptAnthropicModelCreation(
    modelName: string,
    modelCreationId: string,
    modelCreationStartTime: number,
    modelCreationHrTimeStart: bigint,
  ): Promise<LanguageModelV1 | null> {
    const isAnthropic = isAnthropicModel(modelName);

    if (!isAnthropic) {
      return null;
    }

    logger.debug("Creating Anthropic model using vertexAnthropic provider", {
      modelName,
    });

    if (!hasAnthropicSupport()) {
      logger.warn(
        `[GoogleVertexProvider] Anthropic support not available, falling back to Google model`,
      );
      return null;
    }

    try {
      const anthropicModel = await this.createAnthropicModel(modelName);

      if (anthropicModel) {
        return anthropicModel;
      }

      // Anthropic model creation returned null, falling back to Google model
    } catch (error) {
      logger.error(
        `[GoogleVertexProvider] ❌ LOG_POINT_V006_ANTHROPIC_MODEL_ERROR`,
        {
          logPoint: "V006_ANTHROPIC_MODEL_ERROR",
          modelCreationId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - modelCreationStartTime,
          elapsedNs: (
            process.hrtime.bigint() - modelCreationHrTimeStart
          ).toString(),
          modelName,
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorStack: error instanceof Error ? error.stack : undefined,
          fallbackToGoogle: true,
          message:
            "Anthropic model creation failed - falling back to Google model",
        },
      );
    }

    // Fall back to regular model if Anthropic not available
    logger.warn(
      `Anthropic model ${modelName} requested but not available, falling back to Google model`,
    );
    return null;
  }

  /**
   * Create Google Vertex model with comprehensive logging and error handling
   */
  private async createGoogleVertexModel(
    modelName: string,
    modelCreationId: string,
    modelCreationStartTime: number,
    modelCreationHrTimeStart: bigint,
  ): Promise<LanguageModelV1> {
    logger.debug("Creating Google Vertex model", {
      modelName,
      project: this.projectId,
      location: this.location,
    });

    const vertexSettingsStartTime = process.hrtime.bigint();
    logger.debug(
      `[GoogleVertexProvider] ⚙️ LOG_POINT_V008_VERTEX_SETTINGS_START`,
      {
        logPoint: "V008_VERTEX_SETTINGS_START",
        modelCreationId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - modelCreationStartTime,
        elapsedNs: (
          process.hrtime.bigint() - modelCreationHrTimeStart
        ).toString(),
        vertexSettingsStartTimeNs: vertexSettingsStartTime.toString(),

        // Network configuration analysis
        networkConfig: {
          projectId: this.projectId,
          location: this.location,
          expectedEndpoint: `https://${this.location}-aiplatform.googleapis.com`,
          httpProxy: process.env.HTTP_PROXY || process.env.http_proxy,
          httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy,
          noProxy: process.env.NO_PROXY || process.env.no_proxy,
          proxyConfigured: !!(
            process.env.HTTP_PROXY ||
            process.env.HTTPS_PROXY ||
            process.env.http_proxy ||
            process.env.https_proxy
          ),
        },

        message:
          "Starting Vertex settings creation with network configuration analysis",
      },
    );

    try {
      const vertexSettings = await createVertexSettings(this.location);

      const vertexSettingsEndTime = process.hrtime.bigint();
      const vertexSettingsDurationNs =
        vertexSettingsEndTime - vertexSettingsStartTime;

      logger.debug(
        `[GoogleVertexProvider] ✅ LOG_POINT_V009_VERTEX_SETTINGS_SUCCESS`,
        {
          logPoint: "V009_VERTEX_SETTINGS_SUCCESS",
          modelCreationId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - modelCreationStartTime,
          elapsedNs: (
            process.hrtime.bigint() - modelCreationHrTimeStart
          ).toString(),
          vertexSettingsDurationNs: vertexSettingsDurationNs.toString(),
          vertexSettingsDurationMs: Number(vertexSettingsDurationNs) / 1000000,

          // Settings analysis
          vertexSettingsAnalysis: {
            hasSettings: !!vertexSettings,
            settingsType: typeof vertexSettings,
            settingsKeys: vertexSettings ? Object.keys(vertexSettings) : [],
            projectId: vertexSettings?.project,
            location: vertexSettings?.location,
            hasFetch: !!vertexSettings?.fetch,
            hasGoogleAuthOptions: !!vertexSettings?.googleAuthOptions,
            settingsSize: vertexSettings
              ? JSON.stringify(vertexSettings).length
              : 0,
          },

          message: "Vertex settings created successfully",
        },
      );

      return await this.createVertexInstance(
        vertexSettings,
        modelName,
        modelCreationId,
        modelCreationStartTime,
        modelCreationHrTimeStart,
      );
    } catch (error) {
      const vertexSettingsErrorTime = process.hrtime.bigint();
      const vertexSettingsDurationNs =
        vertexSettingsErrorTime - vertexSettingsStartTime;
      const totalErrorDurationNs =
        vertexSettingsErrorTime - modelCreationHrTimeStart;

      logger.error(
        `[GoogleVertexProvider] ❌ LOG_POINT_V014_VERTEX_SETTINGS_ERROR`,
        {
          logPoint: "V014_VERTEX_SETTINGS_ERROR",
          modelCreationId,
          timestamp: new Date().toISOString(),
          totalElapsedMs: Date.now() - modelCreationStartTime,
          totalElapsedNs: totalErrorDurationNs.toString(),
          totalErrorDurationMs: Number(totalErrorDurationNs) / 1000000,
          vertexSettingsDurationNs: vertexSettingsDurationNs.toString(),
          vertexSettingsDurationMs: Number(vertexSettingsDurationNs) / 1000000,

          // Comprehensive error analysis
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorStack: error instanceof Error ? error.stack : undefined,

          // Network diagnostic information
          networkDiagnostics: {
            errorCode: (error as Record<string, unknown>)?.code || "UNKNOWN",
            errorErrno: (error as Record<string, unknown>)?.errno || "UNKNOWN",
            errorAddress:
              (error as Record<string, unknown>)?.address || "UNKNOWN",
            errorPort: (error as Record<string, unknown>)?.port || "UNKNOWN",
            errorSyscall:
              (error as Record<string, unknown>)?.syscall || "UNKNOWN",
            errorHostname:
              (error as Record<string, unknown>)?.hostname || "UNKNOWN",
            isTimeoutError:
              error instanceof Error &&
              (error.message.includes("timeout") ||
                error.message.includes("ETIMEDOUT")),
            isNetworkError:
              error instanceof Error &&
              (error.message.includes("ENOTFOUND") ||
                error.message.includes("ECONNREFUSED") ||
                error.message.includes("ETIMEDOUT")),
            isAuthError:
              error instanceof Error &&
              (error.message.includes("PERMISSION_DENIED") ||
                error.message.includes("401") ||
                error.message.includes("403")),
            infrastructureIssue:
              error instanceof Error &&
              error.message.includes("ETIMEDOUT") &&
              error.message.includes("aiplatform.googleapis.com"),
          },

          // Environment at error time
          errorEnvironment: {
            httpProxy: process.env.HTTP_PROXY || process.env.http_proxy,
            httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy,
            googleAppCreds:
              process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK ||
              process.env.GOOGLE_APPLICATION_CREDENTIALS ||
              "NOT_SET",
            hasGoogleServiceKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
          },

          message:
            "Vertex settings creation failed - critical network/authentication error",
        },
      );

      throw error;
    }
  }

  /**
   * Create Vertex AI instance and model with comprehensive logging
   */
  private async createVertexInstance(
    vertexSettings: unknown,
    modelName: string,
    modelCreationId: string,
    modelCreationStartTime: number,
    modelCreationHrTimeStart: bigint,
  ): Promise<LanguageModelV1> {
    const vertexInstanceStartTime = process.hrtime.bigint();
    logger.debug(
      `[GoogleVertexProvider] 🏗️ LOG_POINT_V010_VERTEX_INSTANCE_START`,
      {
        logPoint: "V010_VERTEX_INSTANCE_START",
        modelCreationId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - modelCreationStartTime,
        elapsedNs: (
          process.hrtime.bigint() - modelCreationHrTimeStart
        ).toString(),
        vertexInstanceStartTimeNs: vertexInstanceStartTime.toString(),

        // Pre-creation network environment
        networkEnvironment: {
          dnsServers: (() => {
            try {
              return dns.getServers ? dns.getServers() : "NOT_AVAILABLE";
            } catch {
              return "NOT_AVAILABLE";
            }
          })(),
          networkInterfaces: (() => {
            try {
              return Object.keys(os.networkInterfaces());
            } catch {
              return [];
            }
          })(),
          hostname: (() => {
            try {
              return os.hostname();
            } catch {
              return "UNKNOWN";
            }
          })(),
          platform: (() => {
            try {
              return os.platform();
            } catch {
              return "UNKNOWN";
            }
          })(),
          release: (() => {
            try {
              return os.release();
            } catch {
              return "UNKNOWN";
            }
          })(),
        },

        message: "Creating Vertex AI instance",
      },
    );

    const vertex = createVertex(vertexSettings as GoogleVertexProviderSettings);

    const vertexInstanceEndTime = process.hrtime.bigint();
    const vertexInstanceDurationNs =
      vertexInstanceEndTime - vertexInstanceStartTime;

    logger.debug(
      `[GoogleVertexProvider] ✅ LOG_POINT_V011_VERTEX_INSTANCE_SUCCESS`,
      {
        logPoint: "V011_VERTEX_INSTANCE_SUCCESS",
        modelCreationId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - modelCreationStartTime,
        elapsedNs: (
          process.hrtime.bigint() - modelCreationHrTimeStart
        ).toString(),
        vertexInstanceDurationNs: vertexInstanceDurationNs.toString(),
        vertexInstanceDurationMs: Number(vertexInstanceDurationNs) / 1000000,
        hasVertexInstance: !!vertex,
        vertexInstanceType: typeof vertex,
        message: "Vertex AI instance created successfully",
      },
    );

    const modelInstanceStartTime = process.hrtime.bigint();
    logger.debug(
      `[GoogleVertexProvider] 🎯 LOG_POINT_V012_MODEL_INSTANCE_START`,
      {
        logPoint: "V012_MODEL_INSTANCE_START",
        modelCreationId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - modelCreationStartTime,
        elapsedNs: (
          process.hrtime.bigint() - modelCreationHrTimeStart
        ).toString(),
        modelInstanceStartTimeNs: modelInstanceStartTime.toString(),
        modelName,
        hasVertexInstance: !!vertex,
        message: "Creating model instance from Vertex AI instance",
      },
    );

    const model = vertex(modelName);

    const modelInstanceEndTime = process.hrtime.bigint();
    const modelInstanceDurationNs =
      modelInstanceEndTime - modelInstanceStartTime;
    const totalModelCreationDurationNs =
      modelInstanceEndTime - modelCreationHrTimeStart;

    logger.info(
      `[GoogleVertexProvider] 🏁 LOG_POINT_V013_MODEL_CREATION_COMPLETE`,
      {
        logPoint: "V013_MODEL_CREATION_COMPLETE",
        modelCreationId,
        timestamp: new Date().toISOString(),
        totalElapsedMs: Date.now() - modelCreationStartTime,
        totalElapsedNs: totalModelCreationDurationNs.toString(),
        totalDurationMs: Number(totalModelCreationDurationNs) / 1000000,
        modelInstanceDurationNs: modelInstanceDurationNs.toString(),
        modelInstanceDurationMs: Number(modelInstanceDurationNs) / 1000000,

        // Final model analysis
        finalModel: {
          hasModel: !!model,
          modelType: typeof model,
          modelName,
          isAnthropicModel: isAnthropicModel(modelName),
          projectId: this.projectId,
          location: this.location,
        },

        // Performance summary
        performanceSummary: {
          vertexSettingsDurationMs: Number(vertexInstanceDurationNs) / 1000000,
          vertexInstanceDurationMs: Number(vertexInstanceDurationNs) / 1000000,
          modelInstanceDurationMs: Number(modelInstanceDurationNs) / 1000000,
          totalDurationMs: Number(totalModelCreationDurationNs) / 1000000,
        },

        // Memory usage
        finalMemoryUsage: process.memoryUsage(),

        message: "Model creation completed successfully - ready for API calls",
      },
    );

    return model as LanguageModelV1;
  }

  /**
   * Gets the appropriate model instance (Google or Anthropic)
   * Uses dual provider architecture for proper model routing
   * Creates fresh instances for each request to ensure proper authentication
   */
  private async getModel(): Promise<LanguageModelV1> {
    // Initialize logging and setup
    const {
      modelCreationId,
      modelCreationStartTime,
      modelCreationHrTimeStart,
      modelName,
    } = this.initializeModelCreationLogging();

    // Check if this is an Anthropic model and attempt creation
    const anthropicModel = await this.attemptAnthropicModelCreation(
      modelName,
      modelCreationId,
      modelCreationStartTime,
      modelCreationHrTimeStart,
    );

    if (anthropicModel) {
      return anthropicModel;
    }

    // Fall back to Google Vertex model creation
    return await this.createGoogleVertexModel(
      modelName,
      modelCreationId,
      modelCreationStartTime,
      modelCreationHrTimeStart,
    );
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  /**
   * Validate stream options
   */
  private validateStreamOptionsOnly(options: StreamOptions): void {
    this.validateStreamOptions(options);
  }

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    // Check if this is a Gemini 3 model with tools - use native SDK for thought_signature
    const gemini3CheckModelName =
      options.model || this.modelName || getDefaultVertexModel();

    // Check for tools from options AND from SDK (MCP tools)
    // Need to check early if we should route to native SDK
    const gemini3CheckShouldUseTools =
      !options.disableTools && this.supportsTools();
    const optionTools = options.tools || {};
    const sdkTools = gemini3CheckShouldUseTools ? await this.getAllTools() : {};
    const combinedToolCount =
      Object.keys(optionTools).length + Object.keys(sdkTools).length;
    const hasTools = gemini3CheckShouldUseTools && combinedToolCount > 0;

    if (isGemini3Model(gemini3CheckModelName) && hasTools) {
      // Process CSV files before routing to native SDK (bypasses normal message builder)
      const processedOptions = await this.processCSVFilesForNativeSDK(options);

      // Merge SDK tools into options for native SDK path
      const mergedOptions = {
        ...processedOptions,
        tools: { ...sdkTools, ...optionTools },
      };
      logger.info(
        "[GoogleVertex] Routing Gemini 3 to native SDK for tool calling",
        {
          model: gemini3CheckModelName,
          optionToolCount: Object.keys(optionTools).length,
          sdkToolCount: Object.keys(sdkTools).length,
          totalToolCount: combinedToolCount,
        },
      );
      return this.executeNativeGemini3Stream(mergedOptions);
    }

    // Initialize stream execution tracking
    const functionTag = "GoogleVertexProvider.executeStream";
    let chunkCount = 0;

    // Setup timeout controller
    const timeout = this.getTimeout(options);

    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      // Validate stream options
      this.validateStreamOptionsOnly(options);

      // Build message array from options with multimodal support
      // Using protected helper from BaseProvider to eliminate code duplication
      const messages = await this.buildMessagesForStream(options);

      const model = await this.getAISDKModelWithMiddleware(options); // This is where network connection happens!

      // Get all available tools (direct + MCP + external + user-provided RAG tools) for streaming
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const baseStreamTools = shouldUseTools ? await this.getAllTools() : {};
      const tools = shouldUseTools
        ? { ...baseStreamTools, ...(options.tools || {}) }
        : {};

      logger.debug(`${functionTag}: Tools for streaming`, {
        shouldUseTools,
        baseToolCount: Object.keys(baseStreamTools).length,
        externalToolCount: Object.keys(options.tools || {}).length,
        toolCount: Object.keys(tools).length,
        toolNames: Object.keys(tools),
      });

      // Model-specific maxTokens handling
      const modelName = this.modelName || getDefaultVertexModel();

      // Use cached model configuration to determine maxTokens handling for streaming performance
      // This avoids hardcoded model-specific logic and repeated config lookups
      const shouldSetMaxTokens = this.shouldSetMaxTokensCached(modelName);
      const maxTokens = shouldSetMaxTokens
        ? options.maxTokens // No default limit
        : undefined;

      // Build complete stream options with proper typing
      let streamOptions: Parameters<typeof streamText>[0] = {
        model: model,
        messages: messages,
        temperature: options.temperature,
        ...(maxTokens && { maxTokens }),
        ...(shouldUseTools &&
          Object.keys(tools).length > 0 && {
            tools,
            toolChoice: "auto",
            maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
          }),
        abortSignal: timeoutController?.controller.signal,
        experimental_telemetry:
          this.telemetryHandler.getTelemetryConfig(options),
        // Gemini 3: use thinkingLevel via providerOptions (Vertex AI)
        // Gemini 2.5: use thinkingBudget via providerOptions
        ...(options.thinkingConfig?.enabled && {
          providerOptions: {
            vertex: {
              thinkingConfig: {
                ...(options.thinkingConfig.thinkingLevel && {
                  thinkingLevel: options.thinkingConfig.thinkingLevel,
                }),
                ...(options.thinkingConfig.budgetTokens &&
                  !options.thinkingConfig.thinkingLevel && {
                    thinkingBudget: options.thinkingConfig.budgetTokens,
                  }),
                includeThoughts: true,
              },
            },
          },
        }),

        onError: (event: { error: unknown }) => {
          const error = event.error;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error(`${functionTag}: Stream error`, {
            provider: this.providerName,
            modelName: this.modelName,
            error: errorMessage,
            chunkCount,
          });
        },

        onFinish: (event: {
          finishReason: string;
          usage: Record<string, unknown>;
          text?: string;
        }) => {
          logger.debug(`${functionTag}: Stream finished`, {
            finishReason: event.finishReason,
            totalChunks: chunkCount,
          });
        },

        onChunk: () => {
          chunkCount++;
        },

        onStepFinish: ({ toolCalls, toolResults }) => {
          logger.info("Tool execution completed", { toolResults, toolCalls });

          // Handle tool execution storage
          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn(
              "[GoogleVertexProvider] Failed to store tool executions",
              {
                provider: this.providerName,
                error: error instanceof Error ? error.message : String(error),
              },
            );
          });
        },
      };

      if (analysisSchema) {
        try {
          streamOptions = {
            ...streamOptions,
            experimental_output: Output.object({
              schema: analysisSchema,
            }),
          };
        } catch (error) {
          logger.warn("Schema application failed, continuing without schema", {
            error: String(error),
          });
        }
      }

      const result = streamText(streamOptions);

      timeoutController?.cleanup();

      // Transform string stream to content object stream using BaseProvider method
      const transformedStream = this.createTextStream(result);

      // Track tool calls and results for streaming
      const toolCalls: Array<{
        toolName: string;
        parameters: Record<string, unknown>;
        id?: string;
      }> = [];
      const toolResults: Array<{
        toolName: string;
        status: "success" | "failure";
        result?: unknown;
        error?: string;
      }> = [];

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        ...(shouldUseTools && {
          toolCalls,
          toolResults,
        }),
      };
    } catch (error) {
      timeoutController?.cleanup();
      logger.error(`${functionTag}: Exception`, {
        provider: this.providerName,
        modelName: this.modelName,
        error: String(error),
        chunkCount,
      });
      throw this.handleProviderError(error);
    }
  }

  /**
   * Create @google/genai client configured for Vertex AI
   */
  private async createVertexGenAIClient(
    regionOverride?: string,
  ): Promise<GenAIClient> {
    const project = getVertexProjectId();
    const location = regionOverride || this.location || getVertexLocation();

    const mod: unknown = await import("@google/genai");
    const ctor = (mod as Record<string, unknown>).GoogleGenAI as unknown;
    if (!ctor) {
      throw new NeuroLinkError({
        code: ERROR_CODES.INVALID_CONFIGURATION,
        message: "@google/genai does not export GoogleGenAI",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.CRITICAL,
        retriable: false,
        context: { module: "@google/genai", expectedExport: "GoogleGenAI" },
      });
    }

    const Ctor = ctor as GoogleGenAIClass;

    // Use vertexai mode with project and location
    return new Ctor({
      vertexai: true,
      project,
      location,
    });
  }

  // ── Shared helpers for native Gemini 3 SDK methods ──

  /**
   * Build multimodal content parts (user message) from input text, PDFs, and images.
   * Shared by both stream and generate native Gemini 3 paths.
   */
  private buildNativeContentParts(
    inputText: string,
    multimodalInput:
      | {
          text?: string;
          pdfFiles?: Array<Buffer | string>;
          images?: Array<Buffer | string>;
        }
      | undefined,
    logLabel: string,
  ): Array<{
    role: string;
    parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    >;
  }> {
    type NativePart =
      | { text: string }
      | { inlineData: { mimeType: string; data: string } };

    const userParts: NativePart[] = [{ text: inputText }];

    // Add PDF files as inlineData parts if present
    if (multimodalInput?.pdfFiles && multimodalInput.pdfFiles.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.pdfFiles.length} PDF file(s) for ${logLabel}`,
      );

      for (const pdfFile of multimodalInput.pdfFiles) {
        let pdfBuffer: Buffer;

        if (typeof pdfFile === "string") {
          if (fs.existsSync(pdfFile)) {
            pdfBuffer = fs.readFileSync(pdfFile);
          } else {
            pdfBuffer = Buffer.from(pdfFile, "base64");
          }
        } else {
          pdfBuffer = pdfFile;
        }

        const base64Data = pdfBuffer.toString("base64");
        userParts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data,
          },
        });
      }
    }

    // Add images as inlineData parts if present
    if (multimodalInput?.images && multimodalInput.images.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.images.length} image(s) for ${logLabel}`,
      );

      for (const image of multimodalInput.images) {
        let imageBuffer: Buffer;
        let mimeType = "image/jpeg"; // Default

        if (typeof image === "string") {
          if (fs.existsSync(image)) {
            imageBuffer = fs.readFileSync(image);
            const ext = path.extname(image).toLowerCase();
            if (ext === ".png") {
              mimeType = "image/png";
            } else if (ext === ".gif") {
              mimeType = "image/gif";
            } else if (ext === ".webp") {
              mimeType = "image/webp";
            }
          } else if (image.startsWith("data:")) {
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              imageBuffer = Buffer.from(matches[2], "base64");
            } else {
              continue; // Skip invalid data URL
            }
          } else {
            imageBuffer = Buffer.from(image, "base64");
          }
        } else {
          imageBuffer = image;
        }

        const base64Data = imageBuffer.toString("base64");
        userParts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }
    }

    return [
      {
        role: "user",
        parts: userParts,
      },
    ];
  }

  /**
   * Convert Vercel AI SDK tools to @google/genai FunctionDeclarations and build an execute map.
   * Shared by both stream and generate native Gemini 3 paths.
   */
  private convertToolsToNativeFunctionDeclarations(
    toolsMap: Record<string, Tool>,
    logLabel: string,
  ): {
    tools:
      | Array<{
          functionDeclarations: Array<{
            name: string;
            description: string;
            parametersJsonSchema?: Record<string, unknown>;
          }>;
        }>
      | undefined;
    executeMap: Map<string, Tool["execute"]>;
  } {
    type FunctionDeclaration = {
      name: string;
      description: string;
      parametersJsonSchema?: Record<string, unknown>;
    };

    if (Object.keys(toolsMap).length === 0) {
      return { tools: undefined, executeMap: new Map() };
    }

    const functionDeclarations: FunctionDeclaration[] = [];
    const executeMap = new Map<string, Tool["execute"]>();

    for (const [name, tool] of Object.entries(toolsMap)) {
      const decl: FunctionDeclaration = {
        name,
        description: tool.description || `Tool: ${name}`,
      };

      if (tool.parameters) {
        const rawSchema = convertZodToJsonSchema(
          tool.parameters as ZodUnknownSchema,
        ) as Record<string, unknown>;
        decl.parametersJsonSchema = inlineJsonSchema(rawSchema);
        if (decl.parametersJsonSchema.$schema) {
          delete decl.parametersJsonSchema.$schema;
        }
      }

      functionDeclarations.push(decl);

      if (tool.execute) {
        executeMap.set(name, tool.execute);
      }
    }

    logger.debug(`[GoogleVertex] Converted tools for ${logLabel}`, {
      toolCount: functionDeclarations.length,
      toolNames: functionDeclarations.map((t) => t.name),
    });

    return {
      tools: [{ functionDeclarations }],
      executeMap,
    };
  }

  /**
   * Build the native @google/genai config object for generate/stream calls.
   * Shared by both stream and generate native Gemini 3 paths.
   */
  private buildNativeGenerateConfig(
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      thinkingConfig?: ThinkingConfig;
    },
    tools:
      | Array<{
          functionDeclarations: Array<{
            name: string;
            description: string;
            parametersJsonSchema?: Record<string, unknown>;
          }>;
        }>
      | undefined,
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {
      temperature: options.temperature ?? 1.0,
      maxOutputTokens: options.maxTokens,
    };

    if (tools) {
      config.tools = tools;
    }

    if (options.systemPrompt) {
      config.systemInstruction = options.systemPrompt;
    }

    const nativeThinkingConfig = createNativeThinkingConfig(
      options.thinkingConfig,
    );
    if (nativeThinkingConfig) {
      config.thinkingConfig = nativeThinkingConfig;
    }

    return config;
  }

  /**
   * Compute a safe maxSteps value from raw input.
   */
  private computeMaxSteps(rawMaxSteps: number | undefined): number {
    const raw = rawMaxSteps || DEFAULT_MAX_STEPS;
    return Number.isFinite(raw) && raw > 0
      ? Math.min(Math.floor(raw), 100)
      : Math.min(DEFAULT_MAX_STEPS, 100);
  }

  /**
   * Extract text from raw native SDK response parts, filtering out non-text parts
   * (thoughtSignature, functionCall) to avoid SDK warnings.
   */
  private extractTextFromRawParts(rawParts: unknown[]): string {
    return rawParts
      .filter(
        (part): part is { text: string } =>
          typeof (part as Record<string, unknown>).text === "string",
      )
      .map((part) => part.text)
      .join("");
  }

  /**
   * Execute a set of function calls from the model, tracking failures and retries.
   * Returns function response parts to be added to conversation history.
   * Shared by both stream and generate native Gemini 3 paths.
   */
  private async executeNativeFunctionCalls(
    calls: Array<{ name: string; args: Record<string, unknown> }>,
    executeMap: Map<string, Tool["execute"]>,
    failedTools: Map<string, { count: number; lastError: string }>,
    allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }>,
    toolExecutions?: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }>,
  ): Promise<Array<{ functionResponse: { name: string; response: unknown } }>> {
    const functionResponses: Array<{
      functionResponse: { name: string; response: unknown };
    }> = [];

    for (const call of calls) {
      allToolCalls.push({ toolName: call.name, args: call.args });

      // Check if this tool has already exceeded retry limit
      const failedInfo = failedTools.get(call.name);
      if (failedInfo && failedInfo.count >= DEFAULT_TOOL_MAX_RETRIES) {
        logger.warn(
          `[GoogleVertex] Tool "${call.name}" has exceeded retry limit (${DEFAULT_TOOL_MAX_RETRIES}), skipping execution`,
        );

        const errorOutput = {
          error: `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${failedInfo.count} times and will not be retried. Last error: ${failedInfo.lastError}. Please proceed without using this tool or inform the user that this functionality is unavailable.`,
          status: "permanently_failed",
          do_not_retry: true,
        };

        toolExecutions?.push({
          name: call.name,
          input: call.args,
          output: errorOutput,
        });

        functionResponses.push({
          functionResponse: { name: call.name, response: errorOutput },
        });
        continue;
      }

      const execute = executeMap.get(call.name);
      if (execute) {
        try {
          const toolOptions = {
            toolCallId: `${call.name}-${Date.now()}`,
            messages: [],
            abortSignal: undefined as AbortSignal | undefined,
          };
          const result = await execute(call.args, toolOptions);

          toolExecutions?.push({
            name: call.name,
            input: call.args,
            output: result,
          });

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result },
            },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          const currentFailInfo = failedTools.get(call.name) || {
            count: 0,
            lastError: "",
          };
          currentFailInfo.count++;
          currentFailInfo.lastError = errorMessage;
          failedTools.set(call.name, currentFailInfo);

          logger.warn(
            `[GoogleVertex] Tool "${call.name}" failed (attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}): ${errorMessage}`,
          );

          const isPermanentFailure =
            currentFailInfo.count >= DEFAULT_TOOL_MAX_RETRIES;

          const errorOutput = {
            error: isPermanentFailure
              ? `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${currentFailInfo.count} times with error: ${errorMessage}. This tool will not be retried. Please proceed without using this tool or inform the user that this functionality is unavailable.`
              : `TOOL_EXECUTION_ERROR: ${errorMessage}. Retry attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}.`,
            status: isPermanentFailure ? "permanently_failed" : "failed",
            do_not_retry: isPermanentFailure,
            retry_count: currentFailInfo.count,
            max_retries: DEFAULT_TOOL_MAX_RETRIES,
          };

          toolExecutions?.push({
            name: call.name,
            input: call.args,
            output: errorOutput,
          });

          functionResponses.push({
            functionResponse: { name: call.name, response: errorOutput },
          });
        }
      } else {
        // Tool not found is a permanent error
        const errorOutput = {
          error: `TOOL_NOT_FOUND: The tool "${call.name}" does not exist. Do not attempt to call this tool again.`,
          status: "permanently_failed",
          do_not_retry: true,
        };

        toolExecutions?.push({
          name: call.name,
          input: call.args,
          output: errorOutput,
        });

        functionResponses.push({
          functionResponse: { name: call.name, response: errorOutput },
        });
      }
    }

    return functionResponses;
  }

  /**
   * Collect raw response parts and function calls from a native SDK content stream chunk.
   * Also accumulates token usage metadata.
   * Returns updated token counts.
   */
  private processNativeStreamChunk(
    chunk: {
      functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
    } & Record<string, unknown>,
    rawResponseParts: unknown[],
    stepFunctionCalls: Array<{ name: string; args: Record<string, unknown> }>,
    tokenUsage: { input: number; output: number },
  ): void {
    const chunkRecord = chunk as Record<string, unknown>;
    const candidates = chunkRecord.candidates as
      | Array<Record<string, unknown>>
      | undefined;
    const firstCandidate = candidates?.[0];
    const chunkContent = firstCandidate?.content as
      | Record<string, unknown>
      | undefined;
    if (chunkContent && Array.isArray(chunkContent.parts)) {
      rawResponseParts.push(...chunkContent.parts);
    }
    if (chunk.functionCalls) {
      stepFunctionCalls.push(...chunk.functionCalls);
    }

    const usageMetadata = chunkRecord.usageMetadata as
      | {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        }
      | undefined;
    if (usageMetadata) {
      if (
        usageMetadata.promptTokenCount !== undefined &&
        usageMetadata.promptTokenCount > 0
      ) {
        tokenUsage.input = usageMetadata.promptTokenCount;
      }
      if (
        usageMetadata.candidatesTokenCount !== undefined &&
        usageMetadata.candidatesTokenCount > 0
      ) {
        tokenUsage.output = usageMetadata.candidatesTokenCount;
      }
    }
  }

  /**
   * Push model response parts to conversation history, preserving thoughtSignature
   * for Gemini 3 multi-turn tool calling.
   */
  private pushModelResponseToHistory(
    currentContents: Array<{ role: string; parts: unknown[] }>,
    rawResponseParts: unknown[],
    stepFunctionCalls: Array<{ name: string; args: Record<string, unknown> }>,
  ): void {
    currentContents.push({
      role: "model",
      parts:
        rawResponseParts.length > 0
          ? rawResponseParts
          : stepFunctionCalls.map((fc) => ({ functionCall: fc })),
    });
  }

  /**
   * Compute final text for maxSteps termination when the model was still calling tools.
   */
  private computeMaxStepsTerminationText(
    step: number,
    maxSteps: number,
    finalText: string,
    lastStepText: string,
  ): string {
    if (step >= maxSteps && !finalText) {
      logger.warn(
        `[GoogleVertex] Tool call loop terminated after reaching maxSteps (${maxSteps}). ` +
          `Model was still calling tools. Using accumulated text from last step.`,
      );
      return (
        lastStepText ||
        `[Tool execution limit reached after ${maxSteps} steps. The model continued requesting tool calls beyond the limit.]`
      );
    }
    return finalText;
  }

  // ── End shared helpers ──

  /**
   * Execute stream using native @google/genai SDK for Gemini 3 models on Vertex AI
   * This bypasses @ai-sdk/google-vertex to properly handle thought_signature
   */
  private async executeNativeGemini3Stream(
    options: StreamOptions,
  ): Promise<StreamResult> {
    const client = await this.createVertexGenAIClient(options.region);
    const modelName =
      options.model || this.modelName || getDefaultVertexModel();
    const effectiveLocation =
      options.region || this.location || getVertexLocation();

    logger.debug("[GoogleVertex] Using native @google/genai for Gemini 3", {
      model: modelName,
      hasTools: !!options.tools && Object.keys(options.tools).length > 0,
      project: this.projectId,
      location: effectiveLocation,
    });

    // Build contents from input with multimodal support
    const multimodalInput = options.input as {
      text: string;
      pdfFiles?: Array<Buffer | string>;
      images?: Array<Buffer | string>;
    };
    const contents = this.buildNativeContentParts(
      options.input.text,
      multimodalInput,
      "native stream",
    );

    // Convert tools to native format
    const toolsInput =
      options.tools &&
      Object.keys(options.tools).length > 0 &&
      !options.disableTools
        ? options.tools
        : {};
    const { tools, executeMap } = this.convertToolsToNativeFunctionDeclarations(
      toolsInput as Record<string, Tool>,
      "native SDK",
    );

    // Build config
    const config = this.buildNativeGenerateConfig(options, tools);

    // Add JSON output format support for native SDK stream
    const streamOptions = options as TextGenerationOptions;
    if (streamOptions.output?.format === "json" || streamOptions.schema) {
      config.responseMimeType = "application/json";

      if (streamOptions.schema) {
        const rawSchema = convertZodToJsonSchema(
          streamOptions.schema as ZodUnknownSchema,
        ) as Record<string, unknown>;
        const inlinedSchema = inlineJsonSchema(rawSchema);
        if (inlinedSchema.$schema) {
          delete inlinedSchema.$schema;
        }
        config.responseSchema = inlinedSchema;

        logger.debug(
          "[GoogleVertex] Added responseSchema for JSON output (stream)",
          {
            schemaKeys: Object.keys(inlinedSchema),
          },
        );
      }
    }

    const startTime = Date.now();
    const maxSteps = this.computeMaxSteps(options.maxSteps);
    const currentContents = [...contents];
    let finalText = "";
    let lastStepText = "";
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    let step = 0;
    const failedTools = new Map<string, { count: number; lastError: string }>();
    const tokenUsage = { input: 0, output: 0 };

    // Agentic loop for tool calling
    while (step < maxSteps) {
      step++;
      logger.debug(`[GoogleVertex] Native SDK step ${step}/${maxSteps}`);

      try {
        const stream = await client.models.generateContentStream({
          model: modelName,
          contents: currentContents,
          config,
        });

        const stepFunctionCalls: Array<{
          name: string;
          args: Record<string, unknown>;
        }> = [];
        const rawResponseParts: unknown[] = [];

        for await (const chunk of stream) {
          this.processNativeStreamChunk(
            chunk as {
              functionCalls?: Array<{
                name: string;
                args: Record<string, unknown>;
              }>;
            } & Record<string, unknown>,
            rawResponseParts,
            stepFunctionCalls,
            tokenUsage,
          );
        }

        const stepText = this.extractTextFromRawParts(rawResponseParts);

        if (stepFunctionCalls.length === 0) {
          finalText = stepText;
          break;
        }

        lastStepText = stepText;

        logger.debug(
          `[GoogleVertex] Executing ${stepFunctionCalls.length} function calls`,
        );

        this.pushModelResponseToHistory(
          currentContents,
          rawResponseParts,
          stepFunctionCalls,
        );

        const functionResponses = await this.executeNativeFunctionCalls(
          stepFunctionCalls,
          executeMap,
          failedTools,
          allToolCalls,
        );

        // Add function responses to history
        currentContents.push({
          role: "function",
          parts: functionResponses as unknown as Array<{ text: string }>,
        });
      } catch (error) {
        logger.error("[GoogleVertex] Native SDK error", error);
        throw this.handleProviderError(error);
      }
    }

    finalText = this.computeMaxStepsTerminationText(
      step,
      maxSteps,
      finalText,
      lastStepText,
    );

    const responseTime = Date.now() - startTime;

    // Create async iterable for streaming result
    async function* createTextStream(): AsyncIterable<{ content: string }> {
      yield { content: finalText };
    }

    return {
      stream: createTextStream(),
      provider: this.providerName,
      model: modelName,
      usage: {
        input: tokenUsage.input,
        output: tokenUsage.output,
        total: tokenUsage.input + tokenUsage.output,
      },
      toolCalls: allToolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.args,
      })),
      metadata: {
        streamId: `native-vertex-${Date.now()}`,
        startTime,
        responseTime,
        totalToolExecutions: allToolCalls.length,
      },
    };
  }

  /**
   * Execute generate using native @google/genai SDK for Gemini 3 models on Vertex AI
   * This bypasses @ai-sdk/google-vertex to properly handle thought_signature
   */
  private async executeNativeGemini3Generate(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const client = await this.createVertexGenAIClient(options.region);
    const modelName =
      options.model || this.modelName || getDefaultVertexModel();
    const effectiveLocation =
      options.region || this.location || getVertexLocation();

    logger.debug(
      "[GoogleVertex] Using native @google/genai for Gemini 3 generate",
      {
        model: modelName,
        project: this.projectId,
        location: effectiveLocation,
      },
    );

    // Build contents from input with multimodal support
    const inputText =
      options.prompt || options.input?.text || "Please respond.";
    const multimodalInput = options.input as
      | {
          text?: string;
          pdfFiles?: Array<Buffer | string>;
          images?: Array<Buffer | string>;
        }
      | undefined;
    const contents = this.buildNativeContentParts(
      inputText,
      multimodalInput,
      "native generate",
    );

    // Get tools from SDK and options
    const shouldUseTools = !options.disableTools && this.supportsTools();
    const sdkTools = shouldUseTools ? await this.getAllTools() : {};
    const combinedTools = { ...sdkTools, ...(options.tools || {}) };

    const { tools, executeMap } = this.convertToolsToNativeFunctionDeclarations(
      combinedTools as Record<string, Tool>,
      "native SDK generate",
    );

    // Build config
    const config = this.buildNativeGenerateConfig(options, tools);

    // Note: Schema/JSON output for Gemini 3 native SDK is complex due to $ref resolution issues
    // For now, schemas are handled via the AI SDK fallback path, not native SDK
    // TODO: Implement proper $ref resolution for complex nested schemas

    const startTime = Date.now();
    const maxSteps = this.computeMaxSteps(options.maxSteps);
    const currentContents = [...contents];
    let finalText = "";
    let lastStepText = "";
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    const toolExecutions: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }> = [];
    let step = 0;
    const failedTools = new Map<string, { count: number; lastError: string }>();
    const tokenUsage = { input: 0, output: 0 };

    // Agentic loop for tool calling
    while (step < maxSteps) {
      step++;
      logger.debug(
        `[GoogleVertex] Native SDK generate step ${step}/${maxSteps}`,
      );

      try {
        // Use generateContentStream and collect all chunks (same as GoogleAIStudio)
        const stream = await client.models.generateContentStream({
          model: modelName,
          contents: currentContents,
          config,
        });

        const stepFunctionCalls: Array<{
          name: string;
          args: Record<string, unknown>;
        }> = [];
        const rawResponseParts: unknown[] = [];

        for await (const chunk of stream) {
          this.processNativeStreamChunk(
            chunk as {
              functionCalls?: Array<{
                name: string;
                args: Record<string, unknown>;
              }>;
            } & Record<string, unknown>,
            rawResponseParts,
            stepFunctionCalls,
            tokenUsage,
          );
        }

        const stepText = this.extractTextFromRawParts(rawResponseParts);

        if (stepFunctionCalls.length === 0) {
          finalText = stepText;
          break;
        }

        lastStepText = stepText;

        logger.debug(
          `[GoogleVertex] Generate executing ${stepFunctionCalls.length} function calls`,
        );

        this.pushModelResponseToHistory(
          currentContents,
          rawResponseParts,
          stepFunctionCalls,
        );

        const functionResponses = await this.executeNativeFunctionCalls(
          stepFunctionCalls,
          executeMap,
          failedTools,
          allToolCalls,
          toolExecutions,
        );

        // Add function responses to history
        currentContents.push({
          role: "function",
          parts: functionResponses as unknown as Array<
            | { text: string }
            | { inlineData: { mimeType: string; data: string } }
          >,
        });
      } catch (error) {
        logger.error("[GoogleVertex] Native SDK generate error", error);
        throw this.handleProviderError(error);
      }
    }

    finalText = this.computeMaxStepsTerminationText(
      step,
      maxSteps,
      finalText,
      lastStepText,
    );

    const responseTime = Date.now() - startTime;

    // Build EnhancedGenerateResult
    return {
      content: finalText,
      provider: this.providerName,
      model: modelName,
      usage: {
        input: tokenUsage.input,
        output: tokenUsage.output,
        total: tokenUsage.input + tokenUsage.output,
      },
      responseTime,
      toolsUsed: allToolCalls.map((tc) => tc.toolName),
      toolExecutions: toolExecutions,
      enhancedWithTools: allToolCalls.length > 0,
    };
  }

  /**
   * Process CSV files and append content to options.input.text
   * This ensures CSV data is available in the prompt for native Gemini 3 SDK calls
   * Returns a new options object with modified input (immutable pattern)
   */
  private async processCSVFilesForNativeSDK<
    T extends TextGenerationOptions | StreamOptions,
  >(options: T): Promise<T> {
    const input = options.input as
      | { text?: string; csvFiles?: Array<Buffer | string> }
      | undefined;

    if (!input?.csvFiles || input.csvFiles.length === 0) {
      return options;
    }

    logger.info(
      `[GoogleVertex] Processing ${input.csvFiles.length} CSV file(s) for native Gemini 3 SDK`,
    );

    let modifiedText = input.text || "";

    for (let i = 0; i < input.csvFiles.length; i++) {
      const csvFile = input.csvFiles[i];
      try {
        const result = await FileDetector.detectAndProcess(csvFile, {
          allowedTypes: ["csv"],
          csvOptions:
            "csvOptions" in options
              ? (options.csvOptions as Record<string, unknown>)
              : undefined,
        });

        // Extract filename for display
        const filename =
          typeof csvFile === "string"
            ? path.basename(csvFile)
            : `csv_file_${i + 1}.csv`;

        let csvSection = `\n\n## CSV Data from "${filename}":\n`;

        // Add metadata if available
        if (result.metadata) {
          const meta = result.metadata as Record<string, unknown>;
          if (meta.rowCount || meta.columnCount || meta.columnNames) {
            csvSection += `**File Info:**\n`;
            if (meta.rowCount) {
              csvSection += `- Rows: ${meta.rowCount}\n`;
            }
            if (meta.columnCount) {
              csvSection += `- Columns: ${meta.columnCount}\n`;
            }
            if (meta.columnNames && Array.isArray(meta.columnNames)) {
              csvSection += `- Column Names: ${meta.columnNames.join(", ")}\n`;
            }
            csvSection += "\n";
          }
        }

        // Add strong instructions to use the CSV data directly
        csvSection += `\n**CRITICAL INSTRUCTION**: The complete CSV data is included below. You MUST use this data directly from this prompt.\n`;
        csvSection += `DO NOT use any external tools (github, search_code, get_file_contents, etc.) to access this data.\n`;
        csvSection += `The data you need is right here in this message - read it carefully and answer based on it.\n\n`;

        csvSection += result.content;
        // Prepend CSV to ensure data appears before user's question
        modifiedText =
          csvSection + "\n\n---\n\n**USER QUESTION:**\n" + modifiedText;

        logger.info(`[GoogleVertex] ✅ Processed CSV: ${filename}`);
      } catch (error) {
        logger.error(
          `[GoogleVertex] ❌ Failed to process CSV file ${i + 1}:`,
          error,
        );
        const filename =
          typeof csvFile === "string"
            ? path.basename(csvFile)
            : `csv_file_${i + 1}.csv`;
        modifiedText += `\n\n## CSV Data Error: Failed to process "${filename}"\nReason: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    }

    // Return new options with modified input (immutable pattern)
    // Preserve the full type of options.input by spreading options.input directly
    return {
      ...options,
      input: { ...options.input, text: modifiedText },
    } as T;
  }

  /**
   * Override generate to route Gemini 3 models with tools to native SDK
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
  ): Promise<EnhancedGenerateResult | null> {
    // Normalize options
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const modelName =
      options.model || this.modelName || getDefaultVertexModel();

    // Check if we should use native SDK for Gemini 3 with tools
    const shouldUseTools = !options.disableTools && this.supportsTools();
    const sdkTools = shouldUseTools ? await this.getAllTools() : {};
    const hasTools =
      shouldUseTools &&
      (Object.keys(sdkTools).length > 0 ||
        (options.tools && Object.keys(options.tools).length > 0));

    if (isGemini3Model(modelName) && hasTools) {
      // Process CSV files before routing to native SDK (bypasses normal message builder)
      const processedOptions = await this.processCSVFilesForNativeSDK(options);

      // Merge SDK tools into options for native SDK path
      const mergedOptions = {
        ...processedOptions,
        tools: { ...sdkTools, ...(processedOptions.tools || {}) },
      };
      logger.info(
        "[GoogleVertex] Routing Gemini 3 generate to native SDK for tool calling",
        {
          model: modelName,
          sdkToolCount: Object.keys(sdkTools).length,
          optionToolCount: Object.keys(processedOptions.tools || {}).length,
          totalToolCount:
            Object.keys(sdkTools).length +
            Object.keys(processedOptions.tools || {}).length,
        },
      );
      return this.executeNativeGemini3Generate(mergedOptions);
    }

    // Fall back to BaseProvider implementation
    return super.generate(optionsOrPrompt);
  }

  protected handleProviderError(error: unknown): Error {
    const errorRecord = error as UnknownRecord;
    if (
      typeof errorRecord?.name === "string" &&
      errorRecord.name === "TimeoutError"
    ) {
      return new TimeoutError(
        `Google Vertex AI request timed out. Consider increasing timeout or using a lighter model.`,
        this.defaultTimeout,
      );
    }

    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error occurred";

    if (message.includes("PERMISSION_DENIED")) {
      return new Error(
        `❌ Google Vertex AI Permission Denied\n\nYour Google Cloud credentials don't have permission to access Vertex AI.\n\nRequired Steps:\n1. Ensure your service account has Vertex AI User role\n2. Check if Vertex AI API is enabled in your project\n3. Verify your project ID is correct\n4. Confirm your location/region has Vertex AI available`,
      );
    }

    if (message.includes("NOT_FOUND")) {
      const modelSuggestions = this.getModelSuggestions(this.modelName);
      return new Error(
        `❌ Google Vertex AI Model Not Found\n\n${message}\n\nModel '${this.modelName}' is not available.\n\nSuggested alternatives:\n${modelSuggestions}\n\nTroubleshooting:\n1. Check model name spelling and format\n2. Verify model is available in your region (${this.location})\n3. Ensure your project has access to the model\n4. For Claude models, enable Anthropic integration in Google Cloud Console`,
      );
    }

    if (message.includes("QUOTA_EXCEEDED")) {
      return new Error(
        `❌ Google Vertex AI Quota Exceeded\n\n${message}\n\nSolutions:\n1. Check your Vertex AI quotas in Google Cloud Console\n2. Request quota increase if needed\n3. Try a different model or reduce request frequency\n4. Consider using a different region`,
      );
    }

    if (message.includes("INVALID_ARGUMENT")) {
      return new Error(
        `❌ Google Vertex AI Invalid Request\n\n${message}\n\nCheck:\n1. Request parameters are within model limits\n2. Input text is properly formatted\n3. Temperature and other settings are valid\n4. Model supports your request type`,
      );
    }

    return new Error(
      `❌ Google Vertex AI Provider Error\n\n${message}\n\nTroubleshooting:\n1. Check Google Cloud credentials and permissions\n2. Verify project ID and location settings\n3. Ensure Vertex AI API is enabled\n4. Check network connectivity`,
    );
  }

  /**
   * Memory-safe cache management for model configurations
   * Implements LRU eviction to prevent memory leaks in long-running processes
   */
  private static evictLRUCacheEntries<K, V>(cache: Map<K, V>): void {
    if (cache.size <= GoogleVertexProvider.MAX_CACHE_SIZE) {
      return;
    }

    // Evict oldest entries (first entries in Map are oldest in insertion order)
    const entriesToRemove =
      cache.size - GoogleVertexProvider.MAX_CACHE_SIZE + 5; // Remove extra to avoid frequent evictions
    let removed = 0;

    for (const key of cache.keys()) {
      if (removed >= entriesToRemove) {
        break;
      }
      cache.delete(key);
      removed++;
    }

    logger.debug("GoogleVertexProvider: Evicted LRU cache entries", {
      entriesRemoved: removed,
      currentCacheSize: cache.size,
    });
  }

  /**
   * Access and refresh cache entry (moves to end for LRU)
   */
  private static accessCacheEntry<K, V>(
    cache: Map<K, V>,
    key: K,
  ): V | undefined {
    const value = cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      cache.delete(key);
      cache.set(key, value);
    }
    return value;
  }

  /**
   * Memory-safe cached check for whether maxTokens should be set for the given model
   * Optimized for streaming performance with LRU eviction to prevent memory leaks
   */
  private shouldSetMaxTokensCached(modelName: string): boolean {
    const now = Date.now();

    // Check if cache is valid (within 5 minutes)
    if (
      now - GoogleVertexProvider.maxTokensCacheTime >
      GoogleVertexProvider.CACHE_DURATION
    ) {
      // Cache expired, refresh all cached results
      GoogleVertexProvider.maxTokensCache.clear();
      GoogleVertexProvider.maxTokensCacheTime = now;
    }

    // Check if we have cached result for this model (with LRU access)
    const cachedResult = GoogleVertexProvider.accessCacheEntry(
      GoogleVertexProvider.maxTokensCache,
      modelName,
    );
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // Calculate and cache the result with memory management
    const shouldSet = !this.modelHasMaxTokensIssues(modelName);
    GoogleVertexProvider.maxTokensCache.set(modelName, shouldSet);

    // Prevent memory leaks by evicting old entries if cache grows too large
    GoogleVertexProvider.evictLRUCacheEntries(
      GoogleVertexProvider.maxTokensCache,
    );

    return shouldSet;
  }

  /**
   * Memory-safe check if model has maxTokens issues using configuration-based approach
   * This replaces hardcoded model-specific logic with configurable behavior
   * Includes LRU caching to avoid repeated configuration lookups during streaming
   */
  private modelHasMaxTokensIssues(modelName: string): boolean {
    const now = Date.now();
    const cacheKey = "google-vertex-config";

    // Check if cache is valid (within 5 minutes)
    if (
      now - GoogleVertexProvider.modelConfigCacheTime >
      GoogleVertexProvider.CACHE_DURATION
    ) {
      // Cache expired, refresh it with memory management
      GoogleVertexProvider.modelConfigCache.clear();
      const config = ModelConfigurationManager.getInstance();
      const vertexConfig = config.getProviderConfiguration("google-vertex");
      GoogleVertexProvider.modelConfigCache.set(cacheKey, vertexConfig);
      GoogleVertexProvider.modelConfigCacheTime = now;
    }

    // Access cached config with LRU behavior
    const vertexConfig = GoogleVertexProvider.accessCacheEntry(
      GoogleVertexProvider.modelConfigCache,
      cacheKey,
    ) as { modelBehavior?: { maxTokensIssues?: string[] } } | undefined;

    // Check if model is in the list of models with maxTokens issues
    const modelsWithIssues = vertexConfig?.modelBehavior?.maxTokensIssues || [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
    ];

    return modelsWithIssues.some((problematicModel: string) =>
      modelName.includes(problematicModel),
    );
  }

  /**
   * Check if Anthropic models are available
   * @returns Promise<boolean> indicating if Anthropic support is available
   */
  async hasAnthropicSupport(): Promise<boolean> {
    return hasAnthropicSupport();
  }

  /**
   * Create an Anthropic model instance using vertexAnthropic provider
   * Uses fresh vertex settings for each request with comprehensive validation
   * @param modelName Anthropic model name (e.g., 'claude-3-sonnet@20240229')
   * @returns LanguageModelV1 instance or null if not available
   */
  async createAnthropicModel(
    modelName: string,
  ): Promise<LanguageModelV1 | null> {
    const validationId = `anthropic-validation-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    logger.debug(
      "[GoogleVertexProvider] 🧠 Starting comprehensive Anthropic model validation",
      {
        validationId,
        modelName,
        timestamp: new Date().toISOString(),
      },
    );

    // 1. SDK Module Availability Validation
    if (!hasAnthropicSupport()) {
      logger.error("[GoogleVertexProvider] ❌ SDK module validation failed", {
        validationId,
        issue: "createVertexAnthropic function not available",
        solution:
          "Update @ai-sdk/google-vertex to latest version with Anthropic support",
        command: "npm install @ai-sdk/google-vertex@latest",
        documentation:
          "https://sdk.vercel.ai/providers/ai-sdk-providers/google-vertex#anthropic-models",
      });
      return null;
    }

    // 2. Authentication Validation
    const authValidation = await this.validateVertexAuthentication();
    if (!authValidation.isValid) {
      logger.error(
        "[GoogleVertexProvider] ❌ Authentication validation failed",
        {
          validationId,
          method: authValidation.method,
          issues: authValidation.issues,
          solutions: [
            "Option 1: Set GOOGLE_APPLICATION_CREDENTIALS to valid service account OR ADC file",
            "Option 2: Set individual env vars: GOOGLE_AUTH_CLIENT_EMAIL, GOOGLE_AUTH_PRIVATE_KEY",
            "Option 3: Use gcloud auth application-default login for ADC",
            "Documentation: https://cloud.google.com/docs/authentication/provide-credentials-adc",
          ],
        },
      );
      return null;
    }

    // 3. Project Configuration Validation
    const projectValidation = await this.validateVertexProjectConfiguration();
    if (!projectValidation.isValid) {
      logger.error(
        "[GoogleVertexProvider] ❌ Project configuration validation failed",
        {
          validationId,
          projectId: projectValidation.projectId,
          region: projectValidation.region,
          issues: projectValidation.issues,
          solutions: [
            "Set GOOGLE_VERTEX_PROJECT or GOOGLE_CLOUD_PROJECT environment variable",
            "Ensure project exists and has Vertex AI API enabled",
            "Check: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com",
          ],
        },
      );
      return null;
    }

    // 4. Regional Support Validation
    const regionSupported = await this.checkVertexRegionalSupport(
      projectValidation.region,
    );
    if (!regionSupported) {
      logger.warn("[GoogleVertexProvider] ⚠️ Regional support warning", {
        validationId,
        region: projectValidation.region,
        warning: "Anthropic models may not be available in this region",
        supportedRegions: [
          "us-central1",
          "us-east4",
          "us-east5",
          "us-west1",
          "us-west4",
          "europe-west1",
          "europe-west4",
          "asia-southeast1",
          "asia-northeast1",
        ],
        solution: "Set GOOGLE_CLOUD_LOCATION to a supported region",
      });
      // Continue with warning, don't block
    }

    // 5. Model Name Validation
    const modelValidation = this.validateAnthropicModelName(modelName);
    if (!modelValidation.isValid) {
      logger.error("[GoogleVertexProvider] ❌ Model name validation failed", {
        validationId,
        modelName,
        issue: modelValidation.issue,
        recommendedModels: [
          "claude-sonnet-4-5@20250929",
          "claude-sonnet-4@20250514",
          "claude-opus-4@20250514",
          "claude-3-5-sonnet-20241022",
          "claude-3-5-haiku-20241022",
        ],
      });
      return null;
    }

    try {
      // 6. Settings Creation with Enhanced Error Handling
      logger.debug(
        "[GoogleVertexProvider] 🔧 Creating vertexAnthropic settings",
        {
          validationId,
          authMethod: authValidation.method,
          projectId: projectValidation.projectId,
          region: projectValidation.region,
        },
      );

      const vertexAnthropicSettings = await createVertexAnthropicSettings(
        this.location,
      );

      // 7. Settings Validation
      if (
        !vertexAnthropicSettings.project ||
        !vertexAnthropicSettings.location
      ) {
        logger.error("[GoogleVertexProvider] ❌ Settings validation failed", {
          validationId,
          hasProject: !!vertexAnthropicSettings.project,
          hasLocation: !!vertexAnthropicSettings.location,
          hasProxy: !!vertexAnthropicSettings.fetch,
          hasAuth: !!vertexAnthropicSettings.googleAuthOptions,
        });
        return null;
      }

      logger.debug(
        "[GoogleVertexProvider] ✅ Creating vertexAnthropic instance",
        {
          validationId,
          modelName,
          project: vertexAnthropicSettings.project,
          location: vertexAnthropicSettings.location,
          hasProxy: !!vertexAnthropicSettings.fetch,
          hasAuth: !!vertexAnthropicSettings.googleAuthOptions,
        },
      );

      // 8. Provider Instance Creation
      const vertexAnthropicInstance = createVertexAnthropic(
        vertexAnthropicSettings,
      );

      // 9. Model Instance Creation with Network Error Handling
      const model = vertexAnthropicInstance(modelName);

      logger.info(
        "[GoogleVertexProvider] ✅ Anthropic model created successfully",
        {
          validationId,
          modelName,
          hasModel: !!model,
          modelType: typeof model,
          authMethod: authValidation.method,
          projectId: projectValidation.projectId,
          region: projectValidation.region,
          validationsPassed: [
            "SDK_MODULE_AVAILABLE",
            "AUTHENTICATION_VALID",
            "PROJECT_CONFIGURED",
            "MODEL_NAME_VALID",
            "SETTINGS_CREATED",
            "PROVIDER_INSTANCE_CREATED",
            "MODEL_INSTANCE_CREATED",
          ],
        },
      );

      return model as LanguageModelV1;
    } catch (error) {
      // Enhanced error analysis and reporting
      const errorAnalysis = this.analyzeAnthropicCreationError(error, {
        validationId,
        modelName,
        projectId: projectValidation.projectId,
        region: projectValidation.region,
        authMethod: authValidation.method,
      });

      logger.error(
        "[GoogleVertexProvider] ❌ Anthropic model creation failed",
        {
          validationId,
          modelName,
          ...errorAnalysis,
          detailedTroubleshooting:
            this.getAnthropicTroubleshootingSteps(errorAnalysis),
        },
      );

      return null;
    }
  }

  /**
   * Validate Vertex AI authentication configuration
   */
  private async validateVertexAuthentication(): Promise<{
    isValid: boolean;
    method: string;
    issues: string[];
  }> {
    const result = {
      isValid: false,
      method: "none",
      issues: [] as string[],
    };

    try {
      // Check for service account file authentication (preferred)
      if (
        process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      ) {
        const credentialsPath = process.env
          .GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK
          ? process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK
          : process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
        try {
          if (fs.existsSync(credentialsPath)) {
            // Validate JSON structure
            const credentialsContent = fs.readFileSync(credentialsPath, "utf8");
            const credentials = JSON.parse(credentialsContent);

            if (
              credentials.type === "service_account" &&
              credentials.project_id &&
              credentials.client_email &&
              credentials.private_key
            ) {
              result.isValid = true;
              result.method = "service_account_file";
              return result;
            } else if (
              credentials.client_id &&
              credentials.client_secret &&
              credentials.refresh_token &&
              credentials.type !== "service_account"
            ) {
              result.isValid = true;
              result.method = "application_default_credentials";
              return result;
            } else {
              result.issues.push(
                "Credentials file missing required fields (not service account or ADC format)",
              );
            }
          } else {
            result.issues.push(
              `Service account file not found: ${credentialsPath}`,
            );
          }
        } catch (fileError) {
          result.issues.push(
            `Service account file validation failed: ${fileError}`,
          );
        }
      }

      // Check for individual environment variables
      if (
        process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
        process.env.GOOGLE_AUTH_PRIVATE_KEY
      ) {
        const email = process.env.GOOGLE_AUTH_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_AUTH_PRIVATE_KEY;

        if (email.includes("@") && privateKey.includes("BEGIN PRIVATE KEY")) {
          result.isValid = true;
          result.method = "environment_variables";
          return result;
        } else {
          result.issues.push("Individual credentials format validation failed");
        }
      } else {
        result.issues.push(
          "Missing individual credential environment variables",
        );
      }

      if (!result.isValid) {
        result.issues.push("No valid authentication method found");
      }
    } catch (error) {
      result.issues.push(`Authentication validation error: ${error}`);
    }

    return result;
  }

  /**
   * Validate Vertex AI project configuration
   */
  private async validateVertexProjectConfiguration(): Promise<{
    isValid: boolean;
    projectId: string | undefined;
    region: string | undefined;
    issues: string[];
  }> {
    const result = {
      isValid: false,
      projectId: undefined as string | undefined,
      region: undefined as string | undefined,
      issues: [] as string[],
    };

    // Check project ID
    const projectId =
      process.env.GOOGLE_VERTEX_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT_ID ||
      process.env.GOOGLE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT;

    if (projectId) {
      result.projectId = projectId;

      // Validate project ID format
      const projectIdPattern = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
      if (projectIdPattern.test(projectId)) {
        result.isValid = true;
      } else {
        result.issues.push(`Invalid project ID format: ${projectId}`);
      }
    } else {
      result.issues.push("No project ID configured");
    }

    // Check region/location
    const region =
      process.env.GOOGLE_CLOUD_LOCATION ||
      process.env.VERTEX_LOCATION ||
      process.env.GOOGLE_VERTEX_LOCATION ||
      "us-central1";

    result.region = region;

    // Validate region format (regional format like us-central1 or global endpoint)
    const regionPattern = /^([a-z]+-[a-z]+\d+|global)$/;
    if (!regionPattern.test(region)) {
      result.issues.push(
        `Invalid region format: ${region} (expected format: 'us-central1' or 'global')`,
      );
      result.isValid = false;
    }

    return result;
  }

  /**
   * Check if the specified region supports Anthropic models
   */
  private async checkVertexRegionalSupport(
    region: string = "us-central1",
  ): Promise<boolean> {
    // Based on Google Cloud documentation, these regions support Anthropic models
    const supportedRegions = [
      // North America
      "us-central1",
      "us-east1",
      "us-east4",
      "us-east5",
      "us-south1",
      "us-west1",
      "us-west4",
      "northamerica-northeast1",
      "northamerica-northeast2",
      // Europe
      "europe-west1",
      "europe-west2",
      "europe-west3",
      "europe-west4",
      "europe-west6",
      "europe-west8",
      "europe-west9",
      "europe-north1",
      "europe-central2",
      "europe-southwest1",
      // Asia Pacific
      "asia-east1",
      "asia-east2",
      "asia-northeast1",
      "asia-northeast2",
      "asia-northeast3",
      "asia-south1",
      "asia-southeast1",
      "asia-southeast2",
      "australia-southeast1",
      "australia-southeast2",
      // Middle East & Africa
      "me-west1",
      "me-central1",
      "africa-south1",
      // South America
      "southamerica-east1",
      "southamerica-west1",
    ];

    return supportedRegions.includes(region);
  }

  /**
   * Validate Anthropic model name format and availability
   */
  private validateAnthropicModelName(modelName: string): {
    isValid: boolean;
    issue?: string;
  } {
    if (!modelName || typeof modelName !== "string") {
      return {
        isValid: false,
        issue: "Model name is required and must be a string",
      };
    }

    // Check if it's a Claude model
    if (!modelName.toLowerCase().includes("claude")) {
      return {
        isValid: false,
        issue: 'Model name must be a Claude model (should contain "claude")',
      };
    }

    // Validate against known Claude model patterns
    const validPatterns = [
      /^claude-sonnet-4@\d{8}$/,
      /^claude-sonnet-4-5@\d{8}$/,
      /^claude-opus-4@\d{8}$/,
      /^claude-opus-4-1@\d{8}$/,
      /^claude-3-7-sonnet@\d{8}$/,
      /^claude-3-5-sonnet-\d{8}$/,
      /^claude-3-5-haiku-\d{8}$/,
      /^claude-3-sonnet-\d{8}$/,
      /^claude-3-haiku-\d{8}$/,
      /^claude-3-opus-\d{8}$/,
    ];

    const isValidFormat = validPatterns.some((pattern) =>
      pattern.test(modelName),
    );

    if (!isValidFormat) {
      return {
        isValid: false,
        issue: `Model name format not recognized. Expected formats like "claude-3-5-sonnet-20241022" or "claude-sonnet-4@20250514"`,
      };
    }

    return { isValid: true };
  }

  /**
   * Analyze Anthropic model creation errors for detailed troubleshooting
   */
  private analyzeAnthropicCreationError(
    error: unknown,
    context: {
      validationId: string;
      modelName: string;
      projectId?: string;
      region?: string;
      authMethod: string;
    },
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";

    const analysis = {
      error: errorMessage,
      errorName,
      errorType: "UNKNOWN",
      isNetworkError: false,
      isAuthError: false,
      isConfigurationError: false,
      isModelError: false,
      isRegionalError: false,
      specificIssue: "Unknown error occurred",
      errorStack: error instanceof Error ? error.stack : undefined,
    };

    // Network-related errors
    if (
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("timeout")
    ) {
      analysis.errorType = "NETWORK";
      analysis.isNetworkError = true;
      analysis.specificIssue =
        "Network connectivity issue - cannot reach Google Cloud endpoints";
    }
    // Authentication errors
    else if (
      errorMessage.includes("PERMISSION_DENIED") ||
      errorMessage.includes("401") ||
      errorMessage.includes("403") ||
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("Forbidden")
    ) {
      analysis.errorType = "AUTHENTICATION";
      analysis.isAuthError = true;
      analysis.specificIssue =
        "Authentication failed - invalid credentials or insufficient permissions";
    }
    // Model availability errors
    else if (
      errorMessage.includes("NOT_FOUND") ||
      errorMessage.includes("404") ||
      (errorMessage.includes("model") && errorMessage.includes("not available"))
    ) {
      analysis.errorType = "MODEL_AVAILABILITY";
      analysis.isModelError = true;
      analysis.specificIssue = `Model "${context.modelName}" not available in region "${context.region}"`;
    }
    // Regional/quota errors
    else if (
      errorMessage.includes("QUOTA_EXCEEDED") ||
      errorMessage.includes("quota") ||
      errorMessage.includes("limit")
    ) {
      analysis.errorType = "QUOTA";
      analysis.isRegionalError = true;
      analysis.specificIssue = "Quota exceeded or rate limit reached";
    }
    // Configuration errors
    else if (
      errorMessage.includes("INVALID_ARGUMENT") ||
      errorMessage.includes("BadRequest") ||
      errorMessage.includes("400")
    ) {
      analysis.errorType = "CONFIGURATION";
      analysis.isConfigurationError = true;
      analysis.specificIssue = "Invalid configuration or request parameters";
    }

    return analysis;
  }

  /**
   * Get detailed troubleshooting steps based on error analysis
   */
  private getAnthropicTroubleshootingSteps(errorAnalysis: {
    errorType: string;
    [key: string]: unknown;
  }): string[] {
    const steps: string[] = [];

    switch (errorAnalysis.errorType) {
      case "NETWORK":
        steps.push(
          "🌐 Network Troubleshooting:",
          "1. Check internet connectivity",
          "2. Verify proxy configuration if behind corporate firewall",
          "3. Ensure firewall allows HTTPS to *.googleapis.com",
          "4. Try different network or wait for network issues to resolve",
          "5. Check if using VPN that might block Google Cloud endpoints",
        );
        break;

      case "AUTHENTICATION":
        steps.push(
          "🔐 Authentication Troubleshooting:",
          "1. Verify GOOGLE_APPLICATION_CREDENTIALS file exists and is valid",
          "2. Check individual credentials: GOOGLE_AUTH_CLIENT_EMAIL, GOOGLE_AUTH_PRIVATE_KEY",
          '3. Ensure service account has "Vertex AI User" role',
          "4. Verify project ID matches the one in your credentials",
          "5. Enable Vertex AI API: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com",
        );
        break;

      case "MODEL_AVAILABILITY":
        steps.push(
          "🤖 Model Availability Troubleshooting:",
          "1. Verify model name format and spelling",
          "2. Check if Anthropic integration is enabled in your project",
          "3. Enable Claude models: https://console.cloud.google.com/vertex-ai/publishers/anthropic",
          "4. Try a different region if current region lacks Anthropic support",
          "5. Accept Anthropic terms and conditions in Google Cloud Console",
        );
        break;

      case "QUOTA":
        steps.push(
          "📊 Quota Troubleshooting:",
          "1. Check Vertex AI quotas in Google Cloud Console",
          "2. Request quota increase if needed",
          "3. Try a different model with lower resource requirements",
          "4. Wait before retrying if rate limited",
          "5. Consider using a different region with available quota",
        );
        break;

      case "CONFIGURATION":
        steps.push(
          "⚙️ Configuration Troubleshooting:",
          "1. Verify all required environment variables are set",
          "2. Check project ID and region format",
          "3. Ensure model name follows correct format",
          "4. Verify request parameters are within model limits",
          "5. Update @ai-sdk/google-vertex to latest version",
        );
        break;

      default:
        steps.push(
          "🔧 General Troubleshooting:",
          "1. Update @ai-sdk/google-vertex to latest version",
          "2. Check Google Cloud service status",
          "3. Verify all authentication and configuration",
          "4. Try with a simple Claude model like claude-3-haiku-20240307",
          "5. Enable debug logging with NEUROLINK_DEBUG=true",
        );
    }

    return steps;
  }

  /**
   * Register a tool with the AI provider
   * @param name The name of the tool
   * @param schema The Zod schema defining the tool's parameters
   * @param description A description of what the tool does
   * @param handler The function to execute when the tool is called
   */
  registerTool(
    name: string,
    schema: ZodType<unknown>,
    description: string,
    handler: (params: Record<string, unknown>) => Promise<unknown>,
  ): void {
    const functionTag = "GoogleVertexProvider.registerTool";

    try {
      const tool = {
        description,
        parameters: schema,
        execute: async (params: Record<string, unknown>) => {
          try {
            const contextEnrichedParams = {
              ...params,
              __context: this.toolContext,
            };
            return await handler(contextEnrichedParams);
          } catch (error) {
            logger.error(`${functionTag}: Tool execution error`, {
              toolName: name,
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          }
        },
      };

      this.registeredTools.set(name, tool);

      logger.debug(`${functionTag}: Tool registered`, {
        toolName: name,
        modelName: this.modelName,
      });
    } catch (error) {
      logger.error(`${functionTag}: Tool registration error`, {
        toolName: name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set the context for tool execution
   * @param context The context to use for tool execution
   */
  setToolContext(context: Record<string, unknown>): void {
    this.toolContext = { ...this.toolContext, ...context };
    logger.debug("GoogleVertexProvider.setToolContext: Tool context set", {
      contextKeys: Object.keys(context),
    });
  }

  /**
   * Get the current tool execution context
   * @returns The current tool execution context
   */
  getToolContext(): Record<string, unknown> {
    return { ...this.toolContext };
  }

  /**
   * Set the tool executor function for custom tool execution
   * This method is called by BaseProvider.setupToolExecutor()
   * @param executor Function to execute tools by name
   */
  setToolExecutor(
    executor: (toolName: string, params: unknown) => Promise<unknown>,
  ): void {
    this.toolExecutor = executor;
    logger.debug("GoogleVertexProvider.setToolExecutor: Tool executor set", {
      hasExecutor: typeof executor === "function",
    });
  }

  /**
   * Clear all static caches - useful for testing and memory cleanup
   * Public method to allow external cache management
   */
  static clearCaches(): void {
    GoogleVertexProvider.modelConfigCache.clear();
    GoogleVertexProvider.maxTokensCache.clear();
    GoogleVertexProvider.modelConfigCacheTime = 0;
    GoogleVertexProvider.maxTokensCacheTime = 0;

    logger.debug("GoogleVertexProvider: All caches cleared", {
      clearedAt: Date.now(),
    });
  }

  /**
   * Get cache statistics for monitoring and debugging
   */
  static getCacheStats(): {
    modelConfigCacheSize: number;
    maxTokensCacheSize: number;
    maxCacheSize: number;
    cacheAge: { modelConfig: number; maxTokens: number };
  } {
    const now = Date.now();
    return {
      modelConfigCacheSize: GoogleVertexProvider.modelConfigCache.size,
      maxTokensCacheSize: GoogleVertexProvider.maxTokensCache.size,
      maxCacheSize: GoogleVertexProvider.MAX_CACHE_SIZE,
      cacheAge: {
        modelConfig: now - GoogleVertexProvider.modelConfigCacheTime,
        maxTokens: now - GoogleVertexProvider.maxTokensCacheTime,
      },
    };
  }

  /**
   * Detect image MIME type from buffer
   */
  private detectImageType(buffer: Buffer): string {
    // Check PNG signature
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return "image/png";
    }

    // Check JPEG signature
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return "image/jpeg";
    }

    // Check WebP signature
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return "image/webp";
    }

    // Check GIF signature
    if (
      buffer.length >= 6 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46
    ) {
      return "image/gif";
    }

    // Default to PNG if unknown
    return "image/png";
  }

  /**
   * Estimate token count from text (simple character-based estimation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Obtain a Google Auth access token for Vertex AI REST API calls.
   */
  private async getImageGenerationAccessToken(): Promise<string> {
    const { GoogleAuth } = await import("google-auth-library");

    // Priority: GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK > GOOGLE_APPLICATION_CREDENTIALS
    const credentialsPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS;

    const auth = new GoogleAuth({
      ...(credentialsPath && { keyFilename: credentialsPath }),
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
      throw new AuthenticationError(
        "Failed to obtain access token from Google Auth",
        this.providerName,
      );
    }

    return accessToken.token;
  }

  /**
   * Build request parts for image generation from prompt, PDFs, and images.
   */
  private buildImageGenerationParts(
    prompt: string,
    pdfFiles: Array<Buffer | string>,
    inputImages: Array<Buffer | string>,
  ): Array<{
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }> {
    const parts: Array<{
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }> = [];

    if (prompt) {
      parts.push({ text: prompt });
    }

    // Add PDF files as inline data
    for (const pdfFile of pdfFiles) {
      let pdfBase64: string;

      if (Buffer.isBuffer(pdfFile)) {
        pdfBase64 = pdfFile.toString("base64");
      } else if (typeof pdfFile === "string") {
        const isFilePath =
          pdfFile.startsWith("/") ||
          /^[a-zA-Z]:\\/.test(pdfFile) ||
          pdfFile.startsWith("./") ||
          pdfFile.startsWith("../") ||
          pdfFile.startsWith("..\\") ||
          pdfFile.startsWith(".\\");
        if (isFilePath) {
          const normalizedPath = path.resolve(pdfFile);
          const cwd = process.cwd();

          if (
            !normalizedPath.startsWith(cwd + path.sep) &&
            normalizedPath !== cwd
          ) {
            throw new ProviderError(
              `PDF file path must be within current directory for security`,
              this.providerName,
            );
          }

          if (!fs.existsSync(normalizedPath)) {
            throw new ProviderError(
              `PDF file not found: ${normalizedPath}`,
              this.providerName,
            );
          }

          const pdfBuffer = fs.readFileSync(normalizedPath);
          pdfBase64 = pdfBuffer.toString("base64");
        } else {
          pdfBase64 = pdfFile;
        }
      } else {
        logger.warn("Invalid PDF file format, skipping", {
          type: typeof pdfFile,
        });
        continue;
      }
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      });
      logger.debug("Added PDF file to request", {
        dataLength: pdfBase64.length,
      });
    }

    // Add images (including those converted from PDF by baseProvider)
    for (let i = 0; i < inputImages.length; i++) {
      const image = inputImages[i];
      let imageBase64: string;
      let mimeType: string;

      if (Buffer.isBuffer(image)) {
        imageBase64 = image.toString("base64");
        mimeType = this.detectImageType(image);
      } else if (typeof image === "string") {
        const isFilePath =
          image.startsWith("/") ||
          /^[a-zA-Z]:\\/.test(image) ||
          image.startsWith("./") ||
          image.startsWith("../") ||
          image.startsWith("..\\") ||
          image.startsWith(".\\");

        if (isFilePath) {
          const normalizedPath = path.resolve(image);
          if (!fs.existsSync(normalizedPath)) {
            logger.warn(`Image file not found: ${normalizedPath}, skipping`);
            continue;
          }
          const imageBuffer = fs.readFileSync(normalizedPath);
          imageBase64 = imageBuffer.toString("base64");
          mimeType = this.detectImageType(imageBuffer);
        } else if (image.startsWith("data:")) {
          const matches = image.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            mimeType = matches[1];
            imageBase64 = matches[2];
          } else {
            logger.warn("Invalid data URL format, skipping image", {
              index: i,
            });
            continue;
          }
        } else {
          imageBase64 = image;
          const decodedBuffer = Buffer.from(imageBase64, "base64");
          mimeType = this.detectImageType(decodedBuffer);
        }
      } else {
        logger.warn("Invalid image format, skipping", {
          type: typeof image,
          index: i,
        });
        continue;
      }

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      });

      logger.debug("Added image to request", {
        index: i,
        mimeType,
        dataLength: imageBase64.length,
      });
    }

    return parts;
  }

  /**
   * Parse the Vertex AI image generation REST API response and extract image data.
   */
  private parseImageGenerationResponse(
    data: {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: { data: string; mimeType?: string };
            inline_data?: { data: string; mime_type?: string };
            text?: string;
          }>;
        };
      }>;
    },
    imageModelName: string,
  ): { imageData: string; mimeType: string } {
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new ProviderError(
        "No content parts in Vertex AI response",
        this.providerName,
      );
    }

    // Find image part (check both camelCase and snake_case)
    const imagePart = candidate.content.parts.find(
      (part) =>
        (part.inlineData || part.inline_data) &&
        ((part.inlineData && part.inlineData.mimeType) ||
          (part.inline_data && part.inline_data.mime_type)) &&
        ((part.inlineData && part.inlineData.mimeType?.startsWith("image/")) ||
          (part.inline_data &&
            part.inline_data.mime_type?.startsWith("image/"))),
    );

    if (!imagePart) {
      const hasTextContent = candidate.content.parts.some((part) => part.text);

      throw new ProviderError(
        hasTextContent
          ? `Image generation completed but model returned text instead of image data. Model: ${imageModelName}`
          : `Image generation completed but no image data was returned. Model: ${imageModelName}`,
        this.providerName,
      );
    }

    const imageData = imagePart.inlineData?.data || imagePart.inline_data?.data;
    const mimeType =
      imagePart.inlineData?.mimeType ||
      imagePart.inline_data?.mime_type ||
      "image/png";

    if (!imageData) {
      throw new ProviderError(
        "Image part found but no data available",
        this.providerName,
      );
    }

    return { imageData, mimeType };
  }

  /**
   * Overrides the BaseProvider's image generation method to implement it for Vertex AI.
   * Uses REST API approach with google-auth-library for authentication.
   * Supports PDF input for image generation with gemini-3-pro-image-preview (Nano Banana Pro).
   * @param options The generation options containing the prompt and optional PDF files.
   * @returns A promise that resolves to the generation result, including the image data.
   */
  protected async executeImageGeneration(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const prompt = options.prompt || options.input?.text || "";
    const pdfFiles = options.input?.pdfFiles || [];
    const inputImages = options.input?.images || [];
    const hasPdfInput = pdfFiles.length > 0;
    const hasImageInput = inputImages.length > 0;

    if (!prompt.trim() && !hasPdfInput && !hasImageInput) {
      throw new ProviderError(
        "Image generation requires either a prompt, PDF file, or image as input",
        this.providerName,
      );
    }

    // Select appropriate model
    let imageModelName =
      options.model || this.modelName || "gemini-3-pro-image-preview";

    if (hasPdfInput && !imageModelName.includes("gemini-3-pro-image")) {
      imageModelName = "gemini-3-pro-image-preview";
    }

    // Determine location - some image models require 'global' location
    const imageLocation = process.env.GOOGLE_VERTEX_IMAGE_LOCATION || "global";
    const requiresGlobalLocation = GLOBAL_LOCATION_MODELS.some(
      (model) =>
        imageModelName.includes(model) || model.includes(imageModelName),
    );
    const location = requiresGlobalLocation ? imageLocation : this.location;

    const startTime = Date.now();

    logger.info("🎨 Starting Vertex AI image generation (REST API)", {
      model: imageModelName,
      prompt: prompt.substring(0, 100),
      provider: this.providerName,
      projectId: this.projectId,
      location: location,
      hasPdfInput,
      pdfCount: pdfFiles.length,
      hasImageInput,
      imageCount: inputImages.length,
    });

    try {
      const token = await this.getImageGenerationAccessToken();

      const parts = this.buildImageGenerationParts(
        prompt,
        pdfFiles,
        inputImages as Array<Buffer | string>,
      );

      // Build request body with CRITICAL response_modalities setting
      const requestBody = {
        contents: [{ role: "user", parts }],
        generation_config: {
          response_modalities: ["TEXT", "IMAGE"],
          temperature: options.temperature || 0.7,
          candidate_count: 1,
        },
      };

      // Construct Vertex AI endpoint
      let url: string;
      if (location === "global") {
        url = `https://aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/global/publishers/google/models/${imageModelName}:generateContent`;
      } else {
        url = `https://${location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${location}/publishers/google/models/${imageModelName}:generateContent`;
      }

      logger.debug("Making REST API call to Vertex AI", {
        url,
        model: imageModelName,
        hasAccessToken: true,
      });

      // Add timeout protection (120 seconds for image generation)
      const timeoutMs = 120000;

      const fetchPromise = fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new TimeoutError(
              `Vertex AI image generation timed out after ${timeoutMs}ms`,
              timeoutMs,
            ),
          );
        }, timeoutMs);
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError(
          `Vertex AI API error (${response.status}): ${errorText}`,
          this.providerName,
        );
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { data: string; mimeType?: string };
              inline_data?: { data: string; mime_type?: string };
              text?: string;
            }>;
          };
        }>;
      };

      const { imageData, mimeType } = this.parseImageGenerationResponse(
        data,
        imageModelName,
      );

      logger.info("Image generation successful", {
        model: imageModelName,
        mimeType,
        dataLength: imageData.length,
        responseTime: Date.now() - startTime,
      });

      const result: EnhancedGenerateResult = {
        content: `Generated image using ${imageModelName} (${mimeType})`,
        imageOutput: {
          base64: imageData,
        },
        provider: this.providerName,
        model: imageModelName,
        usage: {
          input: this.estimateTokenCount(prompt),
          output: 0,
          total: this.estimateTokenCount(prompt),
        },
      };

      return await this.enhanceResult(result, options, startTime);
    } catch (error) {
      logger.error("Image generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: imageModelName,
        prompt: prompt.substring(0, 100),
      });

      throw this.handleProviderError(error);
    }
  }

  /**
   * Generate embeddings for text using Google Vertex AI text-embedding models
   * @param text - The text to embed
   * @param modelName - The embedding model to use (default: text-embedding-004)
   * @returns Promise resolving to the embedding vector
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const embeddingModelName = modelName || "text-embedding-004";

    logger.debug("Generating embedding", {
      provider: this.providerName,
      model: embeddingModelName,
      textLength: text.length,
    });

    try {
      // Create embedding model using the AI SDK
      const { embed } = await import("ai");

      // Create the Vertex provider with current settings
      const vertexSettings = await createVertexSettings(this.location);
      const vertex = createVertex(vertexSettings);

      // Get the text embedding model
      const embeddingModel = vertex.textEmbeddingModel(embeddingModelName);

      // Generate the embedding
      const result = await embed({
        model: embeddingModel,
        value: text,
      });

      logger.debug("Embedding generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        embeddingDimension: result.embedding.length,
      });

      return result.embedding;
    } catch (error) {
      logger.error("Embedding generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: embeddingModelName,
        textLength: text.length,
      });

      throw this.handleProviderError(error);
    }
  }

  /**
   * Get model suggestions when a model is not found
   */
  private getModelSuggestions(requestedModel: string | undefined): string {
    const availableModels = {
      google: [
        "gemini-3-pro-preview-11-2025",
        "gemini-3-pro-latest",
        "gemini-3-pro-preview",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-001",
        "gemini-2.0-flash-lite",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
      ],
      claude: [
        "claude-sonnet-4-5@20250929",
        "claude-sonnet-4@20250514",
        "claude-opus-4@20250514",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
        "claude-3-opus-20240229",
      ],
    };

    let suggestions = "\n🤖 Google Models (always available):\n";
    availableModels.google.forEach((model) => {
      suggestions += `  • ${model}\n`;
    });

    suggestions += "\n🧠 Claude Models (requires Anthropic integration):\n";
    availableModels.claude.forEach((model) => {
      suggestions += `  • ${model}\n`;
    });

    // If the requested model looks like a Claude model, provide specific guidance
    if (requestedModel && requestedModel.toLowerCase().includes("claude")) {
      suggestions += `\n💡 Tip: "${requestedModel}" appears to be a Claude model.\n`;
      suggestions +=
        "Ensure Anthropic integration is enabled in your Google Cloud project.\n";
      suggestions += "Try using an available Claude model from the list above.";
    }

    return suggestions;
  }
}

export default GoogleVertexProvider;

// Re-export for compatibility
export { GoogleVertexProvider as GoogleVertexAI };
