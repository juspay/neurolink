/**
 * WorkflowExecutor - Main execution engine for workflows
 *
 * Features:
 * - Graph-based step execution with topological ordering
 * - Parallel execution with concurrency control (p-limit)
 * - Conditional branching evaluation
 * - Loop execution (forEach, doWhile, doUntil)
 * - Suspension/resumption with SuspensionError
 * - Checkpoint creation and restoration
 * - Event emission for all lifecycle events
 * - Cancellation via AbortController
 *
 * @module workflow/workflowExecutor
 */

import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import pLimit from "p-limit";
import type { NeuroLink } from "../neurolink.js";
import type { UnknownRecord } from "../types/common.js";
import type {
  ConditionalBranch,
  LoopDefinition,
  ParallelGroup,
  StepDefinition,
  StepExecutionRecord,
  SuspensionRequest,
  WorkflowCheckpoint,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowError,
  WorkflowEvent,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
  WorkflowLogger,
  WorkflowMetadata,
  WorkflowStats,
  WorkflowStatus,
} from "../types/workflowTypes.js";
import { logger as globalLogger } from "../utils/logger.js";
import { Step } from "./step.js";
import { WorkflowRegistry } from "./workflowRegistry.js";
import { type CheckpointStorage, InMemoryCheckpointStorage, WorkflowStateManager } from "./workflowStateManager.js";

/**
 * Error thrown when a workflow requests suspension
 */
export class SuspensionError extends Error {
  suspension: SuspensionRequest;

  constructor(suspension: SuspensionRequest) {
    super(`Workflow suspended: ${suspension.reason}`);
    this.name = "SuspensionError";
    this.suspension = suspension;
  }
}

/**
 * Error thrown when a workflow is cancelled
 */
export class WorkflowCancelledError extends Error {
  constructor(workflowId: string, runId: string) {
    super(`Workflow ${workflowId} (run: ${runId}) was cancelled`);
    this.name = "WorkflowCancelledError";
  }
}

/**
 * Error thrown when a workflow times out
 */
export class WorkflowTimeoutError extends Error {
  constructor(workflowId: string, runId: string, timeoutMs: number) {
    super(`Workflow ${workflowId} (run: ${runId}) timed out after ${timeoutMs}ms`);
    this.name = "WorkflowTimeoutError";
  }
}

/**
 * Default parallel execution concurrency
 */
const DEFAULT_PARALLEL_CONCURRENCY = 5;

/**
 * Default workflow timeout (5 minutes)
 */
const DEFAULT_WORKFLOW_TIMEOUT_MS = 300000;

/**
 * Checkpoint version for compatibility
 */
const CHECKPOINT_VERSION = "1.0.0";

/**
 * WorkflowExecutor - Main execution engine for workflows
 *
 * @example
 * ```typescript
 * const executor = new WorkflowExecutor(neurolink);
 *
 * // Execute a workflow
 * const result = await executor.execute(workflowDefinition, { url: 'https://example.com' });
 *
 * // Execute with event streaming
 * const stream = executor.executeWithEvents(workflowDefinition, input);
 * for await (const event of stream) {
 *   console.log(event.type, event);
 * }
 *
 * // Resume a suspended workflow
 * const resumed = await executor.resume(checkpoint, { userApproval: true });
 * ```
 */
export class WorkflowExecutor extends EventEmitter {
  private neurolink: NeuroLink;
  private stateManager: WorkflowStateManager;
  private runningWorkflows: Map<string, AbortController> = new Map();
  private parallelConcurrency: number;

  constructor(
    neurolink: NeuroLink,
    options: {
      storage?: CheckpointStorage;
      parallelConcurrency?: number;
    } = {},
  ) {
    super();
    this.neurolink = neurolink;
    this.stateManager = new WorkflowStateManager(options.storage ?? new InMemoryCheckpointStorage());
    this.parallelConcurrency = options.parallelConcurrency ?? DEFAULT_PARALLEL_CONCURRENCY;
  }

