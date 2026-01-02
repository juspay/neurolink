/**
 * HITL (Human-in-the-Loop) Type Definitions
 *
 * Comprehensive TypeScript interfaces for the HITL safety system.
 * These types ensure type safety and provide clear contracts for
 * all HITL-related functionality.
 */

/**
 * Core HITL configuration interface
 * Controls how the HITL system behaves and what tools require confirmation
 */
export type HITLConfig = {
  /** Master enable/disable switch for HITL functionality */
  enabled: boolean;

  /** Keywords that trigger HITL confirmation (e.g., "delete", "remove", "drop") */
  dangerousActions: string[];

  /** Timeout in milliseconds for user confirmation (default: 30000) */
  timeout?: number;

  /** Communication method - currently only "event" is supported (default: "event") */
  confirmationMethod?: "event";

  /** Whether users can modify tool arguments during approval (default: true) */
  allowArgumentModification?: boolean;

  /** Auto-approve requests when they timeout (default: false - rejects on timeout) */
  autoApproveOnTimeout?: boolean;

  /** Enable audit logging for compliance and debugging (default: false) */
  auditLogging?: boolean;

  /** Advanced custom rules for complex tool scenarios (default: []) */
  customRules?: HITLRule[];
};

/**
 * Custom rule for advanced HITL scenarios
 * Allows enterprises to define complex conditions for when tools require confirmation
 */
export type HITLRule = {
  /** Human-readable name for the rule */
  name: string;

  /** Function that determines if a tool requires confirmation */
  condition: (toolName: string, args: unknown) => boolean;

  /** Whether this rule requires confirmation when triggered */
  requiresConfirmation: boolean;

  /** Custom message to show users when this rule is triggered */
  customMessage?: string;
};

/**
 * Internal confirmation request tracking
 * Used by HITLManager to track pending confirmations
 */
export type ConfirmationRequest = {
  /** Unique identifier for this confirmation request */
  confirmationId: string;

  /** Name of the tool requiring confirmation */
  toolName: string;

  /** Arguments that will be passed to the tool */
  arguments: unknown;

  /** Timestamp when the request was created */
  timestamp: number;

  /** Timeout handle for cleanup */
  timeoutHandle: NodeJS.Timeout;

  /** Promise resolve function */
  resolve: (result: ConfirmationResult) => void;

  /** Promise reject function */
  reject: (error: Error) => void;
};

/**
 * Result of a confirmation request
 * Contains user decision and potentially modified arguments
 */
export type ConfirmationResult = {
  /** Whether the user approved the tool execution */
  approved: boolean;

  /** Optional reason for rejection (if approved is false) */
  reason?: string;

  /** User-modified arguments (if allowArgumentModification is enabled) */
  modifiedArguments?: unknown;

  /** Time taken for user to respond in milliseconds */
  responseTime: number;
};

/**
 * Event payload for confirmation requests
 * Sent to frontends via EventEmitter when tool needs approval
 */
export type ConfirmationRequestEvent = {
  type: "hitl:confirmation-request";
  payload: {
    /** Unique ID for tracking this request */
    confirmationId: string;

    /** Name of the tool requiring confirmation */
    toolName: string;

    /** MCP server ID (if this is an external tool) */
    serverId?: string;

    /** Human-readable description of the action */
    actionType: string;

    /** Tool parameters for user review */
    arguments: unknown;

    /** Additional metadata about the request */
    metadata: {
      /** ISO timestamp when request was created */
      timestamp: string;

      /** User session identifier */
      sessionId?: string;

      /** User identifier */
      userId?: string;

      /** Keywords that triggered HITL */
      dangerousKeywords: string[];
    };

    /** Confirmation timeout in milliseconds */
    timeoutMs: number;

    /** Whether user can modify arguments */
    allowModification: boolean;
  };
};

/**
 * Event payload for confirmation responses
 * Sent from frontends back to HITLManager with user decision
 */
