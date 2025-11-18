/**
 * Mem0 Memory Initializer
 * Simple initialization logic for mem0ai cloud API integration
 */

import { MemoryClient } from "mem0ai";
import { logger } from "../utils/logger.js";

/**
 * Mem0 cloud API configuration
 */
export interface Mem0Config {
  apiKey: string;
}

/**
 * Initialize mem0 memory instance with cloud API
 */
export async function initializeMem0(
  mem0Config: Mem0Config,
): Promise<MemoryClient | null> {
  // Guard: skip initialization if API key is missing
  if (!mem0Config?.apiKey || mem0Config.apiKey.trim() === "") {
    logger.warn(
      "[mem0Initializer] Missing MEM0_API_KEY; skipping mem0 initialization",
    );
    return null;
  }

  logger.debug("[mem0Initializer] Starting mem0 cloud API initialization");

  try {
    // Create MemoryClient instance with cloud API
    const client = new MemoryClient({
      apiKey: mem0Config.apiKey,
    });

    logger.info("[mem0Initializer] Mem0 cloud API initialized successfully");

    return client;
  } catch (error) {
    logger.warn(
      "[mem0Initializer] Failed to initialize mem0 cloud API; disabling mem0",
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );

    return null;
  }
}
