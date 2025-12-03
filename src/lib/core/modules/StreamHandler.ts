/**
 * Stream Handler Module
 *
 * Handles streaming-related validation, result creation, and analytics.
 * Extracted from BaseProvider to follow Single Responsibility Principle.
 *
 * Responsibilities:
 * - Stream options validation
 * - Text stream creation
 * - Stream result formatting
 * - Stream analytics creation
 *
 * @module core/modules/StreamHandler
 */

import type { StreamOptions, StreamResult } from "../../types/streamTypes.js";
import type { UnknownRecord } from "../../types/common.js";
import type { AIProviderName } from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import {
  validateStreamOptions as validateStreamOpts,
  ValidationError,
  createValidationSummary,
} from "../../utils/parameterValidation.js";
import { STEP_LIMITS } from "../constants.js";
import { createAnalytics } from "../analytics.js";
import { nanoid } from "nanoid";

/**
 * StreamHandler class - Handles streaming operations for AI providers
 */
export class StreamHandler {
  constructor(
    private readonly providerName: AIProviderName,
    private readonly modelName: string,
  ) {}

  /**
   * Validate stream options - consolidates validation from 7/10 providers
   */
  validateStreamOptions(options: StreamOptions): void {
    const validation = validateStreamOpts(options);

    if (!validation.isValid) {
      const summary = createValidationSummary(validation);
      throw new ValidationError(
        `Stream options validation failed: ${summary}`,
        "options",
        "VALIDATION_FAILED",
        validation.suggestions,
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn("Stream options validation warnings:", validation.warnings);
    }

    // Additional BaseProvider-specific validation
    if (options.maxSteps !== undefined) {
      if (
        options.maxSteps < STEP_LIMITS.min ||
        options.maxSteps > STEP_LIMITS.max
      ) {
        throw new ValidationError(
          `maxSteps must be between ${STEP_LIMITS.min} and ${STEP_LIMITS.max}`,
          "maxSteps",
          "OUT_OF_RANGE",
          [
            `Use a value between ${STEP_LIMITS.min} and ${STEP_LIMITS.max} for optimal performance`,
          ],
        );
      }
    }
  }

  /**
   * Create text stream transformation - consolidates identical logic from 7/10 providers
   */
  createTextStream(result: {
    textStream: AsyncIterable<string>;
  }): AsyncGenerator<{ content: string }> {
    return (async function* () {
      for await (const chunk of result.textStream) {
        yield { content: chunk };
      }
    })();
  }

  /**
   * Create standardized stream result - consolidates result structure
   */
  createStreamResult(
    stream: AsyncGenerator<{ content: string }>,
    additionalProps: Partial<StreamResult> = {},
  ): StreamResult {
    return {
      stream,
      provider: this.providerName,
      model: this.modelName,
      ...additionalProps,
    };
  }

  /**
   * Create stream analytics - consolidates analytics from 4/10 providers
   */
  async createStreamAnalytics(
    result: UnknownRecord,
    startTime: number,
    options: StreamOptions,
  ): Promise<UnknownRecord | undefined> {
    try {
      const analytics = createAnalytics(
        this.providerName,
        this.modelName,
        result,
        Date.now() - startTime,
        {
          requestId: `${this.providerName}-stream-${nanoid()}`,
          streamingMode: true,
          ...options.context,
        },
      );
      return analytics as unknown as UnknownRecord;
    } catch (error) {
      logger.warn(`Analytics creation failed for ${this.providerName}:`, error);
      return undefined;
    }
  }

  /**
   * Validate streaming-only options (called before executeStream)
   * Simpler validation for options object structure
   */
  validateStreamOptionsOnly(options: StreamOptions): void {
    if (!options.input) {
      throw new ValidationError(
        "Stream options must include input",
        "input",
        "MISSING_REQUIRED",
        ["Provide options.input with text content"],
      );
    }

    if (!options.input.text && !options.input.images?.length) {
      throw new ValidationError(
        "Stream input must include either text or images",
        "input",
        "MISSING_REQUIRED",
        ["Provide options.input.text or options.input.images"],
      );
    }
  }
}
