/**
 * MCP Caching Module - Tool result and response caching
 *
 * Provides intelligent caching for MCP tool calls:
 * - Multiple eviction strategies (LRU, FIFO, LFU)
 * - Automatic cache key generation
 * - Pattern-based invalidation
 * - Cache statistics and monitoring
 */

export type {
  CacheConfig,
  CacheEvents,
  CacheStats,
  CacheStrategy,
} from "./toolCache.js";
export {
  createToolCache,
  createToolResultCache,
  DEFAULT_CACHE_CONFIG,
  ToolCache,
  ToolResultCache,
} from "./toolCache.js";
