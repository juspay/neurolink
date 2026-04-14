/**
 * Toxicity Check Processor
 *
 * Evaluates LLM responses for toxic or harmful content
 * and can abort, retry, or warn based on configuration.
 *
 * @module toxicityCheckProcessor
 */

import type { JsonObject } from "../../types/index.js";
import type {
  OutputProcessor,
  OutputProcessorData,
  ProcessorIssue,
  ProcessorResult,
  ToxicityCategory,
  ToxicityCheckConfig,
} from "../../types/index.js";

/**
 * Default toxicity categories to check
 */
const DEFAULT_TOXICITY_CATEGORIES: ToxicityCategory[] = [
  "toxicity",
  "severe_toxicity",
  "insult",
  "threat",
];

/**
 * Simple toxicity indicators for heuristic checking
 * In production, use a proper toxicity detection API
 */
const TOXICITY_INDICATORS: Record<ToxicityCategory, string[]> = {
  toxicity: [],
  severe_toxicity: [],
  identity_attack: [],
  insult: ["stupid", "idiot", "moron", "dumb", "fool"],
  profanity: [],
  threat: ["kill", "murder", "destroy", "hurt", "attack"],
  sexually_explicit: [],
};

/**
 * Perform simple heuristic-based toxicity detection
 * In production, replace with actual toxicity API
 */
function detectToxicity(
  text: string,
  categories: ToxicityCategory[],
): {
  overallScore: number;
  categoryScores: Partial<Record<ToxicityCategory, number>>;
  flaggedCategories: ToxicityCategory[];
} {
  const lowerText = text.toLowerCase();
  const categoryScores: Partial<Record<ToxicityCategory, number>> = {};
  const flaggedCategories: ToxicityCategory[] = [];
  let totalScore = 0;

  for (const category of categories) {
    const indicators = TOXICITY_INDICATORS[category] || [];
    let matchCount = 0;

    for (const indicator of indicators) {
      if (lowerText.includes(indicator)) {
        matchCount++;
      }
    }

    // Calculate a simple score based on matches
    const categoryScore =
      indicators.length > 0 ? Math.min(matchCount / indicators.length, 1.0) : 0;

    categoryScores[category] = categoryScore;

    if (categoryScore > 0.3) {
      flaggedCategories.push(category);
      totalScore = Math.max(totalScore, categoryScore);
    }
  }

  return {
    overallScore: totalScore,
    categoryScores,
    flaggedCategories,
  };
}

/**
 * Create a Toxicity Check Processor
 *
 * @param defaultConfig - Default configuration
 * @returns OutputProcessor instance
 *
 * @example
 * ```typescript
 * const toxicityProcessor = createToxicityCheckProcessor({
 *   categories: ["toxicity", "insult", "threat"],
 *   blockThreshold: 0.7,
 *   warnThreshold: 0.4,
 *   action: "retry",
 *   maxRetries: 2,
 * });
 *
 * const result = await toxicityProcessor.process(outputData);
 * ```
 */
