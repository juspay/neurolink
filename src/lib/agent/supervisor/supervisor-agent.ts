/**
 * Supervisor Agent - Provides oversight and control for agent execution
 *
 * The Supervisor Agent implements:
 * - Pre-execution review and approval
 * - Post-execution evaluation
 * - Error escalation and handling
 * - Policy enforcement
 * - Human-in-the-loop integration
 */

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import type { NeuroLink } from "../../neurolink.js";
import { Agent } from "../agent.js";
import type {
  AgentDefinition,
  AgentInput,
  AgentResult,
  AgentExecutionOptions,
  SupervisionPolicy,
  SupervisionOptions,
  SupervisedResult,
  ReviewDecision,
  EscalationIssue,
  EscalationResult,
  AgentAction,
} from "../../types/agentNetworkTypes.js";
import { logger } from "../../utils/logger.js";

/**
 * Supervision level
 */
export type SupervisionLevel =
  | "none" // No supervision
  | "audit" // Log and monitor only
  | "review" // Review before execution
  | "approve" // Require approval
  | "strict"; // Require approval for all actions

/**
 * Supervisor configuration
 */
export type SupervisorConfig = {
  /** Supervision level */
  level: SupervisionLevel;

  /** Supervision policy */
  policy: SupervisionPolicy;

  /** Supervision options */
  options: SupervisionOptions;

  /** HITL handler for human approval */
  hitlHandler?: HITLHandler;

  /** Custom review function */
  customReviewer?: (action: AgentAction) => Promise<ReviewDecision>;

  /** Escalation handler */
  escalationHandler?: (issue: EscalationIssue) => Promise<EscalationResult>;
};

/**
 * HITL (Human-in-the-Loop) handler interface
 */
export interface HITLHandler {
  /** Request human approval */
  requestApproval(
    action: AgentAction,
    timeout?: number,
  ): Promise<ReviewDecision>;

  /** Notify human of action */
  notify(action: AgentAction, result: AgentResult): Promise<void>;

  /** Check if human is available */
  isAvailable(): boolean;
}

/**
 * Pending approval record
 */
type PendingApproval = {
  id: string;
  action: AgentAction;
  startTime: number;
  timeout: number;
  resolve: (decision: ReviewDecision) => void;
  reject: (error: Error) => void;
};

/**
 * Supervisor Agent - Oversees and controls agent execution
 */
export class SupervisorAgent {
  private agent: Agent;
  private neurolink: NeuroLink;
  private config: SupervisorConfig;
  private emitter: EventEmitter;
  private pendingApprovals: Map<string, PendingApproval> = new Map();
  private actionHistory: AgentAction[] = [];
  private escalationHistory: EscalationIssue[] = [];

  constructor(
    agentDefinition: AgentDefinition,
    neurolink: NeuroLink,
    config: SupervisorConfig,
  ) {
    this.agent = new Agent(agentDefinition, neurolink);
    this.neurolink = neurolink;
    this.config = config;
    this.emitter = new EventEmitter();

    logger.debug(
      `[SupervisorAgent] Created for agent ${agentDefinition.name}`,
      {
        level: config.level,
        reviewThreshold: config.policy.reviewThreshold,
      },
    );
  }

