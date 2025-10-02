/**
 * Loop Mode Utilities
 * Utilities specific to CLI loop mode session management and restoration
 */

import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { globalSession } from "../session/globalSessionState.js";
import { logger } from "./logger.js";
import type { ChatMessage, ConversationData } from "../types/conversation.js";
import type { SessionRestoreResult } from "../types/cli.js";

/**
 * Verify that conversation context is accessible and properly loaded
 * Uses the global session to access the NeuroLink instance
 */
export async function verifyConversationContext(
  sessionId: string,
): Promise<void> {
  const session = globalSession.getLoopSession();
  if (!session) {
    logger.warn("No active session found for conversation verification");
    return;
  }

  try {
    const messages =
      await session.neurolinkInstance.getConversationHistory(sessionId);
    logger.debug(
      `Successfully loaded ${messages.length} messages from conversation ${sessionId}`,
    );

    if (messages.length === 0) {
      logger.warn(
        `No messages found for session ${sessionId} after restoration`,
      );
      logger.warn(
        "The conversation exists in Redis but may not be accessible through the API",
      );
    } else {
      logger.info(
        `Conversation context restored successfully: ${messages.length} messages loaded`,
      );
    }
  } catch (error) {
    logger.warn(
      "Could not access conversation history after restoration:",
      error,
    );
    logger.warn(
      "The conversation may still be accessible when generating new responses",
    );
  }
}

/**
 * Get conversation context for display (first few and last few messages)
 * Uses the global session to access the NeuroLink instance
 */
export async function getConversationPreview(
  sessionId: string,
  previewCount: number = 2,
): Promise<ChatMessage[]> {
  const session = globalSession.getLoopSession();
  if (!session) {
    logger.debug("No active session found for conversation preview");
    return [];
  }

  try {
    const allMessages =
      await session.neurolinkInstance.getConversationHistory(sessionId);

    if (allMessages.length <= previewCount * 2) {
      return allMessages;
    }

    const firstMessages = allMessages.slice(0, previewCount);
    const lastMessages = allMessages.slice(-previewCount);

    return [...firstMessages, ...lastMessages];
  } catch (error) {
    logger.debug("Failed to get conversation preview:", error);
    return [];
  }
}

/**
 * Generate a title from content by truncating to appropriate length
 */
export function generateConversationTitle(content: string): string {
  const truncated = content.slice(0, LOOP_DISPLAY_LIMITS.TITLE_LENGTH);
  return truncated.length < content.length ? `${truncated}...` : truncated;
}

/**
 * Truncate text content to specified length with ellipsis
 */
