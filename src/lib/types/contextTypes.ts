/**
 * Context Types for NeuroLink - Factory Pattern Implementation
 * Provides type-safe context integration for AI generation
 */

import type { JsonValue, JsonObject } from "./common.js";

/**
 * Base context interface for all AI operations
 */
export interface BaseContext {
  // Core identification
  userId?: string;
  sessionId?: string;
  requestId?: string;

  // User information
  userRole?: string;
  userPreferences?: JsonObject;
  userMetadata?: JsonObject;

  // Application context
  applicationContext?: {
    name: string;
    version?: string;
    environment?: "development" | "staging" | "production";
  };

  // Business context
  organizationId?: string;
  departmentId?: string;
  projectId?: string;

  // Index signature for flexible access
  [key: string]: unknown;
}

/**
 * Context integration mode types
 */
type ContextIntegrationMode =
  | "prompt_prefix" // Add context as prompt prefix
  | "prompt_suffix" // Add context as prompt suffix
  | "system_prompt" // Include context in system prompt
  | "metadata_only" // Context for analytics/tracking only
  | "structured_prompt" // Structure context within prompt
  | "none"; // No integration (default)

/**
 * Context configuration for AI generation
 */
export interface ContextConfig {
  mode: ContextIntegrationMode;
  includeInPrompt?: boolean;
  includeInAnalytics?: boolean;
  includeInEvaluation?: boolean;
  template?: string; // Custom template for context integration
  maxLength?: number; // Maximum context length to include
}

/**
 * Context processing result
 */
interface ProcessedContext {
  originalContext: BaseContext;
  processedContext: string | null;
  config: ContextConfig;
  metadata: {
    truncated: boolean;
    processingTime: number;
    template: string;
    mode: ContextIntegrationMode;
  };
}

/**
 * Configuration for framework fields exclusion
 * Can be customized per application or environment
 */
export interface FrameworkFieldsConfig {
  // Default framework fields to exclude from custom data
  defaultFields: string[];

  // Additional custom fields to exclude
  additionalFields?: string[];

  // Override all fields (replaces default)
  overrideFields?: string[];

  // Include normally excluded fields
  includeFields?: string[];
}

/**
 * Factory for context processing
 */
export class ContextFactory {
  /**
   * Default framework fields configuration
   */
  static readonly DEFAULT_FRAMEWORK_FIELDS: FrameworkFieldsConfig = {
    defaultFields: [
      "sessionId",
      "userId",
      "apiToken",
      "authToken",
      "apiEndpoint",
      "serviceUrl",
      "endpoint",
      "environment",
      "region",
      "enabledFeatures",
      "platformType",
      "platformUrl",
      "platformId",
      "enableDemoMode",
    ],
    additionalFields: [],
    includeFields: [],
  };

  /**
   * Current framework fields configuration
   */
  private static frameworkFieldsConfig: FrameworkFieldsConfig =
    ContextFactory.DEFAULT_FRAMEWORK_FIELDS;

  /**
   * Flag to track if framework fields have been initialized
   */
  private static isFrameworkFieldsInitialized = false;

  /**
   * Configure framework fields for exclusion from custom data
   */
  static configureFrameworkFields(
    config: Partial<FrameworkFieldsConfig>,
  ): void {
    ContextFactory.frameworkFieldsConfig = {
      ...ContextFactory.DEFAULT_FRAMEWORK_FIELDS,
      ...config,
    };
    ContextFactory.isFrameworkFieldsInitialized = true;
  }

  /**
   * Get current framework fields configuration
   * Ensures lazy initialization if not already loaded
   */
  static getFrameworkFieldsConfig(): FrameworkFieldsConfig {
    // Lazy initialization - load from environment if not explicitly configured
    if (!ContextFactory.isFrameworkFieldsInitialized) {
      ContextFactory.loadFrameworkFieldsFromEnv();
      ContextFactory.isFrameworkFieldsInitialized = true;
    }
    return { ...ContextFactory.frameworkFieldsConfig };
  }

  /**
   * Reset framework fields configuration to default
   */
  static resetFrameworkFieldsConfig(): void {
    ContextFactory.frameworkFieldsConfig = {
      ...ContextFactory.DEFAULT_FRAMEWORK_FIELDS,
    };
  }

  /**
   * Load framework fields configuration from environment variables
   * Supports NEUROLINK_CONTEXT_EXCLUDE_FIELDS and NEUROLINK_CONTEXT_INCLUDE_FIELDS
   */
  static loadFrameworkFieldsFromEnv(): void {
    const excludeFields = process.env.NEUROLINK_CONTEXT_EXCLUDE_FIELDS;
    const includeFields = process.env.NEUROLINK_CONTEXT_INCLUDE_FIELDS;
    const overrideFields = process.env.NEUROLINK_CONTEXT_OVERRIDE_FIELDS;

    const config: Partial<FrameworkFieldsConfig> = {};

    if (excludeFields) {
      config.additionalFields = excludeFields
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
    }

    if (includeFields) {
      config.includeFields = includeFields
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
    }

    if (overrideFields) {
      config.overrideFields = overrideFields
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
    }

    // Optimized check: avoid creating array with Object.keys() for simple property existence check
    const hasConfigChanges =
      config.additionalFields || config.includeFields || config.overrideFields;
    if (hasConfigChanges) {
      ContextFactory.configureFrameworkFields(config);
    }
    ContextFactory.isFrameworkFieldsInitialized = true;
  }

