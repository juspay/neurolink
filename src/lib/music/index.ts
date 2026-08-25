/**
 * Music Module — Music Generation Integration for NeuroLink
 *
 * Provides music-generation capability across providers (Beatoven,
 * ElevenLabs Music, Lyria, Replicate-hosted MusicGen / Riffusion).
 *
 * Use `MusicProcessor.generate(provider, options)` to dispatch to the
 * registered handler for `provider`.
 *
 * Importing this module does NOT register any handlers as a side effect.
 * Call `registerDefaultMusicHandlers()` explicitly (or go through
 * `ProviderRegistry.registerAllProviders()`, which every documented
 * `NeuroLink` entry point already calls) to register every shipped music
 * handler whose backing API key is present in `process.env`. Registration
 * is idempotent and silently skipped if a provider is already registered or
 * its constructor throws (e.g. missing optional native dependency).
 *
 * @module music
 */

import type { MusicHandler } from "../types/index.js";
import { MEDIA_HANDLER_CATALOG } from "../factories/mediaHandlerCatalog.js";
import { logger } from "../utils/logger.js";
import { MusicProcessor } from "../utils/musicProcessor.js";

export {
  MUSIC_ERROR_CODES,
  MusicError,
  MusicProcessor,
} from "../utils/musicProcessor.js";

// ============================================================================
// HANDLER CLASSES
// ============================================================================

export {
  BeatovenMusic,
  BeatovenMusic as BeatovenMusicHandler,
} from "./providers/BeatovenMusic.js";

export {
  ElevenLabsMusic,
  ElevenLabsMusic as ElevenLabsMusicHandler,
} from "./providers/ElevenLabsMusic.js";

export {
  LyriaMusic,
  LyriaMusic as LyriaMusicHandler,
} from "./providers/LyriaMusic.js";

export {
  ReplicateMusic,
  ReplicateMusic as ReplicateMusicHandler,
} from "./providers/ReplicateMusic.js";

// ============================================================================
// AUTO-REGISTRATION
// ============================================================================

import { BeatovenMusic } from "./providers/BeatovenMusic.js";
import { ElevenLabsMusic } from "./providers/ElevenLabsMusic.js";
import { LyriaMusic } from "./providers/LyriaMusic.js";
import { ReplicateMusic } from "./providers/ReplicateMusic.js";

// Provider names + aliases are the Task-8 catalog's job — only the factory
// (which needs the imported handler class) stays local to this module.
const MUSIC_HANDLER_FACTORIES: Readonly<Record<string, () => MusicHandler>> = {
  beatoven: () => new BeatovenMusic(),
  "elevenlabs-music": () => new ElevenLabsMusic(),
  lyria: () => new LyriaMusic(),
  replicate: () => new ReplicateMusic(),
};

const MUSIC_HANDLER_CANDIDATES: ReadonlyArray<{
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly factory: () => MusicHandler;
}> = MEDIA_HANDLER_CATALOG.filter((entry) => entry.kind === "music").map(
  (entry) => {
    const factory = MUSIC_HANDLER_FACTORIES[entry.name];
    if (!factory) {
      throw new Error(
        `[music] no handler factory for catalog entry "${entry.name}"`,
      );
    }
    return { name: entry.name, aliases: entry.aliases, factory };
  },
);

/**
 * Register every shipped music handler whose backing credentials are
 * present in the environment. Safe to call multiple times — existing
 * registrations are preserved.
 */
export function registerDefaultMusicHandlers(): void {
  for (const { name, aliases, factory } of MUSIC_HANDLER_CANDIDATES) {
    // Compute missingName / missingAliases separately so a pre-registered
    // primary doesn't block alias backfill — keeps "musicgen" reachable
    // when only "replicate" was wired up via another path (and likewise
    // "elevenlabs-sound" vs "elevenlabs-music").
    const missingName = !MusicProcessor.supports(name);
    const missingAliases = (aliases ?? []).filter(
      (alias) => !MusicProcessor.supports(alias),
    );
    if (!missingName && missingAliases.length === 0) {
      continue;
    }
    try {
      // Reuse the already-registered primary's handler for alias backfill
      // when one exists — wiring an alias to a factory-fresh instance
      // would silently diverge from the canonical primary's config.
      let handler: ReturnType<typeof factory> | undefined;
      if (!missingName) {
        handler = MusicProcessor.getHandler(name);
      }
      if (!handler) {
        handler = factory();
        if (!handler.isConfigured()) {
          continue;
        }
      }
      if (missingName) {
        MusicProcessor.registerHandler(name, handler);
      }
      for (const alias of missingAliases) {
        MusicProcessor.registerHandler(alias, handler);
      }
    } catch (err) {
      logger.debug(
        `[music] ${name} auto-registration skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
