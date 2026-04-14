/**
 * Network Orchestrator - High-level orchestration of agent networks
 *
 * The Orchestrator manages:
 * - Network lifecycle (creation, execution, shutdown)
 * - Multi-network coordination
 * - Network-level policies and constraints
 * - Resource management and scaling
 */

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import type { NeuroLink } from "../../neurolink.js";
import type { AgentNetwork } from "../agentNetwork.js";
import { AgentCoordinator } from "../coordination/coordinator.js";
import { MessageBus } from "../communication/message-bus.js";
import { logger } from "../../utils/logger.js";
import type {
  AgentNetworkConfig,
  HierarchicalNetworkConfig,
  NetworkExecutionInput,
  NetworkExecutionOptions,
  NetworkExecutionResult,
  NetworkStreamChunk,
  HierarchicalExecutionTrace,
  CoordinationStrategy,
  OrchestrationMode,
  NetworkState,
  NetworkInfo,
  OrchestratorConfig,
  ExecutionRequest,
} from "../../types/index.js";

/**
 * Network Orchestrator - Central controller for agent networks
 */
export class NetworkOrchestrator {
  private neurolink: NeuroLink;
  private networks: Map<string, AgentNetwork> = new Map();
  private networkInfo: Map<string, NetworkInfo> = new Map();
  private coordinators: Map<string, AgentCoordinator> = new Map();
  private messageBus: MessageBus;
  private config: Required<OrchestratorConfig>;
  private emitter: EventEmitter;
  private executionQueue: ExecutionRequest[] = [];
  private activeExecutions: Map<string, Promise<NetworkExecutionResult>> =
    new Map();

  constructor(neurolink: NeuroLink, config?: OrchestratorConfig) {
    this.neurolink = neurolink;
    this.config = {
      defaultMode: "autonomous",
      maxConcurrentExecutions: 5,
      defaultTimeout: 120000,
      enableHierarchy: true,
      maxHierarchyDepth: 3,
      enableSharedMessageBus: true,
      resourceLimits: {
        maxNetworks: 10,
        maxAgentsPerNetwork: 20,
        maxTotalAgents: 100,
      },
      ...config,
    };
    this.emitter = new EventEmitter();
    this.messageBus = new MessageBus();

    logger.info("[NetworkOrchestrator] Initialized", {
      maxConcurrentExecutions: this.config.maxConcurrentExecutions,
      enableHierarchy: this.config.enableHierarchy,
    });
  }

  /**
   * Create a new agent network
   */
  async createNetwork(
    config: AgentNetworkConfig,
    mode?: OrchestrationMode,
  ): Promise<AgentNetwork> {
    // Check resource limits
    if (
      this.config.resourceLimits?.maxNetworks &&
      this.networks.size >= this.config.resourceLimits.maxNetworks
    ) {
      throw new Error("Maximum number of networks reached");
    }

    if (
      this.config.resourceLimits?.maxAgentsPerNetwork &&
      config.agents.length > this.config.resourceLimits.maxAgentsPerNetwork
    ) {
      throw new Error(
        `Maximum agents per network (${this.config.resourceLimits.maxAgentsPerNetwork}) exceeded`,
      );
    }

    if (this.config.resourceLimits?.maxTotalAgents) {
      const currentTotalAgents = Array.from(this.networkInfo.values()).reduce(
        (sum, info) => sum + info.agentCount,
        0,
      );
      if (
        currentTotalAgents + config.agents.length >
        this.config.resourceLimits.maxTotalAgents
      ) {
        throw new Error(
          `Maximum total agents (${this.config.resourceLimits.maxTotalAgents}) exceeded`,
        );
      }
    }

    // Create the network via NeuroLink
    const network = await this.neurolink.createNetwork(config);

    // Track network info
    const info: NetworkInfo = {
      id: network.id,
      name: network.name,
      state: "ready",
      agentCount: config.agents.length,
      mode: mode ?? this.config.defaultMode,
      createdAt: Date.now(),
      executionCount: 0,
      childNetworkIds: [],
    };
    this.networkInfo.set(network.id, info);
    this.networks.set(network.id, network);

    // Create coordinator for the network
    const coordinator = new AgentCoordinator({
      strategy: "sequential",
      maxConcurrency: 3,
    });
    for (const agent of network.getAllAgents()) {
      coordinator.registerAgent(agent);
    }
    this.coordinators.set(network.id, coordinator);

    this.emitter.emit("network:created", {
      networkId: network.id,
      name: network.name,
    });

    logger.info(`[NetworkOrchestrator] Network created: ${network.name}`, {
      networkId: network.id,
      agentCount: config.agents.length,
    });

    return network;
  }

