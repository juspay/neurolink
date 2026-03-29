/**
 * TaskError — Typed error factory for the TaskManager system.
 *
 * Uses the standard NeuroLink createErrorFactory pattern so every task-related
 * error carries a structured code, feature tag, and optional retryable flag.
 */

import { createErrorFactory } from "../core/infrastructure/baseError.js";

export const TaskErrorCodes = {
  TASK_NOT_FOUND: "TASK-001",
  BACKEND_NOT_INITIALIZED: "TASK-002",
  BACKEND_UNKNOWN: "TASK-003",
  INVALID_TASK_STATUS: "TASK-004",
  TASK_LIMIT_REACHED: "TASK-005",
  TASK_DISABLED: "TASK-006",
  SCHEDULE_FAILED: "TASK-007",
} as const;

export const TaskError = createErrorFactory("Task", TaskErrorCodes);