  /**
   * Execute with supervision
   */
  async execute(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): Promise<SupervisedResult> {
    const action: AgentAction = {
      type: "generation",
      details: {
        input,
        options,
        agentId: this.agent.id,
        agentName: this.agent.name,
      },
      agentId: this.agent.id,
      timestamp: Date.now(),
    };

    this.actionHistory.push(action);
    this.emitter.emit("action:started", action);

    try {
      // Pre-execution supervision
      if (this.config.level !== "none") {
        const preReview = await this.preExecutionReview(action);
        if (!preReview.approved) {
          return {
            content: "",
            status: "error",
            error: `Execution blocked by supervisor: ${preReview.reason}`,
            duration: Date.now() - action.timestamp,
            agentId: this.agent.id,
            requiredApproval: true,
            approvalDecision: preReview,
          };
        }

        // Apply any modifications from review
        if (preReview.modifications) {
          Object.assign(action.details, preReview.modifications);
        }
      }

      // Execute the agent
      const result = await this.agent.execute(input, options);

      // Post-execution supervision
      if (this.config.level !== "none" && this.config.level !== "audit") {
        const postReview = await this.postExecutionReview(action, result);
        if (!postReview.approved) {
          // Escalate if result is rejected
          const escalation = await this.escalate({
            type: "policy",
            description: `Post-execution review failed: ${postReview.reason}`,
            severity: 3,
            context: { action, result },
          });

          return {
            ...result,
            requiredApproval: true,
            approvalDecision: postReview,
            escalation,
          };
        }
      }

      // Audit logging
      if (this.config.level === "audit") {
        this.auditLog(action, result);
      }

      this.emitter.emit("action:completed", { action, result });

      return {
        ...result,
        requiredApproval: false,
      };
    } catch (error) {
      const errorResult: SupervisedResult = {
        content: "",
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - action.timestamp,
        agentId: this.agent.id,
        requiredApproval: false,
      };

      // Escalate errors if threshold met
      if (this.shouldEscalate(error)) {
        errorResult.escalation = await this.escalate({
          type: "error",
          description: errorResult.error || "Unknown error",
          severity: 4,
          context: { action, error: errorResult.error },
        });
      }

      this.emitter.emit("action:error", { action, error });
      return errorResult;
    }
  }

  /**
   * Pre-execution review
   */
  private async preExecutionReview(
    action: AgentAction,
  ): Promise<ReviewDecision> {
    const level = this.config.level;

    // Audit level: always approve but log
    if (level === "audit") {
      this.auditLog(action);
      return {
        approved: true,
        reason: "Audit mode - logged",
        timestamp: Date.now(),
      };
    }

    // Check if action requires approval based on policy
    if (this.requiresApproval(action)) {
      return this.requestApproval(action);
    }

    // Review level: use custom reviewer or auto-approve
    if (level === "review") {
      if (this.config.customReviewer) {
        return this.config.customReviewer(action);
      }
      return {
        approved: true,
        reason: "Auto-approved by review",
        timestamp: Date.now(),
      };
    }

    // Default: approve
    return {
      approved: true,
      reason: "Default approval",
      timestamp: Date.now(),
    };
  }

