/**
 * Mem0 Memory Initializer
 * Simple initialization logic for mem0ai cloud API integration
 */

import { MemoryClient } from "mem0ai";
import { logger } from "../utils/logger.js";

/**
 * Mem0 cloud API configuration
 */
export interface Mem0Config {
  apiKey: string;
  /**
   * Optional organization ID - if not provided, will be auto-populated from ping() response
   */
  organizationId?: string;
  /**
   * Optional project ID - if not provided, will be auto-populated from ping() response
   */
  projectId?: string;
  /**
   * Whether to update project-level custom instructions during initialization
   * Default: false (don't update project settings)
   *
   * Note: organizationId and projectId are NOT required - they will be auto-populated
   * from the mem0 API via ping() if not provided
   */
  updateProjectSettings?: boolean;
  /**
   * Custom instructions and categories for mem0 extraction behavior
   * Only used if updateProjectSettings is true
   */
  customPrompts?: {
    /**
     * Custom instructions for how mem0 should extract and store memories
     * This applies to ALL memories added to the project
     */
    custom_instructions?: string;
    /**
     * Custom categories for organizing memories
     */
    custom_categories?: Array<Record<string, unknown>>;
  };
}

/**
 * Initialize mem0 memory instance with cloud API and optional project settings
 */
export async function initializeMem0(
  mem0Config: Mem0Config,
): Promise<MemoryClient | null> {
  // Guard: skip initialization if API key is missing
  if (!mem0Config?.apiKey || mem0Config.apiKey.trim() === "") {
    logger.warn(
      "[mem0Initializer] Missing MEM0_API_KEY; skipping mem0 initialization",
    );
    return null;
  }

  logger.debug("[mem0Initializer] Starting mem0 cloud API initialization");

  try {
    // Create MemoryClient instance with cloud API
    const client = new MemoryClient({
      apiKey: mem0Config.apiKey,
      organizationId: mem0Config.organizationId,
      projectId: mem0Config.projectId,
    });

    // Track whether project settings were actually updated (not just requested)
    let projectSettingsUpdated = false;

    // Update project-level settings if requested
    if (mem0Config.updateProjectSettings && mem0Config.customPrompts) {
      // Build update payload - only include fields that are actually provided
      const updatePayload: {
        custom_instructions?: string;
        custom_categories?: Array<Record<string, unknown>>;
      } = {};

      if (
        mem0Config.customPrompts.custom_instructions &&
        mem0Config.customPrompts.custom_instructions.trim() !== ""
      ) {
        updatePayload.custom_instructions =
          mem0Config.customPrompts.custom_instructions;
      }

      if (
        Array.isArray(mem0Config.customPrompts.custom_categories) &&
        mem0Config.customPrompts.custom_categories.length > 0
      ) {
        updatePayload.custom_categories =
          mem0Config.customPrompts.custom_categories;
      }

      // Only proceed if there's something to update
      if (Object.keys(updatePayload).length > 0) {
        try {
          // Note: updateProject() internally calls ping() first, which auto-populates
          // organizationId and projectId from the server, so they're not required
          await client.updateProject(updatePayload);
          projectSettingsUpdated = true; // Only set to true on successful update

          logger.info(
            "[mem0Initializer] Project settings updated successfully",
            {
              hasInstructions: !!updatePayload.custom_instructions,
              hasCategories: !!updatePayload.custom_categories,
              // Note: These IDs are auto-populated by ping() inside updateProject()
              organizationId: client.organizationId,
              projectId: client.projectId,
            },
          );
        } catch (error) {
          logger.warn("[mem0Initializer] Failed to update project settings", {
            error: error instanceof Error ? error.message : String(error),
            hint: "Ensure your MEM0_API_KEY has permission to update project settings",
          });
          // Continue initialization even if project update fails
          // projectSettingsUpdated remains false
        }
      } else {
        logger.warn(
          "[mem0Initializer] updateProjectSettings=true but no custom instructions or categories provided - nothing to update",
        );
      }
    } else if (mem0Config.updateProjectSettings && !mem0Config.customPrompts) {
      logger.warn(
        "[mem0Initializer] updateProjectSettings=true but customPrompts not provided - nothing to update",
      );
    }

    logger.info("[mem0Initializer] Mem0 cloud API initialized successfully", {
      hasOrgId: !!client.organizationId,
      hasProjectId: !!client.projectId,
      projectSettingsUpdated,
    });

    return client;
  } catch (error) {
    logger.warn(
      "[mem0Initializer] Failed to initialize mem0 cloud API; disabling mem0",
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );

    return null;
  }
}
