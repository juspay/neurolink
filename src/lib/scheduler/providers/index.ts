/**
 * Scheduler Providers
 *
 * Provider implementations for task scheduling backends.
 */

// BullMQ provider (Redis-based)
export {
  initBullMQ,
  scheduleBullMQ,
  removeFromBullMQ,
  persistTaskConfig,
  loadTaskConfig,
  deleteTaskConfig,
  persistTaskRuns,
  loadTaskRuns,
  deleteTaskRuns,
  clearAllTaskData,
  type BullMQProvider,
  type JobHandler,
} from "./bullmqProvider.js";

// Timer provider (Node.js fallback)
export {
  scheduleTimer,
  stopTimer,
  stopAllTimers,
  type FallbackTimer,
  type TimerCallback,
} from "./timerProvider.js";
