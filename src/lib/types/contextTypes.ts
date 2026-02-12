/**
 * Context Types for NeuroLink - Factory Pattern Implementation
 * Provides type-safe context integration for AI generation
 */

import type { JsonValue, JsonObject } from "./common.js";
import type { ExecutionContext } from "../types/tools.js";
import type { ChatMessage, ConversationMemoryConfig } from "./conversation.js";
import type { CompactionStage } from "../context/contextCompactor.js";

/**
 * Base context type for all AI operations
 */
export type BaseContext = {
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
};

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
export type ContextConfig = {
  mode: ContextIntegrationMode;
  includeInPrompt?: boolean;
  includeInAnalytics?: boolean;
  includeInEvaluation?: boolean;
  template?: string; // Custom template for context integration
  maxLength?: number; // Maximum context length to include
};

/**
 * Context processing result
 */
type ProcessedContext = {
  originalContext: BaseContext;
  processedContext: string | null;
  config: ContextConfig;
  metadata: {
    truncated: boolean;
    processingTime: number;
    template: string;
    mode: ContextIntegrationMode;
  };
};

/**
 * Configuration for framework fields exclusion
 * Can be customized per application or environment
 */
export type FrameworkFieldsConfig = {
  // Default framework fields to exclude from custom data
  defaultFields: string[];

  // Additional custom fields to exclude
  additionalFields?: string[];

  // Override all fields (replaces default)
  overrideFields?: string[];

  // Include normally excluded fields
  includeFields?: string[];
};

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
function _isValidContext(value: unknown): value is BaseContext {
  return ContextFactory.validateContext(value) !== null;
}

/**
 * Context conversion utilities for domain-specific data
 * Replaces hardcoded business context with generic domain context
 */

type ContextConversionOptions = {
  preserveLegacyFields?: boolean;
  validateDomainData?: boolean;
  includeMetadata?: boolean;
};

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
      validateDomainData: _validateDomainData = true,
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
          // Include all additional custom data
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
   * Create execution context for required domain
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

    // Remove filtered fields that should be included despite being in the exclude list
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

// ---------------------------------------------------------------------------
// Context Compaction Types
// ---------------------------------------------------------------------------

/** Result of multi-stage context compaction. */
export type CompactionResult = {
  compacted: boolean;
  stagesUsed: CompactionStage[];
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  messages: ChatMessage[];
};

/** Configuration for the context compaction pipeline. */
export type CompactionConfig = {
  enablePrune?: boolean;
  enableDeduplicate?: boolean;
  enableSummarize?: boolean;
  enableTruncate?: boolean;
  pruneProtectTokens?: number;
  pruneMinimumSavings?: number;
  pruneProtectedTools?: string[];
  summarizationProvider?: string;
  summarizationModel?: string;
  keepRecentRatio?: number;
  truncationFraction?: number;
  provider?: string;
};

/** Result of a context budget check. */
export type BudgetCheckResult = {
  /** Whether the request fits within the context window */
  withinBudget: boolean;
  /** Estimated total input tokens */
  estimatedInputTokens: number;
  /** Available input tokens for this model */
  availableInputTokens: number;
  /** Usage ratio (0.0 - 1.0+) */
  usageRatio: number;
  /** Whether auto-compaction should trigger */
  shouldCompact: boolean;
  /** Breakdown of token usage by category */
  breakdown: {
    systemPrompt: number;
    conversationHistory: number;
    currentPrompt: number;
    toolDefinitions: number;
    fileAttachments: number;
  };
};

/** Parameters for budget checking. */
export type BudgetCheckParams = {
  provider: string;
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  conversationMessages?: Array<{ role: string; content: string }>;
  currentPrompt?: string;
  toolDefinitions?: unknown[];
  fileAttachments?: Array<{ content: string }>;
  /** Compaction trigger threshold (0.0-1.0). Default: 0.80 */
  compactionThreshold?: number;
};

/** A file prepared for potential summarization. */
export type FileForSummarization = {
  /** Display name (e.g. "report.pdf") */
  fileName: string;
  /** Human-readable type label (e.g. "PDF Document") */
  fileType: string;
  /** Extracted text content */
  content: string;
  /** Estimated token count (provider-adjusted) */
  estimatedTokens: number;
  /** Optional MIME type */
  mimeType?: string;
  /** Original byte size on disk */
  originalSize?: number;
};

