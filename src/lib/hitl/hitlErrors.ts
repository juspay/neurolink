/**
 * HITL (Human-in-the-Loop) Error Classes
 *
 * Provides structured error handling for HITL safety mechanisms.
 * These errors allow applications to distinguish between different
 * types of HITL failures and handle them appropriately.
 */

/**
 * Base class for all HITL-related errors
 */
export class HITLError extends Error {
  constructor(
    message: string,
    public readonly confirmationId?: string,
  ) {
    super(message);
    this.name = "HITLError";
  }
}

/**
 * Thrown when a user explicitly rejects a tool execution request
 * This indicates the HITL system worked correctly - the user saw the request
 * and made a conscious decision to deny it.
 */
export class HITLUserRejectedError extends HITLError {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly reason?: string,
    confirmationId?: string,
  ) {
    super(message, confirmationId);
    this.name = "HITLUserRejectedError";
  }
}

/**
 * Thrown when a confirmation request times out without user response
 * This indicates the user didn't respond within the configured timeout period.
 */
export class HITLTimeoutError extends HITLError {
  constructor(
    message: string,
    confirmationId: string,
    public readonly timeout: number,
  ) {
    super(message, confirmationId);
    this.name = "HITLTimeoutError";
  }
}

/**
 * Thrown when HITL configuration is invalid or missing required properties
 */
export class HITLConfigurationError extends HITLError {
  constructor(message: string) {
    super(message);
    this.name = "HITLConfigurationError";
  }
}
