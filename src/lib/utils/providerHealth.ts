/**
 * Provider Health Checking System
 * Prevents 500 errors by validating provider availability and configuration
 */

import { logger } from "./logger.js";
import { AIProviderName } from "../core/types.js";

export interface ProviderHealthStatus {
  provider: AIProviderName;
  isHealthy: boolean;
  isConfigured: boolean;
  hasApiKey: boolean;
  lastChecked: Date;
  error?: string;
  warning?: string;
  responseTime?: number;
  configurationIssues: string[];
  recommendations: string[];
}

export interface ProviderHealthCheckOptions {
  timeout?: number;
  includeConnectivityTest?: boolean;
  includeModelValidation?: boolean;
  cacheResults?: boolean;
  maxCacheAge?: number;
}

export class ProviderHealthChecker {
  private static healthCache = new Map<
    string,
    {
      status: ProviderHealthStatus;
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
      console.warn(
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
  ): Promise<ProviderHealthStatus> {
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
      const healthStatus: ProviderHealthStatus = {
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
    const healthStatus: ProviderHealthStatus = {
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
    healthStatus: ProviderHealthStatus,
  ): Promise<void> {
    const requiredEnvVars = this.getRequiredEnvironmentVariables(providerName);

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
    healthStatus: ProviderHealthStatus,
  ): Promise<void> {
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
    healthStatus: ProviderHealthStatus,
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

      const response = await fetch(endpoint, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "NeuroLink-HealthCheck/1.0",
        },
      });

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
    healthStatus: ProviderHealthStatus,
  ): Promise<void> {
    // For now, we'll do basic model name validation
    // In the future, this could be enhanced with actual API calls

    const commonModels = this.getCommonModelsForProvider(providerName);

    if (commonModels.length > 0) {
      healthStatus.recommendations.push(
        `Common models for ${providerName}: ${commonModels.slice(0, 3).join(", ")}`,
      );
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
        return ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_PROJECT_ID"];
      case AIProviderName.GOOGLE_AI:
        return ["GOOGLE_AI_API_KEY"];
      case AIProviderName.BEDROCK:
        return ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"];
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
        return apiKey.startsWith("sk-ant-") && apiKey.length > 20;
      case AIProviderName.OPENAI:
        return apiKey.startsWith("sk-") && apiKey.length > 20;
      case AIProviderName.GOOGLE_AI:
        return apiKey.length > 20; // Basic length check
      case AIProviderName.VERTEX:
        return apiKey.endsWith(".json") || apiKey.includes("type"); // JSON key format
      case AIProviderName.BEDROCK:
        return apiKey.length >= 20; // AWS access key length
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
    healthStatus: ProviderHealthStatus,
  ): Promise<void> {
    switch (providerName) {
      case AIProviderName.VERTEX:
        // Check for Google Cloud specific configuration
        if (!process.env.GOOGLE_PROJECT_ID) {
          healthStatus.configurationIssues.push("GOOGLE_PROJECT_ID not set");
          healthStatus.recommendations.push(
            "Set GOOGLE_PROJECT_ID to your GCP project ID",
          );
        }

        {
          const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
          if (credPath && !credPath.includes("json")) {
            healthStatus.warning =
              "GOOGLE_APPLICATION_CREDENTIALS should point to a JSON file";
          }
        }
        break;

      case AIProviderName.BEDROCK:
        // Check AWS region
        if (!process.env.AWS_REGION) {
          healthStatus.configurationIssues.push("AWS_REGION not set");
          healthStatus.recommendations.push("Set AWS_REGION (e.g., us-east-1)");
        }
        break;

      case AIProviderName.OLLAMA: {
        // Check if custom endpoint is set
        const ollamaBase =
          process.env.OLLAMA_API_BASE || "http://localhost:11434";
        if (!ollamaBase.startsWith("http")) {
          healthStatus.configurationIssues.push(
            "Invalid OLLAMA_API_BASE format",
          );
          healthStatus.recommendations.push(
            "Set OLLAMA_API_BASE to a valid URL (e.g., http://localhost:11434)",
          );
        }
        break;
      }
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
          "claude-3-5-sonnet-20241022",
          "claude-3-haiku-20240307",
          "claude-3-opus-20240229",
        ];
      case AIProviderName.OPENAI:
        return ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"];
      case AIProviderName.GOOGLE_AI:
        return ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"];
      case AIProviderName.VERTEX:
        return ["gemini-1.5-pro", "gemini-1.5-flash"];
      case AIProviderName.BEDROCK:
        return [
          "anthropic.claude-3-sonnet-20240229-v1:0",
          "anthropic.claude-3-haiku-20240307-v1:0",
        ];
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
  ): ProviderHealthStatus | null {
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
   * Get the best healthy provider from a list of options
   * Prioritizes healthy providers over configured but unhealthy ones
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
    });

    // First try to find a healthy provider in order of preference
    for (const provider of preferredProviders) {
      const health = healthStatuses.find((h) => h.provider === provider);
      if (health?.isHealthy) {
        logger.debug(`Selected healthy provider: ${provider}`);
        return provider;
      }
    }

    // Fallback to any healthy provider
    const anyHealthy = healthStatuses.find((h) => h.isHealthy);
    if (anyHealthy) {
      logger.info(`Using fallback healthy provider: ${anyHealthy.provider}`);
      return anyHealthy.provider;
    }

    // Last resort: any configured provider
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
  ): Promise<ProviderHealthStatus[]> {
    const providers: AIProviderName[] = [
      AIProviderName.ANTHROPIC,
      AIProviderName.OPENAI,
      AIProviderName.VERTEX,
      AIProviderName.GOOGLE_AI,
      AIProviderName.BEDROCK,
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
  static getHealthSummary(healthStatuses: ProviderHealthStatus[]): {
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
