import { generateText } from "ai";
import type { LanguageModelV1, LanguageModelV1Middleware } from "ai";
import type {
  NeuroLinkMiddleware,
  NeuroLinkMiddlewareMetadata,
} from "../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Configuration for the Guardrails middleware.
 */
export interface GuardrailsMiddlewareConfig {
  badWords?: {
    enabled?: boolean;
    list?: string[];
  };
  modelFilter?: {
    enabled?: boolean;
    filterModel?: LanguageModelV1;
  };
}

/**
 * Create Guardrails AI middleware for content filtering and policy enforcement.
 * @param config - Configuration for the guardrails middleware.
 */
export function createGuardrailsMiddleware(
  config: GuardrailsMiddlewareConfig = {},
): NeuroLinkMiddleware {
  const metadata: NeuroLinkMiddlewareMetadata = {
    id: "guardrails",
    name: "Guardrails AI",
    description:
      "Provides content filtering and policy enforcement using custom rules and AI models.",
    priority: 90,
    defaultEnabled: true,
  };

  const middleware: LanguageModelV1Middleware = {
    wrapGenerate: async ({ doGenerate, params }) => {
      logger.debug(`[GuardrailsMiddleware] Applying to generate call.`, {
        badWordsEnabled: !!config.badWords?.enabled,
        modelFilterEnabled: !!config.modelFilter?.enabled,
      });

      let result = await doGenerate();

      // 1. Bad Word Filtering
      if (config.badWords?.enabled && config.badWords.list) {
        let filteredText = result.text;
        for (const term of config.badWords.list) {
          const regex = new RegExp(term, "gi");
          filteredText = filteredText?.replace(regex, "*".repeat(term.length));
        }
        if (result.text !== filteredText) {
          logger.debug(`[GuardrailsMiddleware] Redacted bad words from text.`);
          result = { ...result, text: filteredText ?? "" };
        }
      }

      // 2. Model-based Filtering
      if (config.modelFilter?.enabled && config.modelFilter.filterModel) {
        logger.debug(`[GuardrailsMiddleware] Invoking model-based filter.`);
        try {
          const filterPrompt = `Is the following text safe? Respond with only "safe" or "unsafe".\n\nText: "${result.text}"`;
          const { text: filterResponse } = await generateText({
            model: config.modelFilter.filterModel, // Cast as any to satisfy type, will be resolved in integration
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

    wrapStream: async ({ doStream, params }) => {
      logger.debug(`[GuardrailsMiddleware] Applying to stream call.`, {
        badWordsEnabled: !!config.badWords?.enabled,
      });

      const { stream, ...rest } = await doStream();

      // Note: Model-based filtering is not applied to streams in this version
      // as it requires the full text for analysis.
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          let filteredChunk = chunk;
          if (config.badWords?.enabled && config.badWords.list) {
            for (const term of config.badWords.list) {
              const regex = new RegExp(term, "gi");
              if (typeof filteredChunk === "string") {
                filteredChunk = filteredChunk.replace(
                  regex,
                  "*".repeat(term.length),
                );
              }
            }
          }
          controller.enqueue(filteredChunk);
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
