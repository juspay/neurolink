/**
 * Hippocampus Memory Initializer
 * Initialization logic for the self-hosted Hippocampus memory engine.
 * @see https://github.com/juspay/hippocampus
 */

import { Hippocampus, type HippocampusOptions } from "@juspay/hippocampus";
import { logger } from "../utils/logger.js";

/**
 * Configuration for Hippocampus self-hosted memory engine.
 *
 * Can be provided programmatically or resolved from environment variables:
 * - `HC_BASE_URL` — Server URL (required if not passed in config)
 * - `HC_API_KEY` — API key for authentication (optional)
 */
export interface HippocampusConfig {
  baseUrl?: string;
  apiKey?: string;
  retries?: number;
  retryDelay?: number;
  searchLimit?: number;
}

export async function initializeHippocampus(
  config: HippocampusConfig,
): Promise<Hippocampus | null> {
  const baseUrl = config.baseUrl || process.env.HC_BASE_URL || "";
  const apiKey = config.apiKey || process.env.HC_API_KEY || undefined;

  if (!baseUrl || baseUrl.trim() === "") {
    logger.warn(
      "[hippocampusInitializer] Missing baseUrl and HC_BASE_URL env var; skipping Hippocampus initialization",
    );
    return null;
  }

  logger.debug(
    "[hippocampusInitializer] Starting Hippocampus client initialization",
    { baseUrl, hasApiKey: !!apiKey },
  );

  try {
    const clientOptions: HippocampusOptions = {
      baseUrl,
      ...(apiKey && { apiKey }),
      ...(config.retries !== undefined && { retries: config.retries }),
      ...(config.retryDelay !== undefined && { retryDelay: config.retryDelay }),
    };

    const client = new Hippocampus(clientOptions);

    // Verify connectivity with a health check
    const health = await client.health();

    logger.info(
      "[hippocampusInitializer] Hippocampus client initialized successfully",
      {
        baseUrl,
        serverStatus: health.status,
        database: health.database,
      },
    );

    return client;
  } catch (error) {
    logger.warn(
      "[hippocampusInitializer] Failed to initialize Hippocampus client; disabling Hippocampus memory",
      {
        baseUrl,
        error: error instanceof Error ? error.message : String(error),
      },
    );

    return null;
  }
}
