/**
 * TripwireEvaluator - Blocking conditions for processor pipelines
 *
 * Tripwires are condition-based checks that can immediately abort or warn
 * when certain conditions are detected in the data.
 *
 * @module tripwire
 */

import type {
  InputProcessorData,
  OutputProcessorData,
  ProcessorSeverity,
  TripwireConfig,
  TripwireResult,
} from "../types/processorTypes.js";
import { logger } from "../utils/logger.js";

/**
 * TripwireEvaluator manages and evaluates tripwire conditions
 *
 * @example
 * ```typescript
 * const evaluator = new TripwireEvaluator();
 *
 * // Register custom tripwire
 * evaluator.register({
 *   id: "custom-limit",
 *   name: "Custom Limit",
 *   condition: (data) => data.responseText?.length > 10000,
 *   action: "abort",
 *   message: "Response too long",
 *   severity: "error",
 * });
 *
 * // Evaluate tripwires
 * const result = evaluator.evaluate(outputData);
 * if (result.triggered) {
 *   console.log("Tripwire triggered:", result.tripwire?.name);
 * }
 * ```
 */
export class TripwireEvaluator {
  private tripwires: TripwireConfig[] = [];

  /**
   * Create a new TripwireEvaluator
   * @param initialTripwires - Optional array of tripwires to register
   */
  constructor(initialTripwires?: TripwireConfig[]) {
    if (initialTripwires) {
      this.tripwires = [...initialTripwires];
    }
  }

  /**
   * Register a tripwire
   * @param tripwire - Tripwire configuration to register
   */
  register(tripwire: TripwireConfig): void {
    // Check for duplicate ID
    const existingIndex = this.tripwires.findIndex((t) => t.id === tripwire.id);
    if (existingIndex !== -1) {
      // Replace existing tripwire
      this.tripwires[existingIndex] = tripwire;
      logger.debug(`[TripwireEvaluator] Replaced tripwire: ${tripwire.id}`);
    } else {
      this.tripwires.push(tripwire);
      logger.debug(`[TripwireEvaluator] Registered tripwire: ${tripwire.id}`);
    }
  }

  /**
   * Register multiple tripwires at once
   * @param tripwires - Array of tripwire configurations
   */
  registerAll(tripwires: TripwireConfig[]): void {
    for (const tripwire of tripwires) {
      this.register(tripwire);
    }
  }

