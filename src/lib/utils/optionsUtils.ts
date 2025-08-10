/**
 * Options Enhancement Utilities
 * Provides intelligent enhancement of GenerateOptions with factory patterns
 * Supports domain configuration, streaming optimization, and MCP integration
 */

import type {
  GenerateOptions,
  UnifiedGenerationOptions,
} from "../types/generateTypes.js";
import type { StreamOptions } from "../types/streamTypes.js";
import type { ExecutionContext } from "../mcp/contracts/mcpContract.js";
import { ContextConverter } from "../types/contextTypes.js";
import { logger } from "./logger.js";

/**
 * Enhancement types for different optimization strategies
 */
export type EnhancementType =
  | "streaming-optimization"
  | "mcp-integration"
  | "legacy-migration"
  | "context-conversion"
  | "domain-configuration"
  | "batch-parallel-enhancement"
  | "batch-hybrid-enhancement"
  | "batch-dependency-enhancement";

/**
 * Enhancement options for modifying GenerateOptions
 */
export interface EnhancementOptions {
  enhancementType: EnhancementType;
  streamingOptions?: {
    enabled?: boolean;
    chunkSize?: number;
    bufferSize?: number;
    enableProgress?: boolean;
    preferStreaming?: boolean;
  };
  mcpOptions?: {
    enableToolRegistry?: boolean;
    contextAware?: boolean;
    executionContext?: ExecutionContext;
  };
  legacyMigration?: {
    legacyContext?: Record<string, unknown>;
    domainType?: string;
    preserveFields?: boolean;
  };
  domainConfiguration?: {
    domainType: string;
    keyTerms?: string[];
    failurePatterns?: string[];
    successPatterns?: string[];
    evaluationCriteria?: Record<string, unknown>;
  };
  performance?: {
    enableAnalytics?: boolean;
    enableEvaluation?: boolean;
    timeout?: number;
  };
}

/**
 * Enhancement result with metadata
 */
export interface EnhancementResult {
  options: UnifiedGenerationOptions;
  metadata: {
    enhancementApplied: boolean;
    enhancementType: EnhancementType;
    processingTime: number;
    configurationUsed: Record<string, unknown>;
    warnings: string[];
    recommendations: string[];
  };
}

/**
 * Options Enhancement Utility Class
 * Main utility for enhancing GenerateOptions with factory patterns
 */
export class OptionsEnhancer {
  /**
   * Thread-safe enhancement counter using SharedArrayBuffer and Atomics
   *
   * NOTE ON THREAD-SAFETY:
   * JavaScript's main execution is single-threaded. Thread-safety using SharedArrayBuffer and Atomics
   * is only relevant in environments that support multi-threading, such as web workers (in browsers)
   * or worker threads (in Node.js).
   *
   * RATIONALE FOR THREAD-SAFETY:
   * OptionsEnhancer is used across multiple worker threads in high-performance scenarios:
   * - Parallel batch processing (batchEnhanceParallel function)
   * - Streaming operations with concurrent enhancements
   * - Factory pattern implementations that may run in web workers
   * - Analytics tracking requires accurate counts across all threads
   *
   * SharedArrayBuffer + Atomics ensures accurate statistics without race conditions
   * when enhancement operations occur simultaneously across multiple contexts.
   *
   * NOTE: SharedArrayBuffer requires cross-origin isolation headers in browsers:
   *   - Cross-Origin-Opener-Policy: same-origin
   *   - Cross-Origin-Embedder-Policy: require-corp
   * Without these, SharedArrayBuffer will be unavailable and thread-safety will be disabled.
   * In Node.js, SharedArrayBuffer is available in worker threads.
   */
  private static enhancementCountBuffer: SharedArrayBuffer | null = (() => {
    // In browsers, SharedArrayBuffer is only usable if cross-origin isolation is enabled
    const isBrowser =
      typeof window !== "undefined" && typeof window.document !== "undefined";
    const crossOriginIsolated = isBrowser ? !!window.crossOriginIsolated : true;

    if (typeof SharedArrayBuffer !== "undefined" && crossOriginIsolated) {
      try {
        return new SharedArrayBuffer(4); // 4 bytes for Int32
      } catch (e) {
        // SharedArrayBuffer is defined but not usable (browser CORS headers not set)
        if (typeof logger !== "undefined" && logger?.warn) {
          logger.warn(
            "[OptionsEnhancer] SharedArrayBuffer is defined but not usable. " +
              "Ensure cross-origin isolation headers are set in browser environments. " +
              "Falling back to non-thread-safe enhancement counter.",
          );
        }
        return null;
      }
    } else if (isBrowser && !crossOriginIsolated) {
      if (typeof logger !== "undefined" && logger?.debug) {
        logger.debug(
          "[OptionsEnhancer] SharedArrayBuffer requires cross-origin isolation in browsers. " +
            "Set Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp headers. " +
            "Falling back to non-thread-safe enhancement counter.",
        );
      }
    }
    return null;
  })();
  private static enhancementCountArray: Int32Array | null =
    OptionsEnhancer.enhancementCountBuffer
      ? new Int32Array(OptionsEnhancer.enhancementCountBuffer)
      : null;

