/**
 * TripwireEvaluator - Standalone health-check utility
 *
 * Evaluates blocking conditions against LLM response data to detect
 * runtime issues such as empty responses, high latency, max tokens hit,
 * and repetition loops.
 *
 * This module has no dependency on the processor pipeline system and can
 * be used independently.
 *
 * @module utils/tripwireEvaluator
 */

import type {
  TripwireData,
  TripwireConfig,
  TripwireResult,
} from "../types/index.js";

// ============================================================================
// TripwireEvaluator
// ============================================================================

/**
 * Manages and evaluates tripwire conditions against LLM response data.
 *
 * @example
 * ```typescript
 * const evaluator = createDefaultTripwireEvaluator();
 *
 * const result = evaluator.evaluate({
 *   responseText: "",
 *   latencyMs: 45000,
 *   finishReason: "length",
 * });
 *
 * if (result.triggered && result.action === "abort") {
 *   throw new Error(result.message);
 * }
 * ```
 */
export class TripwireEvaluator {
  private tripwires: TripwireConfig[] = [];

  /**
   * Register a tripwire. Replaces any existing tripwire with the same id.
   */
  register(tripwire: TripwireConfig): void {
    const existingIndex = this.tripwires.findIndex((t) => t.id === tripwire.id);
    if (existingIndex !== -1) {
      this.tripwires[existingIndex] = tripwire;
    } else {
      this.tripwires.push(tripwire);
    }
  }

