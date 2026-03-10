/**
 * TimerTrigger
 *
 * A TriggerAdapter that schedules iterations using Node.js timers.
 * Supports configurable intervals, initial delays, and back-to-back execution.
 */

import type { TriggerAdapter } from "./triggerAdapter.js";

export interface TimerTriggerConfig {
  /** Interval between iterations in ms. 0 = run as fast as possible (back-to-back). */
  intervalMs?: number;
  /** Initial delay before first tick */
  initialDelayMs?: number;
  /**
   * Human-readable interval (e.g., "5s", "1m", "2h").
   * Takes precedence over intervalMs if provided.
   */
  interval?: string;
  /**
   * Human-readable initial delay (e.g., "5s", "1m", "2h").
   * Takes precedence over initialDelayMs if provided.
   */
  initialDelay?: string;
}

/**
 * Parse timeout string to milliseconds.
 * @param timeout - Timeout string like "30s", "2m", "1h" or number
 * @returns Timeout in milliseconds
 */
function parseTimeoutString(timeout: string | number): number {
  if (typeof timeout === "number") {
    return timeout;
  }

  const match = timeout.match(/^(\d+(?:\.\d+)?)(s|m|h)?$/);
  if (!match) {
    throw new Error(`Invalid timeout format: ${timeout}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || "s";

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      return value;
  }
}

/**
 * Timer-based trigger adapter.
 *
 * This trigger executes iterations at a configurable interval.
 * - intervalMs: 0 means back-to-back execution (uses setImmediate)
 * - intervalMs: >0 means wait that long between iterations
 */
export class TimerTrigger implements TriggerAdapter {
  readonly type = "timer";
  private timer?: NodeJS.Timeout;
  private active = false;
  private paused = false;
  private storedOnTick?: () => Promise<void>;
  private intervalMs: number;
  private resolveStart?: () => void;

  constructor(private config: TimerTriggerConfig = {}) {
    // Resolve interval (human-readable or numeric)
    if (config.interval !== undefined) {
      this.intervalMs = parseTimeoutString(config.interval);
    } else {
      this.intervalMs = config.intervalMs ?? 0;
    }
  }

  async start(onTick: () => Promise<void>): Promise<void> {
    this.active = true;
    this.storedOnTick = onTick;

    // Create a promise that stays pending until stop() is called
    const startPromise = new Promise<void>((resolve) => {
      this.resolveStart = resolve;
    });

    // Resolve initial delay (human-readable or numeric)
    let initialDelayMs = 0;
    if (this.config.initialDelay !== undefined) {
      initialDelayMs = parseTimeoutString(this.config.initialDelay);
    } else if (this.config.initialDelayMs !== undefined) {
      initialDelayMs = this.config.initialDelayMs;
    }

    if (initialDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, initialDelayMs));
    }

    const tick = async (): Promise<void> => {
      if (!this.active || this.paused) {
        return;
      }

      await onTick();

      if (!this.active || this.paused) {
        return;
      }

      if (this.intervalMs > 0) {
        this.timer = setTimeout(tick, this.intervalMs);
      } else {
        // Back-to-back: use setImmediate to avoid starving the event loop
        setImmediate(() => {
          tick();
        });
      }
    };

    // Start the tick loop (don't await - it runs forever until stopped)
    tick();

    // Keep the start promise pending until stop() resolves it
    await startPromise;
  }

  async stop(): Promise<void> {
    this.active = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    // Resolve the start promise to allow start() to complete
    if (this.resolveStart) {
      this.resolveStart();
      this.resolveStart = undefined;
    }
  }

  isActive(): boolean {
    return this.active && !this.paused;
  }

  pause(): void {
    this.paused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  resume(): void {
    if (!this.paused || !this.active) {
      return;
    }
    this.paused = false;

    // Resume by re-calling start with stored callback
    if (this.storedOnTick) {
      // Don't wait for the promise - let it run
      this.start(this.storedOnTick).catch(() => {
        // Errors are handled by the heartbeat loop
      });
    }
  }

  /**
   * Get the current interval in milliseconds.
   */
  getIntervalMs(): number {
    return this.intervalMs;
  }

  /**
   * Check if the trigger is currently paused.
   */
  isPaused(): boolean {
    return this.paused;
  }
}
