/**
 * Content Filtering Processor
 *
 * Filters inappropriate content from LLM responses,
 * optionally redacting or retrying when issues are found.
 *
 * @module contentFilteringProcessor
 */

import type { JsonObject } from "../../types/common.js";
import type {
  ContentFilteringConfig,
  OutputProcessor,
  OutputProcessorData,
  ProcessorIssue,
  ProcessorResult,
} from "../../types/processorTypes.js";
import { escapeRegExp } from "../utils/validationUtils.js";

/**
 * Create a Content Filtering Processor
 *
 * @param defaultConfig - Default configuration
 * @returns OutputProcessor instance
 *
 * @example
 * ```typescript
 * const filterProcessor = createContentFilteringProcessor({
 *   filterWords: ["confidential", "secret"],
 *   filterPatterns: ["\\bpassword\\s*[:=]\\s*\\S+"],
 *   replacementText: "[FILTERED]",
 *   action: "redact",
 * });
 *
 * const result = await filterProcessor.process(outputData);
 * ```
 */
export function createContentFilteringProcessor(
  defaultConfig?: ContentFilteringConfig,
): OutputProcessor<ContentFilteringConfig> {
  return {
    id: "content-filtering",
    name: "Content Filtering",
    description: "Filters inappropriate content from LLM responses",
    priority: 90,

    async process(
      data: OutputProcessorData,
      config?: ContentFilteringConfig,
    ): Promise<ProcessorResult<OutputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        filterWords = [],
        filterPatterns = [],
        replacementText = "[FILTERED]",
        action = "redact",
        maxRetries = 2,
      } = mergedConfig;

      let filteredText = data.responseText || "";
      const issues: ProcessorIssue[] = [];
      let hasFilteredContent = false;
      const filteredItems: string[] = [];

      // Filter words
      for (const word of filterWords) {
        const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");
        if (regex.test(filteredText)) {
          hasFilteredContent = true;
          filteredItems.push(`word:${word}`);

          issues.push({
            category: "content_filtering",
            severity: "warning",
            message: `Filtered word detected: "${word}"`,
            context: { type: "word", value: word } as JsonObject,
          });

          if (action === "redact") {
            filteredText = filteredText.replace(regex, replacementText);
          }
        }
      }

      // Filter patterns
      for (const pattern of filterPatterns) {
        try {
          const regex = new RegExp(pattern, "gi");
          if (regex.test(filteredText)) {
            hasFilteredContent = true;
            filteredItems.push(`pattern:${pattern}`);

            issues.push({
              category: "content_filtering",
              severity: "warning",
              message: "Filtered pattern matched",
              context: { type: "pattern" } as JsonObject,
            });

            if (action === "redact") {
              filteredText = filteredText.replace(regex, replacementText);
            }
          }
        } catch {
          // Invalid regex, skip
          issues.push({
            category: "content_filtering",
            severity: "info",
            message: `Invalid regex pattern skipped: ${pattern}`,
          });
        }
      }

      // No filtered content found
      if (!hasFilteredContent) {
        return {
          action: "continue",
          data,
          metadata: { contentFiltered: false },
        };
      }

      // Handle based on action
      if (action === "abort") {
        return {
          action: "abort",
          feedback:
            "Response contained inappropriate content that cannot be filtered.",
          issues,
          metadata: {
            contentFiltered: true,
            filteredItemCount: filteredItems.length,
          },
        };
      }

      if (action === "retry") {
        const currentRetry = (data.metadata.custom.retryCount as number) || 0;
        if (currentRetry < maxRetries) {
          const feedback = `Response contained inappropriate content. Please regenerate without: ${filteredItems.map((i) => i.split(":")[1]).join(", ")}`;
          return {
            action: "retry",
            feedback,
            issues,
            retryCount: currentRetry + 1,
            maxRetries,
          };
        }
        // Max retries exceeded, fall through to redact
      }

      // Redact and continue
      return {
        action: "continue",
        data: {
          ...data,
          responseText: filteredText,
          result: {
            ...data.result,
            content: filteredText,
          },
        },
        issues,
        metadata: {
          contentFiltered: true,
          filteredItemCount: filteredItems.length,
          redacted:
            action === "redact" ||
            (action === "retry" &&
              ((data.metadata.custom.retryCount as number) || 0) >= maxRetries),
        },
      };
    },

    validateConfig(config: ContentFilteringConfig): {
      valid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];

      if (
        config.action &&
        !["redact", "abort", "retry"].includes(config.action)
      ) {
        errors.push(
          `Invalid action: ${config.action}. Must be 'redact', 'abort', or 'retry'`,
        );
      }

      if (config.maxRetries !== undefined && config.maxRetries < 0) {
        errors.push("maxRetries must be non-negative");
      }

      // Validate patterns are valid regex
      if (config.filterPatterns) {
        for (const pattern of config.filterPatterns) {
          try {
            new RegExp(pattern);
          } catch {
            errors.push(`Invalid regex pattern: ${pattern}`);
          }
        }
      }

      return { valid: errors.length === 0, errors };
    },
  };
}

/**
 * Pre-configured content filtering processor with default settings
 */
export const contentFilteringProcessor = createContentFilteringProcessor();
