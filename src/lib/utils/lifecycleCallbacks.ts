/**
 * Lifecycle callback firing + dedupe.
 *
 * The same thrown error can travel through multiple layers that each
 * want to surface it to the consumer's `onError`:
 *   - LifecycleMiddleware's `wrapGenerate` / `wrapStream` catch
 *   - `BaseProvider.wrapStreamWithLifecycleCallbacks` (raw-fetch
 *     streaming providers that bypass AI SDK middleware)
 *   - `BaseProvider.fireLifecycleErrorCallback` (top-level provider catch)
 *   - `NeuroLink.generate()` / `NeuroLink.stream()` (early-resolution
 *     failures, before the language model is wrapped)
 *
 * Without a shared dedupe these layers would fire `onError` multiple
 * times for one logical failure. This module stamps a non-enumerable
 * `Symbol.for("neurolink.onErrorFired")` on the error the first time
 * a firing site is reached; subsequent sites observe the stamp and
 * skip their own fire.
 *
 * `Symbol.for` (rather than a local Symbol) so the same key works
 * across modules — anyone who can read the symbol can read the stamp.
 *
 * Frozen / sealed / non-extensible errors: `Object.defineProperty`
 * throws, we catch and proceed. Worst case is a single duplicate fire
 * (the pre-shared-marker behaviour). `WeakSet`-based bookkeeping
 * would handle this case cleanly but the symbol stamp is preferred
 * for cross-realm consistency: a Symbol.for-keyed property survives
 * structuredClone / cross-realm postMessage where a closed-over
 * WeakSet does not.
 */

import type {
  LifecycleErrorPayload,
  LifecycleMiddlewareConfig,
  OnErrorCallback,
  OptionsWithLifecycleMiddleware,
} from "../types/index.js";

const ON_ERROR_FIRED = Symbol.for("neurolink.onErrorFired");

/**
 * Read the consumer-facing lifecycle callbacks buried inside a request's
 * middleware blob. The parameter is `unknown` on purpose: request options
 * arrive as several structurally-unrelated shapes (StreamOptions,
 * TextGenerationOptions), and the lifecycle branch is an optional add-on
 * none of them declare — a single structural view keeps the read cast-free
 * at every call site.
 *
 * Shared (moved out of `BaseProvider`) because two independent firing sites
 * now need the same read: `BaseProvider.wrapStreamWithLifecycleCallbacks`
 * (every provider's stream) and `GoogleVertexProvider.wrapStreamResultWithLifecycle`
 * (Vertex's own native-stream firer, which must check the SAME
 * `isLifecycleStreamCallbacksOwnedByBaseProvider` marker on the SAME nested
 * config object that BaseProvider's wrapper reads from `options`, so that
 * both sites agree on who owns firing without a second marker).
 */
export function getLifecycleMiddlewareConfig(
  options: unknown,
): LifecycleMiddlewareConfig | undefined {
  return (options as OptionsWithLifecycleMiddleware | undefined)?.middleware
    ?.middlewareConfig?.lifecycle?.config;
}

/**
 * Marks a stream lifecycle config as "BaseProvider.wrapStreamWithLifecycleCallbacks
 * already fires onChunk/onFinish for this config, authoritatively, from
 * NeuroLink's own normalized stream — the model-level lifecycle middleware
 * (middleware/builtin/lifecycle.ts) must not ALSO fire them from the raw
 * per-provider V3 chunks it sees."
 *
 * Only `NeuroLink.applyStreamLifecycleMiddleware()` stamps a config with this
 * marker, and only for stream()'s config: it is the one function that builds
 * a lifecycle config fresh from stream()'s top-level onChunk/onFinish/onError
 * options, for a call that unconditionally passes through
 * `BaseProvider.wrapStreamWithLifecycleCallbacks` afterwards — see that
 * method's doc comment ("the only point every provider's stream passes
 * through unconditionally"). Without this marker both layers fire
 * onChunk/onFinish for the same logical stream: once (unreliable, raw,
 * provider-shape-dependent) from the model-level middleware, once (reliable,
 * normalized) from BaseProvider.
 *
 * `NeuroLink.applyGenerateLifecycleMiddleware()` must NEVER stamp its config
 * this way. BaseProvider has no equivalent guaranteed-delivery layer for
 * generate()'s onFinish: `BaseProvider.finalizeNativeGenerate`'s own doc
 * comment states onFinish is deliberately NOT fired there because "the
 * native paths now wrap their model, so the lifecycle middleware fires it" —
 * the model-level middleware is the SOLE firing site for every native
 * generate loop that goes through the model wrap (sagemaker,
 * openaiChatCompletionsBase, anthropic). The one generate path that bypasses
 * the model wrap (GoogleVertex's native @google/genai loop) fires onFinish
 * itself via `BaseProvider.fireGenerateOnFinish` precisely because the
 * middleware never runs for it. Stamping the generate config would make the
 * model-level middleware suppress its own firing with nothing left to fire
 * it, silently breaking onFinish for every one of those providers.
 *
 * A config a consumer builds directly — e.g. calling the exported
 * `createLifecycleMiddleware` and applying it to their own model via the
 * `ai` package's `wrapLanguageModel`, entirely outside NeuroLink's
 * BaseProvider/stream()/generate() call path — is never stamped, so that
 * standalone use keeps firing onChunk/onFinish exactly as before (CLAUDE.md
 * rule 5: public SDK API must not break existing callers).
 *
 * Symbol-stamped on the object itself (not a typed field) for the same
 * reason as `ON_ERROR_FIRED` above: it survives across separate module
 * copies of the same config object where a closed-over WeakSet would not.
 */
