import {
  Hippocampus,
  type HippocampusConfig,
  type CustomStorageConfig,
} from "@juspay/hippocampus";
import { logger } from "../utils/logger.js";

export type { HippocampusConfig, CustomStorageConfig };

export type Memory = HippocampusConfig & { enabled?: boolean };

export function initializeHippocampus(
  config: HippocampusConfig,
): Hippocampus | null {
  try {
    const instance = new Hippocampus(config);

    logger.info("[memoryInitializer] Memory initialized successfully", {
      storageType: config.storage?.type || "sqlite",
      maxWords: config.maxWords || 50,
      hasCustomPrompt: !!config.prompt,
    });

    return instance;
  } catch (error) {
    logger.warn("[memoryInitializer] Failed to initialize memory; disabling", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
