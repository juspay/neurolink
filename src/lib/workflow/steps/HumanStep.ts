/**
 * Human Step
 *
 * Step type for human-in-the-loop (HITL) interactions.
 * Supports approval workflows, human input, review processes, and escalation.
 *
 * @module workflow/steps/HumanStep
 */

import type { JsonObject } from "../../types/common.js";
import type {
  StepConfig,
  StepDefinition,
  StepResult,
  SuspensionRequest,
  WorkflowContext,
} from "../types/workflowTypes.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Human action type
 */
export type HumanActionType = "approval" | "input" | "review" | "escalation" | "custom";

/**
 * Human step result
 */
export interface HumanStepResult<TData = unknown> {
  /** Whether human interaction was completed */
  completed: boolean;
  /** Action type that was requested */
  actionType: HumanActionType;
  /** Whether the action was approved (for approval type) */
  approved?: boolean;
  /** Human-provided data */
  data?: TData;
  /** Who performed the action */
  actor?: string;
  /** When the action was taken */
  actionTimestamp?: number;
  /** Any notes or comments from the human */
  notes?: string;
}

/**
 * Approval step configuration
 */
export interface ApprovalStepConfig extends Omit<StepConfig<unknown, HumanStepResult>, "execute"> {
  /** Reason for requesting approval */
  reason: string;
  /** Who can approve (optional) */
  approvers?: string[];
  /** Timeout in milliseconds (default: 24 hours) */
  timeoutMs?: number;
  /** What to do on timeout: reject, approve, or escalate */
  onTimeout?: "reject" | "approve" | "escalate";
  /** Context data to show to approver */
  context?: Record<string, unknown>;
}

/**
 * Human input step configuration
 */
export interface HumanInputStepConfig<TData = unknown>
  extends Omit<StepConfig<unknown, HumanStepResult<TData>>, "execute"> {
  /** Prompt for the human */
  prompt: string;
  /** Fields to collect */
  fields?: Array<{
    name: string;
    type: "text" | "number" | "boolean" | "select" | "multiselect";
    label: string;
    required?: boolean;
    options?: string[]; // For select/multiselect
    default?: unknown;
  }>;
  /** Timeout in milliseconds (default: 24 hours) */
  timeoutMs?: number;
}

/**
 * Review step configuration
 */
export interface ReviewStepConfig<TData = unknown> extends Omit<StepConfig<TData, HumanStepResult<TData>>, "execute"> {
  /** What is being reviewed */
  subject: string;
  /** Review instructions */
  instructions?: string;
  /** Possible review outcomes */
  outcomes?: Array<{
    id: string;
    label: string;
    requiresComment?: boolean;
  }>;
  /** Timeout in milliseconds (default: 24 hours) */
  timeoutMs?: number;
}

/**
 * Escalation step configuration
 */
export interface EscalationStepConfig extends Omit<StepConfig<unknown, HumanStepResult>, "execute"> {
  /** Reason for escalation */
  reason: string;
  /** Escalation level */
  level: number;
  /** Who to escalate to */
  escalateTo?: string[];
  /** Priority level */
  priority?: "low" | "medium" | "high" | "critical";
  /** Timeout in milliseconds (default: 4 hours) */
  timeoutMs?: number;
}

// =============================================================================
// Human Step Factory
// =============================================================================

const DEFAULT_TIMEOUT = 86400000; // 24 hours

/**
 * Create a human step factory
 */
export function createHumanStepFactory() {
  return createApprovalStepFactory();
}

/**
 * Create an approval step factory
 */
export function createApprovalStepFactory() {
  return (config: ApprovalStepConfig): StepDefinition<unknown, HumanStepResult> => {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT;

    return {
      id: config.name ?? "approval",
      name: config.name ?? "Human Approval",
      description: config.description ?? `Approval required: ${config.reason}`,
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: timeoutMs + 60000, // Add 1 minute buffer
      suspendable: true,
      tags: config.tags ?? ["human", "approval", "hitl"],
      execute: async (_input: unknown, context: WorkflowContext): Promise<StepResult<HumanStepResult>> => {
        // Create suspension request
        const suspensionRequest: SuspensionRequest = {
          reason: config.reason,
          type: "hitl",
          resumeData: {
            actionType: "approval",
            approvers: config.approvers ?? [],
            context: JSON.parse(JSON.stringify(config.context ?? {})),
            onTimeout: config.onTimeout ?? "reject",
          },
          expiresAt: Date.now() + timeoutMs,
        };

        // Request suspension
        context.suspend(suspensionRequest);

        return {
          success: true,
          data: {
            completed: false,
            actionType: "approval",
          },
          suspend: suspensionRequest,
        };
      },
    };
  };
}

/**
 * Create a human input step factory
 */
export function createHumanInputStepFactory<TData = unknown>() {
  return (config: HumanInputStepConfig<TData>): StepDefinition<unknown, HumanStepResult<TData>> => {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT;

    return {
      id: config.name ?? "human-input",
      name: config.name ?? "Human Input",
      description: config.description ?? config.prompt,
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: timeoutMs + 60000,
      suspendable: true,
      tags: config.tags ?? ["human", "input", "hitl"],
      execute: async (_input: unknown, context: WorkflowContext): Promise<StepResult<HumanStepResult<TData>>> => {
        // Create suspension request
        const suspensionRequest: SuspensionRequest = {
          reason: config.prompt,
          type: "hitl",
          resumeData: {
            actionType: "input",
            fields: JSON.parse(JSON.stringify(config.fields ?? [])),
          } as JsonObject,
          expiresAt: Date.now() + timeoutMs,
        };

        // Request suspension
        context.suspend(suspensionRequest);

        return {
          success: true,
          data: {
            completed: false,
            actionType: "input",
          },
          suspend: suspensionRequest,
        };
      },
    };
  };
}