  /**
   * Add additional fields to exclude
   */
  static addFrameworkFieldsToExclude(fields: string[]): void {
    const currentConfig = ContextFactory.frameworkFieldsConfig;
    ContextFactory.configureFrameworkFields({
      additionalFields: [...(currentConfig.additionalFields || []), ...fields],
    });
  }

  /**
   * Add fields to include (override exclusion)
   */
  static addFrameworkFieldsToInclude(fields: string[]): void {
    const currentConfig = ContextFactory.frameworkFieldsConfig;
    ContextFactory.configureFrameworkFields({
      includeFields: [...(currentConfig.includeFields || []), ...fields],
    });
  }

  /**
   * Default context configuration
   */
  static readonly DEFAULT_CONFIG: ContextConfig = {
    mode: "metadata_only",
    includeInPrompt: false,
    includeInAnalytics: true,
    includeInEvaluation: true,
    maxLength: 1000,
  };

  /**
   * Validate and normalize context data
   */
  static validateContext(context: unknown): BaseContext | null {
    if (!context || typeof context !== "object") {
      return null;
    }

    try {
      // Ensure it's JSON serializable
      const serialized = JSON.stringify(context);
      const parsed = JSON.parse(serialized) as BaseContext;

      // Basic validation
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Process context for AI generation based on configuration
   */
  static processContext(
    context: BaseContext,
    config: Partial<ContextConfig> = {},
  ): ProcessedContext {
    const startTime = Date.now();
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    let processedContext: string | null = null;
    const template = "default";
    let truncated = false;

    if (finalConfig.includeInPrompt && finalConfig.mode !== "metadata_only") {
      processedContext = this.formatContextForPrompt(context, finalConfig);

      // Truncate if necessary
      if (
        finalConfig.maxLength &&
        processedContext.length > finalConfig.maxLength
      ) {
        processedContext =
          processedContext.substring(0, finalConfig.maxLength) + "...";
        truncated = true;
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      originalContext: context,
      processedContext,
      config: finalConfig,
      metadata: {
        truncated,
        processingTime,
        template,
        mode: finalConfig.mode,
      },
    };
  }

  /**
   * Format context for prompt integration
   */
  private static formatContextForPrompt(
    context: BaseContext,
    config: ContextConfig,
  ): string {
    switch (config.mode) {
      case "prompt_prefix":
        return this.formatAsPrefix(context);

      case "prompt_suffix":
        return this.formatAsSuffix(context);

      case "system_prompt":
        return this.formatForSystemPrompt(context);

      case "structured_prompt":
        return this.formatStructured(context);

      case "metadata_only":
      case "none":
      default:
        return "";
    }
  }

  /**
   * Format context as prompt prefix
   */
  private static formatAsPrefix(context: BaseContext): string {
    const parts: string[] = [];

    if (context.userId) {
      parts.push(`User: ${context.userId}`);
    }

    if (context.userRole) {
      parts.push(`Role: ${context.userRole}`);
    }

    if (context.sessionId) {
      parts.push(`Session: ${context.sessionId}`);
    }

    if (parts.length === 0) {
      return "";
    }

    return `Context: ${parts.join(", ")}\n\n`;
  }

  /**
   * Format context as prompt suffix
   */
  private static formatAsSuffix(context: BaseContext): string {
    const relevantKeys = Object.keys(context).filter(
      (key) => !["userId", "sessionId", "requestId"].includes(key),
    );

    if (relevantKeys.length === 0) {
      return "";
    }

    const contextData = relevantKeys.reduce(
      (acc, key) => {
        acc[key] = context[key] as JsonValue;
        return acc;
      },
      {} as Record<string, JsonValue>,
    );

    return `\n\nAdditional Context: ${JSON.stringify(contextData, null, 2)}`;
  }

  /**
   * Format context for system prompt
   */
  private static formatForSystemPrompt(context: BaseContext): string {
    const parts: string[] = [];

    if (context.userRole) {
      parts.push(`You are assisting a user with the role: ${context.userRole}`);
    }

    if (context.organizationId) {
      parts.push(`Organization context: ${context.organizationId}`);
    }

    if (context.userPreferences) {
      parts.push(
        `User preferences: ${JSON.stringify(context.userPreferences)}`,
      );
    }

    return parts.join(". ");
  }

  /**
   * Format context in structured format
   */
  private static formatStructured(context: BaseContext): string {
    return `[CONTEXT]\n${JSON.stringify(context, null, 2)}\n[/CONTEXT]\n\n`;
  }

  /**
   * Extract analytics data from context
   */
  static extractAnalyticsContext(context: BaseContext): JsonObject {
    return {
      hasUserId: !!context.userId,
      hasSessionId: !!context.sessionId,
      hasUserRole: !!context.userRole,
      hasOrgContext: !!context.organizationId,
      contextKeys: Object.keys(context),
      contextSize: JSON.stringify(context).length,
    };
  }

  /**
   * Extract evaluation context
   */
  static extractEvaluationContext(context: BaseContext): JsonObject {
    return {
      userRole: context.userRole || "unknown",
      applicationContext: context.applicationContext?.name || "unknown",
      organizationContext: context.organizationId || "unknown",
      hasPreferences: !!context.userPreferences,
    };
  }
}

/**
 * Type guard to check if value is valid context
 */
function isValidContext(value: unknown): value is BaseContext {
  return ContextFactory.validateContext(value) !== null;
}

/**
 * Context conversion utilities for domain-specific data
 * Replaces hardcoded business context with generic domain context
 */

import type { ExecutionContext } from "../mcp/contracts/mcpContract.js";

interface ContextConversionOptions {
  preserveLegacyFields?: boolean;
  validateDomainData?: boolean;
  includeMetadata?: boolean;
}

export class ContextConverter {
  /**
   * Convert legacy business context to generic domain context
   * Based on business context patterns
   */
  static convertBusinessContext(
    legacyContext: Record<string, unknown>,
    domainType: string,
    options: ContextConversionOptions = {},
  ): ExecutionContext {
    const {
      preserveLegacyFields = false,
      validateDomainData = true,
      includeMetadata = true,
    } = options;

    return {
      sessionId: legacyContext.sessionId as string,
      userId: legacyContext.userId as string,
      config: {
        domainType,
        providerConfig: {
          token:
            legacyContext.apiToken ||
            legacyContext.authToken ||
            legacyContext.accessToken,
          endpoint: legacyContext.apiEndpoint || legacyContext.serviceUrl,
          provider: this.inferProvider(legacyContext),
        },
        platformConfig: {
          type: legacyContext.platformType || "generic",
          url: legacyContext.platformUrl || legacyContext.serviceUrl,
          id: legacyContext.platformId || legacyContext.serviceId,
          integrations: legacyContext.platformIntegrations || [],
        },
        operationalConfig: {
          demoMode: legacyContext.enableDemoMode || false,
          environment: legacyContext.environment || "production",
          region: legacyContext.region,
          features: legacyContext.enabledFeatures || [],
        },
        customData: {
          // Preserve domain-specific fields if needed
          ...(preserveLegacyFields
            ? {
                entityId:
                  legacyContext.entityId || legacyContext.organizationId,
                departmentId: legacyContext.departmentId,
                projectId: legacyContext.projectId,
              }
            : {}),
          // Include any additional custom data
          ...this.extractCustomData(legacyContext),
        },
      },
      metadata: includeMetadata
        ? {
            convertedFrom: "legacy-business-context",
            conversionTime: Date.now(),
            originalKeys: Object.keys(legacyContext),
            domainType,
          }
        : undefined,
    };
  }

  /**
   * Create execution context for any domain
   */
  static createDomainContext(
    domainType: string,
    domainData: Record<string, unknown>,
    sessionInfo: { sessionId?: string; userId?: string } = {},
  ): ExecutionContext {
    return {
      sessionId: sessionInfo.sessionId || `session_${Date.now()}`,
      userId: sessionInfo.userId,
      config: {
        domainType,
        customData: domainData,
      },
      metadata: {
        source: "domain-context-factory",
        createdAt: Date.now(),
        domainType,
      },
    };
  }

  private static inferProvider(context: Record<string, unknown>): string {
    // Generic provider inference based on context structure
    if (context.apiToken || context.authToken) {
      return "api-provider";
    }
    if (context.serviceUrl || context.endpoint) {
      return "service-provider";
    }
    return "generic-provider";
  }

  private static extractCustomData(
    context: Record<string, unknown>,
  ): Record<string, unknown> {
    // Get current framework fields configuration
    const config = ContextFactory.getFrameworkFieldsConfig();

    // Build the set of fields to exclude
    let fieldsToExclude: Set<string>;

    if (config.overrideFields) {
      // Use override fields completely
      fieldsToExclude = new Set(config.overrideFields);
    } else {
      // Use default fields + additional fields
      fieldsToExclude = new Set([
        ...config.defaultFields,
        ...(config.additionalFields || []),
      ]);
    }

    // Remove any fields that should be included despite being in the exclude list
    if (config.includeFields) {
      config.includeFields.forEach((field) => fieldsToExclude.delete(field));
    }

    const customData: Record<string, unknown> = {};
    Object.entries(context).forEach(([key, value]) => {
      if (!fieldsToExclude.has(key)) {
        customData[key] = value;
      }
    });

    return customData;
  }
}

// Framework fields configuration loading moved to lazy initialization
// Call ContextFactory.loadFrameworkFieldsFromEnv() explicitly in application entrypoint or test setup
