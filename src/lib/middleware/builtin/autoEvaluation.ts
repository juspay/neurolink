import type {
  NeuroLinkMiddleware,
  NeuroLinkMiddlewareMetadata,
  AutoEvaluationConfig,
  GenerateResult,
  StandardRecord,
} from "../../types/index.js";
import { Evaluator } from "../../evaluation/index.js";
import { logger } from "../../utils/logger.js";
import type {
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
} from "../../types/index.js";
import type { LanguageModelMiddleware } from "../../types/index.js";

/**
 * Creates the Auto-Evaluation middleware, which intercepts generation requests
 * to evaluate the quality of the response. If the response quality is below a
 * configured threshold, it can trigger retries with feedback.
 *
 * @param config - Configuration for the auto-evaluation middleware.
 * @returns A `NeuroLinkMiddleware` object.
 */
export function createAutoEvaluationMiddleware(
  config: AutoEvaluationConfig = {},
): NeuroLinkMiddleware {
  const metadata: NeuroLinkMiddlewareMetadata = {
    id: "autoEvaluation",
    name: "Auto Evaluation",
    description:
      "Automatically evaluates response quality and retries if needed.",
    priority: 90,
    defaultEnabled: false, // Should be explicitly enabled
  };
  logger.debug("Auto-Evaluation Middleware Config:", config);
  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v3" as const,
    wrapGenerate: async ({ doGenerate, params }) => {
      const options: LanguageModelV3CallOptions = params;

      const rawResult = await doGenerate();
      const rawReasoning = (rawResult as { reasoning?: unknown }).reasoning;
      const textParts = rawResult.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text);
      const toolCallParts = rawResult.content.filter(
        (
          c,
        ): c is {
          type: "tool-call";
          toolCallId: string;
          toolName: string;
          input: string;
        } => c.type === "tool-call",
      );

      const inputTokens = rawResult.usage.inputTokens.total ?? 0;
      const outputTokens = rawResult.usage.outputTokens.total ?? 0;

      const result: GenerateResult = {
        content: textParts.join(""),
        finishReason: rawResult.finishReason.unified,
        reasoning:
          typeof rawReasoning === "string"
            ? rawReasoning
            : Array.isArray(rawReasoning)
              ? rawReasoning
                  .map((r) =>
                    typeof r === "string"
                      ? r
                      : ((r as { text?: string })?.text ?? JSON.stringify(r)),
                  )
                  .join("\n")
              : undefined,
        usage: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        toolCalls:
          toolCallParts.length > 0
            ? toolCallParts.map((tc) => {
                let parsedArgs: StandardRecord;
                try {
                  parsedArgs = JSON.parse(tc.input) as StandardRecord;
                } catch (e) {
                  logger.warn(
                    `Failed to parse tool call args for tool ${tc.toolName}:`,
                    e,
                  );
                  parsedArgs = { raw: tc.input };
                }
                return {
                  toolCallId: tc.toolCallId,
                  toolName: tc.toolName,
                  args: parsedArgs,
                };
              })
            : undefined,
      };
      const isBlocking = config.blocking !== false;

      if (isBlocking) {
        const evaluationResult = await performEvaluation(
          config,
          options,
          result,
        );
        return {
          ...rawResult,
          evaluationResult,
        };
      } else {
        performEvaluation(config, options, result).catch((err) => {
          logger.error("Non-blocking auto-evaluation error:", err);
        });
        return rawResult;
      }
    },
    wrapStream: async ({ doStream, params }) => {
      const options: LanguageModelV3CallOptions = params;
      const rawResult = await doStream();
      const [streamForUser, streamForEvaluation] = rawResult.stream.tee();

      // Non-blocking evaluation for streams
      consumeAndEvaluateStream(config, options, streamForEvaluation).catch(
        (err) => {
          logger.error("Non-blocking stream auto-evaluation error:", err);
        },
      );

      return {
        ...rawResult,
        stream: streamForUser,
      };
    },
  };

  return {
    ...middleware,
    metadata,
  };
}

/**
 * A common function to perform the evaluation logic.
 * @param config The middleware configuration.
 * @param options The text generation options.
 * @param result The generation result.
 */
async function performEvaluation(
  config: AutoEvaluationConfig,
  options: LanguageModelV3CallOptions,
  result: GenerateResult,
) {
  const isBlocking = config.blocking !== false;
  const threshold =
    config.threshold ??
    (Number(process.env.NEUROLINK_EVALUATION_THRESHOLD) || 7);

  try {
    const evaluator = new Evaluator({
      threshold,
      provider: config.provider,
      promptGenerator: config.promptGenerator,
      evaluationModel: config.evaluationModel,
    });
    const evaluationResult = await evaluator.evaluate(
      options,
      result,
      threshold,
      config,
    );

    if (config.onEvaluationComplete) {
      await config.onEvaluationComplete(evaluationResult);
    }
  } catch (error) {
    logger.error("Error during auto-evaluation:", error);
    if (isBlocking) {
      throw error;
    }
  }
}

/**
 * Consumes a stream to build the full response and then evaluates it.
 * @param config The middleware configuration.
 * @param options The generation options.
 * @param stream The stream to consume.
 */
async function consumeAndEvaluateStream(
  config: AutoEvaluationConfig,
  options: LanguageModelV3CallOptions,
  stream: ReadableStream<LanguageModelV3StreamPart>,
) {
  let fullText = "";
  let usage: { input: number; output: number; total: number } | undefined;
  const toolCalls: {
    toolCallId: string;
    toolName: string;
    args: StandardRecord;
  }[] = [];

  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      switch (value.type) {
        case "text-delta":
          fullText += value.delta;
          break;
        case "tool-call":
          {
            let parsedArgs: StandardRecord;
            try {
              parsedArgs = JSON.parse(value.input) as StandardRecord;
            } catch (e) {
              logger.warn(
                `Failed to parse tool call args for tool ${value.toolName}:`,
                e,
              );
              // In case of parsing failure, we can't assign a string.
              // Let's use an object with the raw string to maintain type safety.
              parsedArgs = { raw: value.input };
            }
            toolCalls.push({
              toolCallId: value.toolCallId,
              toolName: value.toolName,
              args: parsedArgs,
            });
          }
          break;
        case "finish":
          {
            const finishInputTokens = value.usage.inputTokens.total ?? 0;
            const finishOutputTokens = value.usage.outputTokens.total ?? 0;
            usage = {
              input: finishInputTokens,
              output: finishOutputTokens,
              total: finishInputTokens + finishOutputTokens,
            };
          }
          break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  const result: GenerateResult = {
    content: fullText,
    usage,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };

  // For streams, evaluation is always non-blocking from the user's perspective.
  if (config.blocking) {
    logger.warn(
      "Auto-evaluation 'blocking' mode is not supported for streaming responses. Evaluation will proceed non-blockingly.",
    );
  }

  // Create a new config object to force non-blocking behavior for the evaluation function
  const nonBlockingConfig = { ...config, blocking: false };

  await performEvaluation(nonBlockingConfig, options, result);
}

export default createAutoEvaluationMiddleware;