/**
 * Create a review step factory
 */
export function createReviewStepFactory<TData = unknown>() {
  return (config: ReviewStepConfig<TData>): StepDefinition<TData, HumanStepResult<TData>> => {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT;

    return {
      id: config.name ?? "review",
      name: config.name ?? "Human Review",
      description: config.description ?? `Review: ${config.subject}`,
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: timeoutMs + 60000,
      suspendable: true,
      tags: config.tags ?? ["human", "review", "hitl"],
      execute: async (input: TData, context: WorkflowContext): Promise<StepResult<HumanStepResult<TData>>> => {
        // Create suspension request
        const suspensionRequest: SuspensionRequest = {
          reason: `Review required: ${config.subject}`,
          type: "hitl",
          resumeData: {
            actionType: "review",
            subject: config.subject,
            instructions: config.instructions ?? "",
            outcomes: JSON.parse(JSON.stringify(config.outcomes ?? [])),
            data: JSON.parse(JSON.stringify(input)),
          } as JsonObject,
          expiresAt: Date.now() + timeoutMs,
        };

        // Request suspension
        context.suspend(suspensionRequest);

        return {
          success: true,
          data: {
            completed: false,
            actionType: "review",
          },
          suspend: suspensionRequest,
        };
      },
    };
  };
}

/**
 * Create an escalation step factory
 */
export function createEscalationStepFactory() {
  return (config: EscalationStepConfig): StepDefinition<unknown, HumanStepResult> => {
    const timeoutMs = config.timeoutMs ?? 14400000; // 4 hours default

    return {
      id: config.name ?? "escalation",
      name: config.name ?? "Escalation",
      description: config.description ?? `Escalation: ${config.reason}`,
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: timeoutMs + 60000,
      suspendable: true,
      tags: config.tags ?? ["human", "escalation", "hitl"],
      execute: async (_input: unknown, context: WorkflowContext): Promise<StepResult<HumanStepResult>> => {
        // Create suspension request
        const suspensionRequest: SuspensionRequest = {
          reason: config.reason,
          type: "hitl",
          resumeData: {
            actionType: "escalation",
            level: config.level,
            escalateTo: config.escalateTo ?? [],
            priority: config.priority ?? "medium",
          } as JsonObject,
          expiresAt: Date.now() + timeoutMs,
        };

        // Request suspension
        context.suspend(suspensionRequest);

        return {
          success: true,
          data: {
            completed: false,
            actionType: "escalation",
          },
          suspend: suspensionRequest,
        };
      },
    };
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a simple approval step
 */
export function createApprovalStep(
  name: string,
  reason: string,
  options?: {
    approvers?: string[];
    timeoutMs?: number;
    onTimeout?: "reject" | "approve" | "escalate";
  },
): StepDefinition<unknown, HumanStepResult> {
  const factory = createApprovalStepFactory();
  return factory({
    name,
    reason,
    ...options,
  });
}

/**
 * Create a confirmation step (simplified approval)
 */
export function createConfirmationStep(
  name: string,
  message: string,
  options?: {
    timeoutMs?: number;
  },
): StepDefinition<unknown, HumanStepResult> {
  return createApprovalStep(name, message, {
    timeoutMs: options?.timeoutMs ?? 300000, // 5 minutes default for confirmations
    onTimeout: "reject",
  });
}

/**
 * Create a human input step
 */
export function createInputStep<TData = unknown>(
  name: string,
  prompt: string,
  fields?: HumanInputStepConfig<TData>["fields"],
  options?: {
    timeoutMs?: number;
  },
): StepDefinition<unknown, HumanStepResult<TData>> {
  const factory = createHumanInputStepFactory<TData>();
  return factory({
    name,
    prompt,
    fields,
    timeoutMs: options?.timeoutMs,
  });
}

/**
 * Create a review step
 */
export function createReviewStep<TData = unknown>(
  name: string,
  subject: string,
  options?: {
    instructions?: string;
    outcomes?: ReviewStepConfig<TData>["outcomes"];
    timeoutMs?: number;
  },
): StepDefinition<TData, HumanStepResult<TData>> {
  const factory = createReviewStepFactory<TData>();
  return factory({
    name,
    subject,
    ...options,
  });
}

/**
 * Create an escalation step
 */
export function createEscalationStep(
  name: string,
  reason: string,
  level: number,
  options?: {
    escalateTo?: string[];
    priority?: "low" | "medium" | "high" | "critical";
    timeoutMs?: number;
  },
): StepDefinition<unknown, HumanStepResult> {
  const factory = createEscalationStepFactory();
  return factory({
    name,
    reason,
    level,
    ...options,
  });
}

/**
 * Create a dangerous action confirmation step
 */
export function createDangerousActionConfirmation(
  name: string,
  action: string,
  details: Record<string, unknown>,
): StepDefinition<unknown, HumanStepResult> {
  return createApprovalStep(name, `Confirm dangerous action: ${action}`, {
    timeoutMs: 60000, // 1 minute
    onTimeout: "reject",
  });
}
