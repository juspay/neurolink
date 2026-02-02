/**
 * workflow/core/workflowRegistry.ts
 * Registry for managing workflow configurations
 */

import { logger } from "../../utils/logger.js";
import type { WorkflowConfig } from "../types.js";
import { validateForRegistration } from "../utils/workflowValidation.js";
import type {
  ListOptions,
  RegisterOptions,
  RegisterResult,
  RegistryEntry,
  RegistryStats,
  WorkflowMetadata,
} from "./types/index.js";

const functionTag = "WorkflowRegistry";

// ============================================================================
// REGISTRY STORAGE
// ============================================================================

/**
 * In-memory workflow registry
 * TODO: Consider persistent storage in future phases
 */
const workflowRegistry = new Map<string, RegistryEntry>();

// ============================================================================
// REGISTRY OPERATIONS
// ============================================================================

/**
 * Register a new workflow
 * @param config - Workflow configuration to register
 * @param options - Registration options
 * @returns Registration result
 */
export function registerWorkflow(
  config: WorkflowConfig,
  options: RegisterOptions = {},
): RegisterResult {
  const { validateBeforeRegister = true, allowOverwrite = false } = options;

  logger.info(`[${functionTag}] Registering workflow`, {
    workflowId: config.id,
    name: config.name,
    type: config.type,
  });

  // Validate if requested
  if (validateBeforeRegister) {
    const validation = validateForRegistration(config);
    if (!validation.valid) {
      logger.error(`[${functionTag}] Workflow validation failed`, {
        workflowId: config.id,
        errors: validation.errors,
      });
      return {
        success: false,
        workflowId: config.id,
        validation,
        error: "Workflow validation failed",
      };
    }
  }

  // Check for existing workflow
  if (workflowRegistry.has(config.id) && !allowOverwrite) {
    logger.warn(`[${functionTag}] Workflow already exists`, {
      workflowId: config.id,
    });
    return {
      success: false,
      workflowId: config.id,
      error: "Workflow already exists. Set allowOverwrite=true to replace.",
    };
  }

  // Register workflow
  const entry: RegistryEntry = {
    config: { ...config },
    registeredAt: new Date().toISOString(),
    usageCount: 0,
  };

  workflowRegistry.set(config.id, entry);

  logger.info(`[${functionTag}] Workflow registered successfully`, {
    workflowId: config.id,
    name: config.name,
  });

  return {
    success: true,
    workflowId: config.id,
  };
}

/**
 * Unregister a workflow
 * @param workflowId - ID of workflow to unregister
 * @returns True if workflow was unregistered
 */
export function unregisterWorkflow(workflowId: string): boolean {
  const exists = workflowRegistry.has(workflowId);

  if (exists) {
    workflowRegistry.delete(workflowId);
    logger.info(`[${functionTag}] Workflow unregistered`, { workflowId });
  } else {
    logger.warn(`[${functionTag}] Workflow not found for unregistration`, {
      workflowId,
    });
  }

  return exists;
}

/**
 * Get workflow configuration by ID
 * @param workflowId - ID of workflow to retrieve
 * @returns Workflow configuration or undefined
 */
export function getWorkflow(workflowId: string): WorkflowConfig | undefined {
  const entry = workflowRegistry.get(workflowId);

  if (entry) {
    // Update last used timestamp
    entry.lastUsed = new Date().toISOString();
    entry.usageCount++;

    logger.debug(`[${functionTag}] Workflow retrieved`, {
      workflowId,
      usageCount: entry.usageCount,
    });

    return entry.config;
  }

  logger.warn(`[${functionTag}] Workflow not found`, { workflowId });
  return undefined;
}

/**
 * Check if workflow exists
 * @param workflowId - ID of workflow to check
 * @returns True if workflow exists
 */
export function hasWorkflow(workflowId: string): boolean {
  return workflowRegistry.has(workflowId);
}

/**
 * List all registered workflows
 * @param options - Listing options for filtering
 * @returns Array of workflow configurations
 */
export function listWorkflows(options: ListOptions = {}): WorkflowConfig[] {
  const { type, tags, limit, offset = 0 } = options;

  let workflows = Array.from(workflowRegistry.values()).map(
    (entry) => entry.config,
  );

  // Filter by type
  if (type) {
    workflows = workflows.filter((w) => w.type === type);
  }

  // Filter by tags
  if (tags && tags.length > 0) {
    workflows = workflows.filter((w) => {
      if (!w.tags || w.tags.length === 0) {
        return false;
      }
      return tags.some((tag) => w.tags?.includes(tag));
    });
  }

  // Apply pagination
  if (limit !== undefined) {
    workflows = workflows.slice(offset, offset + limit);
  }

  logger.debug(`[${functionTag}] Listed workflows`, {
    count: workflows.length,
    type,
    tags,
  });

  return workflows;
}

