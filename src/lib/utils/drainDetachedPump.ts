import { logger } from "./logger.js";

/**
 * Await a detached stream pump, swallowing its rejection but not its evidence.
 *
 * Several providers drain their engine's channel with a pump started outside
 * the promise chain the caller awaits:
 *
 *   const pump = (async () => { for await (const chunk of stream) { ... } })();
 *   const result = await resultPromise;   // can throw
 *   await pump;                           // never reached if it does
 *
 * When the turn fails, `resultPromise` and the pump reject together — the
 * engine calls `channel.error(err)` before closing — so the pump must be
 * adopted on the error path too. Nothing adopting it is not a cosmetic leak:
 * an unhandled rejection TERMINATES the process, so a caller who correctly
 * try/catches the streaming error still dies. That was a real bug in the
 * Anthropic path.
 *
 * The established remedy is `await pump.catch(() => {})`, which every site
 * already uses. The gap this closes is the second half: `() => {}` throws the
 * reason away, so the raw upstream error — the one carrying the provider's
 * actual wire response — was invisible in traces at every one of the seven
 * sites (six named `pump`, plus one named `drain` in googleAiStudio's
 * non-streaming path, which a search for `pump` does not find). It is logged at DEBUG rather than WARN deliberately: on a failing turn
 * this reason is almost always a duplicate of the error the caller is already
 * being handed, and on an aborted turn it is the expected AbortError. It is
 * diagnostic detail, not a new event worth alerting on.
 *
 * Behaviour is otherwise identical to `await pump.catch(() => {})`: it awaits,
 * it never rethrows.
 */
export async function drainDetachedPump(
  pump: Promise<unknown>,
  providerLabel: string,
): Promise<void> {
  try {
    await pump;
  } catch (error) {
    logger.debug(
      `[${providerLabel}] detached stream pump rejected; reason absorbed because the turn's own error is authoritative`,
      error,
    );
  }
}
