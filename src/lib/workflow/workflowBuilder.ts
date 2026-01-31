/**
 * WorkflowBuilder - Fluent API for constructing workflows
 *
 * Provides Mastra-style builder methods for creating workflows:
 * - .step() / .then() for sequential execution
 * - .parallel() for concurrent execution
 * - .branch() for conditional paths
 * - .forEach() / .doWhile() / .doUntil() for loops
 *
 * @module workflow/workflowBuilder
 */

import { randomUUID } from "crypto";
import type { z } from "zod";
import type {
  ConditionalBranch,
  LoopDefinition,
  ParallelGroup,
  StepDefinition,
  StepResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowGraph,
} from "../types/workflowTypes.js";
import {
  type AIStepConfig,
  aiStep,
  type ConditionStepConfig,
  conditionStep,
  type HumanStepConfig,
  httpStep,
  humanStep,
  type ToolStepConfig,
  toolStep,
  transformStep,
  validateStep,
} from "./stepHelpers.js";
import type { WorkflowDefinition as LocalWorkflowDefinition } from "./types/workflowTypes.js";
import { WorkflowRegistry } from "./workflowRegistry.js";

/**
 * WorkflowBuilder - Fluent API for constructing workflows
 *
 * @typeParam TInput - The type of input the workflow accepts
 * @typeParam TOutput - The type of output the workflow produces
 * @typeParam TState - The type of the workflow's global state
 *
 * @example
 * ```typescript
 * const workflow = new WorkflowBuilder("data-pipeline")
 *   .name("Data Processing Pipeline")
 *   .input(z.object({ url: z.string() }))
 *   .output(z.object({ summary: z.string() }))
 *   .step("fetch", {
 *     execute: async (input, ctx) => {
 *       const data = await fetch(input.url);
 *       return { success: true, data: await data.json() };
 *     }
 *   })
 *   .then("process", {
 *     execute: async (input, ctx) => {
 *       const fetchOutput = ctx.getStepOutput<{ data: any }>("fetch");
 *       return { success: true, data: processed };
 *     }
 *   })
 *   .parallel([
 *     { id: "analyze", execute: analyzeData },
 *     { id: "validate", execute: validateData }
 *   ])
 *   .then("summarize", {
 *     execute: async (input, ctx) => {
 *       const result = await ctx.neurolink.generate({
 *         input: { text: "Summarize: " + JSON.stringify(input) },
 *         provider: "openai"
 *       });
 *       return { success: true, data: { summary: result.content } };
 *     }
 *   })
 *   .build();
 * ```
 */
export class WorkflowBuilder<TInput = unknown, TOutput = unknown, TState = Record<string, unknown>> {
  private workflowId: string;
  private workflowName: string;
  private workflowDescription?: string;
  private workflowVersion?: string;
  private inputSchema?: z.ZodSchema<TInput>;
  private outputSchema?: z.ZodSchema<TOutput>;
  private initialStateFactory?: () => TState;
  private steps: Map<string, StepDefinition> = new Map();
  private edges: WorkflowEdge[] = [];
  private parallelGroups: ParallelGroup[] = [];
  private branches: ConditionalBranch[] = [];
  private loops: LoopDefinition[] = [];
  private entryPoint?: string;
  private currentStepId?: string;
  private workflowTimeout?: number;
  private workflowTags: string[] = [];

  /**
   * Create a new WorkflowBuilder
   *
   * @param workflowId - Unique identifier for the workflow
   */
  constructor(workflowId: string) {
    this.workflowId = workflowId;
    this.workflowName = workflowId;
  }

  /**
   * Set workflow name
   */
  name(name: string): this {
    this.workflowName = name;
    return this;
  }

  /**
   * Set workflow description
   */
  describe(description: string): this {
    this.workflowDescription = description;
    return this;
  }

  /**
   * Set workflow version
   */
  setVersion(version: string): this {
    this.workflowVersion = version;
    return this;
  }

  /**
   * Set input schema for type inference and validation
   */
  input<T>(schema: z.ZodSchema<T>): WorkflowBuilder<T, TOutput, TState> {
    this.inputSchema = schema as unknown as z.ZodSchema<TInput>;
    return this as unknown as WorkflowBuilder<T, TOutput, TState>;
  }

