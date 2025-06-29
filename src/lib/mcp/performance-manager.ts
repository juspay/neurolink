/**
 * Performance Manager for MCP Operations
 * Implements caching, connection pooling, and optimization patterns
 * Based on production patterns from VS Code and GitHub MCP servers
 */

import { MCPTool, MCPToolResult } from './types/mcp-protocol.js';
import { mcpLogger } from './logging.js';

export interface CachedResult {
  result: MCPToolResult;
  timestamp: number;
  expiry: number;
  hits: number;
  serverName: string;
  toolName: string;
}

export interface PerformanceMetrics {
  toolExecutions: number;
  cacheHits: number;
  cacheMisses: number;
  averageExecutionTime: number;
  connectionPoolSize: number;
  totalRequests: number;
}

export interface CacheOptions {
  enableCaching: boolean;
  defaultTTL: number; // Time to live in milliseconds
  maxCacheSize: number;
  cacheCompressionThreshold: number; // Results larger than this will be compressed
}

export interface ConnectionPoolOptions {
  maxIdleConnections: number;
  maxActiveConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
}

export class ToolResultCache {
  private cache = new Map<string, CachedResult>();
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0
  };

  constructor(private options: CacheOptions) {}

  /**
   * Generate cache key for tool execution
   */
  private generateCacheKey(serverName: string, toolName: string, args: any): string {
    const argsHash = this.hashObject(args);
    return `${serverName}:${toolName}:${argsHash}`;
  }

  /**
   * Get cached result if available and not expired
   */
  async getCachedResult(
    serverName: string, 
    toolName: string, 
    args: any
  ): Promise<MCPToolResult | null> {
    if (!this.options.enableCaching) {
      return null;
    }

    const key = this.generateCacheKey(serverName, toolName, args);
    const cached = this.cache.get(key);

    if (!cached) {
      this.metrics.misses++;
      return null;
    }

    if (this.isExpired(cached)) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }

    // Update hit count and metrics
    cached.hits++;
    this.metrics.hits++;
    
    mcpLogger.debug(`[Cache] Hit for ${serverName}:${toolName} (${cached.hits} hits)`);
    return cached.result;
  }

  /**
   * Store result in cache
   */
  async setCachedResult(
    serverName: string,
    toolName: string,
    args: any,
    result: MCPToolResult,
    customTTL?: number
  ): Promise<void> {
    if (!this.options.enableCaching) {
      return;
    }

    const key = this.generateCacheKey(serverName, toolName, args);
    const ttl = customTTL || this.options.defaultTTL;
    const now = Date.now();

    // Check if we need to evict items to make space
    if (this.cache.size >= this.options.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    // Compress large results if needed
    let processedResult = result;
    const resultSize = JSON.stringify(result).length;
    
    if (resultSize > this.options.cacheCompressionThreshold) {
      processedResult = await this.compressResult(result);
    }

    const cachedItem: CachedResult = {
      result: processedResult,
      timestamp: now,
      expiry: now + ttl,
      hits: 0,
      serverName,
      toolName
    };

    this.cache.set(key, cachedItem);
    mcpLogger.debug(`[Cache] Stored ${serverName}:${toolName} (TTL: ${ttl}ms, Size: ${resultSize})`);
  }

  /**
   * Check if cached result is expired
   */
  private isExpired(cached: CachedResult): boolean {
    return Date.now() > cached.expiry;
  }

  /**
   * Evict least recently used items
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;

    // Find item with lowest hits and oldest timestamp
    let lruKey: string | null = null;
    let lruScore = Infinity;

    for (const [key, item] of this.cache) {
      // Score based on hits and recency (lower is worse)
      const score = item.hits + (Date.now() - item.timestamp) / 1000000;
      
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.metrics.evictions++;
      mcpLogger.debug(`[Cache] Evicted LRU item: ${lruKey}`);
    }
  }

  /**
   * Clear expired entries
   */
  async cleanupExpired(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      mcpLogger.debug(`[Cache] Cleaned up ${cleaned} expired entries`);
    }

    return cleaned;
  }

  /**
   * Get cache statistics
   */
  getMetrics(): typeof this.metrics & { hitRate: number; size: number } {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
      size: this.cache.size
    };
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.metrics = { hits: 0, misses: 0, evictions: 0, totalSize: 0 };
    mcpLogger.debug('[Cache] Cleared all entries');
  }

  /**
   * Determine if tool result should be cached
   */
  shouldCache(serverName: string, toolName: string, result: MCPToolResult): boolean {
    // Don't cache error results
    if (result && typeof result === 'object' && 'error' in result) {
      return false;
    }

    // Don't cache very large results (unless compression is enabled)
    const resultSize = JSON.stringify(result).length;
    if (resultSize > this.options.cacheCompressionThreshold * 2) {
      return false;
    }

    // Don't cache real-time or dynamic tools
    const dynamicPatterns = [
      /time|date|now/i,
      /random|uuid|guid/i,
      /current|latest|live/i,
      /stream|watch|monitor/i
    ];

    const toolDescription = `${toolName}`.toLowerCase();
    if (dynamicPatterns.some(pattern => pattern.test(toolDescription))) {
      return false;
    }

    return true;
  }

  // Private helper methods

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(36);
  }

  private async compressResult(result: MCPToolResult): Promise<MCPToolResult> {
    // Simple compression: truncate very long strings and arrays
    if (typeof result === 'object' && result !== null) {
      const compressed = JSON.parse(JSON.stringify(result));
      this.truncateLargeValues(compressed);
      return compressed;
    }
    return result;
  }

  private truncateLargeValues(obj: any, maxStringLength = 10000, maxArrayLength = 100): any {
    if (typeof obj === 'string' && obj.length > maxStringLength) {
      return obj.substring(0, maxStringLength) + '... [truncated]';
    }

    if (Array.isArray(obj)) {
      if (obj.length > maxArrayLength) {
        obj.splice(maxArrayLength);
        obj.push('[truncated]');
      }
      obj.forEach((item, index) => {
        obj[index] = this.truncateLargeValues(item, maxStringLength, maxArrayLength);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        obj[key] = this.truncateLargeValues(value, maxStringLength, maxArrayLength);
      }
    }

    return obj;
  }
}