  // Fallback counter for environments without SharedArrayBuffer (ensures compatibility everywhere)
  private static fallbackEnhancementCount = 0;

  private static get enhancementCount(): number {
    if (OptionsEnhancer.enhancementCountArray) {
      return Atomics.load(OptionsEnhancer.enhancementCountArray, 0);
    } else {
      return OptionsEnhancer.fallbackEnhancementCount;
    }
  }

  private static incrementEnhancementCount(): number {
    if (OptionsEnhancer.enhancementCountArray) {
      return Atomics.add(OptionsEnhancer.enhancementCountArray, 0, 1);
    } else {
      return ++OptionsEnhancer.fallbackEnhancementCount;
    }
  }

  /**
   * Enhance GenerateOptions with factory patterns
   * Primary method for applying enhancements
   */
  static enhance(
    options: GenerateOptions,
    enhancementOptions: EnhancementOptions,
  ): EnhancementResult {
    const startTime = Date.now();
    this.incrementEnhancementCount();

    logger.debug(
      `Enhancing options with ${enhancementOptions.enhancementType} (count: ${this.enhancementCount})`,
    );

    try {
      const result = this.applyEnhancement(options, enhancementOptions);
      const processingTime = Date.now() - startTime;

      logger.debug(
        `Enhancement completed in ${processingTime}ms: ${enhancementOptions.enhancementType}`,
      );

      return {
        ...result,
        metadata: {
          ...result.metadata,
          processingTime,
        },
      };
    } catch (error) {
      logger.error(`Enhancement failed: ${error}`);
      return this.createErrorResult(options, enhancementOptions, startTime);
    }
  }

  /**
   * Enhance options for streaming optimization
   * Specialized method for streaming enhancements
   */
  static enhanceForStreaming(
    options: GenerateOptions,
    streamingConfig?: {
      chunkSize?: number;
      bufferSize?: number;
      enableProgress?: boolean;
    },
  ): EnhancementResult {
    return this.enhance(options, {
      enhancementType: "streaming-optimization",
      streamingOptions: {
        enabled: true,
        preferStreaming: true,
        ...streamingConfig,
      },
    });
  }

  /**
   * Convert legacy business context to factory options
   * Migration utility for existing business-specific code
   */
  static migrateFromLegacy(
    options: GenerateOptions,
    legacyContext: Record<string, unknown>,
    domainType: string,
  ): EnhancementResult {
    return this.enhance(options, {
      enhancementType: "legacy-migration",
      legacyMigration: {
        legacyContext: legacyContext,
        domainType,
        preserveFields: true,
      },
      performance: {
        enableEvaluation: true,
        enableAnalytics: true,
      },
    });
  }

  /**
   * Create unified options from separate generation and streaming options
   * Utility for combining different option types
   */
  static createUnified(
    generateOptions: GenerateOptions,
    streamOptions?: Partial<StreamOptions>,
  ): UnifiedGenerationOptions {
    const unified: UnifiedGenerationOptions = {
      ...generateOptions,
      preferStreaming: false,
      streamingFallback: true,
    };

    if (streamOptions) {
      unified.streaming = {
        enabled: true,
        chunkSize: streamOptions.output?.streaming?.chunkSize,
        bufferSize: streamOptions.output?.streaming?.bufferSize,
        enableProgress: streamOptions.output?.streaming?.enableProgress,
        fallbackToGenerate: true,
      };
      unified.preferStreaming = true;
    }

    return unified;
  }

  /**
   * Enhance GenerateOptions with domain configuration
   * Convenience method for domain-specific enhancements
   */
  static enhanceWithDomain(
    options: GenerateOptions,
    domainConfig: {
      domainType: string;
      keyTerms?: string[];
      failurePatterns?: string[];
      successPatterns?: string[];
      evaluationCriteria?: Record<string, unknown>;
    },
  ): EnhancementResult {
    return this.enhance(options, {
      enhancementType: "domain-configuration",
      domainConfiguration: {
        domainType: domainConfig.domainType,
        keyTerms: domainConfig.keyTerms || [],
        failurePatterns: domainConfig.failurePatterns || [
          "unable to help",
          "insufficient data",
        ],
        successPatterns: domainConfig.successPatterns || [
          "analysis shows",
          "data indicates",
        ],
        evaluationCriteria: domainConfig.evaluationCriteria || {},
      },
      performance: {
        enableEvaluation: true,
        enableAnalytics: true,
      },
    });
  }

  /**
   * Validate enhancement compatibility
   * Check if enhancement options are compatible with base options
   */
  static validateEnhancement(
    options: GenerateOptions,
    enhancementOptions: EnhancementOptions,
  ): {
    valid: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check for conflicting configurations
    if (
      enhancementOptions.enhancementType === "streaming-optimization" &&
      options.disableTools
    ) {
      warnings.push(
        "Streaming optimization with disabled tools may reduce effectiveness",
      );
      recommendations.push(
        "Consider enabling tools for better streaming performance",
      );
    }

    // Check legacy migration requirements
    if (
      enhancementOptions.enhancementType === "legacy-migration" &&
      !enhancementOptions.legacyMigration?.legacyContext
    ) {
      return {
        valid: false,
        warnings: ["Legacy migration requested but no legacy context provided"],
        recommendations: ["Provide legacyContext for legacy migration"],
      };
    }

    return {
      valid: true,
      warnings,
      recommendations,
    };
  }

