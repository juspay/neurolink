/**
 * Stage 2: File Read Deduplication
 *
 * Detect multiple reads of the same file path, keep only the latest,
 * replace earlier reads with a notice.
 */

import type { ChatMessage } from "../../types/conversation.js";
import type { DeduplicationResult } from "../../types/contextTypes.js";

export type { DeduplicationResult } from "../../types/contextTypes.js";

const FILE_READ_PATTERN =
  /(?:read|reading|read_file|readFile|Read file|cat)\s+['"`]?([^\s'"`\n]+)/i;
const DEDUP_NOTICE = (filePath: string): string =>
  `[File ${filePath} - refer to latest read below]`;
const DEDUP_THRESHOLD = 0.3; // Need 30% savings to declare success

export function deduplicateFileReads(
  messages: ChatMessage[],
): DeduplicationResult {
  // Track file read positions: filePath -> array of message indices
  const fileReadMap = new Map<string, number[]>();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role !== "tool_result" && msg.role !== "assistant") {
      continue;
    }

    const match = msg.content.match(FILE_READ_PATTERN);
    if (match) {
      const filePath = match[1];
      const existing = fileReadMap.get(filePath) || [];
      existing.push(i);
      fileReadMap.set(filePath, existing);
    }
  }

  // Find files read multiple times
  const duplicates = new Map<string, number[]>();
  for (const [filePath, indices] of fileReadMap) {
    if (indices.length > 1) {
      duplicates.set(filePath, indices);
    }
  }

  if (duplicates.size === 0) {
    return { deduplicated: false, messages, filesDeduped: 0 };
  }

  const result = [...messages];
  let totalOriginalChars = 0;
  let totalReplacedChars = 0;

  for (const [filePath, indices] of duplicates) {
    // Keep the latest (last index), replace all earlier ones
    const latestIndex = indices[indices.length - 1];
    for (const idx of indices) {
      if (idx === latestIndex) {
        continue;
      }

      const original = result[idx];
      totalOriginalChars += original.content.length;
      const notice = DEDUP_NOTICE(filePath);
      totalReplacedChars += notice.length;

      result[idx] = {
        ...original,
        content: notice,
        metadata: { ...original.metadata, truncated: true },
      };
    }
  }

  const savings =
    totalOriginalChars > 0
      ? (totalOriginalChars - totalReplacedChars) / totalOriginalChars
      : 0;

  const deduplicated = savings >= DEDUP_THRESHOLD;

  return {
    deduplicated,
    messages: deduplicated ? result : messages,
    filesDeduped: deduplicated ? duplicates.size : 0,
  };
}