  /**
   * Set output schema for type inference and validation
   */
  output<T>(schema: z.ZodSchema<T>): WorkflowBuilder<TInput, T, TState> {
    this.outputSchema = schema as unknown as z.ZodSchema<TOutput>;
    return this as unknown as WorkflowBuilder<TInput, T, TState>;
  }

  /**
   * Set initial state factory for workflow state
   */
  state<T extends Record<string, unknown>>(factory: () => T): WorkflowBuilder<TInput, TOutput, T> {
    this.initialStateFactory = factory as unknown as () => TState;
    return this as unknown as WorkflowBuilder<TInput, TOutput, T>;
  }

  /**
   * Set global timeout for the workflow
   */
  setTimeout(timeoutMs: number): this {
    this.workflowTimeout = timeoutMs;
    return this;
  }

  /**
   * Add tags for categorization
   */
  tag(...tags: string[]): this {
    this.workflowTags.push(...tags);
    return this;
  }

  /**
   * Add a step (entry point if first step)
   *
   * @param stepId - Unique identifier for the step
   * @param definition - Step definition including execute function
   */
  step<TStepInput = TInput, TStepOutput = unknown>(
    stepId: string,
    definition: Omit<StepDefinition<TStepInput, TStepOutput>, "id" | "name"> & {
      name?: string;
    },
  ): this {
    const stepDef: StepDefinition<TStepInput, TStepOutput> = {
      ...definition,
      id: stepId,
      name: definition.name ?? stepId,
    };

    this.steps.set(stepId, stepDef as StepDefinition);

    // First step becomes entry point
    if (!this.entryPoint) {
      this.entryPoint = stepId;
    }

    // Connect to previous step if exists
    if (this.currentStepId && this.currentStepId !== stepId) {
      this.edges.push({
        from: this.currentStepId,
        to: stepId,
        condition: { type: "always" },
      });
    }

    this.currentStepId = stepId;
    return this;
  }

  /**
   * Add a step that executes after the previous step (alias for step with implicit dependency)
   *
   * This method provides a more readable way to chain sequential steps.
   *
   * @param stepId - Unique identifier for the step
   * @param definition - Step definition including execute function
   *
   * @example
   * ```typescript
   * const workflow = new WorkflowBuilder("pipeline")
   *   .step("fetch", { execute: fetchData })
   *   .then("process", { execute: processData })
   *   .then("save", { execute: saveData })
   *   .build();
   * ```
   */
  then<TStepInput = unknown, TStepOutput = unknown>(
    stepId: string,
    definition: Omit<StepDefinition<TStepInput, TStepOutput>, "id" | "name"> & {
      name?: string;
    },
  ): this {
    return this.step(stepId, definition);
  }

  /**
   * Add a sequential step after current step (alias for step)
   */
  after<TStepInput = unknown, TStepOutput = unknown>(
    stepId: string,
    definition: Omit<StepDefinition<TStepInput, TStepOutput>, "id" | "name"> & {
      name?: string;
    },
  ): this {
    return this.step(stepId, definition);
  }

