/**
 * Stage 4: Sliding Window Truncation
 *
 * Non-destructive fallback: tags oldest messages as truncated
 * instead of deleting them. Always preserves first message pair.
 * Removes messages in pairs to maintain role alternation.
 */

import type { ChatMessage } from "../../types/conversation.js";
import type {
  TruncationConfig,
  TruncationResult,
} from "../../types/contextTypes.js";
import { randomUUID } from "crypto";

export type {
  TruncationConfig,
  TruncationResult,
} from "../../types/contextTypes.js";

const TRUNCATION_MARKER_CONTENT =
  "[Earlier conversation history was truncated to fit within context limits]";

export function truncateWithSlidingWindow(
  messages: ChatMessage[],
  config?: TruncationConfig,
): TruncationResult {
  const fraction = config?.fraction ?? 0.5;

  if (messages.length <= 4) {
    return { truncated: false, messages, messagesRemoved: 0 };
  }

  // Always preserve first user-assistant pair
  const firstPair = messages.slice(0, 2);

  // Calculate how many messages to remove from the middle
  const remainingMessages = messages.slice(2);
  const removeCount = Math.floor(remainingMessages.length * fraction);

  // Ensure we remove an even number to maintain role alternation
  const evenRemoveCount = removeCount - (removeCount % 2);

  if (evenRemoveCount <= 0) {
    return { truncated: false, messages, messagesRemoved: 0 };
  }

  const keptAfterTruncation = remainingMessages.slice(evenRemoveCount);

  // Create truncation marker
  const truncationMarker: ChatMessage = {
    id: `truncation-${randomUUID()}`,
    role: "system",
    content: TRUNCATION_MARKER_CONTENT,
    timestamp: new Date().toISOString(),
    metadata: {
      isSummary: false,
      truncated: true,
    },
  };

  return {
    truncated: true,
    messages: [...firstPair, truncationMarker, ...keptAfterTruncation],
    messagesRemoved: evenRemoveCount,
  };
}
