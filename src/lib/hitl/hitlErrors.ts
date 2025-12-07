/**
 * HITL (Human-in-the-Loop) Error Classes
 *
 * Provides structured error handling for HITL safety mechanisms.
 * These errors allow applications to distinguish between different
 * types of HITL failures and handle them appropriately.
 *
 * Updated to use standardized error codes and format.
 */

import {
  NeuroLinkError,
  ErrorFactory,
  ERROR_CODES,
} from "../utils/errorHandling.js";

/**
 * Base class for all HITL-related errors
 *
 * @deprecated Use NeuroLinkError with HITL_* error codes instead
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
 *
 * Use ErrorFactory.hitlUserRejected() for new code
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

  /**
   * Convert to standardized NeuroLinkError
   */
  toNeuroLinkError(): NeuroLinkError {
    return ErrorFactory.hitlUserRejected(this.toolName, this.reason);
  }
}

/**
 * Thrown when a confirmation request times out without user response
 * This indicates the user didn't respond within the configured timeout period.
 *
 * Use ErrorFactory.hitlTimeout() for new code
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

  /**
   * Convert to standardized NeuroLinkError
   */
  toNeuroLinkError(): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.HITL_TIMEOUT,
      message: this.message,
      context: { confirmationId: this.confirmationId, timeout: this.timeout },
    });
  }
}

/**
 * Thrown when HITL configuration is invalid or missing required properties
 *
 * Use ErrorFactory.configInvalid() for new code
 */
export class HITLConfigurationError extends HITLError {
  constructor(message: string) {
    super(message);
    this.name = "HITLConfigurationError";
  }

  /**
   * Convert to standardized NeuroLinkError
   */
  toNeuroLinkError(): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.HITL_CONFIGURATION_INVALID,
      message: this.message,
    });
  }
}
