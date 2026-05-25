/**
 * Avatar Module — Talking-Head / Lip-sync Integration for NeuroLink
 *
 * Provides avatar-generation capability across providers (D-ID, HeyGen,
 * Replicate-hosted MuseTalk / SadTalker / Wav2Lip).
 *
 * Use `AvatarProcessor.generate(provider, options)` to dispatch to the
 * registered handler for `provider`.
 *
 * Importing this module also auto-registers every shipped avatar handler
 * whose backing API key is present in `process.env`. Registration is
 * idempotent and silently skipped if a provider is already registered or
 * its constructor throws.
 *
 * @module avatar
 */

import type { AvatarHandler } from "../types/index.js";
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

const AVATAR_HANDLER_CANDIDATES: ReadonlyArray<{
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly factory: () => AvatarHandler;
}> = [
  { name: "d-id", factory: () => new DIDAvatar() },
  { name: "heygen", factory: () => new HeyGenAvatar() },
  {
    name: "replicate",
    aliases: ["musetalk"],
    factory: () => new ReplicateAvatar(),
  },
];

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

// Run once at module import so consumers who follow the documented
// `nl.generate(...)` flow get every configured handler without manually
// calling `registerHandler`.
registerDefaultAvatarHandlers();