  /**
   * Create a hierarchical network
   */
  async createHierarchicalNetwork(
    config: HierarchicalNetworkConfig,
    parentNetworkId?: string,
  ): Promise<AgentNetwork> {
    if (!this.config.enableHierarchy) {
      throw new Error("Hierarchical networks are disabled");
    }

    // Check hierarchy constraints
    if (parentNetworkId) {
      const parentInfo = this.networkInfo.get(parentNetworkId);
      if (!parentInfo) {
        throw new Error(`Parent network not found: ${parentNetworkId}`);
      }

      // Check depth
      let depth = 0;
      let currentParent = parentInfo;
      while (currentParent.parentNetworkId) {
        depth++;
        currentParent = this.networkInfo.get(currentParent.parentNetworkId)!;
        if (depth >= this.config.maxHierarchyDepth) {
          throw new Error(
            `Maximum hierarchy depth (${this.config.maxHierarchyDepth}) exceeded`,
          );
        }
      }
    }

    const network = await this.createNetwork(
      config,
      config.supervisionMode ?? "hierarchical",
    );

    // Set up hierarchy relationships
    if (parentNetworkId) {
      const info = this.networkInfo.get(network.id)!;
      info.parentNetworkId = parentNetworkId;

      const parentInfo = this.networkInfo.get(parentNetworkId)!;
      parentInfo.childNetworkIds.push(network.id);
    }

    return network;
  }

  /**
   * Get a network by ID
   */
  getNetwork(networkId: string): AgentNetwork | undefined {
    return this.networks.get(networkId);
  }

  /**
   * Get network info
   */
  getNetworkInfo(networkId: string): NetworkInfo | undefined {
    return this.networkInfo.get(networkId);
  }

  /**
   * Get all networks
   */
  getAllNetworks(): NetworkInfo[] {
    return Array.from(this.networkInfo.values());
  }

  /**
   * Execute a network
   */
  async executeNetwork(
    networkId: string,
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): Promise<NetworkExecutionResult> {
    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error(`Network not found: ${networkId}`);
    }

    const info = this.networkInfo.get(networkId)!;
    if (info.state === "paused") {
      throw new Error(`Network is paused: ${networkId}`);
    }
    if (info.state === "shutdown") {
      throw new Error(`Network is shut down: ${networkId}`);
    }
    if (info.state === "executing") {
      // Queue the execution
      return this.queueExecution({ networkId, input, options });
    }

