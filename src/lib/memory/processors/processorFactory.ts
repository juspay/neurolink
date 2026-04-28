/**
 * Memory Processor Factory
 *
 * Factory for creating and chaining memory processors.
 *
 * @module memory/processors/processorFactory
 * @since 9.0.0
 */

import type {
  ChatMessage,
  MemoryProcessor,
  MemoryProcessorConfig,
  ProcessorContext,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { RoleFilterProcessor } from "./roleFilterProcessor.js";
import { TokenLimitProcessor } from "./tokenLimitProcessor.js";

/**
 * Create a processor from configuration
 */
export function createProcessor(
  config: MemoryProcessorConfig,
): MemoryProcessor {
  switch (config.type) {
    case "tokenLimit":
      return new TokenLimitProcessor();

    case "roleFilter":
      return new RoleFilterProcessor();

    case "timeWindow":
      return new TimeWindowProcessor();

    case "custom":
      if (!config.options.processor) {
        throw new Error("Custom processor requires a processor function");
      }
      return new CustomProcessor(config.options.processor);

    default:
      throw new Error(`Unknown processor type: ${config.type}`);
  }
}

/**
 * Create a processor chain from configurations
 */
export function createProcessorChain(
  configs: MemoryProcessorConfig[],
): MemoryProcessor[] {
  return configs.map(createProcessor);
}

/**
 * Apply a chain of processors to messages
 */
export function applyProcessors(
  messages: ChatMessage[],
  processors: MemoryProcessor[],
  context: Omit<ProcessorContext, "config">,
  configs: MemoryProcessorConfig[],
): ChatMessage[] {
  let result = messages;

  for (let i = 0; i < processors.length; i++) {
    const processor = processors[i];
    const config = configs[i];

    const fullContext: ProcessorContext = {
      ...context,
      config: config.options,
    };

    result = processor.process(result, fullContext);

    logger.debug(`[ProcessorFactory] Applied processor: ${processor.name}`, {
      inputCount: messages.length,
      outputCount: result.length,
    });
  }

  return result;
}

/**
 * Time Window Processor
 *
 * Filters messages to only include those within a time window.
 */
class TimeWindowProcessor implements MemoryProcessor {
  readonly name = "timeWindow";

  process(messages: ChatMessage[], context: ProcessorContext): ChatMessage[] {
    const timeWindowMs = context.config.timeWindowMs;

    if (!timeWindowMs || timeWindowMs <= 0) {
      return messages;
    }

    const cutoffTime = Date.now() - timeWindowMs;
    const originalCount = messages.length;

    const filtered = messages.filter((msg) => {
      if (!msg.timestamp) {
        // Keep messages without timestamps
        return true;
      }

      const msgTime = new Date(msg.timestamp).getTime();
      return msgTime >= cutoffTime;
    });

    logger.debug("[TimeWindowProcessor] Filtered messages by time window", {
      originalCount,
      filteredCount: filtered.length,
      timeWindowMs,
      cutoffTime: new Date(cutoffTime).toISOString(),
    });

    return filtered;
  }
}

/**
 * Custom Processor
 *
 * Wraps a custom processor function.
 */
class CustomProcessor implements MemoryProcessor {
  readonly name = "custom";
  private processorFn: (messages: ChatMessage[]) => ChatMessage[];

  constructor(processorFn: (messages: ChatMessage[]) => ChatMessage[]) {
    this.processorFn = processorFn;
  }

  process(messages: ChatMessage[], _context: ProcessorContext): ChatMessage[] {
    return this.processorFn(messages);
  }
}

/**
 * Export processor classes for direct use
 */
export {
  RoleFilterProcessor,
  TokenLimitProcessor,
  TimeWindowProcessor,
  CustomProcessor,
};