export class PerformanceManager {
  private cache: ToolResultCache;
  private executionMetrics = new Map<string, {
    count: number;
    totalTime: number;
    averageTime: number;
    lastExecution: number;
  }>();

  constructor(
    private cacheOptions: CacheOptions,
    private poolOptions?: ConnectionPoolOptions
  ) {
    this.cache = new ToolResultCache(cacheOptions);
    
    // Start cleanup interval
    setInterval(() => {
      this.cache.cleanupExpired();
    }, 300000); // Clean every 5 minutes
  }

  /**
   * Execute tool with caching and performance tracking
   */
  async executeWithCache<T extends MCPToolResult>(
    serverName: string,
    toolName: string,
    args: any,
    executor: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    const startTime = Date.now();
    const toolKey = `${serverName}:${toolName}`;

    try {
      // Try to get cached result first
      const cached = await this.cache.getCachedResult(serverName, toolName, args);
      if (cached) {
        this.updateMetrics(toolKey, Date.now() - startTime, true);
        return cached as T;
      }

      // Execute the tool
      const result = await executor();

      // Cache the result if appropriate
      if (this.cache.shouldCache(serverName, toolName, result)) {
        await this.cache.setCachedResult(serverName, toolName, args, result, customTTL);
      }

      this.updateMetrics(toolKey, Date.now() - startTime, false);
      return result;

    } catch (error) {
      this.updateMetrics(toolKey, Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const cacheMetrics = this.cache.getMetrics();
    
    let totalExecutions = 0;
    let totalTime = 0;
    
    for (const metrics of this.executionMetrics.values()) {
      totalExecutions += metrics.count;
      totalTime += metrics.totalTime;
    }

    return {
      toolExecutions: totalExecutions,
      cacheHits: cacheMetrics.hits,
      cacheMisses: cacheMetrics.misses,
      averageExecutionTime: totalExecutions > 0 ? totalTime / totalExecutions : 0,
      connectionPoolSize: 0, // TODO: Implement connection pool metrics
      totalRequests: totalExecutions
    };
  }

  /**
   * Get tool-specific metrics
   */
  getToolMetrics(serverName: string, toolName: string): any {
    const toolKey = `${serverName}:${toolName}`;
    return this.executionMetrics.get(toolKey) || null;
  }

  /**
   * Clear all caches and reset metrics
   */
  reset(): void {
    this.cache.clear();
    this.executionMetrics.clear();
  }

  /**
   * Optimize cache settings based on usage patterns
   */
  optimizeCache(): void {
    const metrics = this.cache.getMetrics();
    
    if (metrics.hitRate < 0.1 && metrics.size > 10) {
      // Low hit rate - reduce cache size
      this.cacheOptions.maxCacheSize = Math.max(10, this.cacheOptions.maxCacheSize * 0.8);
      mcpLogger.info(`[Performance] Reduced cache size to ${this.cacheOptions.maxCacheSize} due to low hit rate`);
    } else if (metrics.hitRate > 0.7 && metrics.evictions > metrics.hits * 0.1) {
      // High hit rate but too many evictions - increase cache size
      this.cacheOptions.maxCacheSize = Math.min(1000, this.cacheOptions.maxCacheSize * 1.2);
      mcpLogger.info(`[Performance] Increased cache size to ${this.cacheOptions.maxCacheSize} due to high hit rate`);
    }
  }

  // Private methods

  private updateMetrics(toolKey: string, executionTime: number, cached: boolean): void {
    const existing = this.executionMetrics.get(toolKey) || {
      count: 0,
      totalTime: 0,
      averageTime: 0,
      lastExecution: 0
    };

    existing.count++;
    existing.totalTime += executionTime;
    existing.averageTime = existing.totalTime / existing.count;
    existing.lastExecution = Date.now();

    this.executionMetrics.set(toolKey, existing);

    if (existing.count % 100 === 0) {
      mcpLogger.debug(`[Performance] ${toolKey}: ${existing.count} executions, avg ${existing.averageTime.toFixed(2)}ms`);
    }
  }
}

// Default configuration
export const defaultCacheOptions: CacheOptions = {
  enableCaching: true,
  defaultTTL: 300000, // 5 minutes
  maxCacheSize: 100,
  cacheCompressionThreshold: 50000 // 50KB
};

export const defaultPoolOptions: ConnectionPoolOptions = {
  maxIdleConnections: 5,
  maxActiveConnections: 20,
  idleTimeout: 300000, // 5 minutes
  connectionTimeout: 30000 // 30 seconds
};

// Export singleton instance
export const performanceManager = new PerformanceManager(defaultCacheOptions, defaultPoolOptions);