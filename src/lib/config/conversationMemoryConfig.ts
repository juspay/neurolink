/**
 * Conversation Memory Configuration
 * Provides default values for conversation memory feature with environment variable support
 */

import type { ConversationMemoryConfig } from "../types/conversationTypes.js";

/**
 * Default maximum number of turns per session
 */
export const DEFAULT_MAX_TURNS_PER_SESSION = 50;

/**
 * Default maximum number of sessions
 */
export const DEFAULT_MAX_SESSIONS = 50;

/**
 * Number of messages per conversation turn (user + assistant)
 */
export const MESSAGES_PER_TURN = 2;

/**
 * Conversation instructions for ongoing conversations
 * Used to enhance system prompts when conversation history exists
 */
export const CONVERSATION_INSTRUCTIONS = `

IMPORTANT: You are continuing an ongoing conversation. The previous messages in this conversation contain important context including:
- Names, personal information, and preferences shared by the user
- Projects, tasks, and topics discussed previously  
- Any decisions, agreements, or conclusions reached

Always reference and build upon this conversation history when relevant. If the user asks about information mentioned earlier in the conversation, refer to those previous messages to provide accurate, contextual responses.`;

/**
 * Get default configuration values for conversation memory
 * Reads environment variables when called (not at module load time)
 */
export function getConversationMemoryDefaults(): ConversationMemoryConfig {
  return {
    enabled: process.env.NEUROLINK_MEMORY_ENABLED === "true",
    maxSessions:
      Number(process.env.NEUROLINK_MEMORY_MAX_SESSIONS) || DEFAULT_MAX_SESSIONS,
    maxTurnsPerSession:
      Number(process.env.NEUROLINK_MEMORY_MAX_TURNS_PER_SESSION) ||
      DEFAULT_MAX_TURNS_PER_SESSION,
  };
}