  // Private helper methods

  private static applyEnhancement(
    options: GenerateOptions,
    enhancementOptions: EnhancementOptions,
  ): EnhancementResult {
    const validation = this.validateEnhancement(options, enhancementOptions);

    if (!validation.valid) {
      throw new Error(
        `Enhancement validation failed: ${validation.warnings.join(", ")}`,
      );
    }

    switch (enhancementOptions.enhancementType) {
      case "streaming-optimization":
        return this.applyStreamingOptimization(options, enhancementOptions);

      case "mcp-integration":
        return this.applyMcpIntegration(options, enhancementOptions);

      case "legacy-migration":
        return this.applyLegacyMigration(options, enhancementOptions);

      case "context-conversion":
        return this.applyContextConversion(options, enhancementOptions);

      case "domain-configuration":
        return this.applyDomainConfiguration(options, enhancementOptions);

      default:
        throw new Error(
          `Unknown enhancement type: ${enhancementOptions.enhancementType}`,
        );
    }
  }

  private static applyStreamingOptimization(
    options: GenerateOptions,
    enhancementOptions: EnhancementOptions,
  ): EnhancementResult {
    const streamingOptions = enhancementOptions.streamingOptions || {};

    const unifiedOptions: UnifiedGenerationOptions = {
      ...options,
      streaming: {
        enabled: streamingOptions.enabled ?? true,
        chunkSize: streamingOptions.chunkSize || 1024,
        bufferSize: streamingOptions.bufferSize || 4096,
        enableProgress: streamingOptions.enableProgress ?? true,
        fallbackToGenerate: true,
      },
      preferStreaming: streamingOptions.preferStreaming ?? true,
      streamingFallback: true,
    };

    // Apply performance optimizations
    if (enhancementOptions.performance?.enableAnalytics) {
      unifiedOptions.enableAnalytics = true;
    }

    return {
      options: unifiedOptions,
      metadata: {
        enhancementApplied: true,
        enhancementType: "streaming-optimization",
        processingTime: 0,
        configurationUsed: streamingOptions,
        warnings: [],
        recommendations: [
          "Monitor streaming performance for optimal chunk size tuning",
        ],
      },
    };
  }

  private static applyMcpIntegration(
    options: GenerateOptions,
    enhancementOptions: EnhancementOptions,
  ): EnhancementResult {
    const mcpOptions = enhancementOptions.mcpOptions || {};

    const unifiedOptions: UnifiedGenerationOptions = {
      ...options,
      preferStreaming: false,
      streamingFallback: true,
    };

    // Enhance with MCP context if provided
    if (mcpOptions.executionContext) {
      unifiedOptions.context = {
        ...unifiedOptions.context,
        mcpContext: mcpOptions.executionContext,
        mcpIntegrationEnabled: true,
      };
    }

    // Enable tools if MCP integration is requested
    if (mcpOptions.enableToolRegistry && options.disableTools) {
      unifiedOptions.disableTools = false;
      logger.info("Enabled tools for MCP integration");
    }

    return {
      options: unifiedOptions,
      metadata: {
        enhancementApplied: true,
        enhancementType: "mcp-integration",
        processingTime: 0,
        configurationUsed: mcpOptions,
        warnings: [],
        recommendations: [
          "Ensure MCP tools are properly configured for optimal integration",
        ],
      },
    };
  }

  private static applyLegacyMigration(
    options: GenerateOptions,
    enhancementOptions: EnhancementOptions,
  ): EnhancementResult {
    const legacyMigration = enhancementOptions.legacyMigration!;

    // Convert legacy context to execution context
    const executionContext = ContextConverter.convertBusinessContext(
      legacyMigration.legacyContext!,
      legacyMigration.domainType!,
      {
        preserveLegacyFields: legacyMigration.preserveFields,
        validateDomainData: true,
        includeMetadata: true,
      },
    );

    const unifiedOptions: UnifiedGenerationOptions = {
      ...options,
      context: {
        ...options.context,
        legacyMigration: true,
        executionContext,
        originalLegacyContext: legacyMigration.legacyContext,
      },
      factoryConfig: {
        domainType: legacyMigration.domainType,
        enhancementType: "legacy-migration",
        preserveLegacyFields: legacyMigration.preserveFields,
        validateDomainData: true,
      },
      preferStreaming: false,
      streamingFallback: true,
    };

    // Apply performance settings
    if (enhancementOptions.performance?.enableEvaluation) {
      unifiedOptions.enableEvaluation = true;
      unifiedOptions.evaluationDomain = legacyMigration.domainType;
    }

    if (enhancementOptions.performance?.enableAnalytics) {
      unifiedOptions.enableAnalytics = true;
    }

    return {
      options: unifiedOptions,
      metadata: {
        enhancementApplied: true,
        enhancementType: "legacy-migration",
        processingTime: 0,
        configurationUsed: {
          domainType: legacyMigration.domainType,
          preserveFields: legacyMigration.preserveFields,
          legacyContextKeys: Object.keys(legacyMigration.legacyContext!),
        },
        warnings: [],
        recommendations: [
          "Review migrated context for completeness",
          "Consider gradually removing legacy field dependencies",
        ],
      },
    };
  }

