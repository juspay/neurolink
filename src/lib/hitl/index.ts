/**
 * HITL (Human-in-the-Loop) Module
 *
 * Simple barrel export for HITL components.
 */

// Core HITL Manager
export { HITLManager } from "./hitlManager.js";

// Type Definitions
export type {
  HITLConfig,
  HITLRule,
  ConfirmationRequest,
  ConfirmationResult,
  ConfirmationRequestEvent,
  ConfirmationResponseEvent,
  ConfirmationTimeoutEvent,
  HITLStatistics,
  HITLAuditLog,
} from "./types.js";

// Error Classes
export {
  HITLError,
  HITLUserRejectedError,
  HITLTimeoutError,
  HITLConfigurationError,
} from "./hitlErrors.js";