const STREAM_CALLBACKS_OWNED_BY_BASE_PROVIDER = Symbol.for(
  "neurolink.lifecycleStreamCallbacksOwnedByBaseProvider",
);

/**
 * Stamp a stream lifecycle config object with
 * `STREAM_CALLBACKS_OWNED_BY_BASE_PROVIDER`. See that symbol's doc comment
 * for who may call this (only `applyStreamLifecycleMiddleware`) and why.
 */
export function markLifecycleStreamCallbacksOwnedByBaseProvider(
  config: object,
): void {
  try {
    Object.defineProperty(config, STREAM_CALLBACKS_OWNED_BY_BASE_PROVIDER, {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  } catch {
    // Non-extensible config object — worst case is the pre-fix double fire.
  }
}

/**
 * True when `markLifecycleStreamCallbacksOwnedByBaseProvider` already
 * stamped this config. The model-level lifecycle middleware reads this to
 * decide whether to fire its own onChunk/onFinish for a stream config.
 */
export function isLifecycleStreamCallbacksOwnedByBaseProvider(
  config: unknown,
): boolean {
  if (config === null || typeof config !== "object") {
    return false;
  }
  return (
    (config as Record<symbol, unknown>)[
      STREAM_CALLBACKS_OWNED_BY_BASE_PROVIDER
    ] === true
  );
}

function stampFired(error: object): void {
  try {
    Object.defineProperty(error, ON_ERROR_FIRED, {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  } catch {
    // Non-extensible — fall through; worst case is a duplicate fire.
  }
}

/**
 * Returns true when `markLifecycleErrorFired` or a previous
 * `fireOnErrorOnce` call has already stamped this error.
 */
export function hasLifecycleErrorFired(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  return (error as Record<symbol, unknown>)[ON_ERROR_FIRED] === true;
}

/**
 * Stamps the error as already-fired without invoking any callback.
 * Use this from sites that already invoked `onError` via their own
 * path (e.g. a provider-specific raw-fetch stream wrapper) so the
 * shared dedupe still works.
 */
export function markLifecycleErrorFired(error: unknown): void {
  if (error === null || typeof error !== "object") {
    return;
  }
  if ((error as Record<symbol, unknown>)[ON_ERROR_FIRED] === true) {
    return;
  }
  stampFired(error as object);
}

/**
 * Fire the consumer's `onError` once per logical failure.
 *
 * - No-op when `onError` is missing.
 * - No-op when the error is already stamped (any prior layer fired).
 * - Otherwise: stamps the error, then invokes the callback.
 *
 * The callback is fire-and-forget; rejections are swallowed so a
 * faulty handler can't mask the original throw. Callers that need
 * to AWAIT the callback (e.g. to enforce a timeout) should use
 * `hasLifecycleErrorFired` + `markLifecycleErrorFired` directly and
 * run the callback themselves.
 */
export function fireOnErrorOnce(
  onError: OnErrorCallback | undefined,
  error: unknown,
  payload: LifecycleErrorPayload,
): void {
  if (typeof onError !== "function") {
    return;
  }
  if (hasLifecycleErrorFired(error)) {
    return;
  }
  if (error !== null && typeof error === "object") {
    stampFired(error as object);
  }
  try {
    const result = onError(payload);
    Promise.resolve(result).catch(() => undefined);
  } catch {
    // Consumer callback errors must not poison the original throw.
  }
}