  private static applyContextConversion(
    options: GenerateOptions,
    enhancementOptions: EnhancementOptions,
  ): EnhancementResult {
    // Context conversion is a specialized form of enhancement
    const legacyMigration = enhancementOptions.legacyMigration || {};
    const unifiedOptions: UnifiedGenerationOptions = {
      ...options,
      preferStreaming: false,
      streamingFallback: true,
    };

    // Apply context conversion if legacy context is provided
    if (legacyMigration.legacyContext && legacyMigration.domainType) {
      const executionContext = ContextConverter.convertBusinessContext(
        legacyMigration.legacyContext,
        legacyMigration.domainType,
        { preserveLegacyFields: legacyMigration.preserveFields },
      );

      // Add converted context to unified options
      Object.assign(unifiedOptions, { executionContext });
    }

    return {
      options: unifiedOptions,
      metadata: {
        enhancementApplied: true,
        enhancementType: enhancementOptions.enhancementType,
        processingTime: 0,
        configurationUsed: legacyMigration,
        warnings: [],
        recommendations: [],
      },
    };
  }

  private static applyDomainConfiguration(
    options: GenerateOptions,
    enhancementOptions: EnhancementOptions,
  ): EnhancementResult {
    const domainConfig = enhancementOptions.domainConfiguration;
    if (!domainConfig) {
      throw new Error(
        "Domain configuration is required for domain-configuration enhancement",
      );
    }

    const unifiedOptions: UnifiedGenerationOptions = {
      ...options,
      enableEvaluation:
        enhancementOptions.performance?.enableEvaluation ?? true,
      enableAnalytics: enhancementOptions.performance?.enableAnalytics ?? true,
      evaluationDomain: domainConfig.domainType,
      context: {
        ...options.context,
        domainConfig: {
          domainType: domainConfig.domainType,
          keyTerms: domainConfig.keyTerms || [],
          failurePatterns: domainConfig.failurePatterns || [],
          successPatterns: domainConfig.successPatterns || [],
          evaluationCriteria: domainConfig.evaluationCriteria || {},
        },
      },
      preferStreaming: false,
      streamingFallback: true,
    };

    return {
      options: unifiedOptions,
      metadata: {
        enhancementApplied: true,
        enhancementType: enhancementOptions.enhancementType,
        processingTime: 0,
        configurationUsed: domainConfig,
        warnings: [],
        recommendations: [],
      },
    };
  }

  private static createErrorResult(
    options: GenerateOptions,
    enhancementOptions: EnhancementOptions,
    startTime: number,
  ): EnhancementResult {
    const unifiedOptions: UnifiedGenerationOptions = {
      ...options,
      preferStreaming: false,
      streamingFallback: true,
    };

    return {
      options: unifiedOptions,
      metadata: {
        enhancementApplied: false,
        enhancementType: enhancementOptions.enhancementType,
        processingTime: Date.now() - startTime,
        configurationUsed: {},
        warnings: ["Enhancement failed - using original options"],
        recommendations: ["Check enhancement configuration and try again"],
      },
    };
  }

  /**
   * Get enhancement statistics
   * Utility for monitoring enhancement usage
   */
  static getStatistics(): {
    enhancementCount: number;
    lastReset: number;
  } {
    return {
      enhancementCount: this.enhancementCount,
      lastReset: Date.now(),
    };
  }

  /**
   * Reset enhancement statistics
   * Utility for clearing counters
   */
  static resetStatistics(): void {
    if (OptionsEnhancer.enhancementCountArray) {
      Atomics.store(OptionsEnhancer.enhancementCountArray, 0, 0);
    } else {
      OptionsEnhancer.fallbackEnhancementCount = 0;
    }
    logger.debug("Enhancement statistics reset");
  }
}

/**
 * Convenience functions for common enhancement patterns
 */

/**
 * Quick streaming enhancement
 * Simplified interface for streaming optimization
 */
export function enhanceForStreaming(
  options: GenerateOptions,
  chunkSize: number = 1024,
): EnhancementResult {
  return OptionsEnhancer.enhanceForStreaming(options, {
    chunkSize,
    enableProgress: true,
  });
}

/**
 * Quick legacy migration
 * Simplified interface for legacy context migration
 */
export function migrateLegacyContext(
  options: GenerateOptions,
  legacyContext: Record<string, unknown>,
  domainType: string,
): EnhancementResult {
  return OptionsEnhancer.migrateFromLegacy(options, legacyContext, domainType);
}

/**
 * Batch enhancement utility with intelligent parallel processing
 * Automatically detects independent enhancements for parallel processing
 */
