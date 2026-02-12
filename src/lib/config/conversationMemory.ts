/**
 * Conversation Memory Configuration
 * Provides default values for conversation memory feature with environment variable support
 */

import type { ConversationMemoryConfig } from "../types/conversation.js";

/**
 * Default maximum number of turns per session
 * @deprecated Use tokenThreshold-based memory management instead.
 * This constant is kept for backward compatibility with legacy turn-based memory.
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
 * Percentage of model context window to use for conversation memory threshold
 * Default: 80% of model's context window
 */
export const MEMORY_THRESHOLD_PERCENTAGE = 0.8;

/**
 * Fallback token threshold if model context unknown
 */
export const DEFAULT_FALLBACK_THRESHOLD = 50000;

/**
 * Ratio of threshold to keep as recent unsummarized messages
 * When summarization triggers, this percentage of tokens from the end
 * are preserved as detailed messages, while older content gets summarized.
 */
export const RECENT_MESSAGES_RATIO = 0.3;

/**
 * Structured output instructions for JSON/structured output mode
 * Used to ensure AI providers output only valid JSON without conversational filler
 * This addresses the issue where models add text like "Excellent!" before JSON output
 * and the case where tools are used but final output must still be pure JSON
 */
export const STRUCTURED_OUTPUT_INSTRUCTIONS = `
Output ONLY valid JSON. No markdown, text, or decorations—ever.

FORBIDDEN: markdown code blocks, text before/after JSON, explanations, preambles, summaries, conversational text about tools.

REQUIRED: response starts with { and ends with }, valid JSON only, no additional characters.

IF YOU CALLED TOOLS: Incorporate data directly into the JSON structure. Do NOT explain what you did.

WRONG: \`\`\`json
{"field": "value"}
\`\`\`
WRONG: Based on the data, here's the result: {"field": "value"}
CORRECT: {"field": "value"}

Your entire response = raw JSON object. Nothing else.`;

/**
 * Get default configuration values for conversation memory
 * Reads environment variables when called (not at module load time)
 */
export function getConversationMemoryDefaults(): ConversationMemoryConfig {
  return {
    enabled: process.env.NEUROLINK_MEMORY_ENABLED === "true",
    maxSessions:
      Number(process.env.NEUROLINK_MEMORY_MAX_SESSIONS) || DEFAULT_MAX_SESSIONS,
    enableSummarization:
      process.env.NEUROLINK_SUMMARIZATION_ENABLED !== "false",
    tokenThreshold: process.env.NEUROLINK_TOKEN_THRESHOLD
      ? Number(process.env.NEUROLINK_TOKEN_THRESHOLD)
      : undefined,
    summarizationProvider:
      process.env.NEUROLINK_SUMMARIZATION_PROVIDER || "vertex",
    summarizationModel:
      process.env.NEUROLINK_SUMMARIZATION_MODEL || "gemini-2.5-flash",

    // @deprecated — Turn-based fields are superseded by tokenThreshold-based memory.
    // Kept for backward compatibility; will be removed in a future major version.
    maxTurnsPerSession: DEFAULT_MAX_TURNS_PER_SESSION,
  };
}
