/**
 * Video Adapter Module — Image-to-Video Generation Integration for NeuroLink
 *
 * Provides video-generation capability across providers (Vertex Veo, Kling,
 * Runway, Replicate-hosted video models).
 *
 * Use `VideoProcessor.generate(provider, image, prompt, options)` to
 * dispatch to the registered handler for `provider`.
 *
 * Importing this module does NOT register any handlers as a side effect.
 * Call `registerDefaultVideoHandlers()` explicitly (or go through
 * `ProviderRegistry.registerAllProviders()`, which every documented
 * `NeuroLink` entry point already calls) to register every shipped video
 * handler whose backing API key is present in `process.env`. Registration
 * is idempotent and silently skipped if a provider is already registered or
 * its constructor throws.
 *
 * @module adapters/video
 */

import type { VideoHandler } from "../../types/index.js";
import { MEDIA_HANDLER_CATALOG } from "../../factories/mediaHandlerCatalog.js";
import { logger } from "../../utils/logger.js";
import { VideoProcessor } from "../../utils/videoProcessor.js";

export {
  VIDEO_ERROR_CODES,
  VideoError,
  VideoProcessor,
} from "../../utils/videoProcessor.js";

// ============================================================================
// HANDLER CLASSES
// ============================================================================

export { KlingVideoHandler } from "./klingVideoHandler.js";
export { ReplicateVideoHandler } from "./replicateVideoHandler.js";
export { RunwayVideoHandler } from "./runwayVideoHandler.js";
export {
  isVertexVideoConfigured,
  VertexVideoHandler,
} from "./vertexVideoHandler.js";

// ============================================================================
// AUTO-REGISTRATION
// ============================================================================

import { KlingVideoHandler } from "./klingVideoHandler.js";
import { ReplicateVideoHandler } from "./replicateVideoHandler.js";
import { RunwayVideoHandler } from "./runwayVideoHandler.js";
import { VertexVideoHandler } from "./vertexVideoHandler.js";

// Provider names are the Task-8 catalog's job — only the factory (which
// needs the imported handler class) stays local to this module.
const VIDEO_HANDLER_FACTORIES: Readonly<Record<string, () => VideoHandler>> = {
  vertex: () => new VertexVideoHandler(),
  kling: () => new KlingVideoHandler(),
  runway: () => new RunwayVideoHandler(),
  replicate: () => new ReplicateVideoHandler(),
};

const VIDEO_HANDLER_CANDIDATES: ReadonlyArray<{
  readonly name: string;
  readonly factory: () => VideoHandler;
}> = MEDIA_HANDLER_CATALOG.filter((entry) => entry.kind === "video").map(
  (entry) => {
    const factory = VIDEO_HANDLER_FACTORIES[entry.name];
    if (!factory) {
      throw new Error(
        `[video] no handler factory for catalog entry "${entry.name}"`,
      );
    }
    return { name: entry.name, factory };
  },
);

/**
 * Register every shipped video handler whose backing credentials are
 * present in the environment. Safe to call multiple times — existing
 * registrations are preserved.
 */
export function registerDefaultVideoHandlers(): void {
  for (const { name, factory } of VIDEO_HANDLER_CANDIDATES) {
    if (VideoProcessor.supports(name)) {
      continue;
    }
    try {
      const handler = factory();
      if (!handler.isConfigured()) {
        continue;
      }
      VideoProcessor.registerHandler(name, handler);
    } catch (err) {
      logger.debug(
        `[video] ${name} auto-registration skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
