/**
 * WorkflowRegistry - Central registry for workflow definitions
 *
 * Follows NeuroLink's factory + registry pattern used by ProviderFactory.
 * Provides centralized management and lookup for workflow definitions.
 *
 * @module workflow/workflowRegistry
 */

import { logger } from "../utils/logger.js";
import type { WorkflowDefinition } from "./types/workflowTypes.js";

/**
 * WorkflowRegistry - Central registry for workflow definitions
 *
 * Provides static methods for registering, retrieving, and managing
 * workflow definitions. Follows the ProviderFactory pattern.
 *
 * @example
 * ```typescript
 * // Register a workflow
 * const workflow = new WorkflowBuilder('my-workflow')
 *   .name('My Workflow')
 *   .step('step1', { execute: async () => ({ success: true }) })
 *   .build();
 *
 * WorkflowRegistry.register(workflow);
 *
 * // Retrieve a workflow
 * const retrieved = WorkflowRegistry.get('my-workflow');
 *
 * // List all workflows
 * const workflows = WorkflowRegistry.list();
 * ```
 */
export class WorkflowRegistry {
  private static workflows: Map<string, WorkflowDefinition> = new Map();
  private static initialized = false;

  /**
   * Register a workflow definition
   *
   * @param workflow - The workflow definition to register
   * @throws {Error} If workflow has invalid structure
   *
   * @example
   * ```typescript
   * WorkflowRegistry.register({
   *   id: 'my-workflow',
   *   name: 'My Workflow',
   *   steps: new Map(),
   *   graph: { entryPoint: 'step1', edges: [] }
   * });
   * ```
   */
  static register<TInput, TOutput, TState>(workflow: WorkflowDefinition<TInput, TOutput, TState>): void {
    if (!workflow.id) {
      throw new Error("Workflow must have an ID");
    }

    if (!workflow.graph?.entryPoint) {
      throw new Error(`Workflow ${workflow.id} must have an entry point`);
    }

    if (WorkflowRegistry.workflows.has(workflow.id)) {
      logger.warn(`Workflow ${workflow.id} already registered, overwriting`, {
        workflowId: workflow.id,
        workflowName: workflow.name,
      });
    }

    WorkflowRegistry.workflows.set(workflow.id, workflow as WorkflowDefinition);

    logger.debug(`Registered workflow: ${workflow.id} (${workflow.name})`, {
      workflowId: workflow.id,
      workflowName: workflow.name,
      version: workflow.version,
      stepCount: workflow.steps.size,
    });
  }

  /**
   * Get a workflow definition by ID
   *
   * @param workflowId - The ID of the workflow to retrieve
   * @returns The workflow definition, or undefined if not found
   *
   * @example
   * ```typescript
   * const workflow = WorkflowRegistry.get<MyInput, MyOutput>('my-workflow');
   * if (workflow) {
   *   console.log(workflow.name);
   * }
   * ```
   */
  static get<TInput = unknown, TOutput = unknown, TState = unknown>(
    workflowId: string,
  ): WorkflowDefinition<TInput, TOutput, TState> | undefined {
    return WorkflowRegistry.workflows.get(workflowId) as WorkflowDefinition<TInput, TOutput, TState> | undefined;
  }

  /**
   * Check if workflow exists
   *
   * @param workflowId - The ID of the workflow to check
   * @returns True if the workflow exists
   */
  static has(workflowId: string): boolean {
    return WorkflowRegistry.workflows.has(workflowId);
  }

  /**
   * List all registered workflows
   *
   * @returns Array of workflow metadata (id, name, version)
   *
   * @example
   * ```typescript
   * const workflows = WorkflowRegistry.list();
   * workflows.forEach(w => console.log(`${w.id}: ${w.name}`));
   * ```
   */
  static list(): Array<{
    id: string;
    name: string;
    version?: string;
    description?: string;
    tags?: string[];
    stepCount: number;
  }> {
    return Array.from(WorkflowRegistry.workflows.values()).map((w) => ({
      id: w.id,
      name: w.name,
      version: w.version,
      description: w.description,
      tags: w.tags,
      stepCount: w.steps.size,
    }));
  }

  /**
   * Unregister a workflow
   *
   * @param workflowId - The ID of the workflow to unregister
   * @returns True if the workflow was removed
   */
  static unregister(workflowId: string): boolean {
    const removed = WorkflowRegistry.workflows.delete(workflowId);
    if (removed) {
      logger.debug(`Unregistered workflow: ${workflowId}`, { workflowId });
    }
    return removed;
  }

  /**
   * Clear all registrations (for testing)
   */
  static clear(): void {
    WorkflowRegistry.workflows.clear();
    WorkflowRegistry.initialized = false;
    logger.debug("WorkflowRegistry cleared");
  }

  /**
   * Get workflow count
   */
  static count(): number {
    return WorkflowRegistry.workflows.size;
  }

  /**
   * Get all workflow IDs
   */
  static getWorkflowIds(): string[] {
    return Array.from(WorkflowRegistry.workflows.keys());
  }

  /**
   * Find workflows by tag
   *
   * @param tag - The tag to search for
   * @returns Array of matching workflow metadata
   */
  static findByTag(tag: string): Array<{ id: string; name: string; version?: string }> {
    return Array.from(WorkflowRegistry.workflows.values())
      .filter((w) => w.tags?.includes(tag))
      .map((w) => ({
        id: w.id,
        name: w.name,
        version: w.version,
      }));
  }

  /**
   * Check if the registry has been initialized
   */
  static isInitialized(): boolean {
    return WorkflowRegistry.initialized;
  }

  /**
   * Mark the registry as initialized
   */
  static markInitialized(): void {
    WorkflowRegistry.initialized = true;
  }
}

// =============================================================================
// Standalone Utility Functions
// =============================================================================

/**
 * Register a workflow definition (convenience function)
 *
 * @param workflow - The workflow definition to register
 */
export function registerWorkflow<TInput, TOutput, TState>(workflow: WorkflowDefinition<TInput, TOutput, TState>): void {
  WorkflowRegistry.register(workflow);
}

/**
 * Get a workflow definition by ID (convenience function)
 *
 * @param workflowId - The ID of the workflow to retrieve
 * @returns The workflow definition, or undefined if not found
 */
export function getWorkflow<TInput = unknown, TOutput = unknown, TState = unknown>(
  workflowId: string,
): WorkflowDefinition<TInput, TOutput, TState> | undefined {
  return WorkflowRegistry.get<TInput, TOutput, TState>(workflowId);
}

/**
 * List all registered workflows (convenience function)
 *
 * @returns Array of workflow metadata
 */
export function listWorkflows(): Array<{
  id: string;
  name: string;
  version?: string;
  description?: string;
  tags?: string[];
  stepCount: number;
}> {
  return WorkflowRegistry.list();
}