export function truncateText(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.slice(0, maxLength)}...`;
}

/**
 * Format timestamp as human-readable relative time
 * Uses Intl.RelativeTimeFormat for natural language output
 */
export function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const date = new Date(timestamp);

  if (isNaN(date.getTime())) {
    logger.warn(`Invalid timestamp provided: ${timestamp}`);
    return "Unknown time";
  }

  const diffSeconds = Math.floor((date.getTime() - now) / 1000);

  for (const { unit, seconds } of TIME_UNITS) {
    if (Math.abs(diffSeconds) >= seconds || unit === "minute") {
      return rtf.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return rtf.format(0, "second");
}

/**
 * Get appropriate icon for content based on regex patterns
 */
export function getContentIcon(content: string): string {
  const match = CONTENT_ICON_PATTERNS.find((pattern) =>
    pattern.pattern.test(content),
  );
  return match?.icon ?? "📝";
}

/**
 * Display session restoration status message
 */
export function displaySessionMessage(result: SessionRestoreResult): void {
  if (result.success) {
    logger.always(
      chalk.green(
        `✅ Resumed conversation: ${result.sessionId.slice(0, LOOP_DISPLAY_LIMITS.SESSION_ID_DISPLAY)}...`,
      ),
    );
    logger.always(
      chalk.gray(
        `   ${result.messageCount} messages | Last activity: ${
          result.lastActivity
            ? new Date(result.lastActivity).toLocaleString()
            : "Unknown"
        }`,
      ),
    );
  } else {
    logger.always(
      chalk.red(`❌ Failed to restore conversation: ${result.error}`),
    );
    logger.always(chalk.gray("   Starting new conversation instead..."));
  }
}

/**
 * Load command history from the global history file
 */
export async function loadCommandHistory(): Promise<string[]> {
  try {
    const content = await fs.readFile(HISTORY_FILE, "utf8");
    return content.split("\n").filter((line) => line.trim());
  } catch {
    return [];
  }
}

/**
 * Save a command to the global history file
 */
export async function saveCommandToHistory(command: string): Promise<void> {
  try {
    const sensitivePattern =
      /\b(api[-_]?key|token|password|secret|authorization)\b/i;
    if (sensitivePattern.test(command)) {
      return;
    }

    await fs.writeFile(HISTORY_FILE, command + "\n", {
      flag: "a",
      mode: 0o600,
    });
    await fs.chmod(HISTORY_FILE, 0o600);
  } catch (error) {
    logger.warn("Warning: Could not save command to history:", error as Error);
  }
}

/**
 * Display conversation preview with formatted messages
 */
export function displayConversationPreview(
  preview: ChatMessage[],
  maxPreview: number = 2,
): void {
  if (preview.length === 0) {
    return;
  }

  logger.always(chalk.gray("\n--- Conversation Preview ---"));
  preview.slice(0, maxPreview).forEach((msg) => {
    const role = msg.role === "user" ? chalk.cyan("You") : chalk.green("AI");
    const content =
      msg.content.length > 100
        ? msg.content.slice(0, 100) + "..."
        : msg.content;
    logger.always(`${role}: ${content}`);
  });

  if (preview.length > maxPreview) {
    logger.always(chalk.gray("... (conversation continues)"));
  }
  logger.always(chalk.gray("--- End Preview ---\n"));
}

/**
 * Parse a string value to its appropriate type (string, number, or boolean)
 * Useful for parsing user input from CLI commands
 */
export function parseValue(value: string): string | number | boolean {
  // Try to parse as number
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  // Try to parse as boolean
  if (value.toLowerCase() === "true") {
    return true;
  }
  if (value.toLowerCase() === "false") {
    return false;
  }
  // Return as string
  return value;
}

/**
 * Restore session variables from conversation metadata
 * Extracts and sets session variables stored in conversation metadata
 */
export async function restoreSessionVariables(
  conversationData: ConversationData,
): Promise<void> {
  try {
    // Check if conversation has stored session variables
    const metadata = conversationData.metadata;
    if (metadata && metadata.sessionVariables) {
      logger.debug("Restoring session variables from conversation metadata");

      const sessionVariables = metadata.sessionVariables;
      for (const [key, value] of Object.entries(sessionVariables)) {
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          globalSession.setSessionVariable(key, value);
          logger.debug(`Restored session variable: ${key} = ${value}`);
        }
      }
    } else {
      logger.debug("No session variables found in conversation metadata");
    }
  } catch (error) {
    logger.warn("Failed to restore session variables:", error);
    // Don't fail the restoration for this
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const HISTORY_FILE = path.join(os.homedir(), ".neurolink_history");

export const LOOP_CACHE_CONFIG = {
  TTL_MS: 5 * 60 * 1000,
} as const;

export const LOOP_DISPLAY_LIMITS = {
  MAX_CONVERSATIONS: 20,
  CONTENT_LENGTH: 50,
  TITLE_LENGTH: 40,
  SESSION_ID_DISPLAY: 12,
  SESSION_ID_SHORT: 8,
  PAGE_SIZE: 15,
} as const;

const TIME_UNITS: ReadonlyArray<{
  unit: Intl.RelativeTimeFormatUnit;
  seconds: number;
}> = [
  { unit: "year", seconds: 31536000 },
  { unit: "month", seconds: 2592000 },
  { unit: "week", seconds: 604800 },
  { unit: "day", seconds: 86400 },
  { unit: "hour", seconds: 3600 },
  { unit: "minute", seconds: 60 },
] as const;

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const CONTENT_ICON_PATTERNS = [
  {
    icon: "💻",
    pattern:
      /\b(code|debug|programming|function|class|bug|script|syntax|compile|error)\b/i,
  },
  {
    icon: "💡",
    pattern: /\b(explain|what|how|why|understand|clarify|learn|teach)\b/i,
  },
  {
    icon: "📊",
    pattern:
      /\b(analyz[e|ing]|data|report|metrics?|statistics?|chart|graph|visualiz[e|ation])\b/i,
  },
  {
    icon: "✍️",
    pattern: /\b(write|create|generat[e|ing]|compose|draft|build|author)\b/i,
  },
  {
    icon: "🤖",
    pattern: /\b(help|assist|support|guide|tutorial|show me)\b/i,
  },
] as const;
