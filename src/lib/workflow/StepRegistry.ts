/**
 * Step Registry
 *
 * Central registry for step type definitions following the NeuroLink Factory pattern.
 * Allows dynamic registration and lazy loading of step implementations.
 *
 * @module workflow/StepRegistry
 */

import { BaseRegistry } from "../core/infrastructure/index.js";
import { logger } from "../utils/logger.js";
import { RegistryError, WorkflowErrorCodes } from "./errors/WorkflowError.js";
import type { RetryConfig, StepConfig, StepDefinition } from "./types/workflowTypes.js";

// =============================================================================
// Step Type Metadata
// =============================================================================

/**
 * Step type categories
 */
export type StepCategory = "transform" | "condition" | "parallel" | "loop" | "wait" | "human" | "ai" | "custom";

/**
 * Step type metadata
 */
export interface StepTypeMetadata {
  /** Step type name */
  name: string;
  /** Description of what this step type does */
  description: string;
  /** Category for organization */
  category: StepCategory;
  /** Version of the step type */
  version: string;
  /** Whether this step type supports suspension */
  supportsSuspension: boolean;
  /** Default timeout for this step type */
  defaultTimeout?: number;
  /** Default retry configuration */
  defaultRetry?: Partial<RetryConfig>;
  /** Tags for filtering */
  tags?: string[];
}

/**
 * Step type factory function
 *
 * Note: This is a generic factory type. Specific step factories may require
 * additional config properties beyond StepConfig. Using `any` to allow
 * the registry to store heterogeneous step factories with different signatures.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StepTypeFactory = (config: any) => StepDefinition<any, any>;

// =============================================================================
// Step Registry
// =============================================================================

/**
 * Step registry entry
 */
interface StepRegistryEntry {
  factory: StepTypeFactory;
  metadata: StepTypeMetadata;
}

/**
 * StepRegistry - Registry for step type definitions
 *
 * Follows the BaseRegistry pattern used throughout NeuroLink.
 * Enables dynamic registration of step types with lazy loading.
 *
 * @example
 * ```typescript
 * // Register a custom step type
 * StepRegistry.register('custom-ai', createAIStepFactory, {
 *   name: 'AI Step',
 *   description: 'Step that uses AI generation',
 *   category: 'ai',
 *   version: '1.0.0',
 *   supportsSuspension: false,
 * });
 *
 * // Create a step using the registered type
 * const stepFactory = StepRegistry.getFactory('custom-ai');
 * const step = stepFactory({ id: 'my-step', execute: async (input) => ... });
 * ```
 */
