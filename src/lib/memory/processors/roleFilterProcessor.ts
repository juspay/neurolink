/**
 * Role Filter Processor
 *
 * Memory processor that filters messages based on their roles.
 * Can be used to include or exclude specific message types.
 *
 * @module memory/processors/roleFilterProcessor
 * @since 9.0.0
 */

import type {
  ChatMessage,
  MemoryProcessor,
  ProcessorContext,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Role Filter Processor
 *
 * Filters messages based on their roles.
 * Can either include only specific roles or exclude specific roles.
 */
export class RoleFilterProcessor implements MemoryProcessor {
  readonly name = "roleFilter";

  /**
   * Process messages by filtering on role
   *
   * @param messages - Input messages
   * @param context - Processor context with filter options
   * @returns Filtered messages
   */
  process(messages: ChatMessage[], context: ProcessorContext): ChatMessage[] {
    const { includeRoles, excludeRoles } = context.config;

    // No filtering configured
    if (!includeRoles && !excludeRoles) {
      return messages;
    }

    const originalCount = messages.length;

    let filtered = messages;

    // Include filter (whitelist)
    if (includeRoles && includeRoles.length > 0) {
      const roleSet = new Set(includeRoles);
      filtered = filtered.filter((msg) => roleSet.has(msg.role));
    }

    // Exclude filter (blacklist)
    if (excludeRoles && excludeRoles.length > 0) {
      const roleSet = new Set(excludeRoles);
      filtered = filtered.filter((msg) => !roleSet.has(msg.role));
    }

    logger.debug("[RoleFilterProcessor] Filtered messages by role", {
      originalCount,
      filteredCount: filtered.length,
      includeRoles,
      excludeRoles,
    });

    return filtered;
  }
}

/**
 * Create a role filter processor
 */
export function createRoleFilterProcessor(): RoleFilterProcessor {
  return new RoleFilterProcessor();
}