  /**
   * Add parallel execution group
   *
   * @param steps - Array of step definitions to execute in parallel
   * @param options - Parallel execution options
   */
  parallel(
    steps: Array<Omit<StepDefinition, "id" | "name"> & { id: string; name?: string }>,
    options: {
      waitFor?: "all" | "any";
      continueOnError?: boolean;
    } = {},
  ): this {
    const groupId = `parallel-${randomUUID().slice(0, 8)}`;
    const stepIds: string[] = [];

    // Register all parallel steps
    for (const stepDef of steps) {
      const fullDef: StepDefinition = {
        ...stepDef,
        name: stepDef.name ?? stepDef.id,
      };
      this.steps.set(stepDef.id, fullDef);
      stepIds.push(stepDef.id);

      // Connect from current step to each parallel step
      if (this.currentStepId) {
        this.edges.push({
          from: this.currentStepId,
          to: stepDef.id,
          condition: { type: "always" },
        });
      } else if (!this.entryPoint) {
        // If no entry point yet, first parallel step becomes entry point
        this.entryPoint = stepDef.id;
      }
    }

    // Create parallel group
    this.parallelGroups.push({
      id: groupId,
      steps: stepIds,
      waitFor: options.waitFor ?? "all",
      continueOnError: options.continueOnError ?? false,
    });

    // Create virtual merge point
    const mergePointId = `merge-${groupId}`;
    this.steps.set(mergePointId, {
      id: mergePointId,
      name: `Merge ${groupId}`,
      execute: async (): Promise<StepResult<null>> => ({
        success: true,
        data: null,
      }),
    });

    // Connect all parallel steps to merge point
    for (const stepId of stepIds) {
      this.edges.push({
        from: stepId,
        to: mergePointId,
        condition: { type: "always" },
      });
    }

    this.currentStepId = mergePointId;
    return this;
  }

  /**
   * Add conditional branching
   *
   * @param branches - Array of branch conditions and step definitions
   * @param defaultStep - Optional default step if no conditions match
   */
  branch(
    branches: Array<{
      condition: (context: WorkflowContext<TState>) => boolean | Promise<boolean>;
      stepId: string;
      step: Omit<StepDefinition, "id" | "name"> & { name?: string };
      label?: string;
    }>,
    defaultStep?: {
      stepId: string;
      step: Omit<StepDefinition, "id" | "name"> & { name?: string };
    },
  ): this {
    if (!this.currentStepId) {
      throw new Error("Cannot add branch without a preceding step");
    }

    const branchId = `branch-${randomUUID().slice(0, 8)}`;
    const branchDef: ConditionalBranch = {
      id: branchId,
      fromStep: this.currentStepId,
      branches: [],
    };

    // Register branch steps and create branch definitions
    for (const branch of branches) {
      const fullDef: StepDefinition = {
        ...branch.step,
        id: branch.stepId,
        name: branch.step.name ?? branch.stepId,
      };
      this.steps.set(branch.stepId, fullDef);

      branchDef.branches.push({
        condition: {
          type: "function",
          // Type assertion needed due to generic state type variance
          evaluate: branch.condition as (context: WorkflowContext) => boolean | Promise<boolean>,
        },
        targetStep: branch.stepId,
        label: branch.label,
      });
    }

    // Register default step if provided
    if (defaultStep) {
      const fullDef: StepDefinition = {
        ...defaultStep.step,
        id: defaultStep.stepId,
        name: defaultStep.step.name ?? defaultStep.stepId,
      };
      this.steps.set(defaultStep.stepId, fullDef);
      branchDef.defaultTarget = defaultStep.stepId;
    }

    this.branches.push(branchDef);

    // Create merge point for all branches
    const mergePointId = `merge-${branchId}`;
    this.steps.set(mergePointId, {
      id: mergePointId,
      name: `Merge ${branchId}`,
      execute: async (): Promise<StepResult<null>> => ({
        success: true,
        data: null,
      }),
    });

    // Connect all branch targets to merge point
    for (const branch of branches) {
      this.edges.push({
        from: branch.stepId,
        to: mergePointId,
        condition: { type: "always" },
      });
    }
    if (defaultStep) {
      this.edges.push({
        from: defaultStep.stepId,
        to: mergePointId,
        condition: { type: "always" },
      });
    }

    this.currentStepId = mergePointId;
    return this;
  }

