/**
 * ProcessorPipeline - Core pipeline implementation
 *
 * Executes input and output processors in sequence with proper
 * metadata propagation, error handling, and abort/retry mechanisms.
 *
 * @module pipeline
 */

import type {
  InputProcessor,
  InputProcessorData,
  OutputProcessor,
  OutputProcessorData,
  ProcessorPipelineResult,
  ProcessorConditions,
  ProcessorConfig,
  ProcessorIssue,
  ProcessorMetadata,
  ProcessorPipelineConfig,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * ProcessorPipeline orchestrates the execution of input and output processors
 *
 * @example
 * ```typescript
 * const pipeline = new ProcessorPipeline({
 *   inputProcessors: [
 *     { processor: piiDetectionProcessor },
 *     { processor: validationProcessor },
 *   ],
 *   outputProcessors: [
 *     { processor: toxicityCheckProcessor },
 *     { processor: lengthValidationProcessor },
 *   ],
 *   settings: {
 *     maxTotalRetries: 3,
 *     enableTracing: true,
 *   },
 * });
 *
 * const inputResult = await pipeline.processInput(inputData);
 * // ... execute LLM ...
 * const outputResult = await pipeline.processOutput(outputData);
 * ```
 */
export class ProcessorPipeline {
  private inputProcessors: Array<{
    processor: InputProcessor;
    config?: ProcessorConfig;
  }> = [];

  private outputProcessors: Array<{
    processor: OutputProcessor;
    config?: ProcessorConfig;
  }> = [];

  private settings: NonNullable<ProcessorPipelineConfig["settings"]>;

  private name?: string;

  /**
   * Create a new ProcessorPipeline
   * @param config - Pipeline configuration
   */
  constructor(config: ProcessorPipelineConfig = {}) {
    this.name = config.name;

    // Sort by priority (higher = earlier)
    if (config.inputProcessors) {
      this.inputProcessors = [...config.inputProcessors].sort(
        (a, b) => (b.processor.priority || 0) - (a.processor.priority || 0),
      );
    }

    if (config.outputProcessors) {
      this.outputProcessors = [...config.outputProcessors].sort(
        (a, b) => (b.processor.priority || 0) - (a.processor.priority || 0),
      );
    }

    this.settings = {
      stopOnAbort: config.stopOnAbort ?? config.settings?.stopOnAbort ?? true,
      maxTotalRetries: config.settings?.maxTotalRetries ?? 3,
      pipelineTimeout:
        config.pipelineTimeoutMs ?? config.settings?.pipelineTimeout ?? 30000,
      enableTracing: config.settings?.enableTracing ?? false,
    };
  }

  /**
   * Wrap a promise with a timeout
   * @param promise - The promise to wrap
   * @param timeoutMs - Timeout in milliseconds
   * @param operation - Name of the operation for error messages
   * @returns The promise result or throws on timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string,
  ): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) {
      return promise;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(`Pipeline ${operation} timed out after ${timeoutMs}ms`),
        );
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      return result;
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Add an input processor to the pipeline
   * @param processor - Processor to add
   * @param config - Optional configuration
   */
  addInputProcessor(processor: InputProcessor, config?: ProcessorConfig): void {
    this.inputProcessors.push({ processor, config });
    // Re-sort by priority
    this.inputProcessors.sort(
      (a, b) => (b.processor.priority || 0) - (a.processor.priority || 0),
    );
  }

  /**
   * Add an output processor to the pipeline
   * @param processor - Processor to add
   * @param config - Optional configuration
   */
  addOutputProcessor(
    processor: OutputProcessor,
    config?: ProcessorConfig,
  ): void {
    this.outputProcessors.push({ processor, config });
    // Re-sort by priority
    this.outputProcessors.sort(
      (a, b) => (b.processor.priority || 0) - (a.processor.priority || 0),
    );
  }

  /**
   * Run input processors on the data
   * @param data - Input data to process
   * @param metadataOverrides - Optional metadata fields to merge before processing
   * @returns Pipeline result with processed data or abort feedback
   */
  async processInput(
    data: InputProcessorData,
    metadataOverrides?: Partial<ProcessorMetadata>,
  ): Promise<ProcessorPipelineResult<InputProcessorData>> {
    if (metadataOverrides) {
      if (!data.metadata) {
        (data as Record<string, unknown>).metadata = {};
      }
      Object.assign(data.metadata, metadataOverrides);
    }
    return this.withTimeout(
      this._processInput(data),
      this.settings.pipelineTimeout ?? 30000,
      "input processing",
    );
  }

  /**
   * Internal input processing implementation
   * @param data - Input data to process
   * @returns Pipeline result with processed data or abort feedback
   */
  private async _processInput(
    data: InputProcessorData,
  ): Promise<ProcessorPipelineResult<InputProcessorData>> {
    const startTime = Date.now();
    const feedback: string[] = [];
    let currentData = data;
    let processorsExecuted = 0;

    // Initialize default metadata if not provided
    if (!currentData.metadata) {
      (currentData as Record<string, unknown>).metadata = {
        requestId: `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
        custom: {},
        issues: [],
        processorTrace: [],
      };
    }

    // Ensure metadata has the required arrays
    if (!currentData.metadata.processorTrace) {
      currentData.metadata.processorTrace = [];
    }
    if (!currentData.metadata.issues) {
      currentData.metadata.issues = [];
    }
    if (!currentData.metadata.custom) {
      currentData.metadata.custom = {};
    }

    for (const { processor, config } of this.inputProcessors) {
      // Skip disabled processors
      if (config?.enabled === false) {
        if (this.settings.enableTracing) {
          logger.debug(
            `[ProcessorPipeline] Skipping disabled input processor: ${processor.id}`,
          );
        }
        continue;
      }

      // Check conditions
      if (
        config?.conditions &&
        !this.checkConditions(config.conditions, currentData.metadata)
      ) {
        if (this.settings.enableTracing) {
          logger.debug(
            `[ProcessorPipeline] Conditions not met for input processor: ${processor.id}`,
          );
        }
        continue;
      }

      const processorStart = Date.now();

      try {
        if (this.settings.enableTracing) {
          logger.debug(
            `[ProcessorPipeline] Running input processor: ${processor.id}`,
          );
        }

        const result = await processor.process(currentData, config?.config);

        // Record trace
        currentData.metadata.processorTrace.push({
          processorId: processor.id,
          processorName: processor.name,
          action: result.action,
          executionTime: Date.now() - processorStart,
          feedback: result.feedback,
        });

        // Merge issues
        if (result.issues) {
          currentData.metadata.issues.push(...result.issues);
        }

        // Merge custom metadata
        if (result.metadata) {
          Object.assign(currentData.metadata.custom, result.metadata);
        }

        // Handle abort
        if (result.action === "abort") {
          if (result.feedback) {
            feedback.push(result.feedback);
          }

          processorsExecuted++;

          logger.debug(
            `[ProcessorPipeline] Input processor ${processor.id} aborted pipeline`,
          );

          return {
            action: "abort",
            feedback,
            issues: currentData.metadata.issues,
            metadata: currentData.metadata,
            totalTime: Date.now() - startTime,
            processorsExecuted,
          };
        }

        // Update data for next processor
        if (result.action === "continue" && result.data) {
          currentData = result.data;
        }

        processorsExecuted++;
      } catch (error) {
        logger.error(
          `[ProcessorPipeline] Input processor ${processor.id} threw error:`,
          error,
        );

        const errorIssue: ProcessorIssue = {
          category: "processor_error",
          severity: "error",
          message: `Processor ${processor.id} failed: ${error instanceof Error ? error.message : String(error)}`,
        };
        currentData.metadata.issues.push(errorIssue);

        // Record trace with error
        currentData.metadata.processorTrace.push({
          processorId: processor.id,
          processorName: processor.name,
          action: "abort",
          executionTime: Date.now() - processorStart,
          feedback: errorIssue.message,
        });

        processorsExecuted++;

        if (this.settings.stopOnAbort) {
          return {
            action: "abort",
            feedback: [
              `Processor ${processor.id} threw an error: ${error instanceof Error ? error.message : String(error)}`,
            ],
            issues: currentData.metadata.issues,
            metadata: currentData.metadata,
            totalTime: Date.now() - startTime,
            processorsExecuted,
          };
        }
      }
    }

    return {
      action: "continue",
      data: currentData,
      feedback,
      issues: currentData.metadata.issues,
      metadata: currentData.metadata,
      totalTime: Date.now() - startTime,
      processorsExecuted,
    };
  }

  /**
   * Run output processors on the data
   * @param data - Output data to process
   * @param metadataOverrides - Optional metadata fields to merge before processing
   * @returns Pipeline result with processed data, abort, or retry request
   */
  async processOutput(
    data: OutputProcessorData,
    metadataOverrides?: Partial<ProcessorMetadata>,
  ): Promise<ProcessorPipelineResult<OutputProcessorData>> {
    if (metadataOverrides) {
      if (!data.metadata) {
        (data as Record<string, unknown>).metadata = {};
      }
      Object.assign(data.metadata, metadataOverrides);
    }
    return this.withTimeout(
      this._processOutput(data),
      this.settings.pipelineTimeout ?? 30000,
      "output processing",
    );
  }

  /**
   * Internal output processing implementation
   * @param data - Output data to process
   * @returns Pipeline result with processed data, abort, or retry request
   */
  private async _processOutput(
    data: OutputProcessorData,
  ): Promise<ProcessorPipelineResult<OutputProcessorData>> {
    const startTime = Date.now();
    const feedback: string[] = [];
    let currentData = data;
    let totalRetries = 0;
    let processorsExecuted = 0;
    const maxTotalRetries = this.settings.maxTotalRetries || 3;

    // Initialize default metadata if not provided
    if (!currentData.metadata) {
      (currentData as Record<string, unknown>).metadata = {
        requestId: `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
        custom: {},
        issues: [],
        processorTrace: [],
      };
    }

    // Ensure metadata has the required arrays
    if (!currentData.metadata.processorTrace) {
      currentData.metadata.processorTrace = [];
    }
    if (!currentData.metadata.issues) {
      currentData.metadata.issues = [];
    }
    if (!currentData.metadata.custom) {
      currentData.metadata.custom = {};
    }

    for (const { processor, config } of this.outputProcessors) {
      // Skip disabled processors
      if (config?.enabled === false) {
        if (this.settings.enableTracing) {
          logger.debug(
            `[ProcessorPipeline] Skipping disabled output processor: ${processor.id}`,
          );
        }
        continue;
      }

      // Check conditions
      if (
        config?.conditions &&
        !this.checkConditions(config.conditions, currentData.metadata)
      ) {
        if (this.settings.enableTracing) {
          logger.debug(
            `[ProcessorPipeline] Conditions not met for output processor: ${processor.id}`,
          );
        }
        continue;
      }

      const processorStart = Date.now();

      try {
        if (this.settings.enableTracing) {
          logger.debug(
            `[ProcessorPipeline] Running output processor: ${processor.id}`,
          );
        }

        const result = await processor.process(currentData, config?.config);

        // Record trace
        currentData.metadata.processorTrace.push({
          processorId: processor.id,
          processorName: processor.name,
          action: result.action,
          executionTime: Date.now() - processorStart,
          feedback: result.feedback,
        });

        // Merge issues
        if (result.issues) {
          currentData.metadata.issues.push(...result.issues);
        }

        // Merge custom metadata
        if (result.metadata) {
          Object.assign(currentData.metadata.custom, result.metadata);
        }

        // Handle abort
        if (result.action === "abort") {
          if (result.feedback) {
            feedback.push(result.feedback);
          }

          processorsExecuted++;

          logger.debug(
            `[ProcessorPipeline] Output processor ${processor.id} aborted pipeline`,
          );

          return {
            action: "abort",
            feedback,
            issues: currentData.metadata.issues,
            metadata: currentData.metadata,
            totalTime: Date.now() - startTime,
            processorsExecuted,
          };
        }

        // Handle retry
        if (result.action === "retry") {
          totalRetries++;

          processorsExecuted++;

          if (totalRetries <= maxTotalRetries) {
            if (result.feedback) {
              feedback.push(result.feedback);
            }

            // Store retry context in metadata
            currentData.metadata.custom.retryCount = totalRetries;
            currentData.metadata.custom.retryFeedback = result.feedback || "";
            currentData.metadata.custom.retryFromProcessor = processor.id;

            logger.debug(
              `[ProcessorPipeline] Output processor ${processor.id} requested retry (${totalRetries}/${maxTotalRetries})`,
            );

            return {
              action: "retry",
              data: currentData,
              feedback,
              issues: currentData.metadata.issues,
              metadata: currentData.metadata,
              totalTime: Date.now() - startTime,
              processorsExecuted,
            };
          }

          // Max retries exceeded
          logger.warn(
            `[ProcessorPipeline] Maximum retries (${maxTotalRetries}) exceeded for processor ${processor.id}`,
          );

          return {
            action: "abort",
            feedback: [
              ...feedback,
              `Maximum retries (${maxTotalRetries}) exceeded`,
            ],
            issues: currentData.metadata.issues,
            metadata: currentData.metadata,
            totalTime: Date.now() - startTime,
            processorsExecuted,
          };
        }

        // Continue with updated data
        if (result.action === "continue" && result.data) {
          currentData = result.data;
        }

        processorsExecuted++;
      } catch (error) {
        logger.error(
          `[ProcessorPipeline] Output processor ${processor.id} threw error:`,
          error,
        );

        const errorIssue: ProcessorIssue = {
          category: "processor_error",
          severity: "error",
          message: `Processor ${processor.id} failed: ${error instanceof Error ? error.message : String(error)}`,
        };
        currentData.metadata.issues.push(errorIssue);

        // Record trace with error
        currentData.metadata.processorTrace.push({
          processorId: processor.id,
          processorName: processor.name,
          action: "abort",
          executionTime: Date.now() - processorStart,
          feedback: errorIssue.message,
        });

        processorsExecuted++;

        if (this.settings.stopOnAbort) {
          return {
            action: "abort",
            feedback: [
              `Processor ${processor.id} threw an error: ${error instanceof Error ? error.message : String(error)}`,
            ],
            issues: currentData.metadata.issues,
            metadata: currentData.metadata,
            totalTime: Date.now() - startTime,
            processorsExecuted,
          };
        }
      }
    }

    return {
      action: "continue",
      data: currentData,
      feedback,
      issues: currentData.metadata.issues,
      metadata: currentData.metadata,
      totalTime: Date.now() - startTime,
      processorsExecuted,
    };
  }

  /**
   * Check if processor conditions are met
   */
  private checkConditions(
    conditions: ProcessorConditions,
    metadata: ProcessorMetadata,
  ): boolean {
    // Check provider condition
    if (conditions.providers && metadata.provider) {
      if (!conditions.providers.includes(metadata.provider)) {
        return false;
      }
    }

    // Check model condition
    if (conditions.models && metadata.model) {
      if (!conditions.models.includes(metadata.model)) {
        return false;
      }
    }

    // Check custom condition
    if (conditions.custom && !conditions.custom(metadata)) {
      return false;
    }

    return true;
  }

  /**
   * Get all registered input processors
   */
  getInputProcessors(): Array<{
    processor: InputProcessor;
    config?: ProcessorConfig;
  }> {
    return [...this.inputProcessors];
  }

  /**
   * Get all registered output processors
   */
  getOutputProcessors(): Array<{
    processor: OutputProcessor;
    config?: ProcessorConfig;
  }> {
    return [...this.outputProcessors];
  }

  /**
   * Get pipeline settings
   */
  getSettings(): NonNullable<ProcessorPipelineConfig["settings"]> {
    return { ...this.settings };
  }

  /**
   * Get pipeline configuration summary
   */
  getConfig(): {
    name?: string;
    stopOnAbort: boolean;
    pipelineTimeoutMs: number;
  } {
    return {
      name: this.name,
      stopOnAbort: this.settings.stopOnAbort ?? true,
      pipelineTimeoutMs: this.settings.pipelineTimeout ?? 30000,
    };
  }

  /**
   * Update pipeline settings
   */
  updateSettings(settings: Partial<ProcessorPipelineConfig["settings"]>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Remove an input processor by ID
   */
  removeInputProcessor(processorId: string): boolean {
    const index = this.inputProcessors.findIndex(
      (p) => p.processor.id === processorId,
    );
    if (index !== -1) {
      this.inputProcessors.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Remove an output processor by ID
   */
  removeOutputProcessor(processorId: string): boolean {
    const index = this.outputProcessors.findIndex(
      (p) => p.processor.id === processorId,
    );
    if (index !== -1) {
      this.outputProcessors.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all processors
   */
  clear(): void {
    this.inputProcessors = [];
    this.outputProcessors = [];
  }
}
