/**
 * Provider Health Checking System
 * Prevents 500 errors by validating provider availability and configuration
 */

import { logger } from "./logger.js";
import {
  AIProviderName,
  OpenAIModels,
  GoogleAIModels,
  AnthropicModels,
  BedrockModels,
} from "../constants/enums.js";
import { API_KEY_LENGTHS, PROJECT_ID_FORMAT } from "./providerConfig.js";
import { basename } from "path";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  ProviderHealthCheckOptions,
  ProviderHealthStatusOptions,
} from "$lib/types/providers.js";

export class ProviderHealthChecker {
  private static healthCache = new Map<
    string,
    {
      status: ProviderHealthStatusOptions;
      timestamp: number;
    }
  >();
  private static readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private static readonly DEFAULT_CACHE_AGE = 300000; // 5 minutes
  private static readonly CONSECUTIVE_FAILURE_THRESHOLD =
    ProviderHealthChecker.getValidatedFailureThreshold();
  private static consecutiveFailures = new Map<string, number>();

  /**
   * Validate and return a safe failure threshold value
   */
  private static getValidatedFailureThreshold(): number {
    const envValue = process.env.PROVIDER_FAILURE_THRESHOLD;

    if (!envValue) {
      return 3; // default
    }

    const parsed = Number(envValue);
    if (isNaN(parsed) || parsed <= 0 || parsed > 10) {
      logger.warn(
        `Invalid PROVIDER_FAILURE_THRESHOLD: ${envValue} (must be between 1 and 10), using default: 3`,
      );
      return 3;
    }

    return parsed;
  }