export function batchEnhance(
  options: GenerateOptions,
  enhancements: EnhancementOptions[],
): EnhancementResult {
  if (enhancements.length === 0) {
    return OptionsEnhancer.enhance(options, {
      enhancementType: "context-conversion",
    });
  }

  if (enhancements.length === 1) {
    return OptionsEnhancer.enhance(options, enhancements[0]);
  }

  // Analyze enhancement dependencies to determine processing strategy
  const independentGroups = analyzeEnhancementDependencies(enhancements);

  if (
    independentGroups.length === 1 &&
    independentGroups[0].length === enhancements.length
  ) {
    // All enhancements are independent - use parallel processing
    return batchEnhanceParallelOptimized(options, enhancements);
  } else {
    // Mixed dependencies - use sequential processing with parallelization where possible
    return batchEnhanceHybrid(options, enhancements, independentGroups);
  }
}

/**
 * Analyze enhancement dependencies to identify independent groups
 */
function analyzeEnhancementDependencies(
  enhancements: EnhancementOptions[],
): number[][] {
  const independentGroups: number[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < enhancements.length; i++) {
    if (processed.has(i)) {
      continue;
    }

    const currentGroup: number[] = [i];
    processed.add(i);

    // Check if subsequent enhancements are independent
    for (let j = i + 1; j < enhancements.length; j++) {
      if (processed.has(j)) {
        continue;
      }

      if (areEnhancementsIndependent(enhancements[i], enhancements[j])) {
        currentGroup.push(j);
        processed.add(j);
      }
    }

    independentGroups.push(currentGroup);
  }

  return independentGroups;
}

/**
 * Plugin-based conflict detection system
 * Extensible and configurable enhancement conflict resolution
 */
export interface ConflictDetectionPlugin {
  /** Plugin name for identification */
  name: string;
  /** Plugin version for compatibility checks */
  version: string;
  /** Check if two enhancement types conflict */
  detectConflict(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
    optionsA?: EnhancementOptions,
    optionsB?: EnhancementOptions,
  ): boolean;
  /** Get conflict severity (low, medium, high) */
  getConflictSeverity?(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
  ): "low" | "medium" | "high";
  /** Suggest resolution strategies */
  suggestResolution?(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
  ): string[];
}

/**
 * Default conflict detection plugin implementing the original hardcoded logic
 */
class DefaultConflictDetectionPlugin implements ConflictDetectionPlugin {
  name = "default-conflict-detector";
  version = "1.0.0";

  private static readonly ENHANCEMENT_CONFLICTS: Record<string, string[]> = {
    "domain-configuration": ["context-conversion", "legacy-migration"],
    "context-conversion": ["domain-configuration", "legacy-migration"],
    "streaming-optimization": ["batch-parallel-enhancement"],
    "mcp-integration": ["legacy-migration"],
    "legacy-migration": [
      "domain-configuration",
      "context-conversion",
      "mcp-integration",
    ],
    "batch-parallel-enhancement": [
      "streaming-optimization",
      "batch-hybrid-enhancement",
    ],
    "batch-hybrid-enhancement": ["batch-parallel-enhancement"],
    "batch-dependency-enhancement": [], // Can coexist with most enhancements
  };

  detectConflict(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
  ): boolean {
    // Same type enhancements may conflict
    if (enhancementA === enhancementB) {
      return false;
    }

    // Check configurable conflicts for enhancementA
    const conflictsA =
      DefaultConflictDetectionPlugin.ENHANCEMENT_CONFLICTS[enhancementA] || [];
    if (conflictsA.includes(enhancementB)) {
      return true;
    }

    // Check configurable conflicts for enhancementB
    const conflictsB =
      DefaultConflictDetectionPlugin.ENHANCEMENT_CONFLICTS[enhancementB] || [];
    if (conflictsB.includes(enhancementA)) {
      return true;
    }

    // No conflicts found
    return false;
  }

  getConflictSeverity(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
  ): "low" | "medium" | "high" {
    // Legacy migration conflicts are high severity
    if (
      enhancementA === "legacy-migration" ||
      enhancementB === "legacy-migration"
    ) {
      return "high";
    }

    // Context and domain conflicts are medium severity
    if (
      [enhancementA, enhancementB].some((type) =>
        ["context-conversion", "domain-configuration"].includes(type),
      )
    ) {
      return "medium";
    }

    // Other conflicts are low severity
    return "low";
  }

  suggestResolution(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
  ): string[] {
    const suggestions: string[] = [];

    if (
      enhancementA === "legacy-migration" ||
      enhancementB === "legacy-migration"
    ) {
      suggestions.push(
        "Complete legacy migration first, then apply other enhancements",
      );
      suggestions.push(
        "Consider using context-conversion instead of legacy-migration",
      );
    }

    if (
      enhancementA === "streaming-optimization" &&
      enhancementB === "batch-parallel-enhancement"
    ) {
      suggestions.push("Use streaming-optimization for single requests");
      suggestions.push(
        "Use batch-parallel-enhancement for multiple independent requests",
      );
    }

    if (suggestions.length === 0) {
      suggestions.push(
        "Apply enhancements sequentially instead of in parallel",
      );
      suggestions.push("Review enhancement requirements for compatibility");
    }

    return suggestions;
  }
}

