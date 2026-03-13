import { AIProviderFactory } from "../../core/factory.js";
import { logger } from "../../utils/logger.js";
import type {
  BadWordsConfig,
  ContentFilteringResult,
  EvaluationActionResult,
  PrecallEvaluationConfig,
  PrecallEvaluationResult,
} from "../../types/guardrails.js";
export const DEFAULT_EVALUATION_PROMPT = `
Evaluate the following user input for safety and appropriateness. Respond ONLY with valid JSON:

{
  "overall": "safe|unsafe|suspicious|inappropriate",
  "safetyScore": <1-10>,
  "appropriatenessScore": <1-10>,
  "confidenceLevel": <1-10>,
  "issues": [
    {
      "category": "explicit_content|hate_speech|violence|personal_info|spam|other",
      "severity": "low|medium|high|critical",
      "description": "Brief description"
    }
  ],
  "suggestedAction": "allow|block|sanitize|warn",
  "reasoning": "Brief explanation"
}

User Input: "{USER_INPUT}"
`;

/**
 * Extract user input from middleware params
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractUserInput(params: any): string {
  if (typeof params.prompt === "string") {
    return params.prompt;
  }

  return (
    params.prompt
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((msg: any) => {
        if (msg.role === "user") {
          if (typeof msg.content === "string") {
            return msg.content;
          } else if (Array.isArray(msg.content)) {
            return (
              msg.content
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((part: any) => part.type === "text")
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((part: any) => part.text)
                .join(" ")
            );
          }
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
  );
}

export function parseEvaluationResponse(
  rawResponse: string,
): PrecallEvaluationResult {
  try {
    const cleanedResponse = rawResponse.replace(/```json\n|```/g, "").trim();
    const parsed = JSON.parse(cleanedResponse);

    return {
      overall: parsed.overall || "safe",
      safetyScore: Number(parsed.safetyScore) || 10,
      appropriatenessScore: Number(parsed.appropriatenessScore) || 10,
      confidenceLevel: Number(parsed.confidenceLevel) || 10,
      issues: parsed.issues || [],
      suggestedAction: parsed.suggestedAction || "allow",
      reasoning: parsed.reasoning || "No reasoning provided.",
    };
  } catch (error) {
    logger.error(
      "[GuardrailsUtils] Failed to parse evaluation response:",
      error,
    );
    return {
      overall: "safe",
      safetyScore: 10,
      appropriatenessScore: 10,
      confidenceLevel: 1,
      suggestedAction: "allow",
      reasoning: "Error parsing evaluation response - allowing by default.",
    };
  }
}

/**
 * Handles the precall guardrails logic, including evaluation and sanitization.
 * @param params - The language model call options.
 * @param config - The precall evaluation configuration.
 * @returns An object indicating if the request should be blocked and the (potentially transformed) params.
 */
export async function handlePrecallGuardrails(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
  config: PrecallEvaluationConfig,
): Promise<{
  shouldBlock: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformedParams: any;
}> {
  const userInput = extractUserInput(params);
  let transformedParams = params;

  if (userInput.trim()) {
    logger.debug(
      `[GuardrailsUtils] Performing precall evaluation on user input.`,
    );

    const evaluation = await performPrecallEvaluation(config, userInput);
    const actionResult = applyEvaluationActions(evaluation, config, userInput);

    if (actionResult.shouldBlock) {
      logger.warn(
        `[GuardrailsUtils] Blocking request due to precall evaluation.`,
        {
          evaluation,
          userInput: userInput.substring(0, 100),
        },
      );
      return { shouldBlock: true, transformedParams };
    }

    if (actionResult.sanitizedInput) {
      logger.info(`[GuardrailsUtils] Applying input sanitization.`);
      transformedParams = applySanitization(
        params,
        actionResult.sanitizedInput,
      );
    }
  } else {
    logger.debug(
      `[GuardrailsUtils] Skipping precall evaluation - no user content to evaluate.`,
    );
  }

  return { shouldBlock: false, transformedParams };
}

/**
 * Perform precall evaluation of user input using AI models
 */
export async function performPrecallEvaluation(
  config: PrecallEvaluationConfig,
  userInput: string,
): Promise<PrecallEvaluationResult> {
  try {
    const provider = await AIProviderFactory.createProvider(
      config.provider || "google-ai",
      config.evaluationModel || "gemini-1.5-flash",
    );

    const evaluationPrompt =
      config.evaluationPrompt || DEFAULT_EVALUATION_PROMPT;
    const prompt = evaluationPrompt.replace("{USER_INPUT}", userInput);

    const result = await provider.generate({
      input: { text: prompt },
    });

    if (!result || !result.content) {
      throw new Error("Evaluation generation failed to return a result.");
    }

    return parseEvaluationResponse(result.content);
  } catch (error) {
    logger.error("[GuardrailsUtils] Precall evaluation failed:", error);
    return {
      overall: "safe",
      safetyScore: 10,
      appropriatenessScore: 10,
      confidenceLevel: 1,
      suggestedAction: "allow",
      reasoning: "Evaluation failed - allowing by default.",
    };
  }
}

