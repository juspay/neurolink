/**
 * The SDK unrefs `process.stdin` on import (see externalServerManager.ts) so
 * that a process which never reads stdin can still exit on its own instead
 * of being kept alive forever by a handle it never uses. Any CLI code path
 * that actually reads from stdin — piped generate/stream input, a readline
 * confirmation prompt, the interactive loop's line reader — must ref it
 * back first, or the process can exit (or simply never treat stdin as a
 * reason to stay alive) before the read completes.
 *
 * Centralizing the call here means a new stdin consumer only has to
 * remember to call this, not to rediscover and re-derive the reason why.
 * Three call sites each doing this inline already produced one that forgot
 * to (the memory-delete confirmation prompt) — a fourth is just as likely
 * to repeat that.
 */
export function ensureStdinRef(): void {
  if (process.stdin && typeof process.stdin.ref === "function") {
    process.stdin.ref();
  }
}
