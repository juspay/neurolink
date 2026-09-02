/**
 * Tool output preview generation.
 * Generates head/tail previews of large tool outputs for context-efficient LLM calls.
 * @module
 */

import type {
  ToolOutputPreviewOptions,
  ToolOutputPreviewResult,
} from "../types/index.js";

/** Default maximum preview size in bytes (50KB) */
export const DEFAULT_MAX_PREVIEW_BYTES = 50 * 1024;

/** Default maximum preview lines */
export const DEFAULT_MAX_PREVIEW_LINES = 2_000;

/** Default head ratio (25% of preview budget) */
export const DEFAULT_HEAD_RATIO = 0.25;

/** Tool name referenced in truncation notices for on-demand full-output access */
export const RETRIEVE_CONTEXT_TOOL_NAME = "retrieve_context";

/** Default tail ratio (75% of preview budget) */
export const DEFAULT_TAIL_RATIO = 0.75;

/**
 * True when `generateToolOutputPreview` would actually shrink this output.
 *
 * Callers gate on this before paying for a preview. It exists so the gate and
 * the generator can never disagree: the budget is expressed in BYTES, and
 * testing it against `String.length` (UTF-16 code units) under-reports every
 * multibyte payload — CJK or emoji tool output would be judged small enough to
 * leave alone while the generator would have truncated it. Line count matters
 * for the same reason: a short-but-tall output exceeds `maxLines` alone.
 */
export function exceedsToolOutputPreviewBudget(
  output: string,
  options?: ToolOutputPreviewOptions,
): boolean {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_PREVIEW_BYTES;
  const maxLines = options?.maxLines ?? DEFAULT_MAX_PREVIEW_LINES;
  return (
    Buffer.byteLength(output, "utf-8") > maxBytes ||
    output.split("\n").length > maxLines
  );
}

/**
 * Generate a head/tail preview of a tool output string.
 * If the output is within limits, returns it unchanged with truncated: false.
 * If over limits, keeps the first 25% and last 75% with an omission notice.
 *
 * Industry pattern: 25/75 head/tail split. Head captures schema/headers/structure,
 * tail captures the most recent and typically most relevant data.
 */
export function generateToolOutputPreview(
  output: string,
  options?: ToolOutputPreviewOptions,
): ToolOutputPreviewResult {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_PREVIEW_BYTES;
  const maxLines = options?.maxLines ?? DEFAULT_MAX_PREVIEW_LINES;
  const rawHeadRatio = options?.headRatio ?? DEFAULT_HEAD_RATIO;
  const rawTailRatio = options?.tailRatio ?? DEFAULT_TAIL_RATIO;
  // Clamp ratios to valid range to avoid negative omittedBytes
  const headRatio = Math.max(0, Math.min(1, rawHeadRatio));
  const tailRatio = Math.max(0, Math.min(1, rawTailRatio));
  const originalSize = Buffer.byteLength(output, "utf-8");

  const lines = output.split("\n");
  const exceedsBytes = originalSize > maxBytes;
  const exceedsLines = lines.length > maxLines;

  if (!exceedsBytes && !exceedsLines) {
    return { preview: output, truncated: false, originalSize };
  }

  // Line-based split
  const headLineCount = Math.max(1, Math.floor(maxLines * headRatio));
  const tailLineCount = Math.max(1, maxLines - headLineCount);

  let head: string;
  let tail: string;

  if (exceedsLines) {
    head = lines.slice(0, headLineCount).join("\n");
    tail = lines.slice(-tailLineCount).join("\n");
  } else {
    head = lines
      .slice(0, Math.max(1, Math.floor(lines.length * headRatio)))
      .join("\n");
    tail = lines
      .slice(-Math.max(1, Math.ceil(lines.length * tailRatio)))
      .join("\n");
  }

  // Byte-based cap on each portion
  const headMaxBytes = Math.floor(maxBytes * headRatio);
  const tailMaxBytes = maxBytes - headMaxBytes;

  if (Buffer.byteLength(head, "utf-8") > headMaxBytes) {
    head = Buffer.from(head, "utf-8")
      .subarray(0, headMaxBytes)
      .toString("utf-8");
  }
  if (Buffer.byteLength(tail, "utf-8") > tailMaxBytes) {
    const tailBuf = Buffer.from(tail, "utf-8");
    tail = tailBuf.subarray(tailBuf.length - tailMaxBytes).toString("utf-8");
  }

  const omittedBytes = Math.max(
    0,
    originalSize -
      Buffer.byteLength(head, "utf-8") -
      Buffer.byteLength(tail, "utf-8"),
  );
  // Default notice names retrieve_context; callers whose instance never
  // registers that tool (see RETRIEVE_CONTEXT_TOOL_NAME usages in
  // ToolsManager) pass their own `notice` so the model isn't pointed at a
  // tool that doesn't exist.
  const notice =
    options?.notice === undefined
      ? `\n\n[... ${omittedBytes} bytes omitted. ` +
        `Use ${RETRIEVE_CONTEXT_TOOL_NAME} tool to access full output ...]\n\n`
      : typeof options.notice === "function"
        ? options.notice(omittedBytes)
        : options.notice;

  return {
    preview: head + notice + tail,
    truncated: true,
    originalSize,
  };
}