  /**
   * Comprehensive health check for a provider
   */
  static async checkProviderHealth(
    providerName: AIProviderName,
    options: ProviderHealthCheckOptions = {},
  ): Promise<ProviderHealthStatusOptions> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      includeConnectivityTest = false,
      includeModelValidation = false,
      cacheResults = true,
      maxCacheAge = this.DEFAULT_CACHE_AGE,
    } = options;

    // Check cache first
    if (cacheResults) {
      const cached = this.getCachedHealth(providerName, maxCacheAge);
      if (cached) {
        logger.debug(`Using cached health status for ${providerName}`);
        return cached;
      }
    }

    // Check if provider has consecutive failures (blacklisting)
    const failureCount = this.consecutiveFailures.get(providerName) || 0;
    if (failureCount >= this.CONSECUTIVE_FAILURE_THRESHOLD) {
      const healthStatus: ProviderHealthStatusOptions = {
        provider: providerName,
        isHealthy: false,
        isConfigured: false,
        hasApiKey: false,
        lastChecked: new Date(),
        error: `Provider blacklisted after ${failureCount} consecutive failures`,
        warning: "Provider will be retried after cache TTL expires",
        configurationIssues: [
          `Blacklisted due to ${failureCount} consecutive failures`,
        ],
        recommendations: ["Check provider status and configuration"],
      };
      logger.warn(
        `Provider ${providerName} blacklisted due to consecutive failures`,
        { failureCount },
      );
      return healthStatus;
    }

    const startTime = Date.now();
    const healthStatus: ProviderHealthStatusOptions = {
      provider: providerName,
      isHealthy: false,
      isConfigured: false,
      hasApiKey: false,
      lastChecked: new Date(),
      configurationIssues: [],
      recommendations: [],
    };

    try {
      // 1. Check environment configuration
      await this.checkEnvironmentConfiguration(providerName, healthStatus);

      // 2. Check API key validity (basic format validation)
      await this.checkApiKeyValidity(providerName, healthStatus);

      // 3. Optional: Connectivity test
      if (includeConnectivityTest) {
        await this.checkConnectivity(providerName, healthStatus, timeout);
      }

      // 4. Optional: Model validation
      if (includeModelValidation) {
        await this.checkModelAvailability(providerName, healthStatus);
      }

      // 5. Determine overall health
      healthStatus.isHealthy =
        healthStatus.isConfigured &&
        healthStatus.hasApiKey &&
        healthStatus.configurationIssues.length === 0;

      healthStatus.responseTime = Date.now() - startTime;

      // Cache results
      if (cacheResults) {
        this.healthCache.set(providerName, {
          status: healthStatus,
          timestamp: Date.now(),
        });
      }

      // Reset failure count on success
      if (healthStatus.isHealthy) {
        this.consecutiveFailures.delete(providerName);
      } else {
        // Track consecutive failures
        const currentFailures = this.consecutiveFailures.get(providerName) || 0;
        this.consecutiveFailures.set(providerName, currentFailures + 1);
      }

      logger.debug(`Health check completed for ${providerName}`, {
        isHealthy: healthStatus.isHealthy,
        responseTime: healthStatus.responseTime,
        issues: healthStatus.configurationIssues.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      healthStatus.error = errorMessage;
      healthStatus.configurationIssues.push(
        `Health check failed: ${errorMessage}`,
      );
      healthStatus.responseTime = Date.now() - startTime;

      // Track consecutive failures
      const currentFailures = this.consecutiveFailures.get(providerName) || 0;
      this.consecutiveFailures.set(providerName, currentFailures + 1);

      logger.warn(`Health check failed for ${providerName}`, {
        error: errorMessage,
        consecutiveFailures: currentFailures + 1,
      });
    }

    return healthStatus;
  }

  /**
   * Check environment configuration for a provider
   */
  private static async checkEnvironmentConfiguration(
    providerName: AIProviderName,
    healthStatus: ProviderHealthStatusOptions,
  ): Promise<void> {
    const requiredEnvVars = this.getRequiredEnvironmentVariables(providerName);

    logger.debug(
      `[ProviderHealthChecker] Checking environment configuration for ${providerName}`,
      {
        requiredEnvVars,
        presentEnvVars: requiredEnvVars.map((envVar) => ({
          name: envVar,
          present: !!process.env[envVar],
          hasValue: !!(
            process.env[envVar] && process.env[envVar].trim() !== ""
          ),
        })),
      },
    );

    let allConfigured = true;
    const missingVars: string[] = [];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (!value || value.trim() === "") {
        allConfigured = false;
        missingVars.push(envVar);
      }
    }

    healthStatus.isConfigured = allConfigured;

    logger.debug(
      `[ProviderHealthChecker] Environment configuration result for ${providerName}`,
      {
        isConfigured: allConfigured,
        missingVars,
        totalRequired: requiredEnvVars.length,
        totalMissing: missingVars.length,
      },
    );

    if (!allConfigured) {
      healthStatus.configurationIssues.push(
        `Missing required environment variables: ${missingVars.join(", ")}`,
      );
      healthStatus.recommendations.push(
        `Set the following environment variables: ${missingVars.join(", ")}`,
      );
    }

    // Provider-specific configuration checks
    await this.checkProviderSpecificConfig(providerName, healthStatus);
  }

  /**
   * Check API key validity (format validation)
   */
  private static async checkApiKeyValidity(
    providerName: AIProviderName,
    healthStatus: ProviderHealthStatusOptions,
  ): Promise<void> {
    // 🎯 SPECIAL HANDLING FOR VERTEX AI: Check both auth methods
    if (providerName === AIProviderName.VERTEX) {
      logger.debug("Vertex AI authentication check starting", {
        providerName,
      });

      // Method 1: Check GOOGLE_APPLICATION_CREDENTIALS (file-based)
      const credentialsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      let fileBasedAuthValid = false;

      if (credentialsFile) {
        logger.debug("Checking GOOGLE_APPLICATION_CREDENTIALS file");

        try {
          const { promises: fs } = await import("fs");
          try {
            await fs.access(credentialsFile);
            fileBasedAuthValid = true;
          } catch {
            fileBasedAuthValid = false;
          }
          logger.debug("File auth check result", {
            fileExists: fileBasedAuthValid,
          });
        } catch (error) {
          logger.debug("File auth check error", {
            error: String(error),
          });
          fileBasedAuthValid = false;
        }
      }

      // Method 2: Check individual environment variables
      const hasIndividualAuth = !!(
        process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
        process.env.GOOGLE_AUTH_PRIVATE_KEY
      );

      logger.debug("Individual auth check", {
        hasClientEmail: !!process.env.GOOGLE_AUTH_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_AUTH_PRIVATE_KEY,
        hasIndividualAuth,
      });

      // Vertex is valid if EITHER auth method works
      const hasValidAuth = fileBasedAuthValid || hasIndividualAuth;

      logger.debug("Vertex auth final result", {
        fileBasedAuthValid,
        hasIndividualAuth,
        hasValidAuth,
      });

      if (hasValidAuth) {
        healthStatus.hasApiKey = true;
        logger.debug("Vertex auth SUCCESS", {
          authMethod: fileBasedAuthValid ? "file-based" : "individual-env-vars",
        });
      } else {
        healthStatus.hasApiKey = false;
        healthStatus.configurationIssues.push(
          `Vertex AI authentication not found: neither GOOGLE_APPLICATION_CREDENTIALS file nor individual credentials (GOOGLE_AUTH_CLIENT_EMAIL + GOOGLE_AUTH_PRIVATE_KEY) are properly configured`,
        );
        logger.debug("Vertex auth FAILED", {
          reason: "No valid auth method found",
        });
      }
      return;
    }

    // Providers that don't use API keys directly
    if (
      providerName === AIProviderName.OLLAMA ||
      providerName === AIProviderName.BEDROCK
    ) {
      healthStatus.hasApiKey = true;
      return;
    }

    // 🔧 STANDARD HANDLING FOR OTHER PROVIDERS
    const apiKeyVar = this.getApiKeyEnvironmentVariable(providerName);
    const apiKey = process.env[apiKeyVar];

    if (!apiKey) {
      healthStatus.hasApiKey = false;
      healthStatus.configurationIssues.push(
        `API key not found in ${apiKeyVar}`,
      );
      return;
    }

    // Basic format validation
    const isValidFormat = this.validateApiKeyFormat(providerName, apiKey);

    if (!isValidFormat) {
      healthStatus.hasApiKey = false;
      healthStatus.configurationIssues.push(
        `API key format appears invalid for ${providerName}`,
      );
      healthStatus.recommendations.push(
        `Verify the API key format for ${providerName}`,
      );
    } else {
      healthStatus.hasApiKey = true;
    }
  }

  /**
   * Check connectivity to provider endpoints
   */
  private static async checkConnectivity(
    providerName: AIProviderName,
    healthStatus: ProviderHealthStatusOptions,
    timeout: number,
  ): Promise<void> {
    const endpoint = this.getProviderHealthEndpoint(providerName);

    if (!endpoint) {
      healthStatus.warning = "No connectivity test available for this provider";
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const proxyFetch = createProxyFetch();
      let response = await proxyFetch(endpoint, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "NeuroLink-HealthCheck/1.0",
        },
      });

      // Fallback to GET if HEAD returns 405 (Method Not Allowed) for restrictive gateways
      if (response.status === 405) {
        response = await proxyFetch(endpoint, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "User-Agent": "NeuroLink-HealthCheck/1.0",
          },
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        healthStatus.configurationIssues.push(
          `Connectivity test failed: HTTP ${response.status}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Provide specific error messages for common network issues
      if (errorMessage.includes("abort")) {
        healthStatus.configurationIssues.push(
          `Connectivity test timed out after ${timeout}ms`,
        );
      } else if (
        errorMessage.includes("ENOTFOUND") ||
        errorMessage.includes("getaddrinfo")
      ) {
        healthStatus.configurationIssues.push(
          `DNS resolution failed: Cannot resolve hostname for ${providerName}`,
        );
      } else if (errorMessage.includes("ECONNREFUSED")) {
        healthStatus.configurationIssues.push(
          `Connection refused: ${providerName} service is not accepting connections`,
        );
      } else if (errorMessage.includes("ETIMEDOUT")) {
        healthStatus.configurationIssues.push(
          `Connection timeout: ${providerName} service did not respond`,
        );
      } else if (
        errorMessage.includes("certificate") ||
        errorMessage.includes("SSL") ||
        errorMessage.includes("TLS")
      ) {
        healthStatus.configurationIssues.push(
          `SSL/TLS certificate error: ${providerName} has certificate issues`,
        );
      } else if (errorMessage.includes("ECONNRESET")) {
        healthStatus.configurationIssues.push(
          `Connection reset: ${providerName} terminated the connection`,
        );
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("offline")
      ) {
        healthStatus.configurationIssues.push(
          `Network error: Check internet connectivity and firewall settings`,
        );
      } else {
        healthStatus.configurationIssues.push(
          `Connectivity test failed: ${errorMessage}`,
        );
      }
    }
  }

  /**
   * Check model availability (if possible without making API calls)
   */
  private static async checkModelAvailability(
    providerName: AIProviderName,
    healthStatus: ProviderHealthStatusOptions,
  ): Promise<void> {
    // Basic model name validation and recommendations
    const commonModels = this.getCommonModelsForProvider(providerName);

    if (commonModels.length > 0) {
      if (providerName === AIProviderName.VERTEX) {
        // Provide detailed information about dual provider architecture
        healthStatus.recommendations.push(
          `Available models for ${providerName} (using dual provider architecture):\n` +
            `  Google Models (via vertex provider):\n` +
            `    • gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite\n` +
            `    • gemini-2.0-flash-001, gemini-1.5-pro, gemini-1.5-flash\n` +
            `  Anthropic Models (via vertexAnthropic provider):\n` +
            `    • claude-opus-4-5-20251101 (Latest flagship)\n` +
            `    • claude-sonnet-4@20250514, claude-opus-4@20250514\n` +
            `    • claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022\n` +
            `    • claude-3-sonnet-20240229, claude-3-haiku-20240307, claude-3-opus-20240229\n` +
            `  Implementation: Uses @ai-sdk/google-vertex with dual provider setup\n` +
            `  Authentication: Requires Google Cloud project with Vertex AI API enabled\n` +
            `  Note: Anthropic models require Anthropic integration in your Google Cloud project`,
        );
      } else {
        healthStatus.recommendations.push(
          `Common models for ${providerName}: ${commonModels.slice(0, 3).join(", ")}`,
        );
      }
    }
  }

  /**
   * Get required environment variables for a provider
   */
  private static getRequiredEnvironmentVariables(
    providerName: AIProviderName,
  ): string[] {
    switch (providerName) {
      case AIProviderName.ANTHROPIC:
        return ["ANTHROPIC_API_KEY"];
      case AIProviderName.OPENAI:
        return ["OPENAI_API_KEY"];
      case AIProviderName.VERTEX:
        // Vertex AI requires authentication, but not via a single environment variable.
        // Authentication can be provided via a credential file or individual credentials + project.
        // The required authentication is checked in checkProviderSpecificConfig instead of here.
        // Returning an empty array here does NOT mean authentication is not required.
        return [];
      case AIProviderName.GOOGLE_AI:
        return ["GOOGLE_AI_API_KEY"];
      case AIProviderName.BEDROCK:
        // Bedrock credentials are resolved via AWS SDK default provider chain.
        // Region/auth validated in provider-specific checks.
        return [];
      case AIProviderName.AZURE:
        return ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"];
      case AIProviderName.OLLAMA:
        return []; // Ollama typically doesn't require API keys
      default:
        return [];
    }
  }

  /**
   * Get API key environment variable for a provider
   */
  private static getApiKeyEnvironmentVariable(
    providerName: AIProviderName,
  ): string {
    switch (providerName) {
      case AIProviderName.ANTHROPIC:
        return "ANTHROPIC_API_KEY";
      case AIProviderName.OPENAI:
        return "OPENAI_API_KEY";
      case AIProviderName.VERTEX:
        return "GOOGLE_APPLICATION_CREDENTIALS";
      case AIProviderName.GOOGLE_AI:
        return "GOOGLE_AI_API_KEY";
      case AIProviderName.BEDROCK:
        return "AWS_ACCESS_KEY_ID";
      case AIProviderName.AZURE:
        return "AZURE_OPENAI_API_KEY";
      case AIProviderName.OLLAMA:
        return "OLLAMA_API_BASE";
      default:
        return "";
    }
  }

  /**
   * Validate API key format for a provider
   */
  private static validateApiKeyFormat(
    providerName: AIProviderName,
    apiKey: string,
  ): boolean {
    switch (providerName) {
      case AIProviderName.ANTHROPIC:
        return (
          apiKey.startsWith("sk-ant-") &&
          apiKey.length >= API_KEY_LENGTHS.ANTHROPIC_MIN
        );
      case AIProviderName.OPENAI:
        return (
          apiKey.startsWith("sk-") &&
          apiKey.length >= API_KEY_LENGTHS.OPENAI_MIN
        );
      case AIProviderName.GOOGLE_AI:
        return apiKey.length >= API_KEY_LENGTHS.GOOGLE_AI_EXACT; // Basic length check
      case AIProviderName.VERTEX:
        return apiKey.endsWith(".json") || apiKey.includes("type"); // JSON key format
      case AIProviderName.BEDROCK:
        return apiKey.length >= API_KEY_LENGTHS.AWS_ACCESS_KEY; // AWS access key length
      case AIProviderName.AZURE:
        return apiKey.length >= API_KEY_LENGTHS.AZURE_MIN; // Azure OpenAI API key length
      case AIProviderName.OLLAMA:
        return true; // Ollama usually doesn't require specific format
      default:
        return true; // Default to true for unknown providers
    }
  }

  /**
   * Get health check endpoint for connectivity testing
   */
  private static getProviderHealthEndpoint(
    providerName: AIProviderName,
  ): string | null {
    switch (providerName) {
      case AIProviderName.ANTHROPIC:
        return null; // Anthropic doesn't have a public health endpoint
      case AIProviderName.OPENAI:
        return "https://api.openai.com/v1/models";
      case AIProviderName.GOOGLE_AI:
        return null; // No public health endpoint
      case AIProviderName.VERTEX:
        return null; // Complex authentication required
      case AIProviderName.BEDROCK:
        return null; // AWS endpoints vary by region
      case AIProviderName.OLLAMA:
        return "http://localhost:11434/api/version";
      default:
        return null;
    }
  }

  /**
   * Provider-specific configuration checks
   */
  private static async checkProviderSpecificConfig(
    providerName: AIProviderName,
    healthStatus: ProviderHealthStatusOptions,
  ): Promise<void> {
    switch (providerName) {
      case AIProviderName.VERTEX:
        await this.checkVertexAIConfig(healthStatus);
        break;
      case AIProviderName.BEDROCK:
        await this.checkBedrockConfig(healthStatus);
        break;
      case AIProviderName.AZURE:
        await this.checkAzureConfig(healthStatus);
        break;
      case AIProviderName.OLLAMA:
        await this.checkOllamaConfig(healthStatus);
        break;
    }
  }

  /**
   * Check Vertex AI configuration
   */
  private static async checkVertexAIConfig(
    healthStatus: ProviderHealthStatusOptions,
  ): Promise<void> {
    logger.debug("Starting Vertex AI health check");

    const projectId = this.getVertexProjectId();
    if (!projectId) {
      healthStatus.configurationIssues.push("Google Cloud project ID not set");
      healthStatus.recommendations.push(
        "Set one of: GOOGLE_VERTEX_PROJECT, GOOGLE_CLOUD_PROJECT_ID, GOOGLE_PROJECT_ID, or GOOGLE_CLOUD_PROJECT",
      );
    }

    const hasValidAuth = await this.checkVertexAuthentication(healthStatus);

    if (projectId && hasValidAuth) {
      healthStatus.isConfigured = true;
      logger.debug("Vertex AI health check PASSED");
    } else {
      logger.debug("Vertex AI health check FAILED");
    }
  }

  /**
   * Get Vertex AI project ID from environment variables
   */
  private static getVertexProjectId(): string | undefined {
    return (
      process.env.GOOGLE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT_ID ||
      process.env.GOOGLE_VERTEX_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.VERTEX_PROJECT_ID
    );
  }

  /**
   * Check Vertex AI authentication
   */
  private static async checkVertexAuthentication(
    healthStatus: ProviderHealthStatusOptions,
  ): Promise<boolean> {
    let hasValidAuth = false;

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      hasValidAuth = await this.checkGoogleApplicationCredentials(healthStatus);
    }

    if (!hasValidAuth) {
      hasValidAuth = this.checkIndividualGoogleCredentials(healthStatus);
    }

    if (!hasValidAuth) {
      healthStatus.configurationIssues.push(
        "Google Cloud authentication not configured or credentials file missing",
      );
      healthStatus.recommendations.push(
        "Set either GOOGLE_APPLICATION_CREDENTIALS (valid file path), GOOGLE_SERVICE_ACCOUNT_KEY (base64), or both GOOGLE_AUTH_CLIENT_EMAIL and GOOGLE_AUTH_PRIVATE_KEY",
      );
    }

    return hasValidAuth;
  }

  /**
   * Check Google Application Credentials file
   */
  private static async checkGoogleApplicationCredentials(
    healthStatus: ProviderHealthStatusOptions,
  ): Promise<boolean> {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentialsPath) {
      healthStatus.warning =
        "GOOGLE_APPLICATION_CREDENTIALS environment variable not set";
      return false;
    }

    try {
      const { promises: fs } = await import("fs");
      await fs.access(credentialsPath);

      const fileName = basename(credentialsPath);
      const jsonFilePattern = /\.json(\.\w+)?$/;
      if (!jsonFilePattern.test(fileName)) {
        healthStatus.warning =
          "GOOGLE_APPLICATION_CREDENTIALS should point to a JSON file";
      }

      healthStatus.hasApiKey = true;
      return true;
    } catch {
      healthStatus.warning = `GOOGLE_APPLICATION_CREDENTIALS file does not exist: ${credentialsPath}`;
      return false;
    }
  }

  /**
   * Check individual Google credentials
   */
  private static checkIndividualGoogleCredentials(
    healthStatus: ProviderHealthStatusOptions,
  ): boolean {
    const hasServiceAccountKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const hasIndividualCredentials = !!(
      process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
      process.env.GOOGLE_AUTH_PRIVATE_KEY
    );

    if (hasServiceAccountKey || hasIndividualCredentials) {
      healthStatus.hasApiKey = true;
      return true;
    }

    return false;
  }

  /**
   * Check AWS Bedrock configuration
   */
  private static async checkBedrockConfig(
    healthStatus: ProviderHealthStatusOptions,
  ): Promise<void> {
    logger.debug("Starting AWS Bedrock comprehensive health check");

    this.checkAWSRegion(healthStatus);
    this.checkAWSCredentials(healthStatus);
    this.checkBedrockModels(healthStatus);
    this.checkBedrockEndpoint(healthStatus);

    if (healthStatus.configurationIssues.length === 0) {
      healthStatus.hasApiKey = true;
      logger.debug("AWS Bedrock configuration appears valid");
    }
  }

  /**
   * Check AWS region configuration
   */
  private static checkAWSRegion(
    healthStatus: ProviderHealthStatusOptions,
  ): void {
    const awsRegion = process.env.AWS_REGION;
    const validBedrockRegions = [
      "us-east-1",
      "us-west-2",
      "ap-southeast-1",
      "ap-northeast-1",
      "eu-central-1",
      "eu-west-1",
      "ap-south-1",
    ];

    if (!awsRegion) {
      healthStatus.configurationIssues.push("AWS_REGION not set");
      healthStatus.recommendations.push(
        `Set AWS_REGION to a Bedrock-supported region: ${validBedrockRegions.join(", ")}`,
      );
    } else if (!validBedrockRegions.includes(awsRegion)) {
      healthStatus.configurationIssues.push(
        `AWS_REGION '${awsRegion}' may not support all Bedrock models`,
      );
      healthStatus.recommendations.push(
        `Consider using a primary Bedrock region: ${validBedrockRegions.slice(0, 3).join(", ")}`,
      );
    }
  }

  /**
   * Check AWS credentials
   */
  private static checkAWSCredentials(
    healthStatus: ProviderHealthStatusOptions,
  ): void {
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsProfile = process.env.AWS_PROFILE;

    if (!awsAccessKeyId && !awsProfile) {
      healthStatus.configurationIssues.push("No AWS credentials found");
      healthStatus.recommendations.push(
        "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or configure AWS_PROFILE",
      );
    } else if (awsAccessKeyId && !awsSecretAccessKey) {
      healthStatus.configurationIssues.push(
        "AWS_ACCESS_KEY_ID set but AWS_SECRET_ACCESS_KEY missing",
      );
      healthStatus.recommendations.push(
        "Set AWS_SECRET_ACCESS_KEY to match your AWS_ACCESS_KEY_ID",
      );
    }
  }

  /**
   * Check Bedrock models
   */
  private static checkBedrockModels(
    healthStatus: ProviderHealthStatusOptions,
  ): void {
    const bedrockModel =
      process.env.BEDROCK_MODEL || process.env.BEDROCK_MODEL_ID;
    const supportedModels = [
      BedrockModels.CLAUDE_4_5_OPUS,
      BedrockModels.CLAUDE_3_5_SONNET,
      BedrockModels.CLAUDE_3_SONNET,
      BedrockModels.CLAUDE_3_HAIKU,
      "anthropic.claude-v2:1",
      "amazon.titan-text-express-v1",
    ];

    if (!bedrockModel) {
      healthStatus.recommendations.push(
        `Set BEDROCK_MODEL or BEDROCK_MODEL_ID for faster startup (e.g., ${BedrockModels.CLAUDE_4_5_OPUS})`,
      );
    } else if (!supportedModels.includes(bedrockModel)) {
      healthStatus.recommendations.push(
        `Consider using a popular Bedrock model: ${supportedModels.slice(0, 3).join(", ")}`,
      );
    }
  }

  /**
   * Check Bedrock endpoint
   */
  private static checkBedrockEndpoint(
    healthStatus: ProviderHealthStatusOptions,
  ): void {
    const bedrockEndpoint = process.env.BEDROCK_ENDPOINT_URL;
    if (bedrockEndpoint && !bedrockEndpoint.startsWith("https://")) {
      healthStatus.configurationIssues.push(
        "BEDROCK_ENDPOINT_URL should use HTTPS",
      );
      healthStatus.recommendations.push(
        "Update BEDROCK_ENDPOINT_URL to use HTTPS protocol",
      );
    }
  }

  /**
   * Check Azure OpenAI configuration
   */
  private static async checkAzureConfig(
    healthStatus: ProviderHealthStatusOptions,
  ): Promise<void> {
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    if (azureEndpoint && !azureEndpoint.startsWith("https://")) {
      healthStatus.configurationIssues.push(
        "Invalid AZURE_OPENAI_ENDPOINT format",
      );
      healthStatus.recommendations.push(
        "Set AZURE_OPENAI_ENDPOINT to a valid URL (e.g., https://your-resource.openai.azure.com/)",
      );
    }

    // Check for deployment name using the SAME logic as the Azure provider
    const deploymentName =
      process.env.AZURE_OPENAI_MODEL ||
      process.env.AZURE_OPENAI_DEPLOYMENT ||
      process.env.AZURE_OPENAI_DEPLOYMENT_ID;

    if (!deploymentName) {
      healthStatus.configurationIssues.push("No Azure deployment specified");
      healthStatus.recommendations.push(
        "Set one of: AZURE_OPENAI_MODEL, AZURE_OPENAI_DEPLOYMENT, or AZURE_OPENAI_DEPLOYMENT_ID",
      );
    }
  }

  /**
   * Check Ollama configuration
   */
  private static async checkOllamaConfig(
    healthStatus: ProviderHealthStatusOptions,
  ): Promise<void> {
    const ollamaBase = process.env.OLLAMA_API_BASE || "http://localhost:11434";
    if (!ollamaBase.startsWith("http")) {
      healthStatus.configurationIssues.push("Invalid OLLAMA_API_BASE format");
      healthStatus.recommendations.push(
        "Set OLLAMA_API_BASE to a valid URL (e.g., http://localhost:11434)",
      );
    }
  }

  /**
   * Get common models for a provider
   */
  private static getCommonModelsForProvider(
    providerName: AIProviderName,
  ): string[] {
    switch (providerName) {
      case AIProviderName.ANTHROPIC:
        return [
          AnthropicModels.CLAUDE_4_5_OPUS,
          AnthropicModels.CLAUDE_3_5_SONNET,
          AnthropicModels.CLAUDE_3_5_HAIKU,
          AnthropicModels.CLAUDE_3_OPUS,
        ];
      case AIProviderName.OPENAI:
        return [
          OpenAIModels.GPT_4O,
          OpenAIModels.GPT_4O_MINI,
          OpenAIModels.GPT_3_5_TURBO,
        ];
      case AIProviderName.GOOGLE_AI:
        return [
          GoogleAIModels.GEMINI_1_5_PRO,
          GoogleAIModels.GEMINI_1_5_FLASH,
          GoogleAIModels.GEMINI_2_5_PRO,
        ];
      case AIProviderName.VERTEX:
        return [
          // Google models (via vertex provider)
          GoogleAIModels.GEMINI_2_5_PRO,
          GoogleAIModels.GEMINI_2_5_FLASH,
          GoogleAIModels.GEMINI_2_5_FLASH_LITE,
          GoogleAIModels.GEMINI_2_0_FLASH_001,
          GoogleAIModels.GEMINI_1_5_PRO,
          GoogleAIModels.GEMINI_1_5_FLASH,
          // Anthropic models (via vertexAnthropic provider)
          "claude-opus-4-5-20251101",
          "claude-sonnet-4@20250514",
          "claude-opus-4@20250514",
          AnthropicModels.CLAUDE_3_5_SONNET,
          AnthropicModels.CLAUDE_3_5_HAIKU,
          AnthropicModels.CLAUDE_3_SONNET,
          AnthropicModels.CLAUDE_3_HAIKU,
          AnthropicModels.CLAUDE_3_OPUS,
        ];
      case AIProviderName.BEDROCK:
        return [
          BedrockModels.CLAUDE_4_5_OPUS,
          BedrockModels.CLAUDE_3_5_SONNET,
          BedrockModels.CLAUDE_3_SONNET,
          BedrockModels.CLAUDE_3_HAIKU,
        ];
      case AIProviderName.AZURE:
        return [OpenAIModels.GPT_4O, OpenAIModels.GPT_4O_MINI, "gpt-35-turbo"];
      case AIProviderName.OLLAMA:
        return ["llama3.2:latest", "llama3.1:latest", "mistral:latest"];
      default:
        return [];
    }
  }

  /**
   * Get cached health status if still valid
   */
  private static getCachedHealth(
    providerName: AIProviderName,
    maxAge: number,
  ): ProviderHealthStatusOptions | null {
    const cached = this.healthCache.get(providerName);

    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;

    if (age > maxAge) {
      this.healthCache.delete(providerName);
      return null;
    }

    return cached.status;
  }

  /**
   * Check if Vertex AI supports Anthropic models (dual provider architecture)
   */
  static async checkVertexAnthropicSupport(): Promise<{
    isSupported: boolean;
    hasCreateVertexAnthropic: boolean;
    hasCorrectTypes: boolean;
    hasValidProject: boolean;
    hasRegionalSupport: boolean;
    hasNetworkAccess: boolean;
    hasAnthropicModels: boolean;
    authentication: {
      isValid: boolean;
      method: string;
      issues: string[];
    };
    projectConfiguration: {
      isValid: boolean;
      projectId: string | undefined;
      region: string | undefined;
      issues: string[];
    };
    modelSupport: {
      availableModels: string[];
      recommendedModels: string[];
      deprecatedModels: string[];
    };
    recommendations: string[];
    troubleshooting: string[];
  }> {
    const result = {
      isSupported: false,
      hasCreateVertexAnthropic: false,
      hasCorrectTypes: false,
      hasValidProject: false,
      hasRegionalSupport: false,
      hasNetworkAccess: false,
      hasAnthropicModels: false,
      authentication: {
        isValid: false,
        method: "none",
        issues: [] as string[],
      },
      projectConfiguration: {
        isValid: false,
        projectId: undefined as string | undefined,
        region: undefined as string | undefined,
        issues: [] as string[],
      },
      modelSupport: {
        availableModels: [] as string[],
        recommendedModels: [
          "claude-opus-4-5-20251101",
          "claude-sonnet-4@20250514",
          "claude-opus-4@20250514",
          "claude-3-5-sonnet-20241022",
          "claude-3-5-haiku-20241022",
          "claude-3-sonnet-20240229",
          "claude-3-haiku-20240307",
        ],
        deprecatedModels: [
          "claude-3-opus-20240229", // Still available but newer versions preferred
        ],
      },
      recommendations: [] as string[],
      troubleshooting: [] as string[],
    };

    logger.debug(
      "Starting comprehensive Vertex Anthropic support verification",
    );

    try {
      // 1. Check SDK module availability
      logger.debug(
        "Checking @ai-sdk/google-vertex/anthropic module availability",
      );
      const anthropicModule = await import("@ai-sdk/google-vertex/anthropic");

      result.hasCreateVertexAnthropic =
        typeof anthropicModule.createVertexAnthropic === "function";
      result.hasCorrectTypes = true; // Types are bundled with the function

      if (!result.hasCreateVertexAnthropic) {
        result.troubleshooting.push(
          "📦 Update @ai-sdk/google-vertex to latest version with Anthropic support",
          "🔄 Run: npm install @ai-sdk/google-vertex@latest",
          "📖 See: https://sdk.vercel.ai/providers/ai-sdk-providers/google-vertex#anthropic-models",
        );
        return result;
      }

      logger.debug("SDK module verified successfully");

      // 2. Comprehensive Authentication Validation
      logger.debug("Starting authentication validation");
      result.authentication = await this.validateVertexAuthentication();

      if (!result.authentication.isValid) {
        result.troubleshooting.push(
          "🔐 Fix authentication configuration:",
          "  Option 1: Set GOOGLE_APPLICATION_CREDENTIALS to valid service account file",
          "  Option 2: Set individual env vars: GOOGLE_AUTH_CLIENT_EMAIL, GOOGLE_AUTH_PRIVATE_KEY",
          "📖 See: https://cloud.google.com/docs/authentication/provide-credentials-adc",
        );
      }

      // 3. Project Configuration Validation
      logger.debug("Starting project configuration validation");
      result.projectConfiguration =
        await this.validateVertexProjectConfiguration();
      result.hasValidProject = result.projectConfiguration.isValid;

      if (!result.hasValidProject) {
        result.troubleshooting.push(
          "🏗️ Fix project configuration:",
          "  Set GOOGLE_VERTEX_PROJECT or GOOGLE_CLOUD_PROJECT environment variable",
          "  Ensure project exists and has Vertex AI API enabled",
          "📖 See: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com",
        );
      }

      // 4. Regional Support Validation
      logger.debug("Starting regional support validation");
      result.hasRegionalSupport = await this.checkVertexRegionalSupport(
        result.projectConfiguration.region,
      );

      if (!result.hasRegionalSupport) {
        result.troubleshooting.push(
          "🌍 Regional support issues:",
          "  Anthropic models may not be available in your region",
          "  Try regions: us-central1, us-east4, europe-west1, asia-southeast1",
          "  Set GOOGLE_CLOUD_LOCATION environment variable",
        );
      }

      // 5. Network Connectivity Check (non-blocking)
      logger.debug("Starting network connectivity check");
      result.hasNetworkAccess = await this.checkVertexNetworkConnectivity(
        result.projectConfiguration.region || "us-central1",
      );

      if (!result.hasNetworkAccess) {
        result.troubleshooting.push(
          "🌐 Network connectivity issues:",
          "  Check proxy configuration if behind corporate firewall",
          "  Verify DNS resolution for *.googleapis.com",
          "  Ensure firewall allows HTTPS to Google Cloud endpoints",
        );
      }

      // 6. Anthropic Model Integration Check
      logger.debug("Starting Anthropic model integration check");
      result.hasAnthropicModels = await this.checkAnthropicModelIntegration(
        result.projectConfiguration.projectId,
        result.projectConfiguration.region,
      );

      if (!result.hasAnthropicModels) {
        result.troubleshooting.push(
          "🤖 Anthropic model integration issues:",
          "  Enable Anthropic integration in Google Cloud Console",
          "  Navigate to: Vertex AI > Model Garden > Anthropic",
          "  Accept terms and enable Claude model access",
          "📖 See: https://console.cloud.google.com/vertex-ai/publishers/anthropic",
        );
      }

      // Calculate overall support status
      result.isSupported =
        result.hasCreateVertexAnthropic &&
        result.authentication.isValid &&
        result.hasValidProject &&
        result.hasRegionalSupport;
      // Note: Network and model integration are nice-to-have but not blocking

      // Generate comprehensive recommendations
      if (result.isSupported) {
        result.recommendations.push(
          "✅ Vertex Anthropic support is fully configured",
          "✅ Claude models are available via vertexAnthropic provider",
          `✅ Authentication: ${result.authentication.method}`,
          `✅ Project: ${result.projectConfiguration.projectId}`,
          `✅ Region: ${result.projectConfiguration.region}`,
        );

        if (result.hasNetworkAccess) {
          result.recommendations.push("✅ Network connectivity verified");
        } else {
          result.recommendations.push(
            "⚠️ Network connectivity not verified (may still work)",
          );
        }

        if (result.hasAnthropicModels) {
          result.recommendations.push(
            "✅ Anthropic model integration verified",
          );
        } else {
          result.recommendations.push(
            "⚠️ Anthropic model integration not verified",
          );
        }

        result.recommendations.push(
          "",
          "🎯 Recommended Claude models:",
          ...result.modelSupport.recommendedModels.map(
            (model) => `  • ${model}`,
          ),
          "",
          "📚 Usage example:",
          '  const vertex = new GoogleVertexProvider("claude-3-5-sonnet-20241022")',
          '  const result = await vertex.generate("Hello, Claude!")',
        );

        logger.info("Vertex Anthropic support verification: FULLY_SUPPORTED");
      } else {
        const missingComponents = [];
        if (!result.hasCreateVertexAnthropic) {
          missingComponents.push("SDK module");
        }
        if (!result.authentication.isValid) {
          missingComponents.push("authentication");
        }
        if (!result.hasValidProject) {
          missingComponents.push("project configuration");
        }
        if (!result.hasRegionalSupport) {
          missingComponents.push("regional support");
        }

        result.recommendations.push(
          `⚠️ Vertex Anthropic support partially available`,
          `❌ Missing: ${missingComponents.join(", ")}`,
          "",
          "🔧 Quick fixes needed:",
        );
        result.recommendations.push(...result.troubleshooting);

        logger.warn(
          "Vertex Anthropic support verification: PARTIALLY_SUPPORTED",
          {
            missingComponents,
            hasBasicSupport: result.hasCreateVertexAnthropic,
            authenticationValid: result.authentication.isValid,
            projectValid: result.hasValidProject,
          },
        );
      }
    } catch (error) {
      logger.error("Vertex Anthropic support check failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      result.recommendations.push(
        "❌ Comprehensive Anthropic support check failed",
        `🐛 Error: ${error instanceof Error ? error.message : String(error)}`,
        "",
        "🔧 Troubleshooting steps:",
        "1. Update @ai-sdk/google-vertex to latest version",
        "2. Verify Google Cloud authentication setup",
        "3. Check project ID and region configuration",
        "4. Enable Vertex AI API in Google Cloud Console",
        "5. Enable Anthropic integration in Vertex AI Model Garden",
      );
    }

    return result;
  }

  /**
   * Validate Vertex AI authentication configuration
   */
  private static async validateVertexAuthentication(): Promise<{
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
          const { promises: fs } = await import("fs");
          try {
            await fs.access(credentialsPath);
            // Validate JSON structure
            const credentialsContent = await fs.readFile(
              credentialsPath,
              "utf8",
            );
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
            } else {
              result.issues.push(
                "Service account file missing required fields",
              );
            }
          } catch {
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

      // Check for Application Default Credentials (ADC)
      try {
        // This is a simple heuristic - in real implementation you'd use Google Auth library
        if (process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT) {
          result.method = "application_default_credentials";
          result.isValid = true; // Assume valid if environment suggests ADC
          return result;
        }
      } catch (adcError) {
        result.issues.push(`ADC check failed: ${adcError}`);
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
  private static async validateVertexProjectConfiguration(): Promise<{
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
      if (PROJECT_ID_FORMAT.PATTERN.test(projectId)) {
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
  private static async checkVertexRegionalSupport(
    region: string = "us-central1",
  ): Promise<boolean> {
    // Based on Google Cloud documentation, these regions support Anthropic models
    const supportedRegions = [
      "us-central1",
      "us-east4",
      "us-west1",
      "us-west4",
      "europe-west1",
      "europe-west4",
      "asia-southeast1",
      "asia-northeast1",
    ];

    const isSupported = supportedRegions.includes(region);

    logger.debug("Regional support check", {
      region,
      isSupported,
      supportedRegions,
    });

    return isSupported;
  }

  /**
   * Check network connectivity to Vertex AI endpoints
   */
  private static async checkVertexNetworkConnectivity(
    region: string = "us-central1",
  ): Promise<boolean> {
    try {
      const endpoint = `https://${region}-aiplatform.googleapis.com`;

      // Simple connectivity check with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const proxyFetch = createProxyFetch();
      let response = await proxyFetch(endpoint, {
        method: "HEAD",
        signal: controller.signal,
      });

      // Fallback to GET if HEAD returns 405 (Method Not Allowed) for restrictive gateways
      if (response.status === 405) {
        response = await proxyFetch(endpoint, {
          method: "GET",
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      // Any response (even 401/403) indicates network connectivity
      const isConnected = response.status !== undefined;

      logger.debug("Network connectivity check", {
        endpoint,
        status: response.status,
        isConnected,
      });

      return isConnected;
    } catch (error) {
      logger.debug("Network connectivity check failed", {
        region,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Check if Anthropic model integration is enabled in the project
   */
  private static async checkAnthropicModelIntegration(
    projectId?: string,
    region: string = "us-central1",
  ): Promise<boolean> {
    if (!projectId) {
      logger.debug("Cannot check Anthropic integration without project ID");
      return false;
    }

    try {
      // This is a simplified check - in a real implementation, you would:
      // 1. Use Google Cloud APIs to check model availability
      // 2. Verify Anthropic integration status
      // 3. Check model access permissions

      // For now, we'll do a basic endpoint check
      const modelEndpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/anthropic/models`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const proxyFetch = createProxyFetch();
      let response = await proxyFetch(modelEndpoint, {
        method: "HEAD",
        signal: controller.signal,
      });

      // Fallback to GET if HEAD returns 405 (Method Not Allowed) for restrictive gateways
      if (response.status === 405) {
        response = await proxyFetch(modelEndpoint, {
          method: "GET",
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      // Status 200 or 401/403 suggests the endpoint exists (integration enabled)
      // Status 404 suggests integration not enabled
      const integrationEnabled = response.status !== 404;

      logger.debug("Anthropic integration check", {
        projectId,
        region,
        endpoint: modelEndpoint,
        status: response.status,
        integrationEnabled,
      });

      return integrationEnabled;
    } catch (error) {
      logger.debug("Anthropic integration check failed", {
        projectId,
        region,
        error: error instanceof Error ? error.message : String(error),
      });
      // Assume integration might be enabled if we can't verify
      return true;
    }
  }

  /**
   * Initialize health checks in the background (NON-BLOCKING)
   * Starts background health monitoring without blocking initialization
   */
  static initializeBackgroundHealthChecks(): void {
    // Run health checks in the background without awaiting
    const backgroundHealthCheck = async () => {
      try {
        logger.debug("Starting background health check initialization");
        await this.checkAllProvidersHealth({
          includeConnectivityTest: false,
          cacheResults: true,
          timeout: 2000, // 2-second timeout for background checks
        });
        logger.debug("Background health check initialization completed");
      } catch (error) {
        logger.warn("Background health check initialization failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    // Start background check without blocking
    backgroundHealthCheck();
  }

  /**
   * Clear health cache for a provider or all providers
   */
  static clearHealthCache(providerName?: AIProviderName): void {
    if (providerName) {
      this.healthCache.delete(providerName);
      this.consecutiveFailures.delete(providerName);
    } else {
      this.healthCache.clear();
      this.consecutiveFailures.clear();
    }
  }

  /**
   * Get the best healthy provider from a list of options (NON-BLOCKING)
   * Prioritizes healthy providers over configured but unhealthy ones
   * Uses fast, cached health checks to avoid blocking initialization
   */
  static async getBestHealthyProvider(
    preferredProviders: string[] = [
      "openai",
      "anthropic",
      "vertex",
      "bedrock",
      "azure",
      "google-ai",
    ],
  ): Promise<string | null> {
    const healthStatuses = await this.checkAllProvidersHealth({
      includeConnectivityTest: false, // Quick config check only
      cacheResults: true,
      timeout: 1000, // Fast 1-second timeout to avoid blocking
    });

    // First try to find a healthy provider in order of preference
    for (const provider of preferredProviders) {
      const health = healthStatuses.find((h) => h.provider === provider);
      if (health?.isHealthy) {
        logger.debug(`Selected healthy provider: ${provider}`);
        return provider;
      }
    }

    // Fallback to first healthy provider
    const firstHealthyProvider = healthStatuses.find((h) => h.isHealthy);
    if (firstHealthyProvider) {
      logger.info(
        `Using fallback healthy provider: ${firstHealthyProvider.provider}`,
      );
      return firstHealthyProvider.provider;
    }

    // Last resort: first configured provider
    const anyConfigured = healthStatuses.find((h) => h.isConfigured);
    if (anyConfigured) {
      logger.warn(
        `Using configured but potentially unhealthy provider: ${anyConfigured.provider}`,
      );
      return anyConfigured.provider;
    }

    logger.error("No healthy or configured providers found");
    return null;
  }

  /**
   * Get health status for all registered providers
   */
  static async checkAllProvidersHealth(
    options: ProviderHealthCheckOptions = {},
  ): Promise<ProviderHealthStatusOptions[]> {
    const providers: AIProviderName[] = [
      AIProviderName.VERTEX,
      AIProviderName.GOOGLE_AI,
      AIProviderName.ANTHROPIC,
      AIProviderName.OPENAI,
      AIProviderName.BEDROCK,
      AIProviderName.AZURE,
      AIProviderName.OLLAMA,
    ];

    const healthChecks = providers.map((provider) =>
      this.checkProviderHealth(provider, options),
    );

    const results = await Promise.allSettled(healthChecks);

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        // Return a failed health status for rejected promises
        return {
          provider: providers[index],
          isHealthy: false,
          isConfigured: false,
          hasApiKey: false,
          lastChecked: new Date(),
          error: result.reason?.message || "Health check failed",
          configurationIssues: ["Health check promise rejected"],
          recommendations: [
            "Check provider configuration and network connectivity",
          ],
        };
      }
    });
  }

  /**
   * Get a summary of provider health
   */
  static getHealthSummary(healthStatuses: ProviderHealthStatusOptions[]): {
    total: number;
    healthy: number;
    configured: number;
    hasIssues: number;
    healthyProviders: string[];
    unhealthyProviders: string[];
  } {
    const healthy = healthStatuses.filter((h) => h.isHealthy);
    const configured = healthStatuses.filter((h) => h.isConfigured);
    const hasIssues = healthStatuses.filter(
      (h) => h.configurationIssues.length > 0,
    );

    return {
      total: healthStatuses.length,
      healthy: healthy.length,
      configured: configured.length,
      hasIssues: hasIssues.length,
      healthyProviders: healthy.map((h) => h.provider),
      unhealthyProviders: healthStatuses
        .filter((h) => !h.isHealthy)
        .map((h) => h.provider),
    };
  }
}
