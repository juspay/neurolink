/**
 * Response Validation Processor
 *
 * Validates LLM response structure and content against specified criteria,
 * including required phrases, forbidden phrases, and JSON schema validation.
 *
 * @module responseValidationProcessor
 */

import type {
  OutputProcessor,
  OutputProcessorData,
  ProcessorIssue,
  ProcessorResult,
  ResponseValidationConfig,
} from "../../types/processorTypes.js";
import { validateJsonSchema } from "../utils/validationUtils.js";

/**
 * Create a Response Validation Processor
 *
 * @param defaultConfig - Default configuration
 * @returns OutputProcessor instance
 *
 * @example
 * ```typescript
 * const validationProcessor = createResponseValidationProcessor({
 *   minLength: 50,
 *   requiredPhrases: ["in conclusion"],
 *   forbiddenPhrases: ["I don't know"],
 *   retryOnFailure: true,
 *   maxRetries: 2,
 * });
 *
 * const result = await validationProcessor.process(outputData);
 * ```
 */
export function createResponseValidationProcessor(
  defaultConfig?: ResponseValidationConfig,
): OutputProcessor<ResponseValidationConfig> {
  return {
    id: "response-validation",
    name: "Response Validation",
    description: "Validates LLM response structure and content",
    priority: 100,

    async process(
      data: OutputProcessorData,
      config?: ResponseValidationConfig,
    ): Promise<ProcessorResult<OutputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        minLength = 0,
        maxLength = Number.MAX_SAFE_INTEGER,
        requiredPhrases = [],
        forbiddenPhrases = [],
        jsonSchema,
        retryOnFailure = false,
        maxRetries = 3,
        customValidator,
      } = mergedConfig;

      const response = data.responseText || "";
      const issues: ProcessorIssue[] = [];
      const errors: string[] = [];

      // Length validation
      if (response.length < minLength) {
        errors.push(
          `Response too short: ${response.length} < ${minLength} characters`,
        );
      }
      if (response.length > maxLength) {
        errors.push(
          `Response too long: ${response.length} > ${maxLength} characters`,
        );
      }

      // Required phrases check
      for (const phrase of requiredPhrases) {
        if (!response.toLowerCase().includes(phrase.toLowerCase())) {
          errors.push(`Required phrase missing: "${phrase}"`);
        }
      }

      // Forbidden phrases check
      for (const phrase of forbiddenPhrases) {
        if (response.toLowerCase().includes(phrase.toLowerCase())) {
          errors.push(`Forbidden phrase found: "${phrase}"`);
        }
      }

      // JSON schema validation (if provided)
      if (jsonSchema) {
        try {
          const parsed = JSON.parse(response);
          const schemaErrors = validateJsonSchema(parsed, jsonSchema);
          errors.push(...schemaErrors);
        } catch {
          errors.push("Response is not valid JSON");
        }
      }

      // Custom validation
      if (customValidator) {
        try {
          const customResult = customValidator(response);
          errors.push(...customResult.errors);
        } catch (error) {
          errors.push(
            `Custom validator error: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Convert errors to issues
      for (const error of errors) {
        issues.push({
          category: "response_validation",
          severity: "error",
          message: error,
        });
      }

      // Handle validation failures
      if (errors.length > 0) {
        const currentRetry = (data.metadata.custom.retryCount as number) || 0;

        if (retryOnFailure && currentRetry < maxRetries) {
          const feedback = `Validation failed: ${errors.join("; ")}. Please regenerate with these requirements met.`;
          return {
            action: "retry",
            feedback,
            issues,
            retryCount: currentRetry + 1,
            maxRetries,
          };
        }

        return {
          action: "abort",
          feedback: `Response validation failed: ${errors.join("; ")}`,
          issues,
          metadata: {
            validationPassed: false,
            errorCount: errors.length,
            retriesExhausted: retryOnFailure && currentRetry >= maxRetries,
          },
        };
      }

      // Validation passed
      return {
        action: "continue",
        data,
        metadata: { validationPassed: true },
      };
    },

    validateConfig(config: ResponseValidationConfig): {
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

      if (config.maxRetries !== undefined && config.maxRetries < 0) {
        errors.push("maxRetries must be non-negative");
      }

      return { valid: errors.length === 0, errors };
    },
  };
}

/**
 * Pre-configured response validation processor with default settings
 */
export const responseValidationProcessor = createResponseValidationProcessor();