export function applyEvaluationActions(
  evaluation: PrecallEvaluationResult,
  config: PrecallEvaluationConfig,
  userInput: string,
): EvaluationActionResult {
  const actions = config.actions || {};
  const thresholds = config.thresholds || {};
  const safetyThreshold = thresholds.safetyScore || 7;
  const appropriatenessThreshold = thresholds.appropriatenessScore || 6;

  let actionToTake: string;

  if (
    evaluation.overall === "unsafe" ||
    evaluation.safetyScore < safetyThreshold
  ) {
    actionToTake = actions.onUnsafe || "block";
  } else if (
    evaluation.overall === "inappropriate" ||
    evaluation.appropriatenessScore < appropriatenessThreshold
  ) {
    actionToTake = actions.onInappropriate || "warn";
  } else if (evaluation.overall === "suspicious") {
    actionToTake = actions.onSuspicious || "log";
  } else {
    actionToTake = "allow";
  }

  logger.info("[GuardrailsUtils] Precall evaluation result:", {
    overall: evaluation.overall,
    safetyScore: evaluation.safetyScore,
    appropriatenessScore: evaluation.appropriatenessScore,
    confidenceLevel: evaluation.confidenceLevel,
    suggestedAction: evaluation.suggestedAction,
    actionTaken: actionToTake,
    reasoning: evaluation.reasoning,
    issues: evaluation.issues,
  });

  switch (actionToTake) {
    case "block":
      return { shouldBlock: true };
    case "sanitize": {
      let sanitized = userInput;
      const patterns = config.sanitizationPatterns || [];
      const replacementText = config.replacementText || "[REDACTED]";

      if (patterns.length > 0) {
        logger.debug(
          `[GuardrailsUtils] Applying ${patterns.length} sanitization patterns with replacement: "${replacementText}".`,
        );

        patterns.forEach((pattern, index) => {
          try {
            const regex = new RegExp(pattern, "gi");
            const before = sanitized;
            let matchCount = 0;

            sanitized = sanitized.replace(regex, () => {
              matchCount++;
              return replacementText;
            });

            if (before !== sanitized) {
              logger.debug(
                `[GuardrailsUtils] Pattern ${index + 1} matched ${matchCount} times.`,
              );
            }
          } catch (error) {
            logger.error(
              `[GuardrailsUtils] Invalid sanitization pattern "${pattern}":`,
              error,
            );
          }
        });

        if (sanitized !== userInput) {
          logger.info(
            `[GuardrailsUtils] Input sanitized using ${patterns.length} patterns.`,
          );
        }
      } else {
        logger.warn(
          "[GuardrailsUtils] Sanitize action triggered but no sanitizationPatterns provided in config. Input will not be modified.",
        );
      }

      return { shouldBlock: false, sanitizedInput: sanitized };
    }
    case "warn": {
      logger.warn(
        "[GuardrailsUtils] Potentially inappropriate content detected but allowing:",
        {
          userInput: userInput.substring(0, 100),
          evaluation,
        },
      );
      return { shouldBlock: false };
    }
    case "log": {
      logger.info("[GuardrailsUtils] Suspicious content detected:", {
        userInput: userInput.substring(0, 100),
        evaluation,
      });
      return { shouldBlock: false };
    }
    default:
      return { shouldBlock: false };
  }
}

/**
 * Apply parameter sanitization to request parameters
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applySanitization(params: any, sanitizedInput: string): any {
  const sanitizedParams = { ...params };

  if (Array.isArray(params.prompt)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitizedPrompt = params.prompt.map((msg: any) => {
      if (msg.role === "user") {
        if (typeof msg.content === "string") {
          return {
            ...msg,
            content: [{ type: "text" as const, text: sanitizedInput }],
          };
        } else if (Array.isArray(msg.content)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sanitizedContent = msg.content.map((part: any) => {
            if (part.type === "text") {
              return { ...part, text: sanitizedInput };
            }
            return part;
          });
          return { ...msg, content: sanitizedContent };
        }
      }
      return msg;
    });
    (sanitizedParams as { prompt: typeof sanitizedPrompt }).prompt =
      sanitizedPrompt;
  }

  return sanitizedParams;
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createBlockedResponse() {
  return {
    text: "Request contains inappropriate content and has been blocked.",
    usage: { promptTokens: 0, completionTokens: 0 },
    finishReason: "stop" as const,
    warnings: [],
    rawCall: { rawPrompt: null, rawSettings: {} },
  };
}

export function createBlockedStream() {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({
        type: "text-delta",
        textDelta:
          "Request contains inappropriate content and has been blocked.",
      });
      controller.enqueue({
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 0, completionTokens: 0 },
      });
      controller.close();
    },
  });
}

/**
 * Apply content filtering using bad words configuration
 * Handles both regex patterns and string lists with proper priority
 * @param text The text to filter
 * @param badWordsConfig Bad words configuration
 * @param context Optional context for logging (e.g., "generate", "stream")
 * @returns Filtering result with filtered text and metadata
 */