/**
 * Advanced conflict detection plugin with context-aware analysis
 */
class AdvancedConflictDetectionPlugin implements ConflictDetectionPlugin {
  name = "advanced-conflict-detector";
  version = "1.0.0";

  detectConflict(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
    optionsA?: EnhancementOptions,
    optionsB?: EnhancementOptions,
  ): boolean {
    // Context-aware conflict detection based on actual options
    if (
      this.hasContextualConflict(enhancementA, enhancementB, optionsA, optionsB)
    ) {
      return true;
    }

    // Performance-based conflict detection
    if (
      this.hasPerformanceConflict(
        enhancementA,
        enhancementB,
        optionsA,
        optionsB,
      )
    ) {
      return true;
    }

    return false;
  }

  private hasContextualConflict(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
    optionsA?: EnhancementOptions,
    optionsB?: EnhancementOptions,
  ): boolean {
    // Check for overlapping context modifications
    if (
      enhancementA === "context-conversion" &&
      enhancementB === "mcp-integration" &&
      optionsA?.legacyMigration?.legacyContext &&
      optionsB?.mcpOptions?.executionContext
    ) {
      return true; // Both modify execution context
    }

    // Check for conflicting streaming settings
    if (
      enhancementA === "streaming-optimization" &&
      enhancementB === "mcp-integration" &&
      optionsA?.streamingOptions?.enabled &&
      optionsB?.mcpOptions?.enableToolRegistry
    ) {
      return false; // These can actually work together
    }

    return false;
  }

  private hasPerformanceConflict(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
    _optionsA?: EnhancementOptions,
    _optionsB?: EnhancementOptions,
  ): boolean {
    // Check for performance-affecting combinations
    const highPerformanceEnhancements = [
      "batch-parallel-enhancement",
      "streaming-optimization",
    ];

    if (
      highPerformanceEnhancements.includes(enhancementA) &&
      highPerformanceEnhancements.includes(enhancementB)
    ) {
      return true; // Multiple performance enhancements may conflict
    }

    return false;
  }

  getConflictSeverity(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
  ): "low" | "medium" | "high" {
    // Context conflicts are always high severity
    if (
      [enhancementA, enhancementB].some((type) =>
        ["context-conversion", "legacy-migration"].includes(type),
      )
    ) {
      return "high";
    }

    // Performance conflicts are medium severity
    if (
      [enhancementA, enhancementB].some((type) =>
        ["streaming-optimization", "batch-parallel-enhancement"].includes(type),
      )
    ) {
      return "medium";
    }

    return "low";
  }

  suggestResolution(
    _enhancementA: EnhancementType,
    _enhancementB: EnhancementType,
  ): string[] {
    return [
      "Consider applying enhancements in phases based on priority",
      "Use hybrid enhancement approach with sequential processing",
      "Review options for compatibility before combining enhancements",
    ];
  }
}

/**
 * Plugin registry for managing conflict detection plugins
 */
class ConflictDetectionRegistry {
  private plugins: Map<string, ConflictDetectionPlugin> = new Map();
  private activePlugins: string[] = [];

  constructor() {
    // Register default plugins
    this.registerPlugin(new DefaultConflictDetectionPlugin());
    this.registerPlugin(new AdvancedConflictDetectionPlugin());

    // Set default active plugin
    this.setActivePlugins(["default-conflict-detector"]);
  }

  /**
   * Register a new conflict detection plugin
   */
  registerPlugin(plugin: ConflictDetectionPlugin): void {
    this.plugins.set(plugin.name, plugin);
    logger.debug(
      `Registered conflict detection plugin: ${plugin.name} v${plugin.version}`,
    );
  }

  /**
   * Set active plugins (in order of priority)
   */
  setActivePlugins(pluginNames: string[]): void {
    // Validate all plugins exist
    const validPlugins = pluginNames.filter((name) => this.plugins.has(name));
    if (validPlugins.length !== pluginNames.length) {
      const missing = pluginNames.filter((name) => !this.plugins.has(name));
      logger.warn(`Missing conflict detection plugins: ${missing.join(", ")}`);
    }

    this.activePlugins = validPlugins;
    logger.debug(
      `Active conflict detection plugins: ${this.activePlugins.join(", ")}`,
    );
  }

