/**
 * Task Distributor - Distributes and balances tasks across agents
 *
 * The Task Distributor handles:
 * - Task decomposition into subtasks
 * - Load balancing across available agents
 * - Priority-based task queuing
 * - Task affinity and skill matching
 */

import { EventEmitter } from "events";
import type { Agent } from "../agent.js";
import { logger } from "../../utils/logger.js";
import { withTimeout } from "../../utils/async/withTimeout.js";
import type {
  TaskAnalysis,
  TaskPriority,
  DistributableTask,
  DistributionResult,
  AgentCapability,
  TaskDistributorConfig,
  TaskQueueItem,
} from "../../types/index.js";

/**
 * Priority values for sorting
 */
const PRIORITY_VALUES: Record<TaskPriority, number> = {
  critical: 5,
  high: 4,
  normal: 3,
  low: 2,
  background: 1,
};

/**
 * Task Distributor - Manages task distribution across agents
 */
export class TaskDistributor {
  private agents: Map<string, Agent> = new Map();
  private capabilities: Map<string, AgentCapability> = new Map();
  private taskQueue: TaskQueueItem[] = [];
  private activeResults: Map<string, DistributionResult> = new Map();
  private config: TaskDistributorConfig;
  private emitter: EventEmitter;
  private isProcessing = false;

  constructor(config: TaskDistributorConfig) {
    this.config = {
      maxQueueSize: 1000,
      maxRetries: 3,
      retryDelay: 1000,
      taskTimeout: 60000,
      enableDecomposition: false,
      ...config,
    };
    this.emitter = new EventEmitter();

    logger.debug("[TaskDistributor] Created with config", {
      strategy: config.strategy,
      maxQueueSize: this.config.maxQueueSize,
    });
  }

  /**
   * Register an agent with capabilities
   */
  registerAgent(agent: Agent, capability?: Partial<AgentCapability>): void {
    this.agents.set(agent.id, agent);

    // Extract skills from agent tools if available
    const skills = capability?.skills ?? agent.tools ?? [];

    this.capabilities.set(agent.id, {
      agentId: agent.id,
      skills,
      currentLoad: 0,
      avgResponseTime: 0,
      successRate: 1,
      affinityTags: capability?.affinityTags,
    });

    logger.debug(`[TaskDistributor] Registered agent: ${agent.name}`, {
      skills: skills.length,
    });
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.capabilities.delete(agentId);
  }

  /**
   * Update agent capability
   */
  updateCapability(agentId: string, update: Partial<AgentCapability>): void {
    const current = this.capabilities.get(agentId);
    if (current) {
      this.capabilities.set(agentId, { ...current, ...update });
    }
  }

  /**
   * Submit a task for distribution
   */
  async submitTask(task: DistributableTask): Promise<DistributionResult> {
    // Check queue capacity
    if (
      this.config.maxQueueSize &&
      this.taskQueue.length >= this.config.maxQueueSize
    ) {
      throw new Error("Task queue is full");
    }

    // Initialize result
    const result: DistributionResult = {
      taskId: task.id,
      agentId: "",
      distributedAt: Date.now(),
      status: "pending",
    };
    this.activeResults.set(task.id, result);

    // Create a settlement promise BEFORE queuing so we never miss the event.
    // Resolves when the task reaches "completed" or "failed" via the emitter.
    const settled = new Promise<DistributionResult>((resolve) => {
      const onComplete = (evt: { taskId: string }) => {
        if (evt.taskId === task.id) {
          this.emitter.off("task:completed", onComplete);
          this.emitter.off("task:failed", onFail);
          resolve(this.activeResults.get(task.id) ?? result);
        }
      };
      const onFail = (evt: { taskId: string }) => {
        if (evt.taskId === task.id) {
          this.emitter.off("task:completed", onComplete);
          this.emitter.off("task:failed", onFail);
          resolve(this.activeResults.get(task.id) ?? result);
        }
      };
      this.emitter.on("task:completed", onComplete);
      this.emitter.on("task:failed", onFail);
    });

    // Add to queue
    this.taskQueue.push({
      task,
      addedAt: Date.now(),
      attempts: 0,
    });

    this.emitter.emit("task:submitted", { taskId: task.id });

    // Trigger processing (no-ops if already running; the finally block will
    // re-trigger itself until the queue is drained).
    await this.processQueue();

    // Wait until the task actually finishes (completed or failed).
    return settled;
  }

