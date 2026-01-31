/**
 * Agent-specific error types for Multi-Agent Networks
 *
 * This module provides error classes and factory functions for
 * agent-related errors, following NeuroLink's error handling patterns.
 */

import {
  createErrorFactory,
  NeuroLinkFeatureError,
} from "../../core/infrastructure/baseError.js";

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Agent error codes
 */
export const AgentErrorCodes = {
  // Agent execution errors
  AGENT_EXECUTION_FAILED: "AGENT_EXECUTION_FAILED",
  AGENT_NOT_FOUND: "AGENT_NOT_FOUND",
  AGENT_TIMEOUT: "AGENT_TIMEOUT",
  AGENT_VALIDATION_FAILED: "AGENT_VALIDATION_FAILED",
  AGENT_INITIALIZATION_FAILED: "AGENT_INITIALIZATION_FAILED",

  // Routing errors
  ROUTING_FAILED: "ROUTING_FAILED",
  ROUTING_NO_MATCH: "ROUTING_NO_MATCH",
  ROUTING_LOW_CONFIDENCE: "ROUTING_LOW_CONFIDENCE",
  ROUTING_PARSE_ERROR: "ROUTING_PARSE_ERROR",

  // Delegation errors
  DELEGATION_FAILED: "DELEGATION_FAILED",
  DELEGATION_REJECTED: "DELEGATION_REJECTED",
  DELEGATION_TIMEOUT: "DELEGATION_TIMEOUT",

  // Coordination errors
  COORDINATION_FAILED: "COORDINATION_FAILED",
  COORDINATION_DEADLOCK: "COORDINATION_DEADLOCK",
  COORDINATION_TIMEOUT: "COORDINATION_TIMEOUT",

  // Network errors
  NETWORK_EXECUTION_FAILED: "NETWORK_EXECUTION_FAILED",
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",
  NETWORK_MAX_STEPS_EXCEEDED: "NETWORK_MAX_STEPS_EXCEEDED",
  NETWORK_CONFIGURATION_INVALID: "NETWORK_CONFIGURATION_INVALID",

  // Communication errors
  MESSAGE_DELIVERY_FAILED: "MESSAGE_DELIVERY_FAILED",
  MESSAGE_TIMEOUT: "MESSAGE_TIMEOUT",
  PROTOCOL_ERROR: "PROTOCOL_ERROR",
  CONSENSUS_FAILED: "CONSENSUS_FAILED",

  // Tool errors
  TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  TOOL_VALIDATION_FAILED: "TOOL_VALIDATION_FAILED",
} as const;

export type AgentErrorCode =
  (typeof AgentErrorCodes)[keyof typeof AgentErrorCodes];

// ============================================================================
// Error Factory
// ============================================================================

/**
 * Error factory for agent-related errors
 */
export const AgentErrorFactory = createErrorFactory("Agent", AgentErrorCodes);

// ============================================================================
// Specialized Error Classes
// ============================================================================

/**
 * Base class for agent errors
 */
export class AgentError extends NeuroLinkFeatureError {
  readonly agentId?: string;
  readonly traceId?: string;
  readonly stepIndex?: number;

  constructor(
    message: string,
    code: AgentErrorCode,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      agentId?: string;
      traceId?: string;
      stepIndex?: number;
    },
  ) {
    super(message, code, "Agent", {
      retryable: options?.retryable,
      details: options?.details,
      cause: options?.cause,
    });
    this.agentId = options?.agentId;
    this.traceId = options?.traceId;
    this.stepIndex = options?.stepIndex;
  }
}

/**
 * Error thrown when agent execution fails
 */
export class AgentExecutionError extends AgentError {
  constructor(
    message: string,
    options?: {
      cause?: Error;
      agentId?: string;
      traceId?: string;
      stepIndex?: number;
      details?: Record<string, unknown>;
    },
  ) {
    super(message, AgentErrorCodes.AGENT_EXECUTION_FAILED, {
      retryable: true,
      ...options,
    });
    this.name = "AgentExecutionError";
  }
}

/**
 * Error thrown when an agent is not found
 */
