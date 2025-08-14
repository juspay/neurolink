import type { ContextManagerConfig, ChatMessage } from "./types.js";
import { formatHistoryToString } from "./utils.js";

/**
 * Estimates the word count of a conversation history.
 */
function estimateWordCount(history: ChatMessage[]): number {
  if (!history || history.length === 0) {
    return 0;
  }
  return history.reduce(
    (acc, msg) =>
      acc +
      (msg.content
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length || 0),
    0,
  );
}

/**
 * Generates the default prompt for summarization.
 */
function getDefaultSummarizationPrompt(
  history: ChatMessage[],
  wordLimit: number,
): string {
  const formattedHistory = formatHistoryToString(history);
  return `
You are a context summarization AI. Your task is to condense the following conversation history for another AI assistant.
The summary must be a concise, third-person narrative that retains all critical information. Pay special attention to retaining key entities, technical details, decisions made, and any specific dates or times mentioned.
Ensure the summary flows logically and is ready to be used as context for the next turn in the conversation.
Please keep the summary under ${wordLimit} words.

Conversation History to Summarize:
---
${formattedHistory}
---
`.trim();
}

/**
 * Default configuration for the ContextManager.
 */
export const defaultContextConfig: ContextManagerConfig = {
  highWaterMarkWords: 3000,
  lowWaterMarkWords: 800,
  summarizationModel: "gemini-2.5-flash",
  summarizationProvider: "googlevertex",
  getSummarizationPrompt: getDefaultSummarizationPrompt,
  estimateWordCount: estimateWordCount,
};