  /**
   * Submit multiple tasks
   */
  async submitTasks(tasks: DistributableTask[]): Promise<DistributionResult[]> {
    return Promise.all(tasks.map((task) => this.submitTask(task)));
  }

  /**
   * Decompose a complex task into subtasks
   */
  async decomposeTask(
    task: DistributableTask,
    analysis: TaskAnalysis,
  ): Promise<DistributableTask[]> {
    if (!this.config.enableDecomposition) {
      return [task];
    }

    const subtasks: DistributableTask[] = [];

    // Create subtasks based on requirements
    for (let i = 0; i < analysis.requirements.length; i++) {
      const req = analysis.requirements[i];
      if (req.mandatory) {
        subtasks.push({
          id: `${task.id}-subtask-${i}`,
          input: `${task.input}\n\nFocus on: ${req.description}`,
          priority: task.priority,
          requiredSkills: req.type === "tool" ? [req.description] : undefined,
          parentTaskId: task.id,
          metadata: {
            ...task.metadata,
            subtaskIndex: i,
            requirementType: req.type,
          },
        });
      }
    }

    // If no subtasks created, return original
    if (subtasks.length === 0) {
      return [task];
    }

    return subtasks;
  }

  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Sort queue by priority and deadline
      this.taskQueue.sort((a, b) => {
        // Priority first
        const priorityDiff =
          PRIORITY_VALUES[b.task.priority] - PRIORITY_VALUES[a.task.priority];
        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        // Then by deadline
        if (a.task.deadline && b.task.deadline) {
          return a.task.deadline - b.task.deadline;
        }

        // Then by queue time
        return a.addedAt - b.addedAt;
      });

      // Process tasks
      // Tracks how many items have been rotated to the back of the queue
      // without any task being executed. When this equals the queue length
      // every waiting item has been seen at least once with no forward
      // progress — a deadlock caused by circular or unresolvable dependencies.
      let rotatedWithoutProgress = 0;

