/**
 * Update Working Memory Tool
 *
 * Agent tool for updating working memory during conversations.
 *
 * @module memory/tools/updateWorkingMemoryTool
 * @since 9.0.0
 */

import type {
  MemoryContext,
  UpdateWorkingMemoryToolDefinition,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import type { WorkingMemoryLayer } from "../layers/workingMemoryLayer.js";

/**
 * Create the updateWorkingMemory tool for agents
 *
 * @param workingMemoryLayer - The working memory layer instance
 * @param context - The memory context (thread and resource IDs)
 * @returns Tool definition for registration with the tool registry
 */
export function createUpdateWorkingMemoryTool(
  workingMemoryLayer: WorkingMemoryLayer,
  context: MemoryContext,
): UpdateWorkingMemoryToolDefinition {
  const definition = workingMemoryLayer.getDefinition();

  if (definition.mode === "template") {
    return createTemplateModeTool(workingMemoryLayer, context, definition);
  }

  return createSchemaModeTool(workingMemoryLayer, context, definition);
}

/**
 * Create tool for template mode (full content replacement)
 */
function createTemplateModeTool(
  workingMemoryLayer: WorkingMemoryLayer,
  context: MemoryContext,
  definition: { mode: "template" | "schema"; definition: string | object },
): UpdateWorkingMemoryToolDefinition {
  return {
    name: "updateWorkingMemory",
    description: `Update the working memory with new information about the user or conversation.
The working memory uses a template format. You must provide the COMPLETE updated content.

Current template structure:
${definition.definition}

${workingMemoryLayer.getUpdateInstructions()}

When updating, include all existing information plus your changes.`,
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The complete updated working memory content",
        },
        reason: {
          type: "string",
          description: "Brief explanation of what was updated and why",
        },
      },
      required: ["content", "reason"],
    },
    execute: async (args: { content?: string; reason: string }) => {
      if (!args.content) {
        return {
          success: false,
          message: "Content is required for template mode",
        };
      }

      try {
        await workingMemoryLayer.update(context, args.content, args.reason);

        logger.info("[updateWorkingMemoryTool] Updated working memory", {
          threadId: context.threadId,
          resourceId: context.resourceId,
          reason: args.reason,
          mode: "template",
        });

        return {
          success: true,
          message: `Working memory updated: ${args.reason}`,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        logger.error(
          "[updateWorkingMemoryTool] Failed to update working memory",
          {
            threadId: context.threadId,
            resourceId: context.resourceId,
            error: errorMessage,
          },
        );

        return {
          success: false,
          message: `Failed to update working memory: ${errorMessage}`,
        };
      }
    },
  };
}

/**
 * Create tool for schema mode (partial updates with merge)
 */
function createSchemaModeTool(
  workingMemoryLayer: WorkingMemoryLayer,
  context: MemoryContext,
  definition: { mode: "template" | "schema"; definition: string | object },
): UpdateWorkingMemoryToolDefinition {
  return {
    name: "updateWorkingMemory",
    description: `Update the working memory with new information about the user or conversation.
The working memory uses a structured JSON format. You only need to include fields you want to update.

Schema:
${JSON.stringify(definition.definition, null, 2)}

${workingMemoryLayer.getUpdateInstructions()}

Existing fields will be preserved unless you explicitly update them.`,
    parameters: {
      type: "object",
      properties: {
        updates: {
          type: "object",
          description: "The fields to update in the working memory",
        },
        reason: {
          type: "string",
          description: "Brief explanation of what was updated and why",
        },
      },
      required: ["updates", "reason"],
    },
    execute: async (args: {
      updates?: Record<string, unknown>;
      reason: string;
    }) => {
      if (!args.updates) {
        return {
          success: false,
          message: "Updates object is required for schema mode",
        };
      }

      try {
        await workingMemoryLayer.update(context, args.updates, args.reason);

        logger.info("[updateWorkingMemoryTool] Updated working memory", {
          threadId: context.threadId,
          resourceId: context.resourceId,
          reason: args.reason,
          mode: "schema",
          updatedFields: Object.keys(args.updates),
        });

        return {
          success: true,
          message: `Working memory updated: ${args.reason}`,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        logger.error(
          "[updateWorkingMemoryTool] Failed to update working memory",
          {
            threadId: context.threadId,
            resourceId: context.resourceId,
            error: errorMessage,
          },
        );

        return {
          success: false,
          message: `Failed to update working memory: ${errorMessage}`,
        };
      }
    },
  };
}