  /**
   * Post-execution review
   */
  private async postExecutionReview(
    action: AgentAction,
    result: AgentResult,
  ): Promise<ReviewDecision> {
    // Check for suspicious patterns in output
    if (result.content) {
      const suspiciousPatterns = this.checkSuspiciousPatterns(result.content);
      if (suspiciousPatterns.length > 0) {
        return {
          approved: false,
          reason: `Suspicious patterns detected: ${suspiciousPatterns.join(", ")}`,
          timestamp: Date.now(),
        };
      }
    }

    // Evaluate quality if threshold set
    if (this.config.policy.reviewThreshold > 0) {
      const quality = await this.evaluateResultQuality(result);
      if (quality < this.config.policy.reviewThreshold) {
        return {
          approved: false,
          reason: `Quality score (${quality}) below threshold (${this.config.policy.reviewThreshold})`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      approved: true,
      reason: "Post-execution review passed",
      timestamp: Date.now(),
    };
  }

  /**
   * Check if action requires approval based on policy
   */
  private requiresApproval(action: AgentAction): boolean {
    const policy = this.config.policy;
    const level = this.config.level;

    // Strict level: always require approval
    if (level === "strict") {
      return true;
    }

    // Approve level: check specific actions
    if (level === "approve") {
      // Check if tool calls require approval
      if (action.type === "tool-call") {
        const toolName = action.details.toolName as string;
        if (policy.requireApprovalFor.includes(toolName)) {
          return true;
        }
      }

      // Check delegation
      if (action.type === "delegation") {
        return true;
      }
    }

    return false;
  }

  /**
   * Request approval (via HITL or auto-timeout)
   */
  private async requestApproval(action: AgentAction): Promise<ReviewDecision> {
    const options = this.config.options;
    const timeout = options.approvalTimeout ?? 30000;

    // If HITL handler available, use it
    if (this.config.hitlHandler?.isAvailable()) {
      try {
        return await this.config.hitlHandler.requestApproval(action, timeout);
      } catch {
        // HITL failed, use timeout behavior
        return this.handleApprovalTimeout(action);
      }
    }

    // No HITL, create pending approval
    return new Promise((resolve, reject) => {
      const approvalId = randomUUID();
      const pending: PendingApproval = {
        id: approvalId,
        action,
        startTime: Date.now(),
        timeout,
        resolve,
        reject,
      };

      this.pendingApprovals.set(approvalId, pending);
      this.emitter.emit("approval:requested", { approvalId, action });

      // Set timeout
      setTimeout(() => {
        if (this.pendingApprovals.has(approvalId)) {
          this.pendingApprovals.delete(approvalId);
          resolve(this.handleApprovalTimeout(action));
        }
      }, timeout);
    });
  }

  /**
   * Handle approval timeout
   */
  private handleApprovalTimeout(action: AgentAction): ReviewDecision {
    const behavior = this.config.options.timeoutBehavior ?? "reject";

    switch (behavior) {
      case "approve":
        return {
          approved: true,
          reason: "Timeout - auto-approved",
          timestamp: Date.now(),
        };
      case "escalate":
        this.escalate({
          type: "timeout",
          description: "Approval timeout",
          severity: 2,
          context: { action },
        });
        return {
          approved: false,
          reason: "Timeout - escalated",
          timestamp: Date.now(),
        };
      case "reject":
      default:
        return {
          approved: false,
          reason: "Timeout - rejected",
          timestamp: Date.now(),
        };
    }
  }

  /**
   * Provide approval decision (for external callers)
   */
  approve(approvalId: string, decision: ReviewDecision): boolean {
    const pending = this.pendingApprovals.get(approvalId);
    if (!pending) {
      return false;
    }

    this.pendingApprovals.delete(approvalId);
    pending.resolve(decision);
    this.emitter.emit("approval:resolved", { approvalId, decision });
    return true;
  }

  /**
   * Check for suspicious patterns in output
   */
  private checkSuspiciousPatterns(content: string): string[] {
    const patterns: string[] = [];

    // Check for potential harmful content
    const harmfulPatterns = [
      {
        pattern: /\b(password|secret|token|api.?key)\b.*[:=]/i,
        name: "credential-exposure",
      },
      {
        pattern: /\b(rm -rf|del \/f|format c:)\b/i,
        name: "destructive-command",
      },
      { pattern: /\b(eval|exec|system)\s*\(/i, name: "code-injection" },
    ];

    for (const { pattern, name } of harmfulPatterns) {
      if (pattern.test(content)) {
        patterns.push(name);
      }
    }

    return patterns;
  }

  /**
   * Evaluate result quality (simple heuristic)
   */
  private async evaluateResultQuality(result: AgentResult): Promise<number> {
    if (result.status === "error") {
      return 0;
    }
    if (!result.content) {
      return 0;
    }

    // Simple heuristic based on length and completeness
    let score = 0.5;

    // Content length factor
    if (result.content.length > 100) {
      score += 0.2;
    }
    if (result.content.length > 500) {
      score += 0.1;
    }

    // No errors
    if (!result.error) {
      score += 0.1;
    }

    // Used tools effectively
    if (result.toolsUsed && result.toolsUsed.length > 0) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Check if error should be escalated
   */
  private shouldEscalate(error: unknown): boolean {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Escalate critical errors
    const criticalPatterns = [
      /timeout/i,
      /rate.?limit/i,
      /unauthorized/i,
      /quota/i,
      /fatal/i,
    ];

    return criticalPatterns.some((p) => p.test(errorMsg));
  }

  /**
   * Escalate an issue
   */
  async escalate(issue: EscalationIssue): Promise<EscalationResult> {
    this.escalationHistory.push(issue);
    this.emitter.emit("escalation:created", issue);

    // Use custom escalation handler if available
    if (this.config.escalationHandler) {
      try {
        const result = await this.config.escalationHandler(issue);
        this.emitter.emit("escalation:handled", { issue, result });
        return result;
      } catch (error) {
        logger.error("[SupervisorAgent] Escalation handler failed", {
          issue,
          error,
        });
      }
    }

    // Default: notify via HITL if available
    if (this.config.hitlHandler?.isAvailable()) {
      await this.config.hitlHandler.notify(
        {
          type: "generation",
          details: { escalation: issue },
          agentId: this.agent.id,
          timestamp: Date.now(),
        },
        {
          content: `Escalation: ${issue.description}`,
          status: "error",
          error: issue.description,
          duration: 0,
          agentId: this.agent.id,
        },
      );
    }

    return {
      handled: false,
      resolution: "Logged for manual review",
      timestamp: Date.now(),
    };
  }

  /**
   * Audit log an action
   */
  private auditLog(action: AgentAction, result?: AgentResult): void {
    const logEntry = {
      timestamp: Date.now(),
      agentId: this.agent.id,
      agentName: this.agent.name,
      actionType: action.type,
      actionDetails: action.details,
      result: result
        ? {
            status: result.status,
            contentLength: result.content?.length,
            toolsUsed: result.toolsUsed,
            error: result.error,
          }
        : undefined,
    };

    logger.info("[SupervisorAgent:Audit]", logEntry);
    this.emitter.emit("audit:logged", logEntry);
  }

  /**
   * Get the underlying agent
   */
  getAgent(): Agent {
    return this.agent;
  }

  /**
   * Get supervision level
   */
  getSupervisionLevel(): SupervisionLevel {
    return this.config.level;
  }

  /**
   * Update supervision level
   */
  setSupervisionLevel(level: SupervisionLevel): void {
    this.config.level = level;
    this.emitter.emit("level:changed", level);
  }

  /**
   * Get action history
   */
  getActionHistory(): AgentAction[] {
    return [...this.actionHistory];
  }

  /**
   * Get escalation history
   */
  getEscalationHistory(): EscalationIssue[] {
    return [...this.escalationHistory];
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): Array<{
    id: string;
    action: AgentAction;
    startTime: number;
  }> {
    return Array.from(this.pendingApprovals.values()).map((p) => ({
      id: p.id,
      action: p.action,
      startTime: p.startTime,
    }));
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.actionHistory = [];
    this.escalationHistory = [];
  }

  /**
   * Subscribe to supervisor events
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.on(event, handler);
  }

  /**
   * Unsubscribe from supervisor events
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler);
  }
}

/**
 * Create a supervised agent
 */
export function createSupervisedAgent(
  definition: AgentDefinition,
  neurolink: NeuroLink,
  options?: {
    level?: SupervisionLevel;
    policy?: Partial<SupervisionPolicy>;
    options?: Partial<SupervisionOptions>;
    hitlHandler?: HITLHandler;
  },
): SupervisorAgent {
  const defaultPolicy: SupervisionPolicy = {
    reviewThreshold: 0.5,
    escalationThreshold: 0.3,
    maxRetries: 3,
    requireApprovalFor: [],
  };

  const defaultOptions: SupervisionOptions = {
    enforceApproval: false,
    approvalTimeout: 30000,
    timeoutBehavior: "reject",
  };

  return new SupervisorAgent(definition, neurolink, {
    level: options?.level ?? "audit",
    policy: { ...defaultPolicy, ...options?.policy },
    options: { ...defaultOptions, ...options?.options },
    hitlHandler: options?.hitlHandler,
  });
}