export class StepRegistry extends BaseRegistry<StepTypeFactory, StepTypeMetadata> {
  private static instance: StepRegistry;
  private stepDefinitions: Map<string, StepDefinition> = new Map();
  private aliases: Map<string, string> = new Map();

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): StepRegistry {
    if (!StepRegistry.instance) {
      StepRegistry.instance = new StepRegistry();
    }
    return StepRegistry.instance;
  }

  /**
   * Register all built-in step types
   */
  protected async registerAll(): Promise<void> {
    // Register built-in step types with dynamic imports
    await this.registerBuiltInStepTypes();
    logger.debug("StepRegistry: All built-in step types registered");
  }

  /**
   * Register built-in step types
   */
  private async registerBuiltInStepTypes(): Promise<void> {
    // Transform step type
    this.register(
      "transform",
      async () => {
        const { createTransformStepFactory } = await import("./steps/TransformStep.js");
        return createTransformStepFactory();
      },
      {
        name: "Transform",
        description: "Transform data between steps",
        category: "transform",
        version: "1.0.0",
        supportsSuspension: false,
        defaultTimeout: 30000,
      },
    );

    // Condition step type
    this.register(
      "condition",
      async () => {
        const { createConditionStepFactory } = await import("./steps/ConditionStep.js");
        return createConditionStepFactory();
      },
      {
        name: "Condition",
        description: "Conditional branching step",
        category: "condition",
        version: "1.0.0",
        supportsSuspension: false,
        defaultTimeout: 5000,
      },
    );

    // Parallel step type
    this.register(
      "parallel",
      async () => {
        const { createParallelStepFactory } = await import("./steps/ParallelStep.js");
        return createParallelStepFactory();
      },
      {
        name: "Parallel",
        description: "Execute multiple steps in parallel",
        category: "parallel",
        version: "1.0.0",
        supportsSuspension: false,
        defaultTimeout: 60000,
      },
    );

    // Loop step type
    this.register(
      "loop",
      async () => {
        const { createLoopStepFactory } = await import("./steps/LoopStep.js");
        return createLoopStepFactory();
      },
      {
        name: "Loop",
        description: "Iterate over collections or conditions",
        category: "loop",
        version: "1.0.0",
        supportsSuspension: true,
        defaultTimeout: 300000, // 5 minutes for loops
      },
    );

    // Wait step type
    this.register(
      "wait",
      async () => {
        const { createWaitStepFactory } = await import("./steps/WaitStep.js");
        return createWaitStepFactory();
      },
      {
        name: "Wait",
        description: "Wait for a condition or timeout",
        category: "wait",
        version: "1.0.0",
        supportsSuspension: true,
        defaultTimeout: 600000, // 10 minutes
      },
    );

    // Human step type
    this.register(
      "human",
      async () => {
        const { createHumanStepFactory } = await import("./steps/HumanStep.js");
        return createHumanStepFactory();
      },
      {
        name: "Human",
        description: "Step requiring human input or approval",
        category: "human",
        version: "1.0.0",
        supportsSuspension: true,
        defaultTimeout: 86400000, // 24 hours
      },
    );

    // Add aliases
    this.addAlias("map", "transform");
    this.addAlias("branch", "condition");
    this.addAlias("if", "condition");
    this.addAlias("concurrent", "parallel");
    this.addAlias("forEach", "loop");
    this.addAlias("iterate", "loop");
    this.addAlias("delay", "wait");
    this.addAlias("sleep", "wait");
    this.addAlias("approval", "human");
    this.addAlias("hitl", "human");
  }

  /**
   * Add an alias for a step type
   */
  addAlias(alias: string, stepType: string): void {
    this.aliases.set(alias.toLowerCase(), stepType.toLowerCase());
  }

  /**
   * Resolve an alias to the actual step type
   */
  resolveAlias(nameOrAlias: string): string {
    const lower = nameOrAlias.toLowerCase();
    return this.aliases.get(lower) || lower;
  }

  /**
   * Get a step type factory by name
   */
  async getFactory(stepType: string): Promise<StepTypeFactory> {
    const resolved = this.resolveAlias(stepType);
    const factory = await this.get(resolved);

    if (!factory) {
      throw new RegistryError(`Step type '${stepType}' not found in registry`, WorkflowErrorCodes.WORKFLOW_NOT_FOUND, {
        details: { stepType, resolved },
      });
    }

    return factory;
  }

  /**
   * Get metadata for a step type
   */
  getMetadata(stepType: string): StepTypeMetadata | undefined {
    const resolved = this.resolveAlias(stepType);
    const entry = this.items.get(resolved);
    return entry?.metadata;
  }

  /**
   * Register a step definition (instance)
   */
  registerStepDefinition(step: StepDefinition): void {
    if (this.stepDefinitions.has(step.id)) {
      logger.warn(`Step definition '${step.id}' already registered, overwriting`);
    }
    this.stepDefinitions.set(step.id, step);
    logger.debug(`Registered step definition: ${step.id}`);
  }

  /**
   * Get a step definition by ID
   */
  getStepDefinition<TInput = unknown, TOutput = unknown>(stepId: string): StepDefinition<TInput, TOutput> | undefined {
    return this.stepDefinitions.get(stepId) as StepDefinition<TInput, TOutput> | undefined;
  }

  /**
   * Check if a step definition exists
   */
  hasStepDefinition(stepId: string): boolean {
    return this.stepDefinitions.has(stepId);
  }

  /**
   * Unregister a step definition
   */
  unregisterStepDefinition(stepId: string): boolean {
    return this.stepDefinitions.delete(stepId);
  }

  /**
   * List all registered step definitions
   */
  listStepDefinitions(): Array<{ id: string; name: string }> {
    return Array.from(this.stepDefinitions.values()).map((step) => ({
      id: step.id,
      name: step.name,
    }));
  }

  /**
   * List step types by category
   */
  listByCategory(category: StepCategory): Array<{ id: string; metadata: StepTypeMetadata }> {
    return this.list().filter((entry) => entry.metadata.category === category);
  }

  /**
   * Clear all step definitions (for testing)
   */
  clearStepDefinitions(): void {
    this.stepDefinitions.clear();
  }

  /**
   * Reset the registry (for testing)
   */
  reset(): void {
    this.clear();
    this.clearStepDefinitions();
    this.aliases.clear();
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Get the global StepRegistry instance
 */
export function getStepRegistry(): StepRegistry {
  return StepRegistry.getInstance();
}