  /**
   * Execute a workflow definition
   */
  async execute<TInput, TOutput, TState extends UnknownRecord = UnknownRecord>(
    workflow: WorkflowDefinition<TInput, TOutput, TState>,
    input: TInput,
    options: WorkflowExecutionOptions = {},
  ): Promise<WorkflowExecutionResult<TOutput>> {
    const runId = options.runId ?? randomUUID();
    const abortController = new AbortController();
    this.runningWorkflows.set(runId, abortController);

    const startTime = Date.now();
    const timeoutMs = options.timeout ?? workflow.timeout ?? DEFAULT_WORKFLOW_TIMEOUT_MS;

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      abortController.abort(new WorkflowTimeoutError(workflow.id, runId, timeoutMs));
    }, timeoutMs);

    try {
      // Initialize execution state
      const state: TState = {
        ...(workflow.initialState?.() ?? ({} as TState)),
        ...(options.initialState as Partial<TState>),
      } as TState;

      const stepOutputs = new Map<string, unknown>();
      const stepRecords = new Map<string, StepExecutionRecord>();

      // Initialize metadata
      const metadata: WorkflowMetadata = {
        startTime,
        completedSteps: [],
        failedSteps: [],
        skippedSteps: [],
        parentWorkflowId: options.parentWorkflowId,
        ...((options.metadata ?? {}) as Partial<WorkflowMetadata>),
      };

      // Create workflow context
      const context = this.createContext<TState>(workflow.id, workflow.name, runId, state, stepOutputs, metadata);

      // Validate input if schema provided
      if (workflow.inputSchema) {
        const validation = workflow.inputSchema.safeParse(input);
        if (!validation.success) {
          return this.createFailedResult<TOutput>(
            {
              code: "INPUT_VALIDATION_FAILED",
              message: `Input validation failed: ${validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
            },
            startTime,
            stepRecords,
          );
        }
      }

      // Emit workflow start event
      this.emitEvent({
        type: "workflow:start",
        workflowId: workflow.id,
        runId,
        timestamp: Date.now(),
        input,
        metadata,
      });

      // Restore from checkpoint if provided
      if (options.checkpoint) {
        this.restoreFromCheckpoint(options.checkpoint, state as UnknownRecord, stepOutputs, stepRecords, metadata);
        this.emitEvent({
          type: "checkpoint:restored",
          workflowId: workflow.id,
          runId,
          timestamp: Date.now(),
          data: { checkpointId: options.checkpoint.id },
        });
      }

      // Execute workflow graph
      const result = await this.executeGraph<TInput, TOutput, TState>(
        workflow,
        input,
        context,
        stepOutputs,
        stepRecords,
        abortController.signal,
      );

      // Emit completion event
      if (result.success) {
        this.emitEvent({
          type: "workflow:complete",
          workflowId: workflow.id,
          runId,
          timestamp: Date.now(),
          output: result.output,
          stats: result.stats,
        });
      } else if (result.status === "suspended") {
        this.emitEvent({
          type: "workflow:suspended",
          workflowId: workflow.id,
          runId,
          timestamp: Date.now(),
          data: { suspension: result.checkpoint?.suspension! },
        });
      } else {
        this.emitEvent({
          type: "workflow:failed",
          workflowId: workflow.id,
          runId,
          timestamp: Date.now(),
          data: { error: result.error! },
        });
      }

      return result;
    } catch (error) {
      if (error instanceof SuspensionError) {
        // Create checkpoint for suspension
        const checkpoint = await this.createCheckpoint(
          workflow.id,
          runId,
          "suspended",
          {},
          {},
          {},
          [],
          error.suspension,
        );

        return {
          success: false,
          status: "suspended",
          checkpoint,
          stats: this.createStats(startTime, new Map()),
          stepResults: new Map(),
        };
      }

      if (error instanceof WorkflowCancelledError) {
        this.emitEvent({
          type: "workflow:cancelled",
          workflowId: workflow.id,
          runId,
          timestamp: Date.now(),
        });

        return this.createFailedResult<TOutput>(
          { code: "WORKFLOW_CANCELLED", message: error.message },
          startTime,
          new Map(),
          "cancelled",
        );
      }

      if (error instanceof WorkflowTimeoutError) {
        return this.createFailedResult<TOutput>(
          { code: "WORKFLOW_TIMEOUT", message: error.message },
          startTime,
          new Map(),
        );
      }

      const workflowError: WorkflowError = {
        code: "EXECUTION_ERROR",
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined,
      };

      return this.createFailedResult<TOutput>(workflowError, startTime, new Map());
    } finally {
      clearTimeout(timeoutHandle);
      this.runningWorkflows.delete(runId);
    }
  }

  /**
   * Execute workflow with event streaming
   */
  async *executeWithEvents<TInput, TOutput, TState extends UnknownRecord = UnknownRecord>(
    workflow: WorkflowDefinition<TInput, TOutput, TState>,
    input: TInput,
    options: WorkflowExecutionOptions = {},
  ): AsyncGenerator<WorkflowEvent, WorkflowExecutionResult<TOutput>> {
    const events: WorkflowEvent[] = [];
    let resolveNext: ((value: WorkflowEvent | null) => void) | null = null;

    // Set up event listener
    const eventHandler = (event: WorkflowEvent) => {
      if (resolveNext) {
        resolveNext(event);
        resolveNext = null;
      } else {
        events.push(event);
      }
    };

    this.on("event", eventHandler);

    // Start execution in background
    const executionPromise = this.execute(workflow, input, {
      ...options,
      enableEvents: true,
    });

    try {
      // Yield events as they come
      let running = true;
      while (running) {
        if (events.length > 0) {
          yield events.shift()!;
        } else {
          // Wait for next event or completion
          const event = await Promise.race([
            new Promise<WorkflowEvent | null>((resolve) => {
              resolveNext = resolve;
            }),
            executionPromise.then(() => null),
          ]);

          if (event === null) {
            // Yield remaining events
            while (events.length > 0) {
              yield events.shift()!;
            }
            running = false;
          } else {
            yield event;
          }
        }
      }

      return await executionPromise;
    } finally {
      this.off("event", eventHandler);
    }
  }

  /**
   * Resume a suspended workflow from checkpoint
   */
  async resume<TOutput>(
    checkpoint: WorkflowCheckpoint,
    resumeData?: Record<string, unknown>,
  ): Promise<WorkflowExecutionResult<TOutput>> {
    // Load workflow definition from registry
    const workflow = WorkflowRegistry.get(checkpoint.workflowId);

    if (!workflow) {
      return {
        success: false,
        status: "failed",
        error: {
          code: "WORKFLOW_NOT_FOUND",
          message: `Workflow ${checkpoint.workflowId} not found in registry. Cannot resume.`,
        },
        stats: {
          totalSteps: 0,
          completedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          startTime: Date.now(),
          retryCount: 0,
        },
        stepResults: new Map(),
      };
    }

    // Emit resumed event
    this.emitEvent({
      type: "workflow:resumed",
      workflowId: checkpoint.workflowId,
      runId: checkpoint.runId,
      timestamp: Date.now(),
      data: { checkpointId: checkpoint.id },
    });

    // Merge resume data into checkpoint state
    const updatedCheckpoint: WorkflowCheckpoint = {
      ...checkpoint,
      state: { ...checkpoint.state, ...resumeData },
      suspension: undefined,
      status: "running",
    };

    // Delete old checkpoint
    await this.stateManager.deleteCheckpoint(checkpoint.id);

    // Re-execute the workflow from the checkpoint
    // The execute method will restore state from the checkpoint
    return this.execute(
      workflow as WorkflowDefinition<unknown, TOutput, UnknownRecord>,
      updatedCheckpoint.state as unknown, // Use checkpoint state as input for resumption
      {
        runId: checkpoint.runId,
        checkpoint: updatedCheckpoint,
        initialState: updatedCheckpoint.state,
      },
    );
  }

  /**
   * Cancel a running workflow
   */
  cancel(runId: string): boolean {
    const controller = this.runningWorkflows.get(runId);
    if (controller) {
      controller.abort(new WorkflowCancelledError("unknown", runId));
      return true;
    }
    return false;
  }

  /**
   * Check if a workflow is running
   */
  isRunning(runId: string): boolean {
    return this.runningWorkflows.has(runId);
  }

  /**
   * Get the state manager
   */
  getStateManager(): WorkflowStateManager {
    return this.stateManager;
  }

  // ==========================================
  // Private execution methods
  // ==========================================

  /**
   * Execute the workflow graph
   */
  private async executeGraph<TInput, TOutput, TState extends UnknownRecord>(
    workflow: WorkflowDefinition<TInput, TOutput, TState>,
    input: TInput,
    context: WorkflowContext<TState>,
    stepOutputs: Map<string, unknown>,
    stepRecords: Map<string, StepExecutionRecord>,
    signal: AbortSignal,
  ): Promise<WorkflowExecutionResult<TOutput>> {
    const { graph, steps } = workflow;
    const pendingSteps = new Set<string>([graph.entryPoint]);
    const completedSteps = new Set<string>();

    let running = true;
    while (running && pendingSteps.size > 0) {
      // Check for cancellation
      if (signal.aborted) {
        throw signal.reason;
      }

      // Get next batch of steps to execute
      const readySteps = this.getReadySteps(pendingSteps, completedSteps, graph.edges, workflow);

      if (readySteps.length === 0) {
        // No steps ready but pending exist - likely a cycle or missing dependency
        running = false;
        continue;
      }

      // Check if any ready steps are part of a parallel group
      const parallelGroup = this.findParallelGroup(readySteps, graph.parallelGroups);

      if (parallelGroup && parallelGroup.steps.every((s) => readySteps.includes(s) || completedSteps.has(s))) {
        // Execute parallel group
        const groupSteps = parallelGroup.steps.filter((s) => !completedSteps.has(s));
        await this.executeParallelSteps(
          groupSteps,
          workflow,
          input,
          context,
          stepOutputs,
          stepRecords,
          signal,
          parallelGroup,
        );

        for (const stepId of groupSteps) {
          pendingSteps.delete(stepId);
          completedSteps.add(stepId);
        }
      } else {
        // Execute single step
        const stepId = readySteps[0];
        const stepDef = steps.get(stepId);

        if (!stepDef) {
          throw new Error(`Step ${stepId} not found in workflow`);
        }

        // Check for loops
        const loop = this.findLoopForStep(stepId, graph.loops);
        if (loop) {
          await this.executeLoop(loop, workflow, input, context, stepOutputs, stepRecords, signal);
          for (const loopStepId of loop.steps) {
            completedSteps.add(loopStepId);
            pendingSteps.delete(loopStepId);
          }
        } else {
          // Check for conditional branches
          const branch = this.findBranchFromStep(stepId, graph.branches);
          if (branch && completedSteps.has(branch.fromStep)) {
            const targetStepId = await this.evaluateBranch(branch, context);
            if (targetStepId && targetStepId !== stepId) {
              // Skip to branch target
              pendingSteps.delete(stepId);
              pendingSteps.add(targetStepId);
              continue;
            }
          }

          // Determine input for this step: use previous step's output if available
          const stepInput = this.getStepInput(stepId, input, stepOutputs, graph.edges);

          // Execute single step
          await this.executeStep(
            stepId,
            stepDef,
            workflow,
            stepInput as TInput,
            context,
            stepOutputs,
            stepRecords,
            signal,
          );
          pendingSteps.delete(stepId);
          completedSteps.add(stepId);
        }
      }

      // Add next steps to pending
      const completedArray = Array.from(completedSteps);
      const nextSteps = this.getNextSteps(completedArray, graph.edges, completedSteps);
      for (const nextStep of nextSteps) {
        if (!completedSteps.has(nextStep) && !pendingSteps.has(nextStep)) {
          pendingSteps.add(nextStep);
        }
      }
    }

    // Determine final output
    const lastStepId = this.findLastStep(completedSteps, graph.edges);
    const output = lastStepId ? (stepOutputs.get(lastStepId) as TOutput) : undefined;

    // Validate output if schema provided
    if (workflow.outputSchema && output !== undefined) {
      const validation = workflow.outputSchema.safeParse(output);
      if (!validation.success) {
        return this.createFailedResult<TOutput>(
          {
            code: "OUTPUT_VALIDATION_FAILED",
            message: `Output validation failed: ${validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
          },
          context.metadata.startTime,
          stepRecords,
        );
      }
    }

    return {
      success: true,
      status: "completed",
      output,
      stats: this.createStats(context.metadata.startTime, stepRecords),
      stepResults: stepRecords,
    };
  }

  /**
   * Execute a single step
   */
  // eslint-disable-next-line max-params
  private async executeStep<TInput, TOutput, TState extends UnknownRecord>(
    stepId: string,
    stepDef: StepDefinition,
    workflow: WorkflowDefinition<TInput, TOutput, TState>,
    workflowInput: TInput,
    context: WorkflowContext<TState>,
    stepOutputs: Map<string, unknown>,
    stepRecords: Map<string, StepExecutionRecord>,
    signal: AbortSignal,
  ): Promise<void> {
    // Check for cancellation
    if (signal.aborted) {
      throw signal.reason;
    }

    const startTime = Date.now();

    // Emit step start event
    this.emitEvent({
      type: "step:start",
      workflowId: workflow.id,
      runId: context.runId,
      timestamp: startTime,
      stepId,
      stepName: stepDef.name,
      input: workflowInput,
    });

    // Update context metadata
    context.metadata.currentStepId = stepId;

    try {
      // Create step instance and execute
      const step = new Step(stepDef);
      // Cast context to the expected type for Step execution
      const result = await step.execute(workflowInput as unknown, context as WorkflowContext);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Record step execution
      const record: StepExecutionRecord = {
        stepId,
        status: result.success ? "completed" : "failed",
        input: workflowInput,
        output: result.data,
        error: result.error,
        metadata: {
          startTime,
          endTime,
          duration,
          retryCount: result.metadata?.retryCount ?? 0,
        },
        attempts: result.metadata?.retryCount ?? 1,
      };
      stepRecords.set(stepId, record);

      if (result.success) {
        stepOutputs.set(stepId, result.data);
        context.metadata.completedSteps.push(stepId);

        this.emitEvent({
          type: "step:complete",
          workflowId: workflow.id,
          runId: context.runId,
          timestamp: endTime,
          stepId,
          stepName: stepDef.name,
          output: result.data,
          duration,
        });
      } else if (result.suspend) {
        // Handle suspension request
        record.status = "suspended";
        context.metadata.suspendedAt = Date.now();

        this.emitEvent({
          type: "step:suspended",
          workflowId: workflow.id,
          runId: context.runId,
          timestamp: Date.now(),
          stepId,
          stepName: stepDef.name,
          suspension: result.suspend,
        });

        throw new SuspensionError(result.suspend);
      } else {
        context.metadata.failedSteps.push(stepId);

        this.emitEvent({
          type: "step:failed",
          workflowId: workflow.id,
          runId: context.runId,
          timestamp: endTime,
          stepId,
          stepName: stepDef.name,
          error: result.error!,
          willRetry: false,
        });

        throw new Error(`Step ${stepId} failed: ${result.error?.message}`);
      }
    } catch (error) {
      if (error instanceof SuspensionError) {
        throw error;
      }

      const record: StepExecutionRecord = {
        stepId,
        status: "failed",
        input: workflowInput,
        error: {
          code: "STEP_EXECUTION_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
        metadata: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
        },
        attempts: 1,
      };
      stepRecords.set(stepId, record);
      context.metadata.failedSteps.push(stepId);

      throw error;
    }
  }

  /**
   * Execute steps in parallel
   */
  // eslint-disable-next-line max-params
  private async executeParallelSteps<TInput, TOutput, TState extends UnknownRecord>(
    stepIds: string[],
    workflow: WorkflowDefinition<TInput, TOutput, TState>,
    workflowInput: TInput,
    context: WorkflowContext<TState>,
    stepOutputs: Map<string, unknown>,
    stepRecords: Map<string, StepExecutionRecord>,
    signal: AbortSignal,
    group: ParallelGroup,
  ): Promise<void> {
    const limit = pLimit(this.parallelConcurrency);

    this.emitEvent({
      type: "parallel:start",
      workflowId: workflow.id,
      runId: context.runId,
      timestamp: Date.now(),
      data: { groupId: group.id, steps: stepIds },
    });

    const tasks = stepIds.map((stepId) => {
      const stepDef = workflow.steps.get(stepId);
      if (!stepDef) {
        throw new Error(`Step ${stepId} not found in workflow`);
      }

      return limit(async () => {
        try {
          await this.executeStep(stepId, stepDef, workflow, workflowInput, context, stepOutputs, stepRecords, signal);
          return { stepId, success: true };
        } catch (error) {
          if (!group.continueOnError) {
            throw error;
          }
          return { stepId, success: false, error };
        }
      });
    });

    if (group.waitFor === "any") {
      await Promise.race(tasks);
    } else {
      await Promise.all(tasks);
    }

    this.emitEvent({
      type: "parallel:complete",
      workflowId: workflow.id,
      runId: context.runId,
      timestamp: Date.now(),
      data: { groupId: group.id },
    });
  }

  /**
   * Execute a loop
   */
  // eslint-disable-next-line max-params
  private async executeLoop<TInput, TOutput, TState extends UnknownRecord>(
    loop: LoopDefinition,
    workflow: WorkflowDefinition<TInput, TOutput, TState>,
    workflowInput: TInput,
    context: WorkflowContext<TState>,
    stepOutputs: Map<string, unknown>,
    stepRecords: Map<string, StepExecutionRecord>,
    signal: AbortSignal,
  ): Promise<void> {
    const maxIterations = loop.maxIterations ?? 1000;
    let iteration = 0;

    switch (loop.type) {
      case "forEach": {
        // For forEach, get items from loop definition or evaluate expression from context
        let items: unknown[] = [];
        if (loop.items && Array.isArray(loop.items)) {
          // Use static items array from loop definition
          items = loop.items;
        } else if (loop.itemsExpression) {
          // Evaluate expression to get items from context
          const evaluated = this.evaluateExpression(loop.itemsExpression, context);
          if (Array.isArray(evaluated)) {
            items = evaluated;
          } else {
            globalLogger.warn(`[WorkflowExecutor] forEach itemsExpression did not evaluate to array`, {
              loopId: loop.id,
              expression: loop.itemsExpression,
              evaluatedType: typeof evaluated,
            });
          }
        }
        for (const item of items) {
          if (iteration >= maxIterations) {
            break;
          }
          if (signal.aborted) {
            throw signal.reason;
          }

          this.emitEvent({
            type: "loop:iteration",
            workflowId: workflow.id,
            runId: context.runId,
            timestamp: Date.now(),
            data: { loopId: loop.id, iteration, item },
          });

          // Execute loop steps with item as input
          for (const stepId of loop.steps) {
            const stepDef = workflow.steps.get(stepId);
            if (stepDef) {
              await this.executeStep(
                stepId,
                stepDef,
                workflow,
                item as TInput,
                context,
                stepOutputs,
                stepRecords,
                signal,
              );
            }
          }

          iteration++;
        }
        break;
      }

      case "doWhile": {
        let shouldContinue = true;
        while (shouldContinue) {
          if (iteration >= maxIterations) {
            break;
          }
          if (signal.aborted) {
            throw signal.reason;
          }

          this.emitEvent({
            type: "loop:iteration",
            workflowId: workflow.id,
            runId: context.runId,
            timestamp: Date.now(),
            data: { loopId: loop.id, iteration },
          });

          // Execute loop steps
          for (const stepId of loop.steps) {
            const stepDef = workflow.steps.get(stepId);
            if (stepDef) {
              await this.executeStep(
                stepId,
                stepDef,
                workflow,
                workflowInput,
                context,
                stepOutputs,
                stepRecords,
                signal,
              );
            }
          }

          iteration++;

          // Evaluate condition - cast context for condition evaluation
          shouldContinue = loop.condition?.evaluate ? await loop.condition.evaluate(context as WorkflowContext) : false;
        }
        break;
      }

      case "doUntil": {
        let shouldStop = false;
        while (!shouldStop) {
          if (iteration >= maxIterations) {
            break;
          }
          if (signal.aborted) {
            throw signal.reason;
          }

          this.emitEvent({
            type: "loop:iteration",
            workflowId: workflow.id,
            runId: context.runId,
            timestamp: Date.now(),
            data: { loopId: loop.id, iteration },
          });

          // Execute loop steps
          for (const stepId of loop.steps) {
            const stepDef = workflow.steps.get(stepId);
            if (stepDef) {
              await this.executeStep(
                stepId,
                stepDef,
                workflow,
                workflowInput,
                context,
                stepOutputs,
                stepRecords,
                signal,
              );
            }
          }

          iteration++;

          // Evaluate condition (stop when true) - cast context for condition evaluation
          shouldStop = loop.condition?.evaluate ? await loop.condition.evaluate(context as WorkflowContext) : true;
        }
        break;
      }

      case "repeat": {
        const repeatCount = loop.iterations ?? 1;
        for (let i = 0; i < repeatCount && i < maxIterations; i++) {
          if (signal.aborted) {
            throw signal.reason;
          }

          this.emitEvent({
            type: "loop:iteration",
            workflowId: workflow.id,
            runId: context.runId,
            timestamp: Date.now(),
            data: { loopId: loop.id, iteration: i },
          });

          // Execute loop steps
          for (const stepId of loop.steps) {
            const stepDef = workflow.steps.get(stepId);
            if (stepDef) {
              await this.executeStep(
                stepId,
                stepDef,
                workflow,
                workflowInput,
                context,
                stepOutputs,
                stepRecords,
                signal,
              );
            }
          }

          iteration++;
        }
        break;
      }
    }

    this.emitEvent({
      type: "loop:complete",
      workflowId: workflow.id,
      runId: context.runId,
      timestamp: Date.now(),
      data: { loopId: loop.id, iterations: iteration },
    });
  }

  /**
   * Evaluate a conditional branch
   */
  private async evaluateBranch<TState extends UnknownRecord>(
    branch: ConditionalBranch,
    context: WorkflowContext<TState>,
  ): Promise<string | undefined> {
    for (const branchOption of branch.branches) {
      if (branchOption.condition.type === "always") {
        return branchOption.targetStep;
      }

      if (branchOption.condition.evaluate) {
        // Cast context for condition evaluation
        const result = await branchOption.condition.evaluate(context as WorkflowContext);
        if (result) {
          this.emitEvent({
            type: "branch:evaluated",
            workflowId: context.workflowId,
            runId: context.runId,
            timestamp: Date.now(),
            data: {
              branchId: branch.id,
              selectedTarget: branchOption.targetStep,
              label: branchOption.label,
            },
          });
          return branchOption.targetStep;
        }
      }
    }

    // Return default target if no conditions match
    if (branch.defaultTarget) {
      this.emitEvent({
        type: "branch:evaluated",
        workflowId: context.workflowId,
        runId: context.runId,
        timestamp: Date.now(),
        data: {
          branchId: branch.id,
          selectedTarget: branch.defaultTarget,
          label: "default",
        },
      });
      return branch.defaultTarget;
    }

    return undefined;
  }

  // ==========================================
  // Helper methods
  // ==========================================

  /**
   * Create workflow context
   */
  private createContext<TState extends UnknownRecord>(
    workflowId: string,
    workflowName: string,
    runId: string,
    state: TState,
    stepOutputs: Map<string, unknown>,
    metadata: WorkflowMetadata,
  ): WorkflowContext<TState> {
    const logger: WorkflowLogger = {
      debug: (message, meta) => globalLogger.debug(`[${workflowId}:${runId}] ${message}`, meta),
      info: (message, meta) => globalLogger.info(`[${workflowId}:${runId}] ${message}`, meta),
      warn: (message, meta) => globalLogger.warn(`[${workflowId}:${runId}] ${message}`, meta),
      error: (message, meta) => globalLogger.error(`[${workflowId}:${runId}] ${message}`, meta),
    };

    return {
      workflowId,
      workflowName,
      runId,
      state,
      stepOutputs,
      getStepOutput: <T>(stepId: string) => stepOutputs.get(stepId) as T | undefined,
      updateState: (updates: Partial<TState>) => {
        Object.assign(state as object, updates);
      },
      suspend: (request: SuspensionRequest): never => {
        throw new SuspensionError(request);
      },
      neurolink: this.neurolink,
      logger,
      metadata,
    };
  }

  /**
   * Get steps that are ready to execute
   */
  private getReadySteps<TInput, TOutput, TState extends UnknownRecord>(
    pending: Set<string>,
    completed: Set<string>,
    edges: { from: string; to: string }[],
    _workflow: WorkflowDefinition<TInput, TOutput, TState>,
  ): string[] {
    const ready: string[] = [];
    const pendingArray = Array.from(pending);

    for (const stepId of pendingArray) {
      // Check if all dependencies are satisfied
      const dependencies = edges.filter((e) => e.to === stepId).map((e) => e.from);

      // If no dependencies or all dependencies are complete
      if (dependencies.length === 0 || dependencies.every((d) => completed.has(d))) {
        ready.push(stepId);
      }
    }

    return ready;
  }

  /**
   * Get the input for a step based on the workflow graph
   *
   * If the step has a dependency (incoming edge), use the output from the previous step.
   * Otherwise, use the original workflow input.
   */
  private getStepInput<TInput>(
    stepId: string,
    workflowInput: TInput,
    stepOutputs: Map<string, unknown>,
    edges: { from: string; to: string }[],
  ): unknown {
    // Find incoming edges to this step (dependencies)
    const incomingEdges = edges.filter((e) => e.to === stepId);

    if (incomingEdges.length === 0) {
      // Entry point step - use workflow input
      return workflowInput;
    }

    if (incomingEdges.length === 1) {
      // Single dependency - use the output from the previous step
      const previousStepId = incomingEdges[0].from;
      const previousOutput = stepOutputs.get(previousStepId);
      // If previous step has output, use it; otherwise fall back to workflow input
      return previousOutput !== undefined ? previousOutput : workflowInput;
    }

    // Multiple dependencies (parallel merge) - collect all outputs
    const mergedOutputs: Record<string, unknown> = {};
    for (const edge of incomingEdges) {
      const output = stepOutputs.get(edge.from);
      if (output !== undefined) {
        mergedOutputs[edge.from] = output;
      }
    }

    // Return merged outputs if any, otherwise workflow input
    return Object.keys(mergedOutputs).length > 0 ? mergedOutputs : workflowInput;
  }

  /**
   * Get next steps after completion
   */
  private getNextSteps(
    completed: string[],
    edges: { from: string; to: string }[],
    allCompleted: Set<string>,
  ): string[] {
    const next = new Set<string>();

    for (const stepId of completed) {
      const outgoing = edges.filter((e) => e.from === stepId);
      for (const edge of outgoing) {
        if (!allCompleted.has(edge.to)) {
          next.add(edge.to);
        }
      }
    }

    return Array.from(next);
  }

  /**
   * Find parallel group containing steps
   */
  private findParallelGroup(stepIds: string[], groups?: ParallelGroup[]): ParallelGroup | undefined {
    if (!groups) {
      return undefined;
    }

    for (const group of groups) {
      if (stepIds.some((s) => group.steps.includes(s))) {
        return group;
      }
    }

    return undefined;
  }

  /**
   * Find loop containing step
   */
  private findLoopForStep(stepId: string, loops?: LoopDefinition[]): LoopDefinition | undefined {
    if (!loops) {
      return undefined;
    }

    for (const loop of loops) {
      if (loop.steps.includes(stepId) && loop.steps[0] === stepId) {
        return loop;
      }
    }

    return undefined;
  }

  /**
   * Find branch from step
   */
  private findBranchFromStep(stepId: string, branches?: ConditionalBranch[]): ConditionalBranch | undefined {
    if (!branches) {
      return undefined;
    }

    return branches.find((b) => b.fromStep === stepId || b.branches.some((opt) => opt.targetStep === stepId));
  }

  /**
   * Find the last step in completed set
   *
   * Priority:
   * 1. Steps with no outgoing edges (true terminal steps)
   * 2. Steps that only lead to incomplete steps
   */
  private findLastStep(completed: Set<string>, edges: { from: string; to: string }[]): string | undefined {
    const completedArray = Array.from(completed);

    // Priority 1: Find true terminal steps (no outgoing edges at all)
    // These are the actual end of the workflow
    for (const stepId of completedArray) {
      // Skip merge and end helper steps
      if (stepId.startsWith("merge-") || stepId.startsWith("end-")) {
        continue;
      }
      const outgoing = edges.filter((e) => e.from === stepId);
      if (outgoing.length === 0) {
        return stepId;
      }
    }

    // Priority 2: Find steps whose outgoing edges all lead to non-completed steps
    // (excluding merge/end helper steps from being returned)
    for (const stepId of completedArray) {
      // Skip merge and end helper steps
      if (stepId.startsWith("merge-") || stepId.startsWith("end-")) {
        continue;
      }
      const outgoing = edges.filter((e) => e.from === stepId);
      if (outgoing.every((e) => !completed.has(e.to))) {
        return stepId;
      }
    }

    // Fallback: return any non-merge/end step (last one in the array)
    for (let i = completedArray.length - 1; i >= 0; i--) {
      const stepId = completedArray[i];
      if (!stepId.startsWith("merge-") && !stepId.startsWith("end-")) {
        return stepId;
      }
    }

    return undefined;
  }

  /**
   * Create a checkpoint
   */
  // eslint-disable-next-line max-params
  private async createCheckpoint(
    workflowId: string,
    runId: string,
    status: WorkflowStatus,
    state: Record<string, unknown>,
    stepOutputs: Record<string, unknown>,
    stepRecords: Record<string, StepExecutionRecord>,
    pendingSteps: string[],
    suspension?: SuspensionRequest,
  ): Promise<WorkflowCheckpoint> {
    const checkpoint: WorkflowCheckpoint = {
      id: randomUUID(),
      workflowId,
      runId,
      timestamp: Date.now(),
      status,
      state,
      stepOutputs,
      stepRecords,
      pendingSteps,
      suspension,
      version: CHECKPOINT_VERSION,
    };

    await this.stateManager.saveCheckpoint(checkpoint);

    this.emitEvent({
      type: "checkpoint:created",
      workflowId,
      runId,
      timestamp: Date.now(),
      data: { checkpointId: checkpoint.id },
    });

    return checkpoint;
  }

  /**
   * Restore from checkpoint
   */
  private restoreFromCheckpoint(
    checkpoint: WorkflowCheckpoint,
    state: Record<string, unknown>,
    stepOutputs: Map<string, unknown>,
    stepRecords: Map<string, StepExecutionRecord>,
    metadata: WorkflowMetadata,
  ): void {
    // Restore state
    Object.assign(state, checkpoint.state);

    // Restore step outputs
    for (const [stepId, output] of Object.entries(checkpoint.stepOutputs)) {
      stepOutputs.set(stepId, output);
    }

    // Restore step records
    for (const [stepId, record] of Object.entries(checkpoint.stepRecords)) {
      stepRecords.set(stepId, record);
    }

    // Update metadata
    metadata.completedSteps = Object.keys(checkpoint.stepRecords).filter(
      (id) => checkpoint.stepRecords[id].status === "completed",
    );
    metadata.failedSteps = Object.keys(checkpoint.stepRecords).filter(
      (id) => checkpoint.stepRecords[id].status === "failed",
    );
    metadata.resumedAt = Date.now();
  }

  /**
   * Create workflow stats
   */
  private createStats(startTime: number, stepRecords: Map<string, StepExecutionRecord>): WorkflowStats {
    const endTime = Date.now();
    let completedSteps = 0;
    let failedSteps = 0;
    let skippedSteps = 0;
    let totalTokens = 0;
    let retryCount = 0;

    const records = Array.from(stepRecords.values());
    for (const record of records) {
      switch (record.status) {
        case "completed":
          completedSteps++;
          break;
        case "failed":
          failedSteps++;
          break;
        case "skipped":
          skippedSteps++;
          break;
      }
      if (record.metadata.tokensUsed) {
        totalTokens += record.metadata.tokensUsed;
      }
      if (record.metadata.retryCount) {
        retryCount += record.metadata.retryCount;
      }
    }

    return {
      totalSteps: stepRecords.size,
      completedSteps,
      failedSteps,
      skippedSteps,
      startTime,
      endTime,
      duration: endTime - startTime,
      totalTokensUsed: totalTokens > 0 ? totalTokens : undefined,
      retryCount,
    };
  }

  /**
   * Create a failed result
   */
  private createFailedResult<TOutput>(
    error: WorkflowError,
    startTime: number,
    stepRecords: Map<string, StepExecutionRecord>,
    status: WorkflowStatus = "failed",
  ): WorkflowExecutionResult<TOutput> {
    return {
      success: false,
      status,
      error,
      stats: this.createStats(startTime, stepRecords),
      stepResults: stepRecords,
    };
  }

  /**
   * Evaluate a simple expression against the workflow context
   *
   * Supports dot-notation paths like:
   * - "state.items" - gets context.state.items
   * - "stepOutputs.fetchData" - gets output from fetchData step
   *
   * @param expression - The expression to evaluate
   * @param context - The workflow context
   * @returns The evaluated value, or undefined if not found
   */
  private evaluateExpression<TState extends UnknownRecord>(
    expression: string,
    context: WorkflowContext<TState>,
  ): unknown {
    // Handle simple dot-notation expressions
    const parts = expression.split(".");
    let value: unknown = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (value instanceof Map) {
        // For Maps, skip 'get' keyword and use the part as the key directly
        if (part !== "get") {
          value = value.get(part);
        }
        // If part === "get", skip it and continue to next part
      } else if (typeof value === "object" && part in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Emit a workflow event
   */
  private emitEvent(event: WorkflowEvent): void {
    this.emit("event", event);
  }
}