  /**
   * Detect conflicts using active plugins
   */
  detectConflicts(
    enhancementA: EnhancementType,
    enhancementB: EnhancementType,
    optionsA?: EnhancementOptions,
    optionsB?: EnhancementOptions,
  ): {
    hasConflict: boolean;
    severity: "low" | "medium" | "high";
    detectedBy: string[];
    suggestions: string[];
  } {
    const detectedBy: string[] = [];
    const allSuggestions: string[] = [];
    let maxSeverity: "low" | "medium" | "high" = "low";

    // Check all active plugins
    for (const pluginName of this.activePlugins) {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) {
        continue;
      }

      const hasConflict = plugin.detectConflict(
        enhancementA,
        enhancementB,
        optionsA,
        optionsB,
      );

      if (hasConflict) {
        detectedBy.push(pluginName);

        // Get severity
        if (plugin.getConflictSeverity) {
          const severity = plugin.getConflictSeverity(
            enhancementA,
            enhancementB,
          );
          if (
            severity === "high" ||
            (severity === "medium" && maxSeverity === "low")
          ) {
            maxSeverity = severity;
          }
        }

        // Get suggestions
        if (plugin.suggestResolution) {
          const suggestions = plugin.suggestResolution(
            enhancementA,
            enhancementB,
          );
          allSuggestions.push(...suggestions);
        }
      }
    }

    return {
      hasConflict: detectedBy.length > 0,
      severity: maxSeverity,
      detectedBy,
      suggestions: Array.from(new Set(allSuggestions)), // Remove duplicates
    };
  }

  /**
   * Get information about registered plugins
   */
  getPluginInfo(): Array<{
    name: string;
    version: string;
    active: boolean;
  }> {
    return Array.from(this.plugins.values()).map((plugin) => ({
      name: plugin.name,
      version: plugin.version,
      active: this.activePlugins.includes(plugin.name),
    }));
  }
}

// Global registry instance
const conflictDetectionRegistry = new ConflictDetectionRegistry();

/**
 * Get the global conflict detection registry for plugin management
 * Allows external systems to register custom conflict detection plugins
 */
export function getConflictDetectionRegistry(): ConflictDetectionRegistry {
  return conflictDetectionRegistry;
}

/**
 * Check if two enhancements are independent (don't affect same properties)
 * Now uses plugin-based conflict detection for extensibility
 */
function areEnhancementsIndependent(
  enhancementA: EnhancementOptions,
  enhancementB: EnhancementOptions,
): boolean {
  const typeA = enhancementA.enhancementType || "context-conversion";
  const typeB = enhancementB.enhancementType || "context-conversion";

  // Same type enhancements may conflict
  if (typeA === typeB) {
    return false;
  }

  // Use plugin-based conflict detection
  const conflictResult = conflictDetectionRegistry.detectConflicts(
    typeA,
    typeB,
    enhancementA,
    enhancementB,
  );

  // Enhancements are independent if no conflicts are detected
  return !conflictResult.hasConflict;
}

/**
 * Optimized parallel processing for fully independent enhancements
 */
function batchEnhanceParallelOptimized(
  options: GenerateOptions,
  enhancements: EnhancementOptions[],
): EnhancementResult {
  const results = enhancements.map((enhancement) =>
    OptionsEnhancer.enhance(options, enhancement),
  );

  // Merge all enhancement results
  let finalOptions = options;
  const allWarnings: string[] = [];
  const allRecommendations: string[] = [];
  let totalProcessingTime = 0;

  for (const result of results) {
    // Merge options (later enhancements override earlier ones for conflicts)
    finalOptions = {
      ...finalOptions,
      ...result.options,
      // Merge context and factoryConfig carefully
      context: {
        ...finalOptions.context,
        ...result.options.context,
      },
      factoryConfig: {
        ...finalOptions.factoryConfig,
        ...result.options.factoryConfig,
      },
    };

    allWarnings.push(...result.metadata.warnings);
    allRecommendations.push(...result.metadata.recommendations);
    totalProcessingTime += result.metadata.processingTime;
  }

  return {
    options: finalOptions,
    metadata: {
      enhancementApplied: true,
      enhancementType: "batch-parallel-enhancement",
      processingTime: totalProcessingTime,
      configurationUsed: {
        parallelProcessing: true,
        enhancementCount: enhancements.length,
      },
      warnings: Array.from(new Set(allWarnings)),
      recommendations: Array.from(new Set(allRecommendations)),
    },
  };
}

/**
 * Hybrid processing for mixed dependencies
 */
function batchEnhanceHybrid(
  options: GenerateOptions,
  enhancements: EnhancementOptions[],
  independentGroups: number[][],
): EnhancementResult {
  let currentOptions = options;
  let finalResult: EnhancementResult | null = null;
  const allWarnings: string[] = [];
  const allRecommendations: string[] = [];
  let totalProcessingTime = 0;

  for (const group of independentGroups) {
    if (group.length === 1) {
      // Single enhancement - process normally
      const result = OptionsEnhancer.enhance(
        currentOptions,
        enhancements[group[0]],
      );
      currentOptions = result.options;
      finalResult = result;
    } else {
      // Multiple independent enhancements - process in parallel
      const groupEnhancements = group.map((idx) => enhancements[idx]);
      const result = batchEnhanceParallelOptimized(
        currentOptions,
        groupEnhancements,
      );
      currentOptions = result.options;
      finalResult = result;
    }

    if (finalResult) {
      allWarnings.push(...finalResult.metadata.warnings);
      allRecommendations.push(...finalResult.metadata.recommendations);
      totalProcessingTime += finalResult.metadata.processingTime;
    }
  }

  if (finalResult) {
    finalResult.metadata.warnings = Array.from(new Set(allWarnings));
    finalResult.metadata.recommendations = Array.from(
      new Set(allRecommendations),
    );
    finalResult.metadata.processingTime = totalProcessingTime;
    finalResult.metadata.enhancementType = "batch-hybrid-enhancement";
  }

  return finalResult || OptionsEnhancer.enhance(options, enhancements[0]);
}