export class AgentNotFoundError extends AgentError {
  constructor(agentId: string, options?: { traceId?: string }) {
    super(`Agent not found: ${agentId}`, AgentErrorCodes.AGENT_NOT_FOUND, {
      retryable: false,
      agentId,
      traceId: options?.traceId,
    });
    this.name = "AgentNotFoundError";
  }
}

/**
 * Error thrown when routing fails
 */
export class RoutingError extends AgentError {
  readonly task?: string;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      task?: string;
      traceId?: string;
      stepIndex?: number;
      details?: Record<string, unknown>;
    },
  ) {
    super(message, AgentErrorCodes.ROUTING_FAILED, {
      retryable: true,
      traceId: options?.traceId,
      stepIndex: options?.stepIndex,
      details: { task: options?.task, ...options?.details },
      cause: options?.cause,
    });
    this.name = "RoutingError";
    this.task = options?.task;
  }
}

/**
 * Error thrown when delegation fails
 */
export class DelegationError extends AgentError {
  readonly fromAgentId?: string;
  readonly toAgentId?: string;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      fromAgentId?: string;
      toAgentId?: string;
      traceId?: string;
      stepIndex?: number;
      details?: Record<string, unknown>;
    },
  ) {
    super(message, AgentErrorCodes.DELEGATION_FAILED, {
      retryable: true,
      traceId: options?.traceId,
      stepIndex: options?.stepIndex,
      details: {
        fromAgentId: options?.fromAgentId,
        toAgentId: options?.toAgentId,
        ...options?.details,
      },
      cause: options?.cause,
    });
    this.name = "DelegationError";
    this.fromAgentId = options?.fromAgentId;
    this.toAgentId = options?.toAgentId;
  }
}

/**
 * Error thrown when coordination fails
 */
export class CoordinationError extends AgentError {
  readonly participantIds?: string[];

  constructor(
    message: string,
    options?: {
      cause?: Error;
      participantIds?: string[];
      traceId?: string;
      stepIndex?: number;
      details?: Record<string, unknown>;
    },
  ) {
    super(message, AgentErrorCodes.COORDINATION_FAILED, {
      retryable: true,
      traceId: options?.traceId,
      stepIndex: options?.stepIndex,
      details: {
        participantIds: options?.participantIds,
        ...options?.details,
      },
      cause: options?.cause,
    });
    this.name = "CoordinationError";
    this.participantIds = options?.participantIds;
  }
}

/**
 * Error thrown when network execution fails
 */
export class NetworkExecutionError extends AgentError {
  readonly networkId?: string;
  readonly completedSteps?: number;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      networkId?: string;
      traceId?: string;
      completedSteps?: number;
      details?: Record<string, unknown>;
    },
  ) {
    super(message, AgentErrorCodes.NETWORK_EXECUTION_FAILED, {
      retryable: true,
      traceId: options?.traceId,
      details: {
        networkId: options?.networkId,
        completedSteps: options?.completedSteps,
        ...options?.details,
      },
      cause: options?.cause,
    });
    this.name = "NetworkExecutionError";
    this.networkId = options?.networkId;
    this.completedSteps = options?.completedSteps;
  }
}

/**
 * Error thrown when network times out
 */
export class NetworkTimeoutError extends AgentError {
  readonly networkId?: string;
  readonly timeout: number;

  constructor(
    timeout: number,
    options?: {
      networkId?: string;
      traceId?: string;
      completedSteps?: number;
    },
  ) {
    super(
      `Network execution timed out after ${timeout}ms`,
      AgentErrorCodes.NETWORK_TIMEOUT,
      {
        retryable: false,
        traceId: options?.traceId,
        details: {
          networkId: options?.networkId,
          timeout,
          completedSteps: options?.completedSteps,
        },
      },
    );
    this.name = "NetworkTimeoutError";
    this.networkId = options?.networkId;
    this.timeout = timeout;
  }
}

/**
 * Error thrown when max steps are exceeded
 */
export class MaxStepsExceededError extends AgentError {
  readonly maxSteps: number;
  readonly actualSteps: number;

