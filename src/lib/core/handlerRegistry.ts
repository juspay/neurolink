import { logger } from "../utils/logger.js";
import { sanitizeForLog } from "../utils/logSanitize.js";

/**
 * Generic provider-name → handler registry shared by every media-generation
 * ecosystem (TTS, STT, Realtime, Video, Music, Avatar). Each ecosystem's own
 * processor class composes one instance of this class instead of hand-rolling
 * its own `Map<string, THandler>` plus register/supports/get/list methods.
 *
 * Centralizes only the behavior that was byte-identical across all six
 * hand-rolled registries: input validation, name normalization (lowercase),
 * the overwrite-warning log line, and the four lookup/list/clear operations.
 * Registration-outcome debug logging (whose exact phrasing differs per
 * ecosystem — e.g. "Registered TTS handler..." vs "Registered video
 * handler...") and any ecosystem-specific extra logging (e.g. TTS/STT's
 * `supports()` diagnostics) stay in the owning processor's own wrapper
 * methods; this class does not attempt to unify those.
 */
export class HandlerRegistry<THandler> {
  private readonly handlers = new Map<string, THandler>();

  /**
   * @param scopeName Log-line prefix, e.g. "TTSProcessor" — matches the
   *   `[ClassName]` prefix each processor already uses in its own logs.
   */
  constructor(private readonly scopeName: string) {}

  register(providerName: string, handler: THandler): void {
    if (!providerName) {
      throw new Error("Provider name is required");
    }
    if (!handler) {
      throw new Error("Handler is required");
    }
    const key = providerName.toLowerCase();
    if (this.handlers.has(key)) {
      // Every caller today passes a literal provider slug, but this class is
      // generic over an arbitrary string — sanitize before logging it so a
      // future caller building the key from untrusted input can't leak a
      // bearer token/API key through this warning.
      logger.warn(
        `[${this.scopeName}] Overwriting existing handler for provider: ${sanitizeForLog(key)}`,
      );
    }
    this.handlers.set(key, handler);
  }

  supports(providerName: string): boolean {
    if (!providerName) {
      return false;
    }
    return this.handlers.has(providerName.toLowerCase());
  }

  get(providerName: string): THandler | undefined {
    return this.handlers.get(providerName.toLowerCase());
  }

  list(): string[] {
    return Array.from(this.handlers.keys());
  }

  clear(): void {
    this.handlers.clear();
    logger.debug(`[${this.scopeName}] Cleared all handlers`);
  }
}