/**
 * Parallel batch enhancement utility
 * Apply multiple independent enhancements in parallel for better performance
 * Note: Only use for independent enhancements that don't depend on each other
 */
export async function batchEnhanceParallel(
  baseOptions: GenerateOptions[],
  enhancements: EnhancementOptions[],
): Promise<EnhancementResult[]> {
  if (baseOptions.length !== enhancements.length) {
    throw new Error(
      "baseOptions and enhancements arrays must have the same length",
    );
  }

  // Validate all enhancements before processing
  for (let i = 0; i < baseOptions.length; i++) {
    const validation = OptionsEnhancer.validateEnhancement(
      baseOptions[i],
      enhancements[i],
    );
    if (!validation.valid) {
      throw new Error(
        `Enhancement validation failed for item ${i}: ${validation.warnings.join(", ")}`,
      );
    }
  }

  // Process enhancements in parallel for independent operations
  const enhancementPromises = baseOptions.map((options, index) => {
    return Promise.resolve(
      OptionsEnhancer.enhance(options, enhancements[index]),
    );
  });

  try {
    const results = await Promise.all(enhancementPromises);

    // Log parallel processing statistics
    logger.debug(
      `Parallel enhancement completed: ${results.length} items processed concurrently`,
    );

    return results;
  } catch (error) {
    logger.error(`Parallel enhancement failed: ${error}`);
    throw error;
  }
}

/**
 * Batch enhancement with dependency handling
 * Apply enhancements with proper dependency resolution
 */
export function batchEnhanceWithDependencies(
  options: GenerateOptions,
  enhancements: (EnhancementOptions & { dependsOn?: number[] })[],
): EnhancementResult {
  // Validate dependency graph first
  const validateDependencies = (): void => {
    for (let i = 0; i < enhancements.length; i++) {
      const enhancement = enhancements[i];
      if (enhancement.dependsOn) {
        for (const depIndex of enhancement.dependsOn) {
          if (depIndex >= enhancements.length || depIndex < 0) {
            throw new Error(
              `Invalid dependency: enhancement ${i} depends on non-existent enhancement ${depIndex}`,
            );
          }
          if (depIndex >= i) {
            throw new Error(
              `Circular or forward dependency detected: enhancement ${i} depends on ${depIndex}`,
            );
          }
        }
      }
    }
  };

  validateDependencies();

  // Build dependency graph
  const processed = new Set<number>();
  const results: EnhancementResult[] = [];
  let currentOptions = options;

  // Process enhancements in dependency order
  const processEnhancement = (index: number): void => {
    if (processed.has(index)) {
      return;
    }

    const enhancement = enhancements[index];

    // Process dependencies first
    if (enhancement.dependsOn) {
      for (const depIndex of enhancement.dependsOn) {
        processEnhancement(depIndex);
      }
    }

    // Validate enhancement before processing
    const validation = OptionsEnhancer.validateEnhancement(
      currentOptions,
      enhancement,
    );
    if (!validation.valid) {
      logger.warn(
        `Enhancement ${index} validation warnings: ${validation.warnings.join(", ")}`,
      );
    }

    // Process current enhancement
    const result = OptionsEnhancer.enhance(currentOptions, enhancement);
    currentOptions = result.options;
    results.push(result);
    processed.add(index);

    logger.debug(
      `Processed enhancement ${index}: ${enhancement.enhancementType} (${result.metadata.processingTime}ms)`,
    );
  };

  // Process all enhancements
  for (let i = 0; i < enhancements.length; i++) {
    processEnhancement(i);
  }

  // Combine results
  const allWarnings = results.flatMap((r) => r.metadata.warnings);
  const allRecommendations = results.flatMap((r) => r.metadata.recommendations);
  const totalProcessingTime = results.reduce(
    (sum, r) => sum + r.metadata.processingTime,
    0,
  );

  const finalResult = results[results.length - 1];
  if (finalResult) {
    finalResult.metadata.warnings = Array.from(new Set(allWarnings));
    finalResult.metadata.recommendations = Array.from(
      new Set(allRecommendations),
    );
    finalResult.metadata.processingTime = totalProcessingTime;
    finalResult.metadata.enhancementType = "batch-dependency-enhancement";
    finalResult.metadata.configurationUsed = {
      ...finalResult.metadata.configurationUsed,
      dependencyChainLength: results.length,
      enhancementTypes: results.map((r) => r.metadata.enhancementType),
    };
  }

  logger.debug(
    `Dependency batch enhancement completed: ${results.length} enhancements processed in ${totalProcessingTime}ms`,
  );

  return finalResult || OptionsEnhancer.enhance(options, enhancements[0]);
}