  constructor(
    maxSteps: number,
    actualSteps: number,
    options?: {
      networkId?: string;
      traceId?: string;
    },
  ) {
    super(
      `Network exceeded maximum steps: ${actualSteps} > ${maxSteps}`,
      AgentErrorCodes.NETWORK_MAX_STEPS_EXCEEDED,
      {
        retryable: false,
        traceId: options?.traceId,
        details: {
          maxSteps,
          actualSteps,
        },
      },
    );
    this.name = "MaxStepsExceededError";
    this.maxSteps = maxSteps;
    this.actualSteps = actualSteps;
  }
}

/**
 * Error thrown for message delivery failures
 */
export class MessageDeliveryError extends AgentError {
  readonly messageId?: string;
  readonly fromAgent?: string;
  readonly toAgent?: string;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      messageId?: string;
      fromAgent?: string;
      toAgent?: string;
      traceId?: string;
    },
  ) {
    super(message, AgentErrorCodes.MESSAGE_DELIVERY_FAILED, {
      retryable: true,
      traceId: options?.traceId,
      details: {
        messageId: options?.messageId,
        fromAgent: options?.fromAgent,
        toAgent: options?.toAgent,
      },
      cause: options?.cause,
    });
    this.name = "MessageDeliveryError";
    this.messageId = options?.messageId;
    this.fromAgent = options?.fromAgent;
    this.toAgent = options?.toAgent;
  }
}

/**
 * Error thrown for protocol errors
 */
export class ProtocolError extends AgentError {
  readonly protocol?: string;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      protocol?: string;
      participants?: string[];
      traceId?: string;
    },
  ) {
    super(message, AgentErrorCodes.PROTOCOL_ERROR, {
      retryable: false,
      traceId: options?.traceId,
      details: {
        protocol: options?.protocol,
        participants: options?.participants,
      },
      cause: options?.cause,
    });
    this.name = "ProtocolError";
    this.protocol = options?.protocol;
  }
}

/**
 * Error thrown when input/output validation fails
 */
export class ValidationError extends AgentError {
  readonly validationErrors?: string[];

  constructor(
    message: string,
    options?: {
      agentId?: string;
      validationErrors?: string[];
      traceId?: string;
    },
  ) {
    super(message, AgentErrorCodes.AGENT_VALIDATION_FAILED, {
      retryable: false,
      agentId: options?.agentId,
      traceId: options?.traceId,
      details: {
        validationErrors: options?.validationErrors,
      },
    });
    this.name = "ValidationError";
    this.validationErrors = options?.validationErrors;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an error is an agent error
 */
export function isAgentError(error: unknown): error is AgentError {
  return error instanceof AgentError;
}

/**
 * Check if an error is retryable
 */
export function isRetryableAgentError(error: unknown): boolean {
  if (error instanceof AgentError) {
    return error.retryable;
  }
  return false;
}

/**
 * Create an agent error with full context
 */
export function createAgentError(
  code: AgentErrorCode,
  message: string,
  context?: {
    agentId?: string;
    traceId?: string;
    stepIndex?: number;
    cause?: Error;
    details?: Record<string, unknown>;
  },
): AgentError {
  const retryableCodes: AgentErrorCode[] = [
    AgentErrorCodes.AGENT_EXECUTION_FAILED,
    AgentErrorCodes.ROUTING_FAILED,
    AgentErrorCodes.DELEGATION_FAILED,
    AgentErrorCodes.COORDINATION_FAILED,
    AgentErrorCodes.NETWORK_EXECUTION_FAILED,
    AgentErrorCodes.MESSAGE_DELIVERY_FAILED,
    AgentErrorCodes.TOOL_EXECUTION_FAILED,
  ];
  const retryable = retryableCodes.includes(code);

  return new AgentError(message, code, {
    retryable,
    ...context,
  });
}

/**
 * Wrap an error as an agent error
 */
export function wrapAsAgentError(
  error: unknown,
  context?: {
    agentId?: string;
    traceId?: string;
    stepIndex?: number;
  },
): AgentError {
  if (error instanceof AgentError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;

  return new AgentExecutionError(message, {
    cause,
    ...context,
  });
}
