import type {
  NeuroLinkMiddleware,
  NeuroLinkMiddlewareMetadata,
  GuardrailsMiddlewareConfig,
} from "../../types/index.js";
import {
  createBlockedResponse,
  createBlockedStream,
  applyContentFiltering,
  handlePrecallGuardrails,
} from "../utils/guardrailsUtils.js";
import { logger } from "../../utils/logger.js";
import { generateText } from "../../utils/generation.js";
import type { LanguageModelMiddleware } from "../../types/index.js";

/**
 * Create Guardrails AI middleware for content filtering and policy enforcement
 * @param config Configuration for the guardrails middleware
 * @returns NeuroLink middleware instance
 */
export function createGuardrailsMiddleware(
  config: GuardrailsMiddlewareConfig = {},
): NeuroLinkMiddleware {
  const metadata: NeuroLinkMiddlewareMetadata = {
    id: "guardrails",
    name: "Guardrails AI",
    description:
      "Provides comprehensive content filtering and policy enforcement using custom rules, AI models, and precall evaluation to filter inappropriate content before it reaches the LLM.",
    priority: 90,
    defaultEnabled: true,
  };

  // WeakMap to store blocking state from transformParams to wrap methods
  const blockingState = new WeakMap<object, boolean>();

  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v3" as const,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transformParams: async ({ params }: any) => {
      if (config.precallEvaluation?.enabled) {
        const { shouldBlock, transformedParams } =
          await handlePrecallGuardrails(params, config.precallEvaluation);
        // Store the blocking state for use in wrap methods
        blockingState.set(transformedParams, shouldBlock);
        return transformedParams;
      }
      return params;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wrapGenerate: async ({ doGenerate, params }: any) => {
      logger.debug(`[GuardrailsMiddleware] Applying to generate call.`);
      // Check if this request should be blocked (set by transformParams)
      if (config.precallEvaluation?.enabled && blockingState.get(params)) {
        return createBlockedResponse();
      }

      let result = await doGenerate();

      const filterResult = applyContentFiltering(
        result.text || "",
        config.badWords,
        "generate",
      );
      if (filterResult.hasChanges) {
        result = { ...result, text: filterResult.filteredText };
      }

      if (config.modelFilter?.enabled && config.modelFilter.filterModel) {
        logger.debug(`[GuardrailsMiddleware] Invoking model-based filter.`);
        try {
          const filterPrompt = `Is the following text safe? Respond with only "safe" or "unsafe".\n\nText: "${result.text}"`;
          const { text: filterResponse } = await generateText({
            model: config.modelFilter.filterModel,
            prompt: filterPrompt,
          });

          if (filterResponse.toLowerCase().trim() === "unsafe") {
            logger.warn(
              `[GuardrailsMiddleware] Model-based filter flagged content as unsafe.`,
            );
            result = { ...result, text: "<REDACTED BY AI GUARDRAIL>" };
          }
        } catch (error) {
          logger.error(`[GuardrailsMiddleware] Model-based filter failed.`, {
            error,
          });
        }
      }

      return result;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wrapStream: async ({ doStream, params }: any) => {
      logger.debug(`[GuardrailsMiddleware] Applying to stream call.`);

      // Check if this request should be blocked (set by transformParams)
      if (config.precallEvaluation?.enabled && blockingState.get(params)) {
        return {
          stream: createBlockedStream(),
          rawCall: { rawPrompt: null, rawSettings: {} },
          warnings: [],
        };
      }

      const { stream, ...rest } = await doStream();
      let hasYieldedChunks = false;

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          hasYieldedChunks = true;
          let filteredChunk = chunk;
          if (
            typeof filteredChunk === "object" &&
            "textDelta" in filteredChunk
          ) {
            const filterResult = applyContentFiltering(
              filteredChunk.textDelta,
              config.badWords,
              "stream",
            );
            if (filterResult.hasChanges) {
              filteredChunk = {
                ...filteredChunk,
                textDelta: filterResult.filteredText,
              };
            }
          }
          controller.enqueue(filteredChunk);
        },
        flush() {
          if (!hasYieldedChunks) {
            logger.warn(
              `[GuardrailsMiddleware] Stream ended without yielding any chunks`,
            );
          }
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
    },
  };

  return {
    ...middleware,
    metadata,
  };
}
