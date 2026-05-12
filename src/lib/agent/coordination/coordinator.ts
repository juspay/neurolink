/**
 * Agent Coordinator - Manages coordination between agents in a network
 *
 * The Coordinator is responsible for:
 * - Managing agent lifecycle and state
 * - Coordinating task execution across multiple agents
 * - Handling agent dependencies and execution order
 * - Managing shared context and state between agents
 */

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { withTimeout } from "../../utils/async/withTimeout.js";
import type { Agent } from "../agent.js";
import { logger } from "../../utils/logger.js";
import type {
  AgentResult,
  AgentStatus,
  AgentInstance,
  NetworkExecutionStep,
  CoordinatorConfig,
  CoordinationContext,
  CoordinationResult,
  TaskAssignment,
} from "../../types/index.js";

/**
 * Agent Coordinator - Orchestrates multi-agent execution
 */
export class AgentCoordinator {
  private agents: Map<string, Agent> = new Map();
  private config: CoordinatorConfig;
  private emitter: EventEmitter;
  private activeExecutions: Map<string, Promise<AgentResult>> = new Map();
  private executionHistory: NetworkExecutionStep[] = [];
  private roundRobinCursor: number = 0;

  constructor(config?: Partial<CoordinatorConfig>) {
    this.config = {
      strategy: "sequential",
      maxConcurrency: 3,
      agentTimeout: 60000,
      continueOnFailure: false,
      ...config,
    };
    this.emitter = new EventEmitter();

    logger.debug("[AgentCoordinator] Created with config", {
      strategy: this.config.strategy,
      maxConcurrency: this.config.maxConcurrency,
    });
  }

  /**
   * Register an agent with the coordinator
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    logger.debug(`[AgentCoordinator] Registered agent: ${agent.name}`);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Get all registered agents
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentId: string): AgentStatus | undefined {
    const agent = this.agents.get(agentId);
    return agent?.getStatus();
  }

  /**
   * Execute a coordinated task across agents
   */
  async coordinate(
    task: string,
    options?: Partial<CoordinatorConfig>,
  ): Promise<CoordinationResult> {
    const startTime = Date.now();
    const executionId = randomUUID();
    const config = { ...this.config, ...options };

    const context: CoordinationContext = {
      currentStep: 0,
      previousResults: new Map(),
      sharedState: new Map(),
      metadata: {
        startTime,
        strategy: config.strategy,
        executionId,
      },
    };

    this.emitter.emit("coordination:start", { executionId, task });

    try {
      let result: CoordinationResult;

      switch (config.strategy) {
        case "sequential":
          result = await this.executeSequential(task, context, config);
          break;
        case "parallel":
          result = await this.executeParallel(task, context, config);
          break;
        case "pipeline":
          result = await this.executePipeline(task, context, config);
          break;
        case "roundRobin":
          result = await this.executeRoundRobin(task, context, config);
          break;
        case "leastBusy":
          result = await this.executeLeastBusy(task, context, config);
          break;
        case "custom":
          if (!config.customCoordinator) {
            throw new Error(
              "Custom coordinator function required for custom strategy",
            );
          }
          result = await config.customCoordinator(
            this.getAgents(),
            task,
            context,
          );
          break;
        default:
          throw new Error(`Unknown coordination strategy: ${config.strategy}`);
      }

      this.emitter.emit("coordination:complete", { executionId, result });
      return result;
    } catch (error) {
      const errorResult: CoordinationResult = {
        success: false,
        agentResults: context.previousResults,
        steps: this.executionHistory,
        errors: [
          {
            agentId: "coordinator",
            error: error instanceof Error ? error.message : String(error),
          },
        ],
        duration: Date.now() - startTime,
        metadata: {
          executionId,
          strategy: config.strategy,
          agentsExecuted: context.previousResults.size,
          agentsFailed: 1,
        },
      };

      this.emitter.emit("coordination:error", { executionId, error });
      return errorResult;
    }
  }

