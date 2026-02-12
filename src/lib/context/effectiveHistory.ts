/**
 * Effective History Filter
 *
 * Filters message arrays to return only "visible" messages,
 * excluding those tagged by condensation or truncation.
 * Supports non-destructive context management where messages
 * are tagged instead of deleted.
 */

import type { ChatMessage } from "../types/conversation.js";

/**
 * Get the effective (visible) history from a message array.
 *
 * Filters out:
 * - Messages with a condenseParent (replaced by a summary)
 * - Messages with a truncationParent (hidden by truncation)
 *
 * Keeps:
 * - Summary messages (isSummary = true)
 * - Truncation markers (isTruncationMarker = true)
 * - All other untagged messages
 */
export function getEffectiveHistory(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((msg) => {
    // Exclude messages that have been condensed (replaced by summary)
    if (msg.condenseParent) {
      return false;
    }

    // Exclude messages that have been truncated (hidden by marker)
    if (msg.truncationParent) {
      return false;
    }

    return true;
  });
}

/**
 * Tag messages for condensation (non-destructive summary).
 *
 * @param messages - Full message array
 * @param fromIndex - Start index of messages to condense
 * @param toIndex - End index (exclusive) of messages to condense
 * @param condenseId - UUID for this condensation group
 * @returns Updated message array with tags applied
 */
export function tagForCondensation(
  messages: ChatMessage[],
  fromIndex: number,
  toIndex: number,
  condenseId: string,
): ChatMessage[] {
  return messages.map((msg, i) => {
    if (i >= fromIndex && i < toIndex) {
      return { ...msg, condenseParent: condenseId };
    }
    return msg;
  });
}

/**
 * Tag messages for truncation (non-destructive hiding).
 *
 * @param messages - Full message array
 * @param fromIndex - Start index of messages to truncate
 * @param toIndex - End index (exclusive) of messages to truncate
 * @param truncationId - UUID for this truncation group
 * @returns Updated message array with tags applied
 */
export function tagForTruncation(
  messages: ChatMessage[],
  fromIndex: number,
  toIndex: number,
  truncationId: string,
): ChatMessage[] {
  return messages.map((msg, i) => {
    if (i >= fromIndex && i < toIndex) {
      return { ...msg, truncationParent: truncationId };
    }
    return msg;
  });
}

/**
 * Remove condensation tags (rewind).
 * Makes previously condensed messages visible again.
 */
export function removeCondensationTags(
  messages: ChatMessage[],
  condenseId: string,
): ChatMessage[] {
  return messages
    .map((msg) => {
      if (msg.condenseParent === condenseId) {
        const { condenseParent, ...rest } = msg;
        return rest;
      }
      // Also remove the summary message itself
      if (msg.condenseId === condenseId && msg.metadata?.isSummary) {
        return null;
      }
      return msg;
    })
    .filter((msg): msg is ChatMessage => msg !== null);
}

/**
 * Remove truncation tags (rewind).
 * Makes previously truncated messages visible again.
 */
export function removeTruncationTags(
  messages: ChatMessage[],
  truncationId: string,
): ChatMessage[] {
  return messages
    .map((msg) => {
      if (msg.truncationParent === truncationId) {
        const { truncationParent, ...rest } = msg;
        return rest;
      }
      // Also remove the truncation marker itself
      if (msg.truncationId === truncationId && msg.isTruncationMarker) {
        return null;
      }
      return msg;
    })
    .filter((msg): msg is ChatMessage => msg !== null);
}
