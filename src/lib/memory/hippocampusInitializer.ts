import { createRequire } from "node:module";
import type {
  HippocampusClientFactory,
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

/**
 * The client methods NeuroLink core calls: `add()` on the write path and
 * `get()` on the read path. `delete()` and `close()` are on the type for a
 * host's own use, but core never calls them, so a client without them is
 * still usable.
 */
const REQUIRED_CLIENT_METHODS = ["add", "get"] as const;

/**
 * Construct (or adopt) the Hippocampus client. `config.neurolink.instance`
 * and `config.neurolink.credentials` are read by `@juspay/hippocampus`
 * ≥0.2.0 itself (the peer floor is 0.2.1, which also fixes literal
 * placeholder substitution), so condensation runs through the
 * instance NeuroLink supplies (the one carrying this host's credentials)
 * with no help from this side.
 *
 * Every path that disables memory logs at `error`: warnings are hidden at
 * the default log level, and a host whose memory is silently off has no
 * other way to learn it.
 */
export function initializeHippocampus(
  config: HippocampusConfig,
  injectedClient?: HippocampusLike | HippocampusClientFactory,
): HippocampusLike | null {
  if (injectedClient) {
    try {
      const client =
        typeof injectedClient === "function"
          ? injectedClient(config)
          : injectedClient;
      // A loosely typed or async factory can hand back undefined or a
      // Promise; cache neither. A partial client — a write-only double with
      // no get() — would make every read fail silently, so it is refused
      // here rather than on each call. Memory is disabled with a clear
      // message instead of failing every call with a generic error.
      const missing =
        !client || typeof client !== "object"
          ? [...REQUIRED_CLIENT_METHODS]
          : REQUIRED_CLIENT_METHODS.filter(
              (name) =>
                typeof (client as Record<string, unknown>)[name] !== "function",
            );
      if (missing.length > 0) {
        logger.error(
          `[memoryInitializer] Host-supplied client has no ${missing
            .map((name) => `${name}()`)
            .join(" / ")}; disabling memory`,
        );
        return null;
      }
      logger.info(
        "[memoryInitializer] Memory initialized with host-supplied client",
        { fromFactory: typeof injectedClient === "function" },
      );
      return client;
    } catch (error) {
      logger.error(
        "[memoryInitializer] Host-supplied client factory threw; disabling memory",
        { error: error instanceof Error ? error.message : String(error) },
      );
      return null;
    }
  }

  const mod = loadHippocampusModule();
  if (!mod) {
    logger.error(
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
      condenserSupplied: config.neurolink?.instance !== undefined,
    });

    return instance;
  } catch (error) {
    logger.error("[memoryInitializer] Failed to initialize memory; disabling", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
