/**
 * WorkflowEventStream - Async event streaming for workflows
 *
 * Provides AsyncGenerator-based event streaming with filtering,
 * subscription APIs, and convenience methods.
 *
 * @module workflow/workflowEventStream
 */

import type { EventEmitter } from "events";
import type {
  WorkflowEvent,
  WorkflowEventType,
  WorkflowExecutionResult,
} from "../types/workflowTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Event filter predicate
 */
export type EventFilter = (event: WorkflowEvent) => boolean;

/**
 * Event subscription callback
 */
export type EventCallback = (event: WorkflowEvent) => void | Promise<void>;

/**
 * Subscription handle for cleanup
 */
export type Subscription = {
  unsubscribe: () => void;
};

/**
 * WorkflowEventStream - Stream and filter workflow events
 *
 * @example
 * ```typescript
 * const stream = new WorkflowEventStream(executor);
 *
 * // Iterate over all events
 * for await (const event of stream.events()) {
 *   console.log(event.type, event);
 * }
 *
 * // Filter by event type
 * for await (const event of stream.filterByType('step:complete')) {
 *   console.log('Step completed:', event.stepId);
 * }
 *
 * // Subscribe to events
 * const sub = stream.subscribe((event) => {
 *   console.log(event);
 * });
 * // Later...
 * sub.unsubscribe();
 *
 * // Wait for completion
 * const result = await stream.waitForCompletion();
 * ```
 */
export class WorkflowEventStream {
  private emitter: EventEmitter;
  private buffer: WorkflowEvent[] = [];
  private resolvers: Array<(event: WorkflowEvent | null) => void> = [];
  private completed = false;
  private completionResult?: WorkflowExecutionResult;
  private subscriptions: Set<EventCallback> = new Set();

  constructor(emitter: EventEmitter) {
    this.emitter = emitter;
    this.setupListeners();
  }

  /**
   * Set up event listeners
   */
  private setupListeners(): void {
    const handler = (event: WorkflowEvent) => {
      // Buffer event
      this.buffer.push(event);

      // Notify any waiting consumers
      if (this.resolvers.length > 0) {
        const resolver = this.resolvers.shift()!;
        const bufferedEvent = this.buffer.shift()!;
        resolver(bufferedEvent);
      }

      // Notify subscribers
      for (const callback of Array.from(this.subscriptions)) {
        try {
          const result = callback(event);
          if (result instanceof Promise) {
            result.catch((err) => {
              logger.error("Error in event subscription callback:", err);
            });
          }
        } catch (err) {
          logger.error("Error in event subscription callback:", err);
        }
      }

      // Check for completion events
      if (
        event.type === "workflow:complete" ||
        event.type === "workflow:failed" ||
        event.type === "workflow:cancelled" ||
        event.type === "workflow:suspended"
      ) {
        this.completed = true;
        // Signal completion to waiting iterators
        for (const resolver of this.resolvers) {
          resolver(null);
        }
        this.resolvers = [];
      }
    };

    this.emitter.on("event", handler);
  }

  /**
   * Async generator for all events
   */
  async *events(): AsyncGenerator<WorkflowEvent, void, undefined> {
    while (!this.completed || this.buffer.length > 0) {
      if (this.buffer.length > 0) {
        yield this.buffer.shift()!;
      } else if (!this.completed) {
        // Wait for next event
        const event = await new Promise<WorkflowEvent | null>((resolve) => {
          this.resolvers.push(resolve);
        });

        if (event === null) {
          // Completion signal
          break;
        }

        yield event;
      }
    }

    // Yield any remaining buffered events
    while (this.buffer.length > 0) {
      yield this.buffer.shift()!;
    }
  }

  /**
   * Filter events by type
   */
  async *filterByType(
    ...types: WorkflowEventType[]
  ): AsyncGenerator<WorkflowEvent, void, undefined> {
    for await (const event of this.events()) {
      if (types.includes(event.type)) {
        yield event;
      }
    }
  }

  /**
   * Filter events by predicate
   */
  async *filter(
    predicate: EventFilter,
  ): AsyncGenerator<WorkflowEvent, void, undefined> {
    for await (const event of this.events()) {
      if (predicate(event)) {
        yield event;
      }
    }
  }

  /**
   * Filter step events by step ID
   */
  async *filterByStepId(
    stepId: string,
  ): AsyncGenerator<WorkflowEvent, void, undefined> {
    for await (const event of this.events()) {
      if ("stepId" in event && event.stepId === stepId) {
        yield event;
      }
    }
  }