      while (this.taskQueue.length > 0) {
        const item = this.taskQueue[0];

        // Check dependencies
        if (item.task.dependencies && item.task.dependencies.length > 0) {
          // Detect failed or missing dependencies first to avoid infinite spinning
          const failedDep = item.task.dependencies.find((depId) => {
            const depResult = this.activeResults.get(depId);
            return depResult?.status === "failed" || !depResult;
          });
          if (failedDep) {
            this.taskQueue.shift();
            rotatedWithoutProgress = 0; // structural change — reset counter
            const result = this.activeResults.get(item.task.id);
            if (result) {
              result.status = "failed";
              result.error = `Dependency '${failedDep}' failed or not found`;
            }
            this.emitter.emit("task:failed", {
              taskId: item.task.id,
              error: `Dependency '${failedDep}' failed or not found`,
            });
            continue;
          }

          const allDepsComplete = item.task.dependencies.every((depId) => {
            const depResult = this.activeResults.get(depId);
            return depResult?.status === "completed";
          });

          if (!allDepsComplete) {
            // Move to end of queue and continue
            this.taskQueue.shift();
            this.taskQueue.push(item);
            rotatedWithoutProgress++;

            // Full rotation with no progress — circular/unresolvable dependency
            if (rotatedWithoutProgress >= this.taskQueue.length) {
              this.failAllQueuedTasks(
                "Circular or unresolvable dependency detected",
              );
              break;
            }
            continue;
          }
        }

        // Select agent based on strategy
        const agent = await this.selectAgent(item.task);
        if (!agent) {
          // No suitable agent found
          if (item.attempts < (this.config.maxRetries ?? 3)) {
            item.attempts++;
            await this.delay(this.config.retryDelay ?? 1000);
            continue;
          }

          // Max retries reached
          this.taskQueue.shift();
          const result = this.activeResults.get(item.task.id);
          if (result) {
            result.status = "failed";
            result.error = "No suitable agent found";
          }
          this.emitter.emit("task:failed", {
            taskId: item.task.id,
            error: "No suitable agent found",
          });
          continue;
        }

        // Remove from queue and execute
        this.taskQueue.shift();
        rotatedWithoutProgress = 0; // reset: we made forward progress
        await this.executeTask(item.task, agent);
      }
    } finally {
      this.isProcessing = false;
      // Re-process any tasks that were queued while this pass was running.
      // Use a zero-delay tick to avoid unbounded call-stack growth.
      if (this.taskQueue.length > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        await this.processQueue();
      }
    }
  }

  /**
   * Select an agent based on strategy
   */
  private async selectAgent(
    task: DistributableTask,
  ): Promise<Agent | undefined> {
    const availableAgents = Array.from(this.agents.values());
    if (availableAgents.length === 0) {
      return undefined;
    }

    switch (this.config.strategy) {
      case "skillBased":
        return this.selectBySkill(task, availableAgents);
      case "loadBalanced":
        return this.selectByLoad(availableAgents);
      case "priority":
        return this.selectByPriority(task, availableAgents);
      case "affinity":
        return this.selectByAffinity(task, availableAgents);
      case "broadcast":
        // For broadcast, return first agent (broadcast handled separately)
        return availableAgents[0];
      default:
        return availableAgents[0];
    }
  }

  /**
   * Select agent by skill match
   */
  private selectBySkill(
    task: DistributableTask,
    agents: Agent[],
  ): Agent | undefined {
    if (!task.requiredSkills || task.requiredSkills.length === 0) {
      return agents[0];
    }

    let bestAgent: Agent | undefined;
    let bestScore = 0;

    for (const agent of agents) {
      const capability = this.capabilities.get(agent.id);
      if (!capability) {
        continue;
      }

      // Calculate skill match score
      let score = 0;
      if (this.config.skillMatcher) {
        score = this.config.skillMatcher(task, agent);
      } else {
        // Default skill matching
        for (const requiredSkill of task.requiredSkills) {
          const hasSkill = capability.skills.some(
            (s) =>
              s.toLowerCase().includes(requiredSkill.toLowerCase()) ||
              requiredSkill.toLowerCase().includes(s.toLowerCase()),
          );
          if (hasSkill) {
            score++;
          }
        }
      }

      // Factor in success rate
      score *= capability.successRate;

      // Factor in load (prefer less busy)
      score *= 1 - capability.currentLoad;

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    return bestAgent ?? agents[0];
  }

  /**
   * Select agent by load
   */
  private selectByLoad(agents: Agent[]): Agent | undefined {
    let leastLoadedAgent: Agent | undefined;
    let lowestLoad = Infinity;

    for (const agent of agents) {
      const capability = this.capabilities.get(agent.id);
      if (capability && capability.currentLoad < lowestLoad) {
        lowestLoad = capability.currentLoad;
        leastLoadedAgent = agent;
      }
    }

    return leastLoadedAgent ?? agents[0];
  }

  /**
   * Select agent by priority matching
   */
  private selectByPriority(
    task: DistributableTask,
    agents: Agent[],
  ): Agent | undefined {
    // For critical/high priority, prefer agents with best success rate
    if (task.priority === "critical" || task.priority === "high") {
      let bestAgent: Agent | undefined;
      let bestRate = 0;

      for (const agent of agents) {
        const capability = this.capabilities.get(agent.id);
        if (capability && capability.successRate > bestRate) {
          bestRate = capability.successRate;
          bestAgent = agent;
        }
      }

      return bestAgent ?? agents[0];
    }

    // For low/background priority, prefer agents with lowest load
    return this.selectByLoad(agents);
  }

  /**
   * Select agent by affinity
   */
  private selectByAffinity(
    task: DistributableTask,
    agents: Agent[],
  ): Agent | undefined {
    // Check preferred agent first
    if (task.preferredAgent) {
      const preferred = this.agents.get(task.preferredAgent);
      if (preferred) {
        return preferred;
      }
    }

    // Check affinity tags
    if (task.metadata?.affinityTags) {
      const taskTags = task.metadata.affinityTags as string[];

      for (const agent of agents) {
        const capability = this.capabilities.get(agent.id);
        if (capability?.affinityTags) {
          const hasMatch = taskTags.some((tag) =>
            capability.affinityTags!.includes(tag),
          );
          if (hasMatch) {
            return agent;
          }
        }
      }
    }

    // Fall back to load-based selection
    return this.selectByLoad(agents);
  }

  /**
   * Execute a task on an agent
   */
  private async executeTask(
    task: DistributableTask,
    agent: Agent,
  ): Promise<void> {
    const result = this.activeResults.get(task.id);
    if (!result) {
      return;
    }

    result.agentId = agent.id;
    result.status = "running";

    // Update agent load
    const capability = this.capabilities.get(agent.id);
    if (capability) {
      capability.currentLoad = Math.min(1, capability.currentLoad + 0.2);
    }

    this.emitter.emit("task:started", { taskId: task.id, agentId: agent.id });

    const startTime = Date.now();

    try {
      // Execute with timeout
      const agentResult = await withTimeout(
        agent.execute(task.input, {
          context: task.metadata,
          timeout: task.deadline
            ? task.deadline - Date.now()
            : this.config.taskTimeout,
        }),
        this.config.taskTimeout ?? 60000,
        "Task execution timeout",
      );

      result.result = agentResult;
      result.completedAt = Date.now();
      result.status = agentResult.status === "success" ? "completed" : "failed";
      result.error = agentResult.error;

      // Update capability stats
      if (capability) {
        const duration = Date.now() - startTime;
        capability.avgResponseTime =
          (capability.avgResponseTime + duration) / 2;
        if (agentResult.status === "success") {
          capability.successRate = capability.successRate * 0.9 + 1 * 0.1; // Weighted average
        } else {
          capability.successRate = capability.successRate * 0.9; // Decay on failure
        }
      }

      this.emitter.emit("task:completed", {
        taskId: task.id,
        agentId: agent.id,
        status: result.status,
      });
    } catch (error) {
      result.status = "failed";
      result.error = error instanceof Error ? error.message : String(error);
      result.completedAt = Date.now();

      // Update capability stats
      if (capability) {
        capability.successRate = capability.successRate * 0.9;
      }

      this.emitter.emit("task:failed", {
        taskId: task.id,
        agentId: agent.id,
        error: result.error,
      });
    } finally {
      // Reduce agent load
      if (capability) {
        capability.currentLoad = Math.max(0, capability.currentLoad - 0.2);
      }
    }
  }

  /**
   * Broadcast a task to all agents
   */
  async broadcastTask(
    task: DistributableTask,
  ): Promise<Map<string, DistributionResult>> {
    const results = new Map<string, DistributionResult>();
    const agents = Array.from(this.agents.values());

    const promises = agents.map(async (agent) => {
      const taskCopy: DistributableTask = {
        ...task,
        id: `${task.id}-${agent.id}`,
      };

      const result: DistributionResult = {
        taskId: taskCopy.id,
        agentId: agent.id,
        distributedAt: Date.now(),
        status: "running",
      };

      try {
        const agentResult = await agent.execute(taskCopy.input);
        result.result = agentResult;
        result.status =
          agentResult.status === "success" ? "completed" : "failed";
        result.completedAt = Date.now();
      } catch (error) {
        result.status = "failed";
        result.error = error instanceof Error ? error.message : String(error);
        result.completedAt = Date.now();
      }

      results.set(agent.id, result);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get task result
   */
  getTaskResult(taskId: string): DistributionResult | undefined {
    return this.activeResults.get(taskId);
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    pending: number;
    active: number;
    completed: number;
    failed: number;
  } {
    let completed = 0;
    let failed = 0;
    let active = 0;

    for (const result of this.activeResults.values()) {
      switch (result.status) {
        case "completed":
          completed++;
          break;
        case "failed":
          failed++;
          break;
        case "running":
          active++;
          break;
      }
    }

    return {
      pending: this.taskQueue.length,
      active,
      completed,
      failed,
    };
  }

  /**
   * Clear completed/failed tasks
   */
  clearCompleted(): void {
    for (const [taskId, result] of this.activeResults) {
      if (result.status === "completed" || result.status === "failed") {
        this.activeResults.delete(taskId);
      }
    }
  }

  /**
   * Fail all queued tasks (used on deadlock detection)
   */
  private failAllQueuedTasks(reason: string): void {
    while (this.taskQueue.length > 0) {
      const stuck = this.taskQueue.shift()!;
      const stuckResult = this.activeResults.get(stuck.task.id);
      if (stuckResult) {
        stuckResult.status = "failed";
        stuckResult.error = reason;
      }
      this.emitter.emit("task:failed", {
        taskId: stuck.task.id,
        error: reason,
      });
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Subscribe to distributor events
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.on(event, handler);
  }

  /**
   * Unsubscribe from distributor events
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler);
  }
}
