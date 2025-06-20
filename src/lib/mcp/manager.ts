/**
 * NeuroLink MCP Manager
 * Manages MCP client instances following Lighthouse's session-based pattern
 */

import { NeuroLinkMCPClient, createMCPClient } from "./client.js";
import { logger } from "../utils/logger.js";
import type { MCPClientConfig } from "./client.js";

/**
 * Maximum number of concurrent MCP instances
 */
const MAX_MCP_INSTANCES = 50;

/**
 * Default MCP configuration
 */
const DEFAULT_MCP_CONFIG: Partial<MCPClientConfig> = {
  logLevel: "info",
};

/**
 * MCP Manager - Factory pattern for managing multiple client instances
 * Following Lighthouse's session-based architecture
 */
export class NeuroLinkMCPManager {
  private static instances: Map<string, NeuroLinkMCPClient> = new Map();
  private static lastCleanup = Date.now();
  private static cleanupInterval = 60000; // 1 minute

  /**
   * Get or create an MCP client instance for a session
   */
  public static getInstance(
    sessionId: string,
    config?: Partial<MCPClientConfig>,
  ): NeuroLinkMCPClient {
    // Periodic cleanup of old instances
    if (Date.now() - this.lastCleanup > this.cleanupInterval) {
      this.cleanupOldInstances();
    }

    // Return existing instance if available
    if (this.instances.has(sessionId)) {
      const instance = this.instances.get(sessionId)!;
      logger.debug(
        `[MCP Manager] Returning existing instance for session ${sessionId}`,
      );
      return instance;
    }

    // Check if we've reached the maximum number of instances
    if (this.instances.size >= MAX_MCP_INSTANCES) {
      // Remove the oldest instance to make room
      this.removeOldestInstance();
    }

    // Create new instance
    const fullConfig: MCPClientConfig = {
      sessionId,
      ...DEFAULT_MCP_CONFIG,
      ...config,
    };

    const instance = createMCPClient(fullConfig);
    this.instances.set(sessionId, instance);

    logger.info(`[MCP Manager] Created new instance for session ${sessionId}`, {
      instanceCount: this.instances.size,
      config: fullConfig,
    });

    return instance;
  }

  /**
   * Remove the oldest instance based on creation time
   */
  private static removeOldestInstance(): void {
    let oldestSessionId: string | null = null;
    let oldestTime = Date.now();

    // Find the oldest instance
    for (const [sessionId, instance] of this.instances.entries()) {
      const stats = instance.getStats();
      const creationTime = Date.now() - stats.uptime;

      if (creationTime < oldestTime) {
        oldestTime = creationTime;
        oldestSessionId = sessionId;
      }
    }

    if (oldestSessionId) {
      const instance = this.instances.get(oldestSessionId)!;
      instance.disconnect();
      this.instances.delete(oldestSessionId);

      logger.info(`[MCP Manager] Removed oldest instance`, {
        sessionId: oldestSessionId,
        remainingInstances: this.instances.size,
      });
    }
  }

  /**
   * Clean up instances that haven't been used recently
   */
  private static cleanupOldInstances(): void {
    const now = Date.now();
    const maxIdleTime = 300000; // 5 minutes
    const toRemove: string[] = [];

    for (const [sessionId, instance] of this.instances.entries()) {
      const stats = instance.getStats();
      // If no executions in the last 5 minutes, mark for removal
      if (stats.executionCount === 0 && now - stats.uptime > maxIdleTime) {
        toRemove.push(sessionId);
      }
    }

    for (const sessionId of toRemove) {
      const instance = this.instances.get(sessionId)!;
      instance.disconnect();
      this.instances.delete(sessionId);
    }

    if (toRemove.length > 0) {
      logger.info(`[MCP Manager] Cleaned up ${toRemove.length} idle instances`);
    }

    this.lastCleanup = now;
  }

  /**
   * Get list of active session IDs
   */
  public static getActiveSessionIds(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Remove a specific instance
   */
  public static async removeInstance(sessionId: string): Promise<boolean> {
    const instance = this.instances.get(sessionId);

    if (instance) {
      await instance.disconnect();
      return this.instances.delete(sessionId);
    }

    return false;
  }

  /**
   * Get instance count
   */
  public static getInstanceCount(): number {
    return this.instances.size;
  }

  /**
   * Get maximum allowed instances
   */
  public static getMaxInstances(): number {
    return MAX_MCP_INSTANCES;
  }

  /**
   * Get statistics for all instances
   */
  public static getAllStats() {
    const stats: Record<string, any> = {};

    for (const [sessionId, instance] of this.instances.entries()) {
      stats[sessionId] = instance.getStats();
    }

    return {
      instanceCount: this.instances.size,
      maxInstances: MAX_MCP_INSTANCES,
      instances: stats,
    };
  }

  /**
   * Clear all instances (for testing or shutdown)
   */
  public static async clearAll(): Promise<void> {
    for (const instance of this.instances.values()) {
      await instance.disconnect();
    }

    this.instances.clear();
    logger.info("[MCP Manager] Cleared all instances");
  }
}

/**
 * Convenience function to get MCP manager instance
 */
export function getMCPManager(
  sessionId: string,
  config?: Partial<MCPClientConfig>,
): NeuroLinkMCPClient {
  return NeuroLinkMCPManager.getInstance(sessionId, config);
}

/**
 * Convenience function to remove MCP manager instance
 */
export async function removeMCPManager(sessionId: string): Promise<boolean> {
  return NeuroLinkMCPManager.removeInstance(sessionId);
}

/**
 * Export manager for direct access if needed
 */
export { NeuroLinkMCPManager as MCPManager };
