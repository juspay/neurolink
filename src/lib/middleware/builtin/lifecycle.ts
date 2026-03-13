/**
 * Lifecycle Middleware
 *
 * Provides onFinish, onError, and onChunk callbacks for observing
 * generation and streaming lifecycle events.
 *
 * This middleware is automatically enabled when lifecycle callbacks
 * (onFinish, onError, onChunk) are passed in GenerateOptions or StreamOptions.
 */

import type { LanguageModelMiddleware } from "ai";
import type {
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamResult,
} from "@ai-sdk/provider";
import type {
  NeuroLinkMiddleware,
  NeuroLinkMiddlewareMetadata,
  LifecycleMiddlewareConfig,
} from "../../types/middlewareTypes.js";
import { logger } from "../../utils/logger.js";
import { isRecoverableError } from "../../utils/errorHandling.js";

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
        if (config.onError) {
          const err = error instanceof Error ? error : new Error(String(error));
          try {
            const callbackResult = config.onError({
              error: err,
              duration: Date.now() - startTime,
              recoverable: isRecoverableError(err),
            });
            Promise.resolve(callbackResult).catch((e) => {
              logger.warn("[LifecycleMiddleware] onError callback error:", e);
            });
          } catch (e) {
            logger.warn("[LifecycleMiddleware] onError callback error:", e);
          }
        }

        throw error;
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
              if (config.onError) {
                const err =
                  error instanceof Error ? error : new Error(String(error));
                try {
                  const callbackResult = config.onError({
                    error: err,
                    duration: Date.now() - startTime,
                    recoverable: isRecoverableError(err),
                  });
                  Promise.resolve(callbackResult).catch((e) => {
                    logger.warn(
                      "[LifecycleMiddleware] onError callback error:",
                      e,
                    );
                  });
                } catch (e) {
                  logger.warn(
                    "[LifecycleMiddleware] onError callback error:",
                    e,
                  );
                }
              }
              throw error;
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
        if (config.onError) {
          const err = error instanceof Error ? error : new Error(String(error));
          try {
            const callbackResult = config.onError({
              error: err,
              duration: Date.now() - startTime,
              recoverable: isRecoverableError(err),
            });
            Promise.resolve(callbackResult).catch((e) => {
              logger.warn("[LifecycleMiddleware] onError callback error:", e);
            });
          } catch (e) {
            logger.warn("[LifecycleMiddleware] onError callback error:", e);
          }
        }

        throw error;
      }
    },
  };

  return { ...middleware, metadata };
}
