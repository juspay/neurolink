/**
 * Simple Task Scheduler
 *
 * Single-file scheduler with BullMQ (Redis) support and Node.js fallback.
 */

// Core scheduler class
export {
  TaskScheduler,
  DEFAULT_SCHEDULER_SYSTEM_PROMPT,
  getSchedulerRedisUrl,
  createExecutorDefaults,
  createAndConfigureScheduler,
  type TaskExecutorDefaults,
  type GenerateFunction,
} from "./taskScheduler.js";

// Tool factory for AI integration
export { createSchedulerTools } from "./schedulerTools.js";

// Type definitions
export type {
  Schedule,
  ScheduleType,
  ScheduledTask,
  TaskRun,
  CreateTaskOptions,
  TaskStatus,
  SessionMode,
  TaskExecutor,
  TaskExecutorCallback,
  TaskSchedulerConfig,
} from "./types.js";
