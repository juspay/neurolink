/**
 * Workflow Factory
 *
 * Factory for creating workflow instances following the NeuroLink Factory pattern.
 * Provides centralized workflow creation with configuration and dependency injection.
 *
 * @module workflow/WorkflowFactory
 */

import { BaseFactory } from "../core/infrastructure/index.js";
import type { NeuroLink } from "../neurolink.js";
import type {
  WorkflowCheckpoint,
  WorkflowDefinition,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
} from "../types/workflowTypes.js";
import { logger } from "../utils/logger.js";
import { CheckpointManager } from "./CheckpointManager.js";
import { RegistryError, WorkflowErrorCodes } from "./errors/WorkflowError.js";
import type { CheckpointStorageConfig } from "./types/workflowTypes.js";
import { WorkflowExecutor } from "./workflowExecutor.js";
import { WorkflowRegistry } from "./workflowRegistry.js";
import { type CheckpointStorage, InMemoryCheckpointStorage } from "./workflowStateManager.js";

// =============================================================================
// Factory Types
// =============================================================================

/**
 * Workflow factory configuration
 */
export interface WorkflowFactoryConfig {
  /** NeuroLink SDK instance */
  neurolink: NeuroLink;
  /** Checkpoint storage configuration */
  checkpointStorage?: CheckpointStorageConfig;
  /** Default workflow timeout */
  defaultTimeout?: number;
  /** Enable event streaming by default */
  enableEventsByDefault?: boolean;
}

/**
 * Workflow instance with execution methods
 */
export interface WorkflowInstance<TInput = unknown, TOutput = unknown> {
  /** Workflow definition */
  definition: WorkflowDefinition<TInput, TOutput>;
  /** Execute the workflow */
  execute: (input: TInput, options?: WorkflowExecutionOptions) => Promise<WorkflowExecutionResult<TOutput>>;
  /** Resume a suspended workflow from checkpoint */
  resume: (
    checkpoint: WorkflowCheckpoint,
    resumeData?: Record<string, unknown>,
  ) => Promise<WorkflowExecutionResult<TOutput>>;
  /** Cancel a running workflow - returns true if cancelled, false if not found */
  cancel: (runId: string) => Promise<boolean>;
}

// =============================================================================
// Workflow Factory
// =============================================================================

/**
 * WorkflowFactory - Factory for creating workflow instances
 *
 * Follows the BaseFactory pattern used throughout NeuroLink.
 * Provides centralized workflow creation with dependency injection.
 *
 * @example
 * ```typescript
 * const factory = new WorkflowFactory({
 *   neurolink: new NeuroLink(),
 *   checkpointStorage: { type: 'memory' },
 * });
 *
 * // Create a workflow instance
 * const workflow = await factory.create('my-workflow');
 *
 * // Execute the workflow
 * const result = await workflow.execute({ data: 'input' });
 * ```
 */
export class WorkflowFactory extends BaseFactory<WorkflowInstance, WorkflowFactoryConfig> {
  private static instance: WorkflowFactory | null = null;
  private config: WorkflowFactoryConfig | null = null;
  private executors: Map<string, WorkflowExecutor> = new Map();
  private checkpointManager: CheckpointManager | null = null;
  private storage: CheckpointStorage | null = null;

  /**
   * Get singleton instance
   */
  static getInstance(): WorkflowFactory {
    if (!WorkflowFactory.instance) {
      WorkflowFactory.instance = new WorkflowFactory();
    }
    return WorkflowFactory.instance;
  }

  /**
   * Initialize the factory with configuration
   */
  static initialize(config: WorkflowFactoryConfig): WorkflowFactory {
    const instance = WorkflowFactory.getInstance();
    instance.config = config;

    // Initialize checkpoint manager and storage
    if (config.checkpointStorage) {
      instance.checkpointManager = new CheckpointManager(config.checkpointStorage);
      // Use the simple InMemoryCheckpointStorage for the executor
      // The CheckpointManager handles more complex scenarios
      instance.storage = new InMemoryCheckpointStorage();
    }

    logger.debug("WorkflowFactory initialized", {
      checkpointStorage: config.checkpointStorage?.type ?? "none",
      defaultTimeout: config.defaultTimeout,
    });

    return instance;
  }