  /**
   * Unregister a tripwire by ID
   * @param id - Tripwire ID to remove
   * @returns True if tripwire was removed
   */
  unregister(id: string): boolean {
    const index = this.tripwires.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.tripwires.splice(index, 1);
      logger.debug(`[TripwireEvaluator] Unregistered tripwire: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Evaluate all tripwires against data
   * Returns on first triggered tripwire with "abort" action
   * @param data - Input or output processor data to evaluate
   * @returns Tripwire result indicating if triggered and action to take
   */
  evaluate(data: InputProcessorData | OutputProcessorData): TripwireResult {
    for (const tripwire of this.tripwires) {
      try {
        if (tripwire.condition(data)) {
          logger.debug(
            `[TripwireEvaluator] Tripwire triggered: ${tripwire.id}`,
          );

          // Determine action to return
          const action = tripwire.action === "abort" ? "abort" : "continue";

          return {
            triggered: true,
            tripwire,
            action,
            feedback: tripwire.message,
          };
        }
      } catch (error) {
        // Log but don't fail on tripwire evaluation error
        logger.warn(
          `[TripwireEvaluator] Tripwire ${tripwire.id} evaluation failed:`,
          error,
        );
      }
    }

    return { triggered: false };
  }

  /**
   * Evaluate all tripwires and return all triggered (not just first)
   * @param data - Data to evaluate
   * @returns Array of all triggered tripwires
   */
  evaluateAll(
    data: InputProcessorData | OutputProcessorData,
  ): TripwireResult[] {
    const results: TripwireResult[] = [];

    for (const tripwire of this.tripwires) {
      try {
        if (tripwire.condition(data)) {
          results.push({
            triggered: true,
            tripwire,
            action: tripwire.action === "abort" ? "abort" : "continue",
            feedback: tripwire.message,
          });
        }
      } catch (error) {
        logger.warn(
          `[TripwireEvaluator] Tripwire ${tripwire.id} evaluation failed:`,
          error,
        );
      }
    }

    return results;
  }

  /**
   * Get all registered tripwires
   * @returns Copy of tripwires array
   */
  list(): TripwireConfig[] {
    return [...this.tripwires];
  }

  /**
   * Get a tripwire by ID
   * @param id - Tripwire ID
   * @returns The tripwire or undefined
   */
  get(id: string): TripwireConfig | undefined {
    return this.tripwires.find((t) => t.id === id);
  }

  /**
   * Check if a tripwire is registered
   * @param id - Tripwire ID
   * @returns True if registered
   */
  has(id: string): boolean {
    return this.tripwires.some((t) => t.id === id);
  }

  /**
   * Clear all tripwires
   */
  clear(): void {
    this.tripwires = [];
    logger.debug("[TripwireEvaluator] Cleared all tripwires");
  }

  /**
   * Get count of registered tripwires
   */
  get count(): number {
    return this.tripwires.length;
  }
}

// ============================================================================
// Common Tripwires
// ============================================================================

/**
 * Maximum tokens tripwire - triggers when response exceeds token limit
 */
export const maxTokensTripwire: TripwireConfig = {
  id: "max-tokens",
  name: "Maximum Tokens Exceeded",
  condition: (data) => {
    if ("result" in data && data.result?.usage) {
      const usage = data.result.usage;
      // TokenUsage uses input/output/total fields
      const totalTokens =
        usage.total || (usage.input || 0) + (usage.output || 0);
      return totalTokens > 100000;
    }
    return false;
  },
  action: "abort",
  message: "Response exceeded maximum token limit (100,000)",
  severity: "critical" as ProcessorSeverity,
};

/**
 * Empty response tripwire - triggers when LLM returns empty content
 */
export const emptyResponseTripwire: TripwireConfig = {
  id: "empty-response",
  name: "Empty Response",
  condition: (data) => {
    if ("responseText" in data) {
      return !data.responseText || data.responseText.trim().length === 0;
    }
    return false;
  },
  action: "abort",
  message: "LLM returned an empty response",
  severity: "error" as ProcessorSeverity,
};

/**
 * Repetition loop tripwire - detects highly repetitive content
 */
export const repetitionLoopTripwire: TripwireConfig = {
  id: "repetition-loop",
  name: "Repetition Loop Detection",
  condition: (data) => {
    if ("responseText" in data && data.responseText) {
      const text = data.responseText;
      const words = text.split(/\s+/);
      if (words.length < 20) {
        return false;
      }
      const uniqueWords = new Set(words);
      // If less than 30% unique words, likely repetitive
      return uniqueWords.size < words.length * 0.3;
    }
    return false;
  },
  action: "warn",
  message: "Response appears to contain highly repetitive content",
  severity: "warning" as ProcessorSeverity,
};

/**
 * Input too long tripwire - triggers when input message is too long
 */
export const inputTooLongTripwire: TripwireConfig = {
  id: "input-too-long",
  name: "Input Too Long",
  condition: (data) => {
    if ("text" in data && data.text) {
      return data.text.length > 50000;
    }
    return false;
  },
  action: "abort",
  message: "Input text exceeds maximum length (50,000 characters)",
  severity: "error" as ProcessorSeverity,
};

/**
 * Too many messages tripwire - triggers when conversation has too many messages
 */
export const tooManyMessagesTripwire: TripwireConfig = {
  id: "too-many-messages",
  name: "Too Many Messages",
  condition: (data) => {
    if ("messages" in data && Array.isArray(data.messages)) {
      return data.messages.length > 100;
    }
    return false;
  },
  action: "warn",
  message: "Conversation has too many messages (>100), consider summarization",
  severity: "warning" as ProcessorSeverity,
};

/**
 * Response too long tripwire - triggers when response exceeds character limit
 */
export const responseTooLongTripwire: TripwireConfig = {
  id: "response-too-long",
  name: "Response Too Long",
  condition: (data) => {
    if ("responseText" in data && data.responseText) {
      return data.responseText.length > 100000;
    }
    return false;
  },
  action: "warn",
  message: "Response exceeds recommended length (100,000 characters)",
  severity: "warning" as ProcessorSeverity,
};

/**
 * High latency tripwire - triggers when processing takes too long
 */
export const highLatencyTripwire: TripwireConfig = {
  id: "high-latency",
  name: "High Latency Warning",
  condition: (data) => {
    // Check if we can determine response time from metadata
    if (data.metadata?.custom?.responseTime) {
      return (data.metadata.custom.responseTime as number) > 30000; // 30 seconds
    }
    return false;
  },
  action: "warn",
  message: "Response took longer than 30 seconds",
  severity: "warning" as ProcessorSeverity,
};

/**
 * Collection of all common tripwires
 */
export const commonTripwires: TripwireConfig[] = [
  maxTokensTripwire,
  emptyResponseTripwire,
  repetitionLoopTripwire,
  inputTooLongTripwire,
  tooManyMessagesTripwire,
  responseTooLongTripwire,
  highLatencyTripwire,
];

/**
 * Create a TripwireEvaluator with common tripwires pre-registered
 * @returns TripwireEvaluator with common tripwires
 */
export function createDefaultTripwireEvaluator(): TripwireEvaluator {
  return new TripwireEvaluator(commonTripwires);
}