  /**
   * Add forEach loop over collection
   *
   * @param options - Loop configuration
   * @param steps - Steps to execute in each iteration
   */
  forEach<TItem>(
    options: {
      items: (context: WorkflowContext<TState>) => TItem[] | Promise<TItem[]>;
      itemVariable?: string;
      maxIterations?: number;
    },
    steps: Array<
      Omit<StepDefinition<TItem, unknown>, "id" | "name"> & {
        id: string;
        name?: string;
      }
    >,
  ): this {
    const loopId = `foreach-${randomUUID().slice(0, 8)}`;
    const stepIds: string[] = [];

    // Register loop steps
    for (const stepDef of steps) {
      // Type assertion needed due to generic input type variance
      const fullDef: StepDefinition = {
        ...stepDef,
        name: stepDef.name ?? stepDef.id,
        execute: stepDef.execute as (input: unknown, context: WorkflowContext) => Promise<StepResult<unknown>>,
      };
      this.steps.set(stepDef.id, fullDef);
      stepIds.push(stepDef.id);
    }

    // Create loop definition
    this.loops.push({
      id: loopId,
      type: "forEach",
      steps: stepIds,
      itemVariable: options.itemVariable ?? "item",
      maxIterations: options.maxIterations ?? 1000,
    });

    // Connect from current step
    if (this.currentStepId && stepIds.length > 0) {
      this.edges.push({
        from: this.currentStepId,
        to: stepIds[0],
        condition: { type: "always" },
      });
    } else if (!this.entryPoint && stepIds.length > 0) {
      this.entryPoint = stepIds[0];
    }

    // Connect steps sequentially within loop
    for (let i = 0; i < stepIds.length - 1; i++) {
      this.edges.push({
        from: stepIds[i],
        to: stepIds[i + 1],
        condition: { type: "always" },
      });
    }

    // Create loop end point
    const loopEndId = `end-${loopId}`;
    this.steps.set(loopEndId, {
      id: loopEndId,
      name: `End ${loopId}`,
      execute: async (): Promise<StepResult<null>> => ({
        success: true,
        data: null,
      }),
    });

    if (stepIds.length > 0) {
      this.edges.push({
        from: stepIds[stepIds.length - 1],
        to: loopEndId,
        condition: { type: "always" },
      });
    }

    this.currentStepId = loopEndId;
    return this;
  }

  /**
   * Add doWhile loop (execute while condition is true)
   *
   * @param condition - Condition function that returns true to continue looping
   * @param steps - Steps to execute in each iteration
   * @param options - Loop options
   */
  doWhile(
    condition: (context: WorkflowContext<TState>) => boolean | Promise<boolean>,
    steps: Array<Omit<StepDefinition, "id" | "name"> & { id: string; name?: string }>,
    options: { maxIterations?: number } = {},
  ): this {
    const loopId = `dowhile-${randomUUID().slice(0, 8)}`;
    const stepIds: string[] = [];

    // Register loop steps
    for (const stepDef of steps) {
      const fullDef: StepDefinition = {
        ...stepDef,
        name: stepDef.name ?? stepDef.id,
      };
      this.steps.set(stepDef.id, fullDef);
      stepIds.push(stepDef.id);
    }

    // Create loop definition
    this.loops.push({
      id: loopId,
      type: "doWhile",
      steps: stepIds,
      condition: {
        type: "function",
        // Type assertion needed due to generic state type variance
        evaluate: condition as (context: WorkflowContext) => boolean | Promise<boolean>,
      },
      maxIterations: options.maxIterations ?? 100,
    });

    // Connect to loop entry
    if (this.currentStepId && stepIds.length > 0) {
      this.edges.push({
        from: this.currentStepId,
        to: stepIds[0],
        condition: { type: "always" },
      });
    } else if (!this.entryPoint && stepIds.length > 0) {
      this.entryPoint = stepIds[0];
    }

    // Connect steps sequentially within loop
    for (let i = 0; i < stepIds.length - 1; i++) {
      this.edges.push({
        from: stepIds[i],
        to: stepIds[i + 1],
        condition: { type: "always" },
      });
    }

    // Create loop end point
    const loopEndId = `end-${loopId}`;
    this.steps.set(loopEndId, {
      id: loopEndId,
      name: `End ${loopId}`,
      execute: async (): Promise<StepResult<null>> => ({
        success: true,
        data: null,
      }),
    });

    if (stepIds.length > 0) {
      this.edges.push({
        from: stepIds[stepIds.length - 1],
        to: loopEndId,
        condition: { type: "always" },
      });
    }

    this.currentStepId = loopEndId;
    return this;
  }

