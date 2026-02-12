/**
 * Tool Output Size Limits
 *
 * Truncates tool outputs exceeding size limits.
 * Can save full output to disk with a pointer.
 * Modeled on OpenCode's approach.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";

/** Maximum tool output size in bytes (50KB) */
export const MAX_TOOL_OUTPUT_BYTES = 50 * 1024;

/** Maximum tool output lines */
export const MAX_TOOL_OUTPUT_LINES = 2_000;

import type { TruncateOptions, TruncateResult } from "../types/contextTypes.js";

export type { TruncateOptions, TruncateResult } from "../types/contextTypes.js";

/**
 * Truncate tool output if it exceeds size limits.
 */
export function truncateToolOutput(
  output: string,
  options?: TruncateOptions,
): TruncateResult {
  const maxBytes = options?.maxBytes ?? MAX_TOOL_OUTPUT_BYTES;
  const maxLines = options?.maxLines ?? MAX_TOOL_OUTPUT_LINES;
  const direction = options?.direction ?? "tail";
  const saveToDisk = options?.saveToDisk ?? false;
  const originalSize = Buffer.byteLength(output, "utf-8");

  // Check byte limit
  const exceedsBytes = originalSize > maxBytes;

  // Check line limit
  const lines = output.split("\n");
  const exceedsLines = lines.length > maxLines;

  if (!exceedsBytes && !exceedsLines) {
    return { content: output, truncated: false, originalSize };
  }

  // Save to disk if requested
  let savedPath: string | undefined;
  if (saveToDisk) {
    try {
      const saveDir =
        options?.saveDir ?? join(tmpdir(), "neurolink-tool-output");
      mkdirSync(saveDir, { recursive: true });
      savedPath = join(saveDir, `tool-output-${randomUUID()}.txt`);
      writeFileSync(savedPath, output, "utf-8");
    } catch {
      // Silently fail disk save
    }
  }

  // Apply truncation
  let truncated: string;

  if (exceedsLines) {
    if (direction === "head") {
      truncated = lines.slice(0, maxLines).join("\n");
    } else {
      truncated = lines.slice(-maxLines).join("\n");
    }
  } else {
    truncated = output;
  }

  // Apply byte limit
  if (Buffer.byteLength(truncated, "utf-8") > maxBytes) {
    if (direction === "head") {
      truncated = truncated.slice(0, maxBytes);
    } else {
      truncated = truncated.slice(-maxBytes);
    }
  }

  // Add truncation notice
  const notice = savedPath
    ? `\n\n[Output truncated from ${originalSize} bytes to ${Buffer.byteLength(truncated, "utf-8")} bytes. Full output saved to: ${savedPath}]`
    : `\n\n[Output truncated from ${originalSize} bytes to ${Buffer.byteLength(truncated, "utf-8")} bytes]`;

  if (direction === "head") {
    truncated = truncated + notice;
  } else {
    truncated = notice + "\n" + truncated;
  }

  return {
    content: truncated,
    truncated: true,
    savedPath,
    originalSize,
  };
}
