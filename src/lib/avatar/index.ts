/**
 * Avatar Module — Talking-Head / Lip-sync Integration for NeuroLink
 *
 * Provides avatar-generation capability across providers (D-ID, HeyGen,
 * Replicate-hosted MuseTalk / SadTalker / Wav2Lip).
 *
 * Use `AvatarProcessor.generate(provider, options)` to dispatch to the
 * registered handler for `provider`.
 *
 * Importing this module does NOT register any handlers as a side effect.
 * Call `registerDefaultAvatarHandlers()` explicitly (or go through
 * `ProviderRegistry.registerAllProviders()`, which every documented
 * `NeuroLink` entry point already calls) to register every shipped avatar
 * handler whose backing API key is present in `process.env`. Registration
 * is idempotent and silently skipped if a provider is already registered or
 * its constructor throws.
 *
 * @module avatar
 */

import type { AvatarHandler } from "../types/index.js";
import { MEDIA_HANDLER_CATALOG } from "../factories/mediaHandlerCatalog.js";
import { logger } from "../utils/logger.js";
import { AvatarProcessor } from "../utils/avatarProcessor.js";

export {
  AVATAR_ERROR_CODES,
  AvatarError,
  AvatarProcessor,
} from "../utils/avatarProcessor.js";

// ============================================================================
// HANDLER CLASSES
// ============================================================================

export {
  DIDAvatar,
  DIDAvatar as DIDAvatarHandler,
} from "./providers/DIDAvatar.js";

export {
  HeyGenAvatar,
  HeyGenAvatar as HeyGenAvatarHandler,
} from "./providers/HeyGenAvatar.js";

export {
  ReplicateAvatar,
  ReplicateAvatar as ReplicateAvatarHandler,
} from "./providers/ReplicateAvatar.js";

// ============================================================================
// AUTO-REGISTRATION
// ============================================================================

import { DIDAvatar } from "./providers/DIDAvatar.js";
import { HeyGenAvatar } from "./providers/HeyGenAvatar.js";
import { ReplicateAvatar } from "./providers/ReplicateAvatar.js";

// Provider names + aliases are the Task-8 catalog's job — only the factory
// (which needs the imported handler class) stays local to this module.
const AVATAR_HANDLER_FACTORIES: Readonly<Record<string, () => AvatarHandler>> =
  {
    "d-id": () => new DIDAvatar(),
    heygen: () => new HeyGenAvatar(),
    replicate: () => new ReplicateAvatar(),
  };

const AVATAR_HANDLER_CANDIDATES: ReadonlyArray<{
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly factory: () => AvatarHandler;
}> = MEDIA_HANDLER_CATALOG.filter((entry) => entry.kind === "avatar").map(
  (entry) => {
    const factory = AVATAR_HANDLER_FACTORIES[entry.name];
    if (!factory) {
      throw new Error(
        `[avatar] no handler factory for catalog entry "${entry.name}"`,
      );
    }
    return { name: entry.name, aliases: entry.aliases, factory };
  },
);

/**
 * Register every shipped avatar handler whose backing credentials are
 * present in the environment. Safe to call multiple times — existing
 * registrations are preserved.
 */
export function registerDefaultAvatarHandlers(): void {
  for (const { name, aliases, factory } of AVATAR_HANDLER_CANDIDATES) {
    // Compute missingName / missingAliases separately so a pre-registered
    // primary doesn't block alias backfill — keeps "musetalk" reachable
    // when only "replicate" was wired up via another path.
    const missingName = !AvatarProcessor.supports(name);
    const missingAliases = (aliases ?? []).filter(
      (alias) => !AvatarProcessor.supports(alias),
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
        handler = AvatarProcessor.getHandler(name);
      }
      if (!handler) {
        handler = factory();
        if (!handler.isConfigured()) {
          continue;
        }
      }
      if (missingName) {
        AvatarProcessor.registerHandler(name, handler);
      }
      for (const alias of missingAliases) {
        AvatarProcessor.registerHandler(alias, handler);
      }
    } catch (err) {
      logger.debug(
        `[avatar] ${name} auto-registration skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