  /**
   * Execute agents sequentially
   */
  private async executeSequential(
    task: string,
    context: CoordinationContext,
    config: CoordinatorConfig,
  ): Promise<CoordinationResult> {
    const agents = this.getAgents();
    if (agents.length === 0) {
      return {
        success: false,
        agentResults: context.previousResults,
        steps: [],
        finalOutput: "",
        errors: [{ agentId: "coordinator", error: "No agents registered" }],
        duration: Date.now() - context.metadata.startTime,
        metadata: {
          executionId: context.metadata.executionId,
          strategy: config.strategy ?? "sequential",
          agentsExecuted: 0,
          agentsFailed: 0,
        },
      };
    }
    const errors: Array<{ agentId: string; error: string }> = [];
    const steps: NetworkExecutionStep[] = [];
    let currentInput = task;
    let finalOutput = "";

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      context.currentStep = i;

      const stepStart = Date.now();
      try {
        const result = await this.executeAgentWithTimeout(
          agent,
          currentInput,
          context,
        );

        context.previousResults.set(agent.id, result);
        steps.push({
          index: i,
          primitive: { type: "agent", id: agent.id, name: agent.name },
          input: currentInput,
          output: result.content,
          duration: Date.now() - stepStart,
          usage: result.usage,
          timestamp: stepStart,
        });

        if (result.status === "success") {
          currentInput = result.content;
          finalOutput = result.content;
        } else if (result.error) {
          errors.push({ agentId: agent.id, error: result.error });
          if (!config.continueOnFailure) {
            break;
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ agentId: agent.id, error: errorMsg });
        steps.push({
          index: i,
          primitive: { type: "agent", id: agent.id, name: agent.name },
          input: currentInput,
          error: errorMsg,
          duration: Date.now() - stepStart,
          timestamp: stepStart,
        });
        if (!config.continueOnFailure) {
          break;
        }
      }
    }