export type ConfirmationResponseEvent = {
  type: "hitl:confirmation-response";
  payload: {
    /** Matching confirmation ID from the request */
    confirmationId: string;

    /** User's approval decision */
    approved: boolean;

    /** Optional reason for rejection */
    reason?: string;

    /** User-edited parameters (if modification allowed) */
    modifiedArguments?: unknown;

    /** Response metadata */
    metadata: {
      /** ISO timestamp when user responded */
      timestamp: string;

      /** Time taken to respond in milliseconds */
      responseTime: number;

      /** User who made the decision */
      userId?: string;
    };
  };
};

/**
 * Event payload for confirmation timeouts
 * Emitted when user doesn't respond within timeout period
 */
export type ConfirmationTimeoutEvent = {
  type: "hitl:timeout";
  payload: {
    /** Confirmation ID that timed out */
    confirmationId: string;

    /** Tool name that timed out */
    toolName: string;

    /** Timeout duration in milliseconds */
    timeout: number;
  };
};

/**
 * HITL audit log entry
 * Used for compliance and debugging purposes
 */
export type HITLAuditLog = {
  /** ISO timestamp of the event */
  timestamp: string;

  /** Type of HITL event */
  eventType:
    | "confirmation-requested"
    | "confirmation-approved"
    | "confirmation-rejected"
    | "confirmation-timeout"
    | "confirmation-auto-approved";

  /** Tool that was involved */
  toolName: string;

  /** User who made the decision (if applicable) */
  userId?: string;

  /** Session identifier */
  sessionId?: string;

  /** Tool arguments (may be sanitized for security) */
  arguments: unknown;

  /** Reason for rejection (if applicable) */
  reason?: string;

  /** IP address of the user (if available) */
  ipAddress?: string;

  /** User agent string (if available) */
  userAgent?: string;

  /** Response time in milliseconds (if applicable) */
  responseTime?: number;
};

/**
 * HITL statistics interface
 * Provides metrics about HITL usage for monitoring
 */
export type HITLStatistics = {
  /** Total number of confirmation requests made */
  totalRequests: number;

  /** Number of pending confirmations */
  pendingRequests: number;

  /** Average response time for user decisions */
  averageResponseTime: number;

  /** Number of approved requests */
  approvedRequests: number;

  /** Number of rejected requests */
  rejectedRequests: number;

  /** Number of timed out requests */
  timedOutRequests: number;
};

/**
 * HITLManager type
 * Defines the public contract for HITL manager implementations.
 * Used for type annotations when referencing HITLManager instances.
 */
export type HITLManager = {
  /** Check if HITL is currently enabled */
  isEnabled(): boolean;

  /** Check if a tool requires confirmation based on configuration */
  requiresConfirmation(toolName: string, args?: unknown): boolean;

  /** Request confirmation for a tool execution */
  requestConfirmation(
    toolName: string,
    arguments_: unknown,
    context?: {
      serverId?: string;
      sessionId?: string;
      userId?: string;
    },
  ): Promise<ConfirmationResult>;

  /** Process user response to confirmation request */
  processUserResponse(
    confirmationId: string,
    response: {
      approved: boolean;
      reason?: string;
      modifiedArguments?: unknown;
      responseTime?: number;
      userId?: string;
    },
  ): void;

  /** Get current HITL usage statistics */
  getStatistics(): HITLStatistics;

  /** Get current configuration */
  getConfig(): HITLConfig;

  /** Update configuration dynamically */
  updateConfig(newConfig: Partial<HITLConfig>): void;

  /** Clean up resources and reject pending confirmations */
  cleanup(): void;

  /** Get count of pending confirmations */
  getPendingCount(): number;

  /** EventEmitter methods for HITL events */
  on(event: string, listener: (...args: unknown[]) => void): HITLManager;
  emit(event: string, ...args: unknown[]): boolean;
};
