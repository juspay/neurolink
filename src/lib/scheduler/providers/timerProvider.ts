/**
 * Timer Provider for Task Scheduler
 *
 * Fallback scheduling using Node.js timers when Redis is unavailable.
 */

import { Cron } from "croner";
import { logger } from "../../utils/logger.js";
import type { ScheduledTask } from "../types.js";

export interface FallbackTimer {
  stop(): void;
}

export type TimerCallback = (taskId: string) => Promise<void>;

/**
 * Schedule a task using Node.js timers
 */
export function scheduleTimer(
  task: ScheduledTask,
  callback: TimerCallback,
  timers: Map<string, FallbackTimer>,
): void {
  // Cancel any existing timer for this task
  timers.get(task.id)?.stop();

  switch (task.schedule.type) {
    case "at": {
      const target = new Date(task.schedule.value).getTime();
      const delay = target - Date.now();
      if (delay <= 0) {
        void callback(task.id);
        return;
      }
      const timer = setTimeout(
        () => {
          timers.delete(task.id);
          void callback(task.id);
        },
        Math.min(delay, 2147483647),
      ); // Max 24.8 days
      timers.set(task.id, { stop: () => clearTimeout(timer) });
      break;
    }

    case "every": {
      const ms = parseInterval(String(task.schedule.value));
      let stopped = false;
      let timeoutId: NodeJS.Timeout;

      const scheduleNext = () => {
        if (stopped) {
          return;
        }
        timeoutId = setTimeout(async () => {
          if (stopped) {
            return;
          }
          await callback(task.id);
          scheduleNext();
        }, ms);
      };

      scheduleNext();
      timers.set(task.id, {
        stop: () => {
          stopped = true;
          clearTimeout(timeoutId);
        },
      });
      break;
    }

    case "cron": {
      const cron = new Cron(
        String(task.schedule.value),
        { timezone: task.schedule.timezone, protect: true },
        () => void callback(task.id),
      );
      timers.set(task.id, { stop: () => cron.stop() });
      break;
    }
  }

  logger.debug(
    `[Timer] Scheduled task ${task.id} using ${task.schedule.type} timer`,
  );
}

/**
 * Stop and remove a timer
 */
export function stopTimer(
  taskId: string,
  timers: Map<string, FallbackTimer>,
): void {
  timers.get(taskId)?.stop();
  timers.delete(taskId);
  logger.debug(`[Timer] Stopped timer for task ${taskId}`);
}

/**
 * Stop all timers
 */
export function stopAllTimers(timers: Map<string, FallbackTimer>): void {
  for (const timer of timers.values()) {
    timer.stop();
  }
  timers.clear();
  logger.debug("[Timer] Stopped all timers");
}

/**
 * Parse interval string to milliseconds
 * Supports: "30s", "5m", "1h", "1d", or raw number
 */
function parseInterval(value: string): number {
  const num = Number(value);
  if (!isNaN(num) && num > 0) {
    return num;
  }

  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)\s*(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid interval: ${value}`);
  }

  const n = parseFloat(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * multipliers[unit as keyof typeof multipliers];
}
