/**
 * Processor factory utilities
 *
 * Provides factory functions for creating input and output processors
 * with a clean, type-safe API.
 *
 * @module processorFactory
 */

import type {
  CreateInputProcessorOptions,
  CreateOutputProcessorOptions,
  InputProcessor,
  InputProcessorData,
  JsonObject,
  OutputProcessor,
  OutputProcessorData,
  ProcessorResult,
} from "../../types/index.js";

/**
 * Create a simple input processor from a function
 * @param options - Processor options
 * @returns InputProcessor instance
 */
export function createInputProcessor<TConfig = JsonObject>(
  options: CreateInputProcessorOptions<TConfig>,
): InputProcessor<TConfig> {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    priority: options.priority,
    process: options.process,
    validateConfig: options.validateConfig,
  };
}

/**
 * Create a simple output processor from a function
 * @param options - Processor options
 * @returns OutputProcessor instance
 */
export function createOutputProcessor<TConfig = JsonObject>(
  options: CreateOutputProcessorOptions<TConfig>,
): OutputProcessor<TConfig> {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    priority: options.priority,
    process: options.process,
    validateConfig: options.validateConfig,
  };
}

/**
 * Compose multiple input processors into one
 * Processors are executed in order; if any processor aborts, the chain stops
 * @param processors - Array of processors to compose
 * @param options - Options for the composed processor
 * @returns Composed InputProcessor
 */
export function composeInputProcessors(
  processors: InputProcessor[],
  options: {
    id: string;
    name: string;
    description?: string;
    priority?: number;
  },
): InputProcessor {
  return createInputProcessor({
    ...options,
    async process(data) {
      let currentData = data;

      for (const processor of processors) {
        const result = await processor.process(currentData);

        if (result.action !== "continue") {
          return result;
        }

        if (result.data) {
          currentData = result.data;
        }
      }

      return { action: "continue", data: currentData };
    },
  });
}

/**
 * Compose multiple output processors into one
 * Processors are executed in order; if any processor aborts or retries, the chain handles accordingly
 * @param processors - Array of processors to compose
 * @param options - Options for the composed processor
 * @returns Composed OutputProcessor
 */
export function composeOutputProcessors(
  processors: OutputProcessor[],
  options: {
    id: string;
    name: string;
    description?: string;
    priority?: number;
  },
): OutputProcessor {
  return createOutputProcessor({
    ...options,
    async process(data) {
      let currentData = data;

      for (const processor of processors) {
        const result = await processor.process(currentData);

        if (result.action !== "continue") {
          return result;
        }

        if (result.data) {
          currentData = result.data;
        }
      }

      return { action: "continue", data: currentData };
    },
  });
}

/**
 * Create a conditional input processor that only runs when condition is met
 * @param processor - Base processor
 * @param condition - Condition function
 * @returns Wrapped processor that respects the condition
 */
export function conditionalInputProcessor<TConfig = JsonObject>(
  processor: InputProcessor<TConfig>,
  condition: (data: InputProcessorData) => boolean,
): InputProcessor<TConfig> {
  return createInputProcessor<TConfig>({
    id: processor.id,
    name: processor.name,
    description: processor.description,
    priority: processor.priority,
    validateConfig: processor.validateConfig,
    async process(data, config) {
      if (!condition(data)) {
        return { action: "continue", data };
      }
      return processor.process(data, config);
    },
  });
}

/**
 * Create a conditional output processor that only runs when condition is met
 * @param processor - Base processor
 * @param condition - Condition function
 * @returns Wrapped processor that respects the condition
 */
export function conditionalOutputProcessor<TConfig = JsonObject>(
  processor: OutputProcessor<TConfig>,
  condition: (data: OutputProcessorData) => boolean,
): OutputProcessor<TConfig> {
  return createOutputProcessor<TConfig>({
    id: processor.id,
    name: processor.name,
    description: processor.description,
    priority: processor.priority,
    validateConfig: processor.validateConfig,
    async process(data, config) {
      if (!condition(data)) {
        return { action: "continue", data };
      }
      return processor.process(data, config);
    },
  });
}

/**
 * Create an input processor with retry capability
 * @param processor - Base processor
 * @param maxRetries - Maximum number of retries
 * @param retryDelay - Delay between retries in ms
 * @returns Wrapped processor with retry capability
 */
export function withInputRetry<TConfig = JsonObject>(
  processor: InputProcessor<TConfig>,
  maxRetries: number = 3,
  retryDelay: number = 100,
): InputProcessor<TConfig> {
  return createInputProcessor<TConfig>({
    id: processor.id,
    name: processor.name,
    description: processor.description,
    priority: processor.priority,
    validateConfig: processor.validateConfig,
    async process(data, config) {
      let lastResult: ProcessorResult<InputProcessorData> | undefined;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await processor.process(data, config);

          if (result.action === "continue") {
            return result;
          }

          lastResult = result;

          // If processor explicitly aborts, don't retry
          if (result.action === "abort") {
            return result;
          }

          // Wait before retry
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        } catch (error) {
          if (attempt === maxRetries) {
            return {
              action: "abort",
              feedback: `Processor ${processor.id} failed after ${maxRetries} retries: ${error instanceof Error ? error.message : String(error)}`,
              issues: [
                {
                  category: "processor_error",
                  severity: "error",
                  message: `Retry exhausted: ${error instanceof Error ? error.message : String(error)}`,
                },
              ],
            };
          }
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }

      return lastResult || { action: "abort", feedback: "Processor failed" };
    },
  });
}

/**
 * Create an output processor with timeout
 * @param processor - Base processor
 * @param timeoutMs - Timeout in milliseconds
 * @returns Wrapped processor with timeout
 */
export function withOutputTimeout<TConfig = JsonObject>(
  processor: OutputProcessor<TConfig>,
  timeoutMs: number,
): OutputProcessor<TConfig> {
  return createOutputProcessor<TConfig>({
    id: processor.id,
    name: processor.name,
    description: processor.description,
    priority: processor.priority,
    validateConfig: processor.validateConfig,
    async process(data, config) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<ProcessorResult<OutputProcessorData>>(
        (_, reject) => {
          timeoutId = setTimeout(() => {
            reject(
              new Error(
                `Processor ${processor.id} timed out after ${timeoutMs}ms`,
              ),
            );
          }, timeoutMs);
        },
      );

      try {
        return await Promise.race([
          processor.process(data, config),
          timeoutPromise,
        ]);
      } catch (error) {
        return {
          action: "abort",
          feedback:
            error instanceof Error
              ? error.message
              : `Processor ${processor.id} timed out`,
          issues: [
            {
              category: "timeout",
              severity: "error",
              message: `Processor timed out after ${timeoutMs}ms`,
            },
          ],
        };
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }
    },
  });
}
