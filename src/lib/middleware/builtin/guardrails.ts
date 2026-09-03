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
import { generateOnceNative } from "../../utils/nativeSingleShot.js";
import type { LanguageModelMiddleware } from "../../types/index.js";

/**
 * Create Guardrails AI middleware for content filtering and policy enforcement
 * @param config Configuration for the guardrails middleware
 * @returns NeuroLink middleware instance
 */
/**
 * Turn whatever a caller put in `filterModel` into a model handle.
 *
 * A handle is used as-is. A string is resolved through NeuroLink's own
 * provider factory, accepting either "provider:model" or a bare model id.
 * Imported lazily so the middleware module does not pull the provider factory
 * into every bundle that merely registers guardrails.
 */
async function resolveFilterModel(filterModel: unknown): Promise<unknown> {
  if (typeof filterModel !== "string") {
    return filterModel;
  }
  const [maybeProvider, ...rest] = filterModel.split(":");
  const hasProvider = rest.length > 0;
  const { ProviderFactory } =
    await import("../../factories/providerFactory.js");
  const provider = await ProviderFactory.createProvider(
    hasProvider ? maybeProvider : undefined,
    hasProvider ? rest.join(":") : filterModel,
  );
  // `getModel()` is BaseProvider's sanctioned public handle but is not on the
  // narrower `AIProvider` type, so narrow at the boundary rather than assert
  // through it (Critical Rule 14).
  const handle = provider as { getModel?: () => unknown };
  if (typeof handle.getModel !== "function") {
    throw new Error(
      `guardrails: provider for "${filterModel}" exposes no model handle`,
    );
  }
  return handle.getModel();
}

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
          // `ModelFilterConfig.filterModel` is typed `LanguageModel`, which
          // admits a bare model id, and the documented examples used one.
          // `generateOnceNative` needs a handle exposing doGenerate, so a
          // string threw, the catch below logged it, and the turn returned
          // unfiltered — a security control that silently did nothing.
          const filterModel = await resolveFilterModel(
            config.modelFilter.filterModel,
          );
          const { text: filterResponse } = await generateOnceNative(
            filterModel,
            { prompt: filterPrompt },
          );

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
