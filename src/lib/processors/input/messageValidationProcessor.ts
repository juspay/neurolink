/**
 * Message Validation Processor
 *
 * Validates message structure and content requirements
 * before sending to the LLM.
 *
 * @module messageValidationProcessor
 */

import type {
  InputProcessor,
  InputProcessorData,
  MessageValidationConfig,
  ProcessorIssue,
  ProcessorResult,
  ProcessorValidationResult,
} from "../../types/index.js";

/**
 * Create a Message Validation Processor
 *
 * @param defaultConfig - Default configuration
 * @returns InputProcessor instance
 *
 * @example
 * ```typescript
 * const validationProcessor = createMessageValidationProcessor({
 *   minLength: 10,
 *   maxLength: 10000,
 *   maxMessages: 50,
 *   requireSystemPrompt: true,
 * });
 *
 * const result = await validationProcessor.process(inputData);
 * ```
 */
export function createMessageValidationProcessor(
  defaultConfig?: MessageValidationConfig,
): InputProcessor<MessageValidationConfig> {
  return {
    id: "message-validation",
    name: "Message Validation",
    description: "Validates message structure and content requirements",
    priority: 90,

    async process(
      data: InputProcessorData,
      config?: MessageValidationConfig,
    ): Promise<ProcessorResult<InputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        minLength = 1,
        maxLength = 100000,
        maxMessages = 100,
        requireSystemPrompt = false,
        trimWhitespace = false,
        requireContent = false,
        customValidator,
      } = mergedConfig;

      const issues: ProcessorIssue[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Defensive: messages may be absent when callers use simplified input
      const messages = data.messages ?? [];

      // Optionally trim whitespace from input text (mutates working copy of data)
      let workingData = data;
      if (trimWhitespace && typeof data.text === "string") {
        workingData = { ...data, text: data.text.trim() };
      }

      // Require non-empty content if configured
      if (requireContent) {
        const trimmedText =
          typeof workingData.text === "string" ? workingData.text.trim() : "";
        if (trimmedText.length === 0) {
          return {
            action: "abort",
            feedback: "Message content is empty",
            issues: [
              {
                category: "validation",
                severity: "error",
                message: "Message content is empty",
              },
            ],
            metadata: {
              validationPassed: false,
              empty: true,
            },
          };
        }
      }

      // Validate text length
      if (workingData.text !== undefined && workingData.text !== null) {
        if (workingData.text.length < minLength) {
          errors.push(
            `Message too short: ${workingData.text.length} characters (minimum: ${minLength})`,
          );
        }
        if (workingData.text.length > maxLength) {
          errors.push(
            `Message too long: ${workingData.text.length} characters (maximum: ${maxLength})`,
          );
        }
      }

      // Validate message count
      if (messages.length > maxMessages) {
        errors.push(
          `Too many messages: ${messages.length} (maximum: ${maxMessages})`,
        );
      }

      // Validate system prompt requirement
      if (requireSystemPrompt && !workingData.systemPrompt) {
        errors.push("System prompt is required but not provided");
      }

      // Validate message structure
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];

        if (!message.role) {
          errors.push(`Message at index ${i} is missing required 'role' field`);
        }

        if (!message.content && message.content !== "") {
          errors.push(
            `Message at index ${i} is missing required 'content' field`,
          );
        }

        // Check for valid role
        const validRoles = [
          "user",
          "assistant",
          "system",
          "tool_call",
          "tool_result",
        ];
        if (message.role && !validRoles.includes(message.role)) {
          warnings.push(
            `Message at index ${i} has unexpected role: ${message.role}`,
          );
        }
      }

      // Check for empty conversation (no user messages)
      const hasUserMessage = messages.some((m) => m.role === "user");
      if (messages.length > 0 && !hasUserMessage && !workingData.text) {
        warnings.push("No user message found in conversation");
      }

      // Run custom validator if provided
      if (customValidator) {
        try {
          const customResult: ProcessorValidationResult =
            customValidator(workingData);
          errors.push(...customResult.errors);
          warnings.push(...customResult.warnings);
        } catch (error) {
          errors.push(
            `Custom validator threw error: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Convert errors to issues
      for (const error of errors) {
        issues.push({
          category: "validation",
          severity: "error",
          message: error,
        });
      }

      // Convert warnings to issues
      for (const warning of warnings) {
        issues.push({
          category: "validation",
          severity: "warning",
          message: warning,
        });
      }

      // If there are validation errors, abort
      if (errors.length > 0) {
        return {
          action: "abort",
          feedback: `Validation failed: ${errors.join("; ")}`,
          issues,
          metadata: {
            validationPassed: false,
            errorCount: errors.length,
            warningCount: warnings.length,
          },
        };
      }

      // Continue with warnings if no errors (use workingData so trimWhitespace is applied)
      return {
        action: "continue",
        data: workingData,
        issues: issues.length > 0 ? issues : undefined,
        metadata: {
          validationPassed: true,
          warningCount: warnings.length,
        },
      };
    },

    validateConfig(config: MessageValidationConfig): {
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

      if (config.maxMessages !== undefined && config.maxMessages < 1) {
        errors.push("maxMessages must be at least 1");
      }

      return { valid: errors.length === 0, errors };
    },
  };
}

/**
 * Pre-configured message validation processor with default settings
 */
export const messageValidationProcessor = createMessageValidationProcessor();
