/* eslint-disable max-lines-per-function */
// Native SDK imports - no more @ai-sdk/google-vertex dependency
import fs from "fs";
import path from "path";
import os from "os";
import type { ZodType } from "zod";
import type { AnthropicVertex as AnthropicVertexType } from "@anthropic-ai/vertex-sdk";
import {
  AIProviderName,
  ErrorCategory,
  ErrorSeverity,
} from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import {
  DEFAULT_MAX_STEPS,
  DEFAULT_TOOL_MAX_RETRIES,
  GLOBAL_LOCATION_MODELS,
  IMAGE_GENERATION_MODELS,
  TOOL_STORAGE_TIMEOUT_MS,
} from "../core/constants.js";
import { ModelConfigurationManager } from "../core/modelConfiguration.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  UnknownRecord,
  ZodUnknownSchema,
  EnhancedGenerateResult,
  TextGenerationOptions,
  GenAIClient,
  GoogleGenAIClass,
  GoogleVertexProviderSettings,
  AnthropicVertexSettings,
  StreamOptions,
  StreamResult,
  ToolWithLegacyParams,
  VertexNativePart,
  VertexGenaiFunctionDeclaration,
  VertexAnthropicMessage,
  VertexAnthropicTool,
  VertexAnthropicContentBlock,
} from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { ERROR_CODES, NeuroLinkError } from "../utils/errorHandling.js";
import { FileDetector } from "../utils/fileDetector.js";
import { processUnifiedFilesArray } from "../utils/messageBuilder.js";
import { logger } from "../utils/logger.js";
import {
  hasRestrictedOutputLimit,
  RESTRICTED_OUTPUT_TOKEN_LIMIT,
  toVertexAnthropicModelId,
} from "../utils/modelDetection.js";
import { resolveClaudeMaxTokens } from "../utils/tokenLimits.js";
import {
  validateApiKey,
  createVertexProjectConfig,
  createGoogleAuthConfig,
} from "../utils/providerConfig.js";
import {
  convertZodToJsonSchema,
  inlineJsonSchema,
  ensureNestedSchemaTypes,
} from "../utils/schemaConversion.js";
import { createNativeThinkingConfig } from "../utils/thinkingConfig.js";
import { TimeoutError, withTimeout } from "../utils/async/index.js";
import { parseTimeout } from "../utils/timeout.js";
import {
  createTextChannel,
  extractThoughtSignature,
  prependConversationMessages,
} from "./googleNativeGemini3.js";
import {
  ATTR,
  tracers,
  withClientSpan,
  withClientStreamSpan,
  withSpan,
} from "../telemetry/index.js";
import { calculateCost } from "../utils/pricing.js";
import { transformToolExecutions } from "../utils/transformationUtils.js";
import type { Schema, LanguageModel, Tool } from "../types/index.js";

// Import proper types for multimodal message handling

// Dynamic import helper for native Anthropic Vertex SDK
let anthropicVertexModule: typeof import("@anthropic-ai/vertex-sdk") | null =
  null;

async function getAnthropicVertexModule(): Promise<
  typeof import("@anthropic-ai/vertex-sdk")
> {
  if (!anthropicVertexModule) {
    anthropicVertexModule = await import("@anthropic-ai/vertex-sdk");
  }
  return anthropicVertexModule;
}

// Enhanced Anthropic support check - now uses native SDK
const hasAnthropicSupport = (): boolean => {
  // Always return true as we have the native SDK available
  // Actual availability is checked at runtime when creating the client
  return true;
};

/**
 * Recursively strip JSON-schema fields that Vertex Gemini's function-call
 * validator rejects with 400 INVALID_ARGUMENT. Vertex implements OpenAPI 3.0
 * Schema strictly and rejects extension fields that the broader JSON Schema
 * spec allows. The fields stripped here have no semantic meaning for the
 * model, so removing them is safe for every caller.
 *
 * Fields removed:
 * - `additionalProperties` — extension; Vertex rejects on any nested object.
 * - `default` — Vertex rejects defaults on object/array-typed properties and
 *   on properties that are also marked `required`. Safest to strip globally
 *   because the model never inspects them.
 * - `$schema`, `$id`, `$ref`, `definitions`, `$defs` — JSON-Schema-meta
 *   fields that Vertex doesn't recognise.
 * - `examples` — accepted by some Gemini variants but not 2.5-flash; strip
 *   to avoid the model rejecting tool schemas under that path.
 */
function stripAdditionalPropertiesDeep(
  schema: Record<string, unknown> | undefined,
): void {
  if (!schema || typeof schema !== "object") {
    return;
  }
  const FIELDS_TO_STRIP = [
    "additionalProperties",
    "default",
    "$schema",
    "$id",
    "$ref",
    "definitions",
    "$defs",
    "examples",
  ] as const;
  for (const field of FIELDS_TO_STRIP) {
    if (field in schema) {
      delete (schema as Record<string, unknown>)[field];
    }
  }
  // JSON Schema Draft-4 `exclusiveMinimum: true` / `exclusiveMaximum: true`
  // (boolean form) is rejected by Vertex's OpenAPI 3.0 validator, which
  // expects a numeric bound. zod-to-json-schema's openApi3 target still
  // emits the Draft-4 form for `z.number().positive()` etc. Translate the
  // boolean form into the numeric form when paired with `minimum` /
  // `maximum`; otherwise drop it (the model doesn't validate, so the
  // constraint is informational only).
  if (typeof schema.exclusiveMinimum === "boolean") {
    if (
      schema.exclusiveMinimum === true &&
      typeof schema.minimum === "number"
    ) {
      schema.exclusiveMinimum = schema.minimum;
      delete schema.minimum;
    } else {
      delete schema.exclusiveMinimum;
    }
  }
  if (typeof schema.exclusiveMaximum === "boolean") {
    if (
      schema.exclusiveMaximum === true &&
      typeof schema.maximum === "number"
    ) {
      schema.exclusiveMaximum = schema.maximum;
      delete schema.maximum;
    } else {
      delete schema.exclusiveMaximum;
    }
  }
  // Strip `maximum` values that exceed int32 range — Vertex's protobuf
  // serializer treats `type: "integer"` as int32 and rejects bounds beyond
  // 2^31. zod's `.positive().int()` emits Number.MAX_SAFE_INTEGER as the
  // upper bound (8.9e15), which trips this. The constraint is informational
  // for the model anyway, so dropping it is safe.
  const INT32_MAX = 2147483647;
  if (typeof schema.maximum === "number" && schema.maximum > INT32_MAX) {
    delete schema.maximum;
  }
  if (typeof schema.minimum === "number" && schema.minimum < -INT32_MAX) {
    delete schema.minimum;
  }
  if (schema.properties && typeof schema.properties === "object") {
    for (const child of Object.values(
      schema.properties as Record<string, unknown>,
    )) {
      if (child && typeof child === "object") {
        stripAdditionalPropertiesDeep(child as Record<string, unknown>);
      }
    }
  }
  if (schema.items && typeof schema.items === "object") {
    if (Array.isArray(schema.items)) {
      for (const item of schema.items) {
        if (item && typeof item === "object") {
          stripAdditionalPropertiesDeep(item as Record<string, unknown>);
        }
      }
    } else {
      stripAdditionalPropertiesDeep(schema.items as Record<string, unknown>);
    }
  }
  for (const key of ["allOf", "anyOf", "oneOf"] as const) {
    if (Array.isArray(schema[key])) {
      for (const branch of schema[key] as unknown[]) {
        if (branch && typeof branch === "object") {
          stripAdditionalPropertiesDeep(branch as Record<string, unknown>);
        }
      }
    }
  }
}

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

/**
 * Resolve the effective Vertex region for a given model.
 *
 * Policy (matches the bugfixes-suite contract):
 *  - Every Gemini model (`gemini-*`) is force-routed to the `global` endpoint
 *    regardless of any caller-supplied region. Regional endpoints 404 for
 *    Gemini 3.x previews and the regional/global behaviour for 2.x is
 *    consistent enough that pinning all Gemini traffic to global is the
 *    right safe default. The legacy `GLOBAL_LOCATION_MODELS` allowlist is
 *    kept as a defence-in-depth fallback so any non-`gemini-` identifiers
 *    that still need global (e.g. image-gen aliases) keep working.
 *  - Non-Gemini models (Claude on Vertex, embeddings, custom models) keep
 *    the caller-supplied region or fall back to env-derived defaults.
 *
 * @param modelName - The target model identifier.
 * @param configuredLocation - Caller-provided region (e.g. options.region).
 *   Used as the fallback for non-Gemini models; ignored for Gemini.
 * @returns The region string to pass to the @google/genai client.
 */
export const resolveVertexLocation = (
  modelName: string | undefined,
  configuredLocation?: string,
): string => {
  const fallback = configuredLocation || getVertexLocation();
  if (!modelName) {
    return fallback;
  }
  const lower = modelName.toLowerCase();
  const isGemini =
    lower.startsWith("gemini-") ||
    lower.includes("/gemini-") ||
    GLOBAL_LOCATION_MODELS.some(
      (m) =>
        lower === m.toLowerCase() ||
        lower.includes(m.toLowerCase()) ||
        m.toLowerCase().includes(lower),
    );
  if (isGemini) {
    return process.env.GOOGLE_VERTEX_GLOBAL_LOCATION || "global";
  }
  return fallback;
};

/**
 * Backwards-compatible internal alias kept so existing call sites compile
 * unchanged. New code should call `resolveVertexLocation` directly.
 */
const resolveVertexRegionForModel = resolveVertexLocation;

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

// Cache the runtime-created credentials file path so we don't write a new file
// on every settings creation (which would leak files in /tmp). The file is also
// cleaned up on process exit.
let cachedRuntimeCredentialsFile: string | null = null;
let credentialsCleanupRegistered = false;

const registerCredentialsCleanup = (filePath: string): void => {
  if (credentialsCleanupRegistered) {
    return;
  }
  credentialsCleanupRegistered = true;
  const cleanup = () => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore cleanup errors — best-effort
    }
  };
  process.once("exit", cleanup);
  process.once("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });
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

  // Note: Global endpoint handling is managed by the @google/genai SDK based on location parameter.
  // Authentication is handled via GOOGLE_APPLICATION_CREDENTIALS environment variable
  // or the temporary credentials file approach below.

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
  // (or reuse the one we already wrote earlier in this process)
  if (
    requiredEnvVarsForFile.client_email &&
    requiredEnvVarsForFile.private_key
  ) {
    try {
      // Reuse cached file if it still exists on disk
      if (
        cachedRuntimeCredentialsFile &&
        fs.existsSync(cachedRuntimeCredentialsFile)
      ) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS =
          cachedRuntimeCredentialsFile;
        return baseSettings;
      }

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

      // Create temporary credentials file (once per process)
      const tmpDir = os.tmpdir();
      const credentialsFileName = `google-credentials-${Date.now()}-${Math.random().toString(36).substring(2, 11)}.json`;
      const credentialsFilePath = path.join(tmpDir, credentialsFileName);

      fs.writeFileSync(
        credentialsFilePath,
        JSON.stringify(serviceAccountCredentials, null, 2),
        // Owner read/write only — credentials should not be world-readable
        { mode: 0o600 },
      );

      // Set the environment variable to point to our runtime-created file
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsFilePath;
      cachedRuntimeCredentialsFile = credentialsFilePath;
      registerCredentialsCleanup(credentialsFilePath);

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
      // fileExists remains false
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
        // fileExists remains false
      }

      if (fileExists) {
        return baseSettings;
      }
    }
  }

  // Log warning if no valid authentication is available
  // Note: Authentication is handled via GOOGLE_APPLICATION_CREDENTIALS environment variable
  // or the temporary credentials file approach (OPTION 2 above).
  logger.warn("No valid authentication found for Google Vertex AI", {
    authMethod: "none",
    authenticationAttempts: {
      principalAccountFile: {
        envVarSet: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        filePath: process.env.GOOGLE_APPLICATION_CREDENTIALS || "NOT_SET",
        fileExists: false, // We already checked above
      },
      explicitCredentials: {
        hasClientEmail: !!process.env.GOOGLE_AUTH_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_AUTH_PRIVATE_KEY,
      },
    },
    troubleshooting: [
      "1. Ensure GOOGLE_APPLICATION_CREDENTIALS points to an existing file, OR",
      "2. Set individual environment variables: GOOGLE_AUTH_CLIENT_EMAIL and GOOGLE_AUTH_PRIVATE_KEY",
    ],
  });
  return baseSettings;
};

