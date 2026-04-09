/**
 * Error definitions for the NeuroLink AutoResearch system.
 */

import { createErrorFactory } from "../core/infrastructure/baseError.js";

export const AutoresearchErrorCodes = {
  CONFIG_INVALID: "AUTORESEARCH-001",
  STATE_CORRUPT: "AUTORESEARCH-002",
  STATE_NOT_FOUND: "AUTORESEARCH-003",
  REPO_NOT_FOUND: "AUTORESEARCH-004",
  BRANCH_ERROR: "AUTORESEARCH-005",
  PATH_VIOLATION: "AUTORESEARCH-006",
  COMMIT_REJECTED: "AUTORESEARCH-007",
  EXPERIMENT_TIMEOUT: "AUTORESEARCH-008",
  EXPERIMENT_FAILED: "AUTORESEARCH-009",
  PARSE_FAILED: "AUTORESEARCH-010",
  RESULTS_WRITE_FAILED: "AUTORESEARCH-011",
  REVERT_FAILED: "AUTORESEARCH-012",
  WORKER_NOT_INITIALIZED: "AUTORESEARCH-013",
} as const;

export const AutoresearchError = createErrorFactory(
  "Autoresearch",
  AutoresearchErrorCodes,
);