  /**
   * Add doUntil loop (execute until condition becomes true)
   *
   * @param condition - Condition function that returns true to stop looping
   * @param steps - Steps to execute in each iteration
   * @param options - Loop options
   */
  doUntil(
    condition: (context: WorkflowContext<TState>) => boolean | Promise<boolean>,
    steps: Array<Omit<StepDefinition, "id" | "name"> & { id: string; name?: string }>,
    options: { maxIterations?: number } = {},
  ): this {
    // doUntil is doWhile with inverted condition
    return this.doWhile(async (ctx) => !(await condition(ctx)), steps, options);
  }

  /**
   * Add a durable sleep/delay to the workflow
   *
   * Creates an internal step that waits for the specified duration before
   * continuing to the next step. This is useful for rate limiting, polling
   * intervals, or implementing retry delays.
   *
   * @param durationMs - Duration in milliseconds, or a function that returns the duration
   * @returns this - Returns the builder for method chaining
   *
   * @example
   * ```typescript
   * const workflow = createWorkflow("polling-workflow")
   *   .step("fetch", { execute: fetchData })
   *   .sleep(5000) // Wait 5 seconds
   *   .then("process", { execute: processData })
   *   .build();
   *
   * // Dynamic duration based on context
   * const workflow = createWorkflow("adaptive-workflow")
   *   .step("analyze", { execute: analyzeData })
   *   .sleep((ctx) => ctx.state.retryCount * 1000) // Exponential backoff
   *   .then("retry", { execute: retryOperation })
   *   .build();
   * ```
   */
  sleep(durationMs: number | ((ctx: WorkflowContext<TState>) => number | Promise<number>)): this {
    const sleepStepId = `sleep-${randomUUID().slice(0, 8)}`;

    const sleepStep: StepDefinition = {
      id: sleepStepId,
      name: `Sleep ${typeof durationMs === "number" ? `${durationMs}ms` : "(dynamic)"}`,
      description: "Durable delay step",
      execute: async (
        _input: unknown,
        context: WorkflowContext,
      ): Promise<{ success: boolean; data: { sleptMs: number } }> => {
        const actualDuration =
          typeof durationMs === "function" ? await durationMs(context as WorkflowContext<TState>) : durationMs;

        await new Promise<void>((resolve) => setTimeout(resolve, actualDuration));

        return {
          success: true,
          data: { sleptMs: actualDuration },
        };
      },
    };

    this.steps.set(sleepStepId, sleepStep);

    // Connect to previous step if exists
    if (this.currentStepId) {
      this.edges.push({
        from: this.currentStepId,
        to: sleepStepId,
        condition: { type: "always" },
      });
    } else if (!this.entryPoint) {
      this.entryPoint = sleepStepId;
    }

    this.currentStepId = sleepStepId;
    return this;
  }

  /**
   * Add a durable wait until a specific date/time
   *
   * Creates an internal step that waits until the specified date before
   * continuing to the next step. This is useful for scheduled operations,
   * deadline-based workflows, or time-sensitive processing.
   *
   * @param date - Target date to wait until, or a function that returns the date
   * @returns this - Returns the builder for method chaining
   *
   * @example
   * ```typescript
   * const workflow = createWorkflow("scheduled-workflow")
   *   .step("prepare", { execute: prepareData })
   *   .sleepUntil(new Date("2024-12-31T00:00:00Z")) // Wait until New Year
   *   .then("execute", { execute: executeAtMidnight })
   *   .build();
   *
   * // Dynamic date based on context
   * const workflow = createWorkflow("deadline-workflow")
   *   .step("fetch", { execute: fetchDeadline })
   *   .sleepUntil((ctx) => new Date(ctx.state.deadline))
   *   .then("notify", { execute: sendNotification })
   *   .build();
   * ```
   */
  sleepUntil(date: Date | ((ctx: WorkflowContext<TState>) => Date | Promise<Date>)): this {
    const sleepUntilStepId = `sleepUntil-${randomUUID().slice(0, 8)}`;

    const sleepUntilStep: StepDefinition = {
      id: sleepUntilStepId,
      name: `Sleep until ${date instanceof Date ? date.toISOString() : "(dynamic)"}`,
      description: "Durable wait until specific time",
      execute: async (
        _input: unknown,
        context: WorkflowContext,
      ): Promise<{
        success: boolean;
        data: { targetDate: string; sleptMs: number };
      }> => {
        const targetDate = typeof date === "function" ? await date(context as WorkflowContext<TState>) : date;

        const now = Date.now();
        const targetTime = targetDate.getTime();
        const waitMs = Math.max(0, targetTime - now);

        if (waitMs > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
        }

        return {
          success: true,
          data: {
            targetDate: targetDate.toISOString(),
            sleptMs: waitMs,
          },
        };
      },
    };

    this.steps.set(sleepUntilStepId, sleepUntilStep);

    // Connect to previous step if exists
    if (this.currentStepId) {
      this.edges.push({
        from: this.currentStepId,
        to: sleepUntilStepId,
        condition: { type: "always" },
      });
    } else if (!this.entryPoint) {
      this.entryPoint = sleepUntilStepId;
    }

    this.currentStepId = sleepUntilStepId;
    return this;
  }