export function createToxicityCheckProcessor(
  defaultConfig?: ToxicityCheckConfig,
): OutputProcessor<ToxicityCheckConfig> {
  return {
    id: "toxicity-check",
    name: "Toxicity Check",
    description: "Evaluates response for toxic or harmful content",
    priority: 85,

    async process(
      data: OutputProcessorData,
      config?: ToxicityCheckConfig,
    ): Promise<ProcessorResult<OutputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        categories = DEFAULT_TOXICITY_CATEGORIES,
        blockThreshold = 0.7,
        warnThreshold = 0.4,
        action = "warn",
        maxRetries = 2,
      } = mergedConfig;

      const responseText = data.responseText || "";

      if (!responseText) {
        return {
          action: "continue",
          data,
          metadata: { toxicityChecked: false, reason: "empty_response" },
        };
      }

      // Perform toxicity detection
      const result = detectToxicity(responseText, categories);
      const issues: ProcessorIssue[] = [];

      // Check if toxicity exceeds block threshold
      if (result.overallScore >= blockThreshold) {
        issues.push({
          category: "toxicity",
          severity: "critical",
          message: `Toxicity detected (score: ${result.overallScore.toFixed(2)})`,
          context: {
            score: result.overallScore,
            flaggedCategories: result.flaggedCategories,
          } as JsonObject,
        });

        if (action === "abort") {
          return {
            action: "abort",
            feedback: `Response contains toxic content (score: ${result.overallScore.toFixed(2)}). Categories: ${result.flaggedCategories.join(", ")}`,
            issues,
            metadata: {
              toxicityScore: result.overallScore,
              flaggedCategories: result.flaggedCategories,
            },
          };
        }

        if (action === "retry") {
          const currentRetry = (data.metadata.custom.retryCount as number) || 0;
          if (currentRetry < maxRetries) {
            return {
              action: "retry",
              feedback: `Response contains potentially harmful content. Please regenerate with a more appropriate tone. Avoid: ${result.flaggedCategories.join(", ")}.`,
              issues,
              retryCount: currentRetry + 1,
              maxRetries,
            };
          }
          // Max retries exceeded, abort
          return {
            action: "abort",
            feedback: `Response continues to contain toxic content after ${maxRetries} retries.`,
            issues,
            metadata: {
              toxicityScore: result.overallScore,
              flaggedCategories: result.flaggedCategories,
              maxRetriesExceeded: true,
            },
          };
        }

        // action === "warn" - continue with warning
        return {
          action: "continue",
          data,
          issues,
          metadata: {
            toxicityScore: result.overallScore,
            flaggedCategories: result.flaggedCategories,
            toxicityWarned: true,
          },
        };
      }

      // Check if toxicity exceeds warn threshold
      if (result.overallScore >= warnThreshold) {
        issues.push({
          category: "toxicity",
          severity: "warning",
          message: `Elevated toxicity detected (score: ${result.overallScore.toFixed(2)})`,
          context: {
            score: result.overallScore,
            flaggedCategories: result.flaggedCategories,
          } as JsonObject,
        });

        return {
          action: "continue",
          data,
          issues,
          metadata: {
            toxicityScore: result.overallScore,
            flaggedCategories: result.flaggedCategories,
            toxicityWarned: true,
          },
        };
      }

      // No significant toxicity detected
      return {
        action: "continue",
        data,
        metadata: {
          toxicityChecked: true,
          toxicityScore: result.overallScore,
          toxicityPassed: true,
        },
      };
    },

    validateConfig(config: ToxicityCheckConfig): {
      valid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];

      if (config.blockThreshold !== undefined) {
        if (config.blockThreshold < 0 || config.blockThreshold > 1) {
          errors.push("blockThreshold must be between 0 and 1");
        }
      }

      if (config.warnThreshold !== undefined) {
        if (config.warnThreshold < 0 || config.warnThreshold > 1) {
          errors.push("warnThreshold must be between 0 and 1");
        }
      }

      if (
        config.blockThreshold !== undefined &&
        config.warnThreshold !== undefined
      ) {
        if (config.warnThreshold > config.blockThreshold) {
          errors.push(
            "warnThreshold should not be greater than blockThreshold",
          );
        }
      }

      if (
        config.action &&
        !["abort", "retry", "warn"].includes(config.action)
      ) {
        errors.push(
          `Invalid action: ${config.action}. Must be 'abort', 'retry', or 'warn'`,
        );
      }

      if (config.maxRetries !== undefined && config.maxRetries < 0) {
        errors.push("maxRetries must be non-negative");
      }

      return { valid: errors.length === 0, errors };
    },
  };
}

/**
 * Pre-configured toxicity check processor with default settings
 */
export const toxicityCheckProcessor = createToxicityCheckProcessor();