  /**
   * Remove a registered tripwire by id.
   * @returns true if the tripwire was found and removed, false otherwise.
   */
  unregister(id: string): boolean {
    const index = this.tripwires.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.tripwires.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Evaluate all tripwires and return the highest-priority triggered result.
   *
   * Priority order: "abort" > "warn" > "log"
   *
   * Bug fix (C1): The original implementation returned on the FIRST triggered
   * tripwire regardless of action, which meant a "warn" registered before an
   * "abort" would mask the abort. This implementation evaluates ALL tripwires
   * and promotes the highest-severity action.
   */
  evaluate(data: TripwireData): TripwireResult {
    let firstAbort: TripwireResult | null = null;
    let firstWarn: TripwireResult | null = null;
    let firstLog: TripwireResult | null = null;

    for (const tripwire of this.tripwires) {
      let triggered: boolean;
      try {
        triggered = tripwire.condition(data);
      } catch {
        // Skip tripwires whose condition throws — don't let evaluation errors
        // block normal operation.
        continue;
      }

      if (!triggered) {
        continue;
      }

      const message =
        typeof tripwire.message === "function"
          ? tripwire.message(data)
          : tripwire.message;

      const result: TripwireResult = {
        triggered: true,
        tripwire,
        message,
        action: tripwire.action,
      };

      if (tripwire.action === "abort" && firstAbort === null) {
        firstAbort = result;
      } else if (tripwire.action === "warn" && firstWarn === null) {
        firstWarn = result;
      } else if (tripwire.action === "log" && firstLog === null) {
        firstLog = result;
      }
    }

    if (firstAbort !== null) {
      return firstAbort;
    }
    if (firstWarn !== null) {
      return firstWarn;
    }
    if (firstLog !== null) {
      return firstLog;
    }
    return { triggered: false };
  }

  /**
   * Evaluate all tripwires and return every triggered result.
   */
  evaluateAll(data: TripwireData): TripwireResult[] {
    const results: TripwireResult[] = [];

    for (const tripwire of this.tripwires) {
      let triggered: boolean;
      try {
        triggered = tripwire.condition(data);
      } catch {
        continue;
      }

      if (!triggered) {
        continue;
      }

      const message =
        typeof tripwire.message === "function"
          ? tripwire.message(data)
          : tripwire.message;

      results.push({
        triggered: true,
        tripwire,
        message,
        action: tripwire.action,
      });
    }

    return results;
  }

  /**
   * Return a shallow copy of all registered tripwires.
   */
  getTripwires(): TripwireConfig[] {
    return [...this.tripwires];
  }
}

// ============================================================================
// Built-in tripwires
// ============================================================================

/**
 * Triggers when the model hit its token output limit (finishReason === "length").
 */
const maxTokensTripwire: TripwireConfig = {
  id: "max-tokens",
  name: "Maximum Tokens Hit",
  description:
    "Triggers when the model stopped because it reached the token output limit.",
  action: "abort",
  condition: (data) => data.finishReason === "length",
  message: "Model stopped at token limit — response may be truncated.",
};

/**
 * Triggers when the response is empty or only whitespace.
 */
const emptyResponseTripwire: TripwireConfig = {
  id: "empty-response",
  name: "Empty Response",
  description:
    "Triggers when the model returns an empty or whitespace-only response.",
  action: "abort",
  condition: (data) =>
    data.responseText !== undefined && data.responseText.trim().length === 0,
  message: "Model returned an empty response.",
};

/**
 * Triggers when the response contains highly repetitive phrases.
 * Uses a sliding-window approach: splits into overlapping 10-word windows and
 * counts duplicates. If more than 20% of windows are repeated the response is
 * flagged as a repetition loop.
 */
const repetitionLoopTripwire: TripwireConfig = {
  id: "repetition-loop",
  name: "Repetition Loop",
  description:
    "Detects when the model is generating repetitive content, indicating a loop.",
  action: "warn",
  condition: (data) => {
    const text = data.responseText;
    if (!text) {
      return false;
    }

    const words = text.split(/\s+/);
    if (words.length < 30) {
      return false;
    }

    const windowSize = 10;
    const windows = new Map<string, number>();
    let duplicates = 0;
    const totalWindows = words.length - windowSize + 1;

    for (let i = 0; i <= words.length - windowSize; i++) {
      const window = words.slice(i, i + windowSize).join(" ");
      const count = (windows.get(window) ?? 0) + 1;
      windows.set(window, count);
      if (count > 1) {
        duplicates++;
      }
    }

    return duplicates / totalWindows > 0.2;
  },
  message:
    "Response contains highly repetitive content — possible generation loop.",
};

/**
 * Triggers when the input text exceeds 100 000 characters.
 */
const inputTooLongTripwire: TripwireConfig = {
  id: "input-too-long",
  name: "Input Too Long",
  description: "Triggers when the input text exceeds the recommended length.",
  action: "abort",
  condition: (data) =>
    data.inputText !== undefined && data.inputText.length > 100_000,
  message: (data) =>
    `Input is ${data.inputText?.length ?? 0} characters — exceeds the 100 000-character limit.`,
};

/**
 * Triggers when the conversation has more than 100 messages.
 */
const tooManyMessagesTripwire: TripwireConfig = {
  id: "too-many-messages",
  name: "Too Many Messages",
  description:
    "Triggers when the conversation message count exceeds the recommended maximum.",
  action: "warn",
  condition: (data) =>
    data.messageCount !== undefined && data.messageCount > 100,
  message: (data) =>
    `Conversation has ${data.messageCount} messages — consider summarising context.`,
};

/**
 * Triggers when the response text exceeds 50 000 characters.
 */
const responseTooLongTripwire: TripwireConfig = {
  id: "response-too-long",
  name: "Response Too Long",
  description:
    "Triggers when the response text exceeds the recommended length.",
  action: "warn",
  condition: (data) =>
    data.responseText !== undefined && data.responseText.length > 50_000,
  message: (data) =>
    `Response is ${data.responseText?.length ?? 0} characters — exceeds the 50 000-character limit.`,
};

/**
 * Triggers when the measured end-to-end latency exceeds 30 seconds.
 */
const highLatencyTripwire: TripwireConfig = {
  id: "high-latency",
  name: "High Latency",
  description:
    "Triggers when the measured response latency exceeds the acceptable threshold.",
  action: "warn",
  condition: (data) => data.latencyMs !== undefined && data.latencyMs > 30_000,
  message: (data) =>
    `Response latency was ${data.latencyMs}ms — exceeds the 30 000ms threshold.`,
};

/**
 * All built-in tripwires in default registration order.
 *
 * Registration order does not affect priority — `evaluate()` always promotes
 * the highest-severity action ("abort" > "warn" > "log").
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

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a TripwireEvaluator pre-loaded with all built-in tripwires.
 */
export function createDefaultTripwireEvaluator(): TripwireEvaluator {
  const evaluator = new TripwireEvaluator();
  for (const tripwire of commonTripwires) {
    evaluator.register(tripwire);
  }
  return evaluator;
}