  // ==========================================
  // Step Helper Methods
  // ==========================================

  /**
   * Add an AI generation step
   *
   * This is a convenience method for adding AI-powered steps that use
   * NeuroLink's generation capabilities.
   *
   * @param stepId - Unique identifier for the step
   * @param config - AI step configuration
   * @returns this - Returns the builder for method chaining
   *
   * @example
   * ```typescript
   * const workflow = createWorkflow("content-pipeline")
   *   .step("fetch", { execute: fetchData })
   *   .ai("summarize", {
   *     prompt: (input) => `Summarize: ${input.content}`,
   *     provider: "openai",
   *     model: "gpt-4",
   *   })
   *   .ai("extract-entities", {
   *     prompt: (input) => `Extract entities from: ${input}`,
   *     outputSchema: z.object({
   *       people: z.array(z.string()),
   *       places: z.array(z.string()),
   *     }),
   *   })
   *   .build();
   * ```
   */
  ai<TStepInput = unknown, TStepOutput = unknown>(
    stepId: string,
    config: Omit<AIStepConfig<TStepInput, TStepOutput>, "id">,
  ): this {
    const stepDef = aiStep({ ...config, id: stepId });
    return this.step(stepId, stepDef);
  }

  /**
   * Add a tool execution step
   *
   * This is a convenience method for adding steps that execute MCP tools
   * or built-in NeuroLink tools.
   *
   * @param stepId - Unique identifier for the step
   * @param config - Tool step configuration
   * @returns this - Returns the builder for method chaining
   *
   * @example
   * ```typescript
   * const workflow = createWorkflow("data-pipeline")
   *   .tool("read-file", {
   *     toolName: "readFile",
   *     args: (input) => ({ path: input.configPath }),
   *   })
   *   .tool("search-db", {
   *     toolName: "postgres_query",
   *     args: (input) => ({ query: `SELECT * FROM users WHERE id = ${input.userId}` }),
   *     transform: (result) => result.rows[0],
   *   })
   *   .build();
   * ```
   */
  tool<TStepInput = unknown, TStepOutput = unknown>(
    stepId: string,
    config: Omit<ToolStepConfig<TStepInput, TStepOutput>, "id">,
  ): this {
    const stepDef = toolStep({ ...config, id: stepId });
    return this.step(stepId, stepDef);
  }

  /**
   * Add a human-in-the-loop step
   *
   * This is a convenience method for adding suspension points where
   * human approval, review, or input is required.
   *
   * @param stepId - Unique identifier for the step
   * @param config - Human step configuration
   * @returns this - Returns the builder for method chaining
   *
   * @example
   * ```typescript
   * const workflow = createWorkflow("approval-workflow")
   *   .ai("analyze", { prompt: (input) => `Analyze: ${input.data}` })
   *   .human("approve", {
   *     reason: "Please review and approve the analysis",
   *     suspendData: (input, ctx) => ({
   *       analysis: ctx.getStepOutput("analyze"),
   *     }),
   *     expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
   *   })
   *   .then("finalize", { execute: finalizeData })
   *   .build();
   * ```
   */
  human<TStepInput = unknown, TStepOutput = unknown>(
    stepId: string,
    config: Omit<HumanStepConfig<TStepInput, TStepOutput>, "id">,
  ): this {
    const stepDef = humanStep({ ...config, id: stepId });
    return this.step(stepId, stepDef);
  }

