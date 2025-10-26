/**
 * HITL (Human-in-the-Loop) Manager
 *
 * Central orchestrator for all HITL confirmation workflows.
 * Manages user confirmation requests, timeouts, and argument modifications
 * for enterprise-grade AI safety.
 */

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import type {
  HITLConfig,
  ConfirmationRequest,
  ConfirmationResult,
  ConfirmationRequestEvent,
  ConfirmationResponseEvent,
  ConfirmationTimeoutEvent,
  HITLStatistics,
  HITLAuditLog,
} from "../types/hitlTypes.js";
import { HITLTimeoutError, HITLConfigurationError } from "./hitlErrors.js";
import { logger } from "../utils/logger.js";

// Default configuration constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_ALLOW_MODIFICATION = false;

/**
 * HITLManager - Central orchestrator for Human-in-the-Loop safety mechanisms
 *
 * Features:
 * - Real-time user confirmation via events
 * - Configurable dangerous action detection
 * - Custom rule engine for complex scenarios
 * - Argument modification support
 * - Comprehensive audit logging
 * - Timeout handling with cleanup
 */
export class HITLManager extends EventEmitter {
  private config: HITLConfig;
  private pendingConfirmations: Map<string, ConfirmationRequest> = new Map();
  private statistics: HITLStatistics = {
    totalRequests: 0,
    pendingRequests: 0,
    averageResponseTime: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    timedOutRequests: 0,
  };

  constructor(config: HITLConfig) {
    super();
    this.config = this.validateConfig(config);
    this.setupEventHandlers();
  }

  /**
   * Validate HITL configuration and apply defaults
   */
  private validateConfig(config: HITLConfig): HITLConfig {
    // Apply defaults for optional fields
    const configWithDefaults: HITLConfig = {
      enabled: config.enabled,
      dangerousActions: config.dangerousActions,
      timeout: config.timeout ?? DEFAULT_TIMEOUT, // Default: 30 seconds
      confirmationMethod: config.confirmationMethod ?? "event", // Default: "event"
      allowArgumentModification:
        config.allowArgumentModification ?? DEFAULT_ALLOW_MODIFICATION, // Default: true
      autoApproveOnTimeout: config.autoApproveOnTimeout ?? false, // Default: false (safe)
      auditLogging: config.auditLogging ?? false, // Default: false
      customRules: config.customRules ?? [], // Default: empty array
    };

    if (!configWithDefaults.enabled) {
      return configWithDefaults; // If disabled, don't validate other fields
    }

    if (!Array.isArray(configWithDefaults.dangerousActions)) {
      throw new HITLConfigurationError(
        "dangerousActions must be an array of strings",
      );
    }

    if (
      typeof configWithDefaults.timeout !== "number" ||
      configWithDefaults.timeout <= 0
    ) {
      throw new HITLConfigurationError(
        "timeout must be a positive number (milliseconds)",
      );
    }

    if (configWithDefaults.confirmationMethod !== "event") {
      throw new HITLConfigurationError(
        "confirmationMethod must be 'event' (only supported method)",
      );
    }

    if (typeof configWithDefaults.allowArgumentModification !== "boolean") {
      throw new HITLConfigurationError(
        "allowArgumentModification must be a boolean",
      );
    }

    return configWithDefaults;
  }

  /**
   * Check if a tool requires confirmation based on configuration
   */
  requiresConfirmation(toolName: string, args?: unknown): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check dangerous actions keywords
    const lowerToolName = toolName.toLowerCase();
    for (const action of this.config.dangerousActions) {
      if (lowerToolName.includes(action.toLowerCase())) {
        return true;
      }
    }