/**
 * Get workflow metadata (usage stats, timestamps)
 * @param workflowId - ID of workflow
 * @returns Metadata or undefined
 */
export function getWorkflowMetadata(
  workflowId: string,
): WorkflowMetadata | undefined {
  const entry = workflowRegistry.get(workflowId);

  if (!entry) {
    return undefined;
  }

  return {
    registeredAt: entry.registeredAt,
    lastUsed: entry.lastUsed,
    usageCount: entry.usageCount,
  };
}

/**
 * Update workflow configuration
 * @param workflowId - ID of workflow to update
 * @param updates - Partial workflow config with updates
 * @param options - Update options
 * @returns Update result
 */
export function updateWorkflow(
  workflowId: string,
  updates: Partial<WorkflowConfig>,
  options: RegisterOptions = {},
): RegisterResult {
  const existing = workflowRegistry.get(workflowId);

  if (!existing) {
    logger.warn(`[${functionTag}] Workflow not found for update`, {
      workflowId,
    });
    return {
      success: false,
      workflowId,
      error: "Workflow not found",
    };
  }

  // Merge updates with existing config
  const updatedConfig: WorkflowConfig = {
    ...existing.config,
    ...updates,
    id: workflowId, // Ensure ID doesn't change
    updatedAt: new Date().toISOString(),
  };

  // Validate if requested
  const { validateBeforeRegister = true } = options;
  if (validateBeforeRegister) {
    const validation = validateForRegistration(updatedConfig);
    if (!validation.valid) {
      logger.error(`[${functionTag}] Updated workflow validation failed`, {
        workflowId,
        errors: validation.errors,
      });
      return {
        success: false,
        workflowId,
        validation,
        error: "Updated workflow validation failed",
      };
    }
  }

  // Update registry entry
  existing.config = updatedConfig;

  logger.info(`[${functionTag}] Workflow updated successfully`, {
    workflowId,
  });

  return {
    success: true,
    workflowId,
  };
}

/**
 * Clear all workflows from registry
 * WARNING: This will remove all registered workflows
 */
export function clearRegistry(): void {
  const count = workflowRegistry.size;
  workflowRegistry.clear();

  logger.info(`[${functionTag}] Registry cleared`, {
    workflowsRemoved: count,
  });
}

/**
 * Get registry statistics
 * @returns Statistics about registered workflows
 */
export function getRegistryStats(): RegistryStats {
  const entries = Array.from(workflowRegistry.values());

  const byType: Record<string, number> = {};
  let totalUsage = 0;
  let mostUsed: { id: string; name: string; count: number } | undefined;

  entries.forEach((entry) => {
    // Count by type
    const type = entry.config.type;
    byType[type] = (byType[type] || 0) + 1;

    // Sum usage
    totalUsage += entry.usageCount;

    // Track most used
    if (!mostUsed || entry.usageCount > mostUsed.count) {
      mostUsed = {
        id: entry.config.id,
        name: entry.config.name,
        count: entry.usageCount,
      };
    }
  });

  return {
    totalWorkflows: workflowRegistry.size,
    byType,
    totalUsage,
    mostUsed: mostUsed && mostUsed.count > 0 ? mostUsed : undefined,
  };
}

/**
 * Export registry as JSON for backup/sharing
 * @returns JSON string of all workflows
 */
export function exportRegistry(): string {
  const workflows = Array.from(workflowRegistry.values()).map(
    (entry) => entry.config,
  );
  return JSON.stringify(workflows, null, 2);
}

/**
 * Import workflows from JSON
 * @param json - JSON string of workflow configs
 * @param options - Import options
 * @returns Array of registration results
 */
export function importRegistry(
  json: string,
  options: RegisterOptions = {},
): RegisterResult[] {
  try {
    const workflows = JSON.parse(json) as WorkflowConfig[];
    const results: RegisterResult[] = [];

    workflows.forEach((config) => {
      const result = registerWorkflow(config, options);
      results.push(result);
    });

    logger.info(`[${functionTag}] Registry import completed`, {
      total: workflows.length,
      successful: results.filter((r) => r.success).length,
    });

    return results;
  } catch (error) {
    logger.error(`[${functionTag}] Registry import failed`, {
      error: (error as Error).message,
    });
    return [
      {
        success: false,
        workflowId: "import-error",
        error: `Import failed: ${(error as Error).message}`,
      },
    ];
  }
}
