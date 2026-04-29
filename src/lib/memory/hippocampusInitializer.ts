import { createRequire } from "node:module";
import type {
  HippocampusConfig,
  HippocampusLike,
  HippocampusModule,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

// Lazy require so importing NeuroLink core does not fail when the optional
// peer @juspay/hippocampus is not installed. The package was previously a
// hard runtime dependency, but Hippocampus declares a peer on
// @juspay/neurolink which made pnpm pull a registry NeuroLink that
// transitively required @ai-sdk/google + @ai-sdk/google-vertex into the
// production graph. Making memory optional breaks that cycle while keeping
// the same runtime behavior whenever the package is installed.
const lazyRequire = createRequire(import.meta.url);

let cachedModule: HippocampusModule | null | undefined;

function loadHippocampusModule(): HippocampusModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  try {
    cachedModule = lazyRequire("@juspay/hippocampus") as HippocampusModule;
    return cachedModule;
  } catch (error) {
    cachedModule = null;
    logger.debug(
      "[memoryInitializer] @juspay/hippocampus is not installed; memory features disabled.",
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return null;
  }
}

export function initializeHippocampus(
  config: HippocampusConfig,
): HippocampusLike | null {
  const mod = loadHippocampusModule();
  if (!mod) {
    logger.warn(
      "[memoryInitializer] Memory configuration provided but @juspay/hippocampus is not installed. Run `pnpm add @juspay/hippocampus` (or your package manager equivalent) to enable memory.",
    );
    return null;
  }

  try {
    const instance = new mod.Hippocampus(config);

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