    // Check custom rules
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        if (rule.requiresConfirmation) {
          try {
            if (rule.condition(toolName, args)) {
              return true;
            }
          } catch (error) {
            // Log rule evaluation error but don't fail
            this.logAuditEvent("rule-evaluation-error", {
              ruleName: rule.name,
              toolName,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }

    return false;
  }

  /**
   * Request confirmation for a tool execution
   */
  async requestConfirmation(
    toolName: string,
    arguments_: unknown,
    context?: {
      serverId?: string;
      sessionId?: string;
      userId?: string;
    },
  ): Promise<ConfirmationResult> {
    const confirmationId = this.generateConfirmationId();
    const startTime = Date.now();

    // Update statistics
    this.statistics.totalRequests++;
    this.statistics.pendingRequests++;

    return new Promise<ConfirmationResult>((resolve, reject) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.handleTimeout(confirmationId);
      }, this.config.timeout);

      // Store pending confirmation
      const request: ConfirmationRequest = {
        confirmationId,
        toolName,
        arguments: arguments_,
        timestamp: startTime,
        timeoutHandle,
        resolve,
        reject,
      };

      this.pendingConfirmations.set(confirmationId, request);

      // Create confirmation request event
      const requestEvent: ConfirmationRequestEvent = {
        type: "hitl:confirmation-request",
        payload: {
          confirmationId,
          toolName,
          serverId: context?.serverId,
          actionType: this.generateActionDescription(toolName, arguments_),
          arguments: arguments_,
          metadata: {
            timestamp: new Date(startTime).toISOString(),
            sessionId: context?.sessionId,
            userId: context?.userId,
            dangerousKeywords: this.getTriggeredKeywords(toolName, arguments_),
          },
          timeoutMs: this.config.timeout ?? DEFAULT_TIMEOUT,
          allowModification:
            this.config.allowArgumentModification ?? DEFAULT_ALLOW_MODIFICATION,
        },
      };

      // Emit confirmation request event
      this.emit("hitl:confirmation-request", requestEvent);

      // Log audit trail if enabled
      if (this.config.auditLogging) {
        this.logAuditEvent("confirmation-requested", {
          confirmationId,
          toolName,
          userId: context?.userId,
          sessionId: context?.sessionId,
          timestamp: startTime,
          arguments: arguments_,
        });
      }
    });
  }

  /**
   * Process user response to confirmation request
   */
  processUserResponse(
    confirmationId: string,
    response: {
      approved: boolean;
      reason?: string;
      modifiedArguments?: unknown;
      responseTime?: number;
      userId?: string;
    },
  ): void {
    const request = this.pendingConfirmations.get(confirmationId);
    if (!request) {
      logger.warn(`No pending confirmation found for ID: ${confirmationId}`);
      return;
    }

    // Clear timeout
    clearTimeout(request.timeoutHandle);

    // Remove from pending
    this.pendingConfirmations.delete(confirmationId);
    this.statistics.pendingRequests--;

    // Calculate response time
    const responseTime =
      response.responseTime || Date.now() - request.timestamp;

    // Update statistics
    if (response.approved) {
      this.statistics.approvedRequests++;
    } else {
      this.statistics.rejectedRequests++;
    }

    // Update average response time
    const totalResponses =
      this.statistics.approvedRequests + this.statistics.rejectedRequests;
    this.statistics.averageResponseTime =
      (this.statistics.averageResponseTime * (totalResponses - 1) +
        responseTime) /
      totalResponses;

    // Create result
    const result: ConfirmationResult = {
      approved: response.approved,
      reason: response.reason,
      modifiedArguments: response.modifiedArguments,
      responseTime,
    };

    // Log audit trail if enabled
    if (this.config.auditLogging) {
      this.logAuditEvent(
        response.approved ? "confirmation-approved" : "confirmation-rejected",
        {
          confirmationId,
          toolName: request.toolName,
          approved: response.approved,
          reason: response.reason,
          userId: response.userId,
          responseTime,
          arguments: request.arguments,
        },
      );
    }

    // Resolve the promise
    request.resolve(result);
  }

  /**
   * Handle confirmation timeout
   */
  private handleTimeout(confirmationId: string): void {
    const request = this.pendingConfirmations.get(confirmationId);
    if (!request) {
      return;
    }

    // Remove from pending
    this.pendingConfirmations.delete(confirmationId);
    this.statistics.pendingRequests--;
    this.statistics.timedOutRequests++;

    // Calculate response time (timeout duration)
    const responseTime = Date.now() - request.timestamp;

    // Check if auto-approve on timeout is enabled
    const shouldAutoApprove = this.config.autoApproveOnTimeout === true;

    // Log audit trail if enabled
    if (this.config.auditLogging) {
      this.logAuditEvent("confirmation-timeout", {
        confirmationId,
        toolName: request.toolName,
        timeout: this.config.timeout ?? DEFAULT_TIMEOUT,
        arguments: request.arguments,
        autoApproved: shouldAutoApprove,
      });
    }

    // Create timeout event
    const timeoutEvent: ConfirmationTimeoutEvent = {
      type: "hitl:timeout",
      payload: {
        confirmationId,
        toolName: request.toolName,
        timeout: this.config.timeout ?? DEFAULT_TIMEOUT,
      },
    };

    // Emit timeout event
    this.emit("hitl:timeout", timeoutEvent);

    if (shouldAutoApprove) {
      // Auto-approve the request
      this.statistics.approvedRequests++;

      // Update average response time
      const totalResponses =
        this.statistics.approvedRequests + this.statistics.rejectedRequests;
      this.statistics.averageResponseTime =
        (this.statistics.averageResponseTime * (totalResponses - 1) +
          responseTime) /
        totalResponses;

      // Log auto-approval if enabled
      if (this.config.auditLogging) {
        this.logAuditEvent("confirmation-auto-approved", {
          confirmationId,
          toolName: request.toolName,
          reason: "Auto-approved due to timeout",
          responseTime,
          arguments: request.arguments,
        });
      }

      // Resolve with auto-approval
      const result: ConfirmationResult = {
        approved: true,
        reason: "Auto-approved due to timeout",
        responseTime,
      };

      request.resolve(result);
    } else {
      // Reject with timeout error (original behavior)
      request.reject(
        new HITLTimeoutError(
          `Confirmation timeout for tool: ${request.toolName}`,
          confirmationId,
          this.config.timeout ?? DEFAULT_TIMEOUT,
        ),
      );
    }
  }

  /**
   * Set up event handlers for processing responses
   */
  private setupEventHandlers(): void {
    this.on(
      "hitl:confirmation-response",
      (event: ConfirmationResponseEvent) => {
        if (event.payload?.confirmationId) {
          this.processUserResponse(event.payload.confirmationId, {
            approved: event.payload.approved,
            reason: event.payload.reason,
            modifiedArguments: event.payload.modifiedArguments,
            responseTime: event.payload.metadata?.responseTime,
            userId: event.payload.metadata?.userId,
          });
        }
      },
    );
  }

  /**
   * Generate unique confirmation ID
   */
  private generateConfirmationId(): string {
    return `hitl-${Date.now()}-${randomUUID()}`;
  }

  /**
   * Generate human-readable action description
   */
  private generateActionDescription(toolName: string, args: unknown): string {
    const lowerToolName = toolName.toLowerCase();

    // Check for specific action types
    if (lowerToolName.includes("delete")) {
      return "Delete Operation";
    }
    if (lowerToolName.includes("remove")) {
      return "Remove Operation";
    }
    if (lowerToolName.includes("update")) {
      return "Update Operation";
    }
    if (lowerToolName.includes("create")) {
      return "Create Operation";
    }
    if (lowerToolName.includes("drop")) {
      return "Drop Operation";
    }
    if (lowerToolName.includes("truncate")) {
      return "Truncate Operation";
    }
    if (lowerToolName.includes("restart")) {
      return "Restart Operation";
    }
    if (lowerToolName.includes("stop")) {
      return "Stop Operation";
    }
    if (lowerToolName.includes("kill")) {
      return "Kill Operation";
    }

    // Check custom rules for custom messages
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        try {
          if (rule.condition(toolName, args) && rule.customMessage) {
            return rule.customMessage;
          }
        } catch {
          // Ignore rule evaluation errors
        }
      }
    }

    return `Execute ${toolName}`;
  }

  /**
   * Get keywords that triggered HITL
   */
  private getTriggeredKeywords(toolName: string, args?: unknown): string[] {
    const triggered: string[] = [];
    const lowerToolName = toolName.toLowerCase();

    // Check dangerous actions
    for (const action of this.config.dangerousActions) {
      if (lowerToolName.includes(action.toLowerCase())) {
        triggered.push(action);
      }
    }

    // Check custom rules
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        try {
          if (rule.requiresConfirmation && rule.condition(toolName, args)) {
            triggered.push(rule.name);
          }
        } catch {
          // Ignore rule evaluation errors
        }
      }
    }

    return triggered;
  }

  /**
   * Log audit events for compliance and debugging
   */
  private logAuditEvent(
    eventType: string,
    data: Record<string, unknown>,
  ): void {
    const auditLog: HITLAuditLog = {
      timestamp: new Date().toISOString(),
      eventType: eventType as HITLAuditLog["eventType"],
      toolName: data.toolName as string,
      userId: data.userId as string | undefined,
      sessionId: data.sessionId as string | undefined,
      arguments: data.arguments,
      reason: data.reason as string | undefined,
      responseTime: data.responseTime as number | undefined,
      ...data,
    };

    logger.info(`[HITL Audit] ${eventType}:`, auditLog);

    // Emit audit event for external logging systems
    this.emit("hitl:audit", auditLog);
  }

  /**
   * Get current HITL usage statistics
   */
  getStatistics(): HITLStatistics {
    return { ...this.statistics };
  }

  /**
   * Get current configuration
   */
  getConfig(): HITLConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (for dynamic reconfiguration)
   */
  updateConfig(newConfig: Partial<HITLConfig>): void {
    const updatedConfig = { ...this.config, ...newConfig };
    this.config = this.validateConfig(updatedConfig);

    if (this.config.auditLogging) {
      this.logAuditEvent("configuration-updated", {
        oldConfig: this.config,
        newConfig: updatedConfig,
      });
    }
  }

  /**
   * Clean up resources and reject pending confirmations
   */
  cleanup(): void {
    // Clear all pending confirmations
    for (const [confirmationId, request] of this.pendingConfirmations) {
      clearTimeout(request.timeoutHandle);
      request.reject(
        new Error(`HITL cleanup: confirmation ${confirmationId} cancelled`),
      );
    }

    this.pendingConfirmations.clear();
    this.statistics.pendingRequests = 0;

    if (this.config.auditLogging) {
      this.logAuditEvent("manager-cleanup", {
        clearedConfirmations: this.pendingConfirmations.size,
      });
    }
  }

  /**
   * Check if manager is currently enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get count of pending confirmations
   */
  getPendingCount(): number {
    return this.pendingConfirmations.size;
  }
}
