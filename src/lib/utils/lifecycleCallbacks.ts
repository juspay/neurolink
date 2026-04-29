/**
 * Dedupes per-error invocations of the user-supplied `onError` lifecycle
 * callback. The same thrown error can travel through both the middleware
 * pipeline (which fires `onError` then re-throws) and the top-level
 * generate/stream catch in `neurolink.ts` — without a guard, the consumer
 * callback would fire twice for one logical failure.
 *
 * Strategy: stamp a non-enumerable Symbol on the error object the first
 * time a firing site is reached, skip subsequent firings. Symbol.for
 * lets us share the same key across modules without import gymnastics.
 */

import type { LifecycleErrorPayload, OnErrorCallback } from "../types/index.js";

const ON_ERROR_FIRED = Symbol.for("neurolink.onErrorFired");

export function fireOnErrorOnce(
  onError: OnErrorCallback | undefined,
  error: unknown,
  payload: LifecycleErrorPayload,
): void {
  if (typeof onError !== "function") {
    return;
  }
  if (error && typeof error === "object") {
    const errAsRecord = error as Record<symbol, unknown>;
    if (errAsRecord[ON_ERROR_FIRED]) {
      return;
    }
    try {
      Object.defineProperty(error, ON_ERROR_FIRED, {
        value: true,
        enumerable: false,
        writable: false,
        configurable: false,
      });
    } catch {
      // Frozen/sealed error object — proceed without the stamp; the
      // worst case is a single duplicate fire if multiple sites observe
      // the same frozen value, which is the pre-existing behaviour.
    }
  }
  try {
    const result = onError(payload);
    Promise.resolve(result).catch(() => undefined);
  } catch {
    // Consumer callback errors must not poison the original throw.
  }
}