// Create Anthropic-specific Vertex settings for native @anthropic-ai/vertex-sdk
const createVertexAnthropicSettings = async (
  region?: string,
  timeoutMs?: number,
): Promise<AnthropicVertexSettings> => {
  const location = region || getVertexLocation();
  const project = getVertexProjectId();

  return {
    projectId: project,
    region: location,
    ...(timeoutMs !== undefined && { timeout: timeoutMs }),
  };
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
 * @important Tools + Schema Support (Fixed)
 * Gemini models on Vertex AI now support combining function calling (tools) with
 * structured output (JSON schema) simultaneously. The fix works by NOT setting
 * `responseMimeType: "application/json"` when tools are present, which was
 * causing the Google API error.
 *
 * The `responseSchema` is still set to guide the output structure, allowing
 * tools to execute AND the final output to follow the schema format.
 *
 * @example Gemini models with tools + schemas
 * ```typescript
 * const provider = new GoogleVertexProvider("gemini-2.5-flash");
 * const result = await provider.generate({
 *   input: { text: "Analyze data using tools" },
 *   schema: MySchema,
 *   output: { format: "json" },
 *   // No need for disableTools: true anymore!
 * });
 * ```
 *
 * @example Claude models (always supported both)
 * ```typescript
 * const provider = new GoogleVertexProvider("claude-3-5-sonnet-20241022");
 * const result = await provider.generate({
 *   input: { text: "Analyze data" },
 *   schema: MySchema,
 *   output: { format: "json" }
 * });
 * ```
 *
 * @note "Too many states for serving" errors can still occur with very complex schemas + tools.
 *       Solution: Simplify schema or reduce number of tools if this occurs.
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
    credentials?: Record<string, unknown>,
  ) {
    super(modelName, "vertex" as AIProviderName, sdk as NeuroLink | undefined);

    // Apply per-request credentials if provided
    if (credentials) {
      if (credentials.projectId) {
        process.env.GOOGLE_CLOUD_PROJECT = String(credentials.projectId);
      }
      if (credentials.location) {
        process.env.GOOGLE_CLOUD_LOCATION = String(credentials.location);
      }
      if (credentials.apiKey) {
        process.env.GOOGLE_API_KEY = String(credentials.apiKey);
      }
    }

    // Validate Google Cloud credentials - now using consolidated utility
    if (!hasGoogleCredentials()) {
      validateApiKey(createGoogleAuthConfig());
    }

    // Initialize Google Cloud configuration
    this.projectId = (credentials?.projectId as string) || getVertexProjectId();
    this.location =
      region || (credentials?.location as string) || getVertexLocation();

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
   * Returns the Vercel AI SDK model instance for Google Vertex
   * Creates fresh model instances for each request
   */
  protected async getAISDKModel(): Promise<LanguageModel> {
    // This method is no longer used - we route ALL models directly to native SDKs
    // in executeStream and generate methods. Throwing an error to catch any
    // unexpected code paths that might try to use the old Vercel AI SDK approach.
    throw new NeuroLinkError({
      code: ERROR_CODES.INVALID_CONFIGURATION,
      message:
        "GoogleVertexProvider no longer uses @ai-sdk/google-vertex. All models use native SDKs: @google/genai for Gemini, @anthropic-ai/vertex-sdk for Claude.",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      retriable: false,
      context: { provider: this.providerName, model: this.modelName },
    });
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
  ): Promise<LanguageModel | null> {
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
  ): Promise<LanguageModel> {
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
   * @deprecated This method is no longer used. All models now use native SDKs.
   */
  private async createVertexInstance(
    _vertexSettings: unknown,
    _modelName: string,
    _modelCreationId: string,
    _modelCreationStartTime: number,
    _modelCreationHrTimeStart: bigint,
  ): Promise<LanguageModel> {
    // This method is dead code - all models now route to native SDK methods.
    throw new NeuroLinkError({
      code: ERROR_CODES.INVALID_CONFIGURATION,
      message:
        "createVertexInstance is deprecated. Use executeNativeGemini3Stream/Generate or executeNativeAnthropicStream/Generate instead.",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      retriable: false,
      context: { provider: this.providerName },
    });
  }

  /**
   * Gets the appropriate model instance (Google or Anthropic)
   * Uses dual provider architecture for proper model routing
   * Creates fresh instances for each request to ensure proper authentication
   */
  private async getModel(): Promise<LanguageModel> {
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
    _analysisSchema?: ZodType<unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    // ALL models now use native SDKs - no more @ai-sdk/google-vertex dependency
    const modelName =
      options.model || this.modelName || getDefaultVertexModel();

    // Wrap the native stream path in a `neurolink.provider.stream` span so
    // the test:tracing observability harness sees the same span hierarchy
    // it sees for AI Studio. BaseProvider.stream does NOT emit this span
    // for any provider — each native provider has to add it itself.
    return withClientStreamSpan(
      {
        name: "neurolink.provider.stream",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: this.providerName,
          [ATTR.GEN_AI_MODEL]: modelName,
          [ATTR.GEN_AI_OPERATION]: "stream",
          [ATTR.NL_PROVIDER]: this.providerName,
        },
      },
      async (streamSpan) => {
        const streamStartTime = Date.now();

        // Tool filter (a0269210): trust options.tools — caller (BaseProvider.stream)
        // already merged MCP/built-in tools and applied any enabledToolNames filter.
        const optionTools = options.tools || {};

        // Emit a `neurolink.message.build` span for the native stream path
        // so observability tooling sees the same hierarchy it sees on
        // Pipeline A. Without this, test:tracing's "Message Build Span"
        // assertion has to skip on every native-Vertex stream.
        const processedOptions = await withSpan(
          {
            name: "neurolink.message.build",
            tracer: tracers.provider,
            attributes: {
              [ATTR.NL_PROVIDER]: this.providerName,
              "message.count": 1,
              "message.build.count": 1,
              "message.build.path": "vertex.native.stream",
            },
          },
          async () => this.processCSVFilesForNativeSDK(options),
        );

        // Pass through to native SDK path
        const mergedOptions = {
          ...processedOptions,
          tools: optionTools,
        };

        try {
          // Route Claude models to native Anthropic SDK
          let result: StreamResult;
          if (isAnthropicModel(modelName)) {
            logger.info(
              "[GoogleVertex] Routing Claude model to native @anthropic-ai/vertex-sdk",
              {
                model: modelName,
                totalToolCount: Object.keys(optionTools).length,
              },
            );
            result = await this.executeNativeAnthropicStream(mergedOptions);
          } else {
            // ALL Gemini models use native @google/genai SDK
            logger.info(
              "[GoogleVertex] Routing Gemini model to native @google/genai",
              {
                model: modelName,
                totalToolCount: Object.keys(optionTools).length,
              },
            );
            result = await this.executeNativeGemini3Stream(mergedOptions);
          }
          // Cost / token usage on the stream span. Native streams resolve
          // usage synchronously (the stream loop has already drained), so
          // `result.usage` is populated by the time we reach this point.
          this.attachUsageAndCostAttributes(
            streamSpan,
            modelName,
            result?.usage,
          );
          // Wrap the result's async iterable to fire onChunk / onFinish
          // lifecycle callbacks. Pipeline A gets these via the AI SDK
          // wrapStream middleware; the native path has to fire them here.
          const wrappedResult = this.wrapStreamResultWithLifecycle(
            options,
            result,
            streamStartTime,
          );
          this.emitStreamEnd(modelName, streamStartTime, true);
          return wrappedResult;
        } catch (error) {
          this.fireGenerateOnError(options, error, streamStartTime);
          this.emitStreamEnd(modelName, streamStartTime, false, error);
          throw error;
        }
      },
      (r) => r.stream,
      (r, wrapped) => ({ ...r, stream: wrapped }),
    );
  }

  /**
   * Emit `stream:end` so the Pipeline B observability listener creates a
   * `model.generation` span for native Vertex stream traffic. Mirrors
   * `emitGenerationEnd` (used by `generate()`).
   */
  private emitStreamEnd(
    modelName: string,
    startTime: number,
    success: boolean,
    error?: unknown,
  ): void {
    const emitter = this.neurolink?.getEventEmitter();
    if (!emitter) {
      return;
    }
    emitter.emit("stream:end", {
      provider: this.providerName,
      responseTime: Date.now() - startTime,
      timestamp: Date.now(),
      result: {
        content: "",
        usage: { input: 0, output: 0, total: 0 },
        model: modelName,
        provider: this.providerName,
        finishReason: success ? "stop" : "error",
      },
      success,
      ...(error
        ? { error: error instanceof Error ? error.message : String(error) }
        : {}),
    });
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
    // Include httpOptions with proxy fetch for corporate network support
    return new Ctor({
      vertexai: true,
      project,
      location,
      httpOptions: {
        fetch: createProxyFetch(),
      },
    });
  }

  /**
   * Execute stream using native @google/genai SDK for Gemini 3 models on Vertex AI
   * This bypasses @ai-sdk/google-vertex to properly handle thought_signature
   */
  private async executeNativeGemini3Stream(
    options: StreamOptions,
  ): Promise<StreamResult> {
    const modelName =
      options.model || this.modelName || getDefaultVertexModel();
    const effectiveLocation = resolveVertexRegionForModel(
      modelName,
      options.region,
    );
    const client = await this.createVertexGenAIClient(effectiveLocation);

    logger.debug("[GoogleVertex] Using native @google/genai for Gemini 3", {
      model: modelName,
      hasTools: !!options.tools && Object.keys(options.tools).length > 0,
      project: this.projectId,
      location: effectiveLocation,
    });

    // Build contents from input with multimodal support
    const contents: Array<{
      role: string;
      parts: VertexNativePart[];
    }> = [];

    // Build user message parts - start with text.
    // `options.input.text` is `string | undefined` in strict mode; the
    // VertexNativePart `text` field requires `string`, so coerce to "" if
    // unset (the multimodal-only path still appends other parts below).
    const userParts: VertexNativePart[] = [{ text: options.input.text ?? "" }];

    // Add PDF files as inlineData parts if present
    // Cast input to access multimodal properties that may exist at runtime
    const multimodalInput = options.input as {
      text: string;
      pdfFiles?: Array<Buffer | string>;
      images?: Array<Buffer | string>;
    };

    if (multimodalInput?.pdfFiles && multimodalInput.pdfFiles.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.pdfFiles.length} PDF file(s) for native stream`,
      );

      for (const pdfFile of multimodalInput.pdfFiles) {
        let pdfBuffer: Buffer;

        if (typeof pdfFile === "string") {
          // Check if it's a file path
          if (fs.existsSync(pdfFile)) {
            pdfBuffer = fs.readFileSync(pdfFile);
          } else {
            // Assume it's already base64 encoded
            pdfBuffer = Buffer.from(pdfFile, "base64");
          }
        } else {
          pdfBuffer = pdfFile;
        }

        // Convert to base64 for the native SDK
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
        `[GoogleVertex] Processing ${multimodalInput.images.length} image(s) for native stream`,
      );

      for (const image of multimodalInput.images) {
        let imageBuffer: Buffer;
        let mimeType = "image/jpeg"; // Default

        if (typeof image === "string") {
          if (fs.existsSync(image)) {
            imageBuffer = fs.readFileSync(image);
            // Detect mime type from extension
            const ext = path.extname(image).toLowerCase();
            if (ext === ".png") {
              mimeType = "image/png";
            } else if (ext === ".gif") {
              mimeType = "image/gif";
            } else if (ext === ".webp") {
              mimeType = "image/webp";
            }
          } else if (image.startsWith("data:")) {
            // Handle data URL
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              imageBuffer = Buffer.from(matches[2], "base64");
            } else {
              continue; // Skip invalid data URL
            }
          } else if (
            image.startsWith("http://") ||
            image.startsWith("https://")
          ) {
            // Image URL — fetch and base64-encode. Without this, the URL
            // string falls through to the "assume base64" branch below
            // and Vertex returns "Provided image is not valid".
            try {
              const response = await fetch(image);
              if (!response.ok) {
                logger.warn(
                  `[GoogleVertex] Image fetch failed: ${response.status} ${response.statusText}, skipping`,
                  { url: image },
                );
                continue;
              }
              const arrayBuffer = await response.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              const headerMime = response.headers.get("content-type");
              if (headerMime && headerMime.startsWith("image/")) {
                mimeType = headerMime.split(";")[0];
              }
            } catch (fetchError) {
              logger.warn(
                `[GoogleVertex] Image URL fetch threw, skipping: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                { url: image },
              );
              continue;
            }
          } else {
            // Assume base64 string
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

    // Prepend prior conversation turns before the current user message so
    // multi-turn callers (memory, loop REPL, agent flows) actually carry
    // context. Without this, the native Vertex Gemini stream rebuilt the
    // contents from only the current input on every call.
    prependConversationMessages(
      contents as Array<{ role: string; parts: unknown[] }>,
      options.conversationMessages,
    );

    contents.push({
      role: "user",
      parts: userParts,
    });

    // Convert Vercel AI SDK tools to @google/genai FunctionDeclarations
    let tools:
      | Array<{ functionDeclarations: VertexGenaiFunctionDeclaration[] }>
      | undefined;
    const executeMap = new Map<string, Tool["execute"]>();

    if (
      options.tools &&
      Object.keys(options.tools).length > 0 &&
      !options.disableTools
    ) {
      const functionDeclarations: VertexGenaiFunctionDeclaration[] = [];

      for (const [name, tool] of Object.entries(options.tools)) {
        const decl: VertexGenaiFunctionDeclaration = {
          name,
          description: tool.description || `Tool: ${name}`,
        };

        // Access legacy `parameters` (AI SDK v3/v4) or current `inputSchema` (v6)
        const legacyTool = tool as ToolWithLegacyParams;
        const toolParams = legacyTool.parameters || tool.inputSchema;
        if (toolParams) {
          // Convert and inline schema to resolve $ref/definitions
          const rawSchema = convertZodToJsonSchema(
            toolParams as ZodUnknownSchema,
            "openApi3",
          ) as Record<string, unknown>;
          const inlinedSchema = inlineJsonSchema(rawSchema);
          // Remove $schema if present - @google/genai doesn't need it
          if (inlinedSchema.$schema) {
            delete inlinedSchema.$schema;
          }
          // CRITICAL: Google Vertex AI requires ALL nested schemas to have a type field
          // ensureNestedSchemaTypes recursively adds missing type fields to tool schemas
          // Note: convertZodToJsonSchema now uses openApi3 target which produces nullable: true
          const typedSchema = ensureNestedSchemaTypes(inlinedSchema);
          // Strip `additionalProperties` recursively — Vertex Gemini's
          // function-call validator rejects it on object schemas (returns
          // 400 INVALID_ARGUMENT) even though it's valid OpenAPI 3. The
          // field has no semantic meaning to the model, so dropping it
          // before send is safe for every caller.
          stripAdditionalPropertiesDeep(typedSchema);
          decl.parametersJsonSchema = typedSchema;
        }

        functionDeclarations.push(decl);

        if (tool.execute) {
          executeMap.set(name, tool.execute);
        }
      }

      tools = [{ functionDeclarations }];

      logger.debug("[GoogleVertex] Converted tools for native SDK", {
        toolCount: functionDeclarations.length,
        toolNames: functionDeclarations.map((t) => t.name),
      });
    }

    // Check if we need to use the final_result tool pattern for structured output with tools
    // When both schema AND tools are present, we add final_result as a tool
    const streamOptions = options as TextGenerationOptions;
    let useFinalResultTool = false;
    if (streamOptions.schema && tools) {
      useFinalResultTool = true;

      // Convert schema to JSON schema format
      const schemaAsJson = convertZodToJsonSchema(
        streamOptions.schema as ZodUnknownSchema,
        "openApi3",
      ) as Record<string, unknown>;
      const inlinedSchema = inlineJsonSchema(schemaAsJson);
      if (inlinedSchema.$schema) {
        delete inlinedSchema.$schema;
      }
      const typedSchema = ensureNestedSchemaTypes(inlinedSchema);

      // Add final_result tool to the existing function declarations
      const existingDeclarations = tools[0]?.functionDeclarations || [];
      existingDeclarations.push({
        name: "final_result",
        description:
          "Return the final structured result. You MUST call this tool when you have gathered all information and are ready to provide the final answer. The arguments should contain the structured data matching the expected schema.",
        parametersJsonSchema: typedSchema,
      });
      tools = [{ functionDeclarations: existingDeclarations }];

      logger.debug(
        "[GoogleVertex] Added final_result tool for structured output with tools (stream)",
        {
          schemaKeys: Object.keys(typedSchema),
          totalTools: existingDeclarations.length,
        },
      );
    }

    // Build config
    const config: Record<string, unknown> = {
      temperature: options.temperature ?? 1.0, // Gemini 3 requires 1.0 for tool calling
      maxOutputTokens: options.maxTokens,
    };

    // Cap maxOutputTokens for models with restricted output token limits (32768)
    // This applies to Gemini 3 models and image generation models (gemini-2.5-flash-image, gemini-3-pro-image-preview)
    if (hasRestrictedOutputLimit(modelName)) {
      if (
        config.maxOutputTokens &&
        (config.maxOutputTokens as number) > RESTRICTED_OUTPUT_TOKEN_LIMIT
      ) {
        logger.warn(
          `[GoogleVertex] Capping maxOutputTokens from ${config.maxOutputTokens} to ${RESTRICTED_OUTPUT_TOKEN_LIMIT} for ${modelName}`,
        );
        config.maxOutputTokens = RESTRICTED_OUTPUT_TOKEN_LIMIT;
      }
      // If maxOutputTokens is undefined, set a safe default
      if (!config.maxOutputTokens) {
        config.maxOutputTokens = RESTRICTED_OUTPUT_TOKEN_LIMIT;
      }
    }

    // Add topP, topK, stopSequences if provided
    if (options.topP !== undefined) {
      config.topP = options.topP;
    }
    if (options.topK !== undefined) {
      config.topK = options.topK;
    }
    if (options.stopSequences && options.stopSequences.length > 0) {
      config.stopSequences = options.stopSequences;
    }

    if (tools) {
      config.tools = tools;
    }

    // Build system prompt, adding final_result instruction if needed
    let effectiveSystemPrompt = options.systemPrompt || "";
    if (useFinalResultTool) {
      const finalResultInstruction =
        "\n\nIMPORTANT: When you have gathered all necessary information and are ready to provide your final answer, you MUST call the 'final_result' tool with the structured data. Do not return the final answer as plain text - always use the final_result tool.";
      effectiveSystemPrompt = effectiveSystemPrompt + finalResultInstruction;
    }

    if (effectiveSystemPrompt) {
      config.systemInstruction = effectiveSystemPrompt;
    }

    // Add thinking config for Gemini 3
    const nativeThinkingConfig = createNativeThinkingConfig(
      options.thinkingConfig,
    );
    if (nativeThinkingConfig) {
      config.thinkingConfig = nativeThinkingConfig;
    }

    // Add JSON output format support for native SDK stream
    // CRITICAL: Google Gemini API does NOT allow combining responseMimeType with function calling.
    // Error: "Function calling with a response mime type: 'application/json' is unsupported"
    // Additionally, responseSchema REQUIRES responseMimeType: "application/json" - they cannot be used separately.
    // Error without it: "Response_schema with a response mime type 'text/plain' is unsupported"
    // Therefore: When tools are present, we cannot use EITHER responseMimeType OR responseSchema.
    // When using final_result tool pattern, we skip this entirely as schema is enforced via tool.
    if (
      (streamOptions.output?.format === "json" || streamOptions.schema) &&
      !useFinalResultTool
    ) {
      // Only set responseMimeType AND responseSchema when NOT using tools
      // Both must be set together, and neither can be used with function calling
      if (!tools) {
        config.responseMimeType = "application/json";

        // Convert schema to JSON schema format for the native SDK
        if (streamOptions.schema) {
          const rawSchema = convertZodToJsonSchema(
            streamOptions.schema as ZodUnknownSchema,
            "openApi3",
          ) as Record<string, unknown>;
          const inlinedSchema = inlineJsonSchema(rawSchema);
          // Remove $schema if present - @google/genai doesn't need it
          if (inlinedSchema.$schema) {
            delete inlinedSchema.$schema;
          }
          // CRITICAL: Google Vertex AI requires ALL nested schemas to have a type field
          // ensureNestedSchemaTypes recursively adds missing type fields
          // Note: convertZodToJsonSchema now uses openApi3 target which produces nullable: true
          const typedSchema = ensureNestedSchemaTypes(inlinedSchema);
          config.responseSchema = typedSchema;

          logger.debug(
            "[GoogleVertex] Added responseSchema for JSON output (stream)",
            {
              schemaKeys: Object.keys(typedSchema),
            },
          );
        }
      }
    }

    const startTime = Date.now();
    // Ensure maxSteps is a valid positive integer to prevent infinite loops
    const rawMaxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    const maxSteps =
      Number.isFinite(rawMaxSteps) && rawMaxSteps > 0
        ? Math.min(Math.floor(rawMaxSteps), 100) // Cap at 100 for safety
        : Math.min(DEFAULT_MAX_STEPS, 100);
    const currentContents = [...contents];
    let finalText = "";
    let lastStepText = ""; // Track text from last step for maxSteps termination
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    // Mirrors the generate-path shape so StreamResult.toolExecutions can be
    // populated (parity with AI-SDK-driven providers) and so the storage
    // hook can persist actual tool outputs rather than the placeholder
    // "success" string used by flushPendingToolData's default fallback.
    const toolExecutions: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }> = [];
    let step = 0;

    // Track structured output from final_result tool (when using final_result pattern)
    let finalResultStructuredOutput: Record<string, unknown> | undefined;

    // Track failed tools to prevent infinite retry loops
    // Key: tool name, Value: { count: retry attempts, lastError: error message }
    const failedTools = new Map<string, { count: number; lastError: string }>();

    // Track token usage across all steps
    // promptTokenCount is typically in the final chunk, candidatesTokenCount accumulates
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Track text parts as they arrive from the SDK so the returned async
    // iterable yields multiple chunks instead of a single buffered chunk.
    // The CLI's chunk-count smoke test asserts > 1 stream chunks for any
    // non-trivial response — collecting everything into `finalText` and
    // yielding it once breaks that signal even though the underlying
    // network stream is genuinely incremental.
    const incrementalTextChunks: string[] = [];

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

        // Capture raw response parts including thoughtSignature
        const rawResponseParts: unknown[] = [];

        for await (const chunk of stream) {
          // Extract raw parts from candidates FIRST
          // This avoids using chunk.text which triggers SDK warning when
          // non-text parts (thoughtSignature, functionCall) are present
          const chunkRecord = chunk as Record<string, unknown>;
          const candidates = chunkRecord.candidates as
            | Array<Record<string, unknown>>
            | undefined;
          const firstCandidate = candidates?.[0];
          const chunkContent = firstCandidate?.content as
            | Record<string, unknown>
            | undefined;
          if (chunkContent && Array.isArray(chunkContent.parts)) {
            for (const part of chunkContent.parts as Array<
              Record<string, unknown>
            >) {
              rawResponseParts.push(part);
              if (typeof part.text === "string" && part.text.length > 0) {
                incrementalTextChunks.push(part.text);
              }
            }
          }
          if (chunk.functionCalls) {
            stepFunctionCalls.push(...chunk.functionCalls);
          }

          // Extract usage metadata from chunk
          // promptTokenCount is typically in the final chunk, candidatesTokenCount accumulates
          const usageMetadata = chunkRecord.usageMetadata as
            | {
                promptTokenCount?: number;
                candidatesTokenCount?: number;
                totalTokenCount?: number;
              }
            | undefined;
          if (usageMetadata) {
            // Take the latest promptTokenCount (usually only in final chunk)
            if (
              usageMetadata.promptTokenCount !== undefined &&
              usageMetadata.promptTokenCount > 0
            ) {
              totalInputTokens = usageMetadata.promptTokenCount;
            }
            // Take the latest candidatesTokenCount (accumulates through chunks)
            if (
              usageMetadata.candidatesTokenCount !== undefined &&
              usageMetadata.candidatesTokenCount > 0
            ) {
              totalOutputTokens = usageMetadata.candidatesTokenCount;
            }
          }
        }

        // Extract text from raw parts after stream completes
        // This avoids SDK warning about non-text parts (thoughtSignature, functionCall)
        const stepText = rawResponseParts
          .filter(
            (part): part is { text: string } =>
              typeof (part as Record<string, unknown>).text === "string",
          )
          .map((part) => part.text)
          .join("");

        // If no function calls, we're done
        if (stepFunctionCalls.length === 0) {
          finalText = stepText;
          break;
        }

        // Check for final_result tool call - this is our structured output pattern
        if (useFinalResultTool) {
          const finalResultCall = stepFunctionCalls.find(
            (call) => call.name === "final_result",
          );
          if (finalResultCall) {
            // Extract the structured output from final_result arguments
            finalResultStructuredOutput = finalResultCall.args as Record<
              string,
              unknown
            >;
            logger.debug(
              "[GoogleVertex] Received final_result tool call with structured output (stream)",
              {
                outputKeys: Object.keys(finalResultStructuredOutput),
              },
            );
            // Return the structured output as JSON text
            finalText = JSON.stringify(finalResultStructuredOutput);
            break;
          }
        }

        // Track the last step text for maxSteps termination
        lastStepText = stepText;

        // Execute function calls
        logger.debug(
          `[GoogleVertex] Executing ${stepFunctionCalls.length} function calls`,
        );

        // Add model response with ALL parts (including thoughtSignature) to history
        // This preserves the thought_signature which is required for Gemini 3 multi-turn tool calling
        currentContents.push({
          role: "model",
          parts:
            rawResponseParts.length > 0
              ? (rawResponseParts as Array<{ text: string }>)
              : (stepFunctionCalls.map((fc) => ({
                  functionCall: fc,
                })) as unknown as Array<{ text: string }>),
        });

        // Execute each function and collect responses
        const functionResponses: Array<{
          functionResponse: { name: string; response: unknown };
        }> = [];
        // Per-step bookkeeping for conversation-memory storage.
        const stepStorageCalls: Array<{
          toolName: string;
          args: Record<string, unknown>;
        }> = [];
        const stepStorageResults: Array<{
          toolName: string;
          output: unknown;
        }> = [];

        // Note: tool:start / tool:end events are emitted by ToolsManager's
        // wrapped `execute` (see ToolsManager.ts:355) — no inline emit needed.
        for (const call of stepFunctionCalls) {
          allToolCalls.push({ toolName: call.name, args: call.args });
          stepStorageCalls.push({ toolName: call.name, args: call.args });

          // Check if this tool has already exceeded retry limit
          const failedInfo = failedTools.get(call.name);
          if (failedInfo && failedInfo.count >= DEFAULT_TOOL_MAX_RETRIES) {
            logger.warn(
              `[GoogleVertex] Tool "${call.name}" has exceeded retry limit (${DEFAULT_TOOL_MAX_RETRIES}), skipping execution`,
            );
            const errorPayload = {
              error: `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${failedInfo.count} times and will not be retried. Last error: ${failedInfo.lastError}. Please proceed without using this tool or inform the user that this functionality is unavailable.`,
              status: "permanently_failed",
              do_not_retry: true,
            };
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: errorPayload,
              },
            });
            toolExecutions.push({
              name: call.name,
              input: call.args,
              output: errorPayload,
            });
            stepStorageResults.push({
              toolName: call.name,
              output: errorPayload,
            });
            continue;
          }

          const execute = executeMap.get(call.name);
          if (execute) {
            try {
              // AI SDK Tool execute requires (args, options) - provide minimal options
              const toolOptions = {
                toolCallId: `${call.name}-${Date.now()}`,
                messages: [],
                abortSignal: undefined as AbortSignal | undefined,
              };
              const result = await execute(call.args, toolOptions);
              toolExecutions.push({
                name: call.name,
                input: call.args,
                output: result,
              });
              functionResponses.push({
                functionResponse: { name: call.name, response: { result } },
              });
              stepStorageResults.push({
                toolName: call.name,
                output: result,
              });
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              // Track this failure
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

              // Determine if this is a permanent failure
              const isPermanentFailure =
                currentFailInfo.count >= DEFAULT_TOOL_MAX_RETRIES;

              const errorPayload = {
                error: isPermanentFailure
                  ? `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${currentFailInfo.count} times with error: ${errorMessage}. This tool will not be retried. Please proceed without using this tool or inform the user that this functionality is unavailable.`
                  : `TOOL_EXECUTION_ERROR: ${errorMessage}. Retry attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}.`,
                status: isPermanentFailure ? "permanently_failed" : "failed",
                do_not_retry: isPermanentFailure,
                retry_count: currentFailInfo.count,
                max_retries: DEFAULT_TOOL_MAX_RETRIES,
              };
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: errorPayload,
                },
              });
              toolExecutions.push({
                name: call.name,
                input: call.args,
                output: errorPayload,
              });
              stepStorageResults.push({
                toolName: call.name,
                output: errorPayload,
              });
            }
          } else {
            // Tool not found is a permanent error
            const errorPayload = {
              error: `TOOL_NOT_FOUND: The tool "${call.name}" does not exist. Do not attempt to call this tool again.`,
              status: "permanently_failed",
              do_not_retry: true,
            };
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: errorPayload,
              },
            });
            toolExecutions.push({
              name: call.name,
              input: call.args,
              output: errorPayload,
            });
            stepStorageResults.push({
              toolName: call.name,
              output: errorPayload,
            });
          }
        }

        // Persist this step's tool calls/results into conversation memory.
        // Without this, tool_call / tool_result rows never reach Redis and
        // the chat-history UI loses every tool invocation.
        //
        // `thoughtSignature` rides as a sibling on the first call of the
        // step — Gemini 3 needs it to match thinking patterns when the
        // conversation is replayed on the next turn.
        if (stepStorageCalls.length > 0 || stepStorageResults.length > 0) {
          const stepThoughtSig = extractThoughtSignature(rawResponseParts);
          withTimeout(
            this.handleToolExecutionStorage(
              stepStorageCalls.map((c, i) => ({
                ...c,
                ...(i === 0 && stepThoughtSig
                  ? { thoughtSignature: stepThoughtSig }
                  : {}),
                stepIndex: step,
              })),
              stepStorageResults.map((r) => ({ ...r, stepIndex: step })),
              options,
              new Date(),
            ),
            TOOL_STORAGE_TIMEOUT_MS,
            "tool storage write timed out",
          ).catch((error: unknown) => {
            logger.warn(
              "[GoogleVertex] Failed to store native Gemini stream tool executions",
              {
                error: error instanceof Error ? error.message : String(error),
              },
            );
          });
        }

        // The @google/genai SDK only accepts "user" and "model" as valid
        // roles in contents — function/tool responses must use role: "user"
        // (matching the SDK's automaticFunctionCalling implementation and
        // the Google AI Studio path). Sending role: "function" was causing
        // native Vertex Gemini tool loops to be silently rejected by the
        // request validator.
        currentContents.push({
          role: "user",
          parts: functionResponses as unknown as Array<{ text: string }>,
        });
      } catch (error) {
        logger.error("[GoogleVertex] Native SDK error", error);
        throw this.handleProviderError(error);
      }
    }

    // Handle maxSteps termination - if we exited the loop due to maxSteps being reached
    if (step >= maxSteps && !finalText) {
      logger.warn(
        `[GoogleVertex] Tool call loop terminated after reaching maxSteps (${maxSteps}). ` +
          `Model was still calling tools. Using accumulated text from last step.`,
      );
      finalText =
        lastStepText ||
        `[Tool execution limit reached after ${maxSteps} steps. The model continued requesting tool calls beyond the limit.]`;
    }

    const responseTime = Date.now() - startTime;

    // Yield each text part separately so the CLI receives multiple stream
    // chunks instead of a single coalesced buffer. The SDK already gave us
    // the chunks during the for-await loop above; we just preserved them
    // in `incrementalTextChunks` instead of collapsing into `finalText`.
    // For final_result structured output, we yield the JSON-serialized
    // value as a single chunk because that's the contract callers expect.
    const textPartsToYield = finalResultStructuredOutput
      ? [finalText]
      : incrementalTextChunks.length > 0
        ? incrementalTextChunks
        : [finalText];

    async function* createTextStream(): AsyncIterable<{ content: string }> {
      for (const part of textPartsToYield) {
        if (part.length > 0) {
          yield { content: part };
        }
      }
    }

    // Filter out final_result from tool calls as it's an internal pattern
    const externalToolCalls = allToolCalls.filter(
      (tc) => tc.toolName !== "final_result",
    );
    const externalToolExecutions = toolExecutions.filter(
      (te) => te.name !== "final_result",
    );

    const result: StreamResult = {
      stream: createTextStream(),
      provider: this.providerName,
      model: modelName,
      usage: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      toolCalls: externalToolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.args,
      })),
      // Surface tools-used + execution summary so `hasToolActivity` in
      // conversationMemory.ts evaluates true for tool-only stream turns
      // (assistant text empty but tools ran) and downstream consumers see
      // the same shape AI-SDK-driven providers expose.
      toolsUsed: externalToolCalls.map((tc) => tc.toolName),
      toolExecutions: transformToolExecutions(
        externalToolExecutions,
      ) as unknown as StreamResult["toolExecutions"],
      metadata: {
        streamId: `native-vertex-${Date.now()}`,
        startTime,
        responseTime,
        totalToolExecutions: externalToolCalls.length,
      },
    };

    // Add structured output if final_result tool was used
    if (finalResultStructuredOutput) {
      (
        result as StreamResult & { structuredOutput?: unknown }
      ).structuredOutput = finalResultStructuredOutput;
    }

    return result;
  }

  /**
   * Execute generate using native @google/genai SDK for Gemini 3 models on Vertex AI
   * This bypasses @ai-sdk/google-vertex to properly handle thought_signature
   */
  private async executeNativeGemini3Generate(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const modelName =
      options.model || this.modelName || getDefaultVertexModel();
    const effectiveLocation = resolveVertexRegionForModel(
      modelName,
      options.region,
    );
    const client = await this.createVertexGenAIClient(effectiveLocation);

    logger.debug(
      "[GoogleVertex] Using native @google/genai for Gemini 3 generate",
      {
        model: modelName,
        project: this.projectId,
        location: effectiveLocation,
      },
    );

    // Build contents from input with multimodal support
    // Prioritize input.text over prompt since processCSVFilesForNativeSDK modifies input.text with CSV data
    const inputText =
      options.input?.text || options.prompt || "Please respond.";

    const contents: Array<{
      role: string;
      parts: VertexNativePart[];
    }> = [];

    // Build user message parts - start with text
    const userParts: VertexNativePart[] = [{ text: inputText }];

    // Add PDF files as inlineData parts if present
    // Cast input to access multimodal properties that may exist at runtime
    const multimodalInput = options.input as
      | {
          text?: string;
          pdfFiles?: Array<Buffer | string>;
          images?: Array<Buffer | string>;
        }
      | undefined;

    if (multimodalInput?.pdfFiles && multimodalInput.pdfFiles.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.pdfFiles.length} PDF file(s) for native generate`,
      );

      for (const pdfFile of multimodalInput.pdfFiles) {
        let pdfBuffer: Buffer;

        if (typeof pdfFile === "string") {
          // Check if it's a file path
          if (fs.existsSync(pdfFile)) {
            pdfBuffer = fs.readFileSync(pdfFile);
          } else {
            // Assume it's already base64 encoded
            pdfBuffer = Buffer.from(pdfFile, "base64");
          }
        } else {
          pdfBuffer = pdfFile;
        }

        // Convert to base64 for the native SDK
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
        `[GoogleVertex] Processing ${multimodalInput.images.length} image(s) for native generate`,
      );

      for (const image of multimodalInput.images) {
        let imageBuffer: Buffer;
        let mimeType = "image/jpeg"; // Default

        if (typeof image === "string") {
          if (fs.existsSync(image)) {
            imageBuffer = fs.readFileSync(image);
            // Detect mime type from extension
            const ext = path.extname(image).toLowerCase();
            if (ext === ".png") {
              mimeType = "image/png";
            } else if (ext === ".gif") {
              mimeType = "image/gif";
            } else if (ext === ".webp") {
              mimeType = "image/webp";
            }
          } else if (image.startsWith("data:")) {
            // Handle data URL
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              imageBuffer = Buffer.from(matches[2], "base64");
            } else {
              continue; // Skip invalid data URL
            }
          } else if (
            image.startsWith("http://") ||
            image.startsWith("https://")
          ) {
            // Image URL — fetch and base64-encode. Without this, the URL
            // string falls through to the "assume base64" branch below
            // and Vertex returns "Provided image is not valid".
            try {
              const response = await fetch(image);
              if (!response.ok) {
                logger.warn(
                  `[GoogleVertex] Image fetch failed: ${response.status} ${response.statusText}, skipping`,
                  { url: image },
                );
                continue;
              }
              const arrayBuffer = await response.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              const headerMime = response.headers.get("content-type");
              if (headerMime && headerMime.startsWith("image/")) {
                mimeType = headerMime.split(";")[0];
              }
            } catch (fetchError) {
              logger.warn(
                `[GoogleVertex] Image URL fetch threw, skipping: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                { url: image },
              );
              continue;
            }
          } else {
            // Assume base64 string
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

    // Prepend prior conversation turns before the current user message so
    // multi-turn callers (memory, loop REPL, agent flows) carry context
    // into native Vertex Gemini generate. Without this, every call started
    // fresh from the current input alone.
    prependConversationMessages(
      contents as Array<{ role: string; parts: unknown[] }>,
      options.conversationMessages,
    );

    contents.push({
      role: "user",
      parts: userParts,
    });

    // Tool filter (a0269210): trust options.tools — already merged + filtered
    // upstream. Defensive guard on disableTools matches the AI Studio path
    // and protects callers that bypass BaseProvider.generate() (which is
    // exactly what this method is doing).
    const combinedTools = !options.disableTools ? options.tools || {} : {};

    // Convert Vercel AI SDK tools to @google/genai FunctionDeclarations
    let tools:
      | Array<{ functionDeclarations: VertexGenaiFunctionDeclaration[] }>
      | undefined;
    const executeMap = new Map<string, Tool["execute"]>();

    if (Object.keys(combinedTools).length > 0) {
      const functionDeclarations: VertexGenaiFunctionDeclaration[] = [];

      for (const [name, tool] of Object.entries(combinedTools)) {
        const decl: VertexGenaiFunctionDeclaration = {
          name,
          description: tool.description || `Tool: ${name}`,
        };

        // Access legacy `parameters` (AI SDK v3/v4) or current `inputSchema` (v6)
        const legacyTool = tool as ToolWithLegacyParams;
        const toolParams = legacyTool.parameters || tool.inputSchema;
        if (toolParams) {
          // Convert and inline schema to resolve $ref/definitions
          const rawSchema = convertZodToJsonSchema(
            toolParams as ZodUnknownSchema,
            "openApi3",
          ) as Record<string, unknown>;
          const inlinedSchema = inlineJsonSchema(rawSchema);
          // Remove $schema if present - @google/genai doesn't need it
          if (inlinedSchema.$schema) {
            delete inlinedSchema.$schema;
          }
          // CRITICAL: Google Vertex AI requires ALL nested schemas to have a type field
          // ensureNestedSchemaTypes recursively adds missing type fields to tool schemas
          // Note: convertZodToJsonSchema now uses openApi3 target which produces nullable: true
          const typedSchema = ensureNestedSchemaTypes(inlinedSchema);
          // Strip `additionalProperties` recursively — Vertex Gemini's
          // function-call validator rejects it on object schemas (returns
          // 400 INVALID_ARGUMENT) even though it's valid OpenAPI 3. The
          // field has no semantic meaning to the model, so dropping it
          // before send is safe for every caller.
          stripAdditionalPropertiesDeep(typedSchema);
          decl.parametersJsonSchema = typedSchema;
        }

        functionDeclarations.push(decl);

        if (tool.execute) {
          executeMap.set(name, tool.execute);
        }
      }

      tools = [{ functionDeclarations }];

      logger.debug("[GoogleVertex] Converted tools for native SDK generate", {
        toolCount: functionDeclarations.length,
        toolNames: functionDeclarations.map((t) => t.name),
      });
    }

    // Check if we need to use the final_result tool pattern for structured output with tools
    // When both schema AND tools are present, we add final_result as a tool
    let useFinalResultTool = false;
    if (options.schema && tools) {
      useFinalResultTool = true;

      // Convert schema to JSON schema format
      const schemaAsJson = convertZodToJsonSchema(
        options.schema as ZodUnknownSchema,
        "openApi3",
      ) as Record<string, unknown>;
      const inlinedSchema = inlineJsonSchema(schemaAsJson);
      if (inlinedSchema.$schema) {
        delete inlinedSchema.$schema;
      }
      const typedSchema = ensureNestedSchemaTypes(inlinedSchema);

      // Add final_result tool to the existing function declarations
      const existingDeclarations = tools[0]?.functionDeclarations || [];
      existingDeclarations.push({
        name: "final_result",
        description:
          "Return the final structured result. You MUST call this tool when you have gathered all information and are ready to provide the final answer. The arguments should contain the structured data matching the expected schema.",
        parametersJsonSchema: typedSchema,
      });
      tools = [{ functionDeclarations: existingDeclarations }];

      logger.debug(
        "[GoogleVertex] Added final_result tool for structured output with tools (generate)",
        {
          schemaKeys: Object.keys(typedSchema),
          totalTools: existingDeclarations.length,
        },
      );
    }

    // Build config
    const config: Record<string, unknown> = {
      temperature: options.temperature ?? 1.0, // Gemini 3 requires 1.0 for tool calling
      maxOutputTokens: options.maxTokens,
    };

    // Cap maxOutputTokens for models with restricted output token limits (32768)
    // This applies to Gemini 3 models and image generation models (gemini-2.5-flash-image, gemini-3-pro-image-preview)
    if (hasRestrictedOutputLimit(modelName)) {
      if (
        config.maxOutputTokens &&
        (config.maxOutputTokens as number) > RESTRICTED_OUTPUT_TOKEN_LIMIT
      ) {
        logger.warn(
          `[GoogleVertex] Capping maxOutputTokens from ${config.maxOutputTokens} to ${RESTRICTED_OUTPUT_TOKEN_LIMIT} for ${modelName}`,
        );
        config.maxOutputTokens = RESTRICTED_OUTPUT_TOKEN_LIMIT;
      }
      // If maxOutputTokens is undefined, set a safe default
      if (!config.maxOutputTokens) {
        config.maxOutputTokens = RESTRICTED_OUTPUT_TOKEN_LIMIT;
      }
    }

    // Add topP, topK, stopSequences if provided
    if (options.topP !== undefined) {
      config.topP = options.topP;
    }
    if (options.topK !== undefined) {
      config.topK = options.topK;
    }
    if (options.stopSequences && options.stopSequences.length > 0) {
      config.stopSequences = options.stopSequences;
    }

    if (tools) {
      config.tools = tools;
    }

    // Build system prompt, adding final_result instruction if needed
    let effectiveSystemPrompt = options.systemPrompt || "";
    if (useFinalResultTool) {
      const finalResultInstruction =
        "\n\nIMPORTANT: When you have gathered all necessary information and are ready to provide your final answer, you MUST call the 'final_result' tool with the structured data. Do not return the final answer as plain text - always use the final_result tool.";
      effectiveSystemPrompt = effectiveSystemPrompt + finalResultInstruction;
    }

    if (effectiveSystemPrompt) {
      config.systemInstruction = effectiveSystemPrompt;
    }

    // Add thinking config for Gemini 3
    const nativeThinkingConfig2 = createNativeThinkingConfig(
      options.thinkingConfig,
    );
    if (nativeThinkingConfig2) {
      config.thinkingConfig = nativeThinkingConfig2;
    }

    // Add JSON output format support for native SDK generate (matching stream implementation)
    // CRITICAL: Google Gemini API does NOT allow combining responseMimeType with function calling.
    // Error: "Function calling with a response mime type: 'application/json' is unsupported"
    // Additionally, responseSchema REQUIRES responseMimeType: "application/json" - they cannot be used separately.
    // Error without it: "Response_schema with a response mime type 'text/plain' is unsupported"
    // Therefore: When tools are present, we cannot use EITHER responseMimeType OR responseSchema.
    // When using final_result tool pattern, we skip this entirely as schema is enforced via tool.
    if (
      (options.output?.format === "json" || options.schema) &&
      !useFinalResultTool
    ) {
      // Only set responseMimeType AND responseSchema when NOT using tools
      // Both must be set together, and neither can be used with function calling
      if (!tools) {
        config.responseMimeType = "application/json";

        // Convert schema to JSON schema format for the native SDK
        if (options.schema) {
          const rawSchema = convertZodToJsonSchema(
            options.schema as ZodUnknownSchema,
            "openApi3",
          ) as Record<string, unknown>;
          const inlinedSchema = inlineJsonSchema(rawSchema);
          // Remove $schema if present - @google/genai doesn't need it
          if (inlinedSchema.$schema) {
            delete inlinedSchema.$schema;
          }
          // CRITICAL: Google Vertex AI requires ALL nested schemas to have a type field
          // ensureNestedSchemaTypes recursively adds missing type fields
          // Note: convertZodToJsonSchema now uses openApi3 target which produces nullable: true
          const typedSchema = ensureNestedSchemaTypes(inlinedSchema);
          config.responseSchema = typedSchema;

          logger.debug(
            "[GoogleVertex] Added responseSchema for JSON output (generate)",
            {
              schemaKeys: Object.keys(typedSchema),
            },
          );
        }
      }
    }

    const startTime = Date.now();
    // Ensure maxSteps is a valid positive integer to prevent infinite loops
    const rawMaxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    const maxSteps =
      Number.isFinite(rawMaxSteps) && rawMaxSteps > 0
        ? Math.min(Math.floor(rawMaxSteps), 100) // Cap at 100 for safety
        : Math.min(DEFAULT_MAX_STEPS, 100);
    const currentContents = [...contents];
    let finalText = "";
    let lastStepText = ""; // Track text from last step for maxSteps termination
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

    // Track structured output from final_result tool (when using final_result pattern)
    let finalResultStructuredOutput: Record<string, unknown> | undefined;

    // Track failed tools to prevent infinite retry loops
    // Key: tool name, Value: { count: retry attempts, lastError: error message }
    const failedTools = new Map<string, { count: number; lastError: string }>();

    // Track token usage across all steps
    // promptTokenCount is typically in the final chunk, candidatesTokenCount accumulates
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

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

        // Capture raw response parts including thoughtSignature
        const rawResponseParts: unknown[] = [];

        // Collect all chunks from stream
        for await (const chunk of stream) {
          // Extract raw parts from candidates FIRST
          // This avoids using chunk.text which triggers SDK warning when
          // non-text parts (thoughtSignature, functionCall) are present
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

          // Extract usage metadata from chunk
          // promptTokenCount is typically in the final chunk, candidatesTokenCount accumulates
          const usageMetadata = chunkRecord.usageMetadata as
            | {
                promptTokenCount?: number;
                candidatesTokenCount?: number;
                totalTokenCount?: number;
              }
            | undefined;
          if (usageMetadata) {
            // Take the latest promptTokenCount (usually only in final chunk)
            if (
              usageMetadata.promptTokenCount !== undefined &&
              usageMetadata.promptTokenCount > 0
            ) {
              totalInputTokens = usageMetadata.promptTokenCount;
            }
            // Take the latest candidatesTokenCount (accumulates through chunks)
            if (
              usageMetadata.candidatesTokenCount !== undefined &&
              usageMetadata.candidatesTokenCount > 0
            ) {
              totalOutputTokens = usageMetadata.candidatesTokenCount;
            }
          }
        }

        // Extract text from raw parts after stream completes
        // This avoids SDK warning about non-text parts (thoughtSignature, functionCall)
        const stepText = rawResponseParts
          .filter(
            (part): part is { text: string } =>
              typeof (part as Record<string, unknown>).text === "string",
          )
          .map((part) => part.text)
          .join("");

        // If no function calls, we're done
        if (stepFunctionCalls.length === 0) {
          finalText = stepText;
          break;
        }

        // Check for final_result tool call - this is our structured output pattern
        if (useFinalResultTool) {
          const finalResultCall = stepFunctionCalls.find(
            (call) => call.name === "final_result",
          );
          if (finalResultCall) {
            // Extract the structured output from final_result arguments
            finalResultStructuredOutput = finalResultCall.args as Record<
              string,
              unknown
            >;
            logger.debug(
              "[GoogleVertex] Received final_result tool call with structured output (generate)",
              {
                outputKeys: Object.keys(finalResultStructuredOutput),
              },
            );
            // Return the structured output as JSON text
            finalText = JSON.stringify(finalResultStructuredOutput);
            break;
          }
        }

        // Track the last step text for maxSteps termination
        lastStepText = stepText;

        // Execute function calls
        logger.debug(
          `[GoogleVertex] Generate executing ${stepFunctionCalls.length} function calls`,
        );

        // Add model response with ALL parts (including thoughtSignature) to history
        // This preserves the thought_signature which is required for Gemini 3 multi-turn tool calling
        currentContents.push({
          role: "model",
          parts:
            rawResponseParts.length > 0
              ? (rawResponseParts as Array<{ text: string }>)
              : (stepFunctionCalls.map((fc) => ({
                  functionCall: fc,
                })) as unknown as Array<{ text: string }>),
        });

        // Execute each function and collect responses
        const functionResponses: Array<{
          functionResponse: { name: string; response: unknown };
        }> = [];
        const toolCallsBefore = allToolCalls.length;
        const toolExecsBefore = toolExecutions.length;
        // Note: tool:start / tool:end events are emitted by ToolsManager's
        // wrapped `execute` (see ToolsManager.ts:355) — no inline emit needed.

        for (const call of stepFunctionCalls) {
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

            toolExecutions.push({
              name: call.name,
              input: call.args,
              output: errorOutput,
            });

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: errorOutput,
              },
            });
            continue;
          }

          const execute = executeMap.get(call.name);
          if (execute) {
            try {
              // AI SDK Tool execute requires (args, options) - provide minimal options
              const toolOptions = {
                toolCallId: `${call.name}-${Date.now()}`,
                messages: [],
                abortSignal: undefined as AbortSignal | undefined,
              };
              const execResult = await execute(call.args, toolOptions);

              // Track execution
              toolExecutions.push({
                name: call.name,
                input: call.args,
                output: execResult,
              });

              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: { result: execResult },
                },
              });
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              // Track this failure
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

              // Determine if this is a permanent failure
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

              toolExecutions.push({
                name: call.name,
                input: call.args,
                output: errorOutput,
              });

              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: errorOutput,
                },
              });
            }
          } else {
            // Tool not found is a permanent error
            const errorOutput = {
              error: `TOOL_NOT_FOUND: The tool "${call.name}" does not exist. Do not attempt to call this tool again.`,
              status: "permanently_failed",
              do_not_retry: true,
            };

            toolExecutions.push({
              name: call.name,
              input: call.args,
              output: errorOutput,
            });

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: errorOutput,
              },
            });
          }
        }

        // Persist this step's tool calls/results into conversation memory.
        // Without this, tool_call / tool_result rows never reach Redis and
        // the chat-history UI loses every tool invocation. The first call
        // of the step carries the step's `thoughtSignature` so Gemini 3 can
        // match thinking patterns on replay.
        const stepToolCalls = allToolCalls.slice(toolCallsBefore);
        const stepToolExecs = toolExecutions.slice(toolExecsBefore);
        if (stepToolCalls.length > 0 || stepToolExecs.length > 0) {
          const stepThoughtSig = extractThoughtSignature(rawResponseParts);
          withTimeout(
            this.handleToolExecutionStorage(
              stepToolCalls.map((tc, i) => ({
                toolName: tc.toolName,
                args: tc.args,
                ...(i === 0 && stepThoughtSig
                  ? { thoughtSignature: stepThoughtSig }
                  : {}),
                stepIndex: step,
              })),
              stepToolExecs.map((te) => ({
                toolName: te.name,
                output: te.output,
                stepIndex: step,
              })),
              options,
              new Date(),
            ),
            TOOL_STORAGE_TIMEOUT_MS,
            "tool storage write timed out",
          ).catch((error: unknown) => {
            logger.warn(
              "[GoogleVertex] Failed to store native Gemini generate tool executions",
              {
                error: error instanceof Error ? error.message : String(error),
              },
            );
          });
        }

        // The @google/genai SDK only accepts "user" and "model" as valid
        // roles in contents — function/tool responses must use role: "user"
        // (matching the SDK's automaticFunctionCalling implementation and
        // the Google AI Studio path). See note in executeNativeGemini3Stream.
        currentContents.push({
          role: "user",
          parts: functionResponses as unknown as VertexNativePart[],
        });
      } catch (error) {
        logger.error("[GoogleVertex] Native SDK generate error", error);
        throw this.handleProviderError(error);
      }
    }

    // Handle maxSteps termination - if we exited the loop due to maxSteps being reached
    if (step >= maxSteps && !finalText) {
      logger.warn(
        `[GoogleVertex] Generate tool call loop terminated after reaching maxSteps (${maxSteps}). ` +
          `Model was still calling tools. Using accumulated text from last step.`,
      );
      finalText =
        lastStepText ||
        `[Tool execution limit reached after ${maxSteps} steps. The model continued requesting tool calls beyond the limit.]`;
    }

    const responseTime = Date.now() - startTime;

    // Filter out final_result from tool calls and executions as it's an internal pattern
    const externalToolCalls = allToolCalls.filter(
      (tc) => tc.toolName !== "final_result",
    );
    const externalToolExecutions = toolExecutions.filter(
      (te) => te.name !== "final_result",
    );

    // Build EnhancedGenerateResult
    const result: EnhancedGenerateResult = {
      content: finalText,
      provider: this.providerName,
      model: modelName,
      usage: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      responseTime,
      toolsUsed: externalToolCalls.map((tc) => tc.toolName),
      toolExecutions: transformToolExecutions(externalToolExecutions),
      enhancedWithTools: externalToolCalls.length > 0,
    };

    // Add structured output if final_result tool was used
    if (finalResultStructuredOutput) {
      (
        result as EnhancedGenerateResult & { structuredOutput?: unknown }
      ).structuredOutput = finalResultStructuredOutput;
    }

    // Route through enhanceResult so analytics/evaluation/tracing get the
    // same treatment as the BaseProvider.generate() path. Without this,
    // enableAnalytics / enableEvaluation are silently ignored on the native
    // Vertex Gemini generate path.
    return this.enhanceResult(result, options, startTime);
  }

  /**
   * Create native AnthropicVertex client for Claude models
   */
  private async createAnthropicVertexClient(
    timeoutMs?: number,
  ): Promise<AnthropicVertexType> {
    const mod = await getAnthropicVertexModule();
    const settings = await createVertexAnthropicSettings(
      this.location,
      timeoutMs,
    );
    const client = new mod.AnthropicVertex(settings);
    // The vertex SDK eagerly starts Google ADC resolution in its constructor
    // (`this._authClientPromise = this._auth.getClient()`) and only awaits it
    // per-request in `prepareOptions()`. A client that is constructed but never
    // used — or built with misconfigured credentials — would otherwise leak
    // that rejection as a process-level `unhandledRejection`. Attaching a
    // handler here marks the promise as handled (so Node no longer reports it);
    // it does not consume the rejection — the per-request `await` in
    // `prepareOptions()` is a separate continuation and still surfaces auth
    // errors to callers. `void` flags the returned promise as deliberately
    // ignored (codebase convention for fire-and-forget).
    void (
      client as unknown as { _authClientPromise?: Promise<unknown> }
    )._authClientPromise?.catch(() => {
      // Intentionally ignored — see above.
    });
    return client;
  }

  /**
   * Execute stream using native @anthropic-ai/vertex-sdk for Claude models on Vertex AI
   * This bypasses @ai-sdk/google-vertex completely and uses Anthropic's native SDK
   */
  private async executeNativeAnthropicStream(
    options: StreamOptions,
  ): Promise<StreamResult> {
    const modelName = toVertexAnthropicModelId(
      options.model || this.modelName || "claude-sonnet-4-5@20250929",
    );
    const startTime = Date.now();
    const streamTimeoutMs = parseTimeout(options.timeout) ?? 300_000;
    const client = await this.createAnthropicVertexClient(streamTimeoutMs);

    logger.debug(
      "[GoogleVertex] Using native @anthropic-ai/vertex-sdk for Claude stream",
      {
        model: modelName,
        project: this.projectId,
        location: this.location,
      },
    );

    // Build messages from input
    const messages: VertexAnthropicMessage[] = [];

    // Add conversation history if present.
    //
    // Intentionally text-only. Anthropic's API rejects messages where a
    // tool_use_id reference appears without its matching tool_use in the
    // same turn — so synthesising tool_use / tool_result blocks from
    // stored ChatMessages risks emitting orphaned references that fail
    // validation. Tool rows are still persisted to Redis (chat-history
    // UI renders them) but they don't re-enter the model's context on
    // subsequent turns.
    if (
      options.conversationMessages &&
      options.conversationMessages.length > 0
    ) {
      for (const msg of options.conversationMessages) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content:
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content),
          });
        }
      }
    }

    // Add current user input with multimodal support
    // Cast input to access multimodal properties that may exist at runtime
    const multimodalInput = options.input as {
      text: string;
      pdfFiles?: Array<Buffer | string>;
      images?: Array<Buffer | string>;
    };

    // Build content parts for the user message
    const userContentParts: Array<
      | { type: "text"; text: string }
      | {
          type: "image";
          source: { type: "base64"; media_type: string; data: string };
        }
      | {
          type: "document";
          source: { type: "base64"; media_type: string; data: string };
        }
    > = [];

    // Add PDF files as document parts if present
    if (multimodalInput?.pdfFiles && multimodalInput.pdfFiles.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.pdfFiles.length} PDF file(s) for native Anthropic stream`,
      );

      for (const pdfFile of multimodalInput.pdfFiles) {
        let pdfBuffer: Buffer;

        if (typeof pdfFile === "string") {
          // Check if it's a file path
          if (fs.existsSync(pdfFile)) {
            pdfBuffer = fs.readFileSync(pdfFile);
          } else {
            // Assume it's already base64 encoded
            pdfBuffer = Buffer.from(pdfFile, "base64");
          }
        } else {
          pdfBuffer = pdfFile;
        }

        // Convert to base64 for Anthropic's document format
        const base64Data = pdfBuffer.toString("base64");
        userContentParts.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          },
        });
      }
    }

    // Add images as image parts if present
    if (multimodalInput?.images && multimodalInput.images.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.images.length} image(s) for native Anthropic stream`,
      );

      for (const image of multimodalInput.images) {
        let imageBuffer: Buffer;
        let mimeType = "image/jpeg"; // Default

        if (typeof image === "string") {
          if (fs.existsSync(image)) {
            imageBuffer = fs.readFileSync(image);
            // Detect mime type from extension
            const ext = path.extname(image).toLowerCase();
            if (ext === ".png") {
              mimeType = "image/png";
            } else if (ext === ".gif") {
              mimeType = "image/gif";
            } else if (ext === ".webp") {
              mimeType = "image/webp";
            }
          } else if (image.startsWith("data:")) {
            // Handle data URL
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              imageBuffer = Buffer.from(matches[2], "base64");
            } else {
              continue; // Skip invalid data URL
            }
          } else if (
            image.startsWith("http://") ||
            image.startsWith("https://")
          ) {
            // Image URL — fetch and base64-encode. Without this, the URL
            // string falls through to the "assume base64" branch below
            // and Vertex returns "Provided image is not valid".
            try {
              const response = await fetch(image);
              if (!response.ok) {
                logger.warn(
                  `[GoogleVertex] Image fetch failed: ${response.status} ${response.statusText}, skipping`,
                  { url: image },
                );
                continue;
              }
              const arrayBuffer = await response.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              const headerMime = response.headers.get("content-type");
              if (headerMime && headerMime.startsWith("image/")) {
                mimeType = headerMime.split(";")[0];
              }
            } catch (fetchError) {
              logger.warn(
                `[GoogleVertex] Image URL fetch threw, skipping: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                { url: image },
              );
              continue;
            }
          } else {
            // Assume base64 string
            imageBuffer = Buffer.from(image, "base64");
          }
        } else {
          imageBuffer = image;
        }

        const base64Data = imageBuffer.toString("base64");
        userContentParts.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Data,
          },
        });
      }
    }

    // Always add the text content
    userContentParts.push({
      type: "text",
      text: multimodalInput.text,
    });

    // Add the user message with appropriate content format
    messages.push({
      role: "user",
      content:
        userContentParts.length === 1 && userContentParts[0].type === "text"
          ? multimodalInput.text
          : userContentParts,
    });

    // Convert tools to Anthropic format if present
    let tools: VertexAnthropicTool[] | undefined;
    const executeMap = new Map<string, Tool["execute"]>();

    if (
      options.tools &&
      Object.keys(options.tools).length > 0 &&
      !options.disableTools
    ) {
      tools = [];

      for (const [name, tool] of Object.entries(options.tools)) {
        const anthropicTool: VertexAnthropicTool = {
          name,
          description: tool.description || `Tool: ${name}`,
          input_schema: {
            type: "object",
          },
        };

        // Access legacy `parameters` (AI SDK v3/v4) or current `inputSchema` (v6)
        const legacyTool = tool as ToolWithLegacyParams;
        const toolParams = legacyTool.parameters || tool.inputSchema;
        if (toolParams) {
          // Anthropic validates input_schema as JSON Schema draft 2020-12 and
          // rejects OpenAPI-3 dialect output (e.g. `nullable: true`) with a
          // 400 — use the default JSON Schema target, matching the direct
          // anthropic provider. The Gemini paths keep "openApi3".
          const jsonSchema = convertZodToJsonSchema(
            toolParams as ZodUnknownSchema,
          ) as Record<string, unknown>;
          const inlined = inlineJsonSchema(jsonSchema);
          anthropicTool.input_schema = {
            type: "object",
            properties: (inlined.properties as Record<string, unknown>) || {},
            required: (inlined.required as string[]) || [],
          };
        }

        tools.push(anthropicTool);

        if (tool.execute) {
          executeMap.set(name, tool.execute);
        }
      }

      logger.debug("[GoogleVertex] Converted tools for native Anthropic SDK", {
        toolCount: tools.length,
        toolNames: tools.map((t) => t.name),
      });
    }

    // Handle JSON schema support via final_result tool pattern
    // Anthropic doesn't have native responseSchema, so we add a final_result tool
    const streamOptions = options as StreamOptions & {
      schema?: ZodUnknownSchema;
    };
    let useFinalResultTool = false;
    let schemaSystemPromptSuffix = "";

    if (streamOptions.schema) {
      useFinalResultTool = true;

      // Convert schema to JSON schema format
      const schemaAsJson = convertZodToJsonSchema(
        streamOptions.schema as ZodUnknownSchema,
      ) as Record<string, unknown>;
      const inlinedSchema = inlineJsonSchema(schemaAsJson);
      if (inlinedSchema.$schema) {
        delete inlinedSchema.$schema;
      }
      const typedSchema = ensureNestedSchemaTypes(inlinedSchema);

      // Create final_result tool
      const finalResultTool: VertexAnthropicTool = {
        name: "final_result",
        description:
          "Return the final structured result. You MUST call this tool when you have gathered all information and are ready to provide the final answer. The arguments should contain the structured data matching the expected schema.",
        input_schema: {
          type: "object",
          properties:
            (typedSchema.properties as Record<string, unknown>) || typedSchema,
          required: (typedSchema.required as string[]) || [],
        },
      };

      // Add to tools array or create new array
      if (!tools) {
        tools = [];
      }
      tools.push(finalResultTool);

      // Add instruction to system prompt
      schemaSystemPromptSuffix =
        "\n\nIMPORTANT: You MUST call the 'final_result' tool to return your response in the required structured format. Do not respond with plain text - always use the final_result tool.";

      logger.debug(
        "[GoogleVertex] Added final_result tool for Anthropic structured output (stream)",
        {
          schemaKeys: Object.keys(typedSchema),
          totalTools: tools.length,
        },
      );
    }

    // Build request options
    const systemPromptWithSchema = options.systemPrompt
      ? options.systemPrompt + schemaSystemPromptSuffix
      : schemaSystemPromptSuffix
        ? schemaSystemPromptSuffix.trim()
        : undefined;

    const requestParams: Parameters<typeof client.messages.stream>[0] = {
      model: modelName,
      // Default to the model's real output ceiling (e.g. 64K for Sonnet 4.x)
      // instead of the legacy 4096, which silently truncated large structured
      // responses mid-JSON. resolveClaudeMaxTokens also clamps over-large
      // caller values so the native Vertex path never 400s.
      max_tokens: resolveClaudeMaxTokens(modelName, options.maxTokens),
      messages: messages as Parameters<
        typeof client.messages.stream
      >[0]["messages"],
      ...(tools && tools.length > 0 && { tools }),
      ...(useFinalResultTool && { tool_choice: { type: "any" as const } }),
      ...(systemPromptWithSchema && { system: systemPromptWithSchema }),
      ...(options.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(options.topP !== undefined && { top_p: options.topP }),
      ...(options.stopSequences &&
        options.stopSequences.length > 0 && {
          stop_sequences: options.stopSequences,
        }),
    };

    // ── Real-time streaming via stream.on('text', ...) ────────────────────
    //
    // The Anthropic SDK exposes per-delta streaming through `stream.on('text', listener)`:
    // each content_block_delta SSE event fires the listener synchronously
    // with that token's text — typically ~10 chars per delta, ~26ms apart
    // on Claude Haiku. Awaiting `stream.finalMessage()` here would buffer
    // the entire response before yielding anything; the listener pattern
    // keeps the wire and the consumer in lockstep instead.
    //
    // Structure: push-channel + background agentic loop, returning the
    // StreamResult immediately so callers can iterate `channel.iterable`
    // while generation is still in progress. Mirrors the executeStream
    // pattern in googleAiStudio.ts.

    const maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    const toolExecutions: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }> = [];

    const channel = createTextChannel();

    // Mutable holders the StreamResult references. Background loop updates
    // these as state progresses; consumer reads them after iterating the
    // stream to completion (channel.close() is called AFTER mutations).
    const usage = { input: 0, output: 0, total: 0 };
    const metadata = {
      streamId: `native-anthropic-vertex-${Date.now()}`,
      startTime,
      responseTime: 0,
      totalToolExecutions: 0,
    };
    const toolsUsedRef: string[] = [];
    const structuredOutputRef: { value?: Record<string, unknown> } = {};

    // Track the active Anthropic stream so options.abortSignal can cancel it
    // mid-flight (pre-rewrite code had no abort handling — fixed for free).
    let activeStream:
      | Awaited<ReturnType<typeof client.messages.stream>>
      | undefined;
    const abortHandler = () => {
      try {
        activeStream?.controller.abort();
      } catch {
        /* ignore — stream may already be finalized */
      }
    };
    options.abortSignal?.addEventListener("abort", abortHandler);

    // Defensive upper bound: if neither the caller nor the SDK ever fires,
    // abort the stream after the configured timeout so a stalled
    // Vertex/Anthropic endpoint can't hang forever. options.timeout wins
    // if set; otherwise 5 min — generous for tool-heavy turns.
    const streamTimeoutHandle = setTimeout(() => {
      logger.warn(
        `[GoogleVertex] Anthropic stream exceeded ${streamTimeoutMs}ms — aborting`,
      );
      abortHandler();
    }, streamTimeoutMs);

    const loopPromise = (async () => {
      let step = 0;
      const currentMessages = [...messages];

      try {
        while (step < maxSteps) {
          if (options.abortSignal?.aborted) {
            throw new Error("Stream aborted by caller");
          }
          step++;

          const stream = await client.messages.stream({
            ...requestParams,
            messages: currentMessages as Parameters<
              typeof client.messages.stream
            >[0]["messages"],
          });
          activeStream = stream;

          // Forward each text delta to the consumer as it arrives. The
          // Anthropic SDK fires this listener synchronously for every
          // content_block_delta SSE event, so the channel sees bytes at
          // the same cadence the wire delivers them.
          stream.on("text", (delta: string) => {
            if (delta.length > 0) {
              channel.push(delta);
            }
          });

          // finalMessage() resolves AFTER message_stop. By then the listener
          // has already fired for every delta — awaiting here doesn't block
          // visible streaming, it just gives us the structured response
          // shape needed for tool_use block extraction.
          const response = await stream.finalMessage();
          activeStream = undefined;

          usage.input += response.usage?.input_tokens || 0;
          usage.output += response.usage?.output_tokens || 0;
          usage.total = usage.input + usage.output;

          const toolUseBlocks = (
            response.content as VertexAnthropicContentBlock[]
          ).filter(
            (
              block,
            ): block is {
              type: "tool_use";
              id: string;
              name: string;
              input: Record<string, unknown>;
            } => block.type === "tool_use",
          );

          // Structured-output pattern: when the model returns the
          // final_result tool call, push its arguments as JSON and stop.
          // Single-shot yield so callers consuming the stream still see
          // the structured value.
          if (useFinalResultTool) {
            const finalResultCall = toolUseBlocks.find(
              (block) => block.name === "final_result",
            );
            if (finalResultCall) {
              structuredOutputRef.value = finalResultCall.input;
              channel.push(JSON.stringify(finalResultCall.input));
              logger.debug(
                "[GoogleVertex] Extracted structured output from final_result tool (stream)",
                { keys: Object.keys(finalResultCall.input) },
              );
              break;
            }
          }

          // No tools — pure text turn. Listener already pushed all deltas;
          // loop terminates and channel.close() flushes the consumer.
          if (toolUseBlocks.length === 0) {
            break;
          }

          // Tool execution loop. tool:start / tool:end events fire from
          // ToolsManager's wrapped execute (ToolsManager.ts:355) — no inline
          // emit needed.
          const toolResults: Array<{
            type: "tool_result";
            tool_use_id: string;
            content: string;
          }> = [];
          // Per-step bookkeeping for conversation-memory storage.
          const stepStorageCalls: Array<{
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
          }> = [];
          const stepStorageResults: Array<{
            toolCallId: string;
            toolName: string;
            output: unknown;
          }> = [];
          // Note: tool:start / tool:end events are emitted by ToolsManager's
          // wrapped `execute` (see ToolsManager.ts:355) — no inline emit needed.
          for (const toolUse of toolUseBlocks) {
            allToolCalls.push({
              toolName: toolUse.name,
              args: toolUse.input,
            });
            toolsUsedRef.push(toolUse.name);
            stepStorageCalls.push({
              toolCallId: toolUse.id,
              toolName: toolUse.name,
              args: toolUse.input,
            });

            const execute = executeMap.get(toolUse.name);
            if (execute) {
              try {
                const toolOptions = {
                  toolCallId: toolUse.id,
                  messages: [],
                  abortSignal: options.abortSignal,
                };
                const result = await execute(toolUse.input, toolOptions);
                toolExecutions.push({
                  name: toolUse.name,
                  input: toolUse.input,
                  output: result,
                });
                // Anthropic requires tool_result.content to be a string.
                // JSON.stringify returns undefined for undefined/function/symbol,
                // so coerce defensively to keep the follow-up turn valid.
                const resultContent =
                  typeof result === "string"
                    ? result
                    : (JSON.stringify(result ?? null) ?? String(result));
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: resultContent,
                });
                stepStorageResults.push({
                  toolCallId: toolUse.id,
                  toolName: toolUse.name,
                  output: result,
                });
              } catch (err) {
                const errMsg = `Error executing tool "${toolUse.name}": ${err instanceof Error ? err.message : String(err)}`;
                const errorPayload = { error: errMsg };
                toolExecutions.push({
                  name: toolUse.name,
                  input: toolUse.input,
                  output: errorPayload,
                });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: errMsg,
                });
                stepStorageResults.push({
                  toolCallId: toolUse.id,
                  toolName: toolUse.name,
                  output: errorPayload,
                });
              }
            } else {
              const errMsg = `TOOL_NOT_FOUND: The tool "${toolUse.name}" does not exist.`;
              const errorPayload = { error: errMsg };
              toolExecutions.push({
                name: toolUse.name,
                input: toolUse.input,
                output: errorPayload,
              });
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: errMsg,
              });
              stepStorageResults.push({
                toolCallId: toolUse.id,
                toolName: toolUse.name,
                output: errorPayload,
              });
            }
          }

          // Persist this step's tool calls/results into conversation memory.
          // Without this hook, tool rows never land in Redis and the
          // chat-history UI loses every tool invocation.
          if (stepStorageCalls.length > 0 || stepStorageResults.length > 0) {
            withTimeout(
              this.handleToolExecutionStorage(
                stepStorageCalls.map((c) => ({ ...c, stepIndex: step })),
                stepStorageResults.map((r) => ({ ...r, stepIndex: step })),
                options,
                new Date(),
              ),
              TOOL_STORAGE_TIMEOUT_MS,
              "tool storage write timed out",
            ).catch((error: unknown) => {
              logger.warn(
                "[GoogleVertex] Failed to store native Anthropic stream tool executions",
                {
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            });
          }

          // Continue the loop: assistant turn + tool_result user turn.
          // Filter server_tool_use blocks (Anthropic API rejects them in
          // subsequent message turns).
          const assistantContent = response.content.filter(
            (block: { type: string }) => block.type !== "server_tool_use",
          ) as (typeof currentMessages)[number]["content"];
          currentMessages.push({
            role: "assistant",
            content: assistantContent,
          });
          currentMessages.push({
            role: "user",
            content: toolResults,
          });
        }

        metadata.responseTime = Date.now() - startTime;
        metadata.totalToolExecutions = allToolCalls.filter(
          (tc) => tc.toolName !== "final_result",
        ).length;
        channel.close();
      } catch (err) {
        logger.error("[GoogleVertex] Native Anthropic SDK stream error", err);
        channel.error(this.handleProviderError(err));
      } finally {
        options.abortSignal?.removeEventListener("abort", abortHandler);
        clearTimeout(streamTimeoutHandle);
      }
    })();
    // Suppress unhandled-rejection: errors funnel through channel.error()
    // and surface when the consumer iterates the stream.
    loopPromise.catch(() => undefined);

    // Return StreamResult IMMEDIATELY — caller's for-await can begin
    // iterating channel.iterable while the background loop is still
    // generating. usage / metadata / toolCalls / toolExecutions are mutable
    // references that the loop fills in over time; the consumer reads them
    // after iteration completes (after channel.close() has fired).
    const result: StreamResult = {
      stream: channel.iterable,
      provider: this.providerName,
      model: modelName,
      usage,
      metadata,
    };

    Object.defineProperty(result, "toolCalls", {
      enumerable: true,
      configurable: true,
      get: () => allToolCalls.filter((tc) => tc.toolName !== "final_result"),
    });
    Object.defineProperty(result, "toolsUsed", {
      enumerable: true,
      configurable: true,
      get: () => toolsUsedRef.filter((name) => name !== "final_result"),
    });
    Object.defineProperty(result, "toolExecutions", {
      enumerable: true,
      configurable: true,
      get: () =>
        transformToolExecutions(
          toolExecutions.filter((te) => te.name !== "final_result"),
        ) as unknown as StreamResult["toolExecutions"],
    });

    Object.defineProperty(result, "structuredOutput", {
      enumerable: true,
      configurable: true,
      get: () => structuredOutputRef.value,
    });

    return result;
  }

  /**
   * Execute generate using native @anthropic-ai/vertex-sdk for Claude models on Vertex AI
   */
  private async executeNativeAnthropicGenerate(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const modelName = toVertexAnthropicModelId(
      options.model || this.modelName || "claude-sonnet-4-5@20250929",
    );
    const startTime = Date.now();
    const generateTimeoutMs = parseTimeout(options.timeout) ?? 300_000;
    const client = await this.createAnthropicVertexClient(generateTimeoutMs);

    logger.debug(
      "[GoogleVertex] Using native @anthropic-ai/vertex-sdk for Claude generate",
      {
        model: modelName,
        project: this.projectId,
        location: this.location,
      },
    );

    // Build messages from input
    const messages: VertexAnthropicMessage[] = [];
    const inputText =
      options.prompt || options.input?.text || "Please respond.";

    // Add conversation history if present. Prefer `conversationMessages`
    // (what NeuroLink core injects today via MessageBuilder) and fall back
    // to the legacy `conversationHistory` field for callers that still use
    // the older surface. The Vertex Claude STREAM path already follows this
    // priority — keeping the GENERATE path on `conversationHistory` only
    // would silently drop multi-turn context for memory/loop sessions.
    // Intentionally text-only: see the stream sibling for the rationale —
    // synthesising tool_use / tool_result blocks from stored ChatMessages
    // risks emitting orphaned references that Anthropic's API rejects.
    const historyMessages =
      options.conversationMessages && options.conversationMessages.length > 0
        ? options.conversationMessages
        : options.conversationHistory;
    if (historyMessages && historyMessages.length > 0) {
      for (const msg of historyMessages) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content:
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content),
          });
        }
      }
    }

    // Add current user input with multimodal support
    // Cast input to access multimodal properties that may exist at runtime
    const multimodalInput = options.input as
      | {
          text: string;
          pdfFiles?: Array<Buffer | string>;
          images?: Array<Buffer | string>;
        }
      | undefined;

    // Build content parts for the user message
    const userContentParts: Array<
      | { type: "text"; text: string }
      | {
          type: "image";
          source: { type: "base64"; media_type: string; data: string };
        }
      | {
          type: "document";
          source: { type: "base64"; media_type: string; data: string };
        }
    > = [];

    // Add PDF files as document parts if present
    if (multimodalInput?.pdfFiles && multimodalInput.pdfFiles.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.pdfFiles.length} PDF file(s) for native Anthropic generate`,
      );

      for (const pdfFile of multimodalInput.pdfFiles) {
        let pdfBuffer: Buffer;

        if (typeof pdfFile === "string") {
          // Check if it's a file path
          if (fs.existsSync(pdfFile)) {
            pdfBuffer = fs.readFileSync(pdfFile);
          } else {
            // Assume it's already base64 encoded
            pdfBuffer = Buffer.from(pdfFile, "base64");
          }
        } else {
          pdfBuffer = pdfFile;
        }

        // Convert to base64 for Anthropic's document format
        const base64Data = pdfBuffer.toString("base64");
        userContentParts.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          },
        });
      }
    }

    // Add images as image parts if present
    if (multimodalInput?.images && multimodalInput.images.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.images.length} image(s) for native Anthropic generate`,
      );

      for (const image of multimodalInput.images) {
        let imageBuffer: Buffer;
        let mimeType = "image/jpeg"; // Default

        if (typeof image === "string") {
          if (fs.existsSync(image)) {
            imageBuffer = fs.readFileSync(image);
            // Detect mime type from extension
            const ext = path.extname(image).toLowerCase();
            if (ext === ".png") {
              mimeType = "image/png";
            } else if (ext === ".gif") {
              mimeType = "image/gif";
            } else if (ext === ".webp") {
              mimeType = "image/webp";
            }
          } else if (image.startsWith("data:")) {
            // Handle data URL
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              imageBuffer = Buffer.from(matches[2], "base64");
            } else {
              continue; // Skip invalid data URL
            }
          } else if (
            image.startsWith("http://") ||
            image.startsWith("https://")
          ) {
            // Image URL — fetch and base64-encode. Without this, the URL
            // string falls through to the "assume base64" branch below
            // and Vertex returns "Provided image is not valid".
            try {
              const response = await fetch(image);
              if (!response.ok) {
                logger.warn(
                  `[GoogleVertex] Image fetch failed: ${response.status} ${response.statusText}, skipping`,
                  { url: image },
                );
                continue;
              }
              const arrayBuffer = await response.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              const headerMime = response.headers.get("content-type");
              if (headerMime && headerMime.startsWith("image/")) {
                mimeType = headerMime.split(";")[0];
              }
            } catch (fetchError) {
              logger.warn(
                `[GoogleVertex] Image URL fetch threw, skipping: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                { url: image },
              );
              continue;
            }
          } else {
            // Assume base64 string
            imageBuffer = Buffer.from(image, "base64");
          }
        } else {
          imageBuffer = image;
        }

        const base64Data = imageBuffer.toString("base64");
        userContentParts.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Data,
          },
        });
      }
    }

    // Always add the text content
    userContentParts.push({
      type: "text",
      text: inputText,
    });

    // Add the user message with appropriate content format
    messages.push({
      role: "user",
      content:
        userContentParts.length === 1 && userContentParts[0].type === "text"
          ? inputText
          : userContentParts,
    });

    // Convert tools to Anthropic format if present
    let tools: VertexAnthropicTool[] | undefined;
    const executeMap = new Map<string, Tool["execute"]>();
    const toolExecutions: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }> = [];

    // Defensive guard: Vertex generate() bypasses BaseProvider.generate(), so
    // disableTools must be checked here before native tool declarations are
    // ever sent to the Anthropic Vertex SDK.
    if (
      !options.disableTools &&
      options.tools &&
      Object.keys(options.tools).length > 0
    ) {
      tools = [];

      for (const [name, tool] of Object.entries(options.tools)) {
        const anthropicTool: VertexAnthropicTool = {
          name,
          description: tool.description || `Tool: ${name}`,
          input_schema: {
            type: "object",
          },
        };

        // Access legacy `parameters` (AI SDK v3/v4) or current `inputSchema` (v6)
        const legacyTool = tool as ToolWithLegacyParams;
        const toolParams = legacyTool.parameters || tool.inputSchema;
        if (toolParams) {
          // Anthropic validates input_schema as JSON Schema draft 2020-12 and
          // rejects OpenAPI-3 dialect output (e.g. `nullable: true`) with a
          // 400 — use the default JSON Schema target, matching the direct
          // anthropic provider. The Gemini paths keep "openApi3".
          const jsonSchema = convertZodToJsonSchema(
            toolParams as ZodUnknownSchema,
          ) as Record<string, unknown>;
          const inlined = inlineJsonSchema(jsonSchema);
          anthropicTool.input_schema = {
            type: "object",
            properties: (inlined.properties as Record<string, unknown>) || {},
            required: (inlined.required as string[]) || [],
          };
        }

        tools.push(anthropicTool);

        if (tool.execute) {
          executeMap.set(name, tool.execute);
        }
      }
    }

    // Handle JSON schema support via final_result tool pattern
    // Anthropic doesn't have native responseSchema, so we add a final_result tool
    let useFinalResultTool = false;
    let schemaSystemPromptSuffix = "";

    if (options.schema) {
      useFinalResultTool = true;

      // Convert schema to JSON schema format
      const schemaAsJson = convertZodToJsonSchema(
        options.schema as ZodUnknownSchema,
      ) as Record<string, unknown>;
      const inlinedSchema = inlineJsonSchema(schemaAsJson);
      if (inlinedSchema.$schema) {
        delete inlinedSchema.$schema;
      }
      const typedSchema = ensureNestedSchemaTypes(inlinedSchema);

      // Create final_result tool
      const finalResultTool: VertexAnthropicTool = {
        name: "final_result",
        description:
          "Return the final structured result. You MUST call this tool when you have gathered all information and are ready to provide the final answer. The arguments should contain the structured data matching the expected schema.",
        input_schema: {
          type: "object",
          properties:
            (typedSchema.properties as Record<string, unknown>) || typedSchema,
          required: (typedSchema.required as string[]) || [],
        },
      };

      // Add to tools array or create new array
      if (!tools) {
        tools = [];
      }
      tools.push(finalResultTool);

      // Add instruction to system prompt
      schemaSystemPromptSuffix =
        "\n\nIMPORTANT: You MUST call the 'final_result' tool to return your response in the required structured format. Do not respond with plain text - always use the final_result tool.";

      logger.debug(
        "[GoogleVertex] Added final_result tool for Anthropic structured output (generate)",
        {
          schemaKeys: Object.keys(typedSchema),
          totalTools: tools.length,
        },
      );
    }

    // Build request options
    const systemPromptWithSchema = options.systemPrompt
      ? options.systemPrompt + schemaSystemPromptSuffix
      : schemaSystemPromptSuffix
        ? schemaSystemPromptSuffix.trim()
        : undefined;

    const requestParams = {
      model: modelName,
      // Default to the model's real output ceiling (see stream path note).
      max_tokens: resolveClaudeMaxTokens(modelName, options.maxTokens),
      messages,
      ...(tools && tools.length > 0 && { tools }),
      ...(useFinalResultTool && { tool_choice: { type: "any" as const } }),
      ...(systemPromptWithSchema && { system: systemPromptWithSchema }),
      ...(options.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(options.topP !== undefined && { top_p: options.topP }),
      ...(options.stopSequences &&
        options.stopSequences.length > 0 && {
          stop_sequences: options.stopSequences,
        }),
    };

    // Handle tool calling loop with max steps
    const maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    let step = 0;
    let finalText = "";
    let structuredOutput: Record<string, unknown> | undefined;
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    // Track the final Anthropic stop_reason so we can surface finishReason
    // (notably "length" on token truncation) — the legacy native path always
    // reported "stop", hiding truncation from callers.
    let lastStopReason: string | null | undefined;
    const currentMessages = [...messages];

    while (step < maxSteps) {
      step++;

      try {
        // Bound the SDK wait so a stalled Vertex/Anthropic call can't hang
        // generate forever. options.timeout wins if set, otherwise default
        // to 5 min — generous for tool-heavy turns.
        const response = await withTimeout(
          client.messages.create({
            ...requestParams,
            messages: currentMessages as Parameters<
              typeof client.messages.create
            >[0]["messages"],
          }),
          generateTimeoutMs,
          "Anthropic generate timed out",
        );

        // Update token counts
        totalInputTokens += response.usage?.input_tokens || 0;
        totalOutputTokens += response.usage?.output_tokens || 0;
        lastStopReason = response.stop_reason;

        // Check if we need to handle tool use
        const toolUseBlocks = (
          response.content as VertexAnthropicContentBlock[]
        ).filter(
          (
            block,
          ): block is {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
          } => block.type === "tool_use",
        );

        // Check for final_result tool call (for structured output)
        if (useFinalResultTool) {
          const finalResultCall = toolUseBlocks.find(
            (block) => block.name === "final_result",
          );
          if (finalResultCall) {
            // Extract structured output and convert to JSON string for finalText
            structuredOutput = finalResultCall.input;
            finalText = JSON.stringify(structuredOutput);
            logger.debug(
              "[GoogleVertex] Extracted structured output from final_result tool (generate)",
              { keys: Object.keys(structuredOutput) },
            );
            break; // We have the structured output, we're done
          }
        }

        // Extract text from response
        const textBlocks = (
          response.content as VertexAnthropicContentBlock[]
        ).filter(
          (block): block is { type: "text"; text: string } =>
            block.type === "text",
        );
        const responseText = textBlocks.map((b) => b.text).join("");

        if (toolUseBlocks.length === 0) {
          // No tool calls, we're done
          finalText = responseText || finalText;
          break;
        }

        // Handle tool calls
        const toolResults: Array<{
          type: "tool_result";
          tool_use_id: string;
          content: string;
        }> = [];
        // Per-step bookkeeping for conversation-memory storage. Tracks calls
        // and results for ONLY the tools fired in this step so the storage
        // hook can tag them with the current stepIndex.
        const stepStorageCalls: Array<{
          toolCallId: string;
          toolName: string;
          args: Record<string, unknown>;
        }> = [];
        const stepStorageResults: Array<{
          toolCallId: string;
          toolName: string;
          output: unknown;
        }> = [];
        // Note: tool:start / tool:end events are emitted by ToolsManager's
        // wrapped `execute` (see ToolsManager.ts:355) — no inline emit needed.
        for (const toolUse of toolUseBlocks) {
          allToolCalls.push({
            toolName: toolUse.name,
            args: toolUse.input,
          });
          stepStorageCalls.push({
            toolCallId: toolUse.id,
            toolName: toolUse.name,
            args: toolUse.input,
          });

          const execute = executeMap.get(toolUse.name);
          if (execute) {
            try {
              const toolOptions = {
                toolCallId: toolUse.id,
                messages: [],
                abortSignal: options.abortSignal,
              };
              const result = await execute(toolUse.input, toolOptions);
              toolExecutions.push({
                name: toolUse.name,
                input: toolUse.input,
                output: result,
              });
              // Anthropic requires tool_result.content to be a string.
              // JSON.stringify returns undefined for undefined/function/symbol,
              // so coerce defensively to keep the follow-up turn valid.
              const resultContent =
                typeof result === "string"
                  ? result
                  : (JSON.stringify(result ?? null) ?? String(result));
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: resultContent,
              });
              stepStorageResults.push({
                toolCallId: toolUse.id,
                toolName: toolUse.name,
                output: result,
              });
            } catch (err) {
              const errMsg = `Error executing tool "${toolUse.name}": ${err instanceof Error ? err.message : String(err)}`;
              const errorPayload = { error: errMsg };
              toolExecutions.push({
                name: toolUse.name,
                input: toolUse.input,
                output: errorPayload,
              });
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: errMsg,
              });
              stepStorageResults.push({
                toolCallId: toolUse.id,
                toolName: toolUse.name,
                output: errorPayload,
              });
            }
          } else {
            const errMsg = `TOOL_NOT_FOUND: The tool "${toolUse.name}" does not exist.`;
            const errorPayload = { error: errMsg };
            toolExecutions.push({
              name: toolUse.name,
              input: toolUse.input,
              output: errorPayload,
            });
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: errMsg,
            });
            stepStorageResults.push({
              toolCallId: toolUse.id,
              toolName: toolUse.name,
              output: errorPayload,
            });
          }
        }

        // Persist this step's tool calls/results into conversation memory.
        // Without this, tool_call / tool_result rows never reach Redis and
        // the chat-history UI loses every tool invocation.
        // Fire-and-forget — storage failures must not break generation.
        if (stepStorageCalls.length > 0 || stepStorageResults.length > 0) {
          withTimeout(
            this.handleToolExecutionStorage(
              stepStorageCalls.map((c) => ({ ...c, stepIndex: step })),
              stepStorageResults.map((r) => ({ ...r, stepIndex: step })),
              options,
              new Date(),
            ),
            TOOL_STORAGE_TIMEOUT_MS,
            "tool storage write timed out",
          ).catch((error: unknown) => {
            logger.warn(
              "[GoogleVertex] Failed to store native Anthropic generate tool executions",
              {
                error: error instanceof Error ? error.message : String(error),
              },
            );
          });
        }

        // Add assistant message and tool results to continue the loop
        // Filter out server_tool_use blocks that the Anthropic API doesn't accept in messages
        const assistantContent = response.content.filter(
          (block: { type: string }) => block.type !== "server_tool_use",
        ) as (typeof currentMessages)[number]["content"];
        currentMessages.push({
          role: "assistant",
          content: assistantContent,
        });
        currentMessages.push({
          role: "user",
          content: toolResults,
        });

        // Store last text in case we hit max steps
        if (responseText) {
          finalText = responseText;
        }
      } catch (error) {
        logger.error(
          "[GoogleVertex] Native Anthropic SDK generate error",
          error,
        );
        throw this.handleProviderError(error);
      }
    }

    const responseTime = Date.now() - startTime;
    const externalToolCalls = allToolCalls.filter(
      (tc) => tc.toolName !== "final_result",
    );
    const externalToolExecutions = toolExecutions.filter(
      (te) => te.name !== "final_result",
    );

    const result: EnhancedGenerateResult = {
      content: finalText,
      // Surface truncation: Anthropic "max_tokens" → unified "length" so the
      // SDK boundary can flag/observe incomplete structured output. Anything
      // else (end_turn / stop_sequence / tool_use) is a normal stop.
      finishReason: lastStopReason === "max_tokens" ? "length" : "stop",
      provider: this.providerName,
      model: modelName,
      usage: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      responseTime,
      toolsUsed: externalToolCalls.map((tc) => tc.toolName),
      toolExecutions: transformToolExecutions(externalToolExecutions),
      enhancedWithTools: externalToolCalls.length > 0,
    };

    // Route through enhanceResult so analytics/evaluation/tracing are picked
    // up the same way the BaseProvider.generate() path picks them up. The
    // native Anthropic-on-Vertex path bypasses BaseProvider.generate(), so
    // enableAnalytics / enableEvaluation would otherwise be silently ignored.
    return this.enhanceResult(result, options, startTime);
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
    // CRITICAL FIX: Also update 'prompt' field since executeNativeAnthropicGenerate
    // uses `options.prompt || options.input?.text` to build messages, and `prompt`
    // is already set from neurolink.ts baseOptions creation. Without updating both,
    // the CSV-enhanced text won't be sent to the model.
    return {
      ...options,
      prompt: modifiedText,
      input: { ...options.input, text: modifiedText },
    } as T;
  }

  /**
   * Override stream to handle image generation models
   * Image models don't support streaming, so we fall back to generate
   */
  async stream(optionsOrPrompt: StreamOptions | string): Promise<StreamResult> {
    // Normalize options
    const options =
      typeof optionsOrPrompt === "string"
        ? { input: { text: optionsOrPrompt } }
        : optionsOrPrompt;

    const modelName =
      options.model || this.modelName || getDefaultVertexModel();

    // Check if this is an image generation model - image models don't support streaming
    const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
      modelName.toLowerCase().startsWith(m.toLowerCase()),
    );

    if (isImageModel) {
      logger.warn(
        "[GoogleVertex] Image generation models don't support streaming, falling back to generate",
        { model: modelName },
      );

      // Convert stream options to text generation options
      const generateOptions: TextGenerationOptions = {
        prompt: options.input?.text || "",
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        input: options.input,
      };

      const result = await this.executeImageGeneration(generateOptions);

      // Return a mock stream result for compatibility
      const textContent = result?.content || "";
      const imageOutput = result?.imageOutput;

      return {
        stream: (async function* () {
          if (imageOutput) {
            yield {
              type: "image" as const,
              imageOutput: { base64: imageOutput.base64 || "" },
            };
          }
          yield { content: textContent };
        })(),
        provider: this.providerName,
        model: modelName,
        usage: result?.usage,
        finishReason: "stop",
      };
    }

    // For non-image models, call the parent stream method
    return super.stream(optionsOrPrompt);
  }

  /**
   * Override generate to route ALL models to native SDKs
   * No more @ai-sdk/google-vertex dependency
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

    // Wrap the entire generate path in a `neurolink.provider.generate` span
    // so observability tooling (test:tracing, Langfuse, OTEL collectors)
    // sees the same span hierarchy that BaseProvider.generate would create.
    // Vertex's generate() bypasses BaseProvider.generate entirely, so
    // without this wrapping the provider span never gets emitted.
    return withClientSpan(
      {
        name: "neurolink.provider.generate",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: this.providerName,
          [ATTR.GEN_AI_MODEL]: modelName,
          [ATTR.GEN_AI_OPERATION]: "generate",
          [ATTR.NL_PROVIDER]: this.providerName,
        },
      },
      async (generateSpan) => {
        const generateStartTime = Date.now();

        // Video-mode requests must route through BaseProvider's
        // handleVideoGeneration (which loads the Veo 3 adapter). Vertex's
        // native @google/genai path is text/image only — without this
        // gate, video requests fall through to gemini-2.5-flash and the
        // model politely declines ("I cannot create animations") instead
        // of producing video bytes.
        if (options.output?.mode === "video") {
          logger.info(
            "[GoogleVertex] Routing video-mode generate to handleVideoGeneration",
            { model: modelName },
          );
          const videoResult = await this.handleVideoGeneration(
            options,
            generateStartTime,
          );
          this.attachUsageAndCostAttributes(
            generateSpan,
            modelName,
            videoResult?.usage,
          );
          this.emitGenerationEnd(
            modelName,
            videoResult,
            generateStartTime,
            true,
          );
          return videoResult;
        }

        // TTS direct-synthesis mode: when caller passes `tts.enabled` without
        // `tts.useAiResponse`, route to the shared `handleDirectTTSSynthesis`
        // (synthesise the input text directly; no LLM call). BaseProvider's
        // standard generate() does the same dispatch — we replicate it here
        // because Vertex's override bypasses that path.
        if (options.tts?.enabled && !options.tts?.useAiResponse) {
          logger.info(
            "[GoogleVertex] Routing TTS direct-synthesis to handleDirectTTSSynthesis",
            { model: modelName },
          );
          const ttsResult = await this.handleDirectTTSSynthesis(
            options,
            generateStartTime,
          );
          this.emitGenerationEnd(modelName, ttsResult, generateStartTime, true);
          return ttsResult;
        }

        // Check if this is an image generation model - route to executeImageGeneration without tools
        const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
          modelName.toLowerCase().startsWith(m.toLowerCase()),
        );

        if (isImageModel) {
          logger.info(
            "[GoogleVertex] Routing image generation model to executeImageGeneration",
            { model: modelName },
          );
          const imageResult = await this.executeImageGeneration(options);
          this.attachUsageAndCostAttributes(
            generateSpan,
            modelName,
            imageResult?.usage,
          );
          this.emitGenerationEnd(
            modelName,
            imageResult,
            generateStartTime,
            true,
          );
          return imageResult;
        }

        // Merge registered (built-in / MCP) tools with caller-supplied
        // tools. Vertex's generate() bypasses BaseProvider.generate(), so
        // the BaseProvider tool-merge that normally pulls registered
        // tools from the ToolsManager never runs here. Without this call,
        // sdk.registerTool() entries silently never reach Gemini's
        // function-calling path.
        const baseTools = !options.disableTools
          ? await this.getToolsForStream(options)
          : {};

        // Process the unified `input.files` array before routing to the
        // native SDK. BaseProvider.generate() runs this preprocessing via
        // buildMultimodalMessagesArray, but Vertex's override skips it,
        // which would otherwise drop text-file content (and the
        // mimetype-hint contract) on the floor. Mutates options.input.text /
        // options.input.images / options.input.pdfFiles in place.
        if (options.input?.files && options.input.files.length > 0) {
          try {
            await processUnifiedFilesArray(
              options as Parameters<typeof processUnifiedFilesArray>[0],
              100 * 1024 * 1024,
              this.providerName,
            );
          } catch (fileError) {
            logger.warn(
              `[GoogleVertex] processUnifiedFilesArray threw, continuing without file content: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
            );
          }
        }

        // Emit a `neurolink.message.build` span so observability tooling
        // sees the message-construction phase even on the native (Pipeline B)
        // Vertex path. Pipeline A normally produces this via MessageBuilder;
        // the native path builds contents directly so we record an explicit
        // span here. Without this the test:tracing "Message Build Span"
        // assertion has to skip on every native-Vertex run.
        const processedOptions = await withSpan(
          {
            name: "neurolink.message.build",
            tracer: tracers.provider,
            attributes: {
              [ATTR.NL_PROVIDER]: this.providerName,
              "message.count": 1,
              "message.build.count": 1,
              "message.build.path": "vertex.native",
            },
          },
          async () => this.processCSVFilesForNativeSDK(options),
        );

        const mergedOptions = {
          ...processedOptions,
          tools: baseTools,
        };

        // Capture the user's prompt up-front so the Pipeline B listener
        // sets `input` on the model.generation span — without this the
        // observability harness reports "input capture not working".
        const inputPrompt =
          (mergedOptions.input as { text?: string } | undefined)?.text ||
          (mergedOptions as { prompt?: string }).prompt ||
          "";

        try {
          let result: EnhancedGenerateResult;
          // Wrap the actual native generate call in `neurolink.executeGeneration`
          // so the observability span chain (tested by
          // "Tracing: Generate Span Chain") sees a third inner span on the
          // native @google/genai / @anthropic-ai/vertex-sdk path — Pipeline A
          // gets this for free from GenerationHandler.executeGeneration.
          result = await withSpan(
            {
              name: "neurolink.executeGeneration",
              tracer: tracers.provider,
              attributes: {
                [ATTR.GEN_AI_SYSTEM]: this.providerName,
                [ATTR.GEN_AI_MODEL]: modelName,
                "neurolink.path": isAnthropicModel(modelName)
                  ? "native.anthropic"
                  : "native.google-genai",
              },
            },
            async () => {
              if (isAnthropicModel(modelName)) {
                logger.info(
                  "[GoogleVertex] Routing Claude generate to native @anthropic-ai/vertex-sdk",
                  {
                    model: modelName,
                    totalToolCount: Object.keys(mergedOptions.tools).length,
                  },
                );
                return this.executeNativeAnthropicGenerate(mergedOptions);
              }
              logger.info(
                "[GoogleVertex] Routing Gemini generate to native @google/genai",
                {
                  model: modelName,
                  totalToolCount: Object.keys(mergedOptions.tools).length,
                },
              );
              return this.executeNativeGemini3Generate(mergedOptions);
            },
          );
          this.attachUsageAndCostAttributes(
            generateSpan,
            modelName,
            result?.usage,
          );
          // Pipe through TTS-of-AI-response when caller asks for it. The
          // shared `synthesizeAIResponseIfNeeded` no-ops when tts is not
          // enabled / useAiResponse is false, so the cost is zero on
          // non-TTS paths.
          result = await this.synthesizeAIResponseIfNeeded(result, options);
          // Fire onFinish lifecycle callback for the native generate path.
          // Pipeline A providers get this for free via the AI SDK middleware
          // wrapper (LifecycleMiddleware); native @google/genai bypasses
          // that wrapper, so we have to invoke the callback ourselves.
          this.fireGenerateOnFinish(options, result, generateStartTime);
          this.emitGenerationEnd(
            modelName,
            result,
            generateStartTime,
            true,
            undefined,
            inputPrompt,
          );
          return result;
        } catch (error) {
          this.fireGenerateOnError(options, error, generateStartTime);
          this.emitGenerationEnd(
            modelName,
            null,
            generateStartTime,
            false,
            error,
            inputPrompt,
          );
          throw error;
        }
      },
    );
  }

  /**
   * Invoke `options.onFinish` with the lifecycle payload shape consumers
   * (and `test:middleware`) expect. Pulled out so generate / image-gen /
   * Anthropic / Gemini code paths share one implementation. Errors thrown
   * by the user's callback are swallowed so they cannot poison the
   * primary generate path — same contract as the AI SDK middleware
   * wrapGenerate uses.
   */
  private fireGenerateOnFinish(
    options: TextGenerationOptions,
    result: EnhancedGenerateResult | null,
    startTime: number,
  ): void {
    const onFinish = (options as { onFinish?: (payload: unknown) => unknown })
      .onFinish;
    if (typeof onFinish !== "function") {
      return;
    }
    try {
      const usage = result?.usage as
        | { input?: number; output?: number; total?: number }
        | undefined;
      const callbackResult = onFinish({
        text: result?.content || "",
        usage: usage
          ? {
              promptTokens: usage.input ?? 0,
              completionTokens: usage.output ?? 0,
            }
          : undefined,
        duration: Date.now() - startTime,
        finishReason: "stop",
      });
      Promise.resolve(callbackResult).catch((err) =>
        logger.warn(
          `[GoogleVertex] onFinish callback rejected: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    } catch (err) {
      logger.warn(
        `[GoogleVertex] onFinish callback threw: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Invoke `options.onError` with the lifecycle payload shape consumers
   * (and `test:middleware`) expect. Mirrors {@link fireGenerateOnFinish}.
   */
  private fireGenerateOnError(
    options: TextGenerationOptions | StreamOptions,
    error: unknown,
    startTime: number,
  ): void {
    const onError = (options as { onError?: (payload: unknown) => unknown })
      .onError;
    if (typeof onError !== "function") {
      return;
    }
    try {
      const err = error instanceof Error ? error : new Error(String(error));
      const callbackResult = onError({
        error: err,
        duration: Date.now() - startTime,
        recoverable: false,
      });
      Promise.resolve(callbackResult).catch((e) =>
        logger.warn(
          `[GoogleVertex] onError callback rejected: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    } catch (e) {
      logger.warn(
        `[GoogleVertex] onError callback threw: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /**
   * Wrap a {@link StreamResult} so each text chunk drives `options.onChunk`
   * and the final yield drives `options.onFinish`. Pipeline A providers get
   * this for free via the AI SDK `wrapStream` middleware; native @google/genai
   * bypasses that wrapper, so native consumers need their lifecycle
   * callbacks invoked from here.
   */
  private wrapStreamResultWithLifecycle(
    options: StreamOptions,
    result: StreamResult,
    startTime: number,
  ): StreamResult {
    const onChunk = (
      options as {
        onChunk?: (payload: unknown) => unknown;
      }
    ).onChunk;
    const onFinish = (options as { onFinish?: (payload: unknown) => unknown })
      .onFinish;
    const onError = (options as { onError?: (payload: unknown) => unknown })
      .onError;
    if (
      typeof onChunk !== "function" &&
      typeof onFinish !== "function" &&
      typeof onError !== "function"
    ) {
      return result;
    }

    const originalIterable = result.stream;
    let accumulated = "";
    let sequence = 0;
    const provider = this.providerName;
    const fireOnChunk = (payload: unknown) => {
      if (typeof onChunk !== "function") {
        return;
      }
      try {
        const cbResult = onChunk(payload);
        Promise.resolve(cbResult).catch((err) =>
          logger.warn(
            `[GoogleVertex] onChunk callback rejected: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      } catch (err) {
        logger.warn(
          `[GoogleVertex] onChunk callback threw: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };
    const fireOnFinish = (payload: unknown) => {
      if (typeof onFinish !== "function") {
        return;
      }
      try {
        const cbResult = onFinish(payload);
        Promise.resolve(cbResult).catch((err) =>
          logger.warn(
            `[GoogleVertex] onFinish callback rejected: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      } catch (err) {
        logger.warn(
          `[GoogleVertex] onFinish callback threw: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };

    const wrappedIterable: AsyncIterable<{ content?: string }> = {
      async *[Symbol.asyncIterator]() {
        try {
          for await (const chunk of originalIterable as AsyncIterable<{
            content?: string;
          }>) {
            const text =
              typeof chunk?.content === "string" ? chunk.content : "";
            if (text) {
              accumulated += text;
              fireOnChunk({
                type: "text-delta",
                textDelta: text,
                sequenceNumber: sequence++,
              });
            }
            yield chunk;
          }
          fireOnFinish({
            text: accumulated,
            usage: result.usage
              ? {
                  promptTokens: (result.usage as { input?: number }).input ?? 0,
                  completionTokens:
                    (result.usage as { output?: number }).output ?? 0,
                }
              : undefined,
            duration: Date.now() - startTime,
            finishReason: result.finishReason || "stop",
          });
        } catch (err) {
          if (typeof onError === "function") {
            try {
              const errInst =
                err instanceof Error ? err : new Error(String(err));
              const cbResult = onError({
                error: errInst,
                duration: Date.now() - startTime,
                recoverable: false,
              });
              Promise.resolve(cbResult).catch((e) =>
                logger.warn(
                  `[${provider}] onError callback rejected: ${e instanceof Error ? e.message : String(e)}`,
                ),
              );
            } catch (e) {
              logger.warn(
                `[${provider}] onError callback threw: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }
          throw err;
        }
      },
    };

    return {
      ...result,
      stream: wrappedIterable as StreamResult["stream"],
    };
  }

  /**
   * Attach `gen_ai.usage.*` and `neurolink.cost` attributes to a span.
   * Pulled out so the generate / stream / image-gen paths share one
   * implementation, and so observability/tracing tests find consistent
   * attributes regardless of which native sub-route fulfilled the request.
   */
  private attachUsageAndCostAttributes(
    span: import("@opentelemetry/api").Span | undefined,
    modelName: string,
    usage:
      | {
          input?: number;
          output?: number;
          total?: number;
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
        }
      | undefined,
  ): void {
    if (!span || !usage) {
      return;
    }
    const inputTokens = usage.input ?? usage.inputTokens ?? 0;
    const outputTokens = usage.output ?? usage.outputTokens ?? 0;
    const totalTokens =
      usage.total ?? usage.totalTokens ?? inputTokens + outputTokens;
    if (inputTokens > 0) {
      span.setAttribute("gen_ai.usage.input_tokens", inputTokens);
    }
    if (outputTokens > 0) {
      span.setAttribute("gen_ai.usage.output_tokens", outputTokens);
    }
    if (totalTokens > 0) {
      span.setAttribute("gen_ai.usage.total_tokens", totalTokens);
    }
    try {
      const cost = calculateCost(this.providerName, modelName, {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      });
      if (typeof cost === "number" && cost > 0) {
        span.setAttribute("neurolink.cost", cost);
      }
    } catch {
      // Pricing table miss is not fatal — leave the attribute unset.
    }
  }

  /**
   * Emit `generation:end` so the Pipeline B observability listener creates
   * the corresponding `model.generation` span. Vertex bypasses the AI SDK
   * (and therefore the experimental_telemetry plumbing), so this hand-off
   * is the only way native Vertex calls show up in Langfuse / Pipeline B
   * exporters. Mirrors the Bedrock + Ollama pattern.
   */
  private emitGenerationEnd(
    modelName: string,
    result: EnhancedGenerateResult | null,
    startTime: number,
    success: boolean,
    error?: unknown,
    prompt?: string,
  ): void {
    const emitter = this.neurolink?.getEventEmitter();
    if (!emitter) {
      return;
    }
    const usage =
      result?.usage && typeof result.usage === "object"
        ? result.usage
        : { input: 0, output: 0, total: 0 };
    emitter.emit("generation:end", {
      provider: this.providerName,
      responseTime: Date.now() - startTime,
      timestamp: Date.now(),
      // The Pipeline B listener reads `data.prompt` to populate the
      // `input` attribute on the model.generation span; without it the
      // Observability Spans regression check fails.
      prompt: prompt || "",
      result: {
        content: result?.content || "",
        usage,
        model: modelName,
        provider: this.providerName,
        finishReason: success ? "stop" : "error",
      },
      success,
      ...(error
        ? { error: error instanceof Error ? error.message : String(error) }
        : {}),
    });
    // Mark on the result so the SDK-level runStandardGenerateRequest knows
    // this provider already emitted `generation:end` itself and skips its
    // own duplicate emission. Without this flag the public event listener
    // (and the observability test) would see two events per generate call.
    if (result && typeof result === "object") {
      (result as { _generationEndEmitted?: boolean })._generationEndEmitted =
        true;
    }
  }

  protected formatProviderError(error: unknown): Error {
    const errorRecord = error as UnknownRecord;
    if (
      typeof errorRecord?.name === "string" &&
      errorRecord.name === "TimeoutError"
    ) {
      return new NetworkError(
        `Google Vertex AI request timed out. Consider increasing timeout or using a lighter model.`,
        this.providerName,
      );
    }

    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error occurred";
    const statusCode =
      typeof errorRecord?.status === "number"
        ? errorRecord.status
        : typeof errorRecord?.statusCode === "number"
          ? errorRecord.statusCode
          : undefined;

    // Authentication and permission errors
    if (
      message.includes("PERMISSION_DENIED") ||
      message.includes("UNAUTHENTICATED") ||
      message.includes("Invalid API key") ||
      statusCode === 401 ||
      statusCode === 403
    ) {
      return new AuthenticationError(
        `Google Vertex AI Permission Denied. Your Google Cloud credentials don't have permission to access Vertex AI. ` +
          `Required Steps: 1. Ensure your service account has Vertex AI User role ` +
          `2. Check if Vertex AI API is enabled in your project ` +
          `3. Verify your project ID is correct ` +
          `4. Confirm your location/region has Vertex AI available`,
        this.providerName,
      );
    }

    // Model not found errors
    if (
      message.includes("NOT_FOUND") ||
      message.includes("model not found") ||
      message.includes("Model not found") ||
      statusCode === 404
    ) {
      const modelSuggestions = this.getModelSuggestions(this.modelName);
      return new InvalidModelError(
        `Model '${this.modelName}' is not available in region ${this.location}. ` +
          `Suggested alternatives: ${modelSuggestions}. ` +
          `Troubleshooting: 1. Check model name spelling and format ` +
          `2. Verify model is available in your region ` +
          `3. Ensure your project has access to the model ` +
          `4. For Claude models, enable Anthropic integration in Google Cloud Console`,
        this.providerName,
      );
    }

    // Rate limit and quota errors
    if (
      message.includes("QUOTA_EXCEEDED") ||
      message.includes("RATE_LIMIT_EXCEEDED") ||
      message.includes("rate limit") ||
      message.includes("429") ||
      statusCode === 429
    ) {
      return new RateLimitError(
        `Google Vertex AI quota/rate limit exceeded. ` +
          `Solutions: 1. Check your Vertex AI quotas in Google Cloud Console ` +
          `2. Request quota increase if needed ` +
          `3. Try a different model or reduce request frequency ` +
          `4. Consider using a different region`,
        this.providerName,
      );
    }

    // Network connectivity errors
    if (
      message.includes("ECONNRESET") ||
      message.includes("ENOTFOUND") ||
      message.includes("ETIMEDOUT") ||
      message.includes("ECONNREFUSED") ||
      message.includes("network") ||
      message.includes("connection")
    ) {
      return new NetworkError(
        `Connection error: ${message}`,
        this.providerName,
      );
    }

    // Server errors (5xx)
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("server error") ||
      message.includes("Internal Server Error") ||
      message.includes("INTERNAL") ||
      message.includes("UNAVAILABLE") ||
      (statusCode && statusCode >= 500 && statusCode < 600)
    ) {
      return new ProviderError(
        `Google Vertex AI server error: ${message}. Please try again later.`,
        this.providerName,
      );
    }

    // Invalid argument errors
    if (message.includes("INVALID_ARGUMENT")) {
      return new ProviderError(
        `Google Vertex AI Invalid Request: ${message}. ` +
          `Check: 1. Request parameters are within model limits ` +
          `2. Input text is properly formatted ` +
          `3. Temperature and other settings are valid ` +
          `4. Model supports your request type`,
        this.providerName,
      );
    }

    return new ProviderError(
      `Google Vertex AI error: ${message}`,
      this.providerName,
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
   * @deprecated This method is no longer used. Claude models now use native @anthropic-ai/vertex-sdk
   * via executeNativeAnthropicStream and executeNativeAnthropicGenerate.
   */
  async createAnthropicModel(
    _modelName: string,
  ): Promise<LanguageModel | null> {
    // This method is dead code - all Claude models now route to native SDK methods.
    // Throwing an error to catch any unexpected calls to this method.
    throw new NeuroLinkError({
      code: ERROR_CODES.INVALID_CONFIGURATION,
      message:
        "createAnthropicModel is deprecated. Use executeNativeAnthropicStream or executeNativeAnthropicGenerate instead.",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      retriable: false,
      context: { provider: this.providerName },
    });
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
          "5. Verify @google-cloud/vertexai and @anthropic-ai/vertex-sdk versions",
        );
        break;

      default:
        steps.push(
          "🔧 General Troubleshooting:",
          "1. Verify native SDK packages are properly installed",
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
   * Build image parts for multimodal content
   */

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

    // Validate that we have at least a prompt or PDF/image input
    if (!prompt.trim() && !hasPdfInput && !hasImageInput) {
      throw new ProviderError(
        "Image generation requires either a prompt, PDF file, or image as input",
        this.providerName,
      );
    }

    // Select appropriate model - use gemini-3-pro-image-preview for PDF input
    let imageModelName =
      options.model || this.modelName || "gemini-3-pro-image-preview";

    // If PDF files are provided, ensure we use a model that supports PDF input
    if (hasPdfInput && !imageModelName.includes("gemini-3-pro-image")) {
      imageModelName = "gemini-3-pro-image-preview";
    }

    // Determine location - some image models require 'global' location
    // Check if the model is in GLOBAL_LOCATION_MODELS array (includes gemini-3-pro-image-preview, gemini-2.5-flash-image, etc.)
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
      // Import google-auth-library dynamically
      const { GoogleAuth } = await import("google-auth-library");

      // Determine which credentials file to use
      // Priority: GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK > GOOGLE_APPLICATION_CREDENTIALS
      const credentialsPath =
        process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS;

      // Initialize GoogleAuth with credentials
      // Use keyFilename to explicitly specify the credentials file to avoid using wrong service account
      const auth = new GoogleAuth({
        ...(credentialsPath && { keyFilename: credentialsPath }),
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });

      // Get access token
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();

      if (!accessToken.token) {
        throw new AuthenticationError(
          "Failed to obtain access token from Google Auth",
          this.providerName,
        );
      }

      // Build parts array - supports text prompt and optional PDF files
      const parts: Array<{
        text?: string;
        inlineData?: { mimeType: string; data: string };
      }> = [];

      // Add text prompt
      if (prompt) {
        parts.push({ text: prompt });
      }

      // Add PDF files as inline data (for gemini-3-pro-image-preview)
      if (hasPdfInput) {
        for (const pdfFile of pdfFiles) {
          let pdfBase64: string;

          if (Buffer.isBuffer(pdfFile)) {
            pdfBase64 = pdfFile.toString("base64");
          } else if (typeof pdfFile === "string") {
            // Check if it's already base64 or a file path
            // Supports absolute paths, Windows paths, and relative paths
            const isFilePath =
              pdfFile.startsWith("/") ||
              /^[a-zA-Z]:\\/.test(pdfFile) ||
              pdfFile.startsWith("./") ||
              pdfFile.startsWith("../") ||
              pdfFile.startsWith("..\\") ||
              pdfFile.startsWith(".\\");
            if (isFilePath) {
              // Validate and normalize the path for security
              const normalizedPath = path.resolve(pdfFile);
              const cwd = process.cwd();

              // Security: Ensure path is within current working directory
              if (
                !normalizedPath.startsWith(cwd + path.sep) &&
                normalizedPath !== cwd
              ) {
                throw new ProviderError(
                  `PDF file path must be within current directory for security`,
                  this.providerName,
                );
              }

              // Security: Validate file exists before reading
              if (!fs.existsSync(normalizedPath)) {
                throw new ProviderError(
                  `PDF file not found: ${normalizedPath}`,
                  this.providerName,
                );
              }

              // Read the file
              const pdfBuffer = fs.readFileSync(normalizedPath);
              pdfBase64 = pdfBuffer.toString("base64");
            } else {
              // Assume it's already base64
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
      }

      // Add images (including those converted from PDF by baseProvider)
      // This handles the case where PDFs are converted to images for models that don't support native PDF
      if (hasImageInput) {
        for (let i = 0; i < inputImages.length; i++) {
          const image = inputImages[i];
          let imageBase64: string;
          let mimeType: string;

          if (Buffer.isBuffer(image)) {
            imageBase64 = image.toString("base64");
            mimeType = this.detectImageType(image);
          } else if (typeof image === "string") {
            // Check if it's a file path or already base64
            const isFilePath =
              image.startsWith("/") ||
              /^[a-zA-Z]:\\/.test(image) ||
              image.startsWith("./") ||
              image.startsWith("../") ||
              image.startsWith("..\\") ||
              image.startsWith(".\\");

            if (isFilePath) {
              // Read from file path
              const normalizedPath = path.resolve(image);
              if (!fs.existsSync(normalizedPath)) {
                logger.warn(
                  `Image file not found: ${normalizedPath}, skipping`,
                );
                continue;
              }
              const imageBuffer = fs.readFileSync(normalizedPath);
              imageBase64 = imageBuffer.toString("base64");
              mimeType = this.detectImageType(imageBuffer);
            } else if (image.startsWith("data:")) {
              // Data URL format: data:image/png;base64,<base64data>
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
            } else if (
              image.startsWith("http://") ||
              image.startsWith("https://")
            ) {
              // Image URL — fetch the bytes and base64-encode them.
              // Without this, the URL string itself ends up in
              // inline_data.data and Vertex rejects with
              // "Base64 decoding failed for <url>".
              try {
                const response = await fetch(image);
                if (!response.ok) {
                  logger.warn(
                    `Image fetch failed: ${response.status} ${response.statusText}, skipping`,
                    { url: image, index: i },
                  );
                  continue;
                }
                const arrayBuffer = await response.arrayBuffer();
                const fetchedBuffer = Buffer.from(arrayBuffer);
                imageBase64 = fetchedBuffer.toString("base64");
                const headerMime = response.headers.get("content-type");
                mimeType =
                  headerMime && headerMime.startsWith("image/")
                    ? headerMime.split(";")[0]
                    : this.detectImageType(fetchedBuffer);
              } catch (fetchError) {
                logger.warn(
                  `Image URL fetch threw, skipping: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                  { url: image, index: i },
                );
                continue;
              }
            } else {
              // Assume it's already base64 encoded
              imageBase64 = image;
              // Try to detect type from base64 data
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
      }

      // Build request body with CRITICAL response_modalities setting
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: parts,
          },
        ],
        generation_config: {
          response_modalities: ["TEXT", "IMAGE"], // CRITICAL for image generation
          temperature: options.temperature || 0.7,
          candidate_count: 1,
        },
      };

      // Construct Vertex AI endpoint - use appropriate base URL for location
      let url: string;
      if (location === "global") {
        // Global endpoint doesn't have region prefix
        url = `https://aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/global/publishers/google/models/${imageModelName}:generateContent`;
      } else {
        url = `https://${location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${location}/publishers/google/models/${imageModelName}:generateContent`;
      }

      logger.debug("Making REST API call to Vertex AI", {
        url,
        model: imageModelName,
        hasAccessToken: !!accessToken.token,
      });

      // Add timeout protection (120 seconds for image generation)
      // Note: Using Promise.race instead of createTimeoutController because:
      // 1. This is a one-off REST API call (not streaming) where fetch completion is atomic
      // 2. AbortController mid-request cancellation isn't beneficial for image generation
      //    since the server generates the full image before responding
      // 3. The simpler Promise.race pattern is sufficient for this use case
      const timeoutMs = 120000;

      const fetchPromise = fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
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

      // Extract image from response (handle both inlineData and inline_data formats)
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
          ((part.inlineData &&
            part.inlineData.mimeType?.startsWith("image/")) ||
            (part.inline_data &&
              part.inline_data.mime_type?.startsWith("image/"))),
      );

      if (!imagePart) {
        // Dual-mode image models (gemini-3.1-flash-image-preview,
        // gemini-2.5-flash-image, gemini-3-pro-image-preview) decide
        // per-request whether to emit inlineData (image bytes) or text.
        // For a text-only prompt the model legitimately answers with
        // text parts and no image. Treat this as a normal text fallback
        // instead of throwing — otherwise simple queries like "What is
        // the capital of France?" against an image-capable model burn
        // retries on a question the model already answered.
        const textFallback = candidate.content.parts
          .map((part) => part.text)
          .filter((t): t is string => Boolean(t))
          .join("");

        if (textFallback) {
          logger.info("[GoogleVertex] Image-gen route returned text fallback", {
            model: imageModelName,
            length: textFallback.length,
          });
          const textResult: EnhancedGenerateResult = {
            content: textFallback,
            provider: this.providerName,
            model: imageModelName,
            usage: {
              input: this.estimateTokenCount(prompt),
              output: this.estimateTokenCount(textFallback),
              total:
                this.estimateTokenCount(prompt) +
                this.estimateTokenCount(textFallback),
            },
          };
          return await this.enhanceResult(textResult, options, startTime);
        }

        throw new ProviderError(
          `Image generation completed but no image data was returned. Model: ${imageModelName}`,
          this.providerName,
        );
      }

      // Extract image data (handle both formats)
      const imageData =
        imagePart.inlineData?.data || imagePart.inline_data?.data;
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

      logger.info("Image generation successful", {
        model: imageModelName,
        mimeType,
        dataLength: imageData.length,
        responseTime: Date.now() - startTime,
      });

      // Return result structure
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

  /**
   * Generate an embedding for `text` using Vertex via @google/genai.
   *
   * Replaces the previous `@ai-sdk/google-vertex` text embedding model
   * path. Without this, RAG indexing falls through to BaseProvider.embed()
   * which throws "Embedding generation is not supported by the vertex
   * provider", and `neurolink rag index --provider=vertex` fails even
   * though the SDK conceptually supports it.
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const embeddingModelName =
      modelName || this.getDefaultEmbeddingModel() || "text-embedding-004";

    logger.debug("Generating embedding", {
      provider: this.providerName,
      model: embeddingModelName,
      textLength: text.length,
    });

    try {
      const effectiveLocation = resolveVertexRegionForModel(
        embeddingModelName,
        undefined,
      );
      const client = await this.createVertexGenAIClient(effectiveLocation);

      const result = await client.models.embedContent({
        model: embeddingModelName,
        contents: [text],
      });

      const embedding = result.embeddings?.[0]?.values;
      if (!embedding || embedding.length === 0) {
        throw new ProviderError(
          "No embedding returned from Vertex AI",
          this.providerName,
        );
      }

      logger.debug("Embedding generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        embeddingDimension: embedding.length,
      });

      return embedding;
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
   * Batch-embed an array of strings via Vertex @google/genai.
   * Mirrors {@link embed} but returns one vector per input string.
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    const embeddingModelName =
      modelName || this.getDefaultEmbeddingModel() || "text-embedding-004";

    logger.debug("Generating batch embeddings", {
      provider: this.providerName,
      model: embeddingModelName,
      count: texts.length,
    });

    try {
      const effectiveLocation = resolveVertexRegionForModel(
        embeddingModelName,
        undefined,
      );
      const client = await this.createVertexGenAIClient(effectiveLocation);

      const result = await client.models.embedContent({
        model: embeddingModelName,
        contents: texts,
      });

      const embeddings = (result.embeddings || []).map(
        (e: { values?: number[] }) => e.values || [],
      );

      logger.debug("Batch embeddings generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        count: embeddings.length,
        embeddingDimension: embeddings[0]?.length,
      });

      return embeddings;
    } catch (error) {
      logger.error("Batch embedding generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: embeddingModelName,
        count: texts.length,
      });

      throw this.handleProviderError(error);
    }
  }
}

export default GoogleVertexProvider;

// Re-export for compatibility
export { GoogleVertexProvider as GoogleVertexAI };
