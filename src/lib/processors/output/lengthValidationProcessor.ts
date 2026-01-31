/**
 * Length Validation Processor
 *
 * Validates response length constraints and can truncate or retry
 * if the response doesn't meet requirements.
 *
 * @module lengthValidationProcessor
 */

import type {
  LengthValidationConfig,
  OutputProcessor,
  OutputProcessorData,
  ProcessorIssue,
  ProcessorResult,
} from "../../types/processorTypes.js";

/**
 * Create a Length Validation Processor
 *
 * @param defaultConfig - Default configuration
 * @returns OutputProcessor instance
 *
 * @example
 * ```typescript
 * const lengthProcessor = createLengthValidationProcessor({
 *   minLength: 100,
 *   maxLength: 5000,
 *   action: "truncate",
 *   truncationSuffix: "...",
 * });
 *
 * const result = await lengthProcessor.process(outputData);
 * ```
 */
export function createLengthValidationProcessor(
  defaultConfig?: LengthValidationConfig,
): OutputProcessor<LengthValidationConfig> {
  return {
    id: "length-validation",
    name: "Length Validation",
    description: "Validates response length and can truncate or retry",
    priority: 70,

    async process(
      data: OutputProcessorData,
      config?: LengthValidationConfig,
    ): Promise<ProcessorResult<OutputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        minLength = 0,
        maxLength = Number.MAX_SAFE_INTEGER,
        action = "warn",
        maxRetries = 2,
        truncationSuffix = "...",
      } = mergedConfig;

      const responseText = data.responseText || "";
      const responseLength = responseText.length;
      const issues: ProcessorIssue[] = [];

      // Check minimum length
      if (responseLength < minLength) {
        issues.push({
          category: "length_validation",
          severity: action === "abort" ? "error" : "warning",
          message: `Response too short: ${responseLength} characters (minimum: ${minLength})`,
          context: {
            actualLength: responseLength,
            minLength,
          },
        });

        if (action === "abort") {
          return {
            action: "abort",
            feedback: `Response is too short (${responseLength} characters, minimum ${minLength}). Please provide a more detailed response.`,
            issues,
          };
        }

        if (action === "retry") {
          const currentRetry = (data.metadata.custom.retryCount as number) || 0;
          if (currentRetry < maxRetries) {
            return {
              action: "retry",
              feedback: `Response is too short (${responseLength} characters). Please provide a more detailed response with at least ${minLength} characters.`,
              issues,
              retryCount: currentRetry + 1,
              maxRetries,
            };
          }
          // Max retries exceeded, abort
          return {
            action: "abort",
            feedback: `Response is too short after ${maxRetries} retries.`,
            issues,
          };
        }
      }

      // Check maximum length
      if (responseLength > maxLength) {
        issues.push({
          category: "length_validation",
          severity: action === "abort" ? "error" : "warning",
          message: `Response too long: ${responseLength} characters (maximum: ${maxLength})`,
          context: {
            actualLength: responseLength,
            maxLength,
          },
        });

        if (action === "abort") {
          return {
            action: "abort",
            feedback: `Response is too long (${responseLength} characters, maximum ${maxLength}).`,
            issues,
          };
        }

        if (action === "truncate") {
          const truncatedText =
            responseText.slice(0, maxLength - truncationSuffix.length) +
            truncationSuffix;

          return {
            action: "continue",
            data: {
              ...data,
              responseText: truncatedText,
              result: {
                ...data.result,
                content: truncatedText,
              },
            },
            issues,
            metadata: {
              truncated: true,
              originalLength: responseLength,
              truncatedLength: truncatedText.length,
            },
          };
        }

        if (action === "retry") {
          const currentRetry = (data.metadata.custom.retryCount as number) || 0;
          if (currentRetry < maxRetries) {
            return {
              action: "retry",
              feedback: `Response is too long (${responseLength} characters). Please provide a shorter response with at most ${maxLength} characters.`,
              issues,
              retryCount: currentRetry + 1,
              maxRetries,
            };
          }
          // Max retries exceeded, truncate as fallback
          const truncatedText =
            responseText.slice(0, maxLength - truncationSuffix.length) +
            truncationSuffix;

          return {
            action: "continue",
            data: {
              ...data,
              responseText: truncatedText,
              result: {
                ...data.result,
                content: truncatedText,
              },
            },
            issues: [
              ...issues,
              {
                category: "length_validation",
                severity: "warning",
                message: `Response truncated after max retries (${maxRetries})`,
              },
            ],
            metadata: {
              truncated: true,
              originalLength: responseLength,
              truncatedLength: truncatedText.length,
              maxRetriesExceeded: true,
            },
          };
        }
      }

      // Length is within bounds
      return {
        action: "continue",
        data,
        issues: issues.length > 0 ? issues : undefined,
        metadata: {
          lengthValidated: true,
          responseLength,
        },
      };
    },

    validateConfig(config: LengthValidationConfig): {
      valid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];

      if (config.minLength !== undefined && config.minLength < 0) {
        errors.push("minLength must be non-negative");
      }

      if (config.maxLength !== undefined && config.maxLength < 0) {
        errors.push("maxLength must be non-negative");
      }

      if (config.minLength !== undefined && config.maxLength !== undefined) {
        if (config.minLength > config.maxLength) {
          errors.push("minLength cannot be greater than maxLength");
        }
      }

      if (
        config.action &&
        !["abort", "retry", "truncate", "warn"].includes(config.action)
      ) {
        errors.push(
          `Invalid action: ${config.action}. Must be 'abort', 'retry', 'truncate', or 'warn'`,
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
 * Pre-configured length validation processor with default settings
 */
export const lengthValidationProcessor = createLengthValidationProcessor();