  /**
   * Add a condition evaluation step
   *
   * This is a convenience method for adding steps that evaluate conditions
   * and store the result in the workflow state.
   *
   * @param stepId - Unique identifier for the step
   * @param config - Condition step configuration
   * @returns this - Returns the builder for method chaining
   *
   * @example
   * ```typescript
   * const workflow = createWorkflow("conditional-workflow")
   *   .step("analyze", { execute: analyzeData })
   *   .condition("check-threshold", {
   *     condition: (input, ctx) => {
   *       const result = ctx.getStepOutput<{ score: number }>("analyze");
   *       return result?.score > 0.8;
   *     },
   *   })
   *   .branch([
   *     {
   *       condition: (ctx) => ctx.getStepOutput("check-threshold")?.result === true,
   *       stepId: "high-score",
   *       step: { execute: handleHighScore },
   *     },
   *   ], {
   *     stepId: "low-score",
   *     step: { execute: handleLowScore },
   *   })
   *   .build();
   * ```
   */
  condition<TStepInput = unknown>(stepId: string, config: Omit<ConditionStepConfig<TStepInput>, "id">): this {
    const stepDef = conditionStep({ ...config, id: stepId });
    return this.step(stepId, stepDef);
  }

  /**
   * Add a transformation step
   *
   * This is a convenience method for adding simple data transformation steps.
   *
   * @param stepId - Unique identifier for the step
   * @param transform - Transformation function
   * @param options - Optional configuration
   * @returns this - Returns the builder for method chaining
   *
   * @example
   * ```typescript
   * const workflow = createWorkflow("data-pipeline")
   *   .step("fetch", { execute: fetchData })
   *   .transform("parse", (input) => JSON.parse(input.rawData))
   *   .transform("enrich", async (input, ctx) => ({
   *     ...input,
   *     extra: ctx.getStepOutput("lookup"),
   *   }))
   *   .build();
   * ```
   */
  transform<TStepInput = unknown, TStepOutput = unknown>(
    stepId: string,
    transformFn: (input: TStepInput, context: WorkflowContext<TState>) => TStepOutput | Promise<TStepOutput>,
    options: { name?: string; description?: string; tags?: string[] } = {},
  ): this {
    const stepDef = transformStep({
      id: stepId,
      name: options.name,
      description: options.description,
      tags: options.tags,
      transform: transformFn as (input: unknown, context: WorkflowContext) => unknown | Promise<unknown>,
    });
    return this.step(stepId, stepDef);
  }

  /**
   * Add a validation step
   *
   * This is a convenience method for adding input validation steps
   * using Zod schemas.
   *
   * @param stepId - Unique identifier for the step
   * @param schema - Zod schema for validation
   * @param options - Optional configuration
   * @returns this - Returns the builder for method chaining
   *
   * @example
   * ```typescript
   * const workflow = createWorkflow("user-registration")
   *   .validate("validate-input", z.object({
   *     email: z.string().email(),
   *     name: z.string().min(2),
   *     age: z.number().min(18),
   *   }))
   *   .then("create-user", { execute: createUser })
   *   .build();
   * ```
   */
  validate<T>(
    stepId: string,
    schema: z.ZodSchema<T>,
    options: { name?: string; description?: string; tags?: string[] } = {},
  ): this {
    const stepDef = validateStep({
      id: stepId,
      name: options.name,
      description: options.description,
      tags: options.tags,
      schema,
    });
    return this.step(stepId, stepDef);
  }

