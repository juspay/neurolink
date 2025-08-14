import type { ChatMessage } from "./types.js";

/**
 * Formats a chat history array into a single string for use in a prompt.
 * @param history The array of ChatMessage objects.
 * @returns A formatted string representing the conversation.
 */
export function formatHistoryToString(history: ChatMessage[]): string {
  return history.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n");
}
