/**
 * TriggerAdapter Interface
 *
 * A TriggerAdapter controls WHEN the heartbeat loop executes iterations.
 * The loop itself controls WHAT happens in each iteration.
 */

export interface TriggerAdapter {
  /** Unique identifier for this trigger type */
  readonly type: string;

  /**
   * Start the trigger. Calls `onTick()` whenever an iteration should execute.
   * The adapter owns the scheduling — the loop owns the execution.
   */
  start(onTick: () => Promise<void>): Promise<void>;

  /** Stop the trigger. No more ticks after this resolves. */
  stop(): Promise<void>;

  /** Whether the trigger is currently active */
  isActive(): boolean;

  /** Pause ticking without destroying state (e.g., backpressure) */
  pause?(): void;

  /** Resume after pause */
  resume?(): void;
}