  /**
   * Add an HTTP request step
   *
   * This is a convenience method for adding HTTP request steps.
   *
   * @param stepId - Unique identifier for the step
   * @param config - HTTP step configuration
   * @returns this - Returns the builder for method chaining
   *
   * @example
   * ```typescript
   * const workflow = createWorkflow("api-integration")
   *   .http("fetch-user", {
   *     method: "GET",
   *     url: (input) => `https://api.example.com/users/${input.userId}`,
   *     headers: { Authorization: "Bearer token" },
   *   })
   *   .http("update-record", {
   *     method: "POST",
   *     url: "https://api.example.com/records",
   *     body: (input, ctx) => JSON.stringify({
   *       user: ctx.getStepOutput("fetch-user"),
   *       action: input.action,
   *     }),
   *     headers: { "Content-Type": "application/json" },
   *   })
   *   .build();
   * ```
   */
  http<TStepInput = unknown, TStepOutput = unknown>(
    stepId: string,
    config: {
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      url: string | ((input: TStepInput, context: WorkflowContext<TState>) => string);
      headers?:
        | Record<string, string>
        | ((
            input: TStepInput,
            context: WorkflowContext<TState>,
          ) => Record<string, string> | Promise<Record<string, string>>);
      body?: string | ((input: TStepInput, context: WorkflowContext<TState>) => string | Promise<string> | BodyInit);
      transform?: (
        response: Response,
        input: TStepInput,
        context: WorkflowContext<TState>,
      ) => TStepOutput | Promise<TStepOutput>;
      timeout?: number;
      retry?: {
        maxAttempts?: number;
        initialDelayMs?: number;
        maxDelayMs?: number;
        backoffMultiplier?: number;
      };
      name?: string;
      description?: string;
      tags?: string[];
    },
  ): this {
    const stepDef = httpStep({
      id: stepId,
      ...config,
      // Type assertions needed due to generic context type variance
      url: config.url as string | ((input: unknown, context: WorkflowContext) => string),
      headers: config.headers as
        | Record<string, string>
        | ((input: unknown, context: WorkflowContext) => Record<string, string> | Promise<Record<string, string>>)
        | undefined,
      body: config.body as
        | string
        | ((input: unknown, context: WorkflowContext) => string | Promise<string> | BodyInit)
        | undefined,
      transform: config.transform as
        | ((response: Response, input: unknown, context: WorkflowContext) => unknown | Promise<unknown>)
        | undefined,
    });
    return this.step(stepId, stepDef);
  }

  /**
   * Build the workflow definition
   *
   * @returns The complete workflow definition
   * @throws {Error} If workflow has no steps
   */
  build(): WorkflowDefinition<TInput, TOutput, TState> {
    if (!this.entryPoint) {
      throw new Error("Workflow must have at least one step");
    }

    const graph: WorkflowGraph = {
      entryPoint: this.entryPoint,
      edges: this.edges,
      parallelGroups: this.parallelGroups.length > 0 ? this.parallelGroups : undefined,
      branches: this.branches.length > 0 ? this.branches : undefined,
      loops: this.loops.length > 0 ? this.loops : undefined,
    };

    const workflow: WorkflowDefinition<TInput, TOutput, TState> = {
      id: this.workflowId,
      name: this.workflowName,
      description: this.workflowDescription,
      version: this.workflowVersion,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      initialState: this.initialStateFactory,
      steps: this.steps,
      graph,
      timeout: this.workflowTimeout,
      tags: this.workflowTags.length > 0 ? this.workflowTags : undefined,
    };

    return workflow;
  }

  /**
   * Build and register the workflow
   *
   * @returns The complete workflow definition
   */
  register(): WorkflowDefinition<TInput, TOutput, TState> {
    const workflow = this.build();
    // Cast to local WorkflowDefinition type to satisfy registry's type constraints
    // The types are structurally equivalent at runtime, just differ in suspend() return type
    WorkflowRegistry.register(workflow as unknown as LocalWorkflowDefinition<TInput, TOutput, TState>);
    return workflow;
  }
}

/**
 * Factory function for creating workflow builders
 *
 * @param workflowId - Unique identifier for the workflow
 * @returns A new WorkflowBuilder instance
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow("my-workflow")
 *   .name("My Workflow")
 *   .step("step1", { execute: async () => ({ success: true }) })
 *   .build();
 * ```
 */
export function createWorkflow(workflowId: string): WorkflowBuilder {
  return new WorkflowBuilder(workflowId);
}
