import {
  createVertex,
  type GoogleVertexProviderSettings,
} from "@ai-sdk/google-vertex";
import {
  createVertexAnthropic,
  type GoogleVertexAnthropicProviderSettings,
} from "@ai-sdk/google-vertex/anthropic";
import type { ZodType, ZodTypeDef } from "zod";
import {
  streamText,
  Output,
  type Schema,
  type LanguageModelV1,
  type LanguageModel,
} from "ai";
import type { AIProviderName } from "../types/index.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { UnknownRecord } from "../types/common.js";
import type { NeuroLink } from "../neurolink.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { ModelConfigurationManager } from "../core/modelConfiguration.js";
import {
  validateApiKey,
  createVertexProjectConfig,
  createGoogleAuthConfig,
} from "../utils/providerConfig.js";
import fs from "fs";
import path from "path";
import os from "os";
import dns from "dns";
import {
  buildMessagesArray,
  buildMultimodalMessagesArray,
  convertToCoreMessages,
} from "../utils/messageBuilder.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";

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
  const baseSettings: GoogleVertexProviderSettings = {
    project: getVertexProjectId(),
    location: region || getVertexLocation(),
    fetch: createProxyFetch(),
  };

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
            googleAppCreds: process.env.GOOGLE_APPLICATION_CREDENTIALS,
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
      const hasMultimodalInput = !!(
        options.input?.images?.length ||
        options.input?.content?.length ||
        options.input?.files?.length ||
        options.input?.csvFiles?.length
      );

      let messages;
      if (hasMultimodalInput) {
        logger.debug(
          `${functionTag}: Detected multimodal input, using multimodal message builder`,
          {
            hasImages: !!options.input?.images?.length,
            imageCount: options.input?.images?.length || 0,
            hasContent: !!options.input?.content?.length,
            contentCount: options.input?.content?.length || 0,
          },
        );

        // Create multimodal options for buildMultimodalMessagesArray
        const multimodalOptions = {
          input: {
            text: options.input?.text || "",
            images: options.input?.images,
            content: options.input?.content,
            files: options.input?.files,
            csvFiles: options.input?.csvFiles,
          },
          csvOptions: options.csvOptions,
          systemPrompt: options.systemPrompt,
          conversationHistory: options.conversationMessages,
          provider: this.providerName,
          model: this.modelName,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          enableAnalytics: options.enableAnalytics,
          enableEvaluation: options.enableEvaluation,
          context: options.context,
        };

        const mm = await buildMultimodalMessagesArray(
          multimodalOptions,
          this.providerName,
          this.modelName,
        );
        // Convert multimodal messages to Vercel AI SDK format (CoreMessage[])
        messages = convertToCoreMessages(mm);
      } else {
        logger.debug(
          `${functionTag}: Text-only input, using standard message builder`,
        );
        messages = await buildMessagesArray(options);
      }

      const model = await this.getAISDKModelWithMiddleware(options); // This is where network connection happens!

      // Get all available tools (direct + MCP + external) for streaming
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools ? await this.getAllTools() : {};

      logger.debug(`${functionTag}: Tools for streaming`, {
        shouldUseTools,
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
        experimental_telemetry: this.getStreamTelemetryConfig(options),

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
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

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

    // Validate region format
    const regionPattern = /^[a-z]+-[a-z]+\d+$/;
    if (!regionPattern.test(region)) {
      result.issues.push(`Invalid region format: ${region}`);
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
      "us-central1",
      "us-east4",
      "us-east5",
      "us-west1",
      "us-west4",
      "europe-west1",
      "europe-west4",
      "asia-southeast1",
      "asia-northeast1",
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
   * Get model suggestions when a model is not found
   */
  private getModelSuggestions(requestedModel: string | undefined): string {
    const availableModels = {
      google: [
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-001",
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
