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

import {
  trace,
  context as otelContext,
  SpanStatusCode,
} from "@opentelemetry/api";
import type {
  StreamOptions,
  StreamResult,
  UnknownRecord,
  AIProviderName,
} from "../../types/index.js";

import { tracers, ATTR, withSpan } from "../../telemetry/index.js";
import { logger } from "../../utils/logger.js";
import {
  validateStreamOptions as validateStreamOpts,
  ValidationError,
  createValidationSummary,
} from "../../utils/parameterValidation.js";
import { STEP_LIMITS } from "../constants.js";
import { createAnalytics } from "../analytics.js";
import { nanoid } from "nanoid";
import { NoOutputGeneratedError } from "ai";

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
    const span = tracers.stream.startSpan("neurolink.stream.validate", {
      attributes: {
        [ATTR.NL_PROVIDER]: this.providerName,
        [ATTR.NL_MODEL]: this.modelName,
        "stream.has_max_steps": options.maxSteps !== undefined,
      },
    });

    try {
      const validation = validateStreamOpts(options);

      if (!validation.isValid) {
        const summary = createValidationSummary(validation);
        span.setAttribute(
          "stream.validation_errors",
          validation.errors?.length ?? 0,
        );
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
        span.addEvent("stream.validation.warnings", {
          "warning.count": validation.warnings.length,
          warnings: validation.warnings.join("; ").substring(0, 500),
        });
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
    } catch (error) {
      span.recordException(
        error instanceof Error ? error : new Error(String(error)),
      );
      // NLK-GAP-006 fix: set error status alongside recordException
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Create text stream transformation - consolidates identical logic from 7/10 providers
   * Tracks TTFC (Time To First Chunk), chunk count, and total bytes streamed.
   */
  createTextStream(result: {
    textStream: AsyncIterable<string>;
  }): AsyncGenerator<{ content: string }> {
    const providerName = this.providerName;

    return (async function* () {
      let chunkCount = 0;
      let totalBytes = 0;
      const streamStart = Date.now();
      let firstChunkTime: number | undefined;

      try {
        for await (const chunk of result.textStream) {
          chunkCount++;
          totalBytes += chunk.length;

          if (!firstChunkTime) {
            firstChunkTime = Date.now();
            const activeSpan = trace.getSpan(otelContext.active());
            if (activeSpan) {
              activeSpan.addEvent("stream.first_chunk", {
                "stream.ttfc_ms": firstChunkTime - streamStart,
                "stream.provider": providerName,
              });
            }
          }

          yield { content: chunk };
        }
      } catch (error) {
        // AI SDK v6 throws NoOutputGeneratedError when the stream produces no output
        // (e.g. empty response, model refusal with no text). Treat as an empty stream
        // rather than crashing the process with an unhandled rejection.
        if (NoOutputGeneratedError.isInstance(error)) {
          logger.warn(
            `${providerName}: Stream produced no output (NoOutputGeneratedError), returning empty stream`,
          );
          // Curator P2-5: stamp the active OTel span so ContextEnricher.onEnd()
          // surfaces a WARNING-level Langfuse observation instead of defaulting
          // to DEFAULT with no status message.
          try {
            const activeSpan = trace.getSpan(otelContext.active());
            if (activeSpan) {
              activeSpan.setAttribute("neurolink.no_output", true);
            }
          } catch {
            // Tracing not initialized — ignore.
          }
          // S4 fix: yield a sentinel chunk so Pipeline B can detect the empty stream
          // and set the span to WARNING status instead of OK
          yield {
            content: "",
            metadata: {
              noOutput: true,
              errorType: "NoOutputGeneratedError",
            },
          };
        } else {
          throw error;
        }
      }

      // Record completion metrics on the active span
      const activeSpan = trace.getSpan(otelContext.active());
      if (activeSpan) {
        activeSpan.addEvent("stream.complete", {
          "stream.chunk_count": chunkCount,
          "stream.total_bytes": totalBytes,
          "stream.duration_ms": Date.now() - streamStart,
          "stream.ttfc_ms": firstChunkTime ? firstChunkTime - streamStart : -1,
        });
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
    return withSpan(
      {
        name: "neurolink.stream.analytics",
        tracer: tracers.stream,
        attributes: {
          [ATTR.NL_PROVIDER]: this.providerName,
          [ATTR.NL_MODEL]: this.modelName,
          [ATTR.NL_STREAM_MODE]: true,
        },
      },
      async (span) => {
        try {
          const durationMs = Date.now() - startTime;
          span.setAttribute("stream.duration_ms", durationMs);

          const analytics = createAnalytics(
            this.providerName,
            this.modelName,
            result,
            durationMs,
            {
              requestId: `${this.providerName}-stream-${nanoid()}`,
              streamingMode: true,
              ...options.context,
            },
          );
          return analytics as unknown as UnknownRecord;
        } catch (error) {
          logger.warn(
            `Analytics creation failed for ${this.providerName}:`,
            error,
          );
          return undefined;
        }
      },
    );
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