  /**
   * Get only step events
   */
  async *stepEvents(): AsyncGenerator<WorkflowEvent, void, undefined> {
    yield* this.filterByType(
      "step:start",
      "step:complete",
      "step:failed",
      "step:skipped",
      "step:retry",
      "step:suspended",
    );
  }

  /**
   * Get only workflow lifecycle events
   */
  async *workflowEvents(): AsyncGenerator<WorkflowEvent, void, undefined> {
    yield* this.filterByType(
      "workflow:start",
      "workflow:complete",
      "workflow:failed",
      "workflow:suspended",
      "workflow:resumed",
      "workflow:cancelled",
    );
  }

  /**
   * Subscribe to events with callback
   */
  subscribe(callback: EventCallback): Subscription {
    this.subscriptions.add(callback);

    return {
      unsubscribe: () => {
        this.subscriptions.delete(callback);
      },
    };
  }

  /**
   * Subscribe to specific event types
   */
  subscribeToTypes(
    types: WorkflowEventType[],
    callback: EventCallback,
  ): Subscription {
    const filteredCallback: EventCallback = (event) => {
      if (types.includes(event.type)) {
        return callback(event);
      }
    };

    return this.subscribe(filteredCallback);
  }

  /**
   * Wait for workflow completion
   */
  async waitForCompletion<TOutput = unknown>(): Promise<
    WorkflowExecutionResult<TOutput>
  > {
    if (this.completed && this.completionResult) {
      return this.completionResult as WorkflowExecutionResult<TOutput>;
    }

    return new Promise<WorkflowExecutionResult<TOutput>>((resolve) => {
      const subscription = this.subscribe((event) => {
        if (
          event.type === "workflow:complete" ||
          event.type === "workflow:failed" ||
          event.type === "workflow:cancelled" ||
          event.type === "workflow:suspended"
        ) {
          subscription.unsubscribe();

          // Create result based on event type
          const result: WorkflowExecutionResult<TOutput> = {
            success: event.type === "workflow:complete",
            status:
              event.type === "workflow:complete"
                ? "completed"
                : event.type === "workflow:suspended"
                  ? "suspended"
                  : event.type === "workflow:cancelled"
                    ? "cancelled"
                    : "failed",
            output:
              event.type === "workflow:complete"
                ? (event.output as TOutput)
                : undefined,
            error:
              event.type === "workflow:failed" ? event.data.error : undefined,
            stats:
              event.type === "workflow:complete"
                ? event.stats
                : {
                    totalSteps: 0,
                    completedSteps: 0,
                    failedSteps: 0,
                    skippedSteps: 0,
                    startTime: event.timestamp,
                    retryCount: 0,
                  },
            stepResults: new Map(),
          };

          this.completionResult = result;
          resolve(result);
        }
      });
    });
  }

  /**
   * Wait for a specific step to complete
   */
  async waitForStep<TOutput = unknown>(
    stepId: string,
  ): Promise<TOutput | undefined> {
    return new Promise<TOutput | undefined>((resolve, reject) => {
      const subscription = this.subscribe((event) => {
        if ("stepId" in event && event.stepId === stepId) {
          if (event.type === "step:complete") {
            subscription.unsubscribe();
            resolve(event.output as TOutput);
          } else if (event.type === "step:failed") {
            subscription.unsubscribe();
            reject(new Error(`Step ${stepId} failed: ${event.error.message}`));
          }
        }

        // Also handle workflow-level completion
        if (
          event.type === "workflow:failed" ||
          event.type === "workflow:cancelled"
        ) {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });
  }

  /**
   * Collect all events into an array
   */
  async collect(): Promise<WorkflowEvent[]> {
    const events: WorkflowEvent[] = [];
    for await (const event of this.events()) {
      events.push(event);
    }
    return events;
  }

  /**
   * Collect events until a condition is met
   */
  async collectUntil(predicate: EventFilter): Promise<WorkflowEvent[]> {
    const events: WorkflowEvent[] = [];
    for await (const event of this.events()) {
      events.push(event);
      if (predicate(event)) {
        break;
      }
    }
    return events;
  }

  /**
   * Check if stream is completed
   */
  isCompleted(): boolean {
    return this.completed;
  }

  /**
   * Get buffered event count
   */
  bufferedCount(): number {
    return this.buffer.length;
  }

  /**
   * Clear all subscriptions
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
  }
}

/**
 * Create an event stream from a workflow executor
 */
export function createEventStream(emitter: EventEmitter): WorkflowEventStream {
  return new WorkflowEventStream(emitter);
}
