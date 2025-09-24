/**
 * Mem0 Memory Initializer
 * Simple initialization logic for mem0ai/oss integration
 */

import type { MemoryConfig } from "mem0ai/oss";
import { Memory } from "mem0ai/oss";
import { logger } from "../utils/logger.js";

/**
 * Interface for mem0 Memory instance methods based on actual mem0ai/oss API
 */
export interface Mem0Memory {
  search(
    query: string,
    config: { userId?: string; limit?: number },
  ): Promise<{ results: Array<{ memory: string; id: string }> }>;
  add(
    messages: string,
    config: { userId?: string; metadata?: Record<string, unknown> },
  ): Promise<{ results: Array<{ id: string; memory: string }> }>;
  get(memoryId: string): Promise<{ id: string; memory: string } | null>;
  update(memoryId: string, data: string): Promise<{ message: string }>;
  delete(memoryId: string): Promise<{ message: string }>;
  history(memoryId: string): Promise<unknown[]>;
  reset(): Promise<void>;
}

/**
 * Initialize mem0 memory instance with configuration
 */
export async function initializeMem0(
  mem0Config: MemoryConfig
): Promise<Mem0Memory | null> {
  logger.debug("[mem0Initializer] Starting mem0 initialization");

  try {
    // Create Memory instance
    const memory = new Memory(mem0Config);

    logger.info("[mem0Initializer] Mem0 initialized successfully");

    return memory as Mem0Memory;
  } catch (error) {
    logger.warn("[mem0Initializer] Failed to initialize mem0, using fallback", {
      error: error instanceof Error ? error.message : String(error),
    });

    return createFallbackMemory();
  }
}

/**
 * Create fallback memory implementation
 */
function createFallbackMemory(): Mem0Memory {
  return {
    search: async () => ({ results: [] }),
    add: async () => ({ results: [] }),
    get: async () => null,
    update: async () => ({
      message: "Fallback memory does not support updates",
    }),
    delete: async () => ({
      message: "Fallback memory does not support deletion",
    }),
    history: async () => [],
    reset: async () => {},
  };
}