  /**
   * Register all workflows from the registry
   */
  protected async registerAll(): Promise<void> {
    // Workflows are registered dynamically via WorkflowRegistry (static class)
    // This method registers factory functions for each workflow
    for (const { id } of WorkflowRegistry.list()) {
      this.register(id, async () => this.createWorkflowInstance(id), []);
    }

    logger.debug("WorkflowFactory: All workflows registered");
  }

  /**
   * Create a workflow instance
   */
  private async createWorkflowInstance<TInput = unknown, TOutput = unknown>(
    workflowId: string,
  ): Promise<WorkflowInstance<TInput, TOutput>> {
    const definition = WorkflowRegistry.get(workflowId);

    if (!definition) {
      throw new RegistryError(`Workflow '${workflowId}' not found in registry`, WorkflowErrorCodes.WORKFLOW_NOT_FOUND, {
        workflowId,
      });
    }

    if (!this.config) {
      throw new RegistryError(
        "WorkflowFactory not initialized. Call WorkflowFactory.initialize() first.",
        WorkflowErrorCodes.WORKFLOW_NOT_FOUND,
        { workflowId },
      );
    }

    // Get or create executor for this workflow
    let executor = this.executors.get(workflowId);
    if (!executor) {
      executor = new WorkflowExecutor(this.config.neurolink, {
        storage: this.storage ?? undefined,
      });
      this.executors.set(workflowId, executor);
    }

    return {
      definition: definition as WorkflowDefinition<TInput, TOutput>,
      execute: async (input, options) =>
        executor!.execute(definition as WorkflowDefinition<TInput, TOutput>, input, options),
      resume: async (checkpoint, resumeData) => executor!.resume<TOutput>(checkpoint, resumeData),
      cancel: async (runId) => executor!.cancel(runId),
    };
  }

  /**
   * Create a workflow from a definition (not from registry)
   */
  async createFromDefinition<TInput = unknown, TOutput = unknown>(
    definition: WorkflowDefinition<TInput, TOutput>,
    config?: Partial<WorkflowFactoryConfig>,
  ): Promise<WorkflowInstance<TInput, TOutput>> {
    const mergedConfig = {
      ...this.config,
      ...config,
    } as WorkflowFactoryConfig;

    if (!mergedConfig.neurolink) {
      throw new RegistryError("WorkflowFactory requires a NeuroLink instance", WorkflowErrorCodes.WORKFLOW_NOT_FOUND, {
        workflowId: definition.id,
      });
    }

    const storage = mergedConfig.checkpointStorage ? new InMemoryCheckpointStorage() : undefined;

    const executor = new WorkflowExecutor(mergedConfig.neurolink, {
      storage,
    });

    return {
      definition,
      execute: async (input, options) => executor.execute(definition, input, options),
      resume: async (checkpoint, resumeData) => executor.resume<TOutput>(checkpoint, resumeData),
      cancel: async (runId) => executor.cancel(runId),
    };
  }

  /**
   * Get the checkpoint manager
   */
  getCheckpointManager(): CheckpointManager | null {
    return this.checkpointManager;
  }

  /**
   * Get the configuration
   */
  getConfig(): WorkflowFactoryConfig | null {
    return this.config;
  }

  /**
   * Reset the factory (for testing)
   */
  reset(): void {
    this.clear();
    this.executors.clear();
    this.checkpointManager = null;
    this.storage = null;
    this.config = null;
    WorkflowFactory.instance = null;
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Get the global WorkflowFactory instance
 */
export function getWorkflowFactory(): WorkflowFactory {
  return WorkflowFactory.getInstance();
}
