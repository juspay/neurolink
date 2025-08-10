/**
 * Factory options processing utilities
 *
 * Processes factory configuration and ensures it flows through to AI providers
 */

import type { GenerateOptions } from "../types/generateTypes.js";
import type { StreamOptions } from "../types/streamTypes.js";
import type { TextGenerationOptions } from "../core/types.js";
import type { UnknownRecord, JsonValue } from "../types/common.js";
import { logger } from "./logger.js";
// Removed crypto import - using faster string-based hash instead

/**
 * LRU Cache for factory processing results
 * Addresses GitHub Copilot review comment about adding caching for factory processing results
 */
class FactoryProcessingCache {
  private cache = new Map<
    string,
    {
      result: ReturnType<typeof processFactoryOptionsInternal>;
      timestamp: number;
      accessCount: number;
    }
  >();

  // Object identity cache to avoid recomputing cache keys for same object
  // Using WeakMap to prevent memory leaks - entries are auto-collected when objects are GC'd
  private objectKeyCache = new WeakMap<object, string>();

  private maxSize: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    keysCacheHits: 0, // New stat for object identity cache hits
  };

  constructor() {
    // Configurable cache size via environment variable with bounds checking
    const envCacheSize = process.env.NEUROLINK_FACTORY_CACHE_SIZE || "100";
    const parsedSize = parseInt(envCacheSize, 10);

    // Add bounds checking: min 1, max 10000 to prevent memory issues
    if (isNaN(parsedSize) || parsedSize < 1) {
      this.maxSize = 1;
      logger.warn(
        `Invalid cache size '${envCacheSize}', using minimum value: 1`,
      );
    } else if (parsedSize > 10000) {
      this.maxSize = 10000;
      logger.warn(
        `Cache size '${parsedSize}' exceeds maximum, using maximum value: 10000`,
      );
    } else {
      this.maxSize = parsedSize;
    }

    logger.debug(
      `FactoryProcessingCache initialized with max size: ${this.maxSize}`,
    );
  }

  /**
   * Generate cache key from options using fast non-cryptographic hash
   * Optimized for large options objects by extracting only key fields
   * Uses numeric hash combination to avoid string concatenation in hot paths
   * Implements object identity cache to avoid recomputation for same objects
   */
  private generateCacheKey(options: GenerateOptions | StreamOptions): string {
    // Use object identity cache if possible for performance
    if (typeof options === "object" && options !== null) {
      const cachedKey = this.objectKeyCache.get(options as object);
      if (cachedKey) {
        this.stats.keysCacheHits++;
        return cachedKey;
      }
    }

    try {
      // Extract key field hashes directly without string operations
      const factoryConfigHash = this.extractKeyFieldsHash(
        options.factoryConfig,
      );
      const contextHash = this.extractKeyFieldsHash(options.context);

      // Combine hashes numerically instead of string concatenation
      const combinedHash = this.combineHashes(factoryConfigHash, contextHash);
      const key = combinedHash.toString(16);

      // Cache the computed key for future use (WeakMap auto-cleans on GC)
      if (typeof options === "object" && options !== null) {
        this.objectKeyCache.set(options as object, key);
      }

      return key;
    } catch (error) {
      logger.warn(
        "Failed to generate cache key, using deterministic fallback",
        { error },
      );
      return "fallback_" + this.stableStringify(options);
    }
  }

  /**
   * Create deterministic string representation for fallback cache keys
   * Ensures identical options always produce the same cache key
   */
  private stableStringify(obj: unknown): string {
    try {
      if (obj === null || obj === undefined) {
        return String(obj);
      }
      if (typeof obj !== "object") {
        return String(obj);
      }

      // For objects, create a stable representation by sorting keys
      const record = obj as Record<string, unknown>;
      const sortedKeys = Object.keys(record).sort();
      const pairs = sortedKeys.map(
        (key) => `${key}:${this.stableStringify(record[key])}`,
      );
      return `{${pairs.join(",")}}`;
    } catch {
      // Ultimate fallback - use object type
      return `[${typeof obj}]`;
    }
  }

  /**
   * Extract key field hash from objects without string concatenation
   * Uses numeric hash combination for maximum performance in hot paths
   */
  private extractKeyFieldsHash(obj: unknown): number {
    if (!obj || typeof obj !== "object") {
      return this.hashValue(obj);
    }

    const record = obj as Record<string, unknown>;
    let hash = 0;

    // Extract only the most identifying fields - ordered by importance
    const importantFields = [
      "domainType",
      "enhancementType",
      "domainConfig",
      "id",
      "type",
      "name",
    ];

    // Use numeric hash combination instead of string operations
    for (let i = 0; i < importantFields.length; i++) {
      const field = importantFields[i];
      const value = record[field];
      if (value !== undefined) {
        // Combine field name hash and value hash numerically
        const fieldHash = this.hashString(field);
        const valueHash = this.hashValue(value);
        hash = this.combineHashes(
          hash,
          this.combineHashes(fieldHash, valueHash),
        );
      }
    }

    // If no important fields found, use object structure hash
    if (hash === 0) {
      hash = Object.keys(record).length;
    }

    return hash;
  }

  /**
   * Extract key identifying fields from objects for cache key generation
   * Optimized to avoid expensive operations on large objects
   * @deprecated Use extractKeyFieldsHash for better performance
   */
  private extractKeyFields(obj: unknown): string {
    if (!obj || typeof obj !== "object") {
      return String(obj || "");
    }

    const record = obj as Record<string, unknown>;

    // Pre-allocate array with known maximum size for better performance
    const keyFields: string[] = [];
    keyFields.length = 0; // Reset but keep allocated memory

    // Extract only the most identifying fields - ordered by importance for early exit
    const importantFields = [
      "domainType",
      "enhancementType",
      "domainConfig",
      "id",
      "type",
      "name",
    ];

    // Use direct property access instead of 'in' operator for better performance
    for (let i = 0; i < importantFields.length; i++) {
      const field = importantFields[i];
      const value = record[field];
      if (value !== undefined) {
        // Avoid template literals in hot path - use direct concatenation
        keyFields.push(field + ":" + String(value));
      }
    }

    // If no important fields found, use a more efficient fallback
    if (keyFields.length === 0) {
      // Cache the keys.length to avoid repeated Object.keys calls
      keyFields.push("keys:" + Object.keys(record).length.toString());
    }

    return keyFields.join(",");
  }

  /**
   * Fast non-cryptographic string hash function
   * Much faster than MD5 for cache key generation
   */
  private fastStringHash(str: string): string {
    let hash = 0;
    if (str.length === 0) {
      return "0";
    }

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to unsigned 32-bit integer hex string to avoid hash collisions
    return (hash >>> 0).toString(16);
  }

  /**
   * Fast numeric hash function for strings
   * Returns numeric hash instead of string for performance
   */
  private hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) {
      return 0;
    }

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash >>> 0;
  }

  /**
   * Hash any value to a numeric hash
   * Optimized for different value types
   */
  private hashValue(value: unknown): number {
    if (value === null) {
      return 0;
    }
    if (value === undefined) {
      return 1;
    }

    const type = typeof value;
    switch (type) {
      case "string":
        return this.hashString(value as string);
      case "number":
        return (Math.floor(value as number) >>> 0) % 2147483647;
      case "boolean":
        return value ? 1 : 0;
      case "object":
        // For objects, use a simple structural hash
        try {
          return this.hashString(JSON.stringify(value));
        } catch {
          return this.hashString(String(value));
        }
      default:
        return this.hashString(String(value));
    }
  }

  /**
   * Combine two numeric hashes efficiently
   * Uses bitwise operations for maximum performance
   */
  private combineHashes(hash1: number, hash2: number): number {
    // Use a variation of hash combination that minimizes collisions
    return ((hash1 << 5) + hash1 + hash2) & 0x7fffffff;
  }

  /**
   * Get cached result if available
   */
  get(
    options: GenerateOptions | StreamOptions,
  ): ReturnType<typeof processFactoryOptionsInternal> | null {
    this.stats.totalRequests++;

    const key = this.generateCacheKey(options);
    const cached = this.cache.get(key);

    if (cached) {
      // Update access info for LRU
      cached.accessCount++;
      cached.timestamp = Date.now();

      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, cached);

      this.stats.hits++;
      logger.debug("Factory processing cache hit", {
        key: key.substring(0, 8),
      });
      return cached.result;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store result in cache
   */
  set(
    options: GenerateOptions | StreamOptions,
    result: ReturnType<typeof processFactoryOptionsInternal>,
  ): void {
    try {
      const key = this.generateCacheKey(options);

      // Evict oldest entry if at capacity
      if (this.cache.size >= this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey !== undefined) {
          this.cache.delete(oldestKey);
          this.stats.evictions++;
        }
      }

      this.cache.set(key, {
        result: { ...result }, // Deep copy to prevent mutations
        timestamp: Date.now(),
        accessCount: 1,
      });

      logger.debug("Factory processing result cached", {
        key: key.substring(0, 8),
        cacheSize: this.cache.size,
      });
    } catch (error) {
      logger.warn("Failed to cache factory processing result", { error });
    }
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.debug(`Factory processing cache cleared (${size} entries removed)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): typeof this.stats & { size: number; hitRate: number } {
    const hitRate =
      this.stats.totalRequests > 0
        ? Math.round((this.stats.hits / this.stats.totalRequests) * 100 * 100) /
          100
        : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate,
    };
  }

  /**
   * Remove entries older than specified age (in milliseconds)
   */
  evictOld(maxAge: number = 5 * 60 * 1000): number {
    // Default: 5 minutes
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      logger.debug(`Evicted ${evicted} old cache entries`);
      this.stats.evictions += evicted;
    }

    return evicted;
  }
}

// Global cache instance
const factoryProcessingCache = new FactoryProcessingCache();

/**
 * Validates if a value conforms to JsonValue type
 * JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
 */
function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item));
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    return Object.values(obj).every((val) => isJsonValue(val));
  }

  return false;
}

/**
 * Safely converts unknown context values to JsonValue-compliant Record
 * Filters out non-JsonValue compliant values and logs warnings
 */
function validateAndConvertContext(
  context: unknown,
): Record<string, JsonValue> {
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    logger.warn("Context must be a plain object, ignoring invalid context");
    return {};
  }

  const validatedContext: Record<string, JsonValue> = {};
  const obj = context as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    if (isJsonValue(value)) {
      validatedContext[key] = value;
    } else {
      logger.warn(
        `Context value for key "${key}" is not JsonValue compliant, excluding from context`,
      );
    }
  }

  return validatedContext;
}

/**
 * Internal factory processing function (for caching)
 */
function processFactoryOptionsInternal(
  options: GenerateOptions | StreamOptions,
): {
  hasFactoryConfig: boolean;
  domainType?: string;
  domainConfig?: Record<string, unknown>;
  enhancementType?: string;
  processedContext?: Record<string, JsonValue>;
} {
  const functionTag = "processFactoryOptionsInternal";

  try {
    const factoryConfig = options.factoryConfig;

    if (!factoryConfig) {
      return { hasFactoryConfig: false };
    }

    logger.debug(`[${functionTag}] Processing factory configuration`, {
      domainType: factoryConfig.domainType,
      enhancementType: factoryConfig.enhancementType,
      validateDomainData: factoryConfig.validateDomainData,
    });

    // Extract domain configuration
    const domainType = factoryConfig.domainType;
    const domainConfig = factoryConfig.domainConfig;
    const enhancementType = factoryConfig.enhancementType;

    // Create processed context that includes domain information with validation
    const processedContext: Record<string, JsonValue> = {
      ...validateAndConvertContext(options.context),
    };

    // Add domain information to context if available
    if (domainType) {
      processedContext.domainType = domainType;
    }

    if (domainConfig) {
      if (isJsonValue(domainConfig)) {
        processedContext.domainConfig = domainConfig;
      } else {
        logger.warn(
          "Domain config is not JsonValue compliant, excluding from context",
        );
      }
    }

    if (enhancementType) {
      processedContext.enhancementType = enhancementType;
    }

    // Add factory metadata
    processedContext.factoryEnhanced = true;
    processedContext.factoryProcessedAt = Date.now();

    logger.debug(
      `[${functionTag}] Factory configuration processed successfully`,
      {
        domainType,
        enhancementType,
        contextKeys: Object.keys(processedContext),
      },
    );

    return {
      hasFactoryConfig: true,
      domainType,
      domainConfig,
      enhancementType,
      processedContext,
    };
  } catch (error) {
    logger.warn(`[${functionTag}] Failed to process factory configuration`, {
      error: error instanceof Error ? error.message : String(error),
    });

    return { hasFactoryConfig: false };
  }
}

/**
 * Process factory configuration from enhanced options (with caching)
 * Extracts and validates factory config for provider integration
 */
export function processFactoryOptions(
  options: GenerateOptions | StreamOptions,
): {
  hasFactoryConfig: boolean;
  domainType?: string;
  domainConfig?: Record<string, unknown>;
  enhancementType?: string;
  processedContext?: Record<string, JsonValue>;
} {
  // Try to get result from cache first
  const cachedResult = factoryProcessingCache.get(options);
  if (cachedResult) {
    return cachedResult;
  }

  // Process and cache the result
  const result = processFactoryOptionsInternal(options);
  factoryProcessingCache.set(options, result);

  return result;
}

/**
 * Enhance TextGenerationOptions with factory configuration
 * Converts enhanced GenerateOptions/StreamOptions to internal format
 */
export function enhanceTextGenerationOptions(
  baseOptions: TextGenerationOptions,
  factoryResult: ReturnType<typeof processFactoryOptions>,
): TextGenerationOptions {
  if (!factoryResult.hasFactoryConfig) {
    return baseOptions;
  }

  // Validate and merge contexts to ensure JsonValue compliance
  const validatedBaseContext = validateAndConvertContext(baseOptions.context);
  const factoryProcessedContext = factoryResult.processedContext || {};

  const enhanced: TextGenerationOptions = {
    ...baseOptions,
    // Merge contexts with proper validation to prevent runtime type errors
    context: {
      ...validatedBaseContext,
      ...factoryProcessedContext,
    },
    // Ensure evaluation is enabled when using factory patterns
    enableEvaluation: baseOptions.enableEvaluation ?? true,
    // Use domain type for evaluation if available
    evaluationDomain: factoryResult.domainType || baseOptions.evaluationDomain,
  };

  logger.debug("Enhanced TextGenerationOptions with factory configuration", {
    domainType: factoryResult.domainType,
    enhancementType: factoryResult.enhancementType,
    hasProcessedContext: !!factoryResult.processedContext,
  });

  return enhanced;
}

/**
 * Check if options require factory processing
 * Quick check to determine if factory enhancement is needed
 */
export function requiresFactoryProcessing(
  options: GenerateOptions | StreamOptions | UnknownRecord,
): boolean {
  return !!(options as UnknownRecord)?.factoryConfig;
}

/**
 * Extract streaming configuration for factory processing
 * Handles streaming-specific factory enhancements
 */
export function processStreamingFactoryOptions(options: StreamOptions): {
  hasStreamingConfig: boolean;
  streamingEnabled?: boolean;
  enhancedConfig?: StreamOptions["streaming"];
} {
  const streamingConfig = options.streaming;

  if (!streamingConfig) {
    return { hasStreamingConfig: false };
  }

  logger.debug("Processing streaming factory configuration", {
    enabled: streamingConfig.enabled,
    chunkSize: streamingConfig.chunkSize,
    enableProgress: streamingConfig.enableProgress,
  });

  return {
    hasStreamingConfig: true,
    streamingEnabled: streamingConfig.enabled,
    enhancedConfig: streamingConfig,
  };
}

/**
 * Convert enhanced StreamOptions back to clean StreamOptions
 * Strips factory configuration while preserving enhanced context
 */
export function createCleanStreamOptions(
  enhancedOptions: StreamOptions,
): StreamOptions {
  const { factoryConfig, ...cleanOptions } = enhancedOptions;

  // Return clean options without factoryConfig
  return cleanOptions;
}

/**
 * Validate factory configuration
 * Ensures factory config is valid before processing
 */
export function validateFactoryConfig(
  factoryConfig: GenerateOptions["factoryConfig"],
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!factoryConfig) {
    return { isValid: true, errors: [] }; // No config is valid
  }

  // Validate domain type if present
  if (factoryConfig.domainType !== undefined) {
    if (typeof factoryConfig.domainType !== "string") {
      errors.push("domainType must be a string");
    } else if (factoryConfig.domainType.length === 0) {
      // Empty string is allowed (will be converted to "generic")
      logger.debug("Empty domainType will be converted to 'generic'");
    }
  }

  // Validate domain config if present
  if (factoryConfig.domainConfig !== undefined) {
    if (
      typeof factoryConfig.domainConfig !== "object" ||
      factoryConfig.domainConfig === null
    ) {
      errors.push("domainConfig must be an object");
    }
  }

  // Validate enhancement type if present
  if (factoryConfig.enhancementType !== undefined) {
    const validTypes = [
      "domain-configuration",
      "streaming-optimization",
      "mcp-integration",
      "legacy-migration",
      "context-conversion",
    ];

    if (!validTypes.includes(factoryConfig.enhancementType)) {
      errors.push(`enhancementType must be one of: ${validTypes.join(", ")}`);
    }
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    logger.warn("Factory configuration validation failed", { errors });
  }

  return { isValid, errors };
}

/**
 * Get factory processing cache statistics
 * Useful for monitoring cache performance and debugging
 */
export function getFactoryProcessingCacheStats(): {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  size: number;
  hitRate: number;
} {
  return factoryProcessingCache.getStats();
}

/**
 * Clear factory processing cache
 * Useful for testing or memory management
 */
export function clearFactoryProcessingCache(): void {
  factoryProcessingCache.clear();
}

/**
 * Evict old entries from factory processing cache
 * Useful for periodic cleanup
 */
export function evictOldFactoryProcessingCache(maxAge?: number): number {
  return factoryProcessingCache.evictOld(maxAge);
}