/** Parameters for `shouldSummarizeFiles()`. */
export type FileSummarizationCheckParams = {
  /** AI provider name (e.g. "vertex", "anthropic") */
  provider: string;
  /** Model name (optional -- falls back to provider default) */
  model?: string;
  /** Token estimate for the system prompt */
  systemPromptTokens: number;
  /** Token estimate for conversation history */
  conversationHistoryTokens: number;
  /** Token estimate for the current user prompt */
  currentPromptTokens: number;
  /** Token estimate for tool definitions */
  toolDefinitionTokens: number;
  /** Token estimate for all attached files (sum) */
  fileTokens: number;
  /** Number of attached files */
  fileCount?: number;
  /** Explicit maxTokens (output reserve) from user config */
  maxTokens?: number;
  /** Context usage fraction that triggers summarization (0.0-1.0, default 0.80) */
  threshold?: number;
  /** Minimum tokens per file in the summarization plan */
  minTokensPerFile?: number;
  /** Maximum tokens per file in the summarization plan */
  maxTokensPerFile?: number;
};

/** Result of `shouldSummarizeFiles()`. */
export type FileSummarizationCheckResult = {
  /** Whether summarization is needed */
  needsSummarization: boolean;
  /** Total estimated input tokens (all categories) */
  totalEstimatedTokens: number;
  /** Available input tokens for the model */
  availableInputTokens: number;
  /** Budget remaining for files after non-file content */
  availableBudgetForFiles: number;
  /** If summarizing, the per-file token budget (undefined when not needed) */
  perFileBudget?: number;
};

/** Parameters for `buildFileSummarizationPrompt()`. */
export type FileSummarizationPromptParams = {
  /** File display name */
  fileName: string;
  /** File type label */
  fileType: string;
  /** Full extracted text of the file */
  fileContent: string;
  /** The user's original prompt / question */
  userPrompt: string;
  /** Target output token count for the summary */
  targetTokens: number;
};

/** Result item from `planFileSummarization()`. */
export type SummarizedFile = {
  /** File display name */
  fileName: string;
  /** File type label */
  fileType: string;
  /** Summary text (or original content if not summarized) */
  summary: string;
  /** Original token estimate */
  originalTokens: number;
  /** Token estimate of the summary */
  summaryTokens: number;
  /** Whether this file was actually summarized */
  wasSummarized: boolean;
};

/** Plan entry for a single file. */
export type FileSummarizationPlanEntry = {
  file: FileForSummarization;
  action: "summarize" | "keep";
  targetTokens?: number;
};

/** Raw file input before text extraction. */
export type RawFileInput = {
  /** File content -- either a UTF-8 string or a raw Buffer */
  content: string | Buffer;
  /** MIME type (e.g. "application/pdf", "text/plain") */
  mimeType: string;
  /** Display file name */
  fileName: string;
  /** Original byte size on disk (optional) */
  originalSize?: number;
};

/** Input file for aggregate budget enforcement. */
export type BudgetFileInput = {
  name: string;
  sizeBytes: number;
  /** Optional file type hint for type-aware token estimation */
  fileType?: string;
};

/** Options for tool output truncation. */
export type TruncateOptions = {
  maxBytes?: number;
  maxLines?: number;
  direction?: "head" | "tail";
  saveToDisk?: boolean;
  saveDir?: string;
};

/** Result of tool output truncation. */
export type TruncateResult = {
  content: string;
  truncated: boolean;
  savedPath?: string;
  originalSize: number;
};

/** Result of tool pair repair. */
export type RepairResult = {
  repaired: boolean;
  messages: ChatMessage[];
  orphanedCallsFixed: number;
  orphanedResultsFixed: number;
};

/** Options for summarization prompt building. */
export type SummarizationPromptOptions = {
  /**
   * Whether this is an incremental update to an existing summary
   */
  isIncremental: boolean;

  /**
   * The previous summary to merge with (required for incremental mode)
   */
  previousSummary?: string;

  /**
   * List of files that have been read during the conversation
   */
  filesRead?: string[];

  /**
   * List of files that have been modified during the conversation
   */
  filesModified?: string[];
};

/** Configuration for tool output pruning (Stage 1). */
export type PruneConfig = {
  protectTokens?: number;
  minimumSavings?: number;
  protectedTools?: string[];
  provider?: string;
};

/** Result of tool output pruning (Stage 1). */
export type PruneResult = {
  pruned: boolean;
  messages: ChatMessage[];
  tokensSaved: number;
};

/** Configuration for sliding window truncation (Stage 4). */
export type TruncationConfig = {
  fraction?: number; // Default: 0.5 (hide oldest 50%)
};

/** Result of sliding window truncation (Stage 4). */
export type TruncationResult = {
  truncated: boolean;
  messages: ChatMessage[];
  messagesRemoved: number;
};

/** Configuration for structured LLM summarization (Stage 3). */
export type SummarizeConfig = {
  provider?: string;
  model?: string;
  keepRecentRatio?: number;
  memoryConfig?: Partial<ConversationMemoryConfig>;
};

/** Result of structured LLM summarization (Stage 3). */
export type SummarizeResult = {
  summarized: boolean;
  messages: ChatMessage[];
  summaryText?: string;
};

/** Result of file read deduplication (Stage 2). */
export type DeduplicationResult = {
  deduplicated: boolean;
  messages: ChatMessage[];
  filesDeduped: number;
};