export function applyContentFiltering(
  text: string,
  badWordsConfig?: BadWordsConfig,
  context: string = "unknown",
): ContentFilteringResult {
  // Early return if filtering is disabled or no config
  try {
    if (!badWordsConfig?.enabled || !text) {
      return {
        filteredText: text,
        hasChanges: false,
        appliedFilters: [],
        filteringStats: {
          regexPatternsApplied: 0,
          stringFiltersApplied: 0,
          totalMatches: 0,
        },
      };
    }

    let filteredText = text;
    let hasChanges = false;
    const appliedFilters: string[] = [];
    let totalMatches = 0;
    const replacementText = badWordsConfig.replacementText || "[REDACTED]";

    // Priority 1: Use regex patterns if provided
    if (
      badWordsConfig.regexPatterns &&
      badWordsConfig.regexPatterns.length > 0
    ) {
      if (badWordsConfig.list && badWordsConfig.list.length > 0) {
        logger.warn(
          `[ContentFiltering:${context}] Both regexPatterns and list provided. Using regexPatterns and ignoring list.`,
        );
      }

      logger.debug(
        `[ContentFiltering:${context}] Applying regex pattern filtering with ${badWordsConfig.regexPatterns.length} patterns using replacement: "${replacementText}".`,
      );

      for (const pattern of badWordsConfig.regexPatterns) {
        try {
          // TODO: Add blocking for overly complex or long patterns
          if (pattern.length > 1000) {
            logger.warn(
              `[ContentFiltering:${context}] Regex pattern exceeds max length (1000 chars): "${pattern.substring(0, 50)}..."`,
            );
          }

          const regex = new RegExp(pattern, "gi");

          const testStart = Date.now();
          regex.test("test");
          if (Date.now() - testStart > 100) {
            logger.warn(
              `[ContentFiltering:${context}] Regex pattern "${pattern}" appears to be too complex (slow test execution).`,
            );
          }

          const before = filteredText;
          let matchCount = 0;

          filteredText = filteredText?.replace(regex, () => {
            matchCount++;
            return replacementText;
          });

          if (before !== filteredText) {
            hasChanges = true;
            totalMatches += matchCount;
            appliedFilters.push(`regex:${pattern}`);
            logger.debug(
              `[ContentFiltering:${context}] Regex pattern "${pattern}" matched ${matchCount} times and filtered content.`,
            );
          }
        } catch (error) {
          logger.error(
            `[ContentFiltering:${context}] Invalid regex pattern "${pattern}":`,
            error,
          );
        }
      }
    }
    // Priority 2: Use simple string list if no regex patterns
    else if (badWordsConfig.list && badWordsConfig.list.length > 0) {
      logger.debug(
        `[ContentFiltering:${context}] Applying string list filtering with ${badWordsConfig.list.length} terms using replacement: "${replacementText}".`,
      );

      for (const term of badWordsConfig.list) {
        const regex = new RegExp(escapeRegExp(term), "gi");
        const before = filteredText;
        let matchCount = 0;

        filteredText = filteredText?.replace(regex, () => {
          matchCount++;
          return replacementText;
        });

        if (before !== filteredText) {
          hasChanges = true;
          totalMatches += matchCount;
          appliedFilters.push(`string:${term}`);
          logger.debug(
            `[ContentFiltering:${context}] String filter "${term}" matched ${matchCount} times.`,
          );
        }
      }
    }

    const result: ContentFilteringResult = {
      filteredText,
      hasChanges,
      appliedFilters,
      filteringStats: {
        regexPatternsApplied: badWordsConfig.regexPatterns?.length || 0,
        stringFiltersApplied: badWordsConfig.list?.length || 0,
        totalMatches,
      },
    };

    if (hasChanges) {
      logger.debug(
        `[ContentFiltering:${context}] Filtering completed. Applied ${appliedFilters.length} filters with ${totalMatches} total matches.`,
      );
    }

    return result;
  } catch (error) {
    logger.error(
      `[ContentFiltering:${context}] Error during content filtering:`,
      error,
    );
    return {
      filteredText: text,
      hasChanges: false,
      appliedFilters: [],
      filteringStats: {
        regexPatternsApplied: 0,
        stringFiltersApplied: 0,
        totalMatches: 0,
      },
    };
  }
}