    return {
      success: errors.length === 0,
      agentResults: context.previousResults,
      steps,
      finalOutput,
      errors,
      duration: Date.now() - context.metadata.startTime,
      metadata: {
        executionId: context.metadata.executionId,
        strategy: "sequential",
        agentsExecuted: context.previousResults.size,
        agentsFailed: errors.length,
      },
    };
  }

  /**
   * Execute agents in parallel
   */
  private async executeParallel(
    task: string,
    context: CoordinationContext,
    config: CoordinatorConfig,
  ): Promise<CoordinationResult> {
    const agents = this.getAgents();
    if (agents.length === 0) {
      return {
        success: false,
        agentResults: context.previousResults,
        steps: [],
        finalOutput: "",
        errors: [{ agentId: "coordinator", error: "No agents registered" }],
        duration: Date.now() - context.metadata.startTime,
        metadata: {
          executionId: context.metadata.executionId,
          strategy: config.strategy ?? "parallel",
          agentsExecuted: 0,
          agentsFailed: 0,
        },
      };
    }
    const errors: Array<{ agentId: string; error: string }> = [];
    const steps: NetworkExecutionStep[] = [];
    const maxConcurrency = Math.max(1, config.maxConcurrency ?? 3);

    // Split agents into batches based on concurrency
    const batches: Agent[][] = [];
    for (let i = 0; i < agents.length; i += maxConcurrency) {
      batches.push(agents.slice(i, i + maxConcurrency));
    }

    let stepIndex = 0;
    const allResults: string[] = [];

    for (const batch of batches) {
      const batchPromises = batch.map(async (agent) => {
        const stepStart = Date.now();
        const currentIndex = stepIndex++;

        try {
          const result = await this.executeAgentWithTimeout(
            agent,
            task,
            context,
          );

          context.previousResults.set(agent.id, result);
          steps.push({
            index: currentIndex,
            primitive: { type: "agent", id: agent.id, name: agent.name },
            input: task,
            output: result.content,
            duration: Date.now() - stepStart,
            usage: result.usage,
            timestamp: stepStart,
          });

          if (result.status === "success") {
            allResults.push(result.content);
          } else if (result.error) {
            errors.push({ agentId: agent.id, error: result.error });
          }

          return result;
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          errors.push({ agentId: agent.id, error: errorMsg });
          steps.push({
            index: currentIndex,
            primitive: { type: "agent", id: agent.id, name: agent.name },
            input: task,
            error: errorMsg,
            duration: Date.now() - stepStart,
            timestamp: stepStart,
          });
          return null;
        }
      });

      await Promise.all(batchPromises);
    }

    // Combine results
    const finalOutput = allResults.join("\n\n---\n\n");

    return {
      success: errors.length === 0,
      agentResults: context.previousResults,
      steps,
      finalOutput,
      errors,
      duration: Date.now() - context.metadata.startTime,
      metadata: {
        executionId: context.metadata.executionId,
        strategy: "parallel",
        agentsExecuted: context.previousResults.size,
        agentsFailed: errors.length,
      },
    };
  }

  /**
   * Execute agents in a pipeline (output feeds into next)
   */
  private async executePipeline(
    task: string,
    context: CoordinationContext,
    config: CoordinatorConfig,
  ): Promise<CoordinationResult> {
    // Pipeline is essentially sequential with explicit input chaining
    return this.executeSequential(task, context, config);
  }

  /**
   * Execute using round-robin distribution
   */
  private async executeRoundRobin(
    task: string,
    context: CoordinationContext,
    _config: CoordinatorConfig,
  ): Promise<CoordinationResult> {
    const agents = this.getAgents();
    if (agents.length === 0) {
      return {
        success: false,
        agentResults: new Map(),
        steps: [],
        errors: [{ agentId: "coordinator", error: "No agents registered" }],
        duration: 0,
        metadata: {
          executionId: context.metadata.executionId,
          strategy: "roundRobin",
          agentsExecuted: 0,
          agentsFailed: 0,
        },
      };
    }

    // For round robin, select the next agent in rotation using persistent cursor
    const selectedIndex = this.roundRobinCursor % agents.length;
    this.roundRobinCursor++;
    const agent = agents[selectedIndex];

    const stepStart = Date.now();
    const result = await this.executeAgentWithTimeout(agent, task, context);

    context.previousResults.set(agent.id, result);

    const step: NetworkExecutionStep = {
      index: 0,
      primitive: { type: "agent", id: agent.id, name: agent.name },
      input: task,
      output: result.content,
      duration: Date.now() - stepStart,
      usage: result.usage,
      timestamp: stepStart,
    };

    return {
      success: result.status === "success",
      agentResults: context.previousResults,
      steps: [step],
      finalOutput: result.content,
      errors: result.error ? [{ agentId: agent.id, error: result.error }] : [],
      duration: Date.now() - context.metadata.startTime,
      metadata: {
        executionId: context.metadata.executionId,
        strategy: "roundRobin",
        agentsExecuted: 1,
        agentsFailed: result.status === "error" ? 1 : 0,
      },
    };
  }

  /**
   * Execute using least busy agent
   */
  private async executeLeastBusy(
    task: string,
    context: CoordinationContext,
    _config: CoordinatorConfig,
  ): Promise<CoordinationResult> {
    const agents = this.getAgents();
    if (agents.length === 0) {
      return {
        success: false,
        agentResults: new Map(),
        steps: [],
        errors: [{ agentId: "coordinator", error: "No agents registered" }],
        duration: 0,
        metadata: {
          executionId: context.metadata.executionId,
          strategy: "leastBusy",
          agentsExecuted: 0,
          agentsFailed: 0,
        },
      };
    }

    // Find the least busy agent (fewest active executions or lowest execution count)
    let leastBusyAgent = agents[0];
    let lowestCount = leastBusyAgent.getStatus().executionCount;

    for (const agent of agents) {
      const status = agent.getStatus();
      if (status.executionCount < lowestCount) {
        lowestCount = status.executionCount;
        leastBusyAgent = agent;
      }
    }

    const stepStart = Date.now();
    const result = await this.executeAgentWithTimeout(
      leastBusyAgent,
      task,
      context,
    );

    context.previousResults.set(leastBusyAgent.id, result);

    const step: NetworkExecutionStep = {
      index: 0,
      primitive: {
        type: "agent",
        id: leastBusyAgent.id,
        name: leastBusyAgent.name,
      },
      input: task,
      output: result.content,
      duration: Date.now() - stepStart,
      usage: result.usage,
      timestamp: stepStart,
    };

    return {
      success: result.status === "success",
      agentResults: context.previousResults,
      steps: [step],
      finalOutput: result.content,
      errors: result.error
        ? [{ agentId: leastBusyAgent.id, error: result.error }]
        : [],
      duration: Date.now() - context.metadata.startTime,
      metadata: {
        executionId: context.metadata.executionId,
        strategy: "leastBusy",
        agentsExecuted: 1,
        agentsFailed: result.status === "error" ? 1 : 0,
      },
    };
  }

  /**
   * Execute an agent with timeout
   */
  private async executeAgentWithTimeout(
    agent: AgentInstance,
    input: string,
    context: CoordinationContext,
  ): Promise<AgentResult> {
    const timeout = this.config.agentTimeout ?? 60000;

    const executionPromise = agent.execute(input, {
      context: Object.fromEntries(context.sharedState),
      traceId: context.metadata.executionId,
    });

    // Track active execution
    this.activeExecutions.set(agent.id, executionPromise);

    try {
      return await withTimeout(
        executionPromise,
        timeout,
        `Agent execution timeout after ${timeout}ms`,
      );
    } finally {
      this.activeExecutions.delete(agent.id);
    }
  }

  /**
   * Execute multiple task assignments with dependencies
   */
  async executeWithDependencies(
    assignments: TaskAssignment[],
  ): Promise<CoordinationResult> {
    const startTime = Date.now();
    const executionId = randomUUID();
    const context: CoordinationContext = {
      currentStep: 0,
      previousResults: new Map(),
      sharedState: new Map(),
      metadata: {
        startTime,
        strategy: "custom",
        executionId,
      },
    };

    const errors: Array<{ agentId: string; error: string }> = [];
    const steps: NetworkExecutionStep[] = [];
    const completed = new Set<string>();
    const failed = new Set<string>();
    const pending = new Map(assignments.map((a) => [a.agent.id, a]));
    let stepCounter = 0;

    while (pending.size > 0) {
      // Find assignments whose dependencies are satisfied
      const ready: TaskAssignment[] = [];
      for (const [_agentId, assignment] of pending) {
        const deps = assignment.dependencies ?? [];
        if (deps.every((d) => completed.has(d))) {
          ready.push(assignment);
        }
      }

      if (ready.length === 0 && pending.size > 0) {
        // Circular dependency or unmet dependency
        errors.push({
          agentId: "coordinator",
          error: "Unresolvable dependencies detected",
        });
        break;
      }

      // Sort by priority and execute
      ready.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      // Execute in parallel batches
      const maxConcurrency = Math.max(1, this.config.maxConcurrency ?? 3);
      for (let i = 0; i < ready.length; i += maxConcurrency) {
        const batch = ready.slice(i, i + maxConcurrency);
        const batchPromises = batch.map(async (assignment) => {
          const stepStart = Date.now();
          const stepIndex = stepCounter++;

          // Fail fast if any dependency already failed
          const deps = assignment.dependencies ?? [];
          const hasFailedDep = deps.some((d) => failed.has(d));
          if (hasFailedDep) {
            const failedDepId = deps.find((d) => failed.has(d));
            errors.push({
              agentId: assignment.agent.id,
              error: `Dependency '${failedDepId}' failed`,
            });
            failed.add(assignment.agent.id);
            pending.delete(assignment.agent.id);
            return null;
          }

          try {
            const result = await this.executeAgentWithTimeout(
              assignment.agent,
              assignment.input,
              context,
            );

            context.previousResults.set(assignment.agent.id, result);
            pending.delete(assignment.agent.id);

            steps.push({
              index: stepIndex,
              primitive: {
                type: "agent",
                id: assignment.agent.id,
                name: assignment.agent.name,
              },
              input: assignment.input,
              output: result.content,
              duration: Date.now() - stepStart,
              usage: result.usage,
              timestamp: stepStart,
            });

            if (result.error) {
              errors.push({
                agentId: assignment.agent.id,
                error: result.error,
              });
              failed.add(assignment.agent.id);
            } else {
              completed.add(assignment.agent.id);
            }

            return result;
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            errors.push({ agentId: assignment.agent.id, error: errorMsg });
            failed.add(assignment.agent.id);
            pending.delete(assignment.agent.id);

            steps.push({
              index: stepIndex,
              primitive: {
                type: "agent",
                id: assignment.agent.id,
                name: assignment.agent.name,
              },
              input: assignment.input,
              error: errorMsg,
              duration: Date.now() - stepStart,
              timestamp: stepStart,
            });

            return null;
          }
        });

        await Promise.all(batchPromises);
      }
    }

    // Combine final outputs
    const finalOutputs: string[] = [];
    for (const result of context.previousResults.values()) {
      if (result.content) {
        finalOutputs.push(result.content);
      }
    }

    return {
      success: errors.length === 0,
      agentResults: context.previousResults,
      steps,
      finalOutput: finalOutputs.join("\n\n"),
      errors,
      duration: Date.now() - startTime,
      metadata: {
        executionId,
        strategy: "custom",
        agentsExecuted: completed.size,
        agentsFailed: errors.length,
      },
    };
  }

  /**
   * Update coordinator configuration
   */
  updateConfig(config: Partial<CoordinatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Subscribe to coordinator events
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.on(event, handler);
  }

  /**
   * Unsubscribe from coordinator events
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler);
  }
}
