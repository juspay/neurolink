import type {
  NeuroLinkMiddleware,
  NeuroLinkMiddlewareMetadata,
  LifecycleMiddlewareConfig,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { isRecoverableError } from "../../utils/errorHandling.js";
import { fireOnErrorOnce } from "../../utils/lifecycleCallbacks.js";
import type { LanguageModelMiddleware } from "../../types/index.js";
import type {
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamResult,
} from "../../types/index.js";

/**
 * Normalize a thrown value to an `Error` while preserving structured
 * fields (`code`, `status`, `statusCode`, `retryAfter`, `details`,
 * `cause`, etc.) that downstream retry logic and SDK callers depend on.
 *
 * Previously the lifecycle middleware did
 * `error instanceof Error ? error : new Error(String(error))`, which
 * silently dropped every custom property on non-Error throws — so a
 * provider's `{ code: "RATE_LIMITED", retryAfter: 30 }` rejection
 * surfaced to consumers as a bare `Error("[object Object]")`.
 */
function normalizeToError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    const msg = typeof obj.message === "string" ? obj.message : String(error);
    // Object.assign keeps Error's prototype chain (including the
    // captured stack from this synthetic Error's construction) while
    // copying enumerable fields from the original throw.
    return Object.assign(new Error(msg), obj);
  }
  return new Error(String(error));
}

export function createLifecycleMiddleware(
  config: LifecycleMiddlewareConfig = {},
): NeuroLinkMiddleware {
  const metadata: NeuroLinkMiddlewareMetadata = {
    id: "lifecycle",
    name: "Lifecycle Callbacks",
    description:
      "Provides onFinish, onError, and onChunk callbacks for generation and streaming lifecycle events",
    priority: 110,
    defaultEnabled: false,
  };

  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v3",
    wrapGenerate: async ({
      doGenerate,
    }: {
      doGenerate: () => PromiseLike<LanguageModelV3GenerateResult>;
    }) => {
      const startTime = Date.now();

      try {
        const result = await doGenerate();

        if (config.onFinish) {
          try {
            const content =
              result.content
                ?.map((c: { type: string; text?: string }) =>
                  c.type === "text" ? c.text : "",
                )
                .join("") ?? "";
            const callbackResult = config.onFinish({
              text: content,
              usage: result.usage
                ? {
                    promptTokens: result.usage.inputTokens?.total ?? 0,
                    completionTokens: result.usage.outputTokens?.total ?? 0,
                  }
                : undefined,
              duration: Date.now() - startTime,
              finishReason: String(result.finishReason ?? ""),
            });
            Promise.resolve(callbackResult).catch((e) => {
              logger.warn("[LifecycleMiddleware] onFinish callback error:", e);
            });
          } catch (e) {
            logger.warn("[LifecycleMiddleware] onFinish callback error:", e);
          }
        }

        return result;
      } catch (error) {
        const err = normalizeToError(error);
        // fireOnErrorOnce stamps a Symbol on `err` so the SDK-level catch
        // in neurolink.ts (and baseProvider.handleProviderError) skips
        // its own onError fire for the same logical failure.
        fireOnErrorOnce(config.onError, err, {
          error: err,
          duration: Date.now() - startTime,
          recoverable: isRecoverableError(err),
        });
        // Rethrow the normalized err (not the raw `error`) so the
        // fired-mark and any preserved structured fields propagate.
        throw err;
      }
    },

    wrapStream: async ({
      doStream,
    }: {
      doStream: () => PromiseLike<LanguageModelV3StreamResult>;
    }) => {
      const startTime = Date.now();

      try {
        const result = await doStream();

        if (!config.onChunk && !config.onFinish && !config.onError) {
          return result;
        }

        let sequenceNumber = 0;
        let accumulatedText = "";

        const transformStream = new TransformStream({
          transform(chunk, controller) {
            try {
              if (chunk.type === "text-delta") {
                accumulatedText += chunk.textDelta;
              }

              if (config.onChunk && chunk.type) {
                try {
                  const callbackResult = config.onChunk({
                    type: chunk.type,
                    textDelta:
                      chunk.type === "text-delta" ? chunk.textDelta : undefined,
                    sequenceNumber: sequenceNumber++,
                  });
                  Promise.resolve(callbackResult).catch((e) => {
                    logger.warn(
                      "[LifecycleMiddleware] onChunk callback error:",
                      e,
                    );
                  });
                } catch (e) {
                  logger.warn(
                    "[LifecycleMiddleware] onChunk callback error:",
                    e,
                  );
                }
              }

              controller.enqueue(chunk);
            } catch (error) {
              const err = normalizeToError(error);
              fireOnErrorOnce(config.onError, err, {
                error: err,
                duration: Date.now() - startTime,
                recoverable: isRecoverableError(err),
              });
              throw err;
            }
          },
          flush() {
            if (config.onFinish) {
              try {
                const callbackResult = config.onFinish({
                  text: accumulatedText,
                  duration: Date.now() - startTime,
                });
                Promise.resolve(callbackResult).catch((e) => {
                  logger.warn(
                    "[LifecycleMiddleware] onFinish callback error:",
                    e,
                  );
                });
              } catch (e) {
                logger.warn(
                  "[LifecycleMiddleware] onFinish callback error:",
                  e,
                );
              }
            }
          },
        });

        return {
          ...result,
          stream: result.stream.pipeThrough(transformStream),
        };
      } catch (error) {
        const err = normalizeToError(error);
        fireOnErrorOnce(config.onError, err, {
          error: err,
          duration: Date.now() - startTime,
          recoverable: isRecoverableError(err),
        });
        throw err;
      }
    },
  };

  return { ...middleware, metadata };
}
