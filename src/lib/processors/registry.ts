/**
 * ProcessorRegistry - Central registry for processors
 *
 * Provides registration, lookup, and management of input and output processors.
 *
 * @module registry
 */

import type {
  InputProcessor,
  OutputProcessor,
  ProcessorConfig,
  ProcessorPreset,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * Entry in the processor registry
 */
type ProcessorEntry<T> = {
  processor: T;
  defaultConfig?: ProcessorConfig;
};

/**
 * ProcessorRegistry manages registration and lookup of processors
 *
 * @example
 * ```typescript
 * const registry = new ProcessorRegistry();
 *
 * // Register processors
 * registry.registerInputProcessor(piiDetectionProcessor);
 * registry.registerOutputProcessor(toxicityCheckProcessor);
 *
 * // Get processors by ID
 * const pii = registry.getInputProcessor("pii-detection");
 *
 * // Get all processors for a preset
 * const securityPreset = registry.getPreset("security");
 * ```
 */
export class ProcessorRegistry {
  private inputProcessors = new Map<string, ProcessorEntry<InputProcessor>>();
  private outputProcessors = new Map<string, ProcessorEntry<OutputProcessor>>();
  private presets = new Map<string, ProcessorPreset>();

  /**
   * Register an input processor
   * @param processor - Processor to register
   * @param options - Registration options
   */
  registerInputProcessor(
    processor: InputProcessor,
    options?: { defaultConfig?: ProcessorConfig; replace?: boolean },
  ): void {
    if (this.inputProcessors.has(processor.id) && !options?.replace) {
      throw new Error(
        `Input processor '${processor.id}' already registered. Use replace: true to override.`,
      );
    }

    this.inputProcessors.set(processor.id, {
      processor,
      defaultConfig: options?.defaultConfig,
    });

    logger.debug(
      `[ProcessorRegistry] Registered input processor: ${processor.id}`,
    );
  }

  /**
   * Register an output processor
   * @param processor - Processor to register
   * @param options - Registration options
   */
  registerOutputProcessor(
    processor: OutputProcessor,
    options?: { defaultConfig?: ProcessorConfig; replace?: boolean },
  ): void {
    if (this.outputProcessors.has(processor.id) && !options?.replace) {
      throw new Error(
        `Output processor '${processor.id}' already registered. Use replace: true to override.`,
      );
    }

    this.outputProcessors.set(processor.id, {
      processor,
      defaultConfig: options?.defaultConfig,
    });

    logger.debug(
      `[ProcessorRegistry] Registered output processor: ${processor.id}`,
    );
  }

  /**
   * Get an input processor by ID
   * @param id - Processor ID
   * @returns The processor or undefined if not found
   */
  getInputProcessor(id: string): InputProcessor | undefined {
    return this.inputProcessors.get(id)?.processor;
  }

  /**
   * Get an output processor by ID
   * @param id - Processor ID
   * @returns The processor or undefined if not found
   */
  getOutputProcessor(id: string): OutputProcessor | undefined {
    return this.outputProcessors.get(id)?.processor;
  }

  /**
   * Get input processor with its default config
   * @param id - Processor ID
   * @returns Entry with processor and config, or undefined
   */
  getInputProcessorEntry(
    id: string,
  ): ProcessorEntry<InputProcessor> | undefined {
    return this.inputProcessors.get(id);
  }

  /**
   * Get output processor with its default config
   * @param id - Processor ID
   * @returns Entry with processor and config, or undefined
   */
  getOutputProcessorEntry(
    id: string,
  ): ProcessorEntry<OutputProcessor> | undefined {
    return this.outputProcessors.get(id);
  }

  /**
   * Unregister an input processor
   * @param id - Processor ID to remove
   * @returns True if processor was removed
   */
  unregisterInputProcessor(id: string): boolean {
    const removed = this.inputProcessors.delete(id);
    if (removed) {
      logger.debug(`[ProcessorRegistry] Unregistered input processor: ${id}`);
    }
    return removed;
  }

  /**
   * Unregister an output processor
   * @param id - Processor ID to remove
   * @returns True if processor was removed
   */
  unregisterOutputProcessor(id: string): boolean {
    const removed = this.outputProcessors.delete(id);
    if (removed) {
      logger.debug(`[ProcessorRegistry] Unregistered output processor: ${id}`);
    }
    return removed;
  }

  /**
   * Check if an input processor is registered
   * @param id - Processor ID
   * @returns True if registered
   */
  hasInputProcessor(id: string): boolean {
    return this.inputProcessors.has(id);
  }

  /**
   * Check if an output processor is registered
   * @param id - Processor ID
   * @returns True if registered
   */
  hasOutputProcessor(id: string): boolean {
    return this.outputProcessors.has(id);
  }

  /**
   * Register a preset configuration
   * @param preset - Preset to register
   */
  registerPreset(preset: ProcessorPreset): void {
    this.presets.set(preset.name, preset);
    logger.debug(`[ProcessorRegistry] Registered preset: ${preset.name}`);
  }

  /**
   * Get a preset by name
   * @param name - Preset name
   * @returns The preset or undefined
   */
  getPreset(name: string): ProcessorPreset | undefined {
    return this.presets.get(name);
  }

  /**
   * Get all registered presets
   * @returns Array of all presets
   */
  getAllPresets(): ProcessorPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * List all registered processors
   * @returns Object with input and output processor info
   */
  listProcessors(): {
    input: Array<{
      id: string;
      name: string;
      description?: string;
      priority?: number;
    }>;
    output: Array<{
      id: string;
      name: string;
      description?: string;
      priority?: number;
    }>;
  } {
    return {
      input: Array.from(this.inputProcessors.values()).map(({ processor }) => ({
        id: processor.id,
        name: processor.name,
        description: processor.description,
        priority: processor.priority,
      })),
      output: Array.from(this.outputProcessors.values()).map(
        ({ processor }) => ({
          id: processor.id,
          name: processor.name,
          description: processor.description,
          priority: processor.priority,
        }),
      ),
    };
  }

  /**
   * Get all input processors
   * @returns Array of all input processors
   */
  getAllInputProcessors(): InputProcessor[] {
    return Array.from(this.inputProcessors.values()).map((e) => e.processor);
  }

  /**
   * Get all output processors
   * @returns Array of all output processors
   */
  getAllOutputProcessors(): OutputProcessor[] {
    return Array.from(this.outputProcessors.values()).map((e) => e.processor);
  }

  /**
   * Build processors array from a preset
   * @param presetName - Name of the preset
   * @returns Processors configured according to the preset
   */
  buildFromPreset(presetName: string):
    | {
        inputProcessors: Array<{
          processor: InputProcessor;
          config?: ProcessorConfig;
        }>;
        outputProcessors: Array<{
          processor: OutputProcessor;
          config?: ProcessorConfig;
        }>;
      }
    | undefined {
    const preset = this.presets.get(presetName);
    if (!preset) {
      return undefined;
    }

    const inputProcessors: Array<{
      processor: InputProcessor;
      config?: ProcessorConfig;
    }> = [];
    const outputProcessors: Array<{
      processor: OutputProcessor;
      config?: ProcessorConfig;
    }> = [];

    for (const { id, config } of preset.inputProcessors) {
      const entry = this.inputProcessors.get(id);
      if (entry) {
        inputProcessors.push({
          processor: entry.processor,
          config: config || entry.defaultConfig,
        });
      } else {
        logger.warn(
          `[ProcessorRegistry] Input processor '${id}' referenced in preset '${presetName}' not found`,
        );
      }
    }

    for (const { id, config } of preset.outputProcessors) {
      const entry = this.outputProcessors.get(id);
      if (entry) {
        outputProcessors.push({
          processor: entry.processor,
          config: config || entry.defaultConfig,
        });
      } else {
        logger.warn(
          `[ProcessorRegistry] Output processor '${id}' referenced in preset '${presetName}' not found`,
        );
      }
    }

    return { inputProcessors, outputProcessors };
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.inputProcessors.clear();
    this.outputProcessors.clear();
    this.presets.clear();
    logger.debug("[ProcessorRegistry] Cleared all registrations");
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    inputProcessorCount: number;
    outputProcessorCount: number;
    presetCount: number;
  } {
    return {
      inputProcessorCount: this.inputProcessors.size,
      outputProcessorCount: this.outputProcessors.size,
      presetCount: this.presets.size,
    };
  }
}

/**
 * Global default registry instance
 * Use this for application-wide processor registration
 */
export const defaultRegistry = new ProcessorRegistry();