    // Check concurrent execution limit
    if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
      return this.queueExecution({ networkId, input, options });
    }

    return this.executeNetworkInternal(network, info, input, options);
  }

  /**
   * Internal network execution
   */
  private async executeNetworkInternal(
    network: AgentNetwork,
    info: NetworkInfo,
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): Promise<NetworkExecutionResult> {
    info.state = "executing";
    info.executionCount++;

    const executionPromise = (async () => {
      try {
        this.emitter.emit("network:execution:start", {
          networkId: network.id,
          input,
        });

        const result = await network.execute(input, {
          ...options,
          timeout: options?.timeout ?? this.config.defaultTimeout,
        });

        info.lastExecutionAt = Date.now();
        info.state = "ready";

        this.emitter.emit("network:execution:complete", {
          networkId: network.id,
          result,
        });

        return result;
      } catch (error) {
        info.state = "error";
        this.emitter.emit("network:execution:error", {
          networkId: network.id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        this.activeExecutions.delete(network.id);
        this.processExecutionQueue();
      }
    })();

    this.activeExecutions.set(network.id, executionPromise);
    return executionPromise;
  }

  /**
   * Queue an execution request
   */
  private async queueExecution(
    request: ExecutionRequest,
  ): Promise<NetworkExecutionResult> {
    return new Promise((resolve, reject) => {
      const _queuedRequest = {
        ...request,
        resolve,
        reject,
      };
      this.executionQueue.push(_queuedRequest);
      this.executionQueue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return (
          (priorityOrder[a.priority ?? "normal"] ?? 1) -
          (priorityOrder[b.priority ?? "normal"] ?? 1)
        );
      });

      this.emitter.emit("execution:queued", { networkId: request.networkId });
    });
  }

  /**
   * Process queued executions
   */
  private async processExecutionQueue(): Promise<void> {
    while (
      this.executionQueue.length > 0 &&
      this.activeExecutions.size < this.config.maxConcurrentExecutions
    ) {
      const request = this.executionQueue.shift()! as ExecutionRequest & {
        resolve?: (result: NetworkExecutionResult) => void;
        reject?: (err: unknown) => void;
      };
      const network = this.networks.get(request.networkId);
      const info = this.networkInfo.get(request.networkId);

      if (network && info && info.state !== "executing") {
        // Fire-and-forget: executeNetworkInternal is NOT awaited so the while
        // loop drains the entire queue synchronously before any launched
        // execution sets info.state = "executing" (that happens at the first
        // await inside executeNetworkInternal). This is intentional — it lets
        // one queue-drain pass start multiple networks in parallel up to
        // maxConcurrentExecutions.
        this.executeNetworkInternal(
          network,
          info,
          request.input,
          request.options,
        )
          .then((result) => request.resolve?.(result))
          .catch((err) => request.reject?.(err));
      } else if (request.reject) {
        request.reject(
          new Error(`Network unavailable for execution: ${request.networkId}`),
        );
      }
    }
  }

  /**
   * Stream network execution
   */
  async *streamNetwork(
    networkId: string,
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): AsyncIterable<NetworkStreamChunk> {
    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error(`Network not found: ${networkId}`);
    }

    const info = this.networkInfo.get(networkId)!;
    if (info.state === "paused") {
      throw new Error(`Network is paused: ${networkId}`);
    }
    if (info.state === "shutdown") {
      throw new Error(`Network is shut down: ${networkId}`);
    }
    if (info.state === "executing") {
      throw new Error(
        `Network is already executing: ${networkId}. Streaming does not support queuing.`,
      );
    }
    if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
      throw new Error(
        `Maximum concurrent executions (${this.config.maxConcurrentExecutions}) reached. Streaming does not support queuing.`,
      );
    }

    info.state = "executing";
    info.executionCount++;

    const streamPromise =
      Promise.resolve() as unknown as Promise<NetworkExecutionResult>; // placeholder to track in activeExecutions
    this.activeExecutions.set(networkId, streamPromise);

    try {
      yield* network.stream(input, options);
      info.lastExecutionAt = Date.now();
    } finally {
      info.state = "ready";
      this.activeExecutions.delete(networkId);
      this.processExecutionQueue();
    }
  }

  /**
   * Execute hierarchical network with delegation
   */
  async executeHierarchical(
    networkId: string,
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): Promise<HierarchicalExecutionTrace> {
    const network = this.networks.get(networkId);
    const info = this.networkInfo.get(networkId);
    if (!network || !info) {
      throw new Error(`Network not found: ${networkId}`);
    }

    const traceId = randomUUID();
    const trace: HierarchicalExecutionTrace = {
      traceId,
      steps: [],
      routingDecisions: [],
      startTime: Date.now(),
      hierarchyLevel: 0,
      childTraces: [],
    };

    // Calculate hierarchy level
    let currentInfo = info;
    while (currentInfo.parentNetworkId) {
      trace.hierarchyLevel++;
      trace.parentTraceId = currentInfo.parentNetworkId;
      currentInfo = this.networkInfo.get(currentInfo.parentNetworkId)!;
    }

    // Execute main network
    const result = await this.executeNetwork(networkId, input, options);
    trace.steps = result.trace.steps;
    trace.routingDecisions = result.trace.routingDecisions;
    trace.endTime = Date.now();

    // Execute child networks if needed based on delegation rules
    for (const childId of info.childNetworkIds) {
      const childNetwork = this.networks.get(childId);
      if (childNetwork) {
        const childTrace = await this.executeHierarchical(
          childId,
          { message: result.content, context: input.context },
          options,
        );
        trace.childTraces?.push(childTrace);
      }
    }

    return trace;
  }

  /**
   * Pause a network
   */
  pauseNetwork(networkId: string): void {
    const info = this.networkInfo.get(networkId);
    if (info && info.state === "ready") {
      info.state = "paused";
      this.emitter.emit("network:paused", { networkId });
    }
  }

  /**
   * Resume a network
   */
  resumeNetwork(networkId: string): void {
    const info = this.networkInfo.get(networkId);
    if (info && info.state === "paused") {
      info.state = "ready";
      this.emitter.emit("network:resumed", { networkId });
    }
  }

  /**
   * Shutdown a network
   */
  async shutdownNetwork(networkId: string): Promise<void> {
    const info = this.networkInfo.get(networkId);
    if (!info) {
      return;
    }

    // Shutdown child networks first
    for (const childId of info.childNetworkIds) {
      await this.shutdownNetwork(childId);
    }

    // Remove from parent's child list
    if (info.parentNetworkId) {
      const parentInfo = this.networkInfo.get(info.parentNetworkId);
      if (parentInfo) {
        parentInfo.childNetworkIds = parentInfo.childNetworkIds.filter(
          (id) => id !== networkId,
        );
      }
    }

    info.state = "shutdown";
    this.networks.delete(networkId);
    this.networkInfo.delete(networkId);
    this.coordinators.delete(networkId);

    this.emitter.emit("network:shutdown", { networkId });

    logger.info(`[NetworkOrchestrator] Network shutdown: ${networkId}`);
  }

  /**
   * Coordinate multiple networks
   */
  async coordinateNetworks(
    networkIds: string[],
    task: string,
    strategy: CoordinationStrategy = "parallel",
  ): Promise<Map<string, NetworkExecutionResult>> {
    const results = new Map<string, NetworkExecutionResult>();

    switch (strategy) {
      case "sequential":
      case "pipeline": {
        // Each network receives the previous network's output as its input
        let currentInput = task;
        for (const networkId of networkIds) {
          const result = await this.executeNetwork(networkId, {
            message: currentInput,
          });
          results.set(networkId, result);
          currentInput = result.content;
        }
        break;
      }

      case "parallel": {
        await Promise.all(
          networkIds.map(async (networkId) => {
            const result = await this.executeNetwork(networkId, {
              message: task,
            });
            results.set(networkId, result);
          }),
        );
        break;
      }

      default:
        throw new Error(`Unsupported coordination strategy: ${strategy}`);
    }

    return results;
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    totalNetworks: number;
    activeExecutions: number;
    queuedExecutions: number;
    totalExecutions: number;
    networksByState: Record<NetworkState, number>;
  } {
    const networksByState: Record<NetworkState, number> = {
      idle: 0,
      initializing: 0,
      ready: 0,
      executing: 0,
      paused: 0,
      error: 0,
      shutdown: 0,
    };

    let totalExecutions = 0;
    for (const info of this.networkInfo.values()) {
      networksByState[info.state]++;
      totalExecutions += info.executionCount;
    }

    return {
      totalNetworks: this.networks.size,
      activeExecutions: this.activeExecutions.size,
      queuedExecutions: this.executionQueue.length,
      totalExecutions,
      networksByState,
    };
  }

  /**
   * Get the shared message bus
   */
  getMessageBus(): MessageBus {
    return this.messageBus;
  }

  /**
   * Subscribe to orchestrator events
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.on(event, handler);
  }

  /**
   * Unsubscribe from orchestrator events
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler);
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    // Shutdown all networks
    for (const networkId of this.networks.keys()) {
      await this.shutdownNetwork(networkId);
    }

    // Shutdown message bus
    this.messageBus.shutdown();

    logger.info("[NetworkOrchestrator] Shutdown complete");
  }
}
